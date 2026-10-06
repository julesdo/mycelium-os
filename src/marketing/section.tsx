import type { ReactNode } from 'react';
import { cn } from '../ui';

/**
 * LE SOCLE D'UNE SECTION DE LA PAGE PUBLIQUE — le papier chaud (06/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TROIS TONS, ET CHACUN ANNONCE UN CHANGEMENT DE SUJET
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   `creme`    — le papier : ce qu'on raconte.
 *   `profond`  — le même papier, un cran plus chaud : ce qu'on démontre.
 *   `encre`    — la seule section sombre, le manifeste et le pied de page.
 *
 * La page était entièrement noire jusqu'au 06/10/2026 ; le fondateur a demandé
 * des formes, de l'humanité et un ressenti pour une cible de gérants de TPE.
 * Voir `docs/superpowers/specs/2026-10-06-site-direction-artistique.md`.
 *
 * ⚠️ DES BORDS DROITS ET DES BANDES DE COULEUR UNIE (06/10/2026, au soir). Le
 * fondateur a validé la direction et demandé de la rendre « plus pro et sûre,
 * moins AI slop ». Relevé sur Mailchimp, Retool et Windsurf : la couleur vit
 * dans des bandes pleine largeur et des tuiles nettes, jamais dans des formes
 * organiques posées derrière les objets. Les arcs entre sections, les galets,
 * les cartes penchées qui flottent et le trait tiré à la main sont partis ; les
 * teintes, la serif, les photos et les captures restent.
 *
 *   `abricot`  — une bande de la couleur chaude du papier, pour l'appel final.
 */
export type TonSection = 'creme' | 'profond' | 'encre' | 'abricot';

const FOND: Record<TonSection, string> = {
	creme: 'bg-creme text-encre-site',
	profond: 'bg-creme-profonde text-encre-site',
	encre: 'bg-encre-site text-creme-sur-encre',
	abricot: 'bg-teinte-abricot text-encre-site'
};

export function SectionMarketing({
	id,
	ton = 'creme',
	className,
	children
}: {
	id?: string;
	ton?: TonSection;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section id={id} className={cn('relative w-full', FOND[ton], id && 'scroll-mt-barre-publique')}>
			<div
				className={cn(
					// Plus d'air sur téléphone (80 px) : moins de texte, et de la place autour.
					'mx-auto flex w-full max-w-6xl flex-col gap-cladd-sm px-cladd-2xs py-20 md:px-cladd-sm md:py-respiration',
					className
				)}
			>
				{children}
			</div>
		</section>
	);
}

/**
 * LES TEINTES DES FAMILLES, sur les cartes du site : la même règle que dans le
 * produit, « la teinte dit de quoi il s'agit ». Le sur-titre qui les portait
 * au-dessus de chaque titre a disparu le 06/10/2026 au soir (« très AI slop,
 * pas naturel », le fondateur) ; elles vivent dans les cartes et les bandes.
 */
export type TeinteSite = 'argent' | 'temps' | 'papiers' | 'question' | 'abricot';

const PASTILLE: Record<TeinteSite, string> = {
	argent: 'bg-teinte-argent',
	temps: 'bg-teinte-temps',
	papiers: 'bg-teinte-papiers',
	question: 'bg-teinte-question',
	abricot: 'bg-teinte-abricot'
};

/** L'aplat de fond d'une carte, par famille. */
export function fondDeTeinte(teinte: TeinteSite): string {
	return PASTILLE[teinte];
}

/**
 * LE TITRE DE SECTION, EN SERIF.
 *
 * ⚠️ D'UNE SEULE VALEUR depuis le 06/10/2026 au soir : la seconde moitié en
 * gris à 60 % était un des tics relevés. `suite` reste, pour couper la phrase
 * là où elle respire.
 */
