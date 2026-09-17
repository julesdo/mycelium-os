import { useState } from 'react';
import type { Theme } from '../../app/use-theme';
import { BORNES_PALIER, TARIFS, palierDeTaille } from '../../lib/config/tarifs';
import type { EtatRechercheAvocat, FicheIntervenant, Lecture } from '../../ui';
import { EcranCompte, type CompteAffiche } from '../../screens/compte/compte';
import type { EtablissementAuRegistre, EtatCritere } from '../../screens/compte/creancier';
import type { EtablissementAffiche } from '../../screens/compte/etablissement';
import type { AbonnementAffiche } from '../../screens/compte/facturation';
import type {
	EquipeAffichee,
	InvitationEnAttente,
	MembreEquipe
} from '../../screens/compte/equipe';
import type {
	ApercuDonnees,
	DonneesAffichees,
	FichierExport
} from '../../screens/compte/donnees';
import type { IntervenantsAffiches } from '../../screens/compte/intervenants';
import type { MesuresAffichees } from '../../screens/compte/mesures';
import { AVOCATS_DEMO, BARREAUX_DEMO, CARNET_DEMO, ETABLISSEMENT_DEMO } from './communes';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * LES ENTRÉES DE LA FAMILLE, DÉCLARÉES AVANT TOUT CE QUI S'EN CALCULE.
 *
 * ⚠️ UNE SEULE FAMILLE LÀ OÙ IL Y EN AVAIT QUATRE. `reglages.tsx`,
 * `abonnement.tsx`, `equipe.tsx` et `donnees.tsx` montraient treize écrans qui
 * sont devenus six sections d'une même page : les garder séparés aurait obligé
 * trois fichiers à importer la mise en page du quatrième, ce qu'ils faisaient
 * déjà (`AvecLesReglages`), pour rendre chacun un morceau d'un écran unique.
 *
 * L'établissement est celui de toute la salle : son nom, son SIREN, son
 * adresse, sa qualité de commerçant et son volume de factures ne s'écrivent
 * qu'une fois, dans `communes.ts` (`ETABLISSEMENT_DEMO`). Le carnet et les deux
 * répertoires viennent du même endroit, partagés avec la famille procédure.
 *
 * Le reste se compose comme `/app/compte` le compose.
 */

/** L'établissement tel que `getMyOrg` le rend, réduit aux champs que la page lit. */
const ORGANISATION_DEMO = {
	_id: 'demo-etablissement',
	name: ETABLISSEMENT_DEMO.nom,
	facturesParAn: ETABLISSEMENT_DEMO.facturesParAn
};

/** Un profil de créancier, tel que `monProfil` le rend (`src/lib/convex/recouvrement/profil.ts`). */
interface ProfilDemo {
	readonly denomination: string;
	readonly siren?: string;
	readonly adresse?: string;
	readonly formeJuridique?: string;
	readonly estCommercant: EtatCritere;
}

/**
 * ⚠️ AUCUN PROFIL DE CRÉANCIER ENREGISTRÉ : `monProfil` rend `null`.
 *
 * C'est l'état que le reste de la salle montre déjà. L'accueil porte le verrou
 * « Votre identité de créancier » (`onglets.tsx`), qui mène désormais ici, et la
 * famille créance ne connaît pas la qualité de commerçant du créancier.
 */
const PROFIL_DEMO: ProfilDemo | null = null;

/** Le profil que le gérant enregistre : ce que l'établissement déclare. */
const PROFIL_ENREGISTRE_DEMO: ProfilDemo = {
	denomination: ETABLISSEMENT_DEMO.nom,
	siren: ETABLISSEMENT_DEMO.siren,
	adresse: ETABLISSEMENT_DEMO.adresse,
	formeJuridique: ETABLISSEMENT_DEMO.formeJuridique,
	estCommercant: ETABLISSEMENT_DEMO.estCommercant
};

