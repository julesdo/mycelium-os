import { Surface } from '@cladd-ui/react';
import { AlertTriangleIcon } from 'lucide-react';
import { PageEcran, type Lecture } from '../../ui';

/** Un risque de la créance, tel que le score le constate. */
export interface RisqueAffiche {
	readonly type: string;
	readonly description: string;
	readonly gravite: string;
}

/** Ce que l'écran affiche : le débiteur pour l'en-tête, et les risques relevés sur le dossier. */
export interface RisquesDeLaCreance {
	readonly debiteur: string;
	readonly risques: readonly RisqueAffiche[];
}

/**
 * CE QUI AFFAIBLIT CE DOSSIER.
 *
 * ⚠️ CHAQUE RISQUE EST UN CONSTAT, JAMAIS UNE CONSÉQUENCE JURIDIQUE. « Le
 * débiteur fait l'objet d'une procédure collective » est un fait relevé au
 * registre ; ce qu'il faudrait en faire n'a été validé par personne, et le
 * produit ne l'écrit pas.
 *
 * ⚠️ ET UN RISQUE BLOQUANT LE DIT. Une contestation, même infondée, met fin à
 * une procédure simplifiée : le dossier peut être parfait par ailleurs, il ne
 * passera pas. Le noyer parmi les autres reviendrait à le taire.
 */
export function EcranRisques({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<RisquesDeLaCreance>;
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
				titre: 'Ce qui affaiblit ce dossier',
				sousTitre:
					pret === null
						? undefined
						: `${pret.risques.length} relevé${pret.risques.length > 1 ? 's' : ''}`
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<div className="flex flex-col gap-cladd-3xs">
					{pret.risques.length === 0 ? (
						<Surface
							variant="transparent"
							outline={false}
							className="verre-carte rounded-cladd-xl"
							contentClassName="p-cladd-2xs"
						>
							<p className="text-cladd-sm text-cladd-fg-soft">
								Rien de relevé sur ce dossier. Ce n’est pas une absence de risque : c’est une
								absence de risque CONNU.
							</p>
						</Surface>
					) : (
						pret.risques.map((risque) => (
							<Surface
								key={risque.type}
								variant="transparent"
								outline={false}
								className="verre-carte rounded-cladd-xl"
								contentClassName="flex gap-cladd-3xs p-cladd-2xs"
							>
								<AlertTriangleIcon
									className="mt-0.5 size-4 shrink-0 text-cladd-fg-soft"
									aria-hidden
								/>
								<div className="flex min-w-0 flex-col gap-1">
									<p className="text-cladd-sm leading-snug">{risque.description}</p>
									{risque.gravite === 'BLOQUANTE' ? (
										<p className="text-cladd-2xs text-cladd-fg-soft">
											Ce constat ferme les procédures que ce logiciel évalue : elles se déroulent
											toutes sans débat contradictoire.
										</p>
									) : null}
								</div>
							</Surface>
						))
					)}
				</div>
			)}
		</PageEcran>
	);
}
