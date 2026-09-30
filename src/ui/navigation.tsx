import { useSyncExternalStore, type ReactNode } from 'react';
// ⚠️ LE SEUL `Link` DES ÉCRANS : le repli du retour, qui mène au parent de
// l'adresse et ne transmet aucune provenance. S'il en transmettait une, la
// créance rouverte depuis une analyse reviendrait à l'analyse, en boucle. Tout
// autre lien passe par `Lien`. Voir `eslint.config.js`.
/* eslint-disable @typescript-eslint/no-restricted-imports */
import {
	Link,
	useCanGoBack,
	useRouter,
	useRouterState,
	type LinkProps
} from '@tanstack/react-router';
/* eslint-enable @typescript-eslint/no-restricted-imports */
import { Button, List, ListButton, Surface } from '@cladd-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from './cn';
import { VignetteRangee, type FamilleRangee } from './familles';
import { Lien } from './lien';
import { GOUTTIERE_ENTETE, type ColonneEntete } from './page';

/** Voir `EnteteDetail` : la valeur est déjà réactive, rien à écouter de plus. */
function abonnementSansEffet() {
	return () => undefined;
}

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
			{/*
			  ⚠️ `p-0` SUR LA LISTE, ET C'EST UNE MESURE DE LARGEUR. Relevé au
			  navigateur le 30/09/2026 à 375 px : sur 295 px de rangée utile, la
			  colonne de texte n'en recevait que 85 — le nom du client s'enroulait
			  sur deux lignes et sa sous-ligne se coupait après trois mots. Huit
			  pixels de chaque côté sur la liste, plus huit sur la rangée, faisaient
			  trente-deux pixels de rembourrage superposé pour un seul bord.

			  C'est le geste que la documentation du kit montre elle-même pour une
			  liste posée dans une carte (`List className="-mx-4"`) : la rangée
			  garde le sien, la carte ne le double pas.
			*/}
			<List className="p-0">{children}</List>
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
	/**
	 * Combien de lignes la précision peut prendre avant de se couper : une, par
	 * défaut.
	 *
	 * ⚠️ DEUX, ET SEULEMENT POUR LA FILE DU MATIN. Sa précision n'est pas une
	 * étiquette mais une CONSÉQUENCE — « la date limite du 12 septembre est
	 * dépassée, la décision du juge ne vaut plus rien » —, et coupée à une ligne
	 * elle perdait précisément ce qui la rend urgente. Deux lignes la gardent
	 * balayable ; trois en feraient un paragraphe.
	 */
	lignes?: 1 | 2;
	/**
	 * Une seconde valeur, sous la première, au bord droit : la date d'une rangée
	 * de file sous son montant.
	 *
	 * ⚠️ C'EST LA COLONNE DROITE DE REMOTE ET DE REVOLUT — le montant, puis sa
	 * date. Posée en tête de la précision, « 12 sept. 2026 · » mangeait le tiers
	 * de la seule ligne qui dit ce qui se passe (relevé à 393 px, le 30/09/2026).
	 */
	sousValeur?: string;
	icone?: ReactNode;
	/**
	 * La FAMILLE de la rangée : elle lui donne son pictogramme et sa teinte.
	 *
	 * ⚠️ C'EST LE POINT D'ANCRAGE DE L'ŒIL, ET IL MANQUAIT PARTOUT. Relevé au
	 * navigateur le 30/09/2026 : six pictogrammes sur tout l'écran « Dossiers »,
	 * deux sur celui des clients. Cinq rangées de texte gris rigoureusement
	 * identiques, qu'on ne peut que LIRE une par une. Chez Revolut et Shop, on
	 * cherche le disque coloré, pas le mot.
	 *
	 * Elle l'emporte sur `icone` quand les deux sont données : une famille est
	 * une convention qui se retient, une icône isolée est un choix local.
	 */
	famille?: FamilleRangee;
	/**
	 * L'avatar d'un client, à la place de la vignette.
	 *
	 * ⚠️ IL L'EMPORTE SUR LA FAMILLE, parce qu'il en dit STRICTEMENT PLUS. Dans
	 * une liste de clients ou de dossiers, toutes les rangées sont de la même
	 * nature : une vignette de famille les peindrait toutes pareil, donc elle ne
	 * distinguerait rien. Les initiales, elles, changent à chaque rangée.
	 */
	avatar?: ReactNode;
	/**
	 * RANGÉE DE NAVIGATION OU RANGÉE DE CONTENU — et elles ne se ressemblent pas.
	 *
	 * ⚠️ C'EST LA DISTINCTION QUE SHOP ET REVOLUT TIENNENT, ET PAS NOUS. Relevé le
	 * 30/09/2026 : chez Shop, une commande ne porte pas de chevron, mais « Order
	 * receipt » en porte un ; chez Revolut, aucune transaction n'en porte. Le
	 * chevron dit « ceci mène à un réglage, à une page annexe » ; posé sur chaque
	 * rangée d'une liste de contenu, il dit « tout est un bouton », et c'est la
	 * moitié des « milliards de zones cliquables » du reproche du terrain.
	 *
	 *   `navigation` (défaut) — chevron, valeur en gris : « Fiche du client »,
	 *                           un réglage, « Jamais calculé ».
	 *   `contenu`             — PAS de chevron, valeur forte : un dossier, un
	 *                           client. Le montant est ce qu'on vient lire.
	 */
	genre?: 'navigation' | 'contenu';
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
function apparenceRangee(
	{
		valeur,
		precision,
		lignes = 1,
		sousValeur,
		icone,
		famille,
		avatar,
		attention = false,
		genre = 'navigation'
	}: ContenuRangee,
	/**
	 * Vrai quand la rangée sert de maître : à partir de 1024 px, elle ouvre le
	 * volet voisin au lieu de pousser une page, et son chevron promettrait ce
	 * qu'elle ne fait pas.
	 */
	dansUnMaitre = false
) {
	return {
		icon: avatar ?? (famille === undefined ? icone : <VignetteRangee famille={famille} />),
		/*
		  ⚠️ LA SOUS-LIGNE TIENT SUR UNE LIGNE, ET ELLE SE COUPE. C'est la
		  convention de toute liste iOS, et c'est ce qui sauve la rangée : sans
		  elle, « Remise de la décision à votre client · 1 juin 2026 » s'enroulait
		  sur quatre lignes à 375 px, et la rangée passait à cent cinquante pixels.
		  Cinq rangées de ce genre ne se balaient plus — on les lit une par une.

		  ⚠️ COUPER EST ACCEPTABLE ICI, ET SEULEMENT ICI. Le travail d'une rangée
		  est de se faire TROUVER ; la phrase entière est sur la page qu'elle
		  ouvre. Un libellé de CHAMP, lui, ne se coupe jamais : on le remplirait
		  de travers.
		*/
		footer:
			precision === undefined ? undefined : (
				<span className={cn('block', lignes === 2 ? 'line-clamp-2' : 'truncate')}>{precision}</span>
			),
		after: (
			<span className="flex shrink-0 items-center gap-1">
				{valeur === undefined && sousValeur === undefined ? null : (
					<span className="flex flex-col items-end">
						{valeur === undefined ? null : (
							<span
								className={cn(
									'tabular-nums',
									genre === 'contenu'
										? // Le montant d'une liste de contenu est ce qu'on vient lire :
											// au corps du titre, en graisse moyenne — Revolut, ~16 px.
											'text-cladd-xs font-medium text-cladd-fg'
										: cn('text-cladd-2xs', attention ? 'text-cladd-fg' : 'text-cladd-fg-soft')
								)}
							>
								{valeur}
							</span>
						)}
						{sousValeur === undefined ? null : (
							<span className="text-cladd-2xs text-cladd-fg-soft tabular-nums">{sousValeur}</span>
						)}
					</span>
				)}
				{genre === 'contenu' ? null : (
					<ChevronRightIcon
						className={cn('size-4 shrink-0 text-cladd-fg-softest', dansUnMaitre && 'lg:hidden')}
						aria-hidden
					/>
				)}
			</span>
		),
		className: 'verre-bouton',
		hoverable: false
	};
}

