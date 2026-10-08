import { useState } from 'react';
import { Input, Popup, PopupContent, Segmented, SegmentedButton } from '@cladd-ui/react';
import { versements } from '../lib/verticales/recouvrement/gabarits/accord-echeancier';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { MessageErreur } from './cadre-auth';
import { ChiffreHero } from './chiffre';
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
const NOMBRES = [2, 3, 4, 6] as const;

type Depart = 'SEMAINE' | 'PREMIER' | 'QUINZE' | 'AUTRE';

/** Le premier jour du mois suivant, ou le 15 du mois (ce mois-ci s'il n'est pas passé). */
function dateDuDepart(depart: Depart, aujourdHui: string, autre: string): string {
	const [annee, mois, jour] = aujourdHui.split('-').map(Number) as [number, number, number];
	const iso = (a: number, m: number, j: number) =>
		new Date(Date.UTC(a, m - 1, j)).toISOString().slice(0, 10);
	switch (depart) {
		case 'SEMAINE':
			return jourDecale(aujourdHui, 7);
		case 'PREMIER':
			return iso(annee, mois + 1, 1);
		case 'QUINZE':
			return jour < 15 ? iso(annee, mois, 15) : iso(annee, mois + 1, 15);
		case 'AUTRE':
			return autre;
	}
}

const LIBELLE_DEPART: Readonly<Record<Depart, string>> = {
	SEMAINE: 'Dans 7 jours',
	PREMIER: 'Le 1er',
	QUINZE: 'Le 15',
	AUTRE: 'Autre jour'
};

/** « 1er versement », « 2e versement ». */
function rang(i: number): string {
	return i === 0 ? '1er versement' : `${i + 1}e versement`;
}

/**
 * CONVENIR D'UN PAIEMENT EN PLUSIEURS FOIS — en feuille, deux choix et le
 * calendrier qui en découle, comme chez Affirm.
 */
export function FeuilleEcheancier({
	ouverte,
	onFermer,
	client,
	resteDu,
	aujourdHui,
	enCours = false,
	erreur = null,
	onConvenir,
	onAccordEcrit
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly client: string;
	/** Ce qui reste dû sur les factures, hors pénalités : la somme de l'échéancier. */
	readonly resteDu: bigint;
	readonly aujourdHui: string;
	readonly enCours?: boolean;
	readonly erreur?: string | null;
	readonly onConvenir: (choix: { nombre: number; premiereLe: string }) => void;
	/** Ouvre les courriers, où l'accord écrit à faire signer se prépare : ce qui dit où, y mène. */
	readonly onAccordEcrit?: () => void;
}) {
	const [nombre, setNombre] = useState<number>(3);
	const [depart, setDepart] = useState<Depart>('PREMIER');
	const [autre, setAutre] = useState(jourDecale(aujourdHui, 14));
	const premiereLe = dateDuDepart(depart, aujourdHui, autre);
	const valide = /^\d{4}-\d{2}-\d{2}$/.test(premiereLe) && premiereLe >= aujourdHui;
	const calendrier = valide && resteDu > 0n ? versements(resteDu, nombre, premiereLe, 1) : [];

	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			headerLeft={
				<span className="px-2 pb-1 text-cladd-xs font-semibold">Payer en plusieurs fois</span>
			}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				<div className="flex flex-col gap-cladd-xs">
					<ChiffreHero
						centimes={resteDu}
						surTitre={`Ce que ${client} doit encore`}
						legende="Sur les factures du dossier, hors pénalités"
					/>

					<section className="flex flex-col gap-cladd-3xs">
						<h3 className="px-1 text-cladd-xs font-semibold">En combien de fois</h3>
						<Segmented activeColor="neutral" activeVariant="solid" aria-label="En combien de fois">
							{NOMBRES.map((n) => (
								<SegmentedButton key={n} active={n === nombre} onClick={() => setNombre(n)}>
									{n} fois
								</SegmentedButton>
							))}
						</Segmented>
					</section>

					<section className="flex flex-col gap-cladd-3xs">
						<h3 className="px-1 text-cladd-xs font-semibold">Premier versement</h3>
						<Segmented activeColor="neutral" activeVariant="solid" aria-label="Premier versement">
							{(Object.keys(LIBELLE_DEPART) as Depart[]).map((d) => (
								<SegmentedButton key={d} active={d === depart} onClick={() => setDepart(d)}>
									{LIBELLE_DEPART[d]}
								</SegmentedButton>
							))}
						</Segmented>
						{depart === 'AUTRE' ? (
							<Input
								type="date"
								value={autre}
								onChange={setAutre}
								aria-label="Jour du premier versement"
							/>
						) : null}
					</section>

					{/* LE CALENDRIER QUI EN DÉCOULE — chaque versement, sa date, son montant. */}
					{calendrier.length === 0 ? (
						<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
							Choisissez un jour à venir pour le premier versement.
						</p>
					) : (
						<ol className="verre-carte flex flex-col rounded-cladd-xl px-3.5 py-1 [&>li+li]:border-t [&>li+li]:border-cladd-outline">
							{calendrier.map((versement, i) => (
								<li
									key={versement.numero}
									className="flex min-h-12 items-center justify-between gap-3 py-2"
								>
									<span className="flex flex-col">
										<span className="text-cladd-xs font-medium">{rang(i)}</span>
										<span className="text-cladd-2xs text-cladd-fg-soft">
											{dateCourte(versement.date)}
										</span>
									</span>
									<span className="text-cladd-xs font-semibold tabular-nums">
										{eurosCentimes(versement.montant)}
									</span>
								</li>
							))}
						</ol>
					)}

					{erreur === null ? null : <MessageErreur>{erreur}</MessageErreur>}

					<BoutonPrincipal
						pleineLargeur
						disabled={enCours || calendrier.length === 0}
						onClick={() => onConvenir({ nombre, premiereLe })}
					>
						{enCours ? 'Enregistrement…' : `Convenir du paiement en ${nombre} fois`}
					</BoutonPrincipal>

					<p className="px-1 text-center text-cladd-3xs leading-relaxed text-cladd-fg-softer">
						Tant que les versements arrivent, je ne relance pas {client}. Si l’un d’eux manque de
						plus de trois jours, les relances reprennent.
					</p>
					{onAccordEcrit === undefined ? null : (
						<BoutonTexte className="self-center" onClick={onAccordEcrit}>
							Préparer l’accord écrit, à lui faire signer
						</BoutonTexte>
					)}
				</div>
			</PopupContent>
		</Popup>
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
	onArreter
}: {
	readonly echeancier: EcheancierAffiche;
	readonly onArreter?: () => void;
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

			{onArreter === undefined || etat === 'TERMINE' ? null : (
				<BoutonTexte className="self-start" onClick={onArreter}>
					Arrêter l’échéancier
				</BoutonTexte>
			)}
		</section>
	);
}
