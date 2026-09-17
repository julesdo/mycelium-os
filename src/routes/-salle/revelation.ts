import { depuisCentimes, enCentimes } from '../../lib/socle/montants';
import { ajouterJours } from '../../lib/verticales/recouvrement/calendrier';
import type { PeriodeDeTaux, Reglement } from '../../lib/verticales/recouvrement/decompte';
import {
	prescriptionDe,
	type SecteurCreance
} from '../../lib/verticales/recouvrement/pays/france/prescription';
import { periodesDeTauxParDefaut } from '../../lib/verticales/recouvrement/pays/france/taux';
import {
	bilanDesPertes,
	interetsCourusEntre,
	reveler,
	type FacturePourRevelation
} from '../../lib/verticales/recouvrement/revelation';
import type { BilanPertesAffiche, RevelationAffichee } from '../../ui';
import { MEMBRES } from './compte';

/**
 * LA RÉVÉLATION ET LE BILAN DES PERTES DE LA SALLE, CALCULÉS PAR LE DOMAINE.
 *
 * ⚠️ ILS ÉTAIENT ÉCRITS À LA MAIN, et leurs chiffres ne sortaient d'aucun calcul.
 * Ils se composent désormais comme `src/lib/convex/recouvrement/revelation.ts`
 * les compose, sur les factures déclarées ici : c'est le domaine qui dit ce qui
 * se chiffre, ce qui s'éteint et ce qui échappe à la surveillance, pas la salle.
 *
 * Ils vivent hors de `communes.ts`, qui dépasse les trois cents lignes, et hors
 * d'une famille, parce que deux lecteurs les montrent : la famille des onglets,
 * qui rend la page de la révélation, et `showroom.tsx`, dont la démonstration du
 * bilan montre le même compteur. Aucune autre donnée de la salle n'emploie les
 * références de ces factures.
 */

/** La convention de jours des deux requêtes (`revelation.ts`, ligne 36). */
const CONVENTION = 'ACT_365' as const;

/** Le jour de la démonstration, figé : l'arrêté de la révélation, et le jour du bilan. */
/**
 * ⚠️ EXPORTÉ, PARCE QUE L'ÉCRAN L'AFFICHE MAINTENANT. « Ce qui est dû » date son
 * chiffre — un montant de créance sans son jour n'est pas refaisable à la main,
 * puisque les intérêts courent. La salle doit donc donner à l'écran la date à
 * laquelle ces nombres-là ont été calculés, et pas une autre : une seconde date
 * écrite à côté daterait la démonstration d'un jour où rien n'a été compté.
 *
 * C'est aussi le jour de la salle pour les dossiers engagés (`onglets.tsx`) :
 * une seule journée pour toute la démonstration, sans quoi deux écrans voisins
 * compteraient leurs délais depuis deux jours différents.
 */
export const ARRETE_AU_DEMO = '2026-09-09';

/**
 * L'ARRIVÉE DE L'ÉTABLISSEMENT, LUE OÙ LA SALLE LA DONNE DÉJÀ.
 *
 * `composerBilan` compte la surveillance depuis `organizations.createdAt`
 * (lignes 228 et 229). L'établissement se crée avec son premier administrateur,
 * et la page « Vos données » en montre la date, calculée depuis les membres de
 * l'équipe (`apercuDe`, `donnees.tsx`). Une date écrite ici en donnerait deux au
 * même établissement.
 */
const ARRIVEE_DEMO = new Date(Math.min(...MEMBRES.map((membre) => membre.arriveLe)))
	.toISOString()
	.slice(0, 10);

/** Un règlement, dans la forme de la table `reglements`. */
interface ReglementDemo {
	readonly date: string;
	readonly montant: bigint;
	readonly nature: Reglement['nature'];
}

