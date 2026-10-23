import { pluriel } from '../../../socle/francais';

/**
 * PLUME SUR CHAQUE ÉCRAN — ce qu'il dit, et quand il se tait (13/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE MODULE : « UN VRAI COMPAGNON, PAS UN CHAT »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur, après un retour du terrain : « Plume doit être un vrai agent qui
 * assiste l'utilisateur partout dans l'App […] au lieu de simplement être dans un
 * chat ». Plume vivait dans la barre, et il ne parlait que si on l'ouvrait. Chez
 * Alan, Mo parle depuis la barre du bas, dans une bulle (relevé sur Mobbin le
 * 13/10) ; chez Rocket Money et Credit Karma, la recommandation se pose sur
 * l'écran qui la concerne, avec un geste et un « Plus tard ».
 *
 * Plume dit donc, sur chaque écran, UNE chose, dans une bulle au-dessus de lui.
 * Ce module décide laquelle. Il ne connaît ni React ni Convex : l'écran lui
 * donne ce qu'il a déjà lu, et il rend les remarques possibles, la plus utile
 * d'abord.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LES QUATRE RÈGLES DE CE QU'IL DIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   1. IL NE REDIT PAS L'ÉCRAN. Il dit ce que l'écran ne dit pas : ce qui lui
 *      manque pour travailler, un lien entre deux faits, ce qu'il peut faire
 *      ensuite. La page d'un dossier porte déjà ce que fait Plume en tête : il
 *      s'y tait.
 *   2. CE QU'IL PROPOSE, IL SAIT LE FAIRE. Chaque remarque qui appelle un geste
 *      le porte (`action`), et ce geste ne fait rien de plus que l'écran : il
 *      prépare, il ouvre, il reprend. Rien ne part sans le gérant.
 *   3. IL SE TAIT QUAND ON LE LUI DIT. Le ✕ fait taire une remarque pour de bon
 *      (`AU_REFUS`) ; une présentation ne se dit qu'une fois (`UNE_FOIS`). La clé
 *      porte la situation : un fait NOUVEAU fait une clé nouvelle, et Plume peut
 *      en reparler.
 *   4. LIGNE ROUGE N° 3. Il ne dit jamais qu'une condition est remplie, ni qu'il
 *      faudrait agir en justice ; la santé d'un client se dit par des faits, et
 *      le choix de livrer reste au gérant.
 */

/** Les écrans où Plume peut parler. La page d'un dossier n'en est pas : voir la règle 1. */
export type EcranDePlume =
	| 'AUJOURDHUI'
	| 'DOSSIERS'
	| 'CLIENTS'
	| 'CLIENT'
	| 'COFFRE'
	| 'SANTE'
	| 'SANTE_CLIENT'
	| 'DEFENSE';

/**
 * OÙ MÈNE CE QUE PLUME PROPOSE — dit en intention ; l'application en fait une route
 * ou un geste. Ce module ne connaît pas le routeur.
 */
export type CibleDePlume =
	| { readonly genre: 'CONVERSATION' }
	| { readonly genre: 'NOTIFICATIONS' }
	| { readonly genre: 'AUJOURDHUI' }
	| { readonly genre: 'DEMARRER_LOT' }
	| { readonly genre: 'DEPOSER' }
	| { readonly genre: 'DOSSIER'; readonly dossier: string; readonly rubrique?: 'courriers' }
	| { readonly genre: 'CLIENT'; readonly client: string; readonly rubrique?: 'identite' }
	| { readonly genre: 'SANTE'; readonly client: string }
	| { readonly genre: 'REMETTRE_AU_PILOTE'; readonly client: string }
	| { readonly genre: 'PREPARER_RELANCE'; readonly dossier: string; readonly client: string }
	/** « Logo et couleurs », la page pleine du compte (23/10/2026). */
	| { readonly genre: 'MARQUE' };

/** Quand Plume cesse d'en parler. */
export type Silence =
	/** Au ✕ seulement : tant qu'on ne l'a pas fait taire, il peut le redire à une autre visite. */
	| 'AU_REFUS'
	/** Dès qu'il l'a dit : une présentation, un bonjour. */
	| 'UNE_FOIS';

