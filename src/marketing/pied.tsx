import { Link } from '@tanstack/react-router';
import { LogoLetikette } from '../ui';
import { getLegalEmailAddress } from '../lib/config/legal';
import { articlesPublies } from './blog';

/**
 * LE PIED DE PAGE — l'encre, la marque en grand, les liens légaux (06/10/2026).
 *
 * La page se referme sur la couleur de la marque, d'un bord droit sous la
 * bande abricot de l'appel final. La
 * marque y est écrite en grand, dans son écriture — The Leap pour le geste.
 *
 * ⚠️ LES QUATRE LIENS LÉGAUX RESTENT VISIBLES, et la phrase qui borne le produit
 * (aucun recouvrement pour compte d'autrui, aucun fonds, aucun conseil) aussi.
 * L'identité de l'éditeur — raison sociale, SIRET, adresse — vit sur la page
 * « Mentions légales », où la loi la demande ; le pied de page ne la répète plus
 * (décision du fondateur, 06/10/2026).
 */
const LIEN =
	'py-cladd-3xs text-cladd-sm text-creme-sur-encre-douce underline underline-offset-4 transition-colors hover:text-creme-sur-encre';

export function Pied() {
	return (
		<footer className="w-full bg-encre-site text-creme-sur-encre">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-cladd-sm px-cladd-2xs pt-cladd-xl pb-cladd-xl md:px-cladd-sm md:pt-cladd-2xl">
				<div className="flex flex-col gap-cladd-2xs md:flex-row md:items-end md:justify-between">
					<Link to="/" aria-label="Letikette, accueil" className="flex items-center gap-cladd-2xs">
						<LogoLetikette className="size-14 shrink-0 md:size-20" />
						<span className="font-manuscrit text-affiche-colonne leading-none tracking-wide uppercase">
							Letikette
						</span>
					</Link>
					<div className="flex flex-wrap items-center gap-x-cladd-2xs gap-y-1">
						{articlesPublies().length > 0 ? (
							<Link to="/blog" className={LIEN}>
								Blog
							</Link>
						) : null}
						<Link to="/connexion" className={LIEN}>
							Se connecter
						</Link>
						<Link to="/inscription" className={LIEN}>
							Créer un compte
						</Link>
						<a href={`mailto:${getLegalEmailAddress()}`} className={LIEN}>
							{getLegalEmailAddress()}
						</a>
					</div>
				</div>

				<nav
					aria-label="Informations légales"
					className="flex flex-wrap items-center gap-x-cladd-2xs gap-y-1 border-t border-creme-sur-encre/15 pt-cladd-2xs"
				>
					<Link to="/mentions-legales" className={LIEN}>
						Mentions légales
					</Link>
					<Link to="/conditions-generales" className={LIEN}>
						Conditions générales
					</Link>
					<Link to="/politique-de-confidentialite" className={LIEN}>
						Politique de confidentialité
					</Link>
					<Link to="/accord-de-sous-traitance" className={LIEN}>
						Accord de sous-traitance
					</Link>
				</nav>

				<p className="max-w-3xl text-cladd-sm leading-relaxed text-creme-sur-encre-douce">
					Letikette mesure ce qu’on vous doit, le documente et surveille ses échéances, selon une
					obligation de moyens. Il n’exerce aucune activité de recouvrement pour compte de tiers, ne
					manipule aucun fonds et ne délivre aucun conseil juridique. Toute décision d’engager une
					procédure reste la vôtre.
				</p>
			</div>
		</footer>
	);
}
