import { enEuros } from '../../notifications/paiements';
import { ajouterJours } from './calendrier';
import { jourDeParis } from './compagnon/journee';

/**
 * « VOTRE SEMAINE » (21/10/2026, le parcours de l'habitude,
 * `docs/superpowers/specs/2026-10-21-parcours-habitude-design.md`).
 *
 * La semaine écoulée, du lundi au dimanche à Paris : ce qui est rentré, les relances
 * parties, les clients qui ont payé, la date limite la plus proche, les huit dernières
 * semaines en barres, et la meilleure semaine depuis longtemps quand elle l'est. Le
 * module compose ; Convex lit (`convex/recouvrement/semaine.ts`).
 *
 * ⚠️ UNE SEMAINE VIDE NE FAIT RIEN : rien rentré, rien parti, aucune date limite à moins
 * de trente jours, et il n'y a ni carte, ni e-mail, ni écran à zéros.
 */

/** Une date limite plus lointaine ne suffit pas à faire une semaine. */
export const DATE_LIMITE_PROCHE_JOURS = 30;
/** « Meilleure semaine depuis… » ne se dit qu'au-delà de quatre semaines dépassées. */
export const SEMAINES_POUR_UN_RECORD = 4;

export interface VotreSemaine {
	readonly debut: string;
	readonly fin: string;
	readonly rentre: bigint;
	readonly relancesParties: number;
	readonly clientsQuiOntPaye: number;
	readonly dateLimiteDansJours: number | null;
	/** Les semaines depuis l'arrivée, huit au plus, de la plus ancienne à celle-ci. */
	readonly huitSemaines: bigint[];
	/** Le lundi de la dernière semaine qui la dépassait, ou `'arrivee'`. */
	readonly meilleureDepuis: string | null;
}

/** Le lundi de la semaine d'un jour (AAAA-MM-JJ). */
export function lundiDe(date: string): string {
	const jour = new Date(`${date}T12:00:00Z`).getUTCDay();
	return ajouterJours(date, -((jour + 6) % 7));
}

export function bornesDeLaSemaineEcoulee(maintenant: number): {
	readonly debut: string;
	readonly fin: string;
} {
	const debut = ajouterJours(lundiDe(jourDeParis(maintenant)), -7);
	return { debut, fin: ajouterJours(debut, 6) };
}

/**
 * LA MEILLEURE SEMAINE DEPUIS… La semaine dépasse les précédentes une à une, en
 * remontant ; au-delà de quatre, on nomme la dernière qui la dépassait, ou l'arrivée
 * quand rien ne l'a jamais dépassée.
 */
function meilleureDepuis(
	rentre: bigint,
	historique: readonly bigint[],
	datesDesSemaines: readonly string[],
	arriveeLe: string
): string | null {
	let depassees = 0;
	while (depassees < historique.length && rentre > historique[depassees]!) depassees += 1;
	if (depassees < SEMAINES_POUR_UN_RECORD) return null;
	if (depassees < historique.length) return datesDesSemaines[depassees] ?? null;
	const plusAncienne = datesDesSemaines[historique.length - 1];
	if (plusAncienne === undefined) return null;
	return plusAncienne <= lundiDe(arriveeLe) ? 'arrivee' : plusAncienne;
}

/** Le délai d'une date limite, court : « dans 12 j », « aujourd'hui ». */
export function delaiLisible(jours: number): string {
	return jours === 0 ? 'aujourd’hui' : `dans ${jours} j`;
}

/** La semaine en une phrase, pour l'objet de l'e-mail et la notification. */
export function phraseDeLaSemaine(s: VotreSemaine): string {
	if (s.rentre > 0n) {
		const ont = s.clientsQuiOntPaye > 1 ? 'clients ont' : 'client a';
		return `${enEuros(s.rentre)} rentrés, ${s.clientsQuiOntPaye} ${ont} payé.`;
	}
	if (s.relancesParties > 0) {
		const pl = s.relancesParties > 1 ? 's' : '';
		return `${s.relancesParties} relance${pl} partie${pl}.`;
	}
	const jours = s.dateLimiteDansJours ?? 0;
	return jours === 0
		? 'Une date limite pour agir tombe aujourd’hui.'
		: `Une date limite pour agir dans ${jours} jour${jours > 1 ? 's' : ''}.`;
}

