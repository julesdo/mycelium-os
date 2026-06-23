---
priority: 14
feature: Google Calendar & Outlook sync — OAuth bidirectionnel + sync automatique réservations
sprint: S10 (V1.5)
version: V1 — MVP Pool Sharing Light
effort: 3 jours
depends_on: P02 (réservations), P06 (notifications)
blocks: —
model_recommended: —
pricing_tier: Tous les tiers (sync calendrier incluse dès Starter)
---

# P14 — Google Calendar & Outlook sync

## 🎯 Mission

Permettre à chaque salarié de connecter son Google Calendar ou Microsoft Outlook pour que **ses réservations Mycelium apparaissent automatiquement dans son agenda personnel**. Quand une réservation est confirmée, annulée ou modifiée dans Mycelium, l'événement est mis à jour dans le calendrier externe. Zéro saisie manuelle, zéro double-booking côté salarié.

**Exemple de valeur :**
> Jean-Pierre confirme sa réservation de véhicule via le Concierge. 10 secondes plus tard, un événement "Mycelium — Peugeot 308 (AB-123-CD)" apparaît dans son Google Calendar avec lieu = agence, description = détails de réservation.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `reservations` complète avec statuts et userId
- Table `organizationMembers` avec userId (Better Auth string)
- Infrastructure Convex actions (pour appels API externes)
- Notifications infrastructure (P06)
- Better Auth pour l'authentification users

**Ce qui manque :**
- OAuth Google Calendar (scope `calendar.events`) côté SvelteKit
- OAuth Microsoft Graph (scope `Calendars.ReadWrite`) côté SvelteKit
- Table `calendarConnections` pour stocker access/refresh tokens chiffrés
- Convex action `syncReservationToCalendar` déclenchée après chaque mutation
- Gestion du refresh automatique des tokens expirés
- UI de connexion calendrier dans les paramètres salarié (`/app/settings`)

---

## 🔒 Contraintes absolues

1. **Tokens chiffrés** : les access et refresh tokens Google/Microsoft sont stockés chiffrés en base via `ctx.db` Convex. Ne jamais les exposer dans les queries côté client.
2. **Sync unidirectionnelle MVP** : Mycelium → Calendrier externe uniquement. La sync inverse (créer une réservation Mycelium depuis le calendrier) est hors scope V1.
3. **Pas de blocage** : si la sync calendrier échoue (token révoqué, quota dépassé), la réservation est quand même créée. L'erreur est loggée, pas propagée à l'utilisateur.
4. **Isolation multi-tenant** : un userId ne peut lire/écrire que ses propres tokens de calendrier.
5. **Google et Microsoft dans la même table** : `calendarConnections` avec champ `provider: 'google' | 'microsoft'`.
6. **Suppression des événements** : si une réservation est annulée, supprimer l'événement calendrier correspondant via l'API.

---

## 📊 Nouveau schéma Convex

### `calendarConnections`

```typescript
calendarConnections: defineTable({
  organizationId: v.id('organizations'),
  userId: v.string(),                        // Better Auth string ID
  provider: v.union(v.literal('google'), v.literal('microsoft')),
  accessToken: v.string(),                   // chiffré — voir note ci-dessous
  refreshToken: v.string(),                  // chiffré
  tokenExpiresAt: v.number(),               // timestamp ms
  calendarId: v.optional(v.string()),       // Google: 'primary' ou ID custom. Microsoft: default
  isActive: v.boolean(),
  connectedAt: v.number(),
  lastSyncAt: v.optional(v.number()),
  lastSyncError: v.optional(v.string())
})
  .index('by_user', ['userId'])
  .index('by_org_and_user', ['organizationId', 'userId'])
  .index('by_user_and_provider', ['userId', 'provider'])
```

