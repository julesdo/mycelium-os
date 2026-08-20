import type { ReactNode } from 'react';
import { CladdProvider } from '@cladd-ui/react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { convex } from '../lib/client/convex';
import { authClient } from '../lib/client/auth';
import { useTheme } from './use-theme';

/**
 * Aucun défaut de taille n'est imposé ici.
 *
 * La version précédente forçait `size="lg"` sur tous les contrôles pour
 * atteindre le plancher tactile de 48px. La documentation de Cladd l'interdit
 * en toutes lettres — « Don't default to `lg` everywhere », « When in doubt,
 * `md` » — et pour une bonne raison : les tailles se répondent entre elles
 * (un chip s'ajuste à la hauteur du bouton qui le contient), et forcer un cran
 * partout casse cette arithmétique.
 *
 * Le plancher se règle à sa vraie place, dans l'échelle elle-même
 * (src/styles/tokens.css) : `md` y vaut 48px. Les défauts du kit tombent donc
 * juste sans qu'on ait à les contredire.
 */

export function Providers({ children }: { children: ReactNode }) {
	const { theme } = useTheme();

	return (
		<CladdProvider
			theme={theme}
			accentColor="brand"
			overlaysRoot="#root"
		>
			<ConvexBetterAuthProvider client={convex} authClient={authClient}>
				{children}
			</ConvexBetterAuthProvider>
		</CladdProvider>
	);
}
