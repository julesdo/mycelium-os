import { useSyncExternalStore, type ReactNode } from 'react';
import { cn } from './cn';

/**
 * LE MAÎTRE ET SON DÉTAIL : LA LISTE À GAUCHE, CE QU'ELLE OUVRE À DROITE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI PAS `TwoPane`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `TwoPane` rend sa preuve DEUX fois : dans le volet, et dans la feuille du
 * téléphone. Une route enfant passée là (`<Outlet />`) serait montée deux fois,
 * avec ses requêtes et ses états en double. Il reste la bonne forme pour une
 * sélection par paramètre (`?d=`, `?p=`), où la feuille a du sens.
 *
 * Ici le détail est rendu UNE fois. Sous 1024 px, un seul des deux volets se
 * voit, choisi par `detailOuvert`, qui se dérive de l'adresse : le rendu serveur
 * et le rendu client posent les mêmes classes, sans attendre JavaScript.
 *
 * ⚠️ UN VOLET MASQUÉ RESTE MONTÉ. Ses requêtes tournent. C'est le prix d'une
 * bascule par classes, et il est faible : maître et détail lisent presque
 * toujours la même chose, que Convex ne demande qu'une fois.
 *
 * ⚠️ CHAQUE VOLET EST UNE PAGE ENTIÈRE. Son en-tête, son corps qui défile, et
 * son propre squelette pendant l'attente : un volet droit laissé blanc à 1024 px
 * pendant qu'il charge dirait « rien », au lieu de « ça arrive ».
 */

/** La largeur de la tablette en paysage, où la liste et ce qu'elle ouvre tiennent côte à côte. */
const DEUX_VOLETS = '(min-width: 1024px)';

function abonner(prevenir: () => void) {
	const requete = window.matchMedia(DEUX_VOLETS);
	requete.addEventListener('change', prevenir);
	return () => requete.removeEventListener('change', prevenir);
}

/**
 * VRAI QUAND LES DEUX VOLETS SE VOIENT.
 *
 * ⚠️ IL NE SERT QU'À CE QUE L'ADRESSE NE DIT PAS : la sélection PAR DÉFAUT. Sur
 * `/app/creance/$id` nu, l'analyse par défaut est montée sous 1024 px mais
 * masquée ; allumer sa rangée y dessinerait un anneau sur une liste dont aucun
 * détail n'est visible. La disposition, elle, ne lit jamais ce crochet : elle se
 * pose en classes.
 *
 * `useSyncExternalStore`, avec un instantané serveur à `false` : dérivé au
 * rendu, sans `setState` dans un effet, et sans écart d'hydratation.
 */
export function useDeuxVolets(): boolean {
	return useSyncExternalStore(
		abonner,
		() => window.matchMedia(DEUX_VOLETS).matches,
		() => false
	);
}

export function MaitreDetail({
	maitre,
	detail,
	detailOuvert
}: {
	/** La page de la liste, avec son en-tête. */
	maitre: ReactNode;
	/**
	 * La page ouverte à droite, ou `null` : le maître prend alors toute la
	 * largeur, plutôt que de laisser un volet mort à côté de lui.
	 */
	detail: ReactNode;
	/**
	 * Vrai quand l'adresse désigne un détail. Sous 1024 px, c'est lui qui se voit ;
	 * faux, c'est la liste.
	 */
	detailOuvert: boolean;
}) {
	if (detail === null || detail === undefined) return <>{maitre}</>;

	return (
		<div className="flex h-full min-h-0 w-full">
			<div
				className={cn(
					// ⚠️ UNE LARGEUR FIXE, PROCHE D'UN TÉLÉPHONE, et en rem. Les rangées du
					// maître sont dessinées pour 375 px : à `w-2/5`, elles s'étiraient à
					// 512 px sur 1280 et éloignaient le montant du nom. Le rem échappe à
					// l'échelle d'espacement décalée de `tokens.css`.
					'h-full min-h-0 w-full min-w-0 flex-col lg:w-[26rem] lg:shrink-0 lg:border-r lg:border-cladd-outline',
					detailOuvert ? 'hidden lg:flex' : 'flex'
				)}
			>
				{maitre}
			</div>
			<div
				className={cn(
					'h-full min-h-0 min-w-0 flex-1 flex-col',
					detailOuvert ? 'flex' : 'hidden lg:flex'
				)}
			>
				{detail}
			</div>
		</div>
	);
}
