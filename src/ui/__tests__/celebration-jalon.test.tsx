import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CelebrationDeJalon, type JalonAffiche } from '../celebration-jalon';

/**
 * LA CÉLÉBRATION D'UNE RÉUSSITE (21/10/2026, le parcours de l'habitude). Elle dit ce
 * qui est rentré, jamais grâce à qui, avec UN bouton et au plus une ligne dessous : les
 * notifications ouvrent leur feuille, l'année mène à sa confirmation.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

if (!('checkVisibility' in Element.prototype)) {
	Object.defineProperty(Element.prototype, 'checkVisibility', {
		configurable: true,
		value: () => true
	});
}

// Le montant défile jusqu'à sa valeur ; sous « réduire les animations », il y est d'emblée.
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

const DIX_MILLE: JalonAffiche = {
	id: 'j1',
	titre: 'Rentrés sur les dossiers suivis',
	montant: 1_000_000n,
	detail: 'En 7 semaines, sur 14 clients.',
	secondaire: null
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

function monter(jalon: JalonAffiche, onVu = vi.fn(), onAnnee = vi.fn()) {
	act(() =>
		racine.render(
			<CelebrationDeJalon
				jalon={jalon}
				bloquee={false}
				push={{ etat: 'POSSIBLE', enCours: false, onActiver: vi.fn() }}
				onVu={onVu}
				onAnnee={onAnnee}
				onNePlusProposer={vi.fn()}
			/>
		)
	);
	return { onVu, onAnnee };
}

describe('la célébration d’un jalon', () => {
	it('dit le montant rentré sur les dossiers suivis, jamais grâce à qui', async () => {
		const { onVu } = monter(DIX_MILLE);
		const texte = document.body.textContent ?? '';
		expect(texte).toMatch(/10\s000,00\s€/);
		expect(texte).toContain('Rentrés sur les dossiers suivis');
		expect(texte).not.toMatch(/grâce à|garanti/i);
		await toucher('Continuer');
		expect(onVu).toHaveBeenCalledWith('AUCUNE');
	});

	it('ouvre la feuille des notifications depuis sa ligne, et la compte touchée', async () => {
		const { onVu } = monter({
			...DIX_MILLE,
			titre: 'Votre première relance est partie',
			montant: null,
			secondaire: 'PUSH'
		});
		await toucher('Être prévenu quand un client paie');
		expect(document.body.textContent).toContain('Quand un client paie, vous le savez.');
		expect(onVu).not.toHaveBeenCalled();
		await toucher('Plus tard');
		expect(onVu).toHaveBeenCalledWith('TOUCHEE');
	});

	it('compte la ligne passée quand on continue sans la toucher', async () => {
		const { onVu } = monter({ ...DIX_MILLE, secondaire: 'ANNEE' });
		await toucher('Continuer');
		expect(onVu).toHaveBeenCalledWith('PASSEE');
	});

	it('mène à la confirmation de l’année depuis sa ligne', async () => {
		const { onVu, onAnnee } = monter({ ...DIX_MILLE, secondaire: 'ANNEE' });
		await toucher('Passer à l’année : 2 mois offerts');
		expect(onVu).toHaveBeenCalledWith('TOUCHEE');
		expect(onAnnee).toHaveBeenCalled();
	});

	it('se tait pour de bon sur « Ne plus me le proposer »', async () => {
		const onNePlusProposer = vi.fn();
		const onVu = vi.fn();
		act(() =>
			racine.render(
				<CelebrationDeJalon
					jalon={{ ...DIX_MILLE, secondaire: 'ANNEE' }}
					bloquee={false}
					push={undefined}
					onVu={onVu}
					onAnnee={vi.fn()}
					onNePlusProposer={onNePlusProposer}
				/>
			)
		);
		await toucher('Ne plus me le proposer');
		expect(onNePlusProposer).toHaveBeenCalledWith('ANNEE');
		expect(onVu).toHaveBeenCalledWith('TOUCHEE');
	});

	it('tait la recommandation tant que le parrainage n’est pas ouvert', () => {
		monter({ ...DIX_MILLE, secondaire: 'RECOMMANDATION' });
		expect(document.body.textContent).not.toContain('confrère');
	});
});
