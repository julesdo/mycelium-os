/**
 * Génère deux fixtures de factures (CSV) et leur vérité terrain (.expected.json),
 * en complément de `grossiste-ocr-01.txt` qui, lui, est un décalque manuel d'une
 * vraie facture et n'est jamais régénéré.
 *
 * Principe : chaque ligne est décrite UNE SEULE FOIS ci-dessous (montant, famille,
 * labels qualifiants, alimentaire ou non). Le CSV et le .expected.json sont tous
 * les deux dérivés de cette même source — jamais calculés à la main séparément.
 *
 * Usage : bun scripts/generate-fixtures.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LABELS_QUALIFIANTS } from '../src/lib/egalim/referentiel';
import { FAMILLES_VIANDE_POISSON, type Famille, type Label } from '../src/lib/egalim/types';

const FIXTURES_DIR = join(__dirname, '..', 'src', 'lib', 'fixtures', 'factures');

/** Une ligne source, décrite une fois pour toutes. */
interface LigneSource {
	rawLabel: string;
	amountHT: number;
	vatRate: number;
	isFood: boolean;
	family: Famille;
	/** Labels qualifiants portés par la ligne (barème EGalim), pas les mentions non qualifiantes. */
	qualifyingLabels: Label[];
}

interface ExpectedJson {
	totalHT: number;
	totalFoodHT: number;
	durableHT: number;
	bioHT: number;
	meatFishTotalHT: number;
	meatFishDurableHT: number;
	ratios: { durable: number; bio: number; meatFishDurable: number };
	vatCrossCheck: { reducedRateBase: number; standardRateBase: number };
	lines: LigneSource[];
}

/** Évite les artefacts binaires flottants (ex: 0.1 + 0.2) : tout est arrondi au centime. */
function arrondiCentime(n: number): number {
	return Math.round(n * 100) / 100;
}

/** Dérive la vérité terrain d'un jeu de lignes — c'est la SEULE implémentation du calcul. */
function calculerVeriteTerrain(lignes: readonly LigneSource[]): ExpectedJson {
	let totalHT = 0;
	let totalFoodHT = 0;
	let durableHT = 0;
	let bioHT = 0;
	let meatFishTotalHT = 0;
	let meatFishDurableHT = 0;
	let reducedRateBase = 0;
	let standardRateBase = 0;

	for (const l of lignes) {
		totalHT = arrondiCentime(totalHT + l.amountHT);
		if (l.vatRate === 5.5) reducedRateBase = arrondiCentime(reducedRateBase + l.amountHT);
		else standardRateBase = arrondiCentime(standardRateBase + l.amountHT);

		if (!l.isFood) continue;

		totalFoodHT = arrondiCentime(totalFoodHT + l.amountHT);
		const estDurable = l.qualifyingLabels.some((label) => LABELS_QUALIFIANTS[label].durable);
		const estBio = l.qualifyingLabels.some((label) => LABELS_QUALIFIANTS[label].bio);
		if (estDurable) durableHT = arrondiCentime(durableHT + l.amountHT);
		if (estBio) bioHT = arrondiCentime(bioHT + l.amountHT);

		if (FAMILLES_VIANDE_POISSON.includes(l.family)) {
			meatFishTotalHT = arrondiCentime(meatFishTotalHT + l.amountHT);
			if (estDurable) meatFishDurableHT = arrondiCentime(meatFishDurableHT + l.amountHT);
		}
	}

	const ratio = (num: number, den: number) => (den > 0 ? num / den : 0);

	return {
		totalHT,
		totalFoodHT,
		durableHT,
		bioHT,
		meatFishTotalHT,
		meatFishDurableHT,
		ratios: {
			durable: ratio(durableHT, totalFoodHT),
			bio: ratio(bioHT, totalFoodHT),
			meatFishDurable: ratio(meatFishDurableHT, meatFishTotalHT)
		},
		vatCrossCheck: { reducedRateBase, standardRateBase },
		lines: lignes.map((l) => ({ ...l }))
	};
}

/** `45.2` -> `"45,20"` : décimale française, toujours deux chiffres. */
function formatMontantFr(n: number): string {
	return arrondiCentime(n).toFixed(2).replace('.', ',');
}

// ---------------------------------------------------------------------------
// Fixture 1 : export-comptable-01 — la voie royale (export compta propre)
// Séparateur `;`, décimales virgule, colonne LABEL dédiée, encodage ISO-8859-1.
// ---------------------------------------------------------------------------

