import { useEffect, useState, useSyncExternalStore } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import { useQuery } from './donnees';
import {
	CATEGORIES_PUSH,
	NOM_DE_LA_CATEGORIE,
	type CategoriePush
} from '../lib/notifications/categories';
import type { EtatDuPush, PushAffiche } from '../ui/notifications-push';

/**
 * LES NOTIFICATIONS PUSH, CÔTÉ NAVIGATEUR (21/10/2026, le parcours de l'habitude).
 *
 * Le service worker (`public/sw.js`) s'enregistre au repos dans `/app` ; il ne fait que
 * le push. L'abonnement d'un appareil ne part que du geste du gérant, et la demande du
 * système s'ouvre DANS ce geste : iOS refuse une demande qui n'en vient pas.
 */

export interface EnvironnementPush {
	readonly agent: string;
	readonly serviceWorker: boolean;
	readonly pushManager: boolean;
	/** `absent` : le navigateur ne connaît pas les notifications. */
	readonly permission: NotificationPermission | 'absent';
	/** Ouverte depuis l'écran d'accueil (application installée). */
	readonly installee: boolean;
}

const IOS = /iPhone|iPad|iPod/;

/** Ce que l'appareil permet, et où en est la personne. */
export function etatDuPush(env: EnvironnementPush, abonne: boolean): EtatDuPush {
	if (IOS.test(env.agent) && !env.installee) return 'A_INSTALLER';
	if (!env.serviceWorker || !env.pushManager || env.permission === 'absent') return 'INDISPONIBLE';
	if (env.permission === 'denied') return 'REFUSE';
	if (abonne && env.permission === 'granted') return 'ACTIF';
	return 'POSSIBLE';
}

/** « iPhone », « Ordinateur Windows » : ce que la personne reconnaîtra dans ses réglages. */
export function nomDeLAppareil(agent: string): string {
	if (/iPhone/.test(agent)) return 'iPhone';
	if (/iPad/.test(agent)) return 'iPad';
	if (/Android/.test(agent)) return 'Téléphone Android';
	if (/Windows/.test(agent)) return 'Ordinateur Windows';
	if (/Mac OS X|Macintosh/.test(agent)) return 'Mac';
	if (/Linux/.test(agent)) return 'Ordinateur Linux';
	return 'Navigateur';
}

function environnementDuNavigateur(): EnvironnementPush {
	return {
		agent: navigator.userAgent,
		serviceWorker: 'serviceWorker' in navigator,
		pushManager: 'PushManager' in window,
		permission: 'Notification' in window ? Notification.permission : 'absent',
		installee:
			window.matchMedia('(display-mode: standalone)').matches ||
			(navigator as Navigator & { standalone?: boolean }).standalone === true
	};
}

/* Un petit magasin : l'environnement se relit après une demande de permission. */
let instantane: EnvironnementPush | null = null;
const ecouteurs = new Set<() => void>();
function lireLEnvironnement(): EnvironnementPush | null {
	if (typeof window === 'undefined') return null;
	instantane ??= environnementDuNavigateur();
	return instantane;
}
function relireLEnvironnement(): void {
	instantane = environnementDuNavigateur();
	for (const ecouter of ecouteurs) ecouter();
}
function suivreLEnvironnement(ecouter: () => void): () => void {
	ecouteurs.add(ecouter);
	return () => ecouteurs.delete(ecouter);
}

function depuisBase64Url(texte: string): Uint8Array<ArrayBuffer> {
	const base64 = (texte + '='.repeat((4 - (texte.length % 4)) % 4))
		.replaceAll('-', '+')
		.replaceAll('_', '/');
	const binaire = atob(base64);
	const octets = new Uint8Array(new ArrayBuffer(binaire.length));
	for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
	return octets;
}

interface AbonnementLu {
	readonly endpoint: string;
	readonly p256dh: string;
	readonly auth: string;
}

function lireLesCles(abonnement: PushSubscription): AbonnementLu | null {
	const json = abonnement.toJSON();
	const p256dh = json.keys?.p256dh;
	const auth = json.keys?.auth;
	if (json.endpoint === undefined || p256dh === undefined || auth === undefined) return null;
	return { endpoint: json.endpoint, p256dh, auth };
}

