import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmationParSaisie } from '../confirmation-par-saisie';

/**
 * LA CONFIRMATION PAR SAISIE, CLIQUÉE ET SAISIE POUR DE VRAI.
 *
 * Ce garde-fou ne vaut que par ce qu'il refuse : un bouton qui s'active sur une
 * saisie approchée, ou qu'un clic traverse désactivé, laisse passer la
 * suppression d'un compte ou d'un établissement entier. Ces tests montent donc
 * le vrai `Dialog` du kit, tapent dans son champ et cliquent sur ses boutons.
 *
 * ⚠️ LE DIALOGUE REND DANS UN PORTAIL, hors du conteneur du test : tout se
 * cherche dans `document.body`, et chaque test démonte ce qu'il a monté.
 */

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom n'implémente pas `checkVisibility`, que le dialogue du kit appelle à
// l'ouverture. Sans mise en page, un élément monté est tenu pour visible : c'est
// le seul manque comblé ici, le kit lui-même n'est ni simulé ni remplacé.
if (!('checkVisibility' in Element.prototype)) {
	Object.defineProperty(Element.prototype, 'checkVisibility', {
		configurable: true,
		value: () => true
	});
}

const NOM = 'Thumbbb Agency';
const OUVRIR = 'Supprimer Thumbbb Agency';
const CONFIRMER = 'Supprimer définitivement';

let portail: HTMLDivElement;
let conteneur: HTMLDivElement;
let racine: Root;

beforeEach(() => {
	// La cible du portail : `__root.tsx` rend `<div id="root">`, que le `Dialog` cherche par défaut.
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

function monter(onConfirmer: () => void) {
	act(() => {
		racine.render(
			<ConfirmationParSaisie
				titre={`Supprimer ${NOM} ?`}
				texte="Cette action est définitive. Saisissez le nom exact de l’établissement pour confirmer."
				valeurAttendue={NOM}
				invite="Le nom de l’établissement"
				intituleConfirmation={CONFIRMER}
				onConfirmer={onConfirmer}
				declencheur={<button type="button">{OUVRIR}</button>}
			/>
		);
	});
}

function bouton(intitule: string): HTMLButtonElement {
	const trouve = [...document.body.querySelectorAll('button')].find(
		(candidat) => candidat.textContent?.trim() === intitule
	);
	if (trouve === undefined) throw new Error(`Aucun bouton « ${intitule} » à l’écran.`);
	return trouve;
}

function champ(): HTMLInputElement {
	const trouve = document.body.querySelector('input');
	if (trouve === null) throw new Error('Aucun champ à l’écran.');
	return trouve;
}

/**
 * Le dialogue est-il ouvert ?
 *
 * ⚠️ PAS « LE CHAMP A DISPARU ». Le kit démonte le dialogue à la fin de sa
 * transition de fermeture, et jsdom n'en joue aucune : fermé, il reste monté,
 * transparent. Son contenu ne porte `data-open` qu'ouvert, et c'est ce qui se
 * lit ici. Le premier test vérifie que ce signal distingue bien les deux états.
 */
function ouvert(): boolean {
	return document.body.querySelector('[data-part="content"][data-open="true"]') !== null;
}

function cliquer(element: Element) {
	act(() => {
		element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
	});
}

/** Une saisie comme le navigateur la fait : la valeur posée par le setter natif, puis l'événement qui remonte. */
function saisir(valeur: string) {
	const cible = champ();
	const poser = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
	act(() => {
		poser?.call(cible, valeur);
		cible.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

function ouvrir() {
	cliquer(bouton(OUVRIR));
}

describe('la confirmation par saisie', () => {
	it('s’ouvre sur son déclencheur, et demande en français ce qu’on saisit', () => {
		monter(vi.fn());
		expect(ouvert()).toBe(false);

		ouvrir();

		expect(ouvert()).toBe(true);
		expect(champ().placeholder).toBe('Le nom de l’établissement');
		expect(champ().getAttribute('aria-label')).toBe('Le nom de l’établissement');
		expect(document.body.textContent).not.toMatch(/to confirm|type /i);
	});

	it('garde la confirmation désactivée tant que la saisie est vide, partielle ou d’une autre casse', () => {
		monter(vi.fn());
		ouvrir();
		expect(bouton(CONFIRMER).disabled).toBe(true);

		saisir('Thumbbb');
		expect(bouton(CONFIRMER).disabled).toBe(true);

		saisir('thumbbb agency');
		expect(bouton(CONFIRMER).disabled).toBe(true);

		saisir(`${NOM} `);
		expect(bouton(CONFIRMER).disabled).toBe(true);
	});

	it('l’active sur la valeur exacte', () => {
		monter(vi.fn());
		ouvrir();
		saisir(NOM);
		expect(bouton(CONFIRMER).disabled).toBe(false);
	});

	it('n’appelle rien sur un clic quand elle est désactivée, et reste ouverte', () => {
		const onConfirmer = vi.fn();
		monter(onConfirmer);
		ouvrir();
		saisir('Thumbbb');

		cliquer(bouton(CONFIRMER));

		expect(onConfirmer).not.toHaveBeenCalled();
		expect(ouvert()).toBe(true);
	});

	it('se ferme sur « Annuler » sans rien appeler, même sur une saisie exacte', () => {
		const onConfirmer = vi.fn();
		monter(onConfirmer);
		ouvrir();
		saisir(NOM);

		cliquer(bouton('Annuler'));

		expect(onConfirmer).not.toHaveBeenCalled();
		expect(ouvert()).toBe(false);
	});

	it('appelle la confirmation une seule fois, puis se ferme', () => {
		const onConfirmer = vi.fn();
		monter(onConfirmer);
		ouvrir();
		saisir(NOM);

		cliquer(bouton(CONFIRMER));

		expect(onConfirmer).toHaveBeenCalledTimes(1);
		expect(ouvert()).toBe(false);
	});

	it('repart d’une saisie vide à chaque ouverture', () => {
		// Sans remise à zéro, une saisie exacte suivie d'« Annuler » laissait la
		// confirmation active à la réouverture : ouvrir puis cliquer suffisait.
		monter(vi.fn());
		ouvrir();
		saisir(NOM);
		cliquer(bouton('Annuler'));

		ouvrir();

		expect(ouvert()).toBe(true);
		expect(champ().value).toBe('');
		expect(bouton(CONFIRMER).disabled).toBe(true);
	});
});
