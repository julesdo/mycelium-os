import {
	Surface,
	SurfaceCut,
	Button,
	CollapsibleRoot,
	CollapsibleTrigger,
	CollapsiblePanel,
	CollapsibleIndicator,
	Segmented,
	SegmentedButton
} from '@cladd-ui/react';
import { ChevronDownIcon } from 'lucide-react';
import { eurosCentimes, dateCourte, tauxLisible } from './format';
import {
	Tableau,
	TableauEntete,
	TableauCorps,
	TableauLigne,
	TableauTitre,
	TableauCellule
} from './tableau';

/**
 * Le décompte, et sa preuve.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CET ÉCRAN EST LE DERNIER CRITÈRE D'ACCEPTATION DU BRIEF
 * ─────────────────────────────────────────────────────────────────────────
 *
 * « Tout montant affiché est traçable jusqu'à sa pièce source. » Les segments
 * portaient déjà cette traçabilité en base ; tant que rien ne les affichait,
 * le critère restait à moitié tenu.
 *
 * D'où le parti pris : **les périodes sont dépliables, jamais absentes.** Un
 * total qu'on ne peut pas décomposer est un chiffre qu'on demande de croire.
 * Décomposé — quel principal, quel taux, sur combien de jours, sur quelle base
 * annuelle — il se refait à la main, et c'est exactement ce que fera le
 * débiteur qui le conteste.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE TAUX S'AFFICHE EN POURCENTAGE, MAIS N'EST PAS STOCKÉ AINSI
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Il arrive en fraction exacte (numérateur et dénominateur en `bigint`), et la
 * division n'a lieu QU'ICI, pour l'œil. La convertir plus tôt réintroduirait un
 * flottant dans une chaîne qui n'en contient aucun, du parseur jusqu'à l'écran.
 */

export interface SegmentAffiche {
	readonly debut: string;
	readonly fin: string;
	readonly jours: number;
	readonly principal: bigint;
	readonly taux: { readonly numerateur: bigint; readonly denominateur: bigint };
	readonly baseAnnuelle: number;
	readonly interets: bigint;
}

/** Ce qu'un règlement a éteint : d'abord les pénalités déjà courues, puis le principal. */
export interface ImputationAffichee {
	readonly date: string;
	readonly nature: 'PAIEMENT' | 'ACOMPTE' | 'AVOIR' | 'CREDIT';
	readonly montant: bigint;
	readonly surInterets: bigint;
	readonly surPrincipal: bigint;
}

export interface LigneDecompteAffichee {
	readonly reference: string;
	readonly principalRestantDu: bigint;
	readonly interets: bigint;
	readonly indemniteForfaitaire: bigint;
	readonly total: bigint;
	readonly segments: readonly SegmentAffiche[];
	/**
	 * ⚠️ FACULTATIF : un décompte figé avant le 25/09/2026 n'en porte pas. Il
	 * imputait tout règlement au principal, et ses périodes font ses intérêts.
	 */
	readonly imputations?: readonly ImputationAffichee[];
}

const NATURE_LISIBLE: Record<ImputationAffichee['nature'], string> = {
	PAIEMENT: 'Paiement',
	ACOMPTE: 'Acompte',
	AVOIR: 'Avoir',
	CREDIT: 'Crédit non détaillé'
};

/**
 * Les règlements, et ce que chacun a éteint.
 *
 * ⚠️ C'EST LA MOITIÉ DE LA PREUVE. Un paiement s'impute d'abord sur les
 * pénalités déjà courues : les périodes disent ce qui a couru, ce tableau ce
 * qui en a été payé. Sans lui, la somme des périodes dépasse les intérêts dus,
 * et un tiers qui refait le calcul croit à une erreur.
 */
export function ReglementsImputes({ imputations }: { imputations: readonly ImputationAffichee[] }) {
	return (
		<Tableau legende="Règlements, et ce que chacun a éteint">
			<TableauEntete>
				<TableauTitre>Le</TableauTitre>
				<TableauTitre>Nature</TableauTitre>
				<TableauTitre aDroite>Montant</TableauTitre>
				<TableauTitre aDroite>Sur les intérêts</TableauTitre>
				<TableauTitre aDroite>Sur le principal</TableauTitre>
			</TableauEntete>
			<TableauCorps>
				{imputations.map((imputation, rang) => (
					<TableauLigne key={`${imputation.date}-${rang}`}>
						<TableauCellule>{dateCourte(imputation.date)}</TableauCellule>
						<TableauCellule>{NATURE_LISIBLE[imputation.nature]}</TableauCellule>
						<TableauCellule aDroite>{eurosCentimes(imputation.montant)}</TableauCellule>
						<TableauCellule aDroite>{eurosCentimes(imputation.surInterets)}</TableauCellule>
						<TableauCellule aDroite>{eurosCentimes(imputation.surPrincipal)}</TableauCellule>
					</TableauLigne>
				))}
			</TableauCorps>
		</Tableau>
	);
}

