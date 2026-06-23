---
priority: 3
feature: Agent Concierge IA — Chat de réservation en langage naturel
sprint: S4
version: V1 MVP
effort: 4 jours
depends_on: P01 (véhicules), P02 (mutations réservations + getAvailableVehicles)
blocks: —
model_recommended: claude-haiku-4-5-20251001 (vitesse) ou claude-sonnet-4-6 (qualité)
---

# P03 — Agent Concierge IA

## 🎯 Mission
Le salarié réserve un véhicule en parlant en français naturel. L'agent comprend, vérifie la disponibilité via les outils Convex, et crée la réservation. C'est LE différenciateur central de Mycelium vs tous les concurrents.

**Expérience cible :** "J'ai besoin d'un véhicule jeudi pour aller à Lyon" → 2 messages max → réservation créée.

---

## 📍 État actuel du codebase

**Ce qui existe :**
- Table `conversations` dans schema.ts avec messages array complet
- `src/lib/convex/conversations.ts` → à vérifier ce qui existe
- Route `/app/+page.svelte` → probablement un shell vide
- Mutations réservations (P02)

**Ce qui manque :**
- Convex action `sendConciergeMessage` qui appelle Claude API avec tool use
- UI de chat dans `/app` avec streaming
- Persistence de la conversation via table `conversations`

---

## 🔒 Contraintes absolues

1. **Jamais d'hallucination sur la disponibilité** : l'agent DOIT appeler l'outil `searchAvailableVehicles` avant de proposer un véhicule. Interdit de confirmer une disponibilité sans l'avoir vérifiée via l'outil.
2. **Multi-tenancy** : l'agent n'a accès qu'aux véhicules de l'organisation du user
3. **Pas d'actions sans confirmation** : avant de créer une réservation, l'agent doit récapituler et demander confirmation
4. **Streaming** : les réponses arrivent en temps réel, caractère par caractère
5. **Modèle IA** : utiliser `claude-haiku-4-5-20251001` pour la vitesse, ou `claude-sonnet-4-6` pour la qualité
6. **API Anthropic** : utiliser le SDK `@anthropic-ai/sdk` depuis une **action Convex** (pas depuis le client SvelteKit)

---

## 📊 Schéma Convex exact — table `conversations`

```typescript
conversations: defineTable({
  organizationId: v.id('organizations'),
  userId: v.string(),
  messages: v.array(v.object({
    role: v.union(v.literal('user'), v.literal('assistant')),
    content: v.string(),
    timestamp: v.number(),
    toolCalls: v.optional(v.array(v.object({
      name: v.string(),
      input: v.string(),    // JSON stringifié
      output: v.optional(v.string())  // JSON stringifié
    })))
  })),
  createdAt: v.number(),
  updatedAt: v.number()
}).index('by_user_recent', ['userId', 'updatedAt'])
```

---

## 📁 Fichiers à créer / modifier

```
src/lib/convex/concierge.ts              → nouvelle action Convex (Claude API + tools)
src/lib/convex/conversations.ts          → mutations CRUD conversations
src/routes/[[lang]]/app/+page.svelte     → interface chat principale salarié
src/lib/components/concierge/
  chat-interface.svelte                  → composant chat complet
  message-bubble.svelte
  typing-indicator.svelte
  tool-call-display.svelte               → optionnel: afficher les outils utilisés
```

---

## 🔨 Implémentation — Étapes ordonnées

### Étape 1 — Définir les 4 outils Claude