**Note sur le chiffrement** : En V1, chiffrement symétrique AES-256 via `CALENDAR_ENCRYPTION_KEY` (variable d'environnement Convex). Utiliser un helper `encrypt(token)` / `decrypt(token)` basé sur `@noble/ciphers` (disponible dans Convex runtime). En V2, migrer vers Convex secret management si disponible.

**⚠️ Schema change** : ajouter `calendarEventId?: string` à la table `reservations` pour stocker l'ID de l'événement créé chez Google/Microsoft.

```typescript
// Dans reservations, ajouter :
calendarEventId: v.optional(v.string()),
```

---

## 📁 Fichiers à créer / modifier

```
src/routes/[[lang]]/
  api/calendar/google/callback/+server.ts    → OAuth callback Google
  api/calendar/microsoft/callback/+server.ts → OAuth callback Microsoft
  app/settings/+page.svelte                  → MODIFIER : ajouter section "Calendrier"

src/lib/convex/
  calendar.ts                                → NOUVEAU : mutations + actions sync
  schema.ts                                  → ajouter calendarConnections + calendarEventId
  reservations.ts                            → MODIFIER : déclencher sync après create/update/cancel
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — OAuth routes SvelteKit

**Google :**

```typescript
// src/routes/[[lang]]/api/calendar/google/callback/+server.ts
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from '$env/static/private';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state'); // organizationId encodé
  if (!code) return new Response('Missing code', { status: 400 });

  // Échanger le code contre les tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: `${url.origin}/api/calendar/google/callback`,
      grant_type: 'authorization_code'
    })
  });

  const tokens = await tokenRes.json();
  if (!tokens.access_token) return new Response('OAuth failed', { status: 400 });

  // Stocker via Convex mutation (les tokens sont chiffrés dans la mutation)
  const session = await locals.auth?.getSession();
  if (!session?.user) return new Response('Not authenticated', { status: 401 });

  // Appel mutation Convex via fetch (depuis le server SvelteKit)
  await fetch(`${process.env.CONVEX_SITE_URL}/saveCalendarConnection`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: session.user.id,
      provider: 'google',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in
    })
  });

  return new Response(null, {
    status: 302,
    headers: { Location: '/app/settings?calendar=connected' }
  });
};
```

**Initiation OAuth depuis l'UI :**

```typescript
// Bouton "Connecter Google Calendar" → redirige vers :
const GOOGLE_AUTH_URL = `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({
  client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  redirect_uri: `${window.location.origin}/api/calendar/google/callback`,
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/calendar.events',
  access_type: 'offline',
  prompt: 'consent'
})}`;
```

### Étape 2 — Mutations Convex `calendar.ts`

```typescript
// src/lib/convex/calendar.ts

// Internal : sauvegarder la connexion (appelé depuis le callback OAuth)
export const saveCalendarConnection = internalMutation({
  args: {
    userId: v.string(),
    provider: v.union(v.literal('google'), v.literal('microsoft')),
    accessToken: v.string(),
    refreshToken: v.string(),
    expiresIn: v.number()
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query('userProfiles')
      .withIndex('by_user', q => q.eq('userId', args.userId))
      .unique();
    if (!profile?.currentOrganizationId) throw new ConvexError('Organisation introuvable');

    const existing = await ctx.db
      .query('calendarConnections')
      .withIndex('by_user_and_provider', q =>
        q.eq('userId', args.userId).eq('provider', args.provider)
      )
      .unique();

    const data = {
      organizationId: profile.currentOrganizationId,
      userId: args.userId,
      provider: args.provider,
      accessToken: encrypt(args.accessToken),   // chiffrement AES-256
      refreshToken: encrypt(args.refreshToken),
      tokenExpiresAt: Date.now() + args.expiresIn * 1000,
      isActive: true,
      connectedAt: Date.now()
    };

    if (existing) await ctx.db.patch(existing._id, data);
    else await ctx.db.insert('calendarConnections', data);
  }
});

// Query : connexions calendrier de l'utilisateur courant
export const getMyCalendarConnections = authedQuery({
  args: {},
  handler: async (ctx) => {
    const connections = await ctx.db
      .query('calendarConnections')
      .withIndex('by_user', q => q.eq('userId', ctx.user._id))
      .collect();

    // Ne jamais retourner les tokens — juste provider + statut
    return connections.map(c => ({
      _id: c._id,
      provider: c.provider,
      isActive: c.isActive,
      connectedAt: c.connectedAt,
      lastSyncAt: c.lastSyncAt,
      lastSyncError: c.lastSyncError
    }));
  }
});

// Mutation : déconnecter un calendrier
export const disconnectCalendar = authedMutation({
  args: { provider: v.union(v.literal('google'), v.literal('microsoft')) },
  handler: async (ctx, { provider }) => {
    const conn = await ctx.db
      .query('calendarConnections')
      .withIndex('by_user_and_provider', q =>
        q.eq('userId', ctx.user._id).eq('provider', provider)
      )
      .unique();
    if (conn) await ctx.db.delete(conn._id);
  }
});
```

### Étape 3 — Action de sync `syncReservationEvent`

```typescript
// src/lib/convex/calendar.ts