export function TitreSection({
	children,
	suite,
	className
}: {
	children: ReactNode;
	/** La seconde moitié de la phrase. */
	suite?: ReactNode;
	className?: string;
}) {
	return (
		<h2
			className={cn(
				'apparait max-w-4xl font-serif text-titre-section leading-tight font-medium tracking-titre-section text-balance',
				className
			)}
		>
			{children}
			{suite === undefined ? null : <> {suite}</>}
		</h2>
	);
}

/** Le chapeau sous un titre : une ou deux phrases, jamais un paragraphe. */
export function Chapeau({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<p
			className={cn(
				'apparait max-w-2xl text-chapeau leading-relaxed font-normal opacity-80',
				className
			)}
		>
			{children}
		</p>
	);
}

/**
 * UN ÉCRAN DU PRODUIT, EN IMAGE.
 *
 * ⚠️ DES CAPTURES PNG, ET PLUS UN TÉLÉPHONE EN COMPOSANTS : le héros dessiné en
 * SVG faisait saccader la page sur téléphone. Deux largeurs par `srcset`, des
 * dimensions écrites pour que rien ne saute au chargement. Les fichiers sortent
 * de `scripts/capturer-ecrans.ts`, sur les vrais écrans de la salle
 * d'exposition.
 */
export type CaptureProduit = 'aujourdhui' | 'file' | 'dossier' | 'decompte' | 'paiement' | 'depots';

export function EcranProduit({
	capture,
	description,
	prioritaire = false,
	className
}: {
	capture: CaptureProduit;
	/** Ce que l'écran montre, pour qui ne le voit pas. */
	description: string;
	/** Le héros se charge tout de suite ; le reste, quand on s'en approche. */
	prioritaire?: boolean;
	className?: string;
}) {
	return (
		<div className={cn('ecran-telephone', className)}>
			<img
				src={`/ecrans/${capture}-393.png`}
				srcSet={`/ecrans/${capture}-393.png 393w, /ecrans/${capture}-786.png 786w`}
				sizes="(min-width: 768px) 320px, 70vw"
				width={393}
				height={852}
				alt={description}
				loading={prioritaire ? 'eager' : 'lazy'}
				decoding="async"
				{...(prioritaire ? { fetchPriority: 'high' as const } : {})}
			/>
		</div>
	);
}

/**
 * UNE PHOTOGRAPHIE DE LA PAGE (06/10/2026) — des gens au travail.
 *
 * Prises sur Unsplash sous sa licence et HÉBERGÉES PAR NOUS
 * (`scripts/preparer-photos.ts`, crédits dans `public/CREDITS.md`). WebP en
 * deux largeurs, dimensions écrites pour que rien ne saute au chargement.
 *
 * ⚠️ JAMAIS DE PRÉNOM À CÔTÉ. Une photo nomme un métier — « menuisier »,
 * « chauffeur » —, jamais une personne : un visage réel accolé à un prénom se
 * lirait comme un client qui témoigne, et ce produit ne fabrique aucune preuve.
 */
export type PhotoSite = 'artisan' | 'chauffeur' | 'factures' | 'commercante' | 'entrepot';

const FORMAT_PHOTO: Record<PhotoSite, readonly [number, number]> = {
	artisan: [1280, 1600],
	chauffeur: [1280, 960],
	factures: [1280, 853],
	commercante: [1280, 1600],
	entrepot: [1280, 1600]
};

export function Photo({
	photo,
	description,
	sizes = '(min-width: 768px) 480px, 90vw',
	prioritaire = false,
	className
}: {
	photo: PhotoSite;
	description: string;
	sizes?: string;
	prioritaire?: boolean;
	className?: string;
}) {
	const [largeur, hauteur] = FORMAT_PHOTO[photo];
	return (
		<img
			src={`/photos/${photo}-640.webp`}
			srcSet={`/photos/${photo}-640.webp 640w, /photos/${photo}-1280.webp 1280w`}
			sizes={sizes}
			width={largeur}
			height={hauteur}
			alt={description}
			loading={prioritaire ? 'eager' : 'lazy'}
			decoding="async"
			className={cn('block h-auto w-full object-cover', className)}
		/>
	);
}
