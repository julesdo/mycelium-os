import type { MarketingMarkdownDocument } from '$lib/markdown/types';
import { LEGAL_CONFIG } from '$lib/config/legal';

export const marketingMarkdown: MarketingMarkdownDocument = {
	title: `${LEGAL_CONFIG.brandName} — Service de conciergerie pour flottes d'entreprise`,
	description:
		"Mycelium gère et optimise la flotte de votre entreprise grâce à des concierges humains et des agents IA spécialisés. Réservations, conformité, coûts — zéro tâche opérationnelle pour vos équipes.",
	sections: [
		{
			heading: 'Ce que fait Mycelium',
			paragraphs: [
				`${LEGAL_CONFIG.brandName} est un service de conciergerie pour la gestion de flotte d'entreprise. Des concierges humains et des agents IA spécialisés prennent en charge l'opérationnel de votre flotte — réservations, conformité réglementaire, suivi des coûts, états des lieux — pendant que vous pilotez depuis un tableau de bord simple.`,
				"Le service s'adresse aux PME et ETI françaises de 50 à 500 salariés disposant d'une flotte de 15 à 150 véhicules d'entreprise. DAF, DRH et gestionnaires de flotte récupèrent en moyenne plusieurs heures par semaine dès le premier mois."
			]
		},
		{
			heading: 'Ce que Mycelium gère pour vous',
			bullets: [
				'Réservations conversationnelles — les salariés réservent en langage naturel via le Concierge IA',
				'Conformité réglementaire — alertes permis, contrôles techniques, assurances, rapport CSRD scope 1+2+3',
				'Suivi financier — coûts par véhicule et catégorie, notes de frais au barème URSSAF, export comptable',
				'États des lieux — photos guidées sur 6 angles, comparaison avant/après, workflow contraventions',
				'Maintenance — planning entretiens, alertes proactives, suivi des garages',
				"Insights hebdomadaires — rapport d'optimisation automatique, détection de sous-utilisation, ROI chiffré"
			]
		},
		{
			heading: 'Les agents IA spécialisés',
			bullets: [
				'Concierge — réservation conversationnelle en langage naturel pour les salariés',
				'Assistant Gestionnaire — interface NL pour interroger la flotte (DAF, RH)',
				'Optimiseur de flotte — insights hebdomadaires proactifs et détection de sous-utilisation',
				'Compliance Officer — surveillance réglementaire continue (URSSAF, CSRD)',
				'Négociateur de coûts — identification des économies et préparation des négociations',
				"Coach conducteurs — score éco-conduite, feedback personnalisé, classement d'équipe"
			]
		},
		{
			heading: 'Tarifs',
			paragraphs: [
				'Mycelium propose 3 paliers selon la taille de votre flotte et le niveau de service souhaité. Tous les plans incluent le Concierge IA et la gestion de flotte de base. Onboarding en 15 minutes, sans engagement, données hébergées en Europe.',
				'Essential à partir de 490 €/mois HT pour 50 conducteurs. Professional à 890 €/mois pour 150 conducteurs avec sync comptable et conformité. Business à 1 490 €/mois pour 300 conducteurs avec la suite IA complète.'
			]
		},
		{
			heading: 'Démarrer',
			paragraphs: ['Demandez une démonstration ou créez votre compte directement.'],
			links: [
				{
					label: 'Demander une démo',
					href: '/about',
					description: 'Échangez avec un membre de notre équipe pour voir Mycelium en action'
				},
				{
					label: 'Démarrer gratuitement',
					href: '/signup',
					description: "Créez votre compte et importez votre flotte en 15 minutes"
				}
			]
		}
	]
};
