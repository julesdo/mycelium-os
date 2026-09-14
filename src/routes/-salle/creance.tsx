import type { CreanceAffichee } from '../../screens/creance';
import { EcranCreance } from '../../screens/creance';
import { EcranDecompte } from '../../screens/analyses/decompte';
import { EcranLitige, type ConditionAConfirmer } from '../../screens/analyses/litige';
import { EcranRelances } from '../../screens/analyses/relances';
import type { RisqueAffiche } from '../../screens/analyses/risques';
import { EcranRisques } from '../../screens/analyses/risques';
import { EcranSolidite } from '../../screens/analyses/solidite';
import { additionner, depuisCentimes, soustraire } from '../../lib/socle/montants';
import {
	decompterCreance,
	type FacturePourDecompte,
	type Reglement
} from '../../lib/verticales/recouvrement/decompte';
import {
	conditionsADemander,
	deduireConditions,
	type ConditionsDeduites
} from '../../lib/verticales/recouvrement/deduction';
import { periodesDeTauxParDefaut } from '../../lib/verticales/recouvrement/pays/france/taux';
import { PROCEDURES, proceduresEnvisageables } from '../../lib/verticales/recouvrement/procedures';
import {
	ETAGES_DE_PREUVE,
	pyramideDePreuves,
	type Pyramide
} from '../../lib/verticales/recouvrement/solidite';
import { LIBELLE_CONDITION, type ClePiece } from '../../lib/verticales/recouvrement/qualification';
import {
	lireLitige,
	questionsRestantes,
	signauxDepuisFaits,
	type Reponses
} from '../../lib/verticales/recouvrement/litige';
import { qualifier, type SanteDebiteur } from '../../lib/verticales/recouvrement/scoring';
import {
	NIVEAUX_RELANCE,
	composerRelance,
	type ElementsRelance
} from '../../lib/verticales/recouvrement/relance';
import type { DecompteAffiche, NiveauAffiche, SoliditeAffichee } from '../../ui';
import { formeDemo, lectureDemo, type EcranDuProduit } from './demo';

/**
 * LES ENTRÉES DE LA FAMILLE, DÉCLARÉES AVANT TOUT CE QUI S'EN CALCULE.
 *
 * ⚠️ LA RANGÉE DE LA CRÉANCE CONTREDISAIT SES PROPRES PAGES. Écrite à la main,
 * elle montrait un score que `qualifier()` ne rend jamais, un risque que
 * `creanceComplete` ne produit pas avec ces entrées, une relance prête pour un
 * débiteur en liquidation, et un décompte « à produire » à côté de la page qui
 * en montrait un. Le brouillon de niveau 2 citait des intérêts qu'aucun
 * décompte n'avait calculés, sur une facture que la page du décompte ne
 * connaissait pas.
 *
 * Tout ce que la famille montre se calcule donc depuis ces entrées, par les
 * fonctions du domaine que les requêtes du produit appellent. Ne reste écrit que
 * ce qu'aucune fonction ne produit : un nom, une santé relevée au registre, des
 * réponses du gérant, des pièces, des factures. Une valeur que le serveur
 * calcule sans fonction exportée porte la ligne du produit qu'elle reproduit.
 */

/** Le débiteur, nommé une seule fois pour toute la famille. */
const DEBITEUR_DEMO = 'Fournitures Durand';

/**
 * Le jour de la démonstration, figé : l'arrêté du décompte, la date des relances
 * et celle où les conditions se déduisent. Un « aujourd'hui » qui bouge chaque
 * matin ne se compare plus d'une capture à l'autre.
 */
const AUJOURD_HUI_DEMO = '2026-09-03';

/**
 * ⚠️ UNE PROCÉDURE COLLECTIVE DANS LA DÉMONSTRATION, délibérément.
 *
 * C'est le cas qui rend la rangée du débiteur indispensable : le radar l'a
 * relevée au registre pendant la nuit, et jusqu'ici l'écran de créance n'en
 * disait rien. La salle d'exposition doit montrer l'état où le défaut se
 * voyait, pas celui où il ne se voyait pas.
 *
 * Le domaine en tire deux effets, et la famille montre les deux : un risque
 * dans la qualification, et la suspension des trois niveaux de relance.
 */
