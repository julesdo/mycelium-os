import { ZERO, additionner, depuisEuros, type Montant } from '../../../socle/montants';

/**
 * L'import d'un export comptable — le chemin d'entrée des factures de VENTE.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI CE N'EST PAS LE MÊME CHEMIN QUE LES FACTURES D'ACHAT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le socle sait lire une facture d'achat déposée en PDF, et il le fait bien :
 * elle arrive de l'extérieur, sous la mise en page du fournisseur, et on n'a
 * qu'elle. Les factures de VENTE d'un créancier sont dans la situation
 * inverse — elles existent déjà chez lui, structurées, dans sa comptabilité.
 * Les lui faire re-scanner reviendrait à lui demander de dégrader sa propre
 * donnée pour qu'on la reconstitue au prix d'un appel au modèle, avec un taux
 * d'erreur qu'il n'avait pas.
 *
 * LE FEC PORTE LE PLUS. Le fichier des écritures comptables est obligatoire et
 * normalisé, et il contient dans un seul fichier les factures, les règlements
 * ET l'identité du débiteur par son compte auxiliaire. C'est-à-dire les trois
 * quarts du modèle de domaine, déjà rapprochés par la comptabilité — travail
 * qu'on aurait refait moins bien.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE PIÈGE : UNE ÉCRITURE DE VENTE PORTE TROIS LIGNES, UNE SEULE EST LA CRÉANCE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Une vente équilibrée s'écrit : débit du compte client (411), crédit du
 * compte de produit (70x), crédit de la TVA collectée (4457x). Additionner les
 * trois multiplierait par deux le montant réclamé, et le total resterait
 * plausible. Seul le compte 411 porte ce que le client doit.
 *
 * C'est le même mode de défaillance que le doublon de facture côté EGalim : un
 * chiffre faux qui n'a l'air de rien.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * RIEN N'EST PERDU EN SILENCE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Une ligne illisible n'est ni devinée, ni ignorée : elle part dans `ignorees`
 * avec son texte brut et la raison. `horsPerimetre` compte séparément ce qui a
 * été écarté À BON DROIT (produits, TVA, trésorerie) : confondre les deux
 * ferait paraître un import propre comme un import cassé, ou l'inverse.
 */

/** Le préfixe des comptes clients au plan comptable général. */
const PREFIXE_COMPTE_CLIENT = '411';

/** Les colonnes qui identifient un FEC de façon non ambiguë. */
const COLONNES_FEC = ['CompteNum', 'PieceRef', 'Debit', 'Credit', 'EcritureDate'] as const;

export type FormatExport = 'FEC' | 'CSV_GENERIQUE';

export interface FactureImportee {
	readonly reference: string;
	readonly debiteur: string;
	/** Le compte auxiliaire, quand la source en porte un. Clé de rapprochement. */
	readonly debiteurCompte?: string;
	readonly montantTTC: Montant;
	readonly dateEmission: string;
	readonly dateEcheance?: string;
}

export interface ReglementImporte {
	/** La facture que ce règlement éteint, en tout ou partie. */
	readonly reference: string;
	readonly date: string;
	readonly montant: Montant;
}

export interface LigneIgnoree {
	readonly texte: string;
	readonly raison: string;
}

export interface ResultatImport {
	readonly format: FormatExport;
	readonly factures: readonly FactureImportee[];
	readonly reglements: readonly ReglementImporte[];
	/** Ce qui n'a pas pu être lu. Jamais deviné, jamais perdu. */
	readonly ignorees: readonly LigneIgnoree[];
	/** Ce qui a été écarté à bon droit : produits, TVA, trésorerie. */
	readonly horsPerimetre: number;
}

function lignesUtiles(contenu: string): string[] {
	return contenu
		.split(/\r\n|\r|\n/)
		.map((ligne) => ligne.trimEnd())
		.filter((ligne) => ligne.trim() !== '');
}

function separateurDe(entete: string): string {
	// Tabulation d'abord : c'est celui du FEC, et il ne se rencontre jamais par
	// accident dans un libellé.
	for (const candidat of ['\t', ';', ',']) {
		if (entete.split(candidat).length >= 3) return candidat;
	}
	return ';';
}

function normaliser(entete: string): string {
	return entete
		.trim()
		.toUpperCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[_.]/g, ' ')
		.replace(/\s+/g, ' ');
}

