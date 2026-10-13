import { describe, expect, it } from 'vitest';
import {
	libelleDuRegard,
	ligneDuRegard,
	paroleDUnTravail,
	questionsDuRegard,
	remarquesDAujourdhui,
	remarquesDesClients,
	remarquesDesDossiers,
	remarquesDUnClient,
	type DonneesDUnClient
} from '../presence';

const CLIENT: DonneesDUnClient = {
	id: 'c1',
	nom: 'Durand SARL',
	email: 'compta@durand.fr',
	siren: '123456789',
	horsPilote: false,
	facturesEchues: 1,
	dossierOuvert: 'd1',
	rupture: null,
	sante: { disponible: true, analysee: true },
	doitDeLArgent: true
};

describe('Plume sur chaque écran', () => {
	it('se présente d’abord, une seule fois', () => {
		const [premiere] = remarquesDAujourdhui(
			{ aujourdHui: '2026-10-13', prenom: 'Camille', aDemarrer: 0, dossiersSuivis: 3 },
			'Plume'
		);
		expect(premiere?.cle).toBe('presentation:AUJOURDHUI');
		expect(premiere?.silence).toBe('UNE_FOIS');
		expect(premiere?.texte).toContain('je suis Plume');
	});

	it('explique la pastille des dossiers préparés, avec le geste qui y mène', () => {
		const remarques = remarquesDAujourdhui(
			{ aujourdHui: '2026-10-13', prenom: null, aDemarrer: 3, dossiersSuivis: 3 },
			'Plume'
		);
		const aDemarrer = remarques.find((r) => r.cle === 'a-demarrer:3');
		expect(aDemarrer?.action?.cible).toEqual({ genre: 'DEMARRER_LOT' });
		expect(aDemarrer?.texte).toContain('avant votre feu vert');
	});

	it('dit bonjour une fois par jour : la clé porte la date', () => {
		const remarques = remarquesDAujourdhui(
			{ aujourdHui: '2026-10-13', prenom: null, aDemarrer: 0, dossiersSuivis: 1 },
			'Plume'
		);
		expect(remarques.at(-1)?.cle).toBe('bonjour:2026-10-13');
		expect(remarques.at(-1)?.texte).toBe(
			'Bonjour. Je veille sur 1 dossier, et je vous dis ici chaque chose que je fais.'
		);
	});

	it('montre la lettre qui attend la relecture, et mène à elle', () => {
		const remarques = remarquesDesDossiers(
			{ aDemarrer: 0, lettresARelire: [{ dossier: 'd9', client: 'Martin' }] },
			'Plume'
		);
		const lettre = remarques.find((r) => r.cle.startsWith('lettres:'));
		expect(lettre?.action?.cible).toEqual({
			genre: 'DOSSIER',
			dossier: 'd9',
			rubrique: 'courriers'
		});
	});

	it('nomme l’adresse qui manque à un client en retard, pas à un client à jour ou retiré', () => {
		const remarques = remarquesDesClients(
			[
				{ id: 'a', nom: 'A jour', horsPilote: false, facturesEchues: 0, siren: '1' },
				{ id: 'b', nom: 'Retiré', horsPilote: true, facturesEchues: 2, siren: '1' },
				{ id: 'c', nom: 'Muet', horsPilote: false, facturesEchues: 1, siren: '1' }
			],
			'Plume'
		);
		const muet = remarques.find((r) => r.cle.startsWith('sans-email:'));
		expect(muet?.cle).toBe('sans-email:1:c');
		expect(muet?.texte).toContain('Muet');
	});

	it('propose de préparer une relance quand le retard sort de l’habitude', () => {
		const remarques = remarquesDUnClient(
			{ ...CLIENT, rupture: { reference: 'F-102', habituelJours: 45, ecartJours: 17 } },
			'Plume'
		);
		const rupture = remarques.find((r) => r.cle === 'rupture:c1:F-102');
		expect(rupture?.action?.cible).toEqual({
			genre: 'PREPARER_RELANCE',
			dossier: 'd1',
			client: 'Durand SARL'
		});
	});

	it('se tait sur la relance d’un client retiré, et propose de le reprendre', () => {
		const remarques = remarquesDUnClient(
			{
				...CLIENT,
				horsPilote: true,
				rupture: { reference: 'F-102', habituelJours: 45, ecartJours: 17 }
			},
			'Plume'
		);
		expect(remarques.some((r) => r.cle.startsWith('rupture:'))).toBe(false);
		expect(remarques.find((r) => r.cle === 'hors-pilote:c1')?.action?.cible.genre).toBe(
			'REMETTRE_AU_PILOTE'
		);
	});

	it('ne propose la santé que si elle est branchée, pas faite, et le SIREN connu', () => {
		const propose = (sante: DonneesDUnClient['sante'], siren?: string) =>
			remarquesDUnClient(
				{ ...CLIENT, sante, ...(siren === undefined ? { siren: '' } : { siren }) },
				'Plume'
			).some((r) => r.cle === 'sante:c1');
		expect(propose({ disponible: true, analysee: false }, '123456789')).toBe(true);
		expect(propose({ disponible: false, analysee: false }, '123456789')).toBe(false);
		expect(propose({ disponible: true, analysee: true }, '123456789')).toBe(false);
		expect(propose({ disponible: true, analysee: false })).toBe(false);
	});

	it('dit plusieurs travaux finis en une bulle', () => {
		const parole = paroleDUnTravail(
			{
				id: 't1',
				titre: 'Envoie le rappel à Durand',
				bilan: 'Le rappel est parti chez Durand.',
				etat: 'FAIT'
			},
			2
		);
		expect(parole.texte).toBe('Le rappel est parti chez Durand. J’ai aussi fini 2 autres travaux.');
		const echec = paroleDUnTravail(
			{ id: 't2', titre: 'Relit votre dépôt', bilan: null, etat: 'ECHEC' },
			0
		);
		expect(echec.humeur).toBe('attention');
		expect(echec.action?.cible).toEqual({ genre: 'CONVERSATION' });
	});

	it('n’écrit jamais de tiret long ni de mot de verdict', () => {
		const tout = [
			...remarquesDAujourdhui(
				{ aujourdHui: '2026-10-13', prenom: 'Camille', aDemarrer: 2, dossiersSuivis: 4 },
				'Plume'
			),
			...remarquesDesDossiers(
				{ aDemarrer: 2, lettresARelire: [{ dossier: 'd', client: 'X' }] },
				'Plume'
			),
			...remarquesDUnClient(
				{
					...CLIENT,
					email: '',
					rupture: { reference: 'F', habituelJours: 30, ecartJours: 9 },
					sante: { disponible: true, analysee: false }
				},
				'Plume'
			)
		];
		for (const remarque of tout) {
			expect(remarque.texte).not.toMatch(
				/—|suspect|garanti|il faut engager|condition est remplie/i
			);
		}
	});

	it('s’ouvre en sachant d’où l’on vient, et nomme le client regardé', () => {
		const regard = { ecran: 'CLIENT' as const, client: { id: 'c1', nom: 'Durand SARL' } };
		expect(libelleDuRegard(regard)).toBe('Sur la fiche de Durand SARL');
		expect(questionsDuRegard(regard)[0]).toBe('Où en est Durand SARL ?');
		expect(libelleDuRegard({ ecran: 'AUJOURDHUI' })).toBeNull();
		expect(questionsDuRegard({ ecran: 'AUJOURDHUI' })).toEqual([]);
	});

	it('dit au modèle les identifiants à recopier, et l’absence de dossier', () => {
		expect(
			ligneDuRegard({ ecran: 'CLIENT', client: { id: 'c1', nom: 'Durand SARL', dossier: 'd1' } })
		).toContain('identifiant CLIENT : c1 ; son dossier ouvert — identifiant DOSSIER : d1');
		expect(
			ligneDuRegard({ ecran: 'CLIENT', client: { id: 'c1', nom: 'Durand SARL', dossier: null } })
		).toContain('n’a pas de dossier ouvert');
		expect(ligneDuRegard({ ecran: 'COFFRE' })).toBe('Il regardait le coffre de ses documents.');
	});

	it('ne propose aucune question qui nomme une voie de droit', () => {
		const ecrans = ['DOSSIERS', 'CLIENTS', 'COFFRE', 'SANTE', 'DEFENSE'] as const;
		const toutes = [
			...ecrans.flatMap((ecran) => questionsDuRegard({ ecran })),
			...questionsDuRegard({ ecran: 'CLIENT', client: { id: 'c', nom: 'X' } }),
			...questionsDuRegard({ ecran: 'SANTE_CLIENT', client: { id: 'c', nom: 'X' } })
		];
		for (const question of toutes) {
			expect(question).not.toMatch(/injonction|tribunal|assigner|commissaire|huissier|avocat/i);
		}
	});
});
