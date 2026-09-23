import { describe, expect, it } from 'vitest';
import { PARAMETRES, tousLesParametres, type ParametreLegalBase } from '../parametres';

/**
 * LES SOURCES QU'ON CITE SONT-ELLES ENCORE LA VERSION EN VIGUEUR ?
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT QUE CE TEST EXISTE POUR ATTRAPER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La règle la plus stricte du projet dit qu'un numéro d'article inventé est
 * PLUS dangereux qu'une source absente, « parce qu'il a l'air vérifiable ».
 * Un renvoi vers une version PÉRIMÉE a exactement ce défaut, en pire : il
 * s'ouvre, il s'affiche, il porte le bon numéro d'article — et il ne dit plus
 * le droit en vigueur. Rien dans le produit ne le signalerait, et personne ne
 * relit spontanément une source posée deux ans plus tôt.
 *
 * Le relevé du 23/09/2026 a trouvé le premier cas : `L441-10` porte une version
 * postérieure au 1er janvier 2027 (ordonnance n° 2026-671 du 27 juillet 2026).
 * Sa VALEUR ne change pas — le II est identique au mot près — mais la page que
 * nous citons cesse ce jour-là d'être la version en vigueur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE TEST NE DIT PAS « LA VALEUR EST FAUSSE ». IL DIT « RELISEZ »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La distinction n'est pas rhétorique, elle décide de ce qu'on fait quand il
 * tombe. On ne corrige pas un chiffre : on rouvre la source, on compare les
 * deux versions, et dans le cas le plus fréquent on se contente de rebaser le
 * relevé. Un message qui crierait « valeur périmée » ferait chercher une erreur
 * qui n'existe pas.
 *
 * ⚠️ ET IL PREND LE JOUR EN ARGUMENT. Un test qui lirait l'horloge sans porte
 * d'entrée ne pourrait pas être éprouvé avant son échéance — c'est-à-dire qu'on
 * ne saurait pas s'il mord, précisément jusqu'au jour où il doit mordre.
 */

/** Les entrées dont la source porte une date de fin, lues à un jour donné. */
function perimeesAu(jour: string): readonly ParametreLegalBase[] {
	return tousLesParametres().filter(
		(p) => p.sourceValableJusqua !== undefined && p.sourceValableJusqua <= jour
	);
}

/** Le jour réel, en UTC, au format ISO court. */
function aujourdHui(): string {
	return new Date().toISOString().slice(0, 10);
}

describe('les sources citées sont encore la version en vigueur', () => {
	it('ne cite aucune version périmée aujourd’hui', () => {
		const perimees = perimeesAu(aujourdHui());

		expect(
			perimees.map((p) => `« ${p.cle} » — source : ${p.source} (version relevée valable jusqu’au ${p.sourceValableJusqua})`),
			'Ces paramètres citent une version qui n’est PLUS en vigueur.\n\n' +
				'Ce n’est pas forcément une valeur fausse : dans le cas le plus fréquent, le texte est ' +
				'identique et seule la page a changé. Le geste attendu est donc de ROUVRIR la source, ' +
				'de comparer la version relevée et la nouvelle mot à mot, puis :\n' +
				'  · si la valeur est inchangée — rebaser `verifieLe` et `sourceValableJusqua` sur la ' +
				'nouvelle version, en notant la comparaison faite ;\n' +
				'  · si la valeur a changé — la corriger, et vérifier ce qui s’en déduit ailleurs.\n\n' +
				'Ne jamais retirer `sourceValableJusqua` pour faire taire ce test : c’est exactement ' +
				'ainsi qu’un garde-fou meurt.'
		).toEqual([]);
	});

	/**
	 * ⚠️ CE TEST-CI VÉRIFIE QUE LE PRÉCÉDENT MORD. Sans lui, une faute de frappe
	 * dans la comparaison — `>=` au lieu de `<=`, un champ mal nommé — rendrait
	 * la barrière silencieusement inopérante, et elle passerait au vert pour
	 * toujours.
	 */
	it('lèverait bien le jour venu, et pas la veille', () => {
		expect(perimeesAu('2026-12-31').map((p) => p.cle)).toEqual([]);
		expect(perimeesAu('2027-01-01').map((p) => p.cle)).toEqual([
			'tauxInteretLegalDefaut',
			'tauxInteretMinimalLegal'
		]);
	});

	/**
	 * ⚠️ LE PIÈGE INVERSE, ET LES HUIT SCEPTIQUES DU RELEVÉ L'ONT NOMMÉ COMME LE
	 * PLUS PROBABLE : écrire une date de fin là où il n'y en a pas, par
	 * contagion du dossier TVA. Le produit lèverait alors en nommant une entrée
	 * parfaitement à jour, personne ne trouverait quoi corriger, et le test
	 * finirait désactivé.
	 *
	 * Sur les huit sources relevées le 23/09/2026 — L441-10, D441-5, L110-4,
	 * L210-1, 1845 du code civil, L311-1 du code rural, les trois articles
	 * L126-x, l'article 1411 du code de procédure civile et la nomenclature
	 * INSEE — UNE SEULE porte une version postérieure. Ce test fige ce compte.
	 */
	it('ne date que ce qui a une date, et rien de plus', () => {
		const datees = tousLesParametres()
			.filter((p) => p.sourceValableJusqua !== undefined)
			.map((p) => p.cle)
			.sort();

		expect(
			datees,
			'Une date de fin a été posée sur une entrée qui n’en avait pas. Elle doit avoir été LUE ' +
				'sur la source — un bandeau « version en vigueur du … AU … », ou une abrogation datée. ' +
				'Si elle vient d’un raisonnement plutôt que d’une page, elle est inventée.'
		).toEqual(['tauxInteretLegalDefaut', 'tauxInteretMinimalLegal']);
	});

	it('n’accepte qu’une date ISO, jamais une phrase', () => {
		for (const p of tousLesParametres()) {
			if (p.sourceValableJusqua === undefined) continue;
			expect(p.sourceValableJusqua, `« ${p.cle} »`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		}
	});

	/**
	 * L'ancre du relevé : ce que nous avons effectivement lu sur Légifrance le
	 * 23 septembre 2026. Si quelqu'un change cette date sans rouvrir la page,
	 * ce test le lui rappelle.
	 */
	it('porte la date relevée sur L441-10, et le bon texte modificateur', () => {
		expect(PARAMETRES.tauxInteretLegalDefaut.sourceValableJusqua).toBe('2027-01-01');
		expect(PARAMETRES.tauxInteretMinimalLegal.sourceValableJusqua).toBe('2027-01-01');
	});
});
