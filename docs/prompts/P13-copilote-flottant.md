---
priority: 13
feature: Copilote IA flottant — FAB + panneau latéral (remplace chat plein écran)
sprint: S10 (V1.5)
version: V1.5 — Premiers payants consolidés
effort: 2 jours
depends_on: P03 (Agent Concierge), P07 (Agent Gestionnaire)
blocks: —
model_recommended: claude-sonnet-4-6
pricing_tier: Tous les tiers (Concierge inclus dès Starter 290€/mois)
---

# P13 — Copilote IA flottant

## 🎯 Mission

Remplacer l'interface chat plein écran actuelle (`/app`) par un **copilote flottant disponible sur toutes les pages** : un FAB (Floating Action Button) coin inférieur droit, qui ouvre un panneau latéral 420px. L'Agent Concierge est le défaut côté salarié ; l'Agent Gestionnaire est le défaut côté admin. Raccourci `Cmd+K` / `Ctrl+K` global.

**Avant :** L'utilisateur doit naviguer vers `/app` pour parler au Concierge.  
**Après :** L'utilisateur est sur `/admin/fleet`, presse `Cmd+K`, demande "Montre-moi les véhicules disponibles demain" — le panel s'ouvre et répond sans changer de page.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Chat Concierge plein écran dans `/src/routes/[[lang]]/app/+page.svelte`
- SSE streaming via proxy SvelteKit `/api/chat` → Convex httpAction
- `ManagerChat` composant flottant (bouton + panel 420px) dans l'espace admin (P07)
- Table `conversations` avec namespacing `:manager` pour le Gestionnaire
- Layout authenticated dans `authenticated-layout.svelte`

**Ce qui manque :**
- Composant `CopilotPanel` générique côté salarié
- FAB universel injecté dans les deux layouts (app + admin)
- Raccourci clavier `Cmd+K` global
- Page `/app` transformée en accueil salarié (dashboard, pas chat)

---

## 🔒 Contraintes absolues

1. **Pas de rupture des conversations existantes** : les tables `conversations` et les httpActions ne changent pas. Le panel appelle les mêmes endpoints SSE.
2. **La page `/app` ne disparaît pas** : elle devient un tableau de bord salarié (réservations du jour + quick actions). Le chat migre dans le panel flottant.
3. **Mobile-first** : sur mobile (< 768px), le panel est un bottom sheet plein écran, pas un panneau latéral.
4. **`ManagerChat` existant** : s'il existe déjà dans l'admin, le remplacer par le composant générique `CopilotPanel` paramétré avec `agent="manager"`. Ne pas doublon.
5. **Svelte 5 runes uniquement** : `$state`, `$derived`, `$effect` — interdiction de `$:` ou `export let`.

---

## 📁 Fichiers à créer / modifier

```
src/lib/components/copilot/
  copilot-store.ts                  → store $state global : isOpen, activeAgent
  copilot-fab.svelte                → FAB avec gestion Cmd+K
  copilot-panel.svelte              → panneau latéral générique (salarié + admin)

src/lib/components/authenticated/
  authenticated-layout.svelte       → MODIFIER : injecter CopilotFab + CopilotPanel
  authenticated-sidebar.svelte      → ne pas toucher (sidebar admin inchangée)

src/routes/[[lang]]/app/
  +page.svelte                      → MODIFIER : supprimer chat plein écran, dashboard salarié basique
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Store global `copilot-store.ts`

```typescript
// src/lib/components/copilot/copilot-store.ts
import { browser } from '$app/environment';

type AgentType = 'concierge' | 'manager';

function createCopilotStore() {
  let isOpen = $state(false);
  let activeAgent = $state<AgentType>('concierge');
  let inputDraft = $state('');

  function open(agent?: AgentType) {
    if (agent) activeAgent = agent;
    isOpen = true;
    if (browser) setTimeout(() => document.getElementById('copilot-input')?.focus(), 50);
  }

  function close() {
    isOpen = false;
    inputDraft = '';
  }

  function toggle(agent?: AgentType) {
    if (isOpen && (!agent || agent === activeAgent)) close();
    else open(agent);
  }

  return {
    get isOpen() { return isOpen; },
    get activeAgent() { return activeAgent; },
    get inputDraft() { return inputDraft; },
    set inputDraft(v: string) { inputDraft = v; },
    open, close, toggle
  };
}

