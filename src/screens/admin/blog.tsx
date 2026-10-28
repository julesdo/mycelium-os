import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
	useSyncExternalStore,
	type ComponentType,
	type ReactNode
} from 'react';
import { ExternalLinkIcon, PlusIcon, RefreshCwIcon, SendIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	BoutonTexte,
	CarteLien,
	ListeDeCartes,
	EnTeteDeGroupe,
	FeuillePleinEcran,
	Lien,
	PageEcran,
	type Lecture
} from '../../ui';
import { BlocDeFiche } from '../../ui/admin';
import { TableauCrm, type ColonneTableau } from '../../ui/admin-vues';
import {
	CadreDApercu,
	PanneauDeRelecture,
	PastilleDArticle,
	ZoneDeCorps,
	type StatutArticle
} from '../../ui/cms';
import {
	BarreDEdition,
	CarteDuChoix,
	MiseEnPageDeLEditeur,
	PaletteDeBlocs,
	PanneauDEdition,
	PapierDArticle,
	PastilleDuChoix,
	PlanDeLArticle,
	RecapitulatifDePublication,
	ReglagesDeLArticle,
	ReglagesDeValeur,
	ReglagesDIllustration,
	TeteDArticle,
	type ModeDEdition,
	type OngletDuPanneau,
	type TitreDuPlan
} from '../../ui/cms-editeur';
import { GardeDeRendu } from '../../ui/garde-de-rendu';
import type { ApiEditeur, ChoixDansLEditeur } from '../../ui/editeur-blocs';
import {
	CATEGORIES,
	ILLUSTRATIONS,
	PILIERS,
	type CategorieBlog,
	type Illustration
} from '../../marketing/motifs-blog';
import { COMPOSANTS_MDX } from '../../marketing/mdx';
import { CouvertureIllustree } from '../../marketing/blog-couvertures';
import { AUTEUR_PAR_DEFAUT, schemaEnteteArticle, type EnteteArticle } from '../../lib/blog/schema';
import {
	adresseDepuisTitre,
	ecrireArticle,
	erreursLisibles,
	lireArticle,
	relireArticle,
	type ArticleConnu
} from '../../lib/blog/source';
import {
	blocsVersMdx,
	mdxVersBlocs,
	texteBrut,
	type Bloc,
	type LectureDuCorps
} from '../../lib/blog/blocs';
import {
	ILLUSTRATIONS_DU_CATALOGUE,
	lireComposant,
	valeurDuCatalogue,
	valeursPour,
	VALEURS_DE_LA_LOI,
	type ValeurDuCatalogue
} from '../../lib/blog/catalogue';
import { GABARITS, blocsDUnArticleNeuf } from '../../lib/blog/gabarits';
import { compilerMdx, useApercuMdx } from '../../app/apercu-mdx';
import { EXTRAITS } from '../../lib/blog/extraits';

/**
 * LE CMS DU BLOG (19/10/2026). Le fondateur : « brancher sur l'admin un système qui
 * permette de pousser le contenu statique des articles, pouvoir les modifier, un vrai
 * headless CMS GitHub via Convex ».
 *
 * Les articles restent les fichiers `content/blog/*.mdx` du dépôt. La liste les lit sur
 * GitHub ; l'éditeur les réécrit, relit la charte, montre l'aperçu fidèle, et publie : un
 * commit sur la branche que Vercel déploie. Un article daté du futur attend son jour.
 *
 * L'ÉDITEUR EST À BLOCS DEPUIS LE 20/10/2026, à la Notion : la page de l'article telle que le
 * site la montrera, un panneau de blocs qu'on glisse dedans, « / » et « @ » au clavier. Le MDX
 * reste la base, et un mode le montre tel quel.
 */

// ─── La liste ────────────────────────────────────────────────────────────────

export interface ArticleDeLaListe {
	readonly adresse: string;
	readonly sha: string;
	readonly titre: string | null;
	readonly description: string | null;
	readonly date: string | null;
	readonly categorie: string | null;
	readonly pilier: string | null;
	readonly brouillon: boolean;
	readonly erreurs: readonly string[];
}

export function statutDe(
	article: Pick<ArticleDeLaListe, 'date' | 'brouillon' | 'erreurs'>,
	aujourdHui: string
): StatutArticle {
	if (article.erreurs.length > 0 || article.date === null) return 'casse';
	if (article.brouillon) return 'brouillon';
	return article.date > aujourdHui ? 'programme' : 'publie';
}

