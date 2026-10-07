import type { ReactNode } from 'react';
import { Button } from '@cladd-ui/react';
import { BoutonPrincipal } from './bouton';

/**
 * LES ACTIONS RAPIDES D'UNE FICHE — une rangée de boutons ronds, leur nom dessous.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI MANQUAIT À LA FICHE D'UN CLIENT (relevé du 07/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sur toutes les fiches de contact relevées sur Mobbin — Telegram, Apple, Quo,
 * X —, l'identité est suivie d'une rangée de boutons ronds : appeler, écrire,
 * plus. Ce sont les gestes qu'on vient faire sur une fiche, à portée de pouce,
 * avant toute information. Notre fiche n'avait qu'un bouton pleine largeur, et
 * ses autres gestes étaient des rangées à ouvrir au bas de la page.
 *
 * ⚠️ UN SEUL BOUTON PLEIN : l'action principale, s'il y en a une. Les autres
 * sont des disques blancs, le verre des cartes. C'est la règle de l'écran — un
 * seul bouton plein — tenue dans la rangée elle-même.
 *
 * ⚠️ TOUS À 44 PX, PAS LA SECONDAIRE À 36. Ailleurs, la secondaire est d'un cran
 * plus petite pour que la hiérarchie se voie ; ici la hiérarchie tient au
 * remplissage, et des disques de tailles différentes sur une même rangée se
 * liraient comme un défaut d'alignement (relevé à 375 px). Et le blanc des
 * cartes, pas le beige de `.pilule-secondaire`, qui disparaissait sur le crème.
 *
 * ⚠️ ET CHAQUE ACTION EN REMPLACE UNE. « Un panneau qu'un bouton ouvre n'a pas
 * de rangée qui le double » : ajouter une action ici, c'est retirer la rangée
 * qui faisait la même chose plus bas.
 */

export interface ActionRapide {
	readonly cle: string;
	/** Un ou deux mots, sous le bouton. C'est aussi son nom pour le lecteur d'écran. */
	readonly libelle: string;
	readonly icone: ReactNode;
	/** Le bouton plein. Un seul par rangée. */
	readonly principale?: boolean;
	/** Ce que le bouton fait — ou, pour une sortie (\`mailto:\`), son adresse. */
	readonly onClick?: () => void;
	readonly href?: string;
	/** Quand le libellé seul ne dit pas tout : « Renseigner son adresse électronique ». */
	readonly nomComplet?: string;
}

/** Le disque secondaire : le bouton du kit, au verre des cartes, à 44 px. */
const DISQUE = {
	variant: 'transparent',
	outline: false,
	hoverable: false,
	rounded: true,
	square: true,
	size: 'lg',
	className: 'verre-carte verre-bouton'
} as const;

export function ActionsRapides({ actions }: { readonly actions: readonly ActionRapide[] }) {
	return (
		<div className="flex justify-center gap-cladd-xs">
			{actions.map(({ cle, libelle, icone, principale = false, onClick, href, nomComplet }) => {
				const nom = nomComplet ?? libelle;
				const disque = principale ? (
					href === undefined ? (
						<BoutonPrincipal square aria-label={nom} onClick={onClick}>
							{icone}
						</BoutonPrincipal>
					) : (
						<BoutonPrincipal as="a" href={href} square aria-label={nom}>
							{icone}
						</BoutonPrincipal>
					)
				) : href === undefined ? (
					<Button {...DISQUE} aria-label={nom} onClick={onClick}>
						{icone}
					</Button>
				) : (
					<Button as="a" href={href} {...DISQUE} aria-label={nom}>
						{icone}
					</Button>
				);
				return (
					// `w-24` et `whitespace-nowrap` sur le libellé : « Lancer un dossier » (95 px
					// en 12 px) tient sur une ligne, centré, entre ses voisines.
					<div key={cle} className="flex w-24 flex-col items-center gap-1.5">
						{disque}
						<span
							aria-hidden
							className="text-center text-cladd-3xs leading-tight whitespace-nowrap text-cladd-fg-soft"
						>
							{libelle}
						</span>
					</div>
				);
			})}
		</div>
	);
}
