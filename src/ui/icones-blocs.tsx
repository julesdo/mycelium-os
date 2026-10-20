import type { ComponentType } from 'react';
import {
	BarChart3Icon,
	CalculatorIcon,
	CalendarRangeIcon,
	ColumnsIcon,
	FlagIcon,
	Heading2Icon,
	Heading3Icon,
	InfoIcon,
	ListIcon,
	ListOrderedIcon,
	ListTodoIcon,
	MinusIcon,
	PilcrowIcon,
	QuoteIcon,
	ReceiptIcon,
	SmartphoneIcon,
	Table2Icon,
	TriangleAlertIcon
} from 'lucide-react';
import type { IconeDeGabarit as Cle } from '../lib/blog/gabarits';
import { cn } from './cn';

/**
 * LES PICTOGRAMMES DES BLOCS DE L'ÉDITEUR (20/10/2026), dans une vignette comme les menus de
 * Notion et de GitBook : le menu « / », le panneau « Blocs » et le bouton « + » montrent le
 * même dessin pour le même bloc.
 */
const ICONES: Readonly<Record<Cle, ComponentType<{ className?: string }>>> = {
	paragraphe: PilcrowIcon,
	intertitre: Heading2Icon,
	'sous-intertitre': Heading3Icon,
	citation: QuoteIcon,
	puces: ListIcon,
	numeros: ListOrderedIcon,
	encadre: InfoIcon,
	attention: TriangleAlertIcon,
	etapes: ListTodoIcon,
	separateur: MinusIcon,
	tableau: Table2Icon,
	fin: FlagIcon,
	calcul: CalculatorIcon,
	ecran: SmartphoneIcon,
	compteur: ReceiptIcon,
	barres: BarChart3Icon,
	calendrier: CalendarRangeIcon,
	comparaison: ColumnsIcon
};

export function IconeDeGabarit({
	icone,
	grande = false
}: {
	readonly icone: Cle;
	readonly grande?: boolean;
}) {
	const Icone = ICONES[icone];
	return (
		<span
			aria-hidden
			className={cn(
				'flex shrink-0 items-center justify-center rounded-lg border border-filet-creme bg-papier text-encre-site',
				grande ? 'size-10' : 'size-8'
			)}
		>
			<Icone className={grande ? 'size-5' : 'size-4'} />
		</span>
	);
}
