import { z } from 'zod';
import { pourcentageDepuisTaux, tauxDepuisPourcentage } from '../taux-contractuel';
import type { ClePiece } from '../qualification';

/**
 * L'EXTRACTEUR DE PREUVES — module 1.2 du blueprint.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL DÉBLOQUE : UN VERDICT QUI ÉTAIT INATTEIGNABLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La table `pieces` est LUE par les deux moteurs — `creances.ts` pour le score
 * de solidité, `lecture.ts` pour l'écran — et ÉCRITE nulle part. Huitième
 * occurrence du défaut « déclaré, lu, jamais alimenté » dans ce dépôt, et de
 * loin la plus coûteuse, parce que l'arithmétique la rend totale :
 *
 *   · les quatre conditions légales valent 12 points sur 20 ;
 *   · le seuil de qualification est à 0,75, soit 15 sur 20 ;
 *   · les 8 points restants sont documentaires, et le bon de commande comme le
 *     bon de livraison en valent 3 chacun.
 *
 * Une créance parfaite sur le droit plafonnait donc à 0,60, et AUCUNE ne
 * pouvait être éligible — quoi que fasse le créancier, puisque rien ne
 * permettait d'ajouter une pièce. Le verdict central du produit ne pouvait pas
 * se produire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE LOGICIEL RECONNAÎT, LE GÉRANT CONFIRME
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Règle d'écran n° 1 : aucun écran ne demande une saisie que le logiciel peut
 * déduire. Demander « quel type de document déposez-vous ? » devant un PDF qui
 * porte « BON DE LIVRAISON » en en-tête est exactement le champ vide qu'elle
 * interdit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET LE VERROU D'EMPREINTE DU PROMPT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le prompt part avec `cache_control: 'ephemeral'`, et le cache Claude ne sert
 * que sur un préfixe identique à l'octet. Aucune date, aucun identifiant,
 * aucune interpolation : un reformatage innocent multiplie le coût par
 * document sans qu'aucun autre test ne tombe.
 */

/**
 * Les types qu'on sait reconnaître.
 *
 * ⚠️ SOUS-ENSEMBLE DE `ClePiece`, ET C'EST VOULU. `FACTURE` n'y est pas : elle
 * a son propre extracteur, qui lit des montants et des échéances. `INCONNU`
 * n'est pas un type de pièce mais l'aveu que la lecture n'a pas abouti.
 */
export const TYPES_RECONNUS = [
	'BON_DE_COMMANDE',
	'DEVIS_SIGNE',
	'BON_DE_LIVRAISON',
	'CGV',
	'CONTRAT',
	'MISE_EN_DEMEURE',
	'ECHANGES'
] as const satisfies readonly ClePiece[];

export type TypeReconnu = (typeof TYPES_RECONNUS)[number];

/** Les types dont un taux d'intérêts de retard peut légitimement se lire. */
const PORTEURS_DE_TAUX: readonly TypeReconnu[] = ['CGV', 'CONTRAT'];

export const documentPreuveSchema = z.object({
	type: z
		.enum([...TYPES_RECONNUS, 'INCONNU'])
		.describe(
			'La nature du document. INCONNU si tu n’en es pas sûr — ne choisis jamais au hasard.'
		),
	reference: z.string().nullable().describe('Le numéro du document, tel qu’il est imprimé.'),
	date: z.string().nullable().describe('La date du document, au format AAAA-MM-JJ.'),
	referencesLiees: z
		.array(z.string())
		.describe(
			'Les numéros d’autres documents cités — commande, facture, livraison. Tels qu’imprimés.'
		),
	contrepartie: z
		.string()
		.nullable()
		.describe('Le nom de l’autre partie — le client ou le fournisseur, selon le document.'),
	receptionSignee: z
		.boolean()
		.nullable()
		.describe(
			'Sur un bon de livraison ou un bon de commande : le document porte-t-il une signature, un tampon ou une mention d’acceptation ? null si la question ne s’applique pas.'
		),
	reservesEmises: z
		.boolean()
		.nullable()
		.describe(
			'Le document porte-t-il une réserve, un refus, une mention manuscrite de désaccord ? null si la question ne s’applique pas.'
		),
	reserves: z
		.string()
		.nullable()
		.describe('Le texte exact de la réserve, recopié sans le reformuler. null s’il n’y en a pas.'),
	tauxRetardPourcent: z
		.number()
		.nullable()
		.describe(
			'UNIQUEMENT dans des conditions générales ou un contrat : le taux d’intérêt de retard stipulé, en pourcentage annuel. null partout ailleurs et si rien n’est stipulé.'
		),
	illisible: z
		.boolean()
		.describe('true si le document n’est pas exploitable : trop flou, tronqué, ou vierge.'),
	raisonIllisible: z.string().nullable()
});

