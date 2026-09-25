import { EcranArret, type ArretDeLaCreance } from '../../screens/arret';
import { EcranPiece, type PieceArretee } from '../../screens/piece';
import { depuisCentimes, enCentimes } from '../../lib/socle/montants';
import { ecartJours } from '../../lib/verticales/recouvrement/calendrier';
import { controlerDecompte } from '../../lib/verticales/recouvrement/controle';
import {
	decompterCreance,
	type DecompteCreance,
	type FacturePourDecompte
} from '../../lib/verticales/recouvrement/decompte';
import {
	ANGLE_MORT_PRESCRIPTION,
	prescriptionDe,
	regimePrescription
} from '../../lib/verticales/recouvrement/pays/france/prescription';
import { periodesDeTauxParDefaut } from '../../lib/verticales/recouvrement/pays/france/taux';
import { parametresManquants, tousLesParametres } from '../../lib/verticales/recouvrement/parametres';
import type { DecompteAffiche, SuiviConseilAffiche } from '../../ui';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * L'ARRÊT ET LA PIÈCE, DANS LA SALLE D'EXPOSITION.
 *
 * ⚠️ TOUT CE QUI S'AFFICHE ICI SE CALCULE PAR LES FONCTIONS DU DOMAINE, comme
 * la famille créance. Écrire « 12 480,33 € » à la main ferait regarder une
 * géométrie sur un total que le produit ne rendrait jamais, et le seul écran du
 * produit qui ne se corrige pas est précisément celui-ci.
 *
 * Ne restent écrits que les faits qu'aucune fonction ne produit : un nom de
 * client, deux factures, deux dates, et deux factures de plus que le contrôle
 * de complétude doit voir manquer.
 */

const DEBITEUR_DEMO = 'Fournitures Durand';

/** Le jour de la démonstration, figé : un « aujourd'hui » qui bouge ne se compare plus. */
const AUJOURD_HUI_DEMO = '2026-09-03';

/** La date du décompte déjà arrêté : dix-huit jours plus tôt, pour que l'écart existe. */
const ARRETE_LE_DEMO = '2026-08-16';

const SECTEUR_DEMO = 'GENERAL' as const;

interface FactureDemo {
	readonly reference: string;
	readonly montantTTC: bigint;
	readonly dateExigibilite: string;
}

/** Les deux factures que la créance porte. */
const FACTURES_DE_LA_CREANCE: readonly FactureDemo[] = [
	{ reference: 'FA-2026-0142', montantTTC: 1_250_000n, dateExigibilite: '2026-03-12' },
	{ reference: 'FA-2026-0177', montantTTC: 640_000n, dateExigibilite: '2026-04-02' }
];

/**
 * DEUX FACTURES DU MÊME CLIENT QUI NE SONT PAS AU DÉCOMPTE.
 *
 * C'est l'état qu'on vient regarder : le contrôle de complétude doit les nommer,
 * les chiffrer, et les additionner AVANT que le bouton ne soit atteignable.
 */
const FACTURES_ECARTEES: readonly FactureDemo[] = [
	{ reference: 'F-2023-908', montantTTC: 74_000n, dateExigibilite: '2023-11-04' },
	{ reference: 'F-2024-021', montantTTC: 50_000n, dateExigibilite: '2024-02-19' }
];

function pourDecompte(factures: readonly FactureDemo[], arreteAu: string): FacturePourDecompte[] {
	return factures.map((facture) => ({
		reference: facture.reference,
		montantExigible: depuisCentimes(facture.montantTTC),
		dateExigibilite: facture.dateExigibilite,
		reglements: [],
		taux: periodesDeTauxParDefaut(facture.dateExigibilite, arreteAu)
	}));
}

/** Le décompte tel qu'il serait figé aujourd'hui : ce que l'écran d'arrêt montre. */
const PROJECTION_DEMO: DecompteCreance = decompterCreance(
	pourDecompte(FACTURES_DE_LA_CREANCE, AUJOURD_HUI_DEMO),
	AUJOURD_HUI_DEMO,
	'ACT_365',
	'PENALITES_DABORD'
);

/** Le décompte déjà arrêté, dix-huit jours plus tôt : ce que la pièce porte. */
const FIGE_DEMO: DecompteCreance = decompterCreance(
	pourDecompte(FACTURES_DE_LA_CREANCE, ARRETE_LE_DEMO),
	ARRETE_LE_DEMO,
	'ACT_365',
	'PENALITES_DABORD'
);