const SANTE_DEBITEUR_DEMO: SanteDebiteur = 'PROCEDURE_COLLECTIVE';

/** Ce que le registre porte pour ce débiteur, et que le constat de suspension cite mot pour mot. */
const CONSTAT_REGISTRE_DEMO = {
	nature: 'Jugement d’ouverture de liquidation judiciaire',
	dateJugement: '2026-03-14'
};

/**
 * Les réponses en cours : deux faits écartés, quatre encore ouverts.
 *
 * ⚠️ CE QUE `questionsRestantes` DEMANDE NE COÏNCIDE PAS AVEC CE QUE
 * `lireLitige` COMPTE. `RECONNAISSANCE_ECRITE` se pose comme les cinq autres
 * questions, mais elle n'entre pas dans `FAITS_DE_LITIGE` (`litige.ts`) : avec
 * ces deux réponses, quatre questions restent posées alors que le constat ne
 * compte que trois faits indéterminés. C'est un comportement réel du produit ;
 * cette démonstration le montre plutôt que de choisir des réponses qui
 * l'éviteraient.
 */
const REPONSES_LITIGE_DEMO: Reponses = { CONTESTATION_ECRITE: 'NON', REFUS_RECEPTION: 'NON' };

/** La variante « litigieux » : une contestation écrite déclarée. Le litige et les risques la montrent. */
const REPONSES_LITIGE_LITIGIEUSES_DEMO: Reponses = { CONTESTATION_ECRITE: 'OUI' };

/**
 * Les pièces rattachées à la créance. Une seule liste pour le score et pour la
 * pyramide, comme `creanceComplete` la lit une fois pour les deux
 * (`src/lib/convex/recouvrement/lecture.ts`, lignes 494 à 501) : la rangée qui
 * résume et la page qui détaille doivent montrer le même compte.
 */
const PIECES_DEMO: readonly ClePiece[] = ['FACTURE', 'BON_DE_COMMANDE'];

/** Un règlement, dans la forme de la table `reglements`. */
interface ReglementDemo {
	readonly date: string;
	readonly montant: bigint;
	readonly nature: Reglement['nature'];
}

/** Une facture, dans la forme de la table `facturesVente`, avec ses règlements. */
interface FactureDemo {
	readonly reference: string;
	readonly montantTTC: bigint;
	readonly dateEcheance: string;
	readonly dateExigibilite: string;
	readonly reglements: readonly ReglementDemo[];
}

/**
 * Les factures de la créance : UN SEUL JEU pour la rangée, le décompte et les
 * relances. Le brouillon citait une facture de 12 000 € que la page du décompte
 * ne connaissait pas.
 *
 * Une facture réglée en partie en cours de route : le décompte en tire deux
 * périodes à taux différents sur deux principaux, et un tableau à sept colonnes
 * qui doit tenir à 375 px sans faire déborder la page, en défilant pour lui seul.
 */
const FACTURES_DEMO: readonly FactureDemo[] = [
	{
		reference: 'FA-2026-118',
		montantTTC: 1_000_000n,
		dateEcheance: '2026-05-01',
		dateExigibilite: '2026-05-01',
		reglements: [{ date: '2026-07-01', montant: 400_000n, nature: 'PAIEMENT' }]
	}
];

/** Ce qui reste dû sur une facture, calculé comme `resteDu` (`lecture.ts`, lignes 110 à 120). */
function resteDu(facture: FactureDemo) {
	return soustraire(
		depuisCentimes(facture.montantTTC),
		additionner(...facture.reglements.map((reglement) => depuisCentimes(reglement.montant)))
	);
}

/** Le reste dû de la créance : la somme des restes, comme `creanceComplete` la fait (`lecture.ts`, lignes 530 et 646). */
const PRINCIPAL_RESTANT_DU_DEMO = additionner(...FACTURES_DEMO.map(resteDu));

/**
 * Les quatre conditions, telles que la base les porte une fois le litige
 * répondu : `deduireConditions` à la création de la créance (`creerCreance`,
 * `src/lib/convex/recouvrement/creances.ts`, lignes 270 à 289), puis `certaine`
 * récrite depuis `lireLitige` à chaque déclaration (`declarerFaitLitige`,
 * lignes 398 à 408).
 *
 * La qualité de commerçant n'est connue d'aucune des deux parties : la
 * condition « entre commerçants » reste à confirmer, et c'est la question que
 * la rangée compte et que la page du litige pose.
 */
