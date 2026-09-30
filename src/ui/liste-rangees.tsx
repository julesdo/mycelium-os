import type { ReactNode } from 'react';
import {
	AccordionIndicator,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
	Button,
	Popup,
	PopupContent,
	SectionTitle,
	Surface
} from '@cladd-ui/react';
import { ChevronRightIcon } from 'lucide-react';
import { useDeuxVolets } from './maitre-detail';
import { useSectionOuverte } from './section-depliable';

/**
 * DES RANGÉES QUI PORTENT LEUR RÉPONSE, ET S'OUVRENT EN PLACE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'ELLES REMPLACENT : NEUF CARTES DANS DEUX ACCORDÉONS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La page portait NEUF sections repliables, réparties dans deux accordéons
 * séparés par colonne, chacune bâtie comme une carte de verre à part entière —
 * neuf cartes, neuf ombres, neuf rayons, sur un écran qui en porte déjà cinq.
 * Chaque en-tête coûtait un titre en proposition relative PLUS une glose :
 *
 *   « Ce qui s'est passé / Vos notes, vos échanges, et ce que le logiciel a
 *     constaté »
 *   « Les valeurs juridiques employées / Leur source, leur date de relevé, et ce
 *     qu'on a le droit d'en faire »
 *
 * Neuf en-têtes × quatorze mots = cent vingt-six mots de MOBILIER, lus avant le
 * moindre contenu. C'était, mot pour mot, « des milliards de textes partout ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI CHANGE, ET CE QUI NE CHANGE PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce qui NE change pas : le contenu s'ouvre toujours EN PLACE. Une sous-page par
 * section obligerait à savoir sous quel intitulé du domaine se range ce qu'on
 * cherche, alors qu'on le cherche pour une raison qui ne porte pas ce nom —
 * « pourquoi ce montant » ne s'appelle ni « Décompte » ni « Solidité ». Et
 * l'accordéon reste `multiple` : un accordéon qui referme le bloc précédent est
 * un onglet qui s'ignore.
 *
 * Ce qui change, et c'est tout le sujet :
 *
 * 1. UNE carte, pas neuf. Les rangées se séparent d'un filet, comme une liste de
 *    réglages iOS. Le regard descend une colonne au lieu de sauter neuf cadres.
 * 2. Un titre est un NOM. « Historique », « Courriers », « Décompte ». Apple,
 *    page *Writing* des Human Interface Guidelines : « Check each word to be
 *    sure it needs to be there », et « "Favorites" conveys the same message as
 *    "Your Favorites", and is more succinct ».
 * 3. La glose descend DANS le panneau. Elle se lit une fois, quand on ouvre,
 *    au lieu de neuf fois quand on cherche.
 * 4. La valeur est obligatoire, pas facultative. C'est elle qui défait la
 *    profondeur : on lit la réponse SANS ouvrir, et on ouvre pour vérifier,
 *    pas pour savoir.
 *
 * ⚠️ LA RACINE DE L'ACCORDÉON EST AILLEURS, EN HAUT DE L'ÉCRAN. Des rangées
 * vivent dans le fil — les courriers pendent à l'étape « On lui écrit », les
 * voies à l'étape du tribunal —, et d'autres dans la liste « Le dossier ». Une
 * racine par carte rendrait ces deux familles ignorantes l'une de l'autre, et
 * l'état ouvert cesserait d'être une seule liste adressable.
 */

/**
 * UNE CARTE DE RANGÉES. Avec un intitulé quand elle est une section de la page,
 * sans quand elle pend à un échelon du fil.
 */
export function ListeDeRangees({
	titre,
	children
}: {
	readonly titre?: string;
	readonly children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-cladd-3xs">
			{titre === undefined ? null : <SectionTitle>{titre}</SectionTitle>}
			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				// Le filet entre deux rangées est posé par le conteneur, pas par la
				// rangée : une rangée qui déciderait elle-même d'avoir un bord du
				// dessus devrait savoir si elle est la première, ce qu'elle ne sait
				// pas, et ce que l'appelant oublierait de lui dire au premier ajout.
				contentClassName="flex flex-col p-0 [&>*+*]:border-t [&>*+*]:border-cladd-outline"
			>
				{children}
			</Surface>
		</section>
	);
}

