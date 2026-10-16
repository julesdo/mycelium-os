import { createFileRoute } from '@tanstack/react-router';
import { api } from '../../lib/convex/_generated/api';
import { useQuery } from '../../app/donnees';
import { MenuAdmin, useCocherTache, useHorlogeAdmin, useRoleAdmin } from '../../app/coquille-admin';
import { EcranAujourdhuiAdmin } from '../../screens/admin/aujourdhui';

/** Aujourd'hui, dans l'admin : les tâches du jour, les comptes à appeler, les derniers inscrits. */
export const Route = createFileRoute('/admin/')({
	component: AujourdhuiAdmin
});

function AujourdhuiAdmin() {
	const role = useRoleAdmin();
	const horloge = useHorlogeAdmin();
	const resume = useQuery(api.admin.aujourdhui.resume, {});
	const cocher = useCocherTache();
	return (
		<EcranAujourdhuiAdmin
			lecture={
				resume === undefined || horloge === null
					? { etat: 'attente' }
					: { etat: 'pret', valeur: resume }
			}
			maintenant={horloge?.maintenant ?? 0}
			debutDuJour={horloge?.debutDuJour ?? 0}
			finDuJour={horloge?.finDuJour ?? 0}
			onCocher={cocher}
			actions={<MenuAdmin role={role} />}
		/>
	);
}
