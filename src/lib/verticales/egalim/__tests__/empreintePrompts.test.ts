import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { construirePromptExtraction } from '../../../socle/documents/prompt';
import { construirePromptSysteme } from '../prompt';

/**
 * Le verrou d'empreinte des deux prompts système.
 *
 * POURQUOI CE TEST EXISTE, alors que `prompt.test.ts` et
 * `promptExtraction.test.ts` vérifient déjà le déterminisme.
 *
 * Ils vérifient qu'un prompt est stable D'UN APPEL À L'AUTRE, dans le même
 * processus (`expect(a).toBe(b)`). C'est nécessaire et insuffisant : un
 * reformatage — un `prettier` sur un template literal, une indentation qui
 * change en déplaçant le fichier, une espace en fin de ligne — laisse cette
 * égalité parfaitement vraie tout en produisant un texte DIFFÉRENT de celui du
 * commit précédent.
 *
 * CE QUE ÇA COÛTE QUAND ÇA ARRIVE. Les deux prompts sont envoyés avec
 * `cache_control: 'ephemeral'`. Le cache Claude ne sert que sur un préfixe
 * IDENTIQUE À L'OCTET. Un caractère de différence et chaque lot repaie le
 * préfixe plein tarif : ~3 500 caractères de prompt de classification, sur
 * 6 à 10 appels par diagnostic, à chaque diagnostic. La facture monte, aucun
 * test ne tombe, et rien à l'écran ne change.
 *
 * CE TEST EST FAIT POUR ÊTRE MIS À JOUR — mais délibérément. Modifier un prompt
 * est légitime et fréquent ; le faire SANS S'EN APERCEVOIR ne l'est pas. Quand
 * il tombe, la bonne réaction est de vérifier que le changement de prompt était
 * voulu, puis de recopier la nouvelle empreinte ci-dessous dans le même commit.
 *
 * Relevé sur `3d0ccf4`, avant le déplacement socle/verticales de la phase 1.
 */

const EMPREINTES = {
	extraction: {
		sha256: 'c167f1d7d4fd7004fffff7eaebf93088c841818b732dda54e04134362290ac45',
		longueur: 2725
	},
	classification: {
		sha256: '29c33a72684b04fbdc139c92f7b5de0686d836ce8a5688fe85ea5b7e74267514',
		longueur: 3535
	}
} as const;

function empreinte(texte: string): string {
	return createHash('sha256').update(texte, 'utf8').digest('hex');
}

describe('empreinte des prompts système', () => {
	it("le prompt d'extraction n'a pas changé d'un octet", () => {
		const texte = construirePromptExtraction();
		expect(texte.length).toBe(EMPREINTES.extraction.longueur);
		expect(empreinte(texte)).toBe(EMPREINTES.extraction.sha256);
	});

	it("le prompt de classification n'a pas changé d'un octet", () => {
		const texte = construirePromptSysteme();
		expect(texte.length).toBe(EMPREINTES.classification.longueur);
		expect(empreinte(texte)).toBe(EMPREINTES.classification.sha256);
	});
});
