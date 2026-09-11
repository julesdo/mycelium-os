import type { ReactNode } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { List, ListButton, Surface } from '@cladd-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * LA RANGÉE QUI POUSSE VERS UNE PAGE — le geste central d'une application
 * mobile, et celui qui manquait à ce produit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CE COMPOSANT EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran de créance empilait SEPT analyses, chacune dans une carte pleine de
 * phrases : 6,1 écrans de défilement à 375 px, mesurés. Chaque carte expliquait
 * son raisonnement là où le lecteur ne voulait qu'un verdict.
 *
 * Une application mobile ne fait jamais ça. Elle montre une RANGÉE par sujet —
 * un intitulé, une valeur, un chevron — et pousse vers une page quand on veut
 * le détail. Le résumé tient sur un écran ; l'explication existe toujours, mais
 * à un geste de distance, pour ceux qui la cherchent.
 *
 * ⚠️ LA VALEUR EST UN CHIFFRE OU TROIS MOTS, JAMAIS UNE PHRASE. C'est la
 * contrainte qui fait tenir l'écran. « 2 pièces sur 4 » se lit d'un coup d'œil ;
 * « trois des quatre pièces attendues sont absentes » est une phrase, et sa
 * place est sur la page de détail.
 *
 * ⚠️ ET ON BÂTIT SUR `ListButton`, PAS SUR UN `<div>` CLIQUABLE. Le kit fournit
 * la rangée : l'anneau de focus au clavier, la cible tactile, les fentes
 * `icon` / `footer` / `after`, et le rendu polymorphe en `<a>` pour un lien de
 * routeur. Réimplémenter tout ça, c'est exactement ce que le projet interdit.
 */

export function ListeAnalyses({ children }: { children: ReactNode }) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			// `p-0` : c'est `List` qui porte le rembourrage des rangées, et deux
			// rembourrages superposés font une carte qui flotte dans sa propre marge.
			contentClassName="p-0"
		>
			<List>{children}</List>
		</Surface>
	);
}

export function LigneAnalyse({
	vers,
	parametres,
	titre,
	valeur,
	precision,
	icone,
	attention = false
}: {
	/**
	 * La route de la page de détail.
	 *
	 * ⚠️ TYPÉE PAR LE ROUTEUR, pas en `string`. L'arbre des routes est généré ;
	 * une cible inexistante devient une erreur de compilation au lieu d'un lien
	 * mort découvert au doigt. C'est aussi ce qui permet à `params` d'être
	 * vérifié contre les segments de la route.
	 */
	vers: LinkProps['to'];
	parametres?: LinkProps['params'];
	titre: string;
	/** Un chiffre ou trois mots. JAMAIS une phrase — elle irait à la page. */
	valeur: string;
	/** Une précision courte sous l'intitulé, quand elle change la lecture. */
	precision?: string;
	icone?: ReactNode;
	/**
	 * Marque la rangée qui demande quelque chose.
	 *
	 * ⚠️ AUCUNE COULEUR DE SEUIL. Le vert, l'ambre et le rouge ne disent qu'une
	 * chose dans ce produit — au-dessus du seuil, tout près, en dessous. Une
	 * rangée qui attend une réponse n'est pas un verdict : elle se marque par un
	 * point, pas par une couleur.
	 */
	attention?: boolean;
}) {
	return (
		<ListButton
			as={Link}
			to={vers}
			/*
			  ⚠️ UNE ASSERTION, ET UNE SEULE, À CET ENDROIT PRÉCIS.

			  `ListButton` est polymorphe : en passant par son `as`, le générique du
			  routeur est effacé et `params` retombe sur une signature large. Les
			  props de CE composant restent, elles, typées par le routeur — un
			  appelant qui viserait une route inexistante échoue toujours à la
			  compilation. L'assertion ne perd donc rien de la vérification, elle la
			  déplace d'un cran.
			*/
			params={parametres as never}
			icon={icone}
			footer={precision}
			after={
				<span className="flex shrink-0 items-center gap-1.5">
					<span
						className={cn(
							'text-cladd-xs tabular-nums',
							attention ? 'text-cladd-fg' : 'text-cladd-fg-softer'
						)}
					>
						{valeur}
					</span>
					<ChevronRightIcon className="size-4 shrink-0 text-cladd-fg-softest" aria-hidden />
				</span>
			}
			className="verre-bouton"
			hoverable={false}
		>
			<span className="flex items-center gap-1.5">
				{attention ? (
					<span
						className="size-1.5 shrink-0 rounded-full bg-cladd-fg"
						aria-label="demande une réponse"
					/>
				) : null}
				{titre}
			</span>
		</ListButton>
	);
}

/**
 * L'EN-TÊTE D'UNE PAGE POUSSÉE.
 *
 * ⚠️ LE RETOUR EST UN CHEVRON EN HAUT À GAUCHE, et il porte le nom de l'écran
 * d'où l'on vient. C'est la convention de toutes les applications mobiles, et
 * elle dit deux choses en un geste : on peut revenir, et on sait où.
 *
 * Il est posé AVANT le titre, pas à côté : un titre long le pousserait hors de
 * l'écran s'ils partageaient la ligne, et c'est le retour qu'on perdrait.
 */
export function EnteteDetail({
	retourVers,
	retourParametres,
	retourRecherche,
	retourLibelle,
	titre,
	sousTitre
}: {
	retourVers: LinkProps['to'];
	retourParametres?: LinkProps['params'];
	/**
	 * Les paramètres de recherche du retour.
	 *
	 * ⚠️ SANS EUX, LE RETOUR PERD LA SÉLECTION. L'écran des débiteurs porte le
	 * débiteur ouvert dans son adresse (`?d=…`) : revenir sans le rendre
	 * rouvrirait la liste vide, et le gérant aurait à rechercher son client
	 * après chaque aller-retour.
	 */
	retourRecherche?: LinkProps['search'];
	retourLibelle: string;
	titre: string;
	sousTitre?: string;
}) {
	return (
		<header className="flex shrink-0 flex-col gap-cladd-3xs px-cladd-3xs pt-barre-app pb-cladd-3xs">
			<Link
				to={retourVers}
				params={retourParametres}
				search={retourRecherche}
				// ⚠️ `min-h-11` — 44 px. Sans lui le retour se dimensionne sur sa ligne
				// de texte et tombe à 33 px : c'est la commande la plus utilisée de
				// toute page poussée, et la plus petite cible de l'écran. Mesuré au
				// navigateur, invisible partout ailleurs.
				className="verre-bouton -ml-1.5 flex min-h-11 w-fit items-center gap-0.5 rounded-full pr-3 pl-1.5 text-cladd-xs text-cladd-fg-soft"
			>
				<ChevronLeftIcon className="size-4 shrink-0" aria-hidden />
				{retourLibelle}
			</Link>
			<div className="min-w-0">
				<h1 className="text-letikette-titre leading-tight font-bold tracking-tight text-balance">
					{titre}
				</h1>
				{sousTitre ? <p className="mt-1 text-cladd-xs text-cladd-fg-soft">{sousTitre}</p> : null}
			</div>
		</header>
	);
}
