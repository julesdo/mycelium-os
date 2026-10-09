import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useAction } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { depuisCentimes, versEuros } from '../../lib/socle/montants';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { authClient } from '../../lib/client/auth';
import { useTheme } from '../../app/use-theme';
import { messageDeRefus, televerser } from '../../app/televerser';
import { CarteQontoBranchee } from '../../app/connexion-qonto';
import { CarteChiftBranchee } from '../../app/connexion-chift';
import type {
	EtatDirigeants,
	EtatImmatriculation,
	Lecture
} from '../../ui';
import { aujourdHuiISO, PileDeConnexions } from '../../ui';
import { EcranCompte, type CompteAffiche } from '../../screens/compte/compte';
import type { OrdreParDefaut, ReglesAffichees } from '../../screens/compte/regles';
import {
	messageDErreur,
	type EquipeAffichee,
	type InvitationEnAttente,
	type MembreEquipe,
	type RoleEquipe
} from '../../screens/compte/equipe';
import type { DonneesAffichees, FichierExport } from '../../screens/compte/donnees';
import type { MesuresAffichees } from '../../screens/compte/mesures';
import type { CarnetResume, IdentiteDuCreancier } from '../../screens/compte/presse';

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
	const qonto = useQuery(api.connexions.qontoDonnees.maConnexionQonto, {});
	const chift = useQuery(api.connexions.chiftDonnees.maConnexionChift, {});
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	/** Le point du matin par e-mail, pour la personne connectée. */
	const pointDuMatin = useQuery(api.recouvrement.briefing.monPointDuMatin, {});
	const reglerPointDuMatin = useMutation(api.recouvrement.briefing.reglerPointDuMatin);
	const mesure = useQuery(api.recouvrement.monEtablissement.volumeEmis, {});
	const mettreAJourOrg = useMutation(api.organizations.updateOrganization);
	const enregistrerProfil = useMutation(api.recouvrement.profil.enregistrer);
	const enregistrerCourriers = useMutation(api.recouvrement.profil.enregistrerCourriers);
	const enregistrerRegles = useMutation(api.recouvrement.profil.enregistrerReglesDeCalcul);
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
	// « Qui signe », proposé d'après le registre (01/10/2026).
	const lireDirigeants = useAction(api.recouvrement.annuaires.dirigeantsAuRegistre);
	const [etatDirigeants, setEtatDirigeants] = useState<EtatDirigeants>({ phase: 'REPOS' });
	// Le capital et le greffe, lus au BODACC au même toucher (06/10/2026).
	const lireImmatriculation = useAction(
		api.recouvrement.monEtablissement.immatriculationAuRegistre
	);
	const [etatImmatriculation, setEtatImmatriculation] = useState<EtatImmatriculation>({
		phase: 'REPOS'
	});
	const supprimerLeCompte = useMutation(api.rgpd.supprimerMonCompte);
	const supprimerLEtablissement = useMutation(api.rgpd.supprimerEtablissement);
	const [exportEnCours, setExportEnCours] = useState(false);
	const [fichier, setFichier] = useState<FichierExport | null>(null);
	const [erreurExport, setErreurExport] = useState<string | null>(null);
	const [erreurCompte, setErreurCompte] = useState<string | null>(null);
	const [erreurEtablissement, setErreurEtablissement] = useState<string | null>(null);

	/*
	  ── LES RÈGLES DE CALCUL, DÉRIVÉES AU RENDU ───────────────────────────────

	  ⚠️ `undefined` VEUT DIRE « PAS TOUCHÉ », ET CE N'EST PAS `null`. `null`
	  est une VALEUR de ce réglage — « pas choisi », l'état qui fait chiffrer les
	  deux ordres et retenir le plus bas. Confondre les deux ferait afficher
	  « Pas choisi » sur un établissement qui a choisi « les factures d'abord »,
	  tant que le profil n'est pas arrivé.

	  ⚠️ ET ON NE POSE RIEN DANS UN EFFET. La valeur affichée est ce que le gérant
	  a touché, sinon ce que le profil porte : dérivée au rendu, elle ne retombe
	  jamais d'un cran en retard derrière la lecture.
	*/
	const [ordreTouche, setOrdreTouche] = useState<OrdreParDefaut | undefined>(undefined);
	const [delaiTouche, setDelaiTouche] = useState<number | null | undefined>(undefined);
	const [enregistrementRegles, setEnregistrementRegles] =
		useState<ReglesAffichees['enregistrement']>('REPOS');

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

	// ── L'équipe de défense : son nombre, que la rangée porte (l'écran est /app/defense) ──
	const carnet = useQuery(api.recouvrement.intervenants.monCarnet, {});

	// ── Le visage de la personne, et le logo de l'établissement ─────────────
	const moi = useQuery(api.users.viewer, {});
	const monImage = useQuery(api.imageDeProfil.monImage, {});
	const genererUrlImage = useMutation(api.imageDeProfil.genererUrlImageProfil);
	const enregistrerImage = useMutation(api.imageDeProfil.enregistrerImageProfil);
	const choisirAvatar = useMutation(api.imageDeProfil.choisirAvatar);
	const retirerImage = useMutation(api.imageDeProfil.retirerImageProfil);
	const genererUrlLogo = useMutation(api.organizations.generateOrgLogoUploadUrl);
	const enregistrerLogo = useMutation(api.organizations.saveOrgLogo);
	const retirerLogo = useMutation(api.organizations.deleteOrgLogo);
	const [imageEnCours, setImageEnCours] = useState(false);
	const [erreurImage, setErreurImage] = useState<string | null>(null);
	const [logoEnCours, setLogoEnCours] = useState(false);
	const [erreurLogo, setErreurLogo] = useState<string | null>(null);

	/** Un geste d'image : l'état d'envoi pendant, le refus lisible après. */
	async function gesteImage(
		action: () => Promise<unknown>,
		setEnCours: (v: boolean) => void,
		setErreur: (v: string | null) => void
	) {
		setEnCours(true);
		setErreur(null);
		try {
			await action();
		} catch (e) {
			setErreur(messageDeRefus(e));
		} finally {
			setEnCours(false);
		}
	}
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

	const intervenants: Lecture<CarnetResume> =
		carnet === undefined
			? { etat: 'attente' }
			: { etat: 'pret', valeur: { nombre: carnet.length } };

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

	const ordreChoisi: OrdreParDefaut =
		ordreTouche !== undefined ? ordreTouche : (profil?.ordreImputationParDefaut ?? null);
	const delaiChoisi: number | null =
		delaiTouche !== undefined ? delaiTouche : (profil?.delaiRelanceParDefautJours ?? null);

	const compteAffiche: CompteAffiche = {
		profil: {
			nom: moi?.name ?? moi?.email ?? undefined,
			image:
				monImage?.avatar != null
					? monImage.avatar
					: monImage?.imageUrl != null
						? { url: monImage.imageUrl }
						: null,
			avatar: monImage?.avatar ?? null,
			enCours: imageEnCours,
			erreur: erreurImage,
			onTeleverser: (fichier) =>
				void gesteImage(
					async () => {
						const storageId = await televerser(() => genererUrlImage({}), fichier);
						await enregistrerImage({ storageId });
					},
					setImageEnCours,
					setErreurImage
				),
			onChoisirAvatar: (style, graine) =>
				void gesteImage(() => choisirAvatar({ style, graine }), setImageEnCours, setErreurImage),
			onRetirer: () => void gesteImage(() => retirerImage({}), setImageEnCours, setErreurImage)
		},
		identite,
		/*
		  Sans Qonto activé, la rangée repliée dit « Aucune » et ne s'ouvre sur rien :
		  pas de phrase qui promettrait une connexion qu'on ne peut pas encore faire.
		*/
		connexions: {
			// Un logiciel branché par Chift passe devant : c'est lui qui nourrit le plus.
			...(chift?.disponible && chift.statut !== null && chift.statut !== 'EN_ATTENTE'
				? {
						statut: chift.statut,
						nom: chift.logiciels.length > 0 ? chift.logiciels.join(' et ') : 'Votre logiciel'
					}
				: { statut: qonto?.statut ?? null, nom: 'Qonto' }),
			contenu:
				qonto?.disponible || chift?.disponible ? (
					<PileDeConnexions>
						{qonto?.disponible ? <CarteQontoBranchee /> : null}
						{chift?.disponible ? <CarteChiftBranchee principale={!qonto?.disponible} /> : null}
					</PileDeConnexions>
				) : null
		},
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
						onEnregistrer: mettreAJourOrg,
						logo: {
							nomEtablissement: org.name ?? '',
							url: org.logoUrl ?? null,
							modifiable: monRole?.role === 'ORG_ADMIN',
							enCours: logoEnCours,
							erreur: erreurLogo,
							onTeleverser: (fichier) =>
								void gesteImage(
									async () => {
										const storageId = await televerser(() => genererUrlLogo({}), fichier);
										await enregistrerLogo({ storageId });
									},
									setLogoEnCours,
									setErreurLogo
								),
							onRetirer: () => void gesteImage(() => retirerLogo({}), setLogoEnCours, setErreurLogo)
						}
					},
		regles: {
			ordre: ordreChoisi,
			delaiJours: delaiChoisi,
			enregistrement: enregistrementRegles,
			onChoisirOrdre: setOrdreTouche,
			onChoisirDelai: setDelaiTouche,
			onEnregistrer: () => {
				setEnregistrementRegles('EN_COURS');
				void enregistrerRegles({
					ordreImputationParDefaut: ordreChoisi,
					delaiRelanceParDefautJours: delaiChoisi
				})
					.then(() => setEnregistrementRegles('REPOS'))
					.catch((erreur: unknown) => setEnregistrementRegles({ erreur: messageDErreur(erreur) }));
			}
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
			onEnregistrer: enregistrerProfil,
			courriers:
				profil === null || profil === undefined
					? null
					: {
							initial: {
								signataireNom: profil.signataireNom ?? '',
								signataireQualite: profil.signataireQualite ?? '',
								email: profil.email ?? '',
								telephone: profil.telephone ?? '',
								capitalSocialEuros:
									profil.capitalSocial === undefined
										? ''
										: versEuros(depuisCentimes(profil.capitalSocial)),
								immatriculeRcs: profil.immatriculeRcs ?? null,
								villeGreffeRcs: profil.villeGreffeRcs ?? '',
								iban: profil.iban ?? ''
							},
							onEnregistrer: (valeurs) => enregistrerCourriers({ ...valeurs }),
							dirigeants:
								profil.siren === undefined
									? null
									: {
											etat: etatDirigeants,
											immatriculation: etatImmatriculation,
											onDemander: () => {
												const siren = profil.siren;
												if (siren === undefined) return;
												setEtatImmatriculation({ phase: 'EN_COURS' });
												lireImmatriculation({ siren })
													.then((lue) =>
														setEtatImmatriculation({
															phase: 'TROUVE',
															proposee:
																lue === null
																	? null
																	: {
																			capitalEuros:
																				lue.capitalCentimes === null
																					? null
																					: versEuros(depuisCentimes(lue.capitalCentimes)),
																			capitalPublieLe: lue.capitalPublieLe,
																			inscritAuRcs: lue.registre === 'RCS',
																			villeGreffe: lue.villeGreffe,
																			greffePublieLe: lue.greffePublieLe,
																			releveeLe: lue.releveeLe
																		}
														})
													)
													.catch((e: unknown) => {
														const convexe = e as { data?: unknown };
														setEtatImmatriculation({
															phase: 'ECHEC',
															message:
																typeof convexe.data === 'string'
																	? convexe.data
																	: 'Le journal officiel des entreprises n’a pas répondu.'
														});
													});
												setEtatDirigeants({ phase: 'EN_COURS' });
												lireDirigeants({ siren })
													.then(({ dirigeants, releveeLe }) =>
														setEtatDirigeants({ phase: 'TROUVE', dirigeants, releveeLe })
													)
													.catch((e: unknown) => {
														const convexe = e as { data?: unknown };
														setEtatDirigeants({
															phase: 'ECHEC',
															message:
																typeof convexe.data === 'string'
																	? convexe.data
																	: 'Le registre n’a pas répondu.'
														});
													});
											}
										}
						}
		},
		abonnement:
			abonnement === undefined ? { etat: 'attente' } : { etat: 'pret', valeur: abonnement },
		equipe,
		donnees: vosDonnees,
		intervenants,
		mesures,
		theme,
		onChoisirTheme: setTheme,
		pointDuMatin: {
			parCourriel: pointDuMatin,
			onRegler: (parCourriel) => void reglerPointDuMatin({ parCourriel })
		},
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
