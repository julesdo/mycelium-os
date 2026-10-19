import { useState, type ReactNode } from 'react';
import { Surface } from '@cladd-ui/react';
import {
	DUREE_ESSAI_JOURS,
	GRILLE,
	JOURS_DE_REMBOURSEMENT,
	montantDuRythme,
	type Formule,
	type Limites,
	type Rythme
} from '../../lib/config/tarifs';
import {
	BoutonPrincipal,
	BoutonTexte,
	ChoixDeFormule,
	EnTeteDeGroupe,
	FeuilleDeReussite,
	ListeDeReleve,
	LigneDeReleve,
	RefusEnQuatreParties,
	prixAffiche
} from '../../ui';
import { montantPreleve } from '../../lib/paiement/paddle';
import { OuvertureEnCours } from './offre';
import { GestionDeLaFormule, type GestionAffichee } from './gestion-formule';
import { etatDeLaFacturation, type CauseDeFermeture, type EtatFacturation } from './presse';

/** Ce que l'écran affiche : l'état d'abonnement tel que `billing.etatAbonnement` le rend. */
export interface AbonnementAffiche {
	/** Le palier EFFECTIF (`resolveEffectivePlan`) : ce qui est ouvert. */
	readonly tier: string;
	readonly isDev: boolean;
	/** La facturation est ouverte sur ce déploiement (`paiementOuvert`, `billing.ts`). */
	readonly paiementOuvert: boolean;
	/** Le statut Paddle, tel que les rappels l'écrivent. */
	readonly statut: string | null;
	/** La formule souscrite, à l'essai ou payée. */
	readonly formule: Formule | null;
	readonly rythme: Rythme | null;
	/** Le montant du prix souscrit chez Paddle, en centimes (texte) : ce qui est prélevé. */
	readonly montantDuPrixSouscrit?: string | null;
	readonly essaiFinLe: number | null;
	readonly prochainPrelevementLe: number | null;
	/** Une résiliation programmée : le jour où elle prend effet. */
	readonly resiliationLe: number | null;
	/** Un accès offert qui court encore. */
	readonly offertJusquAu: number | null;
	/** Paddle connaît déjà l'établissement : le portail (carte, factures, résiliation) s'ouvre. */
	readonly clientPaddle: boolean;
	/** Trente jours offerts à la souscription, ou un prélèvement tout de suite. */
	readonly essaiDisponible: boolean;
	/** La formule cochée à l'ouverture du choix, d'après le registre. */
	readonly recommandee: Formule;
	readonly limites: Limites;
	/** Les personnes qui ont accès à l'établissement. */
	readonly utilisateurs: number;
	/** Les clients en retard que le pilote suit. */
	readonly clientsSuivis: number;
}

/** Ce qui vient d'être souscrit, pour la coche de réussite. */
export interface Souscription {
	readonly formule: Formule;
	readonly rythme: Rythme;
	readonly essai: boolean;
}

/**
 * Ce que l'écran peut faire avec Paddle, branché par la route (`useCaissePaddle`).
 *
 * Absente : rien à ouvrir pour ce compte (la facturation n'est pas ouverte, ou
 * il n'administre pas l'établissement).
 */
export interface CaisseAffichee {
	/** Le paiement peut s'ouvrir sur ce déploiement. */
	readonly disponible: boolean;
	/** Les prix proposés portent les trente jours d'essai. */
	readonly essai: boolean;
	readonly onChoisir: (formule: Formule, rythme: Rythme) => void;
	readonly onGerer: () => void;
	readonly enCours: 'formule' | 'portail' | null;
	/** Paddle a confirmé le paiement : la coche s'affiche jusqu'à ce qu'on la ferme. */
	readonly souscrite: Souscription | null;
	readonly onFermerLaReussite: () => void;
	readonly erreur: string | null;
}

/**
 * VOTRE FORMULE — l'état de l'abonnement, ce qu'il comprend, et le geste qui
 * le change.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ REFAITE LE 14/10/2026, SUR LA NOUVELLE GRILLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Deux cartes d'offre (le bilan, l'abonnement) par palier de volume déclaré
 * ont laissé la place à UN état et UN bouton : « Choisir ma formule », qui
 * ouvre la même page partout (`ChoixDeFormule`). L'état dit toujours ce qui se
 * passera et quand : la fin de l'essai, la date et le montant du prochain
 * prélèvement, la fin d'un accès résilié. Le prélèvement ne surprend jamais.
 *
 * Ce que comprend la formule se LIT en relevé (clients suivis, utilisateurs,
 * analyses), jamais en tableau de comparaison : la comparaison vit dans la page
 * de choix, au moment où elle sert.
 */
