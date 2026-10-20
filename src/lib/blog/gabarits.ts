import { blocMdxDepuis, type Bloc } from './blocs';
import { ILLUSTRATIONS_DU_CATALOGUE, type IconeDIllustration } from './catalogue';

/**
 * LES GABARITS DE BLOCS (20/10/2026) : ce que le menu « / », le bouton « + » et le panneau
 * « Blocs » posent dans un article. Une seule liste pour les trois : un bloc qu'on trouve dans
 * le panneau se trouve aussi au clavier, sous le même nom.
 */

/** Le type de ce qu'on glisse du panneau « Blocs » vers l'article : l'identifiant d'un gabarit. */
export const TYPE_GLISSE = 'application/x-letikette-gabarit';

export type GroupeDeGabarit = 'Texte' | 'Listes' | 'Mise en page' | 'Illustrations' | 'Charte';

export type IconeDeGabarit =
	| 'paragraphe'
	| 'intertitre'
	| 'sous-intertitre'
	| 'citation'
	| 'puces'
	| 'numeros'
	| 'encadre'
	| 'attention'
	| 'etapes'
	| 'separateur'
	| 'tableau'
	| 'fin'
	| IconeDIllustration;

export interface GabaritDeBloc {
	readonly id: string;
	readonly libelle: string;
	readonly description: string;
	readonly groupe: GroupeDeGabarit;
	readonly icone: IconeDeGabarit;
	/** D'autres mots qui le trouvent au clavier. */
	readonly motsCles: readonly string[];
	readonly blocs: () => Bloc[];
}

const vide = (): Bloc => ({ type: 'paragraph', content: [], children: [] });
const texte = (t: string) => [{ type: 'text' as const, text: t, styles: {} }];

