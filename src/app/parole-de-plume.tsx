import { useEffect, useId, useSyncExternalStore, type ReactNode } from 'react';
import { useToast } from '@cladd-ui/react';
import type {
	CibleDePlume,
	EcranDePlume,
	RemarqueDePlume,
	TravailTermine
} from '../lib/verticales/recouvrement/compagnon/presence';
import { paroleDUnTravail } from '../lib/verticales/recouvrement/compagnon/presence';
import type { HumeurPlume } from '../ui';

/**
 * LA PAROLE DE PLUME — ce que sa bulle dit maintenant (13/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UNE BOUCHE, TROIS VOIX
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La bulle au-dessus de Plume (`ui/bulle-plume.tsx`) est le seul endroit où il
 * parle hors de sa conversation. Trois choses y passent, dans cet ordre :
 *
 *   1. CE QUE VOUS VENEZ DE FAIRE (`usePlumeDit`) — le mot après un geste : « C'est
 *      noté : le 20, je vous remets Durand sous les yeux. » Il passe devant tout.
 *   2. CE QU'IL VIENT DE FINIR — un travail du pilote, annoncé là où l'on est.
 *   3. CE QU'IL A À DIRE DE L'ÉCRAN — une remarque, une seule par visite.
 *
 * ⚠️ UN MAGASIN HORS DE REACT, ET C'EST CE QUI TIENT LA RÈGLE DES EFFETS. Un écran
 * annonce ses remarques depuis un effet ; posées dans un état React, ce serait un
 * `setState` dans un effet, que le projet refuse. Le magasin est un système
 * extérieur que l'effet synchronise, comme une connexion : il ne prévient ses
 * abonnés que quand ce qui se dit CHANGE.
 *
 * ⚠️ UNE REMARQUE PAR VISITE, ET JAMAIS DEUX FOIS LA MÊME DANS LA SESSION. Un
 * collaborateur qui répète la même chose à chaque passage dans le couloir se fait
 * ignorer en deux jours. Le ✕ la fait taire pour de bon (`presence.taire`).
 */

/** Le geste d'une bulle : un mot, et ce qu'il fait. */
export interface GesteDeBulle {
	readonly libelle: string;
	readonly faire: () => void;
}

export interface ParoleAffichee {
	readonly cle: string;
	readonly voix: 'GESTE' | 'TRAVAIL' | 'ECRAN';
	readonly texte: ReactNode;
	readonly humeur: HumeurPlume;
	/** Pour une remarque ou un travail : la cible, que la bulle traduit en route. */
	readonly cible?: CibleDePlume;
	readonly libelleDuGeste?: string;
	/** Pour un mot après un geste : ce que fait son bouton (« Annuler », « Relire »). */
	readonly geste?: GesteDeBulle;
	/** Le ✕ fait-il taire pour de bon ? Une remarque d'écran seulement. */
	readonly silencieuse: boolean;
}

interface Inscription {
	readonly id: string;
	readonly ecran: EcranDePlume;
	remarques: readonly RemarqueDePlume[];
	/** Ce que l'écran fait lui-même d'une cible (préparer, reprendre, ouvrir une rangée). */
	executer: ((cible: CibleDePlume) => boolean) | undefined;
}

/** Combien de temps chaque voix reste, sans geste du gérant. */
const DUREE_GESTE_MS = 6000;
const DUREE_TRAVAIL_MS = 8000;
const DUREE_REMARQUE_MS = 20_000;

/* ── L'état, hors de React ────────────────────────────────────────────────── */

const inscriptions: Inscription[] = [];
/** Les clés déjà dites pendant cette session : jamais deux fois. */
const ditesDansLaSession = new Set<string>();
/** Les visites (une inscription) qui ont déjà parlé. */
const visitesQuiOntParle = new Set<string>();
let silences: ReadonlySet<string> | null = null;
let instantanee: { readonly parole: ParoleAffichee; readonly minuterie: ReturnType<typeof setTimeout> } | null =
	null;
let remarque: {
	readonly visite: string;
	readonly parole: ParoleAffichee;
	readonly minuterie: ReturnType<typeof setTimeout>;
} | null = null;
/** Le dernier travail fini déjà vu : ce qui est plus vieux ne s'annonce pas. */
let travailVuJusquA: number | null = null;
let taireAuServeur: ((cle: string) => void) | null = null;
/** Les bulles montées : sans aucune (une conversation), un mot part en toast. */
let hotes = 0;

const abonnes = new Set<() => void>();
let courante: ParoleAffichee | null = null;

function prevenir() {
	const suivante = instantanee?.parole ?? remarque?.parole ?? null;
	if (suivante === courante) return;
	courante = suivante;
	for (const abonne of abonnes) abonne();
}

