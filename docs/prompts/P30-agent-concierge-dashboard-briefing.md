---
priority: 30
feature: Agent Concierge Dashboard — briefing matinal automatique
sprint: Concierge S3 (clôture du Chapitre 3)
version: V3 — Service Fleet Care (conciergerie)
effort: 2 jours
depends_on: P26 (concierge_tasks), P27 (dashboard concierge)
blocks: —
model_recommended: claude-sonnet-4-6 (rédaction du briefing en langage naturel, cache ephemeral sur le prompt système — même pattern que l'Optimizer P10)
pricing_tier: outil interne équipe Mycelium — non exposé aux clients
---

# P30 — Agent Concierge Dashboard : briefing matinal

## 🎯 Mission

Le dashboard `/concierge` (P27) existe et affiche la file de tâches en temps réel. Mais un concierge qui gère 15+ clients bénéficie d'un point de départ synthétique **avant** même d'ouvrir l'app : un email à 7h qui dit "voici ce qui compte aujourd'hui, dans cet ordre, et pourquoi." C'est le rôle de l'Agent Concierge Dashboard — le seul des agents IA de Mycelium qui ne parle jamais à un client, uniquement à l'équipe interne.

**Ce prompt reprend directement le pattern déjà validé par le Fleet Optimizer (P10)** : cron quotidien, collecte déterministe des données, un seul appel Claude avec cache de prompt système, email HTML. Rien de nouveau architecturalement — c'est une nouvelle application du même moule.

**Exemple de valeur :**

> 7h du matin, le concierge reçoit : "Aujourd'hui, 3 clients nécessitent une action prioritaire. Dupont Logistics : sinistre déclaré hier soir (véhicule immobilisé, véhicule de remplacement à coordonner). Nordic Freight : assurance expirée depuis 2 jours sur 1 véhicule. Atlas Consulting : contrat leasing à échéance dans 25 jours, opportunité de négociation identifiée par l'Optimizer. Les 9 autres tâches ouvertes sont de priorité normale, consultables dans le dashboard."

---

## 📍 État actuel du codebase

**Ce qui existe :**

- `concierge_tasks` (P26) avec `priorityScore`, `organizationId`, `status`
- Pattern cron + email déjà éprouvé dans `optimizer.ts` : `runFleetOptimizerForAllOrgs` → collecte → appel Claude avec `cache_control: { type: 'ephemeral' }` sur le system prompt → `sendOptimizerReportEmail` via Resend
- `crons.ts` : pattern `crons.daily('nomJob', { hourUTC, minuteUTC }, internal.module.fonction, {})`
- Liste des comptes staff Mycelium (`role === 'admin'` sur Better Auth) — mêmes comptes qui accèdent à `/concierge` (P27)

**Ce qui manque :**

- Toute collecte cross-org agrégée en dehors des crons de détection individuels (`alerts.ts`, `maintenance/detector.ts` tournent par org mais n'agrègent jamais entre eux)
- Le briefing en langage naturel lui-même
- L'envoi email à l'équipe interne (aujourd'hui, tous les emails automatisés de Mycelium visent des clients, jamais l'équipe elle-même)

---

## 🔒 Contraintes absolues

1. **Un seul appel Claude, pas de boucle agentique.** Comme l'Optimizer : collecte déterministe d'abord (TypeScript pur), puis un seul appel pour la mise en forme narrative. Pas de tool calling ici, pas besoin.
2. **Cache ephemeral sur le system prompt.** Reprendre exactement le pattern `cache_control: { type: 'ephemeral' }` de `optimizer.ts` ligne ~333 — le prompt système ne change pas d'un jour à l'autre, seul le contenu des données varie.
3. **Jamais d'action automatique déclenchée par le briefing.** Le rôle de l'agent est de résumer et prioriser, jamais d'agir (pas d'email client envoyé, pas de tâche fermée automatiquement).
4. **Destinataires = staff interne uniquement.** La liste des emails destinataires vient des comptes Better Auth `role === 'admin'`, jamais des clients (`ORG_ADMIN`/`ORG_MEMBER`).
5. **Dégradation gracieuse si aucune tâche urgente.** Si la file est propre, le briefing doit le dire simplement ("Aucune action prioritaire aujourd'hui, X tâches de suivi normal") plutôt que de forcer un texte alarmiste.

---

## 📊 Schema changes requises

Aucune nouvelle table.

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/agents/conciergeDashboard.ts   → NOUVEAU : collecte + appel Claude + envoi email
src/lib/convex/crons.ts                       → ajouter cron quotidien 7h UTC
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Collecte cross-org déterministe

```typescript
// src/lib/convex/agents/conciergeDashboard.ts
import { internalAction, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import Anthropic from '@anthropic-ai/sdk';

export const collectDailySignals = internalQuery({
	args: {},
	handler: async (ctx) => {
		const tasks = await ctx.db
			.query('concierge_tasks')
			.withIndex('by_status_and_priority')
			.filter((q) => q.neq(q.field('status'), 'DONE'))
			.collect();

		const orgIds = [...new Set(tasks.map((t) => t.organizationId))];
		const orgs = await Promise.all(orgIds.map((id) => ctx.db.get(id)));
		const orgMap = new Map(orgs.filter(Boolean).map((o) => [o!._id, o!.name]));

		const enriched = tasks
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
```

### Étape 2 — Appel Claude pour la rédaction (pattern Optimizer réutilisé)

```typescript
export const runDailyConciergeBriefing = internalAction({
	args: {},
	handler: async (ctx) => {
		const signals = await ctx.runQuery(internal.agents.conciergeDashboard.collectDailySignals, {});

		if (signals.critical.length === 0 && signals.urgent.length === 0) {
			await ctx.runAction(internal.agents.conciergeDashboard.sendBriefingEmail, {
				briefingText: `Aucune action prioritaire aujourd'hui. ${signals.normalCount} tâche(s) de suivi normal et ${signals.infoCount} information(s) consultables dans le dashboard.`
			});
			return;
		}

		const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

		const response = await anthropic.messages.create({
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
		});

		const briefingText = response.content[0].type === 'text' ? response.content[0].text : '';

		await ctx.runAction(internal.agents.conciergeDashboard.sendBriefingEmail, { briefingText });
	}
});

