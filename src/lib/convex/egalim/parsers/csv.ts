import Papa from 'papaparse';

/**
 * Une ligne brute extraite d'un CSV ou d'un export Excel, avant toute
 * classification EGalim. `amountHT` est le seul champ garanti : c'est la
 * seule donnée sans laquelle une ligne n'a pas de sens dans l'agrégation.
 */
export interface LigneBrute {
	rawLabel: string;
	quantity?: number;
	unit?: string;
	unitPrice?: number;
	amountHT: number;
	vatRate?: number;
	/** Contenu d'une colonne LABEL dédiée, si présente. */
	labelMention?: string;
}

export interface ResultatCsv {
	lignes: LigneBrute[];
	/** Le texte brut des lignes dont le montant n'a pas pu être lu — jamais inventé, jamais silencieusement perdu. */
	lignesIgnorees: string[];
	erreur?: string;
}

interface MappingColonnes {
	label: string | null;
	quantity: string | null;
	unit: string | null;
	unitPrice: string | null;
	amountHT: string | null;
	vatRate: string | null;
	qualifyingLabel: string | null;
}

/**
 * Candidats reconnus par champ, sur en-tête normalisé (majuscules, sans
 * accent, underscores et points aplatis). Couvre les variantes usuelles des
 * exports comptables et grossistes français.
 */
const CANDIDATS_PAR_CHAMP: Record<Exclude<keyof MappingColonnes, never>, readonly string[]> = {
	label: ['DESIGNATION', 'LIBELLE', 'ARTICLE', 'PRODUIT'],
	amountHT: ['MONTANT HT', 'TOTAL HT', 'MT HT', 'PRIX TOTAL'],
	quantity: ['QTE', 'QUANTITE', 'QTY'],
	unit: ['UNITE', 'UNITE DE MESURE', 'UM'],
	unitPrice: ['PU HT', 'PRIX UNITAIRE', 'PU'],
	vatRate: ['TVA', 'TAUX TVA'],
	qualifyingLabel: ['LABEL', 'LABELS', 'CERTIFICATION', 'SIGNE QUALITE']
};

const ORDRE_CHAMPS = Object.keys(CANDIDATS_PAR_CHAMP) as (keyof MappingColonnes)[];

/** Lignes de total intermédiaire ou de report à écarter, jamais des lignes produit. */
const RE_LIGNE_TOTAL = /^(total|sous.?total|s\/total|report|cumul)/i;

/**
 * Décode un buffer de fichier en texte. Essaie l'UTF-8 strict d'abord — la
 * plupart des exports modernes le sont — puis se replie sur windows-1252
 * (sur-ensemble d'ISO-8859-1) qui couvre les exports comptables français
 * plus anciens. Ne renvoie jamais silencieusement des caractères de
 * remplacement : soit le décodage est correct, soit on change d'encodage.
 */
export function decoderTexte(buffer: Buffer | Uint8Array): string {
	try {
		const texte = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
		return texte.startsWith('﻿') ? texte.slice(1) : texte;
	} catch {
		return new TextDecoder('windows-1252').decode(buffer);
	}
}

