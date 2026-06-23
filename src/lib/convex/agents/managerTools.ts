import type { AnthropicTool } from './tools';

export const managerTools: AnthropicTool[] = [
	{
		name: 'getFleetUtilizationStats',
		description:
			"Retourne les statistiques d'utilisation de la flotte sur une période. Utiliser pour répondre aux questions sur les véhicules sous-utilisés, le taux d'utilisation, les véhicules les plus utilisés.",
		input_schema: {
			type: 'object',
			properties: {
				period: {
					type: 'string',
					enum: [
						'this_week',
						'this_month',
						'last_month',
						'this_quarter',
						'this_year',
						'last_90_days'
					],
					description: "La période d'analyse"
				},
				sortBy: {
					type: 'string',
					enum: ['most_used', 'least_used'],
					description: 'Ordre de tri des résultats (défaut: least_used)'
				}
			},
			required: ['period']
		}
	},
	{
		name: 'getCostBreakdown',
		description:
			'Analyse les coûts de la flotte par catégorie et/ou par véhicule. Utiliser pour les questions budget, dépenses carburant, ROI.',
		input_schema: {
			type: 'object',
			properties: {
				period: {
					type: 'string',
					enum: ['this_month', 'last_month', 'this_quarter', 'this_year'],
					description: 'La période analysée'
				},
				groupBy: {
					type: 'string',
					enum: ['category', 'vehicle', 'both'],
					description: 'Regroupement des coûts : par catégorie, par véhicule, ou les deux'
				}
			},
			required: ['period', 'groupBy']
		}
	},
	{
		name: 'getReservationActivity',
		description:
			'Statistiques des réservations : qui réserve le plus, quels véhicules, quelles périodes de pointe.',
		input_schema: {
			type: 'object',
			properties: {
				period: {
					type: 'string',
					enum: ['this_week', 'this_month', 'last_month', 'this_quarter'],
					description: 'La période analysée'
				},
				groupBy: {
					type: 'string',
					enum: ['user', 'vehicle', 'day_of_week', 'status'],
					description:
						'Regroupement : par utilisateur, par véhicule, par jour de semaine, ou par statut'
				}
			},
			required: ['period', 'groupBy']
		}
	},
	{
		name: 'getMaintenanceOverview',
		description:
			"Vue d'ensemble des entretiens planifiés, en cours et historique des coûts maintenance.",
		input_schema: {
			type: 'object',
			properties: {
				includeUpcoming: {
					type: 'boolean',
					description: 'Inclure les entretiens à venir dans les 30 prochains jours'
				},
				includeOverdue: {
					type: 'boolean',
					description: 'Inclure les entretiens en retard ou dépassés'
				}
			}
		}
	},
	{
		name: 'getComplianceStatus',
		description:
			'Statut de conformité de la flotte : leasings expirant bientôt, entretiens dus, véhicules en alerte.',
		input_schema: {
			type: 'object',
			properties: {
				daysAhead: {
					type: 'number',
					description: "Nombre de jours à anticiper pour les alertes (défaut: 30)"
				}
			}
		}
	},
	{
		name: 'getFleetSummary',
		description:
			"Résumé rapide de l'état actuel de la flotte : disponibilité, réservations du jour, alertes actives. Utiliser pour les questions générales sur l'état de la flotte.",
		input_schema: {
			type: 'object',
			properties: {}
		}
	}
];
