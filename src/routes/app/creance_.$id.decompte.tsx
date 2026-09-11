import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Surface } from '@cladd-ui/react';
import { FileDownIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { depuisCentimes } from '../../lib/socle/montants';
import { BoutonPrincipal, Decompte, EnteteDetail, Page, PageBody } from '../../ui';

export const Route = createFileRoute('/app/creance_/$id/decompte')({ component: PageDecompte });

/**
 * LE DÉCOMPTE — la pièce qui part chez un tiers.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI IL A SA PAGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est le SEUL écran du produit dont le contenu sort du produit : un
 * expert-comptable, un avocat ou un assureur le lira sans le retoucher. Il
 * porte ses segments période par période, et un tableau se lit à plat, pas
 * dans une carte coincée entre six autres.
 *
 * ⚠️ UN DÉCOMPTE ARRÊTÉ EST FIGÉ, DÉFINITIVEMENT. Rejouer produit un NOUVEAU
 * décompte daté. La question n'est pas « combien réclame-t-on aujourd'hui »
 * mais « qu'a-t-on réclamé le jour où on l'a réclamé ».
 */
function PageDecompte() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;

	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });
	const dernier = useQuery(api.recouvrement.decompte.dernierDecompte, { creanceId });
	const figer = useMutation(api.recouvrement.decompte.produire);

	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

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

	async function produireDecompte() {
		setEnCours(true);
		setErreur(null);
		try {
			await figer({ creanceId, convention: 'ACT_365' });
		} catch (e) {
			// ⚠️ `ConvexError` PORTE SON MESSAGE DANS `data`, pas dans `message`.
			// Le contrôle refuse un décompte incomplet en CHIFFRANT ce qui serait
			// abandonné ; perdre ce texte reviendrait à afficher « échec ».
			const convexe = e as { data?: unknown };
			setErreur(
				typeof convexe.data === 'string'
					? convexe.data
					: e instanceof Error
						? e.message
						: 'Le décompte n’a pas pu être produit.'
			);
		} finally {
			setEnCours(false);
		}
	}

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/creance/$id"
				retourParametres={{ id }}
				retourLibelle={creance?.debiteur ?? 'Créance'}
				titre="Décompte"
				sousTitre={dernier ? `Arrêté au ${dernier.arreteAu}` : 'Aucun décompte arrêté'}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
					{dernier ? (
						<Decompte decompte={dernier} />
					) : (
						<Surface
							variant="transparent"
							outline={false}
							className="verre-carte rounded-cladd-xl"
							contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
						>
							<p className="text-cladd-sm text-cladd-fg-soft">
								Aucun décompte n’a encore été arrêté pour cette créance.
							</p>
							<p className="text-cladd-xs text-cladd-fg-softer">
								Un décompte est figé à sa date : il prouve ce qui était réclamé le jour où on l’a
								réclamé, et ne bouge plus ensuite.
							</p>
						</Surface>
					)}

					{erreur ? <p className="text-cladd-xs text-cladd-fg">{erreur}</p> : null}

					<div className="flex flex-wrap gap-cladd-3xs">
						<BoutonPrincipal onClick={() => void produireDecompte()} disabled={enCours}>
							{enCours ? 'Calcul en cours…' : 'Arrêter un décompte à aujourd’hui'}
						</BoutonPrincipal>

						{/* LA PIÈCE. C'est le troisième critère de fin de MVP : un décompte
						    qui part chez un expert-comptable, un avocat ou un assureur SANS
						    être retouché. */}
						{dernier ? (
							<Button
								size="lg"
								variant="transparent"
								outline={false}
								hoverable={false}
								rounded
								className="verre verre-bouton font-medium"
								onClick={() => void telecharger()}
							>
								<FileDownIcon />
								Télécharger la pièce
							</Button>
						) : null}
					</div>
				</div>
			</PageBody>
		</Page>
	);
}
