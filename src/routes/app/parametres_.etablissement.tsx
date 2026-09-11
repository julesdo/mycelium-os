import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EnteteDetail, Page, PageBody } from '../../ui';
import { FormulaireEtablissement } from '../../screens/parametres/etablissement';

export const Route = createFileRoute('/app/parametres_/etablissement')({
	component: PageEtablissement
});

/**
 * VOTRE ÉTABLISSEMENT — le formulaire, sur sa propre page.
 *
 * ⚠️ ON N'OUVRE PAS LES RÉGLAGES POUR REMPLIR UN FORMULAIRE, on les ouvre pour
 * ATTEINDRE quelque chose. Deux formulaires dépliés y vivaient en même temps —
 * celui-ci et celui du créancier — et le second mesure à lui seul 2,99 écrans
 * de défilement à 375 px. La liste dit ce qui est réglé, la page règle.
 *
 * ⚠️ ET LA `key` SUR L'IDENTIFIANT RESTE. C'est elle qui réinitialise les champs
 * quand le gérant change d'établissement, sans effet de synchronisation.
 */
function PageEtablissement() {
	const org = useQuery(api.organizations.getMyOrg, {});
	const mettreAJour = useMutation(api.organizations.updateOrganization);

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/parametres"
				retourLibelle="Réglages"
				titre="Votre établissement"
				sousTitre={org?.name ?? undefined}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-2xs">
					{org === undefined ? (
						<p className="text-cladd-xs text-cladd-fg-soft">Chargement…</p>
					) : org === null ? (
						<p className="text-cladd-xs text-cladd-fg-soft">
							Aucun établissement actif. Créez-en un pour le régler.
						</p>
					) : (
						<FormulaireEtablissement
							key={org._id}
							initial={{
								nom: org.name ?? '',
								factures: org.facturesParAn ? String(org.facturesParAn) : '',
								siret: org.siret ?? ''
							}}
							onEnregistrer={mettreAJour}
						/>
					)}
				</div>
			</PageBody>
		</Page>
	);
}
