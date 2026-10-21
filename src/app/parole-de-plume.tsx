import { useEffect, useId, useSyncExternalStore, type ReactNode } from 'react';
import { useToast } from '@cladd-ui/react';
import type {
	CibleDePlume,
	EcranDePlume,
	RemarqueDePlume,
	TravailTermine
} from '../lib/verticales/recouvrement/compagnon/presence';
import {
	paroleDUneNotification,
	paroleDUnPaiement,
	paroleDUnTravail
} from '../lib/verticales/recouvrement/compagnon/presence';
import {
	paroleDeLaJourneeBouclee,
	type JourDeLaSemaine
} from '../lib/verticales/recouvrement/compagnon/journee';
import type { PointDuRetour } from '../lib/verticales/recouvrement/compagnon/retour';
import type { HumeurPlume } from '../ui';

/**
 * LA PAROLE DE PLUME — ce qu'il a à vous dire, et ce qu'il dit maintenant.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ REFAITE LE SOIR DU 13/10/2026 : « LES BULLES SE FERMENT TRÈS VITE »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La première version disait UNE chose par écran, et la reprenait au bout de six à
 * vingt secondes. Le fondateur : « pas assez utiles […] il faut que ce soit utile
 * tout le temps ». Sur Duolingo, Duo dit ce qu'il a à dire, une chose après l'autre,
 * et rien ne part avant « Continuer ». Désormais :
 *
 *   · Plume a une PILE de choses à dire, la plus pressante d'abord : le mot après
 *     votre geste, une fête (de l'argent rentré, la journée bouclée), une nouvelle
 *     (un travail fini, une notification), ce qui vous attend (les défis du jour), et
 *     ce qu'il a à dire de l'écran ;
 *   · il ne se tait que si on le lui dit : « Suivant », le ✕, ou le défilement, qui le
 *     renvoie dans la barre. Aucune minuterie ;
 *   · ce qu'il n'a pas encore dit se COMPTE sur la pastille du bouton ; toucher Plume
 *     le fait dire. Quand il n'a plus rien à dire, le toucher ouvre sa conversation.
 *
 * Il s'ouvre seul pour ce qui ne peut pas attendre (le mot après un geste, une fête,
 * une nouvelle) et pour la première remarque de chaque écran visité ; jamais pour un
 * défi seul : la pastille et l'anneau le disent sans interrompre.
 *
 * ⚠️ ET À VOTRE RETOUR, SON POINT D'ABORD (14/10/2026). Ce qui s'est passé pendant
 * votre absence (relances parties à votre nom, paiements reçus, dossiers ouverts)
 * ne s'annonçait jamais : seul ce qui arrivait sous vos yeux se disait. La voix du
 * RETOUR (`compagnon/retour.ts`) passe en premier, s'ouvre seule, et fait taire le
 * bonjour d'Aujourd'hui quand elle le dit déjà.
 *
 * ⚠️ UN MAGASIN HORS DE REACT, ET C'EST CE QUI TIENT LA RÈGLE DES EFFETS. Les écrans
 * annoncent leurs remarques depuis un effet : posées dans un état React, ce serait
 * un `setState` dans un effet. Le magasin est un système extérieur que l'effet
 * synchronise ; il ne prévient la scène que quand ce qui se dit change.
 */

/** Le geste d'un mot : son libellé, et ce qu'il fait. */
export interface GesteDeBulle {
	readonly libelle: string;
	readonly faire: () => void;
}

/** Qui parle par la bouche de Plume, du plus pressant au moins pressant. */
export type VoixDePlume = 'GESTE' | 'RETOUR' | 'FETE' | 'NOUVELLE' | 'BESOIN' | 'ECRAN';

export interface ParoleAffichee {
	readonly cle: string;
	readonly voix: VoixDePlume;
	readonly texte: ReactNode;
	readonly humeur: HumeurPlume;
	/** Pour une remarque : la cible, que la scène traduit en route ou en geste. */
	readonly cible?: CibleDePlume;
	readonly libelleDuGeste?: string;
	/** Pour un mot après un geste : ce que fait son bouton (« Annuler », « La relire »). */
	readonly geste?: GesteDeBulle;
	/** « Ne plus me le dire » : ce qui peut se taire pour de bon. */
	readonly silencieuse: boolean;
	/** La semaine en coches, pour une journée bouclée. */
	readonly semaine?: readonly JourDeLaSemaine[];
	/** Les faits comptés du point du retour, une ligne chacun. */
	readonly releve?: PointDuRetour['lignes'];
	/** Le pied propre à cette parole (ce qui part ensuite), à la place de celui de la scène. */
	readonly pied?: string;
}

