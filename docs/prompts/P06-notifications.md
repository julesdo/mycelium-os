---
priority: 6
feature: Système de notifications — In-app temps réel + emails transactionnels
sprint: S6
version: V1 MVP
effort: 2 jours
depends_on: P02 (réservations créent des notifs), schema.ts (notifications table complète)
blocks: —
email_provider: Resend (déjà configuré via @convex-dev/resend)
---

# P06 — Notifications (in-app + emails)

## 🎯 Mission
Informer les salariés et les admins en temps réel des événements flotte : confirmation de réservation, annulation, rappel J-1, alerte véhicule. Deux canaux : in-app (badge + center) et email (Resend).

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `notifications` complète dans schema.ts avec 8 types (RESERVATION_CONFIRMED, CANCELLED, REMINDER, etc.)
- `src/lib/convex/notifications.ts` (vérifier le contenu exact)
- `@convex-dev/resend` déjà installé (visible dans schema.ts avec `vEmailEvent`)
- `emailEvents` table pour le tracking Resend

**Ce qui manque :**
- Mutations de création de notifications (appelées par les mutations réservations)
- Mutation `markAsRead`
- Query `getMyNotifications` avec count non-lues
- Cron pour les rappels J-1
- UI : center de notifications (dropdown ou sidebar) + badge
- Templates emails

---

## 🔒 Contraintes absolues

1. **Temps réel** : le badge de notifications doit se mettre à jour instantanément via Convex reactive queries (pas de polling)
2. **Isolation** : une notification appartient à un userId ET un organizationId — jamais inter-orgs
3. **Emails** : utiliser `@convex-dev/resend` (pas Nodemailer, pas fetch direct)
4. **Cron rappel J-1** : tourner toutes les heures, pas toutes les minutes
5. **Max 50 notifications** chargées en une fois (pagination)

---

## 📊 Schéma Convex exact — table `notifications`

```typescript
notifications: defineTable({
  organizationId: v.id('organizations'),
  userId: v.string(),    // destinataire (Better Auth string ID)
  type: v.union(
    v.literal('RESERVATION_CONFIRMED'),
    v.literal('RESERVATION_CANCELLED'),
    v.literal('RESERVATION_REMINDER'),
    v.literal('CONFLICT_DETECTED'),
    v.literal('VEHICLE_RETURNED'),
    v.literal('MAINTENANCE_DUE'),
    v.literal('UNDERUTILIZED_VEHICLE'),
    v.literal('LEASE_EXPIRING')
  ),
  title: v.string(),
  message: v.string(),
  link: v.optional(v.string()),
  vehicleId: v.optional(v.id('vehicles')),
  isRead: v.boolean(),
  createdAt: v.number()
})
  .index('by_user', ['userId'])
  .index('by_user_unread', ['userId', 'isRead'])
  .index('by_user_and_created', ['userId', 'createdAt'])
  .index('by_org', ['organizationId'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/notifications.ts              → compléter avec toutes les fonctions
src/lib/convex/crons.ts                      → ajouter cron rappel J-1
src/lib/components/notifications/
  notification-center.svelte                 → dropdown avec liste
  notification-badge.svelte                  → badge rouge avec count
  notification-item.svelte
src/lib/components/authenticated/authenticated-header.svelte  → intégrer le badge
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Fonctions Convex dans `notifications.ts`

```typescript
import { v } from 'convex/values';
import { authedQuery, authedMutation } from './functions';
import { internalMutation } from './_generated/server';

// Query : mes notifications (max 50, triées par date desc)
export const getMyNotifications = authedQuery({
  args: { onlyUnread: v.optional(v.boolean()) },
  handler: async (ctx, { onlyUnread }) => {
    const query = onlyUnread
      ? ctx.db.query('notifications').withIndex('by_user_unread', q => q.eq('userId', ctx.user._id).eq('isRead', false))
      : ctx.db.query('notifications').withIndex('by_user_and_created', q => q.eq('userId', ctx.user._id));
    
    const notifications = await query.order('desc').take(50);
    const unreadCount = await ctx.db
      .query('notifications')
      .withIndex('by_user_unread', q => q.eq('userId', ctx.user._id).eq('isRead', false))
      .collect()
      .then(r => r.length);
    
    return { notifications, unreadCount };
  }
});

