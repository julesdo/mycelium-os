---
priority: 28
feature: Compliance Officer — séquence d'alertes progressive J-60/J-30/J-7 + escalade concierge
sprint: Concierge S2 (en parallèle de P27)
version: V3 — Service Fleet Care (conciergerie)
effort: 3 jours
depends_on: P26 (concierge_tasks), P20 (Compliance Officer)
blocks: —
model_recommended: claude-haiku-4-5-20251001 (inchangé — logique déterministe)
pricing_tier: Professional+ (le Compliance Officer est déjà gated à ce tier)
---

# P28 — Extension Compliance Officer : séquence J-60/J-30/J-7 + brouillons de rappel

## 🎯 Mission

Le Compliance Officer (P20) détecte déjà les échéances à 30 jours et 7 jours. Pour un service de conciergerie, c'est trop tard pour agir sereinement sur un renouvellement d'assurance ou un contrôle technique — le concierge a besoin de temps pour contacter le client, planifier, parfois négocier un nouveau contrat. Ce prompt ajoute un **palier à 60 jours** et surtout connecte les alertes à la file `concierge_tasks` (P26) avec un premier jet de message de rappel prêt à être personnalisé par l'humain — jamais envoyé automatiquement au client.

**Exemple de valeur :**

> J-60 avant l'expiration de l'assurance d'un véhicule : le Compliance Officer crée l'alerte, elle apparaît dans `concierge_tasks` avec priorité `NORMAL` et un brouillon d'email de rappel pré-rédigé. Le concierge le relit, l'ajuste en 30 secondes, l'envoie. Le client n'a jamais eu à s'en soucier.

---

## 📍 État actuel du codebase

**Ce qui existe :**

- `src/lib/convex/compliance.ts` : `checkComplianceForOrg`, seuils `THRESHOLDS = [{days: 30, horizon: '30_DAYS'}, {days: 7, horizon: '7_DAYS'}]`, fonction `maybeCreateAlert` (dédoublonnage par entité/type/horizon)
- `complianceAlerts` schema avec `horizon: v.union(v.literal('30_DAYS'), v.literal('7_DAYS'), v.literal('EXPIRED'))`
- `src/lib/convex/agents/compliance.ts` : agent chat Sonnet 4.6, 6 tools read-only (`getFullComplianceDashboard`, `getVehicleDocumentStatus`, etc.)
- Depuis P26 : `internal.concierge.tasks.upsertTaskFromSource` disponible pour créer une tâche depuis n'importe quelle source

**Ce qui manque :**

- Le palier `60_DAYS`
- Un tool agent pour générer un brouillon de message de rappel (jamais envoyé sans validation humaine)
- Un champ de suivi de contestation sur `trafficViolations` (mentionné dans la roadmap conciergerie — utile ici pour enrichir le Compliance Officer avec la visibilité "contestations en cours")

---

## 🔒 Contraintes absolues

1. **Aucun message n'est envoyé au client sans validation humaine explicite.** `generateReminderDraft` retourne du texte, jamais un envoi. C'est le concierge qui déclenche l'envoi depuis l'UI (P27/P29), pas l'agent.
2. **Le modèle reste Haiku pour la détection déterministe.** Seule la génération de texte de brouillon (nouveau besoin) justifie un appel à un modèle de langage — et même là, un template paramétrique suffit dans un premier temps (voir Étape 3, pas d'obligation d'appeler Claude si un template couvre le besoin).
3. **Dédoublonnage étendu sans casser l'existant.** Ajouter `60_DAYS` ne doit pas faire réapparaître des alertes déjà résolues à `30_DAYS`/`7_DAYS` pour des entités déjà traitées avant ce déploiement.
4. **Isolation multi-tenant inchangée.** Ce prompt ne touche pas à la couche cross-org — chaque alerte reste scopée à son organisation, seule sa visibilité concierge passe par `concierge_tasks` (P26).

---

## 📊 Schema changes requises

### Modifier `complianceAlerts.horizon`

```typescript
// src/lib/convex/schema.ts — élargir l'union existante
horizon: v.union(
  v.literal('60_DAYS'), // NOUVEAU
  v.literal('30_DAYS'),
  v.literal('7_DAYS'),
  v.literal('EXPIRED')
),
```

