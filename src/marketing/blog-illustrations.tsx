import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import { PARAMETRES } from '../lib/verticales/recouvrement/parametres';
import {
	periodesDeTauxParDefaut,
	plancherContractuel,
	tauxInteretLegal
} from '../lib/verticales/recouvrement/pays/france/taux';
import { REGIMES_PRESCRIPTION } from '../lib/verticales/recouvrement/pays/france/prescription';
import { decompterFacture } from '../lib/verticales/recouvrement/decompte';
import { finDeDelai } from '../lib/verticales/recouvrement/delais';
import { ajouterMois } from '../lib/verticales/recouvrement/calendrier';
import { depuisCentimes } from '../lib/socle/montants';
import { eurosCentimes, eurosCentimesCourts, tauxLisible } from '../ui/format';
import { cn } from '../ui';
import { EcranProduit, type CaptureProduit } from './section';
import { dateLisible } from './blog';

/**
 * LES ILLUSTRATIONS DES ARTICLES DU BLOG (06/10/2026).
 *
 * Le fondateur : « des illustrations pour faciliter la lecture et la
 * compréhension ». Relevé sur Wise, OpenSea Learn, Vercel et Stripe : un
 * schéma par idée difficile, juste à côté du paragraphe qui l'explique, et
 * jamais une image décorative.
 *
 * ⚠️ AUCUN CHIFFRE N'EST DESSINÉ À LA MAIN. L'exemple de décompte est calculé
 * par le MOTEUR DU PRODUIT (`decompterFacture`), au taux relevé de chaque
 * semestre ; les délais viennent du module de prescription, les références de
 * la source de chaque paramètre. Un lecteur qui refait le calcul retombe sur le
 * même centime, et le jour où une valeur change, l'article change avec elle.
 */

// ─── Les références ──────────────────────────────────────────────────────────

const SOURCES_DES_REGIMES = {
	'prescription-general': REGIMES_PRESCRIPTION.GENERAL.source,
	'prescription-transport': REGIMES_PRESCRIPTION.TRANSPORT_MARCHANDISES.source,
	'prescription-consommateur': REGIMES_PRESCRIPTION.CONSOMMATEUR.source
} as const;

type CleSource = keyof typeof PARAMETRES | keyof typeof SOURCES_DES_REGIMES;

/**
 * La référence d'une règle, telle qu'elle a été relevée : « article L441-10 II
 * du code de commerce », « Cour de cassation, chambre commerciale, 18 mai
 * 2022 »… Jamais tapée dans l'article.
 */
export function Source({ de }: { de: CleSource }) {
	const brute =
		de in SOURCES_DES_REGIMES
			? SOURCES_DES_REGIMES[de as keyof typeof SOURCES_DES_REGIMES]
			: PARAMETRES[de as keyof typeof PARAMETRES].source;
	const minuscule = brute.startsWith('Article') ? `article${brute.slice('Article'.length)}` : brute;
	// L'article la cite entre parenthèses : « (R641-25 en liquidation) » s'y écrirait
	// en parenthèses imbriquées. La typographie française passe aux crochets.
	const texte = minuscule.replace(/\(([^()]+)\)/g, '[$1]');
	return <>{texte}</>;
}

/** Le plancher d'un taux de pénalités prévu au contrat, ce semestre : trois fois le taux légal. */
function plancherDuJour(): { plancher: string; legal: string } | null {
	try {
		const aujourdHui = new Date().toISOString().slice(0, 10);
		return {
			plancher: tauxLisible(plancherContractuel(aujourdHui)),
			legal: tauxLisible(tauxInteretLegal(aujourdHui).professionnels)
		};
	} catch {
		return null;
	}
}

export function PlancherContractuel() {
	const valeurs = plancherDuJour();
	return <>{valeurs === null ? 'trois fois le taux d’intérêt légal' : valeurs.plancher}</>;
}

export function TauxLegal() {
	const valeurs = plancherDuJour();
	return <>{valeurs === null ? 'le taux d’intérêt légal' : valeurs.legal}</>;
}

// ─── Le cadre commun ─────────────────────────────────────────────────────────

