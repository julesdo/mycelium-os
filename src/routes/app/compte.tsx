import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { authClient } from '../../lib/client/auth';
import { useTheme } from '../../app/use-theme';
import type {
	AvocatAffiche,
	EtatRechercheAvocat,
	EtatRechercheCommissaire,
	EtudeAffichee,
	FicheASaisir,
	Lecture
} from '../../ui';
import { aujourdHuiISO } from '../../ui';
import { EcranCompte, type CompteAffiche } from '../../screens/compte/compte';
import {
	messageDErreur,
	type EquipeAffichee,
	type InvitationEnAttente,
	type MembreEquipe,
	type RoleEquipe
} from '../../screens/compte/equipe';
import type { DonneesAffichees, FichierExport } from '../../screens/compte/donnees';
import type { IntervenantsAffiches } from '../../screens/compte/intervenants';
import type { MesuresAffichees } from '../../screens/compte/mesures';
import type { IdentiteDuCreancier } from '../../screens/compte/presse';

/**
 * `/app/compte` — LA SEULE ADRESSE DERRIÈRE L'AVATAR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TREIZE FICHIERS DE ROUTE SONT MORTS LE JOUR OÙ CELUI-CI EST NÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Onze `_reglages.*` — dont la mise en page sans chemin qui portait la liste et
 * son `useChildMatches` — plus les deux `donnees_.supprimer-*`. Les laisser sur
 * disque aurait fait treize routes déclarées que RIEN n'atteint, à l'instant
 * précis où `barre.tsx` repointe l'avatar ici : une route gardée sans lien ne
 * rend pas `aucun-ecran-orphelin` rouge, elle le rend menteur.
 *
 * ⚠️ CE FICHIER EST LE SEUL APPELANT DE VINGT ET UNE FONCTIONS PUBLIQUES.
 * Chacune était appelée par l'une des treize routes disparues ; aucune n'entre
 * dans `APPELEES_AUTREMENT`. Une fonction sans appelant se supprime ou se
 * rebranche, elle ne s'excuse pas.
 *
 * ⚠️ CHAQUE SECTION ATTEND SA PROPRE LECTURE, ET SEULEMENT LA SIENNE. La page
 * n'attend que l'établissement et le profil du créancier : ce sont les deux que
 * la première section édite, et la rangée du créancier montrait un tiret puis
 * « SIREN manquant » à chaque ouverture quand elle se rendait avant lui. Le
 * reste arrive quand il arrive, et sa section le dit.
 */
export const Route = createFileRoute('/app/compte')({
	component: PageCompte,
	errorComponent: CompteEnErreur
});

function CompteEnErreur() {
	return <EcranCompte donnees={{ etat: 'erreur' }} />;
}

