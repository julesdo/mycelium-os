import type { Doc } from '../_generated/dataModel';

// Score composite 0-100 : 100 = rien à signaler, descend avec le volume et la gravité des tâches ouvertes.
// Calcul à la volée — pas persisté. Coût négligeable à l'échelle de 100 clients.
export function calculateHealthScore(openTasks: Doc<'concierge_tasks'>[]): number {
	if (openTasks.length === 0) return 100;

	const penalty = openTasks.reduce((sum, task) => {
		switch (task.priority) {
			case 'CRITICAL':
				return sum + 25;
			case 'URGENT':
				return sum + 12;
			case 'NORMAL':
				return sum + 4;
			default:
				return sum + 1;
		}
	}, 0);

	return Math.max(0, 100 - penalty);
}

export function healthScoreToColor(score: number): 'green' | 'yellow' | 'red' {
	if (score >= 80) return 'green';
	if (score >= 50) return 'yellow';
	return 'red';
}
