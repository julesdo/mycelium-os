/**
 * Vendorise les dessins au trait qui habillent le fond du héros.
 *
 * D'OÙ ILS VIENNENT. OpenMoji, le projet libre de l'école supérieure de design
 * de Schwäbisch Gmünd. On prend la variante `black`, qui n'est pas un emoji
 * colorié mais un DESSIN AU TRAIT : `fill="none"`, un contour de deux unités
 * sur une grille de 72, dessiné à la main. C'est exactement le registre
 * recherché — celui d'un carnet de cuisine, pas d'une banque d'icônes.
 *
 * Licence CC BY-SA 4.0 : attribution obligatoire, et toute adaptation se
 * partage sous la même licence. Voir `public/CREDITS.md`, qui porte les deux.
 *
 * POURQUOI ON LES COPIE AU LIEU D'INSTALLER UN PAQUET. Trois raisons, dans
 * l'ordre où elles ont écarté les autres pistes :
 *
 * 1. Les jeux dessinés à la main disponibles en paquet ne contiennent pas de
 *    nourriture. `streamline-freehand` (1000 icônes, CC BY 4.0) et
 *    `pepicons-pencil` n'ont ni carotte, ni poisson, ni fromage : leur volet
 *    alimentaire est dans la version payante. Vérifié, pas supposé.
 * 2. `doodle-icons`, le seul paquet npm au bon style, dépend de React 17 en
 *    pair et n'a pas bougé depuis 2022. Sur React 19, c'est un conflit
 *    d'installation pour quatorze dessins décoratifs.
 * 3. Aucune requête vers un tiers depuis la page publique. C'est la même règle
 *    que pour les photographies (voir `public/photos/CREDITS.md`) : un appel
 *    vers l'hébergeur d'une icône ferait de lui un destinataire de l'adresse IP
 *    de chaque visiteur, donc une ligne au tableau des sous-traitants.
 *
 * CE QUE LE SCRIPT ENLÈVE, ET POURQUOI. Chaque fichier d'origine répète sur
 * tous ses tracés `fill`, `stroke`, `stroke-width`, les bouts et les jointures.
 * On les retire des enfants pour les poser UNE FOIS sur le `<svg>` racine : le
 * fichier généré fond de moitié, et surtout la couleur devient `currentColor`,
 * donc un dessin prend la teinte de son contexte au lieu d'être noir.
 *
 * Relancer : `bun scripts/telecharger-doodles.ts`
 */
import { writeFileSync } from 'node:fs';

const SOURCE = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/black/svg';

/** Le nom français, et le point de code OpenMoji. L'ordre est celui du fichier généré. */
const DESSINS = [
	['carotte', '1F955'],
	['tomate', '1F345'],
	['salade', '1F96C'],
	['brocoli', '1F966'],
	['oignon', '1F9C5'],
	['poisson', '1F41F'],
	['volaille', '1F357'],
	['fromage', '1F9C0'],
	['oeuf', '1F95A'],
	['pain', '1F35E'],
	['epi', '1F33E'],
	['marmite', '1F372'],
	['couvert', '1F37D'],
	['ticket', '1F9FE']
] as const;

/** Les attributs d'aspect, hissés sur la racine. Tout le reste est de la géométrie. */
const ASPECT = new Set([
	'fill',
	'stroke',
	'stroke-width',
	'stroke-linecap',
	'stroke-linejoin',
	'stroke-miterlimit'
]);

/** Kebab vers camel, pour les rares attributs de géométrie qui en portent. */
function camel(nom: string): string {
	return nom.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}

async function recuperer(code: string): Promise<string> {
	const reponse = await fetch(`${SOURCE}/${code}.svg`);
	if (!reponse.ok) throw new Error(`${code} : HTTP ${reponse.status}`);
	return reponse.text();
}

/**
 * Le contenu du groupe `line`, nettoyé, en JSX.
 *
 * On refuse tout ce qu'on n'a pas prévu — une balise non auto-fermante, un
 * groupe imbriqué, une épaisseur de trait qui n'est pas 2. Un dessin qui passe
 * en silence avec un contour deux fois trop épais est exactement le genre de
 * défaut qu'on ne voit qu'en production.
 */
