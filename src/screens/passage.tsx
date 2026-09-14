import { Link } from '@tanstack/react-router';
import { BoutonPrincipal, BoutonSecondaire } from '../ui';

/**
 * LES ÉCRANS DE PASSAGE : la page introuvable et l'écran d'erreur.
 *
 * ⚠️ ILS ÉTAIENT ÉCRITS EN LIGNE DANS `src/router.tsx`, exportés nulle part, et
 * c'est pour ça que personne ne les avait regardés : aucun écran ne pouvait les
 * importer, pas même la salle d'exposition. Ils parlaient encore la langue
 * d'avant le pivot, et rien ne le signalait.
 *
 * Le produit est en français : un écran d'erreur en anglais serait la seule
 * chose que le gérant verrait dans une autre langue, au pire moment.
 */

/**
 * La page introuvable.
 *
 * ⚠️ ELLE PROPOSE UN CHEMIN, et elle ne le faisait pas. Elle disait « revenez au
 * tableau de bord » sans offrir de lien : le gérant devait deviner comment.
 */
export function EcranIntrouvable() {
	return (
		<div className="flex flex-col items-start gap-cladd-3xs p-cladd-xs">
			<h1 className="text-cladd-md font-semibold">Cette page n&rsquo;existe pas.</h1>
			<p className="text-cladd-xs text-cladd-fg-soft">
				Le lien est peut-être ancien. Revenez à l&rsquo;accueil pour retrouver vos créances.
			</p>
			<BoutonPrincipal as={Link} to="/app">
				Revenir à l&rsquo;accueil
			</BoutonPrincipal>
		</div>
	);
}

/**
 * L'écran d'erreur.
 *
 * Le message technique par défaut de TanStack (« Something went wrong! » suivi
 * d'une trace Convex) est la pire chose qu'un dirigeant puisse lire : il est en
 * anglais, il ne dit pas quoi faire, et il donne l'impression que sa mesure est
 * perdue. Elle ne l'est jamais : les données sont dans Convex, l'écran seul a
 * échoué.
 *
 * ⚠️ RECHARGER N'EST PAS L'ISSUE PRINCIPALE. Sur un lien de créance périmé,
 * recharger refait l'erreur à l'identique, et « rechargez la page » était la
 * seule issue proposée. L'issue principale ramène à l'accueil ; le rechargement
 * reste possible, en second.
 */
export function EcranEnErreur() {
	return (
		<div className="flex h-dvh flex-col items-center justify-center gap-cladd-3xs p-cladd-xs text-center">
			<h1 className="text-cladd-md font-semibold">Cet écran n&rsquo;a pas pu s&rsquo;afficher.</h1>
			<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
				Vos créances et vos décomptes sont intacts : c&rsquo;est l&rsquo;affichage qui a échoué, pas
				la mesure.
			</p>
			<BoutonPrincipal as={Link} to="/app">
				Revenir à l&rsquo;accueil
			</BoutonPrincipal>
			<BoutonSecondaire onClick={() => window.location.reload()}>
				Recharger la page
			</BoutonSecondaire>
		</div>
	);
}
