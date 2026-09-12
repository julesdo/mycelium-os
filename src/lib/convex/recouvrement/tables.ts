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
		.index('by_siren', ['siren']),

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
		/** 0 à 1. Une créance sous le seuil ne part pas en procédure. */
		score: v.optional(v.number()),
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
		role: v.union(
			v.literal('AVOCAT'),
			v.literal('COMMISSAIRE_DE_JUSTICE'),
			v.literal('AUTRE')
		),
		/** Le barreau, le ressort, ou la ville. Libre : ce n'est pas du droit. */
		ressort: v.optional(v.string()),
		telephone: v.optional(v.string()),
		courriel: v.optional(v.string()),
		adresse: v.optional(v.string()),
		siren: v.optional(v.string()),
		origine: v.union(
			v.literal('SAISI_A_LA_MAIN'),
			v.literal('RETENU_DEPUIS_UN_REPERTOIRE')
		),
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
		.index('by_org', ['organizationId'])
};
