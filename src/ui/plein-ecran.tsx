import type { ReactNode } from 'react';
import { Button, Popup } from '@cladd-ui/react';
import { ChevronLeftIcon, XIcon } from 'lucide-react';
import { cn } from './cn';
import { useCompterLaFeuille } from './feuilles-ouvertes';

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
 *
 * ⚠️ AU-DELÀ DE 1024 PX, UNE FENÊTRE POSÉE SUR L'APPLICATION (14/10/2026). Au
 * bureau, une page pleine effaçait la barre latérale, la barre du haut et tout
 * ce qu'on regardait, pour une question de trois lignes. Elle devient une fenêtre
 * à bords ronds sur l'application assombrie — la palette de Linear, les fenêtres
 * de Mercury — et un clic à côté la ferme. La même page, la même barre, le même
 * pied collant, le même seul bouton plein : seul le cadre change. Elle est ANCRÉE
 * EN HAUT, pas centrée : sa hauteur suit son contenu (les résultats d'une
 * recherche, les étapes d'un dépôt), et centrée elle sauterait à chaque frappe.
 * `large` (la visionneuse, le choix des professionnels) en fait une grande
 * fenêtre de hauteur fixe. Sous 1024 px, rien ne change.
 */
export function PleinEcran({
	ouvert,
	onFermer,
	libelle,
	large = false,
	compteeOuverte = true,
	children
}: {
	readonly ouvert: boolean;
	readonly onFermer: () => void;
	/** Ce que le lecteur d'écran annonce à l'ouverture. */
	readonly libelle: string;
	/** Au bureau, la grande fenêtre : un document, une liste à côté de sa fiche. */
	readonly large?: boolean;
	/**
	 * Elle compte parmi les feuilles ouvertes (`feuilles-ouvertes.ts`). Une célébration,
	 * non : c'est elle qui attend que les autres se ferment.
	 */
	readonly compteeOuverte?: boolean;
	readonly children: ReactNode;
}) {
	useCompterLaFeuille(ouvert && compteeOuverte);
	return (
		<Popup
			open={ouvert}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			aria-label={libelle}
			header={false}
			closeButton={false}
			backdropClassName="voile-bureau"
			wrapClassName={cn(
				'parcours-plein-ecran h-full max-h-none scroll-pt-48 scroll-pb-40 pt-0! pb-0! bg-cladd-bg',
				'fenetre-bureau lg:inset-x-0 lg:mx-auto lg:w-[calc(100%-4rem)] lg:rounded-[1.75rem]',
				large
					? 'lg:my-auto lg:h-[92dvh] lg:max-h-[92dvh] lg:max-w-6xl'
					: 'lg:mt-[8dvh] lg:mb-auto lg:h-fit lg:max-h-[84dvh] lg:max-w-xl'
			)}
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
				'mx-auto flex min-h-dvh w-full max-w-xl flex-col px-cladd-2xs lg:min-h-0 lg:px-cladd-xs',
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
		<div className="verre-barre-haute sticky top-0 z-20 -mx-cladd-2xs flex flex-col gap-cladd-3xs px-cladd-2xs pt-barre-app pb-cladd-3xs lg:-mx-cladd-xs lg:px-cladd-xs">
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
			className="verre-dense sticky bottom-0 z-20 -mx-cladd-2xs mt-auto flex flex-col gap-cladd-3xs px-cladd-2xs pt-cladd-3xs lg:-mx-cladd-xs lg:px-cladd-xs"
			style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
		>
			{children}
		</div>
	);
}

/**
 * UNE MODALE, EN PAGE PLEINE — la forme de TOUTES les feuilles du produit
 * (12/10/2026). Le fondateur : « toutes les modales de l'app doivent être comme
 * le système d'upload ou le choix de la défense, en plein écran, pour rester
 * cohérent ».
 *
 * La barre du haut porte le titre et la croix (ou le retour, quand la feuille
 * est une étape d'un autre parcours) ; le contenu défile avec la page ; le pied
 * collant porte le SEUL bouton plein, toujours sous le pouce. Une feuille qui
 * n'a pas de geste principal n'a pas de pied.
 */
export function FeuillePleinEcran({
	ouverte,
	onFermer,
	titre,
	sousTitre,
	libelle,
	retour = false,
	droite,
	pied,
	large = false,
	children
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly titre: string;
	readonly sousTitre?: string;
	/** Ce que le lecteur d'écran annonce, quand le titre ne suffit pas. */
	readonly libelle?: string;
	/** Un chevron de retour à gauche au lieu de la croix à droite. */
	readonly retour?: boolean;
	/** À droite de la barre, à la place de la croix. */
	readonly droite?: ReactNode;
	/** Le bas collant : le seul bouton plein, et ce qui l'accompagne. */
	readonly pied?: ReactNode;
	/** La colonne s'élargit au-delà de 1024 px (deux volets). */
	readonly large?: boolean;
	readonly children: ReactNode;
}) {
	return (
		<PleinEcran ouvert={ouverte} onFermer={onFermer} libelle={libelle ?? titre} large={large}>
			<ColonneDePleinEcran large={large}>
				<BarreDePleinEcran
					titre={titre}
					{...(sousTitre === undefined ? {} : { sousTitre })}
					{...(retour ? { onRetour: onFermer, libelleRetour: 'Fermer' } : { onFermer })}
					{...(droite === undefined ? {} : { droite })}
				/>
				<div className="flex flex-1 flex-col gap-cladd-xs pt-cladd-2xs pb-cladd-sm">{children}</div>
				{pied === undefined || pied === null ? null : <PiedDePleinEcran>{pied}</PiedDePleinEcran>}
			</ColonneDePleinEcran>
		</PleinEcran>
	);
}

/** Un bloc d'une feuille pleine : ce que `PopupContent` regroupait dans une feuille centrée. */
export function SectionDeFeuille({ children }: { readonly children: ReactNode }) {
	return <div className="flex flex-col gap-cladd-3xs">{children}</div>;
}
