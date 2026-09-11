import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EnteteDetail, Page, PageBody, euros } from '../../ui';
import { Offre } from '../../screens/abonnement/offre';

export const Route = createFileRoute('/app/abonnement_/premier-bilan')({ component: PageBilan });

/**
 * LE PREMIER BILAN — l'offre, dépliée.
 *
 * ⚠️ UNE OFFRE NE SE COMPARE PAS EN FAISANT DÉFILER. Les deux cartes portaient
 * chacune leur prix, leur description et la liste complète de ce qui est
 * inclus ; empilées sur un téléphone, elles faisaient l'essentiel des 6,76
 * écrans de défilement de l'écran d'abonnement.
 *
 * ⚠️ ET LE PRIX VIENT DU SERVEUR. Le palier dépend du volume déclaré, et un
 * palier calculé dans le navigateur se falsifie pour payer le tarif d'en
 * dessous. `etatAbonnement` le renvoie déjà résolu.
 */
function PageBilan() {
	const etat = useQuery(api.billing.etatAbonnement, {});

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/abonnement"
				retourLibelle="Abonnement"
				titre="Le premier bilan"
				sousTitre={etat ? `Palier ${etat.palier} — ${etat.bornesPalier}` : undefined}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-2xs">
					{etat === undefined || etat === null ? (
						<p className="text-cladd-sm text-cladd-fg-soft">Chargement…</p>
					) : (
						<Offre
							titre="Le premier bilan"
							prix={euros(etat.tarifs.bilan)}
							cadence="une fois"
							description="Douze mois de factures lus en une fois. Vous saurez où vous en êtes, et ce qu’il manque, en euros."
							colonne="bilan"
							actif={etat.tier === 'suivi'}
						/>
					)}
				</div>
			</PageBody>
		</Page>
	);
}
