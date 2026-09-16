import { useState } from 'react';
import { createFileRoute, Outlet, useChildMatches, useParams } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranImport, type ModeDepot } from '../../screens/import/depots';

export const Route = createFileRoute('/app/import-factures')({
	component: ImportFactures,
	errorComponent: ImportEnErreur
});

function ImportEnErreur() {
	return <EcranImport donnees={{ etat: 'erreur' }} detail={null} depotOuvert={null} />;
}

/** L'import, branché sur la base ; le dessin vit dans `screens/import/depots.tsx`. */
function ImportFactures() {
	const [mode, setMode] = useState<ModeDepot>('EXPORT_COMPTABLE');
	const [envoiEnCours, setEnvoiEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	/** Vrai quand l'adresse ouvre le bilan d'un dépôt, rendu à droite par l'`Outlet`. */
	const bilanOuvert = useChildMatches({ select: (enfants) => enfants.length > 0 });
	/** Le dépôt de ce bilan : son `$id` appartient à la route enfant. */
	const { id: depotOuvert } = useParams({ strict: false });

	const imports = useQuery(api.recouvrement.depotMutations.listerImports, {});
	const genererUrl = useMutation(api.recouvrement.depotMutations.genererUrlDepot);
	const enregistrer = useMutation(api.recouvrement.depotMutations.enregistrerFichier);

	async function deposer(fichiers: File[]) {
		setEnvoiEnCours(true);
		setErreur(null);
		try {
			for (const fichier of fichiers) {
				const url = await genererUrl({});
				const reponse = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': fichier.type || 'application/octet-stream' },
					body: fichier
				});
				if (!reponse.ok) throw new Error(`L’envoi de ${fichier.name} a échoué.`);

				const { storageId } = (await reponse.json()) as { storageId: Id<'_storage'> };
				await enregistrer({
					storageId,
					filename: fichier.name,
					mimeType: fichier.type || 'application/octet-stream',
					mode
				});
			}
		} catch (e) {
			setErreur(e instanceof Error ? e.message : 'Le dépôt a échoué.');
		} finally {
			setEnvoiEnCours(false);
		}
	}

	return (
		<EcranImport
			detail={bilanOuvert ? <Outlet /> : null}
			depotOuvert={bilanOuvert ? (depotOuvert ?? null) : null}
			donnees={
				imports === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								imports,
								mode,
								onChoisirMode: setMode,
								envoiEnCours,
								erreur,
								onDeposer: (fichiers) => void deposer(fichiers)
							}
						}
			}
		/>
	);
}