export function RangeeDepliable({
	cle,
	titre,
	valeur,
	glose,
	children
}: {
	/** L'identité de la rangée : c'est elle que l'adresse porte. */
	readonly cle: string;
	/** Un NOM. Trois mots au plus, jamais une proposition relative. */
	readonly titre: string;
	/**
	 * La réponse, lisible SANS ouvrir. Obligatoire.
	 *
	 * ⚠️ C'EST LA MOITIÉ DU TRAVAIL D'UNE RANGÉE REPLIÉE, et c'est pour ça
	 * qu'elle n'est pas facultative ici. « 6 373,50 € » replié dit déjà ce qu'on
	 * venait chercher ; un titre seul oblige à ouvrir les six rangées pour savoir
	 * laquelle parle — et c'est très exactement ce qu'on reprochait à la page.
	 */
	readonly valeur: string;
	/** Ce que l'en-tête disait avant, descendu en tête du panneau. */
	readonly glose?: string;
	readonly children: ReactNode;
}) {
	const { ouverte, fermer } = useSectionOuverte(cle);
	/**
	 * ⚠️ DEUX PRÉSENTATIONS POUR UN SEUL ÉTAT, ET C'EST LE CŒUR DU 30/09/2026.
	 *
	 * Le reproche du terrain : « galère à manipuler […] on doit être full mobile
	 * first, comme une app native iOS ». Déplier « Vos réponses » injectait deux
	 * mille pixels AU MILIEU du défilement : on perdait sa place, et il fallait
	 * remonter pour refermer. Aucune application iOS ne fait ça — eBay, TheFork,
	 * Yahoo Finance et Fiverr présentent tous ce contenu-là en FEUILLE, qu'on
	 * renvoie d'un glissement pour se retrouver exactement où l'on était.
	 *
	 * Au-delà de 1024 px la feuille n'a plus de sens : la colonne de droite est
	 * libre, et le fil ne bouge pas quand on y déplie quelque chose.
	 *
	 * C'est la règle d'Apple elle-même, page *Layout* : « Keep functionality the
	 * same as size classes change […] you can change the amount of functionality
	 * that's visible onscreen as the amount of space changes. » Même état, même
	 * contenu, même rangée — seule la présentation change.
	 */
	const deuxVolets = useDeuxVolets();

	const contenu = (
		<>
			{glose === undefined ? null : (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-softer">{glose}</p>
			)}
			{children}
		</>
	);

	return (
		<AccordionItem value={cle} id={`rangee-${cle}`}>
			<AccordionTrigger>
				{/*
				  ⚠️ `min-h-15` ET NON LA HAUTEUR DE `size="md"`. Le `h-auto` qu'il
				  faut poser pour laisser un titre revenir à la ligne annule aussi le
				  plancher du kit : la rangée retombait sur la hauteur de son
				  contenu, soit 34 px — sous les 44 pt d'Apple, et c'est très
				  exactement le « galère à manipuler » du terrain. 60 px est la
				  hauteur d'une rangée de liste groupée iOS qui porte un intitulé et
				  sa valeur.
				*/}
				<Button
					variant="transparent"
					outline={false}
					hoverable={false}
					size="md"
					className="h-auto min-h-15 w-full rounded-none"
					contentClassName="w-full items-center justify-between gap-cladd-3xs px-cladd-2xs py-cladd-3xs"
				>
					{/*
					  ⚠️ `basis-1/2` SUR LE TITRE, ET C'EST UN DÉFAUT MESURÉ. Le groupe de
					  droite était `shrink-0` : il prenait sa largeur naturelle en premier,
					  et une valeur un peu longue — « 1 hypothèse · 2 angles morts » —
					  écrasait le titre à dix-neuf pixels sur cinquante-quatre. « Les
					  limites du calcul » se lisait « Les… ». Le titre garde désormais la
					  moitié de la rangée, et la valeur revient à la ligne plutôt que de
					  perdre sa fin : un compte amputé est un compte faux.
					*/}
					<span className="min-w-0 flex-1 basis-1/2 text-left text-cladd-xs font-semibold">
						{titre}
					</span>
					<span className="flex min-w-0 shrink items-center gap-cladd-3xs">
						<span className="text-right text-cladd-xs text-cladd-fg-soft tabular-nums">
							{valeur}
						</span>
						<AccordionIndicator className="flex text-cladd-fg-softer transition-transform duration-150 data-[open]:rotate-90">
							<ChevronRightIcon className="size-5" aria-hidden />
						</AccordionIndicator>
					</span>
				</Button>
			</AccordionTrigger>

			{deuxVolets ? (
				<AccordionPanel>
					<div className="flex flex-col gap-cladd-2xs px-cladd-2xs pb-cladd-2xs">{contenu}</div>
				</AccordionPanel>
			) : (
				/*
				  ⚠️ LA FEUILLE PORTE LE TITRE DE LA RANGÉE, et rien d'autre. Une
				  feuille sans titre laisse le doigt qui l'a ouverte sans preuve
				  qu'il a ouvert la bonne — c'est le défaut qui fait refermer pour
				  vérifier, puis rouvrir.

				  Elle se renvoie de trois façons : le glissement, la croix, et
				  l'appui hors du cadre. Les trois passent par `onOpenChange`, donc
				  par le même `onFermer` : un état d'ouverture qui se perdrait sur
				  l'un des trois laisserait la rangée allumée sur une feuille
				  fermée, et le prochain appui ne ferait rien du tout.
				*/
				<Popup
					open={ouverte}
					onOpenChange={(o) => {
						if (!o) fermer();
					}}
					headerLeft={<span className="px-2 pb-1 text-cladd-xs font-semibold">{titre}</span>}
				>
					<PopupContent>
						<div className="flex flex-col gap-cladd-2xs">{contenu}</div>
					</PopupContent>
				</Popup>
			)}
		</AccordionItem>
	);
}
