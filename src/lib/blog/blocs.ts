import type {
	Heading,
	List,
	ListItem,
	Paragraph,
	PhrasingContent,
	RootContent,
	Table,
	TableRow
} from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toMarkdown } from 'mdast-util-to-markdown';
import { mdxFromMarkdown, mdxToMarkdown } from 'mdast-util-mdx';
import { mdxjs } from 'micromark-extension-mdxjs';
import { gfmFromMarkdown, gfmToMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';

/**
 * LE CORPS D'UN ARTICLE, EN BLOCS (20/10/2026). Le fondateur : « un éditeur visuel avec des
 * blocs en glisser-déposer, hyper intuitif, à la Notion ».
 *
 * Module pur : ni React ni éditeur. Il lit le MDX d'un article en blocs que l'éditeur sait
 * afficher (paragraphes, intertitres, listes, citations, tableaux, encadrés, étapes, valeurs
 * de la loi), et réécrit ces blocs en MDX. La forme des blocs est celle de BlockNote, écrite
 * à la main : l'éditeur la consomme telle quelle, et ce module ne dépend pas de lui.
 *
 * DEUX RÈGLES LE TIENNENT, PARCE QUE LE FICHIER PART EN PRODUCTION :
 *
 * 1. RIEN NE SE PERD. Ce que l'éditeur ne sait pas dessiner (un composant à tableau, une
 *    expression, un import) devient un bloc « MDX » qui garde sa source à l'octet, et se
 *    montre rendu. `blocs.test.ts` relit les vingt-six articles du dépôt et vérifie que la
 *    réécriture produit le même arbre.
 * 2. CE QUI N'A PAS CHANGÉ NE BOUGE PAS. Chaque groupe lu garde sa source (ses retours à la
 *    ligne compris) ; à la réécriture, un groupe identique reprend la sienne. Ouvrir un article
 *    puis le publier sans y toucher rend le fichier inchangé ; corriger un paragraphe ne
 *    réécrit que ce paragraphe.
 */

// ─── La forme des blocs ──────────────────────────────────────────────────────

/** Les styles qu'un article peut porter. Le reste (couleur, souligné) ne s'écrit pas en MDX. */
export interface Styles {
	readonly bold?: true;
	readonly italic?: true;
	readonly code?: true;
}

export interface TexteEnLigne {
	readonly type: 'text';
	readonly text: string;
	readonly styles: Styles;
}

export interface LienEnLigne {
	readonly type: 'link';
	readonly href: string;
	readonly content: readonly TexteEnLigne[];
}

/**
 * Une valeur de la loi au fil du texte : `<Indemnite />`, `<Source de="…" />`… Le composant et
 * ses attributs (en JSON, dans l'ordre du fichier) ; le gras et l'italique de la phrase qui
 * l'entoure, qu'un nœud insécable ne porte pas autrement.
 */
export interface ValeurEnLigne {
	readonly type: 'valeur';
	readonly props: {
		readonly nom: string;
		readonly attributs: string;
		readonly gras: boolean;
		readonly italique: boolean;
	};
}

export type EnLigne = TexteEnLigne | LienEnLigne | ValeurEnLigne;

/** Le contenu d'un tableau, cellules nues ou cellules à propriétés (celles que rend l'éditeur). */
export interface ContenuDeTableau {
	readonly type: 'tableContent';
	readonly headerRows?: number;
	readonly rows: readonly {
		readonly cells: readonly (readonly EnLigne[] | { readonly content: readonly EnLigne[] })[];
	}[];
}

/**
 * Un bloc tel que l'éditeur le rend. Les propriétés en trop (couleurs, alignement) sont
 * ignorées : seules celles qui s'écrivent en MDX comptent.
 */
export interface Bloc {
	readonly id?: string;
	readonly type: string;
	readonly props?: Readonly<Record<string, unknown>>;
	readonly content?: readonly EnLigne[] | ContenuDeTableau;
	readonly children?: readonly Bloc[];
}

/** Ce que la lecture retient pour réécrire sans rien bouger de ce qui n'a pas changé. */
export interface MemoireDuCorps {
	/** Le corps lu, rendu tel quel si plus rien n'a changé. */
	readonly corps: string;
	/** Chaque groupe lu, réécrit à neuf : la forme de référence. */
	readonly sequence: readonly string[];
	/** De la forme réécrite à neuf vers la source d'origine du groupe. */
	readonly sources: ReadonlyMap<string, string>;
}

export type LectureDuCorps =
	| { readonly blocs: Bloc[]; readonly memoire: MemoireDuCorps }
	| { readonly erreur: string };

// ─── Lire ────────────────────────────────────────────────────────────────────

const EXTENSIONS_LECTURE = {
	extensions: [mdxjs(), gfm()],
	mdastExtensions: [mdxFromMarkdown(), gfmFromMarkdown()]
};

/** Les composants qui ont leur bloc ; tout autre composant devient un bloc « MDX ». */
export const CONTENEURS = { encadre: 'Encadre', etapes: 'Etapes', etape: 'Etape' } as const;

/** La source d'un nœud, ses lignes suivantes ramenées à la marge de sa première. */
function sourceDe(noeud: RootContent, corps: string): string {
	const debut = noeud.position?.start;
	const fin = noeud.position?.end;
	if (debut?.offset === undefined || fin?.offset === undefined) return '';
	const brut = corps.slice(debut.offset, fin.offset);
	const marge = debut.column - 1;
	if (marge === 0) return brut;
	return brut
		.split('\n')
		.map((ligne, rang) => (rang === 0 ? ligne : ligne.replace(new RegExp(`^[ \\t]{0,${marge}}`), '')))
		.join('\n');
}

/** Un bloc « MDX » : sa source en texte brut, que l'éditeur montre rendue et ouvre au clic. */
export function blocMdxDepuis(source: string): Bloc {
	return { type: 'mdx', content: [{ type: 'text', text: source, styles: {} }], children: [] };
}

function blocMdx(noeud: RootContent, corps: string): Bloc {
	return blocMdxDepuis(sourceDe(noeud, corps));
}

/** Un retour à la ligne dans un paragraphe n'est qu'une espace : le site le rend ainsi. */
function espacesNormalisees(texte: string): string {
	return texte.replace(/[ \t]*\n[ \t]*/g, ' ');
}

interface Marques {
	readonly gras?: boolean;
	readonly italique?: boolean;
}

function stylesDe(marques: Marques, code = false): Styles {
	return {
		...(marques.gras === true ? { bold: true as const } : {}),
		...(marques.italique === true ? { italic: true as const } : {}),
		...(code ? { code: true as const } : {})
	};
}

/** Les attributs d'un composant, s'ils sont tous des chaînes ; `null` sinon. */
function attributsTextuels(
	element: MdxJsxFlowElement | MdxJsxTextElement
): Record<string, string> | null {
	const attributs: Record<string, string> = {};
	for (const attribut of element.attributes) {
		if (attribut.type !== 'mdxJsxAttribute' || typeof attribut.value !== 'string') return null;
		attributs[attribut.name] = attribut.value;
	}
	return attributs;
}

/** Le texte d'un paragraphe en contenu d'éditeur, ou `null` s'il porte ce qu'il ne sait pas dire. */
function enLigne(enfants: readonly PhrasingContent[], marques: Marques = {}): EnLigne[] | null {
	const contenu: EnLigne[] = [];
	for (const enfant of enfants) {
		switch (enfant.type) {
			case 'text': {
				const texte = espacesNormalisees(enfant.value);
				if (texte !== '') contenu.push({ type: 'text', text: texte, styles: stylesDe(marques) });
				break;
			}
			case 'break':
				contenu.push({ type: 'text', text: '\n', styles: stylesDe(marques) });
				break;
			case 'strong':
			case 'emphasis': {
				const dedans = enLigne(
					enfant.children,
					enfant.type === 'strong' ? { ...marques, gras: true } : { ...marques, italique: true }
				);
				if (dedans === null) return null;
				contenu.push(...dedans);
				break;
			}
			case 'inlineCode':
				contenu.push({ type: 'text', text: enfant.value, styles: stylesDe(marques, true) });
				break;
			case 'link': {
				if (enfant.title !== null && enfant.title !== undefined) return null;
				const dedans = enLigne(enfant.children, marques);
				if (dedans === null || dedans.some((c) => c.type !== 'text')) return null;
				contenu.push({ type: 'link', href: enfant.url, content: dedans as TexteEnLigne[] });
				break;
			}
			case 'mdxJsxTextElement': {
				const attributs = attributsTextuels(enfant);
				if (enfant.name === null || enfant.children.length > 0 || attributs === null) return null;
				contenu.push({
					type: 'valeur',
					props: {
						nom: enfant.name,
						attributs: JSON.stringify(attributs),
						gras: marques.gras === true,
						italique: marques.italique === true
					}
				});
				break;
			}
			default:
				return null;
		}
	}
	return contenu;
}

function blocsDeListe(liste: List, corps: string): Bloc[] | null {
	if (liste.spread === true) return null;
	if (liste.ordered === true && liste.start !== null && liste.start !== undefined && liste.start !== 1)
		return null;
	const type = liste.ordered === true ? 'numberedListItem' : 'bulletListItem';
	const blocs: Bloc[] = [];
	for (const item of liste.children as ListItem[]) {
		if (item.spread === true || (item.checked !== null && item.checked !== undefined)) return null;
		const [premier, ...reste] = item.children;
		if (premier?.type !== 'paragraph') return null;
		const contenu = enLigne(premier.children);
		if (contenu === null) return null;
		const enfants: Bloc[] = [];
		for (const sous of reste) {
			if (sous.type !== 'list') return null;
			const sousBlocs = blocsDeListe(sous, corps);
			if (sousBlocs === null) return null;
			enfants.push(...sousBlocs);
		}
		blocs.push({ type, content: contenu, children: enfants });
	}
	return blocs;
}

function blocDeTableau(tableau: Table): Bloc | null {
	if (tableau.align?.some((a) => a !== null) === true) return null;
	const lignes: { cells: EnLigne[][] }[] = [];
	for (const ligne of tableau.children as TableRow[]) {
		const cellules: EnLigne[][] = [];
		for (const cellule of ligne.children) {
			const contenu = enLigne(cellule.children);
			if (contenu === null) return null;
			cellules.push(contenu);
		}
		lignes.push({ cells: cellules });
	}
	return { type: 'table', content: { type: 'tableContent', headerRows: 1, rows: lignes } };
}

/** Un nœud du MDX en blocs : ceux que l'éditeur dessine, ou un bloc « MDX » qui garde tout. */
function versBlocs(noeud: RootContent, corps: string): Bloc[] {
	switch (noeud.type) {
		case 'paragraph': {
			const contenu = enLigne(noeud.children);
			return contenu === null
				? [blocMdx(noeud, corps)]
				: [{ type: 'paragraph', content: contenu, children: [] }];
		}
		case 'heading': {
			const contenu = noeud.depth === 2 || noeud.depth === 3 ? enLigne(noeud.children) : null;
			return contenu === null
				? [blocMdx(noeud, corps)]
				: [{ type: 'heading', props: { level: noeud.depth }, content: contenu, children: [] }];
		}
		case 'thematicBreak':
			return [{ type: 'divider', children: [] }];
		case 'blockquote': {
			const [seul, ...autres] = noeud.children;
			const contenu =
				seul?.type === 'paragraph' && autres.length === 0 ? enLigne(seul.children) : null;
			return contenu === null
				? [blocMdx(noeud, corps)]
				: [{ type: 'quote', content: contenu, children: [] }];
		}
		case 'list':
			return blocsDeListe(noeud, corps) ?? [blocMdx(noeud, corps)];
		case 'table': {
			const bloc = blocDeTableau(noeud);
			return bloc === null ? [blocMdx(noeud, corps)] : [bloc];
		}
		case 'mdxJsxFlowElement':
			return blocsDeComposant(noeud, corps) ?? [blocMdx(noeud, corps)];
		default:
			return [blocMdx(noeud, corps)];
	}
}

function blocsDeComposant(element: MdxJsxFlowElement, corps: string): Bloc[] | null {
	if (element.name === CONTENEURS.encadre) {
		const attributs = attributsTextuels(element);
		if (attributs === null || Object.keys(attributs).some((n) => n !== 'titre' && n !== 'variante'))
			return null;
		return [
			{
				type: 'encadre',
				props: { titre: attributs.titre ?? '', variante: attributs.variante ?? '' },
				children: element.children.flatMap((enfant) => versBlocs(enfant, corps))
			}
		];
	}
	if (element.name === CONTENEURS.etapes) {
		if (element.attributes.length > 0) return null;
		const etapes: Bloc[] = [];
		for (const enfant of element.children) {
			if (enfant.type !== 'mdxJsxFlowElement' || enfant.name !== CONTENEURS.etape) return null;
			const etape = blocDEtape(enfant, corps);
			if (etape === null) return null;
			etapes.push(etape);
		}
		return etapes.length === 0 ? null : etapes;
	}
	return null;
}

function blocDEtape(element: MdxJsxFlowElement, corps: string): Bloc | null {
	let titre = '';
	let quand = '';
	let quandEstExpression = false;
	for (const attribut of element.attributes) {
		if (attribut.type !== 'mdxJsxAttribute') return null;
		if (attribut.name === 'titre' && typeof attribut.value === 'string') titre = attribut.value;
		else if (attribut.name === 'quand' && typeof attribut.value === 'string') quand = attribut.value;
		else if (
			attribut.name === 'quand' &&
			attribut.value !== null &&
			typeof attribut.value === 'object'
		) {
			quand = attribut.value.value;
			quandEstExpression = true;
		} else return null;
	}
	return {
		type: 'etape',
		props: { titre, quand, quandEstExpression },
		children: element.children.flatMap((enfant) => versBlocs(enfant, corps))
	};
}

/** Le corps d'un article en blocs, avec ce qu'il faut pour le réécrire sans rien bouger. */
export function mdxVersBlocs(corps: string): LectureDuCorps {
	let arbre;
	try {
		arbre = fromMarkdown(corps, EXTENSIONS_LECTURE);
	} catch (e) {
		const erreur = e as { message?: string; line?: number; column?: number };
		const ou = typeof erreur.line === 'number' ? ` (ligne ${erreur.line})` : '';
		return { erreur: `${erreur.message ?? 'Le MDX ne se lit pas'}${ou}` };
	}
	const groupesLus = arbre.children.map((noeud) => ({
		blocs: versBlocs(noeud, corps),
		source: sourceDe(noeud, corps)
	}));
	const blocs = groupesLus.flatMap((g) => g.blocs);
	const sources = new Map<string, string>();
	for (const groupe of groupesLus) {
		const neuf = grouper(groupe.blocs).map(ecrireGroupe).join('\n\n');
		if (neuf !== '' && !sources.has(neuf)) sources.set(neuf, groupe.source);
	}
	return {
		blocs,
		memoire: {
			corps,
			sequence: grouper(blocs)
				.map(ecrireGroupe)
				.filter((m) => m !== ''),
			sources
		}
	};
}

// ─── Écrire ──────────────────────────────────────────────────────────────────

type Groupe =
	| { readonly genre: 'liste'; readonly ordonnee: boolean; readonly blocs: readonly Bloc[] }
	| { readonly genre: 'etapes'; readonly blocs: readonly Bloc[] }
	| { readonly genre: 'seul'; readonly bloc: Bloc };

const LISTES = new Set(['bulletListItem', 'numberedListItem']);

/** Les blocs voisins d'une même liste ou d'une même suite d'étapes s'écrivent ensemble. */
function grouper(blocs: readonly Bloc[]): Groupe[] {
	const groupes: Groupe[] = [];
	for (const bloc of blocs) {
		const dernier = groupes.at(-1);
		if (LISTES.has(bloc.type)) {
			const ordonnee = bloc.type === 'numberedListItem';
			if (dernier?.genre === 'liste' && dernier.ordonnee === ordonnee) {
				groupes[groupes.length - 1] = { ...dernier, blocs: [...dernier.blocs, bloc] };
			} else groupes.push({ genre: 'liste', ordonnee, blocs: [bloc] });
		} else if (bloc.type === 'etape') {
			if (dernier?.genre === 'etapes') {
				groupes[groupes.length - 1] = { ...dernier, blocs: [...dernier.blocs, bloc] };
			} else groupes.push({ genre: 'etapes', blocs: [bloc] });
		} else groupes.push({ genre: 'seul', bloc });
	}
	return groupes;
}

const OPTIONS_ECRITURE = {
	extensions: [mdxToMarkdown(), gfmToMarkdown()],
	bullet: '-' as const,
	emphasis: '*' as const,
	strong: '*' as const,
	rule: '-' as const,
	listItemIndent: 'one' as const
};

function markdown(noeud: Paragraph | Heading | List | Table | RootContent): string {
	return toMarkdown(noeud, OPTIONS_ECRITURE).replace(/\n+$/, '');
}

function contenuEnLigne(bloc: Bloc): readonly EnLigne[] {
	return Array.isArray(bloc.content) ? (bloc.content as readonly EnLigne[]) : [];
}

/** Le texte brut d'un bloc : la source d'un bloc « MDX ». */
export function texteBrut(bloc: Bloc): string {
	return contenuEnLigne(bloc)
		.map((morceau) => (morceau.type === 'text' ? morceau.text : ''))
		.join('');
}

function chaine(valeur: unknown): string {
	return typeof valeur === 'string' ? valeur : '';
}

/** Un morceau de texte, avec les marques qu'il porte : la matière d'un paragraphe à réécrire. */
interface Atome {
	readonly gras: boolean;
	readonly italique: boolean;
	readonly noeud: PhrasingContent;
}

function attributsDepuisJson(json: string): MdxJsxAttribute[] {
	try {
		const objet = JSON.parse(json) as Record<string, unknown>;
		return Object.entries(objet)
			.filter((entree): entree is [string, string] => typeof entree[1] === 'string')
			.map(([name, value]) => ({ type: 'mdxJsxAttribute', name, value }));
	} catch {
		return [];
	}
}

function atomesDe(contenu: readonly EnLigne[]): Atome[] {
	const atomes: Atome[] = [];
	for (const morceau of contenu) {
		if (morceau.type === 'valeur') {
			atomes.push({
				gras: morceau.props.gras,
				italique: morceau.props.italique,
				noeud: {
					type: 'mdxJsxTextElement',
					name: morceau.props.nom,
					attributes: attributsDepuisJson(morceau.props.attributs),
					children: []
				}
			});
		} else if (morceau.type === 'link') {
			// Les marques communes à tout le lien passent dehors ; le reste reste dedans.
			const gras = morceau.content.length > 0 && morceau.content.every((t) => t.styles.bold);
			const italique =
				morceau.content.length > 0 && morceau.content.every((t) => t.styles.italic);
			const dedans = morceau.content.map((t) => ({
				...t,
				styles: {
					...(t.styles.bold === true && !gras ? { bold: true as const } : {}),
					...(t.styles.italic === true && !italique ? { italic: true as const } : {}),
					...(t.styles.code === true ? { code: true as const } : {})
				}
			}));
			atomes.push({
				gras,
				italique,
				noeud: { type: 'link', url: morceau.href, title: null, children: phrasing(dedans) }
			});
		} else if (morceau.styles.code === true) {
			atomes.push({
				gras: morceau.styles.bold === true,
				italique: morceau.styles.italic === true,
				noeud: { type: 'inlineCode', value: morceau.text }
			});
		} else {
			const lignes = morceau.text.split('\n');
			lignes.forEach((ligne, rang) => {
				const marques = {
					gras: morceau.styles.bold === true,
					italique: morceau.styles.italic === true
				};
				if (rang > 0) atomes.push({ ...marques, noeud: { type: 'break' } });
				if (ligne !== '') atomes.push({ ...marques, noeud: { type: 'text', value: ligne } });
			});
		}
	}
	return atomes;
}

/**
 * Les espaces au bord d'un passage en gras sortent du gras : `**mot **` ne s'écrit pas en
 * Markdown, et le réécrivain l'encoderait en entité.
 */
function avecBordsDehors(
	run: readonly Atome[],
	envelopper: (dedans: PhrasingContent[]) => PhrasingContent,
	interieur: (atomes: readonly Atome[]) => PhrasingContent[]
): PhrasingContent[] {
	const atomes = [...run];
	let avant = '';
	let apres = '';
	const premier = atomes[0];
	if (premier?.noeud.type === 'text') {
		const sans = premier.noeud.value.replace(/^\s+/, '');
		avant = premier.noeud.value.slice(0, premier.noeud.value.length - sans.length);
		atomes[0] = { ...premier, noeud: { type: 'text', value: sans } };
	}
	const dernier = atomes.at(-1);
	if (dernier?.noeud.type === 'text') {
		const sans = dernier.noeud.value.replace(/\s+$/, '');
		apres = dernier.noeud.value.slice(sans.length);
		atomes[atomes.length - 1] = { ...dernier, noeud: { type: 'text', value: sans } };
	}
	const utiles = atomes.filter((a) => !(a.noeud.type === 'text' && a.noeud.value === ''));
	const sortie: PhrasingContent[] = [];
	if (avant !== '') sortie.push({ type: 'text', value: avant });
	if (utiles.length > 0) sortie.push(envelopper(interieur(utiles)));
	if (apres !== '') sortie.push({ type: 'text', value: apres });
	return sortie;
}

/** Des suites d'atomes de même marque, enveloppées : le gras dehors, l'italique dedans. */
function envelopper(
	atomes: readonly Atome[],
	marque: 'gras' | 'italique',
	suite: (atomes: readonly Atome[]) => PhrasingContent[]
): PhrasingContent[] {
	const sortie: PhrasingContent[] = [];
	let rang = 0;
	while (rang < atomes.length) {
		const courant = atomes[rang];
		if (courant === undefined) break;
		let fin = rang;
		while (fin < atomes.length && atomes[fin]?.[marque] === courant[marque]) fin += 1;
		const run = atomes.slice(rang, fin);
		if (courant[marque]) {
			sortie.push(
				...avecBordsDehors(
					run,
					(dedans) =>
						marque === 'gras'
							? { type: 'strong', children: dedans }
							: { type: 'emphasis', children: dedans },
					suite
				)
			);
		} else sortie.push(...suite(run));
		rang = fin;
	}
	return sortie;
}

/**
 * Le texte d'un bloc entier : sans espace au début ni à la fin. Une valeur posée en fin de
 * phrase laisse une espace derrière elle, que le Markdown écrirait `&#x20;`.
 */
function phrasingDeBloc(contenu: readonly EnLigne[]): PhrasingContent[] {
	const net = [...contenu];
	const premier = net[0];
	if (premier?.type === 'text') net[0] = { ...premier, text: premier.text.replace(/^\s+/, '') };
	const dernier = net.at(-1);
	if (dernier?.type === 'text')
		net[net.length - 1] = { ...dernier, text: dernier.text.replace(/\s+$/, '') };
	return phrasing(net.filter((m) => m.type !== 'text' || m.text !== ''));
}

function phrasing(contenu: readonly EnLigne[]): PhrasingContent[] {
	const atomes = atomesDe(contenu);
	return envelopper(atomes, 'gras', (dedans) =>
		envelopper(dedans, 'italique', (nus) => nus.map((a) => a.noeud))
	);
}

/** La valeur d'un attribut entre guillemets droits, qu'une apostrophe ne gêne pas. */
function attribut(nom: string, valeur: string): string {
	return ` ${nom}="${valeur.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`;
}

/** Des blocs enfants (d'un encadré, d'une étape), réécrits à neuf, séparés d'une ligne. */
function ecrireEnfants(enfants: readonly Bloc[] | undefined): string {
	return grouper(enfants ?? [])
		.map(ecrireGroupe)
		.filter((morceau) => morceau !== '')
		.join('\n\n');
}

function itemDeListe(bloc: Bloc): ListItem {
	const sousListes = grouper(bloc.children ?? []).filter(
		(g): g is Extract<Groupe, { genre: 'liste' }> => g.genre === 'liste'
	);
	return {
		type: 'listItem',
		spread: false,
		children: [
			{ type: 'paragraph', children: phrasingDeBloc(contenuEnLigne(bloc)) },
			...sousListes.map((g) => listeDe(g.blocs, g.ordonnee))
		]
	};
}

function listeDe(blocs: readonly Bloc[], ordonnee: boolean): List {
	return {
		type: 'list',
		ordered: ordonnee,
		start: ordonnee ? 1 : null,
		spread: false,
		children: blocs.map(itemDeListe)
	};
}

function cellulesDe(contenu: ContenuDeTableau): readonly (readonly EnLigne[])[][] {
	return contenu.rows.map((ligne) =>
		ligne.cells.map((cellule) => (Array.isArray(cellule) ? cellule : (cellule as { content: readonly EnLigne[] }).content))
	);
}

function ecrireTableau(bloc: Bloc): string {
	const contenu = bloc.content;
	if (contenu === undefined || Array.isArray(contenu)) return '';
	const lignes = cellulesDe(contenu as ContenuDeTableau);
	if (lignes.length === 0) return '';
	const colonnes = Math.max(...lignes.map((l) => l.length));
	const tableau: Table = {
		type: 'table',
		align: Array.from({ length: colonnes }, () => null),
		children: lignes.map((cellules) => ({
			type: 'tableRow',
			children: Array.from({ length: colonnes }, (_, rang) => ({
				type: 'tableCell',
				children: phrasingDeBloc(cellules[rang] ?? [])
			}))
		}))
	};
	return markdown(tableau);
}

function ecrireEtapes(blocs: readonly Bloc[]): string {
	const etapes = blocs.map((bloc) => {
		const titre = chaine(bloc.props?.titre);
		const quand = chaine(bloc.props?.quand);
		const expression = bloc.props?.quandEstExpression === true;
		const attributs =
			(titre === '' ? '' : attribut('titre', titre)) +
			(quand === '' ? '' : expression ? ` quand={${quand}}` : attribut('quand', quand));
		const dedans = ecrireEnfants(bloc.children)
			.split('\n')
			.map((ligne) => (ligne === '' ? '' : `\t\t${ligne}`))
			.join('\n');
		return `\t<${CONTENEURS.etape}${attributs}>\n${dedans}\n\t</${CONTENEURS.etape}>`;
	});
	return `<${CONTENEURS.etapes}>\n${etapes.join('\n')}\n</${CONTENEURS.etapes}>`;
}

function ecrireEncadre(bloc: Bloc): string {
	const titre = chaine(bloc.props?.titre);
	const variante = chaine(bloc.props?.variante);
	const attributs =
		(titre === '' ? '' : attribut('titre', titre)) +
		(variante === '' ? '' : attribut('variante', variante));
	const dedans = ecrireEnfants(bloc.children);
	return `<${CONTENEURS.encadre}${attributs}>\n\n${dedans}\n\n</${CONTENEURS.encadre}>`;
}

function ecrireBloc(bloc: Bloc): string {
	switch (bloc.type) {
		case 'paragraph': {
			const contenu = contenuEnLigne(bloc);
			return contenu.length === 0
				? ''
				: markdown({ type: 'paragraph', children: phrasingDeBloc(contenu) });
		}
		case 'heading': {
			const contenu = contenuEnLigne(bloc);
			if (contenu.length === 0) return '';
			const niveau = bloc.props?.level === 3 ? 3 : 2;
			return markdown({ type: 'heading', depth: niveau, children: phrasingDeBloc(contenu) });
		}
		case 'quote': {
			const contenu = contenuEnLigne(bloc);
			return contenu.length === 0
				? ''
				: markdown({
						type: 'blockquote',
						children: [{ type: 'paragraph', children: phrasingDeBloc(contenu) }]
					});
		}
		case 'divider':
			return '---';
		case 'table':
			return ecrireTableau(bloc);
		case 'encadre':
			return ecrireEncadre(bloc);
		case 'mdx':
			return texteBrut(bloc).replace(/\s+$/, '');
		default:
			return '';
	}
}

function ecrireGroupe(groupe: Groupe): string {
	switch (groupe.genre) {
		case 'liste':
			return markdown(listeDe(groupe.blocs, groupe.ordonnee));
		case 'etapes':
			return ecrireEtapes(groupe.blocs);
		case 'seul':
			return ecrireBloc(groupe.bloc);
	}
}

/**
 * Les blocs de l'éditeur en MDX. Avec la mémoire de la lecture, un groupe qui n'a pas changé
 * reprend sa source d'origine, et un corps qui n'a pas changé du tout revient à l'octet.
 */
export function blocsVersMdx(blocs: readonly Bloc[], memoire?: MemoireDuCorps): string {
	const neufs = grouper(blocs)
		.map(ecrireGroupe)
		.filter((morceau) => morceau !== '');
	if (
		memoire !== undefined &&
		neufs.length === memoire.sequence.length &&
		neufs.every((m, rang) => m === memoire.sequence[rang])
	) {
		return memoire.corps;
	}
	const morceaux = neufs.map((neuf) => memoire?.sources.get(neuf) ?? neuf);
	return morceaux.length === 0 ? '' : `${morceaux.join('\n\n')}\n`;
}
