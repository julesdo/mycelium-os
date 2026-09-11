import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { BilanImport, EnteteDetail, Page, PageBody } from '../../ui';

export const Route = createFileRoute('/app/import-factures_/$id')({ component: PageDepot });

/**
 * LE BILAN D'UN DÉPÔT — une page, plus une carte dans une pile.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CETTE PAGE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le bilan d'UN SEUL dépôt mesure 1,87 écran de défilement à 375 px : ce qui
 * est entré, ce qui a été écarté à bon droit, et ce qui n'a PAS pu être lu,
 * ligne par ligne avec sa raison. L'écran d'import les empilait tous — et un
 * gérant qui importe chaque mois en accumule douze par an.
 *
 * La liste dit ce qui est entré ; la page dit ce qui manque. C'est justement la
 * seconde moitié qui compte : « 198 factures créées » sans mentionner les deux
 * lignes écartées ment par omission, et l'omission porte précisément sur
 * l'argent qu'on ne réclamera pas.
 *
 * ⚠️ ELLE SE MET À JOUR SEULE. La requête est réactive : un dépôt en cours de
 * lecture affiche son étape et bascule sur son bilan sans rechargement. C'est
 * la règle d'écran n° 2 — tout traitement se voit sans qu'on le demande.
 */
function PageDepot() {
	const { id } = Route.useParams();
	const importId = id as Id<'importsRecouvrement'>;
	const depot = useQuery(api.recouvrement.depotMutations.suivreImport, { importId });

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/import-factures"
				retourLibelle="Importer"
				titre={depot?.filename ?? 'Dépôt'}
				sousTitre={depot?.etape ?? undefined}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-2xs">
					{depot === undefined ? (
						<p className="text-cladd-xs text-cladd-fg-soft">Chargement…</p>
					) : (
						<BilanImport
							depot={{
								id,
								filename: depot.filename,
								statut: depot.statut,
								etape: depot.etape,
								erreur: depot.erreur,
								// ⚠️ PAS DE DATE DE DÉPÔT. Le suivi ne la rend pas : elle est déjà
								// sur la rangée d'où l'on vient. La fabriquer avec `Date.now()`
								// aurait affiché la date du JOUR sur un dépôt de l'an dernier.
								bilan: depot.bilan
							}}
						/>
					)}
				</div>
			</PageBody>
		</Page>
	);
}
