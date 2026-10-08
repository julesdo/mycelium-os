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
 */
export function BoutonCompagnon({
	humeur,
	compte = 0,
	description,
	onOuvrir
}: {
	readonly humeur: HumeurPlume;
	/** Ce qui attend le gérant : la pastille, au-dessus de zéro seulement. */
	readonly compte?: number;
	/** Ce que le toucher ouvre, pour un lecteur d'écran : « Parler à Plume, sur ce dossier. » */
	readonly description: string;
	readonly onOuvrir: () => void;
}) {
	return (
		<span className="relative flex shrink-0">
			<span aria-hidden className={cn('halo-compagnon', compte > 0 && 'halo-compagnon-vif')} />
			<Button
				size="md"
				rounded
				variant="transparent"
				outline={false}
				hoverable={false}
				className="verre-dense verre-bouton h-auto min-h-cladd-md w-16 md:w-auto"
				contentClassName="flex-col gap-0.5 px-1 md:flex-row md:gap-2 md:px-3"
				aria-label={description}
				onClick={onOuvrir}
			>
				<Plume humeur={humeur} taille={30} decoratif />
				<span className="text-cladd-4xs leading-none font-medium md:text-cladd-2xs">
					{NOM_DU_PILOTE}
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
