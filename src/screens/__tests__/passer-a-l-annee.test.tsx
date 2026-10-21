import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GestionDeLaFormule, type GestionAffichee } from '../compte/gestion-formule';
import type { AbonnementAffiche } from '../compte/facturation';
import { LIMITES } from '../../lib/config/tarifs';

/**
 * « PASSER À L'ANNÉE » DEPUIS UNE CÉLÉBRATION (relecture du 21/10/2026). La confirmation
 * s'ouvre d'emblée UNE fois : l'écran dit qu'elle est ouverte, pour que rouvrir la rangée
 * « Abonnement » ne la rouvre pas.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

if (!('checkVisibility' in Element.prototype)) {
	Object.defineProperty(Element.prototype, 'checkVisibility', {
		configurable: true,
		value: () => true
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

const ABONNEMENT = {
	tier: 'solo',
	isDev: false,
	paiementOuvert: true,
	statut: 'active',
	formule: 'solo',
	rythme: 'mensuel',
	essaiFinLe: null,
	prochainPrelevementLe: null,
	resiliationLe: null,
	offertJusquAu: null,
	clientPaddle: true,
	essaiDisponible: false,
	recommandee: 'equipe',
	limites: LIMITES.solo,
	utilisateurs: 1,
	clientsSuivis: 0
} satisfies AbonnementAffiche;

const GESTION: GestionAffichee = {
	apercu: () => Promise.resolve({ aujourdhui: 0, ensuite: 12_000, prochainLe: null }),
	changer: () => Promise.resolve(),
	resilier: () => Promise.resolve(),
	reprendre: () => Promise.resolve(),
	onGererLaCarte: () => undefined,
	portailEnCours: false
};

describe('passer à l’année depuis une célébration', () => {
	it('dit une fois que la confirmation s’est ouverte', async () => {
		const onAnneeOuverte = vi.fn();
		await act(async () =>
			racine.render(
				<GestionDeLaFormule
					abonnement={ABONNEMENT}
					gestion={GESTION}
					maintenant={0}
					passerALAnnee
					onAnneeOuverte={onAnneeOuverte}
				/>
			)
		);
		expect(onAnneeOuverte).toHaveBeenCalledTimes(1);
	});
});
