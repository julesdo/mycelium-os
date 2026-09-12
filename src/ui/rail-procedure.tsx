import { CheckIcon } from 'lucide-react';
import { cn } from './cn';
import { dateCourte } from './format';

/**
 * LE RAIL D'UNE VOIE — ce qui manquait le plus à ce produit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL MONTRE TOUTE LA VOIE, PAS LE CHEMIN PARCOURU
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le domaine décrivait déjà deux machines à états complètes, avec leurs
 * libellés, leurs échéances et leurs conséquences. L'écran n'en affichait que
 * l'état courant, en une phrase. Tout ce qui vient après existait en mémoire et
 * n'était dessiné nulle part : « voir les étapes » veut dire savoir ce qui
 * vient, avant d'y être.
 *
 * ⚠️ ET LES BRANCHES SONT DESSINÉES. Une machine à états n'est pas une ligne.
 * L'opposition du débiteur est une issue réelle, à sa place dans le temps : la
 * noyer dans une liste de boutons ferait passer la voie pour un couloir.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL. Le vert, l'ambre et le rouge ne disent qu'une
 * chose dans ce produit : au-dessus du seuil, tout près, en dessous. Une étape
 * franchie n'est pas un seuil. Elle se marque par un disque plein.
 */

export type StatutEtapeAffiche = 'FRANCHIE' | 'COURANTE' | 'A_VENIR' | 'HORS_ATTEINTE';

export interface EtapeAffichee {
	readonly etat: string;
	readonly libelle: string;
	readonly statut: StatutEtapeAffiche;
	readonly atteinteLe: string | null;
	readonly branches: readonly {
		readonly etat: string;
		readonly libelle: string;
		readonly constat: string;
	}[];
	readonly brancheSuivie: { readonly etat: string; readonly survenuLe: string } | null;
}

export function RailProcedure({ etapes }: { etapes: readonly EtapeAffichee[] }) {
	return (
		<ol className="flex flex-col">
			{etapes.map((etape, rang) => (
				<li key={etape.etat} className="flex gap-cladd-3xs">
					<Piste statut={etape.statut} dernier={rang === etapes.length - 1} />
					<div className="min-w-0 flex-1 pb-cladd-2xs">
						<p
							className={cn(
								'text-cladd-xs font-semibold',
								etape.statut === 'A_VENIR' || etape.statut === 'HORS_ATTEINTE'
									? 'text-cladd-fg-softest'
									: 'text-cladd-fg'
							)}
						>
							{etape.libelle}
						</p>
						<p className="text-cladd-2xs text-cladd-fg-softer">
							{etape.atteinteLe !== null
								? dateCourte(etape.atteinteLe)
								: etape.statut === 'HORS_ATTEINTE'
									? 'le dossier a quitté cette voie'
									: 'pas encore'}
						</p>

						{etape.branches.map((branche) => {
							const prise = etape.brancheSuivie?.etat === branche.etat;
							return (
								<div
									key={branche.etat}
									className={cn(
										'mt-cladd-3xs border-l-2 border-dashed pl-cladd-3xs',
										prise ? 'border-cladd-fg-soft' : 'border-cladd-outline'
									)}
								>
									<p
										className={cn(
											'text-cladd-2xs',
											prise ? 'font-semibold text-cladd-fg' : 'text-cladd-fg-softest'
										)}
									>
										{branche.libelle}
										{prise ? ` · ${dateCourte(etape.brancheSuivie!.survenuLe)}` : null}
									</p>
									<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softest">
										{branche.constat}
									</p>
								</div>
							);
						})}
					</div>
				</li>
			))}
		</ol>
	);
}

/**
 * Le disque et le trait.
 *
 * Le trait s'arrête sur la dernière étape : un trait qui dépasse suggère une
 * suite qu'aucune machine ne décrit.
 */
function Piste({ statut, dernier }: { statut: StatutEtapeAffiche; dernier: boolean }) {
	return (
		<div className="flex w-cladd-2xs shrink-0 flex-col items-center pt-1">
			{statut === 'FRANCHIE' ? (
				<span className="flex size-4 items-center justify-center rounded-full bg-cladd-fg">
					<CheckIcon className="size-2.5 text-cladd-bg" aria-hidden />
				</span>
			) : statut === 'COURANTE' ? (
				<span className="size-4 rounded-full border-4 border-cladd-fg" />
			) : (
				<span className="size-4 rounded-full border-2 border-cladd-outline" />
			)}
			{dernier ? null : <span className="w-0.5 flex-1 bg-cladd-outline" />}
		</div>
	);
}