interface LigneComptable extends LigneSource {
	date: string;
	quantite: number;
	unite: string;
	puHT: number;
	labelBrut: string; // ce qu'on lirait littéralement dans la colonne LABEL
}

const lignesExportComptable: LigneComptable[] = [
	{
		date: '05/09/2026',
		rawLabel: 'Poulet fermier entier',
		quantite: 15,
		unite: 'kg',
		puHT: 8.4,
		amountHT: 126.0,
		vatRate: 5.5,
		isFood: true,
		family: 'VIANDE',
		qualifyingLabels: ['FERMIER'],
		labelBrut: 'Fermier'
	},
	{
		date: '05/09/2026',
		rawLabel: 'Boeuf haché 15% MG',
		quantite: 20,
		unite: 'kg',
		puHT: 9.5,
		amountHT: 190.0,
		vatRate: 5.5,
		isFood: true,
		family: 'VIANDE',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		date: '05/09/2026',
		rawLabel: 'Cabillaud filet surgelé',
		quantite: 10,
		unite: 'kg',
		puHT: 14.0,
		amountHT: 140.0,
		vatRate: 5.5,
		isFood: true,
		family: 'POISSON',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		date: '05/09/2026',
		rawLabel: 'Saumon fumé MSC',
		quantite: 6,
		unite: 'kg',
		puHT: 22.0,
		amountHT: 132.0,
		vatRate: 5.5,
		isFood: true,
		family: 'POISSON',
		qualifyingLabels: ['PECHE_DURABLE'],
		labelBrut: 'Pêche durable MSC'
	},
	{
		date: '06/09/2026',
		rawLabel: 'Carottes bio vrac',
		quantite: 40,
		unite: 'kg',
		puHT: 1.3,
		amountHT: 52.0,
		vatRate: 5.5,
		isFood: true,
		family: 'FRUITS_LEGUMES',
		qualifyingLabels: ['AB'],
		labelBrut: 'AB'
	},
	{
		date: '06/09/2026',
		rawLabel: 'Pommes de terre',
		quantite: 50,
		unite: 'kg',
		puHT: 0.9,
		amountHT: 45.0,
		vatRate: 5.5,
		isFood: true,
		family: 'FRUITS_LEGUMES',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		date: '06/09/2026',
		rawLabel: 'Yaourt nature bio 4x125g',
		quantite: 30,
		unite: 'pièce',
		puHT: 0.6,
		amountHT: 18.0,
		vatRate: 5.5,
		isFood: true,
		family: 'LAITIERS',
		qualifyingLabels: ['AB'],
		labelBrut: 'AB'
	},
	{
		date: '06/09/2026',
		rawLabel: 'Comté AOP',
		quantite: 8,
		unite: 'kg',
		puHT: 16.0,
		amountHT: 128.0,
		vatRate: 5.5,
		isFood: true,
		family: 'LAITIERS',
		qualifyingLabels: ['AOP_AOC_IGP_STG'],
		labelBrut: 'AOP'
	},
	{
		date: '06/09/2026',
		rawLabel: 'Lait UHT demi-écrémé 1L',
		quantite: 40,
		unite: 'litre',
		puHT: 0.95,
		amountHT: 38.0,
		vatRate: 5.5,
		isFood: true,
		family: 'LAITIERS',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		date: '07/09/2026',
		rawLabel: 'Riz basmati 5kg',
		quantite: 6,
		unite: 'colis',
		puHT: 9.0,
		amountHT: 54.0,
		vatRate: 5.5,
		isFood: true,
		family: 'EPICERIE_SECHE',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		date: '07/09/2026',
		rawLabel: 'Lentilles vertes bio',
		quantite: 10,
		unite: 'kg',
		puHT: 3.2,
		amountHT: 32.0,
		vatRate: 5.5,
		isFood: true,
		family: 'EPICERIE_SECHE',
		qualifyingLabels: ['AB'],
		labelBrut: 'AB'
	},
	{
		date: '07/09/2026',
		rawLabel: 'Café moulu équitable',
		quantite: 5,
		unite: 'kg',
		puHT: 18.0,
		amountHT: 90.0,
		vatRate: 5.5,
		isFood: true,
		family: 'EPICERIE_SECHE',
		qualifyingLabels: ['COMMERCE_EQUITABLE'],
		labelBrut: 'Commerce équitable'
	},
	{
		date: '07/09/2026',
		rawLabel: 'Tomates pelées 4/4',
		quantite: 12,
		unite: 'boîte',
		puHT: 2.1,
		amountHT: 25.2,
		vatRate: 5.5,
		isFood: true,
		family: 'EPICERIE_APPERTISEE',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		date: '07/09/2026',
		rawLabel: 'Compote pomme bio gourde',
		quantite: 24,
		unite: 'pièce',
		puHT: 0.55,
		amountHT: 13.2,
		vatRate: 5.5,
		isFood: true,
		family: 'EPICERIE_APPERTISEE',
		qualifyingLabels: ['AB'],
		labelBrut: 'AB'
	},
	{
		date: '08/09/2026',
		rawLabel: 'Jus de pomme brique 1L',
		quantite: 12,
		unite: 'litre',
		puHT: 1.4,
		amountHT: 16.8,
		vatRate: 5.5,
		isFood: true,
		family: 'BOISSONS',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		date: '08/09/2026',
		rawLabel: 'Eau minérale plate 1,5L',
		quantite: 24,
		unite: 'pièce',
		puHT: 0.35,
		amountHT: 8.4,
		vatRate: 5.5,
		isFood: true,
		family: 'BOISSONS',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		date: '08/09/2026',
		rawLabel: 'Sacs poubelle 110L',
		quantite: 4,
		unite: 'colis',
		puHT: 12.0,
		amountHT: 48.0,
		vatRate: 20,
		isFood: false,
		family: 'AUTRE',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		date: '08/09/2026',
		rawLabel: 'Essuie-tout bobine',
		quantite: 3,
		unite: 'colis',
		puHT: 15.0,
		amountHT: 45.0,
		vatRate: 20,
		isFood: false,
		family: 'AUTRE',
		qualifyingLabels: [],
		labelBrut: ''
	}
];

