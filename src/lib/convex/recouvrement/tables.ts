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

/**
 * Un fait recueilli par le questionnaire de qualification de litige.
 *
 * ⚠️ LES CLÉS SONT UNE UNION FERMÉE, PAS UNE CHAÎNE. Un fait mal orthographié
 * une seule fois entrerait en base et ne serait jamais relu — donc jamais
 * compté dans le critère `certaine`, qui décide si une procédure s'ouvre.
 * Ajouter un fait plus tard est additif et sans danger ; en retirer un casserait
 * le déploiement, ce qui est exactement la protection recherchée.
 */
export const vCleFaitLitige = v.union(
	v.literal('CONTESTATION_ECRITE'),
	v.literal('REFUS_RECEPTION'),
	v.literal('AVOIR_RECLAME'),
	v.literal('PENALITES_OPPOSEES'),
	v.literal('INSTANCE_EN_COURS'),
	v.literal('RECONNAISSANCE_ECRITE')
);

/** « Je ne sais pas » est une réponse, distincte d'une question non posée. */
export const vReponseFait = v.union(v.literal('OUI'), v.literal('NON'), v.literal('INCONNU'));

/**
 * Le secteur de la relation commerciale, dont dépend le DÉLAI DE PRESCRIPTION.
 *
 * Déclaré ici plutôt qu'en ligne dans la table : la mutation de saisie doit
 * valider exactement le même jeu de valeurs, et deux listes finiraient par
 * diverger — l'une accepterait un secteur que l'autre refuse.
 */
export const vSecteurCreance = v.union(
	v.literal('GENERAL'),
	v.literal('TRANSPORT_MARCHANDISES'),
	v.literal('CONSOMMATEUR'),
	v.literal('NOURRITURE_MARINS'),
	v.literal('FOURNITURE_NAVIRE'),
	v.literal('OUVRAGE_ACCEPTE'),
	v.literal('INDETERMINE')
);

/**
 * La nature d'une pièce justificative.
 *
 * ⚠️ `INDETERMINE` EST UN ÉTAT LÉGITIME, pas un défaut de saisie. Une pièce
 * déposée dont la lecture n'a rien pu conclure existe, se voit, et ne compte
 * dans AUCUN critère de solidité — `fournie()` ne la reconnaît nulle part.
 * C'est exactement ce qu'on veut : classer au hasard ferait franchir le seuil
 * de qualification sur un document que personne n'a lu.
 */
