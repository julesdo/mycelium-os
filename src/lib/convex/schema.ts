import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { vEmailEvent } from '@convex-dev/resend';
import { supportThreadFields } from './support/supportThreadFields';

export default defineSchema({
	// Note: Better Auth component manages its own tables (users, sessions, accounts, verifications)

	// Demo messages table (used in dashboard for billing demo)
	// Note: Better Auth uses 'user' table (singular), managed by the component
	messages: defineTable({
		userId: v.string(), // Better Auth user ID (string, not document ID)
		body: v.string()
	}).index('by_user', ['userId']),

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

	// Internal notes for users - visible only to admins, not to users
	// Supports both authenticated users (Better Auth IDs) and anonymous users
	// See: src/lib/convex/utils/anonymousUser.ts for ANONYMOUS_USER_PREFIX constant
	internalUserNotes: defineTable({
		userId: v.string(), // Reference to user (Better Auth ID or anonymous ID)
		adminUserId: v.string(), // Admin who created the note
		content: v.string(), // Note content
		createdAt: v.number() // Timestamp when note was created
	})
		.index('by_user', ['userId'])
		.index('by_admin', ['adminUserId'])
		.index('by_created', ['createdAt']),

	// Support feature registry.
	// Source of truth for support thread membership, access, and denormalized list/search data.
	// agent:threads remains generic conversation storage/runtime shared across features.
	supportThreads: defineTable(supportThreadFields)
		.index('by_thread', ['threadId'])
		.index('by_user', ['userId'])
		.index('by_user_warm', ['userId', 'isWarm'])
		.index('by_user_and_updated', ['userId', 'updatedAt'])
		.index('by_status', ['status'])
		.index('by_assigned', ['assignedTo'])
		.index('by_status_and_assigned', ['status', 'assignedTo'])
		.index('by_created', ['createdAt'])
		.index('by_handed_off_and_status', ['isHandedOff', 'status'])
		.index('by_needs_response', ['isHandedOff', 'status', 'awaitingAdminResponse'])
		.searchIndex('search_all', {
			searchField: 'searchText',
			filterFields: ['status', 'assignedTo', 'isHandedOff', 'awaitingAdminResponse']
		}),

	// Admin settings - key-value store for app configuration
	adminSettings: defineTable({
		key: v.string(), // Setting key (e.g., 'defaultSupportEmail')
		value: v.string(), // Setting value
		updatedAt: v.number(),
		updatedBy: v.optional(v.string()) // Admin who last updated
	}).index('by_key', ['key']),

	// Pending admin notifications - for debounced delivery
	// Triggered when user clicks "Talk to human", sends message to handed-off ticket,
	// or reopens a closed ticket. Uses 2-minute debounce to accumulate multiple messages.
	// Timer resets if user sends more messages within the delay window.
	pendingAdminNotifications: defineTable({
		threadId: v.string(), // Support thread ID
		isReopen: v.boolean(), // true = reopened ticket, false = new/handoff ticket
		notificationType: v.union(v.literal('newTickets'), v.literal('userReplies')), // Which preference toggle to use
		scheduledFor: v.number(), // Timestamp when notification should send
		messageIds: v.array(v.string()), // Accumulated message IDs to include
		scheduledFnId: v.optional(v.id('_scheduled_functions')), // For cancellation
		retryCount: v.optional(v.number()), // Number of retry attempts (stops after 5)
		createdAt: v.number()
	}).index('by_thread', ['threadId']),

	// Admin notification preferences - per-recipient toggles for notification types
	// Admin users are auto-synced via auth triggers; custom emails can be added manually.
	// When admin is demoted, isAdminUser is set to false but record is kept dormant.
	adminNotificationPreferences: defineTable({
		email: v.string(), // Email address to send notifications to
		userId: v.optional(v.string()), // Better Auth user ID (undefined for custom emails)
		isAdminUser: v.boolean(), // true = currently has admin role, false = demoted or custom email

		// Notification type toggles
		notifyNewSupportTickets: v.boolean(), // New support tickets (handoff from AI)
		notifyUserReplies: v.boolean(), // User replied, admin didn't respond within 2 min
		notifyNewSignups: v.boolean(), // New user registrations

		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_email', ['email'])
		.index('by_user', ['userId']),

	adminProfiles: defineTable({
		userId: v.string(),
		founderWelcomeName: v.optional(v.string()),
		founderWelcomeTitle: v.optional(v.string()),
		founderWelcomeReplyTo: v.optional(v.string())
	}).index('by_userId', ['userId']),

	// File metadata - stores image dimensions for proper dialog sizing
	// (agent component strips unknown fields from file parts, so we store dimensions separately)
	fileMetadata: defineTable({
		fileId: v.string(), // Reference to agent:files._id
		storageId: v.string(), // Convex storage ID for lookups
		url: v.optional(v.string()), // The actual URL from agent component (optional for legacy records)
		width: v.optional(v.number()),
		height: v.optional(v.number()),
		createdAt: v.number()
	})
		.index('by_fileId', ['fileId'])
		.index('by_storageId', ['storageId'])
		.index('by_url', ['url']),

	// Dashboard counters - singleton for materialized user metrics
	// Updated atomically via auth triggers (onCreate, onUpdate) to avoid
	// fetching all users on every dashboard load.
	dashboardCounters: defineTable({
		totalUsers: v.number(),
		adminCount: v.number(),
		bannedCount: v.number()
	}),

	// Founder welcome emails - delayed personal welcome from a team member
	// Sent ~16-19 min after signup to feel organic. Config stored in adminSettings.
	founderWelcomeEmails: defineTable({
		userId: v.string(),
		signupEmail: v.string(),
		delayMs: v.number(),
		status: v.union(
			v.literal('pending_verification'),
			v.literal('scheduled'),
			v.literal('sent'),
			v.literal('skipped')
		),
		scheduledFnId: v.optional(v.id('_scheduled_functions')),
		sentAt: v.optional(v.number()),
		skippedReason: v.optional(v.string()),
		createdAt: v.number()
	}).index('by_user', ['userId']),

	// AI chat feature registry.
	// Source of truth for AI chat membership and sidebar state.
	// Denormalized fields avoid ctx.runQuery into generic agent tables on the hot path.
	aiChatThreads: defineTable({
		threadId: v.string(), // Reference to agent:threads
		userId: v.string(), // Better Auth user ID
		createdAt: v.number(),
		isWarm: v.optional(v.boolean()), // true = pre-warmed empty thread, awaiting first message
		title: v.optional(v.string()),
		lastMessage: v.optional(v.string()),
		lastMessageAt: v.optional(v.number())
	})
		.index('by_user', ['userId'])
		.index('by_thread', ['threadId'])
		.index('by_user_warm', ['userId', 'isWarm']),

	// Organizations - chaque entreprise cliente est une organisation
	organizations: defineTable({
		name: v.string(),
		siren: v.optional(v.string()),
		sector: v.optional(v.string()),
		size: v.optional(v.string()),
		plan: v.union(v.literal('flat'), v.literal('per_seat')),
		// Internationalisation
		country: v.optional(v.string()),       // ISO 3166-1 alpha-2 — 'FR' | 'GB' | 'SE' | 'NO' | 'DK'
		currency: v.optional(v.string()),      // 'EUR' | 'GBP' | 'SEK' | 'NOK' | 'DKK'
		distanceUnit: v.optional(v.union(v.literal('km'), v.literal('mile'))),
		timezone: v.optional(v.string()),      // IANA — 'Europe/London', 'Europe/Paris'…
		locale: v.optional(v.string()),        // BCP 47 — 'en-GB', 'fr-FR', 'sv-SE'…
		// Paddle billing
		paddleSubscriptionId: v.optional(v.string()),
		paddleCustomerId: v.optional(v.string()),
		paddlePlanTier: v.optional(v.union(
			v.literal('essential'),
			v.literal('professional'),
			v.literal('business'),
			v.literal('enterprise')
		)),
		paddleStatus: v.optional(v.union(
			v.literal('active'),
			v.literal('trialing'),
			v.literal('paused'),
			v.literal('past_due'),
			v.literal('canceled')
		)),
		paddleCurrentPeriodEnd: v.optional(v.number()),
		seatsIncluded: v.optional(v.number()),
		createdAt: v.number()
	})
		.index('by_name', ['name'])
		.index('by_plan', ['plan'])
		.index('by_paddle_subscription', ['paddleSubscriptionId'])
		.index('by_paddle_customer', ['paddleCustomerId']),

	// Organization members - liaison utilisateur ↔ organisation avec rôle
	organizationMembers: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(), // Better Auth string ID
		role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MANAGER'), v.literal('ORG_MEMBER')),
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
		role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MANAGER'), v.literal('ORG_MEMBER')),
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
		currentOrganizationId: v.optional(v.id('organizations'))
	}).index('by_userId', ['userId']),

	// Vehicles - flotte de véhicules d'une organisation
	vehicles: defineTable({
		organizationId: v.id('organizations'),
		registration: v.string(), // immatriculation
		vin: v.optional(v.string()),          // VIN 17 caractères (clé de liaison Smartcar)
		brand: v.string(),
		model: v.string(),
		year: v.number(),
		energy: v.union(v.literal('THERMAL'), v.literal('HYBRID'), v.literal('ELECTRIC')),
		category: v.union(v.literal('PASSENGER'), v.literal('UTILITY'), v.literal('TRUCK')),
		kilometers: v.optional(v.number()),
		purchaseDate: v.optional(v.string()), // ISO date string
		leaseEndDate: v.optional(v.string()), // ISO date string
		maintenanceKmThreshold: v.optional(v.number()), // km trigger pour alerte entretien
		maintenanceDueDate: v.optional(v.string()), // ISO date, entretien planifié
		assignedDriverId: v.optional(v.string()), // futur
		status: v.union(
			v.literal('AVAILABLE'),
			v.literal('IN_USE'),
			v.literal('MAINTENANCE'),
			v.literal('RETIRED')
		),
		location: v.optional(v.string()),
		notes: v.optional(v.string()),
		activeIncidentId: v.optional(v.id('incidents')),
		co2Gkm: v.optional(v.number()),           // émissions CO2 WLTP en g/km
		purchasePrice: v.optional(v.number()),    // prix d'achat TTC en €
		p11dValue: v.optional(v.number()),        // UK P11D list price in GBP (for BiK)
		electricRangeMiles: v.optional(v.number()), // PHEV electric range (for BiK band)
		// Smartcar telemetry (updated by Smartcar sync job)
		smartcarVehicleId: v.optional(v.string()),  // Smartcar vehicle UUID
		smartcarUserId: v.optional(v.string()),     // Smartcar user_id du conducteur (per-vehicle OAuth)
		smartcarOdometer: v.optional(v.number()),   // km, last synced
		smartcarBatteryPercent: v.optional(v.number()), // SoC % (EV/PHEV only)
		smartcarBatteryRange: v.optional(v.number()), // km of range remaining
		smartcarLatitude: v.optional(v.number()),
		smartcarLongitude: v.optional(v.number()),
		smartcarLastSync: v.optional(v.number()),   // ms timestamp
		insuranceExpiryDate: v.optional(v.string()),     // ISO date "2026-12-31"
		ctExpiryDate: v.optional(v.string()),            // date contrôle technique
		registrationExpiryDate: v.optional(v.string()), // validité carte grise
		insurerName: v.optional(v.string()),
		policyNumber: v.optional(v.string()),
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_status', ['organizationId', 'status'])
		.index('by_smartcar', ['smartcarVehicleId'])
		.searchIndex('search_by_org', {
			searchField: 'registration',
			filterFields: ['organizationId', 'status', 'energy']
		}),

	// Maintenance schedules - règles génériques d'entretien par modèle de véhicule
	maintenanceSchedules: defineTable({
		vehicleBrand: v.string(),
		vehicleModel: v.string(),
		maintenanceType: v.union(
			v.literal('REVISION'),
			v.literal('VIDANGE'),
			v.literal('PNEUS'),
			v.literal('FREINS'),
			v.literal('AUTRE')
		),
		intervalKm: v.number(),
		intervalMonths: v.number(),
		estimatedCost: v.optional(v.number()),
		createdAt: v.number()
	})
		.index('by_brand_model', ['vehicleBrand', 'vehicleModel'])
		.index('by_type', ['maintenanceType']),

	// Garages - base de garages partenaires
	garages: defineTable({
		name: v.string(),
		network: v.union(
			v.literal('NORAUTO'),
			v.literal('SPEEDY'),
			v.literal('MIDAS'),
			v.literal('INDEPENDENT')
		),
		address: v.string(),
		city: v.string(),
		zipcode: v.string(),
		phone: v.optional(v.string()),
		email: v.optional(v.string()),
		services: v.array(v.string()),
		avgRating: v.optional(v.number()),
		isPartner: v.boolean(),
		createdAt: v.number()
	})
		.index('by_city', ['city'])
		.index('by_zipcode', ['zipcode'])
		.index('by_network', ['network'])
		.index('by_partner', ['isPartner']),

	// Maintenance records - historique réel des entretiens
	maintenanceRecords: defineTable({
		organizationId: v.id('organizations'),
		vehicleId: v.id('vehicles'),
		maintenanceType: v.union(
			v.literal('REVISION'),
			v.literal('VIDANGE'),
			v.literal('PNEUS'),
			v.literal('FREINS'),
			v.literal('AUTRE')
		),
		scheduledDate: v.number(),
		completedDate: v.optional(v.number()),
		garageId: v.optional(v.id('garages')),
		costEstimate: v.optional(v.number()),
		costActual: v.optional(v.number()),
		invoiceStorageId: v.optional(v.string()),
		invoiceUrl: v.optional(v.string()),
		notes: v.optional(v.string()),
		status: v.union(
			v.literal('SCHEDULED'),
			v.literal('IN_PROGRESS'),
			v.literal('COMPLETED'),
			v.literal('CANCELLED')
		),
		scheduledBy: v.string(),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_status', ['organizationId', 'status'])
		.index('by_vehicle', ['vehicleId'])
		.index('by_org_and_scheduled', ['organizationId', 'scheduledDate']),

	// Vehicle maintenance config - config par véhicule, override des règles génériques
	vehicleMaintenanceConfig: defineTable({
		vehicleId: v.id('vehicles'),
		organizationId: v.id('organizations'),
		lastRevisionKm: v.optional(v.number()),
		lastRevisionDate: v.optional(v.number()),
		lastVidangeKm: v.optional(v.number()),
		lastVidangeDate: v.optional(v.number()),
		lastPneusDate: v.optional(v.number()),
		lastFreinsDate: v.optional(v.number()),
		customIntervalKm: v.optional(v.number()),
		customIntervalMonths: v.optional(v.number()),
		updatedAt: v.number()
	})
		.index('by_vehicle', ['vehicleId'])
		.index('by_org', ['organizationId']),

	// Reservations - pool vehicle bookings
	reservations: defineTable({
		organizationId: v.id('organizations'),
		vehicleId: v.id('vehicles'),
		userId: v.string(),
		startDate: v.number(),
		endDate: v.number(),
		purpose: v.string(),
		status: v.union(
			v.literal('PENDING'),
			v.literal('CONFIRMED'),
			v.literal('IN_PROGRESS'),
			v.literal('COMPLETED'),
			v.literal('CANCELLED')
		),
		notes: v.optional(v.string()),
		googleCalendarEventId: v.optional(v.string()),
		microsoftCalendarEventId: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_vehicle', ['vehicleId'])
		.index('by_user', ['userId'])
		.index('by_vehicle_and_dates', ['vehicleId', 'startDate', 'endDate']),

	// User integrations - OAuth tokens pour Google Calendar, Microsoft Outlook, etc.
	userIntegrations: defineTable({
		userId: v.string(), // Better Auth string ID
		type: v.union(v.literal('google_calendar'), v.literal('microsoft_calendar')),
		encryptedRefreshToken: v.string(), // AES-256-GCM, base64(iv+ciphertext)
		encryptedAccessToken: v.string(),
		accessTokenExpiresAt: v.number(),
		calendarId: v.string(), // 'primary' (Google) ou default (Microsoft)
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_user', ['userId'])
		.index('by_user_and_type', ['userId', 'type']),

	// Driver profiles - permis et formations des conducteurs
	driverProfiles: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(),
		licenseNumber: v.optional(v.string()),
		licenseCategories: v.optional(v.array(v.string())),
		licenseIssuedDate: v.optional(v.string()),
		licenseExpiryDate: v.optional(v.string()),
		licenseFrontStorageId: v.optional(v.string()),
		licenseBackStorageId: v.optional(v.string()),
		licenseValidated: v.optional(v.boolean()),
		licenseValidatedBy: v.optional(v.string()),
		licenseValidatedAt: v.optional(v.number()),
		formations: v.optional(
			v.array(
				v.object({
					type: v.string(),
					obtainedDate: v.string(),
					expiryDate: v.optional(v.string()),
					certificateStorageId: v.optional(v.string())
				})
			)
		),
		isBlocked: v.optional(v.boolean()),
		blockReason: v.optional(v.string()),
		notes: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_user', ['userId'])
		.index('by_org_and_user', ['organizationId', 'userId'])
		.index('by_org_and_blocked', ['organizationId', 'isBlocked']),

	// Driver restrictions - limitations par conducteur
	driverRestrictions: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(),
		type: v.union(
			v.literal('NO_LONG_DISTANCE'),
			v.literal('NO_UTILITY'),
			v.literal('NO_TRUCK'),
			v.literal('MAX_KM_PER_MONTH'),
			v.literal('SITE_ONLY')
		),
		value: v.optional(v.string()),
		reason: v.optional(v.string()),
		addedBy: v.string(),
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_user', ['userId'])
		.index('by_org_and_user', ['organizationId', 'userId']),

	// Vehicle inspections - état des lieux départ/retour
	vehicleInspections: defineTable({
		organizationId: v.id('organizations'),
		vehicleId: v.id('vehicles'),
		reservationId: v.optional(v.id('reservations')),
		type: v.union(v.literal('DEPARTURE'), v.literal('RETURN'), v.literal('PERIODIC')),
		inspectedBy: v.string(),
		kmAtInspection: v.optional(v.number()),
		fuelLevelPercent: v.optional(v.number()),
		photos: v.array(
			v.object({
				angle: v.union(
					v.literal('FRONT'),
					v.literal('BACK'),
					v.literal('LEFT'),
					v.literal('RIGHT'),
					v.literal('INTERIOR'),
					v.literal('DASHBOARD')
				),
				storageId: v.string()
			})
		),
		damages: v.optional(
			v.array(
				v.object({
					location: v.string(),
					description: v.string(),
					severity: v.union(v.literal('MINOR'), v.literal('MODERATE'), v.literal('MAJOR')),
					isNew: v.boolean()
				})
			)
		),
		notes: v.optional(v.string()),
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_vehicle', ['vehicleId'])
		.index('by_reservation', ['reservationId'])
		.index('by_vehicle_and_type', ['vehicleId', 'type'])
		.index('by_org_and_created', ['organizationId', 'createdAt']),

	// Traffic violations - contraventions avec workflow d'identification
	trafficViolations: defineTable({
		organizationId: v.id('organizations'),
		vehicleId: v.id('vehicles'),
		driverUserId: v.optional(v.string()),
		reservationId: v.optional(v.id('reservations')),
		violationDate: v.number(),
		amount: v.number(),
		description: v.string(),
		reference: v.optional(v.string()),
		paymentDecision: v.optional(
			v.union(v.literal('COMPANY'), v.literal('DRIVER'), v.literal('PENDING'))
		),
		status: v.union(
			v.literal('RECEIVED'),
			v.literal('IDENTIFIED'),
			v.literal('NOTIFIED'),
			v.literal('PAID'),
			v.literal('CONTESTED'),
			v.literal('CLOSED')
		),
		documentStorageId: v.optional(v.string()),
		notes: v.optional(v.string()),
		createdBy: v.string(),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_vehicle', ['vehicleId'])
		.index('by_driver', ['driverUserId'])
		.index('by_org_and_status', ['organizationId', 'status'])
		.index('by_org_and_date', ['organizationId', 'violationDate']),

	// In-app notifications - temps réel via Convex reactive queries
	notifications: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(), // destinataire (Better Auth string ID)
		type: v.union(
			v.literal('RESERVATION_CONFIRMED'),
			v.literal('RESERVATION_CANCELLED'),
			v.literal('RESERVATION_REMINDER'),
			v.literal('CONFLICT_DETECTED'),
			v.literal('VEHICLE_RETURNED'),
			v.literal('MAINTENANCE_DUE'),
			v.literal('UNDERUTILIZED_VEHICLE'),
			v.literal('LEASE_EXPIRING'),
			v.literal('LICENSE_EXPIRING'),
			v.literal('LICENSE_EXPIRED'),
			v.literal('VIOLATION_RECEIVED'),
			v.literal('INSPECTION_REQUIRED'),
			v.literal('INCIDENT_DECLARED')
		),
		title: v.string(),
		message: v.string(),
		link: v.optional(v.string()),
		vehicleId: v.optional(v.id('vehicles')), // pour dédoublonnage alertes flotte
		isRead: v.boolean(),
		createdAt: v.number()
	})
		.index('by_user', ['userId'])
		.index('by_user_unread', ['userId', 'isRead'])
		.index('by_user_and_created', ['userId', 'createdAt'])
		.index('by_org', ['organizationId']),

	// Concierge AI conversations - per-user chat history
	conversations: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(),
		messages: v.array(
			v.object({
				role: v.union(v.literal('user'), v.literal('assistant')),
				content: v.string(),
				timestamp: v.number(),
				toolCalls: v.optional(
					v.array(
						v.object({
							name: v.string(),
							input: v.string(),
							output: v.optional(v.string())
						})
					)
				)
			})
		),
		createdAt: v.number(),
		updatedAt: v.number()
	}).index('by_user_recent', ['userId', 'updatedAt']),

	// Fleet costs - coûts opérationnels de la flotte (leasing, carburant, entretien, etc.)
	costs: defineTable({
		organizationId: v.id('organizations'),
		vehicleId: v.optional(v.id('vehicles')), // null = coût global organisation
		category: v.union(
			v.literal('LEASING'),
			v.literal('CARBURANT'),
			v.literal('ENTRETIEN'),
			v.literal('ASSURANCE'),
			v.literal('TAXES'),
			v.literal('SINISTRE'),
			v.literal('PARKING'),
			v.literal('TELEPEAGE'),
			v.literal('AUTRE')
		),
		amount: v.number(), // montant TTC en euros
		vatAmount: v.optional(v.number()), // montant TVA
		date: v.number(), // timestamp de la dépense
		description: v.string(),
		invoiceUrl: v.optional(v.string()),
		invoiceStorageId: v.optional(v.string()),
		source: v.union(v.literal('MANUAL'), v.literal('IMPORT'), v.literal('API')),
		createdBy: v.string(), // Better Auth user ID
		createdAt: v.number(),
		// Payment status synced back from accounting provider (Pennylane is source of truth)
		paidInAccounting: v.optional(v.boolean()),
		paidInAccountingAt: v.optional(v.number())
	})
		.index('by_org', ['organizationId'])
		.index('by_vehicle', ['vehicleId'])
		.index('by_org_date', ['organizationId', 'date'])
		.index('by_category', ['organizationId', 'category']),

	// Optimizer reports - weekly AI-generated fleet optimization insights
	optimizerReports: defineTable({
		organizationId: v.id('organizations'),
		weekOf: v.string(), // "YYYY-MM-DD" (Monday of the week)
		recommendations: v.array(
			v.object({
				type: v.string(),
				vehicleId: v.optional(v.id('vehicles')),
				title: v.string(),
				description: v.string(),
				estimatedSaving: v.optional(v.number()),
				priority: v.union(v.literal('high'), v.literal('medium'), v.literal('low')),
				actionLabel: v.optional(v.string())
			})
		),
		emailSentAt: v.optional(v.number()),
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_week', ['organizationId', 'weekOf']),

	// Mileage rate configs — taux par catégorie de véhicule, configurables par org
	mileageRateConfigs: defineTable({
		organizationId: v.id('organizations'),
		rates: v.array(v.object({
			category: v.union(
				v.literal('ELECTRIC'),
				v.literal('HYBRID'),
				v.literal('THERMAL'),
				v.literal('UTILITY')
			),
			ratePerUnit: v.number(),
			label: v.optional(v.string())
		})),
		updatedAt: v.number()
	}).index('by_org', ['organizationId']),

	// Mileage expenses - notes de frais kilométriques (multi-pays)
	mileageExpenses: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(),
		date: v.string(),
		purpose: v.string(),
		departureLocation: v.string(),
		arrivalLocation: v.string(),
		roundTrip: v.boolean(),
		distance: v.optional(v.number()),        // valeur numérique (km ou miles selon distanceUnit)
		distanceUnit: v.optional(v.union(v.literal('km'), v.literal('mile'))),
		distanceKm: v.optional(v.number()),      // legacy field (pre-P15 refactor)
		fiscalPower: v.optional(v.number()),     // legacy field (pre-P15 refactor)
		vehicleCategory: v.optional(v.union(
			v.literal('ELECTRIC'),
			v.literal('HYBRID'),
			v.literal('THERMAL'),
			v.literal('UTILITY')
		)),
		ratePerUnit: v.optional(v.number()),         // taux appliqué au moment du calcul (audit trail)
		vehicleDescription: v.optional(v.string()),
		calculatedAmount: v.number(),
		status: v.union(
			v.literal('DRAFT'),
			v.literal('SUBMITTED'),
			v.literal('APPROVED'),
			v.literal('REJECTED'),
			v.literal('PAID')
		),
		approvedBy: v.optional(v.string()),
		approvedAt: v.optional(v.number()),
		rejectionReason: v.optional(v.string()),
		paidAt: v.optional(v.number()),
		notes: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_user', ['userId'])
		.index('by_org_and_user', ['organizationId', 'userId'])
		.index('by_org_and_status', ['organizationId', 'status'])
		.index('by_org_and_date', ['organizationId', 'date']),

	// Accounting integrations — org-level connection to compta providers (Pennylane, Sage, EBP…)
	accountingIntegrations: defineTable({
		organizationId: v.id('organizations'),
		provider: v.union(
			v.literal('pennylane'),
			v.literal('sage'),
			v.literal('ebp'),
			v.literal('xero'),
			v.literal('quickbooks'),
			v.literal('odoo')
		),
		status: v.union(v.literal('CONNECTED'), v.literal('DISCONNECTED'), v.literal('ERROR')),
		encryptedAccessToken: v.string(),
		encryptedRefreshToken: v.optional(v.string()),
		tokenExpiresAt: v.optional(v.number()),
		externalCompanyId: v.optional(v.string()),
		syncCosts: v.boolean(),
		syncVehicles: v.boolean(),
		syncExpenses: v.boolean(),
		lastSyncAt: v.optional(v.number()),
		lastSyncError: v.optional(v.string()),
		connectedBy: v.string(),
		connectedAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_provider', ['organizationId', 'provider']),

	// Mapping catégorie Mycelium → compte comptable du provider
	accountingCategoryMappings: defineTable({
		organizationId: v.id('organizations'),
		integrationId: v.id('accountingIntegrations'),
		myceliumCategory: v.string(),
		externalAccountCode: v.string(),
		externalAccountLabel: v.optional(v.string()),
		analyticAxis: v.optional(v.string()),
		vatRate: v.optional(v.number())
	})
		.index('by_integration', ['integrationId'])
		.index('by_integration_and_category', ['integrationId', 'myceliumCategory']),

	// Journal de sync + idempotence Mycelium ↔ provider
	accountingSyncLogs: defineTable({
		organizationId: v.id('organizations'),
		integrationId: v.id('accountingIntegrations'),
		entityType: v.union(v.literal('COST'), v.literal('EXPENSE')),
		entityId: v.string(),
		externalId: v.optional(v.string()),
		direction: v.union(v.literal('PUSH'), v.literal('PULL')),
		status: v.union(v.literal('PENDING'), v.literal('SUCCESS'), v.literal('FAILED')),
		attempts: v.number(),
		error: v.optional(v.string()),
		syncedAt: v.optional(v.number()),
		createdAt: v.number()
	})
		.index('by_integration', ['integrationId'])
		.index('by_entity', ['entityType', 'entityId'])
		.index('by_status', ['integrationId', 'status']),

	// Smartcar connections — one per organization (v3 M2M: store userId, not tokens)
	smartcarConnections: defineTable({
		organizationId: v.id('organizations'),
		smartcarUserId: v.optional(v.string()),        // v3: Smartcar user_id from Connect redirect
		// Legacy v2 fields (kept optional for backward compat)
		encryptedAccessToken: v.optional(v.string()),
		encryptedRefreshToken: v.optional(v.string()),
		accessTokenExpiry: v.optional(v.number()),
		connectedAt: v.number(),
		connectedByUserId: v.string(),
		cachedVehicleList: v.optional(v.string()),     // JSON array of { id, make, model, year, vin }
	}).index('by_org', ['organizationId']),

	// API public keys — clés scopées par organisation pour l'API REST v1
	apiKeys: defineTable({
		organizationId: v.id('organizations'),
		name: v.string(),
		hashedKey: v.string(),
		prefix: v.string(), // 'myc_live_xxxx' affiché pour identification
		scopes: v.array(v.string()), // ['costs:read','costs:write','vehicles:read','expenses:read']
		lastUsedAt: v.optional(v.number()),
		createdBy: v.string(),
		createdAt: v.number(),
		revokedAt: v.optional(v.number())
	})
		.index('by_org', ['organizationId'])
		.index('by_prefix', ['prefix']),

	// Webhook endpoints — URLs cibles pour les événements sortants
	webhookEndpoints: defineTable({
		organizationId: v.id('organizations'),
		url: v.string(),
		secret: v.string(), // secret HMAC (chiffré)
		events: v.array(v.string()), // ['cost.created','cost.updated','expense.approved','reservation.created']
		isActive: v.boolean(),
		createdAt: v.number(),
		lastDeliveredAt: v.optional(v.number()),
		lastError: v.optional(v.string())
	}).index('by_org', ['organizationId']),

	// Webhook delivery log — historique des tentatives d'envoi
	webhookDeliveries: defineTable({
		webhookEndpointId: v.id('webhookEndpoints'),
		organizationId: v.id('organizations'),
		event: v.string(),
		payload: v.string(), // JSON stringifié
		status: v.union(v.literal('PENDING'), v.literal('SUCCESS'), v.literal('FAILED')),
		attempts: v.number(),
		statusCode: v.optional(v.number()),
		error: v.optional(v.string()),
		createdAt: v.number(),
		deliveredAt: v.optional(v.number())
	})
		.index('by_endpoint', ['webhookEndpointId'])
		.index('by_org', ['organizationId']),

	// Incidents — sinistres déclarés par les conducteurs
	incidents: defineTable({
		organizationId: v.id('organizations'),
		vehicleId: v.id('vehicles'),
		reportedBy: v.string(), // userId conducteur ou admin
		reservationId: v.optional(v.id('reservations')),

		// Circonstances
		incidentDate: v.number(),
		location: v.string(),
		description: v.string(),
		thirdPartyInvolved: v.boolean(),
		thirdPartyInfo: v.optional(v.string()),

		// Photos & documents
		photos: v.array(v.object({ label: v.string(), storageId: v.string() })),
		documentsStorageIds: v.optional(v.array(v.string())),

		// Gestion assurantielle
		insurerEmail: v.optional(v.string()),
		insurerReference: v.optional(v.string()),
		franchiseAmount: v.optional(v.number()),
		estimatedRepairCost: v.optional(v.number()),

		// Statut
		status: v.union(
			v.literal('DECLARED'),
			v.literal('SENT_TO_INSURER'),
			v.literal('EXPERTISE'),
			v.literal('REPAIR'),
			v.literal('CLOSED'),
			v.literal('CONTESTED')
		),
		closedAt: v.optional(v.number()),
		closingNotes: v.optional(v.string()),

		createdAt: v.number(),
		updatedAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_vehicle', ['vehicleId'])
		.index('by_reporter', ['reportedBy'])
		.index('by_org_and_status', ['organizationId', 'status'])
		.index('by_org_and_date', ['organizationId', 'incidentDate']),

	// Fuel card import sessions — relevés carburant Total Cards / BP Plus / Shell Fleet
	fuelImports: defineTable({
		organizationId: v.id('organizations'),
		provider: v.union(
			v.literal('TOTAL_CARDS'),
			v.literal('BP_PLUS'),
			v.literal('SHELL_FLEET'),
			v.literal('GENERIC')
		),
		fileName: v.string(),
		fileStorageId: v.string(),
		periodStart: v.string(), // ISO date YYYY-MM-DD
		periodEnd: v.string(),
		totalLines: v.number(),
		matchedLines: v.number(),
		unmatchedLines: v.number(),
		anomalyCount: v.number(),
		totalAmount: v.number(), // total TTC en €
		status: v.union(
			v.literal('PROCESSING'),
			v.literal('REVIEW'), // anomalies à valider
			v.literal('COMPLETED'),
			v.literal('FAILED')
		),
		failureReason: v.optional(v.string()),
		unmatchedRegistrations: v.optional(v.array(v.string())), // immatriculations non matchées
		importedBy: v.string(), // userId
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_created', ['organizationId', 'createdAt']),

	// Anomalies détectées sur les lignes d'un import carburant
	fuelAnomalies: defineTable({
		organizationId: v.id('organizations'),
		fuelImportId: v.id('fuelImports'),
		vehicleId: v.optional(v.id('vehicles')),
		registration: v.optional(v.string()),
		type: v.union(
			v.literal('WEEKEND_FILL'), // plein samedi/dimanche
			v.literal('ABNORMAL_VOLUME'), // > 120L
			v.literal('SUSPICIOUS_LOCATION'), // station > 100km du siège
			v.literal('DUPLICATE'), // même véhicule + même montant ± 30min
			v.literal('NO_ACTIVE_RESERVATION') // plein sans réservation active
		),
		severity: v.union(v.literal('HIGH'), v.literal('MEDIUM'), v.literal('LOW')),
		rawLine: v.string(), // ligne CSV originale pour audit
		date: v.number(),
		amount: v.number(),
		liters: v.optional(v.number()),
		station: v.optional(v.string()),
		resolution: v.optional(
			v.union(
				v.literal('ACCEPTED'), // DAF valide : coût créé
				v.literal('REJECTED'), // DAF rejette : coût non créé
				v.literal('PENDING')
			)
		),
		resolvedBy: v.optional(v.string()),
		resolvedAt: v.optional(v.number()),
		notes: v.optional(v.string()),
		createdAt: v.number()
	})
		.index('by_import', ['fuelImportId'])
		.index('by_org_and_pending', ['organizationId', 'resolution']),

	// Vehicle assignments — attributions de véhicules de fonction (pour calcul AEN)
	vehicleAssignments: defineTable({
		organizationId: v.id('organizations'),
		vehicleId: v.id('vehicles'),
		userId: v.string(),                              // salarié bénéficiaire
		startDate: v.string(),                           // ISO date début attribution
		endDate: v.optional(v.string()),                 // ISO date fin (undefined = actif)
		fuelPaidByCompany: v.boolean(),                  // carburant personnel payé par l'entreprise
		privateUseAllowed: v.boolean(),
		privateKmPerYear: v.optional(v.number()),        // km privés déclarés/estimés
		aenMethod: v.union(v.literal('FORFAITAIRE'), v.literal('REEL')),
		notes: v.optional(v.string()),
		createdBy: v.string(),
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_vehicle', ['vehicleId'])
		.index('by_user', ['userId'])
		.index('by_org_and_end', ['organizationId', 'endDate']),

	// Carbon footprint reports — bilans carbone annuels générés par les DAFs
	carbonReports: defineTable({
		organizationId: v.id('organizations'),
		year: v.number(),
		scope1TotalTCO2e: v.number(),
		scope2TotalTCO2e: v.number(),
		totalTCO2e: v.number(),
		perVehicle: v.array(
			v.object({
				vehicleId: v.id('vehicles'),
				registration: v.string(),
				brand: v.string(),
				model: v.string(),
				energy: v.string(),
				fuelType: v.string(),
				litersConsumed: v.optional(v.number()),
				kwh: v.optional(v.number()),
				tco2e: v.number(),
				scope: v.union(v.literal('SCOPE1'), v.literal('SCOPE2'))
			})
		),
		dataSource: v.union(
			v.literal('FUEL_IMPORT'),
			v.literal('COST_ESTIMATE'),
			v.literal('MANUAL')
		),
		pdfStorageId: v.optional(v.string()),
		generatedBy: v.string(),
		generatedAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_year', ['organizationId', 'year']),

	// Compliance alerts — alertes réglementaires (assurance, CT, permis)
	complianceAlerts: defineTable({
		organizationId: v.id('organizations'),
		entityType: v.union(v.literal('VEHICLE'), v.literal('DRIVER')),
		entityId: v.string(),
		alertType: v.union(
			v.literal('INSURANCE_EXPIRING'),
			v.literal('INSURANCE_EXPIRED'),
			v.literal('CT_EXPIRING'),
			v.literal('CT_EXPIRED'),
			v.literal('LICENSE_EXPIRING'),
			v.literal('LICENSE_EXPIRED'),
			v.literal('REGISTRATION_EXPIRING'),
			v.literal('REGISTRATION_EXPIRED')
		),
		horizon: v.union(v.literal('30_DAYS'), v.literal('7_DAYS'), v.literal('EXPIRED')),
		expiryDate: v.string(),
		entityLabel: v.string(),
		resolvedAt: v.optional(v.number()),
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_entity', ['entityType', 'entityId'])
		.index('by_org_and_type', ['organizationId', 'alertType'])
		.index('by_org_and_resolved', ['organizationId', 'resolvedAt'])
		.index('by_entity_type_horizon', ['entityId', 'alertType', 'horizon']),

	// Note: The agent component automatically creates the following tables:
	// - agent:threads - Conversation threads for customer support
	// - agent:messages - Messages within threads (separate from demo messages table)
	// - agent:streamingDeltas - Real-time streaming chunks
	// - agent:embeddings - Vector embeddings for semantic search
});
