import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EnteteDetail, Page, PageBody, euros } from '../../ui';
import { Offre } from '../../screens/abonnement/offre';

export const Route = createFileRoute('/app/abonnement_/suivi')({ component: PageSuivi });

/**
 * L'ABONNEMENT — l'offre, dépliée.
 *
 * ⚠️ ELLE EST RECOMMANDÉE, ET C'EST UNE PRÉFÉRENCE ASSUMÉE, pas un verdict :
 * le produit est le MÊME à tous les paliers, seul le prix change. La pastille
 * dit lequel des deux chemins tient le chiffre à jour toute l'année.
 */
function PageSuivi() {
	const etat = useQuery(api.billing.etatAbonnement, {});

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/abonnement"
				retourLibelle="Abonnement"
				titre="L’abonnement"
				sousTitre={etat ? `Palier ${etat.palier} — ${etat.bornesPalier}` : undefined}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-2xs">
					{etat === undefined || etat === null ? (
						<p className="text-cladd-sm text-cladd-fg-soft">Chargement…</p>
					) : (
						<Offre
							titre="L’abonnement"
							prix={euros(etat.tarifs.abonnementMensuel)}
							cadence="par mois"
							description="Votre chiffre reste à jour toute l’année, et votre déclaration de mars est prête avant mars."
							colonne="abonnement"
							actif={etat.tier === 'procedures'}
							recommande
						/>
					)}
				</div>
			</PageBody>
		</Page>
	);
}
