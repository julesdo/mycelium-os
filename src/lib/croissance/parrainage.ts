import { PARRAINAGE } from '../config/tarifs';

/**
 * LA RECOMMANDATION (21/10/2026, le parcours de l'habitude, moment 7,
 * `docs/superpowers/specs/2026-10-21-parcours-habitude-design.md`).
 *
 * Chaque établissement a un lien personnel (`/?parrain=<code>`) ; l'établissement qui
 * s'inscrit par lui est recommandé, et quand il paie sa première vraie échéance, les deux
 * reçoivent un mois offert : une remise Paddle unique du prix mensuel HT de leur formule,
 * à leur prochaine échéance. Douze par an au plus pour qui recommande. Ce module décide ;
 * Convex attribue, déclenche et applique (`convex/croissance/parrainage.ts`, `paddle.ts`).
 *
 * ⚠️ JAMAIS SUR UNE SURFACE TOURNÉE VERS UN DÉBITEUR, jamais dans un courrier de relance.
 */

/** Dix signes, sans ceux qui se confondent (0 et O, 1, I et L) : environ cinquante bits. */
export const ALPHABET_DU_CODE = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const LONGUEUR_DU_CODE = 10;
const FORME_DU_CODE = new RegExp(`^[${ALPHABET_DU_CODE}]{${LONGUEUR_DU_CODE}}$`);
const JOUR_MS = 24 * 60 * 60 * 1000;

/** Un code tiré d'octets au hasard (`crypto.getRandomValues`). */
export function codeDepuisOctets(octets: Uint8Array): string {
	let code = '';
	for (let i = 0; i < LONGUEUR_DU_CODE; i++) {
		code += ALPHABET_DU_CODE[(octets[i] ?? 0) % ALPHABET_DU_CODE.length];
	}
	return code;
}

export function codeValide(code: string): boolean {
	return FORME_DU_CODE.test(code);
}

/** Le code d'une adresse (`?parrain=`), en capitales, ou `null` s'il n'a pas la forme. */
export function codeDeLAdresse(adresse: string): string | null {
	try {
		const code = new URL(adresse).searchParams.get('parrain')?.trim().toUpperCase() ?? '';
		return codeValide(code) ? code : null;
	} catch {
		return null;
	}
}

export interface RecompenseGagnee {
	readonly raison: 'PARRAIN' | 'FILLEUL';
	readonly gagneeLe: number;
}

/** Qui recommande reçoit au plus douze mois par année glissante ; le recommandé, toujours le sien. */
export function peutRecevoirUneRecompense(
	recompenses: readonly RecompenseGagnee[],
	maintenant: number
): boolean {
	const depuis = maintenant - 365 * JOUR_MS;
	const dansLAnnee = recompenses.filter((r) => r.raison === 'PARRAIN' && r.gagneeLe > depuis);
	return dansLAnnee.length < PARRAINAGE.recompensesParAn;
}

/**
 * UNE REMISE COURT-ELLE ENCORE À LA PROCHAINE ÉCHÉANCE ? Un abonnement Paddle n'en porte
 * qu'une : la récompense attend la fin de la remise de bienvenue (décision 4 de la spec).
 */
export function remiseQuiCourt(
	remise: { readonly ends_at: string | null } | null,
	prochaineEcheance: string | null
): boolean {
	if (remise === null) return false;
	if (remise.ends_at === null || prochaineEcheance === null) return true;
	return Date.parse(remise.ends_at) >= Date.parse(prochaineEcheance);
}
