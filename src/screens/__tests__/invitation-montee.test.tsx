import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionEquipe, type EquipeAffichee, type FormuleDeLEquipe } from '../compte/equipe';
import type { AbonnementAffiche } from '../compte/facturation';
import type { GestionAffichee } from '../compte/gestion-formule';
import { LIMITES } from '../../lib/config/tarifs';

/**
 * L'INVITATION QUI BUTE SUR LES PLACES (21/10/2026).
 *
 * Le parcours ne vaut que par sa fin : l'adresse tapée AVANT de changer de formule
 * part d'elle-même quand la place arrive, et pas avant. Ce test monte la vraie
 * section, tape l'adresse, passe à la formule du dessus, puis rend la section avec
 * les places de la nouvelle formule, comme la lecture en temps réel le fera.
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

function equipe(places: number, onInviter: EquipeAffichee['onInviter'], formule: FormuleDeLEquipe) {
	return (
		<SectionEquipe
			membres={[
				{
					id: 'm1',
					nom: 'Jules',
					email: 'jules@exemple.fr',
					role: 'ORG_ADMIN',
					arriveLe: 0,
					adresseVerifiee: true,
					estMoi: true
				}
			]}
			invitations={[]}
			estAdmin
			siegesUtilises={1}
			siegesAutorises={places}
			onChangerRole={() => Promise.resolve()}
			onRetirer={() => Promise.resolve()}
			onAnnulerInvitation={() => Promise.resolve()}
			onVerifierAdresse={() => Promise.resolve()}
			onInviter={onInviter}
			formule={formule}
		/>
	);
}

function bouton(intitule: string): HTMLButtonElement {
	const trouve = [...document.body.querySelectorAll('button')].find(
		(b) => b.textContent?.trim() === intitule
	);
	if (trouve === undefined) throw new Error(`Aucun bouton « ${intitule} » à l’écran.`);
	return trouve;
}

async function cliquer(element: Element) {
	await act(async () => {
		element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
		await Promise.resolve();
	});
}

function saisir(valeur: string) {
	const cible = document.body.querySelector<HTMLInputElement>('input[type="email"]');
	if (cible === null) throw new Error('Aucun champ d’adresse à l’écran.');
	const poser = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
	act(() => {
		poser?.call(cible, valeur);
		cible.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

describe('l’invitation quand les places sont prises', () => {
	it('garde l’adresse, passe à la formule du dessus, et n’invite qu’une fois la place arrivée', async () => {
		const onInviter = vi.fn(() => Promise.resolve('https://exemple.fr/rejoindre/jeton'));
		const changer = vi.fn(() => Promise.resolve(null));
		const gestion: GestionAffichee = {
			apercu: () => Promise.resolve({ aujourdhui: 3000, ensuite: 5900, prochainLe: null }),
			changer,
			resilier: () => Promise.resolve(),
			reprendre: () => Promise.resolve(),
			onGererLaCarte: () => undefined,
			portailEnCours: false
		};
		const formule: FormuleDeLEquipe = { abonnement: ABONNEMENT, gestion, maintenant: 0 };

		act(() => racine.render(equipe(1, onInviter, formule)));
		expect(document.body.textContent).toContain('Solo compte 1 accès, déjà pris.');

		saisir('Marie@Exemple.fr');
		await cliquer(bouton('Passer à Équipe pour inviter'));
		expect(document.body.textContent).toContain('Pour inviter marie@exemple.fr');

		await cliquer(bouton('Passer à Équipe et inviter'));
		expect(changer).toHaveBeenCalledWith('equipe', 'mensuel', false);
		// La formule a changé, mais la place n'est pas encore lue : rien ne part.
		expect(onInviter).not.toHaveBeenCalled();
		expect(document.body.textContent).toContain('Équipe s’active');

		// La lecture en temps réel rend les places d'Équipe : l'invitation part, une fois.
		await act(async () => {
			racine.render(equipe(LIMITES.equipe.utilisateurs, onInviter, formule));
			await Promise.resolve();
		});
		expect(onInviter).toHaveBeenCalledTimes(1);
		expect(onInviter).toHaveBeenCalledWith('marie@exemple.fr', 'ORG_MEMBER');
		expect(document.body.textContent).toContain('Invitation envoyée');
	});

	it('sans voie vers une formule du dessus, demande de libérer une place, sans bouton', () => {
		const onInviter = vi.fn(() => Promise.resolve(''));
		act(() =>
			racine.render(
				equipe(1, onInviter, { abonnement: { ...ABONNEMENT, statut: null }, maintenant: 0 })
			)
		);
		expect(document.body.textContent).toContain('Pour inviter, libérez une place');
		expect(() => bouton('Envoyer l’invitation')).toThrow();
	});
});
