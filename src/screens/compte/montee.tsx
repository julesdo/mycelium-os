import { useEffect, useRef, useState } from 'react';
import { FORMULES, GRILLE, LIMITES, type Formule, type Rythme } from '../../lib/config/tarifs';
import { ChoixDeFormule, ConfirmationDeChangement, type ApercuDeChangement } from '../../ui';
import type { AbonnementAffiche, CaisseAffichee } from './facturation';
import type { GestionAffichee } from './gestion-formule';

/**
 * AU MOMENT DU BESOIN — LA FORMULE DU DESSUS, SOUS LE GESTE (21/10/2026, le parcours de
 * l'habitude, moment 6). Le patron est né avec les places de l'équipe : on ne refuse
 * pas, on garde le geste, on montre la formule qui l'ouvre, HT et TTC, et le geste se
 * finit une fois la formule en place. Il sert les places, les clients suivis et les
 * analyses de santé.
 *
 * Deux voies : un abonné CHANGE de formule (le prorata d'abord, Paddle répond tout de
 * suite) ; un compte sans abonnement SOUSCRIT par la page de choix, la bonne formule
 * cochée (la formule arrive au retour de Paddle, quelques secondes plus tard).
 */

/** Ce qu'un écran sait de la formule du compte, et de quoi changer. */
export interface FormuleDuCompte {
	readonly abonnement: AbonnementAffiche;
	readonly caisse?: CaisseAffichee;
	readonly gestion?: GestionAffichee;
	readonly maintenant: number;
}

export type Montee =
	| {
			readonly genre: 'CHANGER';
			readonly cible: Formule;
			readonly rythme: Rythme;
			readonly aLEssai: boolean;
			readonly quittePrixFondateurs: boolean;
			readonly gestion: GestionAffichee;
	  }
	| {
			readonly genre: 'SOUSCRIRE';
			readonly cible: Formule;
			readonly caisse: CaisseAffichee;
			readonly abonnement: AbonnementAffiche;
			readonly maintenant: number;
	  };

/** La plus petite formule qui ouvre `besoin` accès. */
export function formuleQuiOuvre(besoin: number): Formule | null {
	return FORMULES.find((f) => LIMITES[f].utilisateurs >= besoin) ?? null;
}

/** La plus petite formule qui suit `besoin` clients en retard. */
export function formuleQuiSuit(besoin: number): Formule | null {
	return (
		FORMULES.find((f) => {
			const limite = LIMITES[f].clientsSuivis;
			return limite === null || limite >= besoin;
		}) ?? null
	);
}

/** La plus petite formule qui ouvre plus d'analyses par mois que `actuelles`. */
export function formuleAvecPlusDAnalyses(actuelles: number): Formule | null {
	return FORMULES.find((f) => LIMITES[f].analysesParMois > actuelles) ?? null;
}

/** `nouveaux` clients de plus dépasseraient-ils ce que la formule suit ? */
export function auDelaDeLaLimite(
	abonnement: Pick<AbonnementAffiche, 'limites' | 'clientsSuivis'>,
	nouveaux: number
): boolean {
	const limite = abonnement.limites.clientsSuivis;
	return nouveaux > 0 && limite !== null && abonnement.clientsSuivis + nouveaux > limite;
}

/** Le jour où le quota d'analyses revient : le 1er du mois suivant (mois UTC, comme le compte). */
export function retourDuQuota(maintenant: number): string {
	const n = new Date(maintenant);
	return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}

/**
 * COMMENT MONTER VERS `cible`, ou `null` : aucune formule assez grande, déjà la bonne,
 * pas de caisse (un membre, une facturation fermée), un abonnement en souffrance.
 */
export function monteeVers(
	compte: FormuleDuCompte | undefined,
	cible: Formule | null
): Montee | null {
	if (compte === undefined || cible === null) return null;
	const { abonnement, caisse, gestion } = compte;
	const vivant = abonnement.statut === 'active' || abonnement.statut === 'trialing';
	if (
		vivant &&
		gestion !== undefined &&
		abonnement.formule !== null &&
		abonnement.rythme !== null
	) {
		if (cible === abonnement.formule) return null;
		return {
			genre: 'CHANGER',
			cible,
			rythme: abonnement.rythme,
			aLEssai: abonnement.statut === 'trialing',
			quittePrixFondateurs: abonnement.prixFondateurs === true,
			gestion
		};
	}
	if (!vivant && caisse?.disponible === true) {
		return { genre: 'SOUSCRIRE', cible, caisse, abonnement, maintenant: compte.maintenant };
	}
	return null;
}

