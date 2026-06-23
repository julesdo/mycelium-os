<script lang="ts">
	import { useQuery, useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import LinkIcon from '@lucide/svelte/icons/link';
	import UnlinkIcon from '@lucide/svelte/icons/unlink';

	const client = useConvexClient();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const statusQuery = useQuery((api as any).integrations.google.getGoogleCalendarStatus, {});

	const status = $derived<{ connected: boolean; calendarId?: string }>(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(statusQuery as any).data ?? { connected: false }
	);

	const connected = $derived(status.connected);
	const justConnected = $derived(page.url.searchParams.get('connected') === 'true');
	const connectionError = $derived(page.url.searchParams.get('error'));

	let disconnecting = $state(false);

	function handleConnect() {
		window.location.href = '/api/google-calendar/start';
	}

	async function handleDisconnect() {
		if (
			!confirm(
				'Déconnecter Google Calendar ? Les événements existants dans votre calendrier ne seront pas supprimés.'
			)
		)
			return;
		disconnecting = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).integrations.google.disconnectGoogleCalendar, {});
		} finally {
			disconnecting = false;
		}
	}
</script>

<div class="rounded-lg border border-border bg-card p-6">
	<div class="flex items-start gap-4">
		<!-- Icône Google Calendar -->
		<div
			class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20"
		>
			<CalendarIcon class="size-5 text-blue-600 dark:text-blue-400" />
		</div>

		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<h3 class="font-semibold">Google Calendar</h3>
				{#if connected}
					<Badge
						class="border-transparent bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
					>
						<CheckCircleIcon class="mr-1 size-3" />
						Connecté
					</Badge>
				{/if}
			</div>

			<p class="mt-1 text-sm text-muted-foreground">
				Synchronisez automatiquement vos réservations avec votre Google Calendar. Chaque réservation
				créée ou annulée est reflétée dans votre agenda.
			</p>

			{#if justConnected && connected}
				<p class="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
					Google Calendar connecté avec succès.
				</p>
			{/if}

			{#if connectionError}
				<p class="mt-2 text-sm text-destructive">
					{#if connectionError === 'access_denied'}
						Connexion annulée. Vous pouvez réessayer à tout moment.
					{:else}
						Une erreur est survenue ({connectionError}). Veuillez réessayer.
					{/if}
				</p>
			{/if}
		</div>

		<!-- Action button -->
		<div class="shrink-0">
			{#if connected}
				<Button
					variant="outline"
					size="sm"
					onclick={handleDisconnect}
					disabled={disconnecting}
					class="gap-1.5"
				>
					<UnlinkIcon class="size-3.5" />
					{disconnecting ? 'Déconnexion...' : 'Déconnecter'}
				</Button>
			{:else}
				<Button size="sm" onclick={handleConnect} class="gap-1.5">
					<LinkIcon class="size-3.5" />
					Connecter
				</Button>
			{/if}
		</div>
	</div>
</div>
