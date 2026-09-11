import type { ReactNode } from 'react';
import { Barre, BarreBasse } from './barre';
import { Fond } from '../ui/fond';

/**
 * Le cadre de l'application authentifiée.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LA BARRE HAUTE FLOTTE, ELLE N'EST PLUS DANS LE FLUX
 * ─────────────────────────────────────────────────────────────────────────
 *
 * C'est ce qui permet à l'aurore de l'accueil de monter jusqu'au bord haut de
 * l'écran et de passer DERRIÈRE le logo et la capsule de navigation. Une barre
 * dans le flux couperait le dégradé net à soixante-quatre pixels du bord, et
 * le hero cesserait de lire « fond d'écran » pour lire « bandeau coloré ».
 *
 * ⚠️ ET C'EST DONC CHAQUE ÉCRAN QUI DÉGAGE SA PROPRE PLACE. Un élément hors du
 * flux n'en réserve aucune : `main` ne pose AUCUN rembourrage haut, et la
 * zone défilante commence sous la barre, au ras du bord. Ce sont `PageHero` et
 * `PageHeader` qui décalent leur contenu de `--spacing-barre-app`.
 *
 * Le décalage ne peut pas être posé ici. Le hero a précisément besoin que son
 * DÉGRADÉ passe sous la barre pendant que son CONTENU se décale : un
 * rembourrage sur `main` décalerait les deux, et un rembourrage sur la zone
 * défilante ferait rogner par `overflow` toute tentative de le rattraper en
 * marge négative.
 *
 * `h-dvh` et non `h-screen` : sur téléphone, la barre d'adresse mobile fait
 * varier la hauteur visible, et `100vh` fait dépasser le contenu sous la barre
 * basse de navigation.
 *
 * ⚠️ ET `main` NE POSE AUCUN REMBOURRAGE BAS. Il en posait un, et c'était le
 * défaut qui tuait l'effet de verre de la barre basse : le rembourrage était
 * HORS du conteneur qui défile, donc la zone visible s'arrêtait au-dessus de
 * la barre. Rien ne pouvait passer derrière, et il ne restait qu'une bande
 * noire morte sous laquelle le flou n'avait plus rien à flouter.
 *
 * Le dégagement appartient au conteneur qui DÉFILE — `PageBody` — et pas à
 * son cadre. Les cartes glissent alors sous la barre et la traversent en
 * couleur, ce qui est tout l'intérêt du verre ; la dernière reste atteignable
 * parce que le rembourrage voyage avec elle.
 */
export function Shell({ children }: { children: ReactNode }) {
	return (
		<div className="relative flex h-dvh w-full flex-col overflow-hidden">
			{/* Le drapé, une fois, derrière tous les écrans. C'est lui qui donne au
			    verre des cartes et des barres quelque chose à réfracter — sans lui,
			    chaque translucidité retombe sur un aplat un peu plus clair. */}
			<Fond />

			{/* `absolute` et non `fixed` : la coquille est déjà bornée à la hauteur
			    visible, et `fixed` sortirait la barre du contexte d'empilement de
			    la coquille — ce qui la ferait passer par-dessus les dialogues du
			    kit, dont la racine de superposition est `#root`. */}
			<div className="absolute inset-x-0 top-0">
				<Barre />
			</div>

			<main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>

			<BarreBasse />
		</div>
	);
}
