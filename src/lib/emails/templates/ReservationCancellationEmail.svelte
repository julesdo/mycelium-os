<script lang="ts">
	import { Html, Head, Body, Preview, Container } from '@better-svelte-email/components';
	import { Alert, Badge, Card } from '$lib/emails/components/ui/index.js';
	import { EmailHeader, EmailFooter } from '$lib/emails/components/layout/index.js';

	let {
		userName = 'Utilisateur',
		vehicleLabel = 'Renault Clio · AB-123-CD',
		startDate = 'lundi 9 juin 2026, 9h00',
		endDate = 'lundi 9 juin 2026, 18h00',
		purpose = 'Déplacement client'
	}: {
		userName?: string;
		vehicleLabel?: string;
		startDate?: string;
		endDate?: string;
		purpose?: string;
	} = $props();
</script>

<Html>
	<Head />
	<Body class="mx-auto my-auto bg-white px-2 font-sans">
		<Preview preview="Réservation annulée — {vehicleLabel}" />
		<Container class="mx-auto my-10 max-w-md p-5">
			<Card.Root>
				<EmailHeader />
				<Card.Header>
					<Badge class="mb-2 border-transparent bg-zinc-600 text-white">Annulation</Badge>
					<Card.Title>Réservation annulée</Card.Title>
					<Card.Description>Bonjour {userName}, votre réservation a été annulée.</Card.Description>
				</Card.Header>

				<Card.Content>
					<Alert.Root class="mb-4">
						<Alert.Description>
							<p style="margin: 0 0 8px 0; font-size: 14px;">
								<strong>Véhicule :</strong>
								{vehicleLabel}
							</p>
							<p style="margin: 0 0 8px 0; font-size: 14px;">
								<strong>Début :</strong>
								{startDate}
							</p>
							<p style="margin: 0 0 8px 0; font-size: 14px;">
								<strong>Fin :</strong>
								{endDate}
							</p>
							<p style="margin: 0; font-size: 14px;">
								<strong>Motif :</strong>
								{purpose}
							</p>
						</Alert.Description>
					</Alert.Root>

					<p class="text-xs text-muted-foreground">
						Si vous n'êtes pas à l'origine de cette annulation, contactez votre gestionnaire de flotte.
					</p>
				</Card.Content>

				<Card.Footer>
					<EmailFooter />
				</Card.Footer>
			</Card.Root>
		</Container>
	</Body>
</Html>
