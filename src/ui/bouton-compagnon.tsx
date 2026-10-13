import type { CSSProperties, ReactNode } from 'react';
import { Button } from '@cladd-ui/react';
import { cn } from './cn';
import { PastilleDeRappel } from './barre-du-bas';
import { NOM_DU_PILOTE, Plume, type HumeurPlume } from './plume';

/**
 * PLUME, DANS LA BARRE DU BAS — à droite de la pilule des onglets.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL ÉTAIT « DEMANDER », UNE BULLE ; IL EST DEVENU PLUME (08/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le bouton portait une icône de bulle et ouvrait une feuille de discussion. Le
 * fondateur voulait un pilote qui VIT dans l'application : c'est donc Plume
 * lui-même qui se pose là, sur tous les écrans, et son humeur suit ce qu'il fait
 * — il travaille quand un travail tourne, il demande votre attention quand
 * quelque chose vous attend. Le toucher ouvre sa conversation, plein écran : celle
 * du dossier qu'on regarde, ou la sienne partout ailleurs.
 *
 * Il garde ce que le bouton avait appris (07/10/2026) : il est DANS la rangée de
 * la barre, jamais au-dessus du contenu, où il cachait les montants ; il a la
 * hauteur de la pilule et l'anatomie d'un onglet.
 *
 * ⚠️ ET IL PARLE D'ICI (13/10/2026) : c'est au-dessus de ce bouton qu'il dit ce
 * qu'il vient de faire et ce qu'il a à dire de l'écran (`app/parole-de-plume.tsx`).
 *
 * ⚠️ ET IL Y EST GRAND, SANS SON NOM (13/10/2026, au soir). Le fondateur : « au lieu
 * d'avoir un gros Plume en plus du bouton, qui prend énormément de place, pourquoi
 * ne pas mettre Plume en grand dans le bouton, et enlever le nom en dessous, pour
 * voir toutes les expressions et les animations ». Plume remplit donc le bouton
 * rond ; c'est là qu'il réfléchit, écrit, fait la fête ou dort, et sa bulle
 * (`ScenePlume`) le désigne de sa pointe. Le nom reste dit au lecteur d'écran.
 * Autour, l'ANNEAU de la journée se remplit à mesure que ses défis tombent
 * (`progression`), comme ceux des leçons de Duolingo.
 */
export function BoutonCompagnon({
	humeur,
	compte = 0,
	description,
	onOuvrir,
	bulle,
	pensee = true,
	progression
}: {
	readonly humeur: HumeurPlume;
	/** Ce qui attend le gérant : la pastille, au-dessus de zéro seulement. */
	readonly compte?: number;
	/** Ce que le toucher ouvre, pour un lecteur d'écran : « Parler à Plume, sur ce dossier. » */
	readonly description: string;
	readonly onOuvrir: () => void;
	/** Ce que Plume dit en ce moment, posé au-dessus de lui. */
	readonly bulle?: ReactNode;
	/** Sa bulle de pensée, quand il réfléchit : retirée quand sa bulle écrit déjà les trois points. */
	readonly pensee?: boolean;
	/** La part de la journée faite, de 0 à 1 ; absente quand rien n'attendait. */
	readonly progression?: number;
}) {
	return (
		<span className="relative flex shrink-0">
			{bulle}
			<span aria-hidden className={cn('halo-compagnon', compte > 0 && 'halo-compagnon-vif')} />
			{progression === undefined ? null : (
				<span
					aria-hidden
					className="anneau-journee"
					style={{ '--part-du-jour': Math.min(1, Math.max(0, progression)) } as CSSProperties}
				/>
			)}
			<Button
				size="md"
				rounded
				variant="transparent"
				outline={false}
				hoverable={false}
				className="verre-dense verre-bouton h-auto min-h-cladd-md w-16"
				contentClassName="items-center justify-center overflow-visible p-0"
				aria-label={description}
				title={NOM_DU_PILOTE}
				onClick={onOuvrir}
			>
				{/*
				  Grand, et il déborde un peu : la plume sur sa tête, ses confettis, ses « z »
				  et sa bulle de pensée sortent du bouton (`overflow-visible`).

				  ⚠️ DANS UNE ENVELOPPE, PAS EN ENFANT DIRECT : le bouton du kit ramène tout
				  `svg` enfant à 16 px (`[&>svg]:size-4`). Plume y était tout petit, même à 30.
				*/}
				<span className="-mt-1 flex">
					<Plume humeur={humeur} taille={46} decoratif pensee={pensee} />
				</span>
			</Button>
			{compte > 0 ? (
				<span className="absolute -top-1 -right-1">
					<PastilleDeRappel compte={compte} />
				</span>
			) : null}
		</span>
	);
}