export const copilot = createCopilotStore();
```

### Étape 2 — FAB `copilot-fab.svelte`

```svelte
<script lang="ts">
  import { copilot } from './copilot-store.ts';
  import { page } from '$app/stores';
  import { derived } from 'svelte/store';

  // Agent par défaut selon la route
  const defaultAgent = derived(page, ($p) =>
    $p.url.pathname.startsWith('/admin') ? 'manager' : 'concierge'
  );

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      copilot.toggle($defaultAgent);
    }
    if (e.key === 'Escape' && copilot.isOpen) copilot.close();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<button
  onclick={() => copilot.toggle($defaultAgent)}
  class="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] shadow-xl transition-transform hover:scale-105 active:scale-95 print:hidden"
  aria-label="Ouvrir le copilote IA (Cmd+K)"
>
  {#if copilot.isOpen}
    <svg class="h-5 w-5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  {:else}
    <!-- Sparkle/chat icon -->
    <svg class="h-6 w-6 text-black" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 1l2.39 6.26L21 9l-5.5 5.36L16.78 22 12 18.9 7.22 22l1.28-7.64L3 9l6.61-1.74z"/>
    </svg>
  {/if}
</button>
```

### Étape 3 — Panel `copilot-panel.svelte`

```svelte
<script lang="ts">
  import { copilot } from './copilot-store.ts';
  import { marked } from 'marked'; // déjà utilisé dans ManagerMessage

  let messages = $state<{ role: 'user' | 'assistant'; content: string }[]>([]);
  let isStreaming = $state(false);
  let inputValue = $state('');
  let messagesEl: HTMLDivElement;

  const endpoint = $derived(copilot.activeAgent === 'manager' ? '/api/manager' : '/api/chat');

  const quickPrompts = $derived(
    copilot.activeAgent === 'concierge'
      ? ['Réserver un véhicule pour demain', 'Voir mes réservations', 'Annuler une réservation']
      : ['Taux d\'utilisation ce mois', 'Véhicules sous-utilisés', 'Coûts par véhicule']
  );

  async function sendMessage() {
    const text = inputValue.trim();
    if (!text || isStreaming) return;
    inputValue = '';

    messages.push({ role: 'user', content: text });
    isStreaming = true;

    let assistantContent = '';
    messages.push({ role: 'assistant', content: '' });
    const idx = messages.length - 1;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'delta') {
              assistantContent += data.text;
              messages[idx] = { role: 'assistant', content: assistantContent };
            }
          } catch {}
        }
      }
    } finally {
      isStreaming = false;
      setTimeout(() => messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' }), 50);
    }
  }
</script>