/** Une figure : le schéma, puis sa légende. */
function Figure({
	legende,
	children,
	className
}: {
	legende?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<figure className={cn('my-cladd-xs flex flex-col gap-cladd-3xs', className)}>
			{children}
			{legende === undefined ? null : (
				<figcaption className="text-cladd-sm leading-relaxed text-encre-site-claire">
					{legende}
				</figcaption>
			)}
		</figure>
	);
}

// ─── L'exemple de décompte ───────────────────────────────────────────────────

const LIBELLE_SEMESTRE = (date: string): string => {
	const [annee, mois] = date.split('-');
	return Number(mois) <= 6 ? `1er semestre ${annee}` : `2e semestre ${annee}`;
};

function calculerExemple(montantEuros: number, echeance: string, arrete: string) {
	try {
		const principal = depuisCentimes(BigInt(Math.round(montantEuros * 100)));
		const ligne = decompterFacture(
			{
				reference: 'exemple',
				montantExigible: principal,
				dateExigibilite: echeance,
				reglements: [],
				taux: periodesDeTauxParDefaut(echeance, arrete)
			},
			arrete,
			'ACT_365',
			'PENALITES_DABORD'
		);
		return { principal, ligne };
	} catch {
		return null;
	}
}

/**
 * Une facture impayée, décomptée par le moteur de Letikette : une ligne par
 * période de taux, avec sa formule, puis les frais et le total. La barre du
 * bas montre de quoi le total est fait.
 */
export function ExempleDecompte({
	montant = 12400,
	echeance = '2026-03-31',
	arrete = '2026-09-30'
}: {
	montant?: number;
	echeance?: string;
	arrete?: string;
}) {
	const exemple = calculerExemple(montant, echeance, arrete);
	if (exemple === null) return null;
	const { principal, ligne } = exemple;
	const total = Number(ligne.total);
	const parts = [
		{ nom: 'Montant de la facture', valeur: Number(principal), teinte: 'bg-encre-site' },
		{ nom: 'Pénalités de retard', valeur: Number(ligne.interets), teinte: 'bg-galet-argent' },
		{
			nom: 'Frais de recouvrement',
			valeur: Number(ligne.indemniteForfaitaire),
			teinte: 'bg-galet-abricot'
		}
	];

	return (
		<Figure
			legende={`Calculé par le moteur de Letikette, sur une base de 365 jours. Chaque ligne se refait à la calculatrice : montant × taux × jours ÷ 365. Les jours se comptent de l’échéance incluse à la date d’arrêté exclue : le même total que du lendemain de l’échéance à l’arrêté inclus.`}
		>
			<div className="overflow-hidden rounded-carte-site border border-filet-creme bg-papier">
				<div className="flex flex-col gap-1 border-b border-filet-creme bg-creme-profonde px-cladd-xs py-cladd-3xs">
					<span className="text-cladd-md font-semibold">
						Une facture de {eurosCentimesCourts(principal)}, échue le {dateCourteFr(echeance)}
					</span>
					<span className="text-cladd-sm text-encre-site-douce">
						Ce qu’elle vaut le {dateCourteFr(arrete)}, sans aucun paiement entre-temps.
					</span>
				</div>
				<ul className="flex flex-col">
					{ligne.segments.map((segment) => (
						<li
							key={segment.debut}
							className="flex flex-col gap-1 border-b border-filet-creme px-cladd-xs py-cladd-3xs sm:flex-row sm:items-baseline sm:justify-between sm:gap-cladd-xs"
						>
							<span className="flex flex-col">
								<span className="text-cladd-md font-medium">
									Pénalités, {LIBELLE_SEMESTRE(segment.debut)}
								</span>
								<span className="text-cladd-sm text-encre-site-douce tabular-nums">
									{eurosCentimes(segment.principal)} × {tauxLisible(segment.taux)} × {segment.jours}{' '}
									j ÷ {segment.baseAnnuelle}
								</span>
							</span>
							<span className="text-cladd-md font-semibold whitespace-nowrap tabular-nums">
								{eurosCentimes(segment.interets)}
							</span>
						</li>
					))}
					<li className="flex items-baseline justify-between gap-cladd-xs border-b border-filet-creme px-cladd-xs py-cladd-3xs">
						<span className="text-cladd-md font-medium">
							Frais de recouvrement, forfait par facture
						</span>
						<span className="text-cladd-md font-semibold whitespace-nowrap tabular-nums">
							{eurosCentimes(ligne.indemniteForfaitaire)}
						</span>
					</li>
					<li className="flex items-baseline justify-between gap-cladd-xs px-cladd-xs py-cladd-xs">
						<span className="text-intertitre font-semibold">
							Total dû au {dateCourteFr(arrete)}
						</span>
						<span className="font-serif text-titre-section leading-none font-medium whitespace-nowrap tabular-nums">
							{eurosCentimes(ligne.total)}
						</span>
					</li>
				</ul>
			</div>

			{/* DE QUOI LE TOTAL EST FAIT, en une barre. */}
			<div className="flex flex-col gap-cladd-3xs pt-cladd-3xs">
				<div className="flex h-3 w-full overflow-hidden rounded-full" aria-hidden>
					{parts.map((part) => (
						<span
							key={part.nom}
							className={part.teinte}
							style={{ width: `${Math.max(1, (part.valeur / total) * 100)}%` }}
						/>
					))}
				</div>
				<ul className="flex flex-wrap gap-x-cladd-xs gap-y-1 text-cladd-sm text-encre-site-douce">
					{parts.map((part) => (
						<li key={part.nom} className="flex items-center gap-1.5">
							<span aria-hidden className={cn('size-2.5 rounded-full', part.teinte)} />
							{part.nom}
						</li>
					))}
				</ul>
			</div>
		</Figure>
	);
}

