import type {
	ConditionAConfirmer,
	CreanceOuverte,
	RisqueAffiche
} from '../../screens/creance';
import { EcranCreance } from '../../screens/creance';
import { additionner, depuisCentimes, enCentimes, soustraire } from '../../lib/socle/montants';
import { etatDuReferentiel } from '../../lib/verticales/recouvrement/referentiel';
import {
	libelleEvenement,
	suivreProcedure,
	type EvenementSurvenu
} from '../../lib/verticales/recouvrement/apres-procedure';
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
import {
	prescriptionDe,
	regimePrescription,
	type SecteurCreance
} from '../../lib/verticales/recouvrement/pays/france/prescription';
import { PROCEDURES, proceduresEnvisageables } from '../../lib/verticales/recouvrement/procedures';
import {
	ETAGES_DE_PREUVE,
	pyramideDePreuves,
	type Pyramide
} from '../../lib/verticales/recouvrement/solidite';
import {
	LIBELLE_CONDITION,
	type ClePiece,
	type EtatCritere
} from '../../lib/verticales/recouvrement/qualification';
import {
	lireLitige,
	proposerFaits,
	questionsRestantes,
	signauxDepuisFaits,
	type PropositionFait,
	type Reponses
} from '../../lib/verticales/recouvrement/litige';
import { qualifier, type SanteDebiteur } from '../../lib/verticales/recouvrement/scoring';
import {
	NIVEAUX_RELANCE,
	composerRelance,
	type ElementsRelance
} from '../../lib/verticales/recouvrement/relance';
import {
	TYPES_PIECE,
	type DecompteAffiche,
	type NiveauAffiche,
	type PieceAffichee,
	type SoliditeAffichee
} from '../../ui';
import { BARREAUX_DEMO, CARNET_DEMO, ETABLISSEMENT_DEMO, voieDeLaCreance } from './communes';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

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
 * fonctions du domaine que les requêtes du produit appellent. Ne reste écrit
 * que ce qu'aucune fonction ne produit : le nom du débiteur, un secteur, le
 * jour de la démonstration, une santé relevée au registre et le constat qui
 * l'accompagne, la qualité de commerçant de chacune des deux parties, des
 * réponses du gérant, des pièces, des factures. Le nom du créancier vient de
 * l'établissement de la salle, déclaré une seule fois dans `communes.ts`.
 * Une valeur que le serveur calcule sans fonction exportée porte la ligne du
 * produit qu'elle reproduit.
 */

/** Le débiteur, nommé une seule fois pour toute la famille. */
const DEBITEUR_DEMO = 'Fournitures Durand';

/** Le créancier : l'établissement de la salle (`ETABLISSEMENT_DEMO`), ce que chaque relance signe. */
const CREANCIER_DEMO = ETABLISSEMENT_DEMO.nom;

/**
 * Le secteur du débiteur, que le gérant choisit sur sa fiche (`renseignerSecteur`,
 * `src/lib/convex/recouvrement/debiteurs.ts`, ligne 174) : aucune fonction ne le
 * déduit. Le régime général, déterminé : sans secteur, `creanceComplete` retient
 * `INDETERMINE`, donc le délai le plus court et une note d'hypothèse.
 */
const SECTEUR_DEMO: SecteurCreance = 'GENERAL';

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
 * Sur la créance, le domaine en tire deux effets, et la famille montre les
 * deux : un risque dans la qualification, et la suspension des trois niveaux
 * de relance.
 */
const SANTE_DEBITEUR_DEMO: SanteDebiteur = 'PROCEDURE_COLLECTIVE';

/** Ce que le registre porte pour ce débiteur, et que le constat de suspension cite mot pour mot. */
const CONSTAT_REGISTRE_DEMO = {
	nature: 'Jugement d’ouverture de liquidation judiciaire',
	dateJugement: '2026-03-14'
};

/**
 * La qualité de commerçant des deux parties. Aucune des deux n'est connue
 * dans la famille : la condition « entre commerçants » reste donc à
 * confirmer, et c'est la question que la rangée compte et que la page du
 * litige pose (`conditionsDepuisReponses`, plus bas). Le litige vide de la
 * page les répond `'ok'`, seule entrée qu'il change : la question s'y trouve
 * refermée.
 */
