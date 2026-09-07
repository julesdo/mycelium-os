import { describe, it, expect } from 'vitest';
import {
	cleEvenement,
	clesNouvelles,
	composerBriefing,
	decider,
	JOURS_AVANT_RASSURANCE,
	type Precedent
} from '../briefing';
import { depuisCentimes } from '../../../socle/montants';
import type { Evenement } from '../surveillance';

/**
 * L'IDENTITÉ D'UN ÉVÉNEMENT, ET POURQUOI ELLE NE PEUT PAS ÊTRE LE MONTANT.
 *
 * Le montant d'un événement CHANGE tous les jours : les intérêts courent. Si la
 * clé le portait, chaque événement paraîtrait nouveau chaque matin, et le
 * briefing crierait tous les jours — exactement ce qu'on veut éviter.
 *
 * Le type et la référence, eux, sont stables tant que la situation l'est.
 */
function evenement(partiel: Partial<Evenement> = {}): Evenement {
	return {
		type: 'FACTURE_ECHUE',
		reference: 'FA-2026-0001',
		montant: depuisCentimes(100_000n),
		urgence: 'NORMALE',
		explication: 'La facture est échue.',
		action: 'Rattacher cette facture à une créance.',
		...partiel
	};
}

describe('cleEvenement', () => {
	it('identifie par le type et la référence', () => {
		expect(cleEvenement(evenement())).toBe('FACTURE_ECHUE:FA-2026-0001');
	});

	it('ne change pas quand le montant change', () => {
		// Les intérêts courent chaque nuit. Si la clé bougeait avec eux, le
		// briefing annoncerait un « nouveau point » tous les matins.
		const hier = evenement({ montant: depuisCentimes(100_000n) });
		const aujourdHui = evenement({ montant: depuisCentimes(100_042n) });
		expect(cleEvenement(aujourdHui)).toBe(cleEvenement(hier));
	});

	it('distingue deux types sur la même référence', () => {
		const echue = evenement({ type: 'FACTURE_ECHUE', reference: 'FA-1' });
		const prescrite = evenement({ type: 'PRESCRIPTION_PROCHE', reference: 'FA-1' });
		expect(cleEvenement(echue)).not.toBe(cleEvenement(prescrite));
	});
});

describe('clesNouvelles', () => {
	it('rend les événements absents du relevé précédent', () => {
		const evenements = [
			evenement({ reference: 'FA-1' }),
			evenement({ reference: 'FA-2' }),
			evenement({ reference: 'FA-3' })
		];
		const connues = ['FACTURE_ECHUE:FA-1', 'FACTURE_ECHUE:FA-3'];
		expect(clesNouvelles(evenements, connues)).toEqual(['FACTURE_ECHUE:FA-2']);
	});

	it('rend tout quand rien n’est connu', () => {
		const evenements = [evenement({ reference: 'FA-1' })];
		expect(clesNouvelles(evenements, [])).toEqual(['FACTURE_ECHUE:FA-1']);
	});

	it('rend une liste vide quand rien n’a bougé', () => {
		const evenements = [evenement({ reference: 'FA-1' })];
		expect(clesNouvelles(evenements, ['FACTURE_ECHUE:FA-1'])).toEqual([]);
	});
});

/**
 * LA DÉCISION DE PARLER — le cœur produit de tout ce plan.
 *
 * Un outil qui crie tous les matins devient du bruit et se fait filtrer en trois
 * semaines. Un outil qui dit « tout va bien, et voici pourquoi » trois jours de
 * suite, puis « celle-là, aujourd'hui » le quatrième, garde son autorité.
 *
 * QUATRE RAISONS DE PARLER, ET UNE SEULE DE SE TAIRE. On parle si c'est le
 * premier briefing, s'il existe un point critique, si quelque chose de nouveau
 * est apparu, ou si le silence dure depuis une semaine. Sinon on se tait — et
 * ce silence est un résultat, pas une panne.
 */
