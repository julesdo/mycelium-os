import type { CreanceAffichee } from '../../screens/creance';
import { EcranCreance } from '../../screens/creance';
import { EcranDecompte } from '../../screens/analyses/decompte';
import { EcranLitige } from '../../screens/analyses/litige';
import { EcranRelances } from '../../screens/analyses/relances';
import type { RisqueAffiche } from '../../screens/analyses/risques';
import { EcranRisques } from '../../screens/analyses/risques';
import { EcranSolidite } from '../../screens/analyses/solidite';
import { depuisCentimes } from '../../lib/socle/montants';
import {
	ETAGES_DE_PREUVE,
	pyramideDePreuves,
	type Pyramide
} from '../../lib/verticales/recouvrement/solidite';
import { LIBELLE_CONDITION } from '../../lib/verticales/recouvrement/qualification';
import {
	lireLitige,
	questionsRestantes,
	type Reponses
} from '../../lib/verticales/recouvrement/litige';
import { qualifier } from '../../lib/verticales/recouvrement/scoring';
import {
	NIVEAUX_RELANCE,
	composerRelance,
	type ElementsRelance
} from '../../lib/verticales/recouvrement/relance';
import type { DecompteAffiche, NiveauAffiche, SoliditeAffichee } from '../../ui';
import { lectureDemo, type EcranDuProduit } from './demo';

/**
 * La pyramide de preuves utilisée par `CREANCE_DEMO` et par la démonstration
 * de l'écran de solidité, pour que les deux s'accordent : la rangée qui
 * résume et la page qui détaille doivent montrer le même compte.
 */
const PYRAMIDE_DEMO = pyramideDePreuves(['FACTURE', 'BON_DE_COMMANDE']);

/**
 * La question de la condition « entre commerçants », composée exactement
 * comme `creanceComplete` la compose (`src/lib/convex/recouvrement/lecture.ts`,
 * autour des lignes 567 à 569). Partagée par le résumé de la créance et par
 * la démonstration du litige : les deux montrent la même question.
 */
const CONDITION_ENTRE_COMMERCANTS_DEMO = {
	condition: 'entreCommercants',
	libelle: `Pouvez-vous confirmer ${LIBELLE_CONDITION.entreCommercants} de cette créance ?`
};

const CREANCE_DEMO: CreanceAffichee = {
	debiteur: 'Fournitures Durand',
	debiteurId: 'demo-debiteur',
	/**
	 * ⚠️ UNE PROCÉDURE COLLECTIVE DANS LA DÉMONSTRATION, délibérément.
	 *
	 * C'est le cas qui rend la rangée du débiteur indispensable : le radar
	 * l'a relevée au registre pendant la nuit, elle a fait baisser le score
	 * affiché juste au-dessus, et jusqu'ici l'écran n'en disait rien. La
	 * salle d'exposition doit montrer l'état où le défaut se voyait, pas
	 * celui où il ne se voyait pas.
	 */
	santeDebiteur: 'PROCEDURE_COLLECTIVE',
	score: 0.65,
	eligible: false,
	principalRestantDu: 1_200_000n,
	factures: [{ _id: 'f1' }, { _id: 'f2' }],
	questions: [CONDITION_ENTRE_COMMERCANTS_DEMO],
	litige: {
		litigieux: false,
		constats: [],
		questions: questionsRestantes({ CONTESTATION_ECRITE: 'NON' }).map((q) => ({ cle: q.cle }))
	},
	risques: [{ type: 'RETARDS_REPETES', gravite: 'MOYENNE' }],
	solidite: { etablies: PYRAMIDE_DEMO.etablies, attendues: PYRAMIDE_DEMO.attendues },
	relances: [
		{ niveau: 1, disponible: true },
		{ niveau: 2, disponible: false },
		{ niveau: 3, disponible: false }
	],
	procedures: [
		{ cle: 'relance-amiable', disponible: true },
		{ cle: 'injonction-de-payer', disponible: false }
	],
	regimePrescriptionNote: 'Régime général : cinq ans à compter de l’exigibilité. Secteur déterminé.'
};

/**
 * Le décompte, avec ce qu'il doit prouver.
 *
 * Deux périodes à taux différents, un principal qui baisse en cours de route
 * après un règlement, et un tableau à sept colonnes qui doit tenir à 375 px
 * sans faire déborder la page — il défile pour lui seul.
 */
const DECOMPTE_DEMO: DecompteAffiche = {
	arreteAu: '2026-09-03',
	convention: 'ACT_365',
	principalRestantDu: 600_000n,
	interets: 33_350n,
	indemniteForfaitaire: 4_000n,
	total: 637_350n,
	lignes: [
		{
			reference: 'FA-2026-118',
			principalRestantDu: 600_000n,
			interets: 33_350n,
			indemniteForfaitaire: 4_000n,
			total: 637_350n,
			segments: [
				{
					debut: '2026-05-01',
					fin: '2026-07-01',
					jours: 61,
					principal: 1_000_000n,
					taux: { numerateur: 1215n, denominateur: 10_000n },
					baseAnnuelle: 365,
					interets: 20_305n
				},
				{
					debut: '2026-07-01',
					fin: '2026-09-03',
					jours: 64,
					principal: 600_000n,
					taux: { numerateur: 1240n, denominateur: 10_000n },
					baseAnnuelle: 365,
					interets: 13_045n
				}
			]
		}
	]
};