/** Majuscules, sans accent, underscores et points aplatis en espaces simples. */
function normaliserEntete(entete: string): string {
	return entete
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toUpperCase()
		.replace(/_/g, ' ')
		.replace(/\./g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/**
 * Reconnaît les colonnes usuelles d'un export de factures français à partir
 * des en-têtes bruts. Chaque en-tête n'est affecté qu'à un seul champ (le
 * premier qui correspond), et un champ sans colonne correspondante vaut
 * `null` plutôt que de deviner.
 */
export function detecterColonnes(headers: readonly string[]): MappingColonnes {
	const mapping: MappingColonnes = {
		label: null,
		quantity: null,
		unit: null,
		unitPrice: null,
		amountHT: null,
		vatRate: null,
		qualifyingLabel: null
	};

	for (const entete of headers) {
		const normalise = normaliserEntete(entete);
		for (const champ of ORDRE_CHAMPS) {
			if (mapping[champ] !== null) continue;
			if (CANDIDATS_PAR_CHAMP[champ].includes(normalise)) {
				mapping[champ] = entete;
				break;
			}
		}
	}

	return mapping;
}

/** Compte les occurrences de chaque séparateur candidat sur la ligne d'en-tête, prend le plus fréquent. */
function detecterSeparateur(ligneEntete: string): string {
	const candidats: readonly string[] = [';', ',', '\t'];
	let meilleur = ';';
	let max = -1;
	for (const sep of candidats) {
		const occurrences = ligneEntete.split(sep).length - 1;
		if (occurrences > max) {
			max = occurrences;
			meilleur = sep;
		}
	}
	return meilleur;
}

/**
 * Lit un montant français : espaces (y compris insécables) et symboles
 * monétaires ignorés, virgule décimale acceptée, séparateur de milliers
 * toléré. Renvoie `null` — jamais 0, jamais une valeur devinée — si le texte
 * ne se résout pas en nombre fini.
 */
function parseMontant(brut: string): number | null {
	let s = brut.trim();
	if (s === '') return null;
	s = s.replace(/[€$£]/g, '');
	s = s.replace(/\s/g, '');
	if (s === '' || s === '-') return null;

	const dernierleVirgule = s.lastIndexOf(',');
	const dernierPoint = s.lastIndexOf('.');
	if (dernierleVirgule > -1 && dernierPoint > -1) {
		// Le séparateur le plus à droite est décimal, l'autre est un séparateur de milliers.
		if (dernierleVirgule > dernierPoint) {
			s = s.replace(/\./g, '').replace(',', '.');
		} else {
			s = s.replace(/,/g, '');
		}
	} else if (dernierleVirgule > -1) {
		s = s.replace(',', '.');
	}

	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

/**
 * Réconcilie une rangée dont le nombre de champs dépasse celui de l'en-tête.
 *
 * Pathologie réelle rencontrée sur des exports grossistes : le fichier
 * utilise la virgule à la fois comme séparateur de champs ET comme séparateur
 * décimal dans les colonnes monétaires (ex. `90,00` au lieu de `90.00`). Un
 * split naïf casse alors CETTE colonne en deux champs et décale tout ce qui
 * suit. On ne recolle QUE les colonnes monétaires connues (montant, prix
 * unitaire, taux de TVA) — jamais la quantité, dont une valeur entière suivie
 * d'un montant à deux chiffres produirait un faux positif (ex. `20` puis `90`
 * ressemblant à `20,90`). On sait où recoller parce qu'on connaît la position
 * de ces colonnes depuis l'en-tête, pas en devinant.
 */
function reconcilierTokens(
	tokensBruts: readonly string[],
	nbAttendu: number,
	indicesMonetairesInitiaux: readonly number[]
): string[] {
	let resultat = [...tokensBruts];
	let indices = [...indicesMonetairesInitiaux];
	let garde = 0;

	while (resultat.length > nbAttendu && garde < tokensBruts.length) {
		garde++;
		let fusionne = false;
		for (const i of indices) {
			if (i < 0 || i + 1 >= resultat.length) continue;
			const entier = resultat[i].trim();
			const fraction = resultat[i + 1].trim();
			if (/^-?\d+$/.test(entier) && /^\d{1,2}$/.test(fraction)) {
				resultat = [...resultat.slice(0, i), `${entier}.${fraction}`, ...resultat.slice(i + 2)];
				indices = indices.map((j) => (j > i ? j - 1 : j));
				fusionne = true;
				break;
			}
		}
		if (!fusionne) break;
	}

	return resultat;
}

export function parseCsv(contenu: string): ResultatCsv {
	const premiereLigneNonVide = contenu.split(/\r\n|\r|\n/).find((l) => l.trim() !== '');
	if (premiereLigneNonVide === undefined) {
		return { lignes: [], lignesIgnorees: [], erreur: 'Fichier CSV vide.' };
	}
	const separateur = detecterSeparateur(premiereLigneNonVide);

	const resultatBrut = Papa.parse<string[]>(contenu, {
		delimiter: separateur,
		header: false,
		skipEmptyLines: true
	});

	const rangees = resultatBrut.data.filter(
		(rangee) => rangee.length > 1 || (rangee.length === 1 && rangee[0].trim() !== '')
	);
	if (rangees.length === 0) {
		return { lignes: [], lignesIgnorees: [], erreur: 'Fichier CSV vide.' };
	}

	const headers = rangees[0].map((h) => h.trim());
	const mapping = detecterColonnes(headers);

	if (mapping.label === null) {
		return {
			lignes: [],
			lignesIgnorees: [],
			erreur: 'Colonne de libellé introuvable dans l’en-tête CSV.'
		};
	}
	if (mapping.amountHT === null) {
		return {
			lignes: [],
			lignesIgnorees: [],
			erreur: 'Colonne de montant HT introuvable dans l’en-tête CSV.'
		};
	}

	const idxDe = (nom: string | null) => (nom === null ? -1 : headers.indexOf(nom));
	const idxLabel = idxDe(mapping.label);
	const idxAmount = idxDe(mapping.amountHT);
	const idxQuantity = idxDe(mapping.quantity);
	const idxUnit = idxDe(mapping.unit);
	const idxUnitPrice = idxDe(mapping.unitPrice);
	const idxVat = idxDe(mapping.vatRate);
	const idxQualifyingLabel = idxDe(mapping.qualifyingLabel);

	// Colonnes monétaires susceptibles d'être coupées par une virgule décimale
	// coïncidant avec le séparateur de champs. La quantité en est délibérément
	// exclue (voir reconcilierTokens).
	const indicesMonetaires = [idxUnitPrice, idxAmount, idxVat]
		.filter((i) => i >= 0)
		.sort((a, b) => a - b);

	const lignes: LigneBrute[] = [];
	const lignesIgnorees: string[] = [];

	for (const tokensBruts of rangees.slice(1)) {
		if (tokensBruts.every((t) => t.trim() === '')) continue;

		const tokens = reconcilierTokens(tokensBruts, headers.length, indicesMonetaires);

		const rawLabel = (tokens[idxLabel] ?? '').trim();
		if (rawLabel === '') continue;
		if (RE_LIGNE_TOTAL.test(rawLabel)) continue;

		const montant = parseMontant(tokens[idxAmount] ?? '');
		if (montant === null) {
			lignesIgnorees.push(tokensBruts.join(separateur));
			continue;
		}

		const ligne: LigneBrute = { rawLabel, amountHT: montant };

		if (idxQuantity >= 0) {
			const quantite = parseMontant(tokens[idxQuantity] ?? '');
			if (quantite !== null) ligne.quantity = quantite;
		}
		if (idxUnit >= 0) {
			const unite = (tokens[idxUnit] ?? '').trim();
			if (unite !== '') ligne.unit = unite;
		}
		if (idxUnitPrice >= 0) {
			const pu = parseMontant(tokens[idxUnitPrice] ?? '');
			if (pu !== null) ligne.unitPrice = pu;
		}
		if (idxVat >= 0) {
			const tva = parseMontant(tokens[idxVat] ?? '');
			if (tva !== null) ligne.vatRate = tva;
		}
		if (idxQualifyingLabel >= 0) {
			const mention = (tokens[idxQualifyingLabel] ?? '').trim();
			if (mention !== '') ligne.labelMention = mention;
		}

		lignes.push(ligne);
	}

	return { lignes, lignesIgnorees };
}