const LIBELLES_STATUT_LISTE: Readonly<Record<StatutArticle, string>> = {
	publie: 'Publié',
	programme: 'Programmé',
	brouillon: 'Brouillon',
	casse: 'En-tête invalide'
};

function dateLisible(iso: string | null): string {
	if (iso === null) return '';
	const [a, m, j] = iso.split('-');
	return `${j}/${m}/${a}`;
}

export function EcranBlog({
	lecture,
	depot,
	aujourdHui,
	onRecharger
}: {
	readonly lecture: Lecture<readonly ArticleDeLaListe[]> | { readonly etat: 'dormant' };
	readonly depot: string | null;
	readonly aujourdHui: string;
	readonly onRecharger: () => void;
}) {
	const entete = {
		genre: 'onglet' as const,
		titre: 'Blog',
		actions: (
			<span className="ml-auto flex items-center gap-2">
				<BoutonTexte onClick={onRecharger}>
					<RefreshCwIcon aria-hidden />
					Recharger
				</BoutonTexte>
				<BoutonPrincipal as={Lien} to="/admin/blog/nouveau">
					<PlusIcon aria-hidden />
					Nouvel article
				</BoutonPrincipal>
			</span>
		)
	};

	if (lecture.etat === 'dormant') {
		return (
			<PageEcran entete={{ genre: 'onglet', titre: 'Blog' }}>
				<BlocDeFiche titre="Brancher GitHub">
					<div className="flex flex-col gap-2 px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						<p>
							Le CMS lit et publie les articles dans le dépôt GitHub du site. Il lui faut un jeton à
							portée fine, limité à ce dépôt, avec le droit « Contents : Read and write ».
						</p>
						<p>
							Créez-le sur GitHub (Settings, Developer settings, Fine-grained tokens), puis posez-le
							dans Convex sous le nom GITHUB_CMS_TOKEN. Le jeton ne quitte jamais le serveur.
						</p>
					</div>
				</BlocDeFiche>
			</PageEcran>
		);
	}
	if (lecture.etat !== 'pret') return <PageEcran entete={entete} etat={lecture.etat} />;

	const articles = lecture.valeur.map((a) => ({ ...a, id: a.adresse }));
	const colonnes: readonly ColonneTableau<(typeof articles)[number]>[] = [
		{
			cle: 'titre',
			libelle: 'Article',
			rendu: (a) => (
				<span className="flex flex-col">
					<span className="font-medium">{a.titre ?? a.adresse}</span>
					<span className="text-cladd-3xs text-cladd-fg-soft">/blog/{a.adresse}</span>
				</span>
			),
			tri: (x, y) => (x.titre ?? '').localeCompare(y.titre ?? '')
		},
		{
			cle: 'statut',
			libelle: 'État',
			rendu: (a) => <PastilleDArticle statut={statutDe(a, aujourdHui)} />,
			tri: (x, y) => statutDe(x, aujourdHui).localeCompare(statutDe(y, aujourdHui))
		},
		{
			cle: 'date',
			libelle: 'Date',
			rendu: (a) => <span className="tabular-nums">{dateLisible(a.date)}</span>,
			tri: (x, y) => (x.date ?? '').localeCompare(y.date ?? '')
		},
		{ cle: 'pilier', libelle: 'Pilier', rendu: (a) => a.pilier ?? '' },
		{ cle: 'categorie', libelle: 'Catégorie', rendu: (a) => a.categorie ?? '' }
	];
	const programmes = articles.filter((a) => statutDe(a, aujourdHui) === 'programme').length;

	return (
		<PageEcran entete={entete} largeur="large">
			<div className="flex flex-col gap-cladd-xs">
				<EnTeteDeGroupe
					libelle={
						programmes === 0 ? 'Les articles' : `Les articles, dont ${programmes} à paraître`
					}
					nombre={articles.length}
				/>
				{/* Au téléphone, des cartes ; au bureau, le tableau triable. */}
				<div className="lg:hidden">
					<ListeDeCartes>
						{articles.map((a) => (
							<CarteLien
								key={a.adresse}
								vers="/admin/blog/$adresse"
								parametres={{ adresse: a.adresse }}
								titre={a.titre ?? a.adresse}
								montant={dateLisible(a.date)}
								ligne={[LIBELLES_STATUT_LISTE[statutDe(a, aujourdHui)], a.pilier]
									.filter(Boolean)
									.join(' · ')}
							/>
						))}
					</ListeDeCartes>
				</div>
				<div className="hidden lg:block">
					<TableauCrm
						libelle="Les articles du blog"
						colonnes={colonnes}
						lignes={articles}
						triInitial={{ cle: 'date', sens: 'desc' }}
						lien={(a) => ({ vers: '/admin/blog/$adresse', parametres: { adresse: a.adresse } })}
					/>
				</div>
				{depot === null ? null : (
					<p className="px-1 text-cladd-3xs text-cladd-fg-soft">Lu sur GitHub, dépôt {depot}.</p>
				)}
			</div>
		</PageEcran>
	);
}

