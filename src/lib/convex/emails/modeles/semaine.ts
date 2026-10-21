import { coquilleHtml, coquilleTexte, type BlocEmail, type RangeeEmail } from './disposition';

export type SemaineData = {
	nomEntreprise: string;
	/** « la semaine du 12 oct. 2026 », déjà formaté par l'appelant. */
	periode: string;
	/** Ce qui est rentré, formaté ; `null` quand rien n'est rentré (pas de cadran à zéro). */
	rentreLisible: string | null;
	/** « Votre meilleure semaine depuis… », quand elle l'est. */
	meilleure: string | null;
	rangees: readonly RangeeEmail[];
	url: string;
};

/**
 * « VOTRE SEMAINE », LE LUNDI, SIGNÉ PLUME (21/10/2026, le parcours de l'habitude).
 *
 * Il remplace le point du matin de ce lundi pour qui le reçoit : un seul e-mail. Les
 * chiffres arrivent formatés, comme ceux de l'écran (`convex/recouvrement/semaine.ts`).
 *
 * ⚠️ IL PART VERS LE GÉRANT, JAMAIS VERS SON CLIENT, et il dit ce qui est rentré, jamais
 * grâce à qui.
 */

const CHEMIN = 'Pour ne plus le recevoir par e-mail : Votre compte, puis Votre profil.';

function bloc(d: SemaineData): BlocEmail {
	const intro = `Ce qui s’est passé ${d.periode}, chez ${d.nomEntreprise}.`;
	return {
		apercu: d.rentreLisible === null ? intro : `${d.rentreLisible} rentrés ${d.periode}.`,
		plume: true,
		titre: 'Votre semaine',
		intro,
		...(d.rentreLisible === null
			? {}
			: {
					montant: {
						libelle: 'Rentré sur la semaine',
						valeur: d.rentreLisible,
						...(d.meilleure === null ? {} : { precision: d.meilleure })
					}
				}),
		rangees: d.rangees,
		bouton: { libelle: 'Voir votre semaine', url: d.url },
		note: `Vous recevez ce point le lundi parce que ${d.nomEntreprise} est suivie par Letikette. ${CHEMIN}`
	};
}

export function semaineHtml(d: SemaineData): string {
	return coquilleHtml(bloc(d));
}

export function semaineTexte(d: SemaineData): string {
	return coquilleTexte(bloc(d));
}
