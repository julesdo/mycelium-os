import { useState } from 'react';
import { createFileRoute, Outlet, useChildMatches, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranImport, modeDuFichier } from '../../screens/import/depots';

export const Route = createFileRoute('/app/import-factures')({
	component: ImportFactures,
	errorComponent: ImportEnErreur
});

function ImportEnErreur() {
	return <EcranImport donnees={{ etat: 'erreur' }} detail={null} depotOuvert={null} />;
}

/** L'import, branché sur la base ; le dessin vit dans `screens/import/depots.tsx`. */
function ImportFactures() {
	const [envoiEnCours, setEnvoiEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	const navigate = useNavigate();

	/** Vrai quand l'adresse ouvre le bilan d'un dépôt, rendu à droite par l'`Outlet`. */
	const bilanOuvert = useChildMatches({ select: (enfants) => enfants.length > 0 });
	/**
	 * LE DÉPÔT OUVERT, LU SUR LA FEUILLE.
	 *
	 * ⚠️ PAS `useParams({ strict: false })`, QUI REND LES PARAMÈTRES DE LA
	 * CORRESPONDANCE LA PLUS PROCHE, c'est-à-dire ceux de cette route-ci, qui n'en
	 * a aucun. `depotOuvert` valait donc toujours `null` : sous 1024 px le volet
	 * droit restait fermé, et toucher une rangée ramenait la liste.
	 */
	const depotOuvert = useChildMatches({
		select: (enfants) => (enfants.at(-1)?.params as { id?: string } | undefined)?.id ?? null
	});

	const imports = useQuery(api.recouvrement.depotMutations.listerImports, {});
	const genererUrl = useMutation(api.recouvrement.depotMutations.genererUrlDepot);
	const enregistrer = useMutation(api.recouvrement.depotMutations.enregistrerFichier);

	/**
	 * L'ENVOI, PUIS LE BILAN DU SEUL FICHIER DÉPOSÉ.
	 *
	 * ⚠️ `enregistrerFichier` REND L'IDENTIFIANT DU DÉPÔT, ET LA ROUTE L'IGNORAIT.
	 * Après avoir déposé un fichier, le gérant restait sur la liste et devait
	 * repérer la bonne rangée pour voir ce qui avait été lu et ce qui avait été
	 * écarté — alors que la page du bilan est réactive et passe seule de l'étape
	 * au bilan (règle d'écran n° 2).
	 *
	 * Un seul fichier, donc, et sans erreur : à plusieurs, aucune page ne les
	 * représente tous, et la liste reste le bon endroit.
	 *
	 * ⚠️ APRÈS LA BOUCLE, JAMAIS DEDANS : naviguer au premier tour démonterait
	 * l'écran et les fichiers suivants ne partiraient pas.
	 */
	async function deposer(fichiers: File[]) {
		setEnvoiEnCours(true);
		setErreur(null);
		let aOuvrir: Id<'importsRecouvrement'> | null = null;
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
				const importId = await enregistrer({
					storageId,
					filename: fichier.name,
					mimeType: fichier.type || 'application/octet-stream',
					// Le chemin se déduit du fichier : plus rien à choisir avant l'envoi.
					mode: modeDuFichier(fichier)
				});
				aOuvrir = fichiers.length === 1 ? importId : null;
			}
		} catch (e) {
			setErreur(e instanceof Error ? e.message : 'Le dépôt a échoué.');
			// Un envoi interrompu reste sur la liste, où le bandeau d'erreur s'affiche.
			aOuvrir = null;
		} finally {
			setEnvoiEnCours(false);
		}

		if (aOuvrir !== null) {
			await navigate({ to: '/app/import-factures/$id', params: { id: aOuvrir } });
		}
	}

	return (
		<EcranImport
			detail={bilanOuvert ? <Outlet /> : null}
			depotOuvert={depotOuvert}
			donnees={
				imports === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								imports,
								envoiEnCours,
								erreur,
								onDeposer: (fichiers) => void deposer(fichiers)
							}
						}
			}
		/>
	);
}
