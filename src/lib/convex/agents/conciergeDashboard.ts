/**
 * Agent Concierge Dashboard — briefing matinal quotidien.
 *
 * Pattern identique à l'Optimizer (P10) : collecte déterministe TypeScript,
 * un seul appel Claude avec cache ephemeral sur le system prompt, email HTML
 * aux membres du staff Mycelium (jamais aux clients).
 *
 * Cron : 7h UTC, déclenchement via internal.agents.conciergeDashboard.runDailyConciergeBriefing
 */

import { v } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { resend, assertResendApiKey } from '../emails/resend';
import { requireEnv } from '../env';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskSignal {
	organizationName: string;
	priority: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'INFO';
	priorityScore: number;
	title: string;
	description: string;
	dueDate?: number;
}

interface DailySignals {
	critical: TaskSignal[];
	urgent: TaskSignal[];
	normalCount: number;
	infoCount: number;
}

// ─── Collecte cross-org ───────────────────────────────────────────────────────

export const collectDailySignals = internalQuery({
	args: {},
	handler: async (ctx): Promise<DailySignals> => {
		const tasks = await ctx.db
			.query('concierge_tasks')
			.withIndex('by_status_and_priority')
			.filter((q) => q.neq(q.field('status'), 'DONE'))
			.collect();

		const orgIds = [...new Set(tasks.map((t) => t.organizationId))];
		const orgs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
		const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!.name]));

		const enriched: TaskSignal[] = tasks
			.map((t) => ({
				organizationName: orgMap.get(t.organizationId) ?? 'Organisation inconnue',
				priority: t.priority,
				priorityScore: t.priorityScore,
				title: t.title,
				description: t.description,
				dueDate: t.dueDate
			}))
			.sort((a, b) => b.priorityScore - a.priorityScore);

		return {
			critical: enriched.filter((t) => t.priority === 'CRITICAL'),
			urgent: enriched.filter((t) => t.priority === 'URGENT'),
			normalCount: enriched.filter((t) => t.priority === 'NORMAL').length,
			infoCount: enriched.filter((t) => t.priority === 'INFO').length
		};
	}
});

// ─── System prompt (stable — éligible au cache ephemeral) ─────────────────────

const BRIEFING_SYSTEM_PROMPT = `Tu rédiges le briefing matinal d'un concierge automobile qui gère plusieurs dizaines de flottes clientes en parallèle.

Règles :
- Commence par le nombre de clients nécessitant une action aujourd'hui
- Détaille chaque tâche CRITICAL et URGENT : nom du client, résumé en une phrase, pourquoi c'est prioritaire
- Termine par un résumé chiffré du reste (tâches normales/info, sans détail)
- Ton direct, opérationnel, zéro remplissage — un concierge lit ça en 30 secondes avant de commencer sa journée
- Ne jamais inventer d'information absente des données fournies
- Format : texte brut structuré, pas de markdown complexe (l'email HTML l'enrobera)`;

// ─── Envoi email au staff interne ─────────────────────────────────────────────

export const sendBriefingEmail = internalMutation({
	args: { briefingText: v.string() },
	handler: async (ctx, { briefingText }) => {
		assertResendApiKey();

		const staff = await ctx.db.query('myceliumStaff').collect();
		const staffEmails = staff.map((m) => m.email);
		if (staffEmails.length === 0) return;

		const siteUrl = requireEnv('SITE_URL', { feature: 'concierge briefing email links' });
		const authEmail = requireEnv('AUTH_EMAIL', { feature: 'concierge briefing email delivery' });
		const conciergeUrl = `${siteUrl}/concierge`;

		const dateLabel = new Date().toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});

		const html = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:20px;">
<div style="max-width:600px;margin:0 auto;">
  <div style="background:#0f0f0f;border-radius:12px;padding:24px;margin-bottom:20px;">
    <div style="font-size:20px;font-weight:700;color:#f5e642;">🌱 Briefing Concierge</div>
    <div style="color:#888;font-size:13px;margin-top:6px;">${dateLabel}</div>
  </div>
  <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e5e7eb;">
    <pre style="white-space:pre-wrap;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;line-height:1.7;color:#111;margin:0;">${briefingText}</pre>
    <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
      <a href="${conciergeUrl}" style="background:#f5e642;color:#0f0f0f;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">Ouvrir le dashboard &rarr;</a>
    </div>
  </div>
  <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:16px;">
    Briefing généré automatiquement par Mycelium Fleet OS &mdash; usage interne uniquement.
  </p>
</div>
</body>
</html>`;

		const subject = `Briefing concierge — ${new Date().toLocaleDateString('fr-FR')}`;

		for (const email of staffEmails) {
			await resend.sendEmail(ctx, {
				from: authEmail,
				to: email,
				subject,
				html
			});
		}
	}
});

// ─── Action principale ─────────────────────────────────────────────────────────

export const runDailyConciergeBriefing = internalAction({
	args: {},
	returns: v.null(),
	handler: async (ctx): Promise<null> => {
		const signals = await ctx.runQuery(
			internal.agents.conciergeDashboard.collectDailySignals,
			{}
		);

		let briefingText: string;

		// Aucune urgence : message positif court, pas de silence radio
		if (signals.critical.length === 0 && signals.urgent.length === 0) {
			const extras = signals.normalCount + signals.infoCount;
			briefingText =
				extras > 0
					? `Aucune action prioritaire aujourd'hui. ${extras} tâche${extras > 1 ? 's' : ''} de suivi normal consultable${extras > 1 ? 's' : ''} dans le dashboard.`
					: "File d'attente vide. Aucune tâche ouverte pour l'instant.";
		} else {
			const apiKey = process.env.ANTHROPIC_API_KEY;
			if (!apiKey) {
				briefingText = `[Briefing indisponible — ANTHROPIC_API_KEY manquante]\n\n${signals.critical.length} CRITIQUE(S), ${signals.urgent.length} URGENT(E)(S). Consultez le dashboard.`;
			} else {
				try {
					const res = await fetch('https://api.anthropic.com/v1/messages', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'x-api-key': apiKey,
							'anthropic-version': '2023-06-01',
							'anthropic-beta': 'prompt-caching-2024-07-31'
						},
						body: JSON.stringify({
							model: 'claude-sonnet-4-6',
							max_tokens: 800,
							system: [
								{
									type: 'text',
									text: BRIEFING_SYSTEM_PROMPT,
									cache_control: { type: 'ephemeral' }
								}
							],
							messages: [
								{
									role: 'user',
									content: `Voici les signaux du jour à résumer :\n\n${JSON.stringify(signals, null, 2)}`
								}
							]
						})
					});

					if (!res.ok) {
						const err = await res.text().catch(() => '');
						briefingText = `[Briefing indisponible — API error ${res.status}]\n\n${signals.critical.length} CRITIQUE(S), ${signals.urgent.length} URGENT(E)(S). Consultez le dashboard.\n\n${err}`;
					} else {
						const json = (await res.json()) as { content: { type: string; text: string }[] };
						const textBlock = json.content.find((b) => b.type === 'text');
						briefingText = textBlock?.text ?? '[Réponse vide de Claude]';
					}
				} catch (e) {
					briefingText = `[Briefing indisponible — erreur réseau]\n\n${signals.critical.length} CRITIQUE(S), ${signals.urgent.length} URGENT(E)(S). Consultez le dashboard.`;
				}
			}
		}

		await ctx.runMutation(internal.agents.conciergeDashboard.sendBriefingEmail, {
			briefingText
		});

		return null;
	}
});
