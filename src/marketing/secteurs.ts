import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import {
	tauxPenaliteParDefaut,
	majorationLisible
} from '../lib/verticales/recouvrement/pays/france/taux';
import { REGIMES_PRESCRIPTION } from '../lib/verticales/recouvrement/pays/france/prescription';
import {
	majorationPubliqueLisible,
	tauxInteretsMoratoires
} from '../lib/verticales/recouvrement/pays/france/commande-publique';
import { OFFRES } from '../lib/config/tarifs';
import type { RegimeDuCalcul } from './calcul';
import { tauxLisible } from '../lib/verticales/recouvrement/taux-lisible';
import { dureePourRetenir } from '../lib/config/produit';
import { DUREE_ESSAI_JOURS, GRILLE, historiqueDeDecouverte } from '../lib/config/tarifs';
import type { QuestionReponse } from './faq';
import type { CaptureProduit } from './section';

/**
 * LES PAGES PAR MÉTIER (18/10/2026) : transport routier, bâtiment, services aux
 * entreprises. Ce sont les trois cibles de la prospection
 * (`docs/croissance/phase-manuelle.md`) ; les e-mails y mènent au lieu de
 * l'accueil, et chaque page dit l'argument de son métier en tête.
 *
 * ⚠️ AUCUNE VALEUR JURIDIQUE N'EST TAPÉE ICI. L'indemnité, le taux du semestre
 * et les délais viennent du registre et du module de prescription, avec leur
 * source ; un taux non relevé fait dire la règle au lieu d'un chiffre.
 *
 * ⚠️ AUCUN CONSEIL (ligne rouge n° 3) : ce que dit la loi, ce que fait le
 * logiciel. Jamais qu'il faudrait agir, jamais le mot interdit.
 */

/**
 * ⚠️ « PUBLICS » VEUT DIRE « PAGES PUBLIQUES », pas « secteur public ». La page des
 * fournisseurs d'hôpitaux et de collectivités (19/10/2026, audit) s'appelle
 * `fournisseurs-publics` et a sa branche à elle dans `pageDuSecteur` : sans branche, un
 * nouveau métier recevrait en silence le contenu des services aux entreprises.
 */
export const SECTEURS_PUBLICS = [
	'transport-routier',
	'batiment',
	'services-aux-entreprises',
	'fournisseurs-publics'
] as const;
export type SecteurPublic = (typeof SECTEURS_PUBLICS)[number];

export interface PointDeLoi {
	/**
	 * Le chiffre, posé en grand (« 40 € », « 1 an ») ; `null` quand le registre ne le
	 * donne pas : le titre dit alors la règle entière.
	 */
	readonly chiffre: string | null;
	/** Ce que le chiffre compte (« de frais de recouvrement par facture »), ou la règle. */
	readonly titre: string;
	readonly texte: string;
	readonly source: string;
}

/** Un écran du produit, montré avec les données du métier. */
export interface EcranDuMetier {
	readonly capture: CaptureProduit;
	readonly titre: string;
	readonly texte: string;
	/** Le texte de remplacement de l'image : ce qu'elle montre, sans chiffre recopié. */
	readonly description: string;
}

export interface PageDeSecteur {
	readonly secteur: SecteurPublic;
	/** Le nom du métier, pour le pied de page et le fil. */
	readonly nom: string;
	readonly titre: string;
	readonly chapeau: string;
	/** Une ligne, sur la carte du métier (accueil, autres métiers). */
	readonly accroche: string;
	/** Le régime que le calculateur propose d'abord. */
	readonly regime: RegimeDuCalcul;
	readonly points: readonly PointDeLoi[];
	/** Ce que fait le gérant sans logiciel, puis avec : quatre lignes chacun, des faits. */
	readonly avant: readonly string[];
	readonly avec: readonly string[];
	/** Deux écrans du produit, aux données du métier (`scenes-metiers.ts`). */
	readonly ecrans: readonly EcranDuMetier[];
	readonly offre: { readonly titre: string; readonly texte: string };
	readonly questions: readonly QuestionReponse[];
}

export const NOMS_DES_SECTEURS: Readonly<Record<SecteurPublic, string>> = {
	'transport-routier': 'Transport routier',
	batiment: 'Bâtiment',
	'services-aux-entreprises': 'Services aux entreprises',
	'fournisseurs-publics': 'Fournisseurs publics'
};

