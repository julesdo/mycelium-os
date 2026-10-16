import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useConvex, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { useQuery } from '../../app/donnees';
import { ParcoursImport } from '../../screens/admin/import';

/** L'import du tableur de prospection, en étapes, sur une page pleine. */
export const Route = createFileRoute('/admin/prospects/importer')({
	component: ImportAdmin
});

function ImportAdmin() {
	const navigate = useNavigate();
	const convex = useConvex();
	const importer = useMutation(api.admin.importer.importer);
	const historique = useQuery(api.admin.importer.historiqueDesImports, {});
	return (
		<ParcoursImport
			onFermer={() => void navigate({ to: '/admin/prospects' })}
			// Une lecture ponctuelle, pas un abonnement : l'aperçu se refait à la demande.
			onVerifier={(lignes, association) =>
				convex.query(api.admin.importer.apercu, { lignes, association })
			}
			onImporter={(fichier, lignes, association) => importer({ fichier, lignes, association })}
			{...(historique === undefined ? {} : { historique })}
		/>
	);
}
