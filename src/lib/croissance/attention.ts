import { jourDeParis } from '../admin/dates';
import { ECART_MINIMAL_MS } from './conseils';

/**
 * LE BUDGET D'ATTENTION — UN SEUL CHEF D'ORCHESTRE (21/10/2026, le parcours de
 * l'habitude, `docs/superpowers/specs/2026-10-21-parcours-habitude-design.md`).
 *
 * Toute prise de parole qui n'est pas transactionnelle — la carte du moment, une
 * célébration, la proposition des notifications, la ligne d'année ou de recommandation,
 * « Votre semaine », le réveil, les conseils — demande la parole ici avant de se montrer
 * ou de partir. Trois circuits qui s'additionnaient deviennent un seul budget :
 *
 *   · dans l'APPLICATION : une prise de parole par jour (heure de Paris) ;
 *   · par E-MAIL : deux jours d'écart au moins (la cadence des conseils) et deux par
 *     semaine au plus ;
 *   · deux paroles de l'application IGNORÉES d'affilée (montrées, jamais ouvertes) font
 *     taire l'application quatorze jours — les e-mails n'ont pas d'ouverture mesurée ;
 *   · « Ne plus me le proposer » : la clé `marketing:<genre>` des silences de Plume.
 *
 * Le module décide ; Convex lit l'historique, demande et inscrit
 * (`convex/croissance/attention.ts`).
 */

export type Canal = 'APP' | 'EMAIL';

export interface PriseDeParole {
	readonly canal: Canal;
	readonly genre: string;
	readonly cle: string;
	readonly le: number;
	readonly ouverteLe: number | null;
	readonly expireeLe: number | null;
}

export type RefusDeParole = 'COUPE' | 'DEJA_AUJOURDHUI' | 'CADENCE' | 'SEMAINE_PLEINE' | 'IGNORE';

const JOUR = 24 * 60 * 60 * 1000;
export const SILENCE_APRES_IGNORE_MS = 14 * JOUR;
export const EMAILS_PAR_SEMAINE = 2;

/** La clé de silence d'un genre : « Ne plus me le proposer ». */
export function cleDeSilence(genre: string): string {
	return `marketing:${genre}`;
}

export function peutParler(
	historique: readonly PriseDeParole[],
	demande: { readonly canal: Canal; readonly genre: string },
	maintenant: number,
	coupes: ReadonlySet<string>
): { readonly ok: true } | { readonly ok: false; readonly raison: RefusDeParole } {
	if (coupes.has(cleDeSilence(demande.genre))) return { ok: false, raison: 'COUPE' };
	const memeCanal = historique.filter((p) => p.canal === demande.canal).sort((a, b) => b.le - a.le);

	if (demande.canal === 'APP') {
		const aujourdHui = jourDeParis(maintenant);
		if (memeCanal.some((p) => jourDeParis(p.le) === aujourdHui)) {
			return { ok: false, raison: 'DEJA_AUJOURDHUI' };
		}
		const [derniere, avantDerniere] = memeCanal;
		const ignoree = (p: PriseDeParole | undefined) =>
			p !== undefined && p.ouverteLe === null && p.expireeLe !== null;
		if (
			ignoree(derniere) &&
			ignoree(avantDerniere) &&
			derniere!.le > maintenant - SILENCE_APRES_IGNORE_MS
		) {
			return { ok: false, raison: 'IGNORE' };
		}
		return { ok: true };
	}

	const derniere = memeCanal[0];
	if (derniere !== undefined && derniere.le > maintenant - ECART_MINIMAL_MS) {
		return { ok: false, raison: 'CADENCE' };
	}
	const semaine = lundiDeParis(maintenant);
	if (memeCanal.filter((p) => lundiDeParis(p.le) === semaine).length >= EMAILS_PAR_SEMAINE) {
		return { ok: false, raison: 'SEMAINE_PLEINE' };
	}
	return { ok: true };
}

/** Le lundi de la semaine d'un instant, à Paris (AAAA-MM-JJ). */
export function lundiDeParis(instant: number): string {
	const jour = jourDeParis(instant);
	const midi = Date.parse(`${jour}T12:00:00Z`);
	const decalage = (new Date(midi).getUTCDay() + 6) % 7;
	return new Date(midi - decalage * JOUR).toISOString().slice(0, 10);
}
