import { defineTable } from 'convex/server';
import { v } from 'convex/values';

/**
 * Le modèle de domaine du recouvrement (phase 2 du brief de remodelage).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LES MONTANTS SONT DES `int64`, JAMAIS DES `number`
 * ─────────────────────────────────────────────────────────────────────────
 *
 * C'est LA décision de ce fichier, et elle est irréversible sans migration.
 * `v.int64()` porte un `bigint` de centimes, exactement la représentation de
 * `socle/montants.ts` : un montant traverse le calcul, la base et l'écran sans
 * jamais passer par un flottant.
 *
 * Les tables EGalim, elles, gardent `v.number()` en euros. Ce n'est pas une
 * incohérence : EGalim produit un RATIO, où l'erreur de représentation est très
 * inférieure au bruit de classification, et changer sa représentation
 * maintenant serait une régression déguisée en amélioration. Le recouvrement
 * produit un décompte destiné à un titre exécutoire, qui ne pardonne pas le
 * centime.
 *
 * La borne d'`int64` est ±2^63 centimes, soit ±92 millions de milliards
 * d'euros. Elle ne sera pas atteinte.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TROIS LEÇONS REPRISES D'EGALIM, POUR NE PAS LES RÉAPPRENDRE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * 1. **Aucun tableau d'identifiants.** `attestationRequests` a dû en retirer un
 *    parce qu'un tableau Convex plafonne à 8 192 entrées et que l'insertion
 *    faisait échouer la production du diagnostic entier. Ici, le lien
 *    facture → créance vit sur la FACTURE (une facture n'appartient qu'à une
 *    créance à la fois), et les pièces passent par une table de liaison.
 *
 * 2. **Multi-tenant strict.** `organizationId` sur chaque table, avec son
 *    index. Aucune exception : contrairement à `productLabels` d'EGalim, rien
 *    ici n'est mutualisable — un débiteur, un montant et une échéance sont des
 *    données client, toujours.
 *
 * 3. **Ce qui est produit est figé.** Un décompte servi à un acte ne se
 *    recalcule jamais : il s'archive, daté, et une nouvelle mesure produit un
 *    nouveau décompte. Même règle que les `diagnostics`.
 */

/** Un critère de qualification : établi, expressément absent, ou indéterminé. */
export const vEtatCritere = v.union(v.literal('ok'), v.literal('ko'), v.literal('unknown'));

export const vTypePiece = v.union(
	v.literal('FACTURE'),
	v.literal('BON_DE_COMMANDE'),
	v.literal('DEVIS_SIGNE'),
	v.literal('BON_DE_LIVRAISON'),
	v.literal('CGV'),
	v.literal('CONTRAT'),
	v.literal('ECHANGES'),
	v.literal('MISE_EN_DEMEURE')
);

export const vNatureReglement = v.union(
	v.literal('PAIEMENT'),
	v.literal('ACOMPTE'),
	v.literal('AVOIR')
);

export const vConventionJours = v.union(v.literal('ACT_365'), v.literal('ACT_ACT'));

/**
 * Un taux annuel, porté comme une fraction exacte.
 *
 * PAS UN `v.number()`. Un taux de 12,45 % écrit en flottant introduit une
 * erreur dès le stockage, avant même le premier calcul — et le décompte doit
 * rendre le même centime six mois plus tard.
 */
export const vTaux = v.object({
	numerateur: v.int64(),
	denominateur: v.int64()
});

