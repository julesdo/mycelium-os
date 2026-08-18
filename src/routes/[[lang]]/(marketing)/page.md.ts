import type { MarketingMarkdownDocument } from '$lib/markdown/types';
import { LEGAL_CONFIG } from '$lib/config/legal';

export const marketingMarkdown: MarketingMarkdownDocument = {
	title: `${LEGAL_CONFIG.brandName} — Diagnostic EGalim pour la restauration collective`,
	description:
		"Mycelium calcule le taux EGalim réel d'une cantine à partir de ses factures fournisseurs et chiffre l'écart en euros vers la conformité (50 % de produits durables dont 20 % de bio).",
	sections: [
		{
			heading: 'Ce que fait Mycelium',
			paragraphs: [
				`${LEGAL_CONFIG.brandName} calcule le taux EGalim réel d'une cantine à partir de ses factures fournisseurs, classées ligne à ligne en valeur d'achat HT. Le résultat est comparé au seuil légal (50 % de produits durables dont 20 % de bio, plus 60 % sur la viande et le poisson) et l'écart est chiffré en euros.`,
				"Le service s'adresse aux gestionnaires de restauration collective — RIE, cliniques, EHPAD, crèches, écoles privées — soumis à l'obligation de déclaration annuelle sur la plateforme « ma cantine » avant le 31 mars."
			]
		},
		{
			heading: 'Pourquoi ce calcul est nécessaire',
			bullets: [
				"Depuis 2024, l'obligation EGalim s'applique aussi aux cantines privées, pas seulement au secteur public",
				"85 % des cantines qui déclarent ne sont pas conformes au seuil légal",
				"79 % des sites concernés ne déclarent rien du tout",
				"La plupart des gestionnaires ne connaissent pas leur propre taux, faute de temps pour classer des milliers de lignes de factures par an",
				"Le local n'entre pas dans le calcul réglementaire — seuls comptent le bio et les labels officiels (Label Rouge, AOP, AOC, IGP, STG, HVE niveau 3, pêche durable, commerce équitable)"
			]
		},
		{
			heading: 'Démarrer',
			paragraphs: ['Demandez un diagnostic pour connaître votre taux réel et son écart au seuil légal.'],
			links: [
				{
					label: 'Demander un diagnostic',
					href: '/about',
					description: 'Échangez avec un membre de notre équipe pour évaluer votre cantine'
				}
			]
		}
	]
};
