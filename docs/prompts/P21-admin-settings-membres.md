---
priority: 21
feature: Admin settings — Gestion membres, invitations, rôles, offboarding
sprint: S11 (V1.5)
version: V1.5 — Premiers payants consolidés
effort: 2 jours
depends_on: P01 (auth multi-tenant)
blocks: P11 (conducteurs — dépend de la liste membres)
model_recommended: —
pricing_tier: Tous les tiers
---

# P21 — Admin settings : gestion membres & invitations

## 🎯 Mission

Permettre à un ORG_ADMIN de **gérer les membres de son organisation** : inviter de nouveaux salariés par email, changer les rôles, désactiver des comptes (offboarding). C'est le socle de l'adoption : sans invitation simple, l'admin doit créer lui-même chaque compte salarié. Objectif : onboarder une entreprise de 50 salariés en 10 minutes.

**Exemple de valeur :**
> L'admin RH importe une liste de 30 emails, clique "Inviter". Chaque salarié reçoit un email "Bienvenue dans Mycelium — rejoignez la flotte de votre entreprise". L'admin voit en temps réel qui a accepté l'invitation.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `organizationMembers` avec `{ organizationId, userId, role, joinedAt }`
- Better Auth pour l'authentification
- Page `/admin/settings/organization` (FAIT — formulaire org)
- Infrastructure emails Resend (P06)

**Ce qui manque :**
- Table `invitations` : tokens d'invitation par email
- Page `/admin/settings/members` : liste membres + actions
- Endpoint SvelteKit pour accepter une invitation (lien email → création compte → rejoindre org)
- Mutation `inviteMember` + `acceptInvitation` + `removeMember` + `updateMemberRole`
- Email d'invitation branded Mycelium
- Page d'accueil invitation `/join/[token]`

---

## 🔒 Contraintes absolues

1. **Token sécurisé** : tokens d'invitation = UUID v4 à usage unique avec expiration 7 jours.
2. **Multi-tenant strict** : un admin ne peut inviter que dans son organisation courante. Vérifier `requireOrgAdmin` sur toutes les mutations.
3. **Pas de suppression de compte** : l'offboarding = `isActive: false` sur `organizationMembers` + révocation des sessions actives. Le compte Better Auth reste intact.
4. **Un seul ORG_ADMIN minimum** : empêcher la suppression du dernier ORG_ADMIN de l'organisation.
5. **Email invitation** : envoyé via Resend. Si l'email est déjà un utilisateur Mycelium (autre org) → invitation directe. Sinon → création de compte à l'acceptation.

---

## 📊 Nouveau schéma Convex

### `invitations`

```typescript
invitations: defineTable({
  organizationId: v.id('organizations'),
  email: v.string(),
  role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MANAGER'), v.literal('ORG_MEMBER')),
  token: v.string(),            // UUID v4 unique
  invitedBy: v.string(),        // userId de l'admin
  expiresAt: v.number(),        // timestamp, 7 jours
  status: v.union(
    v.literal('PENDING'),
    v.literal('ACCEPTED'),
    v.literal('EXPIRED'),
    v.literal('CANCELLED')
  ),
  acceptedAt: v.optional(v.number()),
  createdAt: v.number()
})
  .index('by_org', ['organizationId'])
  .index('by_token', ['token'])
  .index('by_email_and_org', ['email', 'organizationId'])
  .index('by_org_and_status', ['organizationId', 'status'])
```

**Ajouter à `organizationMembers`** :

```typescript
isActive: v.optional(v.boolean()),    // false = désactivé (offboarding)
invitationId: v.optional(v.id('invitations')),
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/schema.ts                    → invitations + organizationMembers.isActive
src/lib/convex/members.ts                   → NOUVEAU : mutations membres + invitations

src/routes/[[lang]]/admin/settings/
  members/+page.svelte                      → NOUVEAU : gestion membres
src/routes/[[lang]]/join/
  [token]/+page.svelte                      → NOUVEAU : page acceptation invitation
  [token]/+page.server.ts                   → validation token + redirect

src/lib/components/settings/
  members-table.svelte                      → table membres avec actions inline
  invite-modal.svelte                       → modal invitation (email + rôle)
  role-badge.svelte                         → badge coloré ORG_ADMIN / ORG_MANAGER / ORG_MEMBER
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Mutations `members.ts`

```typescript
// src/lib/convex/members.ts
import { v4 as uuidv4 } from 'uuid'; // bun add uuid + @types/uuid

