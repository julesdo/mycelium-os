import { v, type Infer } from 'convex/values';
import type { QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { resolveEffectivePlan } from '../billing';
import { GRILLE } from '../../config/tarifs';
import { heureDeParis, jourDeParis } from '../../admin/dates';
import type { EtatDeConnexion } from '../../support/prompt-support';
import { dossiersPrepares } from '../recouvrement/prepares';

/**
 * LE CONTEXTE DU COMPTE, POUR PLUME SUPPORT ET POUR L'ÉQUIPE (16/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE SEUL FICHIER DU SUPPORT QUI LIT AU-DELÀ DE SES TABLES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Plume support et l'équipe ne lisent jamais un dossier (ligne rouge de la spec,
 * § 2.1). Ce qu'ils savent du compte passe par ici, et ressort en SCALAIRES : des
 * booléens, des nombres, des codes fermés, la formule et le nom de l'établissement
 * du gérant. Il compte des dossiers et des relances pour dire « 2 dossiers à
 * démarrer », il ne rend jamais un nom de client ni un montant : le validateur de
 * retour l'interdit, `support-tables.test.ts` refuse qu'un autre fichier du support
 * lise ces tables, et `support.test.ts` sème un client sentinelle pour vérifier qu'il
 * ne ressort pas.
 *
 * Les dossiers à démarrer se comptent par `dossiersPrepares`, la définition que lisent
 * les écrans du gérant : elle lit les factures et les règlements pour écarter un dossier
 * soldé, et il n'en ressort ici qu'un nombre (audit des parcours Pro du 27/10/2026).
 */

export const vContexteDuCompte = v.object({
	etablissement: v.string(),
	role: v.union(v.literal('ADMINISTRATEUR'), v.literal('MEMBRE')),
	formule: v.string(),
	etatAbonnement: v.string(),
	prochainPrelevementLe: v.optional(v.string()),
	finEssaiLe: v.optional(v.string()),
	membres: v.number(),
	relancesActivees: v.boolean(),
	dossiersADemarrer: v.number(),
	relancesProgrammees: v.number(),
	prochaineRelanceLe: v.optional(v.string()),
	relancesBloquees: v.object({ emailClient: v.number(), votreEmail: v.boolean() }),
	connexions: v.array(
		v.object({
			fournisseur: v.string(),
			etat: v.union(
				v.literal('A_JOUR'),
				v.literal('EN_COURS'),
				v.literal('EN_ATTENTE'),
				v.literal('LECTURE_ECHOUEE'),
				v.literal('REVOQUEE')
			),
			derniereLecture: v.union(v.string(), v.null())
		})
	),
	documentsEnEchec: v.number()
});

/** Le contexte tel que le rend la base : assignable à `ContexteDuCompte` de la logique pure. */
export type ContexteLu = Infer<typeof vContexteDuCompte>;

const ETAT_DE_L_ABONNEMENT: Record<NonNullable<Doc<'organizations'>['paddleStatus']>, string> = {
	active: 'actif',
	trialing: 'essai en cours',
	paused: 'en pause',
	past_due: 'paiement en retard',
	canceled: 'résilié'
};

function etatDeConnexion(statut: Doc<'connexionsQonto'>['statut']): EtatDeConnexion {
	switch (statut) {
		case 'A_JOUR':
			return 'A_JOUR';
		case 'SYNCHRONISATION':
			return 'EN_COURS';
		case 'EN_ATTENTE':
			return 'EN_ATTENTE';
		case 'ECHEC':
			return 'LECTURE_ECHOUEE';
		case 'REVOQUEE':
			return 'REVOQUEE';
	}
}

function jourOuNull(instant: number | undefined): string | null {
	return instant === undefined ? null : jourDeParis(instant);
}

/** Les bornes : un établissement énorme ne rend pas la question lente, il rend un compte arrondi. */
const PLAFOND_DE_LECTURE = 300;

export async function lireContexteDuCompte(
	ctx: Pick<QueryCtx, 'db'>,
	organizationId: Id<'organizations'>,
	userId: string
): Promise<ContexteLu> {
	const org = await ctx.db.get(organizationId);
	const membre = await ctx.db
		.query('organizationMembers')
		.withIndex('by_org_and_user', (q) =>
			q.eq('organizationId', organizationId).eq('userId', userId)
		)
		.first();
	const membres = await ctx.db
		.query('organizationMembers')
		.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
		.take(PLAFOND_DE_LECTURE);

	const { tier } = org === null ? { tier: 'none' as const } : resolveEffectivePlan(org);
	const formule =
		tier === 'solo' || tier === 'equipe' || tier === 'pro'
			? GRILLE[tier].nom
			: tier === 'dev'
				? 'Développement'
				: 'Découverte';

	const pilote = await ctx.db
		.query('pilotes')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	// Les dossiers que les écrans du gérant proposent de démarrer, et pas un de plus :
	// un dossier soldé garde son drapeau en base, mais n'a plus rien à démarrer.
	const aDemarrer = await dossiersPrepares(ctx, organizationId);
	const programmes = (
		await ctx.db
			.query('envois')
			.withIndex('by_org_and_etat', (q) =>
				q.eq('organizationId', organizationId).eq('etat', 'PROGRAMME')
			)
			.take(PLAFOND_DE_LECTURE)
	).filter((envoi) => envoi.preparePar === 'pilote');
	const prochaine = programmes
		.map((envoi) => envoi.partiraLe)
		.filter((le): le is number => le !== undefined)
		.sort((a, b) => a - b)[0];

	// Les relances qui ne peuvent pas partir faute de l'e-mail du client : les dossiers
	// en cours, démarrés, dont le client n'a pas d'adresse. Un client compte une fois.
	const enCours = [
		...(await ctx.db
			.query('creances')
			.withIndex('by_org_and_statut', (q) =>
				q.eq('organizationId', organizationId).eq('statut', 'BROUILLON')
			)
			.take(PLAFOND_DE_LECTURE)),
		...(await ctx.db
			.query('creances')
			.withIndex('by_org_and_statut', (q) =>
				q.eq('organizationId', organizationId).eq('statut', 'QUALIFIEE')
			)
			.take(PLAFOND_DE_LECTURE))
	].filter((creance) => creance.aDemarrer !== true);
	const sansEmail = new Set<string>();
	for (const debiteurId of new Set(enCours.map((creance) => creance.debiteurId))) {
		const debiteur = await ctx.db.get(debiteurId);
		if (debiteur !== null && debiteur.horsPilote !== true && !debiteur.email) {
			sansEmail.add(debiteurId);
		}
	}
	const profil = await ctx.db
		.query('profilsCreancier')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();

	const qonto = await ctx.db
		.query('connexionsQonto')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.take(10);
	const nango = await ctx.db
		.query('connexionsNango')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.take(10);

	const depots = await ctx.db
		.query('importsRecouvrement')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.order('desc')
		.take(50);

	return {
		etablissement: org?.name ?? 'votre établissement',
		role: membre?.role === 'ORG_ADMIN' ? 'ADMINISTRATEUR' : 'MEMBRE',
		formule,
		etatAbonnement:
			org?.paddleStatus === undefined ? 'aucun abonnement' : ETAT_DE_L_ABONNEMENT[org.paddleStatus],
		...(org?.paddleProchainPrelevementLe === undefined
			? {}
			: { prochainPrelevementLe: jourDeParis(org.paddleProchainPrelevementLe) }),
		...(org?.paddleEssaiFinLe === undefined
			? {}
			: { finEssaiLe: jourDeParis(org.paddleEssaiFinLe) }),
		membres: membres.length,
		relancesActivees: pilote?.envoiAutomatique === true,
		dossiersADemarrer: aDemarrer.length,
		relancesProgrammees: programmes.length,
		...(prochaine === undefined
			? {}
			: { prochaineRelanceLe: `${jourDeParis(prochaine)} à ${heureDeParis(prochaine)}` }),
		relancesBloquees: {
			emailClient: sansEmail.size,
			votreEmail: profil?.email === undefined || profil.email === ''
		},
		connexions: [
			...qonto.map((c) => ({
				fournisseur: 'Qonto',
				etat: etatDeConnexion(c.statut),
				derniereLecture: jourOuNull(c.derniereSynchro)
			})),
			...nango.map((c) => ({
				fournisseur: c.fournisseur,
				etat: etatDeConnexion(c.statut),
				derniereLecture: jourOuNull(c.derniereLectureComplete ?? c.derniereSynchro)
			}))
		],
		documentsEnEchec: depots.filter((depot) => depot.statut === 'ECHOUE').length
	};
}