export type HumeurDeRemarque = 'content' | 'attention' | 'salue' | 'fete' | 'ecrit';

export interface RemarqueDePlume {
	/** Stable, et porteuse de la situation : `sans-email:<client>`, `a-demarrer:3`. */
	readonly cle: string;
	/** À la première personne, en une ou deux phrases. Jamais de tiret long. */
	readonly texte: string;
	/**
	 * La tête qu'il fait en le disant : `attention` quand quelque chose attend le
	 * gérant, `salue` pour un bonjour, `fete` pour de l'argent rentré ou une journée
	 * bouclée, `ecrit` pour une lettre, `content` sinon.
	 */
	readonly humeur: HumeurDeRemarque;
	readonly silence: Silence;
	readonly action?: { readonly libelle: string; readonly cible: CibleDePlume };
}

/* ─────────────────────────────────────────────────────────────────────────
   Les présentations : ce que Plume fait ici, dit une fois, à la première visite.
   ───────────────────────────────────────────────────────────────────────── */

const PRESENTATIONS: Readonly<Record<EcranDePlume, string>> = {
	AUJOURDHUI:
		'Je relis vos factures, j’ouvre le dossier de chaque client en retard et je prépare ses relances. Quand j’ai quelque chose à vous dire, je sors vous le dire ici.',
	DOSSIERS:
		'Ici, un dossier par client en retard. Je les prépare ; dès que vous en démarrez un, je suis son plan de relance.',
	CLIENTS:
		'Tous vos clients, celui qui vous doit le plus en tête. Sur chaque fiche, je vous dis ce qui me manque pour bien le suivre.',
	CLIENT:
		'Ici, tout ce que ce client vous doit et tout ce que je sais de lui. Touchez-moi pour me parler de lui.',
	COFFRE:
		'Chaque document est scellé à son arrivée. Déposez une facture : je la lis et je la range chez son client.',
	SANTE:
		'Je lis les comptes publics de vos clients pour vous montrer lesquels méritent un regard. Je ne décide rien : c’est vous qui choisissez de livrer.',
	SANTE_CLIENT:
		'L’indice part de 50, et chaque fait l’ajoute ou le retire. Touchez un fait pour voir sa source.',
	DEFENSE:
		'Votre équipe, et les professionnels près de chez vos clients. Je ne choisis personne à votre place.'
};

/** La présentation de l'écran, avec le nom du pilote au premier écran. */
export function presentation(ecran: EcranDePlume, nomDuPilote: string): RemarqueDePlume {
	return {
		cle: `presentation:${ecran}`,
		texte:
			ecran === 'AUJOURDHUI'
				? `Bonjour, je suis ${nomDuPilote}. ${PRESENTATIONS[ecran]}`
				: PRESENTATIONS[ecran],
		humeur: ecran === 'AUJOURDHUI' ? 'salue' : 'content',
		silence: 'UNE_FOIS'
	};
}

/* ─────────────────────────────────────────────────────────────────────────
   Aujourd'hui.
   ───────────────────────────────────────────────────────────────────────── */

export interface DonneesDAujourdhui {
	/** `AAAA-MM-JJ`. */
	readonly aujourdHui: string;
	/** Le premier mot du nom du compte, s'il en a un. */
	readonly prenom: string | null;
	readonly dossiersSuivis: number;
	/**
	 * Les relances partent seules, et sans logo ni couleur (23/10/2026) : le client
	 * reçoit une lettre à son seul nom. Seul un administrateur peut y remédier, et
	 * c'est à lui seul que la route le pose.
	 */
	readonly relancesSansImage?: boolean;
}

/**
 * ⚠️ CE QUI ATTEND LE GÉRANT N'EST PLUS ICI (13/10/2026, au soir) : les dossiers
 * préparés, les lettres et les questions sont les défis de la JOURNÉE
 * (`journee.ts`), dits sur tous les écrans, et plus seulement sur celui-ci.
 *
 * ⚠️ LE BONJOUR NE DIT QUE CE QUI EST VRAI. « Je vous dis ici chaque chose que je
 * fais » : la bulle annonce ses travaux finis (`paroleDUnTravail`), sur tous les
 * écrans sauf celui-ci, où son bloc les montre déjà.
 */
