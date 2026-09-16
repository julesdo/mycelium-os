import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EcranEtablissement } from '../../screens/parametres/etablissement';

export const Route = createFileRoute('/app/_reglages/parametres_/etablissement')({
	component: PageEtablissement,
	errorComponent: EtablissementEnErreur
});

/** Exportée avec `PageEtablissement` : `/app/parametres` rend la même section par défaut. */
export function EtablissementEnErreur() {
	return <EcranEtablissement donnees={{ etat: 'erreur' }} />;
}

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
export function PageEtablissement() {
	const org = useQuery(api.organizations.getMyOrg, {});
	/*
	  ⚠️ LA MESURE NE RETIENT PAS LA PAGE. Le formulaire s'ouvre avec le nom et le
	  volume déclaré ; la phrase qui dit ce que les imports comptent apparaît
	  quand le compte arrive. Attendre l'un pour l'autre ferait une page blanche
	  pour une ligne d'explication.
	*/
	const mesure = useQuery(api.recouvrement.monEtablissement.volumeEmis, {});
	const mettreAJour = useMutation(api.organizations.updateOrganization);

	return (
		<EcranEtablissement
			donnees={
				org === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur:
								org === null
									? null
									: {
											nom: org.name ?? undefined,
											cle: org._id,
											initial: {
												nom: org.name ?? '',
												factures: org.facturesParAn ? String(org.facturesParAn) : ''
											},
											mesure: mesure ?? null,
											onEnregistrer: mettreAJour
										}
						}
			}
		/>
	);
}