export function SectionFacturation({
	abonnement,
	maintenant,
	caisse,
	gestion
}: {
	abonnement: AbonnementAffiche | null;
	/** L'heure lue une fois par l'écran : deux horloges donneraient deux comptes de jours. */
	maintenant: number;
	caisse?: CaisseAffichee;
	/** Changer, résilier, reprendre : présent pour l'administrateur d'un abonnement souscrit. */
	gestion?: GestionAffichee;
}) {
	const [choixOuvert, setChoixOuvert] = useState(false);

	if (abonnement === null) {
		return (
			<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Aucun établissement actif : il n’y a pas de formule à afficher.
			</p>
		);
	}

	const etat = etatDeLaFacturation(abonnement, maintenant);
	const peutChoisir =
		caisse?.disponible === true && (etat.genre === 'decouverte' || etat.genre === 'offert');
	const choisir = peutChoisir ? () => setChoixOuvert(true) : undefined;
	const souscrite = caisse?.souscrite ?? null;

	return (
		<>
			<EtatCourant
				etat={etat}
				abonnement={abonnement}
				caisse={caisse}
				gestionPresente={gestion !== undefined}
				{...(choisir === undefined ? {} : { onChoisir: choisir })}
			/>

			{etat.genre === 'ouverture' || etat.genre === 'developpement' ? null : (
				<CeQueComprend abonnement={abonnement} />
			)}

			{gestion !== undefined && (etat.genre === 'essai' || etat.genre === 'abonne') ? (
				<GestionDeLaFormule abonnement={abonnement} gestion={gestion} maintenant={maintenant} />
			) : null}

			{caisse !== undefined &&
			!caisse.disponible &&
			(etat.genre === 'decouverte' || etat.genre === 'offert') ? (
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Le paiement en ligne ne s’ouvre pas pour le moment. Écrivez-nous à bonjour@letikette.com :
					nous réglons cela avec vous.
				</p>
			) : null}
			{caisse?.erreur ? (
				<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">{caisse.erreur}</p>
			) : null}

			<p className="text-cladd-xs leading-relaxed text-cladd-fg-softer">
				Prix hors taxes. Paddle, notre revendeur, encaisse le paiement, émet la facture et ajoute la
				TVA de votre pays : votre carte ne passe jamais par nos serveurs. Un paiement se rembourse
				sur demande dans les {JOURS_DE_REMBOURSEMENT} jours.
			</p>

			{caisse !== undefined ? (
				<ChoixDeFormule
					ouverte={choixOuvert && souscrite === null}
					onFermer={() => setChoixOuvert(false)}
					recommandee={abonnement.formule ?? abonnement.recommandee}
					essaiDisponible={caisse.essai}
					enCours={caisse.enCours === 'formule'}
					maintenant={maintenant}
					utilisateurs={abonnement.utilisateurs}
					onChoisir={caisse.onChoisir}
				/>
			) : null}

			{souscrite !== null ? (
				<FeuilleDeReussite
					ouverte
					titre={souscrite.essai ? 'Votre essai commence' : 'Vous êtes abonné'}
					pour={`${GRILLE[souscrite.formule].nom}, ${souscrite.rythme === 'annuel' ? 'à l’année' : 'au mois'}`}
					detail={
						souscrite.essai
							? `Rien n’est prélevé avant le ${dateEnClair(maintenant + DUREE_ESSAI_JOURS * JOUR)}. On vous prévient deux jours avant.`
							: `${prixAffiche(montantDuRythme(souscrite.formule, souscrite.rythme) * 100)} HT, ${souscrite.rythme === 'annuel' ? 'chaque année' : 'chaque mois'}. La facture de Paddle arrive par e-mail.`
					}
					principale={{
						libelle: 'Terminé',
						onClick: () => {
							setChoixOuvert(false);
							caisse?.onFermerLaReussite();
						}
					}}
				/>
			) : null}
		</>
	);
}

const JOUR = 24 * 60 * 60 * 1000;

