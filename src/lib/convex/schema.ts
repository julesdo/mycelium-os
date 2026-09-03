import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { vEmailEvent } from '@convex-dev/resend';
import { recouvrementTables } from './recouvrement/tables';

export default defineSchema({
	// Note: Better Auth component manages its own tables (users, sessions, accounts, verifications)

	// Email event tracking - stores webhook events from Resend
	emailEvents: defineTable({
		emailId: v.string(), // Resend email ID
		eventType: v.string(), // 'email.delivered', 'email.bounced', etc.
		timestamp: v.number(), // When the event occurred
		data: vEmailEvent // Full event payload from Resend
	})
		.index('by_email_id', ['emailId'])
		.index('by_event_type', ['eventType'])
		.index('by_timestamp', ['timestamp']),

	// Admin audit logs - tracks admin actions for accountability
	adminAuditLogs: defineTable({
		adminUserId: v.string(), // Admin who performed the action
		action: v.union(
			v.literal('impersonate'),
			v.literal('stop_impersonation'),
			v.literal('ban_user'),
			v.literal('unban_user'),
			v.literal('revoke_sessions'),
			v.literal('set_role')
		),
		targetUserId: v.string(), // User affected by the action
		// Typed metadata per action type (not v.any() for type safety)
		metadata: v.optional(
			v.union(
				v.object({ reason: v.string() }), // ban_user, unban_user
				v.object({ newRole: v.string(), previousRole: v.string() }), // set_role
				v.object({}) // impersonate, stop_impersonation, revoke_sessions
			)
		),
		timestamp: v.number()
	})
		.index('by_admin', ['adminUserId'])
		.index('by_target', ['targetUserId'])
		.index('by_timestamp', ['timestamp']),

	// Organizations — une cantine cliente = une organisation
	organizations: defineTable({
		name: v.string(),
		siret: v.optional(v.string()),
		/**
		 * Le volume de factures émises par an — ce qui dimensionne l'abonnement.
		 *
		 * Il remplace le nombre de couverts par jour, qui mesurait une cantine.
		 * Facultatif : sans lui, le palier le plus bas s'applique, parce que
		 * facturer trop cher une entreprise qui n'a pas rempli son profil serait
		 * le pire des défauts.
		 */
		facturesParAn: v.optional(v.number()),
		logoUrl: v.optional(v.string()),
		logoStorageId: v.optional(v.id('_storage')),
		// Localisation — figée FR pour la phase POC
		country: v.optional(v.string()),
		currency: v.optional(v.string()),
		timezone: v.optional(v.string()),
		locale: v.optional(v.string()),
		// Paddle billing — étages commerciaux EGalim
		paddleSubscriptionId: v.optional(v.string()),
		paddleCustomerId: v.optional(v.string()),
		paddlePlanTier: v.optional(v.union(v.literal('suivi'), v.literal('procedures'))),
		paddleStatus: v.optional(
			v.union(
				v.literal('active'),
				v.literal('trialing'),
				v.literal('paused'),
				v.literal('past_due'),
				v.literal('canceled')
			)
		),
		paddleCurrentPeriodEnd: v.optional(v.number()),
		seatsIncluded: v.optional(v.number()),
		freeTrialEndsAt: v.optional(v.number()),
		devPlan: v.optional(v.boolean()),
		simulatedTier: v.optional(v.string()),
		createdAt: v.number()
	})
		.index('by_name', ['name'])
		.index('by_paddle_subscription', ['paddleSubscriptionId'])
		.index('by_paddle_customer', ['paddleCustomerId']),

	// Organization members - liaison utilisateur ↔ organisation avec rôle
	organizationMembers: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(), // Better Auth string ID
		role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MEMBER')),
		joinedAt: v.number()
	})
		.index('by_organization', ['organizationId'])
		.index('by_user', ['userId'])
		.index('by_org_and_user', ['organizationId', 'userId'])
		.index('by_user_and_role', ['userId', 'role']),

	// Organization invitations - invitations par email pour rejoindre une org
	organizationInvitations: defineTable({
		organizationId: v.id('organizations'),
		email: v.string(),
		role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MEMBER')),
		token: v.string(), // UUID unique pour le lien d'invitation
		invitedBy: v.string(), // userId Better Auth
		expiresAt: v.number(), // timestamp +7 jours
		acceptedAt: v.optional(v.number()),
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_token', ['token'])
		.index('by_email', ['email'])
		.index('by_org_and_email', ['organizationId', 'email']),

	// User profiles - currentOrganizationId séparé du schéma Better Auth (auto-généré)
	userProfiles: defineTable({
		userId: v.string(), // Better Auth string ID
		currentOrganizationId: v.optional(v.id('organizations')),
		hasUsedFreeTrial: v.optional(v.boolean()) // anti-abus : trial unique par userId
	}).index('by_userId', ['userId']),

	// In-app notifications - temps réel via Convex reactive queries
	notifications: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(), // destinataire (Better Auth string ID)
		type: v.union(
			v.literal('IMPORT_TERMINE'),
			v.literal('CREANCE_MURE'),
			v.literal('ECHEANCE_PROCHE'),
			v.literal('PRESCRIPTION_PROCHE'),
			v.literal('DEBITEUR_DEGRADE'),
			v.literal('HUMAN_ASSIST_REPLY')
		),
		title: v.string(),
		message: v.string(),
		link: v.optional(v.string()),
		isRead: v.boolean(),
		createdAt: v.number()
	})
		.index('by_user', ['userId'])
		.index('by_user_unread', ['userId', 'isRead'])
		.index('by_user_and_created', ['userId', 'createdAt'])
		.index('by_org', ['organizationId']),

	// Note: The agent component automatically creates the following tables:
	// - agent:threads - Conversation threads for customer support
	// - agent:messages - Messages within threads
	// - agent:streamingDeltas - Real-time streaming chunks
	// - agent:embeddings - Vector embeddings for semantic search

	// ── Domaine recouvrement de créances B2B ────────────────────────────────────
	// Voir src/lib/convex/recouvrement/tables.ts.
	...recouvrementTables
});
