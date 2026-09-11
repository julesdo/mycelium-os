import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EnteteDetail, HabitudePaiement, Page, PageBody, aujourdHuiISO } from '../../ui';

export const Route = createFileRoute('/app/debiteurs_/$id/habitude')({ component: PageHabitude });

/**
 * COMMENT CE CLIENT PAIE D'HABITUDE.
 *
 * ⚠️ C'EST UNE STATISTIQUE, ET ELLE A BESOIN D'ÊTRE LUE. Le délai médian, la
 * dispersion, la taille de l'échantillon, puis chaque rupture avec son écart :
 * ça ne se résume pas à un chiffre dans une carte au milieu d'un volet, et
 * c'est précisément le genre d'analyse qu'on ouvre quand on se demande si un
 * retard est un accident ou un signal.
 *
 * ⚠️ ET UN HISTORIQUE TROP COURT SE DIT. Le module est inopérant sur un client
 * nouveau ; le produit l'annonce au lieu de faire semblant, parce qu'une
 * habitude calculée sur trois règlements n'est pas une habitude.
 */
function PageHabitude() {
	const { id } = Route.useParams();
	const debiteurId = id as Id<'debiteurs'>;

	const debiteurs = useQuery(api.recouvrement.lecture.listerDebiteurs, {});
	const comportement = useQuery(api.recouvrement.comportement.lire, {
		debiteurId,
		aujourdHui: aujourdHuiISO()
	});

	const debiteur = debiteurs?.find((d) => d._id === debiteurId);

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/debiteurs"
				retourRecherche={{ d: id }}
				retourLibelle={debiteur?.denomination ?? 'Débiteurs'}
				titre="Comment il paie d’habitude"
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
					{comportement === undefined ? (
						<p className="sr-only">Chargement…</p>
					) : (
						<HabitudePaiement habitude={comportement.habitude} ruptures={comportement.ruptures} />
					)}
				</div>
			</PageBody>
		</Page>
	);
}
