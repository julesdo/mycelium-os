import '@blocknote/mantine/style.css';
import './editeur-blocs.css';
import {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState,
	type ComponentType,
	type DragEvent
} from 'react';
import {
	BlockNoteSchema,
	createHeadingBlockSpec,
	defaultBlockSpecs,
	defaultInlineContentSpecs,
	defaultStyleSpecs
} from '@blocknote/core';
import {
	filterSuggestionItems,
	insertOrUpdateBlockForSlashMenu,
	SideMenuExtension,
	SuggestionMenu
} from '@blocknote/core/extensions';
import { fr } from '@blocknote/core/locales';
import {
	BasicTextStyleButton,
	BlockTypeSelect,
	CreateLinkButton,
	createReactBlockSpec,
	createReactInlineContentSpec,
	DragHandleMenu,
	FormattingToolbar,
	FormattingToolbarController,
	NestBlockButton,
	RemoveBlockItem,
	SideMenu,
	SideMenuController,
	SourceBlockWithPreview,
	SuggestionMenuController,
	TableRowHeaderItem,
	UnnestBlockButton,
	useBlockNoteEditor,
	useComponentsContext,
	useCreateBlockNote,
	useExtensionState,
	type BlockTypeSelectItem,
	type DefaultReactSuggestionItem,
	type SuggestionMenuProps
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import {
	CopyIcon,
	Heading2Icon,
	Heading3Icon,
	ListIcon,
	ListOrderedIcon,
	PilcrowIcon,
	QuoteIcon,
	ScaleIcon
} from 'lucide-react';
import type { Bloc } from '../lib/blog/blocs';
import { ILLUSTRATIONS_DU_CATALOGUE, lireComposant, valeurDuCatalogue, valeursPour, type ValeurDuCatalogue } from '../lib/blog/catalogue';
import { GABARITS, TYPE_GLISSE, type GabaritDeBloc } from '../lib/blog/gabarits';
import { PARAMETRES } from '../lib/verticales/recouvrement/parametres';
import { GardeDeRendu } from './garde-de-rendu';
import { IconeDeGabarit } from './icones-blocs';
import { cn } from './cn';

/**
 * L'ÉDITEUR À BLOCS DU BLOG (20/10/2026), sur BlockNote. Le fondateur : « un éditeur visuel
 * avec des blocs en glisser-déposer, hyper intuitif, à la Notion ». Relevé sur Notion, Craft,
 * GitBook, Ghost et beehiiv :
 *
 * - au survol d'un bloc, une poignée (le glisser, et le menu du bloc) et un « + » ;
 * - « / » ouvre les blocs par groupes, « @ » les valeurs de la loi, avec leur aperçu à côté,
 *   comme la mention de Craft ;
 * - une sélection ouvre la barre de mise en forme, réduite à ce que le MDX sait écrire ;
 * - les encadrés, les étapes et les illustrations sont des blocs qui se montrent rendus ;
 * - le panneau « Blocs » se glisse aussi dans le texte, avec un trait qui dit où il se posera.
 *
 * Le module se charge à l'ouverture de l'éditeur : BlockNote ne pèse sur aucun autre écran.
 * La conversion MDX ⇄ blocs vit dans `lib/blog/blocs.ts`, testée sur tous les articles.
 */

// ─── Ce que l'écran donne à l'éditeur ────────────────────────────────────────

type ComposantMdx = ComponentType<{ components?: Record<string, unknown> }>;

/** Ce qui est choisi dans l'éditeur, et que le panneau sait régler. */
export type ChoixDansLEditeur =
	| { readonly genre: 'illustration'; readonly id: string; readonly source: string }
	| {
			readonly genre: 'valeur';
			readonly nom: string;
			readonly attributs: Readonly<Record<string, string>>;
			readonly remplacer: (valeur: ValeurDuCatalogue) => void;
	  };

/** Ce que l'écran peut demander à l'éditeur : le panneau, le plan, la publication. */
export interface ApiEditeur {
	readonly inserer: (gabarit: GabaritDeBloc) => void;
	readonly insererValeur: (valeur: ValeurDuCatalogue) => void;
	readonly remplacerSource: (id: string, source: string) => void;
	readonly allerAuBloc: (id: string) => void;
}

interface ContexteEditeur {
	readonly composants: Readonly<Record<string, ComponentType<Record<string, unknown>>>>;
	readonly compiler: (source: string) => Promise<ComposantMdx>;
	readonly choisir: (choix: ChoixDansLEditeur | null) => void;
	readonly lectureSeule: boolean;
}

const Contexte = createContext<ContexteEditeur | null>(null);

function useContexte(): ContexteEditeur {
	const contexte = useContext(Contexte);
	if (contexte === null) throw new Error('Un bloc de l’article est rendu hors de son éditeur.');
	return contexte;
}

// ─── L'aperçu d'une source MDX ───────────────────────────────────────────────

const COMPILES = new Map<string, ComposantMdx | Error>();

/** Une source MDX rendue avec les composants du site ; la dernière bonne reste pendant la frappe. */
function ApercuDeSource({ source }: { readonly source: string }) {
	const { compiler, composants } = useContexte();
	const [rendu, setRendu] = useState<{
		readonly source: string;
		readonly resultat: ComposantMdx | Error;
	} | null>(null);

	useEffect(() => {
		let annule = false;
		const deja = COMPILES.get(source);
		const minuterie = setTimeout(
			() => {
				const promesse =
					deja === undefined
						? compiler(source).catch((e: unknown) => (e instanceof Error ? e : new Error(String(e))))
						: Promise.resolve(deja);
				void promesse.then((resultat) => {
					COMPILES.set(source, resultat);
					if (!annule) setRendu({ source, resultat });
				});
			},
			deja === undefined ? 300 : 0
		);
		return () => {
			annule = true;
			clearTimeout(minuterie);
		};
	}, [source, compiler]);

	if (rendu === null) return <div className="bn-mdx-attente">Rendu de l’illustration…</div>;
	if (rendu.resultat instanceof Error) {
		return (
			<div className="bn-mdx-erreur">
				Cette source ne se compile pas : {rendu.resultat.message}
			</div>
		);
	}
	const Contenu = rendu.resultat;
	return (
		<div className={cn('bn-mdx-rendu', rendu.source !== source && 'opacity-60')}>
			<GardeDeRendu
				key={rendu.source}
				repli={<div className="bn-mdx-erreur">Ce composant ne se rend pas : une clé du registre manque peut-être.</div>}
			>
				<Contenu components={composants} />
			</GardeDeRendu>
		</div>
	);
}

// ─── Les blocs sur mesure ────────────────────────────────────────────────────

function texteDuContenu(contenu: unknown): string {
	return Array.isArray(contenu)
		? contenu.map((m: { text?: unknown }) => (typeof m.text === 'string' ? m.text : '')).join('')
		: '';
}

/** Un composant du site, montré rendu ; sa source s'ouvre au clic, ses réglages dans le panneau. */
const BlocMdx = createReactBlockSpec(
	{ type: 'mdx', propSchema: {}, content: 'plain' },
	{
		meta: { hasPreview: true, code: true, hardBreakShortcut: 'enter' },
		render: function RenduMdx({ block, editor, contentRef }) {
			const { choisir } = useContexte();
			const source = texteDuContenu(block.content);
			const composant = lireComposant(source);
			const illustration =
				composant === null ? undefined : ILLUSTRATIONS_DU_CATALOGUE.find((i) => i.nom === composant.nom);
			return (
				<div
					className="bn-mdx"
					onMouseDownCapture={() => choisir({ genre: 'illustration', id: block.id, source })}
				>
					<span className="bn-mdx-etiquette" contentEditable={false}>
						{illustration?.libelle ?? composant?.nom ?? 'MDX'}
					</span>
					<SourceBlockWithPreview
						block={block}
						editor={editor}
						contentRef={contentRef}
						source={source}
						preview={<ApercuDeSource source={source} />}
						sourcePlaceholder="<Composant />"
						emptySourcePlaceholder="Écrire la source MDX"
					/>
				</div>
			);
		}
	}
);

/** L'en-tête d'un encadré : son titre et sa teinte. Ses blocs enfants sont son texte. */
const BlocEncadre = createReactBlockSpec(
	{
		type: 'encadre',
		propSchema: {
			titre: { default: '' },
			variante: { default: '', values: ['', 'retenir', 'attention'] as const }
		},
		content: 'none'
	},
	{
		render: function RenduEncadre({ block, editor }) {
			const { lectureSeule } = useContexte();
			const variante = block.props.variante === 'attention' ? 'attention' : 'retenir';
			return (
				<div className="bn-encadre-tete" contentEditable={false}>
					<input
						className="bn-encadre-titre"
						value={block.props.titre}
						placeholder="Le titre de l’encadré"
						aria-label="Titre de l’encadré"
						readOnly={lectureSeule}
						onChange={(e) => editor.updateBlock(block, { props: { titre: e.target.value } })}
					/>
					<span className="bn-encadre-variantes" role="radiogroup" aria-label="Teinte de l’encadré">
						{(['retenir', 'attention'] as const).map((v) => (
							<button
								key={v}
								type="button"
								role="radio"
								aria-checked={variante === v}
								disabled={lectureSeule}
								data-teinte={v}
								onClick={() =>
									editor.updateBlock(block, {
										props: { variante: v === 'retenir' && block.props.variante === '' ? '' : v }
									})
								}
							>
								{v === 'retenir' ? 'À retenir' : 'Attention'}
							</button>
						))}
					</span>
				</div>
			);
		}
	}
);

/** Le fragment d'un `quand={<>…</>}`, montré sans ses chevrons. */
function quandLisible(quand: string, expression: boolean): string {
	return expression ? quand.replace(/^<>/, '').replace(/<\/>$/, '') : quand;
}

/** Une étape : son numéro (compté en CSS), son titre, son moment. Ses blocs enfants la racontent. */
const BlocEtape = createReactBlockSpec(
	{
		type: 'etape',
		propSchema: {
			titre: { default: '' },
			quand: { default: '' },
			quandEstExpression: { default: false }
		},
		content: 'none'
	},
	{
		render: function RenduEtape({ block, editor }) {
			const { lectureSeule } = useContexte();
			const expression = block.props.quandEstExpression;
			return (
				<div className="bn-etape-tete" contentEditable={false}>
					<span className="bn-etape-numero" aria-hidden />
					<input
						className="bn-etape-titre"
						value={block.props.titre}
						placeholder="Le titre de l’étape"
						aria-label="Titre de l’étape"
						readOnly={lectureSeule}
						onChange={(e) => editor.updateBlock(block, { props: { titre: e.target.value } })}
					/>
					<input
						className={cn('bn-etape-quand', expression && 'font-mono')}
						value={quandLisible(block.props.quand, expression)}
						placeholder="Quand ? (facultatif)"
						aria-label="Le moment de l’étape"
						readOnly={lectureSeule}
						onChange={(e) => {
							const saisi = e.target.value;
							// Une valeur de la loi dans le moment s'écrit en fragment JSX.
							const enFragment = saisi.includes('<');
							editor.updateBlock(block, {
								props: { quand: enFragment ? `<>${saisi}</>` : saisi, quandEstExpression: enFragment }
							});
						}}
					/>
				</div>
			);
		}
	}
);

function attributsLus(json: string): Record<string, string> {
	try {
		const objet = JSON.parse(json) as Record<string, unknown>;
		return Object.fromEntries(
			Object.entries(objet).filter((e): e is [string, string] => typeof e[1] === 'string')
		);
	} catch {
		return {};
	}
}

/** « 2026-09-25 » → « 25/09/2026 ». */
function dateFrancaise(iso: string): string {
	const [annee, mois, jour] = iso.split('-');
	return jour === undefined ? iso : `${jour}/${mois}/${annee}`;
}

function bulleDeValeur(valeur: ValeurDuCatalogue | undefined, nom: string): string {
	if (valeur === undefined) return `<${nom} /> : composant hors du catalogue`;
	const parametre = valeur.cle === undefined ? undefined : PARAMETRES[valeur.cle];
	return parametre === undefined
		? `${valeur.libelle}, lu au registre`
		: `${valeur.libelle}\n${parametre.source}\nRelevé le ${dateFrancaise(parametre.verifieLe)}`;
}

/** Une valeur de la loi au fil du texte : le chiffre du jour, lu au registre, jamais tapé. */
const ValeurEnLigne = createReactInlineContentSpec(
	{
		type: 'valeur',
		propSchema: {
			nom: { default: '' },
			attributs: { default: '{}' },
			gras: { default: false },
			italique: { default: false }
		},
		content: 'none'
	},
	{
		render: function RenduValeur({ inlineContent, updateInlineContent }) {
			const { composants, choisir } = useContexte();
			const { nom, attributs, gras, italique } = inlineContent.props;
			const lus = attributsLus(attributs);
			const Composant = composants[nom];
			const entree = valeurDuCatalogue(nom, lus);
			return (
				<span
					className={cn('bn-valeur', nom === 'Source' && 'bn-valeur-source', gras && 'font-semibold', italique && 'italic')}
					title={bulleDeValeur(entree, nom)}
					onMouseDown={() =>
						choisir({
							genre: 'valeur',
							nom,
							attributs: lus,
							remplacer: (v) =>
								updateInlineContent({
									type: 'valeur',
									props: { nom: v.nom, attributs: JSON.stringify(v.attributs), gras, italique }
								})
						})
					}
				>
					<GardeDeRendu repli={<>valeur introuvable</>}>
						{Composant === undefined ? `<${nom} />` : <Composant {...lus} />}
					</GardeDeRendu>
				</span>
			);
		}
	}
);

const schema = BlockNoteSchema.create({
	blockSpecs: {
		paragraph: defaultBlockSpecs.paragraph,
		heading: createHeadingBlockSpec({ levels: [2, 3], defaultLevel: 2 }),
		bulletListItem: defaultBlockSpecs.bulletListItem,
		numberedListItem: defaultBlockSpecs.numberedListItem,
		quote: defaultBlockSpecs.quote,
		divider: defaultBlockSpecs.divider,
		table: defaultBlockSpecs.table,
		encadre: BlocEncadre(),
		etape: BlocEtape(),
		mdx: BlocMdx()
	},
	inlineContentSpecs: {
		text: defaultInlineContentSpecs.text,
		link: defaultInlineContentSpecs.link,
		valeur: ValeurEnLigne
	},
	styleSpecs: {
		bold: defaultStyleSpecs.bold,
		italic: defaultStyleSpecs.italic,
		code: defaultStyleSpecs.code
	}
});

type Editeur = typeof schema.BlockNoteEditor;
type BlocPartiel = typeof schema.PartialBlock;
type BlocDeLEditeur = typeof schema.Block;

/** La forme de `lib/blog/blocs.ts` est celle de BlockNote : seul le type change de nom. */
const versEditeur = (blocs: readonly Bloc[]) => blocs as unknown as BlocPartiel[];
const depuisEditeur = (blocs: readonly BlocDeLEditeur[]) => blocs as unknown as Bloc[];

// ─── Insérer ─────────────────────────────────────────────────────────────────

/** Le curseur dans le premier endroit où l'on écrit : le bloc, ou son premier enfant. */
function placerLeCurseur(editeur: Editeur, bloc: BlocDeLEditeur | undefined) {
	if (bloc === undefined) return;
	const enfant = bloc.children[0];
	try {
		if (Array.isArray(bloc.content)) editeur.setTextCursorPosition(bloc, 'end');
		else if (enfant !== undefined && Array.isArray(enfant.content))
			editeur.setTextCursorPosition(enfant, 'end');
	} catch {
		// Un bloc sans texte (un séparateur) ne prend pas le curseur : rien à faire.
	}
}

function insererDepuisLeMenu(editeur: Editeur, gabarit: GabaritDeBloc) {
	const [premier, ...reste] = versEditeur(gabarit.blocs());
	if (premier === undefined) return;
	const pose = insertOrUpdateBlockForSlashMenu(editeur, premier);
	if (reste.length > 0) editeur.insertBlocks(reste, pose, 'after');
	placerLeCurseur(editeur, editeur.getBlock(pose.id));
}

/** Où se pose ce qu'on glisse depuis le panneau : avant ou après le bloc sous le pointeur. */
interface Cible {
	readonly id: string;
	readonly position: 'before' | 'after';
	/** La ligne du trait, en pixels depuis le haut du cadre. */
	readonly ligne: number;
	readonly gauche: number;
	readonly largeur: number;
}

function cibleSous(cadre: HTMLElement, x: number, y: number): Cible | null {
	const sous = document.elementFromPoint(x, y);
	let bloc = sous instanceof Element ? sous.closest<HTMLElement>('.bn-block-outer') : null;
	if (bloc === null || !cadre.contains(bloc)) {
		// Hors d'un bloc : le bloc de premier niveau le plus proche en hauteur.
		const premiers = [...cadre.querySelectorAll<HTMLElement>('.bn-editor > .bn-block-group > .bn-block-outer')];
		bloc =
			premiers.reduce<{ el: HTMLElement; d: number } | null>((proche, el) => {
				const r = el.getBoundingClientRect();
				const d = y < r.top ? r.top - y : y > r.bottom ? y - r.bottom : 0;
				return proche === null || d < proche.d ? { el, d } : proche;
			}, null)?.el ?? null;
	}
	const id = bloc?.dataset.id;
	if (bloc === null || id === undefined) return null;
	const r = bloc.getBoundingClientRect();
	const c = cadre.getBoundingClientRect();
	const position = y < r.top + r.height / 2 ? 'before' : 'after';
	return {
		id,
		position,
		ligne: (position === 'before' ? r.top : r.bottom) - c.top,
		gauche: r.left - c.left,
		largeur: r.width
	};
}

// ─── Les menus ───────────────────────────────────────────────────────────────

const ORDRE_DES_GROUPES = ['Texte', 'La loi', 'Listes', 'Mise en page', 'Illustrations', 'Charte'];

function itemsDuMenu(editeur: Editeur): DefaultReactSuggestionItem[] {
	const items: (DefaultReactSuggestionItem & { readonly rang: number })[] = GABARITS.map((g) => ({
		title: g.libelle,
		subtext: g.description,
		group: g.groupe,
		aliases: [...g.motsCles],
		icon: <IconeDeGabarit icone={g.icone} />,
		onItemClick: () => insererDepuisLeMenu(editeur, g),
		rang: ORDRE_DES_GROUPES.indexOf(g.groupe)
	}));
	items.push({
		title: 'Valeur de la loi',
		subtext: 'Un taux, un délai, un montant ou une source, lus au registre.',
		group: 'La loi',
		aliases: ['valeur', 'loi', 'taux', 'delai', 'source', 'registre', 'montant'],
		icon: <ScaleIcon aria-hidden />,
		onItemClick: () => editeur.getExtension(SuggestionMenu)?.openSuggestionMenu('@'),
		rang: ORDRE_DES_GROUPES.indexOf('La loi')
	});
	return items
		.sort((a, b) => a.rang - b.rang)
		.map((item) => {
			const { rang, ...reste } = item;
			void rang;
			return reste;
		});
}

type ItemDeValeur = DefaultReactSuggestionItem & { readonly valeur: ValeurDuCatalogue };

/** Le menu « @ » : les valeurs à gauche, l'aperçu de la valeur choisie à droite (Craft). */
function MenuDesValeurs({ items, selectedIndex, onItemClick }: SuggestionMenuProps<ItemDeValeur>) {
	const { composants } = useContexte();
	const liste = useRef<HTMLDivElement | null>(null);
	const choisie = selectedIndex === undefined ? items[0] : items[selectedIndex];

	useEffect(() => {
		liste.current
			?.querySelector<HTMLElement>(`[data-rang="${selectedIndex ?? 0}"]`)
			?.scrollIntoView({ block: 'nearest' });
	}, [selectedIndex]);

	if (items.length === 0) {
		return <div className="bn-menu-valeurs bn-menu-valeurs-vide">Aucune valeur ne répond.</div>;
	}
	const Composant = choisie === undefined ? undefined : composants[choisie.valeur.nom];
	const parametre = choisie?.valeur.cle === undefined ? undefined : PARAMETRES[choisie.valeur.cle];
	return (
		<div className="bn-menu-valeurs" role="listbox" aria-label="Valeurs de la loi">
			<div className="bn-menu-valeurs-liste" ref={liste}>
				{items.map((item, rang) => {
					const enTete =
						items[rang - 1]?.valeur.groupe !== item.valeur.groupe ? item.valeur.groupe : null;
					return (
						<div key={item.valeur.id}>
							{enTete === null ? null : <div className="bn-menu-valeurs-groupe">{enTete}</div>}
							<button
								type="button"
								role="option"
								aria-selected={rang === (selectedIndex ?? 0)}
								data-rang={rang}
								className="bn-menu-valeurs-item"
								onClick={() => onItemClick?.(item)}
							>
								{item.title}
							</button>
						</div>
					);
				})}
			</div>
			{choisie === undefined ? null : (
				<div className="bn-menu-valeurs-apercu" aria-live="polite">
					<span className="bn-menu-valeurs-chiffre">
						<GardeDeRendu key={choisie.valeur.id} repli={<>valeur introuvable</>}>
							{Composant === undefined ? null : <Composant {...choisie.valeur.attributs} />}
						</GardeDeRendu>
					</span>
					<span className="bn-menu-valeurs-libelle">{choisie.valeur.libelle}</span>
					{parametre === undefined ? null : (
						<>
							<span className="bn-menu-valeurs-source">{parametre.source}</span>
							<span className="bn-menu-valeurs-date">
								Relevé le {dateFrancaise(parametre.verifieLe)}
							</span>
						</>
					)}
				</div>
			)}
		</div>
	);
}

/** « Dupliquer », dans le menu de la poignée. */
function DupliquerLeBloc() {
	const Composants = useComponentsContext();
	const editeur = useBlockNoteEditor<typeof schema.blockSchema, typeof schema.inlineContentSchema, typeof schema.styleSchema>();
	const bloc = useExtensionState(SideMenuExtension, { editor: editeur, selector: (etat) => etat?.block });
	if (bloc === undefined || Composants === undefined) return null;
	return (
		<Composants.Generic.Menu.Item
			className="bn-menu-item"
			icon={<CopyIcon aria-hidden className="size-4" />}
			onClick={() => {
				const copie = JSON.parse(JSON.stringify(bloc)) as BlocPartiel & { id?: string };
				const sansIds = (b: BlocPartiel & { id?: string; children?: BlocPartiel[] }): BlocPartiel => ({
					...b,
					id: undefined,
					children: (b.children ?? []).map(sansIds)
				});
				editeur.insertBlocks([sansIds(copie)], bloc, 'after');
			}}
		>
			Dupliquer
		</Composants.Generic.Menu.Item>
	);
}

function MenuDuBloc() {
	return (
		<DragHandleMenu>
			<DupliquerLeBloc />
			<RemoveBlockItem>Supprimer</RemoveBlockItem>
			<TableRowHeaderItem>Ligne d’en-tête</TableRowHeaderItem>
		</DragHandleMenu>
	);
}

const icone = (Icone: ComponentType<{ className?: string }>): BlockTypeSelectItem['icon'] =>
	function IconeDeType() {
		return <Icone className="size-4" />;
	};

const TYPES_DE_BLOC: BlockTypeSelectItem[] = [
	{ name: 'Paragraphe', type: 'paragraph', icon: icone(PilcrowIcon) },
	{ name: 'Intertitre', type: 'heading', props: { level: 2 }, icon: icone(Heading2Icon) },
	{ name: 'Sous-intertitre', type: 'heading', props: { level: 3 }, icon: icone(Heading3Icon) },
	{ name: 'Liste à puces', type: 'bulletListItem', icon: icone(ListIcon) },
	{ name: 'Liste numérotée', type: 'numberedListItem', icon: icone(ListOrderedIcon) },
	{ name: 'Citation', type: 'quote', icon: icone(QuoteIcon) }
];

const THEME = {
	colors: {
		editor: { text: 'var(--color-encre-site)', background: 'transparent' },
		menu: { text: 'var(--color-encre-site)', background: 'var(--color-papier)' },
		tooltip: { text: 'var(--color-creme)', background: 'var(--color-encre-site)' },
		hovered: { text: 'var(--color-encre-site)', background: 'var(--color-creme-profonde)' },
		selected: { text: 'var(--color-creme)', background: 'var(--color-encre-site)' },
		disabled: { text: 'var(--color-encre-site-claire)', background: 'var(--color-creme)' },
		shadow: 'oklch(0.27 0.05 266 / 0.12)',
		border: 'var(--color-filet-creme)',
		sideMenu: 'var(--color-encre-site-claire)'
	},
	borderRadius: 12,
	fontFamily: 'inherit'
};

// ─── L'éditeur ───────────────────────────────────────────────────────────────

export interface ProprietesEditeurBlocs {
	readonly blocsInitiaux: readonly Bloc[];
	readonly onChange: (blocs: readonly Bloc[]) => void;
	readonly composants: Readonly<Record<string, ComponentType<Record<string, unknown>>>>;
	readonly compiler: (source: string) => Promise<ComposantMdx>;
	readonly lectureSeule: boolean;
	readonly onChoix: (choix: ChoixDansLEditeur | null) => void;
	readonly refApi: (api: ApiEditeur | null) => void;
}

export default function EditeurBlocs({
	blocsInitiaux,
	onChange,
	composants,
	compiler,
	lectureSeule,
	onChoix,
	refApi
}: ProprietesEditeurBlocs) {
	const editeur = useCreateBlockNote({
		schema,
		dictionary: {
			...fr,
			placeholders: {
				...fr.placeholders,
				default: 'Écrivez, ou tapez « / » pour un bloc et « @ » pour une valeur de la loi',
				heading: 'Intertitre',
				bulletListItem: 'Un point',
				numberedListItem: 'Un point'
			}
		},
		initialContent: blocsInitiaux.length === 0 ? undefined : versEditeur(blocsInitiaux),
		tables: { headers: true }
	});
	const cadre = useRef<HTMLDivElement | null>(null);
	const [cible, setCible] = useState<Cible | null>(null);

	useEffect(() => {
		refApi({
			inserer: (gabarit) => {
				const blocs = versEditeur(gabarit.blocs());
				let reference: BlocDeLEditeur | undefined;
				try {
					reference = editeur.getTextCursorPosition().block;
				} catch {
					reference = editeur.document.at(-1);
				}
				if (reference === undefined) return;
				const videAremplacer =
					reference.type === 'paragraph' && Array.isArray(reference.content) && reference.content.length === 0;
				const poses = videAremplacer
					? editeur.replaceBlocks([reference], blocs).insertedBlocks
					: editeur.insertBlocks(blocs, reference, 'after');
				editeur.focus();
				placerLeCurseur(editeur, poses[0]);
			},
			insererValeur: (v) => {
				editeur.focus();
				editeur.insertInlineContent([
					{ type: 'valeur', props: { nom: v.nom, attributs: JSON.stringify(v.attributs), gras: false, italique: false } },
					' '
				]);
			},
			remplacerSource: (id, source) => {
				const bloc = editeur.getBlock(id);
				if (bloc?.type === 'mdx') editeur.updateBlock(bloc, { content: source });
			},
			allerAuBloc: (id) => {
				const bloc = editeur.getBlock(id);
				if (bloc === undefined) return;
				cadre.current
					?.querySelector(`[data-id="${id}"]`)
					?.scrollIntoView({ behavior: 'smooth', block: 'center' });
				placerLeCurseur(editeur, bloc);
			}
		});
		return () => refApi(null);
	}, [editeur, refApi]);

	function surSurvol(evenement: DragEvent<HTMLDivElement>) {
		if (!evenement.dataTransfer.types.includes(TYPE_GLISSE) || cadre.current === null) return;
		evenement.preventDefault();
		evenement.stopPropagation();
		evenement.dataTransfer.dropEffect = 'copy';
		setCible(cibleSous(cadre.current, evenement.clientX, evenement.clientY));
	}

	function surDepot(evenement: DragEvent<HTMLDivElement>) {
		if (!evenement.dataTransfer.types.includes(TYPE_GLISSE) || cadre.current === null) return;
		evenement.preventDefault();
		evenement.stopPropagation();
		const ou = cibleSous(cadre.current, evenement.clientX, evenement.clientY);
		setCible(null);
		const gabarit = GABARITS.find((g) => g.id === evenement.dataTransfer.getData(TYPE_GLISSE));
		if (gabarit === undefined || ou === null || lectureSeule) return;
		const poses = editeur.insertBlocks(versEditeur(gabarit.blocs()), ou.id, ou.position);
		editeur.focus();
		placerLeCurseur(editeur, poses[0]);
	}

	return (
		<Contexte.Provider value={{ composants, compiler, choisir: onChoix, lectureSeule }}>
			<div
				ref={cadre}
				className="bn-cms relative"
				onDragOverCapture={surSurvol}
				onDropCapture={surDepot}
				onDragLeave={(e) => {
					if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCible(null);
				}}
			>
				<BlockNoteView
					editor={editeur}
					theme={THEME}
					editable={!lectureSeule}
					slashMenu={false}
					sideMenu={false}
					formattingToolbar={false}
					emojiPicker={false}
					onChange={() => onChange(depuisEditeur(editeur.document))}
				>
					<SuggestionMenuController
						triggerCharacter="/"
						getItems={async (requete) => filterSuggestionItems(itemsDuMenu(editeur), requete)}
					/>
					<SuggestionMenuController<(requete: string) => Promise<ItemDeValeur[]>>
						triggerCharacter="@"
						getItems={async (requete): Promise<ItemDeValeur[]> =>
							valeursPour(requete)
								.slice(0, 80)
								.map((valeur) => ({
									title: valeur.libelle,
									group: valeur.groupe,
									valeur,
									onItemClick: () =>
										editeur.insertInlineContent([
											{
												type: 'valeur',
												props: {
													nom: valeur.nom,
													attributs: JSON.stringify(valeur.attributs),
													gras: false,
													italique: false
												}
											},
											' '
										])
								}))
						}
						suggestionMenuComponent={MenuDesValeurs}
						onItemClick={(item) => item.onItemClick()}
					/>
					<SideMenuController sideMenu={(props) => <SideMenu {...props} dragHandleMenu={MenuDuBloc} />} />
					<FormattingToolbarController
						formattingToolbar={() => (
							<FormattingToolbar>
								<BlockTypeSelect key="type" items={TYPES_DE_BLOC} />
								<BasicTextStyleButton key="gras" basicTextStyle="bold" />
								<BasicTextStyleButton key="italique" basicTextStyle="italic" />
								<CreateLinkButton key="lien" />
								<NestBlockButton key="decaler" />
								<UnnestBlockButton key="recaler" />
							</FormattingToolbar>
						)}
					/>
				</BlockNoteView>
				{cible === null ? null : (
					<div
						aria-hidden
						className="bn-trait-de-depot"
						style={{ top: cible.ligne, left: cible.gauche, width: cible.largeur }}
					/>
				)}
			</div>
		</Contexte.Provider>
	);
}
