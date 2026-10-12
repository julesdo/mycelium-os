import { useRef, useState } from 'react';
import { useConvex, useMutation } from 'convex/react';
import { useRequeteEphemere } from './donnees';
import { messageDeRefus } from './televerser';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import {
	FORMATS_ACCEPTES,
	FORMATS_EN_CLAIR,
	nomPropre,
	verdictAvantEnvoi
} from '../lib/socle/coffre/fichiers';
import type {
	ContenuOuvert,
	DepotAuCoffre,
	FichierAuDepot,
	RefCoffre,
	ResumeDocument
} from '../ui';

/**
 * LE COFFRE, CÔTÉ ROUTE (12/10/2026) — le dépôt, l'ouverture, le téléchargement.
 * Voir `docs/superpowers/specs/2026-10-12-coffre-fort.md`.
 *
 *   · AVANT L'ENVOI : le nom et la taille vérifiés, l'empreinte SHA-256 calculée
 *     dans le navigateur et comparée au coffre — un doublon de factures n'est pas
 *     renvoyé ;
 *   · L'ENVOI : une adresse à usage unique, en HTTPS, avec son avancement réel ;
 *   · APRÈS : le serveur scelle et lit ; le parcours le regarde en direct.
 *
 * ⚠️ UN FICHIER À LA FOIS. Envoyer en parallèle irait plus vite sur la fibre et
 * plus lentement en 4G, où la bande passante est la contrainte ; un à la fois
 * donne aussi un avancement qui se lit.
 */

type Destination =
	| { readonly genre: 'FACTURES' }
	| {
			readonly genre: 'PIECES';
			readonly debiteurId?: Id<'debiteurs'>;
			readonly factureIds: readonly Id<'facturesVente'>[];
	  };

type RefServeur =
	| { genre: 'IMPORT'; id: Id<'importsRecouvrement'> }
	| { genre: 'PIECE'; id: Id<'pieces'> };

interface FichierInterne extends Omit<FichierAuDepot, 'suivi'> {
	readonly fichier: File;
	readonly empreinte?: string;
	readonly ref?: RefServeur;
}

function versServeur(ref: RefCoffre): RefServeur {
	return ref.genre === 'IMPORT'
		? { genre: 'IMPORT', id: ref.id as Id<'importsRecouvrement'> }
		: { genre: 'PIECE', id: ref.id as Id<'pieces'> };
}

async function empreinteDuFichier(fichier: File): Promise<string> {
	const condensat = new Uint8Array(
		await crypto.subtle.digest('SHA-256', await fichier.arrayBuffer())
	);
	return Array.from(condensat, (o) => o.toString(16).padStart(2, '0')).join('');
}

/**
 * ENVOYER UN FICHIER À SON ADRESSE À USAGE UNIQUE, en mesurant l'envoi.
 * `fetch` ne dit rien de l'envoi ; `XMLHttpRequest`, si.
 */
function envoyer(
	adresse: string,
	fichier: File,
	mime: string,
	onAvancement: (part: number) => void
): Promise<Id<'_storage'>> {
	return new Promise((resoudre, rejeter) => {
		const requete = new XMLHttpRequest();
		requete.open('POST', adresse);
		requete.setRequestHeader('Content-Type', mime);
		requete.upload.addEventListener('progress', (evenement) => {
			// Une taille inconnue ne s'invente pas : pas de part, pas de barre qui ment.
			if (evenement.lengthComputable && evenement.total > 0) {
				onAvancement(evenement.loaded / evenement.total);
			}
		});
		requete.addEventListener('load', () => {
			if (requete.status < 200 || requete.status >= 300) {
				rejeter(new Error(`L’envoi a été refusé (code ${requete.status}).`));
				return;
			}
			try {
				resoudre((JSON.parse(requete.responseText) as { storageId: Id<'_storage'> }).storageId);
			} catch {
				rejeter(new Error('La réponse de l’envoi est illisible.'));
			}
		});
		requete.addEventListener('error', () =>
			rejeter(new Error('L’envoi n’a pas abouti : vérifiez votre connexion, puis renvoyez.'))
		);
		requete.addEventListener('abort', () => rejeter(new Error('L’envoi a été interrompu.')));
		requete.send(fichier);
	});
}

