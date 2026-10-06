import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from 'lucide-react';
import { MDXContent } from '@content-collections/mdx/react';
import { cn } from '../ui';
import { Appel } from './appel';
import { Navbar } from './navbar';
import { Pied } from './pied';
import { Chapeau } from './section';
import { CouvertureIllustree } from './blog-couvertures';
import { COMPOSANTS_MDX } from './mdx';
import { articlesPublies, dateLisible, type ArticleBlog } from './blog';
import { useFilColle, useSectionLue } from './lecture';

/**
 * LES PAGES DU BLOG : la liste et l'article (06/10/2026).
 *
 * La DA de la page publique, sans rien ajouter : crème, encre, serif pour les
 * titres, une colonne de lecture étroite pour l'article (Stripe, Mailchimp), et
 * la bande abricot de l'appel final avant le pied de page.
 *
 * ⚠️ PAS DE SUR-TITRE AU-DESSUS DES TITRES (« très AI slop », le fondateur) : la
 * catégorie, la date et la durée de lecture tiennent sur une ligne de texte
 * ordinaire.
 *
 * ⚠️ LES CARTES DE LA LISTE SONT DES SOUS-GRILLES, comme partout sur le site :
 * le titre de chaque carte tombe à la même hauteur que celui de sa voisine.
 */

function Meta({ article }: { article: ArticleBlog }) {
	return (
		<p className="text-cladd-sm text-encre-site-claire">
			{article.categorie} · <time dateTime={article.date}>{dateLisible(article.date)}</time> ·{' '}
			{article.minutes} min de lecture
			{article.brouillon ? ' · brouillon, visible en local seulement' : ''}
		</p>
	);
}

/**
 * La couverture d'un article : son illustration, dessinée dans la DA sur la
 * teinte de sa catégorie (`blog-couvertures.tsx`), ou une vraie image si
 * l'article en déclare une.
 */
function Vignette({
	article,
	format = 'carte',
	prioritaire = false
}: {
	article: ArticleBlog;
	format?: 'carte' | 'bandeau';
	prioritaire?: boolean;
}) {
	const proportions = format === 'bandeau' ? 'aspect-2/1' : 'aspect-3/2';
	if (article.couverture !== undefined) {
		return (
			<img
				src={article.couverture.src}
				alt={article.couverture.alt}
				loading={prioritaire ? 'eager' : 'lazy'}
				decoding="async"
				className={cn('block w-full rounded-carte-site object-cover', proportions)}
			/>
		);
	}
	return (
		<CouvertureIllustree
			categorie={article.categorie}
			illustration={article.illustration}
			className={proportions}
		/>
	);
}

/**
 * UNE CARTE D'ARTICLE : la couverture, la ligne de méta, le titre, et la
 * description quand la place le permet. La liste du blog, « À lire ensuite » et
 * la page d'accueil la partagent. Au-delà de 768 px, c'est une sous-grille :
 * dans une grille de cartes, son titre tombe à la hauteur de celui des voisines.
 */
export function CarteArticle({
	article,
	niveau = 'h3',
	avecDescription = true
}: {
	article: ArticleBlog;
	niveau?: 'h2' | 'h3';
	avecDescription?: boolean;
}) {
	const Titre = niveau;
	return (
		<Link
			to="/blog/$adresse"
			params={{ adresse: article.adresse }}
			className={cn(
				'group flex flex-col gap-cladd-2xs md:grid md:grid-rows-subgrid',
				avecDescription ? 'md:row-span-4' : 'md:row-span-3'
			)}
		>
			<Vignette article={article} />
			<Meta article={article} />
			<Titre className="text-intertitre leading-snug font-semibold group-hover:underline group-hover:underline-offset-4">
				{article.titre}
			</Titre>
			{avecDescription ? (
				<p className="text-cladd-md leading-relaxed text-encre-site-douce">{article.description}</p>
			) : null}
		</Link>
	);
}