/**
 * LA CLÉ DU BONJOUR D'UN JOUR — partagée avec le point du retour (`retour.ts`) : quand
 * le point dit déjà bonjour, celui d'Aujourd'hui se tait.
 */
export function cleDuBonjour(aujourdHui: string): string {
	return `bonjour:${aujourdHui}`;
}

export function remarquesDAujourdhui(
	donnees: DonneesDAujourdhui,
	nomDuPilote: string
): RemarqueDePlume[] {
	const suivis = donnees.dossiersSuivis;
	const bonjour: RemarqueDePlume = {
		cle: cleDuBonjour(donnees.aujourdHui),
		texte:
			`Bonjour${donnees.prenom === null ? '' : ` ${donnees.prenom}`}. ` +
			(suivis === 0
				? 'Je veille sur vos factures : je vous dis ici chaque chose que je fais.'
				: `Je veille sur ${suivis} dossier${pluriel(suivis)}, et je vous dis ici chaque chose que je fais.`),
		humeur: 'salue',
		silence: 'UNE_FOIS'
	};
	const remarques = [presentation('AUJOURDHUI', nomDuPilote), bonjour];
	if (donnees.relancesSansImage === true) {
		remarques.push({
			cle: 'sans-image',
			texte:
				'Vos relances partent avec votre seul nom en tête. Si vous me donnez votre logo, votre client reconnaîtra l’expéditeur avant de lire un montant.',
			humeur: 'ecrit',
			silence: 'AU_REFUS',
			action: { libelle: 'Ajouter mon logo', cible: { genre: 'MARQUE' } }
		});
	}
	return remarques;
}

/* ─────────────────────────────────────────────────────────────────────────
   Clients.
   ───────────────────────────────────────────────────────────────────────── */

export interface ClientPourPlume {
	readonly id: string;
	readonly nom: string;
	readonly email?: string;
	readonly siren?: string;
	readonly horsPilote: boolean;
	readonly facturesEchues: number;
}

/** Un client en retard que Plume relance, et à qui rien ne peut partir. */
function sansEmail(client: ClientPourPlume): boolean {
	return client.facturesEchues > 0 && !client.horsPilote && (client.email ?? '').trim() === '';
}

/**
 * La liste porte déjà l'habitude rompue de chaque client : Plume parle de ce
 * qu'elle ne montre pas, l'adresse et le numéro qui lui manquent.
 */
export function remarquesDesClients(
	clients: readonly ClientPourPlume[],
	nomDuPilote: string
): RemarqueDePlume[] {
	const muets = clients.filter(sansEmail);
	const premierMuet = muets[0];
	const anonymes = clients.filter((c) => c.facturesEchues > 0 && (c.siren ?? '').trim() === '');
	const premierAnonyme = anonymes[0];
	return garder([
		presentation('CLIENTS', nomDuPilote),
		premierMuet === undefined
			? null
			: {
					cle: `sans-email:${muets.length}:${premierMuet.id}`,
					texte:
						muets.length === 1
							? `Il me manque l’e-mail de ${premierMuet.nom}, en retard : ses relances ne peuvent pas lui partir.`
							: `Il me manque l’e-mail de ${muets.length} clients en retard, dont ${premierMuet.nom} : leurs relances ne peuvent pas leur partir.`,
					humeur: 'attention',
					silence: 'AU_REFUS',
					action: {
						libelle: 'Compléter sa fiche',
						cible: { genre: 'CLIENT', client: premierMuet.id, rubrique: 'identite' }
					}
				},
		premierAnonyme === undefined
			? null
			: {
					cle: `sans-siren:${anonymes.length}:${premierAnonyme.id}`,
					texte:
						anonymes.length === 1
							? `Il me manque le SIREN de ${premierAnonyme.nom} : sans lui, je ne vois pas ce que le registre publie sur son entreprise.`
							: `Il me manque le SIREN de ${anonymes.length} clients en retard, dont ${premierAnonyme.nom} : sans lui, je ne vois pas ce que le registre publie sur eux.`,
					humeur: 'attention',
					silence: 'AU_REFUS',
					action: {
						libelle: 'Le trouver',
						cible: { genre: 'CLIENT', client: premierAnonyme.id }
					}
				}
	]);
}

