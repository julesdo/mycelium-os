import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';

/**
 * LES TEXTES QU'UN GÉRANT LIT, extraits d'un fichier source par l'analyseur de
 * TypeScript : chaînes, gabarits et texte JSX. Les commentaires n'en font pas
 * partie, par construction.
 *
 * Une chaîne compte quand elle ressemble à une phrase ou à un libellé : elle
 * contient une espace, ou commence par une majuscule suivie de minuscules. Les
 * clés (`'pieces'`, `'CREANCE'`), les chemins et les classes n'en sont pas.
 */
export function textesDInterface(
	source: string,
	nom = 'source.tsx'
): { ligne: number; texte: string }[] {
	const fichier = ts.createSourceFile(nom, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
	const trouves: { ligne: number; texte: string }[] = [];

	function retenir(noeud: ts.Node, brut: string, jsx: boolean) {
		const texte = brut.replace(/\s+/g, ' ').trim();
		if (texte === '') return;
		if (/^[/@.#]/.test(texte)) return;
		// Les listes de classes : que des mots-clés à tirets, deux-points ou crochets.
		if (
			/^[\w:[\]().%/#-]+(\s+[\w:[\]().%/#-]+)*$/.test(texte) &&
			/[-:[]/.test(texte) &&
			!/[À-ÿ]/.test(texte)
		)
			return;
		const phrase = jsx || /\s/.test(texte) || /^[A-ZÀ-Ý][a-zà-ÿ’']/.test(texte);
		if (!phrase) return;
		const { line } = fichier.getLineAndCharacterOfPosition(noeud.getStart());
		trouves.push({ ligne: line + 1, texte });
	}

	function visiter(noeud: ts.Node) {
		if (ts.isJsxText(noeud)) retenir(noeud, noeud.text, true);
		else if (ts.isStringLiteral(noeud) || ts.isNoSubstitutionTemplateLiteral(noeud)) {
			// Les imports et les clés d'objet ne sont pas du texte lu.
			const parent = noeud.parent;
			if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) return;
			if (ts.isLiteralTypeNode(parent)) return;
			if (
				ts.isJsxAttribute(parent) &&
				/^(className|contentClassName|to|vers|href|id|key|name|type|variant|size|color|as)$/.test(
					parent.name.getText()
				)
			)
				return;
			retenir(noeud, noeud.text, false);
		} else if (ts.isTemplateHead(noeud) || ts.isTemplateMiddle(noeud) || ts.isTemplateTail(noeud)) {
			retenir(noeud, noeud.text, false);
		}
		ts.forEachChild(noeud, visiter);
	}
	visiter(fichier);
	return trouves;
}

export function fichiersSources(dossier: string): string[] {
	if (!existsSync(dossier)) return [];
	const trouves: string[] = [];
	for (const entree of readdirSync(dossier)) {
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) {
			if (entree === '__tests__' || entree === '_generated') continue;
			trouves.push(...fichiersSources(chemin));
			continue;
		}
		if (!/\.tsx?$/.test(entree) || entree.includes('.test.') || entree.includes('.tmp.')) continue;
		trouves.push(chemin);
	}
	return trouves;
}

export function lire(chemin: string): string {
	return readFileSync(chemin, 'utf8');
}
