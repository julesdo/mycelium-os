import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { vEmailEvent } from '@convex-dev/resend';
import { recouvrementTables } from './recouvrement/tables';
import { risqueTables } from './risque/tables';
import { croissanceTables } from './croissance/tables';
import { adminTables, crmTables } from './admin/tables';
import { supportTables } from './support/tables';
import { pushTables } from './push/tables';
import { vStatutConnexion, vStatutConnexionQonto } from './connexions/validateurs';

export default defineSchema({
	// Note: Better Auth component manages its own tables (users, sessions, accounts, verifications)

	/**
	 * Le journal des envois — voir `emails/events.ts` pour ce qu'on y met, et
	 * surtout ce qu'on n'y met plus.
	 *
	 * ⚠️ `data` EST FACULTATIF, PAS SUPPRIMÉ, ET C'EST DÉLIBÉRÉ. Convex valide la
	 * BASE et pas seulement le code : retirer le champ du validateur ferait
	 * échouer le déploiement sur les documents qui le portent encore. Il part
	 * quand `purgerJournalEnvois` les aura tous nettoyés, et pas avant.
	 */
	emailEvents: defineTable({
		emailId: v.string(), // identifiant Resend de l'envoi
		eventType: v.string(), // 'email.delivered', 'email.bounced', etc.
		timestamp: v.number(), // quand l'événement s'est produit
		data: v.optional(vEmailEvent)
	})
		.index('by_email_id', ['emailId'])
		.index('by_event_type', ['eventType'])
		.index('by_timestamp', ['timestamp']),

	// `adminAuditLogs` a été retirée le 9 septembre 2026, avec toute la surface
	// d'administration héritée de Fleet — bannir, révoquer, changer un rôle,
	// usurper une identité. `CLAUDE.md` écrit depuis le remodelage qu'il n'y a
	// aucun rôle staff ; le code, lui, portait encore les fonctions publiques qui
	// en dépendaient.
	//
	// La table était VIDE en production, vérifiée avant retrait : personne ne
	// s'en est jamais servi. Convex tolère une table orpheline en base, donc rien
	// à migrer — mais plus rien ne peut y écrire.

	// Organizations — une entreprise cliente = une organisation
	organizations: defineTable({
		name: v.string(),
		siret: v.optional(v.string()),
		/**
		 * Le volume de factures émises par an — ce qui dimensionne l'abonnement.
		 *
		 * Il remplace le nombre de couverts par jour, qui mesurait une cantine.
		 * Facultatif : sans lui, le palier le plus bas s'applique, parce que
		 * facturer trop cher une entreprise qui n'a pas rempli son profil serait
		 * le pire des défauts.
		 */
		facturesParAn: v.optional(v.number()),
		/**
		 * L'ANCIEN LOGO (avant le 23/10/2026) : plus rien ne l'écrit ni ne le lit. Gardé au
		 * schéma pour les fichiers déjà posés, que la purge RGPD efface. Le logo de
		 * l'établissement est celui de « Logo et couleurs » (`profilsCreancier.logoCourriers`).
		 */
		logoUrl: v.optional(v.string()),
		logoStorageId: v.optional(v.id('_storage')),
		// Localisation — figée FR pour la phase POC
		country: v.optional(v.string()),
		currency: v.optional(v.string()),
		timezone: v.optional(v.string()),
		locale: v.optional(v.string()),
		// Paddle billing — paliers d’abonnement
		paddleSubscriptionId: v.optional(v.string()),
		paddleCustomerId: v.optional(v.string()),
		/**
		 * La formule souscrite (`config/tarifs.ts`). `suivi` et `procedures`
		 * sont les étages d'avant le 14/10/2026, relus comme Solo et Équipe.
		 */
		paddlePlanTier: v.optional(
			v.union(
				v.literal('solo'),
				v.literal('equipe'),
				v.literal('pro'),
				v.literal('suivi'),
				v.literal('procedures')
			)
		),
		paddleRythme: v.optional(v.union(v.literal('mensuel'), v.literal('annuel'))),
		/** Le prix Paddle souscrit : il dit si l'abonnement porte encore l'essai. */
		paddlePrixId: v.optional(v.string()),
		/** La raison donnée à la dernière résiliation, facultative. */
		raisonResiliation: v.optional(v.string()),
		/** Le prochain prélèvement ; pendant l'essai, le premier. */
		paddleProchainPrelevementLe: v.optional(v.number()),
		/**
		 * Le prochain prélèvement tel que Paddle l'a calculé pour ce client, en centimes :
		 * hors taxes (remises déduites) et TVA comprise (`releverLeProchainPrelevement`).
		 */
		paddleProchainHT: v.optional(v.number()),
		paddleProchainTTC: v.optional(v.number()),
		/** La fin de l'essai Paddle, tant qu'il court. */
		paddleEssaiFinLe: v.optional(v.number()),
		/** Une résiliation programmée : le jour où elle prend effet. */
		paddleResiliationLe: v.optional(v.number()),
		/** L'établissement a déjà eu ses trente jours d'essai : plus de second. */
		essaiUtilise: v.optional(v.boolean()),
		/**
		 * La remise de bienvenue créée chez Paddle pour cet établissement (audit, lot 8) :
		 * son identifiant et son expiration. Reprise tant qu'elle vaut, jamais recréée.
		 */
		remiseBienvenueId: v.optional(v.string()),
		remiseBienvenueExpireLe: v.optional(v.number()),
		/** Les rappels d'abonnement déjà envoyés (« essai-7:2026-11-13 ») : jamais deux fois. */
		rappelsAbonnement: v.optional(v.array(v.string())),
		/**
		 * Le premier relevé des jalons (21/10/2026) : avant lui, ce qui est déjà franchi
		 * s'inscrit vu de tous, sans célébration (`recouvrement/jalons.ts`).
		 */
		jalonsRelevesLe: v.optional(v.number()),
		/**
		 * LA RECOMMANDATION (21/10/2026, `croissance/parrainage.ts`). Le lien personnel
		 * (`/?parrain=<code>`), l'établissement qui a recommandé celui-ci (posé à la
		 * création seulement), le jour où sa première échéance payée a déclenché les mois
		 * offerts, et les mois gagnés : appliqués chez Paddle à l'échéance suivante.
		 */
		codeParrainage: v.optional(v.string()),
		parrainePar: v.optional(v.id('organizations')),
		parrainageDeclencheLe: v.optional(v.number()),
		recompensesParrainage: v.optional(
			v.array(
				v.object({
					raison: v.union(v.literal('PARRAIN'), v.literal('FILLEUL')),
					gagneeLe: v.number(),
					/** Le prix mensuel HT de la formule, en centimes, fixé à l'application. */
					montant: v.optional(v.number()),
					remiseId: v.optional(v.string()),
					appliqueeLe: v.optional(v.number())
				})
			)
		),
		/** Un mois gagné attend d'être appliqué (le passage quotidien le reprend). */
		recompenseEnAttente: v.optional(v.boolean()),
		/** Une application en cours chez Paddle : deux ne se chevauchent pas. */
		recompenseEnCoursLe: v.optional(v.number()),
		/**
		 * LES CODES PRIVILÈGES (27/10/2026, `codesPrivilege.ts`). L'accès offert à vie par un
		 * code : la formule ouverte, sans prélèvement (`resolveEffectivePlan`). La remise d'un
		 * code : en attente d'un abonnement, puis posée chez Paddle. Les essais de saisie :
		 * cinq par quart d'heure (`tenterUnCode`).
		 */
		accesOffert: v.optional(
			v.object({
				formule: v.union(v.literal('solo'), v.literal('equipe'), v.literal('pro')),
				depuis: v.number(),
				codeId: v.id('codesPrivilege')
			})
		),
		remisePrivilege: v.optional(
			v.object({
				pourcent: v.number(),
				mois: v.number(),
				codeId: v.id('codesPrivilege'),
				etat: v.union(v.literal('EN_ATTENTE'), v.literal('APPLIQUEE')),
				remiseId: v.optional(v.string()),
				appliqueeLe: v.optional(v.number()),
				/** Une application en cours chez Paddle : deux ne se chevauchent pas. */
				enCoursLe: v.optional(v.number())
			})
		),
		essaisDeCodes: v.optional(v.object({ nombre: v.number(), depuis: v.number() })),
		paddleStatus: v.optional(
			v.union(
				v.literal('active'),
				v.literal('trialing'),
				v.literal('paused'),
				v.literal('past_due'),
				v.literal('canceled')
			)
		),
		paddleCurrentPeriodEnd: v.optional(v.number()),
		/** L'heure du dernier rappel Paddle inscrit : un rappel plus ancien est ignoré. */
		paddleEvenementLe: v.optional(v.number()),
		seatsIncluded: v.optional(v.number()),
		freeTrialEndsAt: v.optional(v.number()),
		devPlan: v.optional(v.boolean()),
		simulatedTier: v.optional(v.string()),
		createdAt: v.number()
	})
		.index('by_name', ['name'])
		.index('by_paddle_subscription', ['paddleSubscriptionId'])
		.index('by_paddle_customer', ['paddleCustomerId'])
		// Les rappels d'abonnement du matin lisent les essais et les abonnements actifs.
		.index('by_paddle_status', ['paddleStatus'])
		// Les places de l'offre fondateurs se comptent sur le prix souscrit.
		.index('by_paddle_prix', ['paddlePrixId'])
		// La recommandation : le lien, les recommandés, les mois qui attendent Paddle.
		.index('by_code_parrainage', ['codeParrainage'])
		.index('by_parraine_par', ['parrainePar'])
		.index('by_recompense_en_attente', ['recompenseEnAttente'])
		// La remise d'un code privilège qui attend Paddle : le passage quotidien la reprend.
		.index('by_remise_privilege', ['remisePrivilege.etat']),

	/**
	 * LES PRIX PADDLE DE CE DÉPLOIEMENT, rangés par le catalogue
	 * (`paddleCatalogue:catalogue`) : une étiquette (« equipe-annuel-essai »)
	 * pour un identifiant. Un déploiement parle à un seul environnement Paddle.
	 *
	 * ⚠️ AUCUN ÉTABLISSEMENT ICI, ET C'EST VOULU : c'est un référentiel du
	 * produit, comme les taux du référentiel juridique, pas une donnée client.
	 */
	prixPaddle: defineTable({
		etiquette: v.string(),
		prixId: v.string(),
		formule: v.union(v.literal('solo'), v.literal('equipe'), v.literal('pro')),
		rythme: v.union(v.literal('mensuel'), v.literal('annuel')),
		essai: v.boolean(),
		/** En centimes, tel que Paddle le prélève. */
		montant: v.string(),
		/** Le prix fondateurs (`paiement/offres.ts`) : compté, daté, jamais migré. */
		fondateurs: v.optional(v.boolean()),
		enregistreLe: v.number()
	})
		.index('by_etiquette', ['etiquette'])
		.index('by_prix', ['prixId']),

	/**
	 * LA CONNEXION D'UN ÉTABLISSEMENT À SON COMPTE QONTO.
	 *
	 * ⚠️ LES JETONS SONT CHIFFRÉS, ET AUCUNE FONCTION PUBLIQUE NE LES REND. Ils
	 * ouvrent les factures d'une entreprise : en clair, ils fuiraient avec la
	 * première sauvegarde exportée. `maConnexionQonto` ne rend que l'état.
	 *
	 * ⚠️ LECTURE SEULE. Les droits demandés ne permettent aucune écriture chez
	 * Qonto et aucun mouvement d'argent : ligne rouge 2.
	 */
	connexionsQonto: defineTable({
		organizationId: v.id('organizations'),
		statut: vStatutConnexionQonto,
		/** Le `state` OAuth en cours, et sa limite : dix minutes pour revenir de Qonto. */
		etatOAuth: v.optional(v.string()),
		etatExpireLe: v.optional(v.number()),
		jetonAccesChiffre: v.optional(v.string()),
		jetonRafraichissementChiffre: v.optional(v.string()),
		jetonExpireLe: v.optional(v.number()),
		secretWebhookChiffre: v.optional(v.string()),
		abonnementWebhookId: v.optional(v.string()),
		/** L'organisation côté Qonto : c'est par elle qu'un webhook retrouve sa connexion. */
		qontoOrganizationId: v.optional(v.string()),
		/** Horodatage ISO depuis lequel relire : le début de la dernière synchronisation réussie. */
		curseur: v.optional(v.string()),
		/** Posé au début d'une synchronisation : deux synchronisations ne se chevauchent pas. */
		synchroDebuteeLe: v.optional(v.number()),
		derniereSynchro: v.optional(v.number()),
		facturesLues: v.optional(v.number()),
		erreur: v.optional(v.string()),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_etat_oauth', ['etatOAuth'])
		.index('by_qonto_organization', ['qontoOrganizationId']),

	/**
	 * LES LOGICIELS RELIÉS PAR NANGO — une ligne par logiciel branché (13/10/2026).
	 *
	 * Nango tient l'accès au logiciel du gérant (OAuth ou clé, rafraîchissement) ;
	 * nous lisons par son proxy, qui ajoute lui-même les identifiants. Un
	 * établissement peut brancher plusieurs logiciels : sa comptabilité ET son
	 * outil de facturation, par exemple.
	 *
	 * ⚠️ AUCUN JETON ICI, ET AUCUN NE PEUT Y ARRIVER : la clé d'API de Nango posée
	 * dans l'environnement n'a pas le droit de lire les identifiants
	 * (`connections:read`, jamais `read_credentials`). Nous ne détenons que
	 * l'identifiant de la connexion, qui n'ouvre rien sans notre clé.
	 *
	 * ⚠️ LECTURE SEULE : seuls des GET partent vers le logiciel du gérant.
	 */
	connexionsNango: defineTable({
		organizationId: v.id('organizations'),
		/** L'identifiant de la connexion chez Nango : un UUID qu'il choisit. */
		connectionId: v.string(),
		/** L'identifiant de l'intégration dans le tableau de bord de Nango (`provider_config_key`). */
		integrationId: v.string(),
		/** Le fournisseur Nango (`providers.yaml`) : c'est lui qui choisit le lecteur. */
		fournisseur: v.string(),
		/** Le nom du logiciel tel que Nango le donne (« Pennylane »). */
		nom: v.string(),
		statut: vStatutConnexion,
		/**
		 * Ce qui désigne le compte du gérant chez le logiciel : `realmId`,
		 * `tenant_id`, `organization_id`. Des identifiants de compte, pas des secrets.
		 */
		configLecture: v.optional(v.record(v.string(), v.string())),
		/** La page où reprendre une lecture interrompue (opaque, propre au lecteur). */
		suite: v.optional(v.string()),
		/** Le début de la lecture en cours (elle peut s'étendre sur plusieurs passes). */
		lectureDebuteeLe: v.optional(v.number()),
		/** Tant qu'il est dans le futur, une passe tourne : deux passes ne se chevauchent pas. */
		verrouJusquA: v.optional(v.number()),
		/** Le début de la dernière lecture complète : la suivante ne relit que ce qui a changé. */
		derniereLectureComplete: v.optional(v.number()),
		derniereSynchro: v.optional(v.number()),
		/** Ce que la lecture en cours (ou la dernière) a fait entrer. */
		facturesLues: v.optional(v.number()),
		/** Les créances vues mais pas lues (devise, numéro, client manquant) : l'écran les compte. */
		facturesNonLues: v.optional(v.number()),
		/**
		 * Les factures annulées à la source alors qu'elles sont chez nous, ouvertes :
		 * une facture annulée ne se relance pas, l'écran demande de vérifier.
		 */
		annuleesALaSource: v.optional(v.array(v.string())),
		erreur: v.optional(v.string()),
		creePar: v.string(),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_connection', ['connectionId']),

	// Organization members - liaison utilisateur ↔ organisation avec rôle
	organizationMembers: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(), // Better Auth string ID
		role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MEMBER')),
		joinedAt: v.number(),
		/**
		 * Le point du matin par e-mail (`battement.ts`). Absent : il part. `false` :
		 * ce membre l'a coupé depuis son profil (09/10/2026).
		 */
		pointDuMatinParCourriel: v.optional(v.boolean()),
		/** Les conseils de Plume par e-mail (`croissance/conseils.ts`). Absent : ils partent. */
		conseilsParCourriel: v.optional(v.boolean()),
		/** Le jeton du lien de désinscription des conseils, tiré au premier envoi. */
		jetonConseils: v.optional(v.string()),
		/**
		 * Les catégories de notifications coupées par ce membre (`notifications/categories.ts`) :
		 * le push et l'e-mail « Votre semaine » s'y taisent. Absent : tout parle.
		 */
		categoriesCoupees: v.optional(v.array(v.string()))
	})
		.index('by_organization', ['organizationId'])
		.index('by_jeton_conseils', ['jetonConseils'])
		.index('by_user', ['userId'])
		.index('by_org_and_user', ['organizationId', 'userId'])
		.index('by_user_and_role', ['userId', 'role']),

	// Organization invitations - invitations par email pour rejoindre une org
	organizationInvitations: defineTable({
		organizationId: v.id('organizations'),
		email: v.string(),
		role: v.union(v.literal('ORG_ADMIN'), v.literal('ORG_MEMBER')),
		token: v.string(), // UUID unique pour le lien d'invitation
		invitedBy: v.string(), // userId Better Auth
		expiresAt: v.number(), // timestamp +7 jours
		acceptedAt: v.optional(v.number()),
		createdAt: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_token', ['token'])
		.index('by_email', ['email'])
		.index('by_org_and_email', ['organizationId', 'email']),

	// User profiles - currentOrganizationId séparé du schéma Better Auth (auto-généré)
	userProfiles: defineTable({
		userId: v.string(), // Better Auth string ID
		currentOrganizationId: v.optional(v.id('organizations')),
		hasUsedFreeTrial: v.optional(v.boolean()), // anti-abus : trial unique par userId
		/**
		 * LE VISAGE DE LA PERSONNE : une photo téléversée, OU un avatar choisi.
		 *
		 * ⚠️ PAS DANS `user.image` DE BETTER AUTH, et pour une raison de ménage. Une
		 * photo remplacée doit quitter le stockage avec son remplaçant, exactement
		 * comme le logo des courriers (`recouvrement/marque.ts`) — il faut donc garder
		 * l'identifiant de stockage, que `user.image`, simple chaîne écrite par un
		 * composant qu'on ne maîtrise pas, ne sait pas porter. Et `supprimerMonCompte`
		 * efface le fichier avec cette ligne : la photo entre dans la purge.
		 *
		 * Photo et avatar s'excluent : choisir l'un efface l'autre. L'avatar est
		 * stocké en DESCRIPTION (un style, une graine), jamais en image : DiceBear le
		 * redessine à l'identique chez le client. Voir `imageDeProfil.ts`.
		 */
		imageStorageId: v.optional(v.id('_storage')),
		imageUrl: v.optional(v.string()),
		avatarStyle: v.optional(
			v.union(
				v.literal('notionists'),
				v.literal('lorelei'),
				v.literal('thumbs'),
				v.literal('shapes')
			)
		),
		avatarGraine: v.optional(v.string())
	}).index('by_userId', ['userId']),

	// In-app notifications - temps réel via Convex reactive queries
	notifications: defineTable({
		organizationId: v.id('organizations'),
		userId: v.string(), // destinataire (Better Auth string ID)
		type: v.union(
			v.literal('IMPORT_TERMINE'),
			v.literal('CREANCE_MURE'),
			v.literal('ECHEANCE_PROCHE'),
			v.literal('PRESCRIPTION_PROCHE'),
			v.literal('DEBITEUR_DEGRADE'),
			v.literal('HUMAN_ASSIST_REPLY'),
			/** Le pilote ne peut pas faire une étape sans le gérant : il dit quoi. */
			v.literal('PILOTE_BLOQUE'),
			/** La santé d'un client a baissé franchement à sa relecture (`risque/analyse.ts`). */
			v.literal('RISQUE_EN_BAISSE'),
			/** Un rappel d'abonnement : fin d'essai, renouvellement (`abonnementRappels.ts`). */
			v.literal('ABONNEMENT'),
			/** Des clients ont payé, d'un import (le parcours de l'habitude, 21/10/2026). */
			v.literal('PAIEMENT_RECU'),
			/** Une réussite franchie : premier paiement, 10 000 € rentrés (`jalons.ts`). */
			v.literal('JALON'),
			/** « Votre semaine », le lundi. */
			v.literal('SEMAINE'),
			/** La recommandation : un confrère inscrit par votre lien, un mois offert (22/10/2026). */
			v.literal('RECOMMANDATION')
		),
		title: v.string(),
		message: v.string(),
		link: v.optional(v.string()),
		isRead: v.boolean(),
		createdAt: v.number()
	})
		.index('by_user', ['userId'])
		.index('by_user_unread', ['userId', 'isRead'])
		.index('by_user_and_created', ['userId', 'createdAt'])
		.index('by_org', ['organizationId']),

	// Note: The agent component automatically creates the following tables:
	// - agent:threads - Conversation threads for customer support
	// - agent:messages - Messages within threads
	// - agent:streamingDeltas - Real-time streaming chunks
	// - agent:embeddings - Vector embeddings for semantic search

	// ── Domaine recouvrement de créances B2B ────────────────────────────────────
	// Voir src/lib/convex/recouvrement/tables.ts.
	...recouvrementTables,
	...risqueTables,
	...croissanceTables,
	...adminTables,
	...crmTables,
	...supportTables,
	...pushTables
});
