import { useEffect, useRef, useState } from 'react';
import { createFileRoute, Link, Navigate, useNavigate } from '@tanstack/react-router';
import { useAction, useMutation, Authenticated, Unauthenticated, AuthLoading } from 'convex/react';
import { Spinner } from '@cladd-ui/react';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../lib/convex/_generated/api';
import { authClient } from '../lib/client/auth';
import { useQuery } from '../app/donnees';
import { useDepotAuCoffre } from '../app/use-coffre';
import { useCaissePaddle } from '../app/caisse-paddle';
import { DUREE_ESSAI_JOURS, GRILLE } from '../lib/config/tarifs';
import { CarteQontoBranchee } from '../app/connexion-qonto';
import { CartesLogiciels, useLogicielsVisibles } from '../app/connexion-nango';
import {
	BoutonPrincipal,
	CadrePremiersPas,
	ChoixDeFormule,
	Facultatif,
	FeuilleDeReussite,
	ParcoursDepot,
	PileDeConnexions,
	aujourdHuiISO,
	eurosCentimes,
	pluriel,
	sirenLisible,
	type DirigeantPropose,
	type EtablissementPropose,
	type EtatDirigeants,
	type EtatRecherche,
	type ProgressionPremiersPas
} from '../ui';
import { qualiteCommercantDeLaForme } from '../lib/verticales/recouvrement/pays/france/commercialite';
import { EcranPlumeSePresente } from '../screens/premiers-pas/plume';
import { EcranEntreprise } from '../screens/premiers-pas/entreprise';
import { EcranFactures, type EtatDesFactures } from '../screens/premiers-pas/factures';
import { EcranLettres, type EnTeteSaisi } from '../screens/premiers-pas/lettres';
import { EcranRelances } from '../screens/premiers-pas/relances';
import { EcranPret, type LigneDuResume } from '../screens/premiers-pas/pret';
import { suivre } from '../app/analytique';

/**
 * LES PREMIERS PAS (13/10/2026, `docs/superpowers/specs/2026-10-13-premiers-pas.md`).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * SIX ÉTAPES, CHACUNE À SON ADRESSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Plume se présente, l'entreprise, les factures, les lettres, les relances,
 * puis « C'est prêt ». Chaque étape a son adresse (`?etape=`) : le retour du
 * navigateur revient d'une étape, un rechargement ne perd rien, et l'accueil
 * peut ramener à une étape restée en plan.
 *
 * ⚠️ L'ENTREPRISE COUPE LE PARCOURS EN DEUX. Avant elle, rien n'existe pour ce
 * compte : seules les deux premières étapes s'ouvrent. Après elle, revenir en
 * arrière n'a plus de sens (l'établissement est créé, l'essai ouvert) : elles se
 * ferment, et un compte qui revient reprend aux factures.
 *
 * ⚠️ RIEN N'EST OBLIGATOIRE APRÈS L'ENTREPRISE. Chaque étape a son « Plus tard »
 * (ou « Pas maintenant »), et ce qui reste se rappelle sur l'accueil
 * (`CeQuiManque`, le bloc du pilote) : on n'est jamais coincé dans un parcours.
 */
const ETAPES = ['plume', 'entreprise', 'factures', 'lettres', 'relances', 'pret'] as const;
type Etape = (typeof ETAPES)[number];

function estUneEtape(valeur: unknown): valeur is Etape {
	return typeof valeur === 'string' && (ETAPES as readonly string[]).includes(valeur);
}

export const Route = createFileRoute('/bienvenue')({
	validateSearch: (search: Record<string, unknown>): { etape?: Etape } => ({
		etape: estUneEtape(search.etape) ? search.etape : undefined
	}),
	component: PageBienvenue
});

/**
 * La garde, avant le parcours.
 *
 * Cet écran a un jour affiché ses champs à quelqu'un qui n'avait pas de
 * session : la création d'entreprise se faisait renvoyer `Unauthenticated`, et
 * le seul retour était un message rouge, après la saisie. Un formulaire qui ne
 * peut pas partir ne doit pas s'ouvrir.
 */
