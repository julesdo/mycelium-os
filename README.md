
---

```markdown
# Mycelium Fleet OS 🍄

> **Le Fleet Operating System qui réconcilie l'expérience salarié et l'automatisation financière CFO/RH.**

Mycelium est une plateforme SaaS B2B "AI-native" conçue pour les PME et ETI (50 à 500 salariés). Elle remplace les fichiers Excel et les boucles WhatsApp par un système opérationnel unique. Les salariés réservent des véhicules en langage naturel, et les gestionnaires de flotte pilotent leurs indicateurs via des agents IA spécialisés. 

**Pragmatique & focus logiciel :** Pas de télématique hardware, pas de boîtiers OBD, pas d'app mobile native. Uniquement de l'UX haute densité et de l'automatisation de workflows.

---

## 🛠 Stack Technique

Une stack moderne, pensée pour shipper vite avec une forte exigence sur le temps réel et le typage bout en bout.

* **Frontend :** SvelteKit 2.x + Svelte 5 (Runes)
* **Backend & BDD :** Convex (Serverless, réactivité temps réel native)
* **Styling :** Tailwind CSS v4 + Mycelium UI (Composants custom type shadcn, design system inspiré de Linear/Palantir)
* **Intelligence Artificielle :** Claude API (Modèle Sonnet, Prompt Caching `ephemeral`, SSE)
* **Authentification :** Better Auth (intégré via Convex)
* **Emails & Stockage :** Resend (`@convex-dev/resend`) + Convex Storage
* **Package Manager :** Bun
* **Tests :** Playwright (E2E) + Vitest (Unit)
* **Déploiement :** Cloudflare Workers

---

## 🧠 Architecture AI-Native

L'IA n'est pas un gadget "saupoudré" sur l'interface, c'est le moteur opérationnel de Mycelium. Le système repose sur 6 agents spécialisés avec des rôles, des audiences et des permissions stricts :

1. **Concierge (Salarié) :** Implémenté via une `httpAction` SSE. Boucle agentique (max 10 itérations) appelant 4 outils internes Convex (`searchVehicles`, `createReservation`, etc.). Gère les réservations en langage naturel avec un prompt strict anti-hallucination.
2. **Assistant Gestionnaire (CFO/RH) :** Interface analytique. 6 outils en *read-only* pour interroger la base Convex (taux d'utilisation, ventilation des coûts). Rendu Markdown structuré en temps réel.
3. **Optimiseur (Background) :** Cron hebdomadaire analysant 90 jours de données pour émettre des recommandations actionnables chiffrées.
4. **Compliance Officer :** Surveille et calcule la conformité (BiK UK, CSRD Nordiques, TVS France).
5. **Négociateur de coûts :** Identifie proactivement les opportunités d'économies (ex: transition thermique vers électrique).
6. **Coach conducteurs :** Profilage et prévention des risques basés sur l'historique des réservations et sinistres.

---

## 🏗 Principes Fondamentaux de la Codebase

* **Multi-tenant strict :** Chaque organisation est isolée par son `organizationId`. Aucune query Convex ne retourne de données hors scope. Chaque mutation valide l'appartenance de l'utilisateur.
* **i18n by design :** Les devises, unités (km/mi), fuseaux horaires et règles fiscales ne sont jamais hardcodés. Ils sont dérivés dynamiquement de l'entité `organization`.
* **Zero "AI-Slop" :** L'IA est invisible. Pas de badges "Powered by AI", pas d'écrans de chargement magiques. Les données affichées sont déterministes. Les estimations générées par l'IA sont explicitement isolées.
* **API First :** Une API publique (`/api/v1/*`) sécurisée par clés HMAC SHA-256 et webhooks avec backoff exponentiel pour l'intégration comptable (Xero, QuickBooks, Odoo).

---

## 🚀 Démarrage Rapide

### 1. Prérequis
* [Bun](https://bun.sh/) installé sur votre machine.
* Un compte [Convex](https://convex.dev/) actif.
* Une clé API Anthropic (Claude).

### 2. Installation
```bash
# Cloner le repo
git clone [https://github.com/votre-orga/mycelium-fleet-os.git](https://github.com/votre-orga/mycelium-fleet-os.git)
cd mycelium-fleet-os

# Installer les dépendances
bun install

```

### 3. Variables d'environnement

Copiez le fichier `.env.example` vers `.env` et `.env.local` et renseignez vos clés :

```env
# SvelteKit / Frontend
VITE_CONVEX_URL="[https://votre-projet-convex.convex.cloud](https://votre-projet-convex.convex.cloud)"

# Convex / Backend
CONVEX_DEPLOYMENT="dev:votre-projet-convex"
CLAUDE_API_KEY="sk-ant-api..."
RESEND_API_KEY="re_..."

```

### 4. Lancement de l'environnement de dev

Démarrez simultanément le serveur de développement SvelteKit et le synchroniseur Convex :

```bash
# Terminal 1 : Backend Convex
bunx convex dev

# Terminal 2 : Frontend SvelteKit
bun run dev

```

L'application sera accessible sur `http://localhost:5173`.

---

## 📁 Structure du Projet

```text
├── src/
│   ├── lib/
│   │   ├── components/    # Composants UI (Mycelium UI, layout, formulaires)
│   │   ├── utils/         # Helpers (formatting, i18n, calculs IK)
│   │   └── stores/        # Svelte 5 runes & context states
│   ├── routes/            # Pages SvelteKit (app/, admin/, api/)
│   └── app.html
├── convex/
│   ├── schema.ts          # Définition de la BDD (véhicules, résas, tenants...)
│   ├── agents/            # Logique IA, prompts et définitions des outils (Claude)
│   ├── http.ts            # Endpoints HTTP (SSE pour l'IA, Webhooks Paddle)
│   ├── crons.ts           # Tâches planifiées (Optimiseur, expirations permis)
│   └── actions/           # Logique métier lourde (import CSV, API externes)
├── docs/                  # Spécifications produit & architecture
└── tests/                 # E2E (Playwright)

```

---

## 🌍 Distribution & Connecteurs Comptables

Mycelium est conçu pour s'intégrer directement là où les CFO travaillent. Les connecteurs de facturation et de comptabilité se trouvent dans `src/lib/integrations/` et s'appuient sur une interface agnostique `AccountingConnector`.

* Actifs : Odoo Community, Pennylane.
* En cours : Xero, QuickBooks (UK & Nordics priorisés).

```

```