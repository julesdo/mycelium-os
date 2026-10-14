import type { ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';
import type { PalierTaille } from '../../lib/config/tarifs';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	BoutonTexte,
	RefusEnQuatreParties,
	euros
} from '../../ui';
import { Offre, OuvertureEnCours, EssaiEnCours } from './offre';
import { etatDeLaFacturation, type CauseDeFermeture, type EtatFacturation } from './presse';

/** Ce que la section affiche : l'état d'abonnement tel que `etatAbonnement` le rend, palier et tarifs résolus par le serveur. */
export interface AbonnementAffiche {
	/**
	 * Le palier EFFECTIF, celui que `resolveEffectivePlan` rend — pas le plan
	 * souscrit. Il dit ce qui est ouvert ; `paddleStatus` dit pourquoi.
	 */
	readonly tier: string;
	readonly isDev: boolean;
	readonly palier: PalierTaille;
	readonly bornesPalier: string;
	readonly facturesParAn: number | null;
	readonly tarifs: { readonly bilan: number; readonly abonnementMensuel: number };
	readonly seatsAllowed: number;
	readonly paddleStatus: string | null;
	/** La facturation est ouverte sur ce déploiement (`paiementOuvert`, `billing.ts`). */
	readonly paiementOuvert: boolean;
	/** Le premier bilan, payé une fois : le jour où Paddle l'a encaissé. */
	readonly bilanRegleLe: number | null;
	/** Paddle connaît déjà l'établissement : le portail (carte, factures, résiliation) s'ouvre. */
	readonly clientPaddle: boolean;
	readonly essaiFiniLe: number | null;
	/*
	  ⚠️ `paddleCurrentPeriodEnd` N'EST PAS ICI, ET C'EST DÉLIBÉRÉ.
	  `etatAbonnement` le renvoie, et il est tentant de l'afficher sur un
	  abonnement résilié — « votre accès se ferme le … ». Ce serait FAUX :
	  `resolveEffectivePlan` ne le lit pas. Dès que `paddleStatus` quitte
	  `active`/`trialing`, le palier tombe TOUT DE SUITE sur l'essai s'il court,
	  sur `none` sinon. La fin de période ne protège rien, et l'écrire
	  promettrait un sursis qui n'existe pas.
	*/
}

/**
 * LA FACTURATION — l'état d'abonnement et les deux offres.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TROIS ÉTATS N'AVAIENT AUCUN AFFICHAGE, ET C'ÉTAIT LE DÉFAUT LE PLUS GRAVE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'ancienne carte d'état ne connaissait que deux cas : « accès de
 * développement » et « abonnement actif ». Un abonnement `past_due`, `paused`
 * ou `canceled` — les trois que les rappels Paddle écrivent réellement
 * (`paddle.ts`) — rendait `null` : la section affichait les deux offres comme à
 * un visiteur qui n'aurait jamais rien souscrit, et RIEN ne disait que le
 * dernier paiement avait échoué. Un abonnement qui se ferme est exactement ce
 * qu'une page de réglages doit montrer sans qu'on la fouille.
 *
 * L'état se déduit maintenant de `tier` ET de `paddleStatus`, au même endroit
 * que le bandeau « Ce qui presse » et que la valeur de la rangée repliée
 * (`presse.tsx`) : les trois ne peuvent plus se contredire.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ « EN COURS » NE SE POSE PLUS SUR UN ESSAI GRATUIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les puces disaient `actif={tier === 'suivi'}` et `actif={tier === 'procedures'}`.
 * Or `resolveEffectivePlan` rend `procedures` PENDANT L'ESSAI GRATUIT : la carte
 * de l'abonnement mensuel s'affichait « En cours » à quelqu'un qui n'avait donné
 * aucune carte bancaire, juste au-dessus d'un encart annonçant son essai. Deux
 * affirmations contraires sur le même écran.
 *
 * « En cours » exige désormais un abonnement RÉELLEMENT souscrit.
 *
 * LE PALIER VIENT DU SERVEUR. Le prix dépend du nombre de factures émises par
 * an (`palierDeTaille(facturesParAn)`), et un palier calculé dans le navigateur
 * se falsifie pour payer le tarif d'en dessous.
 *
 * ⚠️ ET LA FRONTIÈRE PADDLE EST ÉCRITE À L'ÉCRAN, PAS SEULEMENT DANS LA SPEC.
 * Le parcours de paiement appartient au prestataire : il sort de la grammaire
 * de ce produit, et le dire vaut mieux que réimplémenter un tunnel qu'on ne
 * contrôle pas.
 */
/**
 * Ce que l'écran peut faire avec Paddle, branché par la route.
 *
 * Absente : rien à ouvrir pour ce compte (la facturation n'est pas ouverte, ou
 * il n'administre pas l'établissement). Le paiement et le portail
 * appartiennent à Paddle et s'ouvrent chez lui.
 */
