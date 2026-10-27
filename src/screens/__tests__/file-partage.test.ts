import { describe, expect, it } from 'vitest';
import { partagerLaFile, type RangeeDeLaFile } from '../file';

/**
 * UNE QUESTION N'EST PAS UNE FACTURE (audit des parcours Pro du 27/10/2026). Après le
 * démarrage du dossier Durand, « En retard » comptait cinq éléments et 47 450 € : la
 * facture de 12 400 € et la question sur ce même dossier portaient chacune le montant,
 * quand l'accueil annonçait quatre factures et les listes 35 050 €.
 */
const AUJOURDHUI = '2026-10-27';
const pli = { libelle: { un: 'rangée', plusieurs: 'rangées' }, rienATrancher: false };

function dossier(id: string, debiteur: string, montant: bigint): RangeeDeLaFile {
	return {
		genre: 'OBSTACLE',
		id,
		debiteur,
		obstacle: 'La facture est échue.',
		libelle: 'Facture échue',
		famille: 'TEMPS',
		urgence: 'HAUTE',
		montant,
		dateDuFait: '2026-07-01',
		pli
	};
}

const QUESTION_DURAND: RangeeDeLaFile = {
	genre: 'LITIGE',
	id: 'litige:durand',
	debiteur: 'Durand',
	question: 'Ce client vous a-t-il écrit pour contester la facture ?',
	urgence: 'HAUTE',
	montant: 1_240_000n,
	onRepondre: () => undefined,
	pli
};

describe('le partage de la file d’« Aujourd’hui »', () => {
	const file = [
		dossier('durand', 'Durand', 1_240_000n),
		QUESTION_DURAND,
		dossier('moreau', 'Moreau', 1_000_000n),
		dossier('lefevre', 'Lefèvre', 750_000n),
		dossier('girard', 'Girard', 515_000n)
	];

	it('compte chaque dossier une fois, et n’additionne jamais une question', () => {
		const { groupes } = partagerLaFile(file, AUJOURDHUI);
		expect(groupes).toHaveLength(1);
		expect(groupes[0]).toMatchObject({ cle: 'RETARD', nombre: 4, total: 3_505_000n });
		expect(groupes[0]?.rangees.map((r) => r.id)).toEqual(['durand', 'moreau', 'lefevre', 'girard']);
	});

	it('range les questions à part, comptées sans montant', () => {
		const { questions } = partagerLaFile(file, AUJOURDHUI);
		expect(questions.map((q) => q.id)).toEqual(['litige:durand']);
	});

	it('ne fabrique pas de groupe vide quand il n’y a que des questions', () => {
		const { groupes, questions } = partagerLaFile([QUESTION_DURAND], AUJOURDHUI);
		expect(groupes).toEqual([]);
		expect(questions).toHaveLength(1);
	});
});
