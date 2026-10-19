import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { ParcoursTrouver } from '../../screens/admin/trouver';

/** Trouver des prospects (annuaire public ou commande publique), puis les ajouter au CRM. */
export const Route = createFileRoute('/admin/prospects/trouver')({
	component: TrouverAdmin
});

function TrouverAdmin() {
	const navigate = useNavigate();
	const chercher = useAction(api.admin.annuaire.chercher);
	const ajouter = useMutation(api.admin.annuaire.ajouter);
	const chercherDecp = useAction(api.admin.decp.chercherDecp);
	const ajouterDecp = useAction(api.admin.decp.ajouterDecp);
	return (
		<ParcoursTrouver
			onFermer={() => void navigate({ to: '/admin/prospects' })}
			onChercher={(secteur, zone, page) => chercher({ secteur, zone, page })}
			onAjouter={(secteur, zone, entreprises) =>
				ajouter({ secteur, zone, entreprises: [...entreprises] })
			}
			onChercherDecp={(acheteurs, zone, page) => chercherDecp({ acheteurs, zone, page })}
			onAjouterDecp={(acheteurs, zone, titulaires) =>
				ajouterDecp({
					acheteurs,
					zone,
					titulaires: titulaires.map((t) => ({ ...t, acheteurs: [...t.acheteurs] }))
				})
			}
		/>
	);
}
