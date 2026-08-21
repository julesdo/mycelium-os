import { Chip } from '@cladd-ui/react';
import { LABELS } from './egalim';

/**
 * Ce qu'un produit rapporte au barème, dit en toutes lettres.
 *
 * Trois réponses possibles, et trois seulement : il compte dans les deux
 * ratios (bio), il compte dans le seul ratio durable, il ne compte dans aucun.
 * Un gérant qui regarde cet écran ne se demande rien d'autre.
 *
 * POURQUOI DES MOTS, ET PAS UNE COULEUR. Le vert, le rouge et l'ambre sont
 * réservés aux trois taux : ils disent « au-dessus du seuil », « tout près »,
 * « en dessous », et rien d'autre dans tout le produit. Un badge vert « Bio »
 * détournerait ce vocabulaire au moment précis où il doit rester univoque —
 * on lirait « c'est bon » là où il faut lire « ça compte dans le calcul ».
 * Le badge porte donc l'encre de la marque, et c'est le mot qui informe.
 */

export type Mentions = readonly string[];

/** Le verdict d'un produit, tel que le barème le voit. */
export function estBio(mentions: Mentions): boolean {
	return mentions.some((m) => LABELS[m]?.compteBio === true);
}

export function Verdict({
	mentions,
	estAlimentaire,
	taille = 'md'
}: {
	mentions: Mentions;
	estAlimentaire: boolean;
	taille?: 'sm' | 'md';
}) {
	if (!estAlimentaire) {
		return (
			<Chip size={taille} color="neutral">
				Non alimentaire
			</Chip>
		);
	}

	if (mentions.length === 0) {
		return (
			<Chip size={taille} color="neutral">
				Hors barème
			</Chip>
		);
	}

	const bio = estBio(mentions);

	return (
		<div className="flex flex-wrap items-center gap-cladd-3xs">
			<Chip size={taille} color="brand">
				{bio ? 'Bio' : 'Durable'}
			</Chip>
			{/* Les mentions exactes suivent, parce que c'est ce qu'un contrôleur
			    demandera : « durable » n'est pas une case à cocher sur une facture,
			    « Label Rouge » l'est. */}
			{mentions.map((m) => (
				<Chip key={m} size={taille} color="neutral">
					{LABELS[m]?.nom ?? m}
				</Chip>
			))}
		</div>
	);
}
