import {
	DUREE_ESSAI_JOURS,
	GRILLE,
	JOURS_DE_REMBOURSEMENT,
	LIMITES,
	RAPPELS_AVANT_PRELEVEMENT_JOURS
} from '../config/tarifs';
import { getLegalEmailAddress } from '../config/legal';
import { HEURES_D_ENVOI, PLAN_PAR_DEFAUT } from '../verticales/recouvrement/plan-relance';
import { dureePourRetenir, FORMATS_LUS, LOGICIELS_BRANCHES } from '../../marketing/fonctionnalites';
import { HORAIRES_DU_SUPPORT } from './horaires';
import type { Sujet } from './sujets';

/**
 * LA BASE D'AIDE DE PLUME SUPPORT (16/10/2026).
 *
 * Ce que Plume sait du logiciel, en mots du gérant, chaque réponse avec l'écran qui règle la
 * question. ⚠️ AUCUN CHIFFRE TAPÉ : les prix, l'essai, les heures d'envoi, le plan de relance,
 * les logiciels se lisent sur les constantes que le produit applique ; une constante qui change
 * change la réponse. ⚠️ AUCUN DROIT : ni valeur juridique, ni voie de justice (ligne rouge
 * n° 3) ; une question de droit mène au Plume de l'espace ou à la Défense.
 *
 * Le texte entier part dans le prompt système de Plume support, figé et mis en cache : il doit
 * être déterministe (aucune date, aucun hasard).
 */

/** Les écrans où mène une réponse : une liste FERMÉE, que l'écran traduit en lien du routeur. */
export const ECRANS_D_AIDE = {
	ACCUEIL: { vers: '/app', libelle: 'Aujourd’hui' },
	PILOTE: { vers: '/app', libelle: 'Aujourd’hui › Le pilote' },
	COFFRE: { vers: '/app/coffre', libelle: 'Coffre-fort' },
	DEPOT: { vers: '/app/coffre', recherche: { deposer: 1 }, libelle: 'Ajouter des factures' },
	CONNEXIONS: { vers: '/app/compte', recherche: { ouvrir: 'connexions' }, libelle: 'Compte › Connexions' },
	FORMULE: { vers: '/app/compte', recherche: { ouvrir: 'facturation' }, libelle: 'Compte › Votre formule' },
	EQUIPE: { vers: '/app/compte', recherche: { ouvrir: 'equipe' }, libelle: 'Compte › Équipe' },
	SECURITE: { vers: '/app/compte', recherche: { ouvrir: 'securite' }, libelle: 'Compte › Sécurité' },
	DONNEES: { vers: '/app/compte', recherche: { ouvrir: 'donnees' }, libelle: 'Compte › Vos données' },
	ETABLISSEMENT: {
		vers: '/app/compte',
		recherche: { ouvrir: 'etablissement' },
		libelle: 'Compte › Votre établissement'
	},
	PLUME: { vers: '/app/pilote', libelle: 'Plume, dans votre espace' },
	DOSSIERS: { vers: '/app/dossiers', libelle: 'Dossiers' },
	CLIENTS: { vers: '/app/clients', libelle: 'Clients' },
	DEFENSE: { vers: '/app/defense', libelle: 'Défense' },
	SANTE: { vers: '/app/risque', libelle: 'Santé des clients' },
	NOTIFICATIONS: { vers: '/app/notifications', libelle: 'Notifications' },
	MOT_DE_PASSE: { vers: '/mot-de-passe-oublie', libelle: 'Mot de passe oublié' }
} as const satisfies Record<
	string,
	{ vers: string; recherche?: Readonly<Record<string, string | number>>; libelle: string }
>;
export type EcranDAide = keyof typeof ECRANS_D_AIDE;

export interface ArticleDAide {
	readonly cle: string;
	readonly sujet: Sujet;
	readonly question: string;
	/** Les mots que tape un gérant qui la cherche, au-delà de la question elle-même. */
	readonly motsCles: readonly string[];
	readonly reponse: string;
	readonly ecran?: EcranDAide;
}

const formule = (cle: keyof typeof GRILLE) =>
	`${GRILLE[cle].nom} (${GRILLE[cle].mensuel} € HT par mois, ou ${GRILLE[cle].annuel} € HT par an)`;
