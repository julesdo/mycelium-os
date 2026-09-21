import {
	Avatar,
	ChoixImage,
	type ImageAvatar,
	type StyleAvatar
} from '../../ui';

/**
 * LE VISAGE DE LA PERSONNE CONNECTÉE, ET LE LOGO DE L'ÉTABLISSEMENT.
 *
 * Deux choix de la même forme (voir `ChoixImage`), qui ne se confondent pas :
 * le profil suit la personne d'un établissement à l'autre ; le logo appartient
 * à l'établissement, et seul un administrateur le change.
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

export interface LogoAffiche {
	readonly nomEtablissement: string;
	readonly url: string | null;
	/** Faux pour un simple membre : seul un administrateur change le logo. */
	readonly modifiable: boolean;
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onTeleverser: (fichier: File) => void;
	readonly onRetirer: () => void;
}

export function ChoixDuLogo(logo: LogoAffiche) {
	const apercu = (
		<Avatar nom={logo.nomEtablissement} image={logo.url === null ? null : { url: logo.url }} />
	);
	if (!logo.modifiable) return apercu;
	return (
		<ChoixImage
			apercu={apercu}
			libelleTeleverser="Téléverser un logo"
			aUneImage={logo.url !== null}
			enCours={logo.enCours}
			erreur={logo.erreur}
			onTeleverser={logo.onTeleverser}
			onRetirer={logo.onRetirer}
		/>
	);
}