export const recouvrementTables = {
	/**
	 * Le créancier : l'organisation, sous l'angle du recouvrement.
	 *
	 * Table séparée d'`organizations` DÉLIBÉRÉMENT. `organizations` porte le
	 * profil cantine d'EGalim (type d'établissement, couverts par jour, gestion
	 * directe) ; y empiler les champs du recouvrement mélangerait deux
	 * verticales dans une table que les deux liraient. Une organisation qui ne
	 * fait pas de recouvrement n'a simplement pas de ligne ici.
	 */
	profilsCreancier: defineTable({
		organizationId: v.id('organizations'),
		siren: v.optional(v.string()),
		denomination: v.string(),
		formeJuridique: v.optional(v.string()),
		/**
		 * La qualité de commerçant conditionne l'éligibilité à certaines
		 * procédures. `unknown` tant que personne ne l'a confirmée : la présumer
		 * favorablement ouvrirait une procédure qui se ferait rejeter.
		 */
		estCommercant: vEtatCritere,
		adresse: v.optional(v.string()),
		majLe: v.number()
	}).index('by_org', ['organizationId']),

	debiteurs: defineTable({
		organizationId: v.id('organizations'),
		/**
		 * Le nom LISIBLE, tel qu'il s'affiche. La première graphie rencontrée.
		 *
		 * Distinct de la forme normalisée, et c'est le test qui l'a imposé : la
		 * forme de rapprochement est en capitales sans accents, ce qui est bon
		 * pour comparer et laid pour lire. Un écran qui crie « FOURNITURES
		 * DURAND » a l'air d'un export brut, pas d'un produit.
		 */
		denomination: v.string(),
		/**
		 * La forme de rapprochement, produite par `normaliserFournisseur`. C'est
		 * ELLE qui est indexée : « Fournitures Durand », « FOURNITURES DURAND
		 * SARL » et « Fournitures Durand S.A.R.L. » sont la même maison, et les
		 * traiter comme trois débiteurs éclaterait la créance en trois dossiers
		 * dont aucun n'atteindrait le seuil.
		 */
		denominationNormalisee: v.string(),
		/** Toutes les graphies rencontrées, pour expliquer un rapprochement. */
		denominationsBrutes: v.array(v.string()),
		siren: v.optional(v.string()),
		formeJuridique: v.optional(v.string()),
		estCommercant: vEtatCritere,
		/**
		 * L'état connu, et sa date. `INCONNUE` par défaut : ne rien savoir n'est
		 * pas la même chose que savoir que tout va bien, et c'est la confusion
		 * qui ferait engager des frais sur un débiteur déjà radié.
		 */
		santeFinanciere: v.union(
			v.literal('INCONNUE'),
			v.literal('SAINE'),
			v.literal('PROCEDURE_COLLECTIVE'),
			v.literal('RADIEE')
		),
		santeConstateeLe: v.optional(v.number()),
		adresse: v.optional(v.string()),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_siren', ['organizationId', 'siren'])
		.index('by_org_and_denomination', ['organizationId', 'denominationNormalisee']),

	/**
	 * Une facture de VENTE — l'inverse d'`invoiceLines` côté EGalim, qui parle
	 * d'achats. Les deux ne se mélangent pas et ne partagent aucune table.
	 */
	facturesVente: defineTable({
		organizationId: v.id('organizations'),
		debiteurId: v.id('debiteurs'),
		reference: v.string(),
		montantHT: v.int64(),
		montantTTC: v.int64(),
		dateEmission: v.string(), // AAAA-MM-JJ
		/**
		 * FACULTATIVE, parce que toutes les sources n'en portent pas. Un FEC,
		 * notamment, n'a pas de colonne d'échéance : elle vit dans les conditions
		 * de règlement, hors du fichier. La rendre obligatoire aurait force a en
		 * inventer une a l'import.
		 */
		dateEcheance: v.optional(v.string()),
		/**
		 * LE POINT DE DÉPART DES INTÉRÊTS, ET IL N'EST PAS TOUJOURS L'ÉCHÉANCE.
		 *
		 * Le brief le dit explicitement : « la date d'exigibilité n'est pas la
		 * date d'échéance dans tous les cas. Elle dépend des conditions
		 * contractuelles. » Les confondre décalerait chaque décompte de
		 * plusieurs jours d'intérêts, dans un sens ou dans l'autre, sans que
		 * rien ne le signale.
		 */
		dateExigibilite: v.optional(v.string()),
		/**
		 * L'exigibilité a été DÉDUITE de l'échéance, faute de mieux.
		 *
		 * Elle n'est pas toujours l'échéance — elle dépend des conditions
		 * contractuelles. Le logiciel décide, le gérant confirme : on déduit pour
		 * ne pas laisser un champ vide qu'on aurait pu remplir, et on marque la
		 * déduction pour que le gérant sache exactement ce qu'il confirme. Sans
		 * ce drapeau, une date deduite et une date verifiee se ressembleraient.
		 */
		exigibiliteDeduite: v.optional(v.boolean()),
		conditionsPaiement: v.optional(v.string()),
		/**
		 * Le taux stipulé aux conditions contractuelles. Absent, le décompte
		 * doit retomber sur le taux légal — qui n'est pas encore renseigné, et
		 * fera donc échouer le calcul, bruyamment.
		 */
		tauxContractuel: v.optional(vTaux),
		statutPaiement: v.union(
			v.literal('IMPAYEE'),
			v.literal('PARTIELLEMENT_PAYEE'),
			v.literal('SOLDEE'),
			v.literal('LITIGIEUSE')
		),
		/**
		 * La créance qui la porte, le cas échéant. Le lien vit ICI et non dans
		 * un tableau côté créance : une facture n'appartient qu'à une créance à
		 * la fois, et un tableau d'identifiants finit par heurter le plafond de
		 * 8 192 entrées — la leçon d'`attestationRequests`.
		 */
		creanceId: v.optional(v.id('creances')),
		/** Le document source, pour que chaque montant remonte à sa pièce. */
		documentId: v.optional(v.id('_storage')),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_debiteur', ['debiteurId'])
		.index('by_creance', ['creanceId'])
		.index('by_org_and_reference', ['organizationId', 'reference'])
		// La surveillance interroge « qu'est-ce qui arrive à échéance ? » sans
		// connaître le débiteur : sans cet index, elle lirait toutes les
		// factures de l'organisation à chaque passage.
		.index('by_org_and_echeance', ['organizationId', 'dateEcheance'])
		.index('by_org_and_statut', ['organizationId', 'statutPaiement']),

	/**
	 * Ce qui éteint tout ou partie d'une facture, à une date.
	 *
	 * TABLE À PART, ET C'EST STRUCTUREL. Le brief exige que le paiement partiel
	 * soit porté « nativement, pas en cas particulier ». Un champ `montantPaye`
	 * sur la facture ne porterait pas la DATE, et sans la date on ne sait pas à
	 * partir de quand la base d'intérêts diminue — ce qui fausse le décompte
	 * sans jamais le rendre absurde.
	 */
	reglements: defineTable({
		organizationId: v.id('organizations'),
		factureId: v.id('facturesVente'),
		date: v.string(), // AAAA-MM-JJ
		/** Positif : ce qui vient en déduction du principal. */
		montant: v.int64(),
		nature: vNatureReglement,
		pieceId: v.optional(v.id('pieces')),
		creeLe: v.number()
	})
		.index('by_facture', ['factureId'])
		.index('by_org', ['organizationId'])
		.index('by_org_and_date', ['organizationId', 'date']),

	pieces: defineTable({
		organizationId: v.id('organizations'),
		type: vTypePiece,
		storageId: v.id('_storage'),
		filename: v.string(),
		/**
		 * Une pièce de portée DÉBITEUR — des CGV, un contrat-cadre — soutient
		 * toutes ses factures sans qu'il faille créer une liaison par facture.
		 * C'est ce qui évite de générer des milliers de lignes pour un seul PDF.
		 */
		debiteurId: v.optional(v.id('debiteurs')),
		note: v.optional(v.string()),
		ajouteeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_debiteur', ['debiteurId'])
		.index('by_org_and_type', ['organizationId', 'type']),

	/** La liaison n-n entre une pièce et les factures précises qu'elle soutient. */
	piecesFactures: defineTable({
		organizationId: v.id('organizations'),
		pieceId: v.id('pieces'),
		factureId: v.id('facturesVente')
	})
		.index('by_piece', ['pieceId'])
		.index('by_facture', ['factureId'])
		.index('by_org', ['organizationId']),

	/**
	 * L'agrégat qui part en procédure : plusieurs factures d'un MÊME débiteur.
	 *
	 * Elle porte la qualification et le score, jamais le décompte : celui-ci est
	 * daté et figé dans sa propre table.
	 */
	creances: defineTable({
		organizationId: v.id('organizations'),
		debiteurId: v.id('debiteurs'),
		statut: v.union(
			v.literal('BROUILLON'),
			v.literal('QUALIFIEE'),
			v.literal('ENGAGEE'),
			v.literal('CLOSE')
		),
		/** Les quatre conditions légales, chacune dans son état à trois valeurs. */
		certaine: vEtatCritere,
		liquide: vEtatCritere,
		exigible: vEtatCritere,
		entreCommercants: vEtatCritere,
		/** 0 à 1. Une créance sous le seuil ne part pas en procédure. */
		score: v.optional(v.number()),
		qualifieeLe: v.optional(v.number()),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_debiteur', ['debiteurId'])
		.index('by_org_and_statut', ['organizationId', 'statut']),

	/**
	 * Un décompte FIGÉ. Il ne se recalcule jamais.
	 *
	 * Même règle que les `diagnostics` d'EGalim, et pour une raison plus forte
	 * encore : un décompte a servi à chiffrer un acte, et l'acte ne change plus.
	 * Rejouer le calcul six mois plus tard donnerait le même résultat — c'est
	 * garanti par construction — mais ce n'est pas une raison de ne pas
	 * l'archiver : ce qui compte est de prouver ce qui a été réclamé, à la date
	 * où on l'a réclamé.
	 */
	decomptes: defineTable({
		organizationId: v.id('organizations'),
		creanceId: v.id('creances'),
		arreteAu: v.string(),
		convention: vConventionJours,
		principalRestantDu: v.int64(),
		interets: v.int64(),
		indemniteForfaitaire: v.int64(),
		total: v.int64(),
		/**
		 * Le détail par facture, avec ses périodes d'intérêts.
		 *
		 * IMBRIQUÉ PLUTÔT QUE DANS UNE TABLE À PART, parce qu'il est figé en même
		 * temps que son décompte et n'est jamais interrogé seul. Le volume reste
		 * borné : une créance porte quelques dizaines de factures, chacune
		 * quelques segments — très loin du plafond de 8 192 entrées et du
		 * mégaoctet par document.
		 */
		lignes: v.array(
			v.object({
				reference: v.string(),
				principalRestantDu: v.int64(),
				interets: v.int64(),
				indemniteForfaitaire: v.int64(),
				total: v.int64(),
				segments: v.array(
					v.object({
						debut: v.string(),
						fin: v.string(),
						jours: v.number(),
						principal: v.int64(),
						taux: vTaux,
						baseAnnuelle: v.number(),
						interets: v.int64()
					})
				)
			})
		),
		produitLe: v.number()
	})
		.index('by_creance', ['creanceId'])
		.index('by_org', ['organizationId']),

	/** Une créance, plus une procédure choisie, plus son avancement. */
	dossiers: defineTable({
		organizationId: v.id('organizations'),
		creanceId: v.id('creances'),
		decompteId: v.optional(v.id('decomptes')),
		/** La clé du module de procédure. Voir `verticales/recouvrement/procedures.ts`. */
		procedureCle: v.string(),
		etat: v.union(
			v.literal('PREPARATION'),
			v.literal('ENGAGEE'),
			v.literal('SIGNIFIEE'),
			v.literal('CONTESTEE'),
			v.literal('ABOUTIE'),
			v.literal('CADUQUE'),
			v.literal('ABANDONNEE')
		),
		engageeLe: v.optional(v.string()), // AAAA-MM-JJ
		/**
		 * Les échéances calculées à l'engagement, figées.
		 *
		 * Recalculées à chaque lecture, elles suivraient une évolution du
		 * paramètre légal et changeraient rétroactivement la date de caducité
		 * d'un dossier déjà engagé. Une échéance est une promesse faite à une
		 * date : elle se conserve.
		 */
		echeances: v.array(
			v.object({
				cle: v.string(),
				libelle: v.string(),
				dateLimite: v.string(),
				gravite: v.union(v.literal('CADUCITE'), v.literal('INFORMATIVE')),
				consequence: v.string(),
				traiteeLe: v.optional(v.number())
			})
		),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_creance', ['creanceId'])
		.index('by_org_and_etat', ['organizationId', 'etat'])
};