export function PageListeBlog() {
	const articles = articlesPublies();
	const [premier, ...suivants] = articles;

	return (
		<div className="flex min-h-dvh w-full flex-col bg-creme text-encre-site">
			<Navbar />
			<main className="w-full flex-1 pt-barre-publique">
				<section className="mx-auto flex w-full max-w-6xl flex-col gap-cladd-lg px-cladd-2xs pt-cladd-xl pb-20 md:px-cladd-sm md:pt-cladd-2xl md:pb-respiration">
					<div className="flex flex-col gap-cladd-2xs">
						<h1 className="max-w-3xl font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
							Le blog
						</h1>
						<Chapeau>
							Pénalités, délais, trésorerie : les règles qui s’appliquent à vos factures, expliquées
							simplement.
						</Chapeau>
					</div>

					{premier === undefined ? (
						<p className="text-chapeau text-encre-site-douce">Les premiers articles arrivent.</p>
					) : (
						<>
							{/* LE DERNIER ARTICLE, EN GRAND. */}
							<Link
								to="/blog/$adresse"
								params={{ adresse: premier.adresse }}
								className="group grid gap-cladd-sm md:grid-cols-2 md:items-center md:gap-cladd-lg"
							>
								<Vignette article={premier} prioritaire />
								<div className="flex flex-col gap-cladd-2xs">
									<Meta article={premier} />
									<h2 className="font-serif text-titre-section leading-tight font-medium tracking-titre-section text-balance group-hover:underline group-hover:decoration-1 group-hover:underline-offset-4">
										{premier.titre}
									</h2>
									<p className="text-chapeau leading-relaxed text-encre-site-douce">
										{premier.description}
									</p>
								</div>
							</Link>

							{suivants.length === 0 ? null : (
								<ul className="grid gap-cladd-lg border-t border-filet-creme pt-cladd-lg md:grid-cols-3 md:gap-x-cladd-sm md:gap-y-cladd-lg">
									{suivants.map((article) => (
										<li
											key={article.adresse}
											className="md:row-span-4 md:grid md:grid-rows-subgrid"
										>
											<CarteArticle article={article} niveau="h2" />
										</li>
									))}
								</ul>
							)}
						</>
					)}
				</section>
				<Appel />
			</main>
			<Pied />
		</div>
	);
}

/** Les articles à lire ensuite : la même catégorie d'abord, puis les plus récents. */
function articlesLies(article: ArticleBlog): readonly ArticleBlog[] {
	const autres = articlesPublies().filter((a) => a.adresse !== article.adresse);
	const memeCategorie = autres.filter((a) => a.categorie === article.categorie);
	const reste = autres.filter((a) => a.categorie !== article.categorie);
	return [...memeCategorie, ...reste].slice(0, 3);
}

/**
 * L'ARTICLE, sur le modèle d'OpenSea Learn, GetYourGuide et Substack : un fil
 * d'Ariane, le titre et son chapeau, l'encadré « En bref » pour qui ne lira que
 * ça, puis le texte dans une colonne de lecture, avec le sommaire collé à côté
 * sur grand écran. En fin d'article, de quoi continuer.
 */
const IDS_DE_LECTURE = {
	fil: 'fil-ariane',
	repere: 'fil-ariane-repere',
	article: 'texte'
} as const;
const ANCRE_EN_BREF = 'en-bref';

/**
 * LE FIL D'ARIANE QUI SUIT LA LECTURE : Blog, la catégorie, puis la section en
 * cours, qui change à mesure qu'on descend. Collé sous la barre, pleine largeur ;
 * le dernier maillon ramène au début de sa section, et se coupe plutôt que de
 * passer à la ligne.
 */
function FilAriane({
	categorie,
	section
}: {
	categorie: string;
	section: { readonly titre: string; readonly ancre: string } | undefined;
}) {
	const colle = useFilColle(IDS_DE_LECTURE);
	return (
		<>
			<div id={IDS_DE_LECTURE.repere} aria-hidden />
			<nav
				id={IDS_DE_LECTURE.fil}
				aria-label="Fil d’Ariane"
				data-colle={colle ? '' : undefined}
				className="fil-ariane sticky top-barre-publique z-40 w-full"
			>
				<ol className="mx-auto flex h-fil-ariane w-full max-w-6xl items-center gap-1 px-cladd-2xs text-cladd-sm text-encre-site-douce md:px-cladd-sm">
					<li className="shrink-0">
						<Link to="/blog" className="font-medium transition-colors hover:text-encre-site">
							Blog
						</Link>
					</li>
					<li aria-hidden className="shrink-0">
						<ChevronRightIcon size={14} />
					</li>
					<li className="shrink-0">{categorie}</li>
					{section === undefined ? null : (
						<>
							<li aria-hidden className="shrink-0">
								<ChevronRightIcon size={14} />
							</li>
							<li className="min-w-0">
								<a
									href={`#${section.ancre}`}
									aria-current="location"
									className="block truncate font-medium text-encre-site"
								>
									{section.titre}
								</a>
							</li>
						</>
					)}
				</ol>
			</nav>
		</>
	);
}

