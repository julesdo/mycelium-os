<div align="center">

<img src="static/logo.svg" alt="Letikette" width="72" />

# Letikette

**The EGalim compliance operator for collective catering.**

Letikette computes a canteen's real EGalim ratio from its supplier invoices, prices the gap in euros,
and produces the proof every month.

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![SvelteKit](https://img.shields.io/badge/SvelteKit-2.x-orange?logo=svelte)](https://kit.svelte.dev/)
[![Convex](https://img.shields.io/badge/Convex-Backend-purple)](https://convex.dev/)

</div>

---

## Overview

French law (EGalim) requires every canteen — public since 2022, **private since 2024** — to serve
≥ 50% sustainable products including ≥ 20% organic (and ≥ 60% sustainable on meat and fish),
measured in purchase value, and to declare it annually on *ma cantine* before 31 March.

Roughly 85% of declaring canteens fall short, and most don't even know their own number, because it
has to be computed line by line, across twelve months of invoices, in purchase value.

**Letikette sells a measured result, not a SaaS.** The business is 80% human process, 20% software:
a diagnostic that prices the gap, a monthly declaration, and — once the client has bought in — a
substitution pilot on the highest-friction lines.

| Dimension | Detail |
|---|---|
| **Target** | Private collective catering, self-operated (not outsourced), unequipped |
| **Geography** | Île-de-France Ouest (initial focus) |
| **Interface language** | French only — EGalim is a French law |
| **Billing** | Paddle (Merchant of Record) |

Full business context: [`docs/agri/business-plan/00-README.md`](docs/agri/business-plan/00-README.md)
and the pivot spec at
[`docs/superpowers/specs/2026-08-15-pivot-egalim-tri-et-moulinette-design.md`](docs/superpowers/specs/2026-08-15-pivot-egalim-tri-et-moulinette-design.md).

---

## Two Red Lines

1. **Letikette never takes ownership of goods.** Producers invoice and deliver directly.
2. **Letikette never organizes transport in its own name** (that requires a regulated freight-forwarder
   status).

And one forbidden word: **"guarantee."** Letikette never guarantees compliance — it measures it,
improves it, and proves it. The declaration itself is always signed by the canteen.

---

## User Spaces

| Space | URL | Audience |
|-------|-----|----------|
| **Canteen app** | `/app/*` | The client organization (`ORG_ADMIN`, `ORG_MEMBER`) |
| **Ops** | `/ops/*` | Letikette's internal team — multi-client view (`SUPER_ADMIN`, `OPERATOR` staff roles) |

Plus public routes: `/` (marketing), `/onboarding/organization`, `/join/[token]` (member invite),
`/staff-join/[token]` (internal staff invite).

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Frontend** | SvelteKit 2.x · Svelte 5 (Runes) | `$state`, `$derived`, `$effect` |
| **Backend** | Convex | Reactive real-time, serverless — schema in `src/lib/convex/schema.ts` |
| **Auth** | Better Auth | Installed inside the Convex component |
| **Styling** | Tailwind CSS v4 | Custom shadcn-style component set |
| **Email** | Resend (`@convex-dev/resend`) | Transactional email + webhook events |
| **Billing** | Paddle | Merchant of Record |
| **Deployment** | Cloudflare Workers | Edge, global |
| **Package manager** | Bun | |
| **Tests** | Playwright (E2E) · Vitest (unit) | |

---

## Data Model

Strict multi-tenant isolation by `organizationId` — one canteen is one organization. Every query and
mutation is scoped to it; no query crosses a tenant boundary.

The schema is intentionally minimal at this stage: 15 tables covering organizations, membership and
invitations, notifications, and the internal Concierge/Ops support system (staff, tickets, human-assist
threads, client timeline). See `src/lib/convex/schema.ts` for the source of truth — it is not to be
extended casually; each new table should map to a manual task the field journal actually surfaced.

The EGalim classification engine itself (`referentiel.ts`, invoice ingestion, the diagnostic report)
is phase 1 work and does not exist yet in this codebase.

---

## Repository Structure

```
letikette-chat/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── concierge/       # Internal ops UI (tickets, client timeline, staff)
│   │   │   ├── marketing/       # Landing page sections
│   │   │   └── ui/              # Primitives (button, card, input, sheet…)
│   │   └── convex/
│   │       ├── concierge/       # Internal support: tickets, staff, human-assist, SLA
│   │       ├── admin/           # Staff-facing queries/mutations
│   │       ├── emails/          # Transactional email templates + Resend
│   │       ├── schema.ts        # Database schema (15 tables, strict multi-tenant)
│   │       ├── billing.ts       # Plan resolution, feature gates, seat quota
│   │       ├── crons.ts         # Scheduled jobs (storage vacuum)
│   │       ├── functions.ts     # Auth guards (authed*, concierge*, superAdmin*, admin*)
│   │       ├── http.ts          # HTTP router (Better Auth, Resend + Paddle webhooks)
│   │       ├── notifications.ts # In-app notifications
│   │       └── paddle.ts        # Paddle MoR webhooks + provisioning
│   └── routes/
│       └── [[lang]]/
│           ├── (marketing)/     # Public landing page, about, terms, privacy
│           ├── app/             # Canteen client interface (/app/*)
│           ├── ops/             # Letikette internal ops (/ops/*)
│           ├── onboarding/      # Organization setup
│           ├── join/[token]/    # Member invite acceptance
│           └── staff-join/[token]/  # Internal staff invite acceptance
├── docs/
│   ├── agri/                    # Business plan, playbooks, EGalim reference sheet
│   └── superpowers/              # Pivot specs and reference gabarits
└── e2e/                          # Playwright E2E tests
```

---

## Security Model

### Multi-tenant Isolation

Every database query is scoped by `organizationId`. No query crosses tenant boundaries.

```typescript
// Pattern used across all org-scoped queries
.withIndex('by_org', (q) => q.eq('organizationId', ctx.org._id))
```

### Authentication & Authorization

| Layer | Mechanism |
|---|---|
| **Canteen auth** | Better Auth (JWT session tokens, inside the Convex component) |
| **Internal staff auth** | Better Auth JWT with `role = 'admin'` + `letiketteStaff.staffRole` lookup |
| **Role hierarchy** | `ORG_ADMIN` → `ORG_MEMBER` |
| **Staff role hierarchy** | `SUPER_ADMIN` → `OPERATOR` |

### Webhook Security

Inbound (Paddle, Resend): signature validation before processing.

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.1
- [Convex account](https://convex.dev/) (free tier sufficient for development)
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
```

**Convex Dashboard → Settings → Environment Variables:**

```env
# Required
SITE_URL=http://localhost:5173
BETTER_AUTH_SECRET=...
AUTH_EMAIL=...
RESEND_API_KEY=re_...
EMAIL_ASSET_URL=...

# Billing (Paddle — optional in dev; a dev plan can be activated without it)
PADDLE_API_KEY=...
PADDLE_WEBHOOK_SECRET=...
```

### 4. Run the development environment

```bash
# Terminal 1 — Convex backend (hot-reload)
bunx convex dev

# Terminal 2 — SvelteKit frontend
bun run dev
```

Application available at `http://localhost:5173`.

### 5. Provision a Letikette staff account

To access the Ops space, set `role = 'admin'` on your user in the Convex dashboard, then add a row to
`letiketteStaff` with your `userId` and `staffRole = 'SUPER_ADMIN'`. Navigate to `/ops`.

---

## Key Development Patterns

### Auth guards

```typescript
// Canteen user (client)
export const myQuery = authedQuery({ ... });

// Internal ops staff (operator or super admin)
export const myQuery = conciergeQuery({ ... });

// Letikette super admin only
export const myQuery = superAdminQuery({ ... });
```

### Multi-tenant guard

```typescript
const { user, organizationId } = await getUserOrg(ctx);
await requireOrgAdmin(ctx, organizationId, user._id); // for admin-only ops
```

---

## Testing

```bash
# Unit tests (Vitest)
bun run test:unit

# E2E tests (Playwright)
bun run test:e2e

# Type check
bun run check
bun run check:convex

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

**Nothing is built beyond what the field's friction journal names, timed.** Every feature has to
answer two questions: which repeated manual task it removes, and which already-sold commercial tier
it unlocks. No stopwatch answer to both, no feature.

Explicitly out of scope for the foreseeable future:

- White-label mode for leasing/procurement intermediaries
- Cross-company marketplace
- Automated multi-supplier procurement or negotiation
- Resale/remarketing of any kind
- Expansion to other verticals before the current one is proven
- Native mobile app (PWA only)
- IoT, sensors, or hardware of any kind
- Macro-predictive features before meaningful scale

---

## License

This software is proprietary and confidential.
Copyright © 2026 Jules-Camille Doré. All Rights Reserved.

Unauthorized copying, distribution, modification, or use of this software, via any medium, is strictly
prohibited. See [LICENSE](LICENSE) for full terms.

---

<div align="center">

Built by Letikette · [legal@letikette.io](mailto:legal@letikette.io)

</div>