### Ajouter à `trafficViolations` (suivi de contestation, déjà signalé dans la roadmap conciergerie)

```typescript
// src/lib/convex/schema.ts — dans trafficViolations, ajouter :
disputeStatus: v.optional(
  v.union(
    v.literal('NONE'),
    v.literal('CONTESTED'),
    v.literal('WON'),
    v.literal('LOST')
  )
),
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                     → horizon +60_DAYS, trafficViolations +disputeStatus
src/lib/convex/compliance.ts                 → THRESHOLDS +60j, brancher upsertTaskFromSource (P26)
src/lib/convex/agents/compliance.ts           → +2 tools : generateReminderDraft, listDocumentsToRenew
src/lib/convex/violations.ts                  → mutation updateDisputeStatus
src/lib/convex/reminderTemplates.ts           → NOUVEAU : templates paramétriques par alertType
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Étendre les seuils dans `compliance.ts`

```typescript
// src/lib/convex/compliance.ts
const THRESHOLDS = [
	{ days: 60, horizon: '60_DAYS' as const }, // NOUVEAU
	{ days: 30, horizon: '30_DAYS' as const },
	{ days: 7, horizon: '7_DAYS' as const }
];
```

La boucle existante (`for (const { days, horizon } of THRESHOLDS) { if (daysLeft <= days) {...; break;} }`) fonctionne sans autre modification — elle prend déjà le seuil le plus proche en premier grâce au `break`. Vérifier que l'ordre du tableau reste du plus large au plus court (60 → 30 → 7) pour que la logique de "premier seuil atteint" reste correcte.

### Étape 2 — Brancher `concierge_tasks` depuis `maybeCreateAlert`

```typescript
// src/lib/convex/compliance.ts — dans maybeCreateAlert, après ctx.runMutation(internal.compliance.createAlert, params)
const isUrgent = params.horizon === '7_DAYS' || params.horizon === 'EXPIRED';

await ctx.scheduler.runAfter(0, internal.concierge.tasks.upsertTaskFromSource, {
	organizationId: params.organizationId,
	sourceType: 'COMPLIANCE_ALERT',
	sourceId: `${params.entityId}:${params.alertType}`, // clé composite stable pour l'idempotence
	title: `${labelForAlertType(params.alertType)} — échéance ${params.horizon.replace('_', ' ')}`,
	description: `Expire le ${params.expiryDate}. ${isUrgent ? 'Action requise rapidement.' : 'À anticiper.'}`,
	dueDate: new Date(params.expiryDate).getTime(),
	isRegulatory: true
});
```

### Étape 3 — Templates de rappel paramétriques (`reminderTemplates.ts`)

Un premier jet ne nécessite pas d'appel LLM — un template avec variables suffit et évite la latence/coût d'un appel Claude pour un texte de 3 phrases :

```typescript
// src/lib/convex/reminderTemplates.ts
type AlertType =
	| 'INSURANCE_EXPIRING'
	| 'CT_EXPIRING'
	| 'LICENSE_EXPIRING'
	| 'REGISTRATION_EXPIRING';

const TEMPLATES: Record<AlertType, (label: string, expiryDate: string) => string> = {
	INSURANCE_EXPIRING: (label, date) =>
		`Bonjour,\n\nL'assurance de ${label} arrive à échéance le ${date}. Votre concierge Mycelium peut s'occuper du renouvellement ou comparer les offres si vous le souhaitez — répondez simplement à ce message.\n\nBien à vous,\nVotre concierge Mycelium`,
	CT_EXPIRING: (label, date) =>
		`Bonjour,\n\nLe contrôle technique de ${label} expire le ${date}. Souhaitez-vous que nous planifiions le rendez-vous avec un centre partenaire ?\n\nBien à vous,\nVotre concierge Mycelium`,
	LICENSE_EXPIRING: (label, date) =>
		`Bonjour,\n\nLe permis de conduire concerné expire le ${date}. Merci de transmettre le nouveau document dès son renouvellement pour éviter toute interruption de conduite.\n\nBien à vous,\nVotre concierge Mycelium`,
	REGISTRATION_EXPIRING: (label, date) =>
		`Bonjour,\n\nLa validité d'immatriculation de ${label} arrive à échéance le ${date}. Votre concierge reste disponible pour toute question.\n\nBien à vous,\nVotre concierge Mycelium`
};

