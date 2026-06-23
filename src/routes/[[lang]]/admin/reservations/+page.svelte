<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import FleetCalendar from '$lib/components/calendar/FleetCalendar.svelte';
</script>

<div class="flex flex-col gap-6 px-4 lg:px-6 xl:px-8">
	<div>
		<h1 class="text-base font-semibold">Réservations</h1>
		<p class="text-xs text-muted-foreground">Calendrier de la flotte</p>
	</div>

	<FleetCalendar />
</div>