function convertir(nom: string, svg: string): string {
	const groupe = /<g id="line">([\s\S]*?)<\/g>\s*<\/svg>/.exec(svg);
	if (!groupe?.[1]) throw new Error(`${nom} : pas de groupe « line » isolable`);

	// Un `<g>` NU ne porte rien : ni transformation, ni couleur, ni opacité. On
	// l'aplatit. Un `<g>` avec des attributs, lui, changerait le rendu de ses
	// enfants — celui-là arrête la conversion plutôt que d'être perdu en silence.
	const corps = groupe[1].replace(/<\/?g>/g, '');
	if (/<g[\s>]/.test(corps))
		throw new Error(`${nom} : groupe porteur d'attributs, conversion refusée`);

	const balises = corps.match(/<[a-z]+[^>]*\/>/g) ?? [];
	const restant = corps.replace(/<[a-z]+[^>]*\/>/g, '').trim();
	if (restant.length > 0)
		throw new Error(`${nom} : balise non auto-fermante — ${restant.slice(0, 80)}`);

	return balises
		.map((balise) => {
			const tag = /^<([a-z]+)/.exec(balise)?.[1] ?? '';
			const attributs: string[] = [];

			for (const [, cle, valeur] of balise.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
				if (cle === 'stroke-width' && valeur !== '2') {
					throw new Error(`${nom} : épaisseur ${valeur} inattendue`);
				}
				if (ASPECT.has(cle) || cle === 'id' || cle === 'class') continue;
				// Les données de tracé sont écrites sur plusieurs lignes dans la source.
				attributs.push(`${camel(cle)}="${valeur.replace(/\s+/g, ' ').trim()}"`);
			}

			return `\t\t\t<${tag} ${attributs.join(' ')} />`;
		})
		.join('\n');
}

const ENTETE = `/* ⚠️ FICHIER GÉNÉRÉ — ne pas modifier à la main.
 *
 * Produit par \`bun scripts/telecharger-doodles.ts\`, qui explique d'où viennent
 * ces tracés, sous quelle licence, et pourquoi ils sont copiés dans le dépôt
 * plutôt qu'installés en dépendance. Attribution : \`public/CREDITS.md\`.
 */
import type { CSSProperties, ReactElement } from 'react';
import { cn } from './cn';

export type NomDessin =
${DESSINS.map(([n]) => `\t| '${n}'`).join('\n')};

/**
 * Un dessin au trait, à la couleur de son contexte.
 *
 * L'épaisseur ne se règle PAS en pixels mais en unités de la grille de 72 :
 * un trait de 2 posé sur un dessin de 240px rend 6,7px, ce qui est un feutre.
 * \`epaisseur\` descend à 1,2 pour les grands formats de fond, où le dessin doit
 * rester une trace et jamais un objet.
 */
export function Dessin({
	nom,
	epaisseur = 2,
	className,
	style
}: {
	nom: NomDessin;
	epaisseur?: number;
	className?: string;
	style?: CSSProperties;
}) {
	return (
		<svg
			viewBox="0 0 72 72"
			fill="none"
			stroke="currentColor"
			strokeWidth={epaisseur}
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden
			focusable="false"
			className={cn('block', className)}
			style={style}
		>
			{TRACES[nom]}
		</svg>
	);
}
`;

const dessins = await Promise.all(
	DESSINS.map(async ([nom, code]) => [nom, convertir(nom, await recuperer(code))] as const)
);

const corps = dessins.map(([nom, jsx]) => `\t${nom}: (\n\t\t<>\n${jsx}\n\t\t</>\n\t)`).join(',\n');

const fichier = `${ENTETE}
const TRACES: Record<NomDessin, ReactElement> = {
${corps}
};
`;

writeFileSync('src/ui/dessins.tsx', fichier, 'utf8');
console.log(`${dessins.length} dessins écrits dans src/ui/dessins.tsx`);
