# Gabarit — appel Claude API depuis une action Convex

Extrait de `src/lib/convex/agents/concierge.ts`, `src/lib/convex/agents/prompts.ts` et
`src/lib/convex/agents/tools.ts` (Mycelium Fleet OS, supprimés le 15/08/2026), complété par
`src/lib/convex/optimizer.ts` qui contient le pattern `cache_control` et sortie structurée
explicitement demandés pour ce gabarit — le concierge conversationnel n'utilise ni l'un ni
l'autre, ils vivent dans le module Optimiseur (P10 de la roadmap Fleet).

Transposition EGalim : le concierge (chat conversationnel, boucle d'outils, streaming SSE) n'est
probablement pas le bon modèle pour la Moulinette — la classification de lignes de facture est
un traitement batch, pas une conversation. C'est le pattern **optimiseur** (system prompt en
cache + sortie JSON stricte + traitement par lot avec erreurs isolées) qui est le plus proche du
besoin réel. Le concierge reste utile pour la mécanique bas niveau : parser du SSE Anthropic et
gérer une boucle d'appels d'outils.

## 1. httpAction Convex qui appelle l'API Anthropic (boucle agentique + SSE)

Le concierge tourne comme un `httpAction`, pas une `action` classique, parce qu'il streame la
réponse token par token au client via Server-Sent Events. La boucle principale relance l'appel
Anthropic tant que le modèle demande des outils (`stop_reason === 'tool_use'`), jusqu'à un
plafond dur d'itérations :

```ts
export const chat = httpAction(async (ctx, req) => {
	const user = await authComponent.getAuthUser(ctx);
	if (!user) return new Response('Unauthorized', { status: 401 });

	// ... parsing du body, résolution de l'org, chargement/sauvegarde de la conversation ...

	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) return new Response('ANTHROPIC_API_KEY non configuré', { status: 500 });

	const systemPrompt = buildSystemPrompt({ orgName: org.name, userName: user.name ?? user.email });

	// Garde seulement les 10 derniers messages pour plafonner la consommation de tokens
	const recentMessages = conversation.messages.slice(-10);
	const initialMessages: AnthropicMessage[] = recentMessages.map((m) => ({
		role: m.role, content: m.content
	}));

	const enc = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			const push = (obj: object) =>
				controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));

			try {
				let fullText = '';
				const messages = [...initialMessages];

				for (let step = 0; step < 10; step++) {
					const res = await fetch('https://api.anthropic.com/v1/messages', {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							'x-api-key': apiKey,
							'anthropic-version': '2023-06-01'
						},
						body: JSON.stringify({
							model: 'claude-sonnet-4-6',
							max_tokens: 1024,
							stream: true,
							system: systemPrompt,
							tools: conciergeTools,
							messages
						})
					});

					if (!res.ok || !res.body) {
						const errorText = await res.text().catch(() => `HTTP ${res.status}`);
						push({ type: 'error', message: `Anthropic API ${res.status}: ${errorText}` });
						controller.close();
						return;
					}

					const { contentBlocks, toolUseBlocks, stopReason } = await parseAnthropicStream(
						res.body,
						{
							onTextDelta: (text) => { fullText += text; push({ type: 'text', text }); },
							onToolCall: (name) => push({ type: 'tool_call', name })
						}
					);

					if (stopReason === 'end_turn') {
						await ctx.runMutation(internal.agents.concierge.saveAssistantMessage, {
							conversationId: convId, text: fullText
						});
						push({ type: 'done', conversationId: convId });
						controller.close();
						return;
					}

					if (stopReason === 'tool_use' && toolUseBlocks.length > 0) {
						messages.push({ role: 'assistant', content: contentBlocks });
						const toolResults: ToolResultBlock[] = [];

						for (const tool of toolUseBlocks) {
							let result: unknown;
							try {
								// switch (tool.name) { case 'searchAvailableVehicles': ... }
								result = await ctx.runQuery(/* ... */);
							} catch (e) {
								result = { error: e instanceof Error ? e.message : "Erreur lors de l'exécution" };
							}
							toolResults.push({
								type: 'tool_result', tool_use_id: tool.id, content: JSON.stringify(result)
							});
						}

						messages.push({ role: 'user', content: toolResults });
						continue; // relance la boucle avec les résultats d'outils
					}

					// max_tokens ou stop_reason inattendu
					push({ type: 'error', message: `Arrêt inattendu : ${stopReason}` });
					controller.close();
					return;
				}

				push({ type: 'error', message: "Nombre maximum d'étapes atteint" });
				controller.close();
			} catch (e) {
				push({ type: 'error', message: e instanceof Error ? e.message : 'Erreur interne' });
				controller.close();
			}
		}
	});

	return new Response(stream, {
		headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
	});
});
```