function paroleDUneRemarque(r: RemarqueDePlume, voix: 'ECRAN' | 'TRAVAIL'): ParoleAffichee {
	return {
		cle: r.cle,
		voix,
		texte: r.texte,
		humeur: r.humeur,
		silencieuse: voix === 'ECRAN' && r.silence === 'AU_REFUS',
		...(r.action === undefined ? {} : { cible: r.action.cible, libelleDuGeste: r.action.libelle })
	};
}

/**
 * CHOISIR CE QUE L'ÉCRAN FAIT DIRE — à chaque changement d'écran, de remarques ou
 * de silences. L'écran courant est la DERNIÈRE inscription : pendant une
 * transition, le nouvel écran s'inscrit avant que l'ancien ne se retire.
 */
function choisir() {
	const visite = inscriptions.at(-1);
	if (remarque !== null) {
		const encore =
			visite !== undefined &&
			remarque.visite === visite.id &&
			visite.remarques.some((r) => r.cle === remarque?.parole.cle) &&
			!(silences?.has(remarque.parole.cle) ?? false);
		if (!encore) {
			clearTimeout(remarque.minuterie);
			remarque = null;
		}
	}
	if (remarque === null && visite !== undefined && silences !== null && !visitesQuiOntParle.has(visite.id)) {
		const r = visite.remarques.find((x) => !silences?.has(x.cle) && !ditesDansLaSession.has(x.cle));
		if (r !== undefined) {
			visitesQuiOntParle.add(visite.id);
			ditesDansLaSession.add(r.cle);
			if (r.silence === 'UNE_FOIS') taireAuServeur?.(r.cle);
			const cle = r.cle;
			remarque = {
				visite: visite.id,
				parole: paroleDUneRemarque(r, 'ECRAN'),
				minuterie: setTimeout(() => {
					if (remarque?.parole.cle === cle) {
						remarque = null;
						prevenir();
					}
				}, DUREE_REMARQUE_MS)
			};
		}
	}
	prevenir();
}

function direInstantane(parole: ParoleAffichee, dureeMs: number) {
	if (instantanee !== null) clearTimeout(instantanee.minuterie);
	const cle = parole.cle;
	instantanee = {
		parole,
		minuterie: setTimeout(() => {
			if (instantanee?.parole.cle === cle) {
				instantanee = null;
				prevenir();
			}
		}, dureeMs)
	};
	prevenir();
}

/* ── Ce que la bulle lit et fait ──────────────────────────────────────────── */

export const paroleDePlume = {
	abonner(abonne: () => void) {
		abonnes.add(abonne);
		return () => {
			abonnes.delete(abonne);
		};
	},
	lire(): ParoleAffichee | null {
		return courante;
	},
	/** L'écran courant, pour la bulle : Aujourd'hui montre déjà les travaux du pilote. */
	ecranCourant(): EcranDePlume | null {
		return inscriptions.at(-1)?.ecran ?? null;
	},
	/** La bulle se monte : les silences lus, et la façon de les écrire. */
	monter(taire: (cle: string) => void) {
		hotes += 1;
		taireAuServeur = taire;
		return () => {
			hotes -= 1;
			if (hotes === 0) taireAuServeur = null;
		};
	},
	poserSilences(cles: readonly string[]) {
		silences = new Set(cles);
		choisir();
	},
	/** Ce que l'écran courant fait lui-même d'une cible ; `false` laisse la bulle y mener. */
	executer(cible: CibleDePlume): boolean {
		return inscriptions.at(-1)?.executer?.(cible) ?? false;
	},
	/** Le ✕ : la parole s'efface ; une remarque d'écran se tait pour de bon. */
	fermer(parole: ParoleAffichee) {
		if (instantanee?.parole.cle === parole.cle) {
			clearTimeout(instantanee.minuterie);
			instantanee = null;
		}
		if (remarque?.parole.cle === parole.cle) {
			clearTimeout(remarque.minuterie);
			remarque = null;
			if (parole.silencieuse) {
				silences = new Set([...(silences ?? []), parole.cle]);
				taireAuServeur?.(parole.cle);
			}
		}
		prevenir();
	},
	/** Le défilement : la bulle se range sans rien faire taire (elle ne revient pas dans la visite). */
	ranger() {
		if (remarque !== null) {
			clearTimeout(remarque.minuterie);
			remarque = null;
			prevenir();
		}
	},
	/**
	 * LES TRAVAUX FINIS DU PILOTE. La première lecture ne fait que marquer où l'on en
	 * est : rien de ce qui était fini avant l'ouverture de l'application ne s'annonce.
	 */
	annoncerTravaux(travaux: readonly (TravailTermine & { readonly termineLe: number })[]) {
		const plusRecent = travaux[0];
		if (travailVuJusquA === null) {
			travailVuJusquA = plusRecent?.termineLe ?? 0;
			return;
		}
		const vu = travailVuJusquA;
		const nouveaux = travaux.filter((t) => t.termineLe > vu);
		const premier = nouveaux[0];
		if (premier === undefined) return;
		travailVuJusquA = premier.termineLe;
		// Sur Aujourd'hui, le bloc du pilote coche déjà ce travail sous les yeux.
		if (inscriptions.at(-1)?.ecran === 'AUJOURDHUI') return;
		direInstantane(paroleDUneRemarque(paroleDUnTravail(premier, nouveaux.length - 1), 'TRAVAIL'), DUREE_TRAVAIL_MS);
	}
};