/**
 * LE CAS OÙ LA FORME NE DIT RIEN, et c'est celui qu'il faut pouvoir regarder.
 *
 * Une entreprise individuelle porte au registre une forme juridique qui ne
 * distingue plus le commerçant de l'artisan, du libéral et de l'agriculteur
 * depuis la fusion des catégories de l'INSEE au 1er juillet 2018. La section
 * continue donc de poser la question, en disant pourquoi elle la pose : c'est la
 * seule occurrence où « le logiciel décide, le gérant confirme » cède.
 */
const PROFIL_SANS_DEDUCTION_DEMO: ProfilDemo = {
	denomination: ETABLISSEMENT_DEMO.nom,
	siren: ETABLISSEMENT_DEMO.siren,
	adresse: ETABLISSEMENT_DEMO.adresse,
	formeJuridique: 'Entrepreneur individuel',
	estCommercant: 'unknown'
};

/**
 * Ce que le registre public propose sur le nom de l'établissement de la salle.
 *
 * ⚠️ LE SECOND CANDIDAT NE PORTE PAS DE FORME JURIDIQUE, et c'est délibéré. Le
 * registre ne publie que ce qu'une annonce de greffe a porté : une annonce sans
 * forme existe, et le retenir doit faire REVENIR la question au lieu de garder
 * la déduction du candidat précédent.
 */
const CANDIDATS_REGISTRE_DEMO: readonly EtablissementAuRegistre[] = [
	{
		siren: ETABLISSEMENT_DEMO.siren,
		denomination: ETABLISSEMENT_DEMO.nom,
		formeJuridique: ETABLISSEMENT_DEMO.formeJuridique,
		adresse: ETABLISSEMENT_DEMO.adresse,
		derniereParution: '2026-04-18'
	},
	{
		siren: '552100554',
		denomination: ETABLISSEMENT_DEMO.nom,
		ville: 'Lyon',
		adresse: '14 Rue de Marseille 69007 Lyon',
		derniereParution: '2019-11-05'
	}
];

/** Le premier jour de la fenêtre de douze mois, comme `volumeEmis` la calcule. */
function unAnPlusTotDemo(): string {
	const jour = new Date(Date.now()).toISOString().slice(0, 10);
	return `${Number.parseInt(jour.slice(0, 4), 10) - 1}${jour.slice(4)}`;
}

/**
 * L'établissement de la section, composé comme la route le compose.
 *
 * ⚠️ LA MESURE NE TOMBE PAS SUR LE VOLUME DÉCLARÉ, ET C'EST LE CAS À MONTRER.
 * L'import ne couvre que ce qui a été déposé : un compte identique au chiffre
 * saisi ferait croire que les deux disent la même chose, alors que l'un est une
 * déclaration et l'autre une lecture.
 */
const ETABLISSEMENT_AFFICHE_DEMO: EtablissementAffiche = {
	nom: ORGANISATION_DEMO.name,
	cle: ORGANISATION_DEMO._id,
	initial: {
		nom: ORGANISATION_DEMO.name,
		factures: String(ORGANISATION_DEMO.facturesParAn)
	},
	mesure: {
		factures: Math.round(ORGANISATION_DEMO.facturesParAn * 0.78),
		depuis: unAnPlusTotDemo(),
		jusqua: new Date(Date.now()).toISOString().slice(0, 10),
		plafondAtteint: false
	},
	onEnregistrer: () => Promise.resolve()
};

// ── La facturation ─────────────────────────────────────────────────────────

/** Ce que la base et le déploiement portent pour l'abonnement de l'établissement. */
interface FacturationDemo {
	/** `organizations.facturesParAn`. Absent tant qu'il ne l'a pas déclaré : le champ est facultatif à `/bienvenue`. */
	readonly facturesParAn?: number;
	/** Une clé `PADDLE_API_KEY` posée sur le déploiement. */
	readonly clePaddle: boolean;
	/** `organizations.freeTrialEndsAt`, posé à la création de l'établissement. */
	readonly essaiJusquAu: number;
}

