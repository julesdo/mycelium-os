import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';
import type { FaitDeLaFrise } from '../lib/verticales/recouvrement/frise';
import { cn } from './cn';
import { dateCourte } from './format';

/**
 * CE QUI S'EST PASSÉ — LES TROIS DERNIERS FAITS, ET LE CHEMIN VERS LES AUTRES.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE CODE DE SHOP, À LA LETTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sur une commande, Shop ne rend pas le suivi entier : une carte « Delivery
 * progress », les trois derniers événements — la date en petit au-dessus, le
 * fait en gras dessous, reliés par un fil —, puis UN bouton gris, « View all
 * activity », qui ouvre le reste en feuille.
 *
 * Sur la page dossier, l'historique était une rangée repliée tout en bas, au
 * milieu de cinq autres. « Où j'en suis » est la première question qu'on se pose
 * en ouvrant un dossier (audit du 29/09/2026, F3), et elle n'avait sa réponse
 * qu'après deux appuis.
 *
 * ⚠️ TROIS, PAS PLUS. Le quatrième fait fait de la carte une liste qu'on lit ;
 * trois se balaient. Le reste est à un appui, et la frise est déjà rangée du plus
 * récent au plus ancien (`composerLaFrise`).
 */
const FAITS_MONTRES = 3;

export function ApercuDuSuivi({
	frise,
	geste,
	children
}: {
	readonly frise: readonly FaitDeLaFrise[];
	/** Le bouton gris qui ouvre tout l'historique. */
	readonly geste: ReactNode;
	/** Ce que le geste ouvre, quand il se déplie sur place (au-delà de 1024 px). */
	readonly children?: ReactNode;
}) {
	const derniers = frise.slice(0, FAITS_MONTRES);

	return (
		<Surface
			as="section"
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<h2 className="text-cladd-xs font-semibold">Ce qui s’est passé</h2>

			{derniers.length === 0 ? (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
					Rien n’est encore noté sur ce dossier.
				</p>
			) : (
				<ol className="flex flex-col">
					{derniers.map((fait, rang) => {
						const dernier = rang === derniers.length - 1;
						return (
							<li key={`${fait.quand}-${rang}`} className="flex gap-cladd-3xs">
								<div className="flex w-3 shrink-0 flex-col items-center pt-1.5" aria-hidden>
									<span
										className={cn(
											'size-2 shrink-0 rounded-full',
											rang === 0 ? 'bg-cladd-fg' : 'bg-cladd-fg-softest'
										)}
									/>
									{dernier ? null : <span className="mt-1 w-px flex-1 bg-cladd-outline" />}
								</div>
								<div className={cn('flex min-w-0 flex-1 flex-col', !dernier && 'pb-cladd-3xs')}>
									<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">
										{dateCourte(new Date(fait.quand).toISOString().slice(0, 10))}
									</span>
									<span className="text-cladd-xs leading-snug font-medium">{fait.titre}</span>
								</div>
							</li>
						);
					})}
				</ol>
			)}

			<div className="flex flex-col pt-1">{geste}</div>
			{children}
		</Surface>
	);
}
