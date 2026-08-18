export function healthScoreToColor(score: number): 'green' | 'yellow' | 'red' {
	if (score >= 80) return 'green';
	if (score >= 50) return 'yellow';
	return 'red';
}