const CREANCIER_COMMERCANT_DEMO: EtatCritere = 'unknown';
const DEBITEUR_COMMERCANT_DEMO: EtatCritere = 'unknown';

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

/** L'état « sans données » : les six questions répondues, aucune contestation retenue. */
const REPONSES_LITIGE_TERMINEES_DEMO: Reponses = {
	CONTESTATION_ECRITE: 'NON',
	REFUS_RECEPTION: 'NON',
	AVOIR_RECLAME: 'NON',
	PENALITES_OPPOSEES: 'NON',
	INSTANCE_EN_COURS: 'NON',
	RECONNAISSANCE_ECRITE: 'NON'
};

/**
 * Les pièces rattachées à la créance. Une seule liste pour le score et pour la
 * pyramide, comme `creanceComplete` la lit une fois pour les deux
 * (`src/lib/convex/recouvrement/lecture.ts`, lignes 494 à 501) : la rangée qui
 * résume et la page qui détaille doivent montrer le même compte.
 */
const PIECES_RATTACHEES_DEMO: readonly ClePiece[] = ['FACTURE', 'BON_DE_COMMANDE'];

/**
 * Les pièces telles que la section 6 les montre — le fichier déposé, ce que la
 * lecture en a tiré, et son classement.
 *
 * ⚠️ ÉCRITES, et c'est la seule liste de ce fichier qui le soit : aucune
 * fonction du domaine ne produit un dépôt. Leurs types correspondent aux clés
 * de `PIECES_RATTACHEES_DEMO`, sans quoi la section des pièces et la pyramide
 * de preuves montreraient deux comptes différents sur le même écran. La
 * troisième est `INDETERMINE` : une lecture qui n'a rien conclu se voit, elle
 * ne se devine pas.
 */
const PIECES_DEMO: readonly PieceAffichee[] = [
	{
		_id: 'demo-piece-facture',
		type: 'FACTURE',
		statut: 'LUE',
		filename: 'FA-2026-118.pdf',
		reference: 'FA-2026-118',
		dateDocument: '2026-04-01',
		constat: 'La facture du dossier, lue et rapprochée.'
	},
	{
		_id: 'demo-piece-bc',
		type: 'BON_DE_COMMANDE',
		statut: 'LUE',
		filename: 'BC-2026-118.pdf',
		reference: 'BC-2026-118',
		dateDocument: '2026-03-18',
		constat: 'Commande signée par le client.'
	},
	{
		_id: 'demo-piece-scan',
		type: 'INDETERMINE',
		statut: 'A_CLASSER',
		filename: 'scan_20260612.jpg',
		constat: 'La lecture n’a rien conclu : ce document attend son classement.'
	}
];

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
 * lignes 398 à 408). Les deux qualités de commerçant sont celles de la
 * famille par défaut ; le litige vide les remplace par `'ok'`.
 */
