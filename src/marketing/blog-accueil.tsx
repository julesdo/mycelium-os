import { Link } from '@tanstack/react-router';
import { ArrowRightIcon } from 'lucide-react';
import { articlesPublies } from './blog';
import { CarteArticle } from './blog-pages';
import { Chapeau, SectionMarketing, TitreSection } from './section';

/**
 * LE BLOG SUR LA PAGE D'ACCUEIL (06/10/2026) : les trois derniers articles.
 *
 * Le fondateur : « une section blog dans la home pour qu'en mobile on puisse y
 * accéder ». Sous 1024 px, la barre ne porte plus ses liens : sans cette section,
 * le blog ne s'atteignait sur téléphone que par le pied de page.
 *
 * Le carrousel sur téléphone, comme « Pour qui » : les cartes débordent jusqu'au
 * bord de l'écran, ce qui dit qu'il y en a d'autres. Au-delà, trois colonnes en
 * sous-grille. Sans article publié, la section ne s'affiche pas.
 */
export function BlogAccueil() {
	const derniers = articlesPublies().slice(0, 3);
	if (derniers.length === 0) return null;

	return (
		<SectionMarketing id="blog" ton="profond" className="gap-cladd-lg">
			<div className="flex flex-col gap-cladd-2xs md:flex-row md:items-end md:justify-between md:gap-cladd-lg">
				<div className="flex flex-col gap-cladd-2xs">
					<TitreSection>Le blog</TitreSection>
					<Chapeau>Les règles qui s’appliquent à vos factures, expliquées simplement.</Chapeau>
				</div>
				<Link
					to="/blog"
					className="inline-flex min-h-11 shrink-0 items-center gap-1 self-start text-cladd-md font-semibold underline-offset-4 hover:underline md:self-auto"
				>
					Tous les articles
					<ArrowRightIcon aria-hidden size={16} />
				</Link>
			</div>

			<ul className="carrousel -mx-cladd-2xs flex snap-x snap-mandatory gap-cladd-2xs overflow-x-auto px-cladd-2xs pb-cladd-3xs md:mx-0 md:grid md:grid-cols-3 md:gap-x-cladd-sm md:gap-y-0 md:overflow-visible md:px-0">
				{derniers.map((article) => (
					<li
						key={article.adresse}
						className="flex w-4/5 shrink-0 snap-center flex-col md:row-span-3 md:grid md:w-auto md:grid-rows-subgrid"
					>
						<CarteArticle article={article} avecDescription={false} />
					</li>
				))}
			</ul>
		</SectionMarketing>
	);
}