export type OrdreImputationAffichee = 'PENALITES_DABORD' | 'PRINCIPAL_DABORD';

export interface ImputationDuDecompteAffichee {
	readonly ordre: OrdreImputationAffichee;
	readonly confirme: boolean;
	/** Le total de l'autre ordre, quand le gérant n'a pas choisi et qu'il diffère. */
	readonly totalAutreOrdre: bigint | null;
}

const ORDRE_LISIBLE: Record<OrdreImputationAffichee, string> = {
	PENALITES_DABORD: 'Les pénalités d’abord',
	PRINCIPAL_DABORD: 'Les factures d’abord'
};

export interface DecompteAffiche {
	readonly arreteAu: string;
	readonly convention: 'ACT_365' | 'ACT_ACT';
	readonly principalRestantDu: bigint;
	readonly interets: bigint;
	readonly indemniteForfaitaire: bigint;
	readonly total: bigint;
	readonly lignes: readonly LigneDecompteAffichee[];
	/** Absent d'un décompte figé avant le lot 1 de la page dossier. */
	readonly imputation?: ImputationDuDecompteAffichee;
}

/** La convention, dite en clair. « ACT_365 » ne se lit pas. */
const CONVENTION_LISIBLE: Record<DecompteAffiche['convention'], string> = {
	ACT_365: 'base fixe de 365 jours',
	ACT_ACT: 'base réelle de l’année (365 ou 366 jours)'
};

function Poste({ libelle, montant }: { libelle: string; montant: bigint }) {
	return (
		<div className="flex items-baseline justify-between gap-cladd-3xs">
			<span className="text-cladd-sm text-cladd-fg-soft">{libelle}</span>
			<span className="text-cladd-sm font-semibold tabular-nums">{eurosCentimes(montant)}</span>
		</div>
	);
}

/**
 * Les périodes d'intérêts, en tableau.
 *
 * ⚠️ EXPORTÉE : le suivi d'un dossier remis au conseil décompose l'écart entre
 * le décompte figé et le calcul du jour, et cet écart se lit avec les MÊMES
 * colonnes. Deux tableaux de périodes auraient fini par afficher deux jeux de
 * colonnes pour la même preuve, sur le seul chiffre qu'un tiers refait à la
 * main.
 */
export function PeriodesDInterets({ segments }: { segments: readonly SegmentAffiche[] }) {
	return (
		<Tableau legende="Périodes d’intérêts">
			<TableauEntete>
				<TableauTitre>Du</TableauTitre>
				<TableauTitre>Au</TableauTitre>
				<TableauTitre aDroite>Jours</TableauTitre>
				<TableauTitre aDroite>Principal</TableauTitre>
				<TableauTitre aDroite>Taux</TableauTitre>
				<TableauTitre aDroite>Base</TableauTitre>
				<TableauTitre aDroite>Intérêts</TableauTitre>
			</TableauEntete>
			<TableauCorps>
				{segments.map((segment) => (
					<TableauLigne key={`${segment.debut}-${segment.fin}`}>
						<TableauCellule>{dateCourte(segment.debut)}</TableauCellule>
						<TableauCellule>{dateCourte(segment.fin)}</TableauCellule>
						<TableauCellule aDroite>{segment.jours}</TableauCellule>
						<TableauCellule aDroite>{eurosCentimes(segment.principal)}</TableauCellule>
						<TableauCellule aDroite>{tauxLisible(segment.taux)}</TableauCellule>
						<TableauCellule aDroite>{segment.baseAnnuelle}</TableauCellule>
						<TableauCellule aDroite>{eurosCentimes(segment.interets)}</TableauCellule>
					</TableauLigne>
				))}
			</TableauCorps>
		</Tableau>
	);
}

