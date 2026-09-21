import { useRef, useState, type ReactNode } from 'react';
import { Button, Segmented, SegmentedButton } from '@cladd-ui/react';
import { ImageUpIcon, ShuffleIcon, Trash2Icon } from 'lucide-react';
import { BoutonSecondaire } from './bouton';
import { cn } from './cn';
import {
	GRAINES_DE_DEPART,
	LIBELLE_STYLE,
	STYLES_AVATAR,
	imageAvatar,
	type StyleAvatar
} from './avatar-dicebear';

/**
 * CHOISIR UNE IMAGE : la téléverser, en prendre une dans la bibliothèque, ou
 * revenir à rien.
 *
 * Sert deux fois : la photo de profil (avec la bibliothèque DiceBear) et le logo
 * de l'établissement (sans elle — un logo est une marque, pas un personnage).
 *
 * ⚠️ LE TYPE ET LE POIDS SONT VÉRIFIÉS ICI, AVANT L'ENVOI, ET ENCORE SUR LE
 * SERVEUR. Ici pour dire tout de suite « trop lourd » sans faire attendre un
 * téléversement voué au refus ; sur le serveur parce qu'un contrôle dans le
 * navigateur se contourne. Voir `convex/images.ts` : la limite est la même.
 */
const POIDS_MAX = 2 * 1024 * 1024;
const TYPES_ACCEPTES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export function ChoixImage({
	apercu,
	libelleTeleverser,
	aUneImage,
	enCours,
	erreur,
	onTeleverser,
	onRetirer,
	bibliotheque
}: {
	/** L'image actuelle, déjà rendue (avatar ou logo). */
	apercu: ReactNode;
	libelleTeleverser: string;
	aUneImage: boolean;
	enCours: boolean;
	/** Le refus du serveur, s'il y en a un. */
	erreur: string | null;
	onTeleverser: (fichier: File) => void;
	onRetirer: () => void;
	/** Absente : pas de bibliothèque d'avatars (le logo). */
	bibliotheque?: {
		readonly actuel: { readonly style: StyleAvatar; readonly graine: string } | null;
		readonly onChoisir: (style: StyleAvatar, graine: string) => void;
	};
}) {
	const champ = useRef<HTMLInputElement>(null);
	const [refusLocal, setRefusLocal] = useState<string | null>(null);

	function recevoir(fichier: File | undefined) {
		if (fichier === undefined) return;
		if (!TYPES_ACCEPTES.includes(fichier.type)) {
			setRefusLocal('Seules les images PNG, JPEG, WebP ou GIF sont acceptées.');
			return;
		}
		if (fichier.size > POIDS_MAX) {
			setRefusLocal('Cette image dépasse 2 Mo. Choisissez-en une plus légère.');
			return;
		}
		setRefusLocal(null);
		onTeleverser(fichier);
	}

	const refus = refusLocal ?? erreur;

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<div className="flex flex-wrap items-center gap-cladd-2xs">
				<span className="shrink-0">{apercu}</span>
				<div className="flex flex-wrap items-center gap-2">
					<BoutonSecondaire disabled={enCours} onClick={() => champ.current?.click()}>
						<ImageUpIcon aria-hidden />
						{enCours ? 'Envoi…' : libelleTeleverser}
					</BoutonSecondaire>
					{aUneImage ? (
						<BoutonSecondaire disabled={enCours} onClick={onRetirer}>
							<Trash2Icon aria-hidden />
							Retirer
						</BoutonSecondaire>
					) : null}
				</div>
				<input
					ref={champ}
					type="file"
					accept={TYPES_ACCEPTES.join(',')}
					className="sr-only"
					tabIndex={-1}
					aria-hidden
					onChange={(e) => {
						recevoir(e.target.files?.[0]);
						// Vidé après lecture : sinon reprendre le même fichier ne
						// déclenche plus rien, et le geste paraît cassé.
						e.target.value = '';
					}}
				/>
			</div>

			<p className="text-cladd-2xs text-cladd-fg-soft">PNG, JPEG, WebP ou GIF, 2 Mo au plus.</p>
			{refus === null ? null : (
				<p role="alert" className="text-cladd-2xs text-cladd-fg">
					{refus}
				</p>
			)}

			{bibliotheque === undefined ? null : (
				<Bibliotheque actuel={bibliotheque.actuel} onChoisir={bibliotheque.onChoisir} enCours={enCours} />
			)}
		</div>
	);
}

/**
 * LA BIBLIOTHÈQUE : un style, douze visages, et « d'autres » à la demande.
 *
 * ⚠️ UN STYLE À LA FOIS, choisi par `Segmented` — c'est un choix unique. Quatre
 * styles × douze visages sur un seul écran feraient quarante-huit cibles, et
 * l'œil ne compare bien que des visages du même dessin.
 */
function Bibliotheque({
	actuel,
	onChoisir,
	enCours
}: {
	actuel: { readonly style: StyleAvatar; readonly graine: string } | null;
	onChoisir: (style: StyleAvatar, graine: string) => void;
	enCours: boolean;
}) {
	const [style, setStyle] = useState<StyleAvatar>(actuel?.style ?? 'notionists');
	const [serie, setSerie] = useState(0);
	const graines = GRAINES_DE_DEPART.map((nom) => (serie === 0 ? nom : `${nom}-${serie}`));

	return (
		<div className="flex flex-col gap-cladd-2xs pt-cladd-3xs">
			<p className="text-cladd-xs font-semibold">Ou choisissez un avatar</p>
			<Segmented className="w-full" activeColor="neutral" activeVariant="solid">
				{STYLES_AVATAR.map((s) => (
					<SegmentedButton key={s} active={style === s} onClick={() => setStyle(s)}>
						{LIBELLE_STYLE[s]}
					</SegmentedButton>
				))}
			</Segmented>

			<div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
				{graines.map((graine) => {
					const choisi = actuel?.style === style && actuel.graine === graine;
					return (
						<Button
							key={graine}
							variant="transparent"
							outline={false}
							hoverable={false}
							disabled={enCours}
							aria-pressed={choisi}
							aria-label={`Avatar ${LIBELLE_STYLE[style]} ${graine}`}
							className={cn(
								'aspect-square h-auto w-full rounded-full p-0.5',
								choisi && 'ring-2 ring-cladd-primary'
							)}
							onClick={() => onChoisir(style, graine)}
						>
							<img
								src={imageAvatar(style, graine)}
								alt=""
								className="size-full rounded-full"
								loading="lazy"
							/>
						</Button>
					);
				})}
			</div>

			<BoutonSecondaire className="self-start" onClick={() => setSerie(serie + 1)}>
				<ShuffleIcon aria-hidden />
				Proposer d’autres visages
			</BoutonSecondaire>
		</div>
	);
}