export function generateReminderText(
	alertType: AlertType,
	entityLabel: string,
	expiryDate: string
): string {
	return TEMPLATES[alertType](entityLabel, expiryDate);
}
```

### Étape 4 — Nouveaux tools sur l'agent Compliance (`agents/compliance.ts`)

```typescript
// Ajouter à la liste des tools existants (getFullComplianceDashboard, etc.)
{
  name: 'generateReminderDraft',
  description: 'Génère un brouillon de message de rappel client pour une alerte compliance donnée. Ne l\'envoie JAMAIS — retourne uniquement le texte pour validation humaine.',
  input_schema: {
    type: 'object',
    properties: {
      alertId: { type: 'string' }
    },
    required: ['alertId']
  }
},
{
  name: 'listDocumentsToRenew',
  description: 'Liste tous les documents à renouveler pour un véhicule donné (assurance, CT, immatriculation), toutes échéances confondues.',
  input_schema: {
    type: 'object',
    properties: {
      vehicleId: { type: 'string' }
    },
    required: ['vehicleId']
  }
}
```

Handler côté `handleToolCall` : `generateReminderDraft` charge l'alerte via `ctx.db.get`, appelle `generateReminderText(...)`, retourne le texte brut — aucune action d'envoi. `listDocumentsToRenew` interroge `complianceAlerts` filtré par `entityId = vehicleId` et `resolvedAt = undefined`.

### Étape 5 — Suivi de contestation (`violations.ts`)

```typescript
export const updateDisputeStatus = authedMutation({
	args: {
		violationId: v.id('trafficViolations'),
		disputeStatus: v.union(
			v.literal('NONE'),
			v.literal('CONTESTED'),
			v.literal('WON'),
			v.literal('LOST')
		)
	},
	handler: async (ctx, args) => {
		const { organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId);
		const violation = await ctx.db.get(args.violationId);
		if (!violation || violation.organizationId !== organizationId) {
			throw new ConvexError('Violation introuvable');
		}
		await ctx.db.patch(args.violationId, { disputeStatus: args.disputeStatus });
	}
});
```

---

## ✅ Critères d'acceptation

- [ ] Une échéance à 55 jours déclenche une alerte `60_DAYS` (et pas encore `30_DAYS`)
- [ ] Une alerte `60_DAYS` non résolue ne génère pas de doublon si elle repasse en `30_DAYS` puis `7_DAYS` — c'est la même entité de suivi mise à jour, pas une nouvelle ligne `complianceAlerts` par palier (vérifier que le dédoublonnage existant par `(entityId, alertType, horizon)` gère bien la transition : chaque horizon a sa propre clé, donc 3 alertes distinctes sont attendues et c'est correct — mais une seule tâche `concierge_tasks` doit rester ouverte grâce à l'idempotence de P26 sur `sourceId` composite)
- [ ] Chaque alerte compliance crée/maj une tâche dans `concierge_tasks` avec `isRegulatory: true`
- [ ] `generateReminderDraft` retourne un texte cohérent sans jamais déclencher d'envoi
- [ ] `updateDisputeStatus` restreint à `ORG_ADMIN` de l'organisation concernée

---

## 🚫 NE PAS FAIRE

- Ne pas appeler Claude pour générer les brouillons de rappel dans ce prompt — les templates paramétriques suffisent (garder la porte ouverte à un futur prompt qui personnalise via LLM si le besoin se confirme, mais ne pas le faire par défaut ici)
- Ne pas envoyer automatiquement le brouillon généré au client — validation humaine obligatoire à chaque fois
- Ne pas supprimer ou renommer les horizons `30_DAYS`/`7_DAYS`/`EXPIRED` existants — ajout pur, aucune migration destructive
- Ne pas coupler `disputeStatus` à une automatisation d'envoi de recours — ce champ est un suivi manuel pour l'instant, le processus de contestation reste humain (cf. `/docs/ROADMAP-CONCIERGE.md` section 9.2)
