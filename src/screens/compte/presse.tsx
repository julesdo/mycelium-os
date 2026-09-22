import type { Lecture } from '../../ui';
import { pluriel } from '../../ui';
import type { Theme } from '../../app/use-theme';
import type { AbonnementAffiche } from './facturation';
import type { EquipeAffichee } from './equipe';
import type { DonneesAffichees } from './donnees';
import type { IntervenantsAffiches } from './intervenants';
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

/** Un jour entamé compte : « dans 1 jour » vaut mieux que « dans 0 ». */
function joursJusqua(echeance: number, maintenant: number): number {
	return Math.max(0, Math.ceil((echeance - maintenant) / 86_400_000));
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
export function resumeConnexions(statut: string | null): ResumeDeSection {
	const valeur =
		statut === 'A_JOUR'
			? 'Qonto connecté'
			: statut === 'SYNCHRONISATION'
				? 'Lecture en cours…'
				: statut === 'ECHEC' || statut === 'REVOQUEE'
					? 'À reconnecter'
					: 'Aucune';
	return { valeur, legende: 'Les logiciels d’où vos factures arrivent seules.' };
}

export function resumeProfil(profil: { readonly image: unknown; readonly avatar: unknown }): ResumeDeSection {
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
		consequence: 'Aucune injonction de payer possible sans elle.'
	};
}

// ── La facturation ─────────────────────────────────────────────────────────

/**
 * L'ÉTAT DE LA FACTURATION, DÉDUIT EXACTEMENT COMME LE SERVEUR LE DÉDUIT.
 *
 * ⚠️ C'EST `tier` QUI DIT CE QUI EST OUVERT, PAS `paddleStatus`.
 * `resolveEffectivePlan` fait tomber un abonnement résilié, en pause ou impayé
 * sur l'essai s'il court encore, et sur `none` sinon. Lire le statut Paddle
 * seul ferait annoncer « résilié » à un établissement dont l'essai couvre
 * encore tout, et — bien pire — ne dirait RIEN d'un établissement retombé sur
 * `none`, où le dépôt, la surveillance et le décompte sont fermés
 * (`PLAN_FEATURES.none`, quatre `false`).
 *
 * ⚠️ ET UNE COMBINAISON IMPOSSIBLE SE NOMME AU LIEU DE SE REPLIER. Un palier
 * ouvert sans abonnement, sans essai et sans plan de développement ne se
 * produit par aucune branche connue de `resolveEffectivePlan` : l'annoncer
 * « actif » serait inventer une réponse là où il n'y en a pas.
 */
export type EtatFacturation =
	| { readonly genre: 'developpement' }
	| { readonly genre: 'abonne' }
	| { readonly genre: 'essai'; readonly jours: number }
	| { readonly genre: 'ferme'; readonly cause: CauseDeFermeture }
	| { readonly genre: 'indetermine' };

/**
 * ⚠️ « ESSAI TERMINÉ » N'EST PAS UNE CAUSE, PARCE QUE L'ÉCRAN NE PEUT PAS LA
 * DISTINGUER. `etatAbonnement` ne rend `essaiFiniLe` que tant que l'essai
 * COURT : arrivé sur un palier fermé sans statut Paddle, l'écran ne sait pas si
 * un essai s'est terminé ou s'il n'y en a jamais eu. « Aucun abonnement »
 * couvre les deux sans rien affirmer de plus.
 */
export type CauseDeFermeture = 'past_due' | 'paused' | 'canceled' | 'jamais';

export function etatDeLaFacturation(
	abonnement: AbonnementAffiche,
	maintenant: number
): EtatFacturation {
	// `isDev` : aucune clé Paddle sur le déploiement. `tier === 'dev'` : un plan
	// posé à la main quand il n'y en avait pas (`org.devPlan`). Les deux ouvrent
	// tout, et les confondre avec un abonnement payé ferait annoncer un paiement
	// qui n'existe pas.
	if (abonnement.isDev || abonnement.tier === 'dev') return { genre: 'developpement' };

	if (abonnement.paddleStatus === 'active' || abonnement.paddleStatus === 'trialing') {
		return { genre: 'abonne' };
	}

	if (abonnement.tier === 'none') {
		return { genre: 'ferme', cause: causeDeLaFermeture(abonnement.paddleStatus) };
	}

	if (abonnement.essaiFiniLe !== null) {
		return { genre: 'essai', jours: joursJusqua(abonnement.essaiFiniLe, maintenant) };
	}

	return { genre: 'indetermine' };
}

function causeDeLaFermeture(statut: string | null): CauseDeFermeture {
	if (statut === 'past_due' || statut === 'paused' || statut === 'canceled') return statut;
	return 'jamais';
}

