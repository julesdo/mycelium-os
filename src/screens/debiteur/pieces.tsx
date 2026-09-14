import { PageEcran, Pieces, type Lecture, type PieceAffichee } from '../../ui';
import { TYPES_PIECE } from '../debiteur-detail';

/** Ce que la page affiche : le nom du débiteur pour son retour, ses pièces, et l'état du dépôt que la route pilote. */
export interface PiecesDuDebiteur {
	readonly denomination: string | null;
	readonly pieces: readonly PieceAffichee[];
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onDeposer: (fichiers: File[]) => void;
	readonly onClasser: (pieceId: string, type: string) => void;
	readonly onRetirer: (pieceId: string) => void;
}

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
export function EcranPieces({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<PiecesDuDebiteur>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/debiteurs',
					recherche: { d: identifiant },
					libelle: pret?.denomination ?? 'Débiteurs'
				},
				titre: 'Les pièces du dossier',
				// « 0 document » serait un cadran à zéro : le vide se dit en toutes lettres (règle d’écran n° 4).
				sousTitre:
					pret === null
						? undefined
						: pret.pieces.length === 0
							? 'Aucun document'
							: `${pret.pieces.length} document${pret.pieces.length > 1 ? 's' : ''}`
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<>
					<Pieces
						pieces={pret.pieces}
						optionsType={TYPES_PIECE}
						enCours={pret.enCours}
						onDeposer={pret.onDeposer}
						onClasser={pret.onClasser}
						onRetirer={pret.onRetirer}
					/>
					{pret.erreur ? <p className="text-cladd-xs text-cladd-fg">{pret.erreur}</p> : null}
				</>
			)}
		</PageEcran>
	);
}
