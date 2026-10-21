import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * LA CÉLÉBRATION NE REVIENT PAS QUAND ON ACTIVE LES NOTIFICATIONS (relecture du
 * 21/10/2026). Activer le push depuis sa ligne change la réponse du serveur (la ligne
 * disparaît) : la célébration ne doit ni se remonter ni se rouvrir par-dessus la
 * feuille des notifications.
 */

const etat: { jalon: unknown } = { jalon: undefined };

vi.mock('../donnees', () => ({ useQuery: () => etat.jalon }));
vi.mock('../push', () => ({
	usePush: () => ({
		etat: 'POSSIBLE',
		enCours: false,
		categories: [],
		onActiver: () => undefined,
		onCouper: () => undefined,
		onRegler: () => undefined
	})
}));
vi.mock('convex/react', () => {
	const mutation = () => Promise.resolve(null);
	return {
		useMutation: () => Object.assign(mutation, { withOptimisticUpdate: () => mutation })
	};
});
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => () => undefined }));

const { CelebrationALaVisite } = await import('../celebration');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

if (!('checkVisibility' in Element.prototype)) {
	Object.defineProperty(Element.prototype, 'checkVisibility', {
		configurable: true,
		value: () => true
	});
}
if (typeof window.matchMedia !== 'function') {
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
	});
}

let portail: HTMLDivElement;
let conteneur: HTMLDivElement;
let racine: Root;

beforeEach(() => {
	portail = document.createElement('div');
	portail.id = 'root';
	conteneur = document.createElement('div');
	document.body.append(portail, conteneur);
	racine = createRoot(conteneur);
});

afterEach(() => {
	act(() => racine.unmount());
	portail.remove();
	conteneur.remove();
});

const RELANCE = {
	id: 'j1',
	cle: 'PREMIERE_RELANCE',
	titre: 'Votre première relance est partie',
	montant: null,
	detail: 'À votre nom. Les réponses arrivent à votre adresse.',
	secondaire: 'PUSH',
	atteintLe: 0
};

async function toucher(intitule: string) {
	const bouton = [...document.body.querySelectorAll('button')].find(
		(b) => b.textContent?.trim() === intitule
	);
	if (bouton === undefined) throw new Error(`Aucun bouton « ${intitule} »`);
	await act(async () => {
		bouton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
	});
}

describe('la célébration à la visite suivante', () => {
	it('garde la feuille des notifications ouverte quand la ligne disparaît', async () => {
		etat.jalon = RELANCE;
		act(() => racine.render(<CelebrationALaVisite />));
		await toucher('Être prévenu quand un client paie');
		expect(document.body.textContent).toContain('Quand un client paie, vous le savez.');

		// Le push s'active : le serveur ne propose plus la ligne.
		etat.jalon = { ...RELANCE, secondaire: null };
		await act(async () => racine.render(<CelebrationALaVisite />));

		// Remontée, la célébration perdait sa feuille des notifications et se rouvrait.
		expect(document.body.textContent).toContain('Quand un client paie, vous le savez.');
	});
});
