import { Surface } from '@cladd-ui/react';
import { CheckIcon, MinusIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * LA PYRAMIDE DE PREUVES — module 4.2.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE REMPLACE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran affichait « ce qui renforcerait ce dossier » en pastilles nues :
 * « bon de commande », « bon de livraison ». Deux étiquettes de même
 * apparence, dont l'une vaut trois points sur vingt et l'autre un seul, et
 * aucune ne disait ce qu'elle établit. Un gérant devant cette rangée ne sait
 * ni par quoi commencer, ni pourquoi on le lui demande.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE MONTRE CE QUI EST LÀ AUTANT QUE CE QUI MANQUE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une liste des seules pièces absentes se lit comme une réprimande, et masque
 * le chemin déjà parcouru. Les quatre étages sont donc tous rendus, établis ou
 * non : c'est la différence entre « il vous manque trois choses » et « voilà
 * où en est ce dossier ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AUCUNE COULEUR DE SEUIL, ET AUCUN VERDICT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le vert, l'ambre et le rouge ne disent qu'une chose dans ce produit —
 * au-dessus du seuil, tout près, en dessous. Un étage établi n'est pas un
 * seuil franchi : il se marque par une coche et un contraste, jamais par une
 * couleur de verdict.
 *
 * Et les phrases viennent du domaine, mot pour mot. « Trois des quatre pièces
 * attendues sont absentes » est un constat ; « ce dossier est trop faible »
 * serait une appréciation juridique. Les recomposer ici ferait un second
 * endroit où le produit juge un dossier.
 */

export interface EtageAffiche {
	readonly cle: string;
	readonly fait: string;
	readonly etat: string;
	readonly presente: boolean;
	readonly poids: number;
}

export interface SoliditeAffichee {
	readonly constat: string;
	readonly etablies: number;
	readonly attendues: number;
	readonly etages: readonly EtageAffiche[];
	/** La clé de l'étage absent au poids le plus fort. Une mesure, pas une consigne. */
	readonly prochaine: string | null;
}

export function Solidite({ solidite }: { solidite: SoliditeAffichee }) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs"
		>
			<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
				<p className="text-cladd-sm font-medium text-balance">{solidite.constat}</p>
				<span className="shrink-0 text-cladd-2xs text-cladd-fg-softer tabular-nums">
					{solidite.etablies} / {solidite.attendues}
				</span>
			</div>

			<div className="flex flex-col gap-cladd-3xs">
				{solidite.etages.map((etage) => (
					<div key={etage.cle} className="flex items-start gap-cladd-3xs">
						{etage.presente ? (
							<CheckIcon className="mt-0.5 size-4 shrink-0 text-cladd-fg" aria-hidden />
						) : (
							<MinusIcon className="mt-0.5 size-4 shrink-0 text-cladd-fg-softest" aria-hidden />
						)}
						<div className="flex min-w-0 flex-1 flex-col gap-0.5">
							<p
								className={cn(
									'text-cladd-xs leading-snug',
									etage.presente ? 'text-cladd-fg' : 'text-cladd-fg-soft'
								)}
							>
								{etage.etat}
							</p>
							{/* ⚠️ LE POIDS EST DIT, et c'est tout l'apport de ce composant.
							    Sans lui, « bon de commande » et « mise en demeure » se
							    ressemblent — alors que l'un vaut trois fois l'autre. */}
							{!etage.presente ? (
								<p className="text-cladd-2xs text-cladd-fg-softest">
									{etage.poids} point{etage.poids > 1 ? 's' : ''} sur 20
									{etage.cle === solidite.prochaine ? ' — c’est le plus lourd qui manque' : ''}
								</p>
							) : null}
						</div>
					</div>
				))}
			</div>
		</Surface>
	);
}
