import { useState } from 'react';
import { createFileRoute, Navigate } from '@tanstack/react-router';
import { api } from '../../lib/convex/_generated/api';
import { useQuery } from '../../app/donnees';
import { permis, useHorlogeAdmin, useRoleAdmin } from '../../app/coquille-admin';
import { EcranJournal } from '../../screens/admin/journal';

/** Le journal de l'équipe, filtrable par membre. Fondateur seulement. */
export const Route = createFileRoute('/admin/journal')({
	component: JournalAdmin
});

function JournalAdmin() {
	const role = useRoleAdmin();
	if (!permis(role, 'FONDATEUR')) return <Navigate to="/admin" replace />;
	return <JournalDuFondateur />;
}

function JournalDuFondateur() {
	const [auteur, setAuteur] = useState<string | null>(null);
	const horloge = useHorlogeAdmin();
	const journal = useQuery(api.admin.equipe.journal, auteur === null ? {} : { auteur });
	const membres = useQuery(api.admin.equipe.adresses, {});
	return (
		<EcranJournal
			lecture={
				journal === undefined || horloge === null
					? { etat: 'attente' }
					: { etat: 'pret', valeur: journal }
			}
			auteur={auteur}
			onAuteur={setAuteur}
			membres={membres ?? []}
			maintenant={horloge?.maintenant ?? 0}
		/>
	);
}
