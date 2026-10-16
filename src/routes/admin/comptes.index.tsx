import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { api } from '../../lib/convex/_generated/api';
import { useQuery } from '../../app/donnees';
import { usePreference } from '../../app/use-preference';
import { useHorlogeAdmin } from '../../app/coquille-admin';
import {
	AFFICHAGES_COMPTES,
	EcranComptes,
	VUES_COMPTES,
	type AffichageComptes,
	type VueComptes
} from '../../screens/admin/comptes';

const CLES_AFFICHAGE = AFFICHAGES_COMPTES.map((a) => a.cle);

/**
 * Les comptes clients. La vue et la présentation se gardent dans l'adresse : un lien
 * de la barre latérale mène à « À appeler » ou à l'entonnoir, et se partage.
 */
export const Route = createFileRoute('/admin/comptes/')({
	validateSearch: (
		recherche: Record<string, unknown>
	): { vue?: VueComptes; affichage?: AffichageComptes } => ({
		...(VUES_COMPTES.some((v) => v.cle === recherche.vue)
			? { vue: recherche.vue as VueComptes }
			: {}),
		...(CLES_AFFICHAGE.includes(recherche.affichage as AffichageComptes)
			? { affichage: recherche.affichage as AffichageComptes }
			: {})
	}),
	component: ComptesAdmin
});

function ComptesAdmin() {
	const { vue = 'TOUS', affichage: affichageDeLAdresse } = Route.useSearch();
	const navigate = useNavigate({ from: '/admin/comptes/' });
	const [prefere, setPrefere] = usePreference('letikette:admin-comptes', 'tableau', CLES_AFFICHAGE);
	const affichage = affichageDeLAdresse ?? prefere;
	const [terme, setTerme] = useState('');
	const horloge = useHorlogeAdmin();
	const comptes = useQuery(api.admin.comptes.liste, { vue });
	return (
		<EcranComptes
			lecture={
				comptes === undefined || horloge === null
					? { etat: 'attente' }
					: { etat: 'pret', valeur: comptes }
			}
			vue={vue}
			onVue={(v) =>
				void navigate({
					search: (s) => ({ ...s, vue: v === 'TOUS' ? undefined : v }),
					replace: true
				})
			}
			affichage={affichage}
			onAffichage={(a) => {
				setPrefere(a);
				void navigate({ search: (s) => ({ ...s, affichage: a }), replace: true });
			}}
			terme={terme}
			onTerme={setTerme}
			maintenant={horloge?.maintenant ?? 0}
		/>
	);
}
