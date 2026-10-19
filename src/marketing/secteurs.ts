import { PARAMETRES, estUtilisable } from '../lib/verticales/recouvrement/parametres';
import {
	tauxPenaliteParDefaut,
	majorationLisible
} from '../lib/verticales/recouvrement/pays/france/taux';
import { REGIMES_PRESCRIPTION } from '../lib/verticales/recouvrement/pays/france/prescription';
import { tauxLisible } from '../lib/verticales/recouvrement/taux-lisible';
import { dureePourRetenir } from '../lib/config/produit';
import { DUREE_ESSAI_JOURS, GRILLE, historiqueDeDecouverte } from '../lib/config/tarifs';
import type { QuestionReponse } from './faq';

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

export const SECTEURS_PUBLICS = [
	'transport-routier',
	'batiment',
	'services-aux-entreprises'
] as const;
export type SecteurPublic = (typeof SECTEURS_PUBLICS)[number];

export interface PointDeLoi {
	readonly titre: string;
	readonly texte: string;
	readonly source: string;
}

export interface PageDeSecteur {
	readonly secteur: SecteurPublic;
	/** Le nom du métier, pour le pied de page et le fil. */
	readonly nom: string;
	readonly titre: string;
	readonly chapeau: string;
	/** Le régime que le calculateur propose d'abord. */
	readonly regime: 'GENERAL' | 'TRANSPORT_MARCHANDISES';
	readonly points: readonly PointDeLoi[];
	readonly questions: readonly QuestionReponse[];
}

export const NOMS_DES_SECTEURS: Readonly<Record<SecteurPublic, string>> = {
	'transport-routier': 'Transport routier',
	batiment: 'Bâtiment',
	'services-aux-entreprises': 'Services aux entreprises'
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

function majuscule(texte: string): string {
	return texte.charAt(0).toUpperCase() + texte.slice(1);
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

function pointIndemnite(): PointDeLoi {
	const montant = indemniteLisible();
	return {
		titre:
			montant === null
				? 'Des frais de recouvrement par facture payée en retard'
				: `${montant} de frais de recouvrement par facture`,
		texte:
			'Une somme forfaitaire, due par tout client professionnel qui paie après l’échéance, même s’il a réglé depuis.',
		source: PARAMETRES.indemniteForfaitaire.source
	};
}

function pointPenalites(jour: string): PointDeLoi {
	const taux = tauxDuJour(jour);
	return {
		titre: taux === null ? 'Des pénalités de retard' : `${taux} par an de pénalités`,
		texte: `Le taux de la BCE majoré de ${majorationLisible()}, si le contrat n’en prévoit pas d’autre. Il change le 1er janvier et le 1er juillet.`,
		source: PARAMETRES.tauxInteretLegalDefaut.source
	};
}

function pointDelaiGeneral(): PointDeLoi {
	const regime = REGIMES_PRESCRIPTION.GENERAL;
	return {
		titre: `${majuscule(annees(regime.dureeAnnees))} pour agir en justice`,
		texte:
			'Le délai de droit commun entre professionnels. Letikette surveille cette date pour chaque facture et vous prévient avant qu’elle passe.',
		source: regime.source
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
			regime: 'TRANSPORT_MARCHANDISES',
			points: [
				{
					titre: `${majuscule(annees(transport.dureeAnnees))} pour agir en justice`,
					// La note et le point de départ du régime, dits en mots de tous les jours.
					texte:
						'Le délai vaut pour toutes les actions nées du contrat de transport, le paiement du prix compris. Il court depuis la remise de la marchandise au destinataire.',
					source: transport.source
				},
				pointIndemnite(),
				pointPenalites(jour)
			],
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

	if (secteur === 'batiment') {
		return {
			secteur,
			nom: NOMS_DES_SECTEURS[secteur],
			titre:
				montant === null
					? 'Dans le bâtiment, une facture payée en retard vaut plus que son montant.'
					: `Dans le bâtiment, chaque facture payée en retard vaut ${montant} de plus.`,
			chapeau: `Plus ${penalites}, dues sans clause au contrat. Letikette lit vos factures, chiffre ce qui vous est dû au centime et relance vos clients à votre nom quand vous l’avez décidé.`,
			regime: 'GENERAL',
			points: [pointIndemnite(), pointPenalites(jour), pointDelaiGeneral()],
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
		regime: 'GENERAL',
		points: [pointIndemnite(), pointPenalites(jour), pointDelaiGeneral()],
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
