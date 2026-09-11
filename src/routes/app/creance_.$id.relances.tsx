import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EnteteDetail, Page, PageBody, Relances } from '../../ui';

export const Route = createFileRoute('/app/creance_/$id/relances')({ component: PageRelances });

/**
 * CE QUE VOUS POUVEZ LUI ÉCRIRE — les brouillons, sur leur propre page.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ C'EST L'ANALYSE QUI PRENAIT LE PLUS DE PLACE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mesurée sur l'écran de créance : 1 608 px, près de trois écrans de téléphone
 * à elle seule, parce qu'un brouillon dépliait son texte complet. Rabattue à
 * 924 px en refermant tout, elle restait la plus lourde des sept.
 *
 * Un brouillon est un TEXTE — plusieurs paragraphes destinés à être relus puis
 * copiés. Ça ne tient pas dans une carte au milieu d'autres cartes ; ça tient
 * sur une page, et c'est pour ça qu'une messagerie en est une.
 *
 * ⚠️ LA MENTION RESTE EN TÊTE. Le composant la porte lui-même : ces textes
 * partent de la messagerie du créancier, sous sa signature. La déplacer ici
 * ferait deux endroits où le produit dit ce qu'il n'est pas.
 */
function PageRelances() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;
	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/creance/$id"
				retourParametres={{ id }}
				retourLibelle={creance?.debiteur ?? 'Créance'}
				titre="Ce que vous pouvez lui écrire"
				sousTitre="Des brouillons, à envoyer depuis votre messagerie."
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
					{creance === undefined ? (
						<p className="sr-only">Chargement…</p>
					) : (
						<Relances niveaux={creance.relances} />
					)}
				</div>
			</PageBody>
		</Page>
	);
}
