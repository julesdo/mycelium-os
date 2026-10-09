import { describe, expect, it } from 'vitest';
import { decrireGeste, lireGestes, type EtatPourGestes, type GesteBrut } from '../gestes';

/**
 * CE QUE LE MODÈLE PROPOSE N'EST PAS CRU : chaque geste est relu contre le dossier.
 */
const ETAT: EtatPourGestes = {
	aujourdHui: '2026-10-08',
	restantDu: 1_200_00n,
	relancable: true,
	horsPilote: false,
	relanceProgrammee: false,
	emailConnu: null,
	contestationDeclaree: false,
	ibanConnu: true,
	remiseEnCours: false,
	arretable: true
};

function brut(genre: GesteBrut['genre'], champs: Partial<GesteBrut> = {}): GesteBrut {
	return { genre, date: '', montant: '', texte: '', ...champs };
}

describe('les gestes de Plume', () => {
	it('relit une promesse : montant en centimes, date du calendrier', () => {
		const [geste] = lireGestes([brut('PROMESSE', { date: '2026-10-20', montant: '500,50' })], ETAT);
		expect(geste).toEqual({ genre: 'PROMESSE', date: '2026-10-20', montant: 500_50n });
	});

	it('écarte une date passée, inexistante ou mal formée', () => {
		expect(lireGestes([brut('RAPPEL', { date: '2026-10-01' })], ETAT)).toEqual([]);
		expect(lireGestes([brut('RAPPEL', { date: '2026-02-30' })], ETAT)).toEqual([]);
		expect(lireGestes([brut('RAPPEL', { date: 'lundi' })], ETAT)).toEqual([]);
	});

	it('écarte une promesse supérieure à ce qui reste dû', () => {
		expect(lireGestes([brut('PROMESSE', { date: '2026-10-20', montant: '5000' })], ETAT)).toEqual(
			[]
		);
	});

	it('ne propose pas de relancer un client qu’on ne relance pas', () => {
		expect(lireGestes([brut('RELANCER')], { ...ETAT, relancable: false })).toEqual([]);
		expect(lireGestes([brut('RETENIR')], ETAT)).toEqual([]);
		expect(lireGestes([brut('REMETTRE_AU_PILOTE')], ETAT)).toEqual([]);
	});

	it('n’ouvre que les écrans du catalogue, et garde trois gestes au plus, un par genre', () => {
		expect(lireGestes([brut('OUVRIR', { texte: 'TRIBUNAL' })], ETAT)).toEqual([]);
		const gestes = lireGestes(
			[
				brut('NOTE', { texte: 'Appel : il paie fin du mois' }),
				brut('NOTE', { texte: 'doublon' }),
				brut('RAPPEL', { date: '2026-10-31' }),
				brut('RELANCER'),
				brut('EMAIL', { texte: 'compta@durand.fr' })
			],
			ETAT
		);
		expect(gestes.map((g) => g.genre)).toEqual(['NOTE', 'RAPPEL', 'RELANCER']);
	});

	it('note une contestation sans rien bloquer, et propose encore de relancer', () => {
		const gestes = lireGestes([brut('CONTESTATION', { texte: 'OUI' }), brut('RELANCER')], ETAT);
		expect(gestes.map((g) => g.genre)).toEqual(['CONTESTATION', 'RELANCER']);
		expect(
			lireGestes([brut('RELANCER')], { ...ETAT, contestationDeclaree: true }).map((g) => g.genre)
		).toEqual(['RELANCER']);
	});

	it('ouvre la page de paiement et la remise sans décompte à arrêter, et ne propose plus d’arrêter', () => {
		expect(
			lireGestes([brut('LIEN_PAIEMENT'), brut('REMISE_CONSEIL'), brut('ARRETER_DECOMPTE')], ETAT).map(
				(g) => g.genre
			)
		).toEqual(['LIEN_PAIEMENT', 'REMISE_CONSEIL']);
		expect(
			lireGestes([brut('LIEN_PAIEMENT'), brut('REMISE_CONSEIL')], { ...ETAT, arretable: false })
		).toEqual([]);
	});

	it('décrit chaque geste en toutes lettres, sans promettre ce qu’il ne fait pas', () => {
		expect(decrireGeste({ genre: 'RELANCER' }).detail).toMatch(/relisez avant qu’elle parte/);
		expect(decrireGeste({ genre: 'RAPPEL', date: '2026-10-13', texte: 'Le rappeler' }).titre).toBe(
			'Rappel mardi 13 octobre'
		);
	});
});
