import { describe, it, expect } from 'vitest';
import {
	RefusDeRendu,
	filtrerChampLexicalProcedure,
	filtrerEnoncesJuridiques,
	filtrerMontants,
	type SortieCompagnon
} from '../filtres';

/**
 * TROIS CAS, ET TROIS SEULEMENT.
 *
 * Le plan n'ouvre que trois exceptions à la règle « aucun test neuf » pour
 * cette tâche, chacune au titre d'une règle qui coûte cher quand elle glisse :
 * l'énoncé juridique non résolu (règle juridique), le champ lexical de la
 * procédure (ligne rouge 3), le montant sans pastille (calcul de montant).
 *
 * ⚠️ CHAQUE CAS EST UNE PHRASE QUE LE BALAYAGE ACTUEL LAISSE PASSER. Un test
 * qui ne mord que sur ce qui tombait déjà ne mesure rien : il recopie la
 * barrière qu'il prétend doubler. Les trois phrases ci-dessous sont donc
 * vérifiées deux fois, une fois contre le motif historique qu'elles traversent,
 * une fois contre le filtre qui les retient.
 */

/** Le motif de ligne rouge 3 tel qu'il balaie l'interface aujourd'hui. */
const MOTIF_HISTORIQUE =
	/engager une procédure|engagez |faire signifier|signifiez |assignez|poursuivez |mettez en demeure|saisissez le tribunal|relancez |vous devriez|nous vous (recommandons|conseillons)/i;

function sortie(texte: string, pastilles: SortieCompagnon['pastilles'] = []): SortieCompagnon {
	return { texte, pastilles };
}

/** Ce qu'un filtre a levé. Échoue en nommant la phrase s'il n'a rien levé. */
function refusDe(agir: () => unknown): RefusDeRendu {
	try {
		agir();
	} catch (erreur) {
		if (erreur instanceof RefusDeRendu) return erreur;
		throw erreur;
	}
	throw new Error('Le filtre n’a rien levé, alors qu’il aurait dû retenir la phrase.');
}

describe('les filtres avant rendu du compagnon', () => {
	it('B3 retient une affirmation de droit qui ne cite aucun article', () => {
		const phrase = 'Ce type de créance se prescrit par cinq ans.';

		// Ce qui rend cette phrase dangereuse : elle ne ressemble à rien. Aucun
		// numéro d'article, aucun code cité, donc aucun balayage de source citée
		// ne peut la voir — et elle est fausse dès que la créance relève du
		// transport (un an) ou d'une fourniture à un consommateur (deux ans).
		expect(phrase).not.toMatch(/article|[LRD]\d{3}-\d+/i);

		const refus = refusDe(() => filtrerEnoncesJuridiques(sortie(phrase)));
		expect(refus.barriere).toBe('B3');
		expect(refus.terme).toBe('prescrit');
		expect(refus.refus.constat).toContain('prescrit');
		// B14 : un refus dont la première ligne est vide est un mur.
		expect(refus.refus.peutFaire.trim()).not.toBe('');

		// La même phrase RÉSOUT dès qu'une pastille la relie au registre. C'est
		// la seule sortie : pas une réécriture, pas un adoucissement.
		const ancree = sortie(phrase, [
			{ genre: 'PARAMETRE', extrait: phrase, cle: 'delaiPrescriptionCommerciale' }
		]);
		expect(filtrerEnoncesJuridiques(ancree)).toBe(ancree);

		// Une pastille qui cite une clé absente du référentiel ne résout rien, et
		// le refus NOMME la clé : une pastille qui pointe dans le vide est plus
		// dangereuse qu'une pastille absente, parce qu'elle a l'air vérifiable.
		const inventee = refusDe(() =>
			filtrerEnoncesJuridiques(
				sortie(phrase, [{ genre: 'PARAMETRE', extrait: phrase, cle: 'delaiPrescriptionTransport' }])
			)
		);
		expect(inventee.refus.constat).toContain('delaiPrescriptionTransport');
	});

	it('B6 retient le champ lexical de la procédure partout dans la phrase', () => {
		// Ligne rouge 3. Les quatre phrases traversent le motif historique, qui
		// est une liste d'impératifs : aucune ne commence par un verbe d'ordre,
		// et la deuxième CLASSE pourtant une voie, ce que même l'écran des
		// procédures ne fait pas. La quatrième a vécu en production.
		const phrases = [
			'Vous pourriez saisir le tribunal.',
			'La voie la plus rapide ici est l’injonction de payer.',
			'Il reste l’injonction de payer.',
			'Examiner les procédures envisageables pour cette créance.'
		];

		for (const phrase of phrases) {
			expect(phrase).not.toMatch(MOTIF_HISTORIQUE);

			const refus = refusDe(() => filtrerChampLexicalProcedure(phrase));
			expect(refus.barriere).toBe('B6');
			// Le terme trouvé est NOMMÉ, et il vient de la phrase elle-même :
			// un filtre qui refuse sans dire quoi apprend à ignorer le refus.
			expect(refus.terme).not.toBe('');
			expect(phrase.toLowerCase()).toContain(refus.terme.toLowerCase());
			expect(refus.refus.constat).toContain(refus.terme);
			expect(refus.refus.peutFaire.trim()).not.toBe('');
		}

		// ⚠️ ET LE CONSTAT DU REGISTRE PASSE. Le registre public écrit
		// « procédure collective » et le produit le cite mot pour mot ; un
		// lexique qui ferait taire cette phrase-là protégerait le produit d'un
		// conseil que personne n'a donné, en supprimant un fait relevé.
		const constat = 'Le registre public porte une procédure collective pour ce débiteur.';
		expect(filtrerChampLexicalProcedure(constat)).toBe(constat);
	});

	it('B4 retient un montant qu’aucune pastille ne relie à un décompte', () => {
		const phrase = 'Le compte de ce client s’élève à 12 680,00 € aujourd’hui.';

		// Un montant en texte libre ne se refait pas à la main, et c'est ce que
		// fera le débiteur qui le conteste. Aucun balayage de code ne peut voir
		// un chiffre qu'un modèle compose à l'exécution.
		const refus = refusDe(() => filtrerMontants(sortie(phrase)));
		expect(refus.barriere).toBe('B4');
		expect(refus.terme).toBe('12 680,00 €');
		expect(refus.refus.constat).toContain('12 680,00 €');
		expect(refus.refus.peutFaire.trim()).not.toBe('');

		// Relié à un décompte, il se rend : c'est la pastille qui permet au
		// débiteur de refaire le calcul, pas la phrase.
		const ancree = sortie(phrase, [
			{ genre: 'DECOMPTE', extrait: '12 680,00 €', decompteId: 'd-1' }
		]);
		expect(filtrerMontants(ancree)).toBe(ancree);

		// Une pastille dont l'extrait ne se retrouve pas dans le texte ne couvre
		// rien : le doute ne profite jamais au produit.
		const menteuse = refusDe(() =>
			filtrerMontants(sortie(phrase, [{ genre: 'PIECE', extrait: '40,00 €', pieceId: 'p-1' }]))
		);
		expect(menteuse.terme).toBe('12 680,00 €');
	});
});