/** Ce que la scène lit : la parole ouverte, sa place dans la pile, et ce qui reste à dire. */
export interface EtatDeLaParole {
	readonly ouverte: {
		readonly parole: ParoleAffichee;
		readonly position: number;
		readonly total: number;
	} | null;
	/** Ce que Plume n'a pas encore dit : la pastille du bouton. */
	readonly aDire: number;
}

interface Inscription {
	readonly id: string;
	readonly ecran: EcranDePlume;
	remarques: readonly RemarqueDePlume[];
	/** Ce que l'écran fait lui-même d'une cible (préparer, reprendre, ouvrir une rangée). */
	executer: ((cible: CibleDePlume) => boolean) | undefined;
}

/* ── L'état, hors de React ────────────────────────────────────────────────── */

const inscriptions: Inscription[] = [];
/** Ce qui ne peut pas attendre, dans l'ordre d'arrivée. */
let instantanees: ParoleAffichee[] = [];
/** Les défis du jour, dits par Plume (`journee.ts`). */
let besoins: ParoleAffichee[] = [];
/** Les clés déjà dites pendant cette session : jamais deux fois. */
const entendues = new Set<string>();
/** Les visites (une inscription) dont la première remarque a ouvert la scène. */
const visitesOuvertes = new Set<string>();
let silences: ReadonlySet<string> | null = null;
let ouverte: { pile: ParoleAffichee[]; index: number } | null = null;
let taireAuServeur: ((cle: string) => void) | null = null;
/** Les scènes montées : sans aucune (une conversation), un mot part en toast. */
let hotes = 0;

/** Ce qui est déjà vu des flux annoncés : ce qui est plus vieux ne s'annonce pas. */
let travailVuJusquA: number | null = null;
let notificationVueJusquA: number | null = null;
let paiementVuJusquA: number | null = null;
/**
 * LA FÊTE D'UN PAIEMENT ATTEND SON RELEVÉ (21/10/2026). Le relevé des jalons suit le
 * paiement de quelques instants (`recouvrement/jalons.ts`) ; un paiement qui en fait
 * franchir un se fête par la célébration, pas par la bulle.
 */
const ATTENTE_DU_RELEVE_MS = 2500;
let feteEnAttente: {
	readonly id: string;
	readonly minuteur: ReturnType<typeof setTimeout>;
} | null = null;
let journeeVue: { readonly jour: string; readonly tenue: boolean } | null = null;

const abonnes = new Set<() => void>();
let instantane: EtatDeLaParole = { ouverte: null, aDire: 0 };

function paroleDUneRemarque(r: RemarqueDePlume, voix: VoixDePlume): ParoleAffichee {
	return {
		cle: r.cle,
		voix,
		texte: r.texte,
		humeur: r.humeur,
		silencieuse: (voix === 'ECRAN' || voix === 'BESOIN') && r.silence === 'AU_REFUS',
		...(r.action === undefined ? {} : { cible: r.action.cible, libelleDuGeste: r.action.libelle })
	};
}

function tueOuEntendue(p: ParoleAffichee): boolean {
	return entendues.has(p.cle) || (silences?.has(p.cle) ?? false);
}

/** Ce que l'écran courant fait dire. L'écran courant est la DERNIÈRE inscription. */
function remarquesDeLEcran(): ParoleAffichee[] {
	return (inscriptions.at(-1)?.remarques ?? []).map((r) => paroleDUneRemarque(r, 'ECRAN'));
}

/** TOUT CE QUE PLUME A ENCORE À DIRE, le plus pressant d'abord, sans doublon. */
function aDire(): ParoleAffichee[] {
	if (silences === null) return instantanees.filter((p) => !tueOuEntendue(p));
	const vues = new Set<string>();
	return [...instantanees, ...besoins, ...remarquesDeLEcran()].filter((p) => {
		if (vues.has(p.cle) || tueOuEntendue(p)) return false;
		vues.add(p.cle);
		return true;
	});
}