// ─── L'éditeur ───────────────────────────────────────────────────────────────

/** BlockNote ne se charge qu'à l'ouverture d'un article, et jamais côté serveur. */
const EditeurBlocs = lazy(() => import('../../ui/editeur-blocs'));
const abonnementNul = () => () => undefined;

const CORPS_NOUVEAU = blocsVersMdx(blocsDUnArticleNeuf());

/** Les composants du site, sous la forme que l'éditeur rend. */
const COMPOSANTS = COMPOSANTS_MDX as unknown as Readonly<
	Record<string, ComponentType<Record<string, unknown>>>
>;

interface Saisie {
	titre: string;
	description: string;
	date: string;
	categorie: string;
	pilier: string;
	illustration: string;
	enBref: string[];
	/** L'étiquette de l'accueil du site : l'éditeur ne la montre pas, il la garde telle quelle. */
	etiquette?: EnteteArticle['etiquette'];
	brouillon: boolean;
	auteur: string;
	corps: string;
}

function saisieDepuis(source: string | null, aujourdHui: string): Saisie {
	const lu = source === null ? null : lireArticle(source);
	if (lu === null || 'erreurs' in lu) {
		return {
			titre: '',
			description: '',
			date: aujourdHui,
			categorie: CATEGORIES[0],
			pilier: '',
			illustration: 'facture',
			enBref: [],
			brouillon: true,
			auteur: AUTEUR_PAR_DEFAUT,
			corps: lu === null ? CORPS_NOUVEAU : (source ?? '')
		};
	}
	return {
		titre: lu.entete.titre,
		description: lu.entete.description,
		date: lu.entete.date,
		categorie: lu.entete.categorie,
		pilier: lu.entete.pilier ?? '',
		illustration: lu.entete.illustration,
		enBref: [...(lu.entete.enBref ?? [])],
		...(lu.entete.etiquette === undefined ? {} : { etiquette: lu.entete.etiquette }),
		brouillon: lu.entete.brouillon,
		auteur: lu.entete.auteur,
		corps: lu.corps
	};
}

/** La saisie validée par le schéma du build, ou ses erreurs en français. */
function valider(saisie: Saisie) {
	const resultat = schemaEnteteArticle.safeParse({
		titre: saisie.titre.trim(),
		description: saisie.description.trim(),
		date: saisie.date,
		categorie: saisie.categorie,
		...(saisie.pilier === '' ? {} : { pilier: saisie.pilier }),
		illustration: saisie.illustration,
		...(saisie.enBref.length === 0 ? {} : { enBref: saisie.enBref.map((p) => p.trim()) }),
		...(saisie.etiquette === undefined ? {} : { etiquette: saisie.etiquette }),
		brouillon: saisie.brouillon,
		auteur: saisie.auteur
	});
	return resultat.success
		? { entete: resultat.data, erreurs: [] as string[] }
		: { entete: null, erreurs: erreursLisibles(resultat.error) };
}

/** Chaque bloc reçoit son identifiant avant l'éditeur : le plan et le panneau s'en servent. */
function avecIdentifiants(blocs: readonly Bloc[]): Bloc[] {
	return blocs.map((b) => ({
		...b,
		id: b.id ?? crypto.randomUUID(),
		children: avecIdentifiants(b.children ?? [])
	}));
}

function lireLeCorps(corps: string): LectureDuCorps {
	const lecture = mdxVersBlocs(corps);
	return 'erreur' in lecture ? lecture : { ...lecture, blocs: avecIdentifiants(lecture.blocs) };
}

