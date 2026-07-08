---
priority: 31
feature: Sidebar admin simplifiée — 10 sections → 6 avec onglets intégrés
sprint: Commercial S1
version: V3 — Service Fleet Care
effort: 3 jours
depends_on: —
blocks: P33
model_recommended: — (refactoring navigation, aucun appel LLM)
pricing_tier: tous tiers (amélioration UX, pas de feature gating)
---

# P31 — Sidebar Admin Simplifiée

## 🎯 Mission

L'espace `/admin` a été construit en ajoutant des features au fil des sprints. Résultat : 10 sections de premier niveau dans la sidebar, 30+ routes. Un DAF qui ouvre Mycelium pour la première fois est perdu.

Ce prompt restructure la navigation admin en **6 sections principales** avec les features actuelles organisées en onglets à l'intérieur de chaque section. Aucune feature n'est supprimée — tout est accessible, mais la hiérarchie est clarifiée.

**Changement clé :** Finance devient un espace unifié (Fiscal, BIK, Frais, Carburant étaient 4 entrées séparées). Conformité regroupe Infractions, Sinistres, Compliance, BiK UK, Durabilité. Intégrations regroupe Connecteurs comptables, API, Calendriers, SmartCar.

**Ce prompt ne touche pas :**
- Le contenu des pages existantes (zéro régression)
- Les routes (toujours accessibles — on réorganise uniquement la sidebar et les layouts)
- Le design system (même composants, mêmes tokens)

---

## 📍 État actuel du codebase

**Sidebar actuelle** dans `src/routes/[[lang]]/admin/+layout.svelte` :

| Section | Routes actuelles |
|---------|-----------------|
| Dashboard | `/admin/dashboard` |
| Flotte | `/admin/fleet`, `/admin/fleet/new`, `/admin/fleet/[vehicleId]` |
| Réservations | `/admin/reservations`, `/admin/reservations/[id]` |
| Maintenance | `/admin/maintenance`, `/admin/maintenance/[id]` |
| Conducteurs | `/admin/drivers`, `/admin/drivers/[userId]` |
| Finance | `/admin/finance`, `/admin/finance/costs` |
| Fiscal | `/admin/finance/fiscal` |
| BiK UK | `/admin/finance/bik` |
| Durabilité | `/admin/sustainability`, `/admin/sustainability/esrs-e1` |
| Infractions | `/admin/violations` |
| Sinistres | `/admin/incidents` |
| Conformité | `/admin/compliance` |
| Frais IK | `/admin/expenses` |
| Carburant | `/admin/finance/fuel-import` |
| Intégrations | `/admin/settings/integrations` |
| Support | `/admin/support` ← à déprécier |
| Paramètres | `/admin/settings/organization`, `/admin/settings/members`, etc. |

**Structure des tabs** : pas encore implémentée dans `/admin` (les tabs existent dans les composants UI `src/lib/components/ui/tabs/`).

---

## 🔒 Contraintes absolues

1. **Zéro régression** — chaque URL existante reste accessible (pas de 404). Si une page quitte la sidebar, ses sous-routes restent routées.
2. **Guards inchangés** — `ORG_ADMIN` guard sur les pages sensibles reste en place.
3. **Pas de migration de données** — changement 100% frontend/navigation.
4. **Design system intact** — utiliser les composants `Tabs` existants de `src/lib/components/ui/tabs/`.
5. **`/admin/support`** : garder la route et la page existante, juste la retirer de la sidebar. Ne pas supprimer le fichier.

---

## 📁 Fichiers à créer / modifier

