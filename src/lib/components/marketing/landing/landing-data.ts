/**
 * Toutes les chaînes affichées sont des références de clés Tolgee résolues
 * dans les templates via $t(...). Aucune copie en dur ici (sauf les valeurs
 * chiffrées du bandeau de preuve, qui ne sont pas des chaînes traduisibles).
 */

// ── Bandeau de preuve (chiffres EGalim réels) ─────────────────────────────────
export type ProofStat = {
	id: string;
	value: string;
	labelKey: string;
};

export const proofStats: ProofStat[] = [
	{ id: 'non_compliant', value: '85 %', labelKey: 'landing.proof.non_compliant' },
	{ id: 'non_declaring', value: '79 %', labelKey: 'landing.proof.non_declaring' },
	{ id: 'deadline', value: '31 mars', labelKey: 'landing.proof.deadline' }
];

// ── Pricing ───────────────────────────────────────────────────────────────────
// Non affiché sur la landing actuelle (route /pricing dépubliée le temps de la
// refonte EGalim) — conservé pour pricing-section.svelte / pricing-card.svelte,
// qui survivent en vue d'une réintégration ultérieure.
export type PricingTier = {
	id: string;
	tier: string;
	priceKey: string;
	subKey: string;
	agentsKey: string;
	featureKeys: string[];
	ctaKey: string;
	featured?: boolean;
};

export const pricingTiers: PricingTier[] = [
	{
		id: 'diagnostic',
		tier: 'Essential',
		priceKey: 'landing.pricing.essential.price',
		subKey: 'landing.pricing.essential.sub',
		agentsKey: 'landing.pricing.essential.agents',
		featureKeys: [
			'landing.pricing.essential.f1',
			'landing.pricing.essential.f2',
			'landing.pricing.essential.f3',
			'landing.pricing.essential.f4',
			'landing.pricing.essential.f5'
		],
		ctaKey: 'landing.pricing.cta_start'
	},
	{
		id: 'conformite',
		tier: 'Professional',
		priceKey: 'landing.pricing.professional.price',
		subKey: 'landing.pricing.professional.sub',
		agentsKey: 'landing.pricing.professional.agents',
		featureKeys: [
			'landing.pricing.professional.f1',
			'landing.pricing.professional.f2',
			'landing.pricing.professional.f3',
			'landing.pricing.professional.f4',
			'landing.pricing.professional.f5'
		],
		ctaKey: 'landing.pricing.cta_start',
		featured: true
	},
	{
		id: 'operateur',
		tier: 'Business',
		priceKey: 'landing.pricing.business.price',
		subKey: 'landing.pricing.business.sub',
		agentsKey: 'landing.pricing.business.agents',
		featureKeys: [
			'landing.pricing.business.f1',
			'landing.pricing.business.f2',
			'landing.pricing.business.f3',
			'landing.pricing.business.f4',
			'landing.pricing.business.f5'
		],
		ctaKey: 'landing.pricing.cta_start'
	},
	{
		id: 'custom',
		tier: 'Enterprise',
		priceKey: 'landing.pricing.enterprise.price',
		subKey: 'landing.pricing.enterprise.sub',
		agentsKey: 'landing.pricing.enterprise.agents',
		featureKeys: [
			'landing.pricing.enterprise.f1',
			'landing.pricing.enterprise.f2',
			'landing.pricing.enterprise.f3',
			'landing.pricing.enterprise.f4',
			'landing.pricing.enterprise.f5'
		],
		ctaKey: 'landing.pricing.cta_contact'
	}
];

// ── FAQ ───────────────────────────────────────────────────────────────────────
export type Faq = {
	id: string;
	qKey: string;
	aKey: string;
};

export const faqs: Faq[] = [
	{ id: 'q1', qKey: 'landing.faq.q1.q', aKey: 'landing.faq.q1.a' },
	{ id: 'q2', qKey: 'landing.faq.q2.q', aKey: 'landing.faq.q2.a' },
	{ id: 'q3', qKey: 'landing.faq.q3.q', aKey: 'landing.faq.q3.a' },
	{ id: 'q4', qKey: 'landing.faq.q4.q', aKey: 'landing.faq.q4.a' }
];
