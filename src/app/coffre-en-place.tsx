import { useState, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useQuery } from './donnees';
import { useDepotAuCoffre, useOuvertureCoffre } from './use-coffre';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import { ParcoursDepot, VisionneuseDocument, type RefCoffre } from '../ui';

/**
 * LE COFFRE, MONTÉ SUR PLACE — dans un dossier, sur la fiche d'un client
 * (12/10/2026).
 *
 * ⚠️ LE MÊME PARCOURS ET LA MÊME VISIONNEUSE QUE PARTOUT. Le fondateur : « il faut
 * absolument qu'on ait le même flow partout dans l'app ». Un dossier ne dépose
 * plus ses pièces par une zone à lui : il ouvre `ParcoursDepot`, et une pièce se
 * relit en plein écran dans `VisionneuseDocument`, comme au coffre. Le retrait
 * passe par la visionneuse, qui demande confirmation et l'inscrit au journal.
 */

type DestinationPieces = {
	readonly debiteurId?: Id<'debiteurs'>;
	readonly factureIds: readonly Id<'facturesVente'>[];
};

function versServeur(ref: RefCoffre) {
	return ref.genre === 'IMPORT'
		? { genre: 'IMPORT' as const, id: ref.id as Id<'importsRecouvrement'> }
		: { genre: 'PIECE' as const, id: ref.id as Id<'pieces'> };
}

export function useCoffreEnPlace({
	destination,
	titre
}: {
	readonly destination: DestinationPieces;
	/** Pour qui l'on dépose : « le dossier de Martin SAS », « Martin SAS ». */
	readonly titre: string;
}): {
	readonly ajouter: () => void;
	readonly ouvrirPiece: (pieceId: string) => void;
	readonly rendu: ReactNode;
} {
	const navigate = useNavigate();
	const [depotOuvert, setDepotOuvert] = useState(false);
	const [ouverte, setOuverte] = useState<RefCoffre | null>(null);
	const depot = useDepotAuCoffre({ genre: 'PIECES', ...destination });
	const { ouvrir, telecharger } = useOuvertureCoffre();
	const retirer = useMutation(api.coffre.coffre.retirerDuCoffre);
	const detail = useQuery(
		api.coffre.coffre.documentDuCoffre,
		ouverte === null ? 'skip' : { ref: versServeur(ouverte) }
	);

	return {
		ajouter: () => setDepotOuvert(true),
		ouvrirPiece: (pieceId) => setOuverte({ genre: 'PIECE', id: pieceId }),
		rendu: (
			<>
				<VisionneuseDocument
					ouverte={ouverte !== null}
					detail={ouverte === null ? undefined : detail}
					ouvrir={ouvrir}
					onTelecharger={telecharger}
					onRetirer={(cible) => retirer({ ref: versServeur(cible) }).then(() => setOuverte(null))}
					onFermer={() => setOuverte(null)}
				/>
				<ParcoursDepot
					ouvert={depotOuvert}
					onFermer={() => setDepotOuvert(false)}
					destination={{ titre, precision: 'lus et classés dès leur arrivée' }}
					genre="PIECES"
					depot={depot}
					onVoir={(cible) => {
						setDepotOuvert(false);
						setOuverte(cible);
					}}
					onVoirLeCoffre={() => {
						setDepotOuvert(false);
						void navigate({ to: '/app/coffre' });
					}}
				/>
			</>
		)
	};
}