const dateCourteFr = dateLisible;

// ─── Les délais par secteur ──────────────────────────────────────────────────

/** Les délais pour agir en justice, en barres de même échelle. */
export function DelaisParSecteur() {
	const regimes = [
		{ nom: 'Entre professionnels, en général', regime: REGIMES_PRESCRIPTION.GENERAL },
		{ nom: 'Vente à un particulier', regime: REGIMES_PRESCRIPTION.CONSOMMATEUR },
		{ nom: 'Transport de marchandises', regime: REGIMES_PRESCRIPTION.TRANSPORT_MARCHANDISES }
	];
	const max = Math.max(...regimes.map((r) => r.regime.dureeAnnees));
	return (
		<Figure legende="Le délai court à partir de son point de départ, qui n’est pas le même selon le cas.">
			<ul className="flex flex-col gap-cladd-xs rounded-carte-site border border-filet-creme bg-papier p-cladd-xs">
				{regimes.map(({ nom, regime }) => (
					<li key={nom} className="flex flex-col gap-1.5">
						<span className="flex items-baseline justify-between gap-cladd-xs">
							<span className="text-cladd-md font-medium">{nom}</span>
							<span className="font-serif text-intertitre font-medium whitespace-nowrap tabular-nums">
								{regime.dureeAnnees} {regime.dureeAnnees > 1 ? 'ans' : 'an'}
							</span>
						</span>
						<span
							className="h-2.5 w-full overflow-hidden rounded-full bg-creme-profonde"
							aria-hidden
						>
							<span
								className="block h-full rounded-full bg-galet-temps"
								style={{ width: `${(regime.dureeAnnees / max) * 100}%` }}
							/>
						</span>
					</li>
				))}
			</ul>
		</Figure>
	);
}

// ─── Les frais de recouvrement, facture par facture ──────────────────────────

/** Une indemnité par facture en retard : le compteur le fait voir. */
export function CompteurIndemnites({ factures = 6 }: { factures?: number }) {
	const indemnite = PARAMETRES.indemniteForfaitaire.valeur;
	if (indemnite === null) return null;
	const total = indemnite * BigInt(factures);
	return (
		<Figure legende="Un même client, plusieurs factures payées en retard : des frais de recouvrement pour chacune.">
			<div className="flex flex-col gap-cladd-xs rounded-carte-site border border-filet-creme bg-papier p-cladd-xs">
				<ul className="grid grid-cols-3 gap-cladd-3xs sm:grid-cols-6">
					{Array.from({ length: factures }, (_, rang) => (
						<li
							key={rang}
							className="flex flex-col items-center gap-1 rounded-cladd-lg bg-teinte-papiers px-1 py-cladd-3xs"
						>
							<span className="text-cladd-xs text-encre-site-douce tabular-nums">
								Facture {String(rang + 1).padStart(2, '0')}
							</span>
							<span className="text-cladd-md font-semibold tabular-nums">
								+ {eurosCentimesCourts(depuisCentimes(indemnite))}
							</span>
						</li>
					))}
				</ul>
				<p className="flex items-baseline justify-between gap-cladd-xs border-t border-filet-creme pt-cladd-3xs">
					<span className="text-cladd-md text-encre-site-douce">
						{factures} factures × {eurosCentimesCourts(depuisCentimes(indemnite))}
					</span>
					<span className="font-serif text-titre-section leading-none font-medium tabular-nums">
						{eurosCentimesCourts(depuisCentimes(total))}
					</span>
				</p>
			</div>
		</Figure>
	);
}