function trouverBloc(blocs: readonly Bloc[], id: string): Bloc | undefined {
	for (const bloc of blocs) {
		if (bloc.id === id) return bloc;
		const dedans = trouverBloc(bloc.children ?? [], id);
		if (dedans !== undefined) return dedans;
	}
	return undefined;
}

function titresDuPlan(blocs: readonly Bloc[]): TitreDuPlan[] {
	return blocs
		.filter((b) => b.type === 'heading' && b.id !== undefined)
		.map((b) => ({
			id: b.id ?? '',
			niveau: b.props?.level === 3 ? 3 : 2,
			texte: Array.isArray(b.content)
				? b.content.map((m) => (m.type === 'text' ? m.text : '')).join('')
				: ''
		}));
}

/** Les mots que lira le lecteur : ni balises, ni ponctuation du Markdown. */
function compterLesMots(corps: string): number {
	return corps
		.replace(/<[^>]*>/g, ' ')
		.split(/\s+/)
		.filter((mot) => /[\p{L}\p{N}]/u.test(mot)).length;
}

/** Les lignes du fichier qui changent, ajoutées ou retirées : ce que dira le commit. */
function lignesChangees(avant: string, apres: string): number {
	const restantes = new Map<string, number>();
	for (const ligne of avant.split('\n')) restantes.set(ligne, (restantes.get(ligne) ?? 0) + 1);
	let ajoutees = 0;
	for (const ligne of apres.split('\n')) {
		const reste = restantes.get(ligne) ?? 0;
		if (reste > 0) restantes.set(ligne, reste - 1);
		else ajoutees += 1;
	}
	const retirees = [...restantes.values()].reduce((somme, n) => somme + n, 0);
	return Math.max(ajoutees, retirees);
}

/** Une valeur de la loi, rendue par le composant du site qui la lit. */
function ApercuDeValeur({ valeur }: { readonly valeur: ValeurDuCatalogue }) {
	const Composant = COMPOSANTS[valeur.nom];
	return (
		<GardeDeRendu repli="valeur introuvable">
			{Composant === undefined ? null : <Composant {...valeur.attributs} />}
		</GardeDeRendu>
	);
}

/** Ce que la publication a rendu : le commit, et son adresse sur GitHub. */
export interface Publication {
	readonly commit: string;
	readonly url: string;
	readonly sha: string;
}

type Envoi =
	| { readonly etat: 'repos' }
	| { readonly etat: 'envoi' }
	| { readonly etat: 'fait'; readonly publication: Publication }
	| { readonly etat: 'erreur'; readonly message: string };

