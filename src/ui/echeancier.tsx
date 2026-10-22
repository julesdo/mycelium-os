import { versements } from '../lib/verticales/recouvrement/gabarits/accord-echeancier';
import { BoutonTexte } from './bouton';
import { cn } from './cn';
import { dateCourte, eurosCentimes, jourDecale } from './format';

/**
 * L'ÉCHÉANCIER — le client paie en plusieurs fois (analyse des parcours du 08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI MANQUAIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un client qui demande à payer en trois fois, c'est un des cas les plus
 * courants d'un impayé entre entreprises — et le produit ne savait que composer
 * l'accord écrit. Rien ne suivait les versements, et le pilote continuait de
 * relancer la somme entière pendant que le client payait à l'heure.
 *
 * Deux références relevées sur Mobbin : Affirm (« Choose a payment plan » : le
 * nombre de fois, puis le calendrier qui en découle) pour CONVENIR, et Afterpay
 * (« Payment schedule » : une frise de versements, « 1 of 4 · Paid »,
 * « Next payment ») pour SUIVRE.
 *
 * ⚠️ « REÇU », PAS « PAYÉ PAR LUI ». Les règlements arrivés depuis l'accord se
 * versent sur les échéances dans l'ordre : c'est un cumul, un fait. Le logiciel
 * ne dit pas qu'un virement donné est CE versement-là.
 */

export type EtatEcheanceAffiche = 'PAYEE' | 'PARTIELLE' | 'A_VENIR' | 'EN_RETARD';

export interface EcheancierAffiche {
	readonly id: string;
	readonly etat: 'EN_COURS' | 'EN_RETARD' | 'TERMINE' | 'ARRETE';
	readonly total: bigint;
	readonly paye: bigint;
	readonly payees: number;
	readonly prochaine: number | null;
	readonly echeances: readonly {
		readonly le: string;
		readonly montant: bigint;
		readonly paye: bigint;
		readonly etat: EtatEcheanceAffiche;
	}[];
}

/** Les nombres de fois proposés d'un toucher. Le serveur en admet d'autres, jusqu'à 12. */
export const NOMBRES_DE_VERSEMENTS = [2, 3, 4, 6] as const;

/**
 * LES JOURS DU PREMIER VERSEMENT, proposés d'un toucher : le 1er du mois suivant, le
 * 15 (ce mois-ci s'il n'est pas passé), dans sept jours.
 */
export function departsProposes(aujourdHui: string): { libelle: string; date: string }[] {
	const [annee, mois, jour] = aujourdHui.split('-').map(Number) as [number, number, number];
	const iso = (a: number, m: number, j: number) =>
		new Date(Date.UTC(a, m - 1, j)).toISOString().slice(0, 10);
	const propositions = [
		{ libelle: 'Le 1er', date: iso(annee, mois + 1, 1) },
		{ libelle: 'Le 15', date: jour < 15 ? iso(annee, mois, 15) : iso(annee, mois + 1, 15) },
		{ libelle: 'Dans 7 jours', date: jourDecale(aujourdHui, 7) }
	];
	return propositions.filter((p, i) => propositions.findIndex((q) => q.date === p.date) === i);
}

/** « 1er versement », « 2e versement ». */
function rang(i: number): string {
	return i === 0 ? '1er versement' : `${i + 1}e versement`;
}

/**
 * LE CALENDRIER D'UN PAIEMENT EN PLUSIEURS FOIS — chaque versement, sa date, son
 * montant, comme le « Choose a payment plan » d'Affirm.
 */
export function CalendrierDesVersements({
	total,
	nombre,
	premiereLe
}: {
	/** Ce qui reste dû sur les factures, hors pénalités : la somme de l'échéancier. */
	readonly total: bigint;
	readonly nombre: number;
	readonly premiereLe: string;
}) {
	const calendrier = total > 0n ? versements(total, nombre, premiereLe, 1) : [];
	return (
		<ol className="verre-carte flex flex-col rounded-cladd-xl px-3.5 py-1 [&>li+li]:border-t [&>li+li]:border-cladd-outline">
			{calendrier.map((versement, i) => (
				<li
					key={versement.numero}
					className="flex min-h-12 items-center justify-between gap-3 py-2"
				>
					<span className="flex flex-col">
						<span className="text-cladd-xs font-medium">{rang(i)}</span>
						<span className="text-cladd-2xs text-cladd-fg-soft">{dateCourte(versement.date)}</span>
					</span>
					<span className="text-cladd-xs font-semibold tabular-nums">
						{eurosCentimes(versement.montant)}
					</span>
				</li>
			))}
		</ol>
	);
}

