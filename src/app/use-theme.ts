import { useCallback, useEffect } from 'react';
import { usePreference } from './use-preference';

export type Theme = 'light' | 'dark';

const CLE = 'letikette-theme';
const THEMES = ['light', 'dark'] as const;

/**
 * Sombre par défaut, clair disponible, préférence persistée.
 *
 * ⚠️ LE DÉFAUT A CHANGÉ, ET LA RAISON N'EST PAS ESTHÉTIQUE. Le clair se
 * justifiait par un utilisateur qui n'existe plus : un responsable de cuisine,
 * sur tablette, en plein jour devant un écran à reflets. Depuis le pivot vers
 * le recouvrement, celui qui ouvre Letikette est un dirigeant ou un comptable,
 * assis, sur un écran de bureau, et il y passe des heures d'affilée.
 *
 * Le clair reste servi et entretenu — un comptable qui imprime ou qui travaille
 * près d'une fenêtre le voudra — et la préférence est persistée. Ce qui change,
 * c'est ce qu'on montre à quelqu'un qui n'a rien demandé.
 */
export function useTheme() {
	const [theme, setTheme] = usePreference<Theme>(CLE, 'dark', THEMES);

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
