import { createRouter, type ParsedLocation } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { EcranIntrouvable, EcranEnErreur } from './screens/passage';

/**
 * LES QUATRE ÉCRANS DE LA BARRE DU BAS : passer de l'un à l'autre n'est ni
 * avancer ni reculer, c'est changer d'onglet.
 */
const ONGLETS = new Set(['/app', '/app/clients', '/app/dossiers', '/app/compte']);

function chemin(location: ParsedLocation): string {
	return location.pathname.replace(/\/$/, '') || '/';
}

/**
 * LE SENS D'UNE NAVIGATION, pour que la page glisse du bon côté (`app.css`, « LES
 * PAGES QUI GLISSENT »).
 *
 * ⚠️ LE SENS VIENT DE L'HISTORIQUE, PAS DE LA PROFONDEUR DE L'ADRESSE. Un
 * décompte ouvert depuis un dossier a la même profondeur que lui
 * (`/app/decompte/x`, `/app/dossier/y`) et c'est pourtant une page poussée ; le
 * retour du téléphone, lui, recule dans l'historique. L'index que le routeur
 * pose sur chaque entrée dit lequel des deux on fait.
 *
 * ⚠️ RIEN HORS DE `/app`. Le site public, la connexion et la salle d'exposition
 * changent de page sans animation : ce ne sont pas les écrans d'une application.
 * Une recherche d'URL qui change (`?d=` au-delà de 1024 px) n'est pas une page.
 */
function typesDeTransition({
	fromLocation,
	toLocation,
	pathChanged
}: {
	fromLocation?: ParsedLocation;
	toLocation: ParsedLocation;
	pathChanged: boolean;
}): string[] | false {
	if (!pathChanged || fromLocation === undefined) return false;
	const de = chemin(fromLocation);
	const vers = chemin(toLocation);
	if (!de.startsWith('/app') || !vers.startsWith('/app')) return false;
	if (ONGLETS.has(de) && ONGLETS.has(vers)) return ['onglet'];
	const indexDe = fromLocation.state.__TSR_index;
	const indexVers = toLocation.state.__TSR_index;
	return indexVers < indexDe ? ['retour'] : ['pousser'];
}

/**
 * Le point d'entrée du routeur, appelé par TanStack Start côté serveur comme
 * côté client. `routeTree.gen.ts` est généré depuis `src/routes/**` : il n'est
 * jamais édité à la main et n'est pas relu en revue de code.
 */
export function getRouter() {
	return createRouter({
		routeTree,
		defaultPreload: 'intent',
		// Les deux écrans de passage vivent dans `src/screens/passage.tsx`, pour que
		// la salle d'exposition puisse les rendre. Écrits ici en ligne, ils étaient
		// impossibles à regarder. `ecrans-de-passage.test.ts` vérifie que le routeur
		// affiche bien ceux-là, et pas une copie.
		defaultNotFoundComponent: () => <EcranIntrouvable />,
		defaultErrorComponent: () => <EcranEnErreur />,
		/*
		  LES PAGES GLISSENT (08/10/2026) — « ce qui fait app native plus que
		  site », relevé sur les meilleures applications iOS. Le navigateur anime
		  le passage d'une page à l'autre ; le routeur dit dans quel sens.
		*/
		//
		// ⚠️ SEULEMENT LÀ OÙ LE NAVIGATEUR SAIT NOMMER UN SENS. Sans les types, le
		// routeur retomberait sur un fondu à CHAQUE navigation, site public et
		// recherches d'URL compris : on préfère alors ne rien animer du tout.
		defaultViewTransition:
			typeof window !== 'undefined' &&
			typeof document.startViewTransition === 'function' &&
			window.CSS?.supports?.('selector(:active-view-transition-type(a))') === true
				? { types: typesDeTransition }
				: false
	});
}

declare module '@tanstack/react-router' {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