export function detecterFormat(contenu: string): FormatExport | null {
	const lignes = lignesUtiles(contenu);
	if (lignes.length < 2) return null;

	const entete = lignes[0]!;
	const colonnes = new Set(entete.split(separateurDe(entete)).map(normaliser));

	if (COLONNES_FEC.every((colonne) => colonnes.has(normaliser(colonne)))) return 'FEC';

	const aReference = colonnes.has('REFERENCE') || colonnes.has('NUMERO') || colonnes.has('N FACTURE');
	const aMontant = [...colonnes].some((c) => c.startsWith('MONTANT') || c.startsWith('TOTAL'));
	return aReference && aMontant ? 'CSV_GENERIQUE' : null;
}

/** `AAAAMMJJ` du FEC vers `AAAA-MM-JJ`. Les autres écritures passent telles quelles. */
function normaliserDate(brut: string): string | null {
	const nettoye = brut.trim();
	if (/^\d{8}$/.test(nettoye)) {
		return `${nettoye.slice(0, 4)}-${nettoye.slice(4, 6)}-${nettoye.slice(6, 8)}`;
	}
	if (/^\d{4}-\d{2}-\d{2}$/.test(nettoye)) return nettoye;
	return null;
}

/** Un montant, ou `null` s'il n'est pas lisible. Ne lève pas : l'appelant décide. */
function montantOuNull(brut: string): Montant | null {
	const nettoye = brut.trim();
	if (nettoye === '') return ZERO;
	try {
		return depuisEuros(nettoye);
	} catch {
		return null;
	}
}

interface AccumulateurFacture {
	reference: string;
	debiteur: string;
	debiteurCompte?: string;
	montants: Montant[];
	dateEmission: string;
}

function importerFec(lignes: string[], separateur: string): ResultatImport {
	const colonnes = lignes[0]!.split(separateur).map(normaliser);
	const indexDe = (nom: string) => colonnes.indexOf(normaliser(nom));

	const iCompte = indexDe('CompteNum');
	const iAuxNum = indexDe('CompAuxNum');
	const iAuxLib = indexDe('CompAuxLib');
	const iPieceRef = indexDe('PieceRef');
	const iPieceDate = indexDe('PieceDate');
	const iEcritureDate = indexDe('EcritureDate');
	const iDebit = indexDe('Debit');
	const iCredit = indexDe('Credit');

	// L'ordre d'apparition fait foi : deux débiteurs distincts ressortent dans
	// l'ordre où la comptabilité les a écrits, ce qui est celui que le gérant
	// reconnaît en relisant son export.
	const parReference = new Map<string, AccumulateurFacture>();
	const reglements: ReglementImporte[] = [];
	const ignorees: LigneIgnoree[] = [];
	let horsPerimetre = 0;

	for (const ligne of lignes.slice(1)) {
		const champs = ligne.split(separateur);
		const compte = (champs[iCompte] ?? '').trim();

		// Seul le compte client porte ce que le débiteur doit. Les contreparties
		// de produit et de TVA sont écartées À BON DROIT, pas par échec.
		if (!compte.startsWith(PREFIXE_COMPTE_CLIENT)) {
			horsPerimetre++;
			continue;
		}

		const reference = (champs[iPieceRef] ?? '').trim();
		if (reference === '') {
			ignorees.push({
				texte: ligne,
				raison:
					'Écriture sur compte client sans référence de pièce : impossible de la rattacher ' +
					'à une facture.'
			});
			continue;
		}

		const debit = montantOuNull(champs[iDebit] ?? '');
		const credit = montantOuNull(champs[iCredit] ?? '');
		if (debit === null || credit === null) {
			ignorees.push({ texte: ligne, raison: 'Montant illisible en débit ou en crédit.' });
			continue;
		}

		const date =
			normaliserDate(champs[iPieceDate] ?? '') ?? normaliserDate(champs[iEcritureDate] ?? '');
		if (date === null) {
			ignorees.push({ texte: ligne, raison: 'Date de pièce et date d’écriture illisibles.' });
			continue;
		}

		// Un crédit sur compte client éteint la créance : c'est un règlement.
		if (credit > ZERO) {
			reglements.push({ reference, date, montant: credit });
			continue;
		}

		if (debit === ZERO) {
			horsPerimetre++;
			continue;
		}

		const existante = parReference.get(reference);
		if (existante === undefined) {
			const compteAux = (champs[iAuxNum] ?? '').trim();
			parReference.set(reference, {
				reference,
				debiteur: (champs[iAuxLib] ?? '').trim() || compteAux || compte,
				debiteurCompte: compteAux === '' ? undefined : compteAux,
				montants: [debit],
				dateEmission: date
			});
		} else {
			// Une facture peut s'étaler sur plusieurs lignes d'écriture.
			existante.montants.push(debit);
		}
	}

	const factures = [...parReference.values()].map((accumulateur) => ({
		reference: accumulateur.reference,
		debiteur: accumulateur.debiteur,
		debiteurCompte: accumulateur.debiteurCompte,
		montantTTC: additionner(...accumulateur.montants),
		dateEmission: accumulateur.dateEmission
	}));

	return { format: 'FEC', factures, reglements, ignorees, horsPerimetre };
}

