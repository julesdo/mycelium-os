import { Surface, Chip } from '@cladd-ui/react';
import type { PalierTaille } from '../../lib/config/tarifs';
import { SectionEcran, euros } from '../../ui';
import { Offre, OuvertureEnCours, EssaiEnCours } from './offre';

/** Ce que la section affiche : l'état d'abonnement tel que `etatAbonnement` le rend, palier et tarifs résolus par le serveur. */
export interface AbonnementAffiche {
	readonly tier: string;
	readonly isDev: boolean;
	readonly palier: PalierTaille;
	readonly bornesPalier: string;
	readonly facturesParAn: number | null;
	readonly tarifs: { readonly bilan: number; readonly abonnementMensuel: number };
	readonly seatsAllowed: number;
	readonly paddleStatus: string | null;
	readonly paddleConfigure: boolean;
	readonly essaiFiniLe: number | null;
}

/**
 * LA FACTURATION — l'état d'abonnement et les deux offres, dépliés.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TROIS ADRESSES SONT DEVENUES UNE SECTION, ET LES OFFRES SE DÉPLIENT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `/app/abonnement` portait deux rangées qui poussaient vers `/app/abonnement/
 * premier-bilan` et `/app/abonnement/suivi`, chacune une page pour une carte.
 * Le raisonnement d'alors — « on ne compare pas deux offres en faisant
 * défiler » — visait un écran qui les empilait sous un inventaire ; ici, elles
 * se rangent CÔTE À CÔTE au-delà de 768 px, ce que la comparaison demandait, et
 * l'une sous l'autre en dessous, ce qu'un téléphone impose de toute façon.
 *
 * LE PALIER VIENT DU SERVEUR. Le prix dépend du nombre de factures émises par
 * an (`palierDeTaille(facturesParAn)`), et un palier calculé dans le navigateur
 * se falsifie pour payer le tarif d'en dessous. La requête `etatAbonnement` le
 * renvoie déjà résolu, avec le tarif correspondant.
 *
 * ⚠️ IL NE PROMET PAS UN BOUTON QUI NE MARCHE PAS. Tant que `paddleConfigure`
 * vaut faux, la section dit franchement où en est l'ouverture, en quatre
 * parties (voir `OuvertureEnCours`), au lieu d'afficher un bouton qui
 * échouerait au clic.
 *
 * ⚠️ ET LA FRONTIÈRE PADDLE EST ÉCRITE À L'ÉCRAN, PAS SEULEMENT DANS LA SPEC.
 * Le parcours de paiement appartient au prestataire : il sort de la grammaire
 * de ce produit, et le dire vaut mieux que réimplémenter un tunnel qu'on ne
 * contrôle pas.
 */
export function SectionFacturation({ abonnement }: { abonnement: AbonnementAffiche | null }) {
	if (abonnement === null) {
		return (
			<SectionEcran titre="Facturation">
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Aucun établissement actif : il n’y a pas d’offre à calculer.
				</p>
			</SectionEcran>
		);
	}

	const abonne = abonnement.paddleStatus === 'active' || abonnement.paddleStatus === 'trialing';

	return (
		<SectionEcran
			titre="Facturation"
			legende={`Palier ${abonnement.palier} — ${abonnement.bornesPalier}`}
		>
			<EtatCourant etat={abonnement} abonne={abonne} />

			{abonnement.essaiFiniLe && !abonne ? <EssaiEnCours finLe={abonnement.essaiFiniLe} /> : null}

			<div className="flex flex-wrap items-center gap-cladd-3xs">
				<Chip color="brand" size="md">
					Palier {abonnement.palier}
				</Chip>
				<span className="text-cladd-sm text-cladd-fg-soft">{abonnement.bornesPalier}</span>
			</div>
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-softer">
				{abonnement.facturesParAn
					? `Déterminé à partir des ${abonnement.facturesParAn} factures par an déclarées pour votre établissement.`
					: 'Votre volume de factures n’est pas renseigné : le palier le plus bas est retenu par défaut.'}{' '}
				Le produit est le même à tous les paliers ; seul le prix change. Le volume déclaré se
				corrige dans la section « Votre établissement », plus haut sur cette page.
			</p>

			{/*
			  ⚠️ DEUX CARTES CÔTE À CÔTE, ET PAS DEUX RANGÉES QUI POUSSENT. C'est le
			  seul endroit du produit où deux choses se COMPARENT ligne à ligne : la
			  grille de ce qui est inclus est identique d'une carte à l'autre, et
			  c'est sa colonne qui change.
			*/}
			<div className="grid grid-cols-1 gap-cladd-2xs md:grid-cols-2">
				<Offre
					titre="Le premier bilan"
					prix={euros(abonnement.tarifs.bilan)}
					cadence="une fois"
					description="Douze mois de factures lus en une fois. Vous saurez où vous en êtes, et ce qu’il manque, en euros."
					colonne="bilan"
					actif={abonnement.tier === 'suivi'}
				/>
				<Offre
					titre="L’abonnement"
					prix={euros(abonnement.tarifs.abonnementMensuel)}
					cadence="par mois"
					description="Vos échéances surveillées toute l’année : ce qui arrive à terme, ce qui devient mûr, ce qui approche de la prescription."
					colonne="abonnement"
					actif={abonnement.tier === 'procedures'}
					recommande
				/>
			</div>

			{abonnement.paddleConfigure ? null : <OuvertureEnCours />}

			<p className="text-cladd-xs leading-relaxed text-cladd-fg-softer">
				Prix hors taxes. La facturation est opérée par Paddle, qui émet la facture et collecte la
				TVA applicable à votre pays. Le parcours de paiement, la carte et la résiliation
				appartiennent à Paddle : ils s’ouvrent chez lui, dans sa langue et sa mise en page, parce
				que ce qui appartient au prestataire sort de la grammaire de ce produit.
			</p>
		</SectionEcran>
	);
}

function EtatCourant({
	etat,
	abonne
}: {
	etat: { tier: string; isDev: boolean; seatsAllowed: number };
	abonne: boolean;
}) {
	if (etat.isDev) {
		return (
			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
			>
				<span className="text-cladd-sm font-bold">Accès de développement</span>
				<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Aucune clé Paddle n&rsquo;est configurée sur ce déploiement : toutes les fonctionnalités
					sont ouvertes.
				</span>
			</Surface>
		);
	}

	if (abonne) {
		return (
			<Surface
				variant="transparent"
				outline={false}
				className="verre-carte rounded-cladd-xl"
				contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
			>
				<span className="text-cladd-sm font-bold">Votre abonnement est actif.</span>
				<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Jusqu&rsquo;à {etat.seatsAllowed} personnes peuvent accéder à votre établissement.
				</span>
			</Surface>
		);
	}

	return null;
}
