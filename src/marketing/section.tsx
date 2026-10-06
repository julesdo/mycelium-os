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
 * ⚠️ `overflow-clip`, ET PAS `overflow-hidden` : les galets débordent de leur
 * section et doivent être coupés à son bord, sans créer de conteneur de
 * défilement qui casserait les animations au défilement (`.apparait`).
 */
export type TonSection = 'creme' | 'profond' | 'encre';

const FOND: Record<TonSection, string> = {
	creme: 'bg-creme text-encre-site',
	profond: 'bg-creme-profonde text-encre-site',
	encre: 'bg-encre-site text-creme-sur-encre'
};

export function SectionMarketing({
	id,
	ton = 'creme',
	courbe = false,
	className,
	children
}: {
	id?: string;
	ton?: TonSection;
	/** Le bord du haut en arc doux : la section se pose sur la précédente. */
	courbe?: boolean;
	className?: string;
	children: ReactNode;
}) {
	return (
		<section
			id={id}
			className={cn(
				'relative isolate w-full overflow-clip',
				FOND[ton],
				id && 'scroll-mt-barre-publique',
				courbe && 'bord-courbe'
			)}
		>
			<div
				className={cn(
					// Plus d'air sur téléphone (80 px) : moins de texte, et de la place autour.
					'mx-auto flex w-full max-w-6xl flex-col gap-cladd-sm px-cladd-2xs py-20 md:px-cladd-sm md:py-respiration',
					// L'arc mange le haut de la section : le rembourrage le rend.
					courbe && 'pt-32 md:pt-48',
					className
				)}
			>
				{children}
			</div>
		</section>
	);
}

/**
 * LE SUR-TITRE — une pastille, à la place du rail tireté en capitales.
 *
 * Elle porte la teinte de la famille dont parle la section : la même règle que
 * dans le produit, « la teinte dit de quoi il s'agit ».
 */
export type TeinteSite = 'argent' | 'temps' | 'papiers' | 'question' | 'abricot';

const PASTILLE: Record<TeinteSite, string> = {
	argent: 'bg-teinte-argent',
	temps: 'bg-teinte-temps',
	papiers: 'bg-teinte-papiers',
	question: 'bg-teinte-question',
	abricot: 'bg-teinte-abricot'
};

export function SurTitre({
	teinte = 'abricot',
	children
}: {
	teinte?: TeinteSite;
	children: ReactNode;
}) {
	return (
		<span
			className={cn(
				// `rounded-2xl` et pas `full` : si le texte passe à la ligne, la pastille
				// devient un rectangle doux au lieu d'une gélule déformée.
				'inline-block w-fit max-w-full rounded-2xl px-cladd-3xs py-1.5 text-cladd-xs font-semibold text-balance text-encre-site',
				PASTILLE[teinte]
			)}
		>
			{children}
		</span>
	);
}

/** L'aplat de fond d'une carte, par famille. */
export function fondDeTeinte(teinte: TeinteSite): string {
	return PASTILLE[teinte];
}

/** Le galet, un cran plus soutenu que l'aplat, par famille. */
export function galetDeTeinte(teinte: TeinteSite): string {
	return {
		argent: 'bg-galet-argent',
		temps: 'bg-galet-temps',
		papiers: 'bg-galet-papiers',
		question: 'bg-galet-question',
		abricot: 'bg-galet-abricot'
	}[teinte];
}

/**
 * LE TITRE DE SECTION, EN SERIF.
 *
 * ⚠️ L'EMPHASE SE FAIT PAR LA VALEUR : la seconde moitié s'éteint d'un cran, la
 * première reste pleine. C'est la hiérarchie du site depuis le début ; seule la
 * fonte change, de la grotesque d'affiche à la serif, plus humaine.
 */
export function TitreSection({
	children,
	suite,
	className
}: {
	children: ReactNode;
	/** La seconde moitié, un cran plus douce. */
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
			{suite === undefined ? null : (
				<>
					{' '}
					<span className="opacity-60">{suite}</span>
				</>
			)}
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
