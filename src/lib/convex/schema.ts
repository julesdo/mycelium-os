import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { vEmailEvent } from '@convex-dev/resend';

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
		// Profil cantine
		etablissementType: v.optional(
			v.union(
				v.literal('RIE'),
				v.literal('CLINIQUE'),
				v.literal('EHPAD'),
				v.literal('CRECHE'),
				v.literal('ECOLE_PRIVEE'),
				v.literal('AUTRE')
			)
		),
		couvertsJour: v.optional(v.number()),
		gestionDirecte: v.optional(v.boolean()),
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
		paddlePlanTier: v.optional(
			v.union(v.literal('diagnostic'), v.literal('conformite'), v.literal('operateur'))
		),
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
			v.literal('FACTURES_RECUES'),
			v.literal('DIAGNOSTIC_PRET'),
			v.literal('LIGNES_A_ARBITRER'),
			v.literal('RATIO_EN_DERIVE'),
			v.literal('DECLARATION_A_FAIRE'),
			v.literal('ATTESTATION_MANQUANTE'),
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

	// Mycelium internal staff — séparé des ORG_ADMIN clients.
	// role Better Auth 'admin' = premier filtre (JWT, sans DB).
	// staffRole ici = deuxième filtre (niveau d'accès interne).
	// Bootstrap : si table vide + role='admin' → super_admin implicite (fondateur).
	myceliumStaff: defineTable({
		userId: v.string(), // Better Auth user ID
		staffRole: v.union(v.literal('super_admin'), v.literal('concierge'), v.literal('sales')),
		email: v.string(), // dénormalisé pour affichage
		name: v.string(), // dénormalisé pour affichage
		addedBy: v.string(), // userId de qui a ajouté
		addedAt: v.number(),
		// Profil concierge visible côté client
		avatarUrl: v.optional(v.string()),
		avatarStorageId: v.optional(v.id('_storage')),
		specialty: v.optional(v.union(
			v.literal('fleet_ops'),
			v.literal('compliance'),
			v.literal('finance'),
			v.literal('generalist')
		)),
		availabilityStatus: v.optional(v.union(
			v.literal('online'),
			v.literal('busy'),
			v.literal('offline')
		)),
		bio: v.optional(v.string()) // 1 ligne ex: "Spécialiste maintenance & conformité UK"
	})
		.index('by_userId', ['userId'])
		.index('by_role', ['staffRole'])
		.index('by_availability', ['availabilityStatus']),

	// ── Invitations staff Mycelium ───────────────────────────────────────────────
	// Générées par un super_admin depuis /concierge/staff.
	// Token aléatoire 64 hex chars, usage unique, expiration 7 jours.
	// La personne invitée clique le lien /staff-join/[token] pour rejoindre.
	staffInvitations: defineTable({
		token: v.string(),                      // 32 bytes → 64 hex chars (plain, URL-safe)
		staffRole: v.union(v.literal('super_admin'), v.literal('concierge'), v.literal('sales')),
		invitedBy: v.string(),                  // userId du super_admin
		invitedByName: v.string(),              // dénormalisé pour affichage
		invitedEmail: v.optional(v.string()),   // si renseigné, restreint à cet email
		createdAt: v.number(),
		expiresAt: v.number(),                  // createdAt + 7 jours
		usedAt: v.optional(v.number()),
		usedByUserId: v.optional(v.string())
	})
		.index('by_token', ['token'])
		.index('by_inviter', ['invitedBy']),

	// ── Accès org par concierge ──────────────────────────────────────────────────
	// Super admins ont accès à TOUTES les orgs (pas d'entrée ici).
	// Concierges ont accès uniquement aux orgs listées ici.
	conciergeOrgAccess: defineTable({
		conciergeUserId: v.string(),        // userId Better Auth du concierge
		organizationId: v.id('organizations'),
		assignedAt: v.number(),
		assignedBy: v.string()              // userId du super_admin qui a assigné
	})
		.index('by_concierge', ['conciergeUserId'])
		.index('by_org', ['organizationId'])
		.index('by_concierge_and_org', ['conciergeUserId', 'organizationId']),

	// ── Escalade humaine (client → concierge Mycelium) ──────────────────────────
	// Créée depuis le CopilotPanel quand le client clique "Parler à un humain".
	// Le concierge répond depuis /concierge/[orgId].

	humanAssistRequests: defineTable({
		organizationId: v.id('organizations'),
		requesterId: v.string(),       // userId Better Auth du client
		requesterName: v.string(),     // dénormalisé pour affichage côté concierge
		status: v.union(
			v.literal('pending'),       // en attente d'un concierge
			v.literal('in_progress'),   // concierge assigné et en train de répondre
			v.literal('closed')         // conversation terminée
		),
		summary: v.optional(v.string()), // résumé du contexte IA passé (3 derniers msgs)
		assignedConciergeId: v.optional(v.string()),
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_status', ['organizationId', 'status'])
		.index('by_requester', ['requesterId']),

	humanAssistMessages: defineTable({
		requestId: v.id('humanAssistRequests'),
		organizationId: v.id('organizations'),
		senderType: v.union(v.literal('client'), v.literal('concierge')),
		senderName: v.string(),
		senderAvatarUrl: v.optional(v.string()),
		content: v.string(),
		createdAt: v.number()
	})
		.index('by_request', ['requestId'])
		.index('by_org', ['organizationId']),

	// ── Timeline client (P33 — Client 360) ──────────────────────────────────────
	// Événements chronologiques par org : onboarding, plan changes, incidents, notes.
	clientTimelineEvents: defineTable({
		organizationId: v.id('organizations'),
		type: v.union(
			v.literal('ONBOARDING'),
			v.literal('PLAN_CHANGE'),
			v.literal('INCIDENT'),
			v.literal('MAINTENANCE'),
			v.literal('TICKET_CREATED'),
			v.literal('TICKET_RESOLVED'),
			v.literal('PAYMENT'),
			v.literal('ALERT_COMPLIANCE'),
			v.literal('CONCIERGE_NOTE')
		),
		title: v.string(),
		description: v.optional(v.string()),
		severity: v.optional(v.union(v.literal('info'), v.literal('warning'), v.literal('critical'))),
		sourceId: v.optional(v.string()),
		createdBy: v.optional(v.string()),
		occurredAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_time', ['organizationId', 'occurredAt']),

	// ── Tickets concierge unifiés (P32 — Inbox Concierge) ───────────────────────
	// Couche d'agrégation cross-sources : Human Assist, support, tâches critiques.
	// Ne remplace pas les tables sources, les enrichit d'un hub unifié avec SLA.
	conciergeTickets: defineTable({
		organizationId: v.id('organizations'),
		sourceType: v.union(
			v.literal('HUMAN_ASSIST'),
			v.literal('SUPPORT_TICKET'),
			v.literal('CONCIERGE_TASK'),
			v.literal('SALES_MESSAGE'),
			v.literal('MANUAL')
		),
		sourceId: v.optional(v.string()),
		status: v.union(
			v.literal('NEW'),
			v.literal('IN_PROGRESS'),
			v.literal('WAITING_CLIENT'),
			v.literal('RESOLVED'),
			v.literal('CLOSED')
		),
		priority: v.union(
			v.literal('URGENT'),
			v.literal('HIGH'),
			v.literal('NORMAL'),
			v.literal('LOW')
		),
		title: v.string(),
		summary: v.string(),
		assignedTo: v.optional(v.string()),
		firstResponseAt: v.optional(v.number()),
		resolvedAt: v.optional(v.number()),
		slaDeadline: v.optional(v.number()),
		slaBreachedAt: v.optional(v.number()),
		satisfactionEmoji: v.optional(
			v.union(v.literal('good'), v.literal('neutral'), v.literal('bad'))
		),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_status', ['status', 'priority'])
		.index('by_assigned', ['assignedTo', 'status'])
		.index('by_source', ['sourceType', 'sourceId'])
		.index('by_org_and_status', ['organizationId', 'status']),

	// Messages dans un ticket concierge (fil de conversation)
	conciergeTicketMessages: defineTable({
		ticketId: v.id('conciergeTickets'),
		authorId: v.string(),
		authorRole: v.union(
			v.literal('concierge'),
			v.literal('super_admin'),
			v.literal('client')
		),
		content: v.string(),
		senderName: v.optional(v.string()),
		attachmentIds: v.optional(v.array(v.string())),
		isInternal: v.boolean(),
		createdAt: v.number()
	})
		.index('by_ticket', ['ticketId'])
		.index('by_ticket_and_time', ['ticketId', 'createdAt']),

	// Note: The agent component automatically creates the following tables:
	// - agent:threads - Conversation threads for customer support
	// - agent:messages - Messages within threads
	// - agent:streamingDeltas - Real-time streaming chunks
	// - agent:embeddings - Vector embeddings for semantic search
});
