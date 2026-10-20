import { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { useQuery } from '../../app/donnees';
import { ParcoursTrouver } from '../../screens/admin/trouver';

/**
 * Trouver des prospects (annuaire public ou commande publique), puis les ajouter au CRM. Les
 * recherches et les ajouts de fournisseurs tournent en arrière-plan : la route suit le
 * travail lancé, ou celui que la file d'attente rouvre par `?travail=` (20/10/2026).
 */
export const Route = createFileRoute('/admin/prospects/trouver')({
	validateSearch: (recherche: Record<string, unknown>): { travail?: string } =>
		typeof recherche.travail === 'string' ? { travail: recherche.travail } : {},
	component: TrouverAdmin
});

function TrouverAdmin() {
	const navigate = useNavigate();
	const { travail: depuisLaFile } = Route.useSearch();
	const [suivi, setSuivi] = useState<string | null>(depuisLaFile ?? null);
	const travail = useQuery(
		api.admin.travaux.travail,
		suivi === null ? 'skip' : { id: suivi as Id<'travauxEquipe'> }
	);
	const lancerRecherche = useMutation(api.admin.travaux.lancerRecherche);
	const lancerAjoutDecp = useMutation(api.admin.travaux.lancerAjoutDecp);
	const ajouter = useMutation(api.admin.annuaire.ajouter);
	const marquerVu = useMutation(api.admin.travaux.marquerVu);
	const fini = travail?.etat === 'FAIT' || travail?.etat === 'ECHEC';

	// Un résultat montré à l'écran ne se signale plus dans la file.
	useEffect(() => {
		if (suivi !== null && fini) void marquerVu({ id: suivi as Id<'travauxEquipe'> });
	}, [suivi, fini, marquerVu]);

	return (
		<ParcoursTrouver
			onFermer={() => void navigate({ to: '/admin/prospects' })}
			travail={suivi === null ? null : travail}
			suivi={suivi}
			onSuivre={setSuivi}
			onLancerRecherche={(recherche, zone, page) =>
				lancerRecherche(
					recherche.source === 'ANNUAIRE'
						? { source: 'ANNUAIRE', secteur: recherche.secteur, zone, page }
						: { source: 'DECP', acheteurs: recherche.acheteurs, zone, page }
				)
			}
			onAjouter={(secteur, zone, entreprises) =>
				ajouter({ secteur, zone, entreprises: [...entreprises] })
			}
			onLancerAjoutDecp={(acheteurs, zone, titulaires) =>
				lancerAjoutDecp({
					acheteurs,
					zone,
					titulaires: titulaires.map((t) => ({ ...t, acheteurs: [...t.acheteurs] }))
				})
			}
		/>
	);
}