function conditionsDepuisReponses(reponses: Reponses): ConditionsDeduites {
	return {
		...deduireConditions({
			montantExigible: PRINCIPAL_RESTANT_DU_DEMO,
			// La plus tardive des exigibilités, comme `creerCreance` la retient (lignes 273 à 281).
			dateExigibilite: FACTURES_DEMO.map((facture) => facture.dateExigibilite).reduce(
				(tardive, date) => (date > tardive ? date : tardive)
			),
			aujourdHui: AUJOURD_HUI_DEMO,
			creancierCommercant: 'unknown',
			debiteurCommercant: 'unknown'
		}),
		certaine: lireLitige(reponses).certaine
	};
}

/** Les conditions de la famille, avec les réponses en cours au litige. */
const CONDITIONS_DEMO = conditionsDepuisReponses(REPONSES_LITIGE_DEMO);

/**
 * La qualification, par `qualifier()` appelée comme `creanceComplete` l'appelle
 * (`lecture.ts`, lignes 503 à 512) : les signaux de contestation viennent des
 * faits déclarés, et `retardsAnterieurs: 0` est la valeur que la lecture passe
 * aujourd'hui, en attendant l'historique des règlements.
 */
function qualificationDepuisReponses(reponses: Reponses) {
	return qualifier({
		...conditionsDepuisReponses(reponses),
		piecesFournies: PIECES_DEMO,
		signauxContestation: signauxDepuisFaits(reponses),
		santeDebiteur: SANTE_DEBITEUR_DEMO,
		retardsAnterieurs: 0
	});
}

/** Le score, l'éligibilité et les risques de la rangée : un seul appel, sur les réponses en cours. */
const QUALIFICATION_DEMO = qualificationDepuisReponses(REPONSES_LITIGE_DEMO);

/**
 * Les conditions à confirmer, composées exactement comme `creanceComplete` les
 * compose (`lecture.ts`, lignes 563 à 570) : `certaine` en est exclue, elle se
 * déduit des faits déclarés au litige. La rangée les compte, et la page du
 * litige les reçoit telles quelles (`creance_.$id.litige.tsx`, ligne 58).
 */
const CONDITIONS_A_CONFIRMER_DEMO: readonly ConditionAConfirmer[] = conditionsADemander(
	CONDITIONS_DEMO
)
	.filter((condition) => condition !== 'certaine')
	.map((condition) => ({
		condition,
		libelle: `Pouvez-vous confirmer ${
			LIBELLE_CONDITION[condition as keyof typeof LIBELLE_CONDITION]
		} de cette créance ?`
	}));

/**
 * Les champs qui dépendent des réponses, calculés par `lireLitige` et
 * `questionsRestantes` (`litige.ts`) : jamais recopiés, pour que la
 * démonstration reste vraie si le domaine change de formulation.
 */
function litigeDepuisReponses(reponses: Reponses) {
	const lecture = lireLitige(reponses);
	return {
		questions: questionsRestantes(reponses).map((q) => ({
			cle: q.cle,
			question: q.question,
			portee: q.portee
		})),
		constats: [...lecture.constats],
		litigieux: lecture.litigieux
	};
}

/**
 * Les procédures, listées comme `creanceComplete` les liste (`lecture.ts`,
 * lignes 516, 517 et 606 à 609) : toutes, disponibles ou non, évaluées sur les
 * seules conditions.
 */
const VOIES_ENVISAGEABLES_DEMO = new Set(
	proceduresEnvisageables({ ...CONDITIONS_DEMO, piecesFournies: [] }).map(
		(procedure) => procedure.cle
	)
);

const PROCEDURES_DEMO = Object.values(PROCEDURES).map((procedure) => ({
	cle: procedure.cle,
	disponible: VOIES_ENVISAGEABLES_DEMO.has(procedure.cle) && procedure.peutEvaluer()
}));