export function EcranEditeurArticle({
	adresseInitiale,
	source,
	sha,
	connus,
	aujourdHui,
	peutPublier,
	onPublier
}: {
	/** `null` pour un nouvel article : l'adresse se déduit du titre. */
	readonly adresseInitiale: string | null;
	readonly source: string | null;
	readonly sha: string | undefined;
	readonly connus: readonly ArticleConnu[];
	readonly aujourdHui: string;
	readonly peutPublier: boolean;
	readonly onPublier: (
		adresse: string,
		source: string,
		sha: string | undefined
	) => Promise<Publication>;
}) {
	const [depart] = useState(() => {
		const saisie = saisieDepuis(source, aujourdHui);
		return { saisie, lecture: lireLeCorps(saisie.corps) };
	});
	const [saisie, setSaisie] = useState<Saisie>(depart.saisie);
	const [lecture, setLecture] = useState<LectureDuCorps>(depart.lecture);
	const [blocs, setBlocs] = useState<readonly Bloc[]>(
		'erreur' in depart.lecture ? [] : depart.lecture.blocs
	);
	const [generation, setGeneration] = useState(0);
	const [mode, setMode] = useState<ModeDEdition>('erreur' in depart.lecture ? 'mdx' : 'ecrire');
	const [erreurDeLecture, setErreurDeLecture] = useState<string | null>(
		'erreur' in depart.lecture ? depart.lecture.erreur : null
	);
	const [onglet, setOnglet] = useState<OngletDuPanneau>('blocs');
	const [choix, setChoix] = useState<ChoixDansLEditeur | null>(null);
	const [panneauOuvert, setPanneauOuvert] = useState(false);
	const [confirmation, setConfirmation] = useState(false);
	const [rechercheValeur, setRechercheValeur] = useState('');
	const [rechercheRemplacement, setRechercheRemplacement] = useState('');
	const [adresseSaisie, setAdresseSaisie] = useState<string | null>(adresseInitiale);
	const [empreinte, setEmpreinte] = useState<string | undefined>(sha);
	const [envoi, setEnvoi] = useState<Envoi>({ etat: 'repos' });
	const surLeClient = useSyncExternalStore(
		abonnementNul,
		() => true,
		() => false
	);
	const api = useRef<ApiEditeur | null>(null);
	const recevoirApi = useCallback((recue: ApiEditeur | null) => {
		api.current = recue;
	}, []);

	const nouveau = adresseInitiale === null && empreinte === undefined;
	const adresse = adresseSaisie ?? adresseDepuisTitre(saisie.titre);
	const changer =
		<K extends keyof Saisie>(cle: K) =>
		(valeur: Saisie[K]) =>
			setSaisie((s) => ({ ...s, [cle]: valeur }));
	const lectureSeule = !peutPublier;

	// Un brouillon local, par article : une fermeture d'onglet ne perd rien. Confort seulement.
	const cleLocale = `cms-blog:${adresseInitiale ?? 'nouveau'}`;
	const [sauve, setSauve] = useState(() => JSON.stringify(depart.saisie));
	useEffect(() => {
		const minuterie = setTimeout(() => {
			const json = JSON.stringify(saisie);
			try {
				localStorage.setItem(cleLocale, json);
			} catch {
				// Stockage indisponible : rien de grave, l'article reste dans l'écran.
			}
			setSauve(json);
		}, 800);
		return () => clearTimeout(minuterie);
	}, [cleLocale, saisie]);
	const [brouillonLocal] = useState<Saisie | null>(() => {
		try {
			const brut = localStorage.getItem(cleLocale);
			return brut === null ? null : (JSON.parse(brut) as Saisie);
		} catch {
			return null;
		}
	});
	const [brouillonIgnore, setBrouillonIgnore] = useState(false);
	const brouillonDifferent =
		!brouillonIgnore &&
		brouillonLocal !== null &&
		JSON.stringify(brouillonLocal) !== JSON.stringify(depart.saisie);

	/** Le corps relu en blocs, et l'éditeur remonté dessus (après le mode MDX, ou une reprise). */
	function relireEnBlocs(corps: string): boolean {
		const relue = lireLeCorps(corps);
		if ('erreur' in relue) {
			setErreurDeLecture(relue.erreur);
			setMode('mdx');
			return false;
		}
		setErreurDeLecture(null);
		setLecture(relue);
		setBlocs(relue.blocs);
		setGeneration((g) => g + 1);
		setChoix(null);
		return true;
	}

	function changerDeMode(suivant: ModeDEdition) {
		if (suivant === 'ecrire' && mode === 'mdx' && !relireEnBlocs(saisie.corps)) return;
		setMode(suivant);
	}

	const { entete, erreurs } = valider(saisie);
	const apercu = useApercuMdx(saisie.corps);
	const relecture =
		entete === null
			? { bloquants: [], avertissements: [] }
			: relireArticle(
					adresse,
					{ entete, corps: saisie.corps },
					connus.filter((c) => c.adresse !== adresse)
				);
	const adresseDejaPrise = nouveau && connus.some((c) => c.adresse === adresse);
	const bloquants = [
		...erreurs,
		...relecture.bloquants,
		...(apercu.etat === 'erreur' ? [`Le corps ne se compile pas : ${apercu.message}`] : []),
		...(adresseDejaPrise ? [`Un article porte déjà l’adresse /blog/${adresse}.`] : [])
	];
	const pret = entete !== null && bloquants.length === 0 && apercu.etat === 'pret';
	const statut = statutDe({ date: saisie.date, brouillon: saisie.brouillon, erreurs }, aujourdHui);
	const sortie = entete === null ? null : ecrireArticle({ entete, corps: saisie.corps });

	async function publier() {
		if (sortie === null) return;
		setEnvoi({ etat: 'envoi' });
		try {
			const publication = await onPublier(adresse, sortie, empreinte);
			setEmpreinte(publication.sha);
			setAdresseSaisie(adresse);
			setEnvoi({ etat: 'fait', publication });
			try {
				localStorage.removeItem(cleLocale);
			} catch {
				// Rien à retirer.
			}
		} catch (e) {
			const donnees = (e as { data?: unknown }).data;
			setEnvoi({
				etat: 'erreur',
				message:
					typeof donnees === 'string'
						? donnees
						: 'La publication a échoué. Réessayez dans un instant.'
			});
		}
	}

	const libelleBouton =
		statut === 'programme'
			? `Programmer au ${dateLisible(saisie.date)}`
			: statut === 'brouillon'
				? 'Enregistrer en brouillon'
				: 'Publier';
	const quand =
		statut === 'brouillon'
			? 'Reste en brouillon, jamais en ligne'
			: statut === 'programme'
				? `Paraît le ${dateLisible(saisie.date)}`
				: 'Paraît dans quelques minutes';

	/** Sous 1280 px, le panneau s'ouvre en page pleine ; au-delà, il est déjà là. */
	function ouvrirLePanneau(suivant: OngletDuPanneau) {
		setOnglet(suivant);
		if (!window.matchMedia('(min-width: 1280px)').matches) setPanneauOuvert(true);
	}

	function versLeBloc(id: string) {
		setPanneauOuvert(false);
		if (mode !== 'ecrire') setMode('ecrire');
		requestAnimationFrame(() => api.current?.allerAuBloc(id));
	}

	// ── Le bloc choisi dans l'article, réglé en tête du panneau ──
	const blocChoisi = choix?.genre === 'illustration' ? trouverBloc(blocs, choix.id) : undefined;
	const sourceChoisie = blocChoisi === undefined ? '' : texteBrut(blocChoisi);
	const composantChoisi = blocChoisi === undefined ? null : lireComposant(sourceChoisie);
	const illustrationChoisie =
		composantChoisi === null
			? undefined
			: ILLUSTRATIONS_DU_CATALOGUE.find((i) => i.nom === composantChoisi.nom);
	const valeurChoisie =
		choix?.genre === 'valeur' ? valeurDuCatalogue(choix.nom, choix.attributs) : undefined;
	const carteDuChoix =
		choix === null || mode !== 'ecrire' ? null : choix.genre === 'illustration' ? (
			blocChoisi === undefined ? null : (
				<CarteDuChoix
					titre={illustrationChoisie?.libelle ?? composantChoisi?.nom ?? 'Bloc MDX'}
					onFermer={() => setChoix(null)}
				>
					<ReglagesDIllustration
						key={choix.id}
						illustration={illustrationChoisie}
						composant={composantChoisi}
						source={sourceChoisie}
						onSource={(s) => api.current?.remplacerSource(choix.id, s)}
						lectureSeule={lectureSeule}
					/>
				</CarteDuChoix>
			)
		) : (
			<CarteDuChoix titre="Valeur de la loi" onFermer={() => setChoix(null)}>
				<ReglagesDeValeur
					actuelle={valeurChoisie}
					apercuActuel={
						valeurChoisie === undefined ? (
							`<${choix.nom} />`
						) : (
							<ApercuDeValeur valeur={valeurChoisie} />
						)
					}
					propositions={
						rechercheRemplacement === ''
							? VALEURS_DE_LA_LOI.filter((v) => v.nom === choix.nom)
							: valeursPour(rechercheRemplacement)
					}
					recherche={rechercheRemplacement}
					onRecherche={setRechercheRemplacement}
					onRemplacer={(v) => {
						if (lectureSeule) return;
						choix.remplacer(v);
						setChoix({ ...choix, nom: v.nom, attributs: v.attributs });
					}}
					apercu={(v) => <ApercuDeValeur valeur={v} />}
				/>
			</CarteDuChoix>
		);

	const contenuDuPanneau = {
		blocs:
			mode === 'mdx' ? (
				<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
					Repassez en mode Écrire pour glisser des blocs dans l’article.
				</p>
			) : (
				<PaletteDeBlocs
					gabarits={GABARITS}
					onInserer={(g) => {
						setPanneauOuvert(false);
						if (mode !== 'ecrire') setMode('ecrire');
						api.current?.inserer(g);
					}}
					valeurs={valeursPour(rechercheValeur)}
					recherche={rechercheValeur}
					onRecherche={setRechercheValeur}
					onInsererValeur={(v) => {
						setPanneauOuvert(false);
						if (mode !== 'ecrire') setMode('ecrire');
						api.current?.insererValeur(v);
					}}
					apercu={(v) => <ApercuDeValeur valeur={v} />}
					lectureSeule={lectureSeule}
				/>
			),
		reglages: (
			<ReglagesDeLArticle
				date={saisie.date}
				onDate={changer('date')}
				categorie={saisie.categorie}
				categories={CATEGORIES}
				onCategorie={changer('categorie')}
				pilier={saisie.pilier}
				piliers={PILIERS}
				onPilier={changer('pilier')}
				illustration={saisie.illustration}
				illustrations={ILLUSTRATIONS}
				onIllustration={changer('illustration')}
				couverturePour={(i) => (
					<CouvertureIllustree
						categorie={saisie.categorie as CategorieBlog}
						illustration={i as Illustration}
					/>
				)}
				adresse={adresse}
				onAdresse={(v) => setAdresseSaisie(v)}
				adresseModifiable={nouveau}
				brouillon={saisie.brouillon}
				onBrouillon={changer('brouillon')}
				auteur={saisie.auteur}
				lectureSeule={lectureSeule}
			/>
		),
		plan:
			mode === 'mdx' ? (
				<p className="px-1 text-cladd-2xs text-cladd-fg-soft">Le plan revient en mode Écrire.</p>
			) : (
				<PlanDeLArticle titres={titresDuPlan(blocs)} onAller={versLeBloc} />
			),
		relecture: (
			<PanneauDeRelecture bloquants={bloquants} avertissements={relecture.avertissements} />
		)
	} satisfies Record<OngletDuPanneau, ReactNode>;

	const panneau = (
		<PanneauDEdition
			onglet={onglet}
			onOnglet={setOnglet}
			aRelire={bloquants.length + relecture.avertissements.length}
			choix={carteDuChoix}
		>
			{contenuDuPanneau[onglet]}
		</PanneauDEdition>
	);

	const memoire = 'erreur' in lecture ? undefined : lecture.memoire;

	const page =
		mode === 'apercu' ? (
			<CadreDApercu titre={saisie.titre} description={saisie.description} enBref={saisie.enBref}>
				{apercu.etat === 'pret' ? (
					<apercu.Contenu components={COMPOSANTS_MDX} />
				) : apercu.etat === 'erreur' ? (
					<p className="text-cladd-md">
						L’aperçu attend un corps qui se compile : {apercu.message}
					</p>
				) : (
					<p className="text-cladd-md">Compilation de l’aperçu…</p>
				)}
			</CadreDApercu>
		) : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/admin/blog', libelle: 'Blog' },
				titre: saisie.titre === '' ? 'Nouvel article' : saisie.titre
			}}
			largeur="large"
		>
			<MiseEnPageDeLEditeur
				barre={
					<BarreDEdition
						statut={statut}
						enregistre={sauve === JSON.stringify(saisie)}
						mots={compterLesMots(saisie.corps)}
						mode={mode}
						onMode={changerDeMode}
						bloquants={bloquants.length}
						avertissements={relecture.avertissements.length}
						onRelecture={() => ouvrirLePanneau('relecture')}
						onReglages={() => setPanneauOuvert(true)}
						action={
							peutPublier ? (
								<BoutonPrincipal
									disabled={envoi.etat === 'envoi'}
									onClick={() => setConfirmation(true)}
								>
									<SendIcon aria-hidden />
									<span className="hidden sm:inline">{libelleBouton}</span>
								</BoutonPrincipal>
							) : null
						}
					/>
				}
				page={
					<>
						{brouillonDifferent ? (
							<div className="verre-carte mb-cladd-xs flex flex-wrap items-center justify-between gap-2 rounded-cladd-xl px-3.5 py-2.5 text-cladd-2xs">
								<span>Une version non publiée de cet article est restée dans ce navigateur.</span>
								<span className="flex gap-2">
									<BoutonTexte
										onClick={() => {
											if (brouillonLocal !== null) {
												setSaisie(brouillonLocal);
												relireEnBlocs(brouillonLocal.corps);
											}
											setBrouillonIgnore(true);
										}}
									>
										La reprendre
									</BoutonTexte>
									<BoutonTexte onClick={() => setBrouillonIgnore(true)}>L’ignorer</BoutonTexte>
								</span>
							</div>
						) : null}
						{page}
						<div className={mode === 'apercu' ? 'hidden' : undefined}>
							<PapierDArticle>
								<TeteDArticle
									couverture={
										<CouvertureIllustree
											categorie={saisie.categorie as CategorieBlog}
											illustration={saisie.illustration as Illustration}
										/>
									}
									onCouverture={() => ouvrirLePanneau('reglages')}
									titre={saisie.titre}
									onTitre={changer('titre')}
									description={saisie.description}
									onDescription={changer('description')}
									enBref={saisie.enBref}
									onEnBref={changer('enBref')}
									lectureSeule={lectureSeule}
								/>
								{erreurDeLecture === null ? null : (
									<p className="rounded-carte-site bg-teinte-question px-cladd-xs py-cladd-3xs text-cladd-2xs">
										Ce corps ne se lit pas en blocs ({erreurDeLecture}). Corrigez-le ici, en MDX,
										puis repassez en mode Écrire.
									</p>
								)}
								{mode === 'mdx' ? (
									<ZoneDeCorps
										valeur={saisie.corps}
										onChange={changer('corps')}
										extraits={EXTRAITS}
									/>
								) : memoire === undefined || !surLeClient ? null : (
									<Suspense
										fallback={
											<p className="text-cladd-md text-encre-site-douce">Ouverture de l’éditeur…</p>
										}
									>
										<EditeurBlocs
											key={generation}
											blocsInitiaux={'erreur' in lecture ? [] : lecture.blocs}
											onChange={(suivants) => {
												setBlocs(suivants);
												setSaisie((s) => ({ ...s, corps: blocsVersMdx(suivants, memoire) }));
											}}
											composants={COMPOSANTS}
											compiler={compilerMdx}
											lectureSeule={lectureSeule}
											onChoix={setChoix}
											refApi={recevoirApi}
										/>
									</Suspense>
								)}
							</PapierDArticle>
						</div>
					</>
				}
				panneau={panneau}
			/>

			{choix !== null && mode === 'ecrire' && !panneauOuvert ? (
				<PastilleDuChoix
					libelle={choix.genre === 'valeur' ? 'Régler la valeur' : 'Régler le bloc'}
					onOuvrir={() => setPanneauOuvert(true)}
				/>
			) : null}

			<FeuillePleinEcran
				ouverte={panneauOuvert}
				onFermer={() => setPanneauOuvert(false)}
				titre="L’article"
			>
				{panneau}
			</FeuillePleinEcran>

			<FeuillePleinEcran
				ouverte={confirmation}
				onFermer={() => {
					setConfirmation(false);
					if (envoi.etat !== 'envoi') setEnvoi({ etat: 'repos' });
				}}
				titre={envoi.etat === 'fait' ? 'Envoyé' : 'Avant de publier'}
				pied={
					envoi.etat === 'fait' ? (
						<BoutonSecondaire
							pleineLargeur
							as="a"
							href={envoi.publication.url}
							target="_blank"
							rel="noreferrer"
						>
							<ExternalLinkIcon aria-hidden />
							Voir le commit
						</BoutonSecondaire>
					) : (
						<BoutonPrincipal
							pleineLargeur
							disabled={!pret || envoi.etat === 'envoi'}
							onClick={() => void publier()}
						>
							<SendIcon aria-hidden />
							{envoi.etat === 'envoi' ? 'Envoi sur GitHub…' : libelleBouton}
						</BoutonPrincipal>
					)
				}
			>
				{envoi.etat === 'fait' ? (
					<p className="verre-carte rounded-cladd-xl px-3.5 py-3 text-cladd-2xs leading-relaxed">
						Envoyé sur GitHub. Le site se reconstruit et l’article paraît{' '}
						{statut === 'programme' ? `le ${dateLisible(saisie.date)}` : 'dans quelques minutes'}.
					</p>
				) : (
					<>
						<RecapitulatifDePublication
							titre={saisie.titre}
							adresse={adresse}
							quand={quand}
							bloquants={bloquants}
							avertissements={relecture.avertissements.length}
							lignesChangees={
								confirmation && source !== null && sortie !== null
									? lignesChangees(source, sortie)
									: null
							}
						/>
						{envoi.etat === 'erreur' ? (
							<p className="text-cladd-red px-1 text-cladd-2xs font-medium">{envoi.message}</p>
						) : null}
					</>
				)}
			</FeuillePleinEcran>
		</PageEcran>
	);
}
