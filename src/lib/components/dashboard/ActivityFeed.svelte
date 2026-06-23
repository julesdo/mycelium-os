<script lang="ts">
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import CarIcon from '@lucide/svelte/icons/car';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import UserIcon from '@lucide/svelte/icons/user';
	import WrenchIcon from '@lucide/svelte/icons/wrench';
	import KeyRoundIcon from '@lucide/svelte/icons/key-round';

	interface Activity {
		id: string;
		type: 'vehicle_added' | 'reservation_created' | 'reservation_returned' | 'status_changed' | 'member_joined' | string;
		description: string;
		timestamp: number;
	}

	interface Props {
		activities?: Activity[];
	}

	let { activities = [] }: Props = $props();

	function relativeTime(ts: number): string {
		const diff = Date.now() - ts;
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return "à l'instant";
		if (mins < 60) return `${mins} min`;
		const h = Math.floor(mins / 60);
		if (h < 24) return `${h}h`;
		const d = Math.floor(h / 24);
		if (d < 7) return `${d}j`;
		return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
	}

	type Cfg = { icon: typeof ActivityIcon; dot: string };

	function cfg(type: string): Cfg {
		switch (type) {
			case 'vehicle_added':        return { icon: CarIcon,      dot: 'bg-emerald-500' };
			case 'reservation_created':  return { icon: CalendarIcon, dot: 'bg-blue-500' };
			case 'reservation_returned': return { icon: KeyRoundIcon, dot: 'bg-violet-500' };
			case 'status_changed':       return { icon: WrenchIcon,   dot: 'bg-orange-500' };
			case 'member_joined':        return { icon: UserIcon,     dot: 'bg-[var(--brand)]' };
			default:                     return { icon: ActivityIcon, dot: 'bg-muted-foreground/40' };
		}
	}
</script>

{#if activities.length === 0}
	<div class="flex flex-col items-center gap-2 py-8 text-center">
		<div class="flex size-9 items-center justify-center rounded-full bg-muted/80">
			<ActivityIcon class="size-4 text-muted-foreground/40" />
		</div>
		<p class="text-xs text-muted-foreground">Aucune activité récente</p>
	</div>
{:else}
	<ul class="flex flex-col divide-y divide-border/50">
		{#each activities as activity}
			{@const c = cfg(activity.type)}
			{@const Icon = c.icon}
			<li class="flex items-center gap-3 py-2.5">
				<span class="size-1.5 shrink-0 rounded-full {c.dot}"></span>
				<p class="min-w-0 flex-1 truncate text-[13px] text-foreground">{activity.description}</p>
				<time class="shrink-0 text-[11px] tabular-nums text-muted-foreground/60">{relativeTime(activity.timestamp)}</time>
			</li>
		{/each}
	</ul>
{/if}
