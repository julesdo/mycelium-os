import { browser } from '$app/environment';

export type AgentType = 'concierge' | 'manager' | 'compliance';

export interface AgentConfig {
	id: AgentType;
	label: string;
	description: string;
	endpoint: string;
	defaultQuickPrompts: string[];
	placeholder: string;
}

export const AGENT_CONFIGS: Record<AgentType, AgentConfig> = {
	concierge: {
		id: 'concierge',
		label: 'Réservation',
		description: 'Réservez en langage naturel',
		endpoint: '/api/concierge',
		defaultQuickPrompts: [
			'Réserver un véhicule pour demain matin',
			'Voir mes prochains trajets',
			'Annuler une réservation'
		],
		placeholder: 'Ex : Réserve-moi un véhicule lundi matin…'
	},
	manager: {
		id: 'manager',
		label: 'Analyse flotte',
		description: 'Interrogez vos données en NL',
		endpoint: '/api/manager',
		defaultQuickPrompts: [
			"Résume l'état de la flotte",
			"Taux d'utilisation ce mois",
			"Coûts par catégorie ce trimestre",
			"Entretiens en retard"
		],
		placeholder: "Ex : Taux d'utilisation ce mois ?"
	},
	compliance: {
		id: 'compliance',
		label: 'Conformité',
		description: 'Surveillance réglementaire',
		endpoint: '/api/compliance',
		defaultQuickPrompts: [
			'Tableau de bord conformité',
			'Documents véhicules expirés',
			'Permis conducteurs à renouveler',
			'Contraventions en attente'
		],
		placeholder: 'Ex : Alertes conformité actives ?'
	}
};

const STORAGE_KEY = 'mycelium_quick_prompts';

function loadCustomPrompts(): Partial<Record<AgentType, string[]>> {
	if (!browser) return {};
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as Partial<Record<AgentType, string[]>>) : {};
	} catch {
		return {};
	}
}

function saveCustomPrompts(data: Partial<Record<AgentType, string[]>>) {
	if (!browser) return;
	localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

class CopilotStore {
	isOpen = $state(false);
	activeAgent = $state<AgentType>('concierge');
	customQuickPrompts = $state<Partial<Record<AgentType, string[]>>>(loadCustomPrompts());

	get activeConfig(): AgentConfig {
		return AGENT_CONFIGS[this.activeAgent];
	}

	get quickPrompts(): string[] {
		return this.customQuickPrompts[this.activeAgent] ?? AGENT_CONFIGS[this.activeAgent].defaultQuickPrompts;
	}

	open(agent?: AgentType) {
		if (agent) this.activeAgent = agent;
		this.isOpen = true;
		if (browser) setTimeout(() => document.getElementById('copilot-input')?.focus(), 50);
	}

	close() {
		this.isOpen = false;
	}

	toggle(agent?: AgentType) {
		if (this.isOpen && (!agent || agent === this.activeAgent)) {
			this.close();
		} else {
			this.open(agent);
		}
	}

	setCustomPrompts(agent: AgentType, prompts: string[]) {
		this.customQuickPrompts = { ...this.customQuickPrompts, [agent]: prompts };
		saveCustomPrompts(this.customQuickPrompts);
	}

	resetPrompts(agent: AgentType) {
		const next = { ...this.customQuickPrompts };
		delete next[agent];
		this.customQuickPrompts = next;
		saveCustomPrompts(next);
	}
}

export const copilot = new CopilotStore();
