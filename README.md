<div align="center">

<img src="static/logo.svg" alt="Mycelium Fleet OS" width="72" />

# Mycelium Fleet OS

**The Fleet Operating System for mid-market companies.**

Unified vehicle management, AI-powered reservations, and automated compliance — built for 50–500 employee organizations operating 15–150 vehicles.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-orange?logo=svelte)](https://kit.svelte.dev/)
[![Convex](https://img.shields.io/badge/Convex-Backend-purple)](https://convex.dev/)
[![Claude AI](https://img.shields.io/badge/AI-Claude%20Sonnet-violet?logo=anthropic)](https://anthropic.com/)

</div>

---

## Overview

Mycelium Fleet OS replaces spreadsheets and fragmented tools with a unified operational platform. Employees book vehicles in natural language through an AI concierge. Fleet managers get automated insights, compliance monitoring, and real-time financial tracking — without writing a single query.

**Six specialized AI agents. Zero hardware. Full regulatory coverage from Day 1.**

| Dimension            | Detail                                                            |
| -------------------- | ----------------------------------------------------------------- |
| **Target market**    | UK · Nordics (SE, NO, DK, FI) · France                            |
| **Customer profile** | SMEs and mid-market · 50–500 employees · 15–150 vehicles          |
| **Billing**          | Paddle (Merchant of Record) · Essential / Professional / Business |
| **Distribution**     | Xero App Marketplace · QuickBooks App Store · Odoo Community      |
| **Deployment**       | Cloudflare Workers · PWA · No native app                          |

---

## AI Agent Architecture

The platform is built around six purpose-built agents with strict role boundaries, tool sets, and audience separation. AI is invisible to end users — it operates as the operational layer, not a feature.

```
┌─────────────────────────────────────────────────────────────┐
│                     EMPLOYEE INTERFACE                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Concierge Agent  ·  natural language reservations  │   │
│  │  SSE streaming · 10-step agentic loop · 4 tools     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN / CFO INTERFACE                   │
│  ┌────────────────────┐  ┌──────────────────────────────┐  │
│  │  Manager Agent     │  │  Compliance Officer Agent    │  │
│  │  6 read-only tools │  │  BiK UK · CSRD · TVS France  │  │
│  └────────────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                     BACKGROUND AGENTS                       │
│  ┌────────────────┐ ┌─────────────────┐ ┌───────────────┐  │
│  │  Fleet         │ │  Cost           │ │  Driver       │  │
│  │  Optimizer     │ │  Negotiator     │ │  Coach        │  │
│  │  weekly cron   │ │  proactive      │ │  safety +     │  │
│  │  90-day window │ │  savings        │ │  eco-driving  │  │
│  └────────────────┘ └─────────────────┘ └───────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer               | Technology                       | Notes                             |
| ------------------- | -------------------------------- | --------------------------------- |
| **Frontend**        | SvelteKit 2.x · Svelte 5 (Runes) | `$state`, `$derived`, `$effect`   |
| **Backend**         | Convex                           | Reactive real-time, serverless    |
| **Auth**            | Better Auth                      | Installed inside Convex component |
| **AI**              | Claude Sonnet 4.x (Anthropic)    | Prompt caching · SSE streaming    |
| **Styling**         | Tailwind CSS v4 · Mycelium UI    | Custom shadcn-style design system |
| **Email**           | Resend (`@convex-dev/resend`)    | Transactional + webhook events    |
| **Billing**         | Paddle                           | MoR · international · webhooks    |
| **Telematics**      | Smartcar API v3                  | Software-only, zero hardware      |
| **Deployment**      | Cloudflare Workers               | Edge, global                      |
| **Package manager** | Bun                              |                                   |
| **Tests**           | Playwright (E2E) · Vitest (unit) |                                   |

---

## Repository Structure

```
mycelium-fleet-os/
├── src/
│   ├── lib/
│   │   ├── components/          # UI components (Mycelium UI design system)
│   │   │   ├── app/             # App shell, auth providers
│   │   │   ├── authenticated/   # Admin layout, topbar, sidebar
│   │   │   ├── billing/         # Plans, gates, trial banners
│   │   │   ├── marketing/       # Landing page, pricing
│   │   │   └── ui/              # Primitives (button, card, input…)
│   │   ├── convex/              # All Convex backend logic
│   │   │   ├── agents/          # AI agent httpActions (concierge, manager, compliance)
│   │   │   ├── integrations/    # Accounting connectors (Xero, QB, Visma, Fortnox…)
│   │   │   ├── emails/          # Transactional email templates + Resend
│   │   │   ├── schema.ts        # Database schema (27 tables, strict multi-tenant)
│   │   │   ├── billing.ts       # Plan resolution, feature gates, seat quota
│   │   │   ├── comms.ts         # Slack & Teams webhook notifications
│   │   │   ├── crons.ts         # Scheduled jobs (optimizer, license expiry, sync)
│   │   │   ├── http.ts          # HTTP router (SSE, OAuth callbacks, webhooks)
│   │   │   ├── notifications.ts # In-app + comms fan-out
│   │   │   └── paddle.ts        # Paddle MoR webhooks + provisioning
│   │   └── config/              # Legal config, feature flags
│   └── routes/
│       ├── [[lang]]/
│       │   ├── (marketing)/     # Public landing page, pricing
│       │   ├── admin/           # Fleet admin interface (/admin/*)
│       │   │   ├── dashboard/
│       │   │   ├── fleet/
│       │   │   ├── reservations/
│       │   │   ├── drivers/
│       │   │   ├── finance/     # Costs, BiK UK, IK, fiscal
│       │   │   ├── maintenance/
│       │   │   ├── incidents/
│       │   │   ├── compliance/  # CSRD, BiK, driver conformity
│       │   │   ├── sustainability/
│       │   │   └── settings/    # Org, members, integrations, plans
│       │   ├── app/             # Employee interface (/app/*)
│       │   │   ├── reservations/
│       │   │   ├── incidents/
│       │   │   └── profile/
│       │   └── onboarding/      # 4-step org setup wizard
│       └── api/                 # SvelteKit server routes (SSE proxy, v1 REST)
├── static/                      # PWA manifest, icons, screenshots, fonts
├── docs/
│   ├── specs/                   # Product specifications per feature
│   ├── prompts/                 # AI implementation prompts (P01–P24)
│   └── setup/                   # Infrastructure and deployment guides
└── tests/                       # Playwright E2E tests
```

---

## Security Model

Security is treated as a first-class constraint, not an afterthought.

### Multi-tenant Isolation

Every database query in Convex is scoped by `organizationId`. No query crosses tenant boundaries. Every mutation validates that the requesting user belongs to the target organization before any write operation.

```typescript
// Every data access is scoped — no exceptions
.withIndex('by_org', (q) => q.eq('organizationId', ctx.org._id))
```

### Authentication & Authorization

- **Auth**: Better Auth with session tokens, installed inside the Convex runtime
- **Role hierarchy**: `ORG_ADMIN` → `ORG_MANAGER` → `ORG_MEMBER`
- **Feature gates**: plan-level enforcement via `assertFeatureAccess()` and `assertSeatAvailable()` before any privileged operation
- **API keys**: scoped, hashed (HMAC SHA-256), with `myc_live_` prefix for identification
- **Rate limiting**: 100 req/min per API key via `@convex-dev/rate-limiter`

### Encryption

Sensitive tokens (OAuth access tokens, refresh tokens, webhook URLs, third-party API keys) are encrypted at rest using **AES-256-GCM** with Web Crypto API before storage in Convex. The encryption key (`ACCOUNTING_ENCRYPTION_KEY`) lives only in the Convex environment — never in SvelteKit or version control.

```
SvelteKit (frontend) ──→ Convex action ──→ encrypt(token, key) ──→ DB
                                                   ↑
                                        key lives only here
```

### OAuth Security

The OAuth CSRF state parameter is stored in a Convex `oauthStates` table (not cookies), solving the cross-domain problem between the SvelteKit frontend and Convex HTTP actions deployed on different origins. State tokens expire after 10 minutes and are consumed on use.

### Webhook Security

Outbound webhooks are signed with **HMAC SHA-256**. Inbound webhooks (Paddle, Smartcar, Resend) validate signatures before processing. Delivery failures retry with exponential backoff (5 attempts).

### Secrets Management

| Secret                      | Location      | Access              |
| --------------------------- | ------------- | ------------------- |
| `ANTHROPIC_API_KEY`         | Convex env    | Actions only        |
| `ACCOUNTING_ENCRYPTION_KEY` | Convex env    | Actions + mutations |
| `PADDLE_WEBHOOK_SECRET`     | Convex env    | HTTP action only    |
| `RESEND_API_KEY`            | Convex env    | Actions only        |
| `VITE_PADDLE_CLIENT_TOKEN`  | SvelteKit env | Frontend (public)   |

Secrets are **never** passed through SvelteKit server routes. All sensitive operations execute inside Convex actions.

---

## Accounting Integrations

Provider-agnostic architecture via the `AccountingConnector` interface. All connectors implement `pushCost()` and `pullPaymentStatuses()`.

| Provider          | Market            | Auth                       | Status  |
| ----------------- | ----------------- | -------------------------- | ------- |
| Xero              | UK · AU · NZ      | OAuth 2.0                  | ✅ Live |
| QuickBooks        | UK · US           | OAuth 2.0                  | ✅ Live |
| FreeAgent         | UK                | OAuth 2.0                  | ✅ Live |
| Fortnox           | SE                | OAuth 2.0                  | ✅ Live |
| Visma eAccounting | SE · NO · DK · FI | OAuth 2.0                  | ✅ Live |
| Tripletex         | NO                | Consumer + Employee token  | ✅ Live |
| e-conomic         | DK                | Dual-header token          | ✅ Live |
| Pennylane         | FR                | API key                    | ✅ Live |
| Sage              | FR                | API key                    | ✅ Live |
| EBP               | FR                | API key                    | ✅ Live |
| Odoo              | Global            | API key + Community module | ✅ Live |

Chart-of-account mappings are seeded per provider at connection time and editable per organization. Sync is idempotent (deduplication by `myceliumId`).

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.1
- [Convex account](https://convex.dev/) (free tier is sufficient for development)
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

This provisions your Convex deployment and generates `src/lib/convex/_generated/`.

### 3. Environment variables

**SvelteKit (`.env.local`):**

```env
VITE_CONVEX_URL=https://your-project.convex.cloud
VITE_PADDLE_CLIENT_TOKEN=test_...          # Paddle Sandbox client token
PUBLIC_SENTRY_DSN=https://...             # Optional: error monitoring
PUBLIC_POSTHOG_API_KEY=phc_...            # Optional: product analytics
```

**Convex Dashboard → Settings → Environment Variables:**

```env
# Required
ANTHROPIC_API_KEY=sk-ant-api03-...
RESEND_API_KEY=re_...
ACCOUNTING_ENCRYPTION_KEY=<base64-encoded 32 bytes>

# Billing (Paddle)
PADDLE_API_KEY=...
PADDLE_WEBHOOK_SECRET=...

# Accounting connectors (configure only the ones you use)
XERO_CLIENT_ID=...
XERO_CLIENT_SECRET=...
QUICKBOOKS_CLIENT_ID=...
QUICKBOOKS_CLIENT_SECRET=...
FA_CLIENT_ID=...            # FreeAgent
FA_CLIENT_SECRET=...
FX_CLIENT_ID=...            # Fortnox
FX_CLIENT_SECRET=...
VISMA_CLIENT_ID=...
VISMA_CLIENT_SECRET=...
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

### 5. Activate the dev plan (bypass Paddle in development)

Navigate to `/admin/settings/plans` and click **Activate Dev Plan**. This grants unlimited seats and all features without requiring Paddle credentials.

---

## Key Development Patterns

### Convex function types

```typescript
// Read-only, reactive, real-time
export const myQuery = query({ ... });

// Write operation
export const myMutation = mutation({ ... });

// External API calls, long-running jobs
export const myAction = action({ ... });

// Scheduled (cron or scheduler.runAfter)
export const myInternalAction = internalAction({ ... });
```

### Multi-tenant guard pattern

```typescript
// Every authed operation resolves org this way
const { user, organizationId } = await getUserOrg(ctx);
await requireOrgAdmin(ctx, organizationId, user._id); // for admin-only ops
```

### AI agent pattern (SSE streaming)

All AI agents are `httpAction` endpoints streaming Server-Sent Events. The SvelteKit frontend proxies them through `/api/<agent>` to handle CORS. See `src/lib/convex/agents/` for implementation details.

---

## Testing

```bash
# Unit tests (Vitest)
bun run test

# E2E tests (Playwright)
bun run test:e2e

# Type check
bunx tsc --noEmit
```

---

## Deployment

The application deploys to **Cloudflare Workers** (via `@sveltejs/adapter-cloudflare`). Convex functions deploy automatically on `git push` through the Convex CI integration.

```bash
# Deploy SvelteKit to Cloudflare
bun run build
bunx wrangler deploy

# Deploy Convex functions
bunx convex deploy --prod
```

Configure the following in your Cloudflare dashboard:

- Custom domain
- Workers KV (session storage)
- R2 bucket (file uploads, if applicable)

---

## Compliance Coverage

| Regulation                       | Market                | Implementation                                  |
| -------------------------------- | --------------------- | ----------------------------------------------- |
| **BiK (Benefit-in-Kind)**        | UK                    | `bik.ts` · HMRC rate tables · per-employee P11D |
| **CSRD / ESRS E1**               | EU (Nordics priority) | `carbon.ts` · Scope 1-2-3 · PDF export          |
| **TVS (Vehicle Tax)**            | FR                    | `fiscal.ts` · annual fleet summary              |
| **AEN (Taxe sur les véhicules)** | FR                    | Included in `fiscal.ts`                         |
| **GDPR**                         | EU                    | Data isolated per org · deletion on request     |

---

## Communication Integrations

Slack and Microsoft Teams are supported via **Incoming Webhooks** — no OAuth app required. Admin-relevant alerts (maintenance due, license expiry, violations, conflicts) are automatically fanned out to all connected channels.

```
Settings → Integrations → Communication → Connect → paste webhook URL
```

---

## Scope Boundaries

The following are explicitly out of scope to preserve product focus:

- White-label mode for leasing companies
- Cross-company vehicle sharing marketplace
- IoT sensors or OBD hardware of any kind
- Native mobile app (PWA + Capacitor only if 3+ customers request)
- Macro-predictive AI features (before 10,000 active customers)
- Individual consumers or sole traders

---

## License

This software is proprietary and confidential.  
Copyright © 2026 Mycelium SAS. All Rights Reserved.

Unauthorized copying, distribution, modification, or use of this software,
via any medium, is strictly prohibited. See [LICENSE](LICENSE) for full terms.

---

<div align="center">

Built by the Mycelium team · Paris, France · [legal@mycelium.io](mailto:legal@mycelium.io)

</div>
