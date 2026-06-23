import { v, ConvexError } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from './_generated/server';
import { internal } from './_generated/api';
import { authedQuery, authedMutation } from './functions';
import { getUserOrg, requireOrgAdmin } from './lib/auth';
import { resend, assertResendApiKey } from './emails/resend';
import { requireEnv } from './env';
import type { Id } from './_generated/dataModel';

// ─── Upload URL ───────────────────────────────────────────────────────────────

export const generateIncidentUploadUrl = authedMutation({
	args: {},
	handler: async (ctx) => {
		await getUserOrg(ctx);
		return ctx.storage.generateUploadUrl();
	}
});

// ─── Déclaration ──────────────────────────────────────────────────────────────

export const declareIncident = authedMutation({
	args: {
		vehicleId: v.id('vehicles'),
		reservationId: v.optional(v.id('reservations')),
		incidentDate: v.number(),
		location: v.string(),
		description: v.string(),
		thirdPartyInvolved: v.boolean(),
		thirdPartyInfo: v.optional(v.string()),
		photos: v.array(v.object({ label: v.string(), storageId: v.string() }))
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);

		if (args.photos.length === 0) throw new ConvexError('Au moins une photo est requise');
		if (args.photos.length > 10) throw new ConvexError('Maximum 10 photos par sinistre');

		const vehicle = await ctx.db.get(args.vehicleId);
		if (!vehicle || vehicle.organizationId !== organizationId) {
			throw new ConvexError('Véhicule introuvable');
		}

		// Vérifier autorisation : conducteur de la réservation ou admin
		if (args.reservationId) {
			const reservation = await ctx.db.get(args.reservationId);
			if (reservation && reservation.userId !== user._id) {
				await requireOrgAdmin(ctx, organizationId, user._id);
			}
		}

		const now = Date.now();
		const incidentId = await ctx.db.insert('incidents', {
			organizationId,
			vehicleId: args.vehicleId,
			reportedBy: user._id,
			reservationId: args.reservationId,
			incidentDate: args.incidentDate,
			location: args.location,
			description: args.description,
			thirdPartyInvolved: args.thirdPartyInvolved,
			thirdPartyInfo: args.thirdPartyInfo,
			photos: args.photos,
			status: 'DECLARED',
			createdAt: now,
			updatedAt: now
		});

		// Véhicule → MAINTENANCE
		await ctx.db.patch(args.vehicleId, { status: 'MAINTENANCE', activeIncidentId: incidentId });

		// Notifier tous les ORG_ADMIN
		const admins = await ctx.db
			.query('organizationMembers')
			.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
			.filter((q) => q.eq(q.field('role'), 'ORG_ADMIN'))
			.collect();

		for (const admin of admins) {
			await ctx.db.insert('notifications', {
				organizationId,
				userId: admin.userId,
				type: 'INCIDENT_DECLARED',
				title: `Sinistre déclaré — ${vehicle.brand} ${vehicle.model}`,
				message: `${args.location} · ${new Date(args.incidentDate).toLocaleDateString('fr-FR')}`,
				link: `/admin/incidents/${incidentId}`,
				isRead: false,
				createdAt: now
			});
		}

		return incidentId;
	}
});

// ─── Mise à jour statut (admin) ───────────────────────────────────────────────

export const updateIncidentStatus = authedMutation({
	args: {
		incidentId: v.id('incidents'),
		status: v.union(
			v.literal('SENT_TO_INSURER'),
			v.literal('EXPERTISE'),
			v.literal('REPAIR'),
			v.literal('CLOSED'),
			v.literal('CONTESTED')
		),
		insurerReference: v.optional(v.string()),
		insurerEmail: v.optional(v.string()),
		franchiseAmount: v.optional(v.number()),
		estimatedRepairCost: v.optional(v.number()),
		closingNotes: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const incident = await ctx.db.get(args.incidentId);
		if (!incident || incident.organizationId !== organizationId) {
			throw new ConvexError('Sinistre introuvable');
		}

		const now = Date.now();
		await ctx.db.patch(args.incidentId, {
			status: args.status,
			insurerReference: args.insurerReference ?? incident.insurerReference,
			insurerEmail: args.insurerEmail ?? incident.insurerEmail,
			franchiseAmount: args.franchiseAmount ?? incident.franchiseAmount,
			estimatedRepairCost: args.estimatedRepairCost ?? incident.estimatedRepairCost,
			closingNotes: args.closingNotes,
			closedAt: args.status === 'CLOSED' ? now : incident.closedAt,
			updatedAt: now
		});

		// Clôture avec franchise → créer un coût SINISTRE
		if (args.status === 'CLOSED') {
			const franchise = args.franchiseAmount ?? incident.franchiseAmount ?? 0;
			if (franchise > 0) {
				await ctx.db.insert('costs', {
					organizationId,
					vehicleId: incident.vehicleId,
					category: 'SINISTRE',
					amount: franchise,
					date: now,
					description: `Franchise sinistre — ${incident.location}`,
					source: 'MANUAL',
					createdBy: user._id,
					createdAt: now
				});
			}
			// Véhicule → AVAILABLE
			await ctx.db.patch(incident.vehicleId, { status: 'AVAILABLE', activeIncidentId: undefined });
		}
	}
});

