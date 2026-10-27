import { describe, expect, it } from 'vitest';
import { ligneDuDossierDuClient } from '../debiteur';

/**
 * LA FICHE CLIENT DIT OÙ EN EST CHAQUE DOSSIER (audit des parcours Pro du 27/10/2026).
 * Durand, démarré, restait « Brouillon » : le statut du modèle, que le démarrage ne
 * change pas. La carte dit désormais ce que dit la page du dossier.
 */
const base = { statut: 'BROUILLON', classe: false, aDemarrer: false } as const;

describe('l’état d’un dossier sur la fiche client', () => {
	it('dit qu’un dossier démarré n’a pas encore été relancé, jamais « Brouillon »', () => {
		expect(ligneDuDossierDuClient({ ...base, etape: 'PRET' })).toBe('Pas encore relancé');
	});

	it('dit qu’un dossier préparé attend son démarrage', () => {
		expect(ligneDuDossierDuClient({ ...base, aDemarrer: true, etape: 'PRET' })).toBe(
			'Prêt à démarrer'
		);
	});

	it('dit réglé avant prêt à démarrer, et classé avant tout', () => {
		expect(ligneDuDossierDuClient({ ...base, aDemarrer: true, etape: 'REGLE' })).toBe('Réglé');
		expect(ligneDuDossierDuClient({ ...base, statut: 'CLOSE', classe: true, etape: 'REGLE' })).toBe(
			'Classé'
		);
	});

	it('dit relancé, puis confié à un professionnel', () => {
		expect(ligneDuDossierDuClient({ ...base, etape: 'ON_LUI_ECRIT' })).toBe('Relancé');
		expect(ligneDuDossierDuClient({ ...base, statut: 'ENGAGEE', etape: 'TRIBUNAL' })).toBe(
			'Confié à un professionnel'
		);
	});
});
