import type { ReactNode } from 'react';
import { ArrowUpRightIcon, CheckIcon, ChevronRightIcon } from 'lucide-react';
import { cn } from './cn';
import { eurosCentimes } from './format';

/**
 * LA SANTÉ D'UN CLIENT — les pièces de l'analyse du risque (13/10/2026).
 *
 * Relevé sur Mobbin : la jauge en demi-cercle et son mot (Lloyds, Cleo, Rocket
 * Money), le bulletin par facteur (Rocket Money, « Credit Report Card »), les
 * faits en cartes avec leur poids (Credit Karma, « Things you're doing well »),
 * l'historique de l'indice (One), et l'anneau d'avancement d'une liste de tâches
 * (Walmart+, « 2 activities to go »).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ À L'ENCRE, JAMAIS AUX COULEURS DE SEUIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Toutes les applications relevées peignent leur jauge du rouge au vert. Ici, le
 * vert, l'ambre et le rouge ne disent qu'une chose — au-dessus du seuil, tout
 * près, en dessous — et la gravité se dit par un POINT, comme partout dans le
 * produit. La jauge se remplit d'encre ; les niveaux se lisent en mots ; les
 * parts du portefeuille sont des nuances de la même encre, de la plus claire (rien
 * à signaler) à la plus dense (procédure).
 *
 * ⚠️ `src/ui` NE CONNAÎT PAS CONVEX : les formes ci-dessous recopient celles de
 * `convex/risque/validateurs.ts`, et la route les passe telles quelles.
 */

export type NiveauDeSante =
	| 'RIEN_A_SIGNALER'
	| 'A_SURVEILLER'
	| 'PRUDENCE'
	| 'RISQUE_ELEVE'
	| 'PROCEDURE'
	| 'FERMEE';

export const MOT_DE_SANTE: Readonly<Record<NiveauDeSante, string>> = {
	RIEN_A_SIGNALER: 'Rien à signaler',
	A_SURVEILLER: 'À surveiller',
	PRUDENCE: 'Prudence',
	RISQUE_ELEVE: 'Risque élevé',
	PROCEDURE: 'Procédure en cours',
	FERMEE: 'Entreprise fermée'
};

/** Le point « à regarder », à partir de « prudence » : la convention de tout le produit. */
export function meriteUnRegard(niveau: NiveauDeSante): boolean {
	return niveau !== 'RIEN_A_SIGNALER' && niveau !== 'A_SURVEILLER';
}

export type PilierDeSante = 'REGISTRE' | 'FINANCES' | 'TRANSPARENCE' | 'DIRIGEANTS' | 'PAIEMENTS';

export const NOM_DU_PILIER: Readonly<Record<PilierDeSante, string>> = {
	REGISTRE: 'Registre',
	FINANCES: 'Finances',
	TRANSPARENCE: 'Transparence',
	DIRIGEANTS: 'Dirigeants',
	PAIEMENTS: 'Vos paiements'
};

export interface FaitDeSante {
	readonly cle: string;
	readonly pilier: PilierDeSante;
	readonly titre: string;
	readonly court: string;
	readonly detail?: string;
	readonly effet: number;
	readonly poids: 'FORT' | 'MOYEN' | 'FAIBLE' | 'INFORMATIF';
	readonly source: {
		readonly nom: string;
		readonly date?: string;
		readonly url?: string;
		readonly article?: string;
	};
}

export interface EtatDuPilierAffiche {
	readonly pilier: PilierDeSante;
	readonly traits: number;
	readonly resume: string;
	readonly connu: boolean;
}

export interface DirigeantDeSante {
	readonly nomComplet: string;
	readonly qualites: readonly string[];
	readonly depuis?: string;
	readonly rapprochement:
		| 'IDENTIFIE'
		| 'HOMONYMES'
		| 'SANS_NAISSANCE'
		| 'NON_TROUVE'
		| 'PERSONNE_MORALE'
		| 'NON_LU';
	readonly societesTotal?: number;
	readonly societesActives: number;
	readonly societes: readonly {
		readonly siren: string;
		readonly denomination: string;
		readonly enActivite: boolean;
	}[];
	readonly procedures: readonly {
		readonly siren: string;
		readonly denomination: string;
		readonly dateParution: string;
		readonly nature: string;
		readonly url: string;
	}[];
}