// ─── Envoi email assureur ─────────────────────────────────────────────────────

export const triggerSendToInsurer = authedMutation({
	args: {
		incidentId: v.id('incidents'),
		insurerEmail: v.string()
	},
	handler: async (ctx, { incidentId, insurerEmail }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const incident = await ctx.db.get(incidentId);
		if (!incident || incident.organizationId !== organizationId) {
			throw new ConvexError('Sinistre introuvable');
		}

		const vehicle = await ctx.db.get(incident.vehicleId);
		const org = await ctx.db.get(incident.organizationId);

		await ctx.db.patch(incidentId, { insurerEmail, updatedAt: Date.now() });

		await ctx.scheduler.runAfter(0, internal.incidents.sendIncidentEmailAction, {
			incidentId,
			insurerEmail,
			vehicleLabel: vehicle
				? `${vehicle.brand} ${vehicle.model} (${vehicle.registration})`
				: 'Véhicule inconnu',
			orgName: org?.name ?? 'Entreprise',
			incidentDate: incident.incidentDate,
			location: incident.location,
			description: incident.description,
			thirdPartyInvolved: incident.thirdPartyInvolved,
			thirdPartyInfo: incident.thirdPartyInfo,
			photoCount: incident.photos.length
		});
	}
});

// ─── Queries publiques ────────────────────────────────────────────────────────

export const getIncident = authedQuery({
	args: { incidentId: v.id('incidents') },
	handler: async (ctx, { incidentId }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		const incident = await ctx.db.get(incidentId);
		if (!incident || incident.organizationId !== organizationId) return null;

		// Salarié : ne voir que ses propres sinistres
		const membership = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id)
			)
			.unique();
		const isAdmin = membership?.role === 'ORG_ADMIN' || membership?.role === 'ORG_MANAGER';
		if (!isAdmin && incident.reportedBy !== user._id) return null;

		const vehicle = await ctx.db.get(incident.vehicleId);
		const photoUrls = await Promise.all(
			incident.photos.map(async (p) => ({
				label: p.label,
				url: await ctx.storage.getUrl(p.storageId)
			}))
		);
		return { ...incident, vehicle, photoUrls };
	}
});

export const listIncidents = authedQuery({
	args: {
		status: v.optional(v.string()),
		limit: v.optional(v.number())
	},
	handler: async (ctx, { status, limit }) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const all = await ctx.db
			.query('incidents')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take((limit ?? 50) * 3);

		const filtered = status ? all.filter((i) => i.status === status) : all;
		const sliced = filtered.slice(0, limit ?? 50);

		return Promise.all(
			sliced.map(async (incident) => {
				const vehicle = await ctx.db.get(incident.vehicleId);
				return { ...incident, vehicle };
			})
		);
	}
});

export const listMyIncidents = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { user, organizationId } = await getUserOrg(ctx);
		const all = await ctx.db
			.query('incidents')
			.withIndex('by_reporter', (q) => q.eq('reportedBy', user._id))
			.order('desc')
			.take(20);
		return Promise.all(
			all
				.filter((i) => i.organizationId === organizationId)
				.map(async (incident) => {
					const vehicle = await ctx.db.get(incident.vehicleId);
					return { ...incident, vehicle };
				})
		);
	}
});

