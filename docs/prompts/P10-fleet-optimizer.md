---
priority: 10
feature: Agent Optimiseur de flotte — Insights proactifs hebdomadaires (background)
sprint: S8 (V2)
version: V2 — Indispensable au DAF
effort: 4 jours
depends_on: P07 (Agent Gestionnaire, partage les outils), P08 (coûts), P09 (maintenance)
blocks: —
model_recommended: claude-sonnet-4-6
pricing_tier: Business (990€/mois) et Enterprise
---

# P10 — Agent Optimiseur de flotte (background)

## 🎯 Mission
L'Optimiseur tourne en arrière-plan chaque semaine, analyse l'ensemble de la flotte et génère des "Mycelium Insights" : recommandations proactives d'optimisation envoyées par email au DAF. C'est ce qui justifie de garder l'abonnement même quand le produit "marche tout seul" — il identifie de l'argent à économiser sans que personne ne le demande.

**Exemple de sortie :**
> "Votre Peugeot 308 (XX-XXX-XX) est utilisée à 8% sur les 90 derniers jours. Économie estimée si mise en retrait : 4 200 €/an (leasing + assurance). [Voir le véhicule]"

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Tables `vehicles`, `reservations`, `costs`, `maintenanceRecords` complètes avec données
- Pattern Convex action + Claude API (P03, P07)
- Infrastructure email Resend (P06)
- Cron infrastructure dans `crons.ts`

**Ce qui manque :**
- Convex action `runFleetOptimizer`
- Cron hebdomadaire (lundi 8h)
- Logique d'analyse : utilisation, coûts, anomalies
- Email de rapport hebdomadaire HTML
- Stockage des recommandations générées (pour éviter les doublons)

---

## 🔒 Contraintes absolues

1. **Background only** : cet agent n'a pas d'interface chat. Il tourne en cron et envoie des emails.
2. **Pas d'actions automatiques** : l'agent ne modifie rien. Il recommande, le DAF décide.
3. **Isolation stricte** : chaque org reçoit uniquement ses propres insights. Jamais de données cross-orgs.
4. **Rate limiting** : max 1 rapport Optimizer par org par semaine. Vérifier avant de générer.
5. **Coût API** : utiliser `claude-sonnet-4-6` (pas Opus). Prévoir max 4000 tokens de sortie par rapport.
6. **Prompt caching** : mettre le system prompt en cache (header `cache_control: ephemeral`) pour réduire les coûts.

---

## 📊 Architecture de l'Optimiseur

### Flow d'exécution (chaque lundi 8h UTC)

```
1. Cron déclenche → internal action runFleetOptimizerForAllOrgs
2. Pour chaque org active :
   a. Vérifier que le rapport n'a pas déjà été envoyé cette semaine
   b. Agréger les données : utilisation, coûts, maintenance
   c. Appeler Claude Sonnet avec les données + system prompt d'analyse
   d. Parser les recommandations JSON structurées
   e. Envoyer l'email HTML au(x) ORG_ADMIN(s)
   f. Persister les recommandations générées
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/optimizer.ts              → action + logique + email
src/lib/convex/crons.ts                  → ajouter weekly optimizer
src/lib/convex/schema.ts                 → ajouter table optimizerReports (si pas existante)
```

### Nouvelle table `optimizerReports` à ajouter au schema

```typescript
optimizerReports: defineTable({
  organizationId: v.id('organizations'),
  weekOf: v.string(),        // "2026-06-09" (lundi de la semaine)
  recommendations: v.array(v.object({
    type: v.string(),         // 'underutilized_vehicle', 'cost_anomaly', 'maintenance_overdue', etc.
    vehicleId: v.optional(v.id('vehicles')),
    title: v.string(),
    description: v.string(),
    estimatedSaving: v.optional(v.number()),  // euros/an
    priority: v.union(v.literal('high'), v.literal('medium'), v.literal('low'))
  })),
  emailSentAt: v.optional(v.number()),
  createdAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_org_and_week', ['organizationId', 'weekOf'])
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Collecte des données pour une organisation

```typescript
// src/lib/convex/optimizer.ts

