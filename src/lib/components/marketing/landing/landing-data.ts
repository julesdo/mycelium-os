import type { Component } from 'svelte';
import type { IconProps } from '@lucide/svelte';
import MessageSquareText from '@lucide/svelte/icons/message-square-text';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import ShieldCheck from '@lucide/svelte/icons/shield-check';
import Banknote from '@lucide/svelte/icons/banknote';
import Trophy from '@lucide/svelte/icons/trophy';
import Car from '@lucide/svelte/icons/car';
import CalendarCheck from '@lucide/svelte/icons/calendar-check';
import CalendarRange from '@lucide/svelte/icons/calendar-range';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import Receipt from '@lucide/svelte/icons/receipt';
import Wrench from '@lucide/svelte/icons/wrench';
import Camera from '@lucide/svelte/icons/camera';
import Coins from '@lucide/svelte/icons/coins';
import Leaf from '@lucide/svelte/icons/leaf';

type LucideIcon = Component<IconProps>;

/**
 * Toutes les chaînes affichées sont des références de clés Tolgee résolues
 * dans les templates via $t(...). Aucune copie en dur ici.
 */

// ── Bandeau de preuve (chiffres produit réels) ────────────────────────────────
export type ProofStat = {
	id: string;
	value: string;
	labelKey: string;
};

export const proofStats: ProofStat[] = [
	{ id: 'agents', value: '6', labelKey: 'landing.proof.agents' },
	{ id: 'onboarding', value: '15 min', labelKey: 'landing.proof.onboarding' },
	{ id: 'modules', value: '9', labelKey: 'landing.proof.modules' },
	{ id: 'hosting', value: 'EU', labelKey: 'landing.proof.hosting' }
];

// ── Showcases features (3 splits alternés) ────────────────────────────────────
export type FeatureShowcase = {
	id: string;
	titleKey: string;
	descKey: string;
	bulletKeys: string[];
	mockup: 'fleet' | 'dashboard' | 'compliance' | 'concierge';
	reverse?: boolean;
};

export const featureShowcases: FeatureShowcase[] = [
	{
		id: 'fleet',
		titleKey: 'landing.features.fleet.title',
		descKey: 'landing.features.fleet.desc',
		bulletKeys: [
			'landing.features.fleet.b1',
			'landing.features.fleet.b2',
			'landing.features.fleet.b3',
			'landing.features.fleet.b4'
		],
		mockup: 'fleet'
	},
	{
		id: 'dashboard',
		titleKey: 'landing.features.dashboard.title',
		descKey: 'landing.features.dashboard.desc',
		bulletKeys: [
			'landing.features.dashboard.b1',
			'landing.features.dashboard.b2',
			'landing.features.dashboard.b3',
			'landing.features.dashboard.b4'
		],
		mockup: 'dashboard',
		reverse: true
	},
	{
		id: 'compliance',
		titleKey: 'landing.features.compliance.title',
		descKey: 'landing.features.compliance.desc',
		bulletKeys: [
			'landing.features.compliance.b1',
			'landing.features.compliance.b2',
			'landing.features.compliance.b3',
			'landing.features.compliance.b4'
		],
		mockup: 'compliance'
	},
	{
		id: 'concierge',
		titleKey: 'landing.features.concierge.title',
		descKey: 'landing.features.concierge.desc',
		bulletKeys: [
			'landing.features.concierge.b1',
			'landing.features.concierge.b2',
			'landing.features.concierge.b3',
			'landing.features.concierge.b4'
		],
		mockup: 'concierge',
		reverse: true
	}
];

// ── 6 agents IA ───────────────────────────────────────────────────────────────
export type Agent = {
	id: string;
	icon: LucideIcon;
	nameKey: string;
	roleKey: string;
	descKey: string;
	tier: string;
	featured?: boolean;
};

