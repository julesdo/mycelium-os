import { describe, expect, it } from 'vitest';
import {
	decrireGeste,
	lireGestes,
	lireGestesDeLEtablissement,
	type EtatPourGestes,
	type GesteBrut,
	type GesteBrutDeLEtablissement
} from '../gestes';

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
			lireGestes(
				[brut('LIEN_PAIEMENT'), brut('REMISE_CONSEIL'), brut('ARRETER_DECOMPTE')],
				ETAT
			).map((g) => g.genre)
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

/**
 * HORS DOSSIER (12/10/2026) : un geste nomme sa cible, et une cible que le contexte
 * ne porte pas fait tomber le geste — un identifiant inventé relancerait le mauvais
 * client. Le geste d'un dossier passe ensuite par la même relecture.
 */
describe('les gestes de Plume sur tout l’établissement', () => {
	const etat = {
		dossiers: new Map<string, EtatPourGestes>([
			['dossier_durand', ETAT],
			['dossier_vidal', { ...ETAT, relancable: false }]
		]),
		dossiersConnus: new Set(['dossier_durand', 'dossier_vidal']),
		clientsConnus: new Set(['client_martin'])
	};
	const cible = (
		genre: GesteBrut['genre'],
		champs: Partial<GesteBrutDeLEtablissement> = {}
	): GesteBrutDeLEtablissement => ({ ...brut(genre), dossier: '', client: '', ...champs });

	it('écarte un dossier que le contexte ne porte pas', () => {
		expect(lireGestesDeLEtablissement([cible('RELANCER', { dossier: 'invente' })], etat)).toEqual(
			[]
		);
	});

	it('relit le geste contre l’état de SON dossier', () => {
		const gestes = lireGestesDeLEtablissement(
			[
				cible('RELANCER', { dossier: 'dossier_durand' }),
				cible('RELANCER', { dossier: 'dossier_vidal' })
			],
			etat
		);
		expect(gestes).toEqual([{ genre: 'RELANCER', dossier: 'dossier_durand' }]);
	});

	it('permet le même geste sur deux dossiers, jamais deux fois sur le même', () => {
		const gestes = lireGestesDeLEtablissement(
			[
				cible('NOTE', { dossier: 'dossier_durand', texte: 'Appel' }),
				cible('NOTE', { dossier: 'dossier_durand', texte: 'doublon' }),
				cible('NOTE', { dossier: 'dossier_vidal', texte: 'Appel aussi' })
			],
			etat
		);
		expect(gestes.map((g) => g.dossier)).toEqual(['dossier_durand', 'dossier_vidal']);
	});

	it('ouvre un écran de l’établissement, d’un dossier ou d’un client connus, et rien d’autre', () => {
		expect(lireGestesDeLEtablissement([cible('OUVRIR', { texte: 'COFFRE' })], etat)).toEqual([
			{ genre: 'OUVRIR', texte: 'COFFRE' }
		]);
		expect(
			lireGestesDeLEtablissement(
				[cible('OUVRIR', { texte: 'PROFESSIONNELS', dossier: 'dossier_vidal' })],
				etat
			)
		).toEqual([{ genre: 'OUVRIR', texte: 'PROFESSIONNELS', dossier: 'dossier_vidal' }]);
		expect(
			lireGestesDeLEtablissement(
				[cible('OUVRIR', { texte: 'DEMARRER', client: 'client_martin' })],
				etat
			)
		).toEqual([{ genre: 'OUVRIR', texte: 'DEMARRER', client: 'client_martin' }]);
		expect(
			lireGestesDeLEtablissement([cible('OUVRIR', { texte: 'CLIENT', client: 'inconnu' })], etat)
		).toEqual([]);
		expect(lireGestesDeLEtablissement([cible('OUVRIR', { texte: 'TRIBUNAL' })], etat)).toEqual([]);
	});
});