export function Decompte({
	decompte,
	onChoisirImputation
}: {
	decompte: DecompteAffiche;
	/** Présent quand le gérant peut choisir ici ; absent sur un décompte figé. */
	onChoisirImputation?: (ordre: OrdreImputationAffichee) => void;
}) {
	const imputation = decompte.imputation;
	// ⚠️ ON NE DEMANDE RIEN QUAND LE CHOIX NE CHANGE RIEN : sans paiement imputable,
	// les deux ordres donnent le même total.
	const choixUtile =
		imputation !== undefined && (imputation.totalAutreOrdre !== null || imputation.confirme);
	return (
		<div className="flex flex-col gap-cladd-xs">
			<SurfaceCut contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs">
				<Poste libelle="Principal restant dû" montant={decompte.principalRestantDu} />
				<Poste libelle="Intérêts de retard" montant={decompte.interets} />
				<Poste
					libelle="Indemnité forfaitaire de recouvrement"
					montant={decompte.indemniteForfaitaire}
				/>

				<div className="mt-cladd-3xs flex items-baseline justify-between gap-cladd-3xs border-t border-cladd-outline pt-cladd-3xs">
					<span className="text-cladd-sm font-semibold">Total réclamé</span>
					<span className="text-letikette-titre font-bold tabular-nums">
						{eurosCentimes(decompte.total)}
					</span>
				</div>

				{/* Sans la date d'arrêté ni la convention, le chiffre n'est pas
				    défendable : deux conventions donnent deux totaux différents. */}
				<p className="text-cladd-xs text-cladd-fg-soft">
					Arrêté au {dateCourte(decompte.arreteAu)}, intérêts calculés en{' '}
					{CONVENTION_LISIBLE[decompte.convention]}.
				</p>
				{choixUtile && imputation !== undefined ? (
					<div className="flex flex-col gap-cladd-3xs border-t border-cladd-outline pt-cladd-3xs">
						<p className="text-cladd-xs text-cladd-fg-soft">
							{imputation.ordre === 'PENALITES_DABORD'
								? 'Les paiements reçus remboursent d’abord les pénalités déjà dues, puis les factures'
								: 'Les paiements reçus remboursent d’abord les factures, puis les pénalités'}
							{imputation.confirme ? ', comme vous l’avez choisi.' : '.'}
						</p>
						{imputation.confirme || imputation.totalAutreOrdre === null ? null : (
							<p className="text-cladd-xs text-cladd-fg-soft">
								À confirmer. La loi prévoit les pénalités d’abord, sauf si vos conditions générales
								disent autrement : c’est à vous de choisir. En attendant, le calcul le plus bas est
								retenu ; l’autre donnerait {eurosCentimes(imputation.totalAutreOrdre)}.
							</p>
						)}
						{onChoisirImputation === undefined ? null : (
							// ⚠️ AUCUN BOUTON N'EST ACTIF TANT QUE LE GÉRANT N'A PAS CHOISI. Un
							// segment pré-sélectionné se lirait comme la réponse recommandée.
							<Segmented className="self-start" activeColor="neutral" activeVariant="solid">
								{(['PENALITES_DABORD', 'PRINCIPAL_DABORD'] as const).map((ordre) => (
									<SegmentedButton
										key={ordre}
										active={imputation.confirme && imputation.ordre === ordre}
										onClick={() => onChoisirImputation(ordre)}
									>
										{ORDRE_LISIBLE[ordre]}
									</SegmentedButton>
								))}
							</Segmented>
						)}
					</div>
				) : null}
			</SurfaceCut>

			{decompte.lignes.map((ligne) => (
				<Surface
					key={ligne.reference}
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
				>
					<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
						<span className="text-cladd-sm font-semibold">{ligne.reference}</span>
						<span className="text-cladd-sm font-semibold tabular-nums">
							{eurosCentimes(ligne.total)}
						</span>
					</div>

					<Poste libelle="Principal" montant={ligne.principalRestantDu} />
					<Poste libelle="Intérêts" montant={ligne.interets} />
					<Poste libelle="Indemnité" montant={ligne.indemniteForfaitaire} />

					{ligne.segments.length > 0 ? (
						<CollapsibleRoot>
							<CollapsibleTrigger>
								<Button variant="transparent" contentClassName="justify-between" size="md">
									{`Voir le détail des ${ligne.segments.length} période${
										ligne.segments.length > 1 ? 's' : ''
									}`}
									<CollapsibleIndicator className="text-cladd-fg-soft">
										{({ open }) => <ChevronDownIcon className={open ? 'rotate-180' : undefined} />}
									</CollapsibleIndicator>
								</Button>
							</CollapsibleTrigger>
							{/* Le rembourrage vit sur un élément IMBRIQUÉ : le panneau anime
							    sa hauteur jusqu'à zéro, et une marge verticale posée sur lui
							    l'empêcherait de se refermer complètement. */}
							<CollapsiblePanel>
								<div className="flex flex-col gap-cladd-3xs pt-cladd-3xs">
									<PeriodesDInterets segments={ligne.segments} />
									{ligne.imputations !== undefined && ligne.imputations.length > 0 ? (
										<ReglementsImputes imputations={ligne.imputations} />
									) : null}
								</div>
							</CollapsiblePanel>
						</CollapsibleRoot>
					) : (
						<p className="text-cladd-xs text-cladd-fg-soft">
							Aucune période d’intérêts : la facture n’était pas encore exigible à la date d’arrêté.
						</p>
					)}
				</Surface>
			))}
		</div>
	);
}