// Mutation : marquer comme lue
export const markAsRead = authedMutation({
  args: { notificationId: v.id('notifications') },
  handler: async (ctx, { notificationId }) => {
    const notif = await ctx.db.get(notificationId);
    if (!notif || notif.userId !== ctx.user._id) return; // silently ignore
    await ctx.db.patch(notificationId, { isRead: true });
  }
});

// Mutation : tout marquer comme lu
export const markAllAsRead = authedMutation({
  args: {},
  handler: async (ctx) => {
    const unread = await ctx.db
      .query('notifications')
      .withIndex('by_user_unread', q => q.eq('userId', ctx.user._id).eq('isRead', false))
      .collect();
    await Promise.all(unread.map(n => ctx.db.patch(n._id, { isRead: true })));
  }
});

// Internal mutation : créer une notification (appelée par réservations, crons, etc.)
export const createNotification = internalMutation({
  args: {
    organizationId: v.id('organizations'),
    userId: v.string(),
    type: v.union(
      v.literal('RESERVATION_CONFIRMED'),
      v.literal('RESERVATION_CANCELLED'),
      v.literal('RESERVATION_REMINDER'),
      v.literal('CONFLICT_DETECTED'),
      v.literal('VEHICLE_RETURNED'),
      v.literal('MAINTENANCE_DUE'),
      v.literal('UNDERUTILIZED_VEHICLE'),
      v.literal('LEASE_EXPIRING')
    ),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    vehicleId: v.optional(v.id('vehicles'))
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('notifications', {
      ...args,
      isRead: false,
      createdAt: Date.now()
    });
  }
});
```

### Étape 2 — Internal action pour envoyer un email Resend

```typescript
// src/lib/convex/notifications.ts — ajouter
import { Resend } from '@convex-dev/resend';
import { components } from './_generated/api';

const resend = new Resend(components.resend);

export const sendReservationConfirmedEmail = internalAction({
  args: {
    toEmail: v.string(),
    toName: v.string(),
    vehicleLabel: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    purpose: v.string(),
    reservationId: v.id('reservations')
  },
  handler: async (ctx, args) => {
    const startStr = new Date(args.startDate).toLocaleString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Paris'
    });
    const endStr = new Date(args.endDate).toLocaleString('fr-FR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris'
    });
    
    await resend.sendEmail(ctx, {
      from: 'Mycelium Fleet <noreply@mycelium-fleet.com>',
      to: args.toEmail,
      subject: `Réservation confirmée — ${args.vehicleLabel}`,
      html: `
        <h2>Votre réservation est confirmée</h2>
        <p>Bonjour ${args.toName},</p>
        <p>Votre réservation a été confirmée :</p>
        <ul>
          <li><strong>Véhicule :</strong> ${args.vehicleLabel}</li>
          <li><strong>Du :</strong> ${startStr}</li>
          <li><strong>Au :</strong> ${endStr}</li>
          <li><strong>Motif :</strong> ${args.purpose}</li>
        </ul>
        <p><a href="${process.env.APP_URL}/app/reservations/${args.reservationId}">Voir ma réservation</a></p>
      `
    });
  }
});
```

### Étape 3 — Cron rappel J-1 dans `crons.ts`

```typescript
// src/lib/convex/crons.ts — ajouter à la liste des crons existants
import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Rappel J-1 : tourner chaque heure à :00
crons.hourly('reservation-reminders', { minuteUTC: 0 }, internal.crons.sendDayBeforeReminders);

export default crons;
```

```typescript
// internal mutation/action pour les rappels
export const sendDayBeforeReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const tomorrowStart = now + 23 * 60 * 60 * 1000;
    const tomorrowEnd = now + 25 * 60 * 60 * 1000;
    
    // Trouver les réservations qui commencent demain (dans 23h-25h)
    // Pour chaque une : créer notification + envoyer email
    // Utiliser ctx.runQuery + ctx.runMutation
  }
});
```

### Étape 4 — Composant `notification-center.svelte`

```svelte
<script lang="ts">
  import { useQuery, useMutation } from 'convex-svelte';
  import { api } from '$lib/convex/_generated/api';
  import { Bell } from 'lucide-svelte';

  let isOpen = $state(false);
  const data = useQuery(api.notifications.getMyNotifications, { onlyUnread: false });
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const markAsRead = useMutation(api.notifications.markAsRead);

  // Icône dans le header avec badge
  // Badge : data.data?.unreadCount > 0 → cercle rouge avec le count