/* ─────────────────────────────────────────────────────────────────────────
   La fiche d'un client.
   ───────────────────────────────────────────────────────────────────────── */

export interface DonneesDUnClient extends ClientPourPlume {
	/** Son dossier ouvert, s'il en a un. */
	readonly dossierOuvert: string | null;
	/** Une facture due dont le retard sort de son habitude, la plus forte. */
	readonly rupture: {
		readonly reference: string;
		readonly habituelJours: number;
		readonly ecartJours: number;
	} | null;
	/** L'analyse de santé : branchée ou non, et faite ou non. */
	readonly sante: { readonly disponible: boolean; readonly analysee: boolean };
	/** Il vous doit quelque chose. */
	readonly doitDeLArgent: boolean;
}

export function remarquesDUnClient(
	client: DonneesDUnClient,
	nomDuPilote: string
): RemarqueDePlume[] {
	const rupture = client.rupture;
	return garder([
		presentation('CLIENT', nomDuPilote),
		client.horsPilote
			? {
					cle: `hors-pilote:${client.id}`,
					texte: `Je ne m’occupe plus de ${client.nom} : vous l’avez retiré de mon plan. Je le reprends quand vous voulez.`,
					humeur: 'content',
					silence: 'AU_REFUS',
					action: {
						libelle: 'Le reprendre',
						cible: { genre: 'REMETTRE_AU_PILOTE', client: client.id }
					}
				}
			: null,
		sansEmail(client)
			? {
					cle: `sans-email:${client.id}`,
					texte: 'Il me manque son e-mail : ses relances ne peuvent pas lui partir.',
					humeur: 'attention',
					silence: 'AU_REFUS',
					action: {
						libelle: 'L’ajouter',
						cible: { genre: 'CLIENT', client: client.id, rubrique: 'identite' }
					}
				}
			: null,
		rupture !== null && client.dossierOuvert !== null && !client.horsPilote
			? {
					cle: `rupture:${client.id}:${rupture.reference}`,
					texte: `Il paie d’habitude à ${rupture.habituelJours} jours ; sa facture ${rupture.reference} les dépasse de ${rupture.ecartJours} jours.`,
					humeur: 'attention',
					silence: 'AU_REFUS',
					action: {
						libelle: 'Préparer une relance',
						cible: { genre: 'PREPARER_RELANCE', dossier: client.dossierOuvert, client: client.nom }
					}
				}
			: null,
		client.sante.disponible &&
		!client.sante.analysee &&
		client.doitDeLArgent &&
		(client.siren ?? '').trim() !== ''
			? {
					cle: `sante:${client.id}`,
					texte: 'Je peux lire la santé de son entreprise dans ses comptes publics.',
					humeur: 'content',
					silence: 'AU_REFUS',
					action: { libelle: 'La lire', cible: { genre: 'SANTE', client: client.id } }
				}
			: null
	]);
}

/* ─────────────────────────────────────────────────────────────────────────
   Les écrans où Plume ne fait que se présenter.
   ───────────────────────────────────────────────────────────────────────── */

export function remarquesDeLEcran(
	ecran: 'DOSSIERS' | 'COFFRE' | 'SANTE' | 'SANTE_CLIENT' | 'DEFENSE',
	nomDuPilote: string
): RemarqueDePlume[] {
	return [presentation(ecran, nomDuPilote)];
}

/* ─────────────────────────────────────────────────────────────────────────
   Ce que Plume vient de faire, dit sur l'écran où l'on est.
   ───────────────────────────────────────────────────────────────────────── */

export interface TravailTermine {
	readonly id: string;
	/** Au présent, à la troisième personne : « Envoie le rappel à Durand ». */
	readonly titre: string;
	readonly bilan: string | null;
	readonly etat: 'FAIT' | 'ECHEC';
}

