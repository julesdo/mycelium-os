import { Link } from '@tanstack/react-router';
import { LogoLetikette } from '../ui';
import { getLegalEmailAddress } from '../lib/config/legal';
import { articlesPublies } from './blog';
import { FONCTIONNALITES } from './fonctionnalites';
import { NOMS_DES_SECTEURS, SECTEURS_PUBLICS } from './secteurs';

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
 *
 * ⚠️ TROIS COLONNES DEPUIS LE 14/10/2026, à la manière de Midday : le logiciel
 * (le registre, `FONCTIONNALITES`), les ressources, le compte. Le pied ne
 * menait jusqu'ici à aucune fonction du produit. Une quatrième le 18/10 : les
 * pages par métier.
 */
const LIEN =
	'py-cladd-3xs text-cladd-sm text-creme-sur-encre-douce underline underline-offset-4 transition-colors hover:text-creme-sur-encre';
const LIEN_COLONNE =
	'block py-1.5 text-cladd-sm text-creme-sur-encre-douce transition-colors hover:text-creme-sur-encre';
const TITRE = 'pb-1 text-cladd-sm font-semibold text-creme-sur-encre';

export function Pied() {
	return (
		<footer className="w-full bg-encre-site text-creme-sur-encre">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-cladd-sm px-cladd-2xs pt-cladd-xl pb-cladd-xl md:px-cladd-sm md:pt-cladd-2xl">
				<Link
					to="/"
					aria-label="Letikette, accueil"
					className="flex w-fit items-center gap-cladd-2xs"
				>
					<LogoLetikette className="size-14 shrink-0 md:size-20" />
					<span className="font-manuscrit text-affiche-colonne leading-none tracking-wide uppercase">
						Letikette
					</span>
				</Link>

				<div className="grid grid-cols-2 gap-cladd-sm pt-cladd-xs md:grid-cols-5">
					<nav aria-label="Le logiciel" className="col-span-2 flex flex-col">
						<span className={TITRE}>Le logiciel</span>
						<ul className="grid grid-cols-2 gap-x-cladd-sm">
							{FONCTIONNALITES.map((fonctionnalite) => (
								<li key={fonctionnalite.cle}>
									<a href={fonctionnalite.ancre} className={LIEN_COLONNE}>
										{fonctionnalite.nom}
									</a>
								</li>
							))}
						</ul>
					</nav>
					<nav aria-label="Par métier" className="flex flex-col">
						<span className={TITRE}>Par métier</span>
						{SECTEURS_PUBLICS.map((secteur) => (
							<Link
								key={secteur}
								to="/secteurs/$secteur"
								params={{ secteur }}
								className={LIEN_COLONNE}
							>
								{NOMS_DES_SECTEURS[secteur]}
							</Link>
						))}
					</nav>
					<nav aria-label="Ressources" className="flex flex-col">
						<span className={TITRE}>Ressources</span>
						<Link to="/tarifs" className={LIEN_COLONNE}>
							Tarifs
						</Link>
						<Link to="/securite" className={LIEN_COLONNE}>
							Sécurité
						</Link>
						<Link to="/taux-des-penalites-de-retard" className={LIEN_COLONNE}>
							Taux des pénalités
						</Link>
						{articlesPublies().length > 0 ? (
							<Link to="/blog" className={LIEN_COLONNE}>
								Blog
							</Link>
						) : null}
						<a href="/#faq" className={LIEN_COLONNE}>
							Questions
						</a>
					</nav>
					<nav aria-label="Votre compte" className="flex flex-col">
						<span className={TITRE}>Compte</span>
						<Link to="/connexion" className={LIEN_COLONNE}>
							Se connecter
						</Link>
						<Link to="/inscription" className={LIEN_COLONNE}>
							Créer un compte
						</Link>
						<a href={`mailto:${getLegalEmailAddress()}`} className={LIEN_COLONNE}>
							Nous écrire
						</a>
					</nav>
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
					<Link to="/remboursement" className={LIEN}>
						Remboursement
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
