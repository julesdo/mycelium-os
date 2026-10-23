import { Avatar, ChoixImage, type ImageAvatar, type StyleAvatar } from '../../ui';

/**
 * LE VISAGE DE LA PERSONNE CONNECTÉE (voir `ChoixImage`) : il la suit d'un établissement
 * à l'autre.
 *
 * Le logo de l'établissement ne se choisit plus ici depuis le 23/10/2026 : il se pose dans
 * « Logo et couleurs », et vaut pour ses courriers comme pour l'application.
 */

export interface ProfilAffiche {
	/** Le nom de la personne : ses initiales tiennent lieu d'image quand elle n'en a pas. */
	readonly nom: string | undefined;
	readonly image: ImageAvatar | null;
	readonly avatar: { readonly style: StyleAvatar; readonly graine: string } | null;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onTeleverser: (fichier: File) => void;
	readonly onChoisirAvatar: (style: StyleAvatar, graine: string) => void;
	readonly onRetirer: () => void;
}

export function SectionProfil(profil: ProfilAffiche) {
	return (
		<ChoixImage
			apercu={<Avatar nom={profil.nom} image={profil.image} />}
			libelleTeleverser="Téléverser une photo"
			aUneImage={profil.image !== null}
			enCours={profil.enCours}
			erreur={profil.erreur}
			onTeleverser={profil.onTeleverser}
			onRetirer={profil.onRetirer}
			bibliotheque={{ actuel: profil.avatar, onChoisir: profil.onChoisirAvatar }}
		/>
	);
}