describe('decider', () => {
	const HIER: Precedent = { le: '2026-09-02', cles: ['FACTURE_ECHUE:FA-1'] };

	it('parle au premier briefing, faute de relevé précédent', () => {
		const verdict = decider([evenement({ reference: 'FA-1' })], null, '2026-09-03');
		expect(verdict.decision).toBe('PARLER');
		expect(verdict.raison).toContain('premier');
	});

	it('parle dès qu’un point est critique, même connu depuis hier', () => {
		// Une prescription qui approche ne devient pas moins urgente parce qu'on
		// en a déjà parlé. C'est même l'inverse.
		const critique = evenement({ reference: 'FA-1', urgence: 'CRITIQUE' });
		const verdict = decider([critique], HIER, '2026-09-03');
		expect(verdict.decision).toBe('PARLER');
		expect(verdict.raison).toContain('critique');
	});

	it('parle quand un événement apparaît', () => {
		const evenements = [evenement({ reference: 'FA-1' }), evenement({ reference: 'FA-2' })];
		const verdict = decider(evenements, HIER, '2026-09-03');
		expect(verdict.decision).toBe('PARLER');
		expect(verdict.raison).toContain('nouveau');
	});

	it('se tait quand rien n’a bougé et que rien n’est critique', () => {
		const verdict = decider([evenement({ reference: 'FA-1' })], HIER, '2026-09-03');
		expect(verdict.decision).toBe('SE_TAIRE');
	});

	it('se tait aussi quand il n’y a plus rien du tout', () => {
		// Le portefeuille est sain. Ce n'est pas une raison d'écrire.
		const verdict = decider([], HIER, '2026-09-03');
		expect(verdict.decision).toBe('SE_TAIRE');
	});

	it('rompt le silence au bout de sept jours, pour rassurer', () => {
		// Un silence trop long finit par se lire comme une panne. Le produit
		// reprend la parole pour dire que rien ne meurt cette semaine.
		const vieux: Precedent = { le: '2026-08-27', cles: ['FACTURE_ECHUE:FA-1'] };
		const verdict = decider([evenement({ reference: 'FA-1' })], vieux, '2026-09-03');
		expect(verdict.decision).toBe('PARLER');
		expect(verdict.raison).toContain('sept jours');
	});

	it('ne rompt pas le silence la veille du septième jour', () => {
		const veille: Precedent = { le: '2026-08-28', cles: ['FACTURE_ECHUE:FA-1'] };
		expect(decider([evenement({ reference: 'FA-1' })], veille, '2026-09-03').decision).toBe(
			'SE_TAIRE'
		);
		expect(JOURS_AVANT_RASSURANCE).toBe(7);
	});

	it('affiche le critique, pas le nouveau, quand les deux se présentent ensemble', () => {
		// C'EST CE TEST QUI VERROUILLE L'ORDRE. Si quelqu'un permutait demain les
		// blocs `if` critique et nouveauté dans `decider`, les autres tests
		// resteraient verts — chacun n'active qu'une seule raison à la fois — et
		// la raison affichée deviendrait la plus faible sans qu'aucun test ne le
		// remarque.
		const critiqueConnu = evenement({ reference: 'FA-1', urgence: 'CRITIQUE' });
		const nouveauNormal = evenement({ reference: 'FA-2' });
		const verdict = decider([critiqueConnu, nouveauNormal], HIER, '2026-09-03');
		expect(verdict.raison).toContain('critique');
		expect(verdict.raison).not.toContain('nouveau');
	});

	it('accorde « points critiques » au pluriel', () => {
		const evenements = [
			evenement({ reference: 'FA-1', urgence: 'CRITIQUE' }),
			evenement({ reference: 'FA-2', urgence: 'CRITIQUE' })
		];
		const verdict = decider(evenements, HIER, '2026-09-03');
		expect(verdict.raison).toBe('2 points critiques');
	});

	it('accorde « nouveaux points » au pluriel', () => {
		const evenements = [evenement({ reference: 'FA-2' }), evenement({ reference: 'FA-3' })];
		const verdict = decider(evenements, HIER, '2026-09-03');
		expect(verdict.raison).toBe('2 nouveaux points');
	});
});

