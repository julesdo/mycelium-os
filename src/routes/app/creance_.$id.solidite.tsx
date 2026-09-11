import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EnteteDetail, Page, PageBody, Solidite } from '../../ui';

export const Route = createFileRoute('/app/creance_/$id/solidite')({ component: PageSolidite });

/**
 * CE QUE LES PIÈCES ÉTABLISSENT — une page, plus une carte.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE PAGE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'analyse tenait dans une carte de l'écran de créance, avec ses quatre
 * étages et leurs phrases. Six autres analyses faisaient pareil : 6,1 écrans de
 * défilement, mesurés, et un lecteur qui ne trouve plus le chiffre qu'il
 * cherchait.
 *
 * Une application mobile résume en une RANGÉE — « Solidité · 2 pièces sur 4 › »
 * — et pousse ici quand on veut savoir lesquelles. Le raisonnement n'est pas
 * perdu : il est à un geste de distance, et il a enfin la place de se lire.
 *
 * ⚠️ LA PAGE NE RECALCULE RIEN. Elle affiche la même `solidite` que la rangée
 * résume, venue de la même requête. Deux lectures du même fait finiraient par
 * diverger, et c'est le genre d'écart qu'on ne voit qu'en les comparant côte à
 * côte — ce que personne ne fait.
 */
function PageSolidite() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;
	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/creance/$id"
				retourParametres={{ id }}
				retourLibelle={creance?.debiteur ?? 'Créance'}
				// Pas de sous-titre : la carte porte déjà le compte, en toutes lettres
				// ET en fraction. Le répéter en en-tête fait lire trois fois la même
				// chose avant d'arriver au contenu.
				titre="Ce que les pièces établissent"
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
					{creance === undefined ? (
						<p className="sr-only">Chargement…</p>
					) : (
						<Solidite solidite={creance.solidite} />
					)}
				</div>
			</PageBody>
		</Page>
	);
}