```
src/routes/[[lang]]/admin/+layout.svelte          → MODIFIER : restructurer navItems (6 sections)

src/routes/[[lang]]/admin/fleet/+page.svelte       → MODIFIER : ajouter onglets Véhicules·Réservations·Maintenance·Conducteurs
src/routes/[[lang]]/admin/finance/+page.svelte     → MODIFIER : ajouter onglets Vue d'ensemble·Coûts·Frais IK·Carburant·Fiscal
src/routes/[[lang]]/admin/compliance/+page.svelte  → MODIFIER : ajouter onglets Infractions·Sinistres·Conformité·BiK UK·Durabilité
src/routes/[[lang]]/admin/settings/integrations/+page.svelte → MODIFIER : ajouter onglets Connecteurs·API·Calendriers·SmartCar
src/routes/[[lang]]/admin/settings/+page.svelte    → CRÉER si absent : redirect vers /admin/settings/organization
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Restructurer `navItems` dans le layout admin

Dans `src/routes/[[lang]]/admin/+layout.svelte`, remplacer le tableau `navItems` existant :

```typescript
const navItems = $derived([
  {
    href: localizedHref('/admin/dashboard'),
    label: 'Dashboard',
    icon: LayoutDashboardIcon,
    active: page.url.pathname.endsWith('/dashboard')
  },
  {
    href: localizedHref('/admin/fleet'),
    label: 'Flotte',
    icon: CarIcon,
    active: page.url.pathname.includes('/admin/fleet') ||
            page.url.pathname.includes('/admin/reservations') ||
            page.url.pathname.includes('/admin/maintenance') ||
            page.url.pathname.includes('/admin/drivers')
  },
  {
    href: localizedHref('/admin/finance'),
    label: 'Finance',
    icon: WalletIcon,
    active: page.url.pathname.includes('/admin/finance') ||
            page.url.pathname.includes('/admin/expenses')
  },
  {
    href: localizedHref('/admin/compliance'),
    label: 'Conformité',
    icon: ShieldCheckIcon,
    active: page.url.pathname.includes('/admin/compliance') ||
            page.url.pathname.includes('/admin/violations') ||
            page.url.pathname.includes('/admin/incidents') ||
            page.url.pathname.includes('/admin/sustainability') ||
            page.url.pathname.includes('/admin/finance/bik')
  },
  {
    href: localizedHref('/admin/settings/integrations'),
    label: 'Intégrations',
    icon: PlugIcon,
    active: page.url.pathname.includes('/admin/settings/integrations')
  },
  {
    href: localizedHref('/admin/settings/organization'),
    label: 'Paramètres',
    icon: SettingsIcon,
    active: page.url.pathname.includes('/admin/settings') &&
            !page.url.pathname.includes('/admin/settings/integrations')
  }
]);
```

### Étape 2 — Onglets Flotte (`/admin/fleet/+page.svelte`)

Transformer la page `/admin/fleet` en hub avec 4 onglets. Les onglets pointent vers les pages existantes, pas de duplication de contenu — juste la navigation par tabs.

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { localizedHref } from '$lib/utils/i18n';
  import * as Tabs from '$lib/components/ui/tabs';

  // Active tab inferred from URL — /admin/fleet = véhicules, /admin/reservations = réservations, etc.
  const activeTab = $derived.by(() => {
    const path = page.url.pathname;
    if (path.includes('/reservations')) return 'reservations';
    if (path.includes('/maintenance')) return 'maintenance';
    if (path.includes('/drivers')) return 'conducteurs';
    return 'vehicules';
  });

  function navigateTab(tab: string) {
    const routes: Record<string, string> = {
      vehicules: '/admin/fleet',
      reservations: '/admin/reservations',
      maintenance: '/admin/maintenance',
      conducteurs: '/admin/drivers'
    };
    goto(resolve(localizedHref(routes[tab])));
  }
</script>

<div class="flex flex-col gap-0">
  <div class="border-b border-border bg-background px-6 pt-6">
    <h1 class="text-xl font-semibold tracking-tight mb-4">Flotte</h1>
    <Tabs.Root value={activeTab} onValueChange={navigateTab}>
      <Tabs.List class="h-9">
        <Tabs.Trigger value="vehicules">Véhicules</Tabs.Trigger>
        <Tabs.Trigger value="reservations">Réservations</Tabs.Trigger>
        <Tabs.Trigger value="maintenance">Maintenance</Tabs.Trigger>
        <Tabs.Trigger value="conducteurs">Conducteurs</Tabs.Trigger>
      </Tabs.List>
    </Tabs.Root>
  </div>
  <!-- Le contenu est rendu par les pages enfants via le layout. -->
  <!-- Ce composant gère uniquement la barre de navigation par onglets. -->
</div>
```

**Important :** `/admin/fleet/+page.svelte` ne doit plus contenir le contenu liste véhicules — celui-ci reste dans la page existante. Cette page devient un "hub header" avec les tabs, et les sous-routes gardent leur contenu actuel. Ou alternativement, garder le pattern actuel mais avec un composant `FleetTabNav` dans chaque page concernée.

**Approche recommandée** (moins invasive) : ajouter un composant `FleetTabNav.svelte` et l'inclure en haut de chaque page existante (fleet, reservations, maintenance, drivers) plutôt que de tout centraliser dans un layout.

```svelte
<!-- src/lib/components/admin/FleetTabNav.svelte -->
<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { localizedHref } from '$lib/utils/i18n';
  import * as Tabs from '$lib/components/ui/tabs';

  const TABS = [
    { value: 'vehicules', label: 'Véhicules', path: '/admin/fleet' },
    { value: 'reservations', label: 'Réservations', path: '/admin/reservations' },
    { value: 'maintenance', label: 'Maintenance', path: '/admin/maintenance' },
    { value: 'conducteurs', label: 'Conducteurs', path: '/admin/drivers' }
  ];

  const activeTab = $derived.by(() => {
    const path = page.url.pathname;
    if (path.includes('/reservations')) return 'reservations';
    if (path.includes('/maintenance')) return 'maintenance';
    if (path.includes('/drivers')) return 'conducteurs';
    return 'vehicules';
  });
</script>

<div class="border-b border-border">
  <Tabs.Root value={activeTab} onValueChange={(v) => {
    const tab = TABS.find(t => t.value === v);
    if (tab) goto(resolve(localizedHref(tab.path)));
  }}>
    <Tabs.List class="mx-6 h-10 gap-0 rounded-none border-none bg-transparent p-0">
      {#each TABS as tab}
        <Tabs.Trigger
          value={tab.value}
          class="rounded-none border-b-2 border-transparent px-4 data-[state=active]:border-[var(--brand)] data-[state=active]:bg-transparent data-[state=active]:shadow-none"
        >
          {tab.label}
        </Tabs.Trigger>
      {/each}
    </Tabs.List>
  </Tabs.Root>
</div>
```

