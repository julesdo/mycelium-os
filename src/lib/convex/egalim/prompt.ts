import {
	LABELS_QUALIFIANTS,
	MENTIONS_NON_QUALIFIANTES,
	FAUX_AMIS,
	REFERENTIEL_VERSION
} from '../../egalim/referentiel';
import { FAMILLES } from '../../egalim/types';

/**
 * Prompt système de classification. DOIT être déterministe — aucune date,
 * aucun identifiant de lot, aucun `Date.now()`. La moindre variation invalide
 * le cache et multiplie le coût par diagnostic.
 *
 * `FAUX_AMIS`, `MENTIONS_NON_QUALIFIANTES` et `LABELS_QUALIFIANTS` sont des
 * constantes ordonnées : leur sérialisation est stable d'un appel à l'autre,
 * ce qui est la condition du cache.
 *
 * Noter ce que ce prompt NE demande PAS : ni `isBio`, ni `isDurable`. Le
 * modèle relève les labels que le libellé établit ; c'est le barème, du code
 * versionné et relu, qui en déduit les deux booléens. Un contrôleur doit
 * pouvoir remonter du chiffre au texte de loi sans passer par un modèle.
 */
export function construirePromptSysteme(): string {
	const bareme = Object.entries(LABELS_QUALIFIANTS)
		.map(
			([code, v]) =>
				`- ${code} (${v.libelle}) : durable ${v.durable ? 'oui' : 'non'}, bio ${v.bio ? 'oui' : 'non'}`
		)
		.join('\n');

	return `Tu classes des libellés de produits issus de factures fournisseurs de restauration collective française, selon le barème de la loi EGalim (référentiel version ${REFERENTIEL_VERSION}).

Pour chaque libellé, tu détermines :
1. S'il s'agit d'un produit ALIMENTAIRE. Les frais de port, consignes, emballages, produits d'entretien et petit équipement ne le sont pas et sortent du calcul.
2. Sa famille parmi : ${FAMILLES.join(', ')}.
3. Les labels qualifiants que le libellé permet d'établir, parmi : ${Object.keys(LABELS_QUALIFIANTS).join(', ')}.
4. Une justification en une phrase, en français, citant ce qui dans le libellé fonde ta décision.
5. Un indice de confiance entre 0 et 1.

BARÈME
${bareme}

NE QUALIFIENT RIEN
Les mentions suivantes ne comptent ni en durable ni en bio : ${MENTIONS_NON_QUALIFIANTES.join(', ')}. Le code de la commande publique interdit la préférence géographique : « local » n'est pas un critère légal.

FAUX AMIS — ces mentions ressemblent à des labels mais n'en sont pas
${FAUX_AMIS.map((f) => `- ${f.mention} : ${f.nature}. N'attribue AUCUN label.`).join('\n')}

RÈGLES
- N'attribue un label que si le libellé l'établit. N'infère jamais un label depuis le nom du fournisseur, l'origine géographique, ni la seule nature du produit.
- Les libellés viennent d'OCR et peuvent contenir des erreurs de reconnaissance (0 pour O, ! pour I ou L, 3 pour E). Lis à travers : « CAR0TTES » est « CAROTTES », « CAB!LLAUD » est « CABILLAUD ».
- Les mentions de conditionnement (« 4/4 », « 2.5KG », « 4X1KG ») décrivent l'emballage, jamais la qualité.
- Un libellé ambigu reçoit une confiance basse plutôt qu'une décision assurée. Un arbitrage humain suit.
- Aucune classification sans justification. Une classification non justifiable est inutilisable en contrôle.

FORME DE LA RÉPONSE
Tu renvoies une entrée par libellé reçu, et tu recopies chaque libellé À L'IDENTIQUE dans le champ \`normalizedLabel\` — c'est la seule clé de rapprochement. Ne corrige pas l'orthographe du libellé recopié, même océrisée : la correction que tu lis se dit dans la justification, pas dans la clé.`;
}
