<script lang="ts">
	import { Html, Head, Body, Preview, Container } from '@better-svelte-email/components';
	import { Badge, Button, Card } from '$lib/emails/components/ui/index.js';
	import { EmailHeader, EmailFooter } from '$lib/emails/components/layout/index.js';

	let {
		userName = 'Utilisateur',
		vehicleLabel = 'Renault Clio · AB-123-CD',
		startDate = 'lundi 9 juin 2026, 9h00',
		endDate = 'lundi 9 juin 2026, 18h00',
		location = 'Paris - Siège',
		purpose = 'Déplacement client',
		reservationUrl = 'https://example.com/app/reservations/123'
	}: {
		userName?: string;
		vehicleLabel?: string;
		startDate?: string;
		endDate?: string;
		location?: string;
		purpose?: string;
		reservationUrl?: string;
	} = $props();
</script>

<Html>
	<Head />
	<Body class="mx-auto my-auto bg-white px-2 font-sans">
		<Preview preview="Réservation confirmée — {vehicleLabel}" />
		<Container class="mx-auto my-10 max-w-md p-5">
			<Card.Root>
				<EmailHeader />
				<Card.Header>
					<Badge class="mb-2 border-transparent bg-green-600 text-white">Réservation</Badge>
					<Card.Title>Votre réservation est confirmée</Card.Title>
					<Card.Description>Bonjour {userName}, votre réservation a bien été enregistrée.</Card.Description>
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
							<strong>Début :</strong>
							{startDate}
						</p>
						<p style="margin: 0 0 8px 0; font-size: 14px;">
							<strong>Fin :</strong>
							{endDate}
						</p>
						<p style="margin: 0 0 8px 0; font-size: 14px;">
							<strong>Lieu :</strong>
							{location}
						</p>
						<p style="margin: 0; font-size: 14px;">
							<strong>Motif :</strong>
							{purpose}
						</p>
					</div>

					<Button class="mb-4" href={reservationUrl}>Voir ma réservation</Button>

					<p class="text-xs text-muted-foreground">
						Vous recevez cet email car vous avez effectué une réservation sur Mycelium Fleet OS.
					</p>
				</Card.Content>

				<Card.Footer>
					<EmailFooter />
				</Card.Footer>
			</Card.Root>
		</Container>
	</Body>
</Html>