/** Plume le dit : entendu pour la session ; une présentation ne se redira plus. */
function dire(p: ParoleAffichee) {
	entendues.add(p.cle);
	if (p.voix === 'ECRAN' && !p.silencieuse) taireAuServeur?.(p.cle);
}

function prevenir() {
	const courante = ouverte === null ? null : (ouverte.pile[ouverte.index] ?? null);
	const suivant: EtatDeLaParole = {
		ouverte:
			ouverte === null || courante === null
				? null
				: { parole: courante, position: ouverte.index + 1, total: ouverte.pile.length },
		aDire: aDire().length
	};
	const avant = instantane;
	if (
		avant.aDire === suivant.aDire &&
		avant.ouverte?.parole === suivant.ouverte?.parole &&
		avant.ouverte?.position === suivant.ouverte?.position &&
		avant.ouverte?.total === suivant.ouverte?.total
	)
		return;
	instantane = suivant;
	for (const abonne of abonnes) abonne();
}

/** OUVRIR LA SCÈNE sur une pile, à partir d'une parole. */
function ouvrirSur(pile: ParoleAffichee[], depart: number): boolean {
	const premiere = pile[depart];
	if (premiere === undefined) return false;
	ouverte = { pile, index: depart };
	dire(premiere);
	return true;
}

/**
 * CE QUI OUVRE LA SCÈNE SEULE — après chaque changement, scène fermée : ce qui ne peut
 * pas attendre, puis la première remarque d'un écran qu'on vient d'ouvrir.
 */
function verifier() {
	if (ouverte === null && hotes > 0) {
		const pile = aDire();
		const pressante = pile.findIndex(
			(p) => p.voix === 'GESTE' || p.voix === 'RETOUR' || p.voix === 'FETE' || p.voix === 'NOUVELLE'
		);
		if (pressante !== -1) ouvrirSur(pile, pressante);
		else {
			const visite = inscriptions.at(-1);
			if (visite !== undefined && silences !== null && !visitesOuvertes.has(visite.id)) {
				const rang = pile.findIndex((p) => p.voix === 'ECRAN');
				if (rang !== -1) {
					visitesOuvertes.add(visite.id);
					// La remarque de l'écran d'abord, puis le reste de ce qu'il a à dire.
					const [remarque] = pile.splice(rang, 1);
					if (remarque !== undefined) ouvrirSur([remarque, ...pile], 0);
				}
			}
		}
	}
	prevenir();
}

function annoncer(p: ParoleAffichee) {
	if (tueOuEntendue(p) || instantanees.some((q) => q.cle === p.cle)) return;
	instantanees = [...instantanees.filter((q) => !entendues.has(q.cle)), p];
	if (ouverte !== null) {
		// Scène ouverte : le mot après un geste passe tout de suite, le reste attend son tour.
		const pile = ouverte.pile.filter((q) => q.cle !== p.cle);
		if (p.voix === 'GESTE') {
			pile.splice(ouverte.index + 1, 0, p);
			ouverte = { pile, index: ouverte.index + 1 };
			dire(p);
		} else ouverte = { pile: [...pile, p], index: ouverte.index };
	}
	verifier();
}

/* ── Ce que la scène lit et fait ──────────────────────────────────────────── */

