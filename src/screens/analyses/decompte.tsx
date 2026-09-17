import { Button, Surface } from '@cladd-ui/react';
import { FileDownIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	Decompte,
	Lien,
	PageEcran,
	type DecompteAffiche,
	type Lecture
} from '../../ui';

/** Ce que l'écran affiche : le débiteur, le dernier décompte arrêté, et de quoi en produire un nouveau. */
export interface DecompteDeLaCreance {
	readonly debiteur: string;
	/** Le dernier décompte arrêté, ou `null` s'il n'y en a pas encore. */
	readonly dernier: DecompteAffiche | null;
	/** L'identifiant du dernier décompte, pour ouvrir la pièce à son adresse. */
	readonly dernierId: string | null;
	readonly onTelecharger: () => void;
}

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
					libelle: pret?.debiteur ?? 'Créance',
					masqueEnVolets: true
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

					<div className="flex flex-wrap gap-cladd-3xs">
						{/* ⚠️ CE BOUTON NE FIGE PLUS RIEN LUI-MÊME, ET C'EST LA CORRECTION.
						    Il arrêtait un décompte d'un tap, sans qu'aucun contrôle de
						    complétude n'ait été lu : `controle.ts` chiffrait ce qui serait
						    abandonné APRÈS coup, à la relecture, quand plus rien ne se
						    corrige. Il mène désormais à l'écran d'arrêt, qui porte le
						    contrôle chiffré, le pré-vol et l'irréversibilité en toutes
						    lettres. */}
						<BoutonPrincipal
							as={Lien}
							to="/app/arret/$id"
							// ⚠️ UNE ASSERTION, ET LA MÊME QUE DANS `ui/relances.tsx`. `as`
							// efface le générique du routeur, donc le typage des paramètres
							// avec lui ; la DESTINATION reste vérifiée contre l'arbre des
							// routes, ici et par `__tests__/destinations-existent.test.ts`.
							params={{ id: identifiant } as never}
						>
							Arrêter un décompte
						</BoutonPrincipal>

						{pret.dernierId !== null ? (
							<BoutonSecondaire
								as={Lien}
								to="/app/decompte/$id"
								params={{ id: pret.dernierId } as never}
							>
								Ouvrir la pièce
							</BoutonSecondaire>
						) : null}

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
