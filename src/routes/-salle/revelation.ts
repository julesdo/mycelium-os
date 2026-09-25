import { depuisCentimes, enCentimes } from '../../lib/socle/montants';
import { ajouterJours } from '../../lib/verticales/recouvrement/calendrier';
import { controlerDecompte } from '../../lib/verticales/recouvrement/controle';
import {
	decompterCreance,
	type PeriodeDeTaux,
	type Reglement
} from '../../lib/verticales/recouvrement/decompte';
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
import type { AbandonsAffiches, BilanPertesAffiche, RevelationAffichee } from '../../ui';
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

/* ═════════════════════════════════════════════════════════════════════════
   CE QUE LES DÉCOMPTES LAISSENT DE CÔTÉ, CALCULÉ PAR LE DOMAINE AUSSI
   ═════════════════════════════════════════════════════════════════════════

   ⚠️ RIEN N'EST ÉCRIT À LA MAIN ICI NON PLUS. Les abandons sortent de
   `controlerDecompte` — la MÊME fonction que `abandonsDeLEtablissement`
   rejoue sur le dernier décompte de chaque créance — appliquée à des
   décomptes que `decompterCreance` produit sur les factures déclarées plus
   haut. La salle ne fournit que ce qu'un établissement fournit : des
   décomptes arrêtés, et ce qu'on sait par ailleurs des factures du client.

   ⚠️ `parametresRequis` N'EST PAS PASSÉ, exactement comme au serveur : la
   nature `PARAMETRE_MANQUANT` ne peut donc pas se produire, ni en
   démonstration ni en production. La salle ne montre pas un verrou qui
   n'existe pas encore. */

/** Les identifiants de décompte de la salle. Ils mènent à `/app/decompte/$id`. */
const DECOMPTE_ECARTS_DEMO = 'decompte-demo-ecarts';
const DECOMPTE_INTERETS_DEMO = 'decompte-demo-interets';

/** Ce qu'on sait par ailleurs des factures d'un client : référence et montant exigible. */
function connues(references: readonly string[]) {
	return FACTURES_PREPAREES_DEMO.filter((facture) => references.includes(facture.reference)).map(
		(facture) => ({ reference: facture.reference, montantExigible: facture.montantExigible })
	);
}

/** Les factures prêtes, choisies par référence, pour un décompte. */
function pourDecompte(references: readonly string[]) {
	return FACTURES_PREPAREES_DEMO.filter((facture) => references.includes(facture.reference));
}

/**
 * PREMIER DÉCOMPTE : UN SEUL IMPAYÉ ARRÊTÉ, QUATRE AUTRES CONNUS ET DEHORS.
 *
 * Le cas le plus fréquent et le plus silencieux : le gérant arrête un décompte
 * sur la facture qui lui vient à l'esprit, et les quatre autres du même client
 * ne figurent nulle part dans l'acte qu'il fonderait.
 */
const CONTROLE_ECARTS_DEMO = controlerDecompte({
	decompte: decompterCreance(pourDecompte(['FA-2023-0388']), ARRETE_AU_DEMO, CONVENTION, 'PENALITES_DABORD'),
	facturesConnues: connues(FACTURES_DEMO.map((facture) => facture.reference))
});

/**
 * SECOND DÉCOMPTE : DES INTÉRÊTS QUE SES PROPRES PÉRIODES NE JUSTIFIENT PLUS.
 *
 * ⚠️ LE DÉCALAGE EST ARBITRAIRE, ET IL N'A RIEN DE JURIDIQUE. Un décompte figé
 * porte ses segments ; le jour où un total et ses périodes cessent de
 * concorder, l'écart est un accident, pas une règle. La salle en fabrique un
 * pour que le regard voie cette nature-là — c'est la seule dont l'explication
 * s'affiche, parce qu'elle porte deux chiffres qu'aucune rangée ne montre.
 */
const DECOMPTE_DERIVE_DEMO = decompterCreance(
	pourDecompte(['FA-2025-0602']),
	ARRETE_AU_DEMO,
	CONVENTION,
	'PENALITES_DABORD'
);
const CONTROLE_INTERETS_DEMO = controlerDecompte({
	decompte: {
		...DECOMPTE_DERIVE_DEMO,
		lignes: DECOMPTE_DERIVE_DEMO.lignes.map((ligne) => ({
			...ligne,
			interets: depuisCentimes(enCentimes(ligne.interets) + 4_512n)
		}))
	},
	facturesConnues: connues(['FA-2025-0602'])
});

/** Le nom du client, tel que le décompte le fige (`decompte.debiteur.denomination`). */
const CLIENT_DEMO = 'Transports Vallier & Fils';
const AUTRE_CLIENT_DEMO = 'Ateliers Brunet';

/** Les points d'un contrôle, dans la forme que `abandonsDeLEtablissement` rend. */
function pointsDe(
	controle: ReturnType<typeof controlerDecompte>,
	decompteId: string,
	debiteur: string
) {
	return controle.abandons.map((abandon) => ({
		decompteId,
		debiteur,
		arreteAu: ARRETE_AU_DEMO,
		nature: abandon.nature,
		reference: abandon.reference,
		montantEnJeu: abandon.montantEnJeu === null ? null : enCentimes(abandon.montantEnJeu),
		explication: abandon.explication
	}));
}

/**
 * CE QUE LES DÉCOMPTES DE LA SALLE LAISSENT DEHORS.
 *
 * L'ordre est celui du serveur : le plus cher d'abord, ce qu'on ne sait pas
 * chiffrer en dernier (`convex/recouvrement/controle.ts`, le tri final).
 */
export const ABANDONS_DEMO: AbandonsAffiches = {
	abandons: [
		...pointsDe(CONTROLE_ECARTS_DEMO, DECOMPTE_ECARTS_DEMO, CLIENT_DEMO),
		...pointsDe(CONTROLE_INTERETS_DEMO, DECOMPTE_INTERETS_DEMO, AUTRE_CLIENT_DEMO)
	].sort((a, b) => {
		if (a.montantEnJeu === null) return b.montantEnJeu === null ? 0 : 1;
		if (b.montantEnJeu === null) return -1;
		return a.montantEnJeu > b.montantEnJeu ? -1 : a.montantEnJeu < b.montantEnJeu ? 1 : 0;
	}),
	montantAbandonne: enCentimes(CONTROLE_ECARTS_DEMO.montantAbandonne) +
		enCentimes(CONTROLE_INTERETS_DEMO.montantAbandonne),
	nombreNonChiffrables: [
		...CONTROLE_ECARTS_DEMO.abandons,
		...CONTROLE_INTERETS_DEMO.abandons
	].filter((abandon) => abandon.montantEnJeu === null).length,
	decomptesControles: 3,
	decomptesIncomplets: 2
};

/** Deux décomptes arrêtés, complets tous les deux : le constat qui rassure. */
export const ABANDONS_AUCUN_DEMO: AbandonsAffiches = {
	abandons: [],
	montantAbandonne: 0n,
	nombreNonChiffrables: 0,
	decomptesControles: 2,
	decomptesIncomplets: 0
};

/** Aucun décompte arrêté : pas de sujet, donc pas de section du tout. */
export const ABANDONS_SANS_DECOMPTE_DEMO: AbandonsAffiches = {
	abandons: [],
	montantAbandonne: 0n,
	nombreNonChiffrables: 0,
	decomptesControles: 0,
	decomptesIncomplets: 0
};
