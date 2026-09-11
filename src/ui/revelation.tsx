import { Surface, SurfaceCut } from '@cladd-ui/react';
import { AlertTriangleIcon, TrendingUpIcon } from 'lucide-react';
import { dateCourte, eurosCentimes } from './format';

/**
 * LE CHOC DU PREMIER IMPORT, ET LES DEUX COMPTEURS QUI LE PROLONGENT.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE LE GROS CHIFFRE DIT, ET CE QU'IL NE DIT PAS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le nombre posé en grand n'est PAS le total des impayés — celui-là, le gérant
 * l'a déjà dans sa comptabilité, et le lui montrer ne lui apprendrait rien.
 * C'est le SUPPLÉMENT : les intérêts de retard et l'indemnité forfaitaire de
 * 40 € par facture, dus de plein droit et presque jamais réclamés faute de
 * savoir les calculer.
 *
 * Le principal se lit juste en dessous, en second. Les mélanger transformerait
 * l'écran en relevé d'impayés, c'est-à-dire en quelque chose qu'il a déjà.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * C'EST UN CONSTAT, PAS UNE PROMESSE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Rien ici ne dit qu'une somme rentrera. Le produit MESURE, DOCUMENTE et
 * ALERTE ; la décision d'agir et le recouvrement lui-même restent au client, et
 * dépendent surtout de la solvabilité du débiteur. Les libellés disent « dus de
 * plein droit », jamais « à récupérer ».
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LA DÉCOMPOSITION N'EST PAS UN DÉTAIL REPLIABLE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Un montant qu'on ne peut pas décomposer est un montant qu'on demande de
 * croire. Le débiteur qui le conteste refera le calcul ; le gérant doit pouvoir
 * le refaire avant lui. Chaque ligne porte donc sa facture, son principal, ses
 * intérêts et son indemnité, à l'écran et sans clic.
 */

export interface LigneRevelationAffichee {
	readonly reference: string;
	readonly principalRestantDu: bigint;
	readonly interets: bigint;
	readonly indemniteForfaitaire: bigint;
	readonly supplement: bigint;
}

export interface RevelationAffichee {
	readonly nombreFactures: number;
	readonly principal: bigint;
	readonly interets: bigint;
	readonly indemnites: bigint;
	readonly supplement: bigint;
	readonly total: bigint;
	readonly interetsCourusDepuisHier: bigint;
	readonly lignes: readonly LigneRevelationAffichee[];
	readonly nonChiffrees: readonly { readonly reference: string; readonly raison: string }[];
}

export interface BilanPertesAffiche {
	readonly eteintesAvant: bigint;
	readonly nombreEteintesAvant: number;
	readonly eteintesDepuis: bigint;
	readonly nombreEteintesDepuis: number;
	readonly nonSurveillees: readonly string[];
	readonly joursSousSurveillance: number;
	readonly surveillanceInterrompueLe?: string;
}

function pluriel(n: number): string {
	return n > 1 ? 's' : '';
}

/** Ce que le calcul n'a pas su chiffrer — jamais tu, jamais en petit tout en bas. */
function NonChiffrees({
	lignes
}: {
	lignes: readonly { readonly reference: string; readonly raison: string }[];
}) {
	if (lignes.length === 0) return null;

	return (
		<Surface variant="transparent" outline={false} className="verre-carte rounded-cladd-xl" contentClassName="flex gap-cladd-3xs p-cladd-2xs">
			<AlertTriangleIcon className="mt-1 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
			<div className="flex min-w-0 flex-col gap-1.5">
				<p className="text-cladd-xs font-semibold">
					{lignes.length} facture{pluriel(lignes.length)} n’
					{lignes.length > 1 ? 'entrent' : 'entre'} pas dans ce total
				</p>
				{lignes.map((ligne) => (
					<p key={ligne.reference} className="text-cladd-xs text-cladd-fg-soft">
						<span className="font-semibold">{ligne.reference}</span> — {ligne.raison}
					</p>
				))}
			</div>
		</Surface>
	);
}

/**
 * La révélation elle-même.
 *
 * L'appelant décide de l'afficher : sur un établissement sans facture échue,
 * la règle d'écran n° 4 veut qu'on montre le chemin, pas un cadran à zéro.
 */
