export type AnthropicInputSchema = {
	type: 'object';
	properties: Record<
		string,
		{
			type: string;
			description?: string;
			enum?: string[];
		}
	>;
	required?: string[];
};

export type AnthropicTool = {
	name: string;
	description: string;
	input_schema: AnthropicInputSchema;
};

export const conciergeTools: AnthropicTool[] = [
	{
		name: 'searchAvailableVehicles',
		description:
			'Recherche les véhicules disponibles dans la flotte pour une période donnée. Appeler cet outil AVANT de proposer un véhicule.',
		input_schema: {
			type: 'object',
			properties: {
				startDate: {
					type: 'string',
					description: 'Date/heure de début au format ISO 8601 (ex: 2026-06-12T08:00:00)'
				},
				endDate: {
					type: 'string',
					description: 'Date/heure de fin au format ISO 8601 (ex: 2026-06-12T18:00:00)'
				},
				location: {
					type: 'string',
					description: 'Lieu de départ / site souhaité (optionnel, ex: "Lyon - Logistique")'
				},
				category: {
					type: 'string',
					enum: ['PASSENGER', 'UTILITY', 'TRUCK'],
					description: 'Catégorie de véhicule souhaitée (optionnel)'
				},
				energy: {
					type: 'string',
					enum: ['THERMAL', 'HYBRID', 'ELECTRIC'],
					description: 'Type de motorisation souhaité (optionnel)'
				}
			},
			required: ['startDate', 'endDate']
		}
	},
	{
		name: 'createReservation',
		description:
			"Crée une réservation de véhicule. N'appeler qu'après confirmation explicite de l'utilisateur.",
		input_schema: {
			type: 'object',
			properties: {
				vehicleId: { type: 'string', description: 'ID du véhicule à réserver' },
				startDate: {
					type: 'string',
					description: 'Date/heure de début au format ISO 8601'
				},
				endDate: {
					type: 'string',
					description: 'Date/heure de fin au format ISO 8601'
				},
				purpose: { type: 'string', description: 'Objet du déplacement professionnel' }
			},
			required: ['vehicleId', 'startDate', 'endDate', 'purpose']
		}
	},
	{
		name: 'listMyReservations',
		description: "Liste les réservations de l'utilisateur courant.",
		input_schema: {
			type: 'object',
			properties: {
				status: {
					type: 'string',
					enum: ['UPCOMING', 'PAST', 'CANCELLED'],
					description:
						'Filtrer par statut : UPCOMING (à venir), PAST (passées), CANCELLED (annulées). Défaut : UPCOMING.'
				}
			}
		}
	},
	{
		name: 'cancelReservation',
		description:
			"Annule une réservation existante. N'appeler qu'après confirmation explicite de l'utilisateur.",
		input_schema: {
			type: 'object',
			properties: {
				reservationId: { type: 'string', description: 'ID de la réservation à annuler' }
			},
			required: ['reservationId']
		}
	}
];
