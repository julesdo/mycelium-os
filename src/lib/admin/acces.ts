/**
 * QUI PEUT OUVRIR L'ADMIN, ET FAIRE QUOI (16/10/2026).
 *
 * Le verdict est pur : l'enveloppe des fonctions Convex (`convex/admin/enveloppe.ts`)
 * lit la session et la table `equipe`, puis l'applique à CHAQUE appel. Un membre
 * retiré, ou dont la double authentification a été coupée, perd l'accès au
 * prochain appel, même avec un onglet resté ouvert.
 *
 * L'ordre des refus est celui de ce qu'on peut faire pour les lever : se
 * connecter, appartenir à l'équipe, activer la double authentification, avoir le
 * rôle. Le message le dit.
 */

/** Du moins au plus : chaque rôle a les droits de ceux qui le précèdent. */
export const ROLES_EQUIPE = ['LECTURE', 'SUPPORT', 'FONDATEUR'] as const;
export type RoleEquipe = (typeof ROLES_EQUIPE)[number];
export type RaisonDeRefus = 'SESSION' | 'HORS_EQUIPE' | 'DOUBLE_AUTH' | 'ROLE';

export interface EntreeAcces {
	readonly utilisateur: {
		readonly email: string;
		readonly emailVerified?: boolean;
		readonly twoFactorEnabled?: boolean | null;
	} | null;
	readonly membre: { readonly role: RoleEquipe; readonly retireLe?: number } | null;
}

export const MESSAGES_DE_REFUS: Record<RaisonDeRefus, string> = {
	SESSION: 'Connectez-vous.',
	HORS_EQUIPE: 'Réservé à l’équipe de Letikette.',
	DOUBLE_AUTH: 'Activez la double authentification dans votre profil.',
	ROLE: 'Votre rôle ne permet pas ce geste.'
};

/** Ce que chaque rôle permet, dit dans le menu de l'écran Équipe. */
export const DESCRIPTIONS_DES_ROLES: Record<RoleEquipe, { libelle: string; description: string }> =
	{
		FONDATEUR: {
			libelle: 'Fondateur',
			description: 'Tout, y compris l’équipe et le journal des accès.'
		},
		SUPPORT: {
			libelle: 'Support',
			description: 'Voir les comptes, écrire au CRM : notes, tâches, prospects.'
		},
		LECTURE: { libelle: 'Lecture', description: 'Voir les comptes et le CRM, sans rien changer.' }
	};

export function rangDuRole(role: RoleEquipe): number {
	return ROLES_EQUIPE.indexOf(role);
}

export function verdictDAcces(
	e: EntreeAcces,
	roleMin: RoleEquipe
): { ok: true; role: RoleEquipe } | { ok: false; raison: RaisonDeRefus; message: string } {
	const refus = (raison: RaisonDeRefus) => ({
		ok: false as const,
		raison,
		message: MESSAGES_DE_REFUS[raison]
	});
	if (e.utilisateur === null) return refus('SESSION');
	if (
		e.utilisateur.emailVerified !== true ||
		e.membre === null ||
		e.membre.retireLe !== undefined
	) {
		return refus('HORS_EQUIPE');
	}
	if (e.utilisateur.twoFactorEnabled !== true) return refus('DOUBLE_AUTH');
	if (rangDuRole(e.membre.role) < rangDuRole(roleMin)) return refus('ROLE');
	return { ok: true, role: e.membre.role };
}

/** Le dernier fondateur actif ne peut ni partir ni changer de rôle : l'équipe resterait sans tête. */
export function toucheAuDernierFondateur(
	membres: readonly {
		readonly email: string;
		readonly role: RoleEquipe;
		readonly retireLe?: number;
	}[],
	email: string,
	nouveauRole: RoleEquipe | 'RETIRE'
): boolean {
	const fondateurs = membres.filter((m) => m.role === 'FONDATEUR' && m.retireLe === undefined);
	const vise = fondateurs.find((m) => m.email === email);
	return vise !== undefined && fondateurs.length === 1 && nouveauRole !== 'FONDATEUR';
}