function enAffichage(decompte: DecompteCreance): DecompteAffiche {
	return {
		arreteAu: decompte.arreteAu,
		convention: decompte.convention,
		principalRestantDu: enCentimes(decompte.principalRestantDu),
		interets: enCentimes(decompte.interets),
		indemniteForfaitaire: enCentimes(decompte.indemniteForfaitaire),
		total: enCentimes(decompte.total),
		lignes: decompte.lignes.map((ligne) => ({
			reference: ligne.reference,
			principalRestantDu: enCentimes(ligne.principalRestantDu),
			interets: enCentimes(ligne.interets),
			indemniteForfaitaire: enCentimes(ligne.indemniteForfaitaire),
			total: enCentimes(ligne.total),
			segments: ligne.segments.map((segment) => ({
				debut: segment.debut,
				fin: segment.fin,
				jours: segment.jours,
				principal: enCentimes(segment.principal),
				taux: { numerateur: segment.taux.numerateur, denominateur: segment.taux.denominateur },
				baseAnnuelle: segment.baseAnnuelle,
				interets: enCentimes(segment.interets)
			}))
		}))
	};
}

/** Le contrôle, joué par la fonction du domaine et pas recopié. */
function controleDemo(avecLesEcartees: boolean) {
	return controlerDecompte({
		decompte: PROJECTION_DEMO,
		facturesConnues: [
			...FACTURES_DE_LA_CREANCE,
			...(avecLesEcartees ? FACTURES_ECARTEES : [])
		].map((facture) => ({
			reference: facture.reference,
			montantExigible: depuisCentimes(facture.montantTTC)
		}))
	});
}

const PRESCRIPTION_DEMO = (() => {
	const calculee = prescriptionDe([FACTURES_DE_LA_CREANCE[0]!.dateExigibilite], SECTEUR_DEMO);
	const regime = regimePrescription(SECTEUR_DEMO);
	const date = calculee.datePrescription ?? null;
	return {
		date,
		joursRestants: date === null ? null : ecartJours(AUJOURD_HUI_DEMO, date),
		dureeAnnees: regime.dureeAnnees,
		hypothese: regime.hypothese,
		source: regime.source
	};
})();

function arretDemo(avecLesEcartees: boolean): ArretDeLaCreance {
	const controle = controleDemo(avecLesEcartees);
	return {
		debiteur: DEBITEUR_DEMO,
		arreteAu: AUJOURD_HUI_DEMO,
		projection: enAffichage(PROJECTION_DEMO),
		refusDeCalcul: null,
		abandons: controle.abandons.map((abandon) => ({
			nature: abandon.nature,
			reference: abandon.reference,
			montantEnJeu: abandon.montantEnJeu === null ? null : enCentimes(abandon.montantEnJeu),
			explication: abandon.explication,
			// Dans la salle, les deux écartées sont libres de créance : la sortie
			// « les inclure » doit être visible, c'est la moitié de ce qu'on regarde.
			rattachable: abandon.nature === 'FACTURE_ECARTEE'
		})),
		montantAbandonne: enCentimes(controle.montantAbandonne),
		nombreNonChiffrables: controle.abandons.filter((abandon) => abandon.montantEnJeu === null)
			.length,
		controleDesParametres: {
			exerce: false,
			total: tousLesParametres().length,
			clesNonUtilisables: parametresManquants()
		},
		prescription: { ...PRESCRIPTION_DEMO, motifInconnue: null },
		dernierDecompteId: 'demo-decompte',
		reponses: {},
		onRepondre: () => {},
		onInclure: () => {},
		inclusionEnCours: false,
		abandonsAssumes: false,
		onAssumerAbandons: () => {},
		onArreter: () => {},
		enCours: false,
		erreur: null
	};
}

const FORMES_ARRET: Readonly<Record<string, ArretDeLaCreance>> = {
	'décompte complet': arretDemo(false)
};

/** L'écart entre le dossier figé et le calcul du jour, décomposé comme le produit le décompose. */
const ECART_DEMO = (() => {
	const figees = new Map(FIGE_DEMO.lignes.map((ligne) => [ligne.reference, ligne]));
	return {
		principalRestantDu:
			enCentimes(PROJECTION_DEMO.principalRestantDu) - enCentimes(FIGE_DEMO.principalRestantDu),
		interets: enCentimes(PROJECTION_DEMO.interets) - enCentimes(FIGE_DEMO.interets),
		indemniteForfaitaire:
			enCentimes(PROJECTION_DEMO.indemniteForfaitaire) -
			enCentimes(FIGE_DEMO.indemniteForfaitaire),
		total: enCentimes(PROJECTION_DEMO.total) - enCentimes(FIGE_DEMO.total),
		parFacture: PROJECTION_DEMO.lignes.map((ligne) => {
			const figee = figees.get(ligne.reference);
			return {
				reference: ligne.reference,
				nouvelle: figee === undefined,
				ecartTotal: enCentimes(ligne.total) - (figee === undefined ? 0n : enCentimes(figee.total)),
				ecartInterets:
					enCentimes(ligne.interets) - (figee === undefined ? 0n : enCentimes(figee.interets)),
				segments: ligne.segments.map((segment) => ({
					debut: segment.debut,
					fin: segment.fin,
					jours: segment.jours,
					principal: enCentimes(segment.principal),
					taux: { numerateur: segment.taux.numerateur, denominateur: segment.taux.denominateur },
					baseAnnuelle: segment.baseAnnuelle,
					interets: enCentimes(segment.interets)
				}))
			};
		})
	};
})();