function conditionsDepuisReponses(
	reponses: Reponses,
	creancierCommercant: EtatCritere = CREANCIER_COMMERCANT_DEMO,
	debiteurCommercant: EtatCritere = DEBITEUR_COMMERCANT_DEMO
): ConditionsDeduites {
	return {
		...deduireConditions({
			montantExigible: PRINCIPAL_RESTANT_DU_DEMO,
			// La plus tardive des exigibilités, comme `creerCreance` la retient (lignes 273 à 281).
			dateExigibilite: FACTURES_DEMO.map((facture) => facture.dateExigibilite).reduce(
				(tardive, date) => (date > tardive ? date : tardive)
			),
			aujourdHui: AUJOURD_HUI_DEMO,
			creancierCommercant,
			debiteurCommercant
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
		piecesFournies: PIECES_RATTACHEES_DEMO,
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
 * litige les reçoit telles quelles (`creance.$id.litige.tsx`).
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
function litigeDepuisReponses(reponses: Reponses, propositions: readonly PropositionFait[] = []) {
	const lecture = lireLitige(reponses);
	return {
		questions: questionsRestantes(reponses).map((q) => {
			const proposition = propositions.find((p) => p.cle === q.cle);
			return {
				cle: q.cle,
				question: q.question,
				portee: q.portee,
				...(proposition === undefined
					? {}
					: {
							proposition: {
								reponse: proposition.reponse,
								source: proposition.source,
								date: proposition.date
							}
						})
			};
		}),
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
const PYRAMIDE_DEMO = pyramideDePreuves(PIECES_RATTACHEES_DEMO);

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
 * la convention que la page demande (`creance.$id.decompte.tsx`). La
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
			peutFaire: relance.disponible ? undefined : relance.peutFaire,
			constat: relance.disponible ? undefined : relance.constat,
			blocages: relance.disponible ? undefined : [...relance.blocages],
			coutDeLAttente: relance.disponible ? undefined : relance.coutDeLAttente,
			geste: relance.disponible ? undefined : relance.geste
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
	creancier: CREANCIER_DEMO,
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


/**
 * Les deux propositions du questionnaire (A4 et A10), composées par le DOMAINE
 * — `proposerFaits` — depuis une réserve lue sur un bon de livraison et une
 * réponse déjà donnée sur une autre créance du même client. Les phrases ne sont
 * pas recopiées ici : une démonstration qui invente les siennes montre un
 * produit qui n'existe pas.
 */
const PROPOSITIONS_LITIGE_DEMO: readonly PropositionFait[] = proposerFaits({
	reserves: [
		{
			texte: 'Palette n° 3 refusée, film déchiré et deux cartons écrasés.',
			piece: 'BL-2026-118',
			date: 'document du 12/03/2026'
		}
	],
	declarationsAnterieures: [
		{ cle: 'REFUS_RECEPTION', reponse: 'OUI', date: 'déclarée le 03/09/2026' }
	]
});

/** Ce qu'une forme du litige porte : les réponses en base, et ce que le logiciel propose. */
interface FormeLitige {
	readonly reponses: Reponses;
	readonly propositions: readonly PropositionFait[];
}

/** La forme principale : les réponses de la famille, sans proposition. */
const FORME_LITIGE_DEMO: FormeLitige = { reponses: REPONSES_LITIGE_DEMO, propositions: [] };

/** Le litige d'une forme, réponses et propositions ensemble. */
function litigeDepuisForme(forme: FormeLitige) {
	return litigeDepuisReponses(forme.reponses, forme.propositions);
}

/**
 * Les formes nommées du litige.
 *
 * « proposées » part d'un questionnaire NEUF — aucune réponse en base — parce
 * que c'est la seule situation où les questions que le logiciel sait déjà
 * remplir sont encore posées.
 */
const FORMES_LITIGE_DEMO: Readonly<Record<string, FormeLitige>> = {
	litigieux: { reponses: REPONSES_LITIGE_LITIGIEUSES_DEMO, propositions: [] },
	proposees: { reponses: {}, propositions: PROPOSITIONS_LITIGE_DEMO }
};

// INCONNUE, la santé que l'import pose tant que le radar n'a rien relevé, et non celle de la famille : suspendus, les deux premiers niveaux cacheraient leurs brouillons.
const RELANCES_DEMO: readonly NiveauAffiche[] = niveauxDepuisElements({
	...ELEMENTS_RELANCE_DEMO,
	santeDebiteur: 'INCONNUE'
});

/**
 * La variante « sans décompte » : le seul refus du module qui se lève d'un
 * geste, et donc le seul endroit où la rangée « Arrêter le décompte » se voit.
 * Sans elle, les quatre parties du refus de niveau 2 ne se regardaient nulle
 * part avant la production.
 */
const RELANCES_SANS_DECOMPTE_DEMO: readonly NiveauAffiche[] = niveauxDepuisElements({
	...ELEMENTS_RELANCE_DEMO,
	decompte: undefined,
	santeDebiteur: 'INCONNUE'
});

/** Les variantes de la page : relances suspendues, et niveau 2 sans décompte arrêté. */
const FORMES_RELANCES_DEMO: Readonly<Record<string, readonly NiveauAffiche[]>> = {
	suspendues: RELANCES_SUSPENDUES_DEMO,
	'sans-decompte': RELANCES_SANS_DECOMPTE_DEMO
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
/**
 * LA CRÉANCE DE LA FAMILLE, ASSEMBLÉE EN UNE SEULE FOIS.
 *
 * ⚠️ UNE FONCTION, ET PAS SEPT CONSTANTES. La page est une seule page : ses
 * neuf sections lisent le même dossier, et une variante qui ne changerait
 * qu'une constante sur sept ferait cohabiter à l'écran un litige répondu avec
 * un risque de contestation, ou une voie engagée sur des conditions encore
 * ouvertes. Tout se recalcule ici depuis les MÊMES entrées, par les fonctions
 * du domaine que les requêtes du produit appellent.
 */
function creanceDemo({
	reponses = REPONSES_LITIGE_DEMO,
	propositions = [],
	relances = RELANCES_SUSPENDUES_DEMO,
	solidite = SOLIDITE_DEMO,
	pieces = PIECES_DEMO,
	journal = null,
	commercants = false
}: {
	readonly reponses?: Reponses;
	readonly propositions?: readonly PropositionFait[];
	readonly relances?: readonly NiveauAffiche[];
	readonly solidite?: SoliditeAffichee;
	readonly pieces?: readonly PieceAffichee[];
	/** Les faits consignés d'une voie engagée, ou `null` quand aucune ne court. */
	readonly journal?: readonly EvenementSurvenu[] | null;
	/** Les deux qualités de commerçant acquises : ce qu'il faut pour engager une voie. */
	readonly commercants?: boolean;
} = {}): CreanceOuverte {
	const qualite: EtatCritere = commercants ? 'ok' : 'unknown';
	const conditions = conditionsDepuisReponses(reponses, qualite, qualite);
	const qualification = qualifier({
		...conditions,
		piecesFournies: PIECES_RATTACHEES_DEMO,
		signauxContestation: signauxDepuisFaits(reponses),
		santeDebiteur: SANTE_DEBITEUR_DEMO,
		retardsAnterieurs: 0
	});

	return {
		identifiant: 'demo',
		debiteur: DEBITEUR_DEMO,
		debiteurId: 'demo-debiteur',
		santeDebiteur: SANTE_DEBITEUR_DEMO,
		eligible: qualification.eligible,
		nombreFactures: FACTURES_DEMO.length,
		principalRestantDu: enCentimes(PRINCIPAL_RESTANT_DU_DEMO),

		// Les deux dates de l'en-tête, lues sur les factures comme la route les lit.
		echeanceLaPlusAncienne: FACTURES_DEMO.map((facture) => facture.dateEcheance).reduce(
			(tot, date) => (date < tot ? date : tot)
		),
		// La prescription que le domaine pose sur la facture : la date d'exigibilité
		// plus le délai du régime retenu. Jamais écrite à la main.
		prescriptionLaPlusProche:
			prescriptionDe(
				[
					FACTURES_DEMO.map((facture) => facture.dateExigibilite).reduce((tot, date) =>
						date < tot ? date : tot
					)
				],
				SECTEUR_DEMO
			).datePrescription ?? null,

		// Le montant du jour : le même calcul que `preparerArret` projette.
		montantDuJour: DECOMPTE_DEMO,
		refusDuMontant: null,
		fiches: etatDuReferentiel().fiches,
		decomptesArretes: [
			{ id: 'demo-decompte', arreteAu: DECOMPTE_DEMO.arreteAu, total: DECOMPTE_DEMO.total }
		],
		onTelechargerLaPiece: () => undefined,

		/*
		  ⚠️ L'HYPOTHÈSE VIENT DU DOMAINE, comme dans la route : `regimePrescription`
		  dit le délai retenu ET pourquoi. Recopier la phrase ici montrerait un
		  produit qui n'existe pas.
		*/
		hypotheses: [
			{
				cle: 'regime-prescription',
				enonce: regimePrescription(SECTEUR_DEMO).note,
				fait: 'Le secteur d’activité de ce client détermine le délai de prescription.',
				ceQuiLaLeve:
					'Préciser le secteur du client, sur sa fiche, fixe le délai réellement applicable.'
			}
		],
		/*
		  Les deux seules sources d'angle mort, comme la route les assemble : ce que
		  la machine à états DÉCLARE, et les factures dont la prescription ne se
		  compte pas. Celles de la famille portent toutes une date d'exigibilité
		  lisible : la seconde liste est donc vide, et la section le dit en toutes
		  lettres plutôt que d'afficher un zéro.
		*/
		anglesMorts: (journal === null ? [] : suiviDepuisJournal(journal).anglesMorts).map(
			(constat, rang) => ({ cle: `procedure-${rang}`, constat, montantEnJeu: null })
		),

		litige: litigeDepuisReponses(reponses, propositions),
		conditions: conditionsADemander(conditions)
			// `certaine` en est exclue : elle se déduit des faits déclarés au litige.
			.filter((condition) => condition !== 'certaine')
			.map((condition) => ({
				condition,
				libelle: `Pouvez-vous confirmer ${
					LIBELLE_CONDITION[condition as keyof typeof LIBELLE_CONDITION]
				} de cette créance ?`
			})),
		onDeclarerFait: () => undefined,
		onRepondreCondition: () => undefined,

		solidite,
		risques: qualification.risques,

		pieces,
		optionsTypePiece: TYPES_PIECE,
		onDeposer: () => undefined,
		onClasser: () => undefined,
		onRetirer: () => undefined,

		suivi: journal === null ? null : suiviDepuisJournal(journal),
		voies: Object.values(PROCEDURES).map((procedure) => voieDeLaCreance(procedure, conditions)),
		carnet: CARNET_DEMO,
		// Aucun intervenant rattaché : la page relit alors « Moi-même ».
		intervenantChoisi: null,
		nomIntervenant: null,
		onConsigner: () => undefined,
		onDeclarerVoie: () => undefined,
		onRattacher: () => undefined,
		onAjouterFiche: () => undefined,
		onOublierFiche: () => undefined,
		rechercheCommissaireOuverte: false,
		etatRechercheCommissaire: { phase: 'REPOS' },
		onOuvrirRechercheCommissaire: () => undefined,
		onFermerRechercheCommissaire: () => undefined,
		onChercherCommissaire: () => undefined,
		onRetenirEtude: () => undefined,
		rechercheAvocatOuverte: false,
		repertoire: BARREAUX_DEMO,
		barreau: '',
		specialite: '',
		etatRechercheAvocat: { phase: 'AUCUN_BARREAU' },
		onOuvrirRechercheAvocat: () => undefined,
		onFermerRechercheAvocat: () => undefined,
		onChoisirBarreau: () => undefined,
		onChoisirSpecialite: () => undefined,
		onRetenirAvocat: () => undefined,

		relances,

		enCours: false,
		erreur: null,
		aujourdHui: AUJOURD_HUI_DEMO
	};
}

/**
 * Le suivi, tel que `lireSuivi` le rend (`apresProcedure.ts`) : le journal trié
 * par date du FAIT, rejoué par `suivreProcedure`, et chaque fait nommé par
 * `libelleEvenement`. Une clé inconnue garde sa clé, comme dans le produit.
 */
function suiviDepuisJournal(evenements: readonly EvenementSurvenu[]) {
	const journal = [...evenements].sort((a, b) =>
		a.survenuLe < b.survenuLe ? -1 : a.survenuLe > b.survenuLe ? 1 : 0
	);
	const suivi = suivreProcedure(VOIE_ENGAGEE_DEMO, journal, ENGAGEE_LE_DEMO);

	return {
		etat: suivi.etat,
		libelle: suivi.libelle,
		constat: suivi.constat,
		depuisLe: suivi.depuisLe,
		echeances: suivi.echeances.map((echeance) => ({ ...echeance })),
		anglesMorts: [...suivi.anglesMorts],
		suites: suivi.suites.map((suite) => ({ ...suite })),
		terminal: suivi.terminal,
		journal: journal.map((evenement) => ({
			...evenement,
			libelle: libelleEvenement(VOIE_ENGAGEE_DEMO, evenement.cle) ?? evenement.cle
		}))
	};
}

/** La voie déclarée engagée, et le jour déclaré : l'origine des délais. */
const VOIE_ENGAGEE_DEMO = 'injonction-de-payer';
const ENGAGEE_LE_DEMO = '2026-04-15';

/**
 * ⚠️ L'ORDONNANCE RENDUE, PAS ENCORE SIGNIFIÉE. C'est l'état où court la
 * caducité, l'échéance la plus dangereuse du produit : passée, l'ordonnance est
 * perdue et tout est à reprendre pendant que la prescription court.
 */
const JOURNAL_DEMO: readonly EvenementSurvenu[] = [
	{ cle: 'ordonnance-rendue', survenuLe: '2026-06-10' }
];

/** Le même journal, puis la signification et l'absence d'opposition : la voie arrive au titre exécutoire. */
const JOURNAL_TERMINE_DEMO: readonly EvenementSurvenu[] = [
	...JOURNAL_DEMO,
	{ cle: 'ordonnance-signifiee', survenuLe: '2026-06-24' },
	{ cle: 'absence-opposition-constatee', survenuLe: '2026-08-20' }
];

/**
 * LES FORMES NOMMÉES DE LA PAGE.
 *
 * Chacune change UNE entrée, et tout le reste se recalcule autour : c'est ce
 * qui empêche une variante de montrer un écran que le produit ne peut pas
 * produire.
 */
const FORMES_CREANCE_DEMO: Readonly<Record<string, CreanceOuverte>> = {
	litigieux: creanceDemo({ reponses: REPONSES_LITIGE_LITIGIEUSES_DEMO }),
	proposées: creanceDemo({ reponses: {}, propositions: PROPOSITIONS_LITIGE_DEMO }),
	'litige répondu': creanceDemo({ reponses: REPONSES_LITIGE_TERMINEES_DEMO, commercants: true }),
	'relances prêtes': creanceDemo({ relances: RELANCES_DEMO }),
	'sans décompte arrêté': creanceDemo({ relances: RELANCES_SANS_DECOMPTE_DEMO }),
	'aucune pièce': creanceDemo({
		solidite: soliditeDepuisPyramide(pyramideDePreuves([])),
		pieces: []
	}),
	'toutes les pièces': creanceDemo({
		solidite: soliditeDepuisPyramide(
			pyramideDePreuves(ETAGES_DE_PREUVE.flatMap((etage) => etage.pieces))
		)
	}),
	/*
	  ⚠️ LA VOIE ENGAGÉE SUPPOSE LES CONDITIONS ACQUISES, et c'est pour ça que
	  `commercants` les acquiert. Montrer une injonction engagée sur une créance
	  qui pose encore la question de la qualité de commerçant ferait voir un écran
	  que le produit ne peut pas produire.
	*/
	'voie engagée': creanceDemo({
		reponses: REPONSES_LITIGE_TERMINEES_DEMO,
		commercants: true,
		journal: JOURNAL_DEMO
	}),
	'voie terminée': creanceDemo({
		reponses: REPONSES_LITIGE_TERMINEES_DEMO,
		commercants: true,
		journal: JOURNAL_TERMINE_DEMO
	})
};

/** La créance de la famille, telle que sa route la passe à l'écran une fois lue. */
const CREANCE_OUVERTE_DEMO: CreanceOuverte = creanceDemo();

export const ECRANS_CREANCE: readonly EcranDuProduit[] = [
	{
		route: '/app/creance/$id',
		libelle: 'créance',
		// Une créance sans données n'existe pas : on ne l'ouvre qu'en la
		// désignant, et ce qu'elle porte vient de ses factures.
		vide: false,
		variantes: Object.keys(FORMES_CREANCE_DEMO),
		Demo: ({ etat, variante }) => (
			<EcranCreance
				donnees={lectureDemo(
					etat,
					formeDemo(variante, CREANCE_OUVERTE_DEMO, FORMES_CREANCE_DEMO)
				)}
			/>
		)
	}
];