/**
 * ⚠️ AUCUNE CLÉ PADDLE : le compte marchand n'est pas ouvert, comme la section
 * de facturation le dit. Aucun abonnement souscrit, et l'essai court encore
 * douze jours.
 *
 * La fin de l'essai se lit sur l'horloge, et non sur un jour figé :
 * `EssaiEnCours` compte ses jours depuis `Date.now()`. Figée, elle ferait perdre
 * un jour à la démonstration chaque matin.
 */
const FACTURATION_DEMO: FacturationDemo = {
	facturesParAn: ETABLISSEMENT_DEMO.facturesParAn,
	clePaddle: false,
	essaiJusquAu: Date.now() + 12 * 24 * 60 * 60 * 1000
};

/**
 * Le plan effectif, par les seules branches de `resolveEffectivePlan` que ces
 * entrées atteignent (`src/lib/convex/billing.ts`) : sans clé, le plan de
 * développement ; avec une clé, l'essai qui court, et ses sièges dans
 * `PLAN_SEATS`. Aucune forme ne pose une clé sur un essai terminé : ce cas lève,
 * plutôt que de montrer un plan qu'aucune forme ne fait regarder.
 */
function planEffectif(facturation: FacturationDemo) {
	if (!facturation.clePaddle) return { tier: 'dev', isDev: true, seatsAllowed: 9999 };
	if (facturation.essaiJusquAu > Date.now()) {
		return { tier: 'procedures', isDev: false, seatsAllowed: 3 };
	}
	throw new Error(
		'Démonstration incomplète : cette forme termine l’essai, et la salle ne reproduit pas le plan qui suit.'
	);
}

/**
 * L'état d'abonnement, composé comme `etatAbonnement` le rend : le palier par
 * `palierDeTaille`, ses bornes et ses tarifs lus dans la grille, jamais écrits.
 */
function abonnementDe(facturation: FacturationDemo): AbonnementAffiche {
	const { tier, isDev, seatsAllowed } = planEffectif(facturation);
	const palier = palierDeTaille(facturation.facturesParAn);

	return {
		tier,
		isDev,
		palier,
		bornesPalier: BORNES_PALIER[palier],
		facturesParAn: facturation.facturesParAn ?? null,
		tarifs: TARIFS[palier],
		seatsAllowed,
		paddleStatus: null,
		paddleConfigure: facturation.clePaddle,
		essaiFiniLe: facturation.essaiJusquAu > Date.now() ? facturation.essaiJusquAu : null
	};
}

// ── L'équipe ───────────────────────────────────────────────────────────────

/**
 * Les personnes de l'établissement, aux deux rôles.
 *
 * Le jeu expose ce qui casse : un compte sans nom, une adresse jamais vérifiée,
 * une invitation qui expire demain. Un écran où trois collègues bien nommés se
 * rangent en colonne ne prouve rien.
 *
 * ⚠️ EXPORTÉ : la famille de la révélation en tire la date d'arrivée la plus
 * ancienne, qui est la date de création de l'établissement.
 */
export const MEMBRES: MembreEquipe[] = [
	{
		id: 'm1',
		nom: 'Claire Béranger',
		email: 'c.beranger@thumbbb.fr',
		role: 'ORG_ADMIN',
		arriveLe: Date.parse('2026-02-11'),
		adresseVerifiee: true,
		estMoi: true
	},
	{
		id: 'm2',
		nom: 'Yannis K.',
		email: 'yannis.k@thumbbb.fr',
		role: 'ORG_MEMBER',
		arriveLe: Date.parse('2026-03-02'),
		adresseVerifiee: true,
		estMoi: false
	},
	{
		id: 'm3',
		nom: null,
		email: 'direction@thumbbb.fr',
		role: 'ORG_MEMBER',
		arriveLe: Date.parse('2026-08-19'),
		adresseVerifiee: false,
		estMoi: false
	}
];

