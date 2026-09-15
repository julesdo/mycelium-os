import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useAction } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { messageDErreur } from '../../screens/equipe/equipe';
import { EcranExport } from '../../screens/donnees/export';
import type { FichierExport } from '../../screens/donnees/types';

export const Route = createFileRoute('/app/donnees_/export')({
	component: PageExport,
	errorComponent: ExportEnErreur
});

function ExportEnErreur() {
	return <EcranExport donnees={{ etat: 'erreur' }} />;
}

/** L'export de vos données, branché sur la base ; le dessin vit dans `screens/donnees/export.tsx`. */
function PageExport() {
	const apercu = useQuery(api.rgpd.apercuDeMesDonnees, {});
	const exporter = useAction(api.rgpd.exporterMesDonnees);

	const [enCours, setEnCours] = useState(false);
	const [fichier, setFichier] = useState<FichierExport | null>(null);
	const [erreur, setErreur] = useState<string | null>(null);

	async function preparer() {
		setEnCours(true);
		setErreur(null);
		try {
			setFichier(await exporter({}));
		} catch (e) {
			setErreur(messageDErreur(e));
		} finally {
			setEnCours(false);
		}
	}

	// La page attend l'inventaire : rendue avant lui, elle montrait l'export à un
	// membre sans la réserve à l'administrateur, qui n'arrivait qu'ensuite.
	return (
		<EcranExport
			donnees={
				apercu === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								reserveAAdmin: apercu !== null && !apercu.estAdmin,
								fichier,
								enCours,
								erreur,
								onPreparer: () => void preparer()
							}
						}
			}
		/>
	);
}