```typescript
// src/lib/convex/concierge.ts

const CONCIERGE_TOOLS: Anthropic.Tool[] = [
  {
    name: 'searchAvailableVehicles',
    description: 'Recherche les véhicules disponibles pour une période donnée. OBLIGATOIRE avant de proposer un véhicule.',
    input_schema: {
      type: 'object',
      properties: {
        startDate: { type: 'string', description: 'Date et heure de début au format ISO 8601, ex: "2026-06-15T09:00:00"' },
        endDate: { type: 'string', description: 'Date et heure de fin au format ISO 8601' },
        category: {
          type: 'string',
          enum: ['PASSENGER', 'UTILITY', 'TRUCK'],
          description: 'Type de véhicule souhaité. PASSENGER=voiture, UTILITY=utilitaire, TRUCK=camion'
        },
        energy: {
          type: 'string',
          enum: ['THERMAL', 'HYBRID', 'ELECTRIC']
        }
      },
      required: ['startDate', 'endDate']
    }
  },
  {
    name: 'createReservation',
    description: 'Crée une réservation. N\'appeler QUE après confirmation explicite de l\'utilisateur.',
    input_schema: {
      type: 'object',
      properties: {
        vehicleId: { type: 'string', description: 'ID du véhicule (obtenu via searchAvailableVehicles)' },
        startDate: { type: 'string', description: 'ISO 8601' },
        endDate: { type: 'string', description: 'ISO 8601' },
        purpose: { type: 'string', description: 'Motif du trajet' }
      },
      required: ['vehicleId', 'startDate', 'endDate', 'purpose']
    }
  },
  {
    name: 'listMyReservations',
    description: 'Liste les réservations de l\'utilisateur connecté.',
    input_schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
          description: 'Filtrer par statut. Omettre pour voir toutes.'
        }
      }
    }
  },
  {
    name: 'cancelReservation',
    description: 'Annule une réservation. N\'appeler QUE après confirmation de l\'utilisateur.',
    input_schema: {
      type: 'object',
      properties: {
        reservationId: { type: 'string', description: 'ID de la réservation à annuler' }
      },
      required: ['reservationId']
    }
  }
];
```

### Étape 2 — System prompt anti-hallucination

```typescript
function buildSystemPrompt(context: {
  userFirstName: string;
  orgName: string;
  currentDate: string; // ISO
  currentTime: string; // "14:30"
}): string {
  return `Tu es le Concierge de ${context.orgName}, un assistant IA spécialisé dans la réservation de véhicules d'entreprise.

## Ton rôle
Tu aides ${context.userFirstName} à réserver, consulter et annuler des véhicules du pool de l'entreprise.

## Règles ABSOLUES (ne jamais enfreindre)
1. Tu NE PEUX PAS confirmer la disponibilité d'un véhicule sans avoir appelé searchAvailableVehicles. Jamais.
2. Tu NE CRÉES PAS de réservation sans confirmation explicite de l'utilisateur ("oui", "confirme", "c'est bon").
3. Tu NE PEUX PAS accéder aux données d'autres entreprises.
4. Si une demande est hors scope (météo, traduction, etc.), réponds : "Je suis spécialisé dans la gestion des véhicules. Pour cette demande, je vous invite à utiliser un autre outil."

## Flux de réservation standard
1. L'utilisateur demande un véhicule → tu poses des questions si dates/durée manquent
2. Tu appelles searchAvailableVehicles avec les paramètres
3. Tu proposes 1 à 3 options avec les détails (marque, modèle, énergie)
4. Tu récapitules la réservation et demandes confirmation
5. Seulement après confirmation → tu appelles createReservation

## Contexte temporel
Date actuelle : ${context.currentDate}
Heure actuelle : ${context.currentTime} (Paris)
Quand l'utilisateur dit "demain", "jeudi", "la semaine prochaine" → convertis en date absolue.

## Ton
- Bref, professionnel, légèrement chaleureux
- Toujours en français
- Réponds en 1-3 phrases maximum sauf si tu listes des options
- Commence par le résultat, pas par "Bien sûr !" ou "Absolument !"`;
}
```

### Étape 3 — Action Convex avec tool use et streaming