/** À qui s'adresse la page, en cinq mots : le menu « Métiers » de la barre. */
export const PUBLICS_DES_SECTEURS: Readonly<Record<SecteurPublic, string>> = {
	'transport-routier': 'Transporteurs et logisticiens',
	batiment: 'Artisans et entreprises du bâtiment',
	'services-aux-entreprises': 'Agences, conseil, nettoyage, sécurité',
	'fournisseurs-publics': 'Fournisseurs d’hôpitaux et de communes'
};

export function estSecteurPublic(valeur: string): valeur is SecteurPublic {
	return (SECTEURS_PUBLICS as readonly string[]).includes(valeur);
}

const NOMBRES = [
	'zéro',
	'un',
	'deux',
	'trois',
	'quatre',
	'cinq',
	'six',
	'sept',
	'huit',
	'neuf',
	'dix'
];

function annees(n: number): string {
	return `${NOMBRES[n] ?? String(n)} ${n > 1 ? 'ans' : 'an'}`;
}

/** « 40 € », lu au registre ; `null` s'il ne la donne pas en euros ronds. */
export function indemniteLisible(): string | null {
	const p = PARAMETRES.indemniteForfaitaire;
	if (!estUtilisable(p) || typeof p.valeur !== 'bigint') return null;
	return p.valeur % 100n === 0n ? `${(p.valeur / 100n).toString()} €` : null;
}

function tauxDuJour(jour: string): string | null {
	try {
		return tauxLisible(tauxPenaliteParDefaut(jour));
	} catch {
		// Un semestre que la série ne connaît pas : la règle, pas un chiffre extrapolé.
		return null;
	}
}

/** « 1 an », « 5 ans » : un délai posé en grand, en chiffres. */
function enChiffres(n: number): string {
	return `${n}\u00a0${n > 1 ? 'ans' : 'an'}`;
}

function pointIndemnite(): PointDeLoi {
	const montant = indemniteLisible();
	return {
		chiffre: montant,
		titre:
			montant === null
				? 'Des frais de recouvrement par facture payée en retard'
				: 'de frais de recouvrement par facture',
		texte:
			'Une somme forfaitaire, due par tout client professionnel qui paie après l’échéance, même s’il a réglé depuis.',
		source: PARAMETRES.indemniteForfaitaire.source
	};
}

function pointPenalites(jour: string): PointDeLoi {
	const taux = tauxDuJour(jour);
	return {
		chiffre: taux,
		titre: taux === null ? 'Des pénalités de retard' : 'par an de pénalités de retard',
		texte: `Le taux de la BCE majoré de ${majorationLisible()}, si le contrat n’en prévoit pas d’autre. Il change le 1er janvier et le 1er juillet.`,
		source: PARAMETRES.tauxInteretLegalDefaut.source
	};
}

function pointDelaiGeneral(): PointDeLoi {
	const regime = REGIMES_PRESCRIPTION.GENERAL;
	return {
		chiffre: enChiffres(regime.dureeAnnees),
		titre: 'pour agir en justice',
		texte:
			'Le délai de droit commun entre professionnels. Letikette surveille cette date pour chaque facture et vous prévient avant qu’elle passe.',
		source: regime.source
	};
}

/** L'offre d'entrée, lue dans la grille : le diagnostic, puis les formules. */
function offreDeLAbonnement(): PageDeSecteur['offre'] {
	return {
		titre: 'Commencez par le diagnostic gratuit.',
		texte: `Déposez vos factures : vous voyez ce qu’on vous doit sur ${historiqueDeDecouverte()}, sans carte. Ensuite ${GRILLE.solo.mensuel}, ${GRILLE.equipe.mensuel} ou ${GRILLE.pro.mensuel} € HT par mois, ${DUREE_ESSAI_JOURS} jours d’essai, aucune commission sur ce qui rentre.`
	};
}

/** Le premier écran de chaque métier : la tête d'« Aujourd'hui », à ses données. */
function ecranDeTete(secteur: SecteurPublic, metier: string, texte: string): EcranDuMetier {
	return {
		capture: `metier-${secteur}`,
		titre: 'Ce qu’on vous doit, au centime.',
		texte,
		description: `L’écran Aujourd’hui de Letikette pour ${metier}, dans un exemple fictif : ce que les clients doivent, pénalités et frais compris, rangé par ancienneté, et Plume qui prépare deux relances.`
	};
}

