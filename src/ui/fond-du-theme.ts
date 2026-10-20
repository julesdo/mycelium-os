/**
 * LE FOND DE LA PAGE, PAR THÈME : la couleur que prennent la barre d'état et la
 * barre du navigateur (`<meta name="theme-color">`, posées dans `__root.tsx` et
 * accordées par `app/use-theme.ts`). Ce sont les `--cladd-bg` des deux palettes de
 * `tokens.css`, en hexadécimal : la balise ne lit pas le CSS, et ne comprend pas
 * partout `oklch`. Une palette qui change de fond change ces deux valeurs.
 */
export const FOND_DU_THEME = {
	light: '#f7f0e5',
	dark: '#070c19'
} as const satisfies Record<'light' | 'dark', string>;
