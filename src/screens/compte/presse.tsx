import type { Lecture } from '../../ui';
import { pluriel } from '../../ui';
import { GRILLE, type Formule } from '../../lib/config/tarifs';
import type { Theme } from '../../app/use-theme';
import type { AbonnementAffiche } from './facturation';
import type { EquipeAffichee } from './equipe';
import type { DonneesAffichees } from './donnees';
import type { MesuresAffichees } from './mesures';

/**
 * CE QUI PRESSE, ET CE QUE CHAQUE SECTION REPLIÉE DIT D'ELLE-MÊME.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UN SEUL FICHIER CALCULE LES DEUX, ET CE N'EST PAS UNE COMMODITÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La page du compte replie ses sections. Une section repliée qui cache un
 * abonnement fermé ou une invitation qui expire est pire qu'une page longue :
 * le gérant a REGARDÉ, et il n'a rien vu.
 *
 * Deux choses le réparent — la valeur posée à droite de la rangée repliée, et
 * le bandeau « Ce qui presse » en tête de page. Écrites à deux endroits, elles
 * se désaccorderaient au premier ajout : le bandeau annoncerait un paiement
 * échoué pendant que la rangée dirait « Actif ». Elles se calculent donc ici, à
 * partir des mêmes lectures, et une section qui gagne un état le gagne des deux
 * côtés à la fois.
 *
 * ⚠️ ET CE QUI SE LIT ENCORE NE SE TAIT PAS. Une lecture en cours ne vaut pas
 * « rien à signaler » : la rangée affiche « Lecture… » au lieu d'une valeur, et
 * le bandeau compte les sections dont il ne sait encore rien. Le doute ne
 * profite jamais au produit.
 */

/**
 * LES SEPT SECTIONS, DANS L'ORDRE DE LA PAGE.
 *
 * Ce qui s'imprime sur un décompte, ce qu'on paie, qui accède, ce qu'on
 * détient, qui fait l'acte, ce que la file a proposé, comment l'écran se peint.
 */
export const SECTIONS_COMPTE = [
	'profil',
	'etablissement',
	'regles',
	'connexions',
	'facturation',
	'equipe',
	'donnees',
	'carnet',
	'mesures',
	'affichage'
] as const;

export type SectionCompte = (typeof SECTIONS_COMPTE)[number];

/**
 * UN FAIT QUI PRESSE, ET CE QU'IL ENTRAÎNE.
 *
 * ⚠️ `consequence` EST UN CONSTAT, JAMAIS UNE CONDUITE À TENIR. « Le dépôt et
 * le décompte sont fermés » se vérifie dans le code ; « abonnez-vous » serait
 * une recommandation, et ce produit n'en émet aucune.
 */
export interface UrgenceDuCompte {
	readonly cle: SectionCompte;
	readonly fait: string;
	readonly consequence: string;
}

/** Ce qu'une rangée repliée montre : sa valeur à droite, sa légende sous le titre. */
export interface ResumeDeSection {
	readonly valeur: string;
	readonly legende?: string;
}

/**
 * ⚠️ « LECTURE… » N'EST PAS UNE VALEUR, C'EST SON ABSENCE DÉCLARÉE. Une rangée
 * muette pendant sa lecture se lit comme une rangée qui n'a rien à dire.
 */
const EN_LECTURE: ResumeDeSection = { valeur: 'Lecture…' };
const INDISPONIBLE: ResumeDeSection = { valeur: 'Indisponible' };

const JOUR_A_PARIS = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'Europe/Paris',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

/** Le jour du calendrier de Paris, compté depuis 1970 : « 2026-10-14 » → 20 740. */
function jourAParis(ms: number): number {
	const [annee, mois, jour] = JOUR_A_PARIS.format(ms).split('-').map(Number);
	return Date.UTC(annee ?? 1970, (mois ?? 1) - 1, jour ?? 1) / 86_400_000;
}

/**
 * Les jours qui restent, AU CALENDRIER : un essai de trente jours commencé le
 * 14 octobre et qui finit le 13 novembre dit « encore 30 jours », pas 31.
 *
 * ⚠️ PAS L'ARRONDI SUPÉRIEUR DES HEURES (corrigé le 14/10/2026) : l'écran fige
 * l'heure à son ouverture, et un essai souscrit un quart d'heure plus tard
 * finissait trente jours et quinze minutes après : « 31 » (vu au premier essai
 * du bac à sable). Un jour entamé compte quand même : la veille de l'échéance,
 * « 1 jour », jamais « 0 » tant qu'elle n'est pas passée.
 */
