import { PARRAINAGE } from '../config/tarifs';

/**
 * LA RECOMMANDATION (21/10/2026, le parcours de l'habitude, moment 7,
 * `docs/superpowers/specs/2026-10-21-parcours-habitude-design.md`).
 *
 * Chaque établissement a un lien personnel (`/invitation/<code>`) ; l'établissement qui
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

/** Le chemin de la page d'invitation, celui que la page « Recommander » partage. */
export const CHEMIN_D_INVITATION = 'invitation';

/** L'adresse à partager : la page qui dit à l'invité qui lui offre quoi. */
export function lienDInvitation(origine: string, code: string): string {
	return `${origine}/${CHEMIN_D_INVITATION}/${code}`;
}

/**
 * Le code d'une adresse, en capitales, ou `null` s'il n'a pas la forme : le chemin de
 * l'invitation (`/invitation/<code>`), ou l'ancien paramètre (`?parrain=`).
 */
export function codeDeLAdresse(adresse: string): string | null {
	try {
		const url = new URL(adresse);
		const morceaux = url.pathname.split('/');
		const duChemin = morceaux[1] === CHEMIN_D_INVITATION ? (morceaux[2] ?? '') : '';
		const code = (duChemin || url.searchParams.get('parrain') || '').trim().toUpperCase();
		return codeValide(code) ? code : null;
	} catch {
		return null;
	}
}

/**
 * LE MESSAGE QUI PART AVEC LE LIEN — d'un gérant à un confrère, au vouvoiement, sans
 * promesse : ce que fait le logiciel, puis le cadeau. Modifiable dans l'application qui
 * l'envoie ; jamais envoyé par Letikette.
 */
export function messageDInvitation(lien: string): string {
	return `J’utilise Letikette pour mes factures impayées : les relances partent seules, à mon nom, et les pénalités de retard sont calculées au centime. Avec mon lien, un mois vous est offert : ${lien}`;
}

/** Les adresses de chaque canal. Aucune ne passe par nos serveurs. */
export function liensDePartage({
	lien,
	message,
	sujet
}: {
	readonly lien: string;
	readonly message: string;
	readonly sujet: string;
}): { whatsapp: string; sms: string; email: string; linkedin: string } {
	const texte = encodeURIComponent(message);
	return {
		whatsapp: `https://wa.me/?text=${texte}`,
		// `?&` : la seule écriture qu'iOS et Android lisent toutes les deux.
		sms: `sms:?&body=${texte}`,
		email: `mailto:?subject=${encodeURIComponent(sujet)}&body=${texte}`,
		linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(lien)}`
	};
}

export interface InvitationSuivie {
	readonly inscriteLe: number;
	readonly abonneeLe: number | null;
}

/**
 * OÙ EN EST UNE INVITATION, en deux étapes et sans nom : inscrite, puis abonnée (sa
 * première échéance payée, qui offre le mois aux deux).
 */
export function etapeDeLInvitation(invitation: InvitationSuivie): {
	etape: 'INSCRITE' | 'ABONNEE';
	titre: string;
	ligne: string;
} {
	return invitation.abonneeLe === null
		? { etape: 'INSCRITE', titre: 'Inscrite', ligne: 'Pas encore abonnée' }
		: { etape: 'ABONNEE', titre: 'Abonnée', ligne: 'Un mois offert à chacun' };
}

export interface RecompenseGagnee {
	readonly raison: 'PARRAIN' | 'FILLEUL';
	readonly gagneeLe: number;
}

/** Les mois gagnés à recommander sur l'année glissante : l'objectif de la page s'y lit. */
export function moisDeLAnnee(recompenses: readonly RecompenseGagnee[], maintenant: number): number {
	const depuis = maintenant - 365 * JOUR_MS;
	return recompenses.filter((r) => r.raison === 'PARRAIN' && r.gagneeLe > depuis).length;
}

/** Qui recommande reçoit au plus douze mois par année glissante ; le recommandé, toujours le sien. */
export function peutRecevoirUneRecompense(
	recompenses: readonly RecompenseGagnee[],
	maintenant: number
): boolean {
	return moisDeLAnnee(recompenses, maintenant) < PARRAINAGE.recompensesParAn;
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