export const agents: Agent[] = [
	{
		id: 'concierge',
		icon: MessageSquareText,
		nameKey: 'landing.agents.concierge.name',
		roleKey: 'landing.agents.concierge.role',
		descKey: 'landing.agents.concierge.desc',
		tier: 'Essential',
		featured: true
	},
	{
		id: 'manager',
		icon: BarChart3,
		nameKey: 'landing.agents.manager.name',
		roleKey: 'landing.agents.manager.role',
		descKey: 'landing.agents.manager.desc',
		tier: 'Professional'
	},
	{
		id: 'optimizer',
		icon: TrendingUp,
		nameKey: 'landing.agents.optimizer.name',
		roleKey: 'landing.agents.optimizer.role',
		descKey: 'landing.agents.optimizer.desc',
		tier: 'Business'
	},
	{
		id: 'compliance',
		icon: ShieldCheck,
		nameKey: 'landing.agents.compliance.name',
		roleKey: 'landing.agents.compliance.role',
		descKey: 'landing.agents.compliance.desc',
		tier: 'Professional'
	},
	{
		id: 'negotiator',
		icon: Banknote,
		nameKey: 'landing.agents.negotiator.name',
		roleKey: 'landing.agents.negotiator.role',
		descKey: 'landing.agents.negotiator.desc',
		tier: 'Business'
	},
	{
		id: 'coach',
		icon: Trophy,
		nameKey: 'landing.agents.coach.name',
		roleKey: 'landing.agents.coach.role',
		descKey: 'landing.agents.coach.desc',
		tier: 'Business'
	}
];

// ── Étapes de mise en route ───────────────────────────────────────────────────
export type Step = {
	n: string;
	titleKey: string;
	descKey: string;
};

export const steps: Step[] = [
	{ n: '01', titleKey: 'landing.steps.s1.title', descKey: 'landing.steps.s1.desc' },
	{ n: '02', titleKey: 'landing.steps.s2.title', descKey: 'landing.steps.s2.desc' },
	{ n: '03', titleKey: 'landing.steps.s3.title', descKey: 'landing.steps.s3.desc' }
];

// ── Modules (grille) ──────────────────────────────────────────────────────────
export type Module = {
	id: string;
	icon: LucideIcon;
	titleKey: string;
	descKey: string;
};

export const modules: Module[] = [
	{
		id: 'fleet',
		icon: Car,
		titleKey: 'landing.modules.fleet.title',
		descKey: 'landing.modules.fleet.desc'
	},
	{
		id: 'reservations',
		icon: CalendarCheck,
		titleKey: 'landing.modules.reservations.title',
		descKey: 'landing.modules.reservations.desc'
	},
	{
		id: 'calendar',
		icon: CalendarRange,
		titleKey: 'landing.modules.calendar.title',
		descKey: 'landing.modules.calendar.desc'
	},
	{
		id: 'dashboard',
		icon: LayoutDashboard,
		titleKey: 'landing.modules.dashboard.title',
		descKey: 'landing.modules.dashboard.desc'
	},
	{
		id: 'finance',
		icon: Receipt,
		titleKey: 'landing.modules.finance.title',
		descKey: 'landing.modules.finance.desc'
	},
	{
		id: 'maintenance',
		icon: Wrench,
		titleKey: 'landing.modules.maintenance.title',
		descKey: 'landing.modules.maintenance.desc'
	},
	{
		id: 'inspections',
		icon: Camera,
		titleKey: 'landing.modules.inspections.title',
		descKey: 'landing.modules.inspections.desc'
	},
	{
		id: 'expenses',
		icon: Coins,
		titleKey: 'landing.modules.expenses.title',
		descKey: 'landing.modules.expenses.desc'
	},
	{
		id: 'carbon',
		icon: Leaf,
		titleKey: 'landing.modules.carbon.title',
		descKey: 'landing.modules.carbon.desc'
	}
];

// ── Pricing ───────────────────────────────────────────────────────────────────
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
		id: 'essential',
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
		id: 'professional',
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
		id: 'business',
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
		id: 'enterprise',
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
	{ id: 'q4', qKey: 'landing.faq.q4.q', aKey: 'landing.faq.q4.a' },
	{ id: 'q5', qKey: 'landing.faq.q5.q', aKey: 'landing.faq.q5.a' },
	{ id: 'q6', qKey: 'landing.faq.q6.q', aKey: 'landing.faq.q6.a' }
];
