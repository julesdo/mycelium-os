import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';
import { cn } from './cn';

/**
 * LA CARTE DE DÉMARRAGE — une ligne, une action.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE A ÉTÉ RÉDUITE DE MOITIÉ, ET C'ÉTAIT LE DÉFAUT PRINCIPAL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Première version : un titre, un paragraphe de trois lignes, trois étapes
 * numérotées, un bouton pleine largeur. Mesuré sur un téléphone de 375 px,
 * elle occupait SOIXANTE POUR CENT de la hauteur visible — plus que le hero
 * qui porte le montant, et à elle seule plus que tout le reste de l'écran.
 *
 * Sur un accueil qui doit porter le chiffre, ses gestes, l'état de la
 * surveillance, la courbe de ce qui est dû et le flux des événements, une
 * invite de démarrage n'a droit qu'à une ligne. C'est la proportion de la
 * référence : ses cartes d'amorçage — vérifier son e-mail, ajouter de
 * l'argent — sont des rangées de quatre-vingts pixels avec une seule action,
 * jamais des notices.
 *
 * ⚠️ ET LES TROIS ÉTAPES N'ONT PAS ÉTÉ PERDUES, ELLES ONT ÉTÉ DÉPLACÉES.
 * « Préférez un export comptable », « à défaut un PDF », « précisez le
 * secteur » sont des consignes qui ne servent à rien tant qu'on n'est pas
 * devant l'écran d'import : les lire sur l'accueil, c'est les lire deux fois
 * ou les oublier. Elles vivent maintenant là où elles s'appliquent.
 *
 * Ce qui reste ici est la seule chose que l'accueil doit dire : il manque des
 * factures, et voilà le bouton.
 */
export function CarteDemarrage({
	titre,
	explication,
	icone,
	action,
	className
}: {
	titre: string;
	/** UNE ligne. Si elle en fait deux sur un téléphone, elle est trop longue. */
	explication: string;
	icone: ReactNode;
	/** L'action, et il n'y en a qu'une — c'est ce qui en fait un démarrage. */
	action: ReactNode;
	className?: string;
}) {
	return (
		<Surface
			as="section"
			// Voir `carte-liste.tsx` : la surface du kit peint un fond opaque qui
			// empêcherait le verre de rien réfracter. On la garde pour sa géométrie
			// et on lui retire son fond.
			variant="transparent"
			outline={false}
			className={cn('verre-carte rounded-cladd-xl', className)}
			// La rangée passe en colonne sous 640 px : à 375, le bouton posé à
			// droite du texte ne laisse que cent-vingt pixels au libellé, qui
			// retombe alors sur trois lignes — soit exactement la hauteur qu'on
			// vient de supprimer.
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs sm:flex-row sm:items-center"
		>
			<span className="verre flex size-cladd-md shrink-0 items-center justify-center rounded-full">
				{icone}
			</span>

			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<h2 className="text-cladd-sm leading-tight font-semibold">{titre}</h2>
				<p className="text-cladd-xs leading-snug text-cladd-fg-soft">{explication}</p>
			</div>

			{/* Pleine largeur sur téléphone, à sa taille dès qu'il y a de la place :
			    un bouton de démarrage aligné à droite se vise mal du pouce sur un
			    écran étroit. */}
			<div className="shrink-0 [&>*]:w-full sm:[&>*]:w-auto">{action}</div>
		</Surface>
	);
}
