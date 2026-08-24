import { defineTable } from 'convex/server';
import { v } from 'convex/values';

export const vFamille = v.union(
	v.literal('VIANDE'),
	v.literal('POISSON'),
	v.literal('FRUITS_LEGUMES'),
	v.literal('LAITIERS'),
	v.literal('EPICERIE_SECHE'),
	v.literal('EPICERIE_APPERTISEE'),
	v.literal('BOISSONS'),
	v.literal('AUTRE')
);

export const vLabel = v.union(
	v.literal('AB'),
	v.literal('CONVERSION'),
	v.literal('LABEL_ROUGE'),
	v.literal('AOP_AOC_IGP_STG'),
	v.literal('HVE3'),
	v.literal('FERMIER'),
	v.literal('PECHE_DURABLE'),
	v.literal('COMMERCE_EQUITABLE'),
	v.literal('RUP'),
	v.literal('CYCLE_DE_VIE')
);

export const egalimTables = {
	// Un dépôt de factures : « factures 2025 — Clinique X »
	invoiceBatches: defineTable({
		organizationId: v.id('organizations'),
		label: v.string(),
		periodStart: v.string(), // AAAA-MM-JJ
		periodEnd: v.string(),
		status: v.union(
			v.literal('DRAFT'),
			v.literal('EXTRACTING'),
			v.literal('CLASSIFYING'),
			v.literal('REVIEW'),
			v.literal('READY'),
			v.literal('FAILED')
		),
		uploadedBy: v.string(),
		documentsTotal: v.number(),
		linesTotal: v.number(),
		labelsPendingReview: v.number(),
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		// Toutes organisations confondues : c'est la file de travail de
		// l'opérateur Letikette, qui est transverse par nature. Sans cet index,
		// la lister imposait un scan complet de la table à chaque ouverture.
		.index('by_status', ['status']),

	// Un fichier déposé
	invoiceDocuments: defineTable({
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		storageId: v.id('_storage'),
		filename: v.string(),
		mimeType: v.string(),
		sourceType: v.union(
			v.literal('CSV'),
			v.literal('EXCEL'),
			v.literal('PDF_TEXT'),
			v.literal('PDF_SCAN'),
			v.literal('IMAGE'),
			v.literal('TEXTE')
		),
		extractionStatus: v.union(v.literal('PENDING'), v.literal('DONE'), v.literal('FAILED')),
		extractionError: v.optional(v.string()),
		/**
		 * Où en est la lecture de CE fichier, en clair.
		 *
		 * `PENDING` tout seul produisait un sablier de deux minutes sans rien
		 * derrière : le gérant ne savait pas s'il se passait quelque chose, et
		 * c'est exactement le moment où il ferme l'onglet. L'étape est un texte
		 * destiné à l'écran, pas un état de machine — la machine, c'est
		 * `extractionStatus`, et lui seul commande quoi que ce soit.
		 */
		extractionEtape: v.optional(v.string()),
		/**
		 * L'empreinte SHA-256 du fichier, calculée par le navigateur avant l'envoi.
		 *
		 * Elle ne sert qu'à une chose : refuser le MÊME fichier deux fois. C'est le
		 * cas le plus fréquent — on redépose un dossier entier « pour être sûr » —
		 * et le seul qui se détecte avec une certitude absolue, sans lire le
		 * contenu ni dépenser un appel au modèle.
		 *
		 * Facultative : un navigateur sans contexte sécurisé ne peut pas la
		 * calculer. Son absence ne bloque rien, elle fait seulement retomber la
		 * détection sur le niveau suivant, celui du numéro de facture.
		 */
		contentHash: v.optional(v.string()),
		/**
		 * Le document dont celui-ci est un doublon.
		 *
		 * POURQUOI C'EST LE DÉFAUT LE PLUS GRAVE DU PRODUIT quand il n'est pas
		 * traité : une facture comptée deux fois gonfle le dénominateur des trois
		 * taux. Le chiffre reste crédible — il ne devient ni négatif, ni aberrant,
		 * ni supérieur à 100 % — il devient simplement FAUX, et personne ne peut
		 * s'en apercevoir en le regardant.
		 *
		 * Un doublon garde sa ligne dans le facturier, avec sa marque : le faire
		 * disparaître donnerait un facturier propre et un taux faux, ce qui est
		 * exactement l'échange que ce produit ne doit jamais faire. En revanche il
		 * n'a AUCUNE ligne de facture — c'est ce qui garantit qu'aucun calcul, ni
		 * aujourd'hui ni demain, n'aura à penser à l'exclure.
		 */
		doublonDe: v.optional(v.id('invoiceDocuments')),
		/**
		 * Le gérant a dit que ce n'était PAS un doublon.
		 *
		 * La détection se trompe dans un sens connu : deux factures du même
		 * fournisseur, le même jour, pour le même montant, sans numéro lisible.
		 * C'est rare et c'est réel. Sans ce drapeau, rétablir la facture la ferait
		 * re-détecter à la relecture, et le gérant tournerait en rond.
		 *
		 * Il n'y a pas de symétrique — « ceci EST un doublon » se règle en
		 * supprimant le fichier, ce qui est plus clair et plus définitif.
		 */
		doublonIgnore: v.optional(v.boolean()),
		supplierId: v.optional(v.id('suppliers')),
		invoiceDate: v.optional(v.string()),
		invoiceNumber: v.optional(v.string()),
		totalHT: v.optional(v.number()),
		// Bases de TVA imprimées en pied de facture, servant à vérifier l'extraction
		basesParTaux: v.optional(v.array(v.object({ taux: v.number(), baseHT: v.number() }))),
		linesCount: v.number()
	})
		.index('by_batch', ['batchId'])
		.index('by_org', ['organizationId'])
		.index('by_batch_and_status', ['batchId', 'extractionStatus'])
		// Les trois index de la détection de doublon. Sans eux, chaque extraction
		// relirait tous les documents de l'organisation : sur un dépôt de deux
		// cents factures, deux cents fois deux cents lectures.
		.index('by_org_and_hash', ['organizationId', 'contentHash'])
		.index('by_org_and_facture', ['organizationId', 'supplierId', 'invoiceNumber'])
		.index('by_org_and_date_facture', ['organizationId', 'invoiceDate']),

	// LA table centrale — ~3 000 lignes par cantine et par an
	invoiceLines: defineTable({
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		documentId: v.id('invoiceDocuments'),
		// La source, jamais modifiée
		rawLabel: v.string(),
		normalizedLabel: v.string(),
		quantity: v.optional(v.number()),
		unit: v.optional(v.string()),
		unitPrice: v.optional(v.number()),
		amountHT: v.number(),
		vatRate: v.optional(v.number()),
		invoiceDate: v.string(),
		supplierId: v.optional(v.id('suppliers')),
		// Le verdict — renseigné à la classification
		isFood: v.optional(v.boolean()),
		family: v.optional(vFamille),
		qualifyingLabels: v.optional(v.array(vLabel)),
		isBio: v.optional(v.boolean()),
		isDurable: v.optional(v.boolean()),
		justification: v.optional(v.string()),
		confidence: v.optional(v.number()),
		reviewStatus: v.union(
			v.literal('AUTO'),
			v.literal('PENDING_REVIEW'),
			v.literal('CONFIRMED'),
			v.literal('CORRECTED')
		),
		proofStatus: v.optional(
			v.union(v.literal('PROVEN'), v.literal('TO_JUSTIFY'), v.literal('NONE'))
		),
		classifierVersion: v.optional(v.string())
	})
		.index('by_batch', ['batchId'])
		.index('by_document', ['documentId'])
		.index('by_org_and_date', ['organizationId', 'invoiceDate'])
		.index('by_batch_and_review', ['batchId', 'reviewStatus'])
		// Borné au lot, jamais global : appliquer une classification ne doit
		// jamais faire LIRE les lignes d'une autre organisation. C'est aussi la
		// bonne sémantique métier — un diagnostic livré est figé, un lot
		// antérieur ne se reclasse pas.
		.index('by_batch_and_label', ['batchId', 'normalizedLabel'])
		// « Cette organisation a-t-elle déjà confirmé ce libellé ? » se répond ici,
		// côté client, sans que le cache global n'apprenne jamais qui confirme.
		.index('by_org_and_label', ['organizationId', 'normalizedLabel'])
		// La file de confirmation est transverse aux dépôts : elle interroge
		// l'organisation, pas le lot. Sans cet index, il fallait lire TOUTES les
		// lignes de l'organisation pour n'en garder que celles en attente — à
		// ~3 000 lignes par an, le plafond des 16 000 lectures tombait vers la
		// cinquième année de factures cumulées, et l'écran se serait mis à
		// échouer sur une erreur technique illisible pour le gérant.
		.index('by_org_and_review', ['organizationId', 'reviewStatus']),

	// Cache global de classification par libellé distinct.
	// SANS organizationId ET SANS utilisateur, délibérément : ne contient QUE la
	// chaîne de libellé et sa classification. Jamais de montant, de quantité, de
	// fournisseur, ni aucune identité. Ce qui est mutualisé est du référentiel
	// produit, pas de la donnée client.
	productLabels: defineTable({
		normalizedLabel: v.string(),
		isFood: v.boolean(),
		family: vFamille,
		qualifyingLabels: v.array(vLabel),
		justification: v.string(),
		confidence: v.number(),
		source: v.union(v.literal('AUTO'), v.literal('HUMAN')),
		/**
		 * Combien d'organisations DISTINCTES ont confirmé ce libellé. Compteur nu :
		 * la table n'apprend jamais lesquelles. La file ne demandant un libellé
		 * qu'une fois par organisation, l'entier vaut bien un compte de clients
		 * distincts.
		 */
		confirmationsCount: v.number(),
		/**
		 * Une correction a contredit le verdict établi. Le libellé redevient une
		 * question posée à tous, au lieu d'être écrasé silencieusement.
		 */
		contested: v.boolean(),
		/** Le verdict concurrent, tel quel. Ne révèle l'identité de personne. */
		verdictConcurrent: v.optional(
			v.object({
				isFood: v.boolean(),
				family: vFamille,
				qualifyingLabels: v.array(vLabel)
			})
		),
		confirmedAt: v.optional(v.number()),
		classifierVersion: v.string(),
		occurrences: v.number()
	})
		.index('by_normalized_label', ['normalizedLabel'])
		.index('by_source', ['source']),

	suppliers: defineTable({
		organizationId: v.id('organizations'),
		name: v.string(),
		rawNames: v.array(v.string()),
		siret: v.optional(v.string()),
		type: v.union(v.literal('GROSSISTE'), v.literal('PRODUCTEUR'), v.literal('AUTRE')),
		attestationStatus: v.union(
			v.literal('NONE'),
			v.literal('REQUESTED'),
			v.literal('RECEIVED'),
			v.literal('REFUSED')
		)
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_name', ['organizationId', 'name']),

	// Le rapport FIGÉ. Les ratios sont stockés calculés, jamais recalculés.
	diagnostics: defineTable({
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		periodStart: v.string(),
		periodEnd: v.string(),
		computedAt: v.number(),
		classifierVersion: v.string(),
		ratios: v.object({
			durable: v.number(),
			bio: v.number(),
			meatFishDurable: v.number(),
			totalFoodHT: v.number(),
			totalHT: v.number()
		}),
		byFamily: v.array(
			v.object({
				family: vFamille,
				totalHT: v.number(),
				durableHT: v.number(),
				bioHT: v.number()
			})
		),
		bySupplier: v.array(
			v.object({
				supplierName: v.string(),
				totalHT: v.number(),
				durableHT: v.number(),
				bioHT: v.number()
			})
		),
		gapEuros: v.object({
			toDurable50: v.number(),
			toBio20: v.number(),
			toMeatFish60: v.number()
		}),
		status: v.union(v.literal('DRAFT'), v.literal('DELIVERED')),
		deliveredAt: v.optional(v.number()),
		tier: v.optional(v.union(v.literal('S'), v.literal('M'), v.literal('L')))
	})
		.index('by_org', ['organizationId'])
		.index('by_batch', ['batchId']),

	/**
	 * La signature d'un bilan par le gérant.
	 *
	 * CE QU'ELLE EST, ET CE QU'ELLE N'EST PAS. Une signature électronique SIMPLE
	 * au sens d'eIDAS, adossée à une piste d'audit. Elle n'est pas qualifiée :
	 * une signature qualifiée suppose un prestataire de services de confiance
	 * agréé qui vérifie l'identité du signataire, ce qu'aucune brique libre ne
	 * peut remplacer — la contrainte est juridique, pas technique.
	 *
	 * SA FORCE PROBANTE VIENT DE CE QU'ON ENREGISTRE. Le compte authentifié qui
	 * a signé, l'heure du SERVEUR, l'empreinte de la mesure, et le texte exact
	 * accepté avec sa version. Ces quatre éléments réunis rendent la signature
	 * défendable ; il en manque un et elle redevient une case cochée.
	 *
	 * UNE SIGNATURE NE SE MODIFIE JAMAIS. Elle s'ajoute, et elle se révoque en
	 * ajoutant une révocation — jamais en réécrivant la ligne. Un journal qui se
	 * réécrit ne prouve rien, y compris quand il dit vrai.
	 */
	bilanSignatures: defineTable({
		organizationId: v.id('organizations'),
		diagnosticId: v.id('diagnostics'),
		/** Le compte authentifié qui a signé. L'identité vient de lui, jamais du formulaire. */
		userId: v.string(),
		email: v.string(),
		/** Le nom et la fonction tels que le signataire les a écrits, pour la page de preuve. */
		nomSignataire: v.string(),
		fonction: v.string(),
		/** L'heure du SERVEUR. Une heure fournie par le client ne prouve rien. */
		signeLe: v.number(),
		/** SHA-256 de la forme canonique de la mesure. Voir `egalim/empreinte.ts`. */
		empreinte: v.string(),
		/** Le texte accepté, et sa version. On n'affiche jamais autre chose. */
		mention: v.string(),
		mentionVersion: v.string(),
		/**
		 * Le tracé manuscrit, en PNG. Facultatif : il ne prouve rien à lui seul —
		 * un dessin se recopie — mais c'est ce que le lecteur d'un PDF reconnaît
		 * comme une signature, et c'est ce qui fait qu'il lit le reste.
		 */
		trace: v.optional(v.string()),
		/**
		 * Une signature retirée reste en base, marquée. La supprimer effacerait la
		 * trace qu'elle a existé, ce qui est précisément ce qu'un journal ne doit
		 * pas permettre.
		 */
		revoqueeLe: v.optional(v.number()),
		motifRevocation: v.optional(v.string())
	})
		.index('by_diagnostic', ['diagnosticId'])
		.index('by_org', ['organizationId']),

	// Les courriers de demande de justificatif — le point du livrable qui
	// rembourse souvent la prestation à lui seul
	attestationRequests: defineTable({
		organizationId: v.id('organizations'),
		supplierId: v.id('suppliers'),
		diagnosticId: v.id('diagnostics'),
		// PAS de tableau d'identifiants de lignes : un fournisseur dont tout est
		// à justifier sur trois ans dépasserait les 8 192 entrées autorisées dans
		// un tableau Convex, et l'insertion ferait échouer la production du
		// diagnostic entier. Les lignes se retrouvent par (batchId, supplierId,
		// proofStatus) — le tableau n'était que de la dénormalisation.
		lineCount: v.number(),
		amountAtStake: v.number(),
		status: v.union(
			v.literal('DRAFT'),
			v.literal('SENT'),
			v.literal('RECEIVED'),
			v.literal('REFUSED')
		),
		sentAt: v.optional(v.number())
	})
		.index('by_org', ['organizationId'])
		.index('by_diagnostic', ['diagnosticId']),

	// Suivi et contrôle de coût de l'extraction ET de la classification
	classificationJobs: defineTable({
		organizationId: v.id('organizations'),
		batchId: v.id('invoiceBatches'),
		status: v.union(
			v.literal('RUNNING'),
			v.literal('DONE'),
			v.literal('FAILED'),
			v.literal('CAPPED')
		),
		labelsTotal: v.number(),
		labelsDone: v.number(),
		labelsFailed: v.number(),
		tokensIn: v.number(),
		tokensOut: v.number(),
		cacheReadTokens: v.number(),
		costEur: v.number(),
		startedAt: v.number(),
		finishedAt: v.optional(v.number()),
		error: v.optional(v.string()),
		/**
		 * Les douze dernières décisions du classificateur, dans l'ordre où elles
		 * sont tombées. C'est ce qui fait qu'on VOIT l'IA travailler au lieu de
		 * regarder une barre avancer.
		 *
		 * Douze, pas plus : la liste ne sert qu'à défiler à l'écran pendant le
		 * traitement, et un document Convex a une taille bornée. La trace
		 * durable et opposable de chaque classification vit sur `invoiceLines`,
		 * avec sa justification et sa version de classificateur — celle-ci est
		 * un affichage, et on peut la perdre sans rien perdre.
		 */
		recents: v.optional(
			v.array(
				v.object({
					label: v.string(),
					family: vFamille,
					qualifyingLabels: v.array(vLabel),
					isFood: v.boolean(),
					/**
					 * `CACHE` : le libellé était déjà tranché, on n'a rien payé et
					 * rien redemandé. `IA` : il a fallu l'analyser. La distinction
					 * n'a aucun effet technique — elle est là parce qu'elle rend
					 * visible, pendant le traitement, la promesse centrale du
					 * produit : la charge décroît à mesure que le parc grandit.
					 */
					source: v.union(v.literal('CACHE'), v.literal('IA'))
				})
			)
		)
	}).index('by_batch', ['batchId'])
};