/**
 * LA COMPOSITION — trois lignes et UNE action.
 *
 * Pas un digest : un ordre de priorité. Un briefing qui liste douze points ne
 * dit pas quoi faire, il transfère la charge de trier. Le produit trie, et
 * n'affiche qu'une action — celle du point le plus urgent, le plus cher.
 */
describe('composerBriefing', () => {
	it('met en avant l’événement le plus urgent, puis le plus cher', () => {
		// Trois explications distinctes, comme dans la réalité : trois dossiers
		// différents ne racontent pas la même chose. (Si on laissait le texte par
		// défaut du fixture, identique sur les trois, on retomberait sur le cas
		// « tous racontent la même chose » testé séparément plus bas.)
		const evenements = [
			evenement({
				reference: 'FA-1',
				urgence: 'NORMALE',
				montant: depuisCentimes(900_000n),
				explication: 'FA-1 est une broutille tranquille.',
				action: 'Leurre : le plus cher, mais pas critique.'
			}),
			evenement({
				reference: 'FA-2',
				urgence: 'CRITIQUE',
				montant: depuisCentimes(100_000n),
				explication: 'FA-2 est critique mais modeste.',
				action: 'Leurre : critique, mais le moins cher des critiques.'
			}),
			evenement({
				reference: 'FA-3',
				urgence: 'CRITIQUE',
				montant: depuisCentimes(500_000n),
				explication: 'FA-3 est critique et cher.',
				action: 'Faire signifier sans délai.'
			})
		];

		const briefing = composerBriefing(evenements, depuisCentimes(1_500_000n));

		// L'URGENCE PRIME SUR LE MONTANT : un gros dossier tranquille ne passe
		// jamais devant un petit qui meurt. À urgence égale, le plus cher gagne.
		expect(briefing.action).toBe('Faire signifier sans délai.');
		expect(briefing.lignes).toHaveLength(3);
	});

	it('compte les points critiques dans la première ligne', () => {
		const evenements = [
			evenement({ reference: 'FA-1', urgence: 'CRITIQUE' }),
			evenement({ reference: 'FA-2', urgence: 'CRITIQUE' }),
			evenement({ reference: 'FA-3', urgence: 'HAUTE' })
		];
		const briefing = composerBriefing(evenements, depuisCentimes(1_000n));
		expect(briefing.lignes[0]).toContain('2');
		expect(briefing.lignes[0]).toContain('critique');
	});

	it('dit que tout va bien quand il n’y a rien, et ne propose aucune action', () => {
		// C'est le briefing de rassurance du septième jour. Il doit se lire comme
		// une bonne nouvelle, pas comme un message vide.
		const briefing = composerBriefing([], depuisCentimes(0n));
		expect(briefing.action).toBeNull();
		expect(briefing.titre).toContain('Rien');
	});

	it('porte le montant identifié tel quel, sans le recalculer', () => {
		// Le montant vient du moteur de décompte. Le briefing le TRANSPORTE ; il
		// ne refait aucun calcul, sans quoi deux chiffres pourraient diverger.
		const montant = depuisCentimes(5_914_040n);
		const briefing = composerBriefing([evenement()], montant);
		expect(briefing.montantIdentifie).toBe(montant);
	});

	it('gère un montant absent sans le confondre avec zéro au tri', () => {
		// `montant` vaut `null` quand il est RÉELLEMENT inconnu, pas quand il est
		// nul. Au tri, un montant inconnu ne doit pas faire passer un événement
		// devant un autre du même niveau d'urgence qui, lui, est chiffré.
		const evenements = [
			evenement({ reference: 'FA-1', urgence: 'HAUTE', montant: null, action: 'Leurre.' }),
			evenement({
				reference: 'FA-2',
				urgence: 'HAUTE',
				montant: depuisCentimes(1n),
				action: 'Celui-ci est chiffré.'
			})
		];
		const briefing = composerBriefing(evenements, depuisCentimes(1n));
		expect(briefing.action).toBe('Celui-ci est chiffré.');
	});

	it('l’intro ne répète aucune ligne du corps', () => {
		// `intro` porte déjà l'explication du premier événement. Si une ligne du
		// corps disait la même chose, le courriel répéterait la même phrase deux
		// fois d'affilée — exactement le bruit que « pas un digest » évite.
		const evenements = [
			evenement({ reference: 'FA-1', urgence: 'CRITIQUE', explication: 'Le plus urgent.' }),
			evenement({ reference: 'FA-2', urgence: 'HAUTE', explication: 'Le deuxième, différent.' })
		];
		const briefing = composerBriefing(evenements, depuisCentimes(1_000n));
		expect(briefing.lignes).not.toContain(briefing.intro);
	});

	it('un seul événement donne deux lignes : le compte, puis la décomposabilité', () => {
		// Avec un seul événement, une ligne « explication du deuxième » n'a pas de
		// deuxième à montrer. Elle disparaît au lieu de se remplir de force.
		const briefing = composerBriefing([evenement()], depuisCentimes(1_000n));
		expect(briefing.lignes).toHaveLength(2);
	});

	it('le cas vide donne exactement une ligne, et dit qu’il n’y a rien', () => {
		const briefing = composerBriefing([], depuisCentimes(0n));
		expect(briefing.lignes).toEqual(['Aucun point d’attention.']);
	});

	it('départage deux événements de même urgence et même montant par la référence', () => {
		// Sans départage, deux événements à égalité parfaite ressortiraient dans
		// l'ordre d'arrivée du tableau — un ordre que l'appelant ne maîtrise pas.
		// FA-2 vient APRÈS FA-9 dans le tableau mais doit gagner : « 2 » précède
		// « 9 » dans l'ordre de la référence, pas dans l'ordre d'arrivée.
		const evenements = [
			evenement({
				reference: 'FA-9',
				urgence: 'HAUTE',
				montant: depuisCentimes(100_000n),
				action: 'Action FA-9.'
			}),
			evenement({
				reference: 'FA-2',
				urgence: 'HAUTE',
				montant: depuisCentimes(100_000n),
				action: 'Action FA-2.'
			})
		];
		const briefing = composerBriefing(evenements, depuisCentimes(200_000n));
		expect(briefing.action).toBe('Action FA-2.');
	});

	it('saute au premier événement dont le texte diffère, pas au deuxième par position', () => {
		// Cas réel trouvé en relecture : `ECHEANCE_PROCEDURE` compose son
		// explication à partir du libellé de l'étape et de la date limite,
		// jamais de la référence du dossier. Deux dossiers distincts qui
		// démarrent la même procédure standard le même jour (même libellé, même
		// échéance calculée) produisent alors une explication identique au
		// caractère près, bien qu'ils soient deux événements différents. Prendre
		// « le deuxième par position » referait fuiter `intro` dans `lignes`.
		const explicationPartagee =
			"Signification de l'assignation : la date limite du 2026-09-10 est DÉPASSÉE.";
		const evenements = [
			evenement({
				reference: 'D-001',
				urgence: 'CRITIQUE',
				explication: explicationPartagee,
				action: 'Faire signifier le dossier D-001.'
			}),
			evenement({
				reference: 'D-002',
				urgence: 'HAUTE',
				explication: explicationPartagee,
				action: 'Faire signifier le dossier D-002.'
			}),
			evenement({
				reference: 'D-003',
				urgence: 'NORMALE',
				explication: 'Une facture distincte est échue.',
				action: 'Rattacher cette facture.'
			})
		];

		const briefing = composerBriefing(evenements, depuisCentimes(1_000n));

		expect(briefing.lignes).not.toContain(briefing.intro);
		expect(briefing.lignes).toContain('Une facture distincte est échue.');
	});

	it('replie sur deux lignes quand tous les événements racontent la même chose', () => {
		const explicationPartagee = 'Deux dossiers, la même étape, la même échéance.';
		const evenements = [
			evenement({ reference: 'D-001', urgence: 'CRITIQUE', explication: explicationPartagee }),
			evenement({ reference: 'D-002', urgence: 'HAUTE', explication: explicationPartagee })
		];

		const briefing = composerBriefing(evenements, depuisCentimes(1_000n));

		expect(briefing.lignes).toHaveLength(2);
		expect(briefing.lignes).not.toContain(briefing.intro);
	});
});