const INVITATIONS: InvitationEnAttente[] = [
	{
		id: 'i1',
		email: 'nouveau.second@thumbbb.fr',
		role: 'ORG_MEMBER',
		lien: 'https://www.letikette.com/rejoindre/4f1c-demo',
		expireLe: Date.now() + 26 * 60 * 60 * 1000
	}
];

/**
 * L'équipe lue par Yannis K., qui n'administre pas : le compte connecté est la
 * seule entrée changée. `listOrganizationMembers` ne marque `estMoi` que sur le
 * compte qui lit.
 */
const MEMBRES_VUS_PAR_UN_MEMBRE: readonly MembreEquipe[] = MEMBRES.map((membre) => ({
	...membre,
	estMoi: membre.id === 'm2'
}));

/** Le compte connecté : le membre que `estMoi` marque. */
function compteConnecte(membres: readonly MembreEquipe[]): MembreEquipe {
	const compte = membres.find((membre) => membre.estMoi);
	if (compte === undefined) {
		throw new Error(
			'Démonstration incomplète : aucun membre de l’équipe n’est le compte connecté.'
		);
	}
	return compte;
}

/**
 * La section équipe, composée comme la route la compose.
 *
 * Les invitations en attente ne vont qu'à un administrateur :
 * `listOrgInvitations` rend une liste vide à un membre. Les places sont celles
 * que `getBillingStatus` résout par `resolveEffectivePlan`, comme l'état
 * d'abonnement : sans clé Paddle, celles du plan de développement.
 */
function equipeDe(membres: readonly MembreEquipe[], facturation: FacturationDemo): EquipeAffichee {
	const estAdmin = compteConnecte(membres).role === 'ORG_ADMIN';

	return {
		membres,
		invitations: estAdmin ? INVITATIONS : [],
		estAdmin,
		siegesUtilises: membres.length,
		siegesAutorises: planEffectif(facturation).seatsAllowed,
		onChangerRole: () => Promise.resolve(),
		onRetirer: () => Promise.resolve(),
		onAnnulerInvitation: () => Promise.resolve(),
		onVerifierAdresse: () => Promise.resolve(),
		// La feuille d'après l'envoi montre le lien à copier : sans lui, la salle
		// ne verrait jamais l'état qui existe pour une invitation tombée dans les
		// indésirables.
		onInviter: () => Promise.resolve('https://www.letikette.com/rejoindre/4f1c-demo')
	};
}

// ── Les données ────────────────────────────────────────────────────────────

/** Ce que l'établissement a importé, enregistré, identifié et arrêté. */
interface ContenuDemo {
	readonly depots: number;
	readonly factures: number;
	readonly decomptes: number;
	readonly debiteurs: number;
}

/**
 * Les nombres de l'inventaire, que `api.rgpd.apercuDeMesDonnees` compte en
 * lisant les lignes de chaque table. Aucune fonction de la salle ne produit ces
 * lignes : les nombres restent écrits.
 */
const CONTENU_DEMO: ContenuDemo = { depots: 3, factures: 312, decomptes: 2, debiteurs: 47 };

/** Un établissement qui vient d'être créé : rien d'importé, d'enregistré, d'identifié ni d'arrêté. */
const CONTENU_NOUVEAU_CLIENT_DEMO: ContenuDemo = {
	depots: 0,
	factures: 0,
	decomptes: 0,
	debiteurs: 0
};

/** Les règlements enregistrés : l'inventaire ne les compte pas, l'export les écrit un par un. */
const REGLEMENTS_DEMO = 268;

/** La taille du fichier que l'export dépose : la salle ne compose pas ce fichier. */
const OCTETS_EXPORT_DEMO = 287_412;

