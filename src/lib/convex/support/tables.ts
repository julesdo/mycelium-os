import { defineTable } from 'convex/server';
import { v, type Infer } from 'convex/values';
import type { Acte, RaisonDePassage } from '../../support/passage';
import type { Sujet } from '../../support/sujets';

/**
 * LES TABLES DU SERVICE CLIENT (16/10/2026,
 * `docs/superpowers/specs/2026-10-16-service-client.md` § 8).
 *
 * ⚠️ CE NE SONT PAS LES CONVERSATIONS DE PLUME. `echangesCompagnon` porte ce que
 * le gérant demande sur ses dossiers, que l'équipe ne lit jamais ; ces tables-ci
 * portent ce qu'il écrit À l'équipe, qu'elle lit. Les mélanger donnerait un dossier
 * à l'équipe par la porte du support.
 *
 * Les conversations et leurs messages portent `organizationId` et partent avec
 * l'établissement à la purge. Exemption nommée du cloisonnement : une conversation
 * sans établissement (un e-mail d'inconnu, à rattacher), gardée 30 jours, jamais lue
 * par Plume. Les réponses enregistrées et les réglages sont ceux de l'équipe.
 */

export const vEtatConversation = v.union(
	v.literal('PLUME'),
	v.literal('A_NOUS'),
	v.literal('EN_ATTENTE_CLIENT'),
	v.literal('TERMINEE')
);
export type EtatConversation = Infer<typeof vEtatConversation>;

export const vCanalSupport = v.union(v.literal('APP'), v.literal('EMAIL'));

export const vRaisonDePassage = v.union(
	v.literal('DEMANDE'),
	v.literal('ACTE'),
	v.literal('REFUS'),
	v.literal('INSISTANCE'),
	v.literal('LACUNE'),
	v.literal('PANNE'),
	v.literal('PLAFOND'),
	v.literal('FERME'),
	v.literal('EMAIL')
);

export const vActe = v.union(
	v.literal('REMBOURSEMENT'),
	v.literal('PRELEVEMENT'),
	v.literal('TITULAIRE'),
	v.literal('ACCES_PERDU'),
	v.literal('COMPROMISSION'),
	v.literal('DONNEES_PERSONNELLES')
);

export const vSujet = v.union(
	v.literal('RELANCES'),
	v.literal('FACTURES_DOCUMENTS'),
	v.literal('CONNEXIONS'),
	v.literal('ABONNEMENT'),
	v.literal('COMPTE_ACCES'),
	v.literal('PLUME'),
	v.literal('DONNEES_PERSONNELLES'),
	v.literal('BUG'),
	v.literal('AUTRE')
);

/** Comment une conversation s'est terminée : c'est ce que compte la mesure. */
export const vIssue = v.union(
	v.literal('RESOLUE_PAR_PLUME'),
	v.literal('RESOLUE_PAR_EQUIPE'),
	v.literal('SANS_NOUVELLES')
);

export const vAuteurSupport = v.union(
	v.literal('GERANT'),
	v.literal('PLUME'),
	v.literal('EQUIPE'),
	v.literal('SYSTEME')
);
export type AuteurSupport = Infer<typeof vAuteurSupport>;

/**
 * MESSAGE : ce qui se dit. NOTE : ce que l'équipe écrit pour elle seule. EVENEMENT :
 * une ligne du fil (« Transmis à 14 h 02 »). NON_VERIFIE : un e-mail dont l'expéditeur
 * n'est pas prouvé, montré à l'équipe seule. Le gérant ne lit ni NOTE ni NON_VERIFIE.
 */
export const vGenreMessage = v.union(
	v.literal('MESSAGE'),
	v.literal('NOTE'),
	v.literal('EVENEMENT'),
	v.literal('NON_VERIFIE')
);

export const vEvenementSupport = v.union(
	v.literal('PASSE'),
	v.literal('REJOINT'),
	v.literal('TERMINEE'),
	v.literal('ROUVERTE'),
	v.literal('RELANCES_SUSPENDUES')
);

export const vSourcePhrase = v.object({
	genre: v.union(v.literal('ARTICLE'), v.literal('COMPTE'), v.literal('AUCUNE')),
	cle: v.optional(v.string())
});

export const vUsageSupport = v.object({
	tokensIn: v.number(),
	tokensOut: v.number(),
	cacheReadTokens: v.number(),
	coutEstime: v.number()
});

