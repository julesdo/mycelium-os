import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';

/**
 * Un bandeau d'information, en tête d'écran.
 *
 * Sert la règle 2 du contrat : « tout traitement se voit sans qu'on le
 * demande ». Une lecture en cours, un fichier illisible, une classification
 * qui bascule : le gérant ne doit jamais avoir à se demander si le logiciel
 * travaille, ni recharger pour le savoir.
 *
 * Bâti sur `Surface`, et non sur un `<div>` qui empile `bg`, `border` et
 * `rounded`. C'est l'anti-pattern que la documentation de Cladd nomme en
 * premier : « that's literally what Surface is, and it gets the contextual
 * depth, accent ring, and variant/outline API you'd be reinventing ». La
 * version précédente réinventait exactement ça, et perdait au passage la
 * profondeur contextuelle — un bandeau posé dans un panneau imbriqué ne se
 * distinguait plus de son fond.
 *
 * Le ton `alerte` emprunte l'accent `orange` du kit plutôt que l'ambre des
 * seuils. Ce n'est pas un détail : l'ambre de `--color-seuil-proche` ne doit
 * jamais signifier autre chose que « tout près du seuil », sinon le gérant ne
 * peut plus lire une jauge d'un coup d'œil.
 */
export function Bandeau({
	ton = 'neutre',
	icone,
	children,
	action
}: {
	ton?: 'neutre' | 'alerte';
	icone?: ReactNode;
	children: ReactNode;
	action?: ReactNode;
}) {
	return (
		<Surface
			outline
			color={ton === 'alerte' ? 'orange' : undefined}
			className="rounded-cladd-md"
			contentClassName="flex flex-wrap items-center justify-between gap-cladd-3xs px-cladd-3xs py-cladd-3xs"
		>
			<div className="flex min-w-0 items-center gap-cladd-3xs">
				{icone ? <span className="shrink-0 text-cladd-fg-soft">{icone}</span> : null}
				<div className="min-w-0 text-cladd-xs leading-snug">{children}</div>
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</Surface>
	);
}
