import { Chip, Surface, SurfaceCut } from '@cladd-ui/react';
import { AlertTriangleIcon, InfoIcon } from 'lucide-react';
import { eurosCentimes } from './format';

/**
 * Le flux de surveillance — l'écran qui donne une raison d'ouvrir le produit.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE MONTANT EST LA COLONNE QUI COMMANDE LA LECTURE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Chaque événement porte un montant, et il est posé en grand, à droite, aligné.
 * Ce n'est pas de la décoration : un gérant arbitre entre 12 000 € et 300 €, pas
 * entre « facture échue » et « échéance proche ». Une file d'alertes sans
 * montants est une liste de tâches, et une liste de tâches se referme.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SUR LE ROUGE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `CLAUDE.md` réserve `--color-seuil-*` — vert, rouge, ambre — au seul sens
 * « au-dessus du seuil, tout près, en dessous », et interdit qu'un élément
 * décoratif les porte. Les puces d'urgence ci-dessous utilisent les accents
 * CLADD (`color="red"`), qui sont d'autres jetons, et elles ne sont pas
 * décoratives : elles disent qu'un droit va s'éteindre. La réserve tient.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE LE PRODUIT NE SAIT PAS S'AFFICHE AUSSI
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `hypotheses` et `anglesMorts` ne sont pas relégués en bas de page en petit.
 * Un gérant qui croit sa prescription surveillée ne la surveille pas lui-même,
 * et c'est la seule échéance qui éteint une créance sans que personne n'ait
 * rien fait.
 */

export type UrgenceEvenement = 'CRITIQUE' | 'HAUTE' | 'NORMALE';

export interface EvenementAffiche {
	readonly type: string;
	readonly reference: string;
	readonly montant: bigint | null;
	readonly urgence: UrgenceEvenement;
	readonly explication: string;
	readonly action: string;
}

const LIBELLE_URGENCE: Record<UrgenceEvenement, string> = {
	CRITIQUE: 'Critique',
	HAUTE: 'À traiter',
	NORMALE: 'À suivre'
};

const ACCENT_URGENCE: Record<UrgenceEvenement, 'red' | 'orange' | 'neutral'> = {
	CRITIQUE: 'red',
	HAUTE: 'orange',
	NORMALE: 'neutral'
};

function LigneEvenement({ evenement }: { evenement: EvenementAffiche }) {
	return (
		<Surface contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs sm:flex-row sm:items-start sm:justify-between">
			<div className="flex min-w-0 flex-col gap-1.5">
				<div className="flex flex-wrap items-center gap-1.5">
					<Chip size="md" color={ACCENT_URGENCE[evenement.urgence]}>
						{LIBELLE_URGENCE[evenement.urgence]}
					</Chip>
					<span className="text-cladd-xs font-semibold">{evenement.reference}</span>
				</div>

				<p className="text-cladd-sm text-cladd-fg">{evenement.explication}</p>

				{/* L'action au bout. Signaler sans dire quoi faire déplace la charge
				    sur le lecteur au lieu de la lui retirer. */}
				<p className="text-cladd-xs text-cladd-fg-soft">{evenement.action}</p>
			</div>

			{evenement.montant === null ? null : (
				<p className="shrink-0 text-letikette-chiffre font-bold tabular-nums sm:text-right">
					{eurosCentimes(evenement.montant)}
				</p>
			)}
		</Surface>
	);
}

export function FluxEvenements({
	evenements,
	montantIdentifie,
	hypotheses,
	anglesMorts
}: {
	evenements: readonly EvenementAffiche[];
	montantIdentifie: bigint;
	hypotheses: readonly string[];
	anglesMorts: readonly string[];
}) {
	return (
		<div className="flex flex-col gap-cladd-xs">
			{/* Le compteur cumulé : ce que le produit a permis d'identifier. C'est
			    la seule réponse qui décide du renouvellement de l'abonnement. */}
			<SurfaceCut contentClassName="flex flex-wrap items-baseline justify-between gap-cladd-3xs p-cladd-2xs">
				<span className="text-cladd-sm text-cladd-fg-soft">
					Repéré sur vos factures et vos dossiers
				</span>
				<span className="text-letikette-titre font-bold tabular-nums">
					{eurosCentimes(montantIdentifie)}
				</span>
			</SurfaceCut>

			<div className="flex flex-col gap-cladd-3xs">
				{evenements.map((evenement) => (
					<LigneEvenement
						key={`${evenement.type}-${evenement.reference}`}
						evenement={evenement}
					/>
				))}
			</div>

			{hypotheses.length > 0 ? (
				<Surface contentClassName="flex gap-cladd-3xs p-cladd-2xs">
					<InfoIcon className="mt-1 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
					<div className="flex min-w-0 flex-col gap-1.5">
						<p className="text-cladd-xs font-semibold">Ce que le logiciel a supposé</p>
						{hypotheses.map((hypothese) => (
							<p key={hypothese} className="text-cladd-xs text-cladd-fg-soft">
								{hypothese}
							</p>
						))}
					</div>
				</Surface>
			) : null}

			{anglesMorts.length > 0 ? (
				<Surface contentClassName="flex gap-cladd-3xs p-cladd-2xs">
					<AlertTriangleIcon className="mt-1 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
					<div className="flex min-w-0 flex-col gap-1.5">
						<p className="text-cladd-xs font-semibold">Ce que le logiciel ne surveille pas</p>
						{anglesMorts.map((angle) => (
							<p key={angle} className="text-cladd-xs text-cladd-fg-soft">
								{angle}
							</p>
						))}
					</div>
				</Surface>
			) : null}
		</div>
	);
}
