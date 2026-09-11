import { cn } from './cn';

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
 * ⚠️ LES INITIALES, ET PAS UNE PHOTOGRAPHIE. Le produit ne demande pas de
 * photo et n'en stockera pas : ce serait une donnée personnelle de plus à
 * purger, sur un produit dont la purge RGPD est déjà totale et sans exception.
 * Deux lettres suffisent à distinguer deux comptes.
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

export function Avatar({
	nom,
	/** Un point d'attention sur l'avatar — une invitation, un réglage manquant. */
	pastille = false,
	className
}: {
	nom: string | undefined | null;
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
			<span className="verre verre-actif flex size-cladd-md items-center justify-center rounded-full text-cladd-2xs font-semibold tracking-wide transition-colors">
				{initiales(nom)}
			</span>

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
