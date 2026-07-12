import { browser } from '$app/environment';

const STORAGE_KEY = 'mycelium:preview_as_employee';

function createPreviewStore() {
	let active = $state(false);

	if (browser) {
		active = localStorage.getItem(STORAGE_KEY) === '1';
	}

	return {
		get active() {
			return active;
		},
		enter() {
			active = true;
			if (browser) localStorage.setItem(STORAGE_KEY, '1');
		},
		exit() {
			active = false;
			if (browser) localStorage.removeItem(STORAGE_KEY);
		}
	};
}

export const previewAsEmployee = createPreviewStore();
