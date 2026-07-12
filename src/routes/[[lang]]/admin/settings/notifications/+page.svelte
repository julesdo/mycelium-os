<script lang="ts">
	import SettingsTabNav from '$lib/components/admin/SettingsTabNav.svelte';
</script>

<SettingsTabNav />

<div class="flex flex-col gap-6">
	<div>
		<h2 class="text-base font-semibold">Destinataires des notifications admin</h2>
		<p class="text-sm text-muted-foreground">
			Configurer les destinataires des alertes email pour votre organisation.
		</p>
	</div>

	{#await import('../notification-recipients-table.svelte') then { default: NotificationRecipientsTable }}
		<NotificationRecipientsTable />
	{/await}
</div>
