import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	FeuilleDeMontee,
	auDelaDeLaLimite,
	formuleAvecPlusDAnalyses,
	formuleQuiSuit,
	monteeVers,
	retourDuQuota,
	type FormuleDuCompte
} from '../compte/montee';
import type { AbonnementAffiche, CaisseAffichee } from '../compte/facturation';
import type { GestionAffichee } from '../compte/gestion-formule';
import { LIMITES } from '../../lib/config/tarifs';

/**
 * AU MOMENT DU BESOIN (21/10/2026, le parcours de l'habitude, moment 6). On ne refuse
 * pas : on garde le geste et on montre la formule du dessus, HT et TTC, comme pour les
 * places de l'équipe.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

if (!('checkVisibility' in Element.prototype)) {
	Object.defineProperty(Element.prototype, 'checkVisibility', {
		configurable: true,
		value: () => true
	});
}

const SOLO = {
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
	clientsSuivis: 10
} satisfies AbonnementAffiche;

const GESTION: GestionAffichee = {
	apercu: () => Promise.resolve({ aujourdhui: 4_700, ensuite: 5_900, prochainLe: null }),
	changer: () => Promise.resolve(),
	resilier: () => Promise.resolve(),
	reprendre: () => Promise.resolve(),
	onGererLaCarte: () => undefined,
	portailEnCours: false
};

describe('la formule du dessus', () => {
	it('suit les clients au-delà de la limite', () => {
		expect(formuleQuiSuit(1)).toBe('solo');
		expect(formuleQuiSuit(11)).toBe('equipe');
		expect(formuleQuiSuit(51)).toBe('pro');
	});

	it('dit quand un client entrerait au-delà', () => {
		expect(auDelaDeLaLimite(SOLO, 1)).toBe(true);
		expect(auDelaDeLaLimite({ ...SOLO, clientsSuivis: 9 }, 1)).toBe(false);
		expect(auDelaDeLaLimite(SOLO, 0)).toBe(false);
		expect(auDelaDeLaLimite({ ...SOLO, limites: LIMITES.pro }, 1)).toBe(false);
	});

	it('ouvre plus d’analyses, et dit quand le quota revient', () => {
		expect(formuleAvecPlusDAnalyses(LIMITES.solo.analysesParMois)).toBe('equipe');
		expect(formuleAvecPlusDAnalyses(LIMITES.pro.analysesParMois)).toBeNull();
		expect(retourDuQuota(Date.UTC(2026, 9, 21, 12))).toBe('2026-11-01');
		expect(retourDuQuota(Date.UTC(2026, 11, 31, 12))).toBe('2027-01-01');
	});

	it('change de formule pour un abonné, souscrit pour un compte sans abonnement', () => {
		const abonne: FormuleDuCompte = { abonnement: SOLO, gestion: GESTION, maintenant: 0 };
		expect(monteeVers(abonne, 'equipe')?.genre).toBe('CHANGER');
		expect(monteeVers(abonne, 'solo')).toBeNull();
		expect(monteeVers(abonne, null)).toBeNull();
		const caisse = { disponible: true } as unknown as CaisseAffichee;
		const decouverte: FormuleDuCompte = {
			abonnement: { ...SOLO, statut: null, formule: null, rythme: null },
			caisse,
			maintenant: 0
		};
		expect(monteeVers(decouverte, 'solo')?.genre).toBe('SOUSCRIRE');
		expect(monteeVers({ abonnement: SOLO, maintenant: 0 }, 'equipe')).toBeNull();
	});
});

describe('la feuille de montée', () => {
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

	it('montre la formule du dessus sous le geste, et la met en place avant de le finir', async () => {
		const changer = vi.fn(() => Promise.resolve());
		const onEnPlace = vi.fn();
		const montee = monteeVers({ abonnement: SOLO, gestion: { ...GESTION, changer }, maintenant: 0 }, 'equipe')!;
		await act(async () =>
			racine.render(
				<FeuilleDeMontee
					montee={montee}
					ouverte
					onFermer={() => undefined}
					titre="Suivre Garage Martin"
					contexte="Équipe suit 50 clients en retard."
					libelleConfirmer="Passer à Équipe et suivre"
					onEnPlace={onEnPlace}
				/>
			)
		);
		const texte = document.body.textContent ?? '';
		expect(texte).toContain('Suivre Garage Martin');
		expect(texte).toContain('Équipe suit 50 clients en retard.');
		const bouton = [...document.body.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Passer à Équipe et suivre'
		);
		await act(async () => {
			bouton?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		});
		expect(changer).toHaveBeenCalledWith('equipe', 'mensuel', false);
		expect(onEnPlace).toHaveBeenCalledTimes(1);
	});
});
