import { browser } from '$app/environment';

export type AgentType = 'concierge' | 'manager' | 'compliance';

class CopilotStore {
	isOpen = $state(false);
	activeAgent = $state<AgentType>('concierge');

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
}

export const copilot = new CopilotStore();
