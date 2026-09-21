import { cn } from './cn';
import { imageAvatar, type StyleAvatar } from './avatar-dicebear';

/**
 * L'AVATAR — qui est connecté, et sur quel établissement.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL PREND LA PLACE DU LOGO EN HAUT À GAUCHE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La barre portait la marque à gauche, et la marque servait aussi de lien vers
 * l'accueil. Deux défauts en un :
 *
 * 1. Un logotype en haut à gauche d'une application où l'on est DÉJÀ connecté
 *    ne dit rien. Il dit « vous êtes sur Letikette », que l'utilisateur sait,
 *    et il occupe le seul emplacement que toutes les applications réservent à
 *    l'identité de celui qui regarde.
 * 2. Sur un produit multi-établissements, « quel compte, quelle organisation »
 *    est une question qui se pose vraiment — et se tromper d'établissement en
 *    arrêtant un décompte est une erreur qui part chez un tiers.
 *
 * Toutes les références relevées mettent l'avatar là : Revolut Business,
 * Monzo, Klarna. L'accueil, lui, se rejoint par la marque posée dans la barre
 * de navigation — voir `barre.tsx`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * UNE PHOTO, UN AVATAR CHOISI, OU LES INITIALES — dans cet ordre
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit a longtemps refusé la photo : une donnée personnelle de plus à
 * purger. Le terrain l'a demandée le 21/09/2026, avec la bibliothèque d'avatars
 * DiceBear pour qui n'en veut pas. La photo entre donc dans la purge du compte,
 * comme tout le reste. Et les initiales restent le repli : un compte sans image
 * n'est jamais un disque vide.
 */

/**
 * Les initiales d'un nom, au plus deux lettres.
 *
 * ⚠️ ELLE NE PEUT PAS RENDRE DE CHAÎNE VIDE. Un avatar vide est un disque gris
 * qu'on prend pour un défaut de chargement — et cet état-là arrive vraiment :
 * un compte créé par invitation n'a parfois qu'une adresse e-mail, sans nom.
 * On retombe alors sur la première lettre de ce qu'on a, et en dernier recours
 * sur un point d'interrogation, qui dit au moins « on ne sait pas ».
 */
export function initiales(nom: string | undefined | null): string {
	const propre = (nom ?? '').trim();
	if (propre === '') return '?';

	const mots = propre.split(/[\s@._-]+/).filter((m) => m.length > 0);
	if (mots.length === 0) return '?';
	if (mots.length === 1) return (mots[0] ?? '').slice(0, 2).toUpperCase();

	return ((mots[0]?.[0] ?? '') + (mots[1]?.[0] ?? '')).toUpperCase();
}

/** Ce qu'un avatar peut montrer à la place des initiales. */
export type ImageAvatar =
	| { readonly url: string }
	| { readonly style: StyleAvatar; readonly graine: string };

/** L'adresse à poser dans `<img>`, quelle que soit la forme de l'image. */
export function sourceImageAvatar(image: ImageAvatar): string {
	return 'url' in image ? image.url : imageAvatar(image.style, image.graine);
}

export function Avatar({
	nom,
	image = null,
	/** Un point d'attention sur l'avatar — une invitation, un réglage manquant. */
	pastille = false,
	className
}: {
	nom: string | undefined | null;
	image?: ImageAvatar | null;
	pastille?: boolean;
	className?: string;
}) {
	return (
		<span className={cn('relative inline-flex shrink-0', className)}>
			{/*
			  48 px : le plancher tactile du produit. L'avatar est un bouton — il
			  ouvre les réglages — donc il se vise, et un disque de 32 px se rate
			  au pouce sur une barre dont les autres cibles font 48.
			*/}
			{image === null ? (
				<span className="verre verre-actif flex size-cladd-md items-center justify-center rounded-full text-cladd-2xs font-semibold tracking-wide transition-colors">
					{initiales(nom)}
				</span>
			) : (
				<img
					src={sourceImageAvatar(image)}
					alt=""
					className="size-cladd-md rounded-full object-cover ring-1 ring-cladd-outline"
				/>
			)}

			{/*
			  LA PASTILLE. Elle emprunte l'accent `brand` et jamais
			  `--color-seuil-*` : les trois couleurs de seuil ne disent qu'une
			  chose dans ce produit — au-dessus du seuil, tout près, en dessous — et
			  une invitation en attente n'est pas un verdict juridique.

			  L'anneau de la couleur de page la détache de ce qui passe derrière ;
			  sans lui, elle se confond avec le fond animé quand une bande claire
			  passe dessous.
			*/}
			{pastille ? (
				<span
					aria-hidden
					className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-cladd-primary ring-2 ring-cladd-bg"
				/>
			) : null}
		</span>
	);
}