/** Une facture, dans la forme de la table `facturesVente`, avec ses règlements et le secteur de son débiteur. */
interface FactureVenteDemo {
	readonly reference: string;
	readonly montantTTC: bigint;
	readonly dateEmission: string;
	readonly dateEcheance?: string;
	readonly dateExigibilite?: string;
	readonly statutPaiement: FacturePourRevelation['statutPaiement'];
	/**
	 * Le secteur de son débiteur, que le gérant choisit sur sa fiche : aucune
	 * fonction ne le déduit, et `facturesPour` retient `INDETERMINE` sans lui
	 * (ligne 123).
	 */
	readonly secteurDuDebiteur?: SecteurCreance;
	readonly reglements: readonly ReglementDemo[];
}

/**
 * LES FACTURES DE L'ÉTABLISSEMENT, AVEC LES CAS QUI CASSENT.
 *
 * Chacune est là pour une raison, et le domaine en tire la suite :
 *
 *   · FA-2023-0388, un gros impayé réglé en partie : le supplément à cinq
 *     chiffres, et une ligne dont le principal restant dû n'est plus le montant ;
 *   · FA-2024-0217, un transport échu depuis plus d'un an : prescrit avant
 *     l'arrivée de l'établissement, et compté parmi les pertes ;
 *   · FA-2025-0602, une facture sans échéance : chiffrée depuis son émission, et
 *     hors de toute surveillance, faute de date de départ pour la prescription ;
 *   · FA-2026-0356, un montant à trois chiffres à côté des autres ;
 *   · FA-2020-0930, échue avant la série de taux connue : le décompte refuse de
 *     la chiffrer plutôt que d'extrapoler, la révélation la nomme, et le bilan
 *     la compte prescrite.
 */
const FACTURES_DEMO: readonly FactureVenteDemo[] = [
	{
		reference: 'FA-2023-0388',
		montantTTC: 3_299_100n,
		dateEmission: '2023-05-10',
		dateEcheance: '2023-06-30',
		statutPaiement: 'PARTIELLEMENT_PAYEE',
		secteurDuDebiteur: 'GENERAL',
		reglements: [{ date: '2024-02-15', montant: 100_000n, nature: 'PAIEMENT' }]
	},
	{
		reference: 'FA-2024-0217',
		montantTTC: 1_284_000n,
		dateEmission: '2024-02-15',
		dateEcheance: '2024-03-31',
		statutPaiement: 'IMPAYEE',
		secteurDuDebiteur: 'TRANSPORT_MARCHANDISES',
		reglements: []
	},
	{
		reference: 'FA-2025-0602',
		montantTTC: 318_000n,
		dateEmission: '2025-06-12',
		statutPaiement: 'IMPAYEE',
		secteurDuDebiteur: 'GENERAL',
		reglements: []
	},
	{
		reference: 'FA-2026-0356',
		montantTTC: 24_990n,
		dateEmission: '2026-07-01',
		dateEcheance: '2026-07-31',
		statutPaiement: 'IMPAYEE',
		secteurDuDebiteur: 'GENERAL',
		reglements: []
	},
	{
		reference: 'FA-2020-0930',
		montantTTC: 486_000n,
		dateEmission: '2020-10-01',
		dateEcheance: '2020-11-30',
		statutPaiement: 'IMPAYEE',
		secteurDuDebiteur: 'GENERAL',
		reglements: []
	}
];

/**
 * Une facture prête pour la règle pure, préparée comme `facturesPour` la prépare
 * (`src/lib/convex/recouvrement/revelation.ts`, lignes 121 à 151).
 */
function preparer(facture: FactureVenteDemo): FacturePourRevelation {
	// `departDe`, lignes 63 à 66 : l'exigibilité, à défaut l'échéance, à défaut l'émission.
	const depart = facture.dateExigibilite ?? facture.dateEcheance ?? facture.dateEmission;

	let taux: PeriodeDeTaux[] = [];
	try {
		// Sans taux contractuel, la série légale (`periodesDe`, lignes 73 à 87).
		taux = periodesDeTauxParDefaut(depart, ARRETE_AU_DEMO);
	} catch {
		// Une série vide, comme à la ligne 129 : le décompte lèvera, et `reveler` nommera la facture.
	}

	return {
		reference: facture.reference,
		montantExigible: depuisCentimes(facture.montantTTC),
		dateExigibilite: depart,
		reglements: facture.reglements.map((reglement) => ({
			date: reglement.date,
			montant: depuisCentimes(reglement.montant),
			nature: reglement.nature
		})),
		taux,
		statutPaiement: facture.statutPaiement,
		...prescriptionDe(
			[facture.dateExigibilite, facture.dateEcheance],
			facture.secteurDuDebiteur ?? 'INDETERMINE'
		)
	};
}

