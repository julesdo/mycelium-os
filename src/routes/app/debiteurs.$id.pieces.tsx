import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranPieces } from '../../screens/debiteur/pieces';

export const Route = createFileRoute('/app/debiteurs/$id/pieces')({
	component: PagePieces,
	errorComponent: PiecesEnErreur
});

function PiecesEnErreur() {
	const { id } = Route.useParams();
	return <EcranPieces identifiant={id} donnees={{ etat: 'erreur' }} />;
}

/**
 * Branchée sur la base ; le dessin vit dans `screens/debiteur/pieces.tsx`.
 */
function PagePieces() {
	const { id } = Route.useParams();
	const debiteurId = id as Id<'debiteurs'>;

	const debiteurs = useQuery(api.recouvrement.lecture.listerDebiteurs, {});
	const pieces = useQuery(api.recouvrement.pieces.listerPiecesDuDebiteur, { debiteurId });

	const genererUrlPiece = useMutation(api.recouvrement.pieces.genererUrlPiece);
	const deposerPiece = useMutation(api.recouvrement.pieces.deposerPiece);
	const classerPiece = useMutation(api.recouvrement.pieces.classerPiece);
	const retirerPiece = useMutation(api.recouvrement.pieces.retirerPiece);

	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	const debiteur = debiteurs?.find((d) => d._id === debiteurId);

	/**
	 * ⚠️ LE DÉPÔT N'IMPOSE AUCUN TYPE. La pièce entre « à classer », la lecture
	 * part en tâche de fond, et le gérant ne corrige que si elle s'est trompée.
	 * Demander la nature d'un PDF qui porte « BON DE LIVRAISON » en en-tête est
	 * exactement le champ vide que la première règle d'écran interdit.
	 */
	async function deposerPieces(fichiers: File[]) {
		setErreur(null);
		setEnCours(true);
		try {
			for (const fichier of fichiers) {
				const url = await genererUrlPiece();
				const reponse = await fetch(url, {
					method: 'POST',
					headers: { 'Content-Type': fichier.type },
					body: fichier
				});
				if (!reponse.ok) throw new Error(`L'envoi de « ${fichier.name} » a échoué.`);
				const { storageId } = (await reponse.json()) as { storageId: Id<'_storage'> };

				await deposerPiece({
					storageId,
					filename: fichier.name,
					mimeType: fichier.type,
					debiteurId,
					factureIds: []
				});
			}
		} catch (e) {
			setErreur(e instanceof Error ? e.message : 'Dépôt refusé.');
		} finally {
			setEnCours(false);
		}
	}

	/*
	  La page attend la liste des pièces : elle affichait « 0 document » implicite
	  et une liste vide le temps de l'aller-retour.
	*/
	return (
		<EcranPieces
			identifiant={id}
			donnees={
				pieces === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								denomination: debiteur?.denomination ?? null,
								pieces,
								enCours,
								erreur,
								onDeposer: (fichiers) => void deposerPieces(fichiers),
								onClasser: (pieceId, type) => {
									void classerPiece({
										pieceId: pieceId as Id<'pieces'>,
										type: type as 'BON_DE_LIVRAISON'
									});
								},
								onRetirer: (pieceId) => void retirerPiece({ pieceId: pieceId as Id<'pieces'> })
							}
						}
			}
		/>
	);
}
