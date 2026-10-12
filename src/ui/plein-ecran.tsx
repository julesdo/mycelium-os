import type { ReactNode } from 'react';
import { Button, Popup } from '@cladd-ui/react';
import { ChevronLeftIcon, XIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * LA PAGE PLEINE QU'ON FERME D'UNE CROIX — la coquille de tous les parcours
 * (12/10/2026) : le choix des professionnels, le dépôt au coffre, la visionneuse
 * d'un document.
 *
 * ⚠️ UNE FEUILLE DE CLADD TIRÉE SUR TOUT L'ÉCRAN, ET C'EST VOULU. Elle s'empile
 * au-dessus d'une autre feuille (la déclaration d'une voie, un courrier) en
 * gardant son piège à focus, ce qu'une page maison ne ferait pas. Le fond est
 * celui de l'application ; ce qui défile, c'est la page entière, jamais un cadre
 * dans un cadre — le défaut que le fondateur reprochait à l'ancienne feuille.
 *
 * Les marges de défilement gardent ce qu'on amène à l'écran (au clavier, au
 * toucher) hors des deux barres collantes.
 */
export function PleinEcran({
	ouvert,
	onFermer,
	libelle,
	children
}: {
	readonly ouvert: boolean;
	readonly onFermer: () => void;
	/** Ce que le lecteur d'écran annonce à l'ouverture. */
	readonly libelle: string;
	readonly children: ReactNode;
}) {
	return (
		<Popup
			open={ouvert}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			aria-label={libelle}
			header={false}
			closeButton={false}
			wrapClassName="parcours-plein-ecran h-full max-h-none scroll-pt-48 scroll-pb-40 pt-0! pb-0! bg-cladd-bg"
			contentClassName="max-w-none min-h-full justify-start gap-0"
		>
			{children}
		</Popup>
	);
}

/** La colonne d'une page pleine : celle du téléphone, élargie au-delà de 1024 px quand on le demande. */
export function ColonneDePleinEcran({
	large = false,
	children,
	refPage
}: {
	readonly large?: boolean;
	readonly children: ReactNode;
	readonly refPage?: React.Ref<HTMLDivElement>;
}) {
	return (
		<div
			ref={refPage}
			className={cn(
				'mx-auto flex min-h-dvh w-full max-w-xl flex-col px-cladd-2xs',
				large && 'lg:max-w-5xl'
			)}
		>
			{children}
		</div>
	);
}

/** Le rond d'une barre : la croix, le retour, un geste. */
export function BoutonRond({
	libelle,
	onClick,
	children
}: {
	readonly libelle: string;
	readonly onClick: () => void;
	readonly children: ReactNode;
}) {
	return (
		<Button
			variant="transparent"
			outline={false}
			rounded
			square
			size="md"
			aria-label={libelle}
			className="verre-carte verre-bouton shrink-0"
			onClick={onClick}
		>
			{children}
		</Button>
	);
}

/**
 * LA BARRE DU HAUT D'UNE PAGE PLEINE : le retour à gauche (ou rien), le titre et
 * sa sous-ligne au centre, la croix à droite ; dessous, ce que la page veut
 * garder collé (la barre d'étapes, la recherche).
 */
export function BarreDePleinEcran({
	titre,
	sousTitre,
	onRetour,
	libelleRetour = 'Retour',
	onFermer,
	droite,
	children
}: {
	readonly titre: string;
	readonly sousTitre?: string;
	readonly onRetour?: () => void;
	readonly libelleRetour?: string;
	readonly onFermer?: () => void;
	/** À la place de la croix : un geste de la page (télécharger…). */
	readonly droite?: ReactNode;
	readonly children?: ReactNode;
}) {
	return (
		<div className="verre-barre-haute sticky top-0 z-20 -mx-cladd-2xs flex flex-col gap-cladd-3xs px-cladd-2xs pt-barre-app pb-cladd-3xs">
			<div className="flex items-center gap-cladd-3xs">
				{onRetour === undefined ? (
					<span className="size-9 shrink-0" aria-hidden />
				) : (
					<BoutonRond libelle={libelleRetour} onClick={onRetour}>
						<ChevronLeftIcon />
					</BoutonRond>
				)}
				<div className="flex min-w-0 flex-1 flex-col items-center text-center">
					<span className="max-w-full truncate text-cladd-xs leading-tight font-semibold">
						{titre}
					</span>
					{sousTitre === undefined ? null : (
						<span className="max-w-full truncate text-cladd-3xs text-cladd-fg-soft">
							{sousTitre}
						</span>
					)}
				</div>
				{droite ??
					(onFermer === undefined ? (
						<span className="size-9 shrink-0" aria-hidden />
					) : (
						<BoutonRond libelle="Fermer" onClick={onFermer}>
							<XIcon />
						</BoutonRond>
					))}
			</div>
			{children}
		</div>
	);
}

/** La barre des étapes : un trait par étape, plein pour celles qu'on a passées. */
export function JaugeDEtapes({
	total,
	courante
}: {
	readonly total: number;
	readonly courante: number;
}) {
	return (
		<div className="flex gap-1" aria-hidden>
			{Array.from({ length: total }, (_, i) => (
				<span
					key={i}
					className={cn(
						'h-1 flex-1 rounded-full transition-colors duration-300',
						i <= courante ? 'bg-cladd-primary' : 'bg-cladd-fg/10'
					)}
				/>
			))}
		</div>
	);
}

/** Le bas collant d'une page pleine : ce qu'on a choisi, et le seul bouton plein. */
export function PiedDePleinEcran({ children }: { readonly children: ReactNode }) {
	return (
		<div
			className="verre-dense sticky bottom-0 z-20 -mx-cladd-2xs mt-auto flex flex-col gap-cladd-3xs px-cladd-2xs pt-cladd-3xs"
			style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
		>
			{children}
		</div>
	);
}
