import { ajouterJours } from './calendrier';

/**
 * LA PAROLE DU CLIENT — ce qu'il a dit qu'il ferait, et si les faits suivent.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE MODULE EXISTE (analyse des parcours du 08/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le gérant notait « il paie le 20 » ou convenait d'un paiement en trois fois,
 * et le pilote relançait quand même, le lendemain, à son nom : un rappel reçu
 * deux jours après avoir donné sa parole se lit comme « on ne vous croit pas »,
 * et c'est la relation que le gérant voulait garder qui en paie le prix. Chaser
 * et Upflow suspendent leurs relances sur une promesse de paiement ; Afterpay et
 * Tabby montrent un échéancier comme une frise de versements faits et à venir.
 *
 * Ce module dit, d'après les seuls faits (les règlements reçus), où en est une
 * promesse et où en est un échéancier, et JUSQU'À QUAND le plan de relance se
 * tait.
 *
 * ⚠️ RIEN N'EST DÉDUIT EN DROIT. Une promesse n'est pas une reconnaissance de
 * dette ; un échéancier noté n'est pas un accord signé. Ils sont lus parce
 * qu'ils portent des DATES, et qu'à ces dates on regarde si l'argent est arrivé.
 *
 * ⚠️ « TENUE » ET « NON TENUE » SONT LES MOTS DU GÉRANT, JAMAIS DU LOGICIEL
 * (`suivi.trancherPromesse`). Un virement du bon montant au bon jour ne dit pas
 * que c'est CELUI qui était promis. Ce module dit seulement ce qui est arrivé
 * depuis (`paye`, `couverte`), et la promesse fait taire le plan jusqu'à la fin
 * de son délai de grâce, quoi qu'il arrive — personne n'est relancé avant le
 * jour qu'il a donné.
 */

/**
 * LES JOURS DE GRÂCE après une date promise : un virement lancé le 20 arrive le
 * 21 ou le 22. Une cadence de produit, comme celles du plan de relance — pas une
 * valeur juridique.
 */
export const JOURS_DE_GRACE = 3;

/** Un règlement reçu sur les factures du dossier. */
export interface ReglementVu {
	/** `AAAA-MM-JJ`. */
	readonly le: string;
	/** En centimes, positif. */
	readonly montant: bigint;
}

export interface PromesseVue {
	/** Le jour où le gérant l'a notée (`AAAA-MM-JJ`) : les règlements comptent à partir de là. */
	readonly noteeLe: string;
	/** Le jour promis. */
	readonly pour: string;
	/** Ce qu'il a promis ; absent, il a promis de tout régler. */
	readonly montant?: bigint;
	/** Ce que le gérant en a dit, s'il l'a tranché. */
	readonly issue?: 'TENUE' | 'NON_TENUE';
}

export type EtatPromesse = 'EN_COURS' | 'TENUE' | 'NON_TENUE' | 'ECHUE';

export interface PromesseLue {
	/**
	 * `TENUE` / `NON_TENUE` : ce que le gérant a tranché. Sinon `EN_COURS` jusqu'à
	 * la fin du délai de grâce, puis `ECHUE` — « on ne sait pas encore ».
	 */
	readonly etat: EtatPromesse;
	/** Ce qui est arrivé depuis qu'elle a été notée : un fait, pas un verdict. */
	readonly paye: bigint;
	/** Les règlements arrivés depuis atteignent ce qui était promis. */
	readonly couverte: boolean;
	/** Le dernier jour où le plan se tait pour elle. */
	readonly finDeGrace: string;
}

function somme(reglements: readonly ReglementVu[], depuis: string): bigint {
	let total = 0n;
	for (const r of reglements) if (r.le >= depuis) total += r.montant;
	return total;
}

/**
 * OÙ EN EST UNE PROMESSE.
 *
 * @param resteDu ce qui reste dû sur le dossier, en centimes : une promesse sans
 *   montant est tenue quand il ne reste plus rien.
 */
export function lirePromesse(
	p: PromesseVue,
	reglements: readonly ReglementVu[],
	aujourdHui: string,
	resteDu: bigint
): PromesseLue {
	const paye = somme(reglements, p.noteeLe);
	const finDeGrace = ajouterJours(p.pour, JOURS_DE_GRACE);
	const couverte = p.montant === undefined ? resteDu <= 0n : paye >= p.montant;
	if (p.issue !== undefined) return { etat: p.issue, paye, couverte, finDeGrace };
	return { etat: aujourdHui <= finDeGrace ? 'EN_COURS' : 'ECHUE', paye, couverte, finDeGrace };
}

export interface EcheanceVue {
	readonly le: string;
	readonly montant: bigint;
}

export interface EcheancierVu {
	/** Le jour où il a été convenu : les règlements comptent à partir de là. */
	readonly accordeLe: string;
	readonly echeances: readonly EcheanceVue[];
	/** `TENUE` : mené à son terme ; `NON_TENUE` : arrêté par le gérant. */
	readonly issue?: 'TENUE' | 'NON_TENUE';
}

export type EtatEcheance = 'PAYEE' | 'PARTIELLE' | 'A_VENIR' | 'EN_RETARD';

