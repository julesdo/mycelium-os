# Mycelium Fleet OS — Stratégie de distribution Global Day-1

> **Statut : pivot stratégique validé juin 2026.**
> Abandon de la distribution franco-française comme priorité #1.
> Cible : UK + pays nordiques. Distribution via Xero, QuickBooks, Odoo.
> Facturation internationale via Paddle (Merchant of Record).

---

## 1. La thèse en une phrase

**Mycelium est une DNVB B2B : le produit est le canal de distribution.**
Les intégrations avec les logiciels de gestion ne sont pas une feature technique — c'est **un canal d'acquisition déguisé en feature**. On se place exactement là où le CFO de PME passe déjà 2 heures par semaine, dans son workflow naturel.

Distribuer en France d'abord = se tirer une balle dans le pied : cycles de vente longs, maturité SaaS plus faible, marché adressable restreint. Le UK et les nordiques offrent des CFO qui achètent vite, sur carte bancaire, en ligne, sans appel commercial.

---

## 2. Carte des canaux — priorité UK/Nordiques

### Tier 1 — Canaux d'acquisition internationaux (à attaquer en premier)

| Logiciel | Base clients | Marché cible | Intégration | Priorité |
|---|---|---|---|---|
| **Xero** | ~4 M entreprises | **UK #1**, Australie, NZ, global | App Marketplace ouverte, API REST moderne, programme partenaires actif | **#1 — P25** |
| **QuickBooks** | ~7 M entreprises | **UK + USA + Canada**, global | Intuit App Store, QuickBooks Online API | **#2 — P25** |
| **Odoo Community** | Écosystème mondial | ETI industrielles, global | Module community (LGPL), distribué par la communauté | **#3 — P24** |

### Tier 2 — Canaux de niche à fort ROI