```typescript
// src/lib/convex/concierge.ts
import Anthropic from '@anthropic-ai/sdk';
import { action } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { api, internal } from './_generated/api';

export const sendMessage = action({
  args: {
    conversationId: v.optional(v.id('conversations')),
    userMessage: v.string()
  },
  handler: async (ctx, { conversationId, userMessage }): Promise<{
    conversationId: string;
    assistantMessage: string;
    toolCallsPerformed: Array<{ name: string; result: string }>;
  }> => {
    // 1. Vérifier auth et récupérer contexte
    const user = await ctx.runQuery(api.users.getCurrentUser, {});
    if (!user) throw new ConvexError('Non authentifié');
    
    const orgInfo = await ctx.runQuery(api.organizations.getMyOrg, {});
    if (!orgInfo) throw new ConvexError('Aucune organisation active');
    
    // 2. Charger ou créer la conversation
    let conversation = conversationId
      ? await ctx.runQuery(api.conversations.getConversation, { conversationId })
      : null;
    
    const now = Date.now();
    const messages: Anthropic.MessageParam[] = conversation
      ? conversation.messages.map(m => ({ role: m.role, content: m.content }))
      : [];
    
    messages.push({ role: 'user', content: userMessage });
    
    // 3. Appel Claude API avec agentic loop
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const systemPrompt = buildSystemPrompt({
      userFirstName: user.name?.split(' ')[0] ?? 'vous',
      orgName: orgInfo.name,
      currentDate: new Date().toLocaleDateString('fr-FR'),
      currentTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    });
    
    const toolCallsPerformed: Array<{ name: string; result: string }> = [];
    let finalAssistantText = '';
    
    // Agentic loop — max 5 iterations pour éviter les boucles infinies
    for (let iteration = 0; iteration < 5; iteration++) {
      const response = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        tools: CONCIERGE_TOOLS,
        messages
      });
      
      if (response.stop_reason === 'end_turn') {
        // Réponse finale en texte
        finalAssistantText = response.content
          .filter(block => block.type === 'text')
          .map(block => block.text)
          .join('');
        messages.push({ role: 'assistant', content: response.content });
        break;
      }
      
      if (response.stop_reason === 'tool_use') {
        // Exécuter les outils
        const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
        messages.push({ role: 'assistant', content: response.content });
        
        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        
        for (const toolUse of toolUseBlocks) {
          if (toolUse.type !== 'tool_use') continue;
          
          let toolResult: string;
          
          try {
            toolResult = await executeConciergeToolInAction(ctx, toolUse.name, toolUse.input as Record<string, unknown>, orgInfo._id, user._id);
          } catch (err) {
            toolResult = JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur inconnue' });
          }
          
          toolCallsPerformed.push({ name: toolUse.name, result: toolResult });
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: toolResult
          });
        }
        
        messages.push({ role: 'user', content: toolResults });
      }
    }
    
    // 4. Persister la conversation
    const newConvId = await ctx.runMutation(api.conversations.upsertConversation, {
      conversationId: conversation?._id,
      organizationId: orgInfo._id,
      userMessage,
      assistantMessage: finalAssistantText,
      toolCallsPerformed
    });
    
    return {
      conversationId: newConvId,
      assistantMessage: finalAssistantText,
      toolCallsPerformed
    };
  }
});

// Exécuteur des outils dans le contexte de l'action
async function executeConciergeToolInAction(
  ctx: ActionCtx,
  toolName: string,
  input: Record<string, unknown>,
  organizationId: string,
  userId: string
): Promise<string> {
  switch (toolName) {
    case 'searchAvailableVehicles': {
      const startTs = new Date(input.startDate as string).getTime();
      const endTs = new Date(input.endDate as string).getTime();
      const vehicles = await ctx.runQuery(api.reservations.getAvailableVehicles, {
        startDate: startTs,
        endDate: endTs,
        category: input.category as 'PASSENGER' | 'UTILITY' | 'TRUCK' | undefined,
        energy: input.energy as 'THERMAL' | 'HYBRID' | 'ELECTRIC' | undefined
      });
      return JSON.stringify(vehicles.map(v => ({
        id: v._id,
        label: `${v.brand} ${v.model} (${v.registration})`,
        energy: v.energy,
        category: v.category,
        location: v.location
      })));
    }
    
    case 'createReservation': {
      const reservationId = await ctx.runMutation(api.reservations.createReservation, {
        vehicleId: input.vehicleId as Id<'vehicles'>,
        startDate: new Date(input.startDate as string).getTime(),
        endDate: new Date(input.endDate as string).getTime(),
        purpose: input.purpose as string
      });
      return JSON.stringify({ success: true, reservationId });
    }
    
    case 'listMyReservations': {
      const reservations = await ctx.runQuery(api.reservations.listReservations, {
        scope: 'my',
        status: input.status as 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | undefined
      });
      return JSON.stringify(reservations.slice(0, 10).map(r => ({
        id: r._id,
        vehicle: r.vehicleLabel,
        startDate: new Date(r.startDate).toLocaleDateString('fr-FR'),
        endDate: new Date(r.endDate).toLocaleDateString('fr-FR'),
        status: r.status,
        purpose: r.purpose
      })));
    }
    
    case 'cancelReservation': {
      await ctx.runMutation(api.reservations.cancelReservation, {
        reservationId: input.reservationId as Id<'reservations'>
      });
      return JSON.stringify({ success: true });
    }
    
    default:
      throw new Error(`Outil inconnu : ${toolName}`);
  }
}
```

