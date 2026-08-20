import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const CLE = 'mycelium-theme';

/**
 * Clair par défaut, sombre disponible, préférence persistée.
 *
 * Cladd est conçu dark-first, et c'est de là que vient son allure. Mais
 * l'utilisateur de Mycelium est un gérant de cantine, sur tablette, en bureau
 * ou en cuisine, souvent en plein jour et devant un écran à fort reflet. Le
 * clair par défaut est un choix de contexte d'usage, pas de goût.
 */
export function useTheme() {
	const [theme, setThemeState] = useState<Theme>('light');

	// La lecture se fait après le montage : `localStorage` n'existe pas au
	// rendu serveur, et lire une préférence pendant l'hydratation ferait
	// diverger le HTML du serveur de celui du client.
	useEffect(() => {
		const stocke = localStorage.getItem(CLE);
		if (stocke === 'light' || stocke === 'dark') setThemeState(stocke);
	}, []);

	useEffect(() => {
		const racine = document.documentElement;
		racine.classList.toggle('dark', theme === 'dark');
		racine.classList.toggle('light', theme === 'light');
	}, [theme]);

	const setTheme = useCallback((t: Theme) => {
		localStorage.setItem(CLE, t);
		setThemeState(t);
	}, []);

	const basculer = useCallback(() => {
		setTheme(theme === 'dark' ? 'light' : 'dark');
	}, [theme, setTheme]);

	return { theme, setTheme, basculer };
}