// ─── Les étapes ──────────────────────────────────────────────────────────────

/** Une suite d'étapes numérotées, reliées par un filet. Le numéro est donné ici, dans l'ordre. */
export function Etapes({ children }: { children: ReactNode }) {
	const etapes = Children.toArray(children).filter(isValidElement);
	return (
		<ol className="my-cladd-xs flex flex-col">
			{etapes.map((enfant, rang) =>
				cloneElement(enfant as ReactElement<{ numero?: number }>, { numero: rang + 1 })
			)}
		</ol>
	);
}

export function Etape({
	titre,
	quand,
	numero,
	children
}: {
	titre: string;
	quand?: ReactNode;
	numero?: number;
	children: ReactNode;
}) {
	return (
		<li className="relative flex gap-cladd-xs pb-cladd-sm last:pb-0">
			<span
				aria-hidden
				className="flex size-9 shrink-0 items-center justify-center rounded-full bg-encre-site text-cladd-sm font-semibold text-creme tabular-nums"
			>
				{numero}
			</span>
			<span aria-hidden className="absolute top-10 bottom-1 left-4 w-px bg-filet-creme" />
			<div className="flex flex-col gap-1 pt-1">
				<span className="flex flex-wrap items-baseline gap-x-cladd-3xs">
					<span className="text-intertitre leading-snug font-semibold">{titre}</span>
					{quand === undefined ? null : (
						<span className="text-cladd-sm text-encre-site-claire">{quand}</span>
					)}
				</span>
				<div className="flex flex-col gap-cladd-3xs text-cladd-md leading-relaxed text-encre-site-douce">
					{children}
				</div>
			</div>
		</li>
	);
}

// ─── Deux colonnes : ce qui compte, ce qui ne compte pas ─────────────────────

export function Comparaison({
	titreOui,
	oui,
	titreNon,
	non
}: {
	titreOui: string;
	oui: readonly string[];
	titreNon: string;
	non: readonly string[];
}) {
	return (
		<div className="my-cladd-xs grid gap-cladd-3xs sm:grid-cols-2">
			<div className="flex flex-col gap-cladd-3xs rounded-carte-site bg-teinte-argent p-cladd-xs">
				<span className="text-cladd-md font-semibold">{titreOui}</span>
				<ul className="flex flex-col gap-1.5">
					{oui.map((ligne) => (
						<li key={ligne} className="flex items-start gap-cladd-3xs text-cladd-md leading-snug">
							<CheckIcon aria-hidden size={16} className="mt-0.5 shrink-0" />
							{ligne}
						</li>
					))}
				</ul>
			</div>
			<div className="flex flex-col gap-cladd-3xs rounded-carte-site bg-teinte-question p-cladd-xs">
				<span className="text-cladd-md font-semibold">{titreNon}</span>
				<ul className="flex flex-col gap-1.5">
					{non.map((ligne) => (
						<li key={ligne} className="flex items-start gap-cladd-3xs text-cladd-md leading-snug">
							<XIcon aria-hidden size={16} className="mt-0.5 shrink-0" />
							{ligne}
						</li>
					))}
				</ul>
			</div>
		</div>
	);
}

// ─── Une capture du produit ──────────────────────────────────────────────────

export function Capture({ ecran, legende }: { ecran: CaptureProduit; legende: string }) {
	return (
		<Figure legende={legende}>
			<div className="flex h-96 justify-center overflow-hidden rounded-carte-site bg-teinte-argent px-cladd-xs pt-cladd-sm">
				<EcranProduit capture={ecran} description={legende} className="w-56 self-start" />
			</div>
		</Figure>
	);
}

