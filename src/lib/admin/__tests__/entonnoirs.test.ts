import { describe, it, expect } from 'vitest';
import { entonnoirDeProspection, entonnoirDesComptes } from '../entonnoirs';

describe('entonnoirDeProspection', () => {
	it('compte chaque prospect à toutes les étapes qu’il a passées', () => {
		const e = entonnoirDeProspection([
			'A_CONTACTER',
			'A_CONTACTER',
			'CONTACTE',
			'RELANCE',
			'A_REPONDU',
			'PERDU',
			'INTERESSE',
			'INSCRIT'
		]);
		expect(e.map((x) => [x.cle, x.nombre])).toEqual([
			['AJOUTES', 8],
			['CONTACTES', 6],
			['REPONDU', 4],
			['INTERESSES', 2],
			['INSCRITS', 1]
		]);
	});

	it('dit la part du départ, le passage depuis l’étape d’avant et ce qui s’y perd', () => {
		const e = entonnoirDeProspection(['A_CONTACTER', 'CONTACTE', 'CONTACTE', 'INTERESSE']);
		expect(e[0]).toMatchObject({ partDuDepart: 100, passage: null, perdus: 0 });
		expect(e[1]).toMatchObject({ nombre: 3, partDuDepart: 75, passage: 75, perdus: 1 });
		expect(e[2]).toMatchObject({ nombre: 1, partDuDepart: 25, passage: 33, perdus: 2 });
	});

	it('un entonnoir vide ne divise pas par zéro', () => {
		expect(entonnoirDeProspection([]).every((x) => x.partDuDepart === 0)).toBe(true);
	});
});

describe('entonnoirDesComptes', () => {
	it('compte un compte à chaque étape qu’il a atteinte ou dépassée', () => {
		const e = entonnoirDesComptes([
			{ etapes: ['INSCRIT'] },
			{ etapes: ['INSCRIT', 'ENTREPRISE', 'FACTURES_DEPOSEES'] },
			// Abonné sans avoir activé les relances : il a quand même passé l'étape.
			{ etapes: ['INSCRIT', 'ABONNE'] }
		]);
		const parCle = Object.fromEntries(e.map((x) => [x.cle, x.nombre]));
		expect(parCle).toMatchObject({
			INSCRIT: 3,
			ENTREPRISE: 2,
			FACTURES_DEPOSEES: 2,
			RELANCES_ACTIVEES: 1,
			ABONNE: 1
		});
		expect(e.map((x) => x.cle)).not.toContain('A_RISQUE');
	});
});