function questionRelances(): QuestionReponse {
	return {
		question: 'Letikette relance-t-il mes clients à ma place ?',
		reponse: `Quand vous l’avez décidé, et pour les clients que vous avez choisis. Chaque relance s’affiche ${dureePourRetenir()} avant de partir et se retient d’un geste ; elle part à votre nom, et les réponses arrivent chez vous.`
	};
}

export function questionClause(): QuestionReponse {
	return {
		question: 'Faut-il une clause au contrat pour réclamer les pénalités ?',
		reponse:
			'Entre professionnels, les pénalités de retard et les frais de recouvrement sont dus de plein droit, même si vos documents n’en parlent pas. Sans taux prévu au contrat, c’est celui de la BCE majoré de ' +
			majorationLisible() +
			'.'
	};
}

/** « 40 € », l'indemnité publique lue au registre ; `null` s'il ne la donne pas en euros ronds. */
function indemnitePubliqueLisible(): string | null {
	const p = PARAMETRES.indemniteForfaitairePublique;
	if (!estUtilisable(p) || typeof p.valeur !== 'bigint') return null;
	return p.valeur % 100n === 0n ? `${(p.valeur / 100n).toString()} €` : null;
}

/**
 * LES FOURNISSEURS D'HÔPITAUX ET DE COLLECTIVITÉS (19/10/2026, audit stratégique) : le
 * barème de la commande publique, et la réclamation clé en main. Tout est lu au registre ;
 * la date des quatre ans est une lecture, dite comme telle, et le mot du droit vient en
 * second (« intérêts moratoires »).
 */
