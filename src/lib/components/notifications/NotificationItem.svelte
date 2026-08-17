<script lang="ts">
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import SparklesIcon from '@lucide/svelte/icons/sparkles';
	import ListChecksIcon from '@lucide/svelte/icons/list-checks';
	import TrendingDownIcon from '@lucide/svelte/icons/trending-down';
	import CalendarClockIcon from '@lucide/svelte/icons/calendar-clock';
	import FileWarningIcon from '@lucide/svelte/icons/file-warning';
	import HeartHandshakeIcon from '@lucide/svelte/icons/heart-handshake';
	import { cn } from '$lib/utils.js';

	type NotificationType =
		| 'FACTURES_RECUES'
		| 'DIAGNOSTIC_PRET'
		| 'LIGNES_A_ARBITRER'
		| 'RATIO_EN_DERIVE'
		| 'DECLARATION_A_FAIRE'
		| 'ATTESTATION_MANQUANTE'
		| 'HUMAN_ASSIST_REPLY';

	export type AppNotification = {
		_id: string;
		type: NotificationType;
		title: string;
		message: string;
		link?: string;
		isRead: boolean;
		createdAt: number;
	};

	type Props = {
		notification: AppNotification;
		onclick: (notification: AppNotification) => void;
	};

	let { notification, onclick }: Props = $props();

	const iconMap: Record<NotificationType, typeof FileTextIcon> = {
		FACTURES_RECUES: FileTextIcon,
		DIAGNOSTIC_PRET: SparklesIcon,
		LIGNES_A_ARBITRER: ListChecksIcon,
		RATIO_EN_DERIVE: TrendingDownIcon,
		DECLARATION_A_FAIRE: CalendarClockIcon,
		ATTESTATION_MANQUANTE: FileWarningIcon,
		HUMAN_ASSIST_REPLY: HeartHandshakeIcon
	};

	const colorMap: Record<NotificationType, string> = {
		FACTURES_RECUES: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300',
		DIAGNOSTIC_PRET: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300',
		LIGNES_A_ARBITRER: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300',
		RATIO_EN_DERIVE: 'bg-red-100 text-red-700 dark:bg-red-400/15 dark:text-red-300',
		DECLARATION_A_FAIRE: 'bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-300',
		ATTESTATION_MANQUANTE: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300',
		HUMAN_ASSIST_REPLY: 'bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300'
	};

	function relativeTime(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return "à l'instant";
		if (mins < 60) return `il y a ${mins} min`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `il y a ${hours}h`;
		const days = Math.floor(hours / 24);
		if (days < 7) return `il y a ${days}j`;
		return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
	}

	const Icon = $derived(iconMap[notification.type]);
	const colorClass = $derived(colorMap[notification.type]);
</script>

<button
	class={cn(
		'flex w-full items-start gap-3 px-5 py-3 text-left transition-all duration-100',
		'hover:bg-muted/40 dark:hover:bg-white/[0.03]',
		!notification.isRead && 'bg-primary/[0.04] hover:bg-primary/[0.07] dark:bg-primary/[0.06] dark:hover:bg-primary/[0.09]'
	)}
	onclick={() => onclick(notification)}
>
	<!-- Icon badge -->
	<div class={cn(
		'mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]',
		colorClass
	)}>
		<Icon class="size-3.5" />
	</div>

	<!-- Content -->
	<div class="min-w-0 flex-1">
		<div class="flex items-start justify-between gap-2">
			<p class={cn('text-[13px] leading-snug', !notification.isRead ? 'font-semibold' : 'font-medium text-muted-foreground')}>
				{notification.title}
			</p>
			{#if !notification.isRead}
				<span class="mt-1 size-1.5 shrink-0 rounded-full bg-[var(--brand)]"></span>
			{/if}
		</div>
		<p class="mt-0.5 line-clamp-2 text-[12px] text-muted-foreground">{notification.message}</p>
		<time class="mt-1 text-[11px] text-muted-foreground/50">{relativeTime(notification.createdAt)}</time>
	</div>
</button>