/* ── Les crochets des écrans ──────────────────────────────────────────────── */

/**
 * CE QUE L'ÉCRAN DONNE À DIRE À PLUME — ses remarques, la plus utile d'abord, et ce
 * qu'il sait faire lui-même de leurs cibles.
 *
 * `undefined` tant que l'écran n'a pas lu ce qu'il faut : Plume attend plutôt que
 * de dire une présentation en premier faute d'avoir vu le reste. `undefined` aussi
 * quand un écran ENFANT a la parole (la liste des clients sous la fiche ouverte) :
 * React monte les effets de l'enfant avant ceux du parent, et le parent passerait
 * devant.
 *
 * ⚠️ L'EFFET TOURNE À CHAQUE RENDU, ET C'EST VOULU : il recopie la dernière liste et
 * le dernier exécutant (une fermeture qui change à chaque rendu) dans le magasin,
 * qui ne prévient la bulle que si les CLÉS ont changé.
 */
export function useRemarquesDePlume(
	ecran: EcranDePlume,
	remarques: readonly RemarqueDePlume[] | undefined,
	executer?: (cible: CibleDePlume) => boolean
) {
	const id = useId();
	useEffect(() => {
		const existante = inscriptions.find((i) => i.id === id);
		// Rien à dire (pas encore lu, ou un écran enfant a la parole) : l'écran se retire.
		if (remarques === undefined) {
			if (existante !== undefined) {
				inscriptions.splice(inscriptions.indexOf(existante), 1);
				choisir();
			}
			return;
		}
		if (existante === undefined) {
			inscriptions.push({ id, ecran, remarques, executer });
			choisir();
			return;
		}
		const avant = existante.remarques.map((r) => r.cle).join('|');
		existante.remarques = remarques;
		existante.executer = executer;
		if (avant !== remarques.map((r) => r.cle).join('|')) choisir();
	});
	useEffect(
		() => () => {
			const rang = inscriptions.findIndex((i) => i.id === id);
			if (rang !== -1) inscriptions.splice(rang, 1);
			choisir();
		},
		[id]
	);
}

/**
 * LE PRÉNOM DU BONJOUR : le premier mot du nom du compte. Un compte nommé par son
 * adresse électronique n'a pas de prénom, et Plume dit « Bonjour » tout court.
 */
export function prenomDe(nom: string | null | undefined): string | null {
	const premier = (nom ?? '').trim().split(/\s+/)[0] ?? '';
	if (premier === '' || premier.includes('@')) return null;
	return premier;
}

/** La parole courante, pour la bulle. */
export function useParoleDePlume(): ParoleAffichee | null {
	return useSyncExternalStore(paroleDePlume.abonner, paroleDePlume.lire, () => null);
}

/**
 * PLUME DIT CE QUE VOUS VENEZ DE FAIRE — à la place du toast, depuis sa bulle.
 *
 * ⚠️ SANS BULLE, LE MOT PART QUAND MÊME. Dans une conversation ou un démarrage
 * guidé, la barre (et Plume avec elle) laisse la place au compositeur : le mot
 * redevient un toast, avec son titre.
 */
export function usePlumeDit() {
	const toast = useToast();
	return function dire(mot: {
		/** Le titre du toast, quand il n'y a pas de bulle. */
		readonly titre: string;
		readonly texte: ReactNode;
		readonly geste?: GesteDeBulle;
		readonly humeur?: 'content' | 'attention';
		readonly dureeMs?: number;
	}) {
		if (hotes === 0) {
			const geste = mot.geste;
			toast({
				title: mot.titre,
				text:
					geste === undefined ? (
						mot.texte
					) : (
						<>
							{mot.texte}{' '}
							<button
								type="button"
								className="font-medium text-cladd-primary underline underline-offset-2"
								onClick={geste.faire}
							>
								{geste.libelle}
							</button>
						</>
					),
				...(mot.dureeMs === undefined ? {} : { timeout: mot.dureeMs })
			});
			return;
		}
		direInstantane(
			{
				cle: `geste:${Math.random().toString(36).slice(2)}`,
				voix: 'GESTE',
				texte: mot.texte,
				humeur: mot.humeur ?? 'content',
				silencieuse: false,
				...(mot.geste === undefined ? {} : { geste: mot.geste })
			},
			mot.dureeMs ?? DUREE_GESTE_MS
		);
	};
}