function joursJusqua(echeance: number, maintenant: number): number {
	if (echeance <= maintenant) return 0;
	return Math.max(1, jourAParis(echeance) - jourAParis(maintenant));
}

const NOMBRE = new Intl.NumberFormat('fr-FR');

function enDate(ms: number): string {
	return new Date(ms).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

/**
 * LE SEUIL À PARTIR DUQUEL UNE FIN D'ESSAI PRESSE.
 *
 * Ce n'est pas une valeur juridique — aucun texte ne la porte — mais une
 * décision d'affichage, et elle vit donc ici plutôt que dans le référentiel.
 * Sept jours : la marge au-delà de laquelle un gérant qui ouvre cette page deux
 * fois par an peut encore la rouvrir avant l'échéance.
 */
const JOURS_AVANT_FIN_D_ESSAI = 7;

// ── Votre établissement ────────────────────────────────────────────────────

/**
 * L'IDENTITÉ QUI S'IMPRIME EN TÊTE D'UN DÉCOMPTE.
 *
 * ⚠️ `profilComplet` EST LE CRITÈRE DU RESTE DU PRODUIT, PAS UN SECOND.
 * `/app/index.tsx` le calcule par `profil !== null && profil.siren !== undefined`
 * et `ceQuiManque` en tire le verrou « Votre identité de créancier ». Une
 * seconde définition du même mot se désaccorderait un jour, et l'accueil dirait
 * « incomplet » pendant que le compte dirait « renseignée ».
 */
export interface IdentiteDuCreancier {
	readonly nom: string;
	readonly siren: string | null;
	readonly profilComplet: boolean;
}

/** « Photo », « Avatar » ou « Initiales » : ce que les autres voient de vous. */
/** Ce que la rangée repliée dit de la connexion, sans l'ouvrir. */
export function resumeConnexions(statut: string | null, nom = 'Qonto'): ResumeDeSection {
	const valeur =
		statut === 'A_JOUR'
			? // Le nom seul : sous « Connexions », il dit déjà qu'il est relié, et
				// « Pennylane connecté » revenait à la ligne à 375 px.
				nom
			: statut === 'SYNCHRONISATION'
				? 'Lecture en cours…'
				: statut === 'ECHEC' || statut === 'REVOQUEE'
					? 'À reconnecter'
					: 'Aucune';
	return { valeur, legende: 'Les logiciels d’où vos factures arrivent seules.' };
}

export function resumeProfil(profil: {
	readonly image: unknown;
	readonly avatar: unknown;
}): ResumeDeSection {
	const valeur = profil.avatar !== null ? 'Avatar' : profil.image !== null ? 'Photo' : 'Initiales';
	return { valeur, legende: 'Ce qui vous représente dans l’application.' };
}

export function resumeEtablissement(identite: IdentiteDuCreancier | null): ResumeDeSection {
	if (identite === null) return { valeur: 'Aucun établissement' };
	return {
		valeur: identite.profilComplet ? 'Renseignée' : 'À compléter',
		legende: 'Ce qui s’imprime en tête d’un décompte.'
	};
}

function urgenceEtablissement(identite: IdentiteDuCreancier | null): UrgenceDuCompte | null {
	if (identite === null || identite.profilComplet) return null;
	return {
		cle: 'etablissement',
		fait: 'Votre identité de créancier est incomplète.',
		/*
		  ⚠️ LE CONSTAT EST CELUI DE `ceQuiManque`, MOT POUR MOT. Sans profil,
		  `creancierCommercant` vaut `unknown`, donc `entreCommercants` aussi,
		  donc la condition de l'injonction de payer ne peut pas être acquise.
		  C'est un état du dossier, jamais un conseil d'agir.
		*/
		consequence: 'Sans elle, impossible de demander au tribunal de le faire payer.'
	};
}

// ── La facturation ─────────────────────────────────────────────────────────

/**
 * L'ÉTAT DE L'ABONNEMENT, DÉDUIT COMME LE SERVEUR LE DÉDUIT (`resolveEffectivePlan`).
 *
 * Refait le 14/10/2026 avec la grille Découverte, Solo, Équipe, Pro :
 *
 *   `ouverture`     la facturation n'est pas ouverte sur ce déploiement : tout
 *                   est ouvert, rien n'est encaissé ;
 *   `essai`         les trente jours de l'essai Paddle courent, la carte est
 *                   enregistrée, le premier prélèvement a une date ;
 *   `abonne`        une formule payée ;
 *   `offert`        un accès offert court (l'essai d'avant le 14/10/2026, ou le
 *                   préavis donné à l'ouverture) ;
 *   `decouverte`    rien de souscrit : on mesure, rien ne part ;
 *   `ferme`         un paiement échoué ou un abonnement en pause ;
 *   `developpement` un plan posé à la main ;
 *   `indetermine`   aucune branche connue : on le NOMME au lieu de deviner.
 */
export type EtatFacturation =
	| { readonly genre: 'ouverture' }
	| { readonly genre: 'developpement' }
	| { readonly genre: 'essai'; readonly jours: number; readonly finLe: number | null }
	| { readonly genre: 'abonne' }
	| { readonly genre: 'aVie'; readonly formule: Formule }
	| { readonly genre: 'offert'; readonly jours: number }
	| { readonly genre: 'decouverte'; readonly resilie: boolean }
	| { readonly genre: 'ferme'; readonly cause: CauseDeFermeture }
	| { readonly genre: 'indetermine' };

export type CauseDeFermeture = 'past_due' | 'paused';

export function etatDeLaFacturation(
	abonnement: AbonnementAffiche,
	maintenant: number
): EtatFacturation {
	// Un code privilège qui offre l'accès à vie prime sur l'abonnement d'avant, qui
	// s'arrête à son échéance (27/10/2026, `resolveEffectivePlan`).
	if (abonnement.accesOffert && abonnement.paiementOuvert) {
		return { genre: 'aVie', formule: abonnement.accesOffert.formule };
	}
	if (abonnement.statut === 'trialing') {
		const finLe = abonnement.essaiFinLe ?? abonnement.prochainPrelevementLe;
		return { genre: 'essai', jours: finLe === null ? 0 : joursJusqua(finLe, maintenant), finLe };
	}
	if (abonnement.statut === 'active') return { genre: 'abonne' };

	// La facturation n'est pas ouverte sur ce déploiement (`paiementOuvert`) :
	// tout est ouvert, rien n'est encaissé, et c'est ce que l'écran dit.
	if (!abonnement.paiementOuvert) return { genre: 'ouverture' };

	// Un plan posé à la main quand il n'y avait pas de clé (`org.devPlan`).
	if (abonnement.tier === 'dev') return { genre: 'developpement' };

	if (abonnement.statut === 'past_due' || abonnement.statut === 'paused') {
		return { genre: 'ferme', cause: abonnement.statut };
	}

	if (abonnement.offertJusquAu !== null) {
		return { genre: 'offert', jours: joursJusqua(abonnement.offertJusquAu, maintenant) };
	}

	if (abonnement.tier === 'none') {
		return { genre: 'decouverte', resilie: abonnement.statut === 'canceled' };
	}

	return { genre: 'indetermine' };
}

const FAIT_DE_LA_FERMETURE: Record<CauseDeFermeture, string> = {
	past_due: 'Le dernier paiement de votre abonnement a échoué.',
	paused: 'Votre abonnement est en pause.'
};

/**
 * CE QUE DÉCOUVERTE FERME VRAIMENT, relevé aux points d'usage (`limites.ts`) :
 * rien ne part (le pilote ne programme rien, un courrier ne se prépare pas) et
 * personne ne s'invite. La lecture reste entière. La phrase est ici, seule,
 * pour qu'un verrou de plus soit un remplacement et pas une chasse.
 */
export const CONSEQUENCE_DE_LA_FERMETURE =
	'Les relances et les courriers attendent une formule ; vos factures et vos calculs restent là.';

const VALEUR_DE_LA_FERMETURE: Record<CauseDeFermeture, string> = {
	past_due: 'Paiement échoué',
	paused: 'En pause'
};

export function resumeFacturation(
	lecture: Lecture<AbonnementAffiche | null>,
	maintenant: number
): ResumeDeSection {
	if (lecture.etat === 'attente') return EN_LECTURE;
	if (lecture.etat === 'erreur') return INDISPONIBLE;
	const abonnement = lecture.valeur;
	if (abonnement === null) return { valeur: 'Aucun établissement' };

	const etat = etatDeLaFacturation(abonnement, maintenant);
	const formule =
		abonnement.formule === null
			? null
			: `${GRILLE[abonnement.formule].nom}${abonnement.rythme === null ? '' : abonnement.rythme === 'annuel' ? ', à l’année' : ', au mois'}`;

	switch (etat.genre) {
		case 'ouverture':
			return { valeur: 'Sans carte bancaire' };
		case 'developpement':
			return { valeur: 'Développement' };
		case 'essai':
			return {
				valeur: `Essai, ${etat.jours} j`,
				...(formule === null ? {} : { legende: formule })
			};
		case 'abonne':
			// La carte du panneau porte « Pro, à l'année » : la rangée dit le nom,
			// sa légende le rythme, sans redire la carte.
			return {
				valeur: abonnement.formule === null ? 'Actif' : GRILLE[abonnement.formule].nom,
				...(abonnement.rythme === null
					? {}
					: { legende: abonnement.rythme === 'annuel' ? 'À l’année' : 'Au mois' })
			};
		case 'aVie':
			return { valeur: `${GRILLE[etat.formule].nom}, offert à vie` };
		case 'offert':
			return { valeur: `Offert, ${etat.jours} j` };
		case 'decouverte':
			return { valeur: 'Découverte' };
		case 'ferme':
			return {
				valeur: VALEUR_DE_LA_FERMETURE[etat.cause],
				...(formule === null ? {} : { legende: formule })
			};
		case 'indetermine':
			return { valeur: 'Indéterminé' };
	}
}

function urgenceFacturation(
	lecture: Lecture<AbonnementAffiche | null>,
	maintenant: number
): UrgenceDuCompte | null {
	if (lecture.etat !== 'pret' || lecture.valeur === null) return null;
	const abonnement = lecture.valeur;
	const etat = etatDeLaFacturation(abonnement, maintenant);

	if (etat.genre === 'ferme') {
		return {
			cle: 'facturation',
			fait: FAIT_DE_LA_FERMETURE[etat.cause],
			consequence: CONSEQUENCE_DE_LA_FERMETURE
		};
	}

	// L'essai qui se termine : un CONSTAT, la date et ce qui se passera.
	if (
		etat.genre === 'essai' &&
		etat.jours <= JOURS_AVANT_FIN_D_ESSAI &&
		abonnement.resiliationLe === null
	) {
		return {
			cle: 'facturation',
			fait: `Votre essai se termine dans ${etat.jours} jour${pluriel(etat.jours)}.`,
			consequence: 'Le premier prélèvement suivra, au montant de votre formule.'
		};
	}

	if (etat.genre === 'offert' && etat.jours <= JOURS_AVANT_FIN_D_ESSAI) {
		return {
			cle: 'facturation',
			fait: `Votre accès offert se termine dans ${etat.jours} jour${pluriel(etat.jours)}.`,
			consequence: `À son terme, sans formule, ${CONSEQUENCE_DE_LA_FERMETURE.charAt(0).toLowerCase()}${CONSEQUENCE_DE_LA_FERMETURE.slice(1)}`
		};
	}

	if (etat.genre === 'indetermine') {
		return {
			cle: 'facturation',
			fait: 'L’état de votre abonnement est indéterminé.',
			consequence: 'Ce que le produit vous ouvre ne peut pas être annoncé ici.'
		};
	}

	return null;
}

// ── L'équipe ───────────────────────────────────────────────────────────────

export function resumeEquipe(lecture: Lecture<EquipeAffichee>): ResumeDeSection {
	if (lecture.etat === 'attente') return EN_LECTURE;
	if (lecture.etat === 'erreur') return INDISPONIBLE;

	const { membres, invitations } = lecture.valeur;

	/*
	  ⚠️ LE PLAFOND DE PLACES NE FIGURE PAS SUR LA RANGÉE. Le plan de
	  développement en ouvre 9 999, et « 3 sur 9 999 » est exact et ne dit rien.
	  Les places se lisent dépliées, où le refus qui les concerne s'écrit en
	  entier.
	*/
	return {
		valeur: `${membres.length} personne${pluriel(membres.length)}`,
		legende:
			invitations.length > 0
				? `${invitations.length} invitation${pluriel(invitations.length)} en attente`
				: 'Qui accède aux factures et aux dossiers.'
	};
}

function urgencesEquipe(lecture: Lecture<EquipeAffichee>): readonly UrgenceDuCompte[] {
	if (lecture.etat !== 'pret') return [];
	const { membres, invitations } = lecture.valeur;
	const urgences: UrgenceDuCompte[] = [];

	if (invitations.length > 0) {
		/*
		  ⚠️ LA PLUS PROCHE, PAS LA PREMIÈRE DE LA LISTE. C'est celle qui expire
		  qui décide de l'urgence, et l'ordre de la liste ne la porte pas.
		*/
		const echeance = Math.min(...invitations.map((invitation) => invitation.expireLe));
		urgences.push({
			cle: 'equipe',
			fait: `${invitations.length} invitation${pluriel(invitations.length)} en attente.`,
			consequence: `La plus proche expire le ${enDate(echeance)} ; passé ce jour, son lien ne vaut plus rien.`
		});
	}

	const aVerifier = membres.filter((membre) => !membre.adresseVerifiee).length;
	if (aVerifier > 0) {
		urgences.push({
			cle: 'equipe',
			fait: `${aVerifier} adresse${pluriel(aVerifier)} non vérifiée${pluriel(aVerifier)}.`,
			consequence:
				aVerifier > 1
					? 'Ces comptes ne reçoivent rien de ce que le produit leur envoie.'
					: 'Ce compte ne reçoit rien de ce que le produit lui envoie.'
		});
	}

	return urgences;
}

// ── Vos données ────────────────────────────────────────────────────────────

export function resumeDonnees(lecture: Lecture<DonneesAffichees>): ResumeDeSection {
	if (lecture.etat === 'attente') return EN_LECTURE;
	if (lecture.etat === 'erreur') return INDISPONIBLE;

	const { apercu } = lecture.valeur;
	if (apercu === null) return { valeur: 'Aucun établissement' };

	return {
		valeur:
			apercu.factures === 0
				? 'Rien d’importé'
				: `${NOMBRE.format(apercu.factures)} facture${pluriel(apercu.factures)}`,
		legende: `Détenues depuis le ${enDate(apercu.creeLe)}`
	};
}

// ── Votre carnet ───────────────────────────────────────────────────────────

/** Ce que la rangée « Votre défense » a besoin de savoir de l'équipe. */
export interface CarnetResume {
	readonly nombre: number;
}

export function resumeCarnet(lecture: Lecture<CarnetResume>): ResumeDeSection {
	if (lecture.etat === 'attente') return EN_LECTURE;
	if (lecture.etat === 'erreur') return INDISPONIBLE;

	const { nombre } = lecture.valeur;
	return {
		valeur: nombre === 0 ? 'Personne' : `${nombre} professionnel${pluriel(nombre)}`,
		legende: 'Les avocats et commissaires de justice avec qui vous travaillez.'
	};
}

// ── Ce que la file propose ─────────────────────────────────────────────────

export function resumeMesures(lecture: Lecture<MesuresAffichees>): ResumeDeSection {
	if (lecture.etat === 'attente') return EN_LECTURE;
	if (lecture.etat === 'erreur') return INDISPONIBLE;

	const { jours } = lecture.valeur;
	/*
	  ⚠️ AUCUN TAUX SUR LA RANGÉE REPLIÉE. La rétention et la correction sont de
	  l'instrumentation : posées à la surface d'une page de réglages, elles
	  deviendraient le tableau de bord qu'on vient admirer. Un compte de jours
	  relevés dit ce qu'il y a à lire sans rien noter.
	*/
	return {
		valeur:
			jours.length === 0
				? 'Aucun relevé'
				: `${jours.length} jour${pluriel(jours.length)} relevé${pluriel(jours.length)}`,
		legende: 'Ce que la surveillance a proposé, jour par jour.'
	};
}

// ── Affichage ──────────────────────────────────────────────────────────────

const LIBELLE_THEME: Record<Theme, string> = {
	auto: 'Automatique',
	dark: 'Sombre',
	light: 'Clair'
};

export function resumeAffichage(theme: Theme): ResumeDeSection {
	return { valeur: LIBELLE_THEME[theme], legende: 'Le thème de l’interface.' };
}

// ── Le bandeau ─────────────────────────────────────────────────────────────

/** Ce que le bandeau sait, et ce qu'il ne sait pas encore. */
export interface CeQuiPresse {
	readonly urgences: readonly UrgenceDuCompte[];
	/** Combien de sections se lisent encore, donc dont on ne peut rien affirmer. */
	readonly lecturesEnCours: number;
}

export function ceQuiPresse({
	identite,
	abonnement,
	equipe,
	maintenant
}: {
	readonly identite: IdentiteDuCreancier | null;
	readonly abonnement: Lecture<AbonnementAffiche | null>;
	readonly equipe: Lecture<EquipeAffichee>;
	readonly maintenant: number;
}): CeQuiPresse {
	const urgences = [
		urgenceEtablissement(identite),
		urgenceFacturation(abonnement, maintenant),
		...urgencesEquipe(equipe)
	].filter((urgence): urgence is UrgenceDuCompte => urgence !== null);

	/*
	  ⚠️ SEULES LES SECTIONS QUI PEUVENT PORTER UNE URGENCE COMPTENT DANS
	  L'ANGLE MORT. L'inventaire, le carnet et les mesures n'en portent aucune :
	  les compter ferait annoncer « trois sections se lisent encore » sur une
	  page dont on sait déjà tout ce qui peut presser, et ce bandeau-là
	  s'ignorerait en trois jours.
	*/
	const lecturesEnCours = [abonnement, equipe].filter(
		(lecture) => lecture.etat === 'attente'
	).length;

	return { urgences, lecturesEnCours };
}