Le parseur SSE (`parseAnthropicStream`) accumule les blocs de contenu par index, distingue texte
et `tool_use`, et reconstruit le JSON d'input des outils à partir de deltas partiels
(`input_json_delta`) :

```ts
async function parseAnthropicStream(
	body: ReadableStream<Uint8Array>,
	callbacks: { onTextDelta: (text: string) => void; onToolCall: (name: string) => void }
): Promise<StreamResult> {
	const decoder = new TextDecoder();
	const reader = body.getReader();
	const activeBlocks = new Map<number, ParsedBlock>();
	const completedBlocks: ParsedBlock[] = [];
	let stopReason = 'end_turn';
	let buffer = '';

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() ?? '';

			for (const line of lines) {
				if (!line.startsWith('data: ')) continue;
				const json = line.slice(6).trim();
				if (!json) continue;
				let event: Record<string, unknown>;
				try { event = JSON.parse(json) as Record<string, unknown>; } catch { continue; }

				const type = event.type as string;
				if (type === 'content_block_start') {
					const index = event.index as number;
					const block = event.content_block as { type: string; id?: string; name?: string };
					activeBlocks.set(index, { index, type: block.type as 'text' | 'tool_use', text: '', id: block.id, name: block.name, inputJson: '' });
					if (block.type === 'tool_use' && block.name) callbacks.onToolCall(block.name);
				} else if (type === 'content_block_delta') {
					const index = event.index as number;
					const delta = event.delta as { type: string; text?: string; partial_json?: string };
					const block = activeBlocks.get(index);
					if (block) {
						if (delta.type === 'text_delta' && delta.text) { block.text += delta.text; callbacks.onTextDelta(delta.text); }
						else if (delta.type === 'input_json_delta' && delta.partial_json) { block.inputJson += delta.partial_json; }
					}
				} else if (type === 'content_block_stop') {
					const index = event.index as number;
					const block = activeBlocks.get(index);
					if (block) { completedBlocks.push(block); activeBlocks.delete(index); }
				} else if (type === 'message_delta') {
					const delta = event.delta as { stop_reason?: string };
					if (delta.stop_reason) stopReason = delta.stop_reason;
				} else if (type === 'error') {
					const err = event.error as { message?: string };
					throw new ConvexError(`Anthropic streaming error: ${err?.message ?? 'Unknown'}`);
				}
			}
		}
	} finally {
		reader.releaseLock();
	}
	// ... tri par index, reconstruction des content blocks + toolUseBlocks ...
}
```

Définition des outils, format Anthropic `input_schema` (`tools.ts`) :

```ts
export const conciergeTools: AnthropicTool[] = [
	{
		name: 'searchAvailableVehicles',
		description: 'Recherche les véhicules disponibles... Appeler cet outil AVANT de proposer un véhicule.',
		input_schema: {
			type: 'object',
			properties: {
				startDate: { type: 'string', description: 'Date/heure de début au format ISO 8601' },
				category: { type: 'string', enum: ['PASSENGER', 'UTILITY', 'TRUCK'], description: '...' }
			},
			required: ['startDate', 'endDate']
		}
	}
	// ...
];
```

## 2. `cache_control: { type: 'ephemeral' }` sur le system prompt

Ce n'est PAS utilisé par le concierge (son system prompt est court et régénéré à chaque appel
avec l'heure du jour, donc peu de bénéfice à le cacher). C'est le module Optimiseur
(`optimizer.ts`) qui l'utilise, parce que son system prompt est long, statique, et rappelé une
fois par organisation par semaine — exactement le cas d'usage du prompt caching Anthropic :

