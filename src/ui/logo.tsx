import { useId } from 'react';
import { cn } from './cn';

/**
 * Le nom, écrit à la main et en capitales.
 *
 * POURQUOI DES CAPITALES. Une cursive minuscule lit « signature » ou
 * « enseigne » ; des capitales manuscrites lisent « écrit sur une étiquette »,
 * ce qui est exactement le nom du produit. C'est aussi le seul des deux qui
 * reste lisible en petit : les déliés d'une anglaise se cassent sous une
 * vingtaine de pixels.
 *
 * LE MOT RESTE EN MINUSCULES DANS LE DOM, et les capitales sont posées par le
 * style. Un lecteur d'écran qui rencontre « LETIKETTE » l'épelle parfois lettre
 * par lettre ; « Letikette » se prononce.
 *
 * AUCUNE CLASSE DE GRAISSE, ET C'EST VOLONTAIRE. Caveat Brush n'existe qu'en
 * 400 : c'est une brosse, pas une fonte variable. Écrire `font-bold` dessus
 * déclencherait le GRAS SYNTHÉTIQUE du navigateur, qui épaissit uniformément un
 * tracé dont tout l'intérêt est de varier d'épaisseur — le mot sortirait bavé.
 */
export function MotLetikette({ className }: { className?: string }) {
	return (
		<span className={cn('font-manuscrit text-letikette-marque tracking-wide uppercase', className)}>
			Letikette
		</span>
	);
}

/**
 * LA MARQUE — une étiquette, et un L.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE REMPLACE UNE ASSIETTE DE PORCELAINE, ET IL FALLAIT LE FAIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La marque précédente dessinait une assiette, vue de trois quarts, avec son
 * marli et son filet bleu. Le raisonnement était bon à l'époque : le mot disait
 * le produit deux fois — l'objet d'une cantine, et « l'assiette » au sens
 * comptable, la base sur laquelle un taux se calcule. Le taux EGalim se mesurait
 * exactement là-dessus.
 *
 * EGalim a été retiré du produit le 3 septembre 2026. Il ne reste plus une
 * seule cantine, plus un seul taux d'assiette : Letikette est un logiciel de
 * recouvrement de créances B2B. Une assiette de porcelaine sur l'écran d'un
 * dirigeant qui réclame quarante-huit mille euros ne dit rien — ou pire, elle
 * dit « restauration », c'est-à-dire un autre métier.
 *
 * Un logo qui illustre une verticale disparue est la même famille de défaut que
 * les gabarits d'e-mail oubliés après le pivot : il survit parce qu'il ne casse
 * aucun test.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QUE DESSINE LA NOUVELLE, ET POURQUOI ELLE TIENT À 16 PIXELS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une ÉTIQUETTE — le nom du produit, littéralement — dont un coin est coupé,
 * comme une étiquette volante qu'on accroche à un dossier. Dedans, un L.
 *
 * Le relevé des grandes applications financières donne toutes la même réponse :
 * une forme pleine, une seule lettre ou un seul signe, aucun détail interne.
 * Revolut pose un R, Klarna un K, Monzo un éclair. La raison est mécanique :
 * cette marque apparaît en 16 px dans un onglet, en 20 px dans une barre de
 * navigation, et en 180 px sur un écran d'accueil iOS. Tout détail qui demande
 * plus de deux pixels disparaît au premier des trois.
 *
 * C'est ce qui condamnait l'assiette : ses quatre zones concentriques, son
 * filet et sa glaçure étaient invisibles sous vingt pixels, et il ne restait
 * qu'un rond gris. La documentation du fichier l'admettait déjà — « il
 * disparaît sous vingt pixels, ce qui est sans importance : l'icône d'onglet
 * est un dessin distinct ». Deux dessins pour une marque, c'est une marque
 * qu'on ne reconnaît pas.
 *
 * ⚠️ LE COIN COUPÉ EST EN HAUT À DROITE, et c'est la seule liberté du dessin.
 * Il donne à la silhouette une asymétrie reconnaissable à très petite taille —
 * un carré arrondi de plus ne se distingue d'aucun autre carré arrondi sur un
 * écran d'accueil de téléphone, où il en voisine trente.
 *
 * LES IDENTIFIANTS SONT UNIQUES PAR INSTANCE. Les `id` de dégradé sont globaux
 * au document : deux marques rendues sur le même écran — la barre basse et un
 * en-tête — entreraient en collision et la seconde piocherait les dégradés de
 * la première. `useId` les sépare ; ses deux-points sont retirés parce qu'ils
 * rendent l'identifiant inutilisable dans un sélecteur CSS.
 *
 * ELLE ÉCRIT SES COULEURS EN CLAIR, et c'est la seule primitive du produit dans
 * ce cas. Une marque est une couleur, pas une teinte héritée : posée en
 * `currentColor`, elle changerait de sens selon l'écran. Elle vit dans
 * `src/ui`, la seule zone où la muselière ne s'applique pas.
 */
