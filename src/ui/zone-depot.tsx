import { useCallback, useRef, useState, type ReactNode } from 'react';
import { SurfaceCut, Button } from '@cladd-ui/react';
import { FolderOpenIcon, CameraIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * La zone de dépôt de factures.
 *
 * Quatre façons d'y verser des factures, parce qu'un gérant n'a pas le même
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
 * Le compteur de profondeur (`survols`) n'est pas une coquetterie : `dragleave`
 * se déclenche aussi quand le curseur passe d'un enfant à l'autre à l'intérieur
 * de la zone. Sans lui, le cadre de survol clignote à chaque déplacement.
 */
export function ZoneDepot({
	accept,
	onFichiers,
	desactive = false,
	children
}: {
	accept: string;
	onFichiers: (fichiers: File[]) => void;
	desactive?: boolean;
	children: ReactNode;
}) {
	const champ = useRef<HTMLInputElement>(null);
	const appareilPhoto = useRef<HTMLInputElement>(null);
	const [survols, setSurvols] = useState(0);
	const survole = survols > 0 && !desactive;

	const recevoir = useCallback(
		(liste: FileList | null) => {
			if (!liste || desactive) return;
			const fichiers = [...liste];
			if (fichiers.length > 0) onFichiers(fichiers);
		},
		[onFichiers, desactive]
	);

	// Remis à zéro pour que redéposer le MÊME fichier redéclenche l'événement.
	// Sans ça, un fichier corrigé et redéposé sous le même nom ne repart jamais.
	const vider = (e: React.ChangeEvent<HTMLInputElement>) => {
		recevoir(e.target.files);
		e.target.value = '';
	};

	return (
		<SurfaceCut
			outline
			onDragEnter={(e: React.DragEvent) => {
				e.preventDefault();
				setSurvols((n) => n + 1);
			}}
			onDragLeave={(e: React.DragEvent) => {
				e.preventDefault();
				setSurvols((n) => Math.max(0, n - 1));
			}}
			onDragOver={(e: React.DragEvent) => e.preventDefault()}
			onDrop={(e: React.DragEvent) => {
				e.preventDefault();
				setSurvols(0);
				recevoir(e.dataTransfer.files);
			}}
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
				<Button
					color="brand"
					variant="solid-fill"
					disabled={desactive}
					onClick={() => appareilPhoto.current?.click()}
					className="hidden tactile:flex"
				>
					<CameraIcon />
					Photographier une facture
				</Button>
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
