<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import MessageBubble from './MessageBubble.svelte';
	import type { ChatWidget, InfoRequestWidget } from './MessageBubble.svelte';
	import type { VehicleData } from './ChatVehicleInline.svelte';
	import type { InfoRequestSubmitParams } from './ChatInfoRequest.svelte';
	import BookingStepper from './BookingStepper.svelte';
	import type { StepperSearchParams } from './BookingStepper.svelte';
	import StreamingIndicator from './StreamingIndicator.svelte';
	import { Button } from '$lib/components/ui/button';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import RotateCcwIcon from '@lucide/svelte/icons/rotate-ccw';
	import XIcon from '@lucide/svelte/icons/x';
	import { tick } from 'svelte';
	import { cn } from '$lib/utils';

	type LocalMessage = {
		id: string;
		role: 'user' | 'assistant';
		content: string;
		isStreaming: boolean;
		toolCall: string | null;
		widget?: ChatWidget;
	};

	type QuickReply = { label: string; message: string; special?: 'booking' };

	const DEFAULT_QUICK_REPLIES: QuickReply[] = [
		{ label: 'Réserver un véhicule', special: 'booking', message: '' },
		{ label: 'Mes réservations', message: 'Montre-moi mes prochaines réservations.' },
		{ label: 'Annuler une réservation', message: 'Je veux annuler une réservation.' }
	];

	const BOOKING_KEYWORDS = ['réserv', "besoin d'un véh", 'véhicule', 'voiture', 'louer un'];
	const BOOKING_PURPOSES = ['RDV client', 'Déplacement', 'Formation', 'Autre'];

	const TOOL_LABELS: Record<string, string> = {
		searchAvailableVehicles: 'Recherche des disponibilités...',
		createReservation: 'Création de la réservation...',
		listMyReservations: 'Récupération de vos réservations...',
		cancelReservation: 'Annulation en cours...'
	};

	const client = useConvexClient();
	const conversationQuery = useQuery(api.conversations.getCurrentConversation, {});
	const locationsQuery = useQuery(api.vehicles.getFleetLocations, {});

	let messages: LocalMessage[] = $state([]);
	let conversationId: string | null = $state(null);
	let inputValue: string = $state('');
	let isSending: boolean = $state(false);
	let initialized: boolean = $state(false);
	let messagesEndEl: HTMLDivElement | undefined = $state();
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	// Stepper state
	let showStepper = $state(false);
	let stepperPrefill = $state<{ startDate?: string; endDate?: string; location?: string; purpose?: string }>({});
	let isSearching = $state(false);

	const fleetLocations = $derived(locationsQuery.data ?? []);

	// ── Natural language parser ────────────────────────────────────────────────

	const MONTHS_FR: Record<string, number> = {
		janvier: 0, février: 1, mars: 2, avril: 3, mai: 4, juin: 5,
		juillet: 6, août: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11
	};
	const DAYS_FR: Record<string, number> = {
		dimanche: 0, lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6
	};
	const PURPOSE_ALIASES: Record<string, string> = {
		'rdv client': 'RDV client', 'rendez-vous client': 'RDV client', 'rendez vous client': 'RDV client',
		'déplacement': 'Déplacement', 'deplacement': 'Déplacement',
		'formation': 'Formation'
	};

	function parseDate(raw: string): string | null {
		const s = raw.toLowerCase().trim();
		const now = new Date();
		const toISO = (d: Date) => d.toISOString().split('T')[0];

		if (s === "aujourd'hui" || s === 'auj') return toISO(now);
		if (s === 'demain') { const d = new Date(now); d.setDate(d.getDate() + 1); return toISO(d); }

		// day-of-week: "lundi", "lundi prochain"
		for (const [name, num] of Object.entries(DAYS_FR)) {
			if (s.includes(name)) {
				const d = new Date(now);
				let diff = (num - d.getDay() + 7) % 7 || 7;
				if (s.includes('prochain')) diff = (num - d.getDay() + 7) % 7 || 7;
				d.setDate(d.getDate() + diff);
				return toISO(d);
			}
		}

		// "10 juin" / "10 juin 2026"
		const m = s.match(/(\d{1,2})\s+(janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)(?:\s+(\d{4}))?/);
		if (m) {
			const month = MONTHS_FR[m[2].replace(/[éè]/g, 'e').replace('û', 'u').replace('é', 'e')];
			const year = m[3] ? parseInt(m[3]) : now.getFullYear();
			const d = new Date(year, month ?? 0, parseInt(m[1]));
			if (!isNaN(d.getTime())) return toISO(d);
		}

		return null;
	}

	function parseBookingIntent(text: string, locations: string[]) {
		const lower = text.toLowerCase();
		const result: { dateStart?: string; dateEnd?: string; location?: string; purpose?: string } = {};

		// "du X au Y" — capture everything between "du" and "au", then "au" and end/keywords
		const rangeRe = /\bdu\s+(.+?)\s+au\s+([^,\.]+?)(?:\s+(?:pour|depuis|à|sur)\b|$)/i;
		const rangeM = lower.match(rangeRe);
		if (rangeM) {
			const s = parseDate(rangeM[1]);
			const e = parseDate(rangeM[2]);
			if (s) result.dateStart = s;
			if (e) result.dateEnd = e;
		} else {
			// Single "le X" or standalone day
			const singleRe = /(?:le\s+)?(\d{1,2}\s+(?:janvier|f[eé]vrier|mars|avril|mai|juin|juillet|ao[uû]t|septembre|octobre|novembre|d[eé]cembre)(?:\s+\d{4})?|(?:aujourd['']hui|demain|(?:lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)(?:\s+prochain)?))/i;
			const sm = lower.match(singleRe);
			if (sm) {
				const d = parseDate(sm[1]);
				if (d) { result.dateStart = d; result.dateEnd = d; }
			}
		}

		// Location: match any fleet site name in the text
		for (const loc of locations) {
			if (lower.includes(loc.toLowerCase())) { result.location = loc; break; }
		}

		// Purpose
		for (const [alias, canonical] of Object.entries(PURPOSE_ALIASES)) {
			if (lower.includes(alias)) { result.purpose = canonical; break; }
		}

		return result;
	}

	// ── Pending reservation (direct Convex bypass) ────────────────────────────

	let pendingReservation = $state<{ vehicle: VehicleData; startDate: string; endDate: string } | null>(null);
	let pendingPurpose = $state('');
	let pendingPurposeCustom = $state('');
	let isConfirming = $state(false);
	let confirmError = $state('');

	async function confirmPendingReservation() {
		if (!pendingReservation || isConfirming) return;
		isConfirming = true;
		confirmError = '';
		const purpose = pendingPurpose === 'Autre' ? pendingPurposeCustom.trim() : pendingPurpose;
		const v = pendingReservation.vehicle;
		try {
			await client.mutation(api.reservations.createReservation, {
				vehicleId: v.id as Id<'vehicles'>,
				startDate: new Date(pendingReservation.startDate).getTime(),
				endDate: new Date(pendingReservation.endDate).getTime(),
				purpose: purpose || 'Déplacement professionnel'
			});
			messages = [
				...messages,
				{
					id: crypto.randomUUID(),
					role: 'assistant' as const,
					content: '',
					isStreaming: false,
					toolCall: null,
					widget: {
						widget: 'reservation_confirmed' as const,
						reservation: {
							id: '',
							vehicle: `${v.brand} ${v.model} (${v.registration})`,
							startDate: pendingReservation.startDate,
							endDate: pendingReservation.endDate,
							status: 'PENDING'
						}
					}
				}
			];
			pendingReservation = null;
			pendingPurpose = '';
			pendingPurposeCustom = '';
			scrollToBottom();
		} catch (e) {
			const msg = e instanceof Error ? e.message : '';
			confirmError = msg === 'VEHICLE_UNAVAILABLE'
				? "Ce véhicule vient d'être pris. Choisissez-en un autre."
				: 'Erreur. Réessayez.';
		} finally {
			isConfirming = false;
		}
	}

	// ── Intent detection (only on empty conversation) + stepper ──────────────

	const intentDetected = $derived(
		isEmpty && BOOKING_KEYWORDS.some((kw) => inputValue.toLowerCase().includes(kw))
	);

	$effect(() => {
		if (intentDetected && !isSending && !showStepper) {
			showStepper = true;
			stepperPrefill = parseBookingIntent(inputValue, fleetLocations);
		}
	});

	const SESSION_KEY = (id: string) => `concierge_msgs_${id}`;

	function saveToSession(id: string, msgs: LocalMessage[]) {
		try {
			sessionStorage.setItem(SESSION_KEY(id), JSON.stringify(msgs));
		} catch { /* quota exceeded */ }
	}

	function loadFromSession(id: string): LocalMessage[] | null {
		try {
			const raw = sessionStorage.getItem(SESSION_KEY(id));
			return raw ? (JSON.parse(raw) as LocalMessage[]) : null;
		} catch {
			return null;
		}
	}

	// Persist full message state (including widgets) on every change
	$effect(() => {
		if (conversationId && messages.length > 0 && !messages.some((m) => m.isStreaming)) {
			saveToSession(conversationId, messages);
		}
	});

	$effect(() => {
		if (!initialized && conversationQuery.data !== undefined) {
			initialized = true;
			if (conversationQuery.data) {
				conversationId = conversationQuery.data._id;
				// Restore full state from session (preserves widgets)
				const cached = loadFromSession(conversationQuery.data._id);
				if (cached && cached.length > 0) {
					messages = cached;
				} else {
					messages = conversationQuery.data.messages.map((m) => ({
						id: crypto.randomUUID(),
						role: m.role as 'user' | 'assistant',
						content: m.content,
						isStreaming: false,
						toolCall: null
					}));
				}
			}
		}
	});

	$effect(() => {
		if (messages.length > 0) scrollToBottom();
	});

	function scrollToBottom() {
		tick().then(() => messagesEndEl?.scrollIntoView({ behavior: 'smooth' }));
	}

	async function sendMessage(text: string) {
		const trimmed = text.trim();
		if (!trimmed || isSending) return;

		inputValue = '';
		resetStepper();
		isSending = true;

		const assistantId = crypto.randomUUID();
		messages = [
			...messages,
			{ id: crypto.randomUUID(), role: 'user', content: trimmed, isStreaming: false, toolCall: null },
			{ id: assistantId, role: 'assistant', content: '', isStreaming: true, toolCall: null }
		];
		scrollToBottom();

		try {
			const res = await fetch('/api/concierge', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ message: trimmed, conversationId: conversationId ?? undefined })
			});

			if (!res.ok || !res.body) {
				setAssistantError(assistantId, await res.text().catch(() => 'Erreur réseau'));
				return;
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';
			let fullText = '';

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
					try {
						event = JSON.parse(json) as Record<string, unknown>;
					} catch {
						continue;
					}

					if (event.type === 'text' && event.text) {
						fullText += event.text as string;
						messages = messages.map((m) =>
							m.id === assistantId ? { ...m, content: fullText } : m
						);
						scrollToBottom();
					} else if (event.type === 'tool_call' && event.name) {
						const label = TOOL_LABELS[event.name as string] ?? '';
						messages = messages.map((m) =>
							m.id === assistantId ? { ...m, toolCall: label || null } : m
						);
					} else if (event.type === 'widget') {
						const widgetData = event as unknown as ChatWidget;
						messages = messages.map((m) =>
							m.id === assistantId ? { ...m, widget: widgetData, toolCall: null } : m
						);
						scrollToBottom();
					} else if (event.type === 'done') {
						if (event.conversationId) conversationId = event.conversationId as string;
						messages = messages.map((m) =>
							m.id === assistantId ? { ...m, isStreaming: false, toolCall: null } : m
						);
						// Attach info_request only when agent asks AND no vehicle was already proposed
						const finalMsg = messages.find((m) => m.id === assistantId);
						const alreadyHasWidget = !!finalMsg?.widget;
						const finalText = finalMsg?.content ?? '';
						const asksForInfo = !alreadyHasWidget &&
							/\b(quelle[s]?\s+(période|date|heure|jour)|pour quelle|depuis quel|quel\s+site|quel\s+objet|à\s+quelle\s+heure|quel\s+motif)/i.test(finalText);
						if (asksForInfo && !pendingReservation) {
							const ctx = parseBookingIntent(finalText + ' ' + inputValue, fleetLocations);
							const infoWidget: InfoRequestWidget = {
								widget: 'info_request',
								fields: {
									needsStartDate: !ctx.dateStart,
									needsEndDate: !ctx.dateEnd,
									needsLocation: fleetLocations.length > 1,
									needsPurpose: !ctx.purpose,
									knownStartDate: ctx.dateStart,
									knownEndDate: ctx.dateEnd,
									knownLocation: ctx.location
								}
							};
							messages = messages.map((m) =>
								m.id === assistantId ? { ...m, widget: infoWidget } : m
							);
						}
					} else if (event.type === 'error') {
						setAssistantError(assistantId, (event.message as string) ?? 'Une erreur est survenue.');
					}
				}
			}
		} catch {
			setAssistantError(assistantId, 'Impossible de joindre le Concierge. Réessayez.');
		} finally {
			isSending = false;
			tick().then(() => textareaEl?.focus());
		}
	}

	function setAssistantError(id: string, msg: string) {
		messages = messages.map((m) =>
			m.id === id ? { ...m, content: msg, isStreaming: false, toolCall: null } : m
		);
	}

	async function resetConversation() {
		if (conversationId) sessionStorage.removeItem(SESSION_KEY(conversationId));
		const newId = await client.mutation(api.conversations.startNewConversation, {});
		conversationId = newId as string;
		messages = [];
		inputValue = '';
		resetStepper();
		tick().then(() => textareaEl?.focus());
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			if (!isSending && inputValue.trim()) sendMessage(inputValue);
		}
	}

	function handleVehicleSelect(vehicle: VehicleData) {
		const lastWidget = messages.findLast((m) => m.widget?.widget === 'vehicle_proposal');
		const w = lastWidget?.widget as { widget: 'vehicle_proposal'; startDate?: string; endDate?: string } | undefined;
		if (w?.startDate && w?.endDate) {
			pendingReservation = { vehicle, startDate: w.startDate, endDate: w.endDate };
		} else {
			// Fallback: let Claude handle it if dates are missing from widget
			sendMessage(`Oui, réservez le ${vehicle.brand} ${vehicle.model} (${vehicle.registration}).`);
		}
	}

	function handleVehicleAlt() {
		sendMessage("Montrez-moi l'option suivante.");
	}

	// ── Stepper search → inject vehicle_proposal widget directly in chat ─────

	type SearchableVehicle = {
		_id: Id<'vehicles'>;
		brand: string;
		model: string;
		registration: string;
		year: number;
		energy: 'THERMAL' | 'HYBRID' | 'ELECTRIC';
		category: 'PASSENGER' | 'UTILITY' | 'TRUCK';
		location?: string | null;
	};

	async function handleStepperSearch(params: StepperSearchParams) {
		if (isSearching) return;
		isSearching = true;
		showStepper = false;
		const assistantId = crypto.randomUUID();
		messages = [
			...messages,
			{ id: assistantId, role: 'assistant', content: '', isStreaming: true, toolCall: 'Recherche des disponibilités...' }
		];
		scrollToBottom();
		try {
			const vehicles = await client.query(api.reservations.searchAvailableVehicles, {
				startDate: params.startDate,
				endDate: params.endDate,
				location: params.location
			});
			const list = vehicles as SearchableVehicle[];
			if (list.length === 0) {
				messages = messages.map((m) =>
					m.id === assistantId
						? { ...m, content: "Aucun véhicule disponible pour cette période" + (params.location ? ` à ${params.location}` : '') + ".", isStreaming: false, toolCall: null }
						: m
				);
			} else {
				const v = list[0];
				const widget: ChatWidget = {
					widget: 'vehicle_proposal',
					vehicle: {
						id: v._id,
						brand: v.brand,
						model: v.model,
						registration: v.registration,
						year: v.year,
						label: `${v.brand} ${v.model}`,
						category: v.category,
						energy: v.energy,
						location: v.location ?? null
					},
					totalFound: list.length,
					startDate: new Date(params.startDate).toISOString(),
					endDate: new Date(params.endDate).toISOString()
				};
				messages = messages.map((m) =>
					m.id === assistantId
						? { ...m, content: '', widget, isStreaming: false, toolCall: null }
						: m
				);
			}
		} catch {
			messages = messages.map((m) =>
				m.id === assistantId
					? { ...m, content: 'Erreur lors de la recherche. Réessayez.', isStreaming: false, toolCall: null }
					: m
			);
		} finally {
			isSearching = false;
			scrollToBottom();
		}
	}

	async function handleInfoSubmit(params: InfoRequestSubmitParams) {
		await handleStepperSearch(params);
	}

	function resetStepper() {
		showStepper = false;
		stepperPrefill = {};
	}

	// Contextual quick replies based on last assistant message
	const quickReplies = $derived.by<QuickReply[]>(() => {
		const last = messages.findLast((m) => m.role === 'assistant' && !m.isStreaming);
		if (!last) return DEFAULT_QUICK_REPLIES;

		if (last.widget?.widget === 'vehicle_proposal') {
			const replies: QuickReply[] = [];
			if (last.widget.totalFound > 1) {
				replies.push({ label: 'Autre option', message: "Montrez-moi l'option suivante." });
			}
			replies.push({ label: 'Modifier les dates', special: 'booking', message: '' });
			return replies;
		}

		if (last.widget?.widget === 'reservation_confirmed') {
			return [
				{ label: 'Voir mes réservations', message: 'Montre-moi mes réservations.' },
				{ label: 'Nouvelle réservation', special: 'booking', message: '' }
			];
		}

		return DEFAULT_QUICK_REPLIES;
	});

	function handleQuickReply(reply: QuickReply) {
		if (reply.special === 'booking') {
			showStepper = true;
			stepperPrefill = {};
		} else {
			sendMessage(reply.message);
		}
	}

	const isEmpty = $derived(messages.length === 0);
	const isThinking = $derived(
		isSending && messages.at(-1)?.isStreaming && !messages.at(-1)?.content
	);
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="flex flex-shrink-0 items-center justify-between border-b px-4 py-3">
		<div class="flex items-center gap-2">
			<span class="text-sm font-semibold">Concierge</span>
			<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">IA</span>
		</div>
		<Button
			variant="ghost"
			size="sm"
			onclick={resetConversation}
			disabled={isSending}
			class="gap-1.5 text-xs text-muted-foreground"
		>
			<RotateCcwIcon class="size-3.5" />
			Nouvelle conversation
		</Button>
	</div>

	<!-- Messages -->
	<div
		class="flex-1 overflow-y-auto px-4 py-4"
		role="log"
		aria-label="Conversation avec le Concierge"
		aria-live="polite"
	>
		{#if isEmpty && !isSending}
			<div class="flex h-full flex-col items-center justify-center gap-5 text-center">
				<div class="flex flex-col gap-1">
					<p class="text-base font-medium">Bonjour, comment puis-je vous aider ?</p>
					<p class="text-sm text-muted-foreground">
						Je réserve vos véhicules de flotte en quelques secondes.
					</p>
				</div>
				<div class="flex flex-wrap justify-center gap-2">
					{#each DEFAULT_QUICK_REPLIES as reply}
						<button
							onclick={() => reply.special === 'booking' ? handleQuickReply(reply) : sendMessage(reply.message)}
							disabled={isSending}
							class="rounded-full border px-4 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
						>
							{reply.label}
						</button>
					{/each}
				</div>
			</div>
		{:else}
			<div class="mx-auto flex max-w-2xl flex-col gap-1">
				{#each messages as message (message.id)}
					{#if message.isStreaming && !message.content && !message.widget}
						<StreamingIndicator />
					{:else}
						<MessageBubble
							role={message.role}
							content={message.content}
							isStreaming={message.isStreaming}
							toolCall={message.toolCall ?? undefined}
							widget={message.widget}
							locations={fleetLocations}
							onVehicleSelect={handleVehicleSelect}
							onVehicleAlt={handleVehicleAlt}
							onInfoSubmit={handleInfoSubmit}
						/>
					{/if}
				{/each}

				{#if isThinking}
					<StreamingIndicator />
				{/if}
			</div>
		{/if}

		<div bind:this={messagesEndEl}></div>
	</div>

	<!-- Bottom area -->
	<div class="mx-auto w-full max-w-2xl px-4 pb-4">
		<!-- Quick replies -->
		{#if !isEmpty && !isSending && !pendingReservation}
			<div class="mb-2 flex flex-wrap gap-1.5">
				{#each quickReplies as reply}
					<button
						onclick={() => handleQuickReply(reply)}
						class={cn(
							'rounded-full border px-3 py-1 text-xs transition-colors',
							reply.special === 'booking' && showStepper
								? 'border-primary/50 bg-primary/8 text-primary'
								: 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
						)}
					>{reply.label}</button>
				{/each}
			</div>
		{/if}

		<!-- Stepper -->
		{#if showStepper && !pendingReservation}
			<div class="mb-2">
				<BookingStepper
					locations={fleetLocations}
					onSearch={handleStepperSearch}
					onClose={resetStepper}
					onSendText={() => sendMessage(inputValue)}
					hasInputText={!!inputValue.trim()}
					prefill={stepperPrefill}
				/>
			</div>
		{/if}

		<!-- Pending reservation confirmation -->
		{#if pendingReservation}
			<div class="mb-2 rounded-xl border bg-background p-3">
				<div class="mb-2.5 flex items-center justify-between">
					<div>
						<p class="text-xs font-medium">{pendingReservation.vehicle.brand} {pendingReservation.vehicle.model}</p>
						<p class="font-mono text-xs text-muted-foreground">{pendingReservation.vehicle.registration}</p>
					</div>
					<button
						onclick={() => { pendingReservation = null; pendingPurpose = ''; confirmError = ''; }}
						class="text-muted-foreground hover:text-foreground"
					>
						<XIcon class="size-3.5" />
					</button>
				</div>
				<p class="mb-2 text-xs text-muted-foreground">Objet du déplacement</p>
				<div class="mb-2.5 flex flex-wrap gap-1.5">
					{#each BOOKING_PURPOSES as p}
						<button
							onclick={() => { pendingPurpose = pendingPurpose === p ? '' : p; if (p !== 'Autre') pendingPurposeCustom = ''; }}
							class={cn(
								'rounded-full border px-2.5 py-0.5 text-xs transition-colors',
								pendingPurpose === p
									? 'border-primary/50 bg-primary/8 text-primary'
									: 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
							)}
						>{p}</button>
					{/each}
				</div>
				{#if pendingPurpose === 'Autre'}
					<input type="text" bind:value={pendingPurposeCustom} placeholder="Préciser..." class="mb-2.5 w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/50" />
				{/if}
				{#if confirmError}<p class="mb-2 text-xs text-destructive">{confirmError}</p>{/if}
				<Button size="sm" class="w-full" disabled={isConfirming} onclick={confirmPendingReservation}>
					{isConfirming ? 'Réservation en cours...' : 'Confirmer la réservation'}
				</Button>
			</div>
		{/if}

		<!-- Input -->
		<div class="flex items-end gap-2 rounded-xl border bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring/50">
			<textarea
				bind:this={textareaEl}
				bind:value={inputValue}
				onkeydown={handleKeydown}
				disabled={isSending || !!pendingReservation}
				placeholder="Envoyer un message..."
				aria-label="Message au Concierge"
				rows={1}
				class={cn(
					'w-full resize-none bg-transparent text-sm outline-none transition-colors',
					'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-60',
					'min-h-0 flex-1 p-0'
				)}
			></textarea>
			<Button
				size="icon"
				onclick={() => sendMessage(inputValue)}
				disabled={isSending || !inputValue.trim() || !!pendingReservation}
				aria-label="Envoyer"
				class="size-8 shrink-0 rounded-lg"
			>
				<ArrowUpIcon class="size-4" />
			</Button>
		</div>
		<p class="mt-1.5 text-center text-xs text-muted-foreground">
			Entrée pour envoyer · Maj+Entrée pour aller à la ligne
		</p>
	</div>
</div>
