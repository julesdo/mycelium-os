import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ColorPicker } from '@cladd-ui/react';
import { CheckIcon, ChevronDownIcon, ImageUpIcon, Trash2Icon, XIcon } from 'lucide-react';
import { contraste } from '../lib/socle/couleurs';
import { tailleDuLogo } from '../lib/verticales/recouvrement/marque';
import { Avatar } from './avatar';
import { BoutonSecondaire } from './bouton';
import { cn } from './cn';
import { eurosCentimes } from './format';

/**
 * LOGO ET COULEURS — les pièces de la page où le gérant pose l'image de ses
 * courriers, et ce qui la montre ailleurs (23/10/2026).
 *
 * Relevé sur Mobbin : Square (« Add logo and color » puis « Preview and adjust » :
 * une carte pour le logo, une pour la couleur, l'aperçu qui bascule de l'e-mail à
 * la page de paiement), Shopify (l'aperçu de l'e-mail sous le réglage), Xero et
 * PandaDoc (des pastilles d'abord, la roue derrière « Autre »), Substack (deux
 * réglages, rien d'autre).
 *
 * ⚠️ LA COULEUR DU GÉRANT N'ENTRE QUE DANS SES APERÇUS. Elle colore ce que
 * recevra son client — la lettre, sa page — jamais un contrôle de Letikette.
 */

/** Une image posée : son adresse (d'aperçu ou de stockage) et ses dimensions. */
export interface ImageDeMarque {
	readonly src: string;
	readonly largeur: number;
	readonly hauteur: number;
}

/** Le logo du gérant en tête d'une page : proportions gardées, jamais rogné dans un rond. */
export function LogoDeMarque({ logo, nom }: { readonly logo: ImageDeMarque; readonly nom: string }) {
	const { largeur, hauteur } = tailleDuLogo(logo.largeur, logo.hauteur);
	return (
		<img
			src={logo.src}
			alt={nom}
			width={largeur}
			height={hauteur}
			decoding="async"
			className="block object-contain"
		/>
	);
}

/** La fine bande de sa couleur, en tête de sa lettre et de sa page. */
export function BandeDeMarque({ couleur }: { readonly couleur: string }) {
	return <div aria-hidden className="h-1 w-full rounded-full" style={{ backgroundColor: couleur }} />;
}

/**
 * L'APERÇU D'UN E-MAIL : le HTML même qui part, dans un cadre où rien ne s'exécute.
 *
 * ⚠️ `allow-same-origin` SANS `allow-scripts`. Le cadre n'exécute aucun script ;
 * la page, elle, y écrit le HTML et mesure sa hauteur, sans le recharger à chaque
 * pastille touchée (un `srcDoc` clignoterait). La hauteur s'écrit sur l'élément,
 * hors de React : elle suit la lettre, pas un état.
 *
 * ⚠️ REPLIÉ SOUS 1024 PX. Une lettre entière fait sept cents pixels sur un
 * téléphone : le logo, la bande et le relevé tiennent dans le haut, et les
 * réglages restent sous le pouce. « Voir tout l'e-mail » la déplie.
 */
