import { createContext, useContext, type ReactNode } from 'react';
import {
	AccordionIndicator,
	AccordionItem,
	AccordionPanel,
	AccordionRoot,
	AccordionTrigger,
	Button,
	Popup,
	PopupContent,
	Surface
} from '@cladd-ui/react';
import { ChevronRightIcon } from 'lucide-react';
import { useDeuxVolets } from './maitre-detail';

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
/**
 * L'ÉTAT D'OUVERTURE, LISIBLE PAR CE QUI EN A BESOIN.
 *
 * ⚠️ `AccordionRoot` LE GARDE POUR LUI. Il sait quelle section est ouverte et
 * ne le dit à personne : son indicateur reçoit un `data-open`, et c'est tout.
 * Or depuis le 30/09/2026 une section ouverte se rend de DEUX façons — en
 * panneau au-delà de 1024 px, en FEUILLE en dessous — et la feuille a besoin de
 * savoir si elle est ouverte, ce que le kit ne lui dira pas.
 *
 * Le contexte est donc posé à côté, sur la même liste, par le même conteneur.
 * Personne ne peut les désaccorder : ils sortent du même `ouvertes`.
 */
const ContexteSections = createContext<{
	readonly ouvertes: readonly string[];
	readonly fermer: (cle: string) => void;
} | null>(null);

/**
 * Ce que la section doit savoir pour choisir sa présentation.
 *
 * ⚠️ IL LÈVE AU LIEU DE SE TAIRE. Une section montée hors de son conteneur
 * rendrait une feuille qu'aucun geste ne pourrait refermer — un écran bloqué,
 * découvert au doigt et jamais en développement.
 */
export function useSectionOuverte(cle: string): { ouverte: boolean; fermer: () => void } {
	const contexte = useContext(ContexteSections);
	if (contexte === null) {
		throw new Error(
			'Une section dépliable est montée hors de SectionsDepliables : son état d’ouverture est partagé.'
		);
	}
	return { ouverte: contexte.ouvertes.includes(cle), fermer: () => contexte.fermer(cle) };
}

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
		<ContexteSections.Provider
			value={{
				ouvertes,
				fermer: (cle) => onOuvertesChange(ouvertes.filter((autre) => autre !== cle))
			}}
		>
			<AccordionRoot
				multiple
				value={[...ouvertes]}
				onValueChange={(valeur) => onOuvertesChange(Array.isArray(valeur) ? valeur : [])}
			>
				{children}
			</AccordionRoot>
		</ContexteSections.Provider>
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
	/**
	 * ⚠️ DEUX PRÉSENTATIONS POUR UN SEUL ÉTAT, DEPUIS LE 30/09/2026.
	 *
	 * Le reproche du terrain : « galère à manipuler […] on doit être full mobile
	 * first, comme une app native iOS ». Dix sections sur l'écran du compte, et
	 * en ouvrir une injectait son formulaire AU MILIEU du défilement : on perdait
	 * sa place, et il fallait remonter pour la refermer. Aucune application iOS
	 * ne fait ça — un panneau de réglages se PRÉSENTE, et se renvoie d'un
	 * glissement pour retrouver la liste exactement où on l'avait laissée.
	 *
	 * Au-delà de 1024 px, la place existe : le panneau se déplie sur place, et
	 * la feuille n'a plus de raison d'être. Apple, page *Layout* : « Keep
	 * functionality the same as size classes change. »
	 */
	const deuxVolets = useDeuxVolets();
	const { ouverte, fermer } = useSectionOuverte(cle);

	return (
		<AccordionItem value={cle}>
			<Surface
				as="section"
				id={`section-${cle}`}
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
						// ⚠️ `min-h-15` ET NON LA HAUTEUR DE `size="md"`. Le `h-auto` qu'il
						// faut poser pour laisser un titre revenir à la ligne annule aussi
						// le plancher du kit, et la rangée retombait sur la hauteur de son
						// contenu — sous les 44 pt d'Apple.
						size="md"
						className="h-auto min-h-15 w-full rounded-cladd-xl"
						contentClassName="w-full items-center justify-between gap-cladd-3xs p-cladd-2xs"
					>
						{/*
						  ⚠️ `basis-1/2` SUR L'INTITULÉ. Le groupe de droite était `shrink-0`,
						  donc il prenait sa largeur naturelle en premier et une valeur un peu
						  longue écrasait le titre jusqu'à l'illisible. L'intitulé garde la
						  moitié de la rangée ; la valeur revient à la ligne plutôt que de
						  perdre sa fin.
						*/}
						<span className="flex min-w-0 flex-1 basis-1/2 flex-col items-start text-left">
							<span className="text-cladd-sm leading-tight font-bold tracking-tight">{titre}</span>
							{legende === undefined ? null : (
								<span className="mt-0.5 text-cladd-2xs font-normal text-cladd-fg-softer">
									{legende}
								</span>
							)}
						</span>
						<span className="flex min-w-0 shrink items-center gap-cladd-3xs">
							{valeur === undefined ? null : (
								<span className="text-right text-cladd-2xs text-cladd-fg-soft tabular-nums">
									{valeur}
								</span>
							)}
							<AccordionIndicator className="flex text-cladd-fg-softer transition-transform duration-150 data-[open]:rotate-90">
								<ChevronRightIcon className="size-4" aria-hidden />
							</AccordionIndicator>
						</span>
					</Button>
				</AccordionTrigger>

				{deuxVolets ? (
					<AccordionPanel>
						<div className="flex flex-col gap-cladd-2xs px-cladd-2xs pb-cladd-2xs">{children}</div>
					</AccordionPanel>
				) : (
					/*
					  ⚠️ LA FEUILLE PORTE LE TITRE DE LA SECTION. Sans lui, le doigt qui
					  vient de l'ouvrir n'a aucune preuve d'avoir ouvert la bonne — c'est
					  le défaut qui fait refermer pour vérifier, puis rouvrir.

					  Elle se renvoie de trois façons : le glissement, la croix et l'appui
					  hors du cadre. Les trois passent par `onOpenChange`, donc par le même
					  `fermer` : un état qui se perdrait sur l'un des trois laisserait la
					  rangée allumée sur une feuille fermée, et le prochain appui ne ferait
					  plus rien.
					*/
					<Popup
						open={ouverte}
						onOpenChange={(o) => {
							if (!o) fermer();
						}}
						headerLeft={<span className="px-2 pb-1 text-cladd-xs font-semibold">{titre}</span>}
					>
						<PopupContent>
							<div className="flex flex-col gap-cladd-2xs">
								{legende === undefined ? null : (
									<p className="text-cladd-2xs leading-snug text-cladd-fg-softer">{legende}</p>
								)}
								{children}
							</div>
						</PopupContent>
					</Popup>
				)}
			</Surface>
		</AccordionItem>
	);
}
