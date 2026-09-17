import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { LinkProps } from '@tanstack/react-router';
import { cn } from './cn';
import { Lien } from './lien';

/**
 * LA BARRE DE NAVIGATION DU BAS.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE A EXISTÉ, ELLE A ÉTÉ SUPPRIMÉE, ET C'ÉTAIT L'ERREUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `src/app/barre.tsx` portait cette barre jusqu'à `ceaf8ce`, qui l'a retirée en
 * même temps que la barre haute. L'argument tenait pour la barre HAUTE — huit
 * cibles de même poids, dont aucune ne disait quoi faire — et il ne tenait pas
 * une seconde pour celle-ci : sur un téléphone, la navigation vit sous le
 * pouce, et un produit sans barre basse oblige à remonter en haut de l'écran
 * pour changer de section. Le terrain l'a nommé le jour même.
 *
 * Le dessin d'origine est donc repris tel quel, et ce fichier en porte les
 * trois pièces : le bloc de verre qui SE DÉPLACE, le faisceau lent sur l'onglet
 * actif, et le report du `safe-area`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE NE CONNAÎT NI LE ROUTEUR NI CONVEX, ET C'EST CE QUI LA REND REGARDABLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `actif` lui est DONNÉ, jamais dérivé : elle n'appelle ni `useRouterState` ni
 * `useQuery`. C'est exactement ce qui permet à la salle d'exposition de la
 * rendre avec chaque onglet actif tour à tour, sans backend ni authentification
 * — et donc de vérifier au regard que le bloc de verre se pose bien sous chacun
 * des quatre.
 *
 * Le seul emprunt au routeur est le TYPE de la destination (`LinkProps['to']`),
 * qui fait échouer la compilation sur une route inexistante. C'est la correction
 * du défaut le plus coûteux de l'ancienne barre : son bouton « Déposer »
 * pointait, en chaîne littérale, vers une route jamais déclarée, et menait à une
 * page d'erreur depuis des semaines sans que rien ne le signale.
 *
 * ⚠️ ET LE RAPPEL EST UN `ReactNode`, PAS UN NOMBRE. Un compte lu dans Convex
 * lève quand la session manque — au chargement, après une expiration, dans la
 * salle. Passé en nombre, il faudrait l'interroger ICI, et la navigation entière
 * disparaîtrait avec lui. Passé en nœud, l'appelant l'isole dans son propre
 * `Facultatif` : la pastille s'éteint seule, la barre reste.
 */

export interface DestinationBarre {
	/** L'identité de l'onglet dans la liste. Jamais affichée. */
	readonly cle: string;
	readonly libelle: string;
	readonly Icone: LucideIcon;
	/**
	 * ⚠️ TYPÉE PAR LE ROUTEUR, pas en `string`. Voir l'en-tête : c'est la seule
	 * barrière qui attrape une destination qui n'existe pas.
	 */
	readonly vers: NonNullable<LinkProps['to']>;
	/** Donné par l'appelant, jamais dérivé ici. */
	readonly actif: boolean;
	/**
	 * La pastille de compte, déjà isolée par l'appelant. Voir `PastilleDeRappel`,
	 * qui en tient la forme à un seul endroit.
	 */
	readonly rappel?: ReactNode;
}

/**
 * LE COMPTE POSÉ SUR UN ONGLET.
 *
 * ⚠️ IL NE S'AFFICHE QU'AU-DESSUS DE ZÉRO, et il est RARE par construction :
 * seul ce qui fait perdre un droit sans qu'on ait rien fait en produit un. Une
 * pastille permanente à « 0 » serait du décor, et le chiffre ne dirait plus rien
 * le jour où il compte.
 *
 * ⚠️ EN BLEU D'ENCRE, PAS EN ROUGE (`.compte-veilleur`). Le rouge, le vert et
 * l'ambre ne disent qu'une chose dans ce produit — au-dessus du seuil, tout
 * près, en dessous — et une notification n'est pas un verdict de seuil.
 */
export function PastilleDeRappel({ compte }: { compte: number }) {
	if (compte <= 0) return null;
	return (
		<span
			className="compte-veilleur"
			aria-label={compte === 1 ? '1 chose à regarder' : `${compte} choses à regarder`}
		>
			{compte > 9 ? '9+' : compte}
		</span>
	);
}

/**
 * ⚠️ LA PILULE DOIT ÊTRE EXACTEMENT PAVÉE PAR SES ONGLETS. Le bloc de verre
 * dérive sa position du RANG et non d'une mesure dans le DOM : sa largeur vaut
 * la piste moins le rembourrage, divisée par le nombre d'onglets, et il se
 * translate de cent pour cent de sa propre largeur par rang.
 *
 * C'est ce qui permet de respecter la règle du projet — aucun `setState` dans un
 * effet —, de suivre tout seul quand un onglet s'ajoute, et de n'avoir rien à
 * resynchroniser au redimensionnement.
 *
 * La contrepartie : un `gap` entre les onglets, ou un onglet plus large que les
 * autres, et le bloc se désaligne progressivement vers la droite. Les onglets
 * sont donc `flex-1 min-w-0` à toutes les largeurs — la part est alors égale
 * quel que soit le contenu.
 */
const REMBOURRAGE_PILULE = '0.75rem';

