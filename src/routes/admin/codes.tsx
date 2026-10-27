import { createFileRoute, Navigate } from '@tanstack/react-router';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { useQuery } from '../../app/donnees';
import { usePlumeDit } from '../../app/parole-de-plume';
import { permis, useRoleAdmin } from '../../app/coquille-admin';
import { EcranCodes } from '../../screens/admin/codes';

/** Les codes privilèges : créer, montrer une fois, révoquer. Fondateur seulement. */
export const Route = createFileRoute('/admin/codes')({
	component: CodesAdmin
});

function CodesAdmin() {
	const role = useRoleAdmin();
	if (!permis(role, 'FONDATEUR')) return <Navigate to="/admin" replace />;
	return <CodesDuFondateur />;
}

function CodesDuFondateur() {
	const codes = useQuery(api.admin.codes.lister, {});
	const comptes = useQuery(api.admin.codes.comptes, {});
	const creer = useAction(api.admin.codes.creer);
	const revoquer = useMutation(api.admin.codes.revoquer);
	const dire = usePlumeDit();
	return (
		<EcranCodes
			lecture={codes === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: codes }}
			comptes={comptes ?? []}
			onCreer={(creation) =>
				creer({ ...creation, compte: creation.compte as Id<'organizations'> | null })
			}
			onRevoquer={async (id) => {
				await revoquer({ id: id as Id<'codesPrivilege'> });
				dire({ titre: 'Code révoqué', texte: 'Il ne sert plus, et c’est noté au journal.' });
			}}
		/>
	);
}