```ts
const res = await fetch('https://api.anthropic.com/v1/messages', {
	method: 'POST',
	headers: {
		'Content-Type': 'application/json',
		'x-api-key': apiKey,
		'anthropic-version': '2023-06-01'
	},
	body: JSON.stringify({
		model: 'claude-sonnet-4-6',
		max_tokens: 2048,
		system: [
			{
				type: 'text',
				text: OPTIMIZER_SYSTEM_PROMPT,
				cache_control: { type: 'ephemeral' }
			}
		],
		messages: [
			{
				role: 'user',
				content: `Analyse cette flotte et génère les recommandations d'optimisation.\n\n${JSON.stringify(fleetData, null, 2)}`
			}
		]
	})
});
```

Point clé de structure : `system` doit devenir un **tableau de blocs** (`[{ type: 'text', text,
cache_control }]`) plutôt qu'une simple chaîne pour pouvoir attacher `cache_control` à un
segment. Pour la Moulinette, c'est directement le bon pattern : les instructions de
classification EGalim (référentiel des labels valorisants, arbre de décision « bio / local /
sous SIQO / etc. ») seront un system prompt long et stable appelé des dizaines de fois par
facture — un candidat naturel au cache `ephemeral`.

## 3. Traitement par lot (batch), sans boucle d'outils

`optimizer.ts` illustre le pattern batch : une action par organisation, appelée en boucle par
un orchestrateur qui isole les échecs individuels pour ne jamais bloquer le lot entier :

```ts
export const runFleetOptimizerForAllOrgs = internalAction({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const orgs = await ctx.runQuery(internal.optimizer.listActiveOrgs);
		for (const org of orgs) {
			try {
				await ctx.runAction(internal.optimizer.runFleetOptimizerForOrg, {
					organizationId: org._id
				});
			} catch {
				// Un échec d'org ne doit jamais bloquer les autres
			}
		}
		return null;
	}
});
```

Idempotence par période (une seule exécution par org et par semaine — évite de reclassifier
deux fois si le cron se déclenche deux fois) :

```ts
export const runFleetOptimizerForOrg = internalAction({
	args: { organizationId: v.id('organizations') },
	handler: async (ctx, { organizationId }) => {
		const weekOf = getWeekStart();
		const existing = await ctx.runQuery(internal.optimizer.getReportForWeek, { organizationId, weekOf });
		if (existing) return; // déjà traité cette semaine

		const fleetData = await ctx.runQuery(internal.optimizer.collectFleetDataForOrg, { organizationId });
		if (fleetData.vehicleCount === 0) return; // rien à analyser

		const apiKey = process.env.ANTHROPIC_API_KEY;
		if (!apiKey) return; // pas de clé configurée → abandon silencieux, pas de crash

		let analysis: OptimizerAnalysis;
		try {
			const res = await fetch(/* ... appel avec cache_control, voir section 2 ... */);
			if (!res.ok) return;
			const json = (await res.json()) as { content: { type: string; text: string }[] };
			const textBlock = json.content.find((b) => b.type === 'text');
			if (!textBlock) return;
			analysis = JSON.parse(textBlock.text) as OptimizerAnalysis;
		} catch {
			return;
		}

		if (!analysis.recommendations?.length) return;
		// ... persiste le résultat, planifie l'email ...
	}
});
```

Pour la Moulinette, ce pattern se transpose directement à « une action par facture » (ou par lot
de libellés produit distincts à classifier), orchestrée par une boucle qui isole les échecs
par ligne plutôt que par organisation.

## 4. Sortie structurée (JSON strict, pas d'appel d'outil)

Plutôt que le mécanisme `tools`/`tool_use` (fait pour agir), l'optimiseur utilise un prompt qui
force un format JSON exact — plus simple et moins cher qu'une boucle d'outils quand on veut
juste une réponse structurée, pas une action :

```ts
const OPTIMIZER_SYSTEM_PROMPT = `Tu es un analyste expert en optimisation de flotte d'entreprise française.
Tu analyses les données d'utilisation, de coûts et de maintenance pour identifier des opportunités d'économie concrètes.

## Format de réponse OBLIGATOIRE
Réponds UNIQUEMENT avec un JSON valide (sans markdown, sans \`\`\`json) de ce format exact :
{
  "summary": "Résumé en 1-2 phrases de l'état général de la flotte",
  "recommendations": [
    {
      "type": "underutilized_vehicle | cost_anomaly | maintenance_overdue | lease_renewal | fleet_right_sizing | fuel_efficiency",
      "title": "Titre court max 80 chars",
      "description": "Explication détaillée avec chiffres précis tirés des données",
      "estimatedSaving": 4200,
      "priority": "high | medium | low"
    }
  ]
}

## Règles strictes
- Maximum 5 recommandations, minimum 1
- Citer UNIQUEMENT des chiffres issus des données fournies
- Ne pas inventer des économies — les calculer depuis les coûts réels
- Toujours répondre en français`;
```

Puis parsing brut de la réponse, suivi d'un re-clamp défensif des champs avant persistance (ne
jamais faire confiance aveuglément à la sortie du modèle, même avec un prompt strict) :

```ts
const recs = analysis.recommendations.slice(0, 5).map((r) => ({
	type: r.type,
	title: r.title.slice(0, 120),
	description: r.description,
	estimatedSaving: typeof r.estimatedSaving === 'number' ? r.estimatedSaving : undefined,
	priority: (['high', 'medium', 'low'].includes(r.priority) ? r.priority : 'low') as
		'high' | 'medium' | 'low',
	actionLabel: r.actionLabel?.slice(0, 40)
}));
```

Pour la Moulinette, ce pattern (JSON strict + reclamp défensif) est plus adapté que le mode
`tools` pour classifier un libellé produit : on veut une réponse structurée (famille produit,
labels détectés, confiance), pas une action. Le champ `confidence` numérique proposé par Claude
devrait être clampé côté serveur (`Math.min(1, Math.max(0, r.confidence))`) exactement comme
`priority` l'est ici, avant d'être comparé au seuil de routage vers la revue humaine.

## 5. Gestion d'erreur et retries — ce qui existe, ce qui manque

Ce qui existe dans les deux fichiers sources :
- Vérification systématique de la présence de `ANTHROPIC_API_KEY` avant l'appel, avec sortie
  propre (`return`/`Response 500`) plutôt qu'un throw non catché.
- Vérification de `res.ok` après chaque `fetch`, avec lecture défensive du corps d'erreur
  (`res.text().catch(() => ...)`), jamais de `res.json()` non protégé sur une réponse d'erreur.
- `try/catch` autour de chaque appel d'outil individuellement (dans le concierge), pour qu'un
  outil qui échoue renvoie `{ error: ... }` à Claude au lieu de faire planter toute la
  conversation.
- `try/catch` autour de chaque organisation individuellement (dans l'optimiseur batch), même
  logique à l'échelle du lot.
- Plafond dur d'itérations de boucle agentique (`for (let step = 0; step < 10; step++)`) pour
  éviter une boucle infinie en cas de comportement inattendu du modèle.

Ce qui n'existe **pas** et qu'il faudra ajouter pour la Moulinette : aucun des deux fichiers
n'implémente de retry avec backoff exponentiel sur une erreur `429` (rate limit) ou `529`
(surcharge) de l'API Anthropic — un `res.ok` faux se traduit directement par un abandon
(`return`) plutôt qu'une nouvelle tentative. Pour un pipeline de classification qui va appeler
Claude potentiellement des centaines de fois par facture (une par libellé produit distinct), ce
sera un point de fragilité à combler dès le premier sprint — pas un détail à copier depuis
Fleet, il n'y était pas.

## Ce qu'on garde pour la Moulinette

- **`system` en tableau de blocs avec `cache_control: { type: 'ephemeral' }`** : à copier tel
  quel pour le prompt de classification EGalim (référentiel de labels, arbre de décision) qui
  sera long, stable, et rappelé en boucle.
- **Sortie JSON stricte plutôt que `tools`** pour un besoin de structuration pure (classifier un
  libellé produit) plutôt que d'action.
- **Reclamp défensif de la sortie modèle avant persistance** (`slice`, whitelist de valeurs
  d'enum, `typeof` guard) : ne jamais insérer en base un champ non validé même si le prompt est
  strict.
- **Isolation des échecs par unité de traitement** (essai/catch par outil, par org, par ligne) :
  directement transposable à « par ligne de facture » pour que l'échec de classification d'une
  ligne ne fasse pas échouer tout l'import.
- **Idempotence par période/clé métier** (`getReportForWeek` avant de relancer) : à répliquer
  pour éviter de reclassifier — et refacturer l'appel API — un libellé produit déjà connu.
- **À ajouter, pas à copier** : retry avec backoff exponentiel sur 429/529, absent des deux
  sources Fleet et nécessaire vu le volume d'appels attendu pour la Moulinette.