/**
 * Demande la permission PUIS abonne l'appareil. ⚠️ La demande part en premier, sans rien
 * attendre avant : elle doit rester dans le geste du gérant.
 */
async function activerLePush(clePublique: string): Promise<AbonnementLu> {
	const permission = await Notification.requestPermission();
	relireLEnvironnement();
	if (permission !== 'granted') throw new Error('Permission refusée');
	const enregistrement = await navigator.serviceWorker.register('/sw.js');
	await navigator.serviceWorker.ready;
	const abonnement =
		(await enregistrement.pushManager.getSubscription()) ??
		(await enregistrement.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: depuisBase64Url(clePublique)
		}));
	const cles = lireLesCles(abonnement);
	if (cles === null) throw new Error('Abonnement illisible');
	return cles;
}

async function abonnementActuel(): Promise<PushSubscription | null> {
	if (!('serviceWorker' in navigator)) return null;
	const enregistrement = await navigator.serviceWorker.getRegistration('/');
	return (await enregistrement?.pushManager.getSubscription()) ?? null;
}

const AIDE: Readonly<Record<CategoriePush, string>> = {
	PAIEMENTS: 'Un client a payé, une réussite franchie.',
	REPONSES: 'Plume a besoin de vous, une date limite approche.',
	SEMAINE: 'Le lundi : ce qui est rentré, parti, et ce qui approche. Par e-mail aussi.',
	COMPTE: 'Le prélèvement qui approche, une réponse de l’équipe.'
};

/**
 * Le push pour l'écran : l'état de l'appareil, les catégories, les gestes. `undefined`
 * quand le push dort (aucune clé VAPID sur le déploiement) : l'écran ne propose rien.
 */
export function usePush(): PushAffiche | undefined {
	const reglages = useQuery(api.push.abonnements.mesReglages, {});
	const clePublique = useQuery(api.push.abonnements.clePublique, {});
	const abonner = useMutation(api.push.abonnements.abonner);
	const desabonner = useMutation(api.push.abonnements.desabonner);
	const regler = useMutation(api.push.abonnements.regler);
	const env = useSyncExternalStore(suivreLEnvironnement, lireLEnvironnement, () => null);
	const [abonne, setAbonne] = useState<AbonnementLu | null>(null);
	const [enCours, setEnCours] = useState(false);

	// L'abonnement de cet appareil, relu à l'ouverture ; inconnu du serveur (un autre
	// établissement, une purge), il s'y réinscrit.
	const appareilsConnus = reglages?.appareils.map((a) => a.endpoint).join('|');
	useEffect(() => {
		if (appareilsConnus === undefined) return;
		abonnementActuel()
			.then((abonnement) => {
				const cles = abonnement === null ? null : lireLesCles(abonnement);
				setAbonne(cles);
				if (cles !== null && !appareilsConnus.split('|').includes(cles.endpoint)) {
					void abonner({ ...cles, appareil: nomDeLAppareil(navigator.userAgent) });
				}
			})
			.catch(() => undefined);
	}, [appareilsConnus, abonner]);

	if (reglages === undefined || reglages === null || !reglages.disponible) return undefined;
	if (clePublique === undefined || clePublique === null || env === null) return undefined;

	return {
		etat: etatDuPush(env, abonne !== null),
		enCours,
		categories: CATEGORIES_PUSH.map((categorie) => ({
			categorie,
			nom: NOM_DE_LA_CATEGORIE[categorie],
			aide: AIDE[categorie],
			active: !reglages.categoriesCoupees.includes(categorie)
		})),
		onActiver: () => {
			setEnCours(true);
			activerLePush(clePublique)
				.then(async (cles) => {
					await abonner({ ...cles, appareil: nomDeLAppareil(navigator.userAgent) });
					setAbonne(cles);
				})
				.catch(() => undefined)
				.finally(() => setEnCours(false));
		},
		onCouper: () => {
			setEnCours(true);
			abonnementActuel()
				.then(async (abonnement) => {
					if (abonnement === null) return;
					const endpoint = abonnement.endpoint;
					await abonnement.unsubscribe();
					await desabonner({ endpoint });
					setAbonne(null);
				})
				.catch(() => undefined)
				.finally(() => setEnCours(false));
		},
		onRegler: (categorie, active) => void regler({ categorie, active })
	};
}
