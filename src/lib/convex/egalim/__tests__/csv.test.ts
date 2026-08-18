import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { detecterColonnes, parseCsv, decoderTexte } from '../parsers/csv';

describe('decoderTexte', () => {
	it('décode de l’UTF-8', () => {
		expect(decoderTexte(Buffer.from('Désignation', 'utf8'))).toContain('Désignation');
	});

	it('décode de l’ISO-8859-1 sans produire de caractères de remplacement', () => {
		const latin1 = Buffer.from([0x44, 0xe9, 0x73, 0x69, 0x67]); // "Désig" en latin-1
		expect(decoderTexte(latin1)).toBe('Désig');
	});

	it('décode la fixture export-comptable-01.csv, réellement en ISO-8859-1', () => {
		const brut = readFileSync('src/lib/fixtures/factures/export-comptable-01.csv');
		const texte = decoderTexte(brut);
		expect(texte).not.toContain('�'); // aucun caractère de remplacement
	});
});

describe('detecterColonnes', () => {
	it('reconnaît les en-têtes français usuels', () => {
		const m = detecterColonnes(['Désignation', 'Qté', 'PU HT', 'Montant HT', 'Date']);
		expect(m.label).toBe('Désignation');
		expect(m.amountHT).toBe('Montant HT');
	});

	it('reconnaît les variantes majuscules et sans accent', () => {
		const m = detecterColonnes(['LIBELLE', 'QUANTITE', 'PRIX UNITAIRE', 'TOTAL HT']);
		expect(m.label).toBe('LIBELLE');
		expect(m.amountHT).toBe('TOTAL HT');
	});

	it('reconnaît une colonne de label dédiée', () => {
		const m = detecterColonnes(['Libelle', 'Montant HT', 'LABEL']);
		expect(m.label).toBe('Libelle');
		expect(m.qualifyingLabel).toBe('LABEL');
	});

	it('renvoie null sur le libellé quand aucune colonne ne correspond', () => {
		expect(detecterColonnes(['A', 'B', 'C']).label).toBeNull();
	});
});

describe('parseCsv', () => {
	it('détecte le séparateur point-virgule', () => {
		const r = parseCsv('Libelle;Montant HT\nCAROTTE BIO;45,20\n');
		expect(r.lignes).toHaveLength(1);
	});

	it('détecte le séparateur virgule', () => {
		const r = parseCsv('Libelle,Montant HT\nCAROTTE BIO,45.20\n');
		expect(r.lignes).toHaveLength(1);
	});

	it('lit les montants à virgule décimale', () => {
		const r = parseCsv('Libelle;Montant HT\nCAROTTE BIO;45,20\n');
		expect(r.lignes[0]!.amountHT).toBeCloseTo(45.2, 6);
	});

	it('lit les montants avec espace insécable comme séparateur de milliers', () => {
		const r = parseCsv('Libelle;Montant HT\nPALETTE;1 234,56\n');
		expect(r.lignes[0]!.amountHT).toBeCloseTo(1234.56, 6);
	});

	it('conserve les montants négatifs des avoirs', () => {
		const r = parseCsv('Libelle;Montant HT\nAVOIR CAROTTE BIO;-45,20\n');
		expect(r.lignes[0]!.amountHT).toBeCloseTo(-45.2, 6);
	});

	it('écarte les lignes de total intermédiaire', () => {
		const r = parseCsv('Libelle;Montant HT\nCAROTTE;10,00\nTOTAL PAGE 1;10,00\n');
		expect(r.lignes).toHaveLength(1);
	});

	it('ignore les lignes vides', () => {
		const r = parseCsv('Libelle;Montant HT\nCAROTTE;10,00\n\n\n');
		expect(r.lignes).toHaveLength(1);
	});

	it('signale les lignes dont le montant est illisible plutôt que de les inventer', () => {
		const r = parseCsv('Libelle;Montant HT\nCAROTTE;pas un nombre\n');
		expect(r.lignes).toHaveLength(0);
		expect(r.lignesIgnorees).toHaveLength(1);
	});

	it('échoue proprement quand la colonne de libellé est introuvable', () => {
		const r = parseCsv('A;B\n1;2\n');
		expect(r.erreur).toBeTruthy();
	});
});

describe('parseCsv — contre les fixtures', () => {
	it.each(['export-comptable-01', 'grossiste-sale-01'])(
		'%s : les montants extraits retombent sur la vérité terrain',
		(nom) => {
			const brut = readFileSync(`src/lib/fixtures/factures/${nom}.csv`);
			const attendu = JSON.parse(
				readFileSync(`src/lib/fixtures/factures/${nom}.expected.json`, 'utf8')
			);
			const r = parseCsv(decoderTexte(brut));
			expect(r.erreur).toBeUndefined();
			expect(r.lignes).toHaveLength(attendu.lines.length);
			const somme = r.lignes.reduce((s, l) => s + l.amountHT, 0);
			expect(somme).toBeCloseTo(attendu.totalHT, 2);
		}
	);
});