/** Ce que la démonstration du décompte partage entre son état prêt et son état vide. */
const DECOMPTE_BASE_DEMO = {
	debiteur: 'Fournitures Durand',
	enCours: false,
	erreur: null,
	onArreter: () => undefined,
	onTelecharger: () => undefined
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

/** L'état « sans données » : les six questions répondues, aucune contestation retenue. */
const REPONSES_LITIGE_TERMINEES_DEMO: Reponses = {
	CONTESTATION_ECRITE: 'NON',
	REFUS_RECEPTION: 'NON',
	AVOIR_RECLAME: 'NON',
	PENALITES_OPPOSEES: 'NON',
	INSTANCE_EN_COURS: 'NON',
	RECONNAISSANCE_ECRITE: 'NON'
};

/** La variante « litigieux » : une contestation écrite déclarée. */
const REPONSES_LITIGE_LITIGIEUSES_DEMO: Reponses = { CONTESTATION_ECRITE: 'OUI' };

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

/** Ce que la démonstration du litige partage entre son état prêt, sa variante et son état vide. */
const LITIGE_BASE_DEMO = {
	debiteur: 'Fournitures Durand',
	enCours: false,
	erreur: null,
	onDeclarer: () => undefined,
	onRepondre: () => undefined
};

// Les textes viennent du DOMAINE, pas d'une fixture recopiée : une
// démonstration qui invente ses propres phrases montre un produit qui
// n'existe pas.
const ELEMENTS_RELANCE_DEMO: ElementsRelance = {
	creancier: 'Thumbbb Agency',
	debiteur: 'Fournitures Durand',
	factures: [
		{
			reference: 'FA-2026-004',
			montantTTC: depuisCentimes(1_200_000n),
			dateEcheance: '2026-05-15'
		}
	],
	principalRestantDu: depuisCentimes(1_200_000n),
	santeDebiteur: 'SAINE',
	aujourdHui: '2026-09-03',
	decompte: {
		arreteAu: '2026-09-03',
		interets: depuisCentimes(64_000n),
		indemniteForfaitaire: depuisCentimes(4_000n),
		total: depuisCentimes(1_268_000n)
	}
};

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

const RELANCES_DEMO: readonly NiveauAffiche[] = niveauxDepuisElements(ELEMENTS_RELANCE_DEMO);

/** La variante « suspendues » : le coupe-circuit d'une procédure collective. */
const RELANCES_SUSPENDUES_DEMO: readonly NiveauAffiche[] = niveauxDepuisElements({
	...ELEMENTS_RELANCE_DEMO,
	santeDebiteur: 'PROCEDURE_COLLECTIVE',
	constatRegistre: {
		nature: 'Jugement d’ouverture de liquidation judiciaire',
		dateJugement: '2026-03-14'
	}
});

/**
 * Les risques d'une créance en procédure collective, avec une contestation
 * écrite déclarée. Calculés par `qualifier()` (`scoring.ts`), jamais
 * recopiés : `retardsAnterieurs: 0` est la valeur que `creanceComplete`
 * passe aujourd'hui (`src/lib/convex/recouvrement/lecture.ts`), en
 * attendant l'historique des règlements.
 */
const RISQUES_DEMO: readonly RisqueAffiche[] = qualifier({
	certaine: 'ko',
	liquide: 'ok',
	exigible: 'ok',
	entreCommercants: 'unknown',
	piecesFournies: ['FACTURE', 'BON_DE_COMMANDE'],
	signauxContestation: ['CONTESTATION_ECRITE'],
	santeDebiteur: 'PROCEDURE_COLLECTIVE',
	retardsAnterieurs: 0
}).risques;

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

/** La variante « aucune pièce ». */
const SOLIDITE_AUCUNE_PIECE_DEMO: SoliditeAffichee = soliditeDepuisPyramide(pyramideDePreuves([]));

/** La variante « toutes les pièces » : un exemplaire de chaque type accepté par un étage. */
const SOLIDITE_TOUTES_PIECES_DEMO: SoliditeAffichee = soliditeDepuisPyramide(
	pyramideDePreuves(ETAGES_DE_PREUVE.flatMap((etage) => etage.pieces))
);

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
					totalDecompte: null
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
		variantes: ['litigieux'],
		Demo: ({ etat, variante }) => (
			<EcranLitige
				identifiant="demo"
				donnees={lectureDemo(
					etat,
					{
						...LITIGE_BASE_DEMO,
						...litigeDepuisReponses(
							variante === 'litigieux' ? REPONSES_LITIGE_LITIGIEUSES_DEMO : REPONSES_LITIGE_DEMO
						),
						conditions: [CONDITION_ENTRE_COMMERCANTS_DEMO]
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
		variantes: ['suspendues'],
		Demo: ({ etat, variante }) => (
			<EcranRelances
				identifiant="demo"
				donnees={lectureDemo(etat, {
					debiteur: 'Fournitures Durand',
					niveaux: variante === 'suspendues' ? RELANCES_SUSPENDUES_DEMO : RELANCES_DEMO
				})}
			/>
		)
	},
	{
		route: '/app/creance_/$id/risques',
		libelle: 'risques',
		vide: true,
		Demo: ({ etat }) => (
			<EcranRisques
				identifiant="demo"
				donnees={lectureDemo(
					etat,
					{ debiteur: 'Fournitures Durand', risques: RISQUES_DEMO },
					{ debiteur: 'Fournitures Durand', risques: [] }
				)}
			/>
		)
	},
	{
		route: '/app/creance_/$id/solidite',
		libelle: 'solidité',
		vide: false,
		variantes: ['aucune pièce', 'toutes les pièces'],
		Demo: ({ etat, variante }) => (
			<EcranSolidite
				identifiant="demo"
				donnees={lectureDemo(etat, {
					debiteur: 'Fournitures Durand',
					solidite:
						variante === 'aucune pièce'
							? SOLIDITE_AUCUNE_PIECE_DEMO
							: variante === 'toutes les pièces'
								? SOLIDITE_TOUTES_PIECES_DEMO
								: SOLIDITE_DEMO
				})}
			/>
		)
	}
];