export function PageArticleBlog({ article }: { article: ArticleBlog }) {
	const lies = articlesLies(article);
	const sections = [
		...(article.enBref === undefined ? [] : [{ titre: 'En bref', ancre: ANCRE_EN_BREF }]),
		...article.sommaire
	];
	const lue = useSectionLue(
		sections.map((s) => s.ancre),
		IDS_DE_LECTURE
	);
	const sectionLue = sections.find((s) => s.ancre === lue);

	return (
		<div className="flex min-h-dvh w-full flex-col bg-creme text-encre-site">
			<Navbar />
			<main className="w-full flex-1 pt-barre-publique">
				{/* Le fil reste collé tant qu'on est dans l'article et sa suite, et lâche avant l'appel final. */}
				<div>
					<FilAriane categorie={article.categorie} section={sectionLue} />
					<div className="mx-auto flex w-full max-w-6xl flex-col gap-cladd-sm px-cladd-2xs pt-cladd-xs pb-20 md:px-cladd-sm md:pt-cladd-sm md:pb-respiration">
						<header className="flex max-w-3xl flex-col gap-cladd-2xs">
							<h1 className="font-serif text-affiche-colonne leading-tight font-medium tracking-titre-section text-balance">
								{article.titre}
							</h1>
							<p className="text-chapeau leading-relaxed text-encre-site-douce">
								{article.description}
							</p>
							<Meta article={article} />
						</header>

						<Vignette article={article} format="bandeau" prioritaire />

						<div className="grid gap-cladd-lg pt-cladd-xs lg:grid-cols-12 lg:gap-cladd-xl">
							{/* LE SOMMAIRE, collé à côté du texte au-delà de 1024 px. */}
							{article.sommaire.length < 3 ? null : (
								<nav aria-label="Dans cet article" className="hidden lg:col-span-3 lg:block">
									<div className="sticky top-lecture flex flex-col gap-cladd-3xs">
										<span className="text-cladd-sm font-semibold">Dans cet article</span>
										<ol className="flex flex-col gap-1 border-l border-filet-creme">
											{article.sommaire.map((entree) => (
												<li key={entree.ancre}>
													<a
														href={`#${entree.ancre}`}
														aria-current={entree.ancre === lue ? 'location' : undefined}
														className={cn(
															'-ml-px block border-l py-1 pl-cladd-3xs text-cladd-sm leading-snug transition-colors hover:border-encre-site hover:text-encre-site',
															entree.ancre === lue
																? 'border-encre-site font-medium text-encre-site'
																: 'border-transparent text-encre-site-douce'
														)}
													>
														{entree.titre}
													</a>
												</li>
											))}
										</ol>
									</div>
								</nav>
							)}

							<article
								id={IDS_DE_LECTURE.article}
								className={cn(
									'flex min-w-0 flex-col gap-cladd-sm text-chapeau lg:col-span-8',
									article.sommaire.length < 3 && 'lg:col-start-3'
								)}
							>
								{/* EN BREF : ce que le lecteur retient s'il ne lit que ça. */}
								{article.enBref === undefined ? null : (
									<aside
										id={ANCRE_EN_BREF}
										className="flex scroll-mt-lecture flex-col gap-cladd-3xs rounded-carte-site border border-filet-creme bg-papier p-cladd-xs"
									>
										<span className="text-intertitre font-semibold">En bref</span>
										<ul className="flex list-disc flex-col gap-1.5 pl-cladd-xs text-cladd-md leading-relaxed marker:text-encre-site-claire">
											{article.enBref.map((phrase) => (
												<li key={phrase}>{phrase}</li>
											))}
										</ul>
									</aside>
								)}

								<MDXContent code={article.mdx} components={COMPOSANTS_MDX} />
							</article>
						</div>

						{/* À LIRE ENSUITE. */}
						{lies.length === 0 ? null : (
							<section className="flex flex-col gap-cladd-sm border-t border-filet-creme pt-cladd-lg">
								<h2 className="font-serif text-titre-section leading-tight font-medium tracking-titre-section">
									À lire ensuite
								</h2>
								<ul className="grid gap-cladd-lg md:grid-cols-3 md:gap-x-cladd-sm">
									{lies.map((lie) => (
										<li key={lie.adresse} className="md:row-span-4 md:grid md:grid-rows-subgrid">
											<CarteArticle article={lie} niveau="h3" />
										</li>
									))}
								</ul>
							</section>
						)}
					</div>
				</div>
				<Appel />
			</main>
			<Pied />
		</div>
	);
}
