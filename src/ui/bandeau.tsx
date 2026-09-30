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
			variant="transparent"
			outline={false}
			color={ton === 'alerte' ? 'orange' : undefined}
			className="verre-carte rounded-cladd-md"
			/*
			  ⚠️ `flex-nowrap` DEPUIS LE 30/09/2026, ET C'EST UNE MESURE. Avec
			  `flex-wrap`, un bandeau de deux lignes à 375 px renvoyait sa commande
			  sur une troisième ligne à elle seule : 174 px de haut pour douze mots,
			  en tête de l'écran du matin. Le geste tient à droite du texte, comme
			  la croix d'une notification iOS, et le texte se replie contre lui.
			*/
			contentClassName="flex items-start justify-between gap-cladd-3xs px-cladd-3xs py-cladd-3xs"
		>
			<div className="flex min-w-0 items-start gap-cladd-3xs">
				{icone ? <span className="mt-1 shrink-0 text-cladd-fg-soft">{icone}</span> : null}
				<div className="min-w-0 text-cladd-xs leading-snug">{children}</div>
			</div>
			{action ? <div className="shrink-0">{action}</div> : null}
		</Surface>
	);
}