export const GABARITS: readonly GabaritDeBloc[] = [
	{
		id: 'paragraphe',
		libelle: 'Paragraphe',
		description: 'Du texte, trois ou quatre lignes.',
		groupe: 'Texte',
		icone: 'paragraphe',
		motsCles: ['texte', 'p'],
		blocs: () => [vide()]
	},
	{
		id: 'intertitre',
		libelle: 'Intertitre',
		description: 'Une question que se pose le lecteur.',
		groupe: 'Texte',
		icone: 'intertitre',
		motsCles: ['titre', 'h2', 'section'],
		blocs: () => [{ type: 'heading', props: { level: 2 }, content: [], children: [] }]
	},
	{
		id: 'sous-intertitre',
		libelle: 'Sous-intertitre',
		description: 'Un point à l’intérieur d’une section.',
		groupe: 'Texte',
		icone: 'sous-intertitre',
		motsCles: ['titre', 'h3'],
		blocs: () => [{ type: 'heading', props: { level: 3 }, content: [], children: [] }]
	},
	{
		id: 'citation',
		libelle: 'Citation',
		description: 'Un courrier d’exemple, une phrase de la loi.',
		groupe: 'Texte',
		icone: 'citation',
		motsCles: ['quote', 'courrier'],
		blocs: () => [{ type: 'quote', content: [], children: [] }]
	},
	{
		id: 'puces',
		libelle: 'Liste à puces',
		description: 'Des points sans ordre.',
		groupe: 'Listes',
		icone: 'puces',
		motsCles: ['liste', 'ul', 'puce'],
		blocs: () => [{ type: 'bulletListItem', content: [], children: [] }]
	},
	{
		id: 'numeros',
		libelle: 'Liste numérotée',
		description: 'Des points dans l’ordre.',
		groupe: 'Listes',
		icone: 'numeros',
		motsCles: ['liste', 'ol', 'ordre'],
		blocs: () => [{ type: 'numberedListItem', content: [], children: [] }]
	},
	{
		id: 'encadre',
		libelle: 'Encadré « À retenir »',
		description: 'Ce qu’il faut garder en tête, en bleu.',
		groupe: 'Mise en page',
		icone: 'encadre',
		motsCles: ['encadre', 'retenir', 'callout', 'resume'],
		blocs: () => [
			{
				type: 'encadre',
				props: { titre: 'À retenir', variante: '' },
				children: [{ type: 'bulletListItem', content: [], children: [] }]
			}
		]
	},
	{
		id: 'attention',
		libelle: 'Encadré « Attention »',
		description: 'Une idée reçue qui coûte cher, en rose.',
		groupe: 'Mise en page',
		icone: 'attention',
		motsCles: ['encadre', 'piege', 'idee recue', 'callout'],
		blocs: () => [
			{
				type: 'encadre',
				props: { titre: 'Le piège', variante: 'attention' },
				children: [vide()]
			}
		]
	},
	{
		id: 'etapes',
		libelle: 'Étapes',
		description: 'Une procédure, étape par étape, numérotée seule.',
		groupe: 'Mise en page',
		icone: 'etapes',
		motsCles: ['etape', 'procedure', 'chronologie', 'frise'],
		blocs: () => [
			{
				type: 'etape',
				props: { titre: 'La première étape', quand: '', quandEstExpression: false },
				children: [vide()]
			},
			{
				type: 'etape',
				props: { titre: 'La deuxième étape', quand: '', quandEstExpression: false },
				children: [vide()]
			}
		]
	},
	{
		id: 'separateur',
		libelle: 'Séparateur',
		description: 'Un filet entre deux parties.',
		groupe: 'Mise en page',
		icone: 'separateur',
		motsCles: ['filet', 'hr', 'ligne'],
		blocs: () => [{ type: 'divider', children: [] }]
	},
	{
		id: 'tableau',
		libelle: 'Tableau',
		description: 'Des lignes et des colonnes, la première en en-tête.',
		groupe: 'Mise en page',
		icone: 'tableau',
		motsCles: ['table', 'grille', 'colonnes'],
		blocs: () => [
			{
				type: 'table',
				content: {
					type: 'tableContent',
					headerRows: 1,
					rows: [
						{ cells: [texte('Colonne'), texte('Colonne')] },
						{ cells: [[], []] },
						{ cells: [[], []] }
					]
				},
				children: []
			}
		]
	},
	...ILLUSTRATIONS_DU_CATALOGUE.map(
		(illustration): GabaritDeBloc => ({
			id: `illustration:${illustration.nom}`,
			libelle: illustration.libelle,
			description: illustration.description,
			groupe: 'Illustrations',
			icone: illustration.icone,
			motsCles: ['illustration', 'schema', illustration.nom.toLowerCase()],
			blocs: () => [blocMdxDepuis(illustration.modele)]
		})
	),
	{
		id: 'fin',
		libelle: 'Fin d’article',
		description: 'La section « Ce que fait Letikette », puis la mention.',
		groupe: 'Charte',
		icone: 'fin',
		motsCles: ['conclusion', 'mention', 'letikette', 'fin'],
		blocs: () => [
			{ type: 'heading', props: { level: 2 }, content: texte('Ce que fait Letikette'), children: [] },
			{ type: 'paragraph', content: texte('Deux phrases, sans forcer.'), children: [] },
			{ type: 'divider', children: [] },
			{
				type: 'paragraph',
				content: texte(
					'Cet article présente des règles générales. Il ne constitue pas un conseil juridique : la décision d’agir, et la manière de le faire, restent les vôtres.'
				),
				children: []
			}
		]
	}
];

export const GROUPES_DE_GABARITS: readonly GroupeDeGabarit[] = [
	'Texte',
	'Listes',
	'Mise en page',
	'Illustrations',
	'Charte'
];

/** Le corps d'un article neuf : une ouverture, un intertitre, et la fin que la charte demande. */
export function blocsDUnArticleNeuf(): Bloc[] {
	const fin = GABARITS.find((g) => g.id === 'fin')?.blocs() ?? [];
	return [
		{
			type: 'paragraph',
			content: texte('Le premier paragraphe pose la question que se pose le gérant.'),
			children: []
		},
		{ type: 'heading', props: { level: 2 }, content: texte('Un intertitre'), children: [] },
		{ type: 'paragraph', content: texte('Trois ou quatre lignes par paragraphe.'), children: [] },
		...fin
	];
}