export function useDepotAuCoffre(destination: Destination): DepotAuCoffre {
	const convex = useConvex();
	const genererUrl = useMutation(api.coffre.coffre.genererUrlCoffre);
	const confier = useMutation(api.coffre.coffre.confierAuCoffre);
	const [fichiers, setFichiers] = useState<readonly FichierInterne[]>([]);
	const [lance, setLance] = useState(false);
	const prochaineCle = useRef(0);

	const modifier = (cle: string, changement: Partial<FichierInterne>) =>
		setFichiers((avant) => avant.map((f) => (f.cle === cle ? { ...f, ...changement } : f)));

	const refs = fichiers.flatMap((f) => (f.ref === undefined ? [] : [f.ref]));
	const suivi = useRequeteEphemere(
		api.coffre.coffre.suivreLeDepot,
		refs.length === 0 ? 'skip' : { documents: refs }
	);
	const suiviParCle = new Map<string, ResumeDocument>(
		(suivi ?? []).map((resume) => [`${resume.ref.genre}:${resume.ref.id}`, resume])
	);

	async function ajouter(nouveaux: File[]) {
		const entres: FichierInterne[] = nouveaux.map((fichier) => {
			const nom = nomPropre(fichier.name);
			const verdict = verdictAvantEnvoi(nom, fichier.size);
			prochaineCle.current += 1;
			return {
				cle: `f${prochaineCle.current}`,
				fichier,
				nom,
				taille: fichier.size,
				mime: verdict.accepte ? verdict.mime : fichier.type,
				phase: verdict.accepte ? 'VERIFICATION' : 'REFUSE',
				...(verdict.accepte ? {} : { message: verdict.raison })
			};
		});
		setFichiers((avant) => [...avant, ...entres]);

		const aVerifier = entres.filter((f) => f.phase === 'VERIFICATION');
		const empreintes = await Promise.all(aVerifier.map((f) => empreinteDuFichier(f.fichier)));
		let deja: { empreinte: string; nom: string; deposeLe: number }[] = [];
		try {
			deja = await convex.query(api.coffre.coffre.dejaAuCoffre, { empreintes });
		} catch {
			// Sans réponse, on n'invente pas de doublon : le serveur retrouvera l'empreinte.
		}
		aVerifier.forEach((f, i) => {
			const empreinte = empreintes[i];
			const trouve = deja.find((d) => d.empreinte === empreinte);
			modifier(f.cle, {
				...(empreinte === undefined ? {} : { empreinte }),
				...(trouve === undefined ? {} : { deja: { nom: trouve.nom, deposeLe: trouve.deposeLe } }),
				// Des factures déjà au coffre ne se relisent pas ; une pièce, elle, peut
				// soutenir un autre dossier.
				phase: trouve !== undefined && destination.genre === 'FACTURES' ? 'DEJA' : 'PRET'
			});
		});
	}

	async function envoyerUn(fichier: FichierInterne) {
		modifier(fichier.cle, { phase: 'ENVOI', avancement: 0 });
		try {
			const adresse = await genererUrl({});
			const storageId = await envoyer(adresse, fichier.fichier, fichier.mime, (part) =>
				modifier(fichier.cle, { avancement: part })
			);
			const ref = await confier({
				storageId,
				nom: fichier.nom,
				destination:
					destination.genre === 'FACTURES'
						? { genre: 'FACTURES' }
						: {
								genre: 'PIECES',
								...(destination.debiteurId === undefined
									? {}
									: { debiteurId: destination.debiteurId }),
								factureIds: [...destination.factureIds]
							}
			});
			modifier(fichier.cle, { phase: 'COFFRE', ref });
		} catch (erreur) {
			modifier(fichier.cle, { phase: 'ECHEC_ENVOI', message: messageDeRefus(erreur) });
		}
	}

	async function lancer() {
		setLance(true);
		for (const fichier of fichiers.filter((f) => f.phase === 'PRET')) {
			await envoyerUn(fichier);
		}
	}

	return {
		fichiers: fichiers.map((f) => {
			// Ni le fichier ni son empreinte ne sortent vers l'écran : il n'en a pas l'usage.
			const affiche: FichierAuDepot = {
				cle: f.cle,
				nom: f.nom,
				taille: f.taille,
				mime: f.mime,
				phase: f.phase,
				...(f.avancement === undefined ? {} : { avancement: f.avancement }),
				...(f.message === undefined ? {} : { message: f.message }),
				...(f.deja === undefined ? {} : { deja: f.deja })
			};
			const resume = f.ref === undefined ? undefined : suiviParCle.get(`${f.ref.genre}:${f.ref.id}`);
			return resume === undefined ? affiche : { ...affiche, suivi: resume };
		}),
		onAjouter: (nouveaux) => void ajouter(nouveaux),
		onRetirer: (cle) => setFichiers((avant) => avant.filter((f) => f.cle !== cle)),
		onLancer: () => void lancer(),
		onReessayer: (cle) => {
			const fichier = fichiers.find((f) => f.cle === cle);
			if (fichier !== undefined) void envoyerUn(fichier);
		},
		onRecommencer: () => {
			setFichiers([]);
			setLance(false);
		},
		lance,
		accept: FORMATS_ACCEPTES,
		formats: FORMATS_EN_CLAIR
	};
}

