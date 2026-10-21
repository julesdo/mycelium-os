import { Switch } from '@cladd-ui/react';
import { BellRingIcon, ShareIcon, SquarePlusIcon } from 'lucide-react';
import type { CategoriePush } from '../lib/notifications/categories';
import { BoutonPrincipal, BoutonSecondaire, BoutonTexte } from './bouton';
import { FeuillePleinEcran } from './plein-ecran';

/**
 * LES NOTIFICATIONS PUSH, À L'ÉCRAN (21/10/2026, le parcours de l'habitude).
 *
 * Deux surfaces, et aucune autre :
 *
 *   · les RÉGLAGES, dans le profil : l'appareil (activer, couper), puis une ligne par
 *     catégorie avec son interrupteur, comme les Réglages d'iOS — jamais type par type ;
 *   · la FEUILLE qui explique avant de demander (ChatGPT, Strava) : ce qui arrivera,
 *     puis le geste qui ouvre la demande du système. Sur iPhone hors de l'écran
 *     d'accueil, elle dit comment y ajouter Letikette : le push n'y vit qu'installé.
 *
 * La permission ne se demande jamais au lancement : sous la célébration de la première
 * relance, ou depuis le profil.
 */

/** Ce que l'appareil permet (`app/push.ts`). */
export type EtatDuPush = 'INDISPONIBLE' | 'A_INSTALLER' | 'REFUSE' | 'POSSIBLE' | 'ACTIF';

export interface CategorieAffichee {
	readonly categorie: CategoriePush;
	readonly nom: string;
	readonly aide: string;
	readonly active: boolean;
}

export interface PushAffiche {
	readonly etat: EtatDuPush;
	readonly enCours: boolean;
	readonly categories: readonly CategorieAffichee[];
	readonly onActiver: () => void;
	readonly onCouper: () => void;
	readonly onRegler: (categorie: CategoriePush, active: boolean) => void;
}

const DIT_L_APPAREIL: Readonly<Record<EtatDuPush, string>> = {
	ACTIF: 'Activées sur cet appareil.',
	POSSIBLE: 'Un paiement, une question, votre semaine : prévenu ici, même application fermée.',
	A_INSTALLER:
		'Sur iPhone, les notifications arrivent dans l’application ajoutée à l’écran d’accueil.',
	REFUSE: 'Refusées pour ce site dans les réglages du navigateur : c’est là qu’elles se rouvrent.',
	INDISPONIBLE: 'Ce navigateur ne reçoit pas de notifications. La boîte de réception garde tout.'
};

/** Les réglages du push, dans le profil. */
export function ReglagesDuPush({
	etat,
	enCours,
	categories,
	onActiver,
	onCouper,
	onRegler
}: PushAffiche) {
	return (
		<div className="flex flex-col gap-cladd-2xs">
			<div className="flex flex-col gap-cladd-3xs">
				<p className="text-cladd-xs">Sur cet appareil</p>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{DIT_L_APPAREIL[etat]}</p>
				{etat === 'POSSIBLE' ? (
					<BoutonSecondaire className="self-start" loading={enCours} onClick={onActiver}>
						<BellRingIcon />
						Activer les notifications
					</BoutonSecondaire>
				) : etat === 'ACTIF' ? (
					<BoutonTexte className="self-start" loading={enCours} onClick={onCouper}>
						Les couper sur cet appareil
					</BoutonTexte>
				) : null}
			</div>
			{etat === 'ACTIF' ? (
				<div className="flex flex-col gap-cladd-3xs">
					{categories.map((c) => (
						<label key={c.categorie} className="flex min-h-11 items-center justify-between gap-3">
							<span className="flex min-w-0 flex-col">
								<span className="text-cladd-xs">{c.nom}</span>
								<span className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{c.aide}</span>
							</span>
							<Switch
								checked={c.active}
								onChange={(active: boolean) => onRegler(c.categorie, active)}
							/>
						</label>
					))}
				</div>
			) : null}
		</div>
	);
}

/**
 * LA FEUILLE QUI EXPLIQUE AVANT DE DEMANDER. Le système ne pose sa question qu'une fois :
 * refusée, elle ne se repose plus. On dit donc d'abord ce qui arrivera, et c'est le geste
 * du gérant qui déclenche la demande.
 */
export function FeuilleDuPush({
	ouverte,
	onFermer,
	etat,
	enCours,
	onActiver
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly etat: EtatDuPush;
	readonly enCours: boolean;
	readonly onActiver: () => void;
}) {
	const installer = etat === 'A_INSTALLER';
	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre="Être prévenu"
			pied={
				installer ? (
					<BoutonPrincipal pleineLargeur onClick={onFermer}>
						Compris
					</BoutonPrincipal>
				) : (
					<>
						<BoutonPrincipal
							pleineLargeur
							loading={enCours}
							disabled={etat !== 'POSSIBLE'}
							onClick={onActiver}
						>
							Activer les notifications
						</BoutonPrincipal>
						<BoutonTexte className="self-center" onClick={onFermer}>
							Plus tard
						</BoutonTexte>
					</>
				)
			}
		>
			<div className="flex flex-col items-center gap-cladd-2xs px-1 pt-cladd-xs text-center">
				<span className="flex size-14 items-center justify-center rounded-full bg-cladd-primary/12 text-cladd-primary [&_svg]:size-6">
					<BellRingIcon />
				</span>
				<p className="text-cladd-sm font-bold">Quand un client paie, vous le savez.</p>
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Un paiement, une question qui attend votre réponse, votre semaine le lundi. Vous
					choisissez ce qui arrive, une catégorie à la fois, dans votre profil.
				</p>
			</div>
			<div className="verre-carte flex items-center gap-3 rounded-cladd-xl px-3.5 py-3">
				<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-cladd-fg text-cladd-2xs font-bold text-cladd-bg">
					L
				</span>
				<span className="flex min-w-0 flex-col text-left">
					<span className="text-cladd-2xs font-semibold">Garage Martin vous a payé</span>
					<span className="text-cladd-2xs text-cladd-fg-soft">
						1 240 € rapprochés sur ses factures.
					</span>
				</span>
			</div>
			{installer ? (
				<ol className="flex flex-col gap-cladd-3xs px-1 text-cladd-xs leading-relaxed">
					<li className="flex items-center gap-2">
						<ShareIcon className="size-4 shrink-0" />
						Touchez « Partager » dans Safari.
					</li>
					<li className="flex items-center gap-2">
						<SquarePlusIcon className="size-4 shrink-0" />
						Choisissez « Sur l’écran d’accueil », puis ouvrez Letikette depuis son icône.
					</li>
				</ol>
			) : etat === 'REFUSE' ? (
				<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					{DIT_L_APPAREIL.REFUSE}
				</p>
			) : null}
		</FeuillePleinEcran>
	);
}
