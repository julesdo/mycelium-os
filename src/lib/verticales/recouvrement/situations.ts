import { depuisCentimes, versEuros } from '../../socle/montants';
import { dateLisible } from './calendrier';
import { finDeDelai } from './delais';
import { PARAMETRES, exiger } from './parametres';

/**
 * LES SITUATIONS — ce qui se pose PAR-DESSUS les quatre étapes.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TROIS CHOSES, ET JAMAIS UN CONSEIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une situation dit ce qui se passe, la date limite quand il y en a une, et ce
 * que le gérant peut faire. Les options sont présentées à égalité, dans un
 * ordre fixe ; « Ne rien faire pour l'instant » et « Classer » sont au même
 * rang que les autres. Aucune n'est recommandée : le choix revient au gérant, et
 * un avocat peut l'éclairer.
 *
 * ⚠️ UN POINT DE DÉPART QUE LE TEXTE NE NOMME PAS se calcule depuis l'événement
 * connu le plus précoce, et la situation le DIT.
 */

export type CleSituation = 'CONTESTATION' | 'PROCEDURE_COLLECTIVE' | 'PAIEMENT_PARTIEL' | 'RADIEE';

export interface DateLimiteSituation {
	readonly date: string;
	readonly libelle: string;
	/** Le jour où le délai aurait fini sans le report au premier jour ouvrable. */
	readonly reporteeDe: string | null;
	/** Quand le texte ne nomme pas le point de départ : d'où le calcul est parti. */
	readonly departNonPrecise: string | null;
	readonly source: string;
}

export interface Situation {
	readonly cle: CleSituation;
	readonly titre: string;
	readonly ceQuiSePasse: readonly string[];
	readonly dateLimite: DateLimiteSituation | null;
	/** À égalité, dans l'ordre chronologique d'un dossier. Aucune n'est principale. */
	readonly options: readonly string[];
	/** Une citation du registre, MOT POUR MOT, quand la situation en porte une. */
	readonly citation: {
		readonly texte: string;
		readonly source: string;
		readonly url: string;
	} | null;
}

export interface AnnonceOuvertureLue {
	readonly identifiantAnnonce: string;
	readonly dateParution: string;
	readonly nature: string;
	readonly dateJugement?: string;
	readonly tribunal?: string;
	readonly url: string;
	readonly complement?: string;
}

export interface FaitsSituations {
	readonly aujourdHui: string;
	readonly sante: 'INCONNUE' | 'SAINE' | 'PROCEDURE_COLLECTIVE' | 'RADIEE';
	/** Ce que le dossier réclame, en centimes : il décide si un avocat est obligatoire. */
	readonly montantReclameCentimes: bigint;
	/** Ce que le client a déjà versé sur les factures du dossier, en centimes. */
	readonly dejaVerseCentimes: bigint;
	readonly resteDuCentimes: bigint;
	/** La date où l'opposition a été consignée, ou `null`. */
	readonly oppositionLe: string | null;
	readonly annonceOuverture: AnnonceOuvertureLue | null;
	/** La date limite pour agir en justice la plus proche, ou `null`. */
	readonly dateLimiteAgir: string | null;
}

function euros(centimes: bigint): string {
	return `${versEuros(depuisCentimes(centimes))} €`;
}

function contestation(faits: FaitsSituations, oppositionLe: string): Situation {
	const seuilCommerce = exiger(PARAMETRES.seuilDispenseAvocatTribunalCommerce);
	const seuilJudiciaire = exiger(PARAMETRES.seuilDispenseAvocatTribunalJudiciaire);
	const auDela =
		faits.montantReclameCentimes > seuilCommerce && faits.montantReclameCentimes > seuilJudiciaire;
	const frais = finDeDelai(
		oppositionLe,
		{ valeur: exiger(PARAMETRES.delaiConsignationFraisOpposition), unite: 'jours' },
		{ reporterJourNonOuvrable: true }
	);
	return {
		cle: 'CONTESTATION',
		titre: 'Votre client conteste',
		ceQuiSePasse: [
			`Votre client a contesté le ${dateLisible(oppositionLe)}. Le tribunal va rejuger l’affaire, et aucune saisie n’est possible en attendant.`,
			auDela
				? `Ce dossier dépasse ${euros(seuilCommerce)} : un avocat doit représenter votre entreprise, au tribunal de commerce comme au tribunal judiciaire, sauf les exceptions prévues par les textes.`
				: `Jusqu’à ${euros(seuilCommerce)}, vous pouvez aller vous-même à l’audience, ou vous y faire représenter.`
		],
		dateLimite: {
			date: frais.fin,
			libelle: 'Au tribunal de commerce, payer les frais de l’opposition au greffe',
			reporteeDe: frais.reporteeDe,
			departNonPrecise: `Le texte ne dit pas d’où part ce délai : il est calculé depuis la date de la contestation, le ${dateLisible(oppositionLe)}, la plus précoce connue. Le greffe vous écrira.`,
			source: PARAMETRES.delaiConsignationFraisOpposition.source
		},
		options: [
			'Confier la suite à un avocat',
			...(auDela ? [] : ['Aller vous-même à l’audience']),
			'Au tribunal de commerce : payer les frais de l’opposition, ou non',
			'Chercher un arrangement avec votre client',
			'Arrêter',
			'Ne rien faire pour l’instant'
		],
		citation: null
	};
}