const BRIEFING_SYSTEM_PROMPT = `Tu rédiges le briefing matinal d'un concierge automobile qui gère plusieurs dizaines de flottes clientes en parallèle.

Règles :
- Commence par le nombre de clients nécessitant une action aujourd'hui
- Détaille chaque tâche CRITICAL et URGENT : nom du client, résumé en une phrase, pourquoi c'est prioritaire
- Termine par un résumé chiffré du reste (tâches normales/info, sans détail)
- Ton direct, opérationnel, zéro remplissage — un concierge lit ça en 30 secondes avant de commencer sa journée
- Ne jamais inventer d'information absente des données fournies
- Format : texte brut structuré, pas de markdown complexe (l'email HTML l'enrobera)`;
```

### Étape 3 — Envoi email interne (réutilise Resend, pattern `sendOptimizerReportEmail`)

```typescript
export const sendBriefingEmail = internalAction({
	args: { briefingText: v.string() },
	handler: async (ctx, { briefingText }) => {
		const conciergeStaff = await ctx.runQuery(internal.admin.queries.listAdminStaffEmails, {});

		const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #0f0f0f; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
    <h1 style="color: #f5e642; margin: 0; font-size: 18px;">🌱 Briefing Concierge — ${new Date().toLocaleDateString('fr-FR')}</h1>
  </div>
  <pre style="white-space: pre-wrap; font-family: sans-serif; font-size: 14px; line-height: 1.6;">${briefingText}</pre>
  <p style="margin-top: 24px;">
    <a href="${process.env.APP_URL}/concierge" style="background: #f5e642; color: #000; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold;">
      Ouvrir le dashboard →
    </a>
  </p>
</body>
</html>`;

		for (const email of conciergeStaff) {
			await resend.sendEmail(ctx, {
				from: 'Mycelium Concierge <concierge@mycelium-fleet.com>',
				to: email,
				subject: `Briefing du jour — ${new Date().toLocaleDateString('fr-FR')}`,
				html
			});
		}
	}
});
```

> `listAdminStaffEmails` : nouvelle query interne triviale dans `admin/queries.ts` qui retourne les emails des utilisateurs Better Auth avec `role === 'admin'` — même source que le guard de `/concierge` (P27), à créer si elle n'existe pas déjà sous une autre forme.

### Étape 4 — Cron

```typescript
// src/lib/convex/crons.ts — ajouter
// Briefing concierge quotidien — 7h UTC, avant l'arrivée de l'équipe
crons.daily(
	'conciergeDailyBriefing',
	{ hourUTC: 7, minuteUTC: 0 },
	internal.agents.conciergeDashboard.runDailyConciergeBriefing,
	{}
);
```

---

## ✅ Critères d'acceptation

- [ ] Cron quotidien 7h UTC déclenche la collecte et l'envoi sans intervention manuelle
- [ ] Si aucune tâche `CRITICAL`/`URGENT` n'existe, l'email est quand même envoyé avec un message positif (pas de silence radio)
- [ ] Le briefing cite chaque tâche critique/urgente par nom de client, jamais d'invention de données absentes du JSON fourni
- [ ] Le cache ephemeral est actif sur le system prompt (vérifiable via les logs Anthropic — `cache_creation_input_tokens` sur le premier appel du jour, `cache_read_input_tokens` ensuite si plusieurs orgs traitées — ici un seul appel global donc surtout utile si ce prompt est réutilisé/étendu)
- [ ] Seuls les comptes `role === 'admin'` reçoivent l'email, jamais un client
- [ ] Aucune mutation de `concierge_tasks` déclenchée par ce prompt — lecture et notification uniquement

---

## 🚫 NE PAS FAIRE

- Ne pas construire de boucle agentique avec tool calling — un seul appel Claude suffit, comme pour l'Optimizer
- Ne pas envoyer le briefing aux clients — c'est un outil 100% interne
- Ne pas faire agir l'agent (fermer une tâche, envoyer un message client) — il informe, il ne décide ni n'exécute
- Ne pas construire dans ce prompt le canal d'escalade WhatsApp/SMS temps réel évoqué en section 8.3 de `/docs/ROADMAP-CONCIERGE.md` — c'est un prompt distinct, futur, une fois le briefing quotidien validé en usage réel
- Ne pas dupliquer la logique de scoring — ce prompt consomme `priorityScore`/`priority` déjà calculés par P26, il ne recalcule rien
