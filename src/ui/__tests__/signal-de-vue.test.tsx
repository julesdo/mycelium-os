import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { SignalDeVue } from '../signal-de-vue';

/**
 * CE QUI EST VU SE DIT QUAND IL EST RENDU (relecture du 21/10/2026) : la carte du lundi
 * s'inscrit montrée seulement si l'écran la pose, une fois par carte.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('le signal de vue', () => {
	it('prévient une fois par clé, à l’affichage', () => {
		const onVue = vi.fn();
		const racine = createRoot(document.createElement('div'));
		act(() => racine.render(<SignalDeVue cle="2026-10-12" onVue={onVue} />));
		act(() => racine.render(<SignalDeVue cle="2026-10-12" onVue={onVue} />));
		expect(onVue).toHaveBeenCalledTimes(1);
		act(() => racine.render(<SignalDeVue cle="2026-10-19" onVue={onVue} />));
		expect(onVue).toHaveBeenCalledTimes(2);
		act(() => racine.unmount());
	});
});
