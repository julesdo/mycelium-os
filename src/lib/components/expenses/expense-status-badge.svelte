<script lang="ts">
	import { cn } from '$lib/utils.js';

	type Status = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PAID';

	interface Props {
		status: Status;
		class?: string;
	}

	const { status, class: className }: Props = $props();

	const STATUS_CONFIG: Record<Status, { label: string; cls: string }> = {
		DRAFT:     { label: 'Brouillon',  cls: 'bg-muted text-muted-foreground' },
		SUBMITTED: { label: 'En attente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' },
		APPROVED:  { label: 'Approuvée',  cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' },
		REJECTED:  { label: 'Rejetée',   cls: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' },
		PAID:      { label: 'Payée',      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' }
	};

	const config = $derived(STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT);
</script>

<span class={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', config.cls, className)}>
	{config.label}
</span>
