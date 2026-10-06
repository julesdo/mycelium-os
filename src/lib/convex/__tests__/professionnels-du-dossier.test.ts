import { describe, expect, it } from 'vitest';
import type { Id } from '../_generated/dataModel';
import { professionnelsDe } from '../recouvrement/tables';

const AVOCAT = 'fiche-avocat' as Id<'intervenants'>;
const ETUDE = 'fiche-etude' as Id<'intervenants'>;

/**
 * PLUSIEURS PROFESSIONNELS PAR DOSSIER (06/10/2026), ET LES DOSSIERS D'AVANT.
 *
 * Les créances en base ne portent que l'ancien `intervenantId`. Si la relecture
 * l'oubliait, chaque dossier qui nommait un avocat afficherait « Moi-même » le
 * lendemain du déploiement, sans que rien ne casse.
 */
describe('professionnelsDe', () => {
	it('relit l’ancien champ unique d’un dossier d’avant', () => {
		expect(professionnelsDe({ intervenantId: AVOCAT })).toEqual([AVOCAT]);
	});

	it('préfère la liste dès qu’elle existe, même vide', () => {
		expect(professionnelsDe({ intervenantIds: [AVOCAT, ETUDE] })).toEqual([AVOCAT, ETUDE]);
		// Une liste vide est un « moi-même » DIT : l'ancien champ ne revient pas.
		expect(professionnelsDe({ intervenantIds: [], intervenantId: AVOCAT })).toEqual([]);
	});

	it('ne nomme personne quand rien n’est dit', () => {
		expect(professionnelsDe({})).toEqual([]);
	});
});
