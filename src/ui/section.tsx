import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';

/**
 * Une section d'écran : un titre, une légende, un contenu.
 *
 * POURQUOI UNE CARTE, ET PAS UN TITRE SUIVI DE VIDE. Un écran qui empile des
 * intitulés en majuscules séparés par du blanc oblige à reconstituer où chaque
 * bloc commence et finit. La carte le dit, et elle le dit avant qu'on lise :
 * on compte les sections d'un coup d'œil, on sait ce qui va ensemble.
 *
 * La légende vit dans l'en-tête et non sous le titre en petit gris : c'est là
 * qu'on écrit l'unité et la période — « 14 fichiers sur l'exercice 2026 » — et
 * ces deux informations valent plus que le titre lui-même. Le titre dit de quoi
 * on parle, la légende dit de combien et de quand.
 *
 * `actions` reçoit les contrôles propres à la section, jamais ceux de l'écran :
 * ces derniers appartiennent à `PageHeader`. Une action qui remonte ici alors
 * qu'elle vaut pour toute la page devient invisible dès qu'on fait défiler.
 */
export function SectionEcran({
	titre,
	legende,
	actions,
	children
}: {
	titre: string;
	legende?: string;
	actions?: ReactNode;
	children: ReactNode;
}) {
	return (
		<Surface
			as="section"
			outline
			className="rounded-cladd-2xl shadow-carte"
			contentClassName="flex flex-col gap-cladd-2xs p-cladd-2xs"
		>
			<div className="flex flex-wrap items-center justify-between gap-cladd-3xs">
				<div className="min-w-0">
					<h2 className="text-cladd-sm leading-tight font-bold tracking-tight">{titre}</h2>
					{legende ? (
						<p className="mt-0.5 text-cladd-2xs text-cladd-fg-softer">{legende}</p>
					) : null}
				</div>
				{actions ? <div className="flex shrink-0 items-center gap-cladd-3xs">{actions}</div> : null}
			</div>

			{children}
		</Surface>
	);
}
