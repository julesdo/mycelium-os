import { Surface } from '@cladd-ui/react';
import { LigneDeReleve, ListeDeReleve } from './carte-rangee';
import { cn } from './cn';

/**
 * L'HABITUDE DE PAIEMENT D'UN DÉBITEUR, ET CE QUI EN SORT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE BLOC NE RECOMMANDE RIEN, ET SA FORME LE GARANTIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Troisième ligne rouge du produit : on ne recommande jamais une démarche. Le
 * piège est réel ici — « ce client a rompu son habitude » appelle naturellement
 * un « relancez-le » qui serait du conseil.
 *
 * D'où deux choix de forme :
 *
 *   · le constat est une PHRASE COMPLÈTE, rendue par le domaine, refaisable à
 *     la main. Elle porte des nombres et un fait. L'écran ne la reformule pas
 *     et n'y ajoute rien — il n'a aucun moyen d'y glisser un verbe d'action ;
 *   · aucun bouton n'est posé à côté. Un bouton transformerait le constat en
 *     amorce de procédure, ce que ce produit ne fait pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET L'HABITUDE INCONNUE S'AFFICHE AUSSI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Ce que le logiciel ne voit pas s'affiche aussi » — la règle du produit.
 * Sur un débiteur sans historique suffisant, le bloc ne disparaît pas : il dit
 * qu'il ne sait pas encore, et pourquoi. Le masquer laisserait croire que ce
 * client n'a jamais rompu son habitude, alors qu'on n'en sait rien.
 *
 * C'est exactement la différence entre « aucune rupture » et « aucune mesure »,
 * et c'est la seule chose que ce bloc doit rendre impossible à confondre.
 */

export type HabitudeAffichee =
	| { readonly connue: false; readonly raison: string }
	| {
			readonly connue: true;
			readonly delaiMedianJours: number;
			readonly echantillon: number;
			readonly dispersionJours: number;
	  };

export interface RuptureAffichee {
	readonly reference: string;
	readonly habituelJours: number;
	readonly ecartJours: number;
	readonly constat: string;
}

/*
 * ⚠️ `HabitudePaiement` A ÉTÉ RETIRÉ LE 07/10/2026 : la phrase « règle 12 jours
 * après l'échéance, sur 9 règlements » dans une feuille est devenue le dessin
 * `RythmeDePaiement`, sur la fiche même. Il n'avait plus d'autre appelant.
 */

/** Un règlement qui a établi l'habitude : son délai, de l'exigibilité au paiement. */
export interface PaiementAffiche {
	readonly reference: string;
	readonly datePaiement: string;
	/** En jours. Négatif quand le client a payé en avance. */
	readonly delaiJours: number;
}

/** Une facture encore due et déjà exigible, avec son retard au jour dit. */
export interface RetardEnCours {
	readonly reference: string;
	readonly retardJours: number;
}

/** « 12 j », « 3 j d'avance » : la valeur d'une tuile, en un coup d'œil. */
function joursCourts(jours: number): string {
	const arrondi = Math.round(jours);
	return arrondi < 0 ? `${Math.abs(arrondi)} j d’avance` : `${arrondi} j`;
}

/**
 * LE RYTHME DE PAIEMENT D'UN CLIENT, DESSINÉ — sur sa fiche, sans rien ouvrir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI MANQUAIT (relevé du 07/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'habitude d'un client vivait dans une feuille, en une phrase : « règle 12
 * jours après l'échéance, sur 9 règlements ». Chez Origin, Copilot ou Apple
 * Wallet, la page d'un commerçant pose son historique en BARRES, avec trois ou
 * quatre chiffres en tuiles. Une médiane se croit ; une rangée de barres se voit
 * — et une facture qui sort du rythme dépasse au premier regard, ce qu'aucune
 * phrase ne fait.
 *
 * Une barre par règlement (le délai, de l'exigibilité au paiement), puis une
 * barre PLEINE par facture encore due (son retard aujourd'hui), et une ligne en
 * pointillé à la hauteur de son habitude. Rien n'y est calculé ici : les délais,
 * les retards et la médiane viennent du domaine (`comportement.ts`).
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL : l'encre, légère pour ce qui est réglé, pleine pour
 * ce qui court. Ce n'est pas un verdict, c'est un relevé de dates.
 */
