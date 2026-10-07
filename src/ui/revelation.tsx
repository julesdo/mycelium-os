import { Surface } from '@cladd-ui/react';
import { AlertTriangleIcon } from 'lucide-react';
import { LigneDeReleve, ListeDeReleve } from './carte-rangee';
import { ChiffreHero } from './chiffre';
import { EnTeteDeGroupe } from './en-tete-groupe';
import { dateCourte, eurosCentimes } from './format';

/**
 * LE CHOC DU PREMIER IMPORT, ET LE BILAN DE CE QUI S'EST ÉTEINT.
 *
 * ⚠️ UN TROISIÈME COMPOSANT VIVAIT ICI — `CompteurVivant` — et il a été retiré.
 * Il affichait le TOTAL réclamable, que le hero de l'accueil porte désormais en
 * corps de soixante-douze pixels, à un geste d'ici. Or `ChocRevelation`, juste
 * au-dessous, énumère déjà ce total ET ses trois parts. Le même chiffre trois
 * fois sur un écran ne le rend pas plus vrai : il fait chercher lequel compte.
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

/**
 * Ce que le calcul n'a pas su chiffrer — jamais tu, jamais en petit tout en bas.
 *
 * ⚠️ EXPORTÉ, ET IL N'Y EN A QU'UN DANS TOUT LE PRODUIT. La règle d'amputation
 * de `verticales/recouvrement/revelation.ts` — « un total silencieusement amputé
 * est pire qu'un total incomplet annoncé » — vaut pour le total de la révélation
 * ET pour le nombre de tête de la file, qui est le même. Deux rendus de la même
 * règle divergeraient à la première retouche, et la divergence serait muette :
 * un écran continuerait de nommer ce qu'il n'a pas compté, l'autre non.
 *
 * ⚠️ ET UN JEU VIDE NE REND RIEN. Zéro facture non chiffrée produit zéro ligne,
 * jamais une ligne qui dit zéro — règle d'écran n° 4.
 */