export const inviteMember = authedMutation({
  args: {
    email: v.string(),
    role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MANAGER'), v.literal('ORG_MEMBER'))
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    // Vérifier si l'email est déjà membre actif
    const existing = await ctx.db
      .query('invitations')
      .withIndex('by_email_and_org', q => q.eq('email', args.email).eq('organizationId', organizationId))
      .filter(q => q.eq(q.field('status'), 'PENDING'))
      .first();

    if (existing) throw new ConvexError('Une invitation en attente existe déjà pour cet email');

    const token = uuidv4();
    const invitationId = await ctx.db.insert('invitations', {
      organizationId,
      email: args.email,
      role: args.role,
      token,
      invitedBy: ctx.user._id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      status: 'PENDING',
      createdAt: Date.now()
    });

    // Déclencher l'email (via scheduler pour ne pas bloquer la mutation)
    await ctx.scheduler.runAfter(0, internal.members.sendInvitationEmail, {
      invitationId,
      email: args.email,
      role: args.role,
      organizationId
    });

    return invitationId;
  }
});

export const bulkInviteMembers = authedMutation({
  args: {
    emails: v.array(v.string()),
    role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MANAGER'), v.literal('ORG_MEMBER'))
  },
  handler: async (ctx, args) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    if (args.emails.length > 100) throw new ConvexError('Maximum 100 invitations à la fois');

    const results = { sent: 0, skipped: 0 };
    for (const email of args.emails) {
      const existing = await ctx.db
        .query('invitations')
        .withIndex('by_email_and_org', q => q.eq('email', email).eq('organizationId', organizationId))
        .filter(q => q.eq(q.field('status'), 'PENDING'))
        .first();
      if (existing) { results.skipped++; continue; }

      const token = uuidv4();
      const invitationId = await ctx.db.insert('invitations', {
        organizationId, email, role: args.role, token,
        invitedBy: ctx.user._id,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        status: 'PENDING',
        createdAt: Date.now()
      });

      await ctx.scheduler.runAfter(results.sent * 200, internal.members.sendInvitationEmail, {
        invitationId, email, role: args.role, organizationId
      });
      results.sent++;
    }
    return results;
  }
});

export const updateMemberRole = authedMutation({
  args: {
    targetUserId: v.string(),
    newRole: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MANAGER'), v.literal('ORG_MEMBER'))
  },
  handler: async (ctx, { targetUserId, newRole }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    // Empêcher de se rétrograder soi-même si on est le seul admin
    if (newRole !== 'ORG_ADMIN' && targetUserId === ctx.user._id) {
      const adminCount = await ctx.db
        .query('organizationMembers')
        .withIndex('by_organization', q => q.eq('organizationId', organizationId))
        .filter(q => q.and(
          q.eq(q.field('role'), 'ORG_ADMIN'),
          q.neq(q.field('isActive'), false)
        ))
        .collect();
      if (adminCount.length <= 1) throw new ConvexError('Impossible : vous êtes le seul administrateur');
    }

    const member = await ctx.db
      .query('organizationMembers')
      .withIndex('by_organization', q => q.eq('organizationId', organizationId))
      .filter(q => q.eq(q.field('userId'), targetUserId))
      .unique();
    if (!member) throw new ConvexError('Membre introuvable');

    await ctx.db.patch(member._id, { role: newRole });
  }
});

export const deactivateMember = authedMutation({
  args: { targetUserId: v.string() },
  handler: async (ctx, { targetUserId }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    if (targetUserId === ctx.user._id) throw new ConvexError('Vous ne pouvez pas désactiver votre propre compte');

    const member = await ctx.db
      .query('organizationMembers')
      .withIndex('by_organization', q => q.eq('organizationId', organizationId))
      .filter(q => q.eq(q.field('userId'), targetUserId))
      .unique();
    if (!member) throw new ConvexError('Membre introuvable');

    await ctx.db.patch(member._id, { isActive: false });
    // Note : les réservations futures du membre doivent être annulées — à implémenter si nécessaire
  }
});

