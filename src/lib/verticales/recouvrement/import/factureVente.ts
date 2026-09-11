import { z } from 'zod';
import { estDateReelle } from '../calendrier';
import { normaliserSiren, sirenDepuisSiret } from '../pays/france/siren';
import { champsCommunsDocument } from '../../../socle/documents/schema';
import { depuisEuros, type Montant } from '../../../socle/montants';
import type { FactureImportee, ResultatImport } from './exportComptable';

/**
 * Le dépôt de fichiers, pour des factures de VENTE.
 *
 * C'est le chemin de repli quand le créancier n'a pas d'export comptable sous
 * la main — une facture retrouvée en PDF, une photo, un scan. Il réutilise
 * toute la machinerie d'extraction du socle, mais pas son schéma d'achat.
 *
 * TROIS DIFFÉRENCES AVEC UNE FACTURE D'ACHAT, ET AUCUNE N'EST COSMÉTIQUE.
 *
 * 1. **La contrepartie est le CLIENT.** L'émetteur, c'est le créancier
 *    lui-même : le lire ne servirait à rien. Ce qu'on cherche est le débiteur,
 *    qui n'a aucun champ dans le schéma d'achat.
 *
 * 2. **La date d'échéance compte.** EGalim l'ignore — il agrège des montants
 *    sur douze mois. Ici, sans elle, aucun intérêt de retard n'est calculable :
 *    c'est le point de départ de tout le décompte.
 *
 * 3. **C'est le TTC qui est réclamé**, pas le HT. Et il est LU sur la facture,
 *    jamais recalculé depuis les bases de TVA : recomposer un TTC ferait
 *    dépendre une somme réclamée d'une arithmétique sur des taux, là où le
 *    document imprime déjà le net à payer.
 */

export const documentVenteSchema = z.object({
	clientName: z
		.string()
		.nullable()
		.describe(
			'Le nom du CLIENT destinataire de la facture — celui qui doit payer. Ce n’est PAS l’émetteur.'
		),
	invoiceNumber: z.string().nullable(),
	clientSiret: z
		.string()
		.nullable()
		.describe(
			'Le SIREN (9 chiffres) ou SIRET (14 chiffres) DU CLIENT, s’il est imprimé. Jamais celui de l’émetteur. null si aucun n’est imprimé — ne jamais le déduire.'
		),
	invoiceDate: z.string().nullable().describe('Date d’émission, au format AAAA-MM-JJ.'),
	dueDate: z
		.string()
		.nullable()
		.describe(
			'Date d’échéance de paiement, au format AAAA-MM-JJ. null si aucune date n’est imprimée — ne jamais la calculer.'
		),
	totalTTC: z
		.number()
		.nullable()
		.describe(
			'Le total TTC / net à payer, tel qu’il est IMPRIMÉ. Ne jamais le recomposer à partir du HT et de la TVA.'
		),
	...champsCommunsDocument
});

export type DocumentVente = z.infer<typeof documentVenteSchema>;

/**
 * Le prompt d'extraction d'une facture de vente.
 *
 * Déterministe par construction : aucune date, aucun identifiant, aucun
 * `Date.now()`. Il part avec `cache_control: 'ephemeral'`, et le cache Claude
 * ne sert que sur un préfixe identique à l'octet — toute variation multiplie le
 * coût par document.
 */
