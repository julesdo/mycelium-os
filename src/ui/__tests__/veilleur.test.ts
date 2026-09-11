import { describe, expect, it } from 'vitest';
import { travauxDuVeilleur } from '../veilleur';

/**
 * LE VEILLEUR DIT CE QUE LA MACHINE A FAIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE CES TESTS TIENNENT, ET POURQUOI ÇA COMPTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit fait tourner, chaque nuit, un battement qui recalcule tout et
 * décide s'il faut parler ; un radar qui interroge les registres publics ; et
 * à la demande, une lecture de pièces qui passe par le modèle. Tout cela
 * s'enregistre : la table `battements` porte, pour chaque nuit, un statut et
 * une RAISON dont le schéma dit lui-même « affiché tel quel ».
 *
 * Elle n'était affichée nulle part. L'écran d'accueil recevait la raison et la
 * jetait sur une seule ligne, en repliant `PARLE` et `TU` sur un état
 * « NORMAL » qui ne rend rien. Le seul moment où le produit admettait qu'une
 * machine travaille pour lui était le jour où elle tombait en panne.
 *
 * ⚠️ L'OBJECTION EST CONNUE, ET ELLE EST TRAITÉE. « Un bandeau vert permanent
 * devient du décor en trois jours. » C'est vrai d'un bandeau vert, qui dit la
 * même chose tous les jours. Ce n'est pas vrai d'un JOURNAL DE TRAVAIL, dont
 * le texte change chaque nuit — « rien de nouveau, rien de critique », puis
 * « 3 points critiques », puis « sept jours sans nouvelle » — et dont
 * l'horodatage vieillit à vue. Ce qui devient du décor, c'est ce qui ne varie
 * pas.
 */
const NUIT = Date.UTC(2026, 8, 11, 6, 12, 0); // 11 septembre 2026, 06:12 UTC

describe('le veilleur', () => {
	it('dit la phrase de la machine telle quelle, même quand tout va bien', () => {
		const [surveillance] = travauxDuVeilleur({
			battement: {
				jour: '2026-09-11',
				statut: 'TU',
				raison: 'rien de nouveau, rien de critique',
				termineLe: NUIT
			},
			depotsEnCours: [],
			aujourdHui: '2026-09-11'
		});

		// Le point du test : la phrase de la machine ARRIVE À L'ÉCRAN. Un état
		// « NORMAL » qui ne rend rien laisserait croire qu'aucune machine ne
		// tourne — c'est le pire malentendu possible sur ce produit.
		expect(surveillance?.dit).toBe('rien de nouveau, rien de critique');
		expect(surveillance?.etat).toBe('TOURNE');
		expect(surveillance?.quand).toContain('06:12');
	});

	it('rapporte la nuit où la machine a parlé, avec sa raison', () => {
		const [surveillance] = travauxDuVeilleur({
			battement: { jour: '2026-09-11', statut: 'PARLE', raison: '3 points critiques', termineLe: NUIT },
			depotsEnCours: [],
			aujourdHui: '2026-09-11'
		});

		expect(surveillance?.dit).toBe('3 points critiques');
		expect(surveillance?.etat).toBe('TOURNE');
	});

	it('marque la surveillance ROMPUE quand le battement a échoué', () => {
		const [surveillance] = travauxDuVeilleur({
			battement: {
				jour: '2026-09-09',
				statut: 'ECHEC',
				raison: 'le battement n’a pas pu s’exécuter',
				termineLe: NUIT
			},
			depotsEnCours: [],
			aujourdHui: '2026-09-11'
		});

		// ⚠️ Un échec ne se range pas à côté d'un succès. C'est le seul état du
		// veilleur qui doit se distinguer au premier coup d'œil : le gérant qui
		// se croit surveillé alors qu'il ne l'est plus perdra une créance en
		// croyant être couvert.
		expect(surveillance?.etat).toBe('ROMPU');
	});

	it('vieillit à vue : une nuit qui n’est pas celle-ci le dit', () => {
		const [surveillance] = travauxDuVeilleur({
			battement: { jour: '2026-09-08', statut: 'TU', raison: 'rien de nouveau', termineLe: NUIT },
			depotsEnCours: [],
			aujourdHui: '2026-09-11'
		});

		// C'est ce qui empêche le journal de devenir du décor : l'horodatage
		// n'est pas le même tous les jours, et un retard se lit sans le chercher.
		expect(surveillance?.quand).not.toContain('cette nuit');
		expect(surveillance?.quand).toContain('8 sept');
	});

	it('fait apparaître un dépôt en cours de lecture, de lui-même', () => {
		const travaux = travauxDuVeilleur({
			battement: { jour: '2026-09-11', statut: 'TU', raison: 'rien de nouveau', termineLe: NUIT },
			depotsEnCours: [{ id: 'i1', filename: 'export-aout.csv', etape: 'lecture de 412 lignes' }],
			aujourdHui: '2026-09-11'
		});

		const lecture = travaux.find((t) => t.etat === 'EN_COURS');
		// Règle d'écran n° 2 : tout traitement se voit sans qu'on le demande.
		expect(lecture).toBeDefined();
		expect(lecture?.titre).toBe('export-aout.csv');
		expect(lecture?.dit).toBe('lecture de 412 lignes');
	});

	it('met le travail en cours EN PREMIER : c’est ce qui bouge maintenant', () => {
		const travaux = travauxDuVeilleur({
			battement: { jour: '2026-09-11', statut: 'TU', raison: 'rien de nouveau', termineLe: NUIT },
			depotsEnCours: [{ id: 'i1', filename: 'export-aout.csv', etape: 'lecture' }],
			aujourdHui: '2026-09-11'
		});

		expect(travaux[0]?.etat).toBe('EN_COURS');
	});

	it('n’invente pas d’étape quand le dépôt n’en publie pas', () => {
		const travaux = travauxDuVeilleur({
			battement: null,
			depotsEnCours: [{ id: 'i1', filename: 'factures.pdf' }],
			aujourdHui: '2026-09-11'
		});

		// ⚠️ `etape` est facultatif en base. Fabriquer « lecture en cours » quand
		// la machine n'a rien publié donnerait un texte plausible et faux — et
		// c'est précisément ce que ce produit s'interdit.
		expect(travaux[0]?.dit).toBe('en attente de lecture');
	});

	it('distingue le CHARGEMENT du vide, et n’affirme rien pendant', () => {
		const travaux = travauxDuVeilleur({
			// `undefined` est ce que rend Convex tant que la réponse n'est pas là.
			battement: undefined,
			depotsEnCours: [],
			aujourdHui: '2026-09-11'
		});

		// ⚠️ SURTOUT PAS « elle n'a pas encore tourné ». Ce serait une phrase
		// FAUSSE affichée le temps d'un aller-retour, à chaque ouverture de
		// l'application — et c'est ainsi qu'on apprend à ne plus lire une rangée.
		// L'état de chargement se tait, l'état vide parle. Les deux diffèrent.
		expect(travaux).toEqual([]);
	});

	it('ne se tait jamais : sans battement, il dit qu’il n’a pas encore tourné', () => {
		const travaux = travauxDuVeilleur({
			battement: null,
			depotsEnCours: [],
			aujourdHui: '2026-09-11'
		});

		// Un veilleur muet est indistinguable d'un veilleur absent.
		expect(travaux).toHaveLength(1);
		expect(travaux[0]?.etat).toBe('PAS_ENCORE');
		expect(travaux[0]?.quand).toBeNull();
	});
});
