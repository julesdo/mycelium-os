import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';
import { CheckIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * LA FRISE DES QUATRE ÉTAPES, ET L'ÉTAPE EN COURS.
 *
 * Prêt → On lui écrit → Le tribunal, si besoin → Réglé. Le détail juridique vit
 * à l'intérieur de l'étape 3 et ne se déplie que si on y arrive.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL. Une étape franchie n'est pas un seuil : elle se
 * marque par un disque plein, comme sur le rail d'une voie.
 */

export type EtatEtapeAffiche = 'FAITE' | 'EN_COURS' | 'A_VENIR';

export interface EtapeDossierAffichee {
	readonly cle: string;
	readonly titre: string;
	readonly etat: EtatEtapeAffiche;
	readonly detail: string | null;
}

export interface LectureEtapesAffichee {
	readonly etape: string;
	readonly classe: boolean;
	readonly etapes: readonly EtapeDossierAffichee[];
	readonly ceQuiSePasse: string;
	readonly siRienNeBouge: string;
}

function Disque({ etat }: { etat: EtatEtapeAffiche }) {
	if (etat === 'FAITE') {
		return (
			<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cladd-fg">
				<CheckIcon className="size-3 text-cladd-bg" aria-hidden />
			</span>
		);
	}
	return (
		<span
			className={cn(
				'size-5 shrink-0 rounded-full',
				etat === 'EN_COURS' ? 'border-[5px] border-cladd-fg' : 'border-2 border-cladd-outline'
			)}
		/>
	);
}

export function FriseDossier({ lecture }: { lecture: LectureEtapesAffichee }) {
	return (
		<div className={cn('flex flex-col gap-cladd-3xs', lecture.classe && 'opacity-60')}>
			<ol className="grid grid-cols-4 gap-cladd-3xs" aria-label="Les étapes du dossier">
				{lecture.etapes.map((etape) => (
					<li
						key={etape.cle}
						className="flex min-w-0 flex-col items-start gap-1"
						aria-current={etape.etat === 'EN_COURS' ? 'step' : undefined}
					>
						<div className="flex w-full items-center gap-1">
							<Disque etat={etape.etat} />
							<span className="h-0.5 flex-1 rounded-full bg-cladd-outline" />
						</div>
						<p
							className={cn(
								'text-cladd-2xs leading-tight',
								etape.etat === 'EN_COURS'
									? 'font-semibold text-cladd-fg'
									: etape.etat === 'FAITE'
										? 'text-cladd-fg-soft'
										: 'text-cladd-fg-softest'
							)}
						>
							{etape.titre}
						</p>
					</li>
				))}
			</ol>
			{lecture.classe ? (
				<p className="text-cladd-2xs text-cladd-fg-soft">Dossier classé. Il peut être rouvert.</p>
			) : null}
		</div>
	);
}

/**
 * L'ÉTAPE EN COURS — la seule chose mise en avant de la page.
 *
 * Ce qui se passe, ce qui arrive si rien ne bouge, et les gestes. ⚠️ Quand
 * l'étape pose un choix, aucun geste n'est principal : les enfants arrivent en
 * boutons de même poids.
 */
export function EtapeEnCours({
	lecture,
	children
}: {
	lecture: LectureEtapesAffichee;
	children?: ReactNode;
}) {
	const enCours = lecture.etapes.find((e) => e.etat === 'EN_COURS');
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<p className="text-cladd-2xs text-cladd-fg-softer">Maintenant</p>
			<p className="text-letikette-titre leading-tight font-semibold">
				{enCours?.titre ?? 'Réglé'}
			</p>
			<p className="text-cladd-sm leading-snug">{lecture.ceQuiSePasse}</p>
			<p className="text-cladd-xs leading-snug text-cladd-fg-soft">
				Si rien ne bouge : {lecture.siRienNeBouge}
			</p>
			{children === undefined ? null : (
				<div className="mt-cladd-3xs flex flex-wrap gap-cladd-3xs">{children}</div>
			)}
		</Surface>
	);
}

/** Le fil des étapes : passées avec leur date, à venir en gris. */
export function FilDesEtapes({ lecture }: { lecture: LectureEtapesAffichee }) {
	return (
		<ol className="flex flex-col gap-cladd-3xs">
			{lecture.etapes.map((etape) => (
				<li key={etape.cle} className="flex items-start gap-cladd-3xs">
					<Disque etat={etape.etat} />
					<div className="flex min-w-0 flex-col">
						<p
							className={cn(
								'text-cladd-xs',
								etape.etat === 'A_VENIR' ? 'text-cladd-fg-softest' : 'text-cladd-fg'
							)}
						>
							{etape.titre}
						</p>
						{etape.detail === null ? null : (
							<p className="text-cladd-2xs text-cladd-fg-softer">{etape.detail}</p>
						)}
					</div>
				</li>
			))}
		</ol>
	);
}

/**
 * DEUX COLONNES À PARTIR DE 1024 PX : où j'en suis à gauche, ce que contient le
 * dossier à droite. En dessous, la droite s'empile sous la gauche : cette page
 * n'est pas une liste, et ouvrir le contenu en feuille cacherait le fil.
 */
export function DeuxColonnesDossier({ gauche, droite }: { gauche: ReactNode; droite: ReactNode }) {
	return (
		<div className="flex flex-col gap-cladd-xs lg:grid lg:grid-cols-2 lg:items-start">
			<div className="flex min-w-0 flex-col gap-cladd-xs">{gauche}</div>
			<div className="flex min-w-0 flex-col gap-cladd-xs">{droite}</div>
		</div>
	);
}