function intituleRangee({ titre, attention = false }: ContenuRangee) {
	return (
		// ⚠️ `truncate` ET `min-w-0` : un nom de société qui revient à la ligne
		// double la hauteur de la rangée, et cinq rangées de deux lignes ne se
		// balaient plus. Il se coupe donc, comme dans toute liste iOS — le nom
		// entier est sur la page qu'elle ouvre, à un doigt d'ici.
		<span className="flex min-w-0 items-center gap-1.5">
			{attention ? (
				<span
					className="size-1.5 shrink-0 rounded-full bg-cladd-fg"
					aria-label="demande une réponse"
				/>
			) : null}
			<span className="truncate">{titre}</span>
		</span>
	);
}

export function LigneAnalyse({
	vers,
	recherche,
	parametres,
	selectionnee,
	...contenu
}: ContenuRangee & {
	/**
	 * La rangée dont le détail est ouvert dans le volet voisin : l'anneau
	 * `selected` du kit.
	 *
	 * ⚠️ DÉFINIE, VRAIE OU FAUSSE, ELLE DIT QUE LA LISTE SERT DE MAÎTRE, et le
	 * chevron disparaît à partir de 1024 px : un chevron et un anneau sur la même
	 * rangée diraient « ouvre une page » et « est déjà ouverte ». Absente, la
	 * rangée pousse une page à toutes les largeurs.
	 */
	selectionnee?: boolean;
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
	 * ⚠️ ELLE EST NÉCESSAIRE, ET PAS THÉORIQUE. Une procédure se choisit par
	 * `?p=<id>` sur `/app/procedures` ; un débiteur s'atteint par `?d=<id>` sur
	 * `/app/debiteurs`, qui redirige vers sa page. Sans cette prop, aucune rangée
	 * du produit ne pourrait atteindre ces deux-là — ce qui est exactement
	 * pourquoi l'écran d'une créance affichait le nom de son débiteur sans
	 * pouvoir y mener.
	 */
	recherche?: LinkProps['search'];
}) {
	return (
		<ListButton
			as={Lien}
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
			selected={selectionnee}
			{...apparenceRangee(contenu, selectionnee !== undefined)}
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
 * LA MÊME RANGÉE, QUI NE MÈNE NULLE PART — une facture qu'on lit.
 *
 * ⚠️ POURQUOI ELLE EXISTE : la fiche d'un client liste ses factures, et une
 * facture n'a pas de page. Rendues en cartes, chacune avec sa case, ses deux
 * pastilles et sa date, elles faisaient la page la plus chargée du produit ; en
 * rangées, elles doivent ressembler à toutes les autres listes, sans promettre
 * un appui qui ne fait rien. `ListItem` du kit n'a ni icône ni valeur : c'est
 * donc le `ListButton` des autres rangées, rendu en `div` et en lecture seule —
 * même rythme, même colonnes, aucun rôle de bouton.
 */
export function LigneFixe(contenu: ContenuRangee) {
	return (
		<ListButton as="div" readOnly {...apparenceRangee(contenu)}>
			{intituleRangee(contenu)}
		</ListButton>
	);
}

/**
 * L'EN-TÊTE D'UNE PAGE POUSSÉE — un retour rond, et le nom centré.
 *
 * LE RETOUR, IDENTIQUE DANS SES DEUX BRANCHES : un disque de verre de 36 px
 * (`md` et `square` — la largeur d'un bouton du kit suit son contenu, et un
 * chevron seul n'en fait pas assez), comme le retour de Revolut Business. Seul
 * le nom lu par le lecteur d'écran change d'une branche à l'autre, jamais la
 * forme.
 */
const PASTILLE_RETOUR = {
	variant: 'transparent',
	outline: false,
	hoverable: false,
	rounded: true,
	square: true,
	size: 'md',
	className: 'verre-bouton shrink-0 text-cladd-fg-soft'
} as const;

export function EnteteDetail({
	retourVers,
	retourParametres,
	retourRecherche,
	retourLibelle,
	retourMasqueEnVolets = false,
	donneesPretes,
	titre,
	sousTitre,
	colonne = 'pleine'
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
	/** Voir `RetourEcran.masqueEnVolets` : le lien passe en `lg:hidden`, rien d'autre. */
	retourMasqueEnVolets?: boolean;
	/**
	 * Vrai quand la page affiche ses données, fausses sinon (attente, erreur, vide).
	 *
	 * ⚠️ IL GARDE LE TITRE DE PROVENANCE. Voir `parHistorique` plus bas.
	 */
	donneesPretes: boolean;
	titre: string;
	sousTitre?: string;
	/** La colonne du corps, sur laquelle le titre s'aligne. Voir `GOUTTIERE_ENTETE`. */
	colonne?: ColonneEntete;
}) {
	const router = useRouter();
	const peutRevenir = useCanGoBack();
	/**
	 * La source est celle de `useCanGoBack` : l'emplacement validé à la fin d'une
	 * navigation, et non l'historique brut, qui change dès son départ et ferait
	 * changer le libellé de la page qu'on quitte.
	 */
	const titreLu = useRouterState({
		select: (etat) => etat.location.state.titreDeProvenance ?? null
	});
	/**
	 * ⚠️ RENDU APRÈS LE MONTAGE, JAMAIS AU PREMIER RENDU. Le serveur ne connaît que
	 * l'adresse : rendre l'état de la navigation au premier rendu ferait diverger
	 * le serveur et le client après un rechargement. L'instantané serveur est
	 * nul, donc le serveur ET l'hydratation rendent le repli ; React rend ensuite
	 * la valeur du client, sans `setState` dans un effet.
	 *
	 * L'abonnement est vide : `useRouterState` rend déjà le titre réactif. Ce
	 * crochet ne sert qu'à séparer l'instantané du serveur de celui du client.
	 */
	const titreDeProvenance = useSyncExternalStore(
		abonnementSansEffet,
		() => titreLu,
		() => null
	);

	/**
	 * ⚠️ DEUX BRANCHES, JAMAIS MÉLANGÉES. Le libellé tiré de l'historique ne va
	 * qu'avec le geste qui y retourne, et le nom du parent qu'avec le lien qui y
	 * mène. « Accueil » posé sur un lien vers les débiteurs mentirait sur le seul
	 * geste qu'on fait sans regarder.
	 *
	 * `useCanGoBack` ne suffit pas seul : l'entrée précédente peut venir d'avant
	 * l'application (une messagerie, un onglet vide), et elle n'a pas de titre.
	 */
	/**
	 * ⚠️ LE TITRE DE PROVENANCE NE SE RELIT QUE SUR UNE PAGE PRÊTE. Il vit dans
	 * l’historique du navigateur, qui survit à la déconnexion : sur une tablette
	 * partagée, B se connecte après A, appuie sur retour, et retombe sur l’adresse
	 * d’une créance de A. La page n’affiche rien, faute de droits, mais la pastille
	 * afficherait le nom du débiteur de A, écrit là par la navigation précédente.
	 * Une ressource d’un autre établissement n’atteint jamais l’état prêt ; les
	 * titres des onglets, eux, sont écrits dans le code.
	 */
	const parHistorique = donneesPretes && peutRevenir && titreDeProvenance !== null;

	/*
	  ═══════════════════════════════════════════════════════════════════════════
	  ⚠️ UNE BARRE COMPACTE, ET PLUS DE GRAND TITRE DANS LA PAGE
	  ═══════════════════════════════════════════════════════════════════════════

	  Le 30/09/2026, la barre collante portait le retour ET un grand titre de
	  trente pixels : 162 px à 393 px, 19 % de l'écran d'un téléphone. Le même
	  soir, le grand titre a défilé avec la page (le code d'iOS) ; puis le
	  fondateur a tranché pour tout le produit : « fais la même barre compacte
	  partout, less is more ».

	  C'est la page de Revolut Business sur une facture, relevée sur Mobbin : un
	  retour ROND à gauche, sans libellé, et le nom centré en petit. Le contenu
	  commence juste dessous — ici, le montant.

	  ⚠️ LE LIBELLÉ DU RETOUR NE DISPARAÎT QU'À L'ŒIL. Le bouton garde son nom pour
	  un lecteur d'écran — « Aujourd'hui », « Vos clients » — et les deux branches
	  ci-dessous restent distinctes : le nom tiré de l'historique ne va qu'avec le
	  geste qui y retourne.

	  ⚠️ TROIS COLONNES, ET LA TROISIÈME EST VIDE. Elle vaut la largeur du retour :
	  c'est ce qui centre le titre sur l'ÉCRAN et non sur la place qui lui reste.
	  Quand le retour se masque en deux volets, sa colonne reste — le titre ne
	  bouge pas d'un pixel en passant 1024 px.
	*/
	const classeRetour = cn(PASTILLE_RETOUR.className, retourMasqueEnVolets && 'lg:invisible');

	return (
		<header
			className={cn(
				'verre-barre-haute sticky top-0 z-30 -mx-cladd-2xs grid shrink-0 grid-cols-[2.25rem_minmax(0,1fr)_2.25rem] items-center gap-cladd-3xs pt-barre-app pb-cladd-3xs',
				GOUTTIERE_ENTETE[colonne]
			)}
		>
			{parHistorique ? (
				<Button {...PASTILLE_RETOUR} className={classeRetour} onClick={() => router.history.back()}>
					<ChevronLeftIcon aria-hidden />
					<span className="sr-only">{titreDeProvenance}</span>
				</Button>
			) : (
				<Button
					{...PASTILLE_RETOUR}
					className={classeRetour}
					as={Link}
					to={retourVers}
					// Même assertion que `LigneAnalyse` : le `as` polymorphe efface le
					// générique du routeur, les props de CE composant restent typées par lui.
					params={retourParametres as never}
					search={retourRecherche as never}
				>
					<ChevronLeftIcon aria-hidden />
					<span className="sr-only">{retourLibelle}</span>
				</Button>
			)}
			<div className="flex min-w-0 flex-col items-center text-center">
				<h1 className="max-w-full truncate text-cladd-xs leading-tight font-semibold">{titre}</h1>
				{sousTitre ? (
					<p className="max-w-full truncate text-cladd-3xs text-cladd-fg-soft">{sousTitre}</p>
				) : null}
			</div>
			<span aria-hidden />
		</header>
	);
}