function PageBienvenue() {
	return (
		<>
			<AuthLoading>
				<Ouverture />
			</AuthLoading>

			<Unauthenticated>
				<div className="flex h-dvh flex-col items-center justify-center gap-cladd-2xs p-cladd-xs text-center">
					<h1 className="text-cladd-md font-semibold">Connectez-vous d&rsquo;abord.</h1>
					<p className="max-w-sm text-cladd-xs text-cladd-fg-soft">
						Votre entreprise se crée depuis votre compte. Une fois connecté, vous reviendrez ici.
					</p>
					<BoutonPrincipal as={Link} to="/connexion">
						Se connecter
					</BoutonPrincipal>
				</div>
			</Unauthenticated>

			<Authenticated>
				<PremiersPas />
			</Authenticated>
		</>
	);
}

function Ouverture() {
	return (
		<div className="flex h-dvh items-center justify-center">
			<Spinner size="md" />
			<span className="sr-only">Ouverture de votre espace…</span>
		</div>
	);
}

/** Le compte, tel que Better Auth le rend : son nom vaut son adresse tant qu'il n'en a pas donné. */
interface Compte {
	readonly name: string;
	readonly email: string;
}

/** Le nom que le gérant a donné, ou `null` s'il n'a encore donné que son adresse. */
function nomDonne(compte: Compte): string | null {
	const nom = compte.name.trim();
	return nom === '' || nom === compte.email.trim() ? null : nom;
}

function PremiersPas() {
	const navigate = useNavigate();
	const { etape: demandee } = Route.useSearch();
	const organisation = useQuery(api.organizations.getMyOrg, {});
	const compte = useQuery(api.auth.getCurrentUser, {}) as Compte | null | undefined;

	if (organisation === undefined || compte === undefined) return <Ouverture />;
	if (compte === null) return <Navigate to="/connexion" replace />;

	const etape: Etape =
		organisation === null
			? demandee === 'entreprise'
				? 'entreprise'
				: 'plume'
			: demandee === undefined || demandee === 'plume' || demandee === 'entreprise'
				? 'factures'
				: demandee;
	const rang = ETAPES.indexOf(etape);
	const aller = (cible: Etape) => void navigate({ to: '/bienvenue', search: { etape: cible } });
	const progression = (gestes: Omit<ProgressionPremiersPas, 'rang' | 'total'>) => ({
		rang,
		total: ETAPES.length,
		...gestes
	});

	switch (etape) {
		case 'plume':
			return (
				<EtapePlume
					progression={progression({})}
					compte={compte}
					onSuite={() => aller('entreprise')}
				/>
			);
		case 'entreprise':
			return (
				<EtapeEntreprise
					progression={progression({ onRetour: () => aller('plume') })}
					onSuite={() => aller('factures')}
				/>
			);
		case 'factures':
			return (
				<EtapeFactures
					progression={progression({ onPlusTard: () => aller('lettres') })}
					onSuite={() => aller('lettres')}
				/>
			);
		case 'lettres':
			return (
				<EtapeLettres
					progression={progression({
						onRetour: () => aller('factures'),
						onPlusTard: () => aller('relances')
					})}
					compte={compte}
					denominationParDefaut={organisation?.name ?? ''}
					onSuite={() => aller('relances')}
				/>
			);
		case 'relances':
			return (
				<EtapeRelances
					progression={progression({ onRetour: () => aller('lettres') })}
					onSuite={() => aller('pret')}
				/>
			);
		case 'pret':
			return (
				<EtapePret
					// Pas de retour sur le dernier écran : les relances activées y renverraient
					// aussitôt, et le bouton paraîtrait mort.
					progression={progression({})}
					compte={compte}
					onEntrer={() => {
						suivre('premiers-pas-termines');
						void navigate({ to: '/app' });
					}}
				/>
			);
	}
}