/**
 * OÙ EN EST L'ABONNEMENT — un état, sa date, et au plus un geste.
 *
 * ⚠️ UNE FERMETURE SE DIT EN QUATRE PARTIES (D0), COMME TOUS LES REFUS DU
 * PRODUIT : ce qu'on peut encore faire, ce qui manque, ce qui le lève au
 * CONSTAT, ce que l'attente coûte.
 */
function EtatCourant({
	etat,
	abonnement,
	caisse,
	gestionPresente,
	onChoisir
}: {
	etat: EtatFacturation;
	abonnement: AbonnementAffiche;
	caisse?: CaisseAffichee | undefined;
	/** Les rangées « Gérer votre formule » portent le portail : la carte ne le redit pas. */
	gestionPresente: boolean;
	/** Présent quand une formule peut être choisie ici. */
	onChoisir?: () => void;
}) {
	if (etat.genre === 'ouverture') return <OuvertureEnCours />;

	/*
	  Le portail de Paddle : changer de carte, relire ses factures. Seulement pour
	  un établissement que Paddle connaît déjà.
	*/
	const gerer =
		caisse !== undefined && abonnement.clientPaddle ? (
			<BoutonTexte
				className="self-start"
				loading={caisse.enCours === 'portail'}
				disabled={caisse.enCours !== null}
				onClick={caisse.onGerer}
			>
				Carte et factures, chez Paddle
			</BoutonTexte>
		) : null;
	const choisir =
		onChoisir === undefined ? null : (
			<BoutonPrincipal pleineLargeur onClick={onChoisir}>
				Choisir ma formule
			</BoutonPrincipal>
		);
	const nom = abonnement.formule === null ? null : GRILLE[abonnement.formule].nom;
	const montant =
		abonnement.formule === null || abonnement.rythme === null
			? null
			: prixAffiche(
					montantPreleve(abonnement.montantDuPrixSouscrit, abonnement.formule, abonnement.rythme)
				);
	const rythme = abonnement.rythme === 'annuel' ? 'à l’année' : 'au mois';

	if (etat.genre === 'essai') {
		const ecoules = Math.min(DUREE_ESSAI_JOURS, Math.max(0, DUREE_ESSAI_JOURS - etat.jours));
		return (
			<CarteEtat
				titre={`Essai${nom === null ? '' : ` ${nom}`}, encore ${etat.jours} jour${etat.jours > 1 ? 's' : ''}`}
				geste={gestionPresente ? null : gerer}
			>
				<span
					className="flex h-1.5 w-full overflow-hidden rounded-full bg-cladd-fg/10"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={DUREE_ESSAI_JOURS}
					aria-valuenow={ecoules}
					aria-label="Jours d’essai écoulés"
				>
					<span
						className="h-full rounded-full bg-cladd-primary"
						style={{ width: `${(ecoules / DUREE_ESSAI_JOURS) * 100}%` }}
					/>
				</span>
				<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					{abonnement.resiliationLe !== null
						? `Résilié : rien ne sera prélevé. Tout reste ouvert jusqu’au ${dateEnClair(abonnement.resiliationLe)}.`
						: etat.finLe !== null && montant !== null
							? `Premier prélèvement le ${dateEnClair(etat.finLe)} : ${montant} HT, ${rythme}. Annulable jusqu’à la veille.`
							: 'Votre carte est enregistrée chez Paddle ; rien n’est prélevé pendant l’essai.'}
				</span>
			</CarteEtat>
		);
	}

	if (etat.genre === 'abonne') {
		return (
			<CarteEtat
				titre={nom === null ? 'Votre abonnement est actif.' : `${nom}, ${rythme}`}
				geste={gestionPresente ? null : gerer}
			>
				<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					{abonnement.resiliationLe !== null
						? `Résilié : l’accès se termine le ${dateEnClair(abonnement.resiliationLe)}, rien ne sera plus prélevé.`
						: abonnement.prochainPrelevementLe !== null && montant !== null
							? `Prochain prélèvement le ${dateEnClair(abonnement.prochainPrelevementLe)} : ${montant} HT.`
							: 'Votre abonnement est actif.'}
				</span>
			</CarteEtat>
		);
	}

	if (etat.genre === 'offert' && abonnement.offertJusquAu !== null) {
		return (
			<CarteEtat
				titre={`Accès offert, encore ${etat.jours} jour${etat.jours > 1 ? 's' : ''}`}
				geste={choisir}
			>
				<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Jusqu’au {dateEnClair(abonnement.offertJusquAu)}, tout vous est ouvert, comme avec la
					formule Équipe. Choisissez la vôtre pour que rien ne s’arrête ensuite.
				</span>
			</CarteEtat>
		);
	}

	if (etat.genre === 'decouverte') {
		return (
			<CarteEtat titre="Découverte" geste={choisir}>
				<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					{etat.resilie
						? 'Votre abonnement est terminé. Vos factures, vos clients et vos calculs restent là, et vous voyez toujours ce qu’on vous doit.'
						: 'Vous voyez ce qu’on vous doit, pénalités et frais de recouvrement compris.'}{' '}
					{abonnement.essaiDisponible && caisse?.essai !== false
						? 'Pour que les relances partent à votre nom, choisissez une formule : trente jours d’essai, 0 € aujourd’hui.'
						: 'Pour que les relances partent à votre nom, choisissez une formule.'}
				</span>
			</CarteEtat>
		);
	}

	if (etat.genre === 'ferme') {
		return (
			<>
				<RefusEnQuatreParties
					peutFaire="Tout ce qui est enregistré reste en place : vos factures, vos clients et vos calculs ne bougent pas."
					constat={CONSTAT_DE_LA_FERMETURE[etat.cause]}
					blocages={[
						'Tant que le paiement n’est pas repris, votre établissement revient à Découverte : on mesure, rien ne part.',
						LEVEE_DE_LA_FERMETURE[etat.cause]
					]}
					coutDeLAttente="Ce que l’attente coûte : rien qui se chiffre. Aucune donnée ne se perd et aucune somme ne court ; les relances attendent."
				/>
				{gerer}
			</>
		);
	}

	if (etat.genre === 'developpement') {
		return (
			<CarteEtat titre="Accès de développement">
				<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
					Un plan de développement est posé sur cet établissement : tout est ouvert, rien n’est
					encaissé.
				</span>
			</CarteEtat>
		);
	}

	/*
	  ⚠️ ON NOMME, ON NE REPLIE PAS. Un palier qui ne correspond à aucune
	  branche connue de `resolveEffectivePlan` ne s'annonce pas « actif ».
	*/
	return (
		<CarteEtat titre="L’état de votre abonnement est indéterminé.">
			<span className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
				Le palier rendu par le serveur ne correspond à aucun abonnement, à aucun essai et à aucun
				accès offert. Ce que le produit vous ouvre ne peut donc pas être annoncé ici, et rien n’est
				deviné à la place.
			</span>
		</CarteEtat>
	);
}