function pageDesFournisseursPublics(jour: string): PageDeSecteur {
	const indemnite = indemnitePubliqueLisible();
	let taux: string | null = null;
	try {
		taux = tauxLisible(tauxInteretsMoratoires(jour));
	} catch {
		// Un semestre que la série ne connaît pas : la règle, pas un chiffre.
	}
	const delais = PARAMETRES.delaisPaiementPublics.valeur;
	const accessoires = Number(PARAMETRES.paiementAccessoiresPublics.valeur);
	const reclamation = OFFRES.reclamation;
	const enEuros = (centimes: number) => `${(centimes / 100).toLocaleString('fr-FR')} €`;
	return {
		secteur: 'fournisseurs-publics',
		nom: NOMS_DES_SECTEURS['fournisseurs-publics'],
		titre: 'Un hôpital ou une commune qui paie en retard vous doit des pénalités, de plein droit.',
		chapeau: `Au taux de la BCE majoré de ${majorationPubliqueLisible()}${indemnite === null ? '' : `, plus ${indemnite} de frais de recouvrement`}, dès le lendemain du délai de paiement (${delais.POUVOIR_ADJUDICATEUR} jours, ${delais.SANTE} pour un hôpital). Letikette les calcule facture par facture et prépare la demande de paiement à votre nom.`,
		accroche: 'Les pénalités d’un hôpital ou d’une commune, calculées facture par facture.',
		regime: 'PUBLIC',
		points: [
			{
				chiffre: taux,
				titre: taux === null ? 'Des pénalités de plein droit' : 'par an de pénalités de retard',
				texte: `Le taux de la BCE majoré de ${majorationPubliqueLisible()}, fixé pour tout le retard : celui du semestre où il commence. Les pénalités (« intérêts moratoires ») courent sans autre formalité.`,
				source: PARAMETRES.tauxInteretsMoratoiresPublics.source
			},
			{
				chiffre: indemnite,
				titre:
					indemnite === null
						? 'Des frais de recouvrement forfaitaires'
						: 'de frais de recouvrement par facture',
				texte: `Dus de plein droit pour le retard de paiement, et payés avec les pénalités dans les ${accessoires} jours qui suivent le paiement de la facture.`,
				source: PARAMETRES.indemniteForfaitairePublique.source
			},
			{
				chiffre: enChiffres(4),
				titre: 'pour les demander',
				texte:
					'À compter du 1er janvier qui suit l’année des prestations, d’après la lecture de la loi (« prescription quadriennale »). Une demande écrite envoyée avant interrompt ce délai.',
				source: PARAMETRES.delaiPrescriptionQuadriennale.source
			}
		],
		avant: [
			'Les délais de paiement publics sont connus ; leurs pénalités ne sont presque jamais demandées.',
			'Une facture payée en retard se classe, et ses pénalités avec elle.',
			'Le taux, le premier jour et les frais se recalculent à la main, facture par facture.',
			'Passé quatre ans, d’après la lecture de la loi, ces pénalités pourraient ne plus se réclamer.'
		],
		avec: [
			'Votre client public est reconnu d’après son numéro SIREN, avec son délai de paiement.',
			'Les pénalités et les frais sont calculés au barème de la commande publique, facture par facture.',
			'La demande de paiement est préparée à votre nom : vous la relisez, vous l’envoyez.',
			'Les factures payées en retard restent suivies, avec la date des quatre ans.'
		],
		ecrans: [
			{
				capture: 'metier-fournisseurs-publics',
				titre: 'Ce que vos clients publics vous doivent.',
				texte:
					'Le montant de chaque acheteur, pénalités et frais compris, au barème de la commande publique : un seul taux pour tout le retard. Plume relit chaque dépôt.',
				description:
					'L’écran Aujourd’hui de Letikette pour un fournisseur d’hôpitaux et de communes, dans un exemple fictif : ce que les acheteurs publics doivent, pénalités et frais compris, et deux rappels qui partent dans la matinée.'
			},
			{
				capture: 'metier-fournisseurs-publics-cartes',
				titre: 'Chaque délai de paiement, compté.',
				texte: `${delais.POUVOIR_ADJUDICATEUR} jours pour une commune, ${delais.SANTE} pour un hôpital : la carte dit quand le délai est passé, et la demande de paiement est prête à relire.`,
				description:
					'Les cartes des clients publics, dans un exemple fictif : un hôpital dont le délai de paiement est dépassé, une demande de paiement prête pour une commune, une facture payée en retard.'
			}
		],
		offre: {
			titre: 'Le calcul est gratuit.',
			texte: `Déposez vos factures : vous voyez ce que vos clients publics vous doivent, sans carte. La réclamation clé en main : ${reclamation.pourcent} % du montant calculé, entre ${enEuros(reclamation.minimumCentimes)} et ${enEuros(reclamation.maximumCentimes)} HT. Ou l’abonnement, dès ${GRILLE.solo.mensuel} € HT par mois.`
		},
		questions: [
			{
				question: 'La facture m’a été payée : les pénalités restent-elles dues ?',
				reponse: `Oui. Elles courent du lendemain du délai de paiement jusqu’au paiement, et se paient à part, dans les ${accessoires} jours qui suivent (${PARAMETRES.paiementAccessoiresPublics.source}).`
			},
			{
				question: 'Je ne veux pas froisser l’hôpital.',
				reponse:
					'La demande de paiement est un rappel réglementaire, à votre nom : elle cite le code de la commande publique, décompose chaque facture et ne menace de rien. Vous la relisez et vous l’envoyez vous-même.'
			},
			{
				question: 'Combien ça coûte ?',
				reponse: `Le calcul est gratuit. La réclamation clé en main : ${reclamation.pourcent} % du montant calculé, entre ${enEuros(reclamation.minimumCentimes)} et ${enEuros(reclamation.maximumCentimes)} HT, payés d’avance ; elle se demande depuis la page des tarifs.`
			}
		]
	};
}

