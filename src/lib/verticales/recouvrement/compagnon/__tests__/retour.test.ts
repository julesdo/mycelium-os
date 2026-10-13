import { describe, expect, it } from 'vitest';
import { ABSENCE_MINIMALE_MS, pointDuRetour, type FaitsDuRetour } from '../retour';

const MAINTENANT = Date.UTC(2026, 9, 14, 7, 30);
const HIER_SOIR = Date.UTC(2026, 9, 13, 16, 40);

const RIEN: FaitsDuRetour = {
	depuis: HIER_SOIR,
	maintenant: MAINTENANT,
	relancesParties: { nombre: 0, client: null },
	paiements: { nombre: 0, client: null },
	dossiersOuverts: 0,
	aLire: 0,
	programmees: { nombre: 0, premiere: null },
	enAttente: 0
};

const mots = {
	prenom: 'Jules',
	heure: () => '14 h 02',
	jourDe: (t: number) => (t === HIER_SOIR ? 'hier, 18 h 40' : null),
	quand: () => 'aujourd’hui à 9 h',
	totalDesPaiements: '2 480,00 €'
};

describe('Le point de Plume, à votre retour', () => {
	it('se tait quand on vient de recharger la page', () => {
		const faits = {
			...RIEN,
			depuis: MAINTENANT - ABSENCE_MINIMALE_MS + 1,
			paiements: { nombre: 1, client: 'Martin' }
		};
		expect(pointDuRetour(faits, mots)).toBeNull();
	});

	it('dit bonjour et compte ce qui s’est passé depuis hier', () => {
		const point = pointDuRetour(
			{
				...RIEN,
				relancesParties: { nombre: 3, client: 'Durand' },
				paiements: { nombre: 2, client: 'Martin' },
				dossiersOuverts: 1,
				programmees: { nombre: 2, premiere: MAINTENANT + 3_600_000 }
			},
			mots
		);
		expect(point).not.toBeNull();
		expect(point?.texte).toBe('Bonjour Jules. Depuis hier, 18 h 40 :');
		expect(point?.lignes.map((l) => l.texte)).toEqual([
			'3 relances parties à votre nom',
			'2 paiements reçus : 2 480,00 €',
			'1 dossier ouvert pour des factures échues'
		]);
		expect(point?.pied).toBe(
			'Ensuite : 2 relances, la première aujourd’hui à 9 h. Chacune s’affichera au-dessus de la barre une heure avant.'
		);
		expect(point?.ditBonjour).toBe(true);
		expect(point?.humeur).toBe('salue');
		expect(point?.cible).toBe('CONVERSATION');
	});

	it('nomme le client quand il n’y en a qu’un', () => {
		const point = pointDuRetour(
			{
				...RIEN,
				relancesParties: { nombre: 1, client: 'Durand' },
				paiements: { nombre: 1, client: 'Martin' }
			},
			{ ...mots, totalDesPaiements: '1 240,00 €' }
		);
		expect(point?.lignes.map((l) => l.texte)).toEqual([
			'1 relance partie à votre nom, à Durand',
			'1 paiement reçu de Martin : 1 240,00 €'
		]);
	});

	it('dit une nuit calme, mais pas une heure calme', () => {
		const nuit = pointDuRetour(RIEN, mots);
		expect(nuit?.lignes).toEqual([
			{ icone: 'CALME', texte: 'Rien n’a bougé : aucune relance partie, aucun paiement reçu' }
		]);
		expect(nuit?.pied).toContain('toutes les quinze minutes');
		expect(pointDuRetour({ ...RIEN, depuis: MAINTENANT - 2 * 3_600_000 }, mots)).toBeNull();
	});

	it('le jour même, parle de votre passage et ne redit pas bonjour', () => {
		const point = pointDuRetour(
			{ ...RIEN, depuis: MAINTENANT - 3 * 3_600_000, aLire: 2, enAttente: 3 },
			mots
		);
		expect(point?.texte).toBe('Depuis votre passage de 14 h 02 :');
		expect(point?.ditBonjour).toBe(false);
		expect(point?.cible).toBe('NOTIFICATIONS');
		expect(point?.libelleDuGeste).toBe('Les lire');
		expect(point?.humeur).toBe('attention');
		expect(point?.pied).toBe('3 choses attendent votre feu vert ; rien ne part sans vous.');
	});

	it('n’écrit jamais de tiret long', () => {
		const point = pointDuRetour(
			{ ...RIEN, relancesParties: { nombre: 2, client: 'A' }, aLire: 1 },
			mots
		);
		const tout = [point?.texte, point?.pied, ...(point?.lignes.map((l) => l.texte) ?? [])].join(
			' '
		);
		expect(tout).not.toContain('—');
	});
});