/** La révélation, composée comme `composerRevelation` la compose (lignes 177 à 207). */
function revelationDe(factures: readonly FacturePourRevelation[]): RevelationAffichee {
	const revelation = reveler(factures, ARRETE_AU_DEMO, CONVENTION);
	// La veille de l'arrêté (ligne 188), qui est une date réelle.
	const hier = ajouterJours(ARRETE_AU_DEMO, -1);

	return {
		nombreFactures: revelation.nombreFactures,
		principal: enCentimes(revelation.principal),
		interets: enCentimes(revelation.interets),
		indemnites: enCentimes(revelation.indemnites),
		supplement: enCentimes(revelation.supplement),
		total: enCentimes(revelation.total),
		interetsCourusDepuisHier: enCentimes(
			interetsCourusEntre(factures, hier, ARRETE_AU_DEMO, CONVENTION)
		),
		lignes: revelation.lignes.map((ligne) => ({
			reference: ligne.reference,
			principalRestantDu: enCentimes(ligne.principalRestantDu),
			interets: enCentimes(ligne.interets),
			indemniteForfaitaire: enCentimes(ligne.indemniteForfaitaire),
			supplement: enCentimes(ligne.supplement)
		})),
		nonChiffrees: revelation.nonChiffrees.map((nonChiffree) => ({ ...nonChiffree }))
	};
}

/**
 * Le bilan, composé comme `composerBilan` le compose (lignes 223 à 256). Aucun
 * battement en échec : `surveillanceInterrompueLe` reste absent.
 */
function bilanDe(factures: readonly FacturePourRevelation[]): BilanPertesAffiche {
	const bilan = bilanDesPertes(factures, ARRIVEE_DEMO, ARRETE_AU_DEMO);

	return {
		eteintesAvant: enCentimes(bilan.eteintesAvant),
		nombreEteintesAvant: bilan.nombreEteintesAvant,
		eteintesDepuis: enCentimes(bilan.eteintesDepuis),
		nombreEteintesDepuis: bilan.nombreEteintesDepuis,
		nonSurveillees: [...bilan.nonSurveillees],
		joursSousSurveillance: bilan.joursSousSurveillance
	};
}

/** Les factures prêtes pour les deux calculs : les deux requêtes lisent les mêmes. */
const FACTURES_PREPAREES_DEMO = FACTURES_DEMO.map(preparer);

export const REVELATION_DEMO: RevelationAffichee = revelationDe(FACTURES_PREPAREES_DEMO);

export const BILAN_DEMO: BilanPertesAffiche = bilanDe(FACTURES_PREPAREES_DEMO);

/**
 * Le même bilan, après un battement en échec depuis l'arrivée : `composerBilan`
 * pose le jour du premier échec (lignes 238 à 245), et le compteur dit alors
 * qu'il ne peut rien affirmer.
 */
export const BILAN_SURVEILLANCE_INTERROMPUE_DEMO: BilanPertesAffiche = {
	...BILAN_DEMO,
	surveillanceInterrompueLe: '2026-05-14'
};

/** Un établissement qui n'a encore déposé aucune facture : rien à révéler. */
export const REVELATION_SANS_FACTURE_DEMO: RevelationAffichee = revelationDe([]);

/** Le bilan du même établissement : rien d'éteint, rien d'échappé. */
export const BILAN_SANS_FACTURE_DEMO: BilanPertesAffiche = bilanDe([]);