export const paroleDePlume = {
	abonner(abonne: () => void) {
		abonnes.add(abonne);
		return () => {
			abonnes.delete(abonne);
		};
	},
	lire(): EtatDeLaParole {
		return instantane;
	},
	/** L'écran courant : le regard de la conversation, et Aujourd'hui qui montre déjà le pilote. */
	ecranCourant(): EcranDePlume | null {
		return inscriptions.at(-1)?.ecran ?? null;
	},
	/** La scène se monte : la façon d'écrire les silences. */
	monter(taire: (cle: string) => void) {
		hotes += 1;
		taireAuServeur = taire;
		verifier();
		return () => {
			hotes -= 1;
			if (hotes === 0) {
				taireAuServeur = null;
				ouverte = null;
				prevenir();
			}
		};
	},
	poserSilences(cles: readonly string[]) {
		silences = new Set(cles);
		verifier();
	},
	/** Les défis du jour, en paroles : ils se comptent sur la pastille, sans interrompre. */
	poserBesoins(remarques: readonly RemarqueDePlume[]) {
		besoins = remarques.map((r) => paroleDUneRemarque(r, 'BESOIN'));
		verifier();
	},
	/** Ce que l'écran courant fait lui-même d'une cible ; `false` laisse la scène y mener. */
	executer(cible: CibleDePlume): boolean {
		return inscriptions.at(-1)?.executer?.(cible) ?? false;
	},
	/** TOUCHER PLUME : il dit ce qu'il a à dire. `false` s'il n'a rien : la conversation s'ouvre. */
	ouvrir(): boolean {
		if (ouverte !== null) return true;
		const fait = ouvrirSur(aDire(), 0);
		prevenir();
		return fait;
	},
	/** « Suivant » : la parole d'après. */
	suivant() {
		if (ouverte === null) return;
		const index = ouverte.index + 1;
		const prochaine = ouverte.pile[index];
		if (prochaine === undefined) ouverte = null;
		else {
			ouverte = { pile: ouverte.pile, index };
			dire(prochaine);
		}
		prevenir();
	},
	/** Le ✕, ou un geste fait : Plume rentre dans la barre ; ce qu'il n'a pas dit l'attend. */
	fermer() {
		ouverte = null;
		prevenir();
	},
	/** Le défilement : comme le ✕, sans rien faire taire. */
	ranger() {
		if (ouverte === null) return;
		ouverte = null;
		prevenir();
	},
	/** « Ne plus me le dire » : tu pour de bon, puis la parole d'après. */
	taire(parole: ParoleAffichee) {
		silences = new Set([...(silences ?? []), parole.cle]);
		taireAuServeur?.(parole.cle);
		if (ouverte !== null) {
			const pile = ouverte.pile.filter((p) => p.cle !== parole.cle);
			const index = Math.min(ouverte.index, pile.length - 1);
			const prochaine = pile[index];
			ouverte = prochaine === undefined ? null : { pile, index };
			if (prochaine !== undefined) dire(prochaine);
		}
		prevenir();
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
		annoncer(paroleDUneRemarque(paroleDUnTravail(premier, nouveaux.length - 1), 'NOUVELLE'));
	},
	/**
	 * LE POINT DU RETOUR — dit une fois, en premier. Quand il dit bonjour, le bonjour
	 * d'Aujourd'hui (une fois par jour) est tenu pour dit.
	 */
	annoncerRetour(point: PointDuRetour, cleDuBonjour: string) {
		if (point.ditBonjour) {
			entendues.add(cleDuBonjour);
			taireAuServeur?.(cleDuBonjour);
		}
		annoncer({
			cle: point.cle,
			voix: 'RETOUR',
			texte: point.texte,
			humeur: point.humeur,
			cible: { genre: point.cible },
			libelleDuGeste: point.libelleDuGeste,
			silencieuse: false,
			releve: point.lignes,
			pied: point.pied
		});
	},
	/** UNE NOTIFICATION ARRIVÉE — sauf sur la boîte de réception, qui la montre déjà. */
	annoncerNotification(
		derniere: { readonly id: string; readonly creeeLe: number; readonly lue: boolean } | null,
		titre: string | null,
		surLaBoite: boolean
	) {
		if (notificationVueJusquA === null) {
			notificationVueJusquA = derniere?.creeeLe ?? 0;
			return;
		}
		if (derniere === null || derniere.creeeLe <= notificationVueJusquA) return;
		notificationVueJusquA = derniere.creeeLe;
		if (derniere.lue || surLaBoite || titre === null) return;
		annoncer(paroleDUneRemarque(paroleDUneNotification(derniere.id, titre), 'NOUVELLE'));
	},
	/**
	 * DE L'ARGENT EST RENTRÉ — fêté, sauf sur la fiche du client, où « Virement noté »
	 * vient de poser sa coche, et sauf quand il fait franchir un jalon : la célébration
	 * le fêtera à la visite suivante.
	 */
	annoncerPaiement(
		dernier: {
			readonly id: string;
			readonly client: string;
			readonly creeLe: number;
			readonly porteUnJalon: boolean;
		} | null,
		montant: string | null
	) {
		if (dernier?.porteUnJalon === true && feteEnAttente?.id === dernier.id) {
			clearTimeout(feteEnAttente.minuteur);
			feteEnAttente = null;
		}
		if (paiementVuJusquA === null) {
			paiementVuJusquA = dernier?.creeLe ?? 0;
			return;
		}
		if (dernier === null || montant === null || dernier.creeLe <= paiementVuJusquA) return;
		paiementVuJusquA = dernier.creeLe;
		if (dernier.porteUnJalon || inscriptions.at(-1)?.ecran === 'CLIENT') return;
		if (feteEnAttente !== null) clearTimeout(feteEnAttente.minuteur);
		const fete = paroleDUneRemarque(paroleDUnPaiement(dernier.id, dernier.client, montant), 'FETE');
		feteEnAttente = {
			id: dernier.id,
			minuteur: setTimeout(() => {
				feteEnAttente = null;
				// Passé sur la fiche du client entre-temps : « Virement noté » y a déjà sa coche.
				if (inscriptions.at(-1)?.ecran === 'CLIENT') return;
				annoncer(fete);
			}, ATTENTE_DU_RELEVE_MS)
		};
	},
	/**
	 * LA JOURNÉE BOUCLÉE — fêtée quand le dernier défi tombe SOUS LES YEUX du gérant :
	 * une journée déjà tenue à l'ouverture, ou qui n'avait rien à faire, ne se fête pas.
	 */
	suivreLaJournee(journee: {
		readonly jour: string;
		readonly tenue: boolean;
		readonly total: number;
		readonly serie: number;
		readonly semaine: readonly JourDeLaSemaine[];
	}) {
		const avant = journeeVue;
		journeeVue = { jour: journee.jour, tenue: journee.tenue };
		if (avant === null || avant.jour !== journee.jour) return;
		if (avant.tenue || !journee.tenue || journee.total === 0) return;
		annoncer({
			...paroleDUneRemarque(paroleDeLaJourneeBouclee(journee.jour, journee.serie), 'FETE'),
			semaine: journee.semaine
		});
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
 * qui ne prévient la scène que si les CLÉS ont changé.
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
				verifier();
			}
			return;
		}
		if (existante === undefined) {
			inscriptions.push({ id, ecran, remarques, executer });
			verifier();
			return;
		}
		const avant = existante.remarques.map((r) => r.cle).join('|');
		existante.remarques = remarques;
		existante.executer = executer;
		if (avant !== remarques.map((r) => r.cle).join('|')) verifier();
	});
	useEffect(
		() => () => {
			const rang = inscriptions.findIndex((i) => i.id === id);
			if (rang !== -1) inscriptions.splice(rang, 1);
			// La remarque d'un écran quitté ne reste pas ouverte sur le suivant.
			if (ouverte?.pile[ouverte.index]?.voix === 'ECRAN') ouverte = null;
			verifier();
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

const INITIAL: EtatDeLaParole = { ouverte: null, aDire: 0 };

/** Ce que Plume dit en ce moment, pour la scène et le bouton. */
export function useParoleDePlume(): EtatDeLaParole {
	return useSyncExternalStore(paroleDePlume.abonner, paroleDePlume.lire, () => INITIAL);
}

/**
 * PLUME DIT CE QUE VOUS VENEZ DE FAIRE — à la place du toast, depuis sa scène, qui
 * s'ouvre sur ce mot. Il reste jusqu'à ce qu'on le renvoie.
 *
 * ⚠️ SANS SCÈNE, LE MOT PART QUAND MÊME. Dans une conversation ou un démarrage
 * guidé, la barre (et Plume avec elle) laisse la place au compositeur : le mot
 * redevient un toast, avec son titre.
 */
export function usePlumeDit() {
	const toast = useToast();
	return function direLeMot(mot: {
		/** Le titre du toast, quand il n'y a pas de scène. */
		readonly titre: string;
		readonly texte: ReactNode;
		readonly geste?: GesteDeBulle;
		readonly humeur?: 'content' | 'attention' | 'ecrit' | 'fete';
		/** Le temps du toast, sans scène. La scène, elle, ne se ferme pas seule. */
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
		annoncer({
			cle: `geste:${Math.random().toString(36).slice(2)}`,
			voix: 'GESTE',
			texte: mot.texte,
			humeur: mot.humeur ?? 'content',
			silencieuse: false,
			...(mot.geste === undefined ? {} : { geste: mot.geste })
		});
	};
}
