import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { mdxFromMarkdown } from 'mdast-util-mdx';
import { mdxjs } from 'micromark-extension-mdxjs';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import { blocsVersMdx, mdxVersBlocs, texteBrut, type Bloc, type LectureDuCorps } from '../blocs';
import { lireArticle } from '../source';

/**
 * L'ÉDITEUR À BLOCS NE PERD RIEN (20/10/2026). Les vingt-six articles du dépôt passent en
 * blocs et reviennent en MDX : à l'octet quand rien n'a changé, au même arbre quand tout est
 * réécrit à neuf. Un article publié depuis le CMS ne doit jamais perdre une phrase.
 */

const DOSSIER = join(process.cwd(), 'content', 'blog');
const ARTICLES = readdirSync(DOSSIER)
	.filter((f) => f.endsWith('.mdx'))
	.map((f) => {
		const lu = lireArticle(readFileSync(join(DOSSIER, f), 'utf8'));
		if ('erreurs' in lu) throw new Error(`${f} : ${lu.erreurs.join(' ; ')}`);
		return { fichier: f, corps: lu.corps };
	});

function lue(corps: string): Extract<LectureDuCorps, { blocs: Bloc[] }> {
	const lecture = mdxVersBlocs(corps);
	if ('erreur' in lecture) throw new Error(lecture.erreur);
	return lecture;
}

/** L'arbre du MDX sans positions ni arbres d'expressions, les espaces du texte resserrées. */
function arbre(corps: string): unknown {
	const brut = fromMarkdown(corps, {
		extensions: [mdxjs(), gfm()],
		mdastExtensions: [mdxFromMarkdown(), gfmFromMarkdown()]
	});
	return JSON.parse(
		JSON.stringify(brut, (cle, valeur: unknown) => {
			if (cle === 'position' || cle === 'data') return undefined;
			if (cle === 'value' && typeof valeur === 'string') return valeur.replace(/\s+/g, ' ');
			return valeur;
		})
	);
}

