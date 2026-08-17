import { internalMutation } from '../_generated/server';

// Tourne toutes les 30 min (crons.ts).
// Détecte les tickets dont le SLA premier retour est dépassé, escalade en URGENT,
// ajoute une note interne visible dans le fil, et marque slaBreachedAt pour éviter
// les doublons sur les passages suivants.
export const checkSlaBreach = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();

		// Collecte tous les tickets actifs et filtre en JS pour gérer les champs optionnels
		const activeTickets = await ctx.db
			.query('conciergeTickets')
			.filter((q) =>
				q.and(q.neq(q.field('status'), 'RESOLVED'), q.neq(q.field('status'), 'CLOSED'))
			)
			.collect();

		const overdue = activeTickets.filter(
			(t) =>
				t.slaDeadline !== undefined &&
				t.slaDeadline < now &&
				!t.firstResponseAt && // pas encore de première réponse
				!t.slaBreachedAt // pas encore traité par le cron
		);

		for (const ticket of overdue) {
			const overdueMin = Math.round((now - ticket.slaDeadline!) / 60_000);
			const overdueLabel =
				overdueMin < 60
					? `${overdueMin} min`
					: `${Math.round(overdueMin / 60)}h${overdueMin % 60 > 0 ? String(overdueMin % 60).padStart(2, '0') : ''}`;

			// 1. Marquer la brèche + escalader en URGENT
			await ctx.db.patch(ticket._id, {
				slaBreachedAt: now,
				priority: 'URGENT',
				updatedAt: now
			});

			// 2. Note interne dans le fil (visible concierge uniquement)
			await ctx.db.insert('conciergeTicketMessages', {
				ticketId: ticket._id,
				authorId: '__system__',
				authorRole: 'operator',
				senderName: 'Système',
				content: `⚠️ SLA dépassé — premier retour attendu depuis ${overdueLabel}. Priorité escaladée en URGENT.`,
				isInternal: true,
				createdAt: now
			});
		}

		return { checked: activeTickets.length, breached: overdue.length };
	}
});
