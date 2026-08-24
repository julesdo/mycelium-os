import { useCallback, useEffect } from 'react';
import { usePreference } from './use-preference';

export type Theme = 'light' | 'dark';

const CLE = 'letikette-theme';
const THEMES = ['light', 'dark'] as const;

/**
 * Clair par défaut, sombre disponible, préférence persistée.
 *
 * Cladd est conçu dark-first, et c'est de là que vient son allure. Mais
 * l'utilisateur de Letikette est un gérant de cantine, sur tablette, en bureau
 * ou en cuisine, souvent en plein jour et devant un écran à fort reflet. Le
 * clair par défaut est un choix de contexte d'usage, pas de goût.
 */
export function useTheme() {
	const [theme, setTheme] = usePreference<Theme>(CLE, 'light', THEMES);

	// Cladd sélectionne ses palettes sur les classes `.light` / `.dark` de la
	// racine du document. Cet effet ne fait que refléter l'état, il n'en crée
	// aucun : il ne déclenche donc pas de rendu.
	useEffect(() => {
		const racine = document.documentElement;
		racine.classList.toggle('dark', theme === 'dark');
		racine.classList.toggle('light', theme === 'light');
	}, [theme]);

	const basculer = useCallback(() => {
		setTheme(theme === 'dark' ? 'light' : 'dark');
	}, [theme, setTheme]);

	return { theme, setTheme, basculer };
}
