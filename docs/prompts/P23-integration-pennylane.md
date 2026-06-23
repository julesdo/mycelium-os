---
priority: 23
feature: Intégration comptable Pennylane — couche d'abstraction AccountingIntegration + connecteur de référence
sprint: S12 (V1.5) — AXE DISTRIBUTION PRIORITAIRE
version: V1.5 — Premiers payants (canal d'acquisition DNVB)
effort: 5 jours
depends_on: P08 (coûts flotte), P15 (notes de frais IK), P01 (véhicules)
blocks: P24 (Sage / EBP / Odoo / API publique réutilisent l'abstraction définie ici)
model_recommended: —
pricing_tier: Pro (590€/mois) — la sync compta justifie le palier ; argument de vente majeur
strategy_ref: /docs/specs/distribution-integrations-strategy.md
---

# P23 — Intégration comptable Pennylane (connecteur de référence)

## 🎯 Mission

Construire **la couche d'abstraction `AccountingIntegration`** (provider-agnostic) **et son premier connecteur, Pennylane**. Ce n'est pas qu'une feature : c'est notre **canal de distribution DNVB** (cf. `/docs/specs/distribution-integrations-strategy.md`). On se place là où le DAF passe déjà 2h/semaine.

Le connecteur fait **3 choses** :
1. **Push coûts flotte → Pennylane** : chaque coût Mycelium (leasing, carburant, entretien, assurance, notes de frais IK) remonte automatiquement avec la bonne catégorie comptable, le bon axe analytique et la bonne TVA. **Zéro double saisie.**
2. **Export rapport flotte → Pennylane** : le récap mensuel (TCO/véhicule, coûts/catégorie) s'exporte dans la structure Pennylane.
3. **Sync entrante** : statut de paiement des factures + plan comptable/analytique de l'org remontent dans Mycelium.

**Exemple de valeur :**
> Le DAF connecte Pennylane en OAuth depuis `/admin/settings/integrations`. Il saisit un loyer de leasing de 480 € sur le Kangoo AB-123 dans Mycelium. 30 secondes plus tard, l'écriture apparaît dans Pennylane : compte `6132 — Locations`, axe analytique `Flotte / AB-123`, TVA 20 %. Il n'a rien re-saisi. En fin de mois, son rapport flotte est déjà dans Pennylane pour son expert-comptable.

> ⚠️ **Cette implémentation définit le contrat que P24 réutilise.** Soigner l'abstraction : tout ce qui est spécifique à Pennylane vit dans `connectors/pennylane.ts`, tout le reste est générique.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `costs` (P08) : `{ organizationId, vehicleId?, category (9 enum), amount TTC, vatAmount?, date, description, invoiceUrl?, source: MANUAL|IMPORT|API, createdBy, createdAt }`.
- Table `mileageExpenses` (P15) : notes de frais IK avec `status` (DRAFT→…→PAID), `calculatedAmount`.
- Table `vehicles` (P01) : `{ registration, brand, model, purchaseDate?, leaseEndDate?, … }`.
- Pattern Convex `actions` pour appels externes, `crons.ts` pour le planifié, Convex Storage pour les fichiers.
- Routes i18n sous `src/routes/[[lang]]/`, helpers auth `getUserOrg` / `requireOrgAdmin`.

**Ce qui manque :**
- Couche d'abstraction `AccountingConnector` (port commun aux providers).
- Tables `accountingIntegrations` + `accountingSyncLogs` + `accountingCategoryMappings`.
- OAuth Pennylane (par organisation, pas par user) + refresh token.
- Connecteur `connectors/pennylane.ts` (push coût, push rapport, pull paiements/plan comptable).
- Cron de sync + déclenchement on-write (à la création d'un coût `source !== 'API'`).
- UI `/admin/settings/integrations` : connexion, état de sync, mapping des catégories.

---

## 🔒 Contraintes absolues

1. **Provider-agnostic d'abord.** La logique de sync ne connaît jamais « Pennylane » : elle parle au port `AccountingConnector`. Le mot `pennylane` n'apparaît **que** dans `connectors/pennylane.ts`, le mapping et l'OAuth callback.
2. **Multi-tenant strict.** Une `accountingIntegration` appartient à **une** organisation. Toujours `getUserOrg(ctx)` en premier. Jamais pousser les coûts d'une org vers le Pennylane d'une autre.
3. **Tokens chiffrés** (AES-256, même pattern que P14/P22). Jamais exposés côté client.
4. **Idempotence.** Chaque coût poussé stocke l'`externalId` Pennylane retourné. Re-sync ⇒ `update`, pas un doublon. Une note de frais déjà poussée n'est jamais re-créée.
5. **Jamais bloquer Mycelium si Pennylane tombe.** Sync en arrière-plan, file d'attente + retries. Une saisie de coût réussit toujours, même si la sync échoue ; l'erreur est loggée et réessayée.
6. **Seul ORG_ADMIN** connecte/déconnecte une intégration et édite les mappings.
7. **Direction du push.** Mycelium est la source de vérité des coûts flotte. Pennylane est la source de vérité du **statut de paiement**. Ne jamais écraser un montant Mycelium avec une valeur Pennylane.
8. **Respect rate limits** Pennylane : batcher les pushes, max ~1 lot/minute par org ; backoff exponentiel sur 429.

---

## 📊 Nouveau schéma Convex

```typescript
// src/lib/convex/schema.ts

accountingIntegrations: defineTable({
  organizationId: v.id('organizations'),
  provider: v.union(
    v.literal('pennylane'),
    v.literal('sage'),
    v.literal('ebp'),
    v.literal('quickbooks'),
    v.literal('odoo')
  ),
  status: v.union(
    v.literal('CONNECTED'),
    v.literal('DISCONNECTED'),
    v.literal('ERROR')
  ),
  // OAuth (chiffré AES-256)
  accessToken: v.string(),
  refreshToken: v.optional(v.string()),
  tokenExpiresAt: v.optional(v.number()),
  externalCompanyId: v.optional(v.string()), // id société côté provider
  // Drapeaux de périmètre de sync
  syncCosts: v.boolean(),
  syncVehicles: v.boolean(),    // véhicules → immobilisations
  syncExpenses: v.boolean(),    // notes de frais IK → compta
  webhookUrl: v.optional(v.string()),
  defaultVatRate: v.optional(v.number()), // ex 20
  lastSyncAt: v.optional(v.number()),
  lastSyncError: v.optional(v.string()),
  connectedBy: v.string(),      // userId ORG_ADMIN
  connectedAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_org_and_provider', ['organizationId', 'provider']),

// Mapping catégorie Mycelium → compte comptable / analytique du provider
accountingCategoryMappings: defineTable({
  organizationId: v.id('organizations'),
  integrationId: v.id('accountingIntegrations'),
  myceliumCategory: v.string(), // 'LEASING' | 'CARBURANT' | ... | 'IK'
  externalAccountCode: v.string(),   // ex '6132'
  externalAccountLabel: v.optional(v.string()),
  analyticAxis: v.optional(v.string()), // ex 'Flotte'
  vatRate: v.optional(v.number())
})
  .index('by_integration', ['integrationId'])
  .index('by_integration_and_category', ['integrationId', 'myceliumCategory']),

// Journal de sync + lien d'idempotence Mycelium ↔ externe
accountingSyncLogs: defineTable({
  organizationId: v.id('organizations'),
  integrationId: v.id('accountingIntegrations'),
  entityType: v.union(v.literal('COST'), v.literal('EXPENSE'), v.literal('REPORT')),
  entityId: v.string(),              // costId / expenseId / 'report:YYYY-MM'
  externalId: v.optional(v.string()),// id retourné par le provider (idempotence)
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
```

> Ajouter `'IK'` comme catégorie logique pour les notes de frais dans les mappings (les `mileageExpenses` n'ont pas de champ `category`).

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                              → MODIFIER : 3 tables ci-dessus
src/lib/convex/accounting/
  index.ts                                            → NOUVEAU : queries/mutations/actions génériques
  port.ts                                             → NOUVEAU : interface AccountingConnector (le contrat)
  sync-engine.ts                                      → NOUVEAU : enqueue/process/retry, idempotence
  mappings.ts                                         → NOUVEAU : mapping par défaut + CRUD mappings
  connectors/pennylane.ts                             → NOUVEAU : implémentation Pennylane du port
src/lib/convex/crons.ts                               → MODIFIER : cron sync + pull paiements
src/lib/convex/costs.ts                               → MODIFIER : enqueue push à createCost/updateCost
src/lib/convex/drivers.ts | expenses.ts (P15)         → MODIFIER : enqueue push à approveExpense

src/routes/[[lang]]/
  api/integrations/pennylane/callback/+server.ts      → NOUVEAU : OAuth callback
  admin/settings/integrations/+page.svelte            → NOUVEAU : page intégrations
  admin/settings/integrations/+page.ts                → NOUVEAU : guard ORG_ADMIN

src/lib/components/integrations/
  integration-card.svelte                             → carte provider (logo, statut, connect/disconnect)
  category-mapping-table.svelte                       → édition mapping catégorie → compte
  sync-status-badge.svelte                            → badge CONNECTED/ERROR + dernière sync
  sync-log-list.svelte                                → 20 dernières syncs (debug DAF)
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Le port (contrat commun, le cœur de l'abstraction)

```typescript
// src/lib/convex/accounting/port.ts

export interface ExternalAccountingRef {
  externalId: string;
}

export interface CostPushPayload {
  myceliumId: string;       // costId
  category: string;         // 'LEASING' | ... | 'IK'
  amountTtc: number;
  vatAmount?: number;
  date: number;
  label: string;
  vehicleRegistration?: string; // pour l'axe analytique
  externalId?: string;          // si déjà poussé → update
}

export interface PaymentStatusPull {
  externalId: string;
  isPaid: boolean;
  paidAt?: number;
}

/** Tout connecteur (Pennylane, Sage, EBP…) implémente exactement ce port. */
export interface AccountingConnector {
  readonly provider: string;
  pushCost(token: string, mapping: CategoryMapping, payload: CostPushPayload): Promise<ExternalAccountingRef>;
  pushMonthlyReport(token: string, month: string, csv: string): Promise<ExternalAccountingRef>;
  pullPaymentStatuses(token: string, externalIds: string[]): Promise<PaymentStatusPull[]>;
  refreshAccessToken?(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresAt: number }>;
}
```

> Règle d'or : `sync-engine.ts` ne fait jamais de `fetch`. Il appelle uniquement les méthodes du port. Les `fetch` vivent dans les connecteurs.

### Étape 2 — Connecteur Pennylane (le seul fichier qui connaît Pennylane)

```typescript
// src/lib/convex/accounting/connectors/pennylane.ts
import type { AccountingConnector, CostPushPayload, CategoryMapping } from '../port';

const PL_API = 'https://app.pennylane.com/api/external/v1';

export const pennylaneConnector: AccountingConnector = {
  provider: 'pennylane',

  async pushCost(token, mapping, payload) {
    // Idempotence : si externalId fourni → PUT (update), sinon POST (create)
    const method = payload.externalId ? 'PUT' : 'POST';
    const url = payload.externalId
      ? `${PL_API}/supplier_invoices/${payload.externalId}`
      : `${PL_API}/supplier_invoices`;

    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: new Date(payload.date).toISOString().slice(0, 10),
        label: payload.label,
        currency_amount: payload.amountTtc,
        ledger_account_code: mapping.externalAccountCode,   // ex '6132'
        analytic_code: mapping.analyticAxis,                // ex 'Flotte'
        vat_amount: payload.vatAmount ?? 0,
        external_reference: `mycelium:${payload.myceliumId}`, // traçabilité
      })
    });
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (!res.ok) throw new Error(`PENNYLANE_${res.status}:${await res.text()}`);
    const data = await res.json();
    return { externalId: String(data.id) };
  },

  async pushMonthlyReport(token, month, csv) {
    const res = await fetch(`${PL_API}/file_attachments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: toMultipart(`mycelium-flotte-${month}.csv`, csv)
    });
    if (!res.ok) throw new Error(`PENNYLANE_REPORT_${res.status}`);
    return { externalId: String((await res.json()).id) };
  },

  async pullPaymentStatuses(token, externalIds) {
    const out = [];
    for (const id of externalIds) {
      const res = await fetch(`${PL_API}/supplier_invoices/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) continue;
      const inv = await res.json();
      out.push({ externalId: id, isPaid: inv.status === 'paid', paidAt: inv.paid_at ? Date.parse(inv.paid_at) : undefined });
    }
    return out;
  },

  async refreshAccessToken(refreshToken) {
    const res = await fetch('https://app.pennylane.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.PENNYLANE_CLIENT_ID!,
        client_secret: process.env.PENNYLANE_CLIENT_SECRET!
      })
    });
    const t = await res.json();
    return { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: Date.now() + t.expires_in * 1000 };
  }
};

// Registre des connecteurs — c'est ici que P24 branchera Sage/EBP/Odoo
export const connectors: Record<string, AccountingConnector> = {
  pennylane: pennylaneConnector
};
```

> ⚠️ Endpoints/champs Pennylane à confirmer sur leur doc API au moment du dev (`supplier_invoices`, `analytic_code`). Garder le mapping de champs **isolé dans ce fichier** pour ne corriger qu'un endroit.

### Étape 3 — Moteur de sync générique (idempotent, avec retries)

```typescript
// src/lib/convex/accounting/sync-engine.ts
import { internalAction } from '../_generated/server';
import { connectors } from './connectors/pennylane';

export const enqueueCostPush = internalMutation({ /* crée un accountingSyncLogs PENDING (ou réutilise l'existant pour update) */ });

export const processSyncQueue = internalAction({
  args: {},
  handler: async (ctx) => {
    const integrations = await ctx.runQuery(internal.accounting.listConnectedIntegrations, {});
    for (const integ of integrations) {
      const connector = connectors[integ.provider];
      if (!connector) continue; // provider pas encore implémenté → ignorer
      const token = await getValidToken(ctx, integ, connector); // refresh si besoin
      if (!token) continue;

      const pending = await ctx.runQuery(internal.accounting.listPending, { integrationId: integ._id });
      for (const log of pending) {
        try {
          const ref = await pushEntity(connector, token, integ, log); // mappe entityType → méthode du port
          await ctx.runMutation(internal.accounting.markSynced, { logId: log._id, externalId: ref.externalId });
        } catch (e) {
          const msg = String(e);
          const retryable = msg.includes('RATE_LIMIT') || msg.includes('_5');
          await ctx.runMutation(internal.accounting.markFailed, {
            logId: log._id, error: msg, retryable, maxAttempts: 5
          });
        }
      }
    }
  }
});
```

- Déclenchement : `createCost`/`updateCost` (source `MANUAL`/`IMPORT`) **enqueue** un push ; `approveExpense` (P15) enqueue un push de la note de frais (catégorie logique `IK`). Le cron draine la file.
- **Ne jamais** enqueue pour `source === 'API'` (évite la boucle si un jour la compta pousse vers Mycelium).

### Étape 4 — OAuth callback Pennylane

```typescript
// src/routes/[[lang]]/api/integrations/pennylane/callback/+server.ts
export const GET: RequestHandler = async ({ url }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // { organizationId } signé/base64
  if (!code || !state) return new Response('Invalid OAuth', { status: 400 });
  const { organizationId } = JSON.parse(atob(state));

  const tokenRes = await fetch('https://app.pennylane.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${url.origin}/api/integrations/pennylane/callback`,
      client_id: PENNYLANE_CLIENT_ID,
      client_secret: PENNYLANE_CLIENT_SECRET
    })
  });
  const tokens = await tokenRes.json();
  if (!tokens.access_token) return new Response('OAuth failed', { status: 400 });

  await fetch(`${process.env.CONVEX_SITE_URL}/saveAccountingIntegration`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId, provider: 'pennylane', tokens })
  });

  return new Response(null, { status: 302, headers: { Location: '/admin/settings/integrations?connected=pennylane' } });
};
```

À la connexion : créer l'`accountingIntegration` + **semer les mappings par défaut** (cf. table ci-dessous) que le DAF pourra ajuster.

### Étape 5 — Mapping catégorie → compte (valeurs par défaut PCG)

```typescript
// src/lib/convex/accounting/mappings.ts
export const DEFAULT_FR_MAPPING: Record<string, { account: string; label: string }> = {
  LEASING:    { account: '6132', label: 'Locations mobilières (leasing)' },
  CARBURANT:  { account: '6061', label: 'Carburants' },
  ENTRETIEN:  { account: '6155', label: 'Entretien et réparations véhicules' },
  ASSURANCE:  { account: '6162', label: 'Assurance flotte' },
  TAXES:      { account: '6354', label: 'Taxes sur véhicules (TVS)' },
  SINISTRE:   { account: '6155', label: 'Réparations sinistres' },
  PARKING:    { account: '6251', label: 'Frais de stationnement' },
  TELEPEAGE:  { account: '6251', label: 'Péages' },
  AUTRE:      { account: '6068', label: 'Autres frais flotte' },
  IK:         { account: '6251', label: 'Indemnités kilométriques' }
};
```

### Étape 6 — UI `/admin/settings/integrations`

- Guard ORG_ADMIN (`+page.ts`), redirige `/app` sinon.
- Grille de `integration-card` : Pennylane en tête, statut (`sync-status-badge`), bouton **Connecter** (lance l'OAuth) ou **Déconnecter** + **Synchroniser maintenant**.
- Sous une intégration connectée : `category-mapping-table` (éditer compte/analytique/TVA par catégorie) + toggles `syncCosts`/`syncVehicles`/`syncExpenses` + `sync-log-list` (20 dernières syncs, statut, erreurs lisibles).
- Les autres providers (Sage, EBP, Odoo, QuickBooks) affichés en carte **« Bientôt disponible »** (préparé pour P24).

### Étape 7 — Crons

```typescript
// src/lib/convex/crons.ts
crons.interval('accounting-sync-queue', { minutes: 5 }, internal.accounting.processSyncQueue, {});
crons.interval('accounting-pull-payments', { hours: 6 }, internal.accounting.pullPaymentStatuses, {});
```

---

## ✅ Critères d'acceptation

- [ ] ORG_ADMIN connecte Pennylane via OAuth depuis `/admin/settings/integrations`.
- [ ] Un coût créé dans Mycelium apparaît dans Pennylane sous 5 min, bon compte/analytique/TVA.
- [ ] Re-synchroniser un coût modifié fait un **update** (pas de doublon) — vérifié via `externalId`.
- [ ] Une note de frais IK passée à `APPROVED` est poussée (catégorie `IK`).
- [ ] Le statut de paiement Pennylane redescend dans Mycelium (lecture seule, n'écrase aucun montant).
- [ ] Pennylane indisponible ⇒ la saisie réussit quand même, l'erreur est loggée et réessayée (≤5 tentatives, backoff).
- [ ] Le mot `pennylane` n'apparaît que dans `connectors/pennylane.ts`, l'OAuth callback et le mapping — le moteur de sync est provider-agnostic.
- [ ] Tokens chiffrés AES-256, jamais côté client.
- [ ] Mappings par défaut PCG semés à la connexion, éditables par le DAF.

---

## 🚫 NE PAS FAIRE

- Ne pas coder « Pennylane » en dur dans `sync-engine.ts` ni dans `costs.ts` — passer par le port. **L'abstraction est le livrable.**
- Ne pas appeler Pennylane depuis le navigateur — tout via Convex actions.
- Ne pas re-créer une écriture déjà poussée — toujours vérifier `accountingSyncLogs.externalId`.
- Ne pas écraser un montant Mycelium avec une donnée Pennylane (Mycelium = vérité des coûts).
- Ne pas bloquer la saisie de coût si la sync échoue.
- Ne pas pousser les coûts `source === 'API'` (anti-boucle).
- Ne pas transformer ça en produit marque blanche leaser — on reste Fleet OS PME (cf. scope strict `CLAUDE.md`).
- Ne pas dépasser le palier **Pro** : la sync compta est une feature Pro (590€), pas Starter.