export interface ExerciceDeSante {
	readonly annee: number;
	readonly chiffreAffaires?: bigint;
	readonly resultat?: bigint;
	readonly tresorerie?: bigint;
	readonly delaiFournisseursJours?: number;
}

const MOIS_COURTS = [
	'janv.',
	'févr.',
	'mars',
	'avr.',
	'mai',
	'juin',
	'juil.',
	'août',
	'sept.',
	'oct.',
	'nov.',
	'déc.'
];

/** « 13 oct. 2026 », depuis `AAAA-MM-JJ`. */
export function dateCourteDeSante(iso: string): string {
	const [annee, mois, jour] = iso.slice(0, 10).split('-').map(Number);
	if (annee === undefined || mois === undefined || jour === undefined) return iso;
	return `${jour} ${MOIS_COURTS[mois - 1] ?? ''} ${annee}`;
}

/** « mars 2026 ». */
function moisLisible(iso: string): string {
	const mois = [
		'janvier',
		'février',
		'mars',
		'avril',
		'mai',
		'juin',
		'juillet',
		'août',
		'septembre',
		'octobre',
		'novembre',
		'décembre'
	];
	return `${mois[Number(iso.slice(5, 7)) - 1] ?? ''} ${iso.slice(0, 4)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// LA JAUGE
// ═══════════════════════════════════════════════════════════════════════════

/** Les bornes des niveaux, posées en repères sur l'arc : 30, 50, 70. */
const REPERES = [30, 50, 70];

/**
 * LA JAUGE EN DEMI-CERCLE : l'arc se remplit d'encre jusqu'à l'indice (une seule
 * fois, à l'arrivée, rien sous `prefers-reduced-motion`), les repères marquent les
 * bornes des niveaux, et le centre porte l'indice puis son mot.
 */
export function JaugeDeSante({
	indice,
	niveau,
	petite = false,
	sousTitre
}: {
	readonly indice: number | null;
	readonly niveau: NiveauDeSante | null;
	readonly petite?: boolean;
	/** Sous le mot : « analysé le 13 oct. 2026 ». */
	readonly sousTitre?: ReactNode;
}) {
	const rempli = indice === null ? 0 : Math.max(0, Math.min(100, indice));
	// Un arc de 180° sur un cercle de rayon 40 : sa longueur est normalisée à 100.
	const arc = 'M 10 50 A 40 40 0 0 1 90 50';
	if (petite) {
		return (
			<span
				className="relative flex size-10 shrink-0 items-end justify-center"
				role="img"
				aria-label={indice === null ? 'Non analysée' : `Indice ${indice} sur 100`}
			>
				<svg viewBox="0 0 100 56" className="absolute inset-x-0 top-1 w-full" aria-hidden>
					<path
						d={arc}
						pathLength={100}
						className="fill-none stroke-cladd-fg/12"
						strokeWidth={12}
						strokeLinecap="round"
					/>
					{indice === null ? null : (
						<path
							d={arc}
							pathLength={100}
							className="jauge-remplie fill-none stroke-cladd-fg"
							strokeWidth={12}
							strokeLinecap="round"
							strokeDasharray={100}
							strokeDashoffset={100 - rempli}
						/>
					)}
				</svg>
				<span className="relative text-cladd-3xs leading-none font-semibold tabular-nums">
					{indice ?? '–'}
				</span>
			</span>
		);
	}
	return (
		<div className="flex flex-col items-center gap-1 text-center">
			<div className="relative w-full max-w-64">
				<svg viewBox="0 0 100 56" className="w-full" aria-hidden>
					<path
						d={arc}
						pathLength={100}
						className="fill-none stroke-cladd-fg/10"
						strokeWidth={7}
						strokeLinecap="round"
					/>
					{indice === null ? null : (
						<path
							d={arc}
							pathLength={100}
							className="jauge-remplie fill-none stroke-cladd-fg"
							strokeWidth={7}
							strokeLinecap="round"
							strokeDasharray={100}
							strokeDashoffset={100 - rempli}
						/>
					)}
					{REPERES.map((repere) => {
						const angle = Math.PI * (1 - repere / 100);
						const x1 = 50 + Math.cos(angle) * 31;
						const y1 = 50 - Math.sin(angle) * 31;
						const x2 = 50 + Math.cos(angle) * 34.5;
						const y2 = 50 - Math.sin(angle) * 34.5;
						return (
							<line
								key={repere}
								x1={x1}
								y1={y1}
								x2={x2}
								y2={y2}
								className="stroke-cladd-fg/30"
								strokeWidth={0.8}
								strokeLinecap="round"
							/>
						);
					})}
				</svg>
				<div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
					<span className="font-serif text-letikette-hero leading-none font-medium tabular-nums">
						{indice ?? '–'}
					</span>
					<span className="text-cladd-3xs text-cladd-fg-softer">sur 100</span>
				</div>
			</div>
			<p className="flex items-center gap-1.5 text-cladd-sm font-semibold">
				{niveau !== null && meriteUnRegard(niveau) ? (
					<span aria-hidden className="size-2 rounded-full bg-cladd-fg" />
				) : null}
				{niveau === null ? 'Non analysée' : MOT_DE_SANTE[niveau]}
			</p>
			{sousTitre === undefined ? null : (
				<div className="text-cladd-2xs text-cladd-fg-soft">{sousTitre}</div>
			)}
		</div>
	);
}

/** Ce que l'indice a fait depuis la dernière analyse : « 8 de moins depuis le 12 sept. ». */
export function EcartDeSante({
	avant,
	apres,
	depuis
}: {
	readonly avant: number;
	readonly apres: number;
	readonly depuis?: string;
}) {
	const ecart = apres - avant;
	if (ecart === 0) return <span>Stable depuis la dernière analyse</span>;
	return (
		<span className="inline-flex items-center gap-1 rounded-full bg-cladd-fg/8 px-2 py-0.5 text-cladd-3xs font-medium">
			{ecart > 0 ? '▲' : '▼'} {Math.abs(ecart)} {ecart > 0 ? 'de plus' : 'de moins'}
			{depuis === undefined ? '' : ` depuis le ${dateCourteDeSante(depuis)}`}
		</span>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// LE BULLETIN
// ═══════════════════════════════════════════════════════════════════════════

/** Cinq traits : pleins pour ce qui va, vides pour ce qui manque, en pointillé sans donnée. */
export function TraitsDePilier({
	traits,
	connu
}: {
	readonly traits: number;
	readonly connu: boolean;
}) {
	return (
		<span
			className="flex shrink-0 gap-0.5"
			role="img"
			aria-label={connu ? `${traits} sur 5` : 'Pas de donnée'}
		>
			{Array.from({ length: 5 }, (_, i) => (
				<span
					key={i}
					className={cn(
						'h-3 w-1.5 rounded-full',
						!connu
							? 'border border-dashed border-cladd-fg/25'
							: i < traits
								? 'bg-cladd-fg'
								: 'bg-cladd-fg/12'
					)}
				/>
			))}
		</span>
	);
}

/** LE BULLETIN : un pilier par ligne, son fait le plus parlant, ses traits. */
export function BulletinDeSante({ piliers }: { readonly piliers: readonly EtatDuPilierAffiche[] }) {
	return (
		<div className="verre-carte flex flex-col divide-y divide-cladd-fg/8 rounded-cladd-xl">
			{piliers.map((p) => (
				<div key={p.pilier} className="flex min-h-13 items-center gap-3 px-3.5 py-2.5">
					<span className="flex min-w-0 flex-1 flex-col gap-0.5">
						<span className="text-cladd-xs font-semibold">{NOM_DU_PILIER[p.pilier]}</span>
						<span
							className={cn(
								'truncate text-cladd-2xs',
								p.connu ? 'text-cladd-fg-soft' : 'text-cladd-fg-softer'
							)}
						>
							{p.resume}
						</span>
					</span>
					<TraitsDePilier traits={p.traits} connu={p.connu} />
				</div>
			))}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// LES FAITS
// ═══════════════════════════════════════════════════════════════════════════

const MOT_DU_POIDS: Readonly<Record<FaitDeSante['poids'], string>> = {
	FORT: 'Poids fort',
	MOYEN: 'Poids moyen',
	FAIBLE: 'Poids faible',
	INFORMATIF: 'Pour information'
};

/** UN FAIT, EN CARTE : son pilier, son poids et son effet, la phrase, le détail, la source. */
export function CarteDeFait({ fait }: { readonly fait: FaitDeSante }) {
	return (
		<article className="verre-carte flex flex-col gap-1.5 rounded-cladd-xl p-3.5">
			<div className="flex items-center justify-between gap-2">
				<span className="text-cladd-3xs font-medium tracking-wide text-cladd-fg-soft uppercase">
					{NOM_DU_PILIER[fait.pilier]}
				</span>
				<span className="flex items-center gap-1.5">
					<span className="rounded-full bg-cladd-fg/8 px-2 py-0.5 text-cladd-3xs font-medium">
						{MOT_DU_POIDS[fait.poids]}
					</span>
					{fait.effet === 0 ? null : (
						<span
							className="text-cladd-2xs font-semibold tabular-nums"
							aria-label={`${fait.effet > 0 ? 'Ajoute' : 'Retire'} ${Math.abs(fait.effet)} points à l’indice`}
						>
							{fait.effet > 0 ? `+${fait.effet}` : `−${Math.abs(fait.effet)}`}
						</span>
					)}
				</span>
			</div>
			<h3 className="text-cladd-xs leading-snug font-semibold">{fait.titre}</h3>
			{fait.detail === undefined ? null : (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">{fait.detail}</p>
			)}
			<p className="text-cladd-3xs leading-relaxed text-cladd-fg-softer">
				{fait.source.nom}
				{fait.source.date === undefined
					? ''
					: ` · relevé le ${dateCourteDeSante(fait.source.date)}`}
				{fait.source.article === undefined ? '' : ` · ${fait.source.article}`}
			</p>
		</article>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// LES DIRIGEANTS
// ═══════════════════════════════════════════════════════════════════════════

const RAPPROCHEMENT_EN_CLAIR: Readonly<
	Record<Exclude<DirigeantDeSante['rapprochement'], 'IDENTIFIE'>, string>
> = {
	HOMONYMES: 'Plusieurs homonymes la dirigent : ses autres sociétés ne sont pas lues.',
	SANS_NAISSANCE: 'Sa date de naissance n’est pas publiée : ses autres sociétés ne sont pas lues.',
	NON_TROUVE: 'Ses autres mandats ne se retrouvent pas avec certitude : rien ne lui est attribué.',
	PERSONNE_MORALE: 'Une société : elle se lit à sa propre fiche.',
	NON_LU: 'Ses autres sociétés n’ont pas été lues à cette analyse.'
};

/** UN DIRIGEANT : qui, depuis quand, combien de sociétés, et leurs procédures, chacune à la source. */
export function CarteDirigeant({ dirigeant }: { readonly dirigeant: DirigeantDeSante }) {
	const qualite = dirigeant.qualites[0];
	return (
		<article className="verre-carte flex flex-col gap-2 rounded-cladd-xl p-3.5">
			<div className="flex flex-col gap-0.5">
				<h3 className="text-cladd-xs font-semibold">{dirigeant.nomComplet}</h3>
				<p className="text-cladd-2xs text-cladd-fg-soft">
					{[
						qualite,
						dirigeant.depuis === undefined ? null : `depuis ${moisLisible(dirigeant.depuis)}`
					]
						.filter(Boolean)
						.join(' · ')}
				</p>
			</div>
			{dirigeant.rapprochement === 'IDENTIFIE' ? (
				<>
					<p className="text-cladd-2xs leading-snug">
						{dirigeant.societes.length === 0
							? 'Aucune autre société à son nom.'
							: `${dirigeant.societesTotal === undefined ? dirigeant.societes.length : dirigeant.societesTotal - 1} autre${(dirigeant.societesTotal ?? dirigeant.societes.length + 1) - 1 > 1 ? 's' : ''} société${(dirigeant.societesTotal ?? dirigeant.societes.length + 1) - 1 > 1 ? 's' : ''}, dont ${dirigeant.societesActives} en activité.`}{' '}
						{dirigeant.procedures.length === 0
							? 'Aucune procédure collective relevée parmi elles.'
							: ''}
					</p>
					{dirigeant.procedures.length === 0 ? null : (
						<ul className="flex flex-col gap-1.5">
							{dirigeant.procedures.map((p) => (
								<li key={`${p.siren}-${p.dateParution}`}>
									<a
										href={p.url}
										target="_blank"
										rel="noreferrer noopener"
										className="flex items-start gap-2 rounded-cladd-md bg-cladd-fg/5 px-2.5 py-2 text-cladd-2xs leading-snug hover:bg-cladd-fg/8"
									>
										<span className="flex min-w-0 flex-1 flex-col gap-0.5">
											<span className="font-semibold">{p.denomination}</span>
											<span className="text-cladd-fg-soft">
												{p.nature} · {dateCourteDeSante(p.dateParution)}
											</span>
										</span>
										<ArrowUpRightIcon
											aria-hidden
											className="mt-0.5 size-3.5 shrink-0 text-cladd-fg-soft"
										/>
										<span className="sr-only">
											Lire l’annonce au journal officiel des entreprises
										</span>
									</a>
								</li>
							))}
						</ul>
					)}
				</>
			) : (
				<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
					{RAPPROCHEMENT_EN_CLAIR[dirigeant.rapprochement]}
				</p>
			)}
		</article>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// SES COMPTES
// ═══════════════════════════════════════════════════════════════════════════

/** Des euros ronds, compacts : « 420 k€ », « 1,2 M€ ». */
function eurosCompacts(centimes: bigint): string {
	const euros = Number(centimes / 100n);
	const absolu = Math.abs(euros);
	const signe = euros < 0 ? '−' : '';
	if (absolu >= 1_000_000) return `${signe}${(absolu / 1_000_000).toFixed(1).replace('.', ',')} M€`;
	if (absolu >= 1_000) return `${signe}${Math.round(absolu / 1_000)} k€`;
	return `${signe}${absolu} €`;
}

/**
 * SES COMPTES EN BARRES : le chiffre d'affaires de chaque exercice (la hauteur),
 * son résultat dessous. Les barres sont toutes à l'encre ; une perte se lit à son
 * signe, pas à une couleur.
 */
export function ComptesEnBarres({ exercices }: { readonly exercices: readonly ExerciceDeSante[] }) {
	const dans = [...exercices].sort((a, b) => a.annee - b.annee);
	const max = dans.reduce(
		(m, e) => (e.chiffreAffaires !== undefined && e.chiffreAffaires > m ? e.chiffreAffaires : m),
		0n
	);
	const dernier = dans[dans.length - 1];
	return (
		<div className="verre-carte flex flex-col gap-3 rounded-cladd-xl p-3.5">
			<div className="flex h-28 items-end gap-3">
				{dans.map((e) => {
					const hauteur =
						e.chiffreAffaires === undefined || max === 0n
							? 0
							: Number((e.chiffreAffaires * 100n) / max);
					return (
						<div key={e.annee} className="flex flex-1 flex-col items-center gap-1">
							<span className="text-cladd-3xs font-medium tabular-nums">
								{e.chiffreAffaires === undefined ? '–' : eurosCompacts(e.chiffreAffaires)}
							</span>
							<div className="flex h-20 w-full items-end">
								<div
									className={cn(
										'w-full rounded-t-md',
										e.chiffreAffaires === undefined
											? 'border border-dashed border-cladd-fg/25'
											: 'bg-cladd-fg/80'
									)}
									style={{
										height: `${Math.max(e.chiffreAffaires === undefined ? 100 : 4, hauteur)}%`
									}}
								/>
							</div>
						</div>
					);
				})}
			</div>
			<div className="flex gap-3">
				{dans.map((e) => (
					<div key={e.annee} className="flex flex-1 flex-col items-center gap-0.5 text-center">
						<span className="text-cladd-2xs font-semibold tabular-nums">{e.annee}</span>
						<span className="text-cladd-3xs text-cladd-fg-soft tabular-nums">
							{e.resultat === undefined
								? 'résultat non publié'
								: `résultat ${eurosCompacts(e.resultat)}`}
						</span>
					</div>
				))}
			</div>
			{dernier === undefined ? null : (
				<p className="border-t border-cladd-fg/8 pt-2 text-cladd-2xs leading-snug text-cladd-fg-soft">
					{[
						dernier.tresorerie === undefined
							? null
							: `Trésorerie ${dernier.annee} : ${eurosCentimes(dernier.tresorerie)}`,
						dernier.delaiFournisseursJours === undefined
							? null
							: `il paie ses fournisseurs à ${Math.round(dernier.delaiFournisseursJours)} jours`
					]
						.filter(Boolean)
						.join(' · ') || 'Chiffre d’affaires publié, sans le détail de sa trésorerie.'}
				</p>
			)}
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// L'EXPOSITION ET L'HISTORIQUE
// ═══════════════════════════════════════════════════════════════════════════

/** CE QU'IL VOUS DOIT, FACE À VOTRE PLAFOND : une barre, et ce qu'elle dit en mots. */
export function BarreDExposition({
	encours,
	plafond
}: {
	readonly encours: bigint;
	readonly plafond: bigint | null;
}) {
	if (plafond === null) {
		return (
			<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
				{encours > 0n
					? `Il vous doit ${eurosCentimes(encours)}. `
					: 'Il ne vous doit rien aujourd’hui. '}
				Aucun plafond fixé : au-delà d’un plafond, il remonterait dans « La santé de vos clients ».
			</p>
		);
	}
	const part = plafond === 0n ? 100 : Math.min(100, Number((encours * 100n) / plafond));
	const depasse = encours > plafond;
	return (
		<div className="flex flex-col gap-1.5">
			<div
				className="h-2 overflow-hidden rounded-full bg-cladd-fg/10"
				role="progressbar"
				aria-valuemin={0}
				aria-valuemax={100}
				aria-valuenow={part}
				aria-label="Ce qu’il vous doit, rapporté à votre plafond"
			>
				<div
					className="h-full rounded-full bg-cladd-fg transition-[width] duration-700"
					style={{ width: `${part}%` }}
				/>
			</div>
			<p className="flex items-center gap-1.5 text-cladd-2xs leading-snug">
				{depasse ? <span aria-hidden className="size-2 shrink-0 rounded-full bg-cladd-fg" /> : null}
				<span className={depasse ? 'font-semibold' : 'text-cladd-fg-soft'}>
					{eurosCentimes(encours)} sur un plafond de {eurosCentimes(plafond)}
					{depasse ? ' : au-dessus' : ''}
				</span>
			</p>
		</div>
	);
}

/** L'INDICE AU FIL DES ANALYSES : une ligne d'encre, un point par analyse. */
export function HistoriqueDeSante({
	historique
}: {
	readonly historique: readonly { readonly le: number; readonly indice: number }[];
}) {
	if (historique.length < 2) return null;
	const largeur = 100;
	const pas = largeur / (historique.length - 1);
	const points = historique.map(
		(h, i) => `${(i * pas).toFixed(2)},${(40 - (h.indice / 100) * 36 - 2).toFixed(2)}`
	);
	const premier = historique[0]!;
	const dernier = historique[historique.length - 1]!;
	return (
		<div className="flex flex-col gap-1">
			<svg viewBox="0 0 100 40" className="h-12 w-full" preserveAspectRatio="none" aria-hidden>
				<polyline
					points={points.join(' ')}
					className="fill-none stroke-cladd-fg"
					strokeWidth={1.2}
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
			<p className="flex justify-between text-cladd-3xs text-cladd-fg-softer tabular-nums">
				<span>
					{dateCourteDeSante(new Date(premier.le).toISOString())} · {premier.indice}
				</span>
				<span>
					{dateCourteDeSante(new Date(dernier.le).toISOString())} · {dernier.indice}
				</span>
			</p>
		</div>
	);
}

// ═══════════════════════════════════════════════════════════════════════════
// LE PORTEFEUILLE
// ═══════════════════════════════════════════════════════════════════════════

export type TrancheDeSante = NiveauDeSante | 'NON_ANALYSE';

/** La nuance d'encre d'une part : de la plus claire (rien à signaler) à la plus dense. */
const NUANCE: Readonly<Record<TrancheDeSante, string>> = {
	RIEN_A_SIGNALER: 'bg-cladd-fg/20',
	A_SURVEILLER: 'bg-cladd-fg/40',
	PRUDENCE: 'bg-cladd-fg/60',
	RISQUE_ELEVE: 'bg-cladd-fg/80',
	PROCEDURE: 'bg-cladd-fg',
	FERMEE: 'bg-cladd-fg',
	NON_ANALYSE: 'bg-cladd-fg/5 border border-dashed border-cladd-fg/25'
};

const MOT_DE_TRANCHE: Readonly<Record<TrancheDeSante, string>> = {
	...MOT_DE_SANTE,
	NON_ANALYSE: 'Non analysé'
};

/** OÙ EST L'ARGENT DEHORS : une barre en parts, et la légende de chaque part. */
export function RepartitionDeSante({
	parts
}: {
	readonly parts: readonly {
		readonly tranche: TrancheDeSante;
		readonly encours: bigint;
		readonly clients: number;
	}[];
}) {
	const total = parts.reduce((t, p) => t + p.encours, 0n);
	if (total === 0n) return null;
	return (
		<div className="flex flex-col gap-2.5">
			<div
				className="flex h-3 gap-0.5 overflow-hidden rounded-full"
				role="img"
				aria-label="Répartition de ce qu’on vous doit, par niveau"
			>
				{parts.map((p) => (
					<span
						key={p.tranche}
						className={cn('h-full first:rounded-l-full last:rounded-r-full', NUANCE[p.tranche])}
						style={{ width: `${Math.max(2, Number((p.encours * 1000n) / total) / 10)}%` }}
					/>
				))}
			</div>
			<ul className="grid grid-cols-1 gap-1.5 min-[420px]:grid-cols-2">
				{parts.map((p) => (
					<li key={p.tranche} className="flex items-center gap-2 text-cladd-2xs">
						<span aria-hidden className={cn('size-2.5 shrink-0 rounded-sm', NUANCE[p.tranche])} />
						<span className="min-w-0 flex-1 truncate">{MOT_DE_TRANCHE[p.tranche]}</span>
						<span className="shrink-0 font-semibold tabular-nums">{eurosCentimes(p.encours)}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

/** L'ANNEAU D'AVANCEMENT des missions : la couverture du portefeuille, en pour cent. */
export function AnneauDeCouverture({ pourcentage }: { readonly pourcentage: number }) {
	const rempli = Math.max(0, Math.min(100, pourcentage));
	return (
		<span
			className="relative flex size-16 shrink-0 items-center justify-center"
			role="img"
			aria-label={`Couvert à ${rempli} %`}
		>
			<svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90" aria-hidden>
				<circle
					cx="18"
					cy="18"
					r="15.9155"
					className="fill-none stroke-cladd-fg/10"
					strokeWidth={3.2}
				/>
				<circle
					cx="18"
					cy="18"
					r="15.9155"
					pathLength={100}
					className="jauge-remplie fill-none stroke-cladd-fg"
					strokeWidth={3.2}
					strokeLinecap="round"
					strokeDasharray={100}
					strokeDashoffset={100 - rempli}
				/>
			</svg>
			<span className="text-cladd-xs font-semibold tabular-nums">{rempli} %</span>
		</span>
	);
}

export interface MissionAffichee {
	readonly cle: string;
	readonly titre: string;
	readonly detail: string;
	readonly faits: number;
	readonly total: number;
	/** Ce qui fait avancer la mission : un lien, un geste. Absent quand elle est faite. */
	readonly geste?: { readonly libelle: string; readonly onClick: () => void };
}

/** LES MISSIONS : une coche quand c'est fait, sinon où on en est et le geste qui avance. */
export function ListeDeMissions({ missions }: { readonly missions: readonly MissionAffichee[] }) {
	return (
		<ul className="flex flex-col divide-y divide-cladd-fg/8">
			{missions.map((m) => {
				const faite = m.total === 0 || m.faits >= m.total;
				return (
					<li key={m.cle} className="flex items-start gap-3 py-2.5 first:pt-0 last:pb-0">
						<span
							aria-hidden
							className={cn(
								'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full',
								faite ? 'bg-cladd-fg text-cladd-bg' : 'border-2 border-cladd-fg/25'
							)}
						>
							{faite ? <CheckIcon className="size-3" strokeWidth={3} /> : null}
						</span>
						<span className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="text-cladd-xs font-semibold">{m.titre}</span>
							<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">
								{m.total === 0 ? m.detail : `${m.faits} sur ${m.total}. ${m.detail}`}
							</span>
							{faite || m.geste === undefined ? null : (
								<button
									type="button"
									onClick={m.geste.onClick}
									className="mt-1 inline-flex w-fit cursor-pointer items-center gap-0.5 text-cladd-2xs font-semibold text-cladd-primary"
								>
									{m.geste.libelle}
									<ChevronRightIcon aria-hidden className="size-3.5" />
								</button>
							)}
						</span>
					</li>
				);
			})}
		</ul>
	);
}
