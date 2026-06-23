<script lang="ts">
	import { Html, Head, Body, Preview, Container } from '@better-svelte-email/components';
	import { Badge, Button, Card } from '$lib/emails/components/ui/index.js';
	import { EmailHeader, EmailFooter } from '$lib/emails/components/layout/index.js';

	let {
		garageName = 'Norauto Paris Nation',
		vehicleLabel = 'Renault Megane · AB-123-CD',
		maintenanceType = 'Révision',
		scheduledDate = 'lundi 15 juin 2026 à 9h00',
		organizationName = 'Mycelium Fleet',
		contactEmail = 'fleet@example.com',
		notes = '',
		adminUrl = 'https://example.com/admin/maintenance/123'
	}: {
		garageName?: string;
		vehicleLabel?: string;
		maintenanceType?: string;
		scheduledDate?: string;
		organizationName?: string;
		contactEmail?: string;
		notes?: string;
		adminUrl?: string;
	} = $props();
</script>

<Html>
	<Head />
	<Body class="mx-auto my-auto bg-white px-2 font-sans">
		<Preview preview="Rendez-vous entretien — {vehicleLabel} le {scheduledDate}" />
		<Container class="mx-auto my-10 max-w-md p-5">
			<Card.Root>
				<EmailHeader />
				<Card.Header>
					<Badge class="mb-2 border-transparent bg-orange-500 text-white">Entretien planifié</Badge>
					<Card.Title>Nouveau rendez-vous d'entretien</Card.Title>
					<Card.Description>
						Bonjour {garageName}, vous trouverez ci-dessous les détails du rendez-vous planifié par
						{organizationName}.
					</Card.Description>
				</Card.Header>

				<Card.Content>
					<div
						style="background-color: #f4f4f5; border-radius: 6px; padding: 16px; margin-bottom: 16px;"
					>
						<p style="margin: 0 0 8px 0; font-size: 14px;">
							<strong>Véhicule :</strong>
							{vehicleLabel}
						</p>
						<p style="margin: 0 0 8px 0; font-size: 14px;">
							<strong>Type d'entretien :</strong>
							{maintenanceType}
						</p>
						<p style="margin: 0 0 8px 0; font-size: 14px;">
							<strong>Date souhaitée :</strong>
							{scheduledDate}
						</p>
						<p style="margin: 0; font-size: 14px;">
							<strong>Contact :</strong>
							{contactEmail}
						</p>
					</div>

					{#if notes}
						<div
							style="background-color: #fef9c3; border-radius: 6px; padding: 12px; margin-bottom: 16px;"
						>
							<p style="margin: 0; font-size: 13px; color: #713f12;">
								<strong>Notes :</strong>
								{notes}
							</p>
						</div>
					{/if}

					<Button class="mb-4" href={adminUrl}>Voir les détails</Button>

					<p class="text-xs text-muted-foreground">
						Merci de confirmer ce rendez-vous par retour d'email ou en appelant le contact indiqué.
					</p>
				</Card.Content>

				<Card.Footer>
					<EmailFooter />
				</Card.Footer>
			</Card.Root>
		</Container>
	</Body>
</Html>