export function FacturesNonChiffrees({
	lignes
}: {
	lignes: readonly { readonly reference: string; readonly raison: string }[];
}) {
	if (lignes.length === 0) return null;

	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex gap-cladd-3xs p-cladd-2xs"
		>
			<AlertTriangleIcon className="mt-1 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
			<div className="flex min-w-0 flex-col gap-1.5">
				<p className="text-cladd-xs font-semibold">
					{lignes.length} facture{pluriel(lignes.length)} n’
					{lignes.length > 1 ? 'entrent' : 'entre'} pas dans ce total
				</p>
				{/*
				  LA RÉFÉRENCE AU-DESSUS DE SA RAISON, AU CORPS DE LA SOUS-LIGNE. En corps
				  de texte et à la suite (« FA-2020-0930 — Facture FA-2020-0930 : … »),
				  la raison faisait un paragraphe de sept lignes à 375 px, le plus lourd
				  de l'écran. Elle reste entière : c'est elle qui dit pourquoi.
				*/}
				{lignes.map((ligne) => (
					<div key={ligne.reference} className="flex flex-col gap-0.5">
						<p className="text-cladd-2xs font-semibold">{ligne.reference}</p>
						<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">{ligne.raison}</p>
					</div>
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
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ REFAITE LE 07/10/2026 SUR LE « BALANCE DETAILS » D'APPLE WALLET
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle empilait trois gros totaux en sans-serif dans un creux beige, chacun
 * sous un intitulé de deux lignes (« Reste à payer sur vos factures, que vous
 * connaissez déjà »), puis une carte de quatre lignes par facture : 3 036 px et
 * 394 mots à 375 px, pour trois cibles. Désormais :
 *
 *   1. LE SUPPLÉMENT EN MONTANT HÉROS, centré, comme partout dans le produit —
 *      c'est le chiffre que la rangée « Jamais réclamé » de l'accueil promet.
 *   2. DEUX CARTES DE LIGNES, intitulé à gauche, montant à droite : ce qui le
 *      compose, puis le passage au total réclamable.
 *   3. LA DÉCOMPOSITION EN RELEVÉ, facture par facture, et toujours SANS CLIC :
 *      chaque ligne porte son principal, ses pénalités et ses frais, et le
 *      montant de tête est leur somme — elle se refait à la main.
 *
 * ⚠️ « 40 € PAR FACTURE » N'EST PLUS ÉCRIT À L'ÉCRAN. C'était une valeur
 * juridique tapée dans un composant, ce que le projet interdit ; le forfait se
 * nomme, son montant vient du calcul, ligne par ligne.
 */
export function ChocRevelation({
	revelation,
	arreteAu
}: {
	revelation: RevelationAffichee;
	arreteAu: string;
}) {
	const couru = revelation.interetsCourusDepuisHier;

	return (
		<div className="flex flex-col gap-cladd-xs">
			<ChiffreHero
				centimes={revelation.supplement}
				defile
				surTitre="Jamais réclamé"
				legende={
					<span className="flex flex-col items-center gap-0.5">
						<span>
							Dus de plein droit sur {revelation.nombreFactures} facture
							{pluriel(revelation.nombreFactures)} en retard
						</span>
						<span className="text-cladd-2xs text-cladd-fg-softer">
							Arrêté au {dateCourte(arreteAu)}
							{couru > 0n ? (
								<>
									{' · '}
									<span className="font-semibold text-cladd-fg tabular-nums">
										+{eurosCentimes(couru)}
									</span>{' '}
									depuis hier
								</>
							) : null}
						</span>
					</span>
				}
			/>

			<ListeDeReleve>
				<LigneDeReleve titre="Pénalités de retard" montant={eurosCentimes(revelation.interets)} />
				<LigneDeReleve
					titre="Frais de recouvrement"
					montant={eurosCentimes(revelation.indemnites)}
					ligne="Un forfait par facture en retard"
				/>
			</ListeDeReleve>

			{/* Le solde en second, et nommé pour ce qu'il est : ce que la comptabilité
			    affiche déjà. Ce qui s'y ajoute est le chiffre de tête. */}
			<ListeDeReleve>
				<LigneDeReleve
					titre="Reste à payer"
					montant={eurosCentimes(revelation.principal)}
					ligne="Ce que votre comptabilité affiche déjà"
				/>
				<LigneDeReleve
					titre="Total réclamable à ce jour"
					montant={eurosCentimes(revelation.total)}
				/>
			</ListeDeReleve>

			{/* LA DÉCOMPOSITION, À L'ÉCRAN ET SANS CLIC. */}
			<section className="flex flex-col gap-cladd-3xs">
				<EnTeteDeGroupe
					libelle="Facture par facture"
					nombre={revelation.lignes.length}
					total={revelation.supplement}
				/>
				<ListeDeReleve>
					{revelation.lignes.map((ligne) => (
						<LigneDeReleve
							key={ligne.reference}
							titre={ligne.reference}
							montant={eurosCentimes(ligne.supplement)}
							ligne={`Pénalités ${eurosCentimes(ligne.interets)} · frais ${eurosCentimes(ligne.indemniteForfaitaire)}`}
							date={`sur ${eurosCentimes(ligne.principalRestantDu)}`}
							retour
						/>
					))}
				</ListeDeReleve>
			</section>

			<FacturesNonChiffrees lignes={revelation.nonChiffrees} />
		</div>
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
			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				contentClassName="flex gap-cladd-3xs p-cladd-2xs"
			>
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
			{/*
			  UN RELEVÉ DE DEUX LIGNES, et plus deux cartes à gros chiffre côte à côte :
			  deux montants qu'on compare se lisent l'un SOUS l'autre, alignés sur la
			  même colonne. Le second s'affiche même à zéro — voir plus haut.
			*/}
			<ListeDeReleve>
				<LigneDeReleve
					titre="Éteint avant votre arrivée"
					montant={eurosCentimes(bilan.eteintesAvant)}
					ligne={`${bilan.nombreEteintesAvant} facture${pluriel(bilan.nombreEteintesAvant)} hors délai pour agir en justice`}
				/>
				<LigneDeReleve
					titre="Éteint depuis, sous surveillance"
					montant={eurosCentimes(bilan.eteintesDepuis)}
					ligne={`${bilan.joursSousSurveillance} jour${pluriel(bilan.joursSousSurveillance)} de surveillance`}
				/>
			</ListeDeReleve>

			{bilan.nonSurveillees.length > 0 ? (
				<Surface
					variant="transparent"
					outline={false}
					className="verre-carte rounded-cladd-xl"
					contentClassName="flex gap-cladd-3xs p-cladd-2xs"
				>
					<AlertTriangleIcon className="mt-1 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
					<div className="flex min-w-0 flex-col gap-1.5">
						<p className="text-cladd-xs font-semibold">
							Ces chiffres ne couvrent pas {bilan.nonSurveillees.length} facture
							{pluriel(bilan.nonSurveillees.length)}
						</p>
						<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
							{bilan.nonSurveillees.join(', ')} —{' '}
							{bilan.nonSurveillees.length > 1
								? 'leurs dates limites pour agir en justice n’ont pas pu être établies, elles ne sont donc comptées ni d’un côté ni de l’autre.'
								: 'sa date limite pour agir en justice n’a pas pu être établie, elle n’est donc comptée ni d’un côté ni de l’autre.'}
						</p>
					</div>
				</Surface>
			) : null}
		</div>
	);
}
