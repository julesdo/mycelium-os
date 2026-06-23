import { mode } from 'mode-watcher';
import { derived } from 'svelte/store';

export const theme = derived(mode, ($mode) => {
	if ($mode === 'dark') return 'dark' as const;
	return 'light' as const;
});