Appliquer le même pattern pour `FinanceTabNav`, `ConformiteTabNav`, `SettingsTabNav`.

### Étape 3 — Onglets Finance

**Pages dans Finance :**
- `/admin/finance` → Vue d'ensemble
- `/admin/finance/costs` → Coûts détaillés
- `/admin/expenses` → Frais IK
- `/admin/finance/fuel-import` → Import carburant
- `/admin/finance/fiscal` → Optimisation fiscale

Créer `src/lib/components/admin/FinanceTabNav.svelte` sur le même pattern. L'ajouter en haut de chacune de ces pages.

### Étape 4 — Onglets Conformité

**Pages dans Conformité :**
- `/admin/compliance` → Vue d'ensemble Compliance Agent
- `/admin/violations` → Infractions
- `/admin/incidents` → Sinistres
- `/admin/finance/bik` → BiK UK
- `/admin/sustainability` → Durabilité/CSRD

Créer `ConformiteTabNav.svelte`.

### Étape 5 — Onglets Paramètres

**Pages dans Paramètres :**
- `/admin/settings/organization` → Organisation
- `/admin/settings/members` → Équipe & invitations
- `/admin/settings/notifications` → Notifications
- `/admin/settings/plans` → Plans & facturation

Créer `SettingsTabNav.svelte`.

### Étape 6 — Déprécier `/admin/support` dans la sidebar

Retirer l'entrée sidebar support. La route reste fonctionnelle (ne pas supprimer le fichier). Si l'entrée sidebar pointe vers une page avec un bouton "Ouvrir le support", remplacer par : afficher un message "Contactez votre concierge via le chat IA" avec un lien vers le Copilot.

```svelte
<!-- Dans /admin/support/+page.svelte — remplacer le contenu par : -->
<div class="flex flex-col items-center justify-center py-24 gap-4">
  <MessageCircleIcon class="size-12 text-muted-foreground" />
  <h2 class="text-lg font-semibold">Contactez votre concierge</h2>
  <p class="text-sm text-muted-foreground text-center max-w-sm">
    Pour toute question ou problème, votre concierge Mycelium est disponible directement depuis le chat IA.
  </p>
  <Button onclick={() => copilotStore.open()}>
    Ouvrir le chat
  </Button>
</div>
```

---

## ✅ Critères d'acceptation

- [ ] Sidebar admin affiche exactement 6 entrées principales (Dashboard · Flotte · Finance · Conformité · Intégrations · Paramètres)
- [ ] Chaque ancienne route est toujours accessible (test manuel : ouvrir chaque URL directement)
- [ ] L'onglet actif est correctement mis en surbrillance en fonction de l'URL
- [ ] Aucun lien "Support" dans la sidebar admin
- [ ] `FleetTabNav` visible sur `/admin/fleet`, `/admin/reservations`, `/admin/maintenance`, `/admin/drivers`
- [ ] `FinanceTabNav` visible sur `/admin/finance`, `/admin/finance/costs`, `/admin/expenses`, `/admin/finance/fiscal`, `/admin/finance/fuel-import`, `/admin/finance/bik`
- [ ] `ConformiteTabNav` visible sur `/admin/compliance`, `/admin/violations`, `/admin/incidents`, `/admin/sustainability`
- [ ] Mobile : sidebar repliée par défaut, bouton hamburger fonctionnel (comportement existant maintenu)
- [ ] Aucune régression sur les guards `ORG_ADMIN`

---

## 🚫 NE PAS FAIRE

- Ne pas déplacer les fichiers de routes (les URLs doivent rester identiques)
- Ne pas supprimer `/admin/support/+page.svelte` — juste le retirer de la sidebar
- Ne pas recréer le contenu des pages dans le layout parent — les pages gardent leur propre contenu
- Ne pas changer le design des pages elles-mêmes (juste ajouter le composant TabNav en haut)
- Ne pas utiliser `<iframe>` ou des wrappers complexes — les tabs pointent vers les routes existantes via `goto()`
- Ne pas créer un layout imbriqué pour les onglets si les routes n'ont pas de layout partagé naturel — le composant standalone `*TabNav` est plus simple et moins risqué