const LIBELLE_ETAT: Readonly<Record<EtatEcheanceAffiche, string>> = {
	PAYEE: 'Reçu',
	PARTIELLE: 'Reçu en partie',
	A_VENIR: 'À venir',
	EN_RETARD: 'Pas arrivé'
};

/**
 * L'ÉCHÉANCIER QUI COURT, sur le dossier — la frise d'Afterpay : chaque
 * versement, ce qui en est reçu, et le prochain.
 */
export function SuiviEcheancier({
	echeancier,
	onArreter,
	onAccordEcrit
}: {
	readonly echeancier: EcheancierAffiche;
	readonly onArreter?: () => void;
	/** Ouvre l'accord écrit à faire signer, rempli de ce calendrier. */
	readonly onAccordEcrit?: () => void;
}) {
	const { echeances, prochaine, etat } = echeancier;
	const part =
		echeancier.total === 0n ? 0 : Number((echeancier.paye * 1000n) / echeancier.total) / 10;
	return (
		<section
			aria-label="Échéancier"
			className="verre-carte flex flex-col gap-cladd-3xs rounded-cladd-xl p-cladd-2xs"
		>
			<div className="flex items-baseline justify-between gap-3">
				<h3 className="text-cladd-sm font-semibold">Paie en {echeances.length} fois</h3>
				<span className="text-cladd-xs text-cladd-fg-soft tabular-nums">
					{echeancier.payees} sur {echeances.length}
				</span>
			</div>
			<div
				className="h-1.5 w-full overflow-hidden rounded-full bg-cladd-fg/10"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={Math.round(part)}
				aria-label="Part reçue"
			>
				<div
					className="h-full rounded-full bg-cladd-fg"
					style={{ width: `${Math.min(100, part)}%` }}
				/>
			</div>
			<p className="text-cladd-2xs text-cladd-fg-soft">
				{eurosCentimes(echeancier.paye)} reçus sur {eurosCentimes(echeancier.total)}
			</p>

			<ol className="flex flex-col">
				{echeances.map((echeance, i) => {
					const estProchaine = i === prochaine && echeance.etat !== 'EN_RETARD';
					const dernier = i === echeances.length - 1;
					return (
						<li key={echeance.le} className="relative flex gap-3 pb-3 last:pb-0">
							{/* La frise : un point par versement, plein quand il est reçu. */}
							<span aria-hidden className="relative flex w-3 shrink-0 justify-center">
								<span
									className={cn(
										'mt-1.5 size-2.5 rounded-full border-2 border-cladd-fg',
										echeance.etat === 'PAYEE' ? 'bg-cladd-fg' : 'bg-transparent',
										echeance.etat === 'A_VENIR' && !estProchaine && 'border-cladd-fg/30'
									)}
								/>
								{dernier ? null : (
									<span className="absolute top-4 bottom-[-0.25rem] w-px bg-cladd-fg/20" />
								)}
							</span>
							<span className="flex min-w-0 flex-1 flex-col">
								<span
									className={cn(
										'text-cladd-xs',
										estProchaine || echeance.etat === 'EN_RETARD' ? 'font-semibold' : 'font-medium'
									)}
								>
									{estProchaine ? `Prochain : ${dateCourte(echeance.le)}` : dateCourte(echeance.le)}
								</span>
								<span className="text-cladd-2xs text-cladd-fg-soft">
									{i + 1} sur {echeances.length} · {LIBELLE_ETAT[echeance.etat]}
								</span>
							</span>
							<span className="text-cladd-xs font-semibold tabular-nums">
								{eurosCentimes(echeance.montant)}
							</span>
						</li>
					);
				})}
			</ol>

			{etat === 'EN_RETARD' ? (
				<p className="text-cladd-2xs leading-snug text-cladd-fg">
					Un versement n’est pas arrivé à temps : les relances ont repris.
				</p>
			) : etat === 'TERMINE' ? (
				<p className="text-cladd-2xs leading-snug text-cladd-fg">
					Tous les versements sont arrivés.
				</p>
			) : null}

			{etat === 'TERMINE' || (onArreter === undefined && onAccordEcrit === undefined) ? null : (
				<div className="flex flex-wrap gap-x-cladd-2xs">
					{onAccordEcrit === undefined || etat !== 'EN_COURS' ? null : (
						<BoutonTexte onClick={onAccordEcrit}>L’accord écrit, à lui faire signer</BoutonTexte>
					)}
					{onArreter === undefined ? null : (
						<BoutonTexte onClick={onArreter}>Arrêter l’échéancier</BoutonTexte>
					)}
				</div>
			)}
		</section>
	);
}
