---
priority: 24
feature: Extension connecteurs comptables (Sage, EBP, Odoo) + API publique & Webhooks
sprint: S13 (V1.5→V2) — AXE DISTRIBUTION
version: V2 — Indispensable au DAF (multiplication des canaux)
effort: 6 jours (2j Sage + 2j EBP/Odoo + 2j API publique)
depends_on: P23 (couche d'abstraction AccountingConnector — OBLIGATOIRE)
blocks: connecteurs cabinets comptables (Tiime / MyUnisoft) — backlog
model_recommended: —
pricing_tier: Pro (590€/mois) connecteurs / Business (990€/mois) API publique
strategy_ref: /docs/specs/distribution-integrations-strategy.md
---

# P24 — Multiplier les canaux : Sage, EBP, Odoo + API publique

## 🎯 Mission

P23 a posé la couche d'abstraction `AccountingConnector` et le connecteur Pennylane. **P24 multiplie les canaux de distribution** en ajoutant des connecteurs qui réutilisent ce contrat, puis ouvre une **API publique + webhooks** pour que n'importe quel logiciel s'intègre sans qu'on construise chaque connecteur à la main.

Ordre dicté par la stratégie (`distribution-integrations-strategy.md`) :
1. **Sage** — PME établies (~700 000 entreprises FR).
2. **EBP** — artisans / PME traditionnelles (= niche BTP, ~600 000 clients).
3. **Module Odoo community** — open source, ~40 000 modules ; canal le plus scalable (la communauté distribue).
4. **API publique + Webhooks** — long terme, tout outil s'intègre seul.

> ⚠️ **Aucune logique de sync n'est réécrite.** Chaque connecteur implémente le port `AccountingConnector` de P23 et s'enregistre dans `connectors/`. Si tu dupliques le moteur de sync, c'est faux.

---

## 📍 État actuel (après P23)

**Existe :** `accounting/port.ts` (interface), `accounting/sync-engine.ts` (moteur générique idempotent), `accounting/connectors/pennylane.ts`, tables `accountingIntegrations` / `accountingCategoryMappings` / `accountingSyncLogs`, page `/admin/settings/integrations` avec cartes « Bientôt disponible » pour Sage/EBP/Odoo/QuickBooks.

**Manque :** connecteurs Sage/EBP/Odoo, leurs OAuth/auth respectifs, le module Odoo (paquet à publier sur leur store), l'API publique REST + webhooks sortants + table `apiKeys`.

---

## 🔒 Contraintes absolues

1. **Réutiliser le port P23.** Chaque nouveau connecteur = un fichier `connectors/<provider>.ts` qui exporte un objet conforme à `AccountingConnector`, ajouté au registre `connectors`. Rien d'autre ne change dans le moteur.
2. **Auth par provider** (le port l'abstrait) : Sage = OAuth2 Sage Business Cloud ; EBP = clé API / Open Line selon l'édition ; Odoo = JSON-RPC avec API key par instance. Le détail vit dans le connecteur, jamais dans le moteur.
3. **Mappings par défaut par provider** : les codes comptables PCG de P23 sont réutilisables, mais permettre un override par provider (plan comptable différent selon l'outil).
4. **API publique = clés scopées + multi-tenant strict.** Une `apiKey` appartient à une org, porte des scopes (`costs:read`, `costs:write`, `vehicles:read`…). Jamais de fuite cross-org.
5. **Webhooks signés** (HMAC SHA-256, header `X-Mycelium-Signature`) + retries avec backoff.
6. **Module Odoo** : code dans `/integrations/odoo-mycelium/` (paquet séparé, pas dans le bundle SvelteKit). Licence LGPL pour compatibilité store Odoo community.

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Connecteur Sage

```typescript
// src/lib/convex/accounting/connectors/sage.ts
import type { AccountingConnector } from '../port';
const SAGE_API = 'https://api.accounting.sage.com/v3.1';

export const sageConnector: AccountingConnector = {
  provider: 'sage',
  async pushCost(token, mapping, payload) {
    const res = await fetch(`${SAGE_API}/purchase_invoices`, {
      method: payload.externalId ? 'PUT' : 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        purchase_invoice: {
          date: new Date(payload.date).toISOString().slice(0, 10),
          reference: `mycelium:${payload.myceliumId}`,
          invoice_lines: [{
            ledger_account_id: mapping.externalAccountCode,
            total_amount: payload.amountTtc,
            tax_amount: payload.vatAmount ?? 0,
            description: payload.label,
            analytics_codes: mapping.analyticAxis ? [mapping.analyticAxis] : undefined
          }]
        }
      })
    });
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (!res.ok) throw new Error(`SAGE_${res.status}`);
    return { externalId: String((await res.json()).id) };
  },
  async pushMonthlyReport(/* … attachment Sage … */) { /* … */ },
  async pullPaymentStatuses(/* … */) { /* … */ },
  async refreshAccessToken(/* … OAuth2 Sage … */) { /* … */ }
};
```

Ajouter au registre :
```typescript
// connectors/index.ts (extraire le registre de pennylane.ts vers un index dédié)
import { pennylaneConnector } from './pennylane';
import { sageConnector } from './sage';
import { ebpConnector } from './ebp';
import { odooConnector } from './odoo';
export const connectors = {
  pennylane: pennylaneConnector,
  sage: sageConnector,
  ebp: ebpConnector,
  odoo: odooConnector
};
```

### Étape 2 — Connecteur EBP

Même contrat. EBP expose souvent une API locale/Open Line ou un connecteur cloud selon l'édition ; encapsuler le détail dans `connectors/ebp.ts`. Mapping par défaut identique (PCG), override possible. **Argument distribution** : EBP = base artisans/BTP, donc soigner les catégories `ENTRETIEN`, `CARBURANT`, `LEASING`.

### Étape 3 — OAuth/connexion par provider

Ajouter les callbacks manquants, calqués sur P23 :
```
src/routes/[[lang]]/api/integrations/sage/callback/+server.ts
src/routes/[[lang]]/api/integrations/ebp/callback/+server.ts   (ou flux clé API)
```
Activer les cartes provider dans `/admin/settings/integrations` (retirer « Bientôt disponible » au fur et à mesure).

### Étape 4 — Module Odoo community

```
integrations/odoo-mycelium/
  __manifest__.py          → nom, version, licence LGPL-3, dépendances (account, fleet)
  models/mycelium_sync.py  → modèle qui poll/recoit les coûts Mycelium via l'API publique (Étape 5)
  data/cron.xml            → cron Odoo qui importe les coûts Mycelium dans account.move
  views/                   → écran config (clé API Mycelium, mapping comptes)
  README.md                → install + publication sur apps.odoo.com
```
Le module Odoo **consomme l'API publique Mycelium** (Étape 5) — il ne se branche pas sur Convex directement. C'est ce qui le rend distribuable par la communauté.

### Étape 5 — API publique REST + Webhooks

```typescript
// schema.ts
apiKeys: defineTable({
  organizationId: v.id('organizations'),
  name: v.string(),
  hashedKey: v.string(),          // on ne stocke jamais la clé en clair
  prefix: v.string(),             // 'myc_live_xxxx' affiché pour identification
  scopes: v.array(v.string()),    // ['costs:read','costs:write','vehicles:read','expenses:read']
  lastUsedAt: v.optional(v.number()),
  createdBy: v.string(),
  createdAt: v.number(),
  revokedAt: v.optional(v.number())
}).index('by_org', ['organizationId']).index('by_prefix', ['prefix']),

webhookEndpoints: defineTable({
  organizationId: v.id('organizations'),
  url: v.string(),
  secret: v.string(),             // pour HMAC
  events: v.array(v.string()),    // ['cost.created','cost.updated','expense.approved','reservation.created']
  isActive: v.boolean(),
  createdAt: v.number()
}).index('by_org', ['organizationId']),
```

Routes publiques (auth par `Authorization: Bearer myc_live_…`, vérif scope + org) :
```
src/routes/[[lang]]/api/v1/costs/+server.ts          GET (list) / POST (create)
src/routes/[[lang]]/api/v1/costs/[id]/+server.ts     GET / PATCH
src/routes/[[lang]]/api/v1/vehicles/+server.ts       GET
src/routes/[[lang]]/api/v1/expenses/+server.ts       GET
src/routes/[[lang]]/api/v1/webhooks/+server.ts       GET / POST (gérer ses endpoints)
```

Émission webhook : à chaque `cost.created` / `expense.approved`, enqueue un POST signé HMAC vers les `webhookEndpoints` abonnés, avec retries (réutiliser la mécanique de file de P23).

UI : `/admin/settings/integrations` → onglet **« Développeurs / API »** (générer/révoquer clés, voir scopes, configurer webhooks, lien doc).

---

## ✅ Critères d'acceptation

- [ ] Sage et EBP connectables et fonctionnels (push coût + idempotence) **sans modifier `sync-engine.ts`**.
- [ ] Le registre `connectors` liste les 4 providers ; ajouter un provider = 1 fichier + 1 ligne.
- [ ] Module Odoo installable depuis un manifest LGPL, importe les coûts via l'API publique.
- [ ] API publique : clé scopée, multi-tenant étanche, `costs` CRUD + `vehicles`/`expenses` en lecture.
- [ ] Webhooks signés HMAC SHA-256, retries avec backoff, configurables par le DAF.
- [ ] Une clé révoquée est immédiatement refusée.

---

## 🚫 NE PAS FAIRE

- Ne pas dupliquer la logique de sync par provider — réutiliser le moteur P23.
- Ne pas mettre le module Odoo dans le bundle SvelteKit — paquet séparé sous `/integrations/`.
- Ne pas stocker les clés API en clair — hash + préfixe affichable seulement.
- Ne pas exposer d'endpoint public sans vérif scope **et** `organizationId`.
- Ne pas ouvrir d'endpoint d'écriture sur les véhicules/réservations en V2 (lecture seule hors coûts) tant que la sécurité n'est pas auditée.
- Ne pas négocier d'API leasers ni de procurement via cette API — hors scope (`CLAUDE.md`).