function genererExportComptableCsv(lignes: readonly LigneComptable[]): string {
	const entete = 'DATE;DESIGNATION;FAMILLE;QUANTITE;UNITE;PU_HT;MONTANT_HT;TVA;LABEL';
	const corps = lignes.map((l) =>
		[
			l.date,
			l.rawLabel,
			l.family,
			formatMontantFr(l.quantite),
			l.unite,
			formatMontantFr(l.puHT),
			formatMontantFr(l.amountHT),
			formatMontantFr(l.vatRate),
			l.labelBrut
		].join(';')
	);
	// LF, pas CRLF : `.gitattributes` force `eol=lf` sur tout le dépôt — un export
	// compta réel serait en CRLF sous Windows, mais git le normaliserait de toute
	// façon au commit, donc autant générer directement ce qui sera committé.
	return [entete, ...corps].join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Fixture 2 : grossiste-sale-01 — la voie sale (export grossiste désordonné)
// Séparateur `,`, colonnes dans un ordre inhabituel, lignes vides, une ligne
// « TOTAL PAGE 1 » au milieu, unités hétérogènes, deux avoirs.
// ---------------------------------------------------------------------------

interface LigneGrossiste extends LigneSource {
	quantite: number;
	unite: string;
	labelBrut: string;
}

const lignesGrossisteSale: LigneGrossiste[] = [
	{
		rawLabel: 'Filet de poulet',
		quantite: 20,
		unite: 'pièce',
		amountHT: 90.0,
		vatRate: 5.5,
		isFood: true,
		family: 'VIANDE',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		rawLabel: 'Steak haché V.B.F.',
		quantite: 15,
		unite: 'kg',
		amountHT: 135.0,
		vatRate: 5.5,
		isFood: true,
		family: 'VIANDE',
		qualifyingLabels: [], // V.B.F. = origine (faux ami), ne qualifie rien
		labelBrut: 'VBF'
	},
	{
		rawLabel: 'Filet de cabillaud MSC',
		quantite: 8,
		unite: 'kg',
		amountHT: 104.0,
		vatRate: 5.5,
		isFood: true,
		family: 'POISSON',
		qualifyingLabels: ['PECHE_DURABLE'],
		labelBrut: 'MSC'
	},
	{
		rawLabel: 'Thon albacore en boîte',
		quantite: 4,
		unite: 'colis',
		amountHT: 90.0,
		vatRate: 5.5,
		isFood: true,
		family: 'POISSON',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		rawLabel: 'Carottes bio',
		quantite: 30,
		unite: 'kg',
		amountHT: 42.0,
		vatRate: 5.5,
		isFood: true,
		family: 'FRUITS_LEGUMES',
		qualifyingLabels: ['AB'],
		labelBrut: 'AB'
	},
	{
		// Avoir sur un produit QUALIFIANT : réduit numérateur ET dénominateur.
		rawLabel: 'AVOIR - Carottes bio (retour)',
		quantite: -5,
		unite: 'kg',
		amountHT: -7.0,
		vatRate: 5.5,
		isFood: true,
		family: 'FRUITS_LEGUMES',
		qualifyingLabels: ['AB'],
		labelBrut: 'AB'
	},
	{
		rawLabel: 'Pommes de terre',
		quantite: 40,
		unite: 'kg',
		amountHT: 34.0,
		vatRate: 5.5,
		isFood: true,
		family: 'FRUITS_LEGUMES',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		// Avoir sur un produit CONVENTIONNEL : réduit le dénominateur seulement.
		rawLabel: 'AVOIR - Pommes de terre (retour)',
		quantite: -10,
		unite: 'kg',
		amountHT: -8.5,
		vatRate: 5.5,
		isFood: true,
		family: 'FRUITS_LEGUMES',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		rawLabel: 'Yaourts nature',
		quantite: 48,
		unite: 'pièce',
		amountHT: 19.2,
		vatRate: 5.5,
		isFood: true,
		family: 'LAITIERS',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		rawLabel: 'Fromage AOP',
		quantite: 5,
		unite: 'kg',
		amountHT: 75.0,
		vatRate: 5.5,
		isFood: true,
		family: 'LAITIERS',
		qualifyingLabels: ['AOP_AOC_IGP_STG'],
		labelBrut: 'AOP'
	},
	{
		rawLabel: 'Riz long grain',
		quantite: 3,
		unite: 'colis',
		amountHT: 36.0,
		vatRate: 5.5,
		isFood: true,
		family: 'EPICERIE_SECHE',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		rawLabel: "Jus d'orange",
		quantite: 10,
		unite: 'litre',
		amountHT: 16.0,
		vatRate: 5.5,
		isFood: true,
		family: 'BOISSONS',
		qualifyingLabels: [],
		labelBrut: ''
	},
	{
		rawLabel: 'Éponges grattantes',
		quantite: 6,
		unite: 'pièce',
		amountHT: 6.0,
		vatRate: 20,
		isFood: false,
		family: 'AUTRE',
		qualifyingLabels: [],
		labelBrut: ''
	}
];

/**
 * Colonnes dans un ordre INHABITUEL (désignation, label, unité, quantité,
 * montant, famille), avec lignes vides et une ligne de sous-total qui ne
 * respecte pas la structure des colonnes — telle qu'on la trouve sur de vrais
 * exports grossiste. La ligne « TOTAL PAGE 1 » est injectée après la 4e ligne
 * de données.
 */
function genererGrossisteSaleCsv(lignes: readonly LigneGrossiste[]): string {
	const entete = 'DESIGNATION,LABEL,UNITE,QTE,MONTANT_HT,FAMILLE';
	const corps: string[] = [entete];
	lignes.forEach((l, i) => {
		corps.push(
			[l.rawLabel, l.labelBrut, l.unite, String(l.quantite), formatMontantFr(l.amountHT), l.family].join(
				','
			)
		);
		if (i === 1) {
			corps.push('');
			corps.push('TOTAL PAGE 1,,,,,');
			corps.push('');
		}
	});
	return corps.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Écriture des fixtures
// ---------------------------------------------------------------------------

function ecrireFixture(nom: string, csv: string, encoding: 'latin1' | 'utf8', lignes: readonly LigneSource[]) {
	const csvPath = join(FIXTURES_DIR, `${nom}.csv`);
	writeFileSync(csvPath, Buffer.from(csv, encoding));

	const attendu = calculerVeriteTerrain(lignes);
	const jsonPath = join(FIXTURES_DIR, `${nom}.expected.json`);
	writeFileSync(jsonPath, JSON.stringify(attendu, null, 2) + '\n', 'utf8');

	console.log(`✓ ${nom}.csv (${encoding}) + ${nom}.expected.json`);
}

ecrireFixture(
	'export-comptable-01',
	genererExportComptableCsv(lignesExportComptable),
	'latin1',
	lignesExportComptable
);

ecrireFixture('grossiste-sale-01', genererGrossisteSaleCsv(lignesGrossisteSale), 'utf8', lignesGrossisteSale);

console.log('Fixtures générées dans', FIXTURES_DIR);
