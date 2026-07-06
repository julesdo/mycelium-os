<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { useMutation } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import BuildingIcon from '@lucide/svelte/icons/building';
	import CheckIcon from '@lucide/svelte/icons/check';
	import PlayIcon from '@lucide/svelte/icons/play';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import ExternalLinkIcon from '@lucide/svelte/icons/external-link';
	import { localizedHref } from '$lib/utils/i18n';
	import { resolve } from '$app/paths';

	interface Props {
		id: Id<'concierge_tasks'>;
		title: string;
		description: string;
		priority: 'CRITICAL' | 'URGENT' | 'NORMAL' | 'INFO';
		status: 'OPEN' | 'IN_PROGRESS' | 'SNOOZED' | 'DONE';
		sourceType: string;
		organizationId: Id<'organizations'>;
		organizationName: string;
		organizationTier: string;
		dueDate?: number | null;
		createdAt: number;
	}

	let {
		id,
		title,
		description,
		priority,
		status,
		sourceType,
		organizationId,
		organizationName,
		organizationTier,
		dueDate,
		createdAt
	}: Props = $props();

	const updateStatus = useMutation(api['concierge/mutations'].updateTaskStatus);
	const snoozeTask = useMutation(api['concierge/mutations'].snoozeTask);

	let loading = $state(false);

	const priorityConfig = {
		CRITICAL: {
			label: 'CRITIQUE',
			class: 'bg-destructive/10 text-destructive border-destructive/20'
		},
		URGENT: {
			label: 'URGENT',
			class: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
		},
		NORMAL: { label: 'NORMAL', class: 'bg-muted text-muted-foreground border-border' },
		INFO: {
			label: 'INFO',
			class: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
		}
	};

	const sourceLabels: Record<string, string> = {
		COMPLIANCE_ALERT: 'Conformité',
		INCIDENT: 'Sinistre',
		VIOLATION: 'Contravention',
		MAINTENANCE: 'Maintenance',
		OPTIMIZER_RECOMMENDATION: 'Optimisation',
		MANUAL: 'Manuel'
	};

	const tierLabel: Record<string, string> = {
		essential: 'Essential',
		professional: 'Pro',
		business: 'Business',
		enterprise: 'Enterprise'
	};

	const pConfig = $derived(priorityConfig[priority] ?? priorityConfig.NORMAL);

	const timeAgo = $derived(() => {
		const diff = Date.now() - createdAt;
		const h = Math.floor(diff / (1000 * 60 * 60));
		const d = Math.floor(h / 24);
		if (d > 0) return `il y a ${d}j`;
		if (h > 0) return `il y a ${h}h`;
		return "à l'instant";
	});

	async function markDone() {
		loading = true;
		try {
			await updateStatus({ taskId: id, status: 'DONE' });
		} finally {
			loading = false;
		}
	}

	async function markInProgress() {
		loading = true;
		try {
			await updateStatus({ taskId: id, status: 'IN_PROGRESS' });
		} finally {
			loading = false;
		}
	}

	async function snooze1h() {
		loading = true;
		try {
			await snoozeTask({ taskId: id, snoozedUntil: Date.now() + 1000 * 60 * 60 });
		} finally {
			loading = false;
		}
	}
</script>

<div
	class={cn(
		'group relative flex items-start gap-4 rounded-xl border px-4 py-3 transition-all duration-150',
		priority === 'CRITICAL'
			? 'border-destructive/20 bg-destructive/5'
			: 'border-border bg-card hover:bg-muted/30'
	)}
>
	<!-- Badge priorité -->
	<div class="mt-0.5 shrink-0">
		<span
			class={cn(
				'inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold tracking-wider',
				pConfig.class
			)}
		>
			{pConfig.label}
		</span>
	</div>

	<!-- Contenu -->
	<div class="min-w-0 flex-1">
		<div class="mb-0.5 flex flex-wrap items-center gap-2">
			<span class="text-sm font-semibold text-foreground">{title}</span>
			<span class="text-[10px] font-medium text-muted-foreground">·</span>
			<span class="flex items-center gap-1 text-[11px] text-muted-foreground">
				<BuildingIcon class="size-3" />
				{organizationName}
				<span class="rounded bg-muted px-1 py-px text-[10px] font-medium">
					{tierLabel[organizationTier] ?? organizationTier}
				</span>
			</span>
			<span class="text-[10px] text-muted-foreground">{sourceLabels[sourceType] ?? sourceType}</span
			>
		</div>
		<p class="line-clamp-2 text-xs text-muted-foreground">{description}</p>
		{#if dueDate}
			<p class="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
				Échéance : {new Date(dueDate).toLocaleDateString('fr-FR')}
			</p>
		{/if}
	</div>

	<!-- Timestamp + actions -->
	<div class="flex shrink-0 flex-col items-end gap-2">
		<span class="text-[10px] text-muted-foreground">{timeAgo()}</span>
		<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
			{#if status === 'OPEN'}
				<button
					type="button"
					onclick={markInProgress}
					disabled={loading}
					title="Prendre en charge"
					class="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-[var(--brand)] hover:text-[var(--brand-foreground)]"
				>
					<PlayIcon class="size-3" />
				</button>
			{/if}
			<button
				type="button"
				onclick={snooze1h}
				disabled={loading}
				title="Snoozer 1h"
				class="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
			>
				<ClockIcon class="size-3" />
			</button>
			<button
				type="button"
				onclick={markDone}
				disabled={loading}
				title="Marquer traité"
				class="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-emerald-500 hover:text-white"
			>
				<CheckIcon class="size-3" />
			</button>
			<a
				href={resolve(localizedHref(`/admin/dashboard`))}
				target="_blank"
				rel="noopener"
				title="Ouvrir le dashboard client"
				class="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
			>
				<ExternalLinkIcon class="size-3" />
			</a>
		</div>
	</div>
</div>