/**
 * LA PHRASE D'UN TRAVAIL FINI. `autres` compte les travaux finis en même temps,
 * dits en un mot plutôt qu'en cinq bulles : un collaborateur qui a envoyé cinq
 * rappels à neuf heures ne frappe pas cinq fois à la porte.
 */
export function paroleDUnTravail(travail: TravailTermine, autres: number): RemarqueDePlume {
	const encore =
		autres <= 0
			? ''
			: ` J’ai aussi fini ${autres === 1 ? 'un autre travail' : `${autres} autres travaux`}.`;
	if (travail.etat === 'ECHEC') {
		return {
			cle: `travail:${travail.id}`,
			texte: `Je n’ai pas pu finir « ${travail.titre} ». Je reprendrai à ma prochaine relecture.${encore}`,
			humeur: 'attention',
			silence: 'UNE_FOIS',
			action: { libelle: 'Voir', cible: { genre: 'CONVERSATION' } }
		};
	}
	return {
		cle: `travail:${travail.id}`,
		texte: `${travail.bilan ?? `C’est fait : « ${travail.titre} ».`}${encore}`,
		humeur: 'content',
		silence: 'UNE_FOIS',
		action: { libelle: 'Voir', cible: { genre: 'CONVERSATION' } }
	};
}

/**
 * DE L'ARGENT EST RENTRÉ — le moment que tout le produit attend, fêté. Le montant est
 * mis en forme par l'appelant, depuis les centimes.
 */
export function paroleDUnPaiement(id: string, client: string, montant: string): RemarqueDePlume {
	return {
		cle: `paiement:${id}`,
		texte: `${client} vient de vous payer ${montant}. Ses relances s’arrêtent sur ce qui est réglé.`,
		humeur: 'fete',
		silence: 'UNE_FOIS'
	};
}

/**
 * CE QU'IL FAIT ENSUITE — la ligne du bas de sa bulle, toujours vraie : la prochaine
 * relance programmée, et quand elle part. `quand` est mis en mots par l'appelant.
 */
export function ligneDeLaSuite(suite: {
	readonly etape: string;
	readonly client: string;
	readonly quand: string;
}): string {
	return `Ensuite : ${suite.etape.toLowerCase()} pour ${suite.client}, ${suite.quand}.`;
}

/**
 * UNE NOTIFICATION ARRIVÉE PENDANT QU'ON TRAVAILLE — Plume la porte, plutôt qu'une
 * cloche qui change de chiffre en haut d'un autre écran.
 */
export function paroleDUneNotification(id: string, titre: string): RemarqueDePlume {
	return {
		cle: `notification:${id}`,
		texte: `Du nouveau dans votre boîte de réception : « ${titre} ».`,
		humeur: 'attention',
		silence: 'UNE_FOIS',
		action: { libelle: 'Voir', cible: { genre: 'NOTIFICATIONS' } }
	};
}

/* ─────────────────────────────────────────────────────────────────────────
   Le regard : Plume s'ouvre en sachant d'où on lui parle.
   ───────────────────────────────────────────────────────────────────────── */

/**
 * D'OÙ L'ON PARLE À PLUME — l'écran qu'on regardait en le touchant, et le client
 * qu'il montrait. Relevé chez Fabric, monday et ClickUp (Mobbin, 13/10/2026) :
 * l'assistant s'ouvre sur « Ask about : cet élément », une pastille qu'un ✕
 * retire, et des questions faites pour lui.
 */
export interface RegardDePlume {
	readonly ecran: EcranDePlume;
	readonly client?: { readonly id: string; readonly nom: string };
}

/** La pastille au-dessus du compositeur : d'où l'on parle, en deux ou trois mots. */
export function libelleDuRegard(regard: RegardDePlume): string | null {
	const nom = regard.client?.nom;
	switch (regard.ecran) {
		case 'AUJOURDHUI':
			return null;
		case 'DOSSIERS':
			return 'Depuis vos dossiers';
		case 'CLIENTS':
			return 'Depuis vos clients';
		case 'CLIENT':
			return nom === undefined ? 'Depuis la fiche d’un client' : `Sur la fiche de ${nom}`;
		case 'COFFRE':
			return 'Depuis vos documents';
		case 'SANTE':
			return 'Depuis la santé de vos clients';
		case 'SANTE_CLIENT':
			return nom === undefined ? 'Depuis la santé d’un client' : `Sur la santé de ${nom}`;
		case 'DEFENSE':
			return 'Depuis votre équipe';
	}
}

