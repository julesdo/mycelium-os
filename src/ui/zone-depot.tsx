import { useCallback, useRef, useState, type ReactNode } from 'react';
import { SurfaceCut } from '@cladd-ui/react';
import { cn } from './cn';

/**
 * La zone de dépôt de fichiers.
 *
 * Trois façons d'y verser des factures, parce qu'un gérant n'a pas le même
 * geste selon d'où il vient :
 *
 * - **glisser-déposer**, quand il arrive de son explorateur ou de sa messagerie ;
 * - **clic**, qui ouvre le sélecteur, pour ceux qui ne glissent pas ;
 * - **collage** (Ctrl+V), qui capte une capture d'écran ou un fichier copié.
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
				'rounded-cladd-md transition-colors',
				desactive && 'opacity-60',
				survole && 'cladd-color-brand'
			)}
			contentClassName="flex flex-col items-center justify-center gap-cladd-3xs p-cladd-xl text-center"
		>
			<button
				type="button"
				disabled={desactive}
				onClick={() => champ.current?.click()}
				className="flex flex-col items-center gap-cladd-3xs disabled:cursor-not-allowed"
			>
				{children}
			</button>

			<input
				ref={champ}
				type="file"
				multiple
				accept={accept}
				disabled={desactive}
				onChange={(e) => {
					recevoir(e.target.files);
					// Remis à zéro pour que redéposer le MÊME fichier redéclenche
					// l'événement. Sans ça, un fichier corrigé et redéposé sous le même
					// nom ne repart jamais.
					e.target.value = '';
				}}
				className="sr-only"
			/>
		</SurfaceCut>
	);
}
