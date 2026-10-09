import { useState } from 'react';
import { Surface, Button } from '@cladd-ui/react';
import { CopyIcon, CheckIcon } from 'lucide-react';
import { cn } from './cn';

/** Copier une valeur, et dire pendant un instant qu'elle l'est. */
function useCopie(valeur: string) {
	const [copie, setCopie] = useState(false);

	async function copier() {
		try {
			await navigator.clipboard.writeText(valeur);
			setCopie(true);
			window.setTimeout(() => setCopie(false), 1600);
		} catch {
			// Presse-papiers refusé — navigateur ancien, contexte non sécurisé,
			// permission bloquée. Le chiffre reste lisible et sélectionnable à
			// l'écran : on n'a rien perdu, on a seulement gagné moins.
		}
	}

	return { copie, copier: () => void copier() };
}

/**
 * LA MÊME COPIE, EN RANGÉE — pour une carte qui en groupe plusieurs.
 *
 * ⚠️ POURQUOI ELLE EXISTE À CÔTÉ DE `ChampCopiable` (01/10/2026). La page où le
 * client paie posait quatre `ChampCopiable` — quatre cartes, chacune avec sa
 * valeur en corps de titre — pour un bénéficiaire, un IBAN, un montant et une
 * référence. Relevé sur Mobbin : OKX, Shopee et Airwallex groupent ces
 * coordonnées dans UNE carte, une rangée chacune, l'étiquette au-dessus de la
 * valeur et la copie au bout. C'est cette rangée, à poser dans une
 * `ListeDeRangees`.
 *
 * L'étiquette AU-DESSUS, et pas à gauche : un IBAN de trente-trois signes ne
 * tient pas à côté d'une étiquette à 393 px, et coupé il ne se vérifie plus.
 */
export function LigneCopiable({
	etiquette,
	affichage,
	valeur
}: {
	etiquette: string;
	/** Ce qu'on lit : formaté pour l'œil. */
	affichage: string;
	/** Ce qu'on colle : brut, tel que le formulaire de la banque l'attend. */
	valeur: string;
}) {
	const { copie, copier } = useCopie(valeur);
	return (
		<div className="flex min-h-13 items-center gap-cladd-2xs px-cladd-2xs py-cladd-3xs">
			<div className="min-w-0 flex-1">
				<p className="text-cladd-2xs text-cladd-fg-softer">{etiquette}</p>
				<p className="text-cladd-xs font-semibold tabular-nums">{affichage}</p>
			</div>
			<Button
				square
				rounded
				onClick={copier}
				aria-label={copie ? `${etiquette} copié` : `Copier ${etiquette}`}
				color={copie ? 'brand' : undefined}
			>
				{copie ? <CheckIcon /> : <CopyIcon />}
			</Button>
		</div>
	);
}

/**
 * Un chiffre à recopier ailleurs, et le bouton qui évite de le recopier.
 *
 * POURQUOI CE COMPOSANT EXISTE. La télédéclaration se remplit sur un autre
 * site, champ par champ. Le seul endroit du parcours où le gérant peut encore
 * se tromper tout seul, c'est en retapant « 168 400 » à partir d'un écran qui
 * affiche « 168 400 € ». Un bouton copier supprime cette erreur-là, et c'est la
 * dernière qui restait.
 *
 * LA VALEUR COPIÉE N'EST PAS CELLE QUI EST AFFICHÉE. À l'écran, un montant se
 * lit avec ses séparateurs de milliers et son symbole ; dans un formulaire, il
 * se saisit en chiffres bruts, point décimal. Coller « 168 400 € » dans un
 * champ numérique donne au mieux une erreur de saisie, au pire un zéro accepté
 * en silence.
 */
export function ChampCopiable({
	etiquette,
	affichage,
	valeur,
	aide,
	majeur = false
}: {
	etiquette: string;
	/** Ce qu'on lit : formaté pour l'œil. */
	affichage: string;
	/** Ce qu'on colle : brut, tel que le formulaire l'attend. */
	valeur: string;
	aide?: string;
	/** Les trois montants que la déclaration demande vraiment. */
	majeur?: boolean;
}) {
	const { copie, copier } = useCopie(valeur);

	return (
		<Surface
			variant="transparent"
			// L'anneau d'accent marque le champ majeur, et il se voit AU REPOS —
			// contrairement a une classe de survol, qui ne dirait rien tant qu'on
			// ne passe pas dessus.
			outline={majeur}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex items-center gap-cladd-2xs p-cladd-2xs"
		>
			<div className="min-w-0 flex-1">
				<p className="text-cladd-2xs text-cladd-fg-softer">{etiquette}</p>
				<p
					className={cn(
						// Une adresse de page est un seul mot de soixante signes : sans coupure
						// possible, elle passait sous le bouton de copie (09/10/2026).
						'leading-tight font-bold tabular-nums [overflow-wrap:anywhere]',
						majeur ? 'text-letikette-chiffre' : 'text-cladd-md'
					)}
				>
					{affichage}
				</p>
				{aide ? <p className="mt-1 text-cladd-3xs text-cladd-fg-softer">{aide}</p> : null}
			</div>

			<Button
				square
				rounded
				onClick={() => void copier()}
				aria-label={`Copier ${etiquette}`}
				color={copie ? 'brand' : undefined}
			>
				{copie ? <CheckIcon /> : <CopyIcon />}
			</Button>
		</Surface>
	);
}
