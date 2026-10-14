import type { ReactNode } from 'react';
import { cn } from './cn';

/**
 * LE TABLEAU DE BORD DU BUREAU : DEUX COLONNES AU-DELÀ DE 1280 PX (14/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AU TÉLÉPHONE, CES ENVELOPPES N'EXISTENT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sous 1280 px, chaque enveloppe est `display: contents` : ses enfants restent
 * ceux de la colonne de l'écran, dans le même ordre, avec le même écart. L'ordre
 * du DOM est l'ordre du téléphone — celui que lisent le clavier et le lecteur
 * d'écran à toutes les largeurs. Au-delà, la grille range les zones : ce qu'on
 * lit à gauche (le montant, la file), ce qui accompagne à droite (Plume, le
 * travail de fond), comme le solde et les comptes côte à côte chez Mercury.
 *
 * ⚠️ 1280 ET NON 1024 : la barre latérale prend 256 px. À 1024, il resterait
 * 340 px à la colonne de gauche, et une carte de la file y coupe le nom de son
 * client. Entre les deux, l'écran garde sa colonne unique, élargie.
 */
export function TableauDeBord({ children }: { readonly children: ReactNode }) {
	return (
		/*
		  ⚠️ LA SECONDE RANGÉE EST FLEXIBLE (`1fr`) : une colonne de côté qui couvre les
		  deux rangées (`cote-collant`) y verse sa hauteur, au lieu de grandir la
		  première et d'ouvrir un trou sous la tête.
		*/
		<div className="contents xl:grid xl:grid-cols-[minmax(0,1fr)_22rem] xl:grid-rows-[auto_1fr] xl:items-start xl:gap-x-cladd-sm xl:gap-y-cladd-xs 2xl:grid-cols-[minmax(0,1fr)_24rem]">
			{children}
		</div>
	);
}

const PLACES = {
	/**
	 * En haut à gauche : le chiffre du jour, centré sur la hauteur de la rangée — Plume,
	 * à sa droite, est souvent plus haut, et la file ne doit pas partir d’un trou.
	 */
	tete: 'xl:col-start-1 xl:row-start-1 xl:self-stretch xl:justify-center',
	/** Sous le chiffre : ce qu'on vous demande. */
	principal: 'xl:col-start-1 xl:row-start-2',
	/** En haut à droite : ce que fait Plume. */
	'cote-haut': 'xl:col-start-2 xl:row-start-1',
	/** Dessous, à droite : ce qui tourne sans vous. */
	cote: 'xl:col-start-2 xl:row-start-2',
	/**
	 * Toute la hauteur à droite, et qui reste à l'écran quand la gauche défile : Plume
	 * sur un dossier, comme l'assistant de Xero ou de Deel à côté de ce qu'il commente.
	 */
	'cote-collant':
		'xl:col-start-2 xl:row-span-2 xl:row-start-1 xl:sticky xl:top-cladd-xs xl:self-start'
} as const;

export function ZoneDuTableau({
	place,
	children
}: {
	readonly place: keyof typeof PLACES;
	readonly children: ReactNode;
}) {
	return (
		<div className={cn('contents xl:flex xl:min-w-0 xl:flex-col xl:gap-cladd-xs', PLACES[place])}>
			{children}
		</div>
	);
}