| Logiciel | Base clients | Marché | Note |
|---|---|---|---|
| **Fortnox** | ~500 000 PME | Suède (#1 nordique) | API moderne, marketplace active |
| **Visma** | Large | Nordiques (NO, SE, DK, FI) | Suite dominante nordique |
| **Freeagent** | PME UK | UK | Rachetée par NatWest — canal bancaire |

### Tier 3 — France (secondaire, après UK établi)

| Logiciel | Base FR | Priorité |
|---|---|---|
| Pennylane | ~250 000 PME | Maintenu (P23 livré), non priorisé |
| Sage France | ~700 000 | Backlog post-M12 |
| EBP | ~600 000 | Backlog post-M12 |

---

## 3. Ce que l'intégration fait concrètement (modèle commun)

Toute intégration Mycelium fait **3 choses** :

1. **Push coûts flotte → logiciel de gestion.** Chaque coût saisi dans Mycelium (leasing, fuel, maintenance, insurance, mileage claims) remonte automatiquement avec la bonne catégorie comptable, le bon analytique, la bonne TVA/Sales Tax. Zéro double saisie.
2. **Export du rapport flotte.** Le rapport mensuel Mycelium (TCO par véhicule, coûts par catégorie) s'exporte dans la structure du logiciel partenaire.
3. **Widget "Fleet" dans le dashboard partenaire** (si l'API le permet) : coût mensuel, alertes, prochains entretiens.

### Contrat d'interface (couche d'abstraction)

```typescript
type AccountingProvider = 'xero' | 'quickbooks' | 'odoo' | 'pennylane' | 'sage' | 'fortnox' | 'visma';

interface AccountingConnector {
  provider: AccountingProvider;
  pushCost(cost: FleetCost): Promise<ExternalRef>;
  pushExpense(expense: MileageExpense): Promise<ExternalRef>;
  pullPaymentStatus(ref: ExternalRef): Promise<PaymentStatus>;
  getChartOfAccounts(): Promise<AccountCategory[]>;
}
```

Chaque connecteur implémente le même port `AccountingConnector` — seul le mapping et l'auth changent. **On ne réécrit jamais la logique de sync par provider.**

---

## 4. Facturation internationale — Paddle comme Merchant of Record

**Problème :** vendre à un client UK, suédois ou américain sans Paddle = devoir s'enregistrer à la TVA dans chaque pays. Impossible en bootstrapping solo.

**Solution Paddle :**
- Paddle est le vendeur légal. Il facture le client final, collecte la TVA/Sales Tax/GST selon le pays.
- Mycelium reçoit le net (prix - fees Paddle - taxes).
- On n'a aucune déclaration fiscale étrangère à produire.
- La relation client (UI, support, branding) reste 100% Mycelium.

### Webhooks Paddle → Convex (à implémenter en P_PADDLE)

```
POST /api/webhooks/paddle
  subscription.created  → provisionner organizationId + seats + modules
  subscription.updated  → ajuster limites conducteurs + activer/désactiver modules
  subscription.cancelled → désactiver org + grace period 30 jours
  payment.succeeded      → renouveler accès
  payment.failed         → alerte + retry
```

---

## 5. Modules spécifiques aux marchés cibles

### Module BiK (Benefit-in-Kind) — Royaume-Uni

Le BiK est la taxe sur l'avantage en nature des véhicules de fonction en UK. C'est le levier fiscal #1 pour orienter les flottes UK vers l'électrique (BiK EV = 2% vs 37% thermique haut de gamme).

**Architecture value ladder :**
- **Essential / Professional** : affichage du BiK calculé par véhicule et par conducteur (HMRC rates à jour), pour information du CFO.
- **Business** : l'agent Optimiseur recommande des arbitrages de flotte basés sur l'économie BiK réelle + simulation TCO électrique vs thermique. Disclaimer légal standard ("à valider avec votre fiscaliste").

**Source des taux :** HMRC publie les taux annuels. Mise à jour via un fichier de configuration versionné (`bik-rates.ts`) — même pattern que `ik-rates.ts` pour l'URSSAF français.

### Module CSRD / Bilan carbone — Nordiques

Les pays nordiques ont une longueur d'avance sur le reporting ESG. C'est un argument de vente fort pour les ETI de 50-500 salariés soumises à la CSRD.

**Scope :**
- Scope 1 : émissions directes véhicules thermiques (combustion)
- Scope 2 : émissions indirectes véhicules électriques (mix électrique national)
- Scope 3 : production du carburant (+20% facteur ADEME / IEA selon pays)
- Rapport PDF conforme ESRS E1
- Recommandations IA de transition EV avec ROI carbone + financier

**Facteurs d'émission :** fichier `carbon-factors.ts` par pays (FR, UK, SE, NO, DK) avec source officielle (ADEME, IEA, DEFRA UK).

---

## 6. Indemnités kilométriques — Refactor P15

Abandon du calcul exclusif sur le barème URSSAF français. Remplacement par une **grille paramétrable par l'Admin** selon la catégorie de véhicule.

**Structure :**
```typescript
interface MileageRateConfig {
  organizationId: Id<'organizations'>;
  currency: 'EUR' | 'GBP' | 'SEK' | 'NOK' | 'DKK';
  distanceUnit: 'km' | 'mile';
  rates: {
    category: 'ELECTRIC' | 'HYBRID' | 'THERMAL' | 'UTILITY';
    ratePerUnit: number; // ex: 0.45 pour £0.45/mile UK
    label: string;       // ex: "HMRC Advisory Rate — EV"
  }[];
}
```

**Valeurs par défaut au provisioning :**
- UK : £0.45/mile (HMRC Advisory Rate EV), £0.25/mile (thermique)
- France : barème URSSAF 5 CV (valeur par défaut, modifiable)
- Nordiques : 2,50 SEK/km (Skatteverket Suède), 3,50 NOK/km (Skatteetaten)

---

## 7. Plan d'exécution 90 jours (post-pivot)

```
Sprint 1 — Fondations internationales
├── i18n abstraction complète : devise, timezone, locale dans `organization`
├── Abstraction distanceUnit (km ↔ mile) dans mileageExpenses
├── Refactor P15 : grille de taux paramétrables (abandon URSSAF hardcodé)
└── Landing page EN + pages pricing en GBP

Sprint 2 — Paddle + Xero
├── Endpoints webhooks Paddle (provisioning, seats, modules)
├── Connecteur Xero (P25) : OAuth 2.0 + push coûts + pull plan comptable
├── Listing Xero App Marketplace (viser 5 reviews)
└── Module BiK Essential (affichage taux HMRC)

Sprint 3 — QuickBooks + Nordiques
├── Connecteur QuickBooks Online (P25)
├── Module CSRD Scope 1-2-3 (nordiques)
├── Module BiK Business (recommandations IA Optimiseur)
├── Connecteurs Fortnox + Visma (si partenariats actifs)
└── Objectif : 5 premiers clients UK signés via Xero
```

---

## 8. Métriques de succès

- **M1** : i18n complète + grille IK paramétrables en prod
- **M2** : Paddle en prod + connecteur Xero listé + 3 clients UK en trial
- **M3** : QuickBooks en prod + module BiK Essential + 10 clients UK/Nordiques payants
- **Indicateur de fond** : % nouveaux clients venus des app stores Xero/QuickBooks (objectif > 50% à M6 de l'axe)
- **MRR cible M6** : £15 000 GBP/mois (≈ 20 clients Professional)

---

## 9. Ce qui ne change pas

- **Pennylane (P23)** : maintenu en prod, clients existants conservés, mais plus de développement actif ni de budget partnerships FR.
- **Odoo (P24)** : maintenu et accéléré — ouvre les ETI industrielles mondiales sans coût d'acquisition.
- **API publique + Webhooks (P24)** : maintenus — tout logiciel s'intègre sans connecteur dédié.
- **Multi-tenant strict** : isolation par `organizationId`, jamais de compromis.
