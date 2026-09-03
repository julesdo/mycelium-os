import {
	Surface,
	SurfaceCut,
	Button,
	CollapsibleRoot,
	CollapsibleTrigger,
	CollapsiblePanel,
	CollapsibleIndicator
} from '@cladd-ui/react';
import { ChevronDownIcon } from 'lucide-react';
import { eurosCentimes, dateCourte } from './format';
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

export interface LigneDecompteAffichee {
	readonly reference: string;
	readonly principalRestantDu: bigint;
	readonly interets: bigint;
	readonly indemniteForfaitaire: bigint;
	readonly total: bigint;
	readonly segments: readonly SegmentAffiche[];
}

export interface DecompteAffiche {
	readonly arreteAu: string;
	readonly convention: 'ACT_365' | 'ACT_ACT';
	readonly principalRestantDu: bigint;
	readonly interets: bigint;
	readonly indemniteForfaitaire: bigint;
	readonly total: bigint;
	readonly lignes: readonly LigneDecompteAffichee[];
}

/** La convention, dite en clair. « ACT_365 » ne se lit pas. */
const CONVENTION_LISIBLE: Record<DecompteAffiche['convention'], string> = {
	ACT_365: 'base fixe de 365 jours',
	ACT_ACT: 'base réelle de l’année (365 ou 366 jours)'
};

/** Une fraction exacte, rendue lisible. La division n'a lieu qu'ici. */
function tauxLisible(taux: SegmentAffiche['taux']): string {
	const pourMille = (taux.numerateur * 10_000n) / taux.denominateur;
	const entier = pourMille / 100n;
	const decimales = (pourMille % 100n).toString().padStart(2, '0');
	return `${entier},${decimales} %`;
}

function Poste({ libelle, montant }: { libelle: string; montant: bigint }) {
	return (
		<div className="flex items-baseline justify-between gap-cladd-3xs">
			<span className="text-cladd-sm text-cladd-fg-soft">{libelle}</span>
			<span className="text-cladd-sm font-semibold tabular-nums">{eurosCentimes(montant)}</span>
		</div>
	);
}

function Periodes({ segments }: { segments: readonly SegmentAffiche[] }) {
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

export function Decompte({ decompte }: { decompte: DecompteAffiche }) {
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
			</SurfaceCut>

			{decompte.lignes.map((ligne) => (
				<Surface key={ligne.reference} contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs">
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
										{({ open }) => (
											<ChevronDownIcon className={open ? 'rotate-180' : undefined} />
										)}
									</CollapsibleIndicator>
								</Button>
							</CollapsibleTrigger>
							{/* Le rembourrage vit sur un élément IMBRIQUÉ : le panneau anime
							    sa hauteur jusqu'à zéro, et une marge verticale posée sur lui
							    l'empêcherait de se refermer complètement. */}
							<CollapsiblePanel>
								<div className="pt-cladd-3xs">
									<Periodes segments={ligne.segments} />
								</div>
							</CollapsiblePanel>
						</CollapsibleRoot>
					) : (
						<p className="text-cladd-xs text-cladd-fg-soft">
							Aucune période d’intérêts : la facture n’était pas encore exigible à la date
							d’arrêté.
						</p>
					)}
				</Surface>
			))}
		</div>
	);
}