async function collectOrgFleetData(ctx: ActionCtx, organizationId: Id<'organizations'>) {
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  
  const [vehicles, reservations, costs, maintenance] = await Promise.all([
    ctx.runQuery(internal.vehicles.listVehiclesInternal, { organizationId }),
    ctx.runQuery(internal.reservations.listForOptimizer, { organizationId, since: ninetyDaysAgo }),
    ctx.runQuery(internal.costs.listForOptimizer, { organizationId, since: ninetyDaysAgo }),
    ctx.runQuery(internal.maintenance.listForOptimizer, { organizationId })
  ]);
  
  // Calculer le taux d'utilisation par véhicule
  const utilizationByVehicle = vehicles.map(vehicle => {
    const vehicleReservations = reservations.filter(r =>
      r.vehicleId === vehicle._id && r.status !== 'CANCELLED'
    );
    const totalDaysBooked = vehicleReservations.reduce((sum, r) => {
      return sum + (r.endDate - r.startDate) / (24 * 60 * 60 * 1000);
    }, 0);
    const utilizationRate = totalDaysBooked / 90; // sur 90 jours
    
    const vehicleCosts = costs.filter(c => c.vehicleId === vehicle._id);
    const totalCost = vehicleCosts.reduce((sum, c) => sum + c.amount, 0);
    
    return {
      vehicleId: vehicle._id,
      label: `${vehicle.brand} ${vehicle.model} (${vehicle.registration})`,
      utilizationRate: Math.round(utilizationRate * 100),
      totalCost90Days: totalCost,
      reservationCount: vehicleReservations.length,
      status: vehicle.status,
      leaseEndDate: vehicle.leaseEndDate
    };
  });
  
  return { utilizationByVehicle, totalCosts: costs, maintenanceStatus: maintenance };
}
```

### Étape 2 — Appel Claude Sonnet pour l'analyse

```typescript
const OPTIMIZER_SYSTEM_PROMPT = `Tu es un analyste expert en optimisation de flotte d'entreprise.
Tu analyses les données d'utilisation, de coûts et de maintenance pour identifier des opportunités d'économie.

## Format de réponse OBLIGATOIRE
Réponds UNIQUEMENT avec un JSON valide de ce format :
{
  "summary": "Résumé en 1-2 phrases de l'état général de la flotte",
  "recommendations": [
    {
      "type": "underutilized_vehicle | cost_anomaly | maintenance_overdue | lease_renewal | fleet_right_sizing",
      "vehicleId": "string ou null",
      "title": "Titre court (max 80 chars)",
      "description": "Explication détaillée avec chiffres précis",
      "estimatedSaving": 4200,
      "priority": "high | medium | low",
      "actionLabel": "Texte du bouton d'action (max 30 chars)"
    }
  ]
}

## Règles
- Maximum 5 recommandations par rapport
- Citer les chiffres exacts issus des données
- Ne pas inventer d'économies — calculer à partir des coûts réels
- Pour un véhicule sous-utilisé (<20%) : estimatedSaving = coût leasing annuel + assurance estimée
- Toujours en français`;