### Étape 4 — UI Chat dans `/app/+page.svelte`

Structure de la page :
```
[Top bar : logo + "Concierge" + bouton nouvelle conversation]
[Zone messages : scrollable, bulles user/agent]
[Zone saisie : textarea + bouton envoyer]
```

Pattern Svelte 5 :
```svelte
<script lang="ts">
  import { useMutation } from 'convex-svelte';
  import { api } from '$lib/convex/_generated/api';

  let messages = $state<Array<{role: 'user' | 'assistant'; content: string; pending?: boolean}>>([]);
  let inputText = $state('');
  let conversationId = $state<string | undefined>(undefined);
  let isLoading = $state(false);

  const sendMessage = useMutation(api.concierge.sendMessage);

  async function handleSend() {
    if (!inputText.trim() || isLoading) return;
    
    const text = inputText;
    inputText = '';
    
    // Optimistic update
    messages = [...messages, { role: 'user', content: text }];
    messages = [...messages, { role: 'assistant', content: '', pending: true }];
    isLoading = true;
    
    try {
      const result = await sendMessage({ conversationId, userMessage: text });
      conversationId = result.conversationId;
      
      // Remplacer le pending par la vraie réponse
      messages = messages.slice(0, -1);
      messages = [...messages, { role: 'assistant', content: result.assistantMessage }];
    } catch (err) {
      messages = messages.slice(0, -1);
      messages = [...messages, { role: 'assistant', content: 'Une erreur est survenue. Veuillez réessayer.' }];
    } finally {
      isLoading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }
</script>
```

Messages d'accueil (empty state) :
```
Bonjour [Prénom] ! Je suis votre Concierge de flotte.
Je peux vous aider à :
• Réserver un véhicule pour un trajet
• Consulter vos réservations
• Annuler une réservation
```

---

## ✅ Critères d'acceptation

- [ ] Réservation créée en moins de 4 échanges conversationnels
- [ ] L'agent ne hallucine jamais sur la disponibilité (toujours via tool call)
- [ ] L'agent demande confirmation avant de créer ou annuler
- [ ] Si aucun véhicule disponible, l'agent le dit clairement et propose des alternatives de dates
- [ ] La conversation est persistée (rechargement de page = historique conservé)
- [ ] Bouton "Nouvelle conversation" fonctionne
- [ ] UI responsive — full screen sur mobile, colonne sur desktop
- [ ] Timeout si Claude ne répond pas en 30s → message d'erreur explicite

---

## 🚫 NE PAS FAIRE

- Ne pas appeler l'API Claude depuis le client SvelteKit (jamais exposer la clé API)
- Ne pas utiliser de streaming SSE complexe pour le MVP — appel synchrone depuis action Convex
- Ne pas permettre à l'agent de requêter des données d'autres organisations
- Ne pas stocker les messages Claude bruts (avec tool_use blocks) dans la table conversations — stocker uniquement le texte final
- Ne pas ajouter de mémoire cross-conversation pour le MVP (chaque conversation est indépendante)
- Ne pas utiliser `claude-opus-4-8` pour le Concierge (trop lent/coûteux pour des échanges fréquents)
- Ne pas oublier la variable d'env `ANTHROPIC_API_KEY` dans les settings Convex

---

## 🔑 Variable d'environnement requise

```bash
# Dans le dashboard Convex → Settings → Environment Variables
ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🧪 Tests requis

```typescript
// src/tests/concierge.spec.ts
test('réservation en langage naturel end-to-end', async ({ page }) => {
  // "J'ai besoin d'un véhicule demain matin pour aller à Lyon"
  // → vérifier que l'agent appelle searchAvailableVehicles
  // → vérifier qu'une proposition est faite
  // → confirmer → vérifier que la réservation existe en base
});
test('refus si aucun véhicule disponible', ...);
test('annulation via chat', ...);
test('hors scope redirigé proprement', ...);
```

---

## 💡 Messages de suggestion pour l'empty state (quick actions)

```
"J'ai besoin d'un véhicule demain"
"Montre-moi mes réservations"
"Annule ma réservation de jeudi"
"Un utilitaire pour vendredi après-midi"
```