export function pageDuSecteur(secteur: SecteurPublic, jour: string): PageDeSecteur {
	const montant = indemniteLisible();
	const taux = tauxDuJour(jour);
	const penalites =
		taux === null
			? `des pénalités au taux de la BCE majoré de ${majorationLisible()}`
			: `des pénalités au taux de ${taux} par an ce semestre`;

	if (secteur === 'transport-routier') {
		const transport = REGIMES_PRESCRIPTION.TRANSPORT_MARCHANDISES;
		const general = REGIMES_PRESCRIPTION.GENERAL;
		return {
			secteur,
			nom: NOMS_DES_SECTEURS[secteur],
			titre: `Une facture de transport ne se réclame que pendant ${annees(transport.dureeAnnees)}.`,
			chapeau: `Contre ${annees(general.dureeAnnees)} pour la plupart des factures, et à compter de la livraison. Letikette lit vos factures, surveille cette date pour chacune et calcule ce que la loi ajoute quand un client paie en retard.`,
			accroche: `Une facture de transport se réclame pendant ${annees(transport.dureeAnnees)}, contre ${annees(general.dureeAnnees)} en général.`,
			regime: 'TRANSPORT_MARCHANDISES',
			points: [
				{
					chiffre: enChiffres(transport.dureeAnnees),
					titre: 'pour agir en justice',
					// La note et le point de départ du régime, dits en mots de tous les jours.
					texte:
						'Le délai vaut pour toutes les actions nées du contrat de transport, le paiement du prix compris. Il court depuis la remise de la marchandise au destinataire.',
					source: transport.source
				},
				pointIndemnite(),
				pointPenalites(jour)
			],
			avant: [
				'Les retards se repèrent en relisant les relevés de banque, quand on a le temps.',
				`Le délai d’${annees(transport.dureeAnnees)} court depuis la livraison, et rien ne prévient avant qu’il passe.`,
				'Les pénalités et les frais de recouvrement ne sont jamais réclamés : personne ne sait les calculer.',
				'Les relances se font au téléphone, entre deux tournées.'
			],
			avec: [
				'Vos factures et vos règlements sont lus et rapprochés, client par client.',
				'La date limite de chaque facture est surveillée, et Plume vous prévient avant.',
				'Les pénalités et les frais sont chiffrés au centime, période par période.',
				`Les rappels partent à votre nom quand vous l’avez décidé ; chacun s’affiche ${dureePourRetenir()} avant de partir.`
			],
			ecrans: [
				ecranDeTete(
					secteur,
					'un transporteur',
					'Le montant de chaque client, pénalités et frais compris, rangé par ancienneté. Plume relit chaque dépôt et prépare les rappels.'
				),
				{
					capture: 'metier-transport-routier-cartes',
					titre: 'Chaque date limite, surveillée.',
					texte: `Une carte par client : ce qu’il doit et ce qui se passe. La date limite pour agir en justice d’une facture de transport tombe ${annees(transport.dureeAnnees)} après la livraison : elle remonte en tête bien avant.`,
					description:
						'Les cartes des clients d’un transporteur, dans un exemple fictif : une date limite pour agir dans 41 jours, un rappel prêt à partir, une facture payée en retard et ses frais.'
				}
			],
			offre: offreDeLAbonnement(),
			questions: [
				{
					question: 'Le délai d’un an vaut-il pour le transport international ?',
					reponse:
						'Il vise le transport terrestre intérieur. Le routier international, le maritime et l’aérien relèvent d’autres textes, que Letikette ne surveille pas encore.'
				},
				{
					question: 'Mon client a fini par payer : les frais de recouvrement restent-ils dus ?',
					reponse:
						'Oui. Ils sont dus dès que la facture est payée en retard, même soldée depuis. Letikette les compte pour chaque facture concernée.'
				},
				questionRelances()
			]
		};
	}

	if (secteur === 'fournisseurs-publics') return pageDesFournisseursPublics(jour);

	if (secteur === 'batiment') {
		return {
			secteur,
			nom: NOMS_DES_SECTEURS[secteur],
			titre:
				montant === null
					? 'Dans le bâtiment, une facture payée en retard vaut plus que son montant.'
					: `Dans le bâtiment, chaque facture payée en retard vaut ${montant} de plus.`,
			chapeau: `Plus ${penalites}, dues sans clause au contrat. Letikette lit vos factures, chiffre ce qui vous est dû au centime et relance vos clients à votre nom quand vous l’avez décidé.`,
			accroche:
				montant === null
					? 'Des frais de recouvrement par facture payée en retard, sans clause au contrat.'
					: `${montant} de frais par facture payée en retard, sans clause au contrat.`,
			regime: 'GENERAL',
			points: [pointIndemnite(), pointPenalites(jour), pointDelaiGeneral()],
			avant: [
				'Les situations de travaux s’empilent, et les retards se découvrent en fin de chantier.',
				'Les frais de recouvrement et les pénalités ne sont jamais réclamés.',
				'Relancer un client, c’est un appel qu’on repousse pour ne pas le froisser.',
				'Le jour où il faut un décompte, il se refait à la main, facture par facture.'
			],
			avec: [
				'Chaque facture et chaque situation est suivie jusqu’au paiement.',
				montant === null
					? 'Les frais de recouvrement et les pénalités sont chiffrés au centime, pour chaque facture.'
					: `Les ${montant} de frais et les pénalités sont chiffrés au centime, pour chaque facture.`,
				'Les relances partent à votre nom, du premier rappel à la lettre officielle, quand vous l’avez décidé.',
				'Une contestation se note sur le dossier, sans rien bloquer.'
			],
			ecrans: [
				ecranDeTete(
					secteur,
					'une entreprise du bâtiment',
					'Le montant de chaque client, frais et pénalités compris, et ce qui n’a jamais été réclamé. Plume relit chaque dépôt et prépare les relances.'
				),
				{
					capture: 'metier-batiment-cartes',
					titre: 'Chaque chantier suivi, jusqu’au paiement.',
					texte:
						'Une carte par client : la situation impayée, la lettre officielle prête, la promesse de paiement et sa date. Rien ne part avant que vous l’ayez décidé.',
					description:
						'Les cartes des clients d’une menuiserie, dans un exemple fictif : une situation de travaux impayée, une lettre officielle prête, une promesse de paiement pour le 30.'
				}
			],
			offre: offreDeLAbonnement(),
			questions: [
				{
					question: 'Mon client conteste une partie des travaux : puis-je le relancer ?',
					reponse:
						'Oui. Une contestation se note sur le dossier et reste visible, elle ne bloque rien : le montant reste calculé et les relances continuent, sauf si vous retirez ce client des relances.'
				},
				questionClause(),
				questionRelances()
			]
		};
	}

	return {
		secteur,
		nom: NOMS_DES_SECTEURS[secteur],
		titre:
			montant === null
				? 'Une facture payée en retard vous ouvre droit à plus que son montant.'
				: `Chaque facture payée en retard vous ouvre droit à ${montant} de plus, et à des pénalités.`,
		chapeau:
			'Agences, conseil, nettoyage, sécurité : presque personne ne les réclame, faute de savoir les calculer. Letikette lit vos factures, chiffre ce que chaque client vous doit et le relance à votre nom, sans commission sur ce qui rentre.',
		accroche: 'Des relances à votre nom, et les pénalités que personne ne réclame.',
		regime: 'GENERAL',
		points: [pointIndemnite(), pointPenalites(jour), pointDelaiGeneral()],
		avant: [
			'Les relances se font quand on a le temps, c’est-à-dire rarement.',
			'On n’ose pas relancer un bon client, de peur de le froisser.',
			'Les pénalités et les frais de recouvrement ne sont jamais réclamés.',
			'Savoir qui doit quoi oblige à ouvrir la banque et le logiciel de facturation.'
		],
		avec: [
			'Vos factures arrivent seules, depuis votre logiciel ou par un dépôt.',
			`Vous choisissez qui est relancé ; chaque relance s’affiche ${dureePourRetenir()} avant de partir.`,
			'Les pénalités et les frais sont chiffrés au centime.',
			'Votre client paie par virement, sur une page à votre nom.'
		],
		ecrans: [
			ecranDeTete(
				secteur,
				'une entreprise de services',
				'Le montant de chaque client, pénalités et frais compris, rangé par ancienneté. Plume relit chaque dépôt et prépare les relances.'
			),
			{
				capture: 'metier-services-aux-entreprises-cartes',
				titre: 'Les relances partent à votre nom.',
				texte: `Le rappel, le deuxième rappel, puis la lettre officielle, au rythme que vous avez choisi. Chacun s’affiche ${dureePourRetenir()} avant de partir et se retient d’un geste.`,
				description:
					'Les cartes des clients d’une entreprise de propreté, dans un exemple fictif : un deuxième rappel sans réponse, un rappel prêt à partir, une promesse de paiement pour le 25.'
			}
		],
		offre: offreDeLAbonnement(),
		questions: [
			{
				question: 'Je ne veux pas froisser mes clients.',
				reponse: `Vous choisissez qui est relancé. Rien ne part sans que vous l’ayez décidé ; chaque relance s’affiche ${dureePourRetenir()} avant de partir et se retient d’un geste.`
			},
			{
				question: 'Combien ça coûte ?',
				reponse: `Découverte est gratuite : vous voyez ce qu’on vous doit sur ${historiqueDeDecouverte()}. Ensuite ${GRILLE.solo.mensuel}, ${GRILLE.equipe.mensuel} ou ${GRILLE.pro.mensuel} € HT par mois, ${DUREE_ESSAI_JOURS} jours d’essai, aucune commission sur ce qui rentre.`
			},
			questionClause()
		]
	};
}