/** La pyramide de preuves de la famille : la rangée en montre le compte, la page de solidité le détail. */
const PYRAMIDE_DEMO = pyramideDePreuves(PIECES_DEMO);

/**
 * Une facture, telle que `figerDecompte` la passe au calcul
 * (`src/lib/convex/recouvrement/decompte.ts`, lignes 53 à 67 et 120 à 126).
 * Sans taux contractuel, ses périodes sont la série légale que `periodesDe`
 * demande à `periodesDeTauxParDefaut` (lignes 75 à 88) : un taux par semestre
 * traversé, chacun lu par `tauxPenaliteParDefaut`.
 */
function factureVersDecompte(facture: FactureDemo, arreteAu: string): FacturePourDecompte {
	return {
		reference: facture.reference,
		montantExigible: depuisCentimes(facture.montantTTC),
		dateExigibilite: facture.dateExigibilite,
		reglements: facture.reglements.map((reglement) => ({
			date: reglement.date,
			montant: depuisCentimes(reglement.montant),
			nature: reglement.nature
		})),
		taux: periodesDeTauxParDefaut(facture.dateExigibilite, arreteAu)
	};
}

/**
 * Le décompte arrêté au jour de la démonstration, par `decompterCreance`, dans
 * la convention que la page demande (`creance_.$id.decompte.tsx`, ligne 93). La
 * page le montre, la rangée en porte le total, et le brouillon de niveau 2 en
 * reprend les chiffres.
 */
const DECOMPTE_DEMO: DecompteAffiche = decompterCreance(
	FACTURES_DEMO.map((facture) => factureVersDecompte(facture, AUJOURD_HUI_DEMO)),
	AUJOURD_HUI_DEMO,
	'ACT_365'
);

/** Les trois niveaux composés par `composerRelance` (`relance.ts`) pour un jeu d'éléments donné. */
function niveauxDepuisElements(elements: ElementsRelance): NiveauAffiche[] {
	return NIVEAUX_RELANCE.map((description) => {
		const relance = composerRelance(description.niveau, elements);
		return {
			niveau: description.niveau,
			nom: description.nom,
			intention: description.intention,
			disponible: relance.disponible,
			objet: relance.disponible ? relance.objet : undefined,
			corps: relance.disponible ? relance.corps : undefined,
			constat: relance.disponible ? undefined : relance.constat,
			blocages: relance.disponible ? undefined : [...relance.blocages]
		};
	});
}

/**
 * Ce qu'une relance reprend de la créance, assemblé comme `creanceComplete`
 * l'assemble (`lecture.ts`, lignes 638 à 659) : les mêmes factures, le même
 * reste dû, et les chiffres du décompte arrêté, que le niveau 2 ne recalcule
 * jamais. La santé du débiteur s'y ajoute selon la forme montrée.
 *
 * Les textes viennent du DOMAINE, pas d'une fixture recopiée : une
 * démonstration qui invente ses propres phrases montre un produit qui
 * n'existe pas.
 */
const ELEMENTS_RELANCE_DEMO: Omit<ElementsRelance, 'santeDebiteur' | 'constatRegistre'> = {
	creancier: 'Thumbbb Agency',
	debiteur: DEBITEUR_DEMO,
	factures: FACTURES_DEMO.map((facture) => ({
		reference: facture.reference,
		montantTTC: depuisCentimes(facture.montantTTC),
		dateEcheance: facture.dateEcheance
	})),
	principalRestantDu: PRINCIPAL_RESTANT_DU_DEMO,
	decompte: {
		arreteAu: DECOMPTE_DEMO.arreteAu,
		interets: depuisCentimes(DECOMPTE_DEMO.interets),
		indemniteForfaitaire: depuisCentimes(DECOMPTE_DEMO.indemniteForfaitaire),
		total: depuisCentimes(DECOMPTE_DEMO.total)
	},
	aujourdHui: AUJOURD_HUI_DEMO
};

/** Les relances dans la santé de la famille : le coupe-circuit d'une procédure collective suspend les trois niveaux. */
const RELANCES_SUSPENDUES_DEMO: readonly NiveauAffiche[] = niveauxDepuisElements({
	...ELEMENTS_RELANCE_DEMO,
	santeDebiteur: SANTE_DEBITEUR_DEMO,
	constatRegistre: CONSTAT_REGISTRE_DEMO
});