export function ApercuDeCourriel({
	html,
	expediteur,
	destinataire,
	objet
}: {
	readonly html: string;
	readonly expediteur: string;
	readonly destinataire: string;
	readonly objet: string;
}) {
	const cadre = useRef<HTMLIFrameElement>(null);
	const [deplie, setDeplie] = useState(false);

	useEffect(() => {
		const element = cadre.current;
		const document = element?.contentDocument;
		if (element === null || document === null || document === undefined) return;
		document.open();
		document.write(html);
		document.close();
		const mesurer = () => {
			element.style.height = `${document.documentElement.scrollHeight}px`;
		};
		mesurer();
		window.addEventListener('resize', mesurer);
		return () => window.removeEventListener('resize', mesurer);
	}, [html]);

	return (
		<figure className="verre-carte flex flex-col overflow-hidden rounded-cladd-xl">
			<figcaption className="flex items-center gap-2.5 border-b border-cladd-outline px-3.5 py-3">
				<Avatar nom={expediteur} />
				<span className="flex min-w-0 flex-col">
					<span className="truncate text-cladd-xs font-semibold">{expediteur}</span>
					<span className="truncate text-cladd-3xs text-cladd-fg-soft">
						À {destinataire} · {objet}
					</span>
				</span>
			</figcaption>
			<div
				className={cn(
					'relative overflow-hidden lg:max-h-none',
					deplie ? 'max-h-none' : 'max-h-88'
				)}
			>
				<iframe
					ref={cadre}
					title={`Aperçu de l’e-mail : ${objet}`}
					sandbox="allow-same-origin"
					className="block h-120 w-full border-0"
				/>
				{deplie ? null : (
					<div
						aria-hidden
						className="pointer-events-none absolute inset-x-0 bottom-0 h-20 lg:hidden"
						// Le fond de la lettre elle-même (`courriel-relance.ts`) : le fondu ne se voit pas.
						style={{ background: 'linear-gradient(to top, #f4f4f2, rgba(244, 244, 242, 0))' }}
					/>
				)}
			</div>
			<button
				type="button"
				onClick={() => setDeplie((avant) => !avant)}
				className="flex min-h-11 items-center justify-center gap-1.5 border-t border-cladd-outline text-cladd-2xs font-medium text-cladd-fg-soft lg:hidden"
			>
				{deplie ? 'Replier l’e-mail' : 'Voir tout l’e-mail'}
				<ChevronDownIcon
					aria-hidden
					className={cn('size-4 transition-transform', deplie && 'rotate-180')}
				/>
			</button>
		</figure>
	);
}

/**
 * LE HAUT DE LA PAGE OÙ LE CLIENT PAIE, à l'image du gérant : la bande, le logo
 * (ou ses initiales), son nom, et ce qui reste à régler. Le reste de la page ne
 * change pas avec la marque, il n'est donc pas redessiné ici.
 */
export function ApercuDePageDePaiement({
	denomination,
	logo,
	couleur,
	clientNom,
	montant
}: {
	readonly denomination: string;
	readonly logo: ImageDeMarque | null;
	readonly couleur: string | null;
	readonly clientNom: string;
	readonly montant: bigint;
}) {
	return (
		<figure className="verre-carte flex flex-col gap-cladd-2xs overflow-hidden rounded-cladd-xl px-cladd-2xs pt-3 pb-cladd-xs">
			{couleur === null ? null : <BandeDeMarque couleur={couleur} />}
			<div className="flex flex-col items-center gap-1 pt-cladd-3xs text-center">
				{logo === null ? <Avatar nom={denomination} grand /> : <LogoDeMarque logo={logo} nom={denomination} />}
				<span className="mt-1 text-cladd-sm font-semibold">{denomination}</span>
				<span className="text-cladd-2xs text-cladd-fg-soft">À l’attention de {clientNom}</span>
			</div>
			<div className="flex flex-col items-center gap-0.5 pt-cladd-3xs">
				<span className="text-cladd-2xs text-cladd-fg-soft">Reste à régler</span>
				<span className="text-cladd-lg font-semibold tabular-nums">{eurosCentimes(montant)}</span>
			</div>
			<figcaption className="text-center text-cladd-3xs text-cladd-fg-softer">
				Le haut de la page, où votre client vous reconnaît.
			</figcaption>
		</figure>
	);
}

const TYPES_DU_CHAMP = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';

/**
 * LA CARTE DU LOGO, celle de Square : sa vignette, ce qu'il est, et deux gestes.
 * Le fichier se prépare au choix (`app/logo-courriers.ts`) ; rien ne part avant
 * « Enregistrer ».
 */