const CANDIDATS_CSV = {
	reference: ['REFERENCE', 'NUMERO', 'N FACTURE', 'NO FACTURE'],
	debiteur: ['CLIENT', 'DEBITEUR', 'TIERS', 'RAISON SOCIALE'],
	montant: ['MONTANT TTC', 'TOTAL TTC', 'MONTANT', 'TOTAL'],
	dateEmission: ['DATE EMISSION', 'DATE FACTURE', 'DATE'],
	dateEcheance: ['DATE ECHEANCE', 'ECHEANCE']
} as const;

function trouverColonne(colonnes: readonly string[], candidats: readonly string[]): number {
	for (const candidat of candidats) {
		const index = colonnes.indexOf(candidat);
		if (index !== -1) return index;
	}
	return -1;
}

function importerCsvGenerique(lignes: string[], separateur: string): ResultatImport {
	const colonnes = lignes[0]!.split(separateur).map(normaliser);

	const iReference = trouverColonne(colonnes, CANDIDATS_CSV.reference);
	const iDebiteur = trouverColonne(colonnes, CANDIDATS_CSV.debiteur);
	const iMontant = trouverColonne(colonnes, CANDIDATS_CSV.montant);
	const iEmission = trouverColonne(colonnes, CANDIDATS_CSV.dateEmission);
	const iEcheance = trouverColonne(colonnes, CANDIDATS_CSV.dateEcheance);

	const factures: FactureImportee[] = [];
	const ignorees: LigneIgnoree[] = [];

	for (const ligne of lignes.slice(1)) {
		const champs = ligne.split(separateur);
		const reference = (champs[iReference] ?? '').trim();
		const montant = montantOuNull(champs[iMontant] ?? '');
		const dateEmission = normaliserDate(champs[iEmission] ?? '');

		if (reference === '' || montant === null || montant === ZERO || dateEmission === null) {
			ignorees.push({
				texte: ligne,
				raison:
					'Référence, montant ou date d’émission manquant ou illisible : une facture ne peut ' +
					'pas être créée sans ces trois-là.'
			});
			continue;
		}

		const echeance = iEcheance === -1 ? null : normaliserDate(champs[iEcheance] ?? '');
		factures.push({
			reference,
			debiteur: (champs[iDebiteur] ?? '').trim(),
			montantTTC: montant,
			dateEmission,
			dateEcheance: echeance ?? undefined
		});
	}

	// Un CSV de factures ne porte pas de règlements. En inventer serait pire
	// que de n'en rendre aucun : le décompte les déduirait du principal.
	return { format: 'CSV_GENERIQUE', factures, reglements: [], ignorees, horsPerimetre: 0 };
}

export function importerExportComptable(contenu: string): ResultatImport {
	const format = detecterFormat(contenu);
	if (format === null) {
		throw new Error(
			"Format d'export non reconnu. Attendu : un FEC (colonnes CompteNum, PieceRef, Debit, " +
				'Credit, EcritureDate) ou un CSV portant au moins une référence et un montant.'
		);
	}

	const lignes = lignesUtiles(contenu);
	const separateur = separateurDe(lignes[0]!);

	return format === 'FEC'
		? importerFec(lignes, separateur)
		: importerCsvGenerique(lignes, separateur);
}