/**
 * L'inventaire, composé comme `apercuDeMesDonnees` le rend.
 *
 * L'établissement se crée avec son premier administrateur, inscrit dans la même
 * mutation (`createOrganization`) : sa date de création est l'arrivée la plus
 * ancienne de l'équipe.
 */
function apercuDe(membres: readonly MembreEquipe[], contenu: ContenuDemo): ApercuDonnees {
	return {
		nomEtablissement: ETABLISSEMENT_DEMO.nom,
		estAdmin: compteConnecte(membres).role === 'ORG_ADMIN',
		creeLe: Math.min(...membres.map((membre) => membre.arriveLe)),
		depots: contenu.depots,
		factures: contenu.factures,
		decomptes: contenu.decomptes,
		debiteurs: contenu.debiteurs,
		membres: membres.length
	};
}

/** Le fichier, tel que `exporterMesDonnees` le rend : son nom porte le jour de l'export. */
const FICHIER_DEMO: FichierExport = {
	// Un fichier vide, servi sur place : le lien du produit mène au stockage du
	// déploiement, et expire une heure après l'export.
	url: 'data:application/json,%7B%7D',
	octets: OCTETS_EXPORT_DEMO,
	lignes: CONTENU_DEMO.factures + REGLEMENTS_DEMO,
	nomFichier: `letikette-export-${new Date().toISOString().slice(0, 10)}.json`
};

function donneesDe(
	membres: readonly MembreEquipe[],
	contenu: ContenuDemo,
	fichier: FichierExport | null
): DonneesAffichees {
	return {
		apercu: apercuDe(membres, contenu),
		exportation: { fichier, enCours: false, erreur: null, onPreparer: () => undefined },
		suppressionDuCompte: { email: compteConnecte(membres).email ?? '', erreur: null },
		onSupprimerLeCompte: () => undefined,
		suppressionDeLEtablissement: { erreur: null },
		onSupprimerLEtablissement: () => undefined
	};
}

// ── Le carnet ──────────────────────────────────────────────────────────────

/**
 * Le carnet de la salle, partagé avec la famille procédure (`communes.ts`) : la
 * même table, lue par deux surfaces. Les deux recherches partent fermées, comme
 * en production.
 */
function intervenantsDe(carnet: readonly FicheIntervenant[]): IntervenantsAffiches {
	return {
		carnet,
		erreur: null,
		onAjouter: () => undefined,
		onOublier: () => undefined,
		rechercheCommissaireOuverte: false,
		etatRechercheCommissaire: { phase: 'REPOS' },
		onOuvrirRechercheCommissaire: () => undefined,
		onFermerRechercheCommissaire: () => undefined,
		onChercherCommissaire: () => undefined,
		onRetenirEtude: () => undefined,
		rechercheAvocatOuverte: false,
		repertoire: BARREAUX_DEMO,
		barreau: AVOCATS_DEMO.barreau,
		specialite: '',
		etatAvocats: { phase: 'TROUVE', resultat: AVOCATS_DEMO } satisfies EtatRechercheAvocat,
		onOuvrirRechercheAvocat: () => undefined,
		onFermerRechercheAvocat: () => undefined,
		onChoisirBarreau: () => undefined,
		onChoisirSpecialite: () => undefined,
		onRetenirAvocat: () => undefined
	};
}

// ── Les formes de la page ──────────────────────────────────────────────────

/** Ce qu'une forme de la famille fait varier, une entrée à la fois. */
interface FormeCompte {
	readonly profil: ProfilDemo | null;
	readonly membres: readonly MembreEquipe[];
	readonly facturation: FacturationDemo;
	readonly contenu: ContenuDemo;
	readonly fichier: FichierExport | null;
	readonly carnet: readonly FicheIntervenant[];
	/** Vrai quand les quatre sections qui ne retiennent pas la page se lisent encore. */
	readonly enLecture: boolean;
}

