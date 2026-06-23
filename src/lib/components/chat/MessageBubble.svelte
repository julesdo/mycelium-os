<script lang="ts">
	import ChatVehicleInline from './ChatVehicleInline.svelte';
	import type { VehicleData } from './ChatVehicleInline.svelte';
	import ChatInfoRequest from './ChatInfoRequest.svelte';
	import type { InfoRequestFields, InfoRequestSubmitParams } from './ChatInfoRequest.svelte';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import CalendarIcon from '@lucide/svelte/icons/calendar';

	export type VehicleProposalWidget = {
		widget: 'vehicle_proposal';
		vehicle: VehicleData;
		totalFound: number;
		startDate?: string;
		endDate?: string;
	};

	export type ReservationConfirmedWidget = {
		widget: 'reservation_confirmed';
		reservation: {
			id: string;
			vehicle: string;
			startDate: string;
			endDate: string;
			status: string;
		};
	};

	export type InfoRequestWidget = {
		widget: 'info_request';
		fields: InfoRequestFields;
	};

	export type ChatWidget = VehicleProposalWidget | ReservationConfirmedWidget | InfoRequestWidget;

	type Props = {
		role: 'user' | 'assistant';
		content: string;
		isStreaming?: boolean;
		toolCall?: string;
		widget?: ChatWidget;
		locations?: string[];
		onVehicleSelect?: (vehicle: VehicleData) => void;
		onVehicleAlt?: () => void;
		onInfoSubmit?: (params: InfoRequestSubmitParams) => void;
	};

	let {
		role,
		content,
		isStreaming = false,
		toolCall,
		widget,
		locations = [],
		onVehicleSelect,
		onVehicleAlt,
		onInfoSubmit
	}: Props = $props();

	function formatDate(dateStr: string) {
		try {
			return new Date(dateStr).toLocaleDateString('fr-FR', {
				day: 'numeric',
				month: 'long',
				year: 'numeric'
			});
		} catch {
			return dateStr;
		}
	}

	const hasContent = $derived(!!content || !!widget);
</script>

<div
	class="message-appear mb-2 flex w-full"
	class:justify-end={role === 'user'}
	class:justify-start={role === 'assistant'}
>
	<div class="flex max-w-[82%] flex-col gap-1">
		{#if toolCall}
			<p class="px-1 text-xs italic text-[oklch(0.50_0_0)]" aria-hidden="true">
				{toolCall}
			</p>
		{/if}

		{#if hasContent}
			<div
				class="rounded-2xl text-sm leading-relaxed"
				class:user-bubble={role === 'user'}
				class:assistant-bubble={role === 'assistant'}
				class:px-4={role === 'user' || !widget}
				class:py-2-5={role === 'user' || !widget}
				class:has-widget={role === 'assistant' && !!widget}
				role={role === 'assistant' ? 'status' : undefined}
				aria-live={role === 'assistant' ? 'polite' : undefined}
			>
				{#if content}
					<p class="px-4 py-2.5">
						{content}{#if isStreaming}<span class="cursor" aria-hidden="true">|</span>{/if}
					</p>
				{/if}

				{#if widget}
					{#if widget.widget === 'info_request'}
						<div class="px-3 pb-3" class:pt-0={!!content} class:pt-3={!content} class:border-t-separator={!!content}>
							<ChatInfoRequest
								fields={widget.fields}
								{locations}
								onSubmit={(p) => onInfoSubmit?.(p)}
							/>
						</div>
					{:else if widget.widget === 'vehicle_proposal'}
						<div
							class="px-3 pb-3"
							class:pt-0={!!content}
							class:pt-3={!content}
							class:border-t-separator={!!content}
						>
							<ChatVehicleInline
								vehicle={widget.vehicle}
								totalFound={widget.totalFound}
								startDate={widget.startDate}
								endDate={widget.endDate}
								onSelect={(v) => onVehicleSelect?.(v)}
								onAlt={() => onVehicleAlt?.()}
							/>
						</div>
					{:else if widget.widget === 'reservation_confirmed'}
						<div
							class="px-3 pb-3"
							class:pt-0={!!content}
							class:pt-3={!content}
							class:border-t-separator={!!content}
						>
							<div class="flex flex-col gap-2 rounded-xl bg-white/6 px-3 py-2.5 ring-1 ring-white/10">
								<div class="flex items-center gap-2">
									<CheckCircleIcon class="size-4 text-[oklch(0.70_0.18_145)]" />
									<span class="text-xs font-semibold text-[oklch(0.85_0_0)]">Réservation créée</span>
								</div>
								<p class="text-xs font-medium text-[oklch(0.75_0_0)]">
									{widget.reservation.vehicle}
								</p>
								<div class="flex items-center gap-1.5 text-xs text-[oklch(0.55_0_0)]">
									<CalendarIcon class="size-3" />
									<span>{formatDate(widget.reservation.startDate)} → {formatDate(widget.reservation.endDate)}</span>
								</div>
							</div>
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
</div>

<style>
	.user-bubble {
		background-color: oklch(0.6 0.18 230);
		color: oklch(0.97 0 0);
		border-bottom-right-radius: 4px;
	}

	.assistant-bubble {
		background-color: oklch(0.24 0 0);
		color: oklch(0.88 0 0);
		border-bottom-left-radius: 4px;
	}

	.has-widget {
		padding: 0;
		overflow: hidden;
	}

	.border-t-separator {
		border-top: 1px solid oklch(1 0 0 / 0.08);
	}

	.message-appear {
		animation: fadeSlideIn 180ms ease-out both;
	}

	@keyframes fadeSlideIn {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.cursor {
		display: inline-block;
		margin-left: 1px;
		animation: blink 600ms step-end infinite;
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0;
		}
	}
</style>