export function LogoLetikette({ className }: { className?: string }) {
	const cle = useId().replaceAll(':', '');
	const corps = `corps-${cle}`;
	const arete = `arete-${cle}`;

	return (
		<svg
			viewBox="0 0 100 100"
			xmlns="http://www.w3.org/2000/svg"
			role="img"
			aria-label="Letikette"
			className={className}
		>
			<defs>
				{/* Le corps. Deux bleus de la famille de marque, en diagonale : c'est
				    la même teinte que l'accent et que le fond animé, donc la marque
				    appartient à son écran au lieu d'y être posée. */}
				<linearGradient id={corps} x1="0" y1="0" x2="0.85" y2="1">
					<stop offset="0" stopColor="#3d6bf5" />
					<stop offset="0.55" stopColor="#2a46c8" />
					<stop offset="1" stopColor="#5b3fd4" />
				</linearGradient>
				{/* L'arête de lumière sur la tranche haute. Un aplat dégradé lit
				    « rectangle coloré » ; ce liseré, lui, fait lire un OBJET — c'est
				    la même pièce que sur le verre et sur la coque de tablette. */}
				<linearGradient id={arete} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#ffffff" stopOpacity="0.42" />
					<stop offset="0.42" stopColor="#ffffff" stopOpacity="0" />
				</linearGradient>
			</defs>

			{/*
			  LA SILHOUETTE. Un carré aux angles très arrondis dont le coin haut
			  droit est coupé net — l'étiquette volante.

			  Le tracé est écrit à la main plutôt qu'en `rect` + masque : un masque
			  ajoute un nœud de rendu, et surtout il se comporte mal dans les
			  contextes qui aplatissent le SVG (l'export en favicon, l'impression).
			*/}
			<path
				d="M22 4 H62 L96 38 V78 A18 18 0 0 1 78 96 H22 A18 18 0 0 1 4 78 V22 A18 18 0 0 1 22 4 Z"
				fill={`url(#${corps})`}
			/>
			<path
				d="M22 4 H62 L96 38 V78 A18 18 0 0 1 78 96 H22 A18 18 0 0 1 4 78 V22 A18 18 0 0 1 22 4 Z"
				fill={`url(#${arete})`}
			/>

			{/* Le pli du coin coupé : la petite languette repliée d'une étiquette.
			    Elle est en blanc très transparent, donc elle survit à la
			    réduction en se fondant plutôt qu'en faisant une tache. */}
			<path d="M62 4 L96 38 H70 A8 8 0 0 1 62 30 Z" fill="#ffffff" fillOpacity="0.28" />

			{/*
			  LE L. Deux traits, l'un vertical, l'autre horizontal, à bouts carrés.

			  ⚠️ PAS DE FONTE, UN TRACÉ. Un `<text>` dans un SVG dépend de la police
			  installée sur la machine qui le rend : le favicon, l'icône iOS et
			  l'aperçu d'un courriel sortiraient chacun dans une lettre différente,
			  et sur un serveur sans polices, dans rien du tout.
			*/}
			<path d="M34 26 H46 V62 H70 V74 H34 Z" fill="#ffffff" />
		</svg>
	);
}