export function ChocRevelation({ revelation }: { revelation: RevelationAffichee }) {
	return (
		<div className="flex flex-col gap-cladd-xs">
			<SurfaceCut contentClassName="flex flex-col gap-cladd-2xs p-cladd-xs">
				<div className="flex flex-col gap-1">
					<span className="text-cladd-sm text-cladd-fg-soft">
						Dus de plein droit sur vos {revelation.nombreFactures} facture
						{pluriel(revelation.nombreFactures)} en retard, et jamais calculés
					</span>
					<span className="text-letikette-taux leading-none font-bold tabular-nums">
						{eurosCentimes(revelation.supplement)}
					</span>
					<span className="text-cladd-2xs text-cladd-fg-softer">
						Intérêts de retard {eurosCentimes(revelation.interets)} · indemnité forfaitaire{' '}
						{eurosCentimes(revelation.indemnites)}, soit 40 € par facture
					</span>
				</div>

				{/* Le principal en second, et nommé pour ce qu'il est : ce que la
				    comptabilité affiche déjà. */}
				<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs border-t border-cladd-outline pt-cladd-2xs">
					<span className="text-cladd-sm text-cladd-fg-soft">
						Principal restant dû, que vous connaissez déjà
					</span>
					<span className="text-cladd-md font-semibold tabular-nums">
						{eurosCentimes(revelation.principal)}
					</span>
				</div>
				<div className="flex flex-wrap items-baseline justify-between gap-cladd-3xs">
					<span className="text-cladd-sm font-semibold">Total réclamable à ce jour</span>
					<span className="text-letikette-chiffre font-bold tabular-nums">
						{eurosCentimes(revelation.total)}
					</span>
				</div>
			</SurfaceCut>

			{/* LA DÉCOMPOSITION, À L'ÉCRAN ET SANS CLIC. */}
			<div className="flex flex-col gap-cladd-3xs">
				{revelation.lignes.map((ligne) => (
					<Surface
						variant="transparent"
						outline={false}
						className="verre-carte rounded-cladd-xl"
						key={ligne.reference}
						contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs sm:flex-row sm:items-center sm:justify-between"
					>
						<span className="text-cladd-xs font-semibold">{ligne.reference}</span>
						<div className="flex flex-wrap gap-cladd-2xs text-cladd-xs text-cladd-fg-soft tabular-nums">
							<span>principal {eurosCentimes(ligne.principalRestantDu)}</span>
							<span>intérêts {eurosCentimes(ligne.interets)}</span>
							<span>indemnité {eurosCentimes(ligne.indemniteForfaitaire)}</span>
						</div>
						<span className="shrink-0 text-cladd-sm font-semibold tabular-nums sm:text-right">
							{eurosCentimes(ligne.supplement)}
						</span>
					</Surface>
				))}
			</div>

			<NonChiffrees lignes={revelation.nonChiffrees} />
		</div>
	);
}

/**
 * Le compteur vivant — « il a monté cette nuit ».
 *
 * ⚠️ L'ÉTIQUETTE DIT « INTÉRÊTS COURUS », PAS « MONTÉE ». Le chiffre mesure ce
 * qui s'est accumulé sur de l'argent DÉJÀ réclamable, et rien d'autre : une
 * facture qui échoit dans la nuit est un événement du flux, pas une
 * accumulation, et l'indemnité forfaitaire est due UNE fois, pas chaque nuit.
 * Une étiquette plus large qu'elle ne le doit ferait un chiffre faux sans qu'une
 * seule ligne de calcul change.
 */
export function CompteurVivant({
	total,
	interetsCourusDepuisHier
}: {
	total: bigint;
	interetsCourusDepuisHier: bigint;
}) {
	return (
		<SurfaceCut contentClassName="flex flex-wrap items-center justify-between gap-cladd-3xs p-cladd-2xs">
			<div className="flex flex-col gap-0.5">
				<span className="text-cladd-sm text-cladd-fg-soft">Ce qu’on vous doit aujourd’hui</span>
				<span className="text-cladd-2xs text-cladd-fg-softer">
					Principal, intérêts courus et indemnités forfaitaires
				</span>
			</div>
			<div className="flex flex-col items-end gap-0.5">
				<span className="text-letikette-titre font-bold tabular-nums">{eurosCentimes(total)}</span>
				{interetsCourusDepuisHier > 0n ? (
					<span className="flex items-center gap-1 text-cladd-2xs text-cladd-fg-soft tabular-nums">
						<TrendingUpIcon className="size-3.5" aria-hidden />
						{eurosCentimes(interetsCourusDepuisHier)} d’intérêts courus depuis hier
					</span>
				) : null}
			</div>
		</SurfaceCut>
	);
}