export function construirePromptVente(): string {
	return `Tu extrais les informations d'une facture de VENTE émise par une entreprise française.
La disposition varie d'un émetteur à l'autre : colonnes, tableaux, texte libre,
largeurs fixes. N'attends aucun format particulier.

QUI EST QUI — C'EST LE POINT LE PLUS IMPORTANT
- La facture a été ÉMISE par l'entreprise qui te la soumet. Son nom ne t'intéresse pas.
- Ce que tu dois relever est le CLIENT : le destinataire, celui qui doit payer.
  Il apparaît souvent sous « Client », « Facturé à », « Adresse de facturation »,
  « Doit », ou dans un encadré distinct de l'en-tête de l'émetteur.
- En cas de doute entre deux entreprises citées, le client est celui à qui la
  facture est ADRESSÉE, jamais celui dont le logo, le SIRET ou les coordonnées
  bancaires figurent en en-tête ou en pied.

CE QUE TU RELÈVES
- Le nom du client, le numéro de facture, la date d'émission.
- L'IDENTIFIANT DU CLIENT — son SIREN à neuf chiffres ou son SIRET à quatorze —
  s'il est imprimé, souvent dans le bloc « Facturé à » ou juste sous le nom du
  destinataire. Ne le CALCULE jamais et ne le devine jamais : si aucun numéro
  n'est imprimé pour le CLIENT, rends null. Celui de l'émetteur, en en-tête ou
  en pied de page, ne compte pas — c'est le piège le plus fréquent ici.
- La DATE D'ÉCHÉANCE de paiement, si elle est imprimée. Elle peut être écrite en
  toutes lettres (« paiement à trente jours fin de mois », « à réception »).
  Ne la CALCULE jamais : si aucune date explicite n'est imprimée, rends null.
- Le TOTAL TTC, ou le net à payer, tel qu'il est imprimé. Ne le recompose pas à
  partir du montant HT et de la TVA, même si les deux figurent.
- Les lignes de la facture, avec leur libellé et leur montant HT.

RÈGLES D'EXTRACTION DES LIGNES
- Une ligne porte un libellé et un montant HT. Elle peut aussi porter une
  quantité, une unité, un prix unitaire et un taux de TVA.
- LIGNES DE CONTINUATION : une ligne sans montant qui suit une prestation la
  complète. Rattache-la au libellé précédent.
- AVOIRS ET REMISES : un montant négatif reste une ligne, avec son signe.
- N'EXTRAIS PAS : les en-têtes de tableau, les totaux intermédiaires, les
  sous-totaux, les récapitulatifs de TVA, les mentions légales, les conditions
  de règlement, les coordonnées bancaires.
- ERREURS DE RECONNAISSANCE : le texte peut venir d'un OCR (0 pour O, ! pour I
  ou L, 3 pour E). Restitue le libellé tel que tu le lis, sans le corriger.

DISCIPLINE DE SORTIE
- Une information absente du document reste vide plutôt que d'être devinée.
  C'est vrai du client, de l'échéance et du total : une valeur inventée ici
  devient une somme réclamée sans fondement.
- Les montants sont rendus tels qu'imprimés, avec deux décimales au plus.
- Si le document est illisible, n'est pas une facture, ou est une facture
  d'ACHAT reçue d'un fournisseur plutôt qu'une facture émise, mets illisible à
  true et explique pourquoi. N'invente jamais de contenu.`;
}

export type Conversion = { ok: true; facture: FactureImportee } | { ok: false; raison: string };

/** Le montant lu, ou `null` s'il n'est pas un montant en euros exploitable. */
function montantOuNull(valeur: number | null): Montant | null {
	if (valeur === null) return null;
	try {
		return depuisEuros(valeur);
	} catch {
		// Trois décimales, NaN, notation exponentielle : on refuse plutôt que
		// d'arrondir. Arrondir une somme réclamée serait la modifier.
		return null;
	}
}

/**
 * Transforme un document extrait en facture importable, ou dit pourquoi il ne
 * peut pas l'être.
 *
 * NE LÈVE PAS, ET C'EST DÉLIBÉRÉ. Un dépôt porte souvent plusieurs dizaines de
 * fichiers ; un seul illisible ne doit pas faire échouer le lot. L'appelant
 * collecte les refus et les montre, comme le fait déjà l'import comptable avec
 * ses `ignorees`.
 */
export function versFactureImportee(doc: DocumentVente): Conversion {
	if (doc.illisible) {
		return {
			ok: false,
			raison: `Document déclaré illisible : ${doc.raisonIllisible ?? 'raison non précisée'}.`
		};
	}

	const reference = doc.invoiceNumber?.trim() ?? '';
	if (reference === '') {
		return {
			ok: false,
			raison:
				'Aucun numéro de facture lisible. Sans référence, la facture ne peut être ni ' +
				'rapprochée d’un règlement, ni citée dans un acte.'
		};
	}

	const debiteur = doc.clientName?.trim() ?? '';
	if (debiteur === '') {
		return {
			ok: false,
			raison:
				'Aucun client identifiable. Sur une facture de vente, le débiteur est le ' +
				'destinataire — sans lui, il n’y a personne à qui réclamer.'
		};
	}

	const montantTTC = montantOuNull(doc.totalTTC);
	if (montantTTC === null) {
		return {
			ok: false,
			raison:
				'Montant TTC absent ou non exploitable. Un montant à plus de deux décimales est ' +
				'refusé plutôt qu’arrondi : arrondir une somme réclamée reviendrait à la modifier.'
		};
	}

	// LE FORMAT NE SUFFIT PAS : `2026-02-30` le respecte et n'existe pas. Le
	// modèle rend la date qu'il LIT, et un document mal imprimé ou un OCR qui
	// confond 0 et 3 en produisent. Une date impossible traverse la validation
	// Convex — c'est une chaîne — puis fait exploser le calcul de prescription,
	// pour TOUTE l'organisation et pas seulement pour cette facture.
	const dateEmission = doc.invoiceDate?.trim() ?? '';
	if (!estDateReelle(dateEmission)) {
		return {
			ok: false,
			raison: `Date d’émission absente, mal formée, ou inexistante au calendrier : ${JSON.stringify(dateEmission)}.`
		};
	}

	// Une échéance impossible est traitée comme une échéance non imprimée : la
	// facture existe, seul son point de départ manque. La refuser entièrement
	// ferait perdre une créance pour une faute de frappe, et la surveillance
	// annonce déjà en angle mort les factures sans date de prescription.
	const echeance = doc.dueDate?.trim() ?? '';
	const dateEcheance = estDateReelle(echeance) ? echeance : undefined;

	return {
		ok: true,
		facture: {
			reference,
			debiteur,
			montantTTC,
			dateEmission,
			dateEcheance,
			debiteurSiren: sirenLu(doc.clientSiret)
		}
	};
}

