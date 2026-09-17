import type { ReactNode } from 'react';
import { Button } from '@cladd-ui/react';
import { XIcon } from 'lucide-react';

/**
 * Règle 3 du contrat d'écran, matérialisée.
 *
 * « Deux volets au-delà de 1024px. Tout écran de travail se lit liste à
 * gauche, preuve à droite. En dessous de cette largeur, la liste seule et la
 * preuve en feuille glissante. »
 *
 * La règle vit ici, dans un composant, et non dans la tête de celui qui écrit
 * l'écran. C'est la différence entre une convention qu'on oublie et une
 * contrainte qu'on ne peut pas contourner sans le faire exprès.
 *
 * 1024px n'est pas une largeur arbitraire : c'est la tablette en paysage, le
 * format de référence du produit.
 */
export function TwoPane({
	liste,
	preuve,
	preuveOuverte = false,
	onFermerPreuve
}: {
	liste: ReactNode;
	preuve: ReactNode;
	/** Sous 1024px seulement : ouvre la preuve en feuille par-dessus la liste. */
	preuveOuverte?: boolean;
	onFermerPreuve?: () => void;
}) {
	return (
		<div className="flex h-full min-h-0 w-full">
			<div className="min-w-0 flex-1 overflow-y-auto">{liste}</div>

			{/*
			  ⚠️ `pb-36` : LE VOLET DE PREUVE DÉFILE LUI AUSSI, ET LA BARRE FLOTTE
			  DEVANT. Au-delà de 1024 px, la capsule de navigation est centrée sur la
			  fenêtre — donc à cheval sur la bordure de ce volet — et la capsule du
			  compagnon est calée à droite, c'est-à-dire pile dessus. Sans dégagement,
			  la dernière rangée du dossier passe dessous : le défaut classique, et
			  celui qui ne se voit qu'en faisant défiler jusqu'en bas.

			  La même valeur que `PageBody`, et pour la même raison : un dégagement
			  qui diverge d'un conteneur à l'autre se répare deux fois.
			*/}
			<aside className="hidden min-h-0 w-2/5 max-w-2xl shrink-0 overflow-y-auto border-l border-cladd-outline pb-36 lg:block">
				{preuve}
			</aside>

			{preuveOuverte ? (
				/*
				  ⚠️ LA FEUILLE EST UN DIALOGUE, ET ELLE LE DIT. Elle recouvre l'écran
				  entier sous 1024 px ; sans `role`, un lecteur d'écran continuait
				  d'annoncer la liste qu'elle cache, et rien ne nommait ce qui venait
				  de s'ouvrir.

				  ⚠️ SANS `aria-modal`, ET C'EST DÉLIBÉRÉ. Il fait masquer tout le reste
				  de la page aux technologies d'assistance — ce qui serait un mensonge
				  tant que le clavier, lui, peut encore tabuler dans la liste dessous.
				  On annonce ce qu'on tient ; le piège de focus est un chantier à part.

				  Le NOM du sujet, lui, est porté par le contenu de la feuille : c'est
				  au volet de dire de quel client il parle, pas au composant générique
				  qui le transporte.
				*/
				<div
					role="dialog"
					aria-label="Volet de preuve"
					className="fixed inset-0 z-50 flex flex-col bg-cladd-bg lg:hidden"
				>
					{/* La croix du kit, seule, en haut à gauche : un `<button>` texte écrit à
					    la main réinventait le contrôle, sans son anneau de focus. `md` vaut
					    48 px sur l'échelle décalée du produit. */}
					<div className="shrink-0 px-cladd-3xs pt-cladd-3xs">
						<Button
							square
							rounded
							variant="transparent"
							outline={false}
							aria-label="Fermer"
							onClick={onFermerPreuve}
						>
							<XIcon />
						</Button>
					</div>
					<div className="min-h-0 flex-1 overflow-y-auto">{preuve}</div>
				</div>
			) : null}
		</div>
	);
}
