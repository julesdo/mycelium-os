type SourceType =
	| 'COMPLIANCE_ALERT'
	| 'INCIDENT'
	| 'VIOLATION'
	| 'MAINTENANCE'
	| 'OPTIMIZER_RECOMMENDATION'
	| 'MANUAL';

type PlanTier = 'free' | 'essential' | 'professional' | 'business' | 'enterprise';

const SEVERITY_BASE: Record<SourceType, number> = {
	COMPLIANCE_ALERT: 50,
	INCIDENT: 60,
	VIOLATION: 30,
	MAINTENANCE: 25,
	OPTIMIZER_RECOMMENDATION: 15,
	MANUAL: 40
};

const TIER_WEIGHT: Record<PlanTier, number> = {
	free: 0.8,
	essential: 1.0,
	professional: 1.15,
	business: 1.3,
	enterprise: 1.3
};

export function calculatePriorityScore(params: {
	sourceType: SourceType;
	dueDate?: number;
	planTier: PlanTier;
	isRegulatory: boolean;
	now?: number;
}): number {
	const now = params.now ?? Date.now();
	const base = SEVERITY_BASE[params.sourceType];
	const tierWeight = TIER_WEIGHT[params.planTier] ?? 1.0;

	let urgencyMultiplier = 1.0;
	if (params.dueDate !== undefined) {
		const daysLeft = (params.dueDate - now) / (1000 * 60 * 60 * 24);
		if (daysLeft < 0) urgencyMultiplier = 3.0;
		else if (daysLeft <= 2) urgencyMultiplier = 2.2;
		else if (daysLeft <= 7) urgencyMultiplier = 1.6;
		else if (daysLeft <= 30) urgencyMultiplier = 1.2;
		else urgencyMultiplier = 1.0;
	}

	let score = base * urgencyMultiplier * tierWeight;

	if (params.isRegulatory) {
		score = Math.max(score, 70);
	}

	return Math.round(score);
}

export function scoreToPriorityLabel(score: number): 'CRITICAL' | 'URGENT' | 'NORMAL' | 'INFO' {
	if (score >= 120) return 'CRITICAL';
	if (score >= 70) return 'URGENT';
	if (score >= 30) return 'NORMAL';
	return 'INFO';
}
