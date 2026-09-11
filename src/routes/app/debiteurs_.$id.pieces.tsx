import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EnteteDetail, Page, PageBody, Pieces } from '../../ui';
import { TYPES_PIECE } from '../../screens/debiteur-detail';

export const Route = createFileRoute('/app/debiteurs_/$id/pieces')({ component: PagePieces });

/**
 * LES PIÈCES DU DOSSIER — une page, plus une carte coincée entre deux autres.
 *
 * ⚠️ C'EST L'ANALYSE QUI PORTAIT LE PLUS DE TEXTE. Chaque pièce dit sa nature,
 * son numéro, sa date, le constat de sa lecture, et la réserve qu'elle porte
 * éventuellement. Cinq lignes par document, sur un dossier qui en compte dix :
 * la carte devenait un mur, et le reste du volet passait sous l'horizon.
 *
 * Le dépôt et la lecture ne changent pas ; ils ont seulement la place de se
 * voir. Un gérant qui dépose dix pièces regarde ce qu'elles sont devenues —
 * c'est un écran, pas une note en bas d'une fiche.
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

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/debiteurs"
				retourRecherche={{ d: id }}
				retourLibelle={debiteur?.denomination ?? 'Débiteurs'}
				titre="Les pièces du dossier"
				sousTitre={pieces === undefined ? undefined : `${pieces.length} document${pieces.length > 1 ? 's' : ''}`}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
					<Pieces
						pieces={pieces ?? []}
						optionsType={TYPES_PIECE}
						enCours={enCours}
						onDeposer={(fichiers) => void deposerPieces(fichiers)}
						onClasser={(pieceId, type) => {
							void classerPiece({
								pieceId: pieceId as Id<'pieces'>,
								type: type as 'BON_DE_LIVRAISON'
							});
						}}
						onRetirer={(pieceId) => void retirerPiece({ pieceId: pieceId as Id<'pieces'> })}
					/>
					{erreur ? <p className="text-cladd-xs text-cladd-fg">{erreur}</p> : null}
				</div>
			</PageBody>
		</Page>
	);
}