describe('le corps en blocs, et retour', () => {
	it('lit les vingt-six articles', () => {
		expect(ARTICLES.length).toBeGreaterThanOrEqual(26);
	});

	it.each(ARTICLES)('$fichier revient à l’octet quand rien n’a changé', ({ corps }) => {
		const { blocs, memoire } = lue(corps);
		expect(blocsVersMdx(blocs, memoire)).toBe(corps);
	});

	it.each(ARTICLES)('$fichier réécrit à neuf donne le même arbre', ({ corps }) => {
		const { blocs } = lue(corps);
		expect(arbre(blocsVersMdx(blocs))).toEqual(arbre(corps));
	});

	it.each(ARTICLES)('$fichier : seuls les composants inconnus restent en MDX brut', ({ corps }) => {
		const { blocs } = lue(corps);
		const bruts = blocs.filter((b) => b.type === 'mdx').map(texteBrut);
		for (const source of bruts) expect(source).toMatch(/^<[A-Z]/);
	});

	it('ne réécrit que le paragraphe corrigé', () => {
		const article = ARTICLES.find((a) => a.fichier === 'hopital-qui-paie-en-retard.mdx');
		if (article === undefined) throw new Error('article introuvable');
		const { blocs, memoire } = lue(article.corps);
		const rang = blocs.findIndex((b) => b.type === 'paragraph');
		const modifies = blocs.map((b, i) =>
			i === rang ? { ...b, content: [{ type: 'text' as const, text: 'Un premier paragraphe neuf.', styles: {} }] } : b
		);
		const sortie = blocsVersMdx(modifies, memoire);
		const premier = article.corps.split('\n\n')[0] ?? '';
		expect(sortie).toBe(article.corps.replace(premier, 'Un premier paragraphe neuf.'));
	});

	it('garde un composant déplacé sous sa forme d’origine', () => {
		const corps = 'Avant.\n\n<Capture\n\tecran="dossier"\n\tlegende="Une légende."\n/>\n\nAprès.\n';
		const { blocs, memoire } = lue(corps);
		const [a, b, c] = blocs;
		if (a === undefined || b === undefined || c === undefined) throw new Error('trois blocs');
		expect(blocsVersMdx([b, a, c], memoire)).toBe(
			'<Capture\n\tecran="dossier"\n\tlegende="Une légende."\n/>\n\nAvant.\n\nAprès.\n'
		);
	});

	it('lit une valeur de la loi en gras dans la phrase', () => {
		const { blocs } = lue('Un **délai de <DelaiPourAgir regime="TRANSPORT_MARCHANDISES" />** seulement.\n');
		expect(blocs[0]?.content).toEqual([
			{ type: 'text', text: 'Un ', styles: {} },
			{ type: 'text', text: 'délai de ', styles: { bold: true } },
			{
				type: 'valeur',
				props: {
					nom: 'DelaiPourAgir',
					attributs: '{"regime":"TRANSPORT_MARCHANDISES"}',
					gras: true,
					italique: false
				}
			},
			{ type: 'text', text: ' seulement.', styles: {} }
		]);
		expect(blocsVersMdx(blocs)).toBe(
			'Un **délai de <DelaiPourAgir regime="TRANSPORT_MARCHANDISES" />** seulement.\n'
		);
	});

	it('n’écrit pas l’espace laissée derrière une valeur posée en fin de phrase', () => {
		const blocs: Bloc[] = [
			{
				type: 'paragraph',
				content: [
					{ type: 'text', text: 'Les frais : ', styles: {} },
					{ type: 'valeur', props: { nom: 'Indemnite', attributs: '{}', gras: false, italique: false } },
					{ type: 'text', text: ' ', styles: {} }
				]
			}
		];
		expect(blocsVersMdx(blocs)).toBe('Les frais : <Indemnite />\n');
	});

	it('garde à l’octet ce qu’il ne sait pas dessiner', () => {
		const corps =
			"export const x = 1\n\n<Inconnu valeur={[1, 2]}>\n\n**Dedans**\n\n</Inconnu>\n\n{x + 1}\n\n#### Un titre trop profond\n";
		const { blocs } = lue(corps);
		expect(blocs.map((b) => b.type)).toEqual(['mdx', 'mdx', 'mdx', 'mdx']);
		expect(blocsVersMdx(blocs)).toBe(corps);
	});

	it('écrit des étapes et un encadré créés dans l’éditeur', () => {
		const texte = (t: string) => [{ type: 'text' as const, text: t, styles: {} }];
		const blocs: Bloc[] = [
			{
				type: 'etape',
				props: { titre: 'D’abord', quand: 'tout de suite', quandEstExpression: false },
				children: [{ type: 'paragraph', content: texte('Le premier geste.') }]
			},
			{
				type: 'etape',
				props: { titre: 'Ensuite', quand: '', quandEstExpression: false },
				children: [{ type: 'paragraph', content: texte('Le second.') }]
			},
			{
				type: 'encadre',
				props: { titre: 'À retenir', variante: 'attention' },
				children: [{ type: 'bulletListItem', content: texte('Un point.') }]
			}
		];
		expect(blocsVersMdx(blocs)).toBe(
			'<Etapes>\n\t<Etape titre="D’abord" quand="tout de suite">\n\t\tLe premier geste.\n\t</Etape>\n\t<Etape titre="Ensuite">\n\t\tLe second.\n\t</Etape>\n</Etapes>\n\n<Encadre titre="À retenir" variante="attention">\n\n- Un point.\n\n</Encadre>\n'
		);
	});

	it('dit pourquoi un corps ne se lit pas', () => {
		const lecture = mdxVersBlocs('Un composant <Ouvert de="x">\n');
		expect('erreur' in lecture).toBe(true);
	});
});