/**
 * OUVRIR ET TÉLÉCHARGER UN DOCUMENT DU COFFRE — un jeton d'une minute, consommé
 * une fois par l'action HTTP qui déchiffre. Le contenu ne vit qu'en mémoire.
 */
export function useOuvertureCoffre(): {
	readonly ouvrir: (ref: RefCoffre) => Promise<ContenuOuvert>;
	readonly telecharger: (ref: RefCoffre) => void;
} {
	const demander = useMutation(api.coffre.coffre.ouvrirAuCoffre);

	async function lire(
		ref: RefCoffre,
		geste: 'CONSULTATION' | 'TELECHARGEMENT'
	): Promise<ContenuOuvert> {
		let jeton: { jeton: string; adresse: string };
		try {
			jeton = await demander({ ref: versServeur(ref), geste });
		} catch (erreur) {
			throw new Error(messageDeRefus(erreur), { cause: erreur });
		}
		const reponse = await fetch(jeton.adresse, {
			method: 'POST',
			body: jeton.jeton,
			cache: 'no-store'
		});
		if (!reponse.ok) throw new Error(await reponse.text());
		const disposition = reponse.headers.get('Content-Disposition') ?? '';
		const nom = decodeURIComponent(
			/filename\*=UTF-8''([^;]+)/.exec(disposition)?.[1] ?? 'document'
		);
		return {
			octets: await reponse.arrayBuffer(),
			mime: reponse.headers.get('Content-Type') ?? 'application/octet-stream',
			nom
		};
	}

	return {
		ouvrir: (ref) => lire(ref, 'CONSULTATION'),
		telecharger: (ref) => {
			void lire(ref, 'TELECHARGEMENT').then((contenu) => {
				const url = URL.createObjectURL(new Blob([contenu.octets], { type: contenu.mime }));
				const lien = document.createElement('a');
				lien.href = url;
				lien.download = contenu.nom;
				lien.click();
				// Laissé le temps au navigateur de commencer l'enregistrement.
				setTimeout(() => URL.revokeObjectURL(url), 30_000);
			});
		}
	};
}
