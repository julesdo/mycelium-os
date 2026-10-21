import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { paroleDePlume, useRemarquesDePlume } from '../parole-de-plume';

/**
 * LA FÊTE D'UN PAIEMENT REGARDE L'ÉCRAN QUAND ELLE PARLE (relecture du 21/10/2026) : le
 * gérant passé sur la fiche du client pendant l'attente du relevé y voit déjà la coche
 * de « Virement noté ».
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function FicheDuClient() {
	useRemarquesDePlume('CLIENT', []);
	return null;
}

describe('la fête d’un paiement et la fiche du client', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('se tait si le gérant est sur la fiche du client quand elle parlerait', () => {
		paroleDePlume.annoncerPaiement(null, null);
		paroleDePlume.annoncerPaiement(
			{ id: 'r1', client: 'Garage Martin', creeLe: 10, porteUnJalon: false },
			'500 €'
		);
		const conteneur = document.createElement('div');
		const racine = createRoot(conteneur);
		act(() => racine.render(<FicheDuClient />));
		act(() => {
			vi.advanceTimersByTime(5000);
		});
		expect(paroleDePlume.lire().aDire).toBe(0);
		act(() => racine.unmount());
	});
});
