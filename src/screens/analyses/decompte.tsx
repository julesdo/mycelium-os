import { Button, Surface } from '@cladd-ui/react';
import { FileDownIcon } from 'lucide-react';
import { BoutonPrincipal, Decompte, PageEcran, type DecompteAffiche, type Lecture } from '../../ui';

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
export interface DecompteDeLaCreance {
	readonly debiteur: string;
	/** Le dernier décompte arrêté, ou `null` s'il n'y en a pas encore. */
	readonly dernier: DecompteAffiche | null;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onArreter: () => void;
	readonly onTelecharger: () => void;
}

export function EcranDecompte({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<DecompteDeLaCreance>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/creance/$id',
					parametres: { id: identifiant },
					libelle: pret?.debiteur ?? 'Créance'
				},
				titre: 'Décompte',
				// ⚠️ PAS DE SOUS-TITRE PENDANT L'ATTENTE. Il disait « Aucun décompte
				// arrêté » le temps que la requête revienne, y compris sur une créance
				// qui en portait trois.
				sousTitre:
					pret === null
						? undefined
						: pret.dernier
							? `Arrêté au ${pret.dernier.arreteAu}`
							: 'Aucun décompte arrêté'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<>
					{pret.dernier ? (
						<Decompte decompte={pret.dernier} />
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

					{pret.erreur ? <p className="text-cladd-xs text-cladd-fg">{pret.erreur}</p> : null}

					<div className="flex flex-wrap gap-cladd-3xs">
						<BoutonPrincipal onClick={pret.onArreter} disabled={pret.enCours}>
							{pret.enCours ? 'Calcul en cours…' : 'Arrêter un décompte à aujourd’hui'}
						</BoutonPrincipal>

						{/* LA PIÈCE. C'est le troisième critère de fin de MVP : un décompte
						    qui part chez un expert-comptable, un avocat ou un assureur SANS
						    être retouché. */}
						{pret.dernier ? (
							<Button
								size="lg"
								variant="transparent"
								outline={false}
								hoverable={false}
								rounded
								className="verre verre-bouton font-medium"
								onClick={pret.onTelecharger}
							>
								<FileDownIcon />
								Télécharger la pièce
							</Button>
						) : null}
					</div>
				</>
			)}
		</PageEcran>
	);
}
