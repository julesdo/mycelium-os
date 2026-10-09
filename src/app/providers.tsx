import type { ReactNode } from 'react';
import { CladdProvider } from '@cladd-ui/react';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache/provider';
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

/**
 * Combien de temps un abonnement reste ouvert après le départ de l'écran qui le
 * lit : le temps d'ouvrir un dossier et d'en revenir, plusieurs fois.
 */
const DUREE_DU_CACHE_MS = 5 * 60_000;

export function Providers({ children }: { children: ReactNode }) {
	// LE THÈME RÉSOLU, jamais « auto » : Cladd ne connaît que clair et sombre.
	const { themeApplique } = useTheme();

	return (
		<CladdProvider theme={themeApplique} accentColor="brand" overlaysRoot="#root">
			<ConvexBetterAuthProvider client={convex} authClient={authClient}>
				{/* Les abonnements survivent cinq minutes à l'écran qui les lit (`app/donnees.ts`). */}
				<ConvexQueryCacheProvider expiration={DUREE_DU_CACHE_MS}>{children}</ConvexQueryCacheProvider>
			</ConvexBetterAuthProvider>
		</CladdProvider>
	);
}
