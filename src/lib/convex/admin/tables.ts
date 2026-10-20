import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import {
	vAcheteurs,
	vEtatDeTravail,
	vGenreDeTravail,
	vResultatDeTravail,
	vSecteur,
	vSegment,
	vTitulaireTrouve,
	vZone
} from './validateursProspection';

/**
 * LES TABLES DE L'ADMIN (16/10/2026).
 *
 * `equipe` est hors des établissements : c'est l'équipe de Letikette, exemptée
 * nommément du cloisonnement. `journalEquipe` porte un `organizationId` quand
 * l'action touche un établissement, et part avec lui à la purge.
 */

export const vRoleEquipe = v.union(
	v.literal('FONDATEUR'),
	v.literal('SUPPORT'),
	v.literal('LECTURE')
);

export const vCibleJournal = v.object({
	type: v.union(
		v.literal('COMPTE'),
		v.literal('PROSPECT'),
		v.literal('MEMBRE'),
		v.literal('IMPORT'),
		v.literal('CONVERSATION'),
		// Le CMS du blog (19/10/2026) : l'adresse de l'article publié.
		v.literal('ARTICLE')
	),
	id: v.optional(v.string()),
	libelle: v.string()
});

export const adminTables = {
	equipe: defineTable({
		/** En minuscules : c'est l'adresse vérifiée du compte qui ouvre l'accès. */
		email: v.string(),
		role: vRoleEquipe,
		invitePar: v.string(),
		inviteLe: v.number(),
		rejointLe: v.optional(v.number()),
		retireLe: v.optional(v.number()),
		/** Le prénom que voit le client dans le support (« Camille »), choisi par le membre. */
		prenomAffiche: v.optional(v.string()),
		/** Une vraie photo, posée par le membre lui-même : aucun visage n'est inventé. */
		photoStorageId: v.optional(v.id('_storage'))
	}).index('by_email', ['email']),

	journalEquipe: defineTable({
		/** L'adresse du membre de l'équipe qui a agi. */
		auteur: v.string(),
		action: v.union(
			v.literal('FICHE_OUVERTE'),
			v.literal('MEMBRE_INVITE'),
			v.literal('ROLE_CHANGE'),
			v.literal('MEMBRE_RETIRE'),
			v.literal('IMPORT'),
			v.literal('PROSPECT_EFFACE'),
			// Le support (16/10/2026) : chaque conversation ouverte, chaque contenu retiré,
			// chaque coupure des relances demandée au support.
			v.literal('CONVERSATION_OUVERTE'),
			v.literal('CONTENU_RETIRE'),
			v.literal('RELANCES_SUSPENDUES'),
			// Le CMS du blog (19/10/2026) : chaque publication est un commit sur le dépôt.
			v.literal('ARTICLE_PUBLIE')
		),
		cible: vCibleJournal,
		organizationId: v.optional(v.id('organizations')),
		le: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_le', ['le'])
};

export const vStatutProspect = v.union(
	v.literal('A_CONTACTER'),
	v.literal('CONTACTE'),
	v.literal('RELANCE'),
	v.literal('A_REPONDU'),
	v.literal('INTERESSE'),
	v.literal('INSCRIT'),
	v.literal('GAGNE'),
	v.literal('PERDU'),
	v.literal('STOP')
);

export const vCible = v.union(v.literal('PME'), v.literal('CABINET'), v.literal('AUTRE'));

/** Les parcours de prospection (`crm/parcours.ts`, qui en porte les étapes). */
export const vParcours = v.union(
	v.literal('FOURNISSEUR_PUBLIC'),
	v.literal('TRANSPORTEUR'),
	v.literal('EXPERT_COMPTABLE'),
	v.literal('PME_LOGICIEL'),
	v.literal('PILOTE')
);

/** L'issue d'un appel (`crm/appels.ts`). */
export const vIssueAppel = v.union(
	v.literal('PAS_DE_REPONSE'),
	v.literal('MESSAGE_LAISSE'),
	v.literal('BARRAGE'),
	v.literal('A_RAPPELER'),
	v.literal('PAS_INTERESSE'),
	v.literal('INTERESSE'),
	v.literal('EMAIL_ACCEPTE'),
	v.literal('RDV'),
	v.literal('STOP')
);

/**
 * L'estimation de ce qu'un acheteur public doit à un fournisseur, avant l'appel : un
 * MAJORANT décomposé, qui se refait à la main (`crm/estimation.ts`).
 */
export const vEstimationProspect = v.object({
	segments: v.array(
		v.object({
			acheteur: v.string(),
			annee: v.number(),
			montantAnnuelCentimes: v.int64(),
			joursDeRetard: v.number(),
			interetsCentimes: v.int64(),
			indemnitesCentimes: v.int64()
		})
	),
	hypotheses: v.array(v.string()),
	calculeeLe: v.number()
});

export const vTypeEvenementCrm = v.union(
	v.literal('NOTE'),
	v.literal('APPEL'),
	v.literal('EMAIL'),
	v.literal('REPONSE'),
	v.literal('STATUT'),
	v.literal('ETAPE')
);

/**
 * LES TABLES DU CRM (16/10/2026).
 *
 * `prospects`, `oppositions`, `importsProspects` et `inscriptionsAttente` sont des données de Letikette,
 * exemptées nommément du cloisonnement. `evenementsCrm` et `tachesCrm` portent un
 * `organizationId` quand elles touchent un compte client, et partent avec lui.
 */
export const crmTables = {
	prospects: defineTable({
		entreprise: v.string(),
		siren: v.optional(v.string()),
		activite: v.optional(v.string()),
		effectif: v.optional(v.string()),
		ville: v.optional(v.string()),
		dirigeant: v.optional(v.string()),
		fonction: v.optional(v.string()),
		email: v.optional(v.string()),
		telephone: v.optional(v.string()),
		site: v.optional(v.string()),
		/** La source légale du contact : où il a été trouvé. */
		trouveOu: v.optional(v.string()),
		cible: vCible,
		statut: vStatutProspect,
		prochaineAction: v.optional(v.string()),
		prochaineActionLe: v.optional(v.number()),
		dernierContactLe: v.optional(v.number()),
		notes: v.optional(v.string()),
		/** L'adresse du membre de l'équipe qui s'en occupe. */
		responsable: v.optional(v.string()),
		/** Le compte client, quand le prospect s'est inscrit (rapprochement). */
		compteId: v.optional(v.id('organizations')),
		importId: v.optional(v.id('importsProspects')),
		creePar: v.string(),
		creeLe: v.number(),
		// ── Les parcours (19/10/2026) ─────────────────────────────────────
		/** Absent sur les prospects d'avant : déduit par `parcoursDe`. */
		parcours: v.optional(vParcours),
		/** Une clé des étapes du parcours, validée par la mutation. */
		etapeParcours: v.optional(v.string()),
		/** Un cabinet partenaire : son code, lu dans la source des inscriptions. */
		codePartenaire: v.optional(v.string()),
		/** Sage, Cegid, EBP… pour un pilote. */
		logicielComptable: v.optional(v.string()),
		/** Fournisseur public : le majorant estimé, en centimes. */
		montantEstimeCentimes: v.optional(v.int64()),
		/** Fournisseur public : le dernier jour pour réclamer (AAAA-MM-JJ). */
		dateButoir: v.optional(v.string()),
		estimation: v.optional(vEstimationProspect),
		// ── L'e-mail conforme (CNIL, fiches du 10/06/2026) ─────────────────
		/** Pourquoi un e-mail est permis : une adresse générique, ou une personne informée. */
		emailBase: v.optional(v.union(v.literal('GENERIQUE'), v.literal('INFORMEE'))),
		/** Le jour où la personne a été informée (article 14 du RGPD). */
		emailInformeLe: v.optional(v.number()),
		/** Le jeton du lien « Ne plus recevoir de messages ». */
		jetonDesinscription: v.optional(v.string()),
		/**
		 * Le dernier contact VENU DU PROSPECT (une réponse, un rendez-vous) : la durée
		 * de trois ans part de lui, pas de nos envois (référentiel CNIL).
		 */
		dernierContactDuProspectLe: v.optional(v.number()),
		/** Le dernier appel noté : la file du jour ne rappelle pas deux fois le même jour. */
		dernierAppelLe: v.optional(v.number())
	})
		.index('by_statut', ['statut'])
		.index('by_parcours', ['parcours', 'creeLe'])
		.index('by_jeton_desinscription', ['jetonDesinscription'])
		.index('by_email', ['email'])
		.index('by_siren', ['siren'])
		.index('by_compte', ['compteId'])
		.index('by_cree', ['creeLe']),

	oppositions: defineTable({
		/** L'empreinte SHA-256 de l'adresse normalisée : l'adresse elle-même n'est pas gardée. */
		empreinte: v.string(),
		le: v.number()
	}).index('by_empreinte', ['empreinte']),

	/**
	 * LA LISTE D'ATTENTE DE LA PROCÉDURE SANS JUGE (19/10/2026, `convex/attente.ts`) : une
	 * adresse qui demande à être prévenue. Non confirmée, elle s'efface passé son lien ;
	 * confirmée, trois ans au plus (`crm/attente.ts`).
	 */
	inscriptionsAttente: defineTable({
		liste: v.literal('procedure-sans-juge'),
		email: v.string(),
		entreprise: v.optional(v.string()),
		/** `crypto.randomUUID()` : la serrure du lien de confirmation et de retrait. */
		jeton: v.string(),
		creeLe: v.number(),
		confirmeeLe: v.optional(v.number())
	})
		.index('by_liste_email', ['liste', 'email'])
		.index('by_jeton', ['jeton'])
		.index('by_cree', ['creeLe']),

	evenementsCrm: defineTable({
		organizationId: v.optional(v.id('organizations')),
		prospectId: v.optional(v.id('prospects')),
		type: vTypeEvenementCrm,
		texte: v.optional(v.string()),
		/** Pour un appel : ce qu'il a donné. */
		issue: v.optional(vIssueAppel),
		auteur: v.string(),
		le: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_prospect', ['prospectId'])
		.index('by_auteur_and_le', ['auteur', 'le']),

	tachesCrm: defineTable({
		organizationId: v.optional(v.id('organizations')),
		prospectId: v.optional(v.id('prospects')),
		titre: v.string(),
		pour: v.number(),
		assigneA: v.optional(v.string()),
		faiteLe: v.optional(v.number()),
		origine: v.union(v.literal('MAIN'), v.literal('SCORE')),
		creePar: v.string(),
		creeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_prospect', ['prospectId'])
		.index('by_faite_et_pour', ['faiteLe', 'pour']),

	importsProspects: defineTable({
		fichier: v.string(),
		lignes: v.number(),
		importes: v.number(),
		ecartes: v.number(),
		oppositions: v.number(),
		par: v.string(),
		le: v.number()
	}).index('by_le', ['le']),

	/**
	 * LES TRAVAUX DE L'ÉQUIPE EN ARRIÈRE-PLAN (20/10/2026). Le fondateur : « pourquoi elles ne
	 * se font pas en arrière-plan ? On doit rester sur l'écran de chargement ». Une recherche
	 * dans la commande publique ou à l'annuaire, un ajout de fournisseurs : chacun devient un
	 * travail, lancé d'un toucher, exécuté par le planificateur, suivi en direct dans la file
	 * de l'admin, et son résultat attend qu'on revienne. Données de Letikette, sans établissement.
	 */
	travauxEquipe: defineTable({
		genre: vGenreDeTravail,
		libelle: v.string(),
		criteres: v.object({
			secteur: v.optional(vSecteur),
			acheteurs: v.optional(vAcheteurs),
			zone: vZone,
			page: v.number()
		}),
		/** Les fournisseurs à ajouter, pour un ajout. */
		titulaires: v.optional(v.array(vTitulaireTrouve)),
		etat: vEtatDeTravail,
		/** Ce que fait le travail en ce moment : « Page 2 de la commande publique ». */
		etape: v.optional(v.string()),
		fait: v.optional(v.number()),
		total: v.optional(v.number()),
		/** L'import où un ajout écrit, passe après passe. */
		importId: v.optional(v.id('importsProspects')),
		resultat: v.optional(vResultatDeTravail),
		erreur: v.optional(v.string()),
		par: v.string(),
		/** Le résultat a été ouvert : la file ne le signale plus. */
		vu: v.boolean(),
		creeLe: v.number(),
		commenceLe: v.optional(v.number()),
		/** La dernière fois que le travail a écrit : muet dix minutes, il est clos. */
		majLe: v.optional(v.number()),
		finiLe: v.optional(v.number())
	})
		.index('by_creeLe', ['creeLe'])
		.index('by_etat', ['etat']),

	/**
	 * PLUME, LES PROSPECTS DU JOUR (20/10/2026) : un seul document. Éteint tant qu'un fondateur
	 * ne l'allume pas ; les curseurs disent, segment par segment, la page où Plume reprendra.
	 */
	reglagesProspection: defineTable({
		actif: v.boolean(),
		parJour: v.number(),
		zone: vZone,
		segments: v.array(vSegment),
		curseurs: v.array(v.object({ cle: v.string(), page: v.number() })),
		modifiePar: v.optional(v.string()),
		modifieLe: v.optional(v.number())
	})
};
