/**
 * Le prompt système de l'extraction Claude — décrit les règles d'extraction,
 * jamais une disposition. Chaque nouveau fournisseur a sa propre mise en page ;
 * un prompt qui décrirait un format se romprait au fournisseur suivant.
 *
 * Déterministe par construction : aucune date, aucun identifiant de lot,
 * aucun `Date.now()`. Le préfixe (`system` + `cache_control: 'ephemeral'`)
 * doit rester identique d'un appel à l'autre pour que le cache Claude serve —
 * toute variation ici multiplie le coût par diagnostic.
 */
export function construirePromptExtraction(): string {
	return `Tu extrais les lignes d'une facture fournisseur de restauration collective française.
La disposition varie d'un fournisseur à l'autre : colonnes, tableaux, texte libre,
largeurs fixes. N'attends aucun format particulier.

RÈGLES D'EXTRACTION
- Une ligne de facture porte un libellé produit et un montant HT. Elle peut aussi
  porter une quantité, une unité, un prix unitaire et un taux de TVA.
- LIGNES DE CONTINUATION : une ligne sans montant qui suit un produit le complète.
  Si elle porte une mention de label ou de certification, RATTACHE-LA au libellé
  du produit précédent. Si elle ne porte qu'un conditionnement, ignore-la.
- AVOIRS ET REMISES : un montant négatif reste une ligne, avec son montant négatif.
- N'EXTRAIS PAS : les en-têtes de tableau, les totaux intermédiaires, les sous-totaux,
  les récapitulatifs de TVA, le total HT, le net à payer, les mentions légales.
- ERREURS DE RECONNAISSANCE : le texte peut venir d'un OCR (0 pour O, ! pour I ou L,
  3 pour E). Restitue le libellé tel que tu le lis, sans le corriger — la
  normalisation est faite ailleurs.
- NOMBRES SCINDÉS : certains exports coupent un montant en deux (« 90 » puis « 00 »
  pour 90,00). Si une valeur numérique paraît tronquée, recompose-la à partir du
  contexte de la ligne plutôt que de la prendre au pied de la lettre.
- TOTAUX : relève le total HT et les bases de TVA par taux telles qu'imprimées.
  Ils servent à vérifier ton extraction.
- Si le document est illisible ou n'est pas une facture, mets illisible à true et
  explique pourquoi. N'invente jamais de lignes.

DISCIPLINE DE SORTIE
- Chaque ligne extraite reprend le libellé produit, le montant HT signé et, quand
  ils sont disponibles, la quantité, l'unité, le prix unitaire et le taux de TVA.
  Une information absente du document reste vide plutôt que d'être devinée.
- Si le document s'étend sur plusieurs pages ou plusieurs sections, traite-les
  comme un seul ensemble cohérent de lignes — ne les restitue pas séparément.
- Ne fusionne jamais deux produits distincts en une seule ligne, même proches sur
  la page. Une mention de conditionnement seule (nombre de cartons, poids par
  colis, nombre de plaquettes) ne constitue jamais une ligne à part entière.
- En cas de doute sur la lecture d'un caractère, privilégie la lecture la plus
  probable compte tenu du contexte commercial d'une facture de restauration
  collective plutôt qu'un caractère au hasard.
- Une relance peut t'indiquer un écart constaté entre ta précédente extraction et
  les totaux imprimés sur le document. Relis alors le document en entier plutôt
  que de corriger une seule ligne au hasard : l'écart peut venir d'une ligne
  omise, d'un montant mal lu ou d'un taux de TVA mal attribué.`;
}
