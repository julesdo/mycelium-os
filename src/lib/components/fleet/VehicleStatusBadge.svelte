<script lang="ts">
	type Status = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';

	interface Props {
		status: Status;
		class?: string;
	}

	let { status, class: className = '' }: Props = $props();

	const config: Record<Status, { label: string; dot: string; bg: string; text: string }> = {
		AVAILABLE: {
			label: 'Disponible',
			dot: 'bg-emerald-500',
			bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
			text: 'text-emerald-700 dark:text-emerald-400'
		},
		IN_USE: {
			label: 'En cours',
			dot: 'bg-blue-500',
			bg: 'bg-blue-500/10 dark:bg-blue-500/15',
			text: 'text-blue-700 dark:text-blue-400'
		},
		MAINTENANCE: {
			label: 'Maintenance',
			dot: 'bg-orange-500',
			bg: 'bg-orange-500/10 dark:bg-orange-500/15',
			text: 'text-orange-700 dark:text-orange-400'
		},
		RETIRED: {
			label: 'Retiré',
			dot: 'bg-muted-foreground/40',
			bg: 'bg-muted/60',
			text: 'text-muted-foreground'
		}
	};

	const c = $derived(config[status]);
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold {c.bg} {c.text} {className}"
	aria-label="Statut : {c.label}"
>
	<span class="size-1.5 shrink-0 rounded-full {c.dot}"></span>
	{c.label}
</span>