/** La rangée de la créance, calculée depuis les entrées de la famille : aucun de ses chiffres n'est écrit ici. */
const CREANCE_DEMO: CreanceAffichee = {
	debiteur: DEBITEUR_DEMO,
	debiteurId: 'demo-debiteur',
	santeDebiteur: SANTE_DEBITEUR_DEMO,
	score: QUALIFICATION_DEMO.score,
	eligible: QUALIFICATION_DEMO.eligible,
	principalRestantDu: PRINCIPAL_RESTANT_DU_DEMO,
	factures: FACTURES_DEMO.map((facture) => ({ _id: facture.reference })),
	questions: CONDITIONS_A_CONFIRMER_DEMO,
	litige: litigeDepuisReponses(REPONSES_LITIGE_DEMO),
	risques: QUALIFICATION_DEMO.risques,
	solidite: { etablies: PYRAMIDE_DEMO.etablies, attendues: PYRAMIDE_DEMO.attendues },
	relances: RELANCES_SUSPENDUES_DEMO,
	procedures: PROCEDURES_DEMO,
	regimePrescriptionNote: 'Régime général : cinq ans à compter de l’exigibilité. Secteur déterminé.'
};

/** Ce que la démonstration du décompte partage entre son état prêt et son état vide. */
const DECOMPTE_BASE_DEMO = {
	debiteur: DEBITEUR_DEMO,
	enCours: false,
	erreur: null,
	onArreter: () => undefined,
	onTelecharger: () => undefined
};

/** L'état « sans données » : les six questions répondues, aucune contestation retenue. */
const REPONSES_LITIGE_TERMINEES_DEMO: Reponses = {
	CONTESTATION_ECRITE: 'NON',
	REFUS_RECEPTION: 'NON',
	AVOIR_RECLAME: 'NON',
	PENALITES_OPPOSEES: 'NON',
	INSTANCE_EN_COURS: 'NON',
	RECONNAISSANCE_ECRITE: 'NON'
};

/** Les formes nommées du litige : les réponses de chaque variante. */
const FORMES_LITIGE_DEMO: Readonly<Record<string, Reponses>> = {
	litigieux: REPONSES_LITIGE_LITIGIEUSES_DEMO
};

/** Ce que la démonstration du litige partage entre son état prêt, sa variante et son état vide. */
const LITIGE_BASE_DEMO = {
	debiteur: DEBITEUR_DEMO,
	enCours: false,
	erreur: null,
	onDeclarer: () => undefined,
	onRepondre: () => undefined
};

// SAINE, et non la santé de la famille : suspendus, les trois niveaux cacheraient leurs brouillons.
const RELANCES_DEMO: readonly NiveauAffiche[] = niveauxDepuisElements({
	...ELEMENTS_RELANCE_DEMO,
	santeDebiteur: 'SAINE'
});

/** La variante « suspendues » : les relances dans la santé de la famille. */
const FORMES_RELANCES_DEMO: Readonly<Record<string, readonly NiveauAffiche[]>> = {
	suspendues: RELANCES_SUSPENDUES_DEMO
};

/** Les risques de la page : ceux de la qualification de la famille, donc la procédure collective seule. */
const RISQUES_DEMO: readonly RisqueAffiche[] = QUALIFICATION_DEMO.risques;

/**
 * La variante « litigieux » : les mêmes entrées, avec la contestation écrite
 * déclarée au litige. Elle garde visible le rendu d'un risque BLOQUANT.
 */
const FORMES_RISQUES_DEMO: Readonly<Record<string, readonly RisqueAffiche[]>> = {
	litigieux: qualificationDepuisReponses(REPONSES_LITIGE_LITIGIEUSES_DEMO).risques
};

/**
 * La même mise en forme que `DemoDetail` utilisait pour la pyramide, gardée
 * ici comme une fonction : la page ne recalcule rien, elle affiche ce que
 * `pyramideDePreuves` rend.
 */