function procedureCollective(faits: FaitsSituations): Situation {
	const annonce = faits.annonceOuverture;
	exiger(PARAMETRES.arretCoursInterets);
	const ceQuiSePasse = [
		annonce?.dateJugement === undefined
			? 'Une procédure collective est ouverte contre votre client.'
			: `Une procédure collective est ouverte contre votre client, par jugement du ${dateLisible(annonce.dateJugement)}.`,
		'Les poursuites et les pénalités de retard s’arrêtent au jugement. Seuls ceux qui déclarent ce qui leur est dû ont une part de ce qui sera réparti.',
		...(faits.dejaVerseCentimes > 0n && annonce?.dateJugement !== undefined
			? [
					`Un paiement reçu après le jugement peut être annulé pendant ${exiger(PARAMETRES.delaiAnnulationPaiementInterdit)} ans : ce dossier ne passe pas en « Réglé » sans le dire.`
				]
			: [])
	];

	let dateLimite: DateLimiteSituation | null = null;
	if (annonce === null) {
		ceQuiSePasse.push(
			'L’annonce d’ouverture n’est pas encore relevée au journal officiel des entreprises : la date limite pour déclarer part de sa parution, et elle s’affichera dès qu’elle paraîtra.'
		);
	} else {
		const fin = finDeDelai(
			annonce.dateParution,
			{ valeur: exiger(PARAMETRES.delaiDeclarationCreance), unite: 'mois' },
			{ reporterJourNonOuvrable: true }
		);
		const rattrapage = finDeDelai(
			annonce.dateParution,
			{ valeur: exiger(PARAMETRES.delaiReleveForclusion), unite: 'mois' },
			{ reporterJourNonOuvrable: true }
		);
		dateLimite = {
			date: fin.fin,
			libelle: 'Déclarer ce qu’il vous doit',
			reporteeDe: fin.reporteeDe,
			departNonPrecise: null,
			source: PARAMETRES.delaiDeclarationCreance.source
		};
		ceQuiSePasse.push(
			`Le délai part de la parution de l’annonce, le ${dateLisible(annonce.dateParution)}. C’est la date d’envoi qui compte. Passé ce délai, un rattrapage peut être demandé au juge jusqu’au ${dateLisible(rattrapage.fin)}.`
		);
	}

	return {
		cle: 'PROCEDURE_COLLECTIVE',
		titre: 'Votre client est en procédure collective',
		ceQuiSePasse,
		dateLimite,
		options: [
			'Déclarer ce qu’il vous doit',
			'Confier le dossier à un avocat',
			'Vous renseigner auprès de la personne nommée par le tribunal',
			'Ne pas déclarer'
		],
		citation:
			annonce === null || annonce.complement === undefined
				? null
				: {
						texte: annonce.complement,
						source: `Annonce du ${dateLisible(annonce.dateParution)}${annonce.tribunal === undefined ? '' : `, ${annonce.tribunal}`}`,
						url: annonce.url
					}
	};
}

function paiementPartiel(faits: FaitsSituations): Situation {
	exiger(PARAMETRES.refusPaiementPartielPossible);
	return {
		cle: 'PAIEMENT_PARTIEL',
		titre: 'Votre client a payé en partie',
		ceQuiSePasse: [
			`Votre client a déjà versé ${euros(faits.dejaVerseCentimes)} ; il reste ${euros(faits.resteDuCentimes)} à payer.`,
			'Rien ne vous oblige à accepter un paiement partiel.',
			faits.dateLimiteAgir === null
				? 'La date limite pour agir en justice reste celle d’origine.'
				: `La date limite pour agir en justice reste celle d’origine, le ${dateLisible(faits.dateLimiteAgir)}. Un paiement partiel peut la repousser, mais seul un juge le dirait : elle n’est pas prolongée ici.`
		],
		dateLimite: null,
		options: [
			'Accepter le versement',
			'Refuser le paiement partiel',
			'Proposer un échéancier écrit',
			'Confier le dossier à un professionnel quand même',
			'Ne rien faire pour l’instant'
		],
		citation: null
	};
}

function radiee(): Situation {
	return {
		cle: 'RADIEE',
		titre: 'Votre client est radié du registre',
		ceQuiSePasse: [
			'Une société radiée doit toujours ce qu’elle doit (Cour de cassation, chambre commerciale, 20 septembre 2023).',
			'Qui la représente : le liquidateur nommé dans l’annonce de dissolution, s’il y en a une. Sinon, le greffe du tribunal de commerce peut vous le dire.',
			'Aucune lettre n’est préparée pour une société radiée : personne n’a qualité pour la recevoir tant qu’un mandataire n’est pas désigné.'
		],
		dateLimite: null,
		options: [
			'Vous adresser au liquidateur',
			'Faire désigner un mandataire par un professionnel',
			'Attendre',
			'Classer'
		],
		citation: null
	};
}

/** Les situations du dossier, dans un ordre fixe. Aucune n'efface les étapes. */
export function situationsDuDossier(faits: FaitsSituations): readonly Situation[] {
	const situations: Situation[] = [];
	if (faits.oppositionLe !== null) situations.push(contestation(faits, faits.oppositionLe));
	if (faits.sante === 'PROCEDURE_COLLECTIVE') situations.push(procedureCollective(faits));
	if (faits.sante === 'RADIEE') situations.push(radiee());
	if (faits.dejaVerseCentimes > 0n && faits.resteDuCentimes > 0n)
		situations.push(paiementPartiel(faits));
	return situations;
}