/**
 * Le bilan des pertes — et le seul écran du produit qui s'interdit de parler.
 *
 * ⚠️ « 0 € PERDU DEPUIS N JOURS » EST UNE AFFIRMATION SUR NOTRE TRAVAIL, pas
 * sur les données du client. Si le battement quotidien a échoué un seul jour de
 * la période, elle est FAUSSE — et une phrase fausse à cet endroit est pire que
 * pas de compteur du tout, parce qu'elle rassure exactement quand il ne faut
 * pas. Le serveur renseigne alors `surveillanceInterrompueLe`, et ce bloc dit
 * ce qui s'est passé au lieu de compter.
 *
 * ⚠️ LE SECOND CHIFFRE PEUT NE PAS ÊTRE ZÉRO, ET IL S'AFFICHE QUAND MÊME. Une
 * créance éteinte pendant qu'on la surveillait est un échec du produit. Le
 * cacher ferait du premier chiffre une publicité au lieu d'une mesure.
 */
export function BilanPertes({ bilan }: { bilan: BilanPertesAffiche }) {
	if (bilan.surveillanceInterrompueLe !== undefined) {
		return (
			<Surface variant="transparent" outline={false} className="verre-carte rounded-cladd-xl" contentClassName="flex gap-cladd-3xs p-cladd-2xs">
				<AlertTriangleIcon className="mt-1 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
				<div className="flex min-w-0 flex-col gap-1.5">
					<p className="text-cladd-xs font-semibold">Ce compteur ne peut rien affirmer</p>
					<p className="text-cladd-xs text-cladd-fg-soft">
						La surveillance a échoué le {dateCourte(bilan.surveillanceInterrompueLe)}. Ce jour-là,
						vos délais n’ont pas été suivis : nous ne pouvons pas dire ce qui s’est éteint depuis
						votre arrivée.
					</p>
				</div>
			</Surface>
		);
	}

	return (
		<div className="flex flex-col gap-cladd-3xs">
			<div className="flex flex-col gap-cladd-3xs sm:flex-row">
				<Surface variant="transparent" outline={false} className="verre-carte rounded-cladd-xl" contentClassName="flex flex-1 flex-col gap-0.5 p-cladd-2xs">
					<span className="text-cladd-sm text-cladd-fg-soft">
						Éteint avant votre arrivée, en silence
					</span>
					<span className="text-letikette-chiffre font-bold tabular-nums">
						{eurosCentimes(bilan.eteintesAvant)}
					</span>
					<span className="text-cladd-2xs text-cladd-fg-softer">
						{bilan.nombreEteintesAvant} facture{pluriel(bilan.nombreEteintesAvant)} prescrite
						{pluriel(bilan.nombreEteintesAvant)}
					</span>
				</Surface>

				<Surface variant="transparent" outline={false} className="verre-carte rounded-cladd-xl" contentClassName="flex flex-1 flex-col gap-0.5 p-cladd-2xs">
					<span className="text-cladd-sm text-cladd-fg-soft">Éteint depuis, sous surveillance</span>
					<span className="text-letikette-chiffre font-bold tabular-nums">
						{eurosCentimes(bilan.eteintesDepuis)}
					</span>
					<span className="text-cladd-2xs text-cladd-fg-softer">
						{bilan.joursSousSurveillance} jour{pluriel(bilan.joursSousSurveillance)} de surveillance
					</span>
				</Surface>
			</div>

			{bilan.nonSurveillees.length > 0 ? (
				<Surface variant="transparent" outline={false} className="verre-carte rounded-cladd-xl" contentClassName="flex gap-cladd-3xs p-cladd-2xs">
					<AlertTriangleIcon className="mt-1 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
					<div className="flex min-w-0 flex-col gap-1.5">
						<p className="text-cladd-xs font-semibold">
							Ces chiffres ne couvrent pas {bilan.nonSurveillees.length} facture
							{pluriel(bilan.nonSurveillees.length)}
						</p>
						<p className="text-cladd-xs text-cladd-fg-soft">
							{bilan.nonSurveillees.join(', ')} —{' '}
							{bilan.nonSurveillees.length > 1
								? 'leurs dates de prescription n’ont pas pu être établies, elles ne sont donc comptées ni d’un côté ni de l’autre.'
								: 'sa date de prescription n’a pas pu être établie, elle n’est donc comptée ni d’un côté ni de l’autre.'}
						</p>
					</div>
				</Surface>
			) : null}
		</div>
	);
}