export const getIncidentStats = authedQuery({
	args: {},
	handler: async (ctx) => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);

		const all = await ctx.db
			.query('incidents')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.collect();

		return {
			total: all.length,
			open: all.filter((i) => !['CLOSED', 'CONTESTED'].includes(i.status)).length,
			sentToInsurer: all.filter((i) => i.status === 'SENT_TO_INSURER').length,
			closed: all.filter((i) => i.status === 'CLOSED').length,
			totalFranchise: all.reduce((sum, i) => sum + (i.franchiseAmount ?? 0), 0)
		};
	}
});

// ─── Internal helpers ─────────────────────────────────────────────────────────

export const getIncidentInternal = internalQuery({
	args: { incidentId: v.id('incidents') },
	handler: async (ctx, { incidentId }) => ctx.db.get(incidentId)
});

export const markSentToInsurer = internalMutation({
	args: { incidentId: v.id('incidents'), insurerEmail: v.string() },
	handler: async (ctx, { incidentId, insurerEmail }) => {
		await ctx.db.patch(incidentId, {
			status: 'SENT_TO_INSURER',
			insurerEmail,
			updatedAt: Date.now()
		});
	}
});

// ─── Action email assureur ────────────────────────────────────────────────────

export const sendIncidentEmailAction = internalAction({
	args: {
		incidentId: v.id('incidents'),
		insurerEmail: v.string(),
		vehicleLabel: v.string(),
		orgName: v.string(),
		incidentDate: v.number(),
		location: v.string(),
		description: v.string(),
		thirdPartyInvolved: v.boolean(),
		thirdPartyInfo: v.optional(v.string()),
		photoCount: v.number()
	},
	handler: async (ctx, args) => {
		assertResendApiKey();

		const incidentDateStr = new Date(args.incidentDate).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'long',
			year: 'numeric'
		});

		const html = `<!DOCTYPE html>
<html lang="fr">
<body style="font-family: -apple-system, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1a1a1a;">
  <div style="border-bottom: 3px solid #F5C518; padding-bottom: 16px; margin-bottom: 24px;">
    <h2 style="margin: 0; font-size: 20px;">Déclaration de sinistre</h2>
    <p style="margin: 4px 0 0; color: #666; font-size: 14px;">${args.orgName} · via Mycelium Fleet OS</p>
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 14px;">
    <tr>
      <td style="padding: 10px 12px; background: #f5f5f5; font-weight: 600; width: 35%; border: 1px solid #e0e0e0;">Véhicule</td>
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0;">${args.vehicleLabel}</td>
    </tr>
    <tr>
      <td style="padding: 10px 12px; background: #f5f5f5; font-weight: 600; border: 1px solid #e0e0e0;">Date du sinistre</td>
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0;">${incidentDateStr}</td>
    </tr>
    <tr>
      <td style="padding: 10px 12px; background: #f5f5f5; font-weight: 600; border: 1px solid #e0e0e0;">Lieu</td>
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0;">${args.location}</td>
    </tr>
    <tr>
      <td style="padding: 10px 12px; background: #f5f5f5; font-weight: 600; border: 1px solid #e0e0e0;">Tiers impliqué</td>
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0;">${args.thirdPartyInvolved ? 'Oui' : 'Non'}${args.thirdPartyInfo ? ' — ' + args.thirdPartyInfo : ''}</td>
    </tr>
    <tr>
      <td style="padding: 10px 12px; background: #f5f5f5; font-weight: 600; border: 1px solid #e0e0e0;">Photos</td>
      <td style="padding: 10px 12px; border: 1px solid #e0e0e0;">${args.photoCount} photo(s) disponible(s) dans Mycelium</td>
    </tr>
  </table>

  <h3 style="font-size: 15px; margin-bottom: 8px;">Description de l'accident</h3>
  <div style="background: #f9f9f9; padding: 14px; border-radius: 6px; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${args.description}</div>

  <p style="margin-top: 24px; font-size: 12px; color: #888;">
    Dossier généré automatiquement par Mycelium Fleet OS · ${args.orgName}<br>
    Pour accéder aux photos et documents : contactez directement l'entreprise.
  </p>
</body>
</html>`;

		await resend.sendEmail(ctx, {
			from: requireEnv('AUTH_EMAIL', { feature: 'email delivery' }),
			to: args.insurerEmail,
			subject: `Déclaration sinistre — ${args.vehicleLabel} — ${incidentDateStr}`,
			html
		});

		await ctx.runMutation(internal.incidents.markSentToInsurer, {
			incidentId: args.incidentId,
			insurerEmail: args.insurerEmail
		});
	}
});
