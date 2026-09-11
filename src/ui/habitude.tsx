import { Surface } from '@cladd-ui/react';
import { ActivityIcon, TrendingUpIcon } from 'lucide-react';
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

/** Le délai habituel, écrit comme un gérant le dit. */
function delaiLisible(jours: number): string {
	const arrondi = Math.round(jours);
	if (arrondi === 0) return 'le jour de l’échéance';
	if (arrondi < 0) return `${Math.abs(arrondi)} jour${Math.abs(arrondi) > 1 ? 's' : ''} en avance`;
	return `${arrondi} jour${arrondi > 1 ? 's' : ''} après l’échéance`;
}

export function HabitudePaiement({
	habitude,
	ruptures,
	className
}: {
	habitude: HabitudeAffichee;
	ruptures: readonly RuptureAffichee[];
	className?: string;
}) {
	return (
		<Surface
			as="section"
			variant="transparent"
			outline={false}
			className={cn('verre-carte rounded-cladd-xl', className)}
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<div className="flex items-center gap-cladd-3xs">
				<span className="verre flex size-cladd-sm shrink-0 items-center justify-center rounded-full">
					<ActivityIcon size={18} aria-hidden />
				</span>
				<div className="flex min-w-0 flex-col gap-0.5">
					<h2 className="text-cladd-xs font-semibold">Son habitude de paiement</h2>
					{habitude.connue ? (
						<p className="text-cladd-2xs text-cladd-fg-soft">
							Règle {delaiLisible(habitude.delaiMedianJours)}, sur {habitude.echantillon} règlements
							observés
						</p>
					) : (
						// L'inconnu se dit, il ne se masque pas : « aucune rupture » et
						// « aucune mesure » ne doivent jamais se confondre.
						<p className="text-cladd-2xs text-cladd-fg-softer">{habitude.raison}</p>
					)}
				</div>
			</div>

			{ruptures.length > 0 ? (
				<div className="flex flex-col gap-1.5">
					{ruptures.map((rupture) => (
						<div
							key={rupture.reference}
							className="verre-carte flex gap-cladd-3xs rounded-cladd-lg p-cladd-3xs"
						>
							<TrendingUpIcon className="mt-0.5 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
							<div className="flex min-w-0 flex-col gap-0.5">
								<span className="text-cladd-2xs font-semibold">{rupture.reference}</span>
								{/*
								  LE CONSTAT VIENT DU DOMAINE, MOT POUR MOT. L'écran ne le
								  reformule pas : c'est ce qui garantit qu'aucun verbe d'action
								  n'y entre, et un test du module le vérifie.
								*/}
								<span className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
									{rupture.constat}
								</span>
							</div>
						</div>
					))}
				</div>
			) : habitude.connue ? (
				<p className="text-cladd-2xs text-cladd-fg-softer">
					Aucun de ses impayés ne sort de cette habitude.
				</p>
			) : null}
		</Surface>
	);
}
