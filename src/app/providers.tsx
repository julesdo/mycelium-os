import type { ReactNode } from 'react';
import { CladdProvider } from '@cladd-ui/react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { convex } from '../lib/client/convex';
import { authClient } from '../lib/client/auth';
import { useTheme } from './use-theme';

/**
 * Le plancher tactile de 48px, posé une seule fois pour tout le produit.
 *
 * Cladd expose `defaults` précisément pour cet usage, ce qui évite de forker
 * un seul de ses composants. Les contrôles qu'on touche partent à `lg`, qui
 * vaut 48px depuis le retunage de l'échelle (src/styles/tokens.css). Les
 * surfaces qu'on lit sans les toucher, lignes de tableau et puces, gardent la
 * densité serrée de Cladd en demandant explicitement `sm` ou `md`.
 */
const DEFAUTS_TACTILES = {
	Button: { size: 'lg' },
	Input: { size: 'lg' },
	Select: { size: 'lg' },
	NumberField: { size: 'lg' },
	// Cladd plafonne volontairement ces deux-la : CheckboxSize s'arrete a 'md'
	// et SwitchSize aussi. On prend leur maximum. La cible tactile de 48px est
	// alors portee par le label cliquable qui les entoure, pas par la case.
	Checkbox: { size: 'md' },
	Switch: { size: 'md' }
} as const;

export function Providers({ children }: { children: ReactNode }) {
	const { theme } = useTheme();

	return (
		<CladdProvider
			theme={theme}
			accentColor="brand"
			overlaysRoot="#root"
			defaults={DEFAUTS_TACTILES}
		>
			<ConvexBetterAuthProvider client={convex} authClient={authClient}>
				{children}
			</ConvexBetterAuthProvider>
		</CladdProvider>
	);
}