function suiviDemo(remise: SuiviConseilAffiche['remise']): SuiviConseilAffiche {
	return {
		fige: { arreteAu: ARRETE_LE_DEMO, total: enCentimes(FIGE_DEMO.total) },
		duJour: { arreteAu: AUJOURD_HUI_DEMO, total: enCentimes(PROJECTION_DEMO.total) },
		refusDuJour: null,
		ecart: ECART_DEMO,
		prescription: PRESCRIPTION_DEMO,
		angleMort: ANGLE_MORT_PRESCRIPTION,
		joursDepuisLaRemise:
			remise?.remisLe == null ? null : ecartJours(remise.remisLe, AUJOURD_HUI_DEMO),
		faitsDeProcedureDepuisLaRemise: 0,
		remise,
		carnet: [
			{ id: 'fiche-avocat', nom: 'Cabinet Perrin', precision: 'Avocat · Paris' },
			{ id: 'fiche-commissaire', nom: 'Étude Lemoine', precision: 'Commissaire de justice · Bobigny' }
		],
		onPreparer: () => {},
		onRemettre: () => {},
		onRetour: () => {},
		onClore: () => {},
		enCours: false,
		erreur: null
	};
}

function pieceDemo(suivi: SuiviConseilAffiche): PieceArretee {
	const controle = controleDemo(true);
	return {
		debiteur: DEBITEUR_DEMO,
		decompte: enAffichage(FIGE_DEMO),
		produitLe: Date.parse(`${ARRETE_LE_DEMO}T09:12:00Z`),
		denominationFigee: true,
		abandons: controle.abandons.map((abandon) => ({
			reference: abandon.reference,
			montantEnJeu: abandon.montantEnJeu === null ? null : enCentimes(abandon.montantEnJeu),
			explication: abandon.explication
		})),
		onTelechargerLaPiece: () => {},
		onTelechargerLeDossier: () => {},
		suivi
	};
}

const REMISE_DEMO: SuiviConseilAffiche['remise'] = {
	id: 'demo-remise',
	etat: 'REMIS',
	intervenant: 'Cabinet Perrin',
	remisLe: '2026-08-22',
	revenuLe: null,
	closLe: null,
	motifCloture: null,
	attendu: 'Son avis sur la voie à retenir'
};

const FORMES_PIECE: Readonly<Record<string, PieceArretee>> = {
	'dossier préparé': pieceDemo(
		suiviDemo({
			id: 'demo-remise',
			etat: 'PREPARE',
			intervenant: null,
			remisLe: null,
			revenuLe: null,
			closLe: null,
			motifCloture: null,
			attendu: null
		})
	),
	'dossier remis': pieceDemo(suiviDemo(REMISE_DEMO)),
	'suivi clos': pieceDemo(
		suiviDemo({
			...REMISE_DEMO,
			etat: 'CLOS',
			revenuLe: '2026-08-29',
			closLe: '2026-09-01',
			motifCloture: 'Le client a réglé le solde après l’intervention du conseil.'
		})
	)
};

export const ECRANS_PIECE: readonly EcranDuProduit[] = [
	{
		route: '/app/arret/$id',
		libelle: 'arrêt du décompte',
		vide: false,
		variantes: Object.keys(FORMES_ARRET),
		Demo: ({ etat, variante }: { etat: EtatDemo; variante?: string }) => (
			<EcranArret
				identifiant="demo-creance"
				donnees={lectureDemo(etat, formeDemo(variante, arretDemo(true), FORMES_ARRET))}
			/>
		)
	},
	{
		route: '/app/decompte/$id',
		libelle: 'pièce arrêtée',
		vide: false,
		variantes: Object.keys(FORMES_PIECE),
		Demo: ({ etat, variante }: { etat: EtatDemo; variante?: string }) => (
			<EcranPiece
				identifiant="demo-decompte"
				creanceId="demo-creance"
				donnees={lectureDemo(
					etat,
					formeDemo(variante, pieceDemo(suiviDemo(null)), FORMES_PIECE)
				)}
			/>
		)
	}
];