// ─── Les valeurs d'un délai ou d'un seuil, lues sur le registre ──────────────

/** Les paramètres qui portent un délai ou un seuil chiffré. */
type CleValeur = {
	[K in keyof typeof PARAMETRES]: (typeof PARAMETRES)[K]['unite'] extends
		| 'jours'
		| 'mois'
		| 'annees'
		| 'centimes'
		? (typeof PARAMETRES)[K]['valeur'] extends number | bigint | null
			? K
			: never
		: (typeof PARAMETRES)[K]['valeur'] extends string
			? K
			: never;
}[keyof typeof PARAMETRES];

function valeurLisible(de: CleValeur): string | null {
	const parametre = PARAMETRES[de] as { valeur: unknown; unite: string };
	const { valeur, unite } = parametre;
	if (valeur === null || valeur === undefined) return null;
	if (unite === 'centimes' && typeof valeur === 'bigint')
		return eurosCentimesCourts(depuisCentimes(valeur));
	if (typeof valeur === 'number') {
		if (unite === 'jours') return `${valeur} jours`;
		if (unite === 'mois') return `${valeur} mois`;
		if (unite === 'annees') return `${valeur} ${valeur > 1 ? 'ans' : 'an'}`;
	}
	if (typeof valeur === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valeur)) return dateCourteFr(valeur);
	return null;
}

/**
 * Un délai, un seuil ou une date du registre, mis en mots : « 3 mois »,
 * « 15 jours », « 10 000 € », « 1 septembre 2026 ». Jamais tapé dans l'article.
 */
export function Valeur({ de }: { de: CleValeur }) {
	return <>{valeurLisible(de) ?? '[valeur non relevée]'}</>;
}

/** La durée d'un paramètre, en jours approximatifs : seulement pour dessiner des barres. */
function enJoursApprochants(de: CleValeur): number {
	const { valeur, unite } = PARAMETRES[de] as { valeur: unknown; unite: string };
	if (typeof valeur !== 'number') return 0;
	if (unite === 'mois') return valeur * 30;
	if (unite === 'annees') return valeur * 365;
	return valeur;
}

/** Plusieurs délais comparés, en barres de même échelle. */
export function BarresDeDelais({
	delais,
	legende
}: {
	delais: readonly { libelle: ReactNode; de: CleValeur }[];
	legende?: string;
}) {
	const max = Math.max(...delais.map((d) => enJoursApprochants(d.de)));
	if (max === 0) return null;
	return (
		<Figure legende={legende}>
			<ul className="flex flex-col gap-cladd-xs rounded-carte-site border border-filet-creme bg-papier p-cladd-xs">
				{delais.map((delai, rang) => (
					<li key={rang} className="flex flex-col gap-1.5">
						<span className="flex items-baseline justify-between gap-cladd-xs">
							<span className="text-cladd-md font-medium">{delai.libelle}</span>
							<span className="font-serif text-intertitre font-medium whitespace-nowrap tabular-nums">
								<Valeur de={delai.de} />
							</span>
						</span>
						<span
							className="h-2.5 w-full overflow-hidden rounded-full bg-creme-profonde"
							aria-hidden
						>
							<span
								className="block h-full rounded-full bg-galet-question"
								style={{ width: `${(enJoursApprochants(delai.de) / max) * 100}%` }}
							/>
						</span>
					</li>
				))}
			</ul>
		</Figure>
	);
}

// ─── Des dates d'exemple, calculées par le moteur des délais ─────────────────

function finDuDelai(depart: string, de: CleValeur): string | null {
	const { valeur, unite } = PARAMETRES[de] as { valeur: unknown; unite: string };
	if (typeof valeur !== 'number' || (unite !== 'jours' && unite !== 'mois' && unite !== 'annees'))
		return null;
	try {
		return finDeDelai(depart, { valeur, unite }, { reporterJourNonOuvrable: true }).fin;
	} catch {
		return null;
	}
}

/**
 * « Départ le 20 août 2026 : fin du délai le 22 février 2027. » La date de fin
 * est calculée par le moteur des délais du produit (même quantième, report au
 * jour ouvrable suivant), jamais écrite à la main.
 */
