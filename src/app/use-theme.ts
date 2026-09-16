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
	`var t=c==='light'?'light':c==='auto'?(window.matchMedia('${SOMBRE_AU_SYSTEME}').matches?'dark':'light'):'dark';`,
	"var r=document.documentElement;r.classList.toggle('dark',t==='dark');r.classList.toggle('light',t==='light');",
	'}catch(e){}})();'
].join('');

/**
 * Sombre par défaut, clair ou automatique au choix, préférence persistée.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI LE DÉFAUT EST SOMBRE, ET LE RESTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Automatique » a été le défaut pendant une journée, le 16 septembre 2026.
 * Le regard au navigateur l'a retiré le jour même : LE THÈME CLAIR N'EXISTE
 * PAS ENCORE. Les quatre classes `verre-*`, employées à 95 endroits, portent
 * des couleurs sombres écrites en dur, et aucune règle `.light` ne les
 * reprend. Mesuré sur la liste des débiteurs, en clair, à 375 px : le nom d'un
 * débiteur et son montant tombent à 1,92:1, un titre de section à 1,24:1, une
 * puce d'alerte à 1,10:1. Le minimum lisible est de 4,5:1.
 *
 * Suivre le système revenait donc à servir une interface illisible à tout
 * gérant dont l'appareil est en clair, sans qu'il ait rien demandé. Le défaut
 * reste sombre tant que la palette claire n'est pas écrite.
 *
 * ⚠️ LES PRÉFÉRENCES DÉJÀ ENREGISTRÉES SONT CONSERVÉES. `auto` et `light`
 * restent des valeurs valides : qui a choisi garde son choix.
 */
export function useTheme() {
	const [theme, setTheme] = usePreference<Theme>(CLE, 'dark', THEMES);

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