export function RythmeDePaiement({
	habitude,
	ruptures,
	historique,
	enCours
}: {
	readonly habitude: HabitudeAffichee;
	readonly ruptures: readonly RuptureAffichee[];
	readonly historique: readonly PaiementAffiche[];
	readonly enCours: readonly RetardEnCours[];
}) {
	const barres = [
		...historique.map((paiement) => ({
			cle: `r-${paiement.reference}`,
			reference: paiement.reference,
			jours: paiement.delaiJours,
			court: false
		})),
		...enCours.map((retard) => ({
			cle: `c-${retard.reference}`,
			reference: retard.reference,
			jours: retard.retardJours,
			court: true
		}))
	];
	const mediane = habitude.connue ? habitude.delaiMedianJours : null;
	// L'échelle : la plus haute barre, l'habitude avec de l'air au-dessus, et au
	// moins un mois — sans quoi trois règlements à deux jours rempliraient la hauteur.
	const plafond = Math.max(30, ...barres.map((barre) => barre.jours), (mediane ?? 0) * 1.5);
	const resume =
		barres.length === 0
			? ''
			: `${historique.length} règlement${historique.length > 1 ? 's' : ''}` +
				(enCours.length === 0
					? ''
					: `, ${enCours.length} facture${enCours.length > 1 ? 's' : ''} encore due${enCours.length > 1 ? 's' : ''}`) +
				(mediane === null ? '' : `, habitude ${joursCourts(mediane)}`);

	return (
		<div className="flex flex-col gap-cladd-3xs">
			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				contentClassName="flex flex-col gap-3 p-3.5"
			>
				{barres.length === 0 ? null : (
					<>
						<div role="img" aria-label={resume} className="relative h-28">
							{mediane === null ? null : (
								<div
									aria-hidden
									className="absolute inset-x-0 border-t border-dashed border-cladd-fg/35"
									style={{ bottom: `${(Math.max(0, mediane) / plafond) * 100}%` }}
								>
									<span className="absolute right-0 bottom-0.5 text-cladd-4xs text-cladd-fg-soft">
										habitude {joursCourts(mediane)}
									</span>
								</div>
							)}
							<div className="flex h-full items-end gap-1">
								{barres.map((barre) => (
									<span
										key={barre.cle}
										title={`${barre.reference} : ${joursCourts(barre.jours)}`}
										className={cn(
											'min-h-0.5 max-w-6 flex-1 rounded-t-sm',
											barre.court ? 'bg-cladd-fg' : 'bg-cladd-fg/25'
										)}
										// La seule division est ici, pour l'œil : une hauteur.
										style={{ height: `${(Math.max(0, barre.jours) / plafond) * 100}%` }}
									/>
								))}
							</div>
						</div>
						<p aria-hidden className="flex items-center gap-3 text-cladd-4xs text-cladd-fg-soft">
							<span className="flex items-center gap-1">
								<span className="size-1.5 rounded-full bg-cladd-fg/25" /> réglées
							</span>
							{enCours.length === 0 ? null : (
								<span className="flex items-center gap-1">
									<span className="size-1.5 rounded-full bg-cladd-fg" /> encore dues
								</span>
							)}
						</p>
					</>
				)}

				{habitude.connue ? (
					<dl className="grid grid-cols-3 gap-2 border-t border-cladd-outline pt-3">
						{[
							['Délai habituel', joursCourts(habitude.delaiMedianJours)],
							['Règlements', String(habitude.echantillon)],
							['Écart habituel', `± ${Math.round(habitude.dispersionJours)} j`]
						].map(([terme, valeur]) => (
							<div key={terme} className="flex min-w-0 flex-col-reverse gap-0.5">
								<dt className="text-cladd-3xs text-cladd-fg-soft">{terme}</dt>
								<dd className="text-cladd-xs font-semibold tabular-nums">{valeur}</dd>
							</div>
						))}
					</dl>
				) : (
					// L'inconnu se dit, il ne se masque pas : « aucune rupture » et
					// « aucune mesure » ne doivent jamais se confondre.
					<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">{habitude.raison}</p>
				)}
			</Surface>

			{ruptures.length === 0 ? (
				habitude.connue ? (
					<p className="px-1 text-cladd-2xs text-cladd-fg-softer">
						Aucun de ses impayés ne sort de cette habitude.
					</p>
				) : null
			) : (
				<ListeDeReleve>
					{ruptures.map((rupture) => (
						// LE CONSTAT VIENT DU DOMAINE, MOT POUR MOT : aucun verbe d'action n'y
						// entre, et un test du module le vérifie.
						<LigneDeReleve
							key={rupture.reference}
							titre={rupture.reference}
							montant={`+${rupture.ecartJours} j`}
							ligne={rupture.constat}
							retour
						/>
					))}
				</ListeDeReleve>
			)}
		</div>
	);
}
