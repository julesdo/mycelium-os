import { CheckIcon, CircleAlertIcon, HourglassIcon, LoaderCircleIcon } from 'lucide-react';
import { cn } from './cn';
import { Lien } from './lien';

/**
 * LES TRAVAUX DE L'ÉQUIPE, LEURS PIÈCES D'ÉCRAN (20/10/2026). Une recherche longue tourne
 * en arrière-plan, comme un téléchargement dans un navigateur : une icône dit où elle en
 * est, une pastille flottante la rappelle sur tous les écrans de l'admin, et la file
 * (`/admin/travaux`) garde les résultats jusqu'à ce qu'on les ouvre.
 */

export type EtatAffiche = 'EN_ATTENTE' | 'EN_COURS' | 'FAIT' | 'ECHEC';

/** L'icône d'un travail, dans la vignette des cartes : le sablier, la roue, la coche, l'alerte. */
export function IconeDeTravail({ etat }: { readonly etat: EtatAffiche }) {
	return (
		<span
			aria-hidden
			className={cn(
				'flex size-10 shrink-0 items-center justify-center rounded-full',
				etat === 'FAIT' ? 'bg-cladd-fg text-cladd-bg' : 'bg-cladd-fg/[0.06] text-cladd-fg'
			)}
		>
			{etat === 'EN_ATTENTE' ? (
				<HourglassIcon className="size-4" />
			) : etat === 'EN_COURS' ? (
				<LoaderCircleIcon className="size-4 animate-spin" />
			) : etat === 'FAIT' ? (
				<CheckIcon className="size-4" />
			) : (
				<CircleAlertIcon className="text-cladd-red size-4" />
			)}
		</span>
	);
}

/** Où en est un travail long : une barre fine, sans couleur de seuil. */
export function BarreDAvancement({ fait, total }: { readonly fait: number; readonly total: number }) {
	const part = total <= 0 ? 0 : Math.min(1, Math.max(0, fait / total));
	return (
		<span
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={total}
			aria-valuenow={fait}
			className="block h-1.5 w-full overflow-hidden rounded-full bg-cladd-fg/10"
		>
			<span
				className="block h-full rounded-full bg-cladd-fg transition-[width] duration-500"
				style={{ width: `${Math.round(part * 100)}%` }}
			/>
		</span>
	);
}

/**
 * LA PASTILLE DES TRAVAUX, posée au-dessus de la barre du bas (au-dessus du coin bas droit
 * au bureau) tant qu'un travail tourne ou attend d'être ouvert. Elle mène à la file.
 */
export function PastilleDesTravaux({
	enCours,
	prets
}: {
	readonly enCours: number;
	readonly prets: number;
}) {
	if (enCours === 0 && prets === 0) return null;
	const texte =
		enCours > 0
			? `${enCours} recherche${enCours > 1 ? 's' : ''} en cours`
			: `${prets} résultat${prets > 1 ? 's' : ''} prêt${prets > 1 ? 's' : ''}`;
	return (
		<Lien
			to="/admin/travaux"
			className="fixed bottom-24 left-1/2 z-40 flex h-10 -translate-x-1/2 items-center gap-2 rounded-full bg-cladd-fg px-4 text-cladd-2xs font-semibold text-cladd-bg shadow-lg lg:right-6 lg:bottom-6 lg:left-auto lg:translate-x-0"
		>
			{enCours > 0 ? (
				<LoaderCircleIcon aria-hidden className="size-4 animate-spin" />
			) : (
				<CheckIcon aria-hidden className="size-4" />
			)}
			{texte}
			{enCours > 0 && prets > 0 ? (
				<span className="rounded-full bg-cladd-bg/20 px-1.5 text-cladd-4xs tabular-nums">
					{prets} prêt{prets > 1 ? 's' : ''}
				</span>
			) : null}
		</Lien>
	);
}