/** Les rangées de l'e-mail du lundi : ce qui n'est pas nul, jamais un compteur à zéro. */
export function rangeesDeLaSemaine(
	s: VotreSemaine
): { readonly libelle: string; readonly valeur: string }[] {
	return [
		...(s.relancesParties > 0
			? [{ libelle: 'Relances parties', valeur: String(s.relancesParties) }]
			: []),
		...(s.clientsQuiOntPaye > 0
			? [{ libelle: 'Clients qui ont payé', valeur: String(s.clientsQuiOntPaye) }]
			: []),
		...(s.dateLimiteDansJours === null
			? []
			: [{ libelle: 'Date limite la plus proche', valeur: delaiLisible(s.dateLimiteDansJours) }])
	];
}

/**
 * LE LUNDI, UN SEUL E-MAIL PAR PERSONNE. « Votre semaine » va à qui reçoit les e-mails
 * du matin, ne l'a pas coupée et que le budget d'attention accorde, quand la semaine
 * n'est pas vide ; le point du matin va aux autres. Jamais les deux.
 *
 * ET UN SEUL CANAL HORS DE L'APPLICATION : qui reçoit l'e-mail ne reçoit pas en plus la
 * notification et son push ; les autres, s'ils n'ont pas coupé « Votre semaine », la
 * reçoivent à sa place. Dans l'application, la carte du lundi suffit.
 */
export function repartirLeLundi(
	membres: readonly {
		readonly userId: string;
		/** Les e-mails du matin, réglés dans le profil. */
		readonly pointDuMatin: boolean;
		/** La catégorie « Votre semaine » coupée dans les réglages des notifications. */
		readonly semaineCoupee: boolean;
		readonly paroleAccordee: boolean;
	}[],
	semaineVide: boolean
): {
	readonly semaine: string[];
	readonly pointDuMatin: string[];
	readonly notification: string[];
} {
	const semaine: string[] = [];
	const pointDuMatin: string[] = [];
	const notification: string[] = [];
	for (const m of membres) {
		const parEmail = m.pointDuMatin && !semaineVide && !m.semaineCoupee && m.paroleAccordee;
		if (parEmail) semaine.push(m.userId);
		else if (m.pointDuMatin) pointDuMatin.push(m.userId);
		if (!parEmail && !semaineVide && !m.semaineCoupee) notification.push(m.userId);
	}
	return { semaine, pointDuMatin, notification };
}

export function composerLaSemaine(d: {
	readonly debut: string;
	readonly fin: string;
	readonly paiements: readonly {
		readonly date: string;
		readonly montant: bigint;
		readonly debiteurId: string;
	}[];
	readonly relancesParties: number;
	readonly dateLimiteDansJours: number | null;
	/** Ce qui est rentré les semaines d'avant, de la plus récente à la plus ancienne. */
	readonly historique: readonly bigint[];
	/** Le lundi de chacune de ces semaines, dans le même ordre. */
	readonly datesDesSemaines: readonly string[];
	readonly arriveeLe: string;
}): VotreSemaine | null {
	const dansLaSemaine = d.paiements.filter((p) => p.date >= d.debut && p.date <= d.fin);
	const rentre = dansLaSemaine.reduce((total, p) => total + p.montant, 0n);
	const limiteProche =
		d.dateLimiteDansJours !== null && d.dateLimiteDansJours < DATE_LIMITE_PROCHE_JOURS;
	if (rentre === 0n && d.relancesParties === 0 && !limiteProche) return null;
	return {
		debut: d.debut,
		fin: d.fin,
		rentre,
		relancesParties: d.relancesParties,
		clientsQuiOntPaye: new Set(dansLaSemaine.map((p) => p.debiteurId)).size,
		dateLimiteDansJours: d.dateLimiteDansJours,
		huitSemaines: [...d.historique.slice(0, 7)].reverse().concat(rentre),
		meilleureDepuis: meilleureDepuis(rentre, d.historique, d.datesDesSemaines, d.arriveeLe)
	};
}