const FAIT_DE_LA_FERMETURE: Record<CauseDeFermeture, string> = {
	past_due: 'Le dernier paiement de votre abonnement a échoué.',
	paused: 'Votre abonnement est en pause.',
	canceled: 'Votre abonnement est résilié.',
	jamais: 'Aucun abonnement n’est actif sur cet établissement.'
};

/**
 * CE QUE `none` FERME VRAIMENT — RELEVÉ AUX POINTS D'USAGE, PAS DANS LA TABLE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `PLAN_FEATURES` DÉCLARE QUATRE VERROUS QUE RIEN N'APPLIQUE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La table pose `importFactures`, `surveillance`, `procedures` et `decompte` à
 * `false` pour `none`, et `assertFeatureAccess` sait les faire respecter — mais
 * cette fonction n'est appelée par AUCUNE mutation du produit (vérifié : ses
 * seuls lecteurs sont `billing.ts` lui-même et son test). Écrire ici « le dépôt
 * et le décompte sont fermés » serait annoncer une restriction qui n'existe
 * pas, sur l'écran même dont on exige qu'il ne mente pas.
 *
 * Le SEUL effet réellement appliqué de `tier === 'none'` est l'invitation :
 * `inviteOrganizationMember` et `assertSeatAvailable` lèvent tous deux
 * « Aucun abonnement actif ». C'est donc tout ce que cette phrase affirme.
 *
 * ⚠️ LE JOUR OÙ `assertFeatureAccess` EST BRANCHÉE, CETTE PHRASE CHANGE. Elle
 * est ici, seule, pour que ce soit un remplacement et pas une chasse.
 */
const CONSEQUENCE_DE_LA_FERMETURE =
	'Plus personne ne peut être invité dans cet établissement.';

const VALEUR_DE_LA_FERMETURE: Record<CauseDeFermeture, string> = {
	past_due: 'Paiement échoué',
	paused: 'En pause',
	canceled: 'Résilié',
	jamais: 'Aucun abonnement'
};

export function resumeFacturation(
	lecture: Lecture<AbonnementAffiche | null>,
	maintenant: number
): ResumeDeSection {
	if (lecture.etat === 'attente') return EN_LECTURE;
	if (lecture.etat === 'erreur') return INDISPONIBLE;
	const abonnement = lecture.valeur;
	if (abonnement === null) return { valeur: 'Aucun établissement' };

	const legende = `Palier ${abonnement.palier} — ${abonnement.bornesPalier}`;
	const etat = etatDeLaFacturation(abonnement, maintenant);

	switch (etat.genre) {
		case 'developpement':
			return { valeur: 'Développement', legende };
		case 'abonne':
			return { valeur: 'Actif', legende };
		case 'essai':
			return { valeur: `Essai, ${etat.jours} j`, legende };
		case 'ferme':
			return { valeur: VALEUR_DE_LA_FERMETURE[etat.cause], legende };
		case 'indetermine':
			return { valeur: 'Indéterminé', legende };
	}
}

function urgenceFacturation(
	lecture: Lecture<AbonnementAffiche | null>,
	maintenant: number
): UrgenceDuCompte | null {
	if (lecture.etat !== 'pret' || lecture.valeur === null) return null;
	const etat = etatDeLaFacturation(lecture.valeur, maintenant);

	if (etat.genre === 'ferme') {
		return {
			cle: 'facturation',
			fait: FAIT_DE_LA_FERMETURE[etat.cause],
			consequence: CONSEQUENCE_DE_LA_FERMETURE
		};
	}

	if (etat.genre === 'essai' && etat.jours <= JOURS_AVANT_FIN_D_ESSAI) {
		return {
			cle: 'facturation',
			fait: `Votre essai se termine dans ${etat.jours} jour${pluriel(etat.jours)}.`,
			/*
			  Un CONSTAT sur ce que le produit fera, jamais « abonnez-vous ». Et il
			  ne porte que le verrou réellement appliqué — voir
			  `CONSEQUENCE_DE_LA_FERMETURE`, qui explique pourquoi les trois autres
			  ne s'écrivent pas ici.
			*/
			consequence: `À son terme, sans abonnement, ${CONSEQUENCE_DE_LA_FERMETURE.charAt(0).toLowerCase()}${CONSEQUENCE_DE_LA_FERMETURE.slice(1)}`
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
				: 'Qui accède aux factures et aux créances.'
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

export function resumeCarnet(lecture: Lecture<IntervenantsAffiches>): ResumeDeSection {
	if (lecture.etat === 'attente') return EN_LECTURE;
	if (lecture.etat === 'erreur') return INDISPONIBLE;

	const { carnet } = lecture.valeur;
	return {
		valeur:
			carnet.length === 0 ? 'Aucune fiche' : `${carnet.length} fiche${pluriel(carnet.length)}`,
		legende: 'Commissaires de justice et avocats que vous avez notés.'
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