export function CarteDuLogo({
	logo,
	nom,
	enPreparation,
	modifiable,
	erreur,
	onChoisir,
	onRetirer
}: {
	readonly logo: ImageDeMarque | null;
	readonly nom: string;
	readonly enPreparation: boolean;
	readonly modifiable: boolean;
	readonly erreur: string | null;
	readonly onChoisir: (fichier: File) => void;
	readonly onRetirer: () => void;
}) {
	const champ = useRef<HTMLInputElement>(null);
	return (
		<div className="flex flex-col gap-2">
			<div className="verre-carte flex min-h-17 items-center gap-3 rounded-cladd-xl px-3.5 py-3">
				<span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-cladd-md border border-cladd-outline bg-white">
					{logo === null ? (
						<ImageUpIcon aria-hidden className="size-5 text-cladd-fg-softer" />
					) : (
						<img src={logo.src} alt="" className="max-h-12 max-w-12 object-contain" />
					)}
				</span>
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="text-cladd-xs font-semibold">Votre logo</span>
					<span className="text-cladd-2xs text-cladd-fg-soft">
						{enPreparation
							? 'Préparation…'
							: logo === null
								? `Sans logo, « ${nom} » s’écrit en tête.`
								: `${logo.largeur} × ${logo.hauteur} px, marges retirées`}
					</span>
				</span>
				{modifiable ? (
					<span className="flex shrink-0 items-center gap-1.5">
						<BoutonSecondaire disabled={enPreparation} onClick={() => champ.current?.click()}>
							{logo === null ? 'Ajouter' : 'Changer'}
						</BoutonSecondaire>
						{logo === null ? null : (
							<BoutonSecondaire
								disabled={enPreparation}
								onClick={onRetirer}
								aria-label="Retirer le logo"
							>
								<Trash2Icon aria-hidden />
							</BoutonSecondaire>
						)}
					</span>
				) : null}
				<input
					ref={champ}
					type="file"
					accept={TYPES_DU_CHAMP}
					className="sr-only"
					tabIndex={-1}
					aria-hidden
					onChange={(e) => {
						const fichier = e.target.files?.[0];
						// Vidé après lecture : reprendre le même fichier doit redéclencher le geste.
						e.target.value = '';
						if (fichier !== undefined) onChoisir(fichier);
					}}
				/>
			</div>
			{erreur === null ? null : (
				<p role="alert" className="px-1 text-cladd-2xs text-cladd-fg">
					{erreur}
				</p>
			)}
		</div>
	);
}

/** Une pastille de couleur : un rond de 32 px dans une cible de 44. */
function Pastille({
	libelle,
	choisie,
	desactivee,
	onClick,
	fond,
	children
}: {
	readonly libelle: string;
	readonly choisie: boolean;
	readonly desactivee: boolean;
	readonly onClick: () => void;
	readonly fond: string | null;
	readonly children?: ReactNode;
}) {
	return (
		<button
			type="button"
			role="radio"
			aria-checked={choisie}
			aria-label={libelle}
			title={libelle}
			disabled={desactivee}
			onClick={onClick}
			className="flex size-11 items-center justify-center rounded-full disabled:opacity-60"
		>
			<span
				className={cn(
					'flex size-8 items-center justify-center rounded-full border border-cladd-outline transition-shadow',
					choisie && 'ring-2 ring-cladd-fg ring-offset-2 ring-offset-cladd-bg'
				)}
				style={fond === null ? undefined : { background: fond }}
			>
				{children}
			</span>
		</button>
	);
}

/** La coche d'une pastille, blanche sur une couleur foncée, encre sur une claire. */
function Coche({ couleur }: { readonly couleur: string }) {
	return (
		<CheckIcon
			aria-hidden
			className={cn('size-4', contraste(couleur, '#ffffff') >= 3 ? 'text-white' : 'text-black')}
		/>
	);
}

const ARC_EN_CIEL =
	'conic-gradient(from 90deg, #e5484d, #f5a524, #f2d64b, #46a758, #3e9bd8, #6e56cf, #d6409f, #e5484d)';

/**
 * LE NUANCIER : les teintes du logo d'abord, puis huit couleurs sobres, « Sans
 * couleur » (la lettre grise) et « Autre », qui ouvre l'éditeur de Cladd.
 *
 * ⚠️ UNE COULEUR QUI N'EST NI DU LOGO NI DE LA PALETTE garde sa pastille, juste
 * avant « Autre » : celle qu'on a choisie doit rester visible et cochée.
 */