export const runFleetOptimizerForOrg = internalAction({
  args: { organizationId: v.id('organizations') },
  handler: async (ctx, { organizationId }) => {
    // 1. Vérifier doublon hebdomadaire
    const weekOf = getWeekStart(); // "2026-06-09"
    const existing = await ctx.runQuery(internal.optimizer.getReportForWeek, { organizationId, weekOf });
    if (existing) return; // Déjà généré cette semaine
    
    // 2. Collecter les données
    const fleetData = await collectOrgFleetData(ctx, organizationId);
    
    // 3. Appel Claude avec prompt caching
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: [
        {
          type: 'text',
          text: OPTIMIZER_SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' } // Cache le system prompt
        }
      ],
      messages: [{
        role: 'user',
        content: `Analyse cette flotte et génère les recommandations d'optimisation.\n\n${JSON.stringify(fleetData, null, 2)}`
      }]
    });
    
    // 4. Parser la réponse JSON
    const content = response.content[0];
    if (content.type !== 'text') return;
    
    let analysis: { summary: string; recommendations: Recommendation[] };
    try {
      analysis = JSON.parse(content.text);
    } catch {
      // Log l'erreur mais ne pas bloquer
      return;
    }
    
    // 5. Persister le rapport
    const reportId = await ctx.runMutation(internal.optimizer.saveReport, {
      organizationId,
      weekOf,
      recommendations: analysis.recommendations
    });
    
    // 6. Envoyer l'email aux ORG_ADMIN
    await ctx.runAction(internal.optimizer.sendOptimizerEmail, {
      organizationId,
      summary: analysis.summary,
      recommendations: analysis.recommendations,
      reportId
    });
  }
});
```

### Étape 3 — Email hebdomadaire HTML

```typescript
export const sendOptimizerEmail = internalAction({
  args: {
    organizationId: v.id('organizations'),
    summary: v.string(),
    recommendations: v.array(v.any()),
    reportId: v.id('optimizerReports')
  },
  handler: async (ctx, { organizationId, summary, recommendations }) => {
    // Récupérer les admins de l'org
    const admins = await ctx.runQuery(internal.organizations.getOrgAdmins, { organizationId });
    
    const highPriority = recommendations.filter(r => r.priority === 'high');
    const mediumPriority = recommendations.filter(r => r.priority === 'medium');
    
    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #0f0f0f; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
    <h1 style="color: #f5e642; margin: 0; font-size: 20px;">🌿 Mycelium Insights</h1>
    <p style="color: #888; margin: 8px 0 0;">Rapport hebdomadaire flotte — ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
  </div>
  
  <p style="color: #333; font-size: 16px;">${summary}</p>
  
  ${highPriority.length > 0 ? `
  <h2 style="color: #dc2626; font-size: 16px;">⚠️ Actions prioritaires</h2>
  ${highPriority.map(r => renderRecommendation(r)).join('')}
  ` : ''}
  
  ${mediumPriority.length > 0 ? `
  <h2 style="color: #d97706; font-size: 16px;">💡 Opportunités d'optimisation</h2>
  ${mediumPriority.map(r => renderRecommendation(r)).join('')}
  ` : ''}
  
  <p style="color: #888; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
    Ces insights sont générés automatiquement par Mycelium Fleet OS.<br>
    <a href="${process.env.APP_URL}/admin/dashboard">Voir le tableau de bord complet</a>
  </p>
</body>
</html>`;
    
    // Envoyer à chaque admin
    for (const admin of admins) {
      if (!admin.email) continue;
      await resend.sendEmail(ctx, {
        from: 'Mycelium Insights <insights@mycelium-fleet.com>',
        to: admin.email,
        subject: `Mycelium Insights — ${highPriority.length} action(s) prioritaire(s) cette semaine`,
        html
      });
    }
  }
});

function renderRecommendation(r: Recommendation): string {
  const savingText = r.estimatedSaving
    ? `<span style="color: #16a34a; font-weight: bold;">Économie estimée : ${r.estimatedSaving.toLocaleString('fr-FR')} €/an</span>`
    : '';
  
  return `
    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <h3 style="margin: 0 0 8px; font-size: 15px;">${r.title}</h3>
      <p style="color: #555; margin: 0 0 8px; font-size: 14px;">${r.description}</p>
      ${savingText}
    </div>`;
}
```

### Étape 4 — Cron dans `crons.ts`

```typescript
// Lundi à 8h UTC (9h ou 10h Paris selon saison)
crons.weekly('fleet-optimizer', { dayOfWeek: 'monday', hourUTC: 8, minuteUTC: 0 },
  internal.optimizer.runFleetOptimizerForAllOrgs
);
```

---

## ✅ Critères d'acceptation

- [ ] Cron tourne chaque lundi matin sans erreur
- [ ] Chaque org active reçoit un email avec 3-5 recommandations
- [ ] Pas de doublon (max 1 rapport par org par semaine)
- [ ] Les économies estimées sont calculées à partir des coûts réels, pas inventées
- [ ] Email HTML responsive et lisible sur mobile
- [ ] L'agent ne modifie aucune donnée (read-only strict)

---

## 🚫 NE PAS FAIRE

- Ne pas envoyer un email sans données (si l'org n'a pas de véhicules ou de réservations → skip)
- Ne pas utiliser `claude-opus-4-8` (trop coûteux pour des rapports automatiques)
- Ne pas oublier le prompt caching (`cache_control: ephemeral`) pour réduire les coûts Anthropic
- Ne pas générer des économies fictives — uniquement calculées depuis les données réelles
- Ne pas exposer des données d'une org dans le rapport d'une autre org
- Ne pas bloquer le cron si une org échoue — utiliser try/catch par org et continuer

---

## 💡 Types de recommandations et calcul des économies

```typescript
type RecommendationType =
  | 'underutilized_vehicle'   // Taux < 20%, économie = coût leasing + assurance/an
  | 'cost_anomaly'            // Dépense anormalement élevée vs moyenne
  | 'maintenance_overdue'     // Entretien en retard → risque de panne coûteuse
  | 'lease_renewal'           // Leasing expirant dans 90j → renégocier maintenant
  | 'fleet_right_sizing'      // Flotte surdimensionnée vs utilisation réelle
  | 'fuel_efficiency'         // Consommation carburant élevée vs même modèle

// Calcul économie sous-utilisation :
// estimatedSaving = (leasingMensuel × 12) + (assuranceAnnuelle estimée à 1200€ par défaut)
```
