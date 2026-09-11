import type { ReactNode } from 'react';
import { Link, type LinkProps } from '@tanstack/react-router';
import { cn } from './cn';

/**
 * LA RANGÉE D'ACTIONS RONDES.
 *
 * Sous le montant : trois ou quatre disques de verre, chacun avec son libellé
 * dessous. C'est le geste central de la référence, et il règle un problème que
 * l'écran précédent n'avait pas résolu.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ POURQUOI CE N'EST PAS UNE BARRE DE BOUTONS DE PLUS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * L'ancienne barre du produit portait huit cibles en haut d'écran : quatre
 * onglets, une recherche, un sélecteur d'établissement, un bouton « Déposer »
 * et un engrenage. Huit choix alignés, tous de même poids, dont aucun ne dit
 * ce qu'il faut faire maintenant — c'est la définition d'un écran qu'on subit.
 *
 * Ici, la navigation est ailleurs (en bas sur téléphone, dans une capsule sur
 * grand écran) et cette rangée ne porte QUE les gestes du domaine : importer,
 * lettrer, arrêter un décompte. Trois ou quatre, jamais plus. La contrainte est
 * dans le composant et pas dans la tête de celui qui écrit l'écran.
 *
 * ⚠️ LE LIBELLÉ FAIT PARTIE DE LA CIBLE, et c'est pour ça que ce composant
 * existe au lieu d'un `Button square rounded` du kit. Cladd pose son libellé
 * DANS le bouton, sur la même ligne ; ici il est dessous, et il doit rester
 * cliquable — un mot de douze pixels qu'on vise et qui ne réagit pas est le
 * genre de défaut qu'on ne voit jamais en développement et toujours au doigt.
 *
 * C'est exactement ce que `src/ui` est censé contenir : ce que le kit ne
 * fournit pas et qui porte une décision de conception du produit.
 */

export interface ActionRonde {
	readonly libelle: string;
	readonly icone: ReactNode;
	/**
	 * Une destination de routeur, ou rien si l'action est un `onClick`.
	 *
	 * Le type vient du routeur lui-même et n'est PAS un `string` : c'est ce qui
	 * fait échouer la compilation sur une route qui n'existe pas. La barre de
	 * navigation portait un lien vers `/app/factures`, jamais déclarée — le
	 * bouton d'action principal du produit menait à une page d'erreur, et rien
	 * ne le signalait.
	 */
	readonly to?: LinkProps['to'];
	readonly onClick?: () => void;
	/**
	 * Pourquoi l'action est indisponible. La référence garde le disque en
	 * place et l'estompe plutôt que de le retirer : une rangée dont les
	 * éléments apparaissent et disparaissent se réapprend à chaque visite.
	 */
	readonly indisponible?: string;
}

function Disque({ action }: { action: ActionRonde }) {
	const { libelle, icone, indisponible } = action;

	const contenu = (
		<>
			{/*
			  56 px de disque. La rampe tactile du produit place `lg` à 56 et `md` à
			  48 ; on prend `lg` parce que ce disque porte l'action principale de
			  l'écran et qu'il est visé sans regarder, le pouce en bas de tablette.
			*/}
			<span
				className={cn(
					'verre flex size-cladd-lg shrink-0 items-center justify-center rounded-full transition-colors',
					indisponible === undefined ? 'verre-actif' : 'opacity-40'
				)}
			>
				{icone}
			</span>
			<span
				className={cn(
					'text-cladd-2xs leading-tight font-medium',
					indisponible === undefined ? 'text-cladd-fg' : 'text-cladd-fg-softest'
				)}
			>
				{libelle}
			</span>
		</>
	);

	// `w-20` borne la colonne : sans elle, « Arrêter un décompte » étale son
	// libellé et désaligne les disques entre eux. Le mot passe à la ligne, ce qui
	// est le comportement voulu — on ne tronque pas un libellé d'action.
	const habits = 'flex w-20 flex-col items-center gap-2 text-center';

	if (indisponible !== undefined) {
		return (
			<span className={cn(habits, 'cursor-not-allowed')} title={indisponible}>
				{contenu}
			</span>
		);
	}

	if (action.to !== undefined) {
		return (
			<Link to={action.to} className={habits}>
				{contenu}
			</Link>
		);
	}

	return (
		<button type="button" onClick={action.onClick} className={habits}>
			{contenu}
		</button>
	);
}

export function RangeeActions({
	actions,
	className
}: {
	/** Trois ou quatre. Au-delà, ce n'est plus une rangée d'actions, c'est un menu. */
	actions: readonly ActionRonde[];
	className?: string;
}) {
	return (
		<div className={cn('flex items-start justify-center gap-cladd-3xs', className)}>
			{actions.map((action) => (
				<Disque key={action.libelle} action={action} />
			))}
		</div>
	);
}