// ─────────────────────────────────────────────────────────────────────────
// 1. PLUME SE PRÉSENTE
// ─────────────────────────────────────────────────────────────────────────

function EtapePlume({
	progression,
	compte,
	onSuite
}: {
	readonly progression: ProgressionPremiersPas;
	readonly compte: Compte;
	readonly onSuite: () => void;
}) {
	const [nom, setNom] = useState(nomDonne(compte) ?? '');
	const [enCours, setEnCours] = useState(false);

	async function continuer() {
		const saisi = nom.trim();
		if (saisi === '') return;
		if (saisi !== compte.name.trim()) {
			setEnCours(true);
			/*
			  ⚠️ LE NOM N'ARRÊTE PAS LE PARCOURS. Il sert à saluer et à proposer qui
			  signe ; s'il ne s'écrit pas (réseau coupé), le compte garde son adresse
			  pour nom, comme avant, et le gérant le change depuis son compte.
			*/
			await authClient.updateUser({ name: saisi }).catch(() => undefined);
			setEnCours(false);
		}
		onSuite();
	}

	return (
		<EcranPlumeSePresente
			progression={progression}
			nom={nom}
			onNom={setNom}
			enCours={enCours}
			onContinuer={() => void continuer()}
		/>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// 2. L'ENTREPRISE
// ─────────────────────────────────────────────────────────────────────────

/**
 * La création de l'entreprise, et le câblage de la recherche au registre.
 *
 * ⚠️ L'ÉTAT DE LA RECHERCHE VIT ICI, PAS DANS L'ÉCRAN : c'est ce qui permet à
 * la salle d'exposition de montrer chaque phase sans rien cliquer.
 *
 * ⚠️ UNE PANNE N'EST PAS UNE ABSENCE. `AUCUN` et `ECHEC` sont deux états
 * distincts jusque dans le `catch` : rendre une liste vide sur une panne ferait
 * croire que le registre ne connaît pas l'entreprise.
 */
function EtapeEntreprise({
	progression,
	onSuite
}: {
	readonly progression: ProgressionPremiersPas;
	readonly onSuite: () => void;
}) {
	const creer = useMutation(api.organizations.createOrganization);
	const chercher = useAction(api.recouvrement.monEtablissement.chercherAuRegistreALInscription);

	const [nom, setNom] = useState('');
	const [recherche, setRecherche] = useState<EtatRecherche>({ phase: 'REPOS' });
	const [retenu, setRetenu] = useState<EtablissementPropose | null>(null);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	/** Le dernier terme parti au registre : il sert de jeton contre les réponses périmées. */
	const dernierTerme = useRef<string | null>(null);

	async function lancerLaRecherche(cherche: string) {
		if (cherche === '') return;
		dernierTerme.current = cherche;
		setRecherche({ phase: 'EN_COURS' });
		try {
			const { candidats } = await chercher({ nom: cherche });
			// ⚠️ UNE RÉPONSE PÉRIMÉE NE S'AFFICHE PAS : deux appels peuvent être en vol,
			// et le premier revenir en dernier.
			if (dernierTerme.current !== cherche) return;
			setRecherche(candidats.length === 0 ? { phase: 'AUCUN' } : { phase: 'TROUVE', candidats });
		} catch (e) {
			if (dernierTerme.current !== cherche) return;
			setRecherche({
				phase: 'ECHEC',
				message:
					e instanceof Error && e.message
						? e.message
						: 'Le registre n’a pas répondu. Réessayez dans un instant.'
			});
		}
	}

	/**
	 * LA RECHERCHE PART TOUTE SEULE, UNE FOIS LA FRAPPE POSÉE.
	 *
	 * ⚠️ C'EST UN EFFET PARCE QUE C'EN EST UN : un appel réseau déclenché par le
	 * temps, pas un état dérivé. Trois caractères au moins et 600 ms de silence (le
	 * BODACC est un service public gratuit) ; jamais deux fois le même terme.
	 */
	useEffect(() => {
		const cherche = nom.trim();
		if (retenu !== null || cherche.length < 3 || dernierTerme.current === cherche) return;
		const minuteur = window.setTimeout(() => void lancerLaRecherche(cherche), 600);
		return () => window.clearTimeout(minuteur);
		// `lancerLaRecherche` se referme sur des `set*`, stables par construction.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nom, retenu]);

	async function soumettre() {
		const saisi = nom.trim();
		if (saisi === '' && retenu === null) return;
		setErreur(null);
		setEnCours(true);
		try {
			await creer({
				name: (retenu?.denomination ?? saisi).trim(),
				// L'identité ne part que si le gérant a touché un candidat.
				...(retenu === null
					? {}
					: {
							creancier: {
								denomination: retenu.denomination,
								siren: retenu.siren,
								...(retenu.formeJuridique === undefined
									? {}
									: { formeJuridique: retenu.formeJuridique }),
								...(retenu.adresse === undefined ? {} : { adresse: retenu.adresse }),
								estCommercant: qualiteCommercantDeLaForme(retenu.formeJuridique).etat
							}
						})
			});
			onSuite();
		} catch (e) {
			// ⚠️ LE REFUS DU SERVEUR, MOT POUR MOT : la clé du numéro se vérifie à
			// l'écriture, et son message NOMME le numéro reçu.
			setErreur(
				messageDuRefus(
					e,
					'Votre entreprise n’a pas pu être créée. Réessayez ; si le problème persiste, écrivez-nous.'
				)
			);
		} finally {
			setEnCours(false);
		}
	}

	return (
		<EcranEntreprise
			progression={progression}
			nom={nom}
			onNom={(valeur) => {
				setNom(valeur);
				// Changer le nom périme la recherche.
				setRecherche({ phase: 'REPOS' });
			}}
			recherche={recherche}
			retenu={retenu}
			onChercher={() => void lancerLaRecherche(nom.trim())}
			onRetenir={(candidat) => {
				setRetenu(candidat);
				setNom(candidat.denomination);
				setRecherche({ phase: 'REPOS' });
			}}
			onChanger={() => setRetenu(null)}
			enCours={enCours}
			erreur={erreur}
			onCreer={() => void soumettre()}
		/>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// 3. LES FACTURES
// ─────────────────────────────────────────────────────────────────────────

function EtapeFactures({
	progression,
	onSuite
}: {
	readonly progression: ProgressionPremiersPas;
	readonly onSuite: () => void;
}) {
	// Le jour vient de la SEULE horloge de l'interface, comme l'accueil : le montant
	// montré ici est celui que le gérant retrouvera en entrant.
	const aujourdHui = aujourdHuiISO();
	const revelation = useQuery(api.recouvrement.revelation.revelation, { arreteAu: aujourdHui });
	const coffre = useQuery(api.coffre.coffre.apercuDuCoffre, {});
	const qonto = useQuery(api.connexions.qontoDonnees.maConnexionQonto, {});
	const logiciels = useLogicielsVisibles();
	const depot = useDepotAuCoffre({ genre: 'FACTURES' });
	const [depotOuvert, setDepotOuvert] = useState(false);

	if (revelation === undefined || coffre === undefined) {
		return (
			<CadrePremiersPas progression={progression} cle="factures-attente">
				<div className="flex flex-1 items-center justify-center">
					<Spinner size="md" />
				</div>
			</CadrePremiersPas>
		);
	}

	/*
	  ⚠️ CE QUI EST PARTI DU NAVIGATEUR COMPTE AUSSI. Entre la fin de l'envoi et
	  l'arrivée au coffre, un fichier n'est encore dans aucune lecture : sans lui,
	  l'écran repasserait une seconde sur « Montrez-moi vos factures ».
	*/
	const enRoute = depot.fichiers.filter(
		(f) => f.phase === 'ENVOI' || (f.phase === 'COFFRE' && f.suivi?.etat !== 'TERMINE')
	).length;
	const enLecture = Math.max(coffre.enCours.length, enRoute);

	const etat: EtatDesFactures =
		revelation.nombreFactures > 0
			? {
					phase: 'COMPTE',
					arreteAu: aujourdHui,
					total: revelation.total,
					principal: revelation.principal,
					interets: revelation.interets,
					indemnites: revelation.indemnites,
					nombreFactures: revelation.nombreFactures,
					nombreClients: new Set(
						revelation.lignes.map((ligne) => ligne.debiteurId ?? ligne.debiteur ?? ligne.reference)
					).size,
					enLecture
				}
			: enLecture > 0
				? { phase: 'EN_LECTURE', documents: enLecture }
				: coffre.total > 0
					? { phase: 'RIEN_D_ECHU', documents: coffre.total }
					: { phase: 'A_DEPOSER' };

	// Les cartes ne se passent que si leur connexion est activée (dormantes sans clé).
	const connexions =
		qonto?.disponible || logiciels ? (
			<PileDeConnexions>
				{qonto?.disponible ? (
					<Facultatif>
						<CarteQontoBranchee />
					</Facultatif>
				) : null}
				{logiciels ? (
					<Facultatif>
						{/* Le dépôt est déjà sur cet écran : le parcours ne le repropose pas. */}
						<CartesLogiciels principale={!qonto?.disponible} avecExport={false} />
					</Facultatif>
				) : null}
			</PileDeConnexions>
		) : undefined;

	return (
		<>
			<EcranFactures
				progression={progression}
				etat={etat}
				{...(connexions === undefined ? {} : { connexions })}
				onImporter={() => setDepotOuvert(true)}
				onContinuer={onSuite}
			/>
			<ParcoursDepot
				ouvert={depotOuvert}
				onFermer={() => setDepotOuvert(false)}
				destination={{ titre: 'vos factures', precision: 'lues dès leur arrivée' }}
				genre="FACTURES"
				depot={depot}
			/>
		</>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// 4. LES LETTRES
// ─────────────────────────────────────────────────────────────────────────

/** Deux noms se reconnaissent sans casse ni accents : « Olivier ROUX » est « olivier roux ». */
function memeNom(a: string, b: string): boolean {
	const plier = (s: string) =>
		s
			.normalize('NFD')
			.replace(/\p{M}/gu, '')
			.toLowerCase()
			.split(/\s+/u)
			.filter((mot) => mot !== '')
			.sort()
			.join(' ');
	return plier(a) !== '' && plier(a) === plier(b);
}

function EtapeLettres(proprietes: {
	readonly progression: ProgressionPremiersPas;
	readonly compte: Compte;
	readonly denominationParDefaut: string;
	readonly onSuite: () => void;
}) {
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	if (profil === undefined) {
		return (
			<CadrePremiersPas progression={proprietes.progression} cle="lettres-attente">
				<div className="flex flex-1 items-center justify-center">
					<Spinner size="md" />
				</div>
			</CadrePremiersPas>
		);
	}
	return <EtapeLettresChargee {...proprietes} profil={profil} />;
}

/** Le profil tel que la requête le rend, sans le réécrire à la main. */
type ProfilLu = NonNullable<FunctionReturnType<typeof api.recouvrement.profil.monProfil>>;

function EtapeLettresChargee({
	progression,
	compte,
	denominationParDefaut,
	onSuite,
	profil
}: {
	readonly progression: ProgressionPremiersPas;
	readonly compte: Compte;
	readonly denominationParDefaut: string;
	readonly onSuite: () => void;
	readonly profil: ProfilLu | null;
}) {
	const enregistrer = useMutation(api.recouvrement.profil.enregistrerEnTete);
	const lireDirigeants = useAction(api.recouvrement.annuaires.dirigeantsAuRegistre);
	const siren = profil?.siren;
	const dejaSigne = profil?.signataireNom !== undefined;

	/*
	  LE LOGICIEL PROPOSE, LE GÉRANT CONFIRME. Ce qui est déjà au profil reprend sa
	  place ; sinon, qui signe est la personne qui installe (son nom de compte), et
	  l'adresse est celle du compte. Tout reste modifiable.
	*/
	const [saisie, setSaisie] = useState<EnTeteSaisi>(() => ({
		signataireNom: profil?.signataireNom ?? nomDonne(compte) ?? '',
		signataireQualite: profil?.signataireQualite ?? '',
		email: profil?.email ?? compte.email,
		iban: profil?.iban ?? ''
	}));
	const [dirigeants, setDirigeants] = useState<EtatDirigeants>(
		siren !== undefined && !dejaSigne ? { phase: 'EN_COURS' } : { phase: 'REPOS' }
	);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	function demanderDirigeants() {
		if (siren === undefined) return;
		setDirigeants({ phase: 'EN_COURS' });
		lireDirigeants({ siren })
			.then(({ dirigeants: lus, releveeLe }) => {
				setDirigeants({ phase: 'TROUVE', dirigeants: lus, releveeLe });
				completerLaFonction(lus);
			})
			.catch((e: unknown) =>
				setDirigeants({
					phase: 'ECHEC',
					message: messageDuRefus(e, 'Le registre n’a pas répondu.')
				})
			);
	}

	/** Quand celui qui signe est un dirigeant publié, sa fonction est celle du registre. */
	function completerLaFonction(lus: readonly DirigeantPropose[]) {
		setSaisie((avant) => {
			if (avant.signataireQualite.trim() !== '') return avant;
			const trouve = lus.find((d) => memeNom(d.nom, avant.signataireNom));
			return trouve === undefined ? avant : { ...avant, signataireQualite: trouve.fonction };
		});
	}

	/*
	  ⚠️ LA LECTURE DU REGISTRE PART À L'ARRIVÉE, ICI SEULEMENT. Ailleurs (le
	  compte), elle attend qu'on la demande, parce que les champs y sont souvent
	  déjà remplis ; ici, ils sont vides, et c'est la lecture qui les remplit.
	  Un appel réseau, pas un état dérivé : l'état ne change qu'à sa réponse.
	*/
	useEffect(() => {
		if (siren === undefined || dejaSigne) return;
		let actif = true;
		lireDirigeants({ siren })
			.then(({ dirigeants: lus, releveeLe }) => {
				if (!actif) return;
				setDirigeants({ phase: 'TROUVE', dirigeants: lus, releveeLe });
				completerLaFonction(lus);
			})
			.catch((e: unknown) => {
				if (actif) {
					setDirigeants({
						phase: 'ECHEC',
						message: messageDuRefus(e, 'Le registre n’a pas répondu.')
					});
				}
			});
		return () => {
			actif = false;
		};
		// Une fois, à l'arrivée sur l'étape.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	async function soumettre() {
		setErreur(null);
		setEnCours(true);
		try {
			await enregistrer(saisie);
			onSuite();
		} catch (e) {
			setErreur(messageDuRefus(e, 'Ces informations n’ont pas pu être enregistrées. Réessayez.'));
		} finally {
			setEnCours(false);
		}
	}

	return (
		<EcranLettres
			progression={progression}
			denomination={profil?.denomination ?? denominationParDefaut}
			{...(profil?.adresse === undefined ? {} : { adresse: profil.adresse })}
			saisie={saisie}
			onSaisie={(changement) => setSaisie((avant) => ({ ...avant, ...changement }))}
			{...(siren === undefined ? {} : { dirigeants })}
			onDemanderDirigeants={demanderDirigeants}
			enCours={enCours}
			erreur={erreur}
			onEnregistrer={() => void soumettre()}
		/>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// 5. LES RELANCES
// ─────────────────────────────────────────────────────────────────────────

function EtapeRelances({
	progression,
	onSuite
}: {
	readonly progression: ProgressionPremiersPas;
	readonly onSuite: () => void;
}) {
	const actives = useQuery(api.recouvrement.pilote.relancesAutomatiques, {});
	const membre = useQuery(api.organizations.getMyOrgMembership, {});
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const activer = useMutation(api.recouvrement.pilote.activerRelances);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	/*
	  LES RELANCES PARTENT AVEC UNE FORMULE (14/10/2026). Quand la facturation est
	  ouverte et que rien n'est souscrit, le toucher ouvre d'abord le choix ; dès
	  que Paddle confirme, les relances s'activent, et la coche de réussite dit
	  quand le premier prélèvement aura lieu.
	*/
	const abonnement = useQuery(api.billing.etatAbonnement, {});
	const caisseServeur = useQuery(api.paddle.caisse, {});
	const ouvrirLePortail = useAction(api.paddle.getPortalUrl);
	const [choixOuvert, setChoixOuvert] = useState(false);
	const [maintenant] = useState(() => Date.now());
	const caisse = useCaissePaddle({
		caisse: caisseServeur,
		ouvrirLePortail: () => ouvrirLePortail({}),
		onSouscrit: () => {
			setChoixOuvert(false);
			activer({ actif: true }).catch((e: unknown) =>
				setErreur(
					messageDuRefus(
						e,
						'Votre formule est souscrite, mais les relances n’ont pas pu être activées. Réessayez.'
					)
				)
			);
		}
	});
	const formuleRequise =
		abonnement?.paiementOuvert === true &&
		abonnement.statut !== 'active' &&
		abonnement.statut !== 'trialing' &&
		caisse?.disponible === true;

	if (actives === undefined || membre === undefined || profil === undefined) {
		return (
			<CadrePremiersPas progression={progression} cle="relances-attente">
				<div className="flex flex-1 items-center justify-center">
					<Spinner size="md" />
				</div>
			</CadrePremiersPas>
		);
	}
	// Déjà décidé : il n'y a rien à redemander, sauf la coche d'une souscription
	// qui vient d'avoir lieu.
	if (actives && caisse?.souscrite == null) {
		return <Navigate to="/bienvenue" search={{ etape: 'pret' }} replace />;
	}

	async function oui() {
		if (formuleRequise) {
			setChoixOuvert(true);
			return;
		}
		setErreur(null);
		setEnCours(true);
		try {
			await activer({ actif: true });
			suivre('relances-activees', { depuis: 'premiers-pas' });
			onSuite();
		} catch (e) {
			setErreur(messageDuRefus(e, 'Les relances n’ont pas pu être activées. Réessayez.'));
		} finally {
			setEnCours(false);
		}
	}

	return (
		<>
			<EcranRelances
				progression={progression}
				administrateur={membre?.role === 'ORG_ADMIN'}
				enTeteIncomplet={
					profil === null ||
					profil.signataireNom === undefined ||
					profil.signataireQualite === undefined ||
					profil.email === undefined
				}
				enCours={enCours}
				erreur={erreur}
				onActiver={() => void oui()}
				onPasMaintenant={onSuite}
				{...(formuleRequise && caisse !== undefined
					? { formuleRequise: { essai: caisse.essai } }
					: {})}
			/>
			{caisse !== undefined && abonnement ? (
				<ChoixDeFormule
					ouverte={choixOuvert && caisse.souscrite === null}
					onFermer={() => setChoixOuvert(false)}
					retour
					recommandee={abonnement.recommandee}
					essaiDisponible={caisse.essai}
					enCours={caisse.enCours === 'formule'}
					maintenant={maintenant}
					utilisateurs={abonnement.utilisateurs}
					onChoisir={caisse.onChoisir}
					plusTard={{ libelle: 'Plus tard : rien ne part', onClick: () => setChoixOuvert(false) }}
				/>
			) : null}
			{caisse?.souscrite ? (
				<FeuilleDeReussite
					ouverte
					titre={caisse.souscrite.essai ? 'Votre essai commence' : 'Vous êtes abonné'}
					pour={`${GRILLE[caisse.souscrite.formule].nom}, ${caisse.souscrite.rythme === 'annuel' ? 'à l’année' : 'au mois'}`}
					detail={
						caisse.souscrite.essai
							? `Les relances sont activées. Rien n’est prélevé avant le ${new Date(maintenant + DUREE_ESSAI_JOURS * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} ; on vous prévient deux jours avant.`
							: 'Les relances sont activées. La facture de Paddle arrive par e-mail.'
					}
					principale={{
						libelle: 'Continuer',
						onClick: () => {
							caisse.onFermerLaReussite();
							onSuite();
						}
					}}
				/>
			) : null}
		</>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// 6. C'EST PRÊT
// ─────────────────────────────────────────────────────────────────────────

function EtapePret({
	progression,
	compte,
	onEntrer
}: {
	readonly progression: ProgressionPremiersPas;
	readonly compte: Compte;
	readonly onEntrer: () => void;
}) {
	const aujourdHui = aujourdHuiISO();
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const revelation = useQuery(api.recouvrement.revelation.revelation, { arreteAu: aujourdHui });
	const coffre = useQuery(api.coffre.coffre.apercuDuCoffre, {});
	const actives = useQuery(api.recouvrement.pilote.relancesAutomatiques, {});

	if (
		profil === undefined ||
		revelation === undefined ||
		coffre === undefined ||
		actives === undefined
	) {
		return (
			<CadrePremiersPas progression={progression} cle="pret-attente">
				<div className="flex flex-1 items-center justify-center">
					<Spinner size="md" />
				</div>
			</CadrePremiersPas>
		);
	}

	const lettresPretes =
		profil !== null &&
		profil.signataireNom !== undefined &&
		profil.signataireQualite !== undefined &&
		profil.email !== undefined;

	const lignes: LigneDuResume[] = [
		{
			cle: 'entreprise',
			titre: 'Votre entreprise',
			fait: profil?.siren !== undefined,
			ligne:
				profil?.siren === undefined
					? 'Son numéro se renseignera depuis votre compte'
					: `SIREN ${sirenLisible(profil.siren)}`
		},
		{
			cle: 'factures',
			titre: 'Vos factures',
			fait: revelation.nombreFactures > 0 || coffre.total > 0,
			ligne:
				revelation.nombreFactures > 0
					? `${eurosCentimes(revelation.total)} dus sur ${revelation.nombreFactures} facture${pluriel(revelation.nombreFactures)}`
					: coffre.enCours.length > 0
						? 'En lecture : je compte dès que c’est fini'
						: coffre.total > 0
							? 'Rien d’échu pour l’instant'
							: 'Quand vous voudrez, depuis l’accueil'
		},
		{
			cle: 'lettres',
			titre: 'Vos lettres',
			fait: lettresPretes,
			ligne: lettresPretes ? `Signées ${profil.signataireNom}` : 'Qui signe, à compléter'
		},
		{
			cle: 'relances',
			titre: 'Les relances',
			fait: actives,
			ligne: actives ? 'Activées : je relance à votre nom' : 'Pas encore : vous déciderez'
		}
	];

	const nom = nomDonne(compte);
	return (
		<EcranPret
			progression={progression}
			prenom={nom === null ? null : (nom.split(/\s+/u)[0] ?? null)}
			lignes={lignes}
			libelleEntree={
				revelation.nombreFactures > 0 ? 'Voir ce qu’on vous doit' : 'Ouvrir mon espace'
			}
			onEntrer={onEntrer}
		/>
	);
}

/**
 * LE REFUS DU SERVEUR, MOT POUR MOT : `ConvexError` porte sa phrase dans `.data`,
 * pas dans `.message` (qui rend le cadre du client et l'identifiant de requête).
 */
function messageDuRefus(e: unknown, repli: string): string {
	if (typeof e === 'object' && e !== null && 'data' in e) {
		const data = (e as { data: unknown }).data;
		if (typeof data === 'string') return data;
	}
	return e instanceof Error && e.message !== '' ? e.message : repli;
}