const COMPTE_DEMO: FormeCompte = {
	profil: PROFIL_DEMO,
	membres: MEMBRES,
	facturation: FACTURATION_DEMO,
	contenu: CONTENU_DEMO,
	fichier: null,
	carnet: CARNET_DEMO,
	enLecture: false
};

/**
 * Les formes nommées, chacune sur une SEULE entrée changée.
 *
 * « vu par un membre » montre les DEUX refus en quatre parties que la page
 * porte : l'invitation et l'export, tous deux réservés à un administrateur.
 * « paiement ouvert » pose une clé Paddle : l'essai donne les trois places du
 * plan `procedures`, que l'équipe occupe toutes, invitation comprise — c'est le
 * troisième refus, celui des places.
 */
const FORMES_COMPTE_DEMO: Readonly<Record<string, FormeCompte>> = {
	'profil enregistré': { ...COMPTE_DEMO, profil: PROFIL_ENREGISTRE_DEMO },
	'forme qui ne déduit rien': { ...COMPTE_DEMO, profil: PROFIL_SANS_DEDUCTION_DEMO },
	'vu par un membre': { ...COMPTE_DEMO, membres: MEMBRES_VUS_PAR_UN_MEMBRE },
	'paiement ouvert': {
		...COMPTE_DEMO,
		facturation: { ...FACTURATION_DEMO, clePaddle: true }
	},
	'volume non renseigné': {
		...COMPTE_DEMO,
		facturation: { ...FACTURATION_DEMO, facturesParAn: undefined }
	},
	'nouveau client': { ...COMPTE_DEMO, contenu: CONTENU_NOUVEAU_CLIENT_DEMO },
	'export prêt': { ...COMPTE_DEMO, fichier: FICHIER_DEMO },
	'carnet vide': { ...COMPTE_DEMO, carnet: [] },
	'sections en lecture': { ...COMPTE_DEMO, enLecture: true }
};

/**
 * DEUX JOURNÉES DE PROPOSITIONS, ET ELLES DISENT DEUX CHOSES OPPOSÉES.
 *
 * La première est celle qui doit faire DESCENDRE le plafond : sept posées,
 * douze différées, rétention à 100 % et médiane sous deux secondes — c'est du
 * « Retenir » à l'aveugle, pas de la justesse, et la correction qui suit le
 * confirme. La seconde est une journée ordinaire : on lit, on retient, on
 * écarte.
 *
 * ⚠️ LA TROISIÈME LIGNE PORTE UN `enAttente` À `null`. C'est le jour où le
 * battement n'a rien relevé : la colonne affiche un tiret, jamais un zéro, et
 * la salle existe pour qu'on le VOIE avant qu'un client ne le voie.
 */
const MESURES_DEMO: MesuresAffichees = {
	jours: [
		{
			jour: '2026-09-17',
			posees: 7,
			enAttente: 12,
			retenues: 7,
			ecartees: 0,
			indecises: 0,
			tauxRetention: 1,
			delaiMedianMs: 940,
			decideesSansHorodatage: 0,
			corrections: 1,
			tauxCorrection: 1 / 7
		},
		{
			jour: '2026-09-16',
			posees: 5,
			enAttente: 0,
			retenues: 3,
			ecartees: 1,
			indecises: 1,
			tauxRetention: 3 / 4,
			delaiMedianMs: 14_200,
			decideesSansHorodatage: 1,
			corrections: 0,
			tauxCorrection: 0
		},
		{
			jour: '2026-09-15',
			posees: 0,
			enAttente: null,
			retenues: 0,
			ecartees: 0,
			indecises: 0,
			tauxRetention: null,
			delaiMedianMs: null,
			decideesSansHorodatage: 0,
			corrections: 0,
			tauxCorrection: null
		}
	]
};