export type DocumentPreuve = z.infer<typeof documentPreuveSchema>;

export interface PreuveLue {
	/** `null` quand le document n'a pas pu être classé. Jamais un type par défaut. */
	readonly type: TypeReconnu | null;
	readonly reference: string | null;
	readonly date: string | null;
	readonly referencesLiees: readonly string[];
	readonly contrepartie: string | null;
	readonly receptionSignee: boolean | null;
	/** Le texte exact de la réserve, jamais reformulé. */
	readonly reserves: string | null;
	/** Le taux stipulé, en pourcentage saisissable. `null` hors CGV et contrat. */
	readonly tauxRetardPourcent: string | null;
	/** Ce qu'on a lu, dit au présent. Un constat, jamais une consigne. */
	readonly constat: string;
}

const NOM_DU_TYPE: Record<TypeReconnu, string> = {
	BON_DE_COMMANDE: 'un bon de commande',
	DEVIS_SIGNE: 'un devis signé',
	BON_DE_LIVRAISON: 'un bon de livraison',
	CGV: 'des conditions générales de vente',
	CONTRAT: 'un contrat',
	MISE_EN_DEMEURE: 'une mise en demeure',
	ECHANGES: 'des échanges'
};

/**
 * Ce que le modèle a rendu, traduit dans les termes du domaine.
 *
 * ⚠️ « INCONNU » N'EST PAS « AUCUNE PIÈCE », et c'est la distinction qui
 * compte. Classer au hasard ferait monter le score de solidité — donc franchir
 * le seuil de qualification — sur un document que personne n'a lu. Un dossier
 * jugé mûr sur une pièce illisible est exactement le mode de défaillance qui
 * fait engager des frais.
 */
export function lirePreuve(brut: DocumentPreuve): PreuveLue {
	const commun = {
		reference: brut.reference,
		date: brut.date,
		referencesLiees: brut.referencesLiees,
		contrepartie: brut.contrepartie,
		receptionSignee: brut.receptionSignee
	};

	if (brut.illisible || brut.type === 'INCONNU') {
		return {
			...commun,
			type: null,
			reserves: null,
			tauxRetardPourcent: null,
			constat:
				brut.raisonIllisible ??
				'Ce document n’a pas pu être lu : sa nature n’est pas identifiée, et il ne compte ' +
					'dans aucun critère de solidité.'
		};
	}

	const type = brut.type;

	// ⚠️ UN TAUX NE SE LIT QUE DANS DES CGV OU UN CONTRAT. Un nombre suivi d'un
	// « % » sur un bon de livraison est une remise, une TVA, un taux de casse —
	// jamais une stipulation d'intérêts. L'accepter écrirait un taux faux sur
	// TOUTES les factures non soldées du débiteur.
	const tauxRetardPourcent =
		PORTEURS_DE_TAUX.includes(type) && brut.tauxRetardPourcent !== null
			? lireTaux(brut.tauxRetardPourcent)
			: null;

	const morceaux = [`Ce document est ${NOM_DU_TYPE[type]}`];
	if (brut.reference !== null) morceaux.push(`, n° ${brut.reference}`);
	if (brut.date !== null) morceaux.push(`, du ${brut.date}`);
	morceaux.push('.');

	if (brut.referencesLiees.length > 0) {
		morceaux.push(` Il cite ${brut.referencesLiees.join(', ')}.`);
	}

	// ⚠️ UNE RÉSERVE EST UN FAIT DE LITIGE, et le questionnaire de qualification
	// demande précisément « une réserve portée sur un bon de livraison ». La
	// trouver ici et se taire laisserait le gérant répondre « non » de bonne foi
	// sur un document qu'on a lu à sa place.
	if (brut.reservesEmises === true && brut.reserves !== null) {
		morceaux.push(` Une réserve y est portée : « ${brut.reserves} »`);
	}

	if (tauxRetardPourcent !== null) {
		morceaux.push(` Un taux de retard de ${tauxRetardPourcent} % y est stipulé.`);
	}

	return {
		...commun,
		type,
		reserves: brut.reservesEmises === true ? brut.reserves : null,
		tauxRetardPourcent,
		constat: morceaux.join('')
	};
}

