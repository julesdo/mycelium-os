import { describe, expect, it } from 'vitest';
import {
	classerParLesRegles,
	messagePourPlume,
	retenir,
	sirenDe,
	type Candidat
} from '../prospects-du-jour';

const JOUR = '2026-10-20';

const fournisseur = (siren: string, marches: number, dernier: string): Candidat => ({
	source: 'DECP',
	acheteurs: 'HOPITAUX',
	titulaire: {
		siren,
		siret: `${siren}00012`,
		nom: `FOURNISSEUR ${siren}`,
		departement: '93',
		marches,
		nombreDAcheteurs: marches > 3 ? 3 : 1,
		acheteurs: ['CH DE SAINT-DENIS'],
		plafondCentimes: BigInt(marches) * 20_000_000n,
		dernierMarche: dernier
	}
});

const transporteur = (siren: string, effectif: string): Candidat => ({
	source: 'ANNUAIRE',
	secteur: 'TRANSPORT',
	entreprise: {
		siren,
		entreprise: `TRANSPORTS ${siren}`,
		effectif,
		ville: 'Pantin',
		dirigeant: 'Une personne'
	}
});

describe('les prospects du jour', () => {
	it('classe d’abord le fournisseur aux marchés nombreux et récents', () => {
		const classes = classerParLesRegles(
			[
				transporteur('111111111', '3 à 5 salariés'),
				fournisseur('222222222', 1, '2024-01-10'),
				fournisseur('333333333', 7, '2026-09-14')
			],
			JOUR
		);
		expect(classes.map(sirenDe)).toEqual(['333333333', '222222222', '111111111']);
	});

	it('ne garde de Plume que les SIREN de la liste, une fois chacun, et sans exclamation', () => {
		const candidats = [
			fournisseur('333333333', 7, '2026-09-14'),
			transporteur('111111111', '20 à 49 salariés'),
			fournisseur('222222222', 2, '2026-08-01')
		];
		const retenus = retenir(
			{
				choix: [
					{ siren: '999999999', pourquoi: 'Inventé.' },
					{ siren: '111111111', pourquoi: 'Transporteur de vingt salariés au moins, à Pantin.' },
					{ siren: '111111111', pourquoi: 'En double.' },
					{ siren: '333333333', pourquoi: 'Le meilleur prospect du monde !' }
				]
			},
			candidats,
			3,
			JOUR
		);
		expect(retenus.map((r) => sirenDe(r.candidat))).toEqual(['111111111', '333333333', '222222222']);
		expect(retenus[0]?.pourquoi).toBe('Transporteur de vingt salariés au moins, à Pantin.');
		expect(retenus[1]?.pourquoi).not.toContain('!');
	});

	it('choisit par les règles quand Plume ne répond pas', () => {
		const retenus = retenir(null, [fournisseur('333333333', 7, '2026-09-14')], 5, JOUR);
		expect(retenus).toHaveLength(1);
		expect(retenus[0]?.pourquoi).toMatch(/^Titulaire de marchés publics/);
	});

	it('n’envoie au modèle aucun nom de dirigeant', () => {
		const message = messagePourPlume([transporteur('111111111', '6 à 9 salariés')], 1);
		expect(message).not.toContain('Une personne');
		expect(message).toContain('dirigeant publié');
	});
});