export interface CaisseAffichee {
	/** Les offres dont le prix est posé pour le palier de l'établissement. */
	readonly offres: { readonly bilan: boolean; readonly abonnement: boolean };
	readonly onChoisir: (offre: 'bilan' | 'abonnement') => void;
	readonly onGerer: () => void;
	/** Ce qui est en train de s'ouvrir. */
	readonly enCours: 'bilan' | 'abonnement' | 'portail' | null;
	/** Paddle a dit « payé », le rappel n'est pas encore arrivé. */
	readonly recu: boolean;
	/** Le paiement ne peut pas s'ouvrir sur ce déploiement (réglage incomplet). */
	readonly indisponible: boolean;
	readonly erreur: string | null;
}

export function SectionFacturation({
	abonnement,
	maintenant,
	caisse
}: {
	abonnement: AbonnementAffiche | null;
	/** L'heure lue une fois par l'écran : deux horloges donneraient deux comptes de jours. */
	maintenant: number;
	caisse?: CaisseAffichee;
}) {
	if (abonnement === null) {
		return (
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Aucun établissement actif : il n’y a pas d’offre à calculer.
			</p>
		);
	}

	const etat = etatDeLaFacturation(abonnement, maintenant);
	const abonne = etat.genre === 'abonne';

	/*
	  ⚠️ ON NE SOUSCRIT PAS PAR-DESSUS UN ABONNEMENT QUI EXISTE. En pause ou en
	  échec de paiement, l'abonnement se reprend au portail : en ouvrir un
	  second ferait payer deux fois.
	*/
	const peutSouscrire =
		caisse !== undefined &&
		!caisse.indisponible &&
		!abonne &&
		!(etat.genre === 'ferme' && (etat.cause === 'past_due' || etat.cause === 'paused'));
	const bilanRegle = abonnement.bilanRegleLe === null ? null : dateEnClair(abonnement.bilanRegleLe);

	return (
		<>
			<EtatCourant etat={etat} abonnement={abonnement} maintenant={maintenant} caisse={caisse} />

			{/*
			  ⚠️ LE PALIER NE SE RÉPÈTE PAS EN PUCE. La rangée repliée porte déjà
			  « Palier S, ses bornes » en légende, et elle reste visible dépliée :
			  une puce qui redit le titre juste dessous est du texte inutile.
			*/}
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-softer">
				{abonnement.facturesParAn
					? `Palier déterminé à partir des ${abonnement.facturesParAn} factures par an déclarées pour votre établissement.`
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
					actif={abonne && abonnement.tier === 'suivi'}
					pied={
						bilanRegle !== null ? (
							<span className="text-cladd-xs text-cladd-fg-soft">Réglé le {bilanRegle}.</span>
						) : peutSouscrire && caisse.offres.bilan ? (
							<BoutonSecondaire
								pleineLargeur
								loading={caisse.enCours === 'bilan'}
								disabled={caisse.enCours !== null}
								onClick={() => caisse.onChoisir('bilan')}
							>
								Régler le bilan
							</BoutonSecondaire>
						) : null
					}
				/>
				<Offre
					titre="L’abonnement"
					prix={euros(abonnement.tarifs.abonnementMensuel)}
					cadence="par mois"
					description="Vos échéances surveillées toute l’année : ce qui arrive à terme, et les dates limites pour agir en justice qui approchent."
					colonne="abonnement"
					actif={abonne && abonnement.tier === 'procedures'}
					recommande
					pied={
						peutSouscrire && caisse.offres.abonnement ? (
							<BoutonPrincipal
								pleineLargeur
								loading={caisse.enCours === 'abonnement'}
								disabled={caisse.enCours !== null}
								onClick={() => caisse.onChoisir('abonnement')}
							>
								Choisir l’abonnement
							</BoutonPrincipal>
						) : null
					}
				/>
			</div>

			{caisse?.recu && !abonne ? (
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Paiement reçu. Il s’inscrit ici dès que Paddle le confirme, en général en quelques
					secondes.
				</p>
			) : null}
			{caisse?.indisponible ? (
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Le paiement en ligne ne s’ouvre pas pour le moment. Écrivez-nous à bonjour@letikette.com :
					nous réglons cela avec vous.
				</p>
			) : null}
			{caisse?.erreur ? (
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">{caisse.erreur}</p>
			) : null}

			<p className="text-cladd-xs leading-relaxed text-cladd-fg-softer">
				Prix hors taxes. La facturation est opérée par Paddle, qui émet la facture et collecte la
				TVA applicable à votre pays. Le parcours de paiement, la carte et la résiliation
				appartiennent à Paddle : ils s’ouvrent chez lui, dans sa langue et sa mise en page, parce
				que ce qui appartient au prestataire sort de la grammaire de ce produit.
			</p>
		</>
	);
}

/**
 * OÙ EN EST L'ABONNEMENT — LES CINQ ÉTATS, ET AUCUN SILENCE.
 *
 * ⚠️ UNE FERMETURE SE DIT EN QUATRE PARTIES (D0), COMME TOUS LES REFUS DU
 * PRODUIT : ce qu'on peut encore faire, ce qui manque, ce qui le lève au
 * CONSTAT, ce que l'attente coûte. Un état qui commence par ce qui ne marche
 * plus est un mur même quand la sortie est écrite dessous.
 */
function EtatCourant({
	etat,
	abonnement,
	maintenant,
	caisse
}: {
	etat: EtatFacturation;
	abonnement: AbonnementAffiche;
	maintenant: number;
	caisse?: CaisseAffichee;
}) {
	if (etat.genre === 'ouverture') return <OuvertureEnCours />;

	/*
	  Le portail de Paddle : changer de carte, relire ses factures, résilier.
	  Seulement pour un établissement que Paddle connaît déjà.
	*/
	const gerer =
		caisse !== undefined && abonnement.clientPaddle ? (
			<BoutonTexte
				className="self-start"
				loading={caisse.enCours === 'portail'}
				disabled={caisse.enCours !== null}
				onClick={caisse.onGerer}
			>
				Gérer mon abonnement chez Paddle
			</BoutonTexte>
		) : null;

	if (etat.genre === 'developpement') {
		return (
			<CarteEtat titre="Accès de développement">
				Aucune clé Paddle n’est configurée sur ce déploiement : toutes les fonctionnalités sont
				ouvertes, et rien n’est encaissé.
			</CarteEtat>
		);
	}

	if (etat.genre === 'abonne') {
		return (
			<CarteEtat titre="Votre abonnement est actif." geste={gerer}>
				Jusqu’à {abonnement.seatsAllowed} personnes peuvent accéder à votre établissement.
			</CarteEtat>
		);
	}

	if (etat.genre === 'essai' && abonnement.essaiFiniLe !== null) {
		return <EssaiEnCours finLe={abonnement.essaiFiniLe} maintenant={maintenant} />;
	}

	if (etat.genre === 'ferme') {
		return (
			<>
				<RefusEnQuatreParties
					peutFaire="Tout ce qui est enregistré reste en place : vos factures, vos clients et vos calculs déjà arrêtés ne bougent pas, et un décompte arrêté ne se recalcule jamais."
					constat={CONSTAT_DE_LA_FERMETURE[etat.cause]}
					/*
				  ⚠️ CE QUI LÈVE LE VERROU EST UN CONSTAT, ET IL NOMME LE SEUL EFFET
				  RÉELLEMENT APPLIQUÉ. Voir `CONSEQUENCE_DE_LA_FERMETURE` dans
				  `presse.tsx` : la table `PLAN_FEATURES` en déclare trois autres que
				  rien n'applique, et les écrire ici serait annoncer une restriction
				  qui n'existe pas.
				*/
					blocages={[
						'Tant que ce palier reste fermé, aucune invitation ne peut plus être envoyée : le serveur les refuse toutes.',
						LEVEE_DE_LA_FERMETURE[etat.cause]
					]}
					coutDeLAttente="Ce que l’attente coûte : rien qui se chiffre. Aucune donnée ne se perd et aucune somme ne court ; seules les invitations restent fermées."
				/>
				{gerer}
			</>
		);
	}

	if (etat.genre === 'indetermine') {
		/*
		  ⚠️ ON NOMME, ON NE REPLIE PAS. Un palier ouvert sans abonnement, sans
		  essai et sans plan de développement ne se produit par aucune branche
		  connue de `resolveEffectivePlan` : afficher « actif » serait inventer une
		  réponse, et c'est exactement ce qu'un écran de réglages ne doit pas faire.
		*/
		return (
			<CarteEtat titre="L’état de votre abonnement est indéterminé.">
				Le palier rendu par le serveur ne correspond à aucun abonnement, à aucun essai en cours et à
				aucun accès de développement. Ce que le produit vous ouvre ne peut donc pas être annoncé
				ici, et rien n’est deviné à la place.
			</CarteEtat>
		);
	}

	return null;
}

/** Ce qui lève le verrou, selon sa cause : le portail pour reprendre, une offre pour souscrire. */
const LEVEE_DE_LA_FERMETURE: Record<CauseDeFermeture, string> = {
	past_due:
		'Ce verrou se lève dès que le paiement passe : la carte se change chez Paddle, par « Gérer mon abonnement chez Paddle ».',
	paused:
		'Ce verrou se lève à la reprise de l’abonnement, chez Paddle, par « Gérer mon abonnement chez Paddle ».',
	canceled: 'Ce verrou se lève en choisissant une offre, plus bas.',
	jamais: 'Ce verrou se lève en choisissant une offre, plus bas.'
};

const CONSTAT_DE_LA_FERMETURE: Record<CauseDeFermeture, string> = {
	past_due: 'Ce qui manque : le dernier paiement de votre abonnement a échoué chez Paddle.',
	paused: 'Ce qui manque : votre abonnement est en pause chez Paddle.',
	canceled: 'Ce qui manque : votre abonnement est résilié.',
	jamais: 'Ce qui manque : aucun abonnement n’est actif sur cet établissement.'
};

/** La carte d'état, au même verre que le reste de la page. */
function CarteEtat({
	titre,
	children,
	geste
}: {
	titre: string;
	children: ReactNode;
	geste?: ReactNode;
}) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<span className="text-cladd-sm font-bold">{titre}</span>
			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">{children}</span>
			{geste}
		</Surface>
	);
}

function dateEnClair(ms: number): string {
	return new Date(ms).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}
