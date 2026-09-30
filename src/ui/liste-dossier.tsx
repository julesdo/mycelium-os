import type { ReactNode } from 'react';
import {
	AccordionIndicator,
	AccordionItem,
	AccordionPanel,
	AccordionTrigger,
	Button,
	SectionTitle,
	Surface
} from '@cladd-ui/react';
import { ChevronRightIcon } from 'lucide-react';

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
export function ListeDuDossier({
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

export function RangeeDuDossier({
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
	return (
		<AccordionItem value={cle} id={`rangee-${cle}`}>
			<AccordionTrigger>
				<Button
					variant="transparent"
					outline={false}
					hoverable={false}
					// `md` vaut 48 px sur l'échelle décalée du produit : le plancher
					// tactile, sans hauteur écrite à la main.
					size="md"
					className="h-auto w-full rounded-none"
					contentClassName="w-full items-center justify-between gap-cladd-3xs px-cladd-2xs"
				>
					<span className="min-w-0 truncate text-left text-cladd-xs font-semibold">{titre}</span>
					<span className="flex shrink-0 items-center gap-cladd-3xs">
						<span className="text-cladd-2xs text-cladd-fg-soft tabular-nums">{valeur}</span>
						<AccordionIndicator className="flex text-cladd-fg-softer transition-transform duration-150 data-[open]:rotate-90">
							<ChevronRightIcon className="size-4" aria-hidden />
						</AccordionIndicator>
					</span>
				</Button>
			</AccordionTrigger>

			<AccordionPanel>
				<div className="flex flex-col gap-cladd-2xs px-cladd-2xs pb-cladd-2xs">
					{glose === undefined ? null : (
						<p className="text-cladd-2xs leading-snug text-cladd-fg-softer">{glose}</p>
					)}
					{children}
				</div>
			</AccordionPanel>
		</AccordionItem>
	);
}