export const cancelInvitation = authedMutation({
  args: { invitationId: v.id('invitations') },
  handler: async (ctx, { invitationId }) => {
    const { organizationId } = await getUserOrg(ctx);
    await requireOrgAdmin(ctx, organizationId);

    const invitation = await ctx.db.get(invitationId);
    if (!invitation || invitation.organizationId !== organizationId)
      throw new ConvexError('Invitation introuvable');

    await ctx.db.patch(invitationId, { status: 'CANCELLED' });
  }
});
```

### Étape 2 — Action email d'invitation

```typescript
export const sendInvitationEmail = internalAction({
  args: {
    invitationId: v.id('invitations'),
    email: v.string(),
    role: v.string(),
    organizationId: v.id('organizations')
  },
  handler: async (ctx, args) => {
    const org = await ctx.runQuery(internal.organizations.getOrgInternal, { organizationId: args.organizationId });
    const invitation = await ctx.runQuery(internal.members.getInvitationInternal, { invitationId: args.invitationId });

    const joinUrl = `${process.env.APP_URL}/join/${invitation.token}`;
    const roleLabel = args.role === 'ORG_ADMIN' ? 'Administrateur' : args.role === 'ORG_MANAGER' ? 'Gestionnaire' : 'Membre';

    await resend.sendEmail(ctx, {
      from: 'Mycelium Fleet OS <invitations@mycelium-fleet.com>',
      to: args.email,
      subject: `Invitation à rejoindre ${org.name} sur Mycelium`,
      html: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #0f0f0f; padding: 24px; border-radius: 12px; margin-bottom: 24px;">
    <h1 style="color: #f5e642; margin: 0; font-size: 20px;">🌿 Mycelium Fleet OS</h1>
  </div>
  <h2>Vous êtes invité à rejoindre ${org.name}</h2>
  <p>Votre rôle : <strong>${roleLabel}</strong></p>
  <p>Cliquez sur le bouton ci-dessous pour créer votre compte et rejoindre la flotte :</p>
  <p style="margin: 24px 0;">
    <a href="${joinUrl}" style="background: #f5e642; color: #000; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
      Rejoindre ${org.name} →
    </a>
  </p>
  <p style="color: #888; font-size: 13px;">Ce lien expire dans 7 jours. Si vous n'attendiez pas cette invitation, ignorez cet email.</p>
</body>
</html>`
    });
  }
});
```

### Étape 3 — Page d'acceptation `/join/[token]`

```typescript
// src/routes/[[lang]]/join/[token]/+page.server.ts
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  // Vérifier le token via Convex (fetch HTTP)
  const res = await fetch(`${process.env.CONVEX_SITE_URL}/validateInvitationToken`, {
    method: 'POST',
    body: JSON.stringify({ token: params.token })
  });
  const invitation = await res.json();

  if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt < Date.now()) {
    return { valid: false, error: 'Cette invitation a expiré ou est invalide.' };
  }

  return { valid: true, invitation, orgName: invitation.orgName };
};
```

```svelte
<!-- /join/[token]/+page.svelte -->
<!-- Si l'user est déjà connecté → rejoindre directement -->
<!-- Sinon → formulaire signup simplifié (prénom, nom, mot de passe) -->
```

### Étape 4 — UI `/admin/settings/members`

```
┌───────────────────────────────────────────────────────────────────┐
│  Membres (23)                    [Inviter] [Importer CSV]          │
├───────────────────────────────────────────────────────────────────┤
│  ⏳ 3 invitations en attente                                       │
│  sophie@example.com · ORG_MEMBER · envoyé 12/06                   │
│  marc@example.com   · ORG_MANAGER · envoyé 11/06   [Annuler]      │
├───────────────────────────────────────────────────────────────────┤
│  Membres actifs                                                    │
│  NOM             EMAIL              RÔLE         DEPUIS  ACTIONS  │
│  Jean Dupont     jean@corp.fr       ORG_ADMIN    01/03   [·····]  │
│  Marie Martin    marie@corp.fr      ORG_MEMBER   15/03   [Rôle ▾] [Désactiver] │
│                                                                   │
│  Membres désactivés (2)  [Afficher]                               │
└───────────────────────────────────────────────────────────────────┘
```

---

## ✅ Critères d'acceptation

- [ ] Admin peut inviter un membre par email (formulaire individuel)
- [ ] Admin peut inviter en bulk via textarea multi-emails (max 100)
- [ ] Email d'invitation reçu avec lien `/join/[token]`
- [ ] Lien expiré après 7 jours → message d'erreur clair
- [ ] Admin peut changer le rôle d'un membre existant
- [ ] Admin peut désactiver un membre (offboarding — ne supprime pas le compte)
- [ ] Impossible de désactiver le dernier ORG_ADMIN
- [ ] Invitations en attente listées séparément avec option d'annulation

---

## 🚫 NE PAS FAIRE

- Ne pas supprimer les comptes Better Auth — seulement `isActive: false` sur `organizationMembers`
- Ne pas permettre à un membre de s'auto-promouvoir ORG_ADMIN
- Ne pas envoyer de rappels automatiques d'invitation (hors scope V1.5) — juste l'envoi initial
- Ne pas implémenter la gestion multi-organisations depuis cette page (hors scope V1)
- Ne pas afficher les emails dans l'URL de la page de membres (confidentialité)