/** Ce que la formule en cours ouvre, en relevé. */
function CeQueComprend({ abonnement }: { abonnement: AbonnementAffiche }) {
	const { limites } = abonnement;
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<EnTeteDeGroupe libelle="Ce que comprend votre formule" />
			<ListeDeReleve>
				<LigneDeReleve
					titre="Relances et lettre officielle"
					montant={limites.agir ? 'À votre nom' : 'Avec une formule'}
				/>
				<LigneDeReleve
					titre="Clients en retard suivis"
					montant={
						limites.clientsSuivis === null
							? 'Sans limite'
							: limites.clientsSuivis === 0
								? 'Avec une formule'
								: `${abonnement.clientsSuivis} sur ${limites.clientsSuivis}`
					}
				/>
				<LigneDeReleve
					titre="Utilisateurs"
					montant={`${abonnement.utilisateurs} sur ${limites.utilisateurs}`}
				/>
				<LigneDeReleve
					titre="Analyses de santé client"
					montant={`${limites.analysesParMois} par mois`}
				/>
			</ListeDeReleve>
		</div>
	);
}

/** Ce qui lève le verrou, selon sa cause : le portail de Paddle. */
const LEVEE_DE_LA_FERMETURE: Record<CauseDeFermeture, string> = {
	past_due:
		'Ce verrou se lève dès que le paiement passe : la carte se change chez Paddle, par « Carte et factures, chez Paddle ».',
	paused: 'Ce verrou se lève à la reprise de l’abonnement, chez Paddle.'
};

const CONSTAT_DE_LA_FERMETURE: Record<CauseDeFermeture, string> = {
	past_due: 'Ce qui manque : le dernier paiement de votre abonnement a échoué chez Paddle.',
	paused: 'Ce qui manque : votre abonnement est en pause chez Paddle.'
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
			{children}
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
