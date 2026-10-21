import { Surface } from '@cladd-ui/react';
import { cn } from './cn';
import { eurosCentimes } from './format';

/**
 * LES HUIT DERNIÈRES SEMAINES (21/10/2026, « Votre semaine ») : ce qui est rentré, une
 * barre par semaine, la semaine écoulée foncée. À l'encre, jamais aux couleurs de seuil :
 * une semaine basse n'est pas une alerte.
 */
export function BarresDesSemaines({ semaines }: { readonly semaines: readonly bigint[] }) {
	if (semaines.length < 2) return null;
	const plafond = semaines.reduce((haut, s) => (s > haut ? s : haut), 0n);
	const derniere = semaines.length - 1;
	const resume = `${semaines.length} semaines, la dernière : ${eurosCentimes(semaines[derniere]!)}`;
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-2 p-3.5"
		>
			<div role="img" aria-label={resume} className="flex h-24 items-end gap-1.5">
				{semaines.map((montant, rang) => (
					<span
						key={rang}
						className={cn(
							'min-h-0.5 flex-1 rounded-t-sm',
							rang === derniere ? 'bg-cladd-fg' : 'bg-cladd-fg/25'
						)}
						// La seule division est ici, pour l'œil : une hauteur.
						style={{
							height: plafond === 0n ? '0%' : `${Number((montant * 1000n) / plafond) / 10}%`
						}}
					/>
				))}
			</div>
			<p aria-hidden className="flex justify-between text-cladd-4xs text-cladd-fg-soft">
				<span>Il y a {semaines.length} semaines</span>
				<span>La semaine écoulée</span>
			</p>
		</Surface>
	);
}