/** La page, composée comme sa route la compose. */
function compteDe(forme: FormeCompte, theme: Theme, onChoisirTheme: (t: Theme) => void) {
	const attente = { etat: 'attente' } as const;
	const abonnement: Lecture<AbonnementAffiche | null> = forme.enLecture
		? attente
		: { etat: 'pret', valeur: abonnementDe(forme.facturation) };

	return {
		etablissement: ETABLISSEMENT_AFFICHE_DEMO,
		creancier: {
			cle: ORGANISATION_DEMO._id,
			nomEtablissement: ORGANISATION_DEMO.name,
			initial: {
				denomination: forme.profil?.denomination ?? ORGANISATION_DEMO.name,
				siren: forme.profil?.siren ?? '',
				adresse: forme.profil?.adresse ?? '',
				formeJuridique: forme.profil?.formeJuridique ?? '',
				estCommercant: forme.profil?.estCommercant ?? 'unknown'
			},
			/*
			  Le registre répond, et il propose DEUX sociétés au même nom : c'est le
			  cas qui compte. Une liste à un seul élément ferait croire que le produit
			  peut choisir seul.
			*/
			onChercherAuRegistre: () => Promise.resolve(CANDIDATS_REGISTRE_DEMO),
			onEnregistrer: () => Promise.resolve()
		},
		abonnement,
		equipe: forme.enLecture
			? attente
			: ({ etat: 'pret', valeur: equipeDe(forme.membres, forme.facturation) } as const),
		donnees: forme.enLecture
			? attente
			: ({
					etat: 'pret',
					valeur: donneesDe(forme.membres, forme.contenu, forme.fichier)
				} as const),
		intervenants: forme.enLecture
			? attente
			: ({ etat: 'pret', valeur: intervenantsDe(forme.carnet) } as const),
		mesures: forme.enLecture ? attente : ({ etat: 'pret', valeur: MESURES_DEMO } as const),
		theme,
		onChoisirTheme,
		onSeDeconnecter: () => undefined
	} satisfies CompteAffiche;
}

/**
 * LE VIDE DE LA PAGE : AUCUN ÉTABLISSEMENT ACTIF.
 *
 * ⚠️ IL NE VIDE PAS LA PAGE ENTIÈRE, et c'est le cas qu'il faut regarder.
 * Presque inatteignable en production — la coquille `/app` renvoie vers
 * `/bienvenue` — il survient si l'établissement disparaît pendant la session.
 * La section « Votre établissement » montre alors le chemin, la facturation et
 * les données disent qu'il n'y a rien à calculer ni à effacer, et la
 * déconnexion reste atteignable.
 */
function compteSansEtablissement(theme: Theme, onChoisirTheme: (t: Theme) => void): CompteAffiche {
	const base = compteDe(COMPTE_DEMO, theme, onChoisirTheme);
	return {
		...base,
		etablissement: null,
		abonnement: { etat: 'pret', valeur: null },
		donnees: {
			etat: 'pret',
			valeur: { ...donneesDe(MEMBRES, CONTENU_DEMO, null), apercu: null }
		},
		intervenants: { etat: 'pret', valeur: intervenantsDe([]) }
	};
}

/**
 * La page du compte, avec un thème tenu par la démonstration : le choisir allume
 * l'autre bouton, sans changer le thème de la salle. La déconnexion ne fait rien.
 */
function CompteDemo({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	// « Automatique », défaut du produit (`src/app/use-theme.ts`).
	const [theme, setTheme] = useState<Theme>('auto');

	// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
	const forme = formeDemo(variante, COMPTE_DEMO, FORMES_COMPTE_DEMO);

	return (
		<EcranCompte
			donnees={lectureDemo(
				etat,
				compteDe(forme, theme, setTheme),
				compteSansEtablissement(theme, setTheme)
			)}
		/>
	);
}

export const ECRANS_COMPTE: readonly EcranDuProduit[] = [
	{
		route: '/app/compte',
		libelle: 'compte',
		vide: true,
		variantes: Object.keys(FORMES_COMPTE_DEMO),
		Demo: CompteDemo
	}
];