export function ExempleDelai({
	depart,
	de,
	libelleDepart,
	libelleFin
}: {
	depart: string;
	de: CleValeur;
	libelleDepart: string;
	libelleFin: string;
}) {
	const fin = finDuDelai(depart, de);
	if (fin === null) return null;
	return (
		<div className="my-cladd-xs grid gap-cladd-3xs rounded-carte-site border border-filet-creme bg-papier p-cladd-xs sm:grid-cols-2">
			<div className="flex flex-col gap-1">
				<span className="text-cladd-sm text-encre-site-douce">{libelleDepart}</span>
				<span className="font-serif text-intertitre font-medium tabular-nums">
					{dateCourteFr(depart)}
				</span>
			</div>
			<div className="flex flex-col gap-1 border-t border-filet-creme pt-cladd-3xs sm:border-t-0 sm:border-l sm:pt-0 sm:pl-cladd-xs">
				<span className="text-cladd-sm text-encre-site-douce">
					{libelleFin} (<Valeur de={de} /> plus tard)
				</span>
				<span className="font-serif text-intertitre font-medium tabular-nums">
					{dateCourteFr(fin)}
				</span>
			</div>
		</div>
	);
}

/**
 * L'injonction de payer : le délai de signification dépend de la DATE DE
 * L'ORDONNANCE, pas du jour. Deux ordonnances d'exemple, de part et d'autre de
 * la date de bascule, chacune avec la date limite que le moteur calcule.
 */
export function ExempleSignification({ avant, apres }: { avant: string; apres: string }) {
	const bascule = PARAMETRES.basculeDelaiSignificationInjonction.valeur;
	const lignes = [avant, apres].map((ordonnance) => {
		const de: CleValeur =
			ordonnance < bascule ? 'delaiSignificationInjonctionAncien' : 'delaiSignificationInjonction';
		return { ordonnance, de, fin: finDuDelai(ordonnance, de) };
	});
	if (lignes.some((l) => l.fin === null)) return null;
	return (
		<Figure legende="Dates calculées par le moteur des délais de Letikette, avec report au jour ouvrable suivant.">
			<ul className="flex flex-col rounded-carte-site border border-filet-creme bg-papier">
				{lignes.map((ligne) => (
					<li
						key={ligne.ordonnance}
						className="flex flex-col gap-1 border-b border-filet-creme px-cladd-xs py-cladd-3xs last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between"
					>
						<span className="text-cladd-md">
							Ordonnance du {dateCourteFr(ligne.ordonnance)}, délai de <Valeur de={ligne.de} />
						</span>
						<span className="text-cladd-md font-semibold whitespace-nowrap tabular-nums">
							à remettre à votre client au plus tard le {dateCourteFr(ligne.fin ?? '')}
						</span>
					</li>
				))}
			</ul>
		</Figure>
	);
}

// ─── Un plan d'échéancier ────────────────────────────────────────────────────

/** Un montant découpé en mensualités égales (le reste sur la dernière), une par mois. */
export function PlanEcheancier({
	montant,
	mensualites,
	premier
}: {
	montant: number;
	mensualites: number;
	premier: string;
}) {
	const total = BigInt(Math.round(montant * 100));
	const part = total / BigInt(mensualites);
	const reste = total - part * BigInt(mensualites);
	const echeances = Array.from({ length: mensualites }, (_, rang) => ({
		date: ajouterMois(premier, rang),
		montant: rang === mensualites - 1 ? part + reste : part
	}));
	return (
		<Figure legende="Un échéancier d'exemple : la somme due, découpée en versements mensuels égaux.">
			<ol className="grid grid-cols-2 gap-cladd-3xs sm:grid-cols-4">
				{echeances.map((echeance, rang) => (
					<li
						key={echeance.date}
						className="flex flex-col gap-1 rounded-carte-site border border-filet-creme bg-papier p-cladd-xs"
					>
						<span className="text-cladd-sm text-encre-site-claire tabular-nums">
							Versement {rang + 1}
						</span>
						<span className="font-serif text-intertitre font-medium tabular-nums">
							{eurosCentimesCourts(depuisCentimes(echeance.montant))}
						</span>
						<span className="text-cladd-sm text-encre-site-douce">
							{dateCourteFr(echeance.date)}
						</span>
					</li>
				))}
			</ol>
		</Figure>
	);
}
