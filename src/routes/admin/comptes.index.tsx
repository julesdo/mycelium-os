import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { api } from '../../lib/convex/_generated/api';
import { useQuery } from '../../app/donnees';
import { useHorlogeAdmin } from '../../app/coquille-admin';
import { EcranComptes, VUES_COMPTES, type VueComptes } from '../../screens/admin/comptes';

/** Les comptes clients, en vues ; la vue choisie se garde dans l'adresse. */
export const Route = createFileRoute('/admin/comptes/')({
	validateSearch: (recherche: Record<string, unknown>): { vue?: VueComptes } =>
		VUES_COMPTES.some((v) => v.cle === recherche.vue) ? { vue: recherche.vue as VueComptes } : {},
	component: ComptesAdmin
});

function ComptesAdmin() {
	const { vue = 'TOUS' } = Route.useSearch();
	const navigate = useNavigate({ from: '/admin/comptes/' });
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
			onVue={(v) => void navigate({ search: v === 'TOUS' ? {} : { vue: v }, replace: true })}
			terme={terme}
			onTerme={setTerme}
			maintenant={horloge?.maintenant ?? 0}
		/>
	);
}