const logicielsDeGenre = (genre: string) =>
	LOGICIELS_BRANCHES.filter((l) => l.genre === genre)
		.map((l) => l.nom)
		.join(', ');
const planEnMots = PLAN_PAR_DEFAUT.filter((e) => e.automatique)
	.map((e, i) =>
		i === 0
			? `${e.nom.toLowerCase()} ${e.attente} jours après l’échéance`
			: `${e.nom.toLowerCase()} ${e.attente} jours plus tard`
	)
	.join(', puis ');
const etapeManuelle = PLAN_PAR_DEFAUT.find((e) => !e.automatique);

export const ARTICLES: readonly ArticleDAide[] = [
	{
		cle: 'relances-rien-parti',
		sujet: 'RELANCES',
		question: 'Pourquoi rien n’est encore parti ?',
		motsCles: ['relance', 'envoi', 'rien parti', 'pas parti', 'activer', 'automatique'],
		reponse: `Les relances ne partent seules qu’une fois activées par un administrateur, depuis le bloc « Le pilote » de l’accueil, et seulement sur les dossiers que vous avez démarrés. Elles partent en semaine, de ${HEURES_D_ENVOI.de} h à ${HEURES_D_ENVOI.a} h, heure de Paris. Il faut aussi l’adresse e-mail de votre client et la vôtre : ce qui manque s’affiche dans vos notifications. Avec la formule gratuite Découverte, rien ne part : elle mesure ce qu’on vous doit.`,
		ecran: 'PILOTE'
	},
	{
		cle: 'plan-de-relance',
		sujet: 'RELANCES',
		question: 'Quelles relances partent, et quand ?',
		motsCles: ['plan', 'rappel', 'lettre officielle', 'étapes', 'calendrier'],
		reponse: `Le plan suit cet ordre : ${planEnMots}. Chaque étape attend la précédente. ${etapeManuelle === undefined ? '' : `La ${etapeManuelle.nom.toLowerCase()} ne se fait jamais seule : c’est vous qui la décidez.`} La page d’un dossier dit sa prochaine étape et sa date.`,
		ecran: 'DOSSIERS'
	},
	{
		cle: 'retenir-relance',
		sujet: 'RELANCES',
		question: 'Comment arrêter une relance avant qu’elle parte ?',
		motsCles: ['retenir', 'arrêter', 'annuler', 'bloquer', 'stopper'],
		reponse: `Chaque relance s’affiche ${dureePourRetenir()} avant de partir, sur l’accueil et dans son dossier, avec le bouton « Retenir ». Retenir retire ce client du pilote : plus rien ne part pour lui tant que vous ne l’y remettez pas, depuis sa fiche. Un paiement noté entre-temps arrête aussi la relance.`,
		ecran: 'PILOTE'
	},
	{
		cle: 'horaires-envoi',
		sujet: 'RELANCES',
		question: 'À quelle heure partent les relances ?',
		motsCles: ['heure', 'horaire', 'week-end', 'nuit', 'samedi', 'dimanche'],
		reponse: `En semaine, de ${HEURES_D_ENVOI.de} h à ${HEURES_D_ENVOI.a} h, heure de Paris : une relance prévue un samedi part le lundi matin. Elles partent à votre nom, depuis votre adresse de réponse : les réponses de vos clients arrivent chez vous.`,
		ecran: 'PILOTE'
	},
	{
		cle: 'ajouter-factures',
		sujet: 'FACTURES_DOCUMENTS',
		question: 'Comment ajouter mes factures ?',
		motsCles: ['importer', 'déposer', 'fichier', 'pdf', 'photo', 'fec', 'factur-x', 'upload'],
		reponse: `Trois chemins : déposer des fichiers (${FORMATS_LUS.join(', ')}) au coffre-fort, brancher votre logiciel de facturation, ou votre banque. Chaque document est scellé à son arrivée puis lu ; le bilan dit ce qui est entré et ce qui ne l’est pas, ligne par ligne.`,
		ecran: 'DEPOT'
	},
	{
		cle: 'document-pas-entre',
		sujet: 'FACTURES_DOCUMENTS',
		question: 'Un de mes documents n’est pas entré',
		motsCles: ['pas entré', 'échec', 'refusé', 'illisible', 'lecture', 'bilan'],
		reponse: 'Le bilan du dépôt, au coffre-fort, dit pour chaque ligne pourquoi elle n’est pas entrée : format non lu, document en double, ligne sans montant ou sans client. Corrigez le fichier puis redéposez-le ; un document resté sans nouvelle trop longtemps se retire de lui-même et peut être redéposé.',
		ecran: 'COFFRE'
	},
	{
		cle: 'connexion-erreur',
		sujet: 'CONNEXIONS',
		question: 'Ma connexion à un logiciel ne lit plus rien',
		motsCles: ['connexion', 'pennylane', 'qonto', 'quickbooks', 'xero', 'sellsy', 'stripe', 'zoho', 'synchro', 'erreur'],
		reponse: 'Ouvrez Compte › Connexions : chaque logiciel branché y dit sa dernière lecture et, s’il y en a une, son erreur. Une autorisation expirée se renouvelle en le rebranchant ; vos factures déjà lues restent là. Si l’erreur persiste après un nouveau branchement, l’équipe regarde.',
		ecran: 'CONNEXIONS'
	},
	{
		cle: 'logiciels-branches',
		sujet: 'CONNEXIONS',
		question: 'Quels logiciels peut-on brancher ?',
		motsCles: ['logiciel', 'intégration', 'brancher', 'comptabilité', 'banque', 'drive', 'dropbox'],
		reponse: `Côté facturation et comptabilité : ${logicielsDeGenre('comptabilite')}. Côté banque : ${logicielsDeGenre('banque')}. Pour déposer des fichiers depuis un service en ligne : ${logicielsDeGenre('fichiers')}. Les factures lues ne sont gardées que chez Letikette.`,
		ecran: 'CONNEXIONS'
	},
	{
		cle: 'formules',
		sujet: 'ABONNEMENT',
		question: 'Quelles sont les formules et leurs prix ?',
		motsCles: ['prix', 'tarif', 'formule', 'abonnement', 'coût', 'combien', 'solo', 'équipe', 'pro', 'découverte'],
		reponse: `Découverte est gratuite : vous voyez ce qu’on vous doit, rien ne part. Puis ${formule('solo')}, ${formule('equipe')} et ${formule('pro')} ; l’année se paie dix mois. Les formules diffèrent par le nombre de clients relancés en même temps (${LIMITES.solo.clientsSuivis} en Solo, ${LIMITES.equipe.clientsSuivis} en Équipe, sans limite en Pro) et de personnes dans l’établissement (${LIMITES.solo.utilisateurs}, ${LIMITES.equipe.utilisateurs}, ${LIMITES.pro.utilisateurs}).`,
		ecran: 'FORMULE'
	},
	{
		cle: 'essai',
		sujet: 'ABONNEMENT',
		question: 'Comment marche l’essai, et quand serai-je prélevé ?',
		motsCles: ['essai', 'gratuit', 'prélèvement', 'prélevé', 'carte', 'fin de l’essai'],
		reponse: `L’essai dure ${DUREE_ESSAI_JOURS} jours, une fois par établissement ; votre carte est enregistrée chez Paddle, notre vendeur, et rien n’est prélevé pendant l’essai. Vous êtes prévenu ${RAPPELS_AVANT_PRELEVEMENT_JOURS.join(' puis ')} jours avant le premier prélèvement. La date exacte est dans Compte › Votre formule.`,
		ecran: 'FORMULE'
	},
	{
		cle: 'changer-formule',
		sujet: 'ABONNEMENT',
		question: 'Comment changer de formule ?',
		motsCles: ['changer', 'passer à', 'monter', 'descendre', 'prorata', 'upgrade'],
		reponse: 'Dans Compte › Votre formule : le montant au prorata s’affiche avant que vous confirmiez, et le changement vaut tout de suite.',
		ecran: 'FORMULE'
	},
	{
		cle: 'resilier',
		sujet: 'ABONNEMENT',
		question: 'Comment résilier ?',
		motsCles: ['résilier', 'résiliation', 'arrêter', 'annuler', 'abonnement', 'désabonner'],
		reponse: `En deux gestes, dans Compte › Votre formule, sans compte à rebours : vous gardez l’accès jusqu’à la fin de la période payée. Dans les ${JOURS_DE_REMBOURSEMENT} jours qui suivent un premier paiement, l’équipe peut vous rembourser : demandez-le-lui.`,
		ecran: 'FORMULE'
	},
	{
		cle: 'facture-abonnement',
		sujet: 'ABONNEMENT',
		question: 'Où trouver la facture de mon abonnement ?',
		motsCles: ['facture', 'reçu', 'paddle', 'tva', 'justificatif'],
		reponse: 'Paddle, qui vend l’abonnement, émet vos factures ; elles se téléchargent depuis Compte › Votre formule, qui ouvre votre espace de facturation.',
		ecran: 'FORMULE'
	},
	{
		cle: 'inviter-collegue',
		sujet: 'COMPTE_ACCES',
		question: 'Comment inviter un collègue ?',
		motsCles: ['inviter', 'collègue', 'membre', 'utilisateur', 'ajouter quelqu’un', 'accès'],
		reponse: `Depuis Compte › Équipe : un administrateur invite par e-mail, et choisit administrateur ou membre. Le nombre de personnes dépend de la formule (${LIMITES.decouverte.utilisateurs} en Découverte, ${LIMITES.solo.utilisateurs} en Solo, ${LIMITES.equipe.utilisateurs} en Équipe, ${LIMITES.pro.utilisateurs} en Pro).`,
		ecran: 'EQUIPE'
	},
	{
		cle: 'mot-de-passe',
		sujet: 'COMPTE_ACCES',
		question: 'J’ai oublié mon mot de passe',
		motsCles: ['mot de passe', 'oublié', 'connexion', 'se connecter', 'réinitialiser'],
		reponse: 'La page « Mot de passe oublié » envoie un lien de réinitialisation à votre adresse. Ni Plume ni l’équipe ne changent l’adresse ou le mot de passe d’un compte sur demande écrite : c’est ce qui protège le vôtre.',
		ecran: 'MOT_DE_PASSE'
	},
	{
		cle: 'double-authentification',
		sujet: 'COMPTE_ACCES',
		question: 'Comment activer la double authentification ?',
		motsCles: ['double authentification', '2fa', 'code', 'sécurité', 'authentificateur'],
		reponse: 'Dans Compte › Sécurité : votre mot de passe, puis le code à scanner avec une application d’authentification, puis un code à six chiffres. Gardez les codes de secours qui s’affichent : ils servent si vous perdez votre téléphone.',
		ecran: 'SECURITE'
	},
	{
		cle: 'plume-que-fait-il',
		sujet: 'PLUME',
		question: 'Que fait Plume ?',
		motsCles: ['plume', 'assistant', 'pilote', 'ia', 'automatique'],
		reponse: 'Dans votre espace, Plume prépare vos dossiers, relance vos clients quand vous l’avez activé, et répond sur vos dossiers en citant ses sources ; chaque geste qu’il propose attend votre « Confirmer ». Ici, dans l’aide, il répond sur le logiciel et votre compte, sans lire vos dossiers.',
		ecran: 'PLUME'
	},
	{
		cle: 'question-de-dossier',
		sujet: 'PLUME',
		question: 'J’ai une question sur un de mes dossiers',
		motsCles: ['dossier', 'client', 'facture impayée', 'montant', 'combien me doit'],
		reponse: 'Posez-la à Plume dans votre espace : là, il lit vos dossiers et répond avec leurs chiffres. Ici, ni Plume ni l’équipe ne voient vos dossiers ; si c’est un souci technique sur un dossier, décrivez-le sans nom ni montant et l’équipe regarde.',
		ecran: 'PLUME'
	},
	{
		cle: 'page-de-paiement',
		sujet: 'RELANCES',
		question: 'Comment mon client me paie-t-il ?',
		motsCles: ['payer', 'paiement', 'virement', 'iban', 'lien', 'qr'],
		reponse: 'Par virement, directement sur votre compte : la lettre peut porter un lien vers une page qui affiche votre IBAN, le montant et la référence. Letikette ne touche jamais l’argent, et rien n’y nomme le logiciel.',
		ecran: 'DOSSIERS'
	},
	{
		cle: 'avis-juridique',
		sujet: 'AUTRE',
		question: 'Pouvez-vous me dire ce que je peux réclamer ?',
		motsCles: ['réclamer', 'droit', 'avocat', 'juridique', 'conseil', 'pénalités', 'indemnité', 'loi'],
		reponse: 'Ni Plume ni l’équipe ne donnent d’avis juridique. Dans votre espace, chaque dossier montre ce que dit la loi et le calcul de ce qui est dû, avec ses sources ; pour un avis, l’écran Défense propose des professionnels près de votre client.',
		ecran: 'DEFENSE'
	},
	{
		cle: 'sante-clients',
		sujet: 'AUTRE',
		question: 'À quoi sert la santé de mes clients ?',
		motsCles: ['santé', 'risque', 'solvabilité', 'indice', 'analyse'],
		reponse: `Elle rassemble ce que publient les registres sur une entreprise (comptes, procédures, dirigeants), chaque fait avec sa source. Le nombre d’analyses par mois dépend de la formule (${LIMITES.solo.analysesParMois} en Solo, ${LIMITES.equipe.analysesParMois} en Équipe, ${LIMITES.pro.analysesParMois} en Pro).`,
		ecran: 'SANTE'
	},
	{
		cle: 'donnees-export-suppression',
		sujet: 'DONNEES_PERSONNELLES',
		question: 'Comment exporter ou supprimer mes données ?',
		motsCles: ['exporter', 'supprimer', 'effacer', 'données', 'rgpd', 'compte'],
		reponse: 'Depuis Compte › Vos données : l’export de ce que vous avez déposé, et la suppression de l’établissement, qui efface tout, documents compris. Pour toute autre demande sur vos données personnelles, l’équipe répond.',
		ecran: 'DONNEES'
	},
	{
		cle: 'securite-documents',
		sujet: 'FACTURES_DOCUMENTS',
		question: 'Mes documents sont-ils protégés ?',
		motsCles: ['sécurité', 'chiffrement', 'protégé', 'hébergement', 'confidentialité'],
		reponse: 'Chaque document est chiffré dès son arrivée, sous une clé propre à votre établissement, et ne s’ouvre que par votre session ; chaque ouverture est notée. La base de données est chez Convex, aux États-Unis. Nos serveurs détiennent les clés : ce n’est pas un chiffrement qui nous en empêcherait l’accès.',
		ecran: 'COFFRE'
	},
	{
		cle: 'joindre-equipe',
		sujet: 'AUTRE',
		question: 'Comment joindre l’équipe ?',
		motsCles: ['équipe', 'humain', 'contact', 'e-mail', 'joindre', 'téléphone'],
		reponse: `Ici même : « Parler à quelqu’un » passe votre question à l’équipe, qui répond dans ce fil et par e-mail, en semaine de ${HORAIRES_DU_SUPPORT.de} h à ${HORAIRES_DU_SUPPORT.a} h. Vous pouvez aussi écrire à ${getLegalEmailAddress()} : même équipe, même fil.`
	}
];

function plat(texte: string): string {
	return texte
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[’']/g, ' ')
		.toLowerCase();
}

/** Les articles qui répondent à ce qui est tapé, du plus pertinent au moins pertinent. */
export function chercherArticles(texte: string, limite = 5): ArticleDAide[] {
	const mots = plat(texte)
		.split(/[^a-z0-9]+/)
		.filter((m) => m.length >= 3);
	if (mots.length === 0) return [];
	return ARTICLES.map((article) => {
		const meule = plat(`${article.question} ${article.motsCles.join(' ')}`);
		const score = mots.reduce((s, mot) => s + (meule.includes(mot) ? 1 : 0), 0);
		return { article, score };
	})
		.filter((r) => r.score > 0)
		.sort((a, b) => b.score - a.score)
		.slice(0, limite)
		.map((r) => r.article);
}

/** La base d'aide en un texte stable, pour le prompt système de Plume support. */
export function connaissanceDeLAide(): string {
	return ARTICLES.map(
		(a) =>
			`[${a.cle}] ${a.question}\n${a.reponse}${a.ecran === undefined ? '' : `\nÉcran : ${a.ecran} (${ECRANS_D_AIDE[a.ecran].libelle})`}`
	).join('\n\n');
}