export function NuancierDeMarque({
	teintesDuLogo,
	palette,
	choisie,
	modifiable,
	onChoisir
}: {
	readonly teintesDuLogo: readonly string[];
	readonly palette: readonly { readonly nom: string; readonly hex: string }[];
	readonly choisie: string | null;
	readonly modifiable: boolean;
	readonly onChoisir: (couleur: string | null) => void;
}) {
	const autre = useRef<HTMLSpanElement>(null);
	const [editeurOuvert, setEditeurOuvert] = useState(false);
	const connue =
		choisie === null ||
		teintesDuLogo.includes(choisie) ||
		palette.some((couleur) => couleur.hex === choisie);

	return (
		<div className="flex flex-col gap-cladd-3xs">
			{teintesDuLogo.length === 0 ? null : (
				<div className="flex flex-col gap-1">
					<span className="px-1 text-cladd-2xs text-cladd-fg-soft">Tirées de votre logo</span>
					<div role="radiogroup" aria-label="Couleurs tirées de votre logo" className="flex flex-wrap">
						{teintesDuLogo.map((hex) => (
							<Pastille
								key={hex}
								libelle={`Couleur du logo ${hex}`}
								choisie={choisie === hex}
								desactivee={!modifiable}
								onClick={() => onChoisir(hex)}
								fond={hex}
							>
								{choisie === hex ? <Coche couleur={hex} /> : null}
							</Pastille>
						))}
					</div>
				</div>
			)}
			<div className="flex flex-col gap-1">
				{teintesDuLogo.length === 0 ? null : (
					<span className="px-1 text-cladd-2xs text-cladd-fg-soft">Ou une autre</span>
				)}
				<div role="radiogroup" aria-label="Couleur de vos courriers" className="flex flex-wrap">
					<Pastille
						libelle="Sans couleur"
						choisie={choisie === null}
						desactivee={!modifiable}
						onClick={() => onChoisir(null)}
						fond={null}
					>
						{choisie === null ? (
							<CheckIcon aria-hidden className="size-4" />
						) : (
							<XIcon aria-hidden className="size-4 text-cladd-fg-softer" />
						)}
					</Pastille>
					{palette.map((couleur) => (
						<Pastille
							key={couleur.hex}
							libelle={couleur.nom}
							choisie={choisie === couleur.hex}
							desactivee={!modifiable}
							onClick={() => onChoisir(couleur.hex)}
							fond={couleur.hex}
						>
							{choisie === couleur.hex ? <Coche couleur={couleur.hex} /> : null}
						</Pastille>
					))}
					{connue || choisie === null ? null : (
						<Pastille
							libelle={`Votre couleur ${choisie}`}
							choisie
							desactivee={!modifiable}
							onClick={() => onChoisir(choisie)}
							fond={choisie}
						>
							<Coche couleur={choisie} />
						</Pastille>
					)}
					<span ref={autre} className="inline-flex">
						<Pastille
							libelle="Autre couleur"
							choisie={false}
							desactivee={!modifiable}
							onClick={() => setEditeurOuvert(true)}
							fond={ARC_EN_CIEL}
						/>
					</span>
				</div>
			</div>
			{modifiable ? (
				<ColorPicker
					anchorRef={autre}
					popoverState={editeurOuvert}
					onPopoverState={setEditeurOuvert}
					value={choisie ?? '#1e3a5f'}
					alpha={false}
					throttle={60}
					onChange={(couleur) => onChoisir(couleur.hex.slice(0, 7).toLowerCase())}
				/>
			) : null}
		</div>
	);
}

/**
 * LES DEUX VOLETS : les réglages à gauche, l'aperçu à droite et collé au-delà de
 * 1024 px ; en dessous, l'aperçu d'abord, puis les réglages, comme l'éditeur de
 * thème de Universe ou le widget d'Airbuds.
 */
export function MiseEnPageDeMarque({
	apercu,
	reglages
}: {
	readonly apercu: ReactNode;
	readonly reglages: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-cladd-xs lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-start lg:gap-cladd-sm">
			<div className="flex flex-col gap-cladd-2xs lg:sticky lg:top-24 lg:order-2">{apercu}</div>
			<div className="flex flex-col gap-cladd-xs lg:order-1">{reglages}</div>
		</div>
	);
}
