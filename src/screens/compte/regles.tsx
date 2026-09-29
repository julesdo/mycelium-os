import { Segmented, SegmentedButton, SectionTitle } from '@cladd-ui/react';
import { BoutonPrincipal, MessageErreur } from '../../ui';
import type { ResumeDeSection } from './presse';

/**
 * VOS RÈGLES DE CALCUL — posées une fois, valables sur tous vos dossiers.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CETTE SECTION EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'ordre d'imputation des paiements dépend des CONDITIONS GÉNÉRALES du
 * créancier : il est le même sur ses dix-sept dossiers. Il était pourtant
 * demandé dossier par dossier (audit du 29/09/2026, F2), et c'est exactement
 * la question que le produit ne devrait poser qu'une fois.
 *
 * ⚠️ « PAS CHOISI » RESTE UNE RÉPONSE, ET C'EST LA PLUS PRUDENTE. Sans réglage,
 * le décompte chiffre les DEUX ordres et retient le plus bas : le doute ne
 * profite jamais au produit. La troisième position n'est donc pas un « vide »,
 * c'est l'état par défaut, et elle le dit.
 *
 * ⚠️ ET CE RÉGLAGE NE RÉÉCRIT AUCUN DOSSIER. Un dossier qui a son propre ordre
 * le garde ; un décompte déjà arrêté garde celui de son jour. C'est écrit ici
 * parce que le gérant ne peut pas le deviner.
 */

export type OrdreParDefaut = 'PENALITES_DABORD' | 'PRINCIPAL_DABORD' | null;

export interface ReglesAffichees {
	readonly ordre: OrdreParDefaut;
	readonly delaiJours: number | null;
	readonly enregistrement: 'REPOS' | 'EN_COURS' | { readonly erreur: string };
	readonly onChoisirOrdre: (ordre: OrdreParDefaut) => void;
	readonly onChoisirDelai: (jours: number | null) => void;
	readonly onEnregistrer: () => void;
}

const ORDRES: readonly { readonly valeur: OrdreParDefaut; readonly libelle: string }[] = [
	{ valeur: null, libelle: 'Pas choisi' },
	{ valeur: 'PENALITES_DABORD', libelle: 'Les pénalités d’abord' },
	{ valeur: 'PRINCIPAL_DABORD', libelle: 'Les factures d’abord' }
];

const DELAIS: readonly (number | null)[] = [null, 8, 15, 30];

const LIBELLE_ORDRE: Record<'PENALITES_DABORD' | 'PRINCIPAL_DABORD', string> = {
	PENALITES_DABORD: 'Les pénalités d’abord',
	PRINCIPAL_DABORD: 'Les factures d’abord'
};

export function resumeRegles(regles: ReglesAffichees): ResumeDeSection {
	return {
		valeur: regles.ordre === null ? 'Pas choisi' : LIBELLE_ORDRE[regles.ordre],
		legende: 'Ce que vos conditions générales disent, pour tous vos dossiers.'
	};
}

export function SectionRegles({
	ordre,
	delaiJours,
	enregistrement,
	onChoisirOrdre,
	onChoisirDelai,
	onEnregistrer
}: ReglesAffichees) {
	return (
		<div className="flex flex-col gap-cladd-2xs">
			<div>
				<SectionTitle>Ce que remboursent les paiements reçus</SectionTitle>
				<Segmented
					className="mt-cladd-3xs"
					activeColor="neutral"
					activeVariant="solid"
					aria-label="Ordre d’imputation par défaut"
				>
					{ORDRES.map((o) => (
						<SegmentedButton
							key={o.libelle}
							active={o.valeur === ordre}
							onClick={() => onChoisirOrdre(o.valeur)}
						>
							{o.libelle}
						</SegmentedButton>
					))}
				</Segmented>
				<p className="mt-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					La loi prévoit les pénalités d’abord, sauf si vos conditions générales disent
					autrement. Tant que vous n’avez pas choisi, chaque dossier chiffre les deux et
					retient le calcul le plus bas.
				</p>
				<p className="mt-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-softer">
					Ce réglage ne touche aucun dossier qui a déjà le sien, et aucun décompte déjà
					arrêté : ceux-là gardent l’ordre de leur jour.
				</p>
			</div>

			<div>
				<SectionTitle>Le délai proposé d’office sur une lettre de relance</SectionTitle>
				<Segmented
					className="mt-cladd-3xs"
					activeColor="neutral"
					activeVariant="solid"
					aria-label="Délai proposé d’office"
				>
					{DELAIS.map((j) => (
						<SegmentedButton
							key={String(j)}
							active={j === delaiJours}
							onClick={() => onChoisirDelai(j)}
						>
							{j === null ? 'Pas choisi' : `${j} jours`}
						</SegmentedButton>
					))}
				</Segmented>
				<p className="mt-cladd-3xs text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Aucun texte n’impose de délai à une lettre de relance : c’est celui que vous
					accordez d’habitude. Il reste modifiable sur chaque lettre.
				</p>
			</div>

			{typeof enregistrement === 'object' ? (
				<MessageErreur>{enregistrement.erreur}</MessageErreur>
			) : null}

			<BoutonPrincipal
				className="self-start"
				disabled={enregistrement === 'EN_COURS'}
				onClick={onEnregistrer}
			>
				{enregistrement === 'EN_COURS' ? 'Enregistrement…' : 'Enregistrer ces règles'}
			</BoutonPrincipal>
		</div>
	);
}