function soliditeDepuisPyramide(pyramide: Pyramide): SoliditeAffichee {
	return {
		constat: pyramide.constat,
		etablies: pyramide.etablies,
		attendues: pyramide.attendues,
		prochaine: pyramide.prochaine?.cle ?? null,
		etages: pyramide.etages.map((e) => ({
			cle: e.cle,
			fait: e.fait,
			etat: e.etat,
			presente: e.presente,
			poids: e.poids
		}))
	};
}

const SOLIDITE_DEMO: SoliditeAffichee = soliditeDepuisPyramide(PYRAMIDE_DEMO);

/**
 * Les variantes « aucune pièce », et « toutes les pièces » : un exemplaire de
 * chaque type accepté par un étage.
 */
const FORMES_SOLIDITE_DEMO: Readonly<Record<string, SoliditeAffichee>> = {
	'aucune pièce': soliditeDepuisPyramide(pyramideDePreuves([])),
	'toutes les pièces': soliditeDepuisPyramide(
		pyramideDePreuves(ETAGES_DE_PREUVE.flatMap((etage) => etage.pieces))
	)
};

export const ECRANS_CREANCE: readonly EcranDuProduit[] = [
	{
		route: '/app/creance/$id',
		libelle: 'créance',
		vide: false,
		Demo: ({ etat }) => (
			<EcranCreance
				donnees={lectureDemo(etat, {
					identifiant: 'demo',
					creance: CREANCE_DEMO,
					etatProcedure: null,
					totalDecompte: DECOMPTE_DEMO.total
				})}
			/>
		)
	},
	{
		route: '/app/creance_/$id/decompte',
		libelle: 'décompte',
		vide: true,
		Demo: ({ etat }) => (
			<EcranDecompte
				identifiant="demo"
				donnees={lectureDemo(
					etat,
					{ ...DECOMPTE_BASE_DEMO, dernier: DECOMPTE_DEMO },
					{ ...DECOMPTE_BASE_DEMO, dernier: null }
				)}
			/>
		)
	},
	{
		route: '/app/creance_/$id/litige',
		libelle: 'litige',
		vide: true,
		variantes: Object.keys(FORMES_LITIGE_DEMO),
		Demo: ({ etat, variante }) => (
			<EcranLitige
				identifiant="demo"
				donnees={lectureDemo(
					etat,
					{
						...LITIGE_BASE_DEMO,
						...litigeDepuisReponses(formeDemo(variante, REPONSES_LITIGE_DEMO, FORMES_LITIGE_DEMO)),
						conditions: CONDITIONS_A_CONFIRMER_DEMO
					},
					{
						...LITIGE_BASE_DEMO,
						...litigeDepuisReponses(REPONSES_LITIGE_TERMINEES_DEMO),
						conditions: []
					}
				)}
			/>
		)
	},
	{
		route: '/app/creance_/$id/relances',
		libelle: 'relances',
		vide: false,
		variantes: Object.keys(FORMES_RELANCES_DEMO),
		Demo: ({ etat, variante }) => (
			<EcranRelances
				identifiant="demo"
				donnees={lectureDemo(etat, {
					debiteur: DEBITEUR_DEMO,
					niveaux: formeDemo(variante, RELANCES_DEMO, FORMES_RELANCES_DEMO)
				})}
			/>
		)
	},
	{
		route: '/app/creance_/$id/risques',
		libelle: 'risques',
		vide: true,
		variantes: Object.keys(FORMES_RISQUES_DEMO),
		Demo: ({ etat, variante }) => (
			<EcranRisques
				identifiant="demo"
				donnees={lectureDemo(
					etat,
					{
						debiteur: DEBITEUR_DEMO,
						risques: formeDemo(variante, RISQUES_DEMO, FORMES_RISQUES_DEMO)
					},
					{ debiteur: DEBITEUR_DEMO, risques: [] }
				)}
			/>
		)
	},
	{
		route: '/app/creance_/$id/solidite',
		libelle: 'solidité',
		vide: false,
		variantes: Object.keys(FORMES_SOLIDITE_DEMO),
		Demo: ({ etat, variante }) => (
			<EcranSolidite
				identifiant="demo"
				donnees={lectureDemo(etat, {
					debiteur: DEBITEUR_DEMO,
					solidite: formeDemo(variante, SOLIDITE_DEMO, FORMES_SOLIDITE_DEMO)
				})}
			/>
		)
	}
];