export const vTypePiece = v.union(
	v.literal('INDETERMINE'),
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

/**
 * D'OÙ SORT UN CONSTAT : une pièce du client, un décompte du dossier, ou une
 * entrée du référentiel.
 *
 * ⚠️ AUCUNE FORME LIBRE, ET C'EST UNE RÈGLE, PAS UNE COMMODITÉ. Une phrase
 * sans pastille ne peut porter ni un MONTANT ni un ÉNONCÉ JURIDIQUE, et aucune
 * référence légale ne se dit de mémoire. Une source libre en texte aurait
 * rouvert exactement ce chemin : une affirmation sourcée par une phrase que
 * rien ne résout, donc que rien ne corrige le jour où la valeur change.
 *
 * ⚠️ LA TROISIÈME FORME EST ARRIVÉE AVEC LA CONVERSATION (T14), ET ELLE NE
 * ROUVRE PAS CE CHEMIN. La première écriture n'en comptait que deux, et la
 * conséquence était muette : B4 exige qu'un montant soit relié à un décompte OU
 * à une pièce, et `compagnon/filtres.ts` porte bien les trois genres de
 * pastille — mais ce validateur n'en savait stocker que deux. Une phrase
 * chiffrée par un décompte s'affichait sourcée et se persistait sans sa source.
 * Un `decompteId` est exactement aussi résoluble qu'un `pieceId` : il désigne
 * une pièce figée et datée du dossier, pas une phrase.
 *
 * `page` est FACULTATIF, et c'est un angle mort DÉCLARÉ : une lecture qui n'a
 * pas su dire à quelle page elle a trouvé sa valeur le dit, plutôt que d'en
 * inventer une.
 */
export const vSourceConstat = v.union(
	v.object({
		nature: v.literal('PIECE'),
		pieceId: v.id('pieces'),
		/** La page où la valeur a été lue, quand la lecture a su le dire. */
		page: v.optional(v.number())
	}),
	v.object({
		nature: v.literal('DECOMPTE'),
		/** Le décompte figé et daté dont le chiffre sort. */
		decompteId: v.id('decomptes')
	}),
	v.object({
		nature: v.literal('REFERENTIEL'),
		/** La clé de l'entrée de `parametres.ts` qui porte la valeur. */
		cleParametre: v.string()
	})
);

export const recouvrementTables = {
	/**
	 * Un fichier déposé, et où en est sa lecture.
	 *
	 * ELLE EXISTE POUR QUE LE TRAITEMENT SE VOIE. La règle d'écran n° 2 du projet
	 * est explicite : « tout traitement se voit sans qu'on le demande ». Sans
	 * cette table, un import de deux cents factures serait un sablier muet — et
	 * c'est exactement le moment où quelqu'un ferme l'onglet.
	 *
	 * `bilan` porte le compte-rendu, y compris ce qui n'a PAS pu être lu. Un
	 * import qui affiche « 198 factures créées » sans dire que deux lignes ont
	 * été écartées ment par omission.
	 */
	importsRecouvrement: defineTable({
		organizationId: v.id('organizations'),
		storageId: v.id('_storage'),
		filename: v.string(),
		mimeType: v.string(),
		/**
		 * Le chemin d'entrée. `EXPORT_COMPTABLE` est déterministe et gratuit ;
		 * `FACTURE_DEPOSEE` passe par le modèle et coûte un appel.
		 */
		mode: v.union(v.literal('EXPORT_COMPTABLE'), v.literal('FACTURE_DEPOSEE')),
		statut: v.union(
			v.literal('EN_ATTENTE'),
			v.literal('LECTURE'),
			v.literal('TERMINE'),
			v.literal('ECHOUE')
		),
		/** Un texte destiné à l'écran, pas un état de machine. La machine, c'est `statut`. */
		etape: v.optional(v.string()),
		erreur: v.optional(v.string()),
		bilan: v.optional(
			v.object({
				format: v.string(),
				debiteursCrees: v.number(),
				facturesCreees: v.number(),
				facturesDejaConnues: v.number(),
				reglementsCrees: v.number(),
				reglementsOrphelins: v.number(),
				horsPerimetre: v.number(),
				/**
				 * Les lignes qu'on n'a pas su lire, avec leur raison. Bornées à
				 * cinquante : au-delà, le fichier est à revoir dans son ensemble, et
				 * un document Convex a une taille limitée.
				 */
				ignorees: v.array(v.object({ texte: v.string(), raison: v.string() })),
				ignoreesTotal: v.number()
			})
		),
		deposeLe: v.number(),
		termineLe: v.optional(v.number())
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_statut', ['organizationId', 'statut']),

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
		/**
		 * L'état CONNU AVANT le dernier relevé.
		 *
		 * Sans lui, une dégradation ne se constate pas : `DEBITEUR_DEGRADE` compare
		 * DEUX états, et le produit n'en historisait qu'un. C'est ce qui rendait
		 * `debiteursSurveilles` toujours vide dans l'assemblage de la surveillance
		 * — un type d'événement déclaré, testé, et que rien ne pouvait déclencher.
		 */
		santePrecedente: v.optional(
			v.union(
				v.literal('INCONNUE'),
				v.literal('SAINE'),
				v.literal('PROCEDURE_COLLECTIVE'),
				v.literal('RADIEE')
			)
		),
		/** Le dernier constat du registre public, cité VERBATIM. */
		constatRegistre: v.optional(
			v.object({
				identifiantAnnonce: v.string(),
				dateParution: v.string(),
				nature: v.string(),
				dateJugement: v.optional(v.string()),
				tribunal: v.optional(v.string()),
				url: v.string()
			})
		),
		/**
		 * Le secteur de la relation commerciale, dont dépend le DÉLAI DE
		 * PRESCRIPTION.
		 *
		 * Il n'est pas décoratif : cinq ans en régime général, mais un an pour le
		 * transport de marchandises et deux ans pour ce qu'on fournit à un
		 * consommateur. Annoncer cinq ans à un transporteur lui ferait perdre sa
		 * créance quatre ans avant qu'il s'en aperçoive.
		 *
		 * `INDETERMINE` par défaut, et c'est un état utile, pas un trou : le
		 * module de prescription retient alors le délai LE PLUS COURT et le
		 * déclare comme une hypothèse. Se tromper dans ce sens fait agir trop
		 * tôt, ce qui ne coûte rien.
		 */
		secteur: v.optional(vSecteurCreance),
		adresse: v.optional(v.string()),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_siren', ['organizationId', 'siren'])
		.index('by_org_and_denomination', ['organizationId', 'denominationNormalisee'])
		/**
		 * ⚠️ LE SEUL INDEX DU PRODUIT QUI TRAVERSE LES ORGANISATIONS, et il existe
		 * pour UNE raison : le radar BODACC reçoit un delta national et doit
		 * retrouver, en une passe, tous les débiteurs portant un SIREN donné. Les
		 * interroger organisation par organisation multiplierait les lectures par le
		 * nombre de clients pour chaque annonce du jour.
		 *
		 * IL EST RÉSERVÉ AUX FONCTIONS INTERNES. Une requête authentifiée qui s'en
		 * servirait rendrait les débiteurs d’autres clients — c’est exactement la
		 * brèche que la barrière multi-tenant existe pour fermer. Un test balaie le
		 * code et échoue si une fonction publique le nomme.
		 */
		.index('by_siren', ['siren'])
		/**
		 * LA RECHERCHE PAR NOM, sur la forme normalisée : le terme saisi passe par
		 * `normaliserFournisseur`, la fonction même qui écrit ce champ.
		 *
		 * ⚠️ FILTRÉE PAR ÉTABLISSEMENT, ET UN TEST L'EXIGE. Sans ce filtre, la
		 * recherche rendrait les débiteurs de tous les clients.
		 * `__tests__/recherche-cloisonnee.test.ts` échoue si un index de recherche
		 * ne déclare pas `organizationId`.
		 */
		.searchIndex('recherche_denomination', {
			searchField: 'denominationNormalisee',
			filterFields: ['organizationId']
		}),

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
		/*
		 * IL N A PLUS DE conditionsPaiement ICI, ET C EST VOULU.
		 *
		 * Le champ etait declare, et RIEN ne l ecrivait ni ne le lisait — nulle
		 * part, depuis toujours. Comme aucune ecriture n a jamais eu lieu, aucun
		 * document en base ne le porte : le retirer ne perd rien.
		 *
		 * Le garder, si. Un champ declare qui n attend personne se lit comme une
		 * fonctionnalite qui existe, et c est exactement la confusion qui a produit
		 * douze defauts dans ce depot — dont trois fonctionnalites entieres que le
		 * schema disait construites. La regle qui remplace celle-la : on reintroduit
		 * ce champ le jour ou quelque chose l ecrit, dans le meme commit.
		 */
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
		// Le volume émis sur douze mois se compte sans lire toute la table :
		// c'est la mesure que les réglages affichent à la place d'une saisie
		// (`recouvrement/monEtablissement.volumeEmis`).
		.index('by_org_and_emission', ['organizationId', 'dateEmission'])
		.index('by_org_and_echeance', ['organizationId', 'dateEcheance'])
		.index('by_org_and_statut', ['organizationId', 'statutPaiement'])
		/**
		 * LA RECHERCHE PAR RÉFÉRENCE PARTIELLE. Une référence tapée en entier se
		 * résout d'abord par `by_org_and_reference` : Convex découpe
		 * `FA-2026-0311` en trois jetons combinés en OU. Filtrée par établissement,
		 * pour la même raison que `recherche_denomination`.
		 */
		.searchIndex('recherche_reference', {
			searchField: 'reference',
			filterFields: ['organizationId']
		}),

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

	/**
	 * LES PIÈCES QUI PORTENT LE DOSSIER — module 1.2.
	 *
	 * ⚠️ CETTE TABLE ÉTAIT LUE PAR LES DEUX MOTEURS ET ÉCRITE NULLE PART.
	 * Huitième occurrence du défaut « déclaré, lu, jamais alimenté », et la
	 * plus coûteuse : les conditions légales valent 12 points sur 20, le seuil
	 * de qualification est à 15, et les points manquants sont TOUS
	 * documentaires. Aucune créance ne pouvait donc être éligible, quoi que
	 * fasse le créancier.
	 */
	pieces: defineTable({
		organizationId: v.id('organizations'),
		type: vTypePiece,
		storageId: v.id('_storage'),
		filename: v.string(),
		/**
		 * Où en est sa lecture.
		 *
		 * `CLASSEE_MAIN` se distingue de `LUE` délibérément : en relisant le
		 * dossier, savoir si le classement vient du modèle ou du gérant change
		 * le crédit qu'on lui accorde.
		 *
		 * Optionnel : Convex valide la base entière, pas seulement le code qui
		 * arrive, et les pièces antérieures à ce champ n'en ont pas.
		 */
		statut: v.optional(
			v.union(
				v.literal('EN_LECTURE'),
				v.literal('LUE'),
				v.literal('A_CLASSER'),
				v.literal('CLASSEE_MAIN'),
				v.literal('ECHEC')
			)
		),
		mimeType: v.optional(v.string()),
		/** Le numéro imprimé sur le document, tel quel. */
		reference: v.optional(v.string()),
		/** La date du document, AAAA-MM-JJ. Distincte de `ajouteeLe`. */
		dateDocument: v.optional(v.string()),
		/**
		 * Le texte EXACT d'une réserve portée sur le document.
		 *
		 * ⚠️ Une réserve est un fait de litige — le questionnaire de
		 * qualification demande précisément « une réserve portée sur un bon de
		 * livraison ». La lire et la jeter laisserait le gérant répondre « non »
		 * de bonne foi sur un document qu'on a lu à sa place.
		 */
		reserves: v.optional(v.string()),
		/**
		 * Le taux de retard stipulé, lu dans des CGV ou un contrat, en
		 * pourcentage saisissable — « 12,50 ».
		 *
		 * ⚠️ IL RESTE UNE PROPOSITION, ET NE S'APPLIQUE À AUCUNE FACTURE. Le
		 * taux qui entre dans un décompte vit sur `facturesVente.tauxContractuel`
		 * et ne s'écrit que par `tauxContractuel.ts`, qui réécrit TOUTES les
		 * factures non soldées du débiteur et enregistre même sous le plancher
		 * légal. Appliqué en silence depuis une ligne lue par un modèle, il
		 * ferait baisser ce qu'on réclame sur tout un client. Il se retient d'un
		 * geste, avec la pièce qui le porte sous les yeux.
		 */
		tauxRetardStipule: v.optional(v.string()),
		/** Ce que la lecture a conclu, affiché tel quel. Jamais reformulé. */
		constat: v.optional(v.string()),
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
		/**
		 * LES FAITS DÉCLARÉS PAR LE GÉRANT, module 3.2.
		 *
		 * ⚠️ ILS SONT LA SOURCE DE `certaine`, qui n'en est que la lecture. Le
		 * critère se recalcule depuis ce tableau à chaque déclaration : personne
		 * ne l'écrit à la main, et l'écran ne le demande plus directement.
		 *
		 * ⚠️ CHAQUE RÉPONSE PORTE SA DATE. Ces déclarations décident si une
		 * procédure s'ouvre ; savoir QUAND le gérant a dit que son client ne
		 * contestait pas fait partie de ce qu'un dossier doit pouvoir montrer.
		 * Un tableau plutôt qu'un objet, pour cette raison précise.
		 *
		 * Optionnel : les créances créées avant ce module n'en ont pas, et
		 * Convex valide la base entière, pas seulement le code qui arrive.
		 */
		faitsLitige: v.optional(
			v.array(
				v.object({
					cle: vCleFaitLitige,
					reponse: vReponseFait,
					declareLe: v.number()
				})
			)
		),
		liquide: vEtatCritere,
		exigible: vEtatCritere,
		entreCommercants: vEtatCritere,
		/**
		 * 0 à 1. La SOLIDITÉ PROBATOIRE du dossier, et rien de plus.
		 *
		 * ⚠️ IL NE DÉCIDE PLUS DE RIEN. Il a longtemps commandé la maturité de la
		 * créance par un seuil ; depuis le 17 septembre 2026 c'est `eligible` qui
		 * la porte. Il ordonne les critères et les pièces manquantes, et il reste
		 * lu par les écrans qui expliquent ce qui renforcerait un dossier.
		 */
		score: v.optional(v.number()),
		/**
		 * LA CRÉANCE EST-ELLE MÛRE : toutes conditions établies, aucun bloquant.
		 *
		 * ⚠️ STOCKÉ, ET C'EST UNE DÉCISION. Le recomposer à la lecture demanderait
		 * de rappeler `qualifier()` — donc les pièces, les faits déclarés, la santé
		 * du débiteur et les retards observés : quatre lectures de plus par créance,
		 * dans une boucle qui parcourt chaque nuit tout l'établissement.
		 *
		 * Il s'écrit au MÊME endroit que `score`, à chaque recalcul, pour qu'aucune
		 * des deux valeurs ne puisse vieillir sans l'autre.
		 *
		 * Optionnel : les créances écrites avant ce champ n'en portent pas, et
		 * Convex valide la base entière, pas seulement le code qui arrive. Absent,
		 * il se lit comme `false` — le doute ne profite jamais au produit.
		 */
		eligible: v.optional(v.boolean()),
		/**
		 * La procédure engagée, et la date de son engagement.
		 *
		 * ⚠️ `statut: 'ENGAGEE'` NE DISAIT PAS LAQUELLE. Le statut existait, et
		 * rien n'enregistrait ni quelle voie avait été prise ni quand — donc
		 * aucun délai post-décision ne pouvait courir. Ces deux champs sont
		 * l'entrée de la machine à états.
		 */
		procedureEngagee: v.optional(v.string()),
		engageeLe: v.optional(v.string()),
		/**
		 * Qui a fait l'acte d'engagement.
		 *
		 * ⚠️ FACULTATIF, ET C'EST UNE DÉCISION. « Je le dirai plus tard » ne doit
		 * rien bloquer : le gérant déclare souvent l'engagement le jour même et
		 * ne sait pas encore par qui l'acte suivant passera. Rendre le champ
		 * obligatoire ferait retarder la déclaration elle-même, donc décaler
		 * l'origine de délais dont un à peine de caducité.
		 */
		intervenantId: v.optional(v.id('intervenants')),
		qualifieeLe: v.optional(v.number()),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_debiteur', ['debiteurId'])
		.index('by_org_and_statut', ['organizationId', 'statut']),

	/**
	 * LE JOURNAL D'UNE PROCÉDURE ENGAGÉE — module 4.5.
	 *
	 * ═══════════════════════════════════════════════════════════════════════
	 * ⚠️ ON ENREGISTRE DES ÉVÉNEMENTS, PAS UN ÉTAT
	 * ═══════════════════════════════════════════════════════════════════════
	 *
	 * L'état courant se REJOUE depuis ces lignes. Le stocker à côté ferait deux
	 * vérités, et leur divergence serait muette : rien ne casse quand un état
	 * ment, il se contente d'être faux — sur un dossier où l'échéance manquée
	 * coûte le titre exécutoire.
	 *
	 * ⚠️ DEUX DATES, ET ELLES NE DISENT PAS LA MÊME CHOSE. `survenuLe` est la
	 * date du FAIT — celle qui fait courir les délais. `consigneLe` est celle
	 * de la saisie. Un gérant qui enregistre le 20 mars une ordonnance signifiée
	 * le 3 doit voir ses trois mois partir du 3 ; les confondre en offrirait
	 * dix-sept de plus, sur l'échéance la plus dangereuse du produit.
	 */
	evenementsProcedure: defineTable({
		organizationId: v.id('organizations'),
		creanceId: v.id('creances'),
		/** La clé de la procédure — sa machine à états vit dans le domaine. */
		procedure: v.string(),
		/** La clé de la transition, telle que la machine la nomme. */
		cle: v.string(),
		/** La date du FAIT. AAAA-MM-JJ. C'est elle qui fait courir les délais. */
		survenuLe: v.string(),
		/** Quand on l'a enregistré. Jamais utilisée dans un calcul de délai. */
		consigneLe: v.number()
	})
		.index('by_creance', ['creanceId'])
		.index('by_org', ['organizationId']),

	/**
	 * LE JOURNAL — une entrée par fait, et aucune ne se réécrit.
	 *
	 * ═══════════════════════════════════════════════════════════════════════
	 * ⚠️ APPEND SEUL, HORS PURGE RGPD
	 * ═══════════════════════════════════════════════════════════════════════
	 *
	 * Aucune entrée ne se modifie ni ne se supprime. C'est le SEUL point
	 * d'entrée d'une contestation reçue hors du logiciel, donc le seul endroit
	 * qui puisse dire QUAND ON A SU — et la règle « l'absence de contestation
	 * CONNUE n'est pas une absence de contestation » n'a de prise que si cette
	 * date existe quelque part et ne bouge plus.
	 *
	 * ⚠️ ELLE GROSSIT SANS BORNE, et c'est assumé : une entrée par geste, sur
	 * des années. L'export la lit donc PAR PAGE, comme les factures, et jamais
	 * d'un `.collect()` qui casserait le droit d'accès le jour où il compte.
	 *
	 * `avant` et `apres` portent l'état de part et d'autre, en toutes lettres :
	 * « Qualité passée de indéterminée à commerçant ». Ce sont des CONSTATS
	 * affichés, pas une machine à états — celle-ci vit dans
	 * `evenementsProcedure` pour la procédure et dans `creances.statut` pour la
	 * créance. Deux machines pour un même fait feraient deux vérités, et leur
	 * divergence serait muette.
	 */
	journal: defineTable({
		organizationId: v.id('organizations'),
		/**
		 * L'identifiant du document concerné, en chaîne.
		 *
		 * PAS UN `v.id(...)`, PARCE QU'IL N'Y A PAS UNE SEULE CIBLE. Un fait
		 * porte sur une créance, un débiteur, une facture ou une pièce ; une
		 * union de quatre identifiants demanderait quatre index là où l'écran
		 * n'en interroge qu'un, celui de la ligne ouverte, dont il connaît déjà
		 * la table.
		 */
		cible: v.string(),
		/** La clé du fait, telle que le domaine la nomme. */
		cle: v.string(),
		/** L'état AVANT, en toutes lettres. Absent quand le fait n'en a pas. */
		avant: v.optional(v.string()),
		/** L'état APRÈS, en toutes lettres. */
		apres: v.optional(v.string()),
		/** D'où vient le fait, en toutes lettres : « BODACC du 16/09 ». */
		source: v.optional(v.string()),
		/**
		 * Qui a produit le fait.
		 *
		 * DEUX VALEURS ET PAS TROIS : le compagnon n'est pas un troisième
		 * auteur. Ce qu'il propose vit dans `propositions` tant que personne ne
		 * l'a retenu ; ce qui entre ici est soit un calcul de la machine, soit
		 * une déclaration du gérant. Lui inventer une signature ferait croire
		 * qu'un tiers a décidé quelque chose.
		 */
		auteur: v.union(v.literal('MACHINE'), v.literal('GERANT')),
		/** Qui, quand l'auteur est le gérant. */
		auteurUserId: v.optional(v.string()),
		/** Quand on l'a consigné. */
		consigneLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_cible', ['organizationId', 'cible']),

	/**
	 * LE CARNET D'INTERVENANTS — à qui le gérant confie un acte.
	 *
	 * ⚠️ C'EST SON CARNET, PAS UN ANNUAIRE QUE LE PRODUIT PROPOSE. Le
	 * recouvrement pour compte de tiers est encadré, et recommander une
	 * procédure est la troisième ligne rouge du projet. Ce que le logiciel fait
	 * ici est plus modeste et parfaitement licite : il retient qui travaille
	 * avec ce gérant.
	 *
	 * `origine` porte la traçabilité. Une fiche retenue depuis un répertoire
	 * public garde la SOURCE et la DATE du relevé : le fichier du CNB est une
	 * photographie à un instant T, et une fiche de deux ans peut décrire une
	 * situation périmée. Sans ces deux champs, rien ne distinguerait une saisie
	 * du gérant d'une donnée officielle.
	 */
	intervenants: defineTable({
		organizationId: v.id('organizations'),
		nom: v.string(),
		role: v.union(v.literal('AVOCAT'), v.literal('COMMISSAIRE_DE_JUSTICE'), v.literal('AUTRE')),
		/** Le barreau, le ressort, ou la ville. Libre : ce n'est pas du droit. */
		ressort: v.optional(v.string()),
		telephone: v.optional(v.string()),
		courriel: v.optional(v.string()),
		adresse: v.optional(v.string()),
		siren: v.optional(v.string()),
		origine: v.union(v.literal('SAISI_A_LA_MAIN'), v.literal('RETENU_DEPUIS_UN_REPERTOIRE')),
		/** Le répertoire d'où vient la fiche, et quand il a été relevé. */
		sourceRepertoire: v.optional(v.string()),
		sourceReleveeLe: v.optional(v.string()),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_role', ['organizationId', 'role']),

	/**
	 * L'ANNUAIRE NATIONAL DES AVOCATS — un RÉFÉRENTIEL, pas une donnée client.
	 *
	 * ⚠️ PAS D'`organizationId`, ET C'EST VOULU. Le cloisonnement strict du
	 * projet porte sur ce qui appartient à un client : un débiteur, un montant,
	 * une échéance. Un fichier public sous Licence Ouverte n'appartient à
	 * personne, au même titre que les taux du référentiel juridique. La
	 * conséquence est que `purge-complete.test.ts` ne la réclame pas dans
	 * `rgpd.ts`, et que l'effacement d'un établissement reste total sur ce qui
	 * est à lui.
	 *
	 * `releveeLe` n'est pas décoratif : le fichier est une photographie
	 * mensuelle, et une fiche de deux ans peut décrire une situation périmée.
	 */
	annuaireAvocats: defineTable({
		barreau: v.string(),
		nom: v.string(),
		prenom: v.string(),
		raisonSociale: v.optional(v.string()),
		siren: v.optional(v.string()),
		adresse: v.optional(v.string()),
		codePostal: v.optional(v.string()),
		ville: v.optional(v.string()),
		specialites: v.array(v.string()),
		/** La date de relevé du fichier source, au format ISO. */
		releveeLe: v.string()
	})
		.index('by_barreau', ['barreau'])
		.index('by_barreau_and_nom', ['barreau', 'nom']),

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
		/**
		 * QUI RÉCLAMAIT À QUI, AU JOUR DE L'ARRÊTÉ.
		 *
		 * Un décompte arrêté est une PIÈCE : il part chez un expert-comptable, un
		 * avocat, un assureur. La question qu'il répond n'est pas « combien
		 * réclame-t-on aujourd'hui » mais « qu'a-t-on réclamé le jour où on l'a
		 * réclamé » — et cette question porte aussi sur les identités. Sans elles,
		 * une pièce regénérée six mois plus tard porterait le nom que le débiteur a
		 * AUJOURD'HUI, après un changement de dénomination ou une fusion, et ne
		 * dirait plus ce qu'elle disait le jour de son émission.
		 *
		 * ⚠️ FACULTATIFS, ET C'EST LE PIÈGE CONVEX. Le schéma valide la BASE, pas
		 * seulement le code : les décomptes déjà produits n'en portent pas, et les
		 * rendre obligatoires ferait échouer le déploiement sur des documents
		 * existants. Le rendu de la pièce doit savoir s'en passer.
		 */
		creancier: v.optional(
			v.object({
				denomination: v.string(),
				siren: v.optional(v.string()),
				adresse: v.optional(v.string())
			})
		),
		debiteur: v.optional(
			v.object({
				denomination: v.string(),
				siren: v.optional(v.string()),
				adresse: v.optional(v.string())
			})
		),
		produitLe: v.number()
	})
		.index('by_creance', ['creanceId'])
		.index('by_org', ['organizationId']),

	/**
	 * Le relevé d'un battement quotidien, par organisation et par jour.
	 *
	 * DEUX RAISONS D'EXISTER, ET LA SECONDE COMPTE AUTANT.
	 *
	 * 1. L'IDEMPOTENCE. Un briefing envoyé deux fois détruit plus de confiance
	 *    qu'un briefing manquant. La clé (organisation, jour) doit rester unique,
	 *    mais Convex n'a pas de contrainte d'unicité en base : l'index
	 *    `by_org_and_jour` permet seulement de VÉRIFIER avant d'écrire — c'est au
	 *    code appelant de lire avant d'insérer, jamais à la base de refuser.
	 *
	 * 2. LA VISIBILITÉ DE L'ÉCHEC. Un battement qui plante en silence laisse le
	 *    client croire qu'il est surveillé alors qu'il ne l'est plus — le pire
	 *    état possible du produit. `statut` et `erreur` sont lus par l'interface
	 *    du client, pas seulement par un journal.
	 *
	 * `cles` porte l'empreinte des événements du jour, pour que le lendemain
	 * puisse dire ce qui est nouveau.
	 */
	battements: defineTable({
		organizationId: v.id('organizations'),
		/** `AAAA-MM-JJ`, en UTC comme toutes les dates du produit. */
		jour: v.string(),
		statut: v.union(v.literal('PARLE'), v.literal('TU'), v.literal('ECHEC')),
		/** Pourquoi on a parlé, ou pourquoi on s'est tu. Affiché tel quel. */
		raison: v.string(),
		/** Les clés d'événement de ce jour, pour la comparaison du lendemain. */
		cles: v.array(v.string()),
		/** Le montant identifié au moment du battement, en centimes. */
		montantIdentifie: v.int64(),
		/** Renseigné uniquement quand `statut` vaut `ECHEC`. */
		erreur: v.optional(v.string()),
		termineLe: v.number()
	})
		.index('by_org_and_jour', ['organizationId', 'jour'])
		.index('by_org', ['organizationId']),

	/**
	 * CE QUE LE COMPAGNON PROPOSE, ET CE QU'ON EN A FAIT.
	 *
	 * ═══════════════════════════════════════════════════════════════════════
	 * ⚠️ UNE PROPOSITION ÉCARTÉE N'EST JAMAIS SUPPRIMÉE, SEULEMENT MARQUÉE
	 * ═══════════════════════════════════════════════════════════════════════
	 *
	 * Le cycle de vie de la proposition EST la piste d'audit : le jour où le
	 * débiteur conteste, il faut pouvoir dire ce qu'on n'a PAS retenu, et
	 * quand. Une suppression physique rend la question sans réponse.
	 *
	 * LA SEULE SUPPRESSION EST LA PURGE RGPD, et elle n'épargne pas les
	 * écartées : ce qu'un gérant a refusé sur son débiteur est sa donnée autant
	 * que ce qu'il a retenu.
	 *
	 * `jour` n'est pas décoratif. Le plafond quotidien se compte par jour
	 * CALENDAIRE et par établissement, et compter sans index balaierait la
	 * table à chaque pose — sur la seule table du domaine dont le volume croît
	 * avec l'usage plutôt qu'avec le portefeuille.
	 */
	propositions: defineTable({
		organizationId: v.id('organizations'),
		/** L'identifiant du document visé, en chaîne. Même raison que `journal`. */
		cible: v.string(),
		/** Le champ visé, tel que le domaine le nomme. */
		champ: v.string(),
		/** La valeur proposée, en toutes lettres. */
		valeur: v.string(),
		/** D'où elle sort. Sans source, il n'y a pas de proposition. */
		source: vSourceConstat,
		/**
		 * ⚠️ `PROPOSEE` N'EST PAS `ok`. Une proposition non confirmée retombe
		 * sur `unknown` partout où un critère la lit : le doute ne profite
		 * jamais au produit, et une proposition qu'on n'a pas lue n'est pas une
		 * réponse qu'on a donnée.
		 */
		etat: v.union(v.literal('PROPOSEE'), v.literal('RETENUE'), v.literal('ECARTEE')),
		/** `AAAA-MM-JJ`, en UTC comme toutes les dates du produit. */
		jour: v.string(),
		/** Quand elle a été mise sous les yeux du gérant. */
		afficheeLe: v.optional(v.number()),
		/** Quand elle a été retenue ou écartée. */
		decideeLe: v.optional(v.number()),
		/** Qui l'a décidée. */
		decideePar: v.optional(v.string()),
		/**
		 * Pourquoi elle a été écartée, en toutes lettres.
		 *
		 * PAS DE POUCE BAS, PAS D'ÉTOILES : on ne note pas un montant, il est
		 * juste ou faux. Le seul retour qui vaille est la correction elle-même,
		 * et c'est elle qui produit une trace opposable si le débiteur conteste.
		 */
		motifEcart: v.optional(v.string()),
		poseeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_etat', ['organizationId', 'etat'])
		.index('by_org_and_jour', ['organizationId', 'jour']),

	/**
	 * LES TOURS DE PAROLE, UNE LIGNE CHACUN.
	 *
	 * ⚠️ UNE LIGNE PAR TOUR, PAS UN FIL DANS UN TABLEAU. Un tableau Convex
	 * plafonne à 8 192 entrées et le dépassement fait échouer l'écriture
	 * ENTIÈRE : un fil bavard perdrait son dernier tour ET tous les autres.
	 * C'est la leçon d'`attestationRequests`, déjà payée une fois ici.
	 *
	 * ⚠️ ELLE GROSSIT SANS BORNE, comme `journal`, et l'export la lit par page.
	 *
	 * `pastilles` porte la source AU GRAIN DE LA PHRASE, jamais de la réponse.
	 * Une phrase sans pastille s'affiche visiblement dégradée et ne peut porter
	 * ni un montant ni un énoncé juridique ; une source posée sur la réponse
	 * entière laisserait passer la phrase fausse au milieu de trois justes.
	 *
	 * `mois` et `usage` tiennent le compteur de coût : un avertissement, puis
	 * un arrêt de la conversation LIBRE seule, par établissement et par mois.
	 * Le reste du produit — la file, les calculs, les propositions, le décompte
	 * — ne dépend d'aucun appel modèle et continue quand le compteur mord.
	 */
	conversations: defineTable({
		organizationId: v.id('organizations'),
		/** Le fil auquel ce tour appartient. */
		fil: v.string(),
		/**
		 * Ce sur quoi le fil est borné. Le compagnon ne répond que là-dedans, et
		 * un changement de portée s'inscrit dans le fil plutôt que de le
		 * déplacer en silence.
		 */
		portee: v.union(v.literal('CREANCE'), v.literal('DEBITEUR'), v.literal('PORTEFEUILLE')),
		/**
		 * L'identifiant de ce que la portée désigne, en chaîne. Sur
		 * `PORTEFEUILLE`, c'est celui de l'établissement : l'index reste
		 * utilisable et aucune ligne ne porte de cible vide.
		 */
		cible: v.string(),
		role: v.union(v.literal('GERANT'), v.literal('COMPAGNON')),
		texte: v.string(),
		/** Une pastille par phrase sourcée, au rang de la phrase dans `texte`. */
		pastilles: v.array(v.object({ phrase: v.number(), source: vSourceConstat })),
		/**
		 * Ce que ce tour a consommé. Renseigné sur les tours du compagnon.
		 *
		 * ⚠️ `coutEstime` EST UN BUDGET DE PILOTAGE, EN DOLLARS, ET JAMAIS UN
		 * MONTANT OPPOSABLE. `socle/modele/cout.ts` le dit de lui-même : ce sont
		 * les « prix Opus 5 (liste), en dollars », « traités comme des euros »,
		 * et c'est « un budget indicatif de pilotage, pas une facture, donc pas
		 * de conversion de change ». C'est aussi pourquoi il est un `v.number()`
		 * et non un `v.int64()` de centimes : la règle des entiers de centimes
		 * porte sur ce qu'on RÉCLAME, et rien ici ne se réclame à personne. Le
		 * jour où ce chiffre entre dans une décision de prix, il passe par une
		 * conversion datée et change de nom.
		 *
		 * Les trois compteurs de jetons portent les noms d'`UsageAppel`, pour
		 * qu'un usage capturé à l'appel s'écrive ici sans traduction.
		 */
		usage: v.optional(
			v.object({
				tokensIn: v.number(),
				tokensOut: v.number(),
				cacheReadTokens: v.number(),
				coutEstime: v.number()
			})
		),
		/** `AAAA-MM`, en UTC. Le grain du compteur mensuel. */
		mois: v.string(),
		diteLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_cible', ['organizationId', 'cible'])
		.index('by_org_and_fil', ['organizationId', 'fil'])
		.index('by_org_and_mois', ['organizationId', 'mois']),

	/**
	 * LE SUIVI D'UN DOSSIER REMIS AU CONSEIL.
	 *
	 * ═══════════════════════════════════════════════════════════════════════
	 * ⚠️ ON SUIT UNE REMISE, ON NE PILOTE PAS LE CONSEIL
	 * ═══════════════════════════════════════════════════════════════════════
	 *
	 * Le produit n'écrit pas au conseil, ne lui fixe aucun délai, ne le relance
	 * pas, ne note pas son efficacité, et ne recommande aucune procédure à
	 * personne. Les quatre états décrivent la REMISE, jamais la procédure, et
	 * AUCUNE transition n'est automatique : chacune vient d'une déclaration
	 * humaine. Tout le reste serait du recouvrement pour compte de tiers ou du
	 * conseil juridique.
	 *
	 * `CLOS` existe pour une raison précise : sans lui, un dossier resté sans
	 * retour serait ouvert pour toujours, et un suivi dont on ne peut pas
	 * sortir est un mur.
	 *
	 * ⚠️ DEUX DATES PAR TRANSITION, comme `evenementsProcedure`. `remisLe`,
	 * `revenuLe` et `closLe` sont les dates du FAIT, en AAAA-MM-JJ, et elles
	 * seules comptent un délai ; `consigneLe` est celle de la saisie et n'entre
	 * dans aucun calcul. Un gérant qui enregistre le 20 mars une remise faite
	 * le 3 doit voir ses comptes partir du 3.
	 *
	 * ⚠️ `consigneLe` PORTE LA DERNIÈRE SAISIE, PAS TOUTES. La trace de chaque
	 * transition — qui l'a déclarée, quand, depuis quel état — vit dans
	 * `journal`, qui est en append seul et existe précisément pour ça. Trois
	 * horodatages de saisie de plus ici auraient fait une seconde piste d'audit
	 * à côté de la première, et leur divergence aurait été muette.
	 *
	 * ⚠️ `decompteId` NE CHANGE JAMAIS. Le dossier fige ce qu'il a emporté : la
	 * question n'est pas « que dirait le dossier aujourd'hui » mais « qu'a lu
	 * le conseil le jour où on le lui a remis ». Produire un dossier à jour
	 * crée une NOUVELLE remise, datée, avec son propre décompte.
	 *
	 * ⚠️ ET LA PRESCRIPTION NE S'ARRÊTE PAS PARCE QUE LE DOSSIER EST PARTI.
	 * `surveillance.ts` ne sait rien d'une remise et continue de produire ses
	 * événements : c'est voulu, la remise est un fait du produit, pas un fait
	 * du droit. `pays/france/prescription.ts` ne gère ni suspension ni
	 * interruption, et le logiciel ignore donc si le conseil a interrompu quoi
	 * que ce soit tant qu'un fait de procédure n'est pas consigné. C'est le
	 * mode de panne le plus cher du produit : croire sa prescription
	 * surveillée alors qu'elle ne l'est plus.
	 */
	remisesAuConseil: defineTable({
		organizationId: v.id('organizations'),
		creanceId: v.id('creances'),
		/** Le décompte figé que le dossier emporte. Il ne change jamais. */
		decompteId: v.id('decomptes'),
		etat: v.union(v.literal('PREPARE'), v.literal('REMIS'), v.literal('REVENU'), v.literal('CLOS')),
		/**
		 * À qui, quand le gérant le nomme.
		 *
		 * ⚠️ FACULTATIF, ET C'EST LA LIGNE ROUGE. Un dossier se remet sans
		 * nommer personne, et le produit ne propose JAMAIS de nom : la fiche
		 * vient du carnet du gérant, pas d'un annuaire que le produit
		 * recommanderait.
		 */
		intervenantId: v.optional(v.id('intervenants')),
		/** La date du FAIT de la remise. AAAA-MM-JJ. */
		remisLe: v.optional(v.string()),
		/** La date du FAIT du retour. AAAA-MM-JJ. */
		revenuLe: v.optional(v.string()),
		/** La date du FAIT de la clôture. AAAA-MM-JJ. */
		closLe: v.optional(v.string()),
		/** Pourquoi le gérant met fin au suivi, en toutes lettres. */
		motifCloture: v.optional(v.string()),
		/** Ce que le gérant déclare attendre, en toutes lettres. */
		attendu: v.optional(v.string()),
		/** Quand la dernière transition a été saisie. Jamais dans un calcul. */
		consigneLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_etat', ['organizationId', 'etat'])
		.index('by_creance', ['creanceId'])
};
