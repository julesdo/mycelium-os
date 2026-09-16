import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { usePreference } from './use-preference';

/** Ce que le gérant CHOISIT. « Automatique » suit le réglage du système. */
export type Theme = 'auto' | 'light' | 'dark';

/** Ce qui est réellement PEINT. `auto` n'existe pas à ce niveau : il s'est résolu. */
export type ThemeApplique = 'light' | 'dark';

const CLE = 'letikette-theme';
const THEMES = ['auto', 'light', 'dark'] as const;
const SOMBRE_AU_SYSTEME = '(prefers-color-scheme: dark)';

/**
 * Le thème du système, clair par défaut, sombre s'il le demande.
 *
 * ⚠️ AU RENDU SERVEUR, IL N'Y A PAS DE SYSTÈME. On retient le sombre, qui est
 * aussi ce que la feuille de style peint sans classe : l'amorce ci-dessous
 * corrige avant le premier affichage, et l'hydratation ne voit aucun écart.
 */
function themeDuSysteme(): ThemeApplique {
	return window.matchMedia(SOMBRE_AU_SYSTEME).matches ? 'dark' : 'light';
}

function souscrireAuSysteme(prevenir: () => void) {
	const requete = window.matchMedia(SOMBRE_AU_SYSTEME);
	requete.addEventListener('change', prevenir);
	return () => requete.removeEventListener('change', prevenir);
}

/**
 * L'AMORCE, POSÉE DANS LE `<head>` AVANT TOUT AFFICHAGE.
 *
 * ⚠️ SANS ELLE, « AUTOMATIQUE » CLIGNOTE. Le thème ne se connaît que dans le
 * navigateur : le document arrive sans classe, donc sombre, et la première
 * passe de React le repasse en clair une fraction de seconde plus tard. C'est
 * exactement le scintillement que `usePreference` évitait déjà pour la
 * préférence enregistrée, et il revient avec le défaut système.
 *
 * Elle lit la MÊME clé et la MÊME requête média que ce module, et pose les
 * mêmes classes que l'effet ci-dessous. C'est pour ça qu'elle vit ici et non
 * dans la racine : les trois valeurs ne se recopient pas.
 */
export const AMORCE_THEME = [
	'(function(){try{',
	`var c=localStorage.getItem('${CLE}');`,
	`var t=(c==='light'||c==='dark')?c:(window.matchMedia('${SOMBRE_AU_SYSTEME}').matches?'dark':'light');`,
	"var r=document.documentElement;r.classList.toggle('dark',t==='dark');r.classList.toggle('light',t==='light');",
	'}catch(e){}})();'
].join('');

/**
 * Automatique par défaut, sombre ou clair au choix, préférence persistée.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI LE DÉFAUT N'EST PLUS « SOMBRE »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le sombre en dur était justifié sur l'écran des réglages par un paragraphe
 * qui expliquait la décision au lieu d'aider — et qui contredisait le « tablette
 * d'abord » du projet. Un produit ouvert en 2026 sur un appareil qui porte déjà
 * un réglage clair/sombre n'a pas à en imposer un troisième : il le suit, et
 * laisse forcer l'un ou l'autre.
 *
 * ⚠️ LES PRÉFÉRENCES DÉJÀ ENREGISTRÉES SONT CONSERVÉES. `dark` et `light`
 * restent des valeurs valides : qui avait choisi garde son choix, et seul
 * celui qui n'a jamais choisi passe à « Automatique ».
 */
export function useTheme() {
	const [theme, setTheme] = usePreference<Theme>(CLE, 'auto', THEMES);

	// `useSyncExternalStore` et non un effet : la requête média est un magasin
	// externe et mutable. La lire dans un effet pour appeler `setState`
	// déclencherait un second rendu en cascade — la faute que ce module évite
	// déjà pour `localStorage`.
	const systeme = useSyncExternalStore(
		souscrireAuSysteme,
		themeDuSysteme,
		(): ThemeApplique => 'dark'
	);

	const themeApplique: ThemeApplique = theme === 'auto' ? systeme : theme;

	// Cladd sélectionne ses palettes sur les classes `.light` / `.dark` de la
	// racine du document. Cet effet ne fait que refléter l'état, il n'en crée
	// aucun : il ne déclenche donc pas de rendu.
	useEffect(() => {
		const racine = document.documentElement;
		racine.classList.toggle('dark', themeApplique === 'dark');
		racine.classList.toggle('light', themeApplique === 'light');
	}, [themeApplique]);

	/** Bascule vers l'autre des deux thèmes PEINTS : elle quitte donc « Automatique ». */
	const basculer = useCallback(() => {
		setTheme(themeApplique === 'dark' ? 'light' : 'dark');
	}, [themeApplique, setTheme]);

	return { theme, themeApplique, setTheme, basculer };
}