{#if copilot.isOpen}
  <!-- Overlay mobile -->
  <div
    class="fixed inset-0 z-40 bg-black/50 md:hidden"
    onclick={() => copilot.close()}
    role="presentation"
  ></div>

  <!-- Panel -->
  <aside class="fixed bottom-0 right-0 z-50 flex h-[100dvh] w-full flex-col border-l border-[var(--border)] bg-[var(--bg)] shadow-2xl md:w-[420px]">

    <!-- Header -->
    <header class="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-4 py-3">
      <div class="flex items-center gap-2">
        <span class="text-lg text-[var(--brand)]">✦</span>
        <span class="font-semibold text-sm">
          {copilot.activeAgent === 'manager' ? 'Assistant Gestionnaire' : 'Concierge Mycelium'}
        </span>
      </div>
      <button onclick={() => copilot.close()} class="rounded p-1 text-[var(--muted)] hover:text-[var(--fg)]" aria-label="Fermer">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </header>

    <!-- Messages -->
    <div bind:this={messagesEl} class="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {#if messages.length === 0}
        <div class="py-8 text-center">
          <p class="mb-4 text-sm text-[var(--muted)]">
            {copilot.activeAgent === 'concierge'
              ? 'Bonjour ! Comment puis-je vous aider ?'
              : 'Interrogez votre flotte en langage naturel.'}
          </p>
          <div class="flex flex-wrap justify-center gap-2">
            {#each quickPrompts as prompt}
              <button
                onclick={() => { inputValue = prompt; document.getElementById('copilot-input')?.focus(); }}
                class="rounded-full border border-[var(--border)] px-3 py-1 text-xs hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
              >
                {prompt}
              </button>
            {/each}
          </div>
        </div>
      {:else}
        {#each messages as msg}
          <div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed {msg.role === 'user' ? 'bg-[var(--brand)] text-black' : 'bg-[var(--card)] text-[var(--fg)]'}">
              {#if msg.role === 'assistant' && msg.content}
                <!-- eslint-disable-next-line svelte/no-at-html-tags -->
                {@html marked.parse(msg.content)}
              {:else if msg.role === 'assistant' && isStreaming && msg === messages[messages.length - 1]}
                <span class="animate-pulse text-[var(--muted)]">▋</span>
              {:else}
                {msg.content}
              {/if}
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Input -->
    <footer class="shrink-0 border-t border-[var(--border)] p-4">
      <form onsubmit={(e) => { e.preventDefault(); sendMessage(); }} class="flex gap-2">
        <input
          id="copilot-input"
          bind:value={inputValue}
          placeholder={copilot.activeAgent === 'concierge'
            ? 'Ex: Je veux un véhicule lundi matin…'
            : 'Ex: Taux d\'utilisation ce mois ?'}
          class="flex-1 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)] disabled:opacity-50"
          disabled={isStreaming}
          autocomplete="off"
        />
        <button
          type="submit"
          disabled={isStreaming || !inputValue.trim()}
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand)] text-black disabled:opacity-40 transition-opacity"
          aria-label="Envoyer"
        >
          <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
          </svg>
        </button>
      </form>
      <p class="mt-2 text-center text-[10px] text-[var(--muted)]">Cmd+K · Échap pour fermer</p>
    </footer>
  </aside>
{/if}
```

### Étape 4 — Intégration dans le layout

```svelte
<!-- Dans authenticated-layout.svelte, ajouter dans <script> -->
import CopilotFab from '$lib/components/copilot/copilot-fab.svelte';
import CopilotPanel from '$lib/components/copilot/copilot-panel.svelte';

<!-- Ajouter juste avant </body> ou après le slot principal -->
<CopilotFab />
<CopilotPanel />
```

**Si `ManagerChat` existe déjà dans le layout admin**, le supprimer et utiliser `CopilotPanel` uniquement (éviter les doublons).

### Étape 5 — Nouvelle page `/app` : accueil salarié

Remplacer l'ancien chat plein écran par :

```
┌─────────────────────────────────────────────────────────┐
│  Bonjour Jean-Pierre 👋                                  │
├─────────────────────────────────────────────────────────┤
│  📅 Aujourd'hui                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │ Peugeot 308 · AB-123-CD    09h00 → 18h00        │    │
│  │ [Voir le détail]  [État des lieux]              │    │
│  └─────────────────────────────────────────────────┘    │
│  Aucune autre réservation aujourd'hui.                   │
├─────────────────────────────────────────────────────────┤
│  ⚡ Actions rapides                                      │
│  [+ Réserver un véhicule]  [📋 Mes réservations]         │
├─────────────────────────────────────────────────────────┤
│  💬 Parlez à votre Concierge (Cmd+K)                     │
│  "Réserve-moi un véhicule pour vendredi matin..."       │
│  [Ouvrir le Concierge →]                                │
└─────────────────────────────────────────────────────────┘
```

Query Convex nécessaire : `listMyTodayReservations` — filtre `userId = ctx.user._id` ET `startDate <= now AND endDate >= now` ou `startDate >= startOfToday AND startDate <= endOfToday`.

---

## ✅ Critères d'acceptation

- [ ] FAB visible sur toutes les pages `/app/*` et `/admin/*`, absent des pages publiques
- [ ] `Cmd+K` / `Ctrl+K` ouvre le panel sur toutes les pages authenticated
- [ ] Agent Concierge par défaut sur `/app/*`, Agent Gestionnaire par défaut sur `/admin/*`
- [ ] Streaming SSE fonctionnel dans le panel (même comportement que l'ancienne UI)
- [ ] Sur mobile (<768px), panel = bottom sheet plein écran
- [ ] Page `/app` = dashboard salarié, plus de chat plein écran
- [ ] `Echap` ferme le panel
- [ ] Aucun doublon avec `ManagerChat` existant si présent

---

## 🚫 NE PAS FAIRE

- Ne pas recréer la logique SSE — réutiliser `/api/chat` et `/api/manager` existants
- Ne pas stocker les messages locaux dans Convex en temps réel — uniquement à la soumission
- Ne pas utiliser `$:` ni `export let` — runes Svelte 5 uniquement
- Ne pas afficher le FAB sur les pages d'auth ou d'onboarding (`/login`, `/signup`, `/onboarding/*`)
- Ne pas toucher aux httpActions Convex existantes