export const syncReservationEvent = internalAction({
  args: {
    reservationId: v.id('reservations'),
    action: v.union(v.literal('create'), v.literal('update'), v.literal('delete'))
  },
  handler: async (ctx, { reservationId, action }) => {
    const reservation = await ctx.runQuery(internal.reservations.getReservationInternal, { reservationId });
    if (!reservation) return;

    const connection = await ctx.runQuery(internal.calendar.getConnectionForUser, {
      userId: reservation.userId
    });
    if (!connection?.isActive) return;

    const vehicle = await ctx.runQuery(internal.vehicles.getVehicleInternal, { vehicleId: reservation.vehicleId });
    const accessToken = await refreshIfNeeded(ctx, connection);
    if (!accessToken) return;

    const eventTitle = `Mycelium — ${vehicle?.brand} ${vehicle?.model} (${vehicle?.registration})`;
    const eventBody = `Réservation Mycelium Fleet OS\nVéhicule : ${vehicle?.brand} ${vehicle?.model}\nImmatriculation : ${vehicle?.registration}\nObjet : ${reservation.purpose ?? '—'}\n\nVoir la réservation : ${process.env.APP_URL}/app/reservations/${reservationId}`;

    try {
      if (connection.provider === 'google') {
        await syncToGoogle({ accessToken, action, reservation, eventTitle, eventBody, existingEventId: reservation.calendarEventId });
      } else {
        await syncToMicrosoft({ accessToken, action, reservation, eventTitle, eventBody, existingEventId: reservation.calendarEventId });
      }
    } catch (err) {
      // Log l'erreur sans bloquer
      await ctx.runMutation(internal.calendar.logSyncError, {
        connectionId: connection._id,
        error: String(err)
      });
    }
  }
});

async function syncToGoogle({ accessToken, action, reservation, eventTitle, eventBody, existingEventId }: GoogleSyncParams) {
  const BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };

  const event = {
    summary: eventTitle,
    description: eventBody,
    start: { dateTime: new Date(reservation.startDate).toISOString() },
    end: { dateTime: new Date(reservation.endDate).toISOString() },
    colorId: '5' // jaune (banana)
  };

  if (action === 'create') {
    const res = await fetch(BASE, { method: 'POST', headers, body: JSON.stringify(event) });
    const created = await res.json();
    // Stocker l'ID de l'événement dans la réservation
    await fetch(`${process.env.CONVEX_SITE_URL}/updateReservationCalendarId`, {
      method: 'POST',
      body: JSON.stringify({ reservationId: reservation._id, calendarEventId: created.id })
    });
  } else if (action === 'update' && existingEventId) {
    await fetch(`${BASE}/${existingEventId}`, { method: 'PATCH', headers, body: JSON.stringify(event) });
  } else if (action === 'delete' && existingEventId) {
    await fetch(`${BASE}/${existingEventId}`, { method: 'DELETE', headers });
  }
}
```

### Étape 4 — Déclencher la sync depuis `reservations.ts`

```typescript
// Dans createReservation, updateReservation, cancelReservation :
// Ajouter APRÈS l'insertion/modification Convex, dans un scheduler.runAfter

await ctx.scheduler.runAfter(0, internal.calendar.syncReservationEvent, {
  reservationId,
  action: 'create' // ou 'update' ou 'delete'
});
```

### Étape 5 — UI `/app/settings` : section Calendrier

```
┌──────────────────────────────────────────────────────┐
│  Intégration Calendrier                               │
├──────────────────────────────────────────────────────┤
│  ✅ Google Calendar connecté                          │
│     Dernière sync : il y a 2 minutes                  │
│     [Déconnecter]                                     │
│                                                       │
│  ○ Microsoft Outlook                                  │
│     [Connecter Microsoft Outlook →]                   │
└──────────────────────────────────────────────────────┘
```

---

## ✅ Critères d'acceptation

- [ ] Bouton "Connecter Google Calendar" dans `/app/settings` démarre le flow OAuth
- [ ] Après connexion, les nouvelles réservations créent automatiquement un événement Google Calendar
- [ ] Annulation d'une réservation → suppression de l'événement Google
- [ ] Les tokens sont chiffrés en base, jamais exposés côté client
- [ ] Si la sync échoue, la réservation est quand même créée (pas de blocage)
- [ ] Bouton "Déconnecter" supprime la connexion et arrête la sync
- [ ] Même flow fonctionnel pour Microsoft (Outlook)

---

## 🚫 NE PAS FAIRE

- Ne pas implémenter la sync inverse (calendrier → Mycelium) — hors scope V1
- Ne pas stocker les tokens en clair — toujours chiffrer avec `CALENDAR_ENCRYPTION_KEY`
- Ne pas propager les erreurs de sync à l'utilisateur — uniquement logger en base
- Ne pas appeler les APIs Google/Microsoft directement depuis des mutations Convex (pas d'accès HTTP) — utiliser des Convex actions ou httpActions
- Ne pas stocker les tokens dans `localStorage` ou cookies côté client