/**
 * Le SIREN du client, lu sur la facture — ou rien.
 *
 * ⚠️ ON NE GARDE QUE CE QUI PASSE LA CLÉ DE CONTRÔLE, ET LA FACTURE PASSE QUAND
 * MÊME. Un chiffre mal lu par un OCR — un 8 pour un 3 — donne un numéro bien
 * formé qui désigne une AUTRE entreprise. Interroger un registre public avec lui
 * rapporterait l'état d'un tiers, et un « aucune procédure » sur le mauvais
 * SIREN se lirait comme un feu vert. Mieux vaut aucun identifiant qu'un
 * identifiant qui désigne quelqu'un d'autre.
 *
 * Ce qui manque ici est l'identifiant, jamais la créance : la facture reste
 * parfaitement exploitable sans lui.
 */
function sirenLu(brut: string | null): string | undefined {
	if (brut === null) return undefined;
	const nettoye = brut.trim();
	if (nettoye === '') return undefined;
	return sirenDepuisSiret(nettoye) ?? normaliserSiren(nettoye) ?? undefined;
}

/**
 * Un document extrait devient un RÉSULTAT D'IMPORT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE RACCORD QUI MANQUAIT, ET CE QU'IL COÛTAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `documentVenteSchema`, `construirePromptVente` et `versFactureImportee`
 * existaient, testés, sans un seul appelant en production. L'écran d'import
 * proposait pourtant « Factures en PDF — chaque facture est relue par le
 * modèle », le mode `FACTURE_DEPOSEE` s'enregistrait en base et remontait dans
 * les requêtes — et le traitement décodait le PDF en texte pour le passer au
 * parseur d'export comptable, qui répondait « Export non reconnu ».
 *
 * Neuvième occurrence du défaut « déclaré, lu, jamais alimenté » dans ce dépôt,
 * et la plus visible de toutes : c'est une promesse faite à l'écran que le
 * produit ne pouvait pas tenir.
 *
 * ⚠️ ELLE REND LA MÊME FORME QUE L'EXPORT COMPTABLE, délibérément. Tout ce qui
 * suit — l'enregistrement, le dédoublonnage, le bilan, l'affichage des lignes
 * illisibles — est déjà écrit et déjà testé. Un second chemin d'enregistrement
 * aurait fini par diverger sur le dédoublonnage, c'est-à-dire par créer des
 * doublons de créances contre le même débiteur.
 */
export function resultatDepuisDocument(doc: DocumentVente, nomFichier: string): ResultatImport {
	const conversion = versFactureImportee(doc);

	if (!conversion.ok) {
		// ⚠️ LE FICHIER EST NOMMÉ, PAS PERDU. « 0 facture créée » sans dire quel
		// document ni pourquoi est un échec muet — et l'omission porte exactement
		// sur l'argent qu'on ne réclamera pas.
		return {
			format: 'FACTURE_DEPOSEE',
			factures: [],
			reglements: [],
			ignorees: [{ texte: nomFichier, raison: conversion.raison }],
			horsPerimetre: 0
		};
	}

	return {
		format: 'FACTURE_DEPOSEE',
		factures: [conversion.facture],
		// Une facture déposée ne porte pas les encaissements. En inventer
		// solderait des créances que personne n'a payées.
		reglements: [],
		ignorees: [],
		// La notion vient du FEC, où des lignes de TVA et de trésorerie se mêlent
		// aux ventes. Un document unique n'a rien à écarter.
		horsPerimetre: 0
	};
}