</script>

<div class="relative">
  <button onclick={() => isOpen = !isOpen} class="relative">
    <Bell size={20} />
    {#if (data.data?.unreadCount ?? 0) > 0}
      <span class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
        {data.data?.unreadCount}
      </span>
    {/if}
  </button>

  {#if isOpen}
    <!-- Dropdown avec liste des notifications -->
    <!-- Chaque item : icône type + titre + message + date relative + point bleu si non lue -->
    <!-- Footer : "Tout marquer comme lu" -->
  {/if}
</div>
```

### Icônes par type de notification

```typescript
const NOTIFICATION_ICONS = {
  RESERVATION_CONFIRMED: '✅',
  RESERVATION_CANCELLED: '❌',
  RESERVATION_REMINDER: '⏰',
  CONFLICT_DETECTED: '⚠️',
  VEHICLE_RETURNED: '🔑',
  MAINTENANCE_DUE: '🔧',
  UNDERUTILIZED_VEHICLE: '📊',
  LEASE_EXPIRING: '📅'
};
```

---

## ✅ Critères d'acceptation

- [ ] Badge de notifications dans le header se met à jour en temps réel (Convex reactive)
- [ ] Click sur badge ouvre le center avec la liste des notifications
- [ ] Click sur une notification la marque comme lue ET navigue vers le lien
- [ ] Bouton "Tout marquer comme lu" fonctionne
- [ ] Email de confirmation envoyé quand une réservation est créée (test avec une vraie adresse)
- [ ] Rappel email J-1 fonctionnel (cron toutes les heures)
- [ ] Notifications vides : empty state "Aucune notification" avec icône
- [ ] Max 50 notifications chargées (les plus récentes)

---

## 🚫 NE PAS FAIRE

- Ne pas exposer les notifications d'autres users ou d'autres orgs
- Ne pas créer des notifications en boucle (vérifier qu'un rappel n'a pas déjà été envoyé)
- Ne pas utiliser `fetch` direct vers l'API Resend — utiliser le composant `@convex-dev/resend`
- Ne pas polluer le badge avec 99+ notifications non lues — les paginer
- Ne pas créer de long polling ou WebSocket custom — Convex gère le temps réel

---

## 🧪 Tests requis

```typescript
test('badge count s\'incrémente à la création d\'une réservation', ...);
test('marquer comme lu décrémente le badge', ...);
test('email envoyé à la confirmation de réservation', ...); // test avec Resend sandbox
```

---

## 💡 Textes des notifications (i18n-ready, en français pour MVP)

```typescript
export function buildNotificationContent(
  type: NotificationType,
  params: Record<string, string>
): { title: string; message: string } {
  switch (type) {
    case 'RESERVATION_CONFIRMED':
      return {
        title: 'Réservation confirmée',
        message: `${params.vehicleLabel} réservé du ${params.start} au ${params.end}`
      };
    case 'RESERVATION_CANCELLED':
      return {
        title: 'Réservation annulée',
        message: `Votre réservation du ${params.start} a été annulée`
      };
    case 'RESERVATION_REMINDER':
      return {
        title: 'Rappel — Demain',
        message: `N'oubliez pas votre ${params.vehicleLabel} demain à ${params.time}`
      };
    case 'MAINTENANCE_DUE':
      return {
        title: 'Entretien planifié',
        message: `${params.vehicleLabel} est dû pour entretien dans ${params.daysLeft} jours`
      };
    case 'LEASE_EXPIRING':
      return {
        title: 'Leasing expirant',
        message: `Le contrat de ${params.vehicleLabel} expire dans ${params.daysLeft} jours`
      };
    default:
      return { title: 'Notification', message: '' };
  }
}
```
