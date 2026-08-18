<script lang="ts">
	import { page } from '$app/state';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import TicketDetail from '$lib/components/concierge/TicketDetail.svelte';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n';

	const ticketId = $derived(page.params.ticketId as Id<'conciergeTickets'>);
	const backHref = $derived(resolve(localizedHref('/ops/inbox')));
</script>

<svelte:head>
	<title>Ticket — Inbox Mycelium</title>
</svelte:head>

<TicketDetail {ticketId} {backHref} />
