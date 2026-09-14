import type { CreanceAffichee } from '../../screens/creance';
import { EcranCreance } from '../../screens/creance';
import { EcranDecompte } from '../../screens/analyses/decompte';
import { EcranLitige } from '../../screens/analyses/litige';
import { EcranRelances } from '../../screens/analyses/relances';
import type { RisqueAffiche } from '../../screens/analyses/risques';
import { EcranRisques } from '../../screens/analyses/risques';
import { EcranSolidite } from '../../screens/analyses/solidite';
import { depuisCentimes } from '../../lib/socle/montants';
import { ETAGES_DE_PREUVE, pyramideDePreuves } from '../../lib/verticales/recouvrement/solidite';
import { questionsRestantes } from '../../lib/verticales/recouvrement/litige';
import { NIVEAUX_RELANCE, composerRelance } from '../../lib/verticales/recouvrement/relance';
import type { DecompteAffiche, NiveauAffiche, QuestionLitige, SoliditeAffichee } from '../../ui';
import { lectureDemo, type EcranDuProduit } from './demo';

/** La pyramide de preuves utilisée par `CREANCE_DEMO`, pour son décompte de solidité. */
const PYRAMIDE_DEMO = pyramideDePreuves(['FACTURE', 'BON_DE_COMMANDE']);

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
	questions: [
		{ condition: 'entreCommercants', libelle: 'Les deux parties sont-elles commerçantes ?' }
	],
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
	interets: 41_368n,
	indemniteForfaitaire: 4_000n,
	total: 645_368n,
	lignes: [
		{
			reference: 'FA-2026-118',
			principalRestantDu: 600_000n,
			interets: 41_368n,
			indemniteForfaitaire: 4_000n,
			total: 645_368n,
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
					interets: 21_063n
				}
			]
		}
	]
};

/** Les trois questions de qualification de litige, telles que le domaine les pose. */
const QUESTIONS_LITIGE_DEMO: readonly QuestionLitige[] = [
	{
		cle: 'CONTESTATION_ECRITE',
		question:
			'Ce client vous a-t-il écrit pour contester cette facture — courrier, e-mail, ou réserve portée sur un bon de livraison ?',
		portee:
			'Une contestation écrite fait sortir le dossier des procédures listées ici, qui se déroulent toutes sans débat.'
	},
	{
		cle: 'REFUS_RECEPTION',
		question: 'A-t-il refusé tout ou partie de la marchandise ou de la prestation ?',
		portee: 'Un refus porte sur ce qui est dû, pas sur le paiement : il touche le montant lui-même.'
	},
	{
		cle: 'AVOIR_RECLAME',
		question: 'Vous a-t-il réclamé un avoir que vous n’avez pas émis ?',
		portee: 'Un avoir réclamé et non émis est un désaccord ouvert sur le montant.'
	}
];

// Les textes viennent du DOMAINE, pas d'une fixture recopiée : une
// démonstration qui invente ses propres phrases montre un produit qui
// n'existe pas, et c'est ce qui s'est passé sur la pyramide de preuves.
const ELEMENTS_RELANCE_DEMO = {
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
	santeDebiteur: 'SAINE' as const,
	aujourdHui: '2026-09-03',
	decompte: {
		arreteAu: '2026-09-03',
		interets: depuisCentimes(64_000n),
		indemniteForfaitaire: depuisCentimes(4_000n),
		total: depuisCentimes(1_268_000n)
	}
};

/** Trois niveaux, dont la mise en demeure, verrouillée faute de mentions au référentiel. */
const RELANCES_DEMO: readonly NiveauAffiche[] = NIVEAUX_RELANCE.map((description) => {
	const relance = composerRelance(description.niveau, ELEMENTS_RELANCE_DEMO);
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

/**
 * Deux risques réels du domaine : un bloquant — une contestation, qui ferme
 * les procédures sans débat évaluées ici — et un simple constat.
 */
const RISQUES_DEMO: readonly RisqueAffiche[] = [
	{
		type: 'ECART_COMMANDE_FACTURE',
		description: 'Un écart existe entre ce qui a été commandé et ce qui a été facturé.',
		gravite: 'BLOQUANTE'
	},
	{
		type: 'RETARDS_REPETES',
		description: '4 retards de paiement ont été observés sur ce débiteur.',
		gravite: 'MOYENNE'
	}
];

/** Un étage de la pyramide de preuves, phrasé par le domaine — jamais recomposé ici. */
function etageSoliditeDemo(cle: string, presente: boolean, poids: number) {
	const source = ETAGES_DE_PREUVE.find((e) => e.cle === cle)!;
	return {
		cle,
		fait: source.fait,
		presente,
		poids,
		etat: presente ? source.etabli : `Aucune pièce ne documente ${source.fait}.`
	};
}

/** À mi-chemin : ce qui pèse le plus dans le score est nommé. */
const SOLIDITE_DEMO: SoliditeAffichee = {
	constat: 'Deux des quatre pièces attendues sont absentes.',
	etablies: 2,
	attendues: 4,
	prochaine: 'livraison',
	etages: [
		etageSoliditeDemo('commande', true, 3),
		etageSoliditeDemo('livraison', false, 3),
		etageSoliditeDemo('conditionsContractuelles', true, 1),
		etageSoliditeDemo('miseEnDemeure', false, 1)
	]
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
					{
						debiteur: 'Fournitures Durand',
						dernier: DECOMPTE_DEMO,
						enCours: false,
						erreur: null,
						onArreter: () => undefined,
						onTelecharger: () => undefined
					},
					{
						debiteur: 'Fournitures Durand',
						dernier: null,
						enCours: false,
						erreur: null,
						onArreter: () => undefined,
						onTelecharger: () => undefined
					}
				)}
			/>
		)
	},
	{
		route: '/app/creance_/$id/litige',
		libelle: 'litige',
		vide: true,
		Demo: ({ etat }) => (
			<EcranLitige
				identifiant="demo"
				donnees={lectureDemo(
					etat,
					{
						debiteur: 'Fournitures Durand',
						questions: QUESTIONS_LITIGE_DEMO,
						constats: ['Le caractère certain reste indéterminé : 3 faits ne sont pas renseignés.'],
						litigieux: false,
						conditions: [
							{
								condition: 'entreCommercants',
								libelle: 'Les deux parties sont-elles commerçantes ?'
							}
						],
						enCours: false,
						erreur: null,
						onDeclarer: () => undefined,
						onRepondre: () => undefined
					},
					{
						debiteur: 'Fournitures Durand',
						questions: [],
						constats: [],
						litigieux: false,
						conditions: [],
						enCours: false,
						erreur: null,
						onDeclarer: () => undefined,
						onRepondre: () => undefined
					}
				)}
			/>
		)
	},
	{
		route: '/app/creance_/$id/relances',
		libelle: 'relances',
		vide: false,
		Demo: ({ etat }) => (
			<EcranRelances
				identifiant="demo"
				donnees={lectureDemo(etat, { debiteur: 'Fournitures Durand', niveaux: RELANCES_DEMO })}
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
		Demo: ({ etat }) => (
			<EcranSolidite
				identifiant="demo"
				donnees={lectureDemo(etat, { debiteur: 'Fournitures Durand', solidite: SOLIDITE_DEMO })}
			/>
		)
	}
];
