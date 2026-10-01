import { useCallback, useRef, useState, type ReactNode } from 'react';
import { BoutonPrincipal, BoutonSecondaire } from './bouton';
import { SurfaceCut, Button } from '@cladd-ui/react';
import { FolderOpenIcon, CameraIcon, PlusIcon, UploadIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * LE GLISSER-DÉPOSER, écrit une fois pour les deux zones.
 *
 * Le compteur de profondeur (`survols`) n'est pas une coquetterie : `dragleave`
 * se déclenche aussi quand le curseur passe d'un enfant à l'autre à l'intérieur
 * de la zone. Sans lui, le cadre de survol clignote à chaque déplacement.
 */
function useGlisserDeposer(recevoir: (liste: FileList | null) => void) {
	const [survols, setSurvols] = useState(0);
	return {
		survole: survols > 0,
		gestionnaires: {
			onDragEnter: (e: React.DragEvent) => {
				e.preventDefault();
				setSurvols((n) => n + 1);
			},
			onDragLeave: (e: React.DragEvent) => {
				e.preventDefault();
				setSurvols((n) => Math.max(0, n - 1));
			},
			onDragOver: (e: React.DragEvent) => e.preventDefault(),
			onDrop: (e: React.DragEvent) => {
				e.preventDefault();
				setSurvols(0);
				recevoir(e.dataTransfer.files);
			}
		}
	};
}

/**
 * AJOUTER DES FICHIERS — UN bouton au doigt, un bandeau à la souris.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE LA ZONE DE DÉPÔT FAISAIT AU TÉLÉPHONE (01/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Relevé à 393 px sur l'écran des dépôts : un creux de deux cent soixante
 * pixels qui disait « Déposez vos fichiers ici » — un geste qu'aucun téléphone
 * ne permet —, puis DEUX boutons, « Photographier une facture » et « Choisir des
 * fichiers ». Or le sélecteur natif d'iOS et d'Android propose déjà, de
 * lui-même, la photo, la photothèque et les fichiers : le second bouton
 * doublait le premier, une rangée plus bas.
 *
 * Relevé sur Mobbin le même jour : Fi, Gusto et Revolut Business ajoutent un
 * document par UN bouton, et la liste des documents fait le reste de l'écran.
 * D'où ce composant : au doigt (`tactile`), un seul bouton plein qui ouvre le
 * sélecteur du système ; à la souris, un bandeau creux d'une ligne, parce que
 * glisser un export depuis le Finder est LE geste d'un ordinateur.
 *
 * ⚠️ LES FORMATS RESTENT ÉCRITS, sous le bouton comme dans le bandeau. Sans eux,
 * on découvre qu'un fichier est refusé après l'avoir choisi.
 *
 * Le collage (Ctrl+V) n'est pas ici : la route de l'import l'écoute sur la
 * fenêtre, où il marche quel que soit l'élément qui a le focus.
 */
export function AjoutDeFichiers({
	accept,
	onFichiers,
	libelle,
	formats
}: {
	accept: string;
	onFichiers: (fichiers: File[]) => void;
	/** Ce que le bouton ajoute : « Ajouter des factures ». */
	libelle: string;
	/** Ce qu'on peut choisir, en toutes lettres : « FEC, CSV, PDF ou photo ». */
	formats: string;
}) {
	const champ = useRef<HTMLInputElement>(null);
	const recevoir = useCallback(
		(liste: FileList | null) => {
			const fichiers = [...(liste ?? [])];
			if (fichiers.length > 0) onFichiers(fichiers);
		},
		[onFichiers]
	);
	const { survole, gestionnaires } = useGlisserDeposer(recevoir);
	const ouvrir = () => champ.current?.click();

	return (
		<>
			<div className="hidden flex-col items-center gap-cladd-3xs tactile:flex">
				<BoutonPrincipal pleineLargeur onClick={ouvrir}>
					<PlusIcon />
					{libelle}
				</BoutonPrincipal>
				<p className="text-cladd-2xs text-cladd-fg-softer">{formats}</p>
			</div>

			{/*
			  ⚠️ LE BANDEAU ENTIER EST LA CIBLE, et il n'a plus de bouton dedans. Avec
			  un « Choisir des fichiers » à droite, le volet maître de 1280 px (un bilan
			  ouvert à côté) laissait 110 px au texte, qui s'enroulait sur trois lignes.
			  C'est la zone de dépôt du web : on y glisse, ou on clique n'importe où.
			  `SurfaceCut as="button"`, le geste que la documentation du kit montre.
			*/}
			<div className="tactile:hidden">
				<SurfaceCut
					as="button"
					type="button"
					onClick={ouvrir}
					hoverable
					clickable
					outline
					{...gestionnaires}
					className={cn(
						'w-full rounded-cladd-xl text-left transition-colors',
						survole && 'cladd-color-brand'
					)}
					contentClassName="flex items-center gap-cladd-2xs px-cladd-2xs py-cladd-3xs"
				>
					<UploadIcon className="size-5 shrink-0 text-cladd-fg-soft" aria-hidden />
					<span className="flex min-w-0 flex-1 flex-col">
						<span className="text-cladd-xs font-semibold">Glissez ou choisissez vos fichiers</span>
						<span className="text-cladd-2xs text-cladd-fg-softer">{formats}</span>
					</span>
				</SurfaceCut>
			</div>

			{/* Remis à zéro pour que redéposer le MÊME fichier redéclenche l'événement. */}
			<input
				ref={champ}
				type="file"
				multiple
				accept={accept}
				onChange={(e) => {
					recevoir(e.target.files);
					e.target.value = '';
				}}
				className="sr-only"
			/>
		</>
	);
}

/**
 * La zone de dépôt de fichiers — les factures sur l'import, les pièces sur un
 * dossier.
 *
 * Quatre façons d'y verser un fichier, parce qu'un gérant n'a pas le même
 * geste selon d'où il vient :
 *
 * - **photographier**, sur la tablette qu'il a en main, la facture papier que
 *   le livreur vient de lui laisser. C'est le geste le plus fréquent sur le
 *   terrain, et c'est celui que la version précédente ne proposait pas ;
 * - **parcourir**, pour un export comptable rangé dans un dossier ;
 * - **glisser-déposer**, quand il arrive de sa messagerie, sur un ordinateur ;
 * - **coller** (Ctrl+V), qui capte une capture d'écran ou un fichier copié.
 *
 * Le bouton photo n'apparaît que derrière un pointeur grossier — un doigt. Sur
 * un ordinateur, l'attribut `capture` est ignoré par le navigateur et le bouton
 * ouvrirait un sélecteur de fichiers en promettant un appareil photo.
 *
 * Bâtie sur `SurfaceCut`, la surface *creusée* du kit, et non sur un `<div>`
 * bordé à la main. Le creux dit exactement ce qu'on attend ici : un réceptacle,
 * quelque chose qui se remplit. Un encadré en relief dirait le contraire.
 *
 * ⚠️ L'ÉCRAN DES DÉPÔTS NE S'EN SERT PLUS : il a `AjoutDeFichiers`, plus haut.
 * Elle reste celle des pièces d'un dossier et du premier jour de la file.
 */
export function ZoneDepot({
	accept,
	onFichiers,
	desactive = false,
	libellePhoto = 'Photographier un document',
	discret = false,
	children
}: {
	accept: string;
	onFichiers: (fichiers: File[]) => void;
	desactive?: boolean;
	/**
	 * Vrai quand un geste plus fort est proposé au-dessus (une connexion) : le
	 * bouton photo passe alors en secondaire, pour qu'il n'y ait jamais deux
	 * gestes principaux à l'écran.
	 */
	discret?: boolean;
	/**
	 * Ce que le bouton photo promet.
	 *
	 * ⚠️ IL ÉTAIT ÉCRIT EN DUR, ET LA ZONE SERT DEUX ÉCRANS. Sur les pièces d'un
	 * dossier on dépose un bon de livraison, une commande ou des CGV : le bouton
	 * y proposait « Photographier une facture », c'est-à-dire la seule chose
	 * qu'on n'y dépose pas. Le défaut est donc le libellé neutre.
	 */
	libellePhoto?: string;
	children: ReactNode;
}) {
	const champ = useRef<HTMLInputElement>(null);
	const appareilPhoto = useRef<HTMLInputElement>(null);
	const BoutonPhoto = discret ? BoutonSecondaire : BoutonPrincipal;

	const recevoir = useCallback(
		(liste: FileList | null) => {
			if (!liste || desactive) return;
			const fichiers = [...liste];
			if (fichiers.length > 0) onFichiers(fichiers);
		},
		[onFichiers, desactive]
	);
	const glisser = useGlisserDeposer(recevoir);
	const survole = glisser.survole && !desactive;

	// Remis à zéro pour que redéposer le MÊME fichier redéclenche l'événement.
	// Sans ça, un fichier corrigé et redéposé sous le même nom ne repart jamais.
	const vider = (e: React.ChangeEvent<HTMLInputElement>) => {
		recevoir(e.target.files);
		e.target.value = '';
	};

	return (
		<SurfaceCut
			outline
			{...glisser.gestionnaires}
			onPaste={(e: React.ClipboardEvent) => recevoir(e.clipboardData.files)}
			className={cn(
				'rounded-cladd-2xl transition-colors',
				desactive && 'opacity-60',
				survole && 'cladd-color-brand'
			)}
			contentClassName="flex flex-col items-center justify-center gap-cladd-2xs p-cladd-xl text-center"
		>
			{children}

			<div className="flex flex-wrap items-center justify-center gap-cladd-3xs">
				<BoutonPhoto
					disabled={desactive}
					onClick={() => appareilPhoto.current?.click()}
					className="hidden tactile:flex"
				>
					<CameraIcon />
					{libellePhoto}
				</BoutonPhoto>
				<Button disabled={desactive} onClick={() => champ.current?.click()}>
					<FolderOpenIcon />
					Choisir des fichiers
				</Button>
			</div>

			<input
				ref={champ}
				type="file"
				multiple
				accept={accept}
				disabled={desactive}
				onChange={vider}
				className="sr-only"
			/>
			{/* `capture="environment"` : l'appareil arrière, celui qui vise le
			    papier posé sur le plan de travail. Sans cette valeur, iOS ouvre la
			    caméra frontale, et le gérant se photographie lui-même. */}
			<input
				ref={appareilPhoto}
				type="file"
				multiple
				accept="image/*"
				capture="environment"
				disabled={desactive}
				onChange={vider}
				className="sr-only"
			/>
		</SurfaceCut>
	);
}
