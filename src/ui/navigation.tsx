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

/**
 * CE QUI FAIT UNE RANGEE, INDEPENDAMMENT DE SON GESTE.
 *
 * Deux rangées existent : celle qui POUSSE vers une page (`LigneAnalyse`) et
 * celle qui APPELLE une fonction (`LigneBouton`). Elles ne diffèrent que par
 * là — l'apparence, elle, doit rester la même au pixel près, sinon la liste se
 * met à mélanger deux rythmes selon la destination de chaque rangée.
 *
 * C'est pour ça que l'apparence est montée UNE fois, ici, et pas recopiée : une
 * copie diverge au premier ajustement, et la divergence ne casse aucun test.
 */
interface ContenuRangee {
	titre: string;
	/**
	 * Un chiffre ou trois mots. JAMAIS une phrase — elle irait a la page.
	 *
	 * ⚠️ FACULTATIVE, ET C'EST UNE MESURE. Une rangée destructrice n'a pas de
	 * « valeur » à montrer : y mettre l'adresse du compte l'a fait passer de 68
	 * à 128 px, parce qu'une adresse longue revient à la ligne. Le chevron seul
	 * suffit à dire qu'on peut entrer.
	 */
	valeur?: string;
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
}

/** Les fentes du kit, remplies à l'identique pour les deux rangées. */
function apparenceRangee({ valeur, precision, icone, attention = false }: ContenuRangee) {
	return {
		icon: icone,
		footer: precision,
		after: (
			<span className="flex shrink-0 items-center gap-1.5">
				{valeur === undefined ? null : (
					<span
						className={cn(
							'text-cladd-xs tabular-nums',
							attention ? 'text-cladd-fg' : 'text-cladd-fg-softer'
						)}
					>
						{valeur}
					</span>
				)}
				<ChevronRightIcon className="size-4 shrink-0 text-cladd-fg-softest" aria-hidden />
			</span>
		),
		className: 'verre-bouton',
		hoverable: false
	};
}

function intituleRangee({ titre, attention = false }: ContenuRangee) {
	return (
		<span className="flex items-center gap-1.5">
			{attention ? (
				<span
					className="size-1.5 shrink-0 rounded-full bg-cladd-fg"
					aria-label="demande une réponse"
				/>
			) : null}
			{titre}
		</span>
	);
}

export function LigneAnalyse({
	vers,
	recherche,
	parametres,
	...contenu
}: ContenuRangee & {
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
	/**
	 * La recherche d'URL, quand la destination en dépend.
	 *
	 * ⚠️ ELLE EST NÉCESSAIRE, ET PAS THÉORIQUE. Le volet d'un débiteur n'a pas
	 * de route à lui : il vit sur `/app/debiteurs` et se choisit par `?d=<id>`.
	 * Sans cette prop, aucune rangée du produit ne pouvait donc atteindre un
	 * débiteur — ce qui est exactement pourquoi l'écran d'une créance affichait
	 * le nom de son débiteur sans pouvoir y mener.
	 */
	recherche?: LinkProps['search'];
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
			// Même raisonnement que `params` : le `as` polymorphe efface le générique
			// du routeur, et la prop de CE composant reste, elle, typée par lui.
			search={recherche as never}
			{...apparenceRangee(contenu)}
		>
			{intituleRangee(contenu)}
		</ListButton>
	);
}

/**
 * LA MEME RANGEE, MAIS QUI APPELLE AU LIEU DE POUSSER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI ELLE EXISTE A COTE DE `LigneAnalyse`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tout ce qui se lit d'un doigt ne vit pas derrière une URL. Le déroulé d'une
 * voie de procédure s'ouvre en feuille, par-dessus l'écran, et se referme :
 * lui donner une route ferait une adresse pour un panneau, et un retour de
 * navigateur qui referme la moitié de l'écran.
 *
 * ⚠️ ET ELLE EST BATIE SUR LE MEME `ListButton` DU KIT. Un `<div>` cliquable
 * aurait la même allure et perdrait tout le reste : l'anneau de focus au
 * clavier, la cible tactile, le rôle de bouton pour un lecteur d'écran. Ce
 * sont exactement les trois choses qu'on ne remarque qu'en leur absence.
 */
export function LigneBouton({
	onClick,
	...contenu
}: ContenuRangee & {
	/** Ce que la rangée déclenche. C'est tout ce qui la distingue de l'autre. */
	onClick: () => void;
}) {
	return (
		<ListButton onClick={onClick} {...apparenceRangee(contenu)}>
			{intituleRangee(contenu)}
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
