import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { authClient } from '../../lib/client/auth';
import { Page, PageHeader, PageBody } from '../../ui';
import { Donnees } from '../../screens/donnees/donnees';

export const Route = createFileRoute('/app/donnees')({ component: EcranDonnees });

/**
 * L'écran « Vos données ».
 *
 * Il tient les trois promesses de la section 10 de la politique de
 * confidentialité — accès, portabilité, effacement — qui n'étaient adossées à
 * aucun code. Voir l'en-tête de `src/lib/convex/rgpd.ts` pour les trois
 * décisions qui structurent le backend correspondant.
 *
 * APRÈS UNE SUPPRESSION DE COMPTE, ON DÉCONNECTE. La session reste
 * cryptographiquement valide quelques instants après que l'identité a disparu :
 * sans déconnexion explicite, l'utilisateur se retrouve dans une application qui
 * lui répond « accès refusé » partout, ce qui se lit comme une panne plutôt que
 * comme le résultat qu'il a demandé.
 */
function EcranDonnees() {
	const navigate = useNavigate();
	const apercu = useQuery(api.rgpd.apercuDeMesDonnees, {});
	const compte = useQuery(api.auth.getCurrentUser, {});
	const exporter = useAction(api.rgpd.exporterMesDonnees);
	const supprimerEtablissement = useMutation(api.rgpd.supprimerEtablissement);
	const supprimerCompte = useMutation(api.rgpd.supprimerMonCompte);

	if (apercu === undefined || compte === undefined) {
		return (
			<Page>
				<PageHeader titre="Vos données" />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	if (apercu === null) {
		return (
			<Page>
				<PageHeader titre="Vos données" />
				<PageBody>
					<p className="text-cladd-xs text-cladd-fg-soft">
						Aucun établissement actif. Créez-en un pour voir ce que nous détenons.
					</p>
				</PageBody>
			</Page>
		);
	}

	return (
		<Page>
			<PageHeader
				titre="Vos données"
				sousTitre="Ce que nous détenons, ce que vous pouvez en emporter, ce que vous pouvez en effacer."
			/>
			<PageBody>
				<Donnees
					apercu={apercu}
					emailDuCompte={compte?.email ?? ''}
					onExporter={() => exporter({})}
					onSupprimerEtablissement={async (confirmation) => {
						await supprimerEtablissement({ confirmation });
						await navigate({ to: '/bienvenue' });
					}}
					onSupprimerCompte={async (confirmation) => {
						await supprimerCompte({ confirmation });
						await authClient.signOut();
						await navigate({ to: '/' });
					}}
				/>
			</PageBody>
		</Page>
	);
}
