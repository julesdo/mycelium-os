import type { ReactNode } from 'react';
import {
	AccordionIndicator,
	AccordionItem,
	AccordionPanel,
	AccordionRoot,
	AccordionTrigger,
	Button,
	Surface
} from '@cladd-ui/react';
import { ChevronRightIcon } from 'lucide-react';

/**
 * UNE SECTION QUI SE DÉPLIE, DANS UN FLUX QUI RESTE UN SEUL FLUX.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE N'EST PAS UN ONGLET, ET POURQUOI C'EST `multiple`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un onglet force à savoir sous quel intitulé du domaine se range ce qu'on
 * cherche, alors qu'on le cherchait pour une raison qui ne porte pas ce nom :
 * « pourquoi ce montant » ne s'appelle ni « Décompte » ni « Solidité ».
 *
 * `AccordionRoot` seul refermerait la section précédente à chaque ouverture —
 * c'est-à-dire un onglet qui s'ignore. `multiple` le rend à ce qu'il est : un
 * flux vertical dont chaque bloc se replie, et où deux blocs se lisent côte à
 * côte quand on compare une hypothèse à la pièce qui la fonde.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI NE SE REPLIE JAMAIS NE PASSE PAS PAR ICI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Ce que le logiciel a supposé » se rend hors de ce composant, en
 * `SectionEcran`. Une hypothèse repliée est une hypothèse qu'on ne lit pas, et
 * le doute ne profite jamais au produit.
 *
 * L'apparence est celle de `SectionEcran` au pixel près — même verre, même
 * rayon, même rythme de titre et de légende. Deux cartes de la même colonne
 * qui ne se ressemblent que « presque » se lisent comme deux natures
 * différentes, ce qu'elles ne sont pas.
 */

/**
 * Le conteneur : la liste des sections ouvertes, et le moyen de la changer.
 *
 * ⚠️ CONTRÔLÉ, ET C'EST VOULU. Le volet est un état adressable : la section
 * qu'on regarde survit à un rechargement, donc elle ne peut pas vivre dans
 * l'état interne d'un composant du kit.
 */
export function SectionsDepliables({
	ouvertes,
	onOuvertesChange,
	children
}: {
	readonly ouvertes: readonly string[];
	readonly onOuvertesChange: (ouvertes: readonly string[]) => void;
	readonly children: ReactNode;
}) {
	return (
		<AccordionRoot
			multiple
			value={[...ouvertes]}
			onValueChange={(valeur) => onOuvertesChange(Array.isArray(valeur) ? valeur : [])}
		>
			{children}
		</AccordionRoot>
	);
}

export function SectionDepliable({
	cle,
	titre,
	legende,
	valeur,
	children
}: {
	/** L'identité de la section, celle que l'adresse porte. */
	readonly cle: string;
	readonly titre: string;
	readonly legende?: string;
	/**
	 * Un chiffre ou trois mots, lisibles SANS déplier.
	 *
	 * ⚠️ C'EST LA MOITIÉ DU TRAVAIL D'UNE SECTION REPLIÉE. « 2 sur 4 » replié
	 * dit déjà ce qu'on venait chercher ; un titre seul oblige à ouvrir les huit
	 * sections pour savoir laquelle parle.
	 */
	readonly valeur?: string;
	readonly children: ReactNode;
}) {
	return (
		<AccordionItem value={cle}>
			<Surface
				as="section"
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				// `p-0` : le rembourrage vit sur la rangée et sur le panneau, sinon le
				// panneau replié garde la hauteur de sa propre marge et la section ne
				// se referme jamais tout à fait.
				contentClassName="flex flex-col p-0"
			>
				<AccordionTrigger>
					<Button
						variant="transparent"
						outline={false}
						hoverable={false}
						// `md` vaut 48 px sur l'échelle décalée du produit : le plancher
						// tactile, sans hauteur écrite à la main.
						size="md"
						className="h-auto w-full rounded-cladd-xl"
						contentClassName="w-full items-center justify-between gap-cladd-3xs p-cladd-2xs"
					>
						<span className="flex min-w-0 flex-col items-start text-left">
							<span className="text-cladd-sm leading-tight font-bold tracking-tight">{titre}</span>
							{legende === undefined ? null : (
								<span className="mt-0.5 text-cladd-2xs font-normal text-cladd-fg-softer">
									{legende}
								</span>
							)}
						</span>
						<span className="flex shrink-0 items-center gap-cladd-3xs">
							{valeur === undefined ? null : (
								<span className="text-cladd-2xs text-cladd-fg-soft tabular-nums">{valeur}</span>
							)}
							<AccordionIndicator className="flex text-cladd-fg-softer transition-transform duration-150 data-[open]:rotate-90">
								<ChevronRightIcon className="size-4" aria-hidden />
							</AccordionIndicator>
						</span>
					</Button>
				</AccordionTrigger>

				<AccordionPanel>
					<div className="flex flex-col gap-cladd-2xs px-cladd-2xs pb-cladd-2xs">{children}</div>
				</AccordionPanel>
			</Surface>
		</AccordionItem>
	);
}
