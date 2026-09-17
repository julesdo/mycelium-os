import { createFileRoute, useParams } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { depuisCentimes } from '../../lib/socle/montants';
import { EcranDecompte } from '../../screens/analyses/decompte';

export const Route = createFileRoute('/app/creance/$id/decompte')({
	component: PageDecompte,
	errorComponent: DecompteEnErreur
});

function DecompteEnErreur() {
	const { id } = useParams({ from: '/app/creance/$id' });
	return <EcranDecompte identifiant={id} donnees={{ etat: 'erreur' }} />;
}

/**
 * Branchée sur la base ; le dessin vit dans `screens/analyses/decompte.tsx`.
 *
 * ⚠️ EXPORTÉE, ET ELLE LIT LES PARAMÈTRES DE LA CRÉANCE, PAS LES SIENS. L'index
 * de la créance (`creance.$id.index.tsx`) la rend comme analyse par défaut, hors
 * de son propre appariement : `Route.useParams()` y lèverait « Invariant failed ».
 */
export function PageDecompte() {
	const { id } = useParams({ from: '/app/creance/$id' });
	const creanceId = id as Id<'creances'>;

	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });
	const dernier = useQuery(api.recouvrement.decompte.dernierDecompte, { creanceId });

	/**
	 * LA PIÈCE, TÉLÉCHARGÉE.
	 *
	 * ⚠️ LE MODULE PDF EST IMPORTÉ À LA DEMANDE. `jspdf` et son greffon de
	 * tableaux pèsent plusieurs centaines de kilo-octets ; les charger avec
	 * l'écran ferait payer ce poids à chaque ouverture, pour un bouton qu'on
	 * presse une fois par créance.
	 *
	 * ⚠️ ET LE CONTENU NE SE COMPOSE PAS ICI. `composerPiece` est pure et testée ;
	 * cet écran ne fait que lui passer le décompte figé et donner un nom au
	 * fichier. Écrire une seule phrase du document ici créerait un second endroit
	 * où le produit parle de droit.
	 */
	async function telecharger() {
		if (dernier === undefined || dernier === null) return;

		const [{ composerPiece }, { rendrePieceEnPdf, nomFichierPiece }] = await Promise.all([
			import('../../lib/verticales/recouvrement/piece'),
			import('../../ui/piece-decompte')
		]);

		const piece = composerPiece({
			arreteAu: dernier.arreteAu,
			convention: dernier.convention,
			principalRestantDu: depuisCentimes(dernier.principalRestantDu),
			interets: depuisCentimes(dernier.interets),
			indemniteForfaitaire: depuisCentimes(dernier.indemniteForfaitaire),
			total: depuisCentimes(dernier.total),
			creancier: dernier.creancier,
			debiteur: dernier.debiteur,
			lignes: dernier.lignes.map((ligne) => ({
				reference: ligne.reference,
				principalRestantDu: depuisCentimes(ligne.principalRestantDu),
				interets: depuisCentimes(ligne.interets),
				indemniteForfaitaire: depuisCentimes(ligne.indemniteForfaitaire),
				total: depuisCentimes(ligne.total),
				segments: ligne.segments.map((segment) => ({
					debut: segment.debut,
					fin: segment.fin,
					jours: segment.jours,
					principal: depuisCentimes(segment.principal),
					taux: segment.taux,
					baseAnnuelle: segment.baseAnnuelle,
					interets: depuisCentimes(segment.interets)
				}))
			})),
			abandons: dernier.abandons.map((abandon) => ({
				reference: abandon.reference,
				montantEnJeu: abandon.montantEnJeu === null ? null : depuisCentimes(abandon.montantEnJeu),
				explication: abandon.explication
			}))
		});

		rendrePieceEnPdf(piece).save(nomFichierPiece(piece));
	}

	return (
		<EcranDecompte
			identifiant={id}
			donnees={
				creance === undefined || dernier === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								debiteur: creance.debiteur,
								dernier,
								dernierId: dernier?._id ?? null,
								onTelecharger: () => void telecharger()
							}
						}
			}
		/>
	);
}
