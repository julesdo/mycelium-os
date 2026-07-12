<div align="center">

<img src="static/logo.svg" alt="Mycelium Fleet OS" width="72" />

# Mycelium Fleet OS

**The Fleet Operating System for mid-market companies.**

Unified vehicle management, AI-powered reservations, and automated compliance — built for 50–500 employee organizations operating 15–150 vehicles. Global Day-1: UK, Nordics, France.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-orange?logo=svelte)](https://kit.svelte.dev/)
[![Convex](https://img.shields.io/badge/Convex-Backend-purple)](https://convex.dev/)
[![Claude AI](https://img.shields.io/badge/AI-Claude%20Sonnet%205-violet?logo=anthropic)](https://anthropic.com/)

</div>

---

## Overview

Mycelium Fleet OS replaces spreadsheets and fragmented tools with a unified operational platform. Employees book vehicles in natural language through an AI concierge. Fleet managers get automated insights, compliance monitoring, and real-time financial tracking. Mycelium's own concierge team handles demos and onboarding via a dedicated ops interface. Sales teams close deals with pipeline management, gamification, and a dedicated AI commercial agent.

**Seven specialized AI agents. Zero hardware. Full regulatory coverage from Day 1.**

| Dimension            | Detail                                                            |
| -------------------- | ----------------------------------------------------------------- |
| **Target market**    | UK (priority) · Nordics (SE, NO, DK, FI) · France                |
| **Customer profile** | SMEs and mid-market · 50–500 employees · 15–150 vehicles          |
| **Billing**          | Paddle (Merchant of Record) · Essential / Professional / Business |
| **Distribution**     | Xero App Marketplace · QuickBooks App Store · Odoo Community      |
| **Deployment**       | Cloudflare Workers · PWA · No native app, no IoT                  |

---

## User Spaces

Mycelium has four distinct user spaces with separate auth guards, layouts, and access control:

| Space | URL | Audience | Guard |
|-------|-----|----------|-------|
| **Employee App** | `/app/*` | Company employees | `ORG_MEMBER` (JWT org session) |
| **Admin Dashboard** | `/admin/*` | CFO, HR, fleet manager | `ORG_ADMIN` / `ORG_MANAGER` |
| **Concierge Ops** | `/concierge/*` | Mycelium internal concierge team | `staffRole = concierge` (admin JWT) |
| **Sales Space** | `/sales/*` | Mycelium sales reps | `staffRole = sales` (admin JWT) |

Plus public routes: `/` (marketing), `/onboarding/organization` (4-step wizard), `/join/[token]` (member invite).

---

## AI Agent Architecture

Seven purpose-built agents with strict role boundaries, tool sets, and audience separation. AI is invisible to end users — it operates as the operational layer, not a surface feature.

```
┌───────────────────────────────────────────────────────────────┐
│                      EMPLOYEE INTERFACE                       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Concierge Agent  ·  natural language reservations      │  │
│  │  SSE streaming · 10-step agentic loop · 4 tools         │  │
│  └─────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│                    ADMIN / CFO INTERFACE                      │
│  ┌──────────────────────┐  ┌────────────────────────────────┐ │
│  │  Manager Agent       │  │  Compliance Officer Agent      │ │
│  │  6 read-only tools   │  │  BiK UK · CSRD · TVS France    │ │
│  └──────────────────────┘  └────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│                    INTERNAL STAFF INTERFACES                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  Agent Commercial IA  ·  /sales space (staff only)     │   │
│  │  SSE streaming · 4 tools · pipeline + upsell signals   │   │
│  └────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
┌───────────────────────────────────────────────────────────────┐
│                      BACKGROUND AGENTS                        │
│  ┌───────────────┐  ┌────────────────┐  ┌─────────────────┐  │
│  │  Fleet        │  │  Cost          │  │  Driver         │  │
│  │  Optimizer    │  │  Negotiator    │  │  Coach          │  │
│  │  weekly cron  │  │  proactive     │  │  safety +       │  │
│  │  90-day data  │  │  savings       │  │  eco-driving    │  │
│  └───────────────┘  └────────────────┘  └─────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## Feature Map

### Employee App (`/app/*`)

| Feature | Description |
|---------|-------------|
| **Reservations** | 4-step booking wizard · conflict detection · NLP date parser via Concierge |
| **Concierge chat** | FAB (Cmd+K) · SSE streaming · vehicle_proposal and reservation_confirmed widgets |
| **Incidents** | 3-step wizard · 6 photos · 6 statuses · insurer email dispatch |
| **State of vehicle** | Pre/post inspection wizard (6 angles · damage map · recap) |
| **Profile** | Photo · personal info · driver license · categories |

### Admin Dashboard (`/admin/*`)

| Module | Key capabilities |
|--------|----------------|
| **Dashboard** | Real-time KPI cards · SVG usage chart · donut distribution · attention list · activity feed |
| **Fleet** | Full CRUD · CSV import (3-step) · status badges · vehicle detail pages |
| **Reservations** | Full calendar (week/day/month) · drag-to-create/move/resize · contextual menu · quick-create modal |
| **Drivers** | 5-tab profiles (profile / license / training / restrictions / history) · license upload · validation in booking |
| **Maintenance** | Schedule/complete/cancel · NORMAL/URGENT/CRITICAL severity detection · garage selector · email notification |
| **Incidents** | KPI dashboard · status pipeline · assignment · insurer dispatch · franchise auto-imputation |
| **Violations** | Operator assignment · driver charge · upload · status workflow |
| **Expenses** | Aggregated view of all employee expense claims |
| **Finance → Costs** | Cost CRUD · CSV import · invoice upload (Convex Storage) · export |
| **Finance → BiK UK** | HMRC rate tables by category/list price · per-employee P11D · export |
| **Finance → IK** | Mileage rates by country (FR/GB/SE/NO/DK) and category · live multi-currency calc |
| **Finance → Fuel import** | Total Cards / BP Plus / Shell Fleet parsers · anomaly detection (weekend/volume/duplicate) |
| **Finance → Fiscal** | TVS · AEN · TVA France · liasse fiscale summary |
| **Sustainability** | Scope 1-2-3 dashboard · ADEME/IEA/DEFRA emission factors · ESRS E1 PDF export |
| **Compliance** | Agent Compliance Officer · BiK UK + CSRD Nordics + vehicle conformity · proactive alerts |
| **Settings → Org** | Name · SIREN · sector · size · localization (country/currency/distance/timezone/locale) |
| **Settings → Members** | Invite by email (token link) · roles ORG_ADMIN / ORG_MEMBER |
| **Settings → Notifications** | Recipients and channel preferences per org |
| **Settings → Integrations** | Accounting connectors · Slack/Teams webhooks · API keys · webhooks (developer tab) |
| **Settings → Plans** | Paddle.js checkout overlay · billing portal · tier/seats/renewal display · Dev Plan activator |
| **Support** | Internal support ticket system with thread model |

### Concierge Ops (`/concierge/*`)

The Concierge space is used by Mycelium's internal team to manage demo accounts and assist prospects.

| Feature | Description |
|---------|-------------|
| **Dashboard** | Concierge briefing feed · active/pending tickets · demo org list |
| **Demo management** | Create demo orgs from 7 sector templates (services/BTP/distribution/santé/commerce/VTC/public) · 30-day simulated fleet data pre-loaded · automated expiry |
| **Fleet simulation** | Vehicle positions updated every 5 min via cron · daily events (reservations, maintenance, anomalies) generated per template |
| **Client portal** | Per-prospect conversation threads · human-assist mode (client ↔ concierge live chat) |
| **Human assist** | Concierge can take over Concierge Agent sessions in real time · ownership transfer · priority queue |
| **Org switcher** | Super admins and concierge staff can switch between any org in the topbar |

### Sales Space (`/sales/*`)

Mobile-first interface (bottom tab bar + desktop sidebar) for Mycelium sales representatives.

| Feature | Description |
|---------|-------------|
| **Pipeline** | Kanban (5 stages: discovery → demo → negotiation → won → lost) + list view toggle |
| **Prospect detail** | Stage change · notes history · demo org link · contact info · delete |
| **Chat** | Real-time threads between sales and concierge team via Convex reactive queries |
| **Challenges & Gamification** | Weekly auto-generated challenges · XP points · 5 levels (Starter → Legend) · daily streaks · 4 badge types · weekly leaderboard |
| **Upsell signals** | Automated signals: `demo_login`, `demo_expiring`, `demo_expired`, `upsell_seat_limit`, `churn_risk`, `renewal_approaching` |
| **Agent Commercial IA** | FAB + SSE panel · 4 tools (list_prospects / add_note / signals / challenges) · claude-sonnet-5 |

---

## Tech Stack

| Layer               | Technology                         | Notes                              |
| ------------------- | ---------------------------------- | ---------------------------------- |
| **Frontend**        | SvelteKit 2.x · Svelte 5 (Runes)  | `$state`, `$derived`, `$effect`    |
| **Backend**         | Convex                             | Reactive real-time, serverless     |
| **Auth**            | Better Auth                        | Installed inside Convex component  |
| **AI**              | Claude Sonnet 5 (Anthropic)        | Prompt caching · SSE streaming     |
| **Styling**         | Tailwind CSS v4 · Mycelium UI      | Custom shadcn-style design system  |
| **Email**           | Resend (`@convex-dev/resend`)      | Transactional + webhook events     |
| **Billing**         | Paddle                             | MoR · international · webhooks     |
| **Telematics**      | Smartcar API v3                    | Software-only, zero hardware       |
| **Deployment**      | Cloudflare Workers                 | Edge, global                       |
| **Package manager** | Bun                                |                                    |
| **Tests**           | Playwright (E2E) · Vitest (unit)   |                                    |

---

## Repository Structure

```
mycelium-fleet-os/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── admin/           # Tab navs, admin-specific UI
│   │   │   ├── app/             # App shell, auth providers
│   │   │   ├── authenticated/   # Admin layout, topbar, sidebar
│   │   │   ├── billing/         # Plans, gates, trial banners
│   │   │   ├── concierge/       # Concierge ops UI (demo cards, client tabs)
│   │   │   ├── copilot/         # Floating copilot FAB + panel (employee + admin)
│   │   │   ├── marketing/       # Landing page sections, pricing
│   │   │   ├── sales/           # Sales UI (ProspectCard, SalesAgentFab, StageColumn…)
│   │   │   └── ui/              # Primitives (button, card, input, sheet…)
│   │   └── convex/
│   │       ├── agents/          # AI httpActions (concierge, manager, compliance, salesAgent)
│   │       ├── concierge/       # Concierge ops queries/mutations (demos, humanAssist, staff…)
│   │       ├── demo/            # Demo account simulation engine (generator, simulation)
│   │       ├── emails/          # Transactional email templates + Resend
│   │       ├── integrations/    # Accounting connectors (Xero, QB, Visma, Fortnox…)
│   │       ├── sales/           # Sales backend (prospects, chat, gamification, challenges, signals)
│   │       ├── schema.ts        # Database schema (35+ tables, strict multi-tenant)
│   │       ├── billing.ts       # Plan resolution, feature gates, seat quota
│   │       ├── comms.ts         # Slack & Teams webhook notifications
│   │       ├── crons.ts         # 18+ scheduled jobs
│   │       ├── functions.ts     # Auth guards (authed, salesQuery/Mutation, concierge*, superAdmin*)
│   │       ├── http.ts          # HTTP router (SSE agents, OAuth callbacks, webhooks, v1 REST API)
│   │       ├── notifications.ts # In-app + comms fan-out
│   │       └── paddle.ts        # Paddle MoR webhooks + provisioning
│   └── routes/
│       ├── [[lang]]/
│       │   ├── (marketing)/     # Public landing page, pricing
│       │   ├── admin/           # Fleet admin (/admin/*)
│       │   │   ├── dashboard/
│       │   │   ├── fleet/
│       │   │   ├── reservations/
│       │   │   ├── drivers/
│       │   │   ├── expenses/
│       │   │   ├── finance/     # costs · bik · fiscal · fuel-import
│       │   │   ├── maintenance/
│       │   │   ├── incidents/
│       │   │   ├── violations/
│       │   │   ├── compliance/
│       │   │   ├── sustainability/
│       │   │   └── settings/    # org · members · notifications · integrations · plans
│       │   ├── app/             # Employee interface (/app/*)
│       │   │   ├── reservations/
│       │   │   ├── incidents/
│       │   │   └── profile/
│       │   ├── concierge/       # Concierge ops (/concierge/*)
│       │   │   ├── [organizationId]/  # Per-org view
│       │   │   └── demos/             # Demo creation + management
│       │   ├── sales/           # Sales space (/sales/*)
│       │   │   ├── pipeline/
│       │   │   ├── challenges/
│       │   │   └── chat/
│       │   ├── onboarding/      # 4-step org setup wizard
│       │   └── join/[token]/    # Member invite acceptance
│       └── api/                 # SvelteKit server routes (SSE proxies, v1 REST)
│           ├── concierge/
│           ├── manager/
│           ├── compliance/
│           ├── sales/agent/
│           └── v1/              # Public REST API (costs, vehicles, expenses, webhooks)
├── static/                      # PWA manifest, icons, screenshots, fonts
├── docs/
│   ├── specs/                   # Product specifications per feature
│   ├── prompts/                 # AI implementation prompts (P01–P37)
│   └── setup/                   # Infrastructure and deployment guides
└── tests/                       # Playwright E2E tests
```

---

## Scheduled Jobs (Crons)

| Cron name | Schedule | Purpose |
|-----------|----------|---------|
| `deleteUnusedFiles` | Every hour | Vacuum orphaned Convex Storage files |
| `cleanupExpiredFiles` | Every hour | Remove expired upload grants |
| `deleteEmptyThreads` | Every 6h | Clean stale support threads |
| `deleteStaleWarmThreads` | Daily | Remove unused pre-warmed AI threads |
| `transitionReservationStatuses` | Every hour | CONFIRMED → IN_PROGRESS → COMPLETED |
| `sendReservationReminders` | Daily 17h UTC | J-1 reminders to drivers |
| `runDailyFleetAlerts` | Daily 7h UTC | Under-used vehicles, expiring leases |
| `checkMaintenanceDue` | Daily 5h UTC | NORMAL/URGENT/CRITICAL maintenance detection |
| `checkLicenseExpiry` | Daily 6h UTC | Driver license expiry alerts (30d window) |
| `fleetOptimizer` | Monday 8h UTC | 90-day analysis → email insights to CFO |
| `checkCompliance` | Daily 7h30 UTC | BiK UK + CSRD + vehicle conformity sweep |
| `complianceDigest` | Monday 8h30 UTC | Weekly compliance summary email |
| `accountingSyncRetry` | Every 5 min | Retry failed accounting syncs (5 attempts, backoff) |
| `accountingPullPayments` | Every 6h | Pull payment statuses from connected providers |
| `smartcarSync` | Daily 6h UTC | Odometer / SoC / location from Smartcar API |
| `conciergeDailyBriefing` | Daily 7h UTC | Concierge team briefing generation |
| `simulateDemoFleets` | Every 5 min | Vehicle position updates for demo orgs |
| `generateDemoEvents` | Daily 6h30 UTC | Demo reservations, maintenance, anomalies |
| `updateSalesStreaks` | Daily 5h30 UTC | Reset broken daily streaks (silent) |
| `generateWeeklySalesChallenges` | Monday 7h UTC | Auto-generate weekly challenges per sales rep |
| `detectSalesUpsellSignals` | Daily 9h UTC | Demo expiry signals, upsell/churn detection |
| `resetWeeklySalesPoints` | Sunday 23h50 UTC | Weekly leaderboard reset |

---

## Security Model

### Multi-tenant Isolation

Every database query is scoped by `organizationId`. No query crosses tenant boundaries. Every mutation validates org membership before any write.

```typescript
// Pattern used across all queries — no exceptions
.withIndex('by_org', (q) => q.eq('organizationId', ctx.org._id))
```

### Authentication & Authorization

| Layer | Mechanism |
|-------|-----------|
| **Employee / Admin auth** | Better Auth (JWT session tokens, inside Convex component) |
| **Staff auth (concierge / sales)** | Better Auth JWT with `role = 'admin'` + `myceliumStaff.staffRole` lookup |
| **API key auth** | Scoped, hashed, `myc_live_` prefix, rate-limited (100 req/min) |
| **Role hierarchy** | `ORG_ADMIN` → `ORG_MANAGER` → `ORG_MEMBER` |
| **Staff role hierarchy** | `super_admin` → `concierge` / `sales` |
| **Feature gates** | `assertFeatureAccess()` + `assertSeatAvailable()` per plan tier |

### Encryption

Sensitive tokens (OAuth access/refresh, webhook URLs, third-party API keys) are encrypted at rest with **AES-256-GCM** (Web Crypto API) before storage. The key (`ACCOUNTING_ENCRYPTION_KEY`) lives only in Convex — never in SvelteKit or version control.

### OAuth Security

The CSRF `state` parameter is stored in a Convex `oauthStates` table (not cookies), solving the cross-domain problem between SvelteKit and Convex HTTP actions on different origins. Tokens expire after 10 minutes and are consumed on use.

### Webhook Security

Outbound webhooks: signed **HMAC SHA-256**. Inbound (Paddle, Smartcar, Resend): signature validation before processing. Delivery failures: 5 retries with exponential backoff.

### Secrets Management

| Secret | Location | Scope |
|--------|----------|-------|
| `ANTHROPIC_API_KEY` | Convex env | Actions only |
| `ACCOUNTING_ENCRYPTION_KEY` | Convex env | Actions + mutations |
| `PADDLE_WEBHOOK_SECRET` | Convex env | HTTP action only |
| `RESEND_API_KEY` | Convex env | Actions only |
| `VITE_PADDLE_CLIENT_TOKEN` | SvelteKit env | Frontend only (public) |

---

## Billing & Plans

Billing runs through **Paddle** (Merchant of Record — handles VAT/GST for all markets).

| Plan | Price (monthly) | Drivers | Key features |
|------|----------------|---------|--------------|
| **Essential** | £420 / €490 | 50 | Concierge + fleet management |
| **Professional** | £750 / €890 | 150 | + Xero/QuickBooks sync + Compliance + BiK UK / CSRD lite |
| **Business** | £1,250 / €1,490 | 300 | + Fleet Optimizer + Cost Negotiator + Driver Coach + BiK AI |
| **Enterprise** | Custom | 300+ | On request |

Seat overage: £5–8 / €5–8 per driver above quota.

Feature gating is enforced server-side via `billing.ts` (`planHasFeature()`, `assertFeatureAccess()`). Pages gated: BiK UK (Professional+), Sustainability/CSRD (Professional+), Compliance (Professional+).

---

## Accounting Integrations

Provider-agnostic architecture via the `AccountingConnector` interface (`port.ts`). All connectors implement `pushCost()`, `pullPaymentStatuses()`, and category mapping.

| Provider | Market | Auth | Status |
|----------|--------|------|--------|
| Xero | UK · AU · NZ | OAuth 2.0 | Live |
| QuickBooks | UK · US | OAuth 2.0 | Live |
| FreeAgent | UK | OAuth 2.0 | Live |
| Fortnox | SE | OAuth 2.0 | Live |
| Visma eAccounting | SE · NO · DK · FI | OAuth 2.0 | Live |
| Tripletex | NO | Consumer + Employee token | Live |
| e-conomic | DK | Dual-header token | Live |
| Pennylane | FR | API key | Live |
| Sage | FR | API key | Live |
| EBP | FR | API key | Live |
| Odoo | Global | API key + Community module | Live |

Sync is idempotent (deduplication by `myceliumId`). Chart-of-account mappings editable per organization.

---

## Compliance Coverage

| Regulation | Market | Implementation |
|-----------|--------|----------------|
| **BiK (Benefit-in-Kind)** | UK | `bik.ts` · HMRC rate tables · per-employee P11D |
| **CSRD / ESRS E1** | EU (Nordics priority) | `carbon.ts` · Scope 1-2-3 · PDF export |
| **TVS (Vehicle Tax)** | FR | `fiscal.ts` · annual fleet summary |
| **AEN (Avantage en Nature)** | FR | Included in `fiscal.ts` |
| **GDPR** | EU | Data isolated per org · deletion on request |

---

## Public REST API

Available at `/api/v1/*`. Authenticated via `Authorization: Bearer myc_live_...` API keys.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/costs` | List costs (paginated, filterable) |
| POST | `/api/v1/costs` | Create a cost record |
| GET | `/api/v1/vehicles` | List fleet vehicles |
| GET | `/api/v1/expenses` | List mileage expense claims |
| GET | `/api/v1/webhooks` | List registered webhook endpoints |
| POST | `/api/v1/webhooks` | Register a new webhook endpoint |

Webhooks are signed HMAC SHA-256. Events: `cost.created`, `reservation.created`, `reservation.cancelled`, `expense.submitted`.

---

## Communication Integrations

Slack and Microsoft Teams via **Incoming Webhooks** — no OAuth app required. Fleet-relevant alerts (maintenance due, license expiry, violations, conflicts, optimizer reports) are fanned out to all connected channels automatically.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.1
- [Convex account](https://convex.dev/) (free tier sufficient for development)
- Anthropic API key
- Node.js ≥ 20 (for tooling compatibility)

### 1. Install dependencies

```bash
bun install
```

### 2. Configure Convex

```bash
bunx convex dev --once
```

Provisions your Convex deployment and generates `src/lib/convex/_generated/`.

### 3. Environment variables

**SvelteKit (`.env.local`):**

```env
VITE_CONVEX_URL=https://your-project.convex.cloud
PUBLIC_CONVEX_SITE_URL=https://your-project.convex.site
VITE_PADDLE_CLIENT_TOKEN=test_...          # Paddle Sandbox client token (optional in dev)
```

**Convex Dashboard → Settings → Environment Variables:**

```env
# Required
ANTHROPIC_API_KEY=sk-ant-api03-...
RESEND_API_KEY=re_...
ACCOUNTING_ENCRYPTION_KEY=<base64-encoded 32 bytes>

# Billing (Paddle — optional in dev, activate dev plan instead)
PADDLE_API_KEY=...
PADDLE_WEBHOOK_SECRET=...

# Accounting connectors (configure only what you use)
XERO_CLIENT_ID=...           XERO_CLIENT_SECRET=...
QUICKBOOKS_CLIENT_ID=...     QUICKBOOKS_CLIENT_SECRET=...
FA_CLIENT_ID=...             FA_CLIENT_SECRET=...      # FreeAgent
FX_CLIENT_ID=...             FX_CLIENT_SECRET=...      # Fortnox
VISMA_CLIENT_ID=...          VISMA_CLIENT_SECRET=...
TRIPLETEX_CONSUMER_TOKEN=...
ECONOMIC_APP_SECRET_TOKEN=...

# Telematics (optional)
SMARTCAR_CLIENT_ID=...
SMARTCAR_CLIENT_SECRET=...
```

Generate `ACCOUNTING_ENCRYPTION_KEY`:

```bash
# macOS / Linux
openssl rand -base64 32

# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) }))
```

### 4. Run the development environment

```bash
# Terminal 1 — Convex backend (hot-reload)
bunx convex dev

# Terminal 2 — SvelteKit frontend
bun run dev
```

Application available at `http://localhost:5173`.

### 5. Activate the dev plan

Navigate to `/admin/settings/plans` and click **Activate Dev Plan** to unlock all features without Paddle credentials.

### 6. Provision a Mycelium staff account

To access the Concierge or Sales space, set `role = 'admin'` on your user in the Convex dashboard, then add a row to `myceliumStaff` with your `userId` and `staffRole = 'super_admin'`. Navigate to `/concierge` or `/sales`.

---

## Key Development Patterns

### Auth guards

```typescript
// Org user (employee)
export const myQuery = authedQuery({ ... });

// Org admin
export const myMutation = authedMutation({ ... });  // + requireOrgAdmin()

// Internal concierge staff
export const myQuery = conciergeQuery({ ... });      // checks staffRole = 'concierge'|'super_admin'

// Internal sales staff
export const myQuery = salesQuery({ ... });          // checks staffRole = 'sales'|'super_admin'

// Mycelium super admin
export const myQuery = superAdminQuery({ ... });
```

### Circular dependency avoidance in httpActions

Files that export both functions and call sibling functions from `internal` will cause TS7022/TS7023. Use `makeFunctionReference` instead of `internal.*`:

```typescript
// Instead of: internal.sales.prospects.getProspectsForUser
const getProspectsForUser = makeFunctionReference<'query'>('sales/prospects:getProspectsForUser');
```

### Multi-tenant guard

```typescript
const { user, organizationId } = await getUserOrg(ctx);
await requireOrgAdmin(ctx, organizationId, user._id); // for admin-only ops
```

### AI agent SSE pattern

All AI agents are `httpAction` endpoints on Convex, streaming Server-Sent Events. SvelteKit proxies them through `/api/<agent>` to handle CORS and forward the Better Auth token. See `src/lib/convex/agents/` for implementation.

```
Browser → SvelteKit /api/sales/agent → Convex /api/sales/agent (httpAction) → Anthropic API
            ↑ Bearer token forwarded                    ↑ SSE streamed back
```

---

## Testing

```bash
# Unit tests (Vitest)
bun run test

# E2E tests (Playwright)
bun run test:e2e

# Type check
bunx tsc --noEmit

# Convex typecheck + deploy
bunx convex dev --once
```

---

## Deployment

Deploys to **Cloudflare Workers** (`@sveltejs/adapter-cloudflare`). Convex deploys independently.

```bash
# Deploy SvelteKit to Cloudflare
bun run build
bunx wrangler deploy

# Deploy Convex functions
bunx convex deploy --prod
```

---

## Scope Boundaries

Explicitly out of scope to preserve product focus:

- White-label mode for leasing companies (Arval, ALD, etc.)
- Cross-company vehicle sharing marketplace
- Procurement automation or multi-leaser negotiation
- IoT sensors, OBD hardware, or any physical device
- Native mobile app (PWA only — Capacitor if 3+ customers request it)
- Macro-predictive AI features (before 10,000 active customers)
- Individual consumers or sole traders
- Vehicle remarketing

Ideas outside this scope are tracked in `/docs/ideas-parking-lot.md`.

---

## License

This software is proprietary and confidential.  
Copyright © 2026 Mycelium SAS. All Rights Reserved.

Unauthorized copying, distribution, modification, or use of this software, via any medium, is strictly prohibited. See [LICENSE](LICENSE) for full terms.

---

<div align="center">

Built by the Mycelium team · Paris, France · [legal@mycelium.io](mailto:legal@mycelium.io)

</div>