export const supportTables = {
	conversationsSupport: defineTable({
		organizationId: v.optional(v.id('organizations')),
		/** Le compte qui a ouvert la conversation : elle n'est lisible que par lui (et l'équipe). */
		auteurUserId: v.optional(v.string()),
		auteurNom: v.optional(v.string()),
		/** L'adresse d'un e-mail entrant, quand la conversation en est née. */
		adresse: v.optional(v.string()),
		canal: vCanalSupport,
		etat: vEtatConversation,
		issue: v.optional(vIssue),
		raisonDePassage: v.optional(vRaisonDePassage),
		acte: v.optional(vActe),
		sujet: v.optional(vSujet),
		/** La question en une phrase : la carte de l'accueil et la file de l'équipe. */
		titre: v.string(),
		/** L'écran d'où l'on vient (`ECRANS_D_AIDE`, liste fermée). */
		depuis: v.optional(v.string()),
		/** L'adresse du membre de l'équipe qui s'en occupe. */
		assigneA: v.optional(v.string()),
		/** Données personnelles, compte compromis : au seul FONDATEUR. */
		reserveeAuFondateur: v.optional(v.boolean()),
		prioritaire: v.optional(v.boolean()),
		/** L'expéditeur est prouvé (la session, ou un e-mail vérifié). */
		verifiee: v.boolean(),
		/** Le jeton de l'adresse de réponse `fil-<jeton>@` : jamais l'identifiant. */
		jeton: v.string(),
		plumeReflechitDepuis: v.optional(v.number()),
		passeeLe: v.optional(v.number()),
		premiereReponseHumaineLe: v.optional(v.number()),
		/** Le prénom du dernier membre de l'équipe qui a répondu : « Camille vous a répondu ». */
		repondantNom: v.optional(v.string()),
		/** La durée de la première réponse humaine, en minutes OUVRÉES, figée. */
		premiereReponseOuvreeMin: v.optional(v.number()),
		termineeLe: v.optional(v.number()),
		dernierMessageLe: v.number(),
		dernierMessagePar: vAuteurSupport,
		luParAuteurLe: v.optional(v.number()),
		luParEquipeLe: v.optional(v.number()),
		/** Les « Pas vraiment » consécutifs sous les réponses de Plume. */
		nonsConsecutifs: v.number(),
		avis: v.optional(
			v.object({ utile: v.boolean(), motif: v.optional(v.string()), le: v.number() })
		),
		rappelLe: v.optional(v.number()),
		/** Les « Oui, merci » et « Pas vraiment » sous les réponses de Plume : son taux, dans la mesure. */
		ouiPlume: v.optional(v.number()),
		nonPlume: v.optional(v.number()),
		/** La durée de la conversation en minutes ouvrées, quand l'équipe la termine. */
		resolutionOuvreeMin: v.optional(v.number()),
		creeeLe: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_auteur', ['auteurUserId', 'dernierMessageLe'])
		.index('by_jeton', ['jeton'])
		.index('by_etat_and_dernier', ['etat', 'dernierMessageLe'])
		.index('by_creee', ['creeeLe']),

	messagesSupport: defineTable({
		conversationId: v.id('conversationsSupport'),
		organizationId: v.optional(v.id('organizations')),
		auteur: vAuteurSupport,
		auteurUserId: v.optional(v.string()),
		/** Le nom montré : le prénom choisi par un membre de l'équipe, jamais son adresse. */
		auteurNom: v.optional(v.string()),
		canal: vCanalSupport,
		genre: vGenreMessage,
		texte: v.string(),
		/** Un e-mail entier, avant la coupure de la citation, plafonné. */
		texteEntier: v.optional(v.string()),
		/** Les phrases de Plume, chacune avec sa source. */
		phrases: v.optional(v.array(v.object({ texte: v.string(), source: vSourcePhrase }))),
		ecrans: v.optional(v.array(v.string())),
		/** Une réponse composée par le code : l'arrêt des envois, ses deux cartes. */
		carte: v.optional(v.literal('ARRETER_LES_ENVOIS')),
		evenement: v.optional(vEvenementSupport),
		masques: v.optional(
			v.array(
				v.object({
					genre: v.union(v.literal('IBAN'), v.literal('CARTE'), v.literal('CLE')),
					nombre: v.number()
				})
			)
		),
		/** Sous une réponse de Plume : le « Oui, merci » ou le « Pas vraiment » du gérant. */
		avis: v.optional(v.union(v.literal('OUI'), v.literal('NON'))),
		questionDeDossier: v.optional(v.boolean()),
		retireLe: v.optional(v.number()),
		retirePar: v.optional(v.string()),
		usage: v.optional(vUsageSupport),
		/** L'e-mail qui portera cette réponse de l'équipe, annulé si elle est lue avant. */
		emailProgramme: v.optional(v.id('_scheduled_functions')),
		/** `AAAA-MM` : le budget de Plume se compte au mois. */
		mois: v.string(),
		le: v.number()
	})
		.index('by_conversation', ['conversationId', 'le'])
		.index('by_org', ['organizationId'])
		.index('by_org_and_mois', ['organizationId', 'mois'])
		.index('by_auteur_and_mois', ['auteur', 'mois'])
		.index('by_auteur_user_and_le', ['auteurUserId', 'le']),

	/**
	 * LES E-MAILS ENTRANTS (spec § 5.2), une ligne par `email_id` de Resend : la
	 * réception est idempotente, une lecture qui échoue se reprend (cinq essais), et rien
	 * n'est jeté. Ni corps ni HTML ici : le texte va dans le message, s'il entre quelque part.
	 */
	emailsEntrants: defineTable({
		emailId: v.string(),
		organizationId: v.optional(v.id('organizations')),
		etat: v.union(
			v.literal('A_LIRE'),
			v.literal('LU'),
			v.literal('ECHEC'),
			v.literal('IGNORE'),
			v.literal('INDESIRABLE')
		),
		essais: v.number(),
		prochainEssaiLe: v.optional(v.number()),
		classement: v.optional(v.string()),
		conversationId: v.optional(v.id('conversationsSupport')),
		de: v.optional(v.string()),
		objet: v.optional(v.string()),
		authentification: v.optional(v.string()),
		recuLe: v.number()
	})
		.index('by_email_id', ['emailId'])
		.index('by_etat', ['etat', 'recuLe'])
		.index('by_org', ['organizationId'])
		.index('by_recu', ['recuLe']),

	reponsesEnregistrees: defineTable({
		titre: v.string(),
		texte: v.string(),
		sujet: v.optional(vSujet),
		creePar: v.string(),
		creeLe: v.number(),
		majLe: v.number()
	}).index('by_titre', ['titre']),

	/**
	 * Les réponses de Plume support, comptées au mois : une ligne par établissement, et
	 * une ligne sans établissement pour le plafond de tous. Un compteur plutôt qu'un
	 * balayage des messages : le plafond se lit à chaque message envoyé.
	 */
	compteursSupport: defineTable({
		organizationId: v.optional(v.id('organizations')),
		mois: v.string(),
		reponses: v.number()
	})
		.index('by_org', ['organizationId'])
		.index('by_org_and_mois', ['organizationId', 'mois']),

	/**
	 * LA MESURE, MATÉRIALISÉE CHAQUE HEURE (`support/mesure.ts`) : un seul document. Il ne
	 * garde AUCUN texte de gérant (les lacunes y sont des identifiants, leurs titres se lisent
	 * en direct) : une conversation purgée en sort au calcul suivant, sans rien laisser.
	 */
	mesuresSupport: defineTable({
		calculeeLe: v.number(),
		entonnoir: v.object({
			conversations: v.number(),
			resoluesParPlume: v.number(),
			passees: v.number(),
			resoluesParLEquipe: v.number(),
			sansNouvelles: v.number()
		}),
		precedent: v.object({
			conversations: v.number(),
			resoluesParPlume: v.number(),
			passees: v.number(),
			resoluesParLEquipe: v.number(),
			sansNouvelles: v.number()
		}),
		medianes: v.object({
			premiereReponseH: v.union(v.number(), v.null()),
			resolutionH: v.union(v.number(), v.null()),
			reponses: v.number()
		}),
		tauxDeOuiPlume: v.union(v.number(), v.null()),
		satisfaction: v.union(v.number(), v.null()),
		parSujet: v.array(v.object({ sujet: vSujet, conversations: v.number(), passees: v.number() })),
		lacunes: v.array(
			v.object({
				id: v.id('conversationsSupport'),
				sujet: v.optional(vSujet),
				raison: v.union(v.literal('LACUNE'), v.literal('REFUS'))
			})
		)
	}),

	/** Un seul document : les réglages de l'équipe (son absence annoncée). */
	reglagesSupport: defineTable({
		absentJusquAu: v.optional(v.number()),
		majPar: v.string(),
		majLe: v.number()
	})
};

type Egal<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Vrai<T extends true> = T;
/** Les validateurs et les listes de la logique pure disent la même chose (vérifié à la compilation). */
export type VerificationDesListes = [
	Vrai<Egal<Infer<typeof vRaisonDePassage>, RaisonDePassage>>,
	Vrai<Egal<Infer<typeof vActe>, Acte>>,
	Vrai<Egal<Infer<typeof vSujet>, Sujet>>
];