/**
 * Un taux lu sur un document, passé par la porte du domaine.
 *
 * ⚠️ AUCUN CHEMIN PARALLÈLE. `tauxDepuisPourcentage` refuse trois décimales, le
 * zéro et le négatif, et n'emploie aucun flottant. Un taux venu d'un modèle
 * doit franchir exactement les mêmes contrôles qu'un taux tapé à la main — il
 * entre dans le même décompte, qui part chez le même tiers.
 *
 * Un refus rend `null` : on ne fait pas échouer la lecture d'un document pour
 * un chiffre qu'on ne sait pas interpréter, on s'abstient de le proposer.
 */
function lireTaux(pourcentage: number): string | null {
	try {
		return pourcentageDepuisTaux(tauxDepuisPourcentage(pourcentage.toString()));
	} catch {
		return null;
	}
}

/**
 * Le prompt d'extraction d'une pièce.
 *
 * Déterministe par construction : aucune date, aucun identifiant, aucun
 * `Date.now()`. Il part avec `cache_control: 'ephemeral'`, et le cache Claude
 * ne sert que sur un préfixe identique à l'octet.
 */
export function construirePromptPreuve(): string {
	return `Tu lis une PIÈCE JUSTIFICATIVE déposée par une entreprise française dans un
dossier de recouvrement de créances. Ce n'est pas une facture : la facture a son
propre traitement. Tu dois dire ce qu'est ce document, et relever ce qui le
rattache au dossier.

RECONNAÎTRE LA NATURE DU DOCUMENT
Sept natures possibles, et une huitième qui est un aveu :

- BON_DE_COMMANDE : le client commande. En-tête « Bon de commande »,
  « Commande n° », « Purchase order ». Porte souvent une signature ou un cachet
  du client.
- DEVIS_SIGNE : une proposition chiffrée acceptée. « Devis », « Proposition
  commerciale », « Bon pour accord ». Ce qui le distingue d'un devis simple est
  la signature ou la mention d'acceptation.
- BON_DE_LIVRAISON : la marchandise a été remise. « Bon de livraison »,
  « Bordereau de livraison », « BL », « Bon de réception ». Souvent émargé.
- CGV : les conditions générales de vente ou d'achat. Texte d'articles
  numérotés, clauses de paiement, de retard, de réserve de propriété.
- CONTRAT : un accord signé entre les deux parties. Contrat-cadre, convention,
  marché, avenant.
- MISE_EN_DEMEURE : une interpellation formelle du débiteur. « Mise en
  demeure », « Dernier rappel avant poursuite », souvent en recommandé.
- ECHANGES : des courriers ou courriels échangés avec le client.
- INCONNU : tu n'es pas sûr. C'est une réponse LÉGITIME et attendue. Un
  document mal classé compte dans un score de solidité qui décide si une
  procédure s'engage ; le classer au hasard est pire que ne pas le classer.

CE QUE TU RELÈVES
- La référence du document, telle qu'elle est imprimée.
- Sa date.
- Les numéros des AUTRES documents qu'il cite : commande, facture, livraison.
  Ce sont eux qui rattachent la pièce aux bonnes factures.
- Le nom de l'autre partie.
- S'il porte une signature, un tampon, un émargement, une mention
  d'acceptation ou de réception.

LES RÉSERVES, ET POURQUOI ELLES COMPTENT AUTANT
Une mention manuscrite « 2 colis manquants », « refusé », « sous réserve de
vérification », un paraphe barré : ce sont des faits qui pèsent sur le dossier.
Recopie le texte EXACTEMENT, sans le reformuler ni le résumer. S'il n'y en a
aucune, dis-le franchement plutôt que de laisser le champ vide.

LE TAUX D'INTÉRÊT DE RETARD
Uniquement dans des conditions générales ou un contrat. Cherche une clause de
pénalités de retard : « intérêts de retard au taux de », « pénalités de
retard », « x fois le taux d'intérêt légal ». Rends le pourcentage ANNUEL.
Sur tout autre type de document, laisse ce champ vide : un pourcentage sur un
bon de livraison est une remise, une TVA ou un taux de casse.

LA RÈGLE QUI PRIME SUR TOUTES LES AUTRES
Tu relèves ce qui est IMPRIMÉ. Tu ne dois jamais déduire, deviner, calculer ni
inventer une valeur absente : un champ vide est une information exacte, une
valeur inventée est une erreur qu'on ne détectera pas. Si le document est trop
flou, tronqué ou vierge, dis-le et n'invente rien du reste.`;
}