function PageCompte() {
	const navigate = useNavigate();
	const { theme, setTheme } = useTheme();

	// ── L'établissement et l'identité du créancier ───────────────────────────
	const org = useQuery(api.organizations.getMyOrg, {});
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const mesure = useQuery(api.recouvrement.monEtablissement.volumeEmis, {});
	const mettreAJourOrg = useMutation(api.organizations.updateOrganization);
	const enregistrerProfil = useMutation(api.recouvrement.profil.enregistrer);
	const chercherMonEtablissement = useAction(
		api.recouvrement.monEtablissement.chercherMonEtablissementAuRegistre
	);

	/*
	  ── LA BASCULE D'ÉTABLISSEMENT, LUE ICI ET PAS DANS L'ÉCRAN ───────────────

	  ⚠️ ELLE NE RETIENT PAS LA PAGE. La liste et la bascule arrivent quand elles
	  arrivent : tant que la liste se lit, l'en-tête n'affiche simplement pas de
	  pilule de changement, et le nom de l'établissement courant — qui vient de
	  `getMyOrg`, lui attendu — est déjà là. Faire attendre toute la page pour
	  une pilule que la plupart des comptes ne verront jamais serait payer un
	  répertoire pour un mono-site.

	  ⚠️ ET ELLE NE PASSE PAS PAR `SelecteurEtablissement`. Celui-ci interroge
	  Convex lui-même, ce qui le rend impossible à rendre dans la salle
	  d'exposition — or l'écran entier doit s'y regarder aux quatre largeurs sans
	  session. Voir `screens/compte/en-tete.tsx`.
	*/
	const mesEtablissements = useQuery(api.organizations.listMyOrganizations, {});
	const basculer = useMutation(api.organizations.switchOrganization);

	// ── La facturation ───────────────────────────────────────────────────────
	const abonnement = useQuery(api.billing.etatAbonnement, {});

	// ── L'équipe ─────────────────────────────────────────────────────────────
	const membres = useQuery(api.organizations.listOrganizationMembers, {});
	const invitations = useQuery(api.organizations.listOrgInvitations, {});
	const monRole = useQuery(api.organizations.getMyOrgMembership, {});
	const facturation = useQuery(api.billing.getBillingStatus, {});
	const changerRole = useMutation(api.organizations.updateMemberRole);
	const retirer = useMutation(api.organizations.removeOrganizationMember);
	const annuler = useMutation(api.organizations.cancelInvitation);
	const verifierAdresse = useMutation(api.organizations.verifyMemberEmail);
	const inviter = useMutation(api.organizations.inviteOrganizationMember);

	// ── Les données ──────────────────────────────────────────────────────────
	const apercu = useQuery(api.rgpd.apercuDeMesDonnees, {});
	const compte = useQuery(api.auth.getCurrentUser, {});
	const exporter = useAction(api.rgpd.exporterMesDonnees);
	const supprimerLeCompte = useMutation(api.rgpd.supprimerMonCompte);
	const supprimerLEtablissement = useMutation(api.rgpd.supprimerEtablissement);
	const [exportEnCours, setExportEnCours] = useState(false);
	const [fichier, setFichier] = useState<FichierExport | null>(null);
	const [erreurExport, setErreurExport] = useState<string | null>(null);
	const [erreurCompte, setErreurCompte] = useState<string | null>(null);
	const [erreurEtablissement, setErreurEtablissement] = useState<string | null>(null);

	/*
	  ── Ce que la file propose, et ce qu'on en fait (D13) ─────────────────────

	  ⚠️ LA DATE EST LUE UNE FOIS, AU MONTAGE, ET PAS À CHAQUE RENDU. Un
	  `aujourdHuiISO()` posé dans l'appel changerait de valeur à minuit sous les
	  yeux d'un onglet ouvert, et Convex refetcherait une fenêtre différente sans
	  qu'on l'ait demandé. Une seule lecture d'horloge, figée par `useState`.
	*/
	const [aujourdHui] = useState(aujourdHuiISO);
	const mesuresDuPlafond = useQuery(api.recouvrement.propositions.mesures, {
		depuis: aujourdHui
	});

	// ── Le carnet d'intervenants ─────────────────────────────────────────────
	const carnet = useQuery(api.recouvrement.intervenants.monCarnet, {});
	const ajouterIntervenant = useMutation(api.recouvrement.intervenants.ajouterIntervenant);
	const oublierIntervenant = useMutation(api.recouvrement.intervenants.oublierIntervenant);
	const chercherUnCommissaire = useAction(
		api.recouvrement.annuaires.chercherUnCommissaireDeJustice
	);
	const [erreurCarnet, setErreurCarnet] = useState<string | null>(null);
	const [rechercheCommissaireOuverte, setRechercheCommissaireOuverte] = useState(false);
	const [etatRechercheCommissaire, setEtatRechercheCommissaire] =
		useState<EtatRechercheCommissaire>({ phase: 'REPOS' });
	const [rechercheAvocatOuverte, setRechercheAvocatOuverte] = useState(false);
	const [barreau, setBarreau] = useState('');
	const [specialite, setSpecialite] = useState('');

	/*
	  ⚠️ LES DEUX LECTURES DU RÉPERTOIRE SONT SAUTÉES TANT QUE LA FEUILLE EST
	  FERMÉE. Le parcours des barreaux lit un document par barreau, et la
	  recherche jusqu'à quatre mille fiches : les faire tourner à l'ouverture de
	  `/app/compte` ferait payer un répertoire que personne n'a demandé, sur une
	  page qu'on ouvre pour corriger une adresse.
	*/
	const repertoire = useQuery(
		api.recouvrement.annuaires.barreauxDuRepertoire,
		rechercheAvocatOuverte ? {} : 'skip'
	);
	const avocats = useQuery(
		api.recouvrement.annuaires.chercherUnAvocat,
		rechercheAvocatOuverte && barreau !== ''
			? { barreau, specialite: specialite === '' ? undefined : specialite }
			: 'skip'
	);

	/*
	  ⚠️ « PAS ENCORE CHOISI » ET « JE LIS » SONT DEUX ÉTATS, pas un. Les
	  confondre ferait attendre un résultat que personne n'a demandé — et, à
	  l'inverse, ferait lire un écran de repos pendant une lecture réelle.
	*/
	const etatAvocats: EtatRechercheAvocat =
		barreau === ''
			? { phase: 'AUCUN_BARREAU' }
			: avocats === undefined
				? { phase: 'EN_COURS' }
				: { phase: 'TROUVE', resultat: avocats };

	async function preparerExport() {
		setExportEnCours(true);
		setErreurExport(null);
		try {
			setFichier(await exporter({}));
		} catch (e) {
			setErreurExport(messageDErreur(e));
		} finally {
			setExportEnCours(false);
		}
	}

	/**
	 * ⚠️ APRÈS LA SUPPRESSION DU COMPTE, ON DÉCONNECTE. La session reste
	 * cryptographiquement valide quelques instants après que l'identité a
	 * disparu : sans déconnexion explicite, l'utilisateur se retrouve dans une
	 * application qui lui répond « accès refusé » partout, ce qui se lit comme
	 * une panne plutôt que comme le résultat qu'il a demandé.
	 */
	function confirmerSuppressionDuCompte() {
		setErreurCompte(null);
		void supprimerLeCompte({ confirmation: compte?.email ?? '' })
			.then(async () => {
				await authClient.signOut();
				await navigate({ to: '/' });
			})
			.catch((e: unknown) => setErreurCompte(messageDErreur(e)));
	}

	function confirmerSuppressionDeLEtablissement() {
		setErreurEtablissement(null);
		void supprimerLEtablissement({ confirmation: apercu?.nomEtablissement ?? '' })
			.then(() => navigate({ to: '/bienvenue' }))
			.catch((e: unknown) => setErreurEtablissement(messageDErreur(e)));
	}

	/**
	 * ⚠️ `origine` EST ÉCRITE ICI, PAS SAISIE. Une fiche tapée à la main est
	 * `SAISI_A_LA_MAIN` par construction. Une fiche venue d'un répertoire public
	 * porterait EN PLUS sa source et sa date de relevé — la mutation refuse sans
	 * elles — et ce formulaire ne peut donc pas en fabriquer une.
	 */
	async function ajouterAuCarnet(fiche: FicheASaisir) {
		setErreurCarnet(null);
		try {
			await ajouterIntervenant({
				nom: fiche.nom,
				role: fiche.role,
				ressort: fiche.ressort,
				origine: 'SAISI_A_LA_MAIN'
			});
		} catch (e) {
			setErreurCarnet(messageDErreur(e));
		}
	}

	async function oublierDuCarnet(intervenantId: Id<'intervenants'>) {
		setErreurCarnet(null);
		try {
			await oublierIntervenant({ intervenantId });
		} catch (e) {
			setErreurCarnet(messageDErreur(e));
		}
	}

	/**
	 * ⚠️ UN ÉCHEC NE DEVIENT JAMAIS UNE LISTE VIDE. « Aucune étude dans ce
	 * département » et « le registre n'a pas répondu » mènent à deux gestes
	 * opposés, et les confondre ferait chercher ailleurs un gérant dont la seule
	 * erreur était d'avoir cliqué une minute trop tôt.
	 */
	async function chercherUneEtude(departement: string) {
		setEtatRechercheCommissaire({ phase: 'EN_COURS' });
		try {
			setEtatRechercheCommissaire({
				phase: 'TROUVE',
				resultat: await chercherUnCommissaire({ departement })
			});
		} catch (e) {
			setEtatRechercheCommissaire({ phase: 'ECHEC', message: messageDErreur(e) });
		}
	}

	/**
	 * ⚠️ LA SOURCE ET SA DATE PARTENT AVEC LA FICHE, et la mutation la REFUSE
	 * sans elles. Une fiche venue d'un répertoire public sans sa provenance
	 * devient indiscernable d'une donnée officielle et fraîche — or celle-ci
	 * n'est ni l'un ni l'autre.
	 */
	async function retenirUneEtude(etude: EtudeAffichee) {
		if (etatRechercheCommissaire.phase !== 'TROUVE') return;
		const { resultat } = etatRechercheCommissaire;
		setErreurCarnet(null);
		try {
			await ajouterIntervenant({
				nom: etude.nom,
				role: 'COMMISSAIRE_DE_JUSTICE',
				ressort: `${etude.commune} ${etude.codePostal}`.trim(),
				adresse: etude.adresse,
				siren: etude.siren,
				origine: 'RETENU_DEPUIS_UN_REPERTOIRE',
				sourceRepertoire: resultat.source,
				sourceReleveeLe: resultat.releveeLe
			});
			setRechercheCommissaireOuverte(false);
		} catch (e) {
			setErreurCarnet(messageDErreur(e));
		}
	}

	/**
	 * ⚠️ SANS DATE DE RELEVÉ, ON NE RETIENT PAS — et on le dit. `releveeLe` vaut
	 * `null` quand aucune livraison n'a été ingérée ; dater du jour pour faire
	 * passer la mutation ferait entrer au carnet une fiche qui se présenterait
	 * comme relevée aujourd'hui, ce qu'elle n'est pas.
	 *
	 * ⚠️ LE RESSORT EST LE BARREAU, TEL QUE LE FICHIER L'ÉCRIT. Le recomposer
	 * depuis la ville ferait afficher « NANTES » pour un avocat inscrit au
	 * barreau de Nantes mais installé à Saint-Herblain.
	 */
	async function retenirUnAvocat(avocat: AvocatAffiche) {
		if (etatAvocats.phase !== 'TROUVE') return;
		const { resultat } = etatAvocats;

		if (resultat.releveeLe === null) {
			setErreurCarnet(
				'Ce répertoire ne porte pas de date de relevé : la fiche ne peut pas être retenue au ' +
					'carnet, faute de pouvoir dire de quand elle date.'
			);
			return;
		}

		setErreurCarnet(null);
		try {
			await ajouterIntervenant({
				nom: `${avocat.nom} ${avocat.prenom}`.trim(),
				role: 'AVOCAT',
				ressort: resultat.barreau,
				adresse: avocat.adresse,
				siren: avocat.siren,
				origine: 'RETENU_DEPUIS_UN_REPERTOIRE',
				sourceRepertoire: resultat.source,
				sourceReleveeLe: resultat.releveeLe
			});
			setRechercheAvocatOuverte(false);
		} catch (e) {
			setErreurCarnet(messageDErreur(e));
		}
	}

	if (org === undefined || profil === undefined) {
		return <EcranCompte donnees={{ etat: 'attente' }} />;
	}

	/*
	  ⚠️ L'ÉQUIPE ATTEND AUSSI LA FACTURATION. Tant qu'elle se lit, les places se
	  replieraient sur le nombre de membres, et l'équipe se dirait complète à
	  tort — un refus d'invitation affiché sur une lecture en retard.
	*/
	const equipe: Lecture<EquipeAffichee> =
		membres === undefined ||
		invitations === undefined ||
		monRole === undefined ||
		facturation === undefined
			? { etat: 'attente' }
			: {
					etat: 'pret',
					valeur: {
						membres: membres.map(versMembre),
						invitations: invitations.map(versInvitation),
						estAdmin: monRole?.role === 'ORG_ADMIN',
						siegesUtilises: membres.length,
						siegesAutorises: facturation?.seatsAllowed ?? membres.length,
						onChangerRole: async (membreId, role) => {
							await changerRole({ memberId: membreId as Id<'organizationMembers'>, role });
						},
						onRetirer: async (membreId) => {
							await retirer({ memberId: membreId as Id<'organizationMembers'> });
						},
						onAnnulerInvitation: async (invitationId) => {
							await annuler({ invitationId: invitationId as Id<'organizationInvitations'> });
						},
						onVerifierAdresse: async (membreId) => {
							await verifierAdresse({ memberId: membreId as Id<'organizationMembers'> });
						},
						/*
						  ⚠️ LE JETON NE SE JOURNALISE PAS : il vaut une entrée dans
						  l'établissement. Et le lien est reconstruit ICI, dans le
						  navigateur, à partir de l'origine courante — jamais renvoyé par le
						  serveur. Une origine posée en variable d'environnement se
						  désynchronise du domaine réellement servi, et le symptôme est un
						  lien d'invitation qui pointe vers l'ancien nom de domaine.
						*/
						onInviter: async (email, role) => {
							const { token } = await inviter({ email, role });
							return `${origineCourante()}/rejoindre/${token}`;
						}
					}
				};

	const vosDonnees: Lecture<DonneesAffichees> =
		apercu === undefined || compte === undefined
			? { etat: 'attente' }
			: {
					etat: 'pret',
					valeur: {
						apercu,
						exportation: {
							fichier,
							enCours: exportEnCours,
							erreur: erreurExport,
							onPreparer: () => void preparerExport()
						},
						suppressionDuCompte: { email: compte?.email ?? '', erreur: erreurCompte },
						onSupprimerLeCompte: confirmerSuppressionDuCompte,
						suppressionDeLEtablissement: { erreur: erreurEtablissement },
						onSupprimerLEtablissement: confirmerSuppressionDeLEtablissement
					}
				};

	const mesures: Lecture<MesuresAffichees> =
		mesuresDuPlafond === undefined
			? { etat: 'attente' }
			: { etat: 'pret', valeur: { jours: mesuresDuPlafond } };

	const intervenants: Lecture<IntervenantsAffiches> =
		carnet === undefined
			? { etat: 'attente' }
			: {
					etat: 'pret',
					valeur: {
						carnet,
						erreur: erreurCarnet,
						onAjouter: (fiche) => void ajouterAuCarnet(fiche),
						onOublier: (intervenantId) =>
							void oublierDuCarnet(intervenantId as Id<'intervenants'>),
						rechercheCommissaireOuverte,
						etatRechercheCommissaire,
						onOuvrirRechercheCommissaire: () => setRechercheCommissaireOuverte(true),
						onFermerRechercheCommissaire: () => setRechercheCommissaireOuverte(false),
						onChercherCommissaire: (departement) => void chercherUneEtude(departement),
						onRetenirEtude: (etude) => void retenirUneEtude(etude),
						rechercheAvocatOuverte,
						repertoire: repertoire ?? null,
						barreau,
						specialite,
						etatAvocats,
						onOuvrirRechercheAvocat: () => setRechercheAvocatOuverte(true),
						onFermerRechercheAvocat: () => setRechercheAvocatOuverte(false),
						onChoisirBarreau: (choisi) => {
							setBarreau(choisi);
							setSpecialite('');
						},
						onChoisirSpecialite: (choisie) => setSpecialite(choisie),
						onRetenirAvocat: (avocat) => void retenirUnAvocat(avocat)
					}
				};

	/*
	  ⚠️ « COMPLET » SE CALCULE ICI COMME L'ACCUEIL LE CALCULE, PAS AUTREMENT.
	  `/app/index.tsx` pose `profilCreancierComplet: profil !== null && profil.siren !== undefined`
	  et `ceQuiManque` en tire le verrou « Votre identité de créancier ». Deux
	  définitions du même mot se désaccorderaient un jour, et l'accueil dirait
	  « incomplet » pendant que le compte dirait « renseignée ».
	*/
	const identite: IdentiteDuCreancier | null =
		org === null
			? null
			: {
					nom: org.name ?? '',
					siren: profil?.siren ?? null,
					profilComplet: profil !== null && profil.siren !== undefined
				};

	const compteAffiche: CompteAffiche = {
		identite,
		/*
		  Une liste encore en lecture est une liste VIDE ici, jamais une liste à
		  un élément fabriquée depuis `org` : l'en-tête n'ouvrirait alors aucune
		  pilule, ce qui est exactement le bon comportement tant qu'on ne sait pas
		  s'il y a de quoi choisir.
		*/
		etablissements: (mesEtablissements ?? []).map((autre) => ({
			id: autre._id,
			nom: autre.name ?? 'Établissement sans nom'
		})),
		courantId: org?._id ?? null,
		onBasculer: (id) => {
			void basculer({ organizationId: id as Id<'organizations'> });
		},
		etablissement:
			org === null
				? null
				: {
						nom: org.name ?? undefined,
						cle: org._id,
						initial: {
							nom: org.name ?? '',
							factures: org.facturesParAn ? String(org.facturesParAn) : ''
						},
						mesure: mesure ?? null,
						onEnregistrer: mettreAJourOrg
					},
		creancier: {
			cle: org?._id ?? 'aucun',
			nomEtablissement: org?.name ?? '',
			initial: {
				denomination: profil?.denomination ?? org?.name ?? '',
				/*
				  ⚠️ LE `siret` DE L'ÉTABLISSEMENT SERT DE VALEUR DE DÉPART, ET
				  SEULEMENT ÇA. Ceux qui n'avaient rempli qu'`organizations.siret`
				  verraient sinon leur verrou « Votre identité de créancier » resté levé
				  alors qu'ils croient l'avoir renseigné. Il n'écrase jamais ce qui a été
				  saisi : `profil.siren` passe d'abord, et rien n'est écrit tant que le
				  gérant n'a pas enregistré.
				*/
				siren: profil?.siren ?? org?.siret ?? '',
				adresse: profil?.adresse ?? '',
				/*
				  ⚠️ LA FORME EST CE QUI PORTE LA DÉDUCTION, et elle est enregistrée avec
				  le reste : sans elle, la qualité de commerçant s'afficherait comme une
				  saisie du gérant dès la réouverture de la page, alors qu'elle a été
				  déduite.
				*/
				formeJuridique: profil?.formeJuridique ?? '',
				estCommercant: profil?.estCommercant ?? 'unknown'
			},
			onChercherAuRegistre: async () => (await chercherMonEtablissement({})).candidats,
			onEnregistrer: enregistrerProfil
		},
		abonnement:
			abonnement === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: abonnement },
		equipe,
		donnees: vosDonnees,
		intervenants,
		mesures,
		theme,
		onChoisirTheme: setTheme,
		onSeDeconnecter: () => void authClient.signOut().then(() => navigate({ to: '/connexion' }))
	};

	return <EcranCompte donnees={{ etat: 'pret', valeur: compteAffiche }} />;
}

/** L'origine réellement servie, jamais celle d'une variable d'environnement. */
function origineCourante(): string {
	return typeof window === 'undefined' ? '' : window.location.origin;
}

type MembreServeur = {
	_id: string;
	role: RoleEquipe;
	joinedAt: number;
	name: string | null;
	email: string | null;
	emailVerified: boolean;
	estMoi: boolean;
};

function versMembre(m: MembreServeur): MembreEquipe {
	return {
		id: m._id,
		nom: m.name,
		email: m.email,
		role: m.role,
		arriveLe: m.joinedAt,
		adresseVerifiee: m.emailVerified,
		estMoi: m.estMoi
	};
}

type InvitationServeur = {
	_id: string;
	email: string;
	role: RoleEquipe;
	token: string;
	expiresAt: number;
};

function versInvitation(i: InvitationServeur): InvitationEnAttente {
	return {
		id: i._id,
		email: i.email,
		role: i.role,
		lien: `${origineCourante()}/rejoindre/${i.token}`,
		expireLe: i.expiresAt
	};
}