/**
 * LA FEUILLE DE MONTÉE : la confirmation du changement (prorata, HT et TTC) pour un
 * abonné, la page de choix pour un compte sans abonnement. `onEnPlace` dit que la
 * formule a changé (un abonné) ; `onSouscription`, qu'un paiement Paddle est parti (la
 * formule arrivera avec son rappel, l'écran l'attend sur ses lectures).
 *
 * ⚠️ SEULE LA DERNIÈRE DEMANDE DE PRIX ÉCRIT SON APERÇU : une réponse de Paddle en retard
 * n'écrase pas une demande plus récente.
 */
export function FeuilleDeMontee({
	montee,
	ouverte,
	onFermer,
	titre,
	contexte,
	libelleConfirmer,
	onEnPlace,
	onSouscription
}: {
	readonly montee: Montee;
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	readonly titre: string;
	readonly contexte: string;
	readonly libelleConfirmer: string;
	readonly onEnPlace?: () => void;
	readonly onSouscription?: () => void;
}) {
	const [apercu, setApercu] = useState<ApercuDeChangement>({ etat: 'attente' });
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	const derniereDemande = useRef(0);

	// Le prix se demande à Paddle à chaque ouverture de la confirmation.
	const cible = montee.cible;
	const rythme = montee.genre === 'CHANGER' ? montee.rythme : null;
	const gestion = montee.genre === 'CHANGER' ? montee.gestion : null;
	useEffect(() => {
		if (!ouverte || gestion === null || rythme === null) return;
		const demande = ++derniereDemande.current;
		gestion
			.apercu(cible, rythme)
			.then((a) => {
				if (demande === derniereDemande.current) setApercu({ etat: 'pret', ...a });
			})
			.catch((e: unknown) => {
				if (demande !== derniereDemande.current) return;
				setApercu({
					etat: 'erreur',
					message: messageDe(e, 'Paddle n’a pas pu chiffrer ce changement.')
				});
			});
		// À l'ouverture seulement : `gestion` change d'identité à chaque rendu de l'écran.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ouverte, cible, rythme]);

	if (montee.genre === 'CHANGER') {
		return (
			<ConfirmationDeChangement
				ouverte={ouverte}
				onFermer={onFermer}
				titre={titre}
				formule={montee.cible}
				rythme={montee.rythme}
				aLEssai={montee.aLEssai}
				quittePrixFondateurs={montee.quittePrixFondateurs}
				apercu={apercu}
				enCours={enCours}
				erreur={erreur}
				onConfirmer={() => {
					setEnCours(true);
					setErreur(null);
					montee.gestion
						.changer(montee.cible, montee.rythme, montee.quittePrixFondateurs)
						.then(() => onEnPlace?.())
						.catch((e: unknown) =>
							setErreur(messageDe(e, 'Le changement n’a pas pu se faire. Réessayez.'))
						)
						.finally(() => setEnCours(false));
				}}
				libelleConfirmer={libelleConfirmer}
				contexte={contexte}
			/>
		);
	}
	const { caisse } = montee;
	return (
		<ChoixDeFormule
			ouverte={ouverte && caisse.souscrite === null}
			onFermer={onFermer}
			titre={titre}
			recommandee={montee.cible}
			essaiDisponible={caisse.essai}
			enCours={caisse.enCours === 'formule'}
			maintenant={montee.maintenant}
			onChoisir={(formule, rythme) => {
				onSouscription?.();
				caisse.onChoisir(formule, rythme);
			}}
			ttc={caisse.ttc ?? null}
			{...(caisse.onVoirLesPrix ? { onVoirLesPrix: caisse.onVoirLesPrix } : {})}
			{...(caisse.bienvenue ? { bienvenue: caisse.bienvenue } : {})}
			contexte={contexte}
		/>
	);
}

function messageDe(e: unknown, defaut: string): string {
	const convexe = e as { data?: unknown };
	if (typeof convexe.data === 'string') return convexe.data;
	return e instanceof Error && e.message !== '' ? e.message : defaut;
}

/** Le nom d'une formule, pour les libellés : « Équipe ». */
export function nomDeLaFormule(formule: Formule): string {
	return GRILLE[formule].nom;
}
