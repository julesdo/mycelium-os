/**
 * LIRE UN TABLEUR EXPORTÉ EN CSV (16/10/2026) — le tableur de prospection
 * (`docs/croissance/prospection.csv`) et ses copies passées par Excel ou Google
 * Sheets.
 *
 * Excel en français écrit un point-virgule, Google Sheets une virgule : le
 * séparateur se devine sur la première ligne. Le BOM est retiré, les guillemets
 * doublés rendus, et un retour à la ligne dans une cellule entre guillemets ne
 * coupe pas la ligne. Les lignes entièrement vides sont ignorées.
 */
export function lireCsv(texte: string): string[][] {
	const brut = texte.charCodeAt(0) === 0xfeff ? texte.slice(1) : texte;
	const premiereLigne = brut.split(/\r?\n/, 1)[0] ?? '';
	const separateur =
		(premiereLigne.match(/;/g)?.length ?? 0) >= (premiereLigne.match(/,/g)?.length ?? 0)
			? ';'
			: ',';

	const lignes: string[][] = [];
	let ligne: string[] = [];
	let cellule = '';
	let entreGuillemets = false;

	for (let i = 0; i < brut.length; i += 1) {
		const c = brut[i];
		if (entreGuillemets) {
			if (c === '"') {
				if (brut[i + 1] === '"') {
					cellule += '"';
					i += 1;
				} else {
					entreGuillemets = false;
				}
			} else {
				cellule += c;
			}
			continue;
		}
		if (c === '"') {
			entreGuillemets = true;
		} else if (c === separateur) {
			ligne.push(cellule);
			cellule = '';
		} else if (c === '\n' || c === '\r') {
			if (c === '\r' && brut[i + 1] === '\n') i += 1;
			ligne.push(cellule);
			lignes.push(ligne);
			ligne = [];
			cellule = '';
		} else {
			cellule += c;
		}
	}
	if (cellule !== '' || ligne.length > 0) {
		ligne.push(cellule);
		lignes.push(ligne);
	}
	return lignes.filter((l) => l.some((v) => v.trim() !== ''));
}