export function BarreDuBas({ destinations }: { destinations: readonly DestinationBarre[] }) {
	/*
	  −1 quand on est ailleurs que sur les quatre onglets (une page poussée, un
	  décompte). Le bloc s'efface alors au lieu de rester accroché au dernier
	  onglet visité, ce qui affirmerait qu'on est quelque part où l'on n'est pas.
	*/
	const rang = destinations.findIndex((destination) => destination.actif);

	return (
		/*
		  `mb-safe` vient de Cladd : il reporte `env(safe-area-inset-bottom)`,
		  c'est-à-dire la hauteur du trait d'accueil d'iOS. Sans lui, la barre se
		  cale dessous et le dernier onglet ne se touche plus.

		  `z-40` : au-dessus du contenu, et SOUS la feuille de preuve (`z-50`), qui
		  recouvre l'écran entier sous 1024 px et n'a rien à laisser dépasser.

		  ⚠️ `justify-center` ET `md:w-auto` PLUS BAS : au-delà de 768 px, la barre
		  pleine largeur redevient la CAPSULE de verre de l'ancienne version —
		  posée, centrée, étiquetée à côté de l'icône. C'est le même objet, pas un
		  second composant : un second se serait mis à diverger au premier ajustement.
		*/
		<nav
			aria-label="Navigation principale"
			className="mb-safe fixed inset-x-0 bottom-0 z-40 flex justify-center px-cladd-3xs pb-cladd-3xs"
		>
			{/* `rounded-full` et non un rayon d'échelle : la référence pose une vraie
			    pilule, et c'est ce qui la fait lire comme un objet POSÉ sur l'écran
			    plutôt que comme un bandeau accroché au bord. */}
			<div className="verre-dense relative flex w-full items-stretch rounded-full p-1.5 md:w-auto">
				{/*
				  LE BLOC DE VERRE QUI SE DÉPLACE.

				  Un seul bloc GLISSE d'un onglet à l'autre, au lieu que quatre fonds
				  s'allument et s'éteignent. La différence n'est pas décorative : un
				  fond qui apparaît ailleurs oblige l'œil à retrouver où la sélection
				  est partie, alors qu'un objet qui se déplace est suivi sans effort.
				  C'est la même raison qui fait qu'on suit une balle des yeux et pas
				  une ampoule qui clignote.

				  `aria-hidden` : il ne dit rien qu'`aria-current` ne dise déjà sur
				  l'onglet lui-même, et un lecteur d'écran n'a que faire d'un bloc
				  décoratif qui se déplace.
				*/}
				<span
					aria-hidden
					className="verre absolute inset-y-1.5 left-1.5 rounded-full transition duration-500 ease-glisse"
					style={{
						width: `calc((100% - ${REMBOURRAGE_PILULE}) / ${destinations.length})`,
						transform: `translateX(${Math.max(rang, 0) * 100}%)`,
						opacity: rang === -1 ? 0 : 1
					}}
				/>

				{destinations.map(({ cle, libelle, Icone, vers, actif, rappel }) => (
					<Lien
						key={cle}
						to={vers}
						aria-current={actif ? 'page' : undefined}
						/*
						  `min-h-cladd-md` — 48 px, le plancher tactile du projet. Il vaut
						  aussi au-delà de 768 px : la cible PREMIÈRE de ce produit est une
						  tablette en paysage, qui est large ET tactile, donc c'est un doigt
						  qui vise ces onglets et pas un curseur.

						  `md:min-w-28` : au-delà de 768 px les onglets cessent d'occuper
						  toute la largeur et prennent la leur, ce qui fait la capsule. Ils
						  restent `flex-1 min-w-0`, donc de largeurs ÉGALES — ce dont le bloc
						  de verre dépend.

						  `active:scale-95` — l'enfoncement au doigt. Il est posé sur
						  l'ONGLET et non sur la pilule entière : c'est le retour tactile de
						  « j'ai touché ça », et il doit désigner ce qu'on a touché.

						  `z-10` : au-dessus du bloc, qui est absolu. Sans lui, les libellés
						  passent DERRIÈRE le verre et l'onglet actif devient le moins
						  lisible de tous.
						*/
						className={cn(
							'relative z-10 flex min-h-cladd-md min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-1.5',
							'md:min-w-28 md:flex-row md:gap-2',
							'transition duration-150 ease-out active:scale-95',
							actif ? 'text-cladd-fg' : 'text-cladd-fg-softer'
						)}
					>
						<span className="relative inline-flex shrink-0">
							{/*
							  LE FAISCEAU, SUR L'ONGLET ACTIF SEUL.

							  ⚠️ C'EST LE FAISCEAU LENT, PAS CELUI DE L'ACTION. Deux faisceaux
							  identiques sur un écran n'en font aucun : celui d'une action
							  APPELLE — vif, rapide, avec un halo —, celui-ci RESPIRE, deux
							  fois et demie plus lent et sans lueur portée. Voir
							  `.faisceau-lent` dans `app.css`, et le halo du compagnon juste à
							  côté, qui est encore un troisième mouvement et ne les imite ni
							  l'un ni l'autre.

							  Il ne tourne que sur l'onglet ACTIF. Ce qui s'agite en permanence
							  devient du décor en trois jours, et ne dit plus rien le jour où
							  ça compte.
							*/}
							<span
								className={cn(
									'inline-flex size-7 items-center justify-center rounded-full',
									actif && 'faisceau-lent'
								)}
							>
								<Icone size={20} aria-hidden />
							</span>
							{/* La pastille, quand l'appelant en donne une. Elle est posée sur
							    l'ICÔNE et non sur l'onglet : au-delà de 768 px le libellé passe
							    à droite, et une pastille calée sur l'onglet se retrouverait à
							    deux centimètres de ce qu'elle compte. */}
							{rappel === undefined ? null : (
								<span className="absolute -top-0.5 -right-0.5">{rappel}</span>
							)}
						</span>
						<span className="text-cladd-3xs leading-none font-medium md:text-cladd-2xs">
							{libelle}
						</span>
					</Lien>
				))}
			</div>
		</nav>
	);
}