export interface EcheanceLue extends EcheanceVue {
	/** Ce que les règlements couvrent de ce versement, dans l'ordre des versements. */
	readonly paye: bigint;
	readonly etat: EtatEcheance;
}

/**
 * `EN_COURS` : les versements arrivent à l'heure ; `EN_RETARD` : un versement a
 * passé son délai de grâce sans être couvert ; `TERMINE` : tout est payé ;
 * `ARRETE` : le gérant l'a arrêté.
 */
export type EtatEcheancier = 'EN_COURS' | 'EN_RETARD' | 'TERMINE' | 'ARRETE';

export interface EcheancierLu {
	readonly etat: EtatEcheancier;
	readonly echeances: readonly EcheanceLue[];
	readonly total: bigint;
	readonly paye: bigint;
	/** Le rang (0, 1…) du premier versement qui n'est pas entièrement payé. */
	readonly prochaine: number | null;
	readonly payees: number;
}

/**
 * OÙ EN EST UN ÉCHÉANCIER : les règlements reçus depuis l'accord se versent sur
 * les échéances dans l'ordre, comme un relevé de prêt.
 */
export function lireEcheancier(
	e: EcheancierVu,
	reglements: readonly ReglementVu[],
	aujourdHui: string
): EcheancierLu {
	let disponible = somme(reglements, e.accordeLe);
	const paye = disponible;
	const echeances: EcheanceLue[] = e.echeances.map((echeance) => {
		const couvert = disponible >= echeance.montant ? echeance.montant : disponible;
		disponible -= couvert;
		const etat: EtatEcheance =
			couvert >= echeance.montant
				? 'PAYEE'
				: aujourdHui > ajouterJours(echeance.le, JOURS_DE_GRACE)
					? 'EN_RETARD'
					: couvert > 0n
						? 'PARTIELLE'
						: 'A_VENIR';
		return { ...echeance, paye: couvert, etat };
	});
	const total = e.echeances.reduce((s, x) => s + x.montant, 0n);
	const premiereOuverte = echeances.findIndex((x) => x.etat !== 'PAYEE');
	const payees = echeances.filter((x) => x.etat === 'PAYEE').length;
	const etat: EtatEcheancier =
		premiereOuverte < 0 || e.issue === 'TENUE'
			? 'TERMINE'
			: e.issue === 'NON_TENUE'
				? 'ARRETE'
				: echeances.some((x) => x.etat === 'EN_RETARD')
					? 'EN_RETARD'
					: 'EN_COURS';
	return {
		etat,
		echeances,
		total,
		paye,
		prochaine: premiereOuverte < 0 ? null : premiereOuverte,
		payees
	};
}

export interface PauseDuPlan {
	/** Le dernier jour où le plan se tait (inclus). */
	readonly jusquAu: string;
	readonly raison: 'PROMESSE' | 'ECHEANCIER';
	/** Le jour promis, ou celui du prochain versement : ce que le dossier affiche. */
	readonly le: string;
	/** Ce qui est attendu ce jour-là, quand on le sait. */
	readonly montant?: bigint;
}

/**
 * JUSQU'À QUAND LE PLAN DE RELANCE SE TAIT — ou `null` s'il ne se tait pas.
 *
 * ⚠️ UNE PROMESSE EN COURS, OU UN ÉCHÉANCIER QUI ARRIVE À L'HEURE, ET RIEN
 * D'AUTRE. Une promesse échue ou un échéancier en retard ne suspendent plus
 * rien : le plan reprend, et le dossier le dit. Quand les deux suspendent, la
 * plus lointaine des deux dates l'emporte.
 */
export function pauseDuPlan({
	promesses,
	echeanciers,
	reglements,
	aujourdHui,
	resteDu
}: {
	readonly promesses: readonly PromesseVue[];
	readonly echeanciers: readonly EcheancierVu[];
	readonly reglements: readonly ReglementVu[];
	readonly aujourdHui: string;
	readonly resteDu: bigint;
}): PauseDuPlan | null {
	let pause: PauseDuPlan | null = null;
	const garder = (candidate: PauseDuPlan) => {
		if (candidate.jusquAu < aujourdHui) return;
		if (pause === null || candidate.jusquAu > pause.jusquAu) pause = candidate;
	};
	for (const p of promesses) {
		const lue = lirePromesse(p, reglements, aujourdHui, resteDu);
		if (lue.etat !== 'EN_COURS') continue;
		garder({
			jusquAu: lue.finDeGrace,
			raison: 'PROMESSE',
			le: p.pour,
			...(p.montant === undefined ? {} : { montant: p.montant })
		});
	}
	for (const e of echeanciers) {
		const lu = lireEcheancier(e, reglements, aujourdHui);
		if (lu.etat !== 'EN_COURS' || lu.prochaine === null) continue;
		const prochaine = lu.echeances[lu.prochaine];
		if (prochaine === undefined) continue;
		garder({
			jusquAu: ajouterJours(prochaine.le, JOURS_DE_GRACE),
			raison: 'ECHEANCIER',
			le: prochaine.le,
			montant: prochaine.montant - prochaine.paye
		});
	}
	return pause;
}
