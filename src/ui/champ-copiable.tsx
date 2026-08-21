import { useState } from 'react';
import { Surface, Button } from '@cladd-ui/react';
import { CopyIcon, CheckIcon } from 'lucide-react';
import { cn } from './cn';

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

	return (
		<Surface
			outline
			className={cn('rounded-cladd-2xl', majeur && 'shadow-carte')}
			contentClassName="flex items-center gap-cladd-2xs p-cladd-2xs"
		>
			<div className="min-w-0 flex-1">
				<p className="text-cladd-2xs text-cladd-fg-softer">{etiquette}</p>
				<p
					className={cn(
						'leading-none font-bold tabular-nums',
						majeur ? 'text-mycelium-chiffre' : 'text-cladd-md'
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