/**
 * LES QUESTIONS PRÊTES, FAITES POUR L'ÉCRAN D'OÙ L'ON VIENT. Un toucher remplit le
 * champ sans l'envoyer, comme partout. Elles ne nomment aucune voie de droit.
 */
export function questionsDuRegard(regard: RegardDePlume): readonly string[] {
	const nom = regard.client?.nom;
	switch (regard.ecran) {
		case 'CLIENT':
			return nom === undefined
				? []
				: [
						`Où en est ${nom} ?`,
						`Prépare la prochaine relance de ${nom}`,
						`Comment ${nom} paie-t-il d’habitude ?`,
						`Note que ${nom} m’a appelé`
					];
		case 'SANTE_CLIENT':
			return nom === undefined
				? []
				: [`Qu’est-ce qui pèse sur ${nom} ?`, `Où en est ${nom} ?`, `Combien ${nom} me doit-il ?`];
		case 'DOSSIERS':
			return [
				'Quels dossiers attendent que je les démarre ?',
				'Qu’est-ce qui part cette semaine ?',
				'Quel est mon plus vieux dossier ?'
			];
		case 'CLIENTS':
			return ['Qui me doit le plus ?', 'Quels clients en retard n’ont pas d’e-mail ?'];
		case 'COFFRE':
			return ['Quels documents n’ont pas encore été lus ?', 'Montre-moi mes derniers dépôts'];
		case 'SANTE':
			return [
				'Lesquels de mes clients méritent un regard ?',
				'Qu’est-ce qui a changé ce mois-ci ?'
			];
		case 'DEFENSE':
			return ['Qui fait partie de mon équipe ?'];
		case 'AUJOURDHUI':
			return [];
	}
}

/** L'écran, dit au modèle à la troisième personne. */
const ECRAN_POUR_LE_MODELE: Readonly<Record<EcranDePlume, string>> = {
	AUJOURDHUI: 'l’accueil (Aujourd’hui)',
	DOSSIERS: 'la liste de ses dossiers',
	CLIENTS: 'la liste de ses clients',
	CLIENT: 'la fiche d’un client',
	COFFRE: 'le coffre de ses documents',
	SANTE: 'la santé de ses clients',
	SANTE_CLIENT: 'la santé d’un client',
	DEFENSE: 'son équipe et les professionnels près de ses clients'
};

/**
 * LA LIGNE QUE LE MODÈLE LIT : d'où le dirigeant lui parle, avec les identifiants à
 * recopier. Un client nommé porte son dossier ouvert, ou le fait qu'il n'en a pas.
 */
export function ligneDuRegard(regard: {
	readonly ecran: EcranDePlume;
	readonly client?: { readonly id: string; readonly nom: string; readonly dossier: string | null };
}): string {
	const ecran = ECRAN_POUR_LE_MODELE[regard.ecran];
	const client = regard.client;
	if (client === undefined) return `Il regardait ${ecran}.`;
	return (
		`Il regardait ${ecran} : ${client.nom} — identifiant CLIENT : ${client.id}` +
		(client.dossier === null
			? ' ; ce client n’a pas de dossier ouvert.'
			: ` ; son dossier ouvert — identifiant DOSSIER : ${client.dossier}.`)
	);
}

/** Les écrans d'où l'on peut parler à Plume, pour relire ce qui arrive d'une adresse. */
export const ECRANS_DE_PLUME: readonly EcranDePlume[] = [
	'AUJOURDHUI',
	'DOSSIERS',
	'CLIENTS',
	'CLIENT',
	'COFFRE',
	'SANTE',
	'SANTE_CLIENT',
	'DEFENSE'
];

/* ───────────────────────────────────────────────────────────────────────── */

function garder(remarques: readonly (RemarqueDePlume | null)[]): RemarqueDePlume[] {
	return remarques.filter((r): r is RemarqueDePlume => r !== null);
}
