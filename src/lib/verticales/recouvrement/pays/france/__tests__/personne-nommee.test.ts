import { describe, expect, it } from 'vitest';
import { ANNONCES_RELEVEES } from '../annonces-relevees';
import { personneNommeeDansLAnnonce } from '../personne-nommee';

function lire(annonce: { readonly nature: string; readonly complement: string }) {
	return personneNommeeDansLAnnonce(annonce.complement, annonce.nature);
}

describe('personneNommeeDansLAnnonce', () => {
	it('lit le liquidateur, sa société et son adresse', () => {
		expect(lire(ANNONCES_RELEVEES.liquidation)).toEqual({
			nom: 'Selarl Mmj prise en la personne de Me Aymeric Mandin',
			adresse: '23 Rue Victor Hugo 95300 Pontoise'
		});
	});

	it('prend le mandataire judiciaire, pas l’administrateur nommé avant lui', () => {
		expect(lire(ANNONCES_RELEVEES.redressementAvecAdministrateur)).toEqual({
			nom: 'SELARL Asteren prise en la personne de Me Julia Ruth',
			adresse: '14/16 Rue de Lorraine 93000 Bobigny'
		});
	});

	it('s’arrête à l’administrateur nommé après lui', () => {
		expect(lire(ANNONCES_RELEVEES.sauvegardeAdministrateurApres)).toEqual({
			nom: 'SCP Br associes prise en la personne de Me Laura Bes',
			adresse: '24 rue du Lieutenant Goinet 97300 Cayenne'
		});
	});

	it('garde un chiffre collé dans un nom de société, et un numéro « 2 B, » dans l’adresse', () => {
		expect(lire(ANNONCES_RELEVEES.chiffreDansLeNom)).toEqual({
			nom: 'SELARL 4R SOLUTIONS prise en la personne de Maître Jean-Joachim BISSIEUX',
			adresse: '2 B, avenue de Marbotte - 21000 Dijon'
		});
	});

	it('ne rend rien quand l’annonce nomme sans dire sous quel titre', () => {
		const { complement } = ANNONCES_RELEVEES.reouvertureSansTitre;
		expect(lire(ANNONCES_RELEVEES.reouvertureSansTitre)).toBeNull();
		// Même lue comme une liquidation : « a nommé la SELARL » n'est pas
		// « désignant liquidateur », et le courrier appellerait liquidateur
		// quelqu'un que l'annonce n'appelle pas ainsi.
		expect(personneNommeeDansLAnnonce(complement, ANNONCES_RELEVEES.liquidation.nature)).toBeNull();
	});

	it('ne rend rien quand le nom contient lui-même le titre, plutôt que de le couper', () => {
		expect(lire(ANNONCES_RELEVEES.titreDansLeNom)).toBeNull();
	});

	it('ne rend rien sans numéro de rue, sans code postal ou sans procédure lisible', () => {
		const { nature } = ANNONCES_RELEVEES.liquidation;
		expect(
			personneNommeeDansLAnnonce('désignant liquidateur Selarl Mmj, Pontoise.', nature)
		).toBeNull();
		expect(personneNommeeDansLAnnonce('', nature)).toBeNull();
		expect(
			personneNommeeDansLAnnonce(
				ANNONCES_RELEVEES.liquidation.complement,
				'Avis de dépôt des comptes'
			)
		).toBeNull();
	});
});
