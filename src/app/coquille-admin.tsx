import {
	createContext,
	useContext,
	useEffect,
	useState,
	useSyncExternalStore,
	type CSSProperties,
	type ReactNode
} from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import type { FunctionReturnType } from 'convex/server';
import { Button, SearchField } from '@cladd-ui/react';
import {
	ArrowLeftIcon,
	BellRingIcon,
	BuildingIcon,
	ChartColumnDecreasingIcon,
	CircleDashedIcon,
	EllipsisIcon,
	FilterIcon,
	HourglassIcon,
	ListChecksIcon,
	PhoneIcon,
	PhoneOutgoingIcon,
	ScrollTextIcon,
	StarIcon,
	TargetIcon,
	UserPlusIcon,
	UsersRoundIcon,
	InboxIcon,
	LifeBuoyIcon,
	FeatherIcon,
	CircleCheckIcon,
	MessageSquareReplyIcon,
	LandmarkIcon,
	TruckIcon,
	CalculatorIcon,
	BriefcaseIcon,
	HandshakeIcon,
	NewspaperIcon,
	ListRestartIcon,
	TicketIcon
} from 'lucide-react';
import { api } from '../lib/convex/_generated/api';
import type { RoleEquipe } from '../lib/admin/acces';
import { rangDuRole } from '../lib/admin/acces';
import {
	BarreDuBas,
	BoutonSecondaire,
	CarteLien,
	FeuillePleinEcran,
	Fond,
	IconeLetikette,
	Lien,
	ListeDeCartes,
	ListeDeRangees,
	RangeeLien,
	type DestinationBarre
} from '../ui';
import {
	BarreHauteBureau,
	BarreLaterale,
	CLASSE_IDENTITE_FIXE,
	CLASSE_IDENTITE_LATERALE,
	DeclencheurRechercheBureau,
	FournisseurDuTitreBureau,
	IdentiteLaterale,
	LARGEUR_LATERALE,
	type GroupeLateral
} from '../ui/coquille-bureau';
import { useMutation } from 'convex/react';
import type { Id } from '../lib/convex/_generated/dataModel';
import { bornesDuJourDeParis } from '../lib/admin/dates';
import { useMinute } from '../ui/minute';
import { PastilleDesTravaux } from '../ui/travaux';
import { useQuery, useRequeteEphemere } from './donnees';
import { usePlumeDit } from './parole-de-plume';
import { usePreference } from './use-preference';

/**
 * LA COQUILLE DE L'ADMIN (16/10/2026, `docs/superpowers/specs/2026-10-16-admin-socle-crm.md`).
 *
 * Au bureau, une barre latérale de CRM, sur Attio, Twenty et Lightfield : le
 * travail du jour (Aujourd'hui, Tâches), les fiches (Comptes, Prospects), les vues
 * enregistrées (À appeler, En essai, Sans prochaine action, À relancer,
 * Intéressés), l'analyse (les deux entonnoirs) et, pour le fondateur, l'équipe.
 * Chaque entrée dit combien de fiches l'attendent (`admin.compteurs`). La barre du
 * haut porte le titre, la recherche ⌘ K et « Ajouter un prospect ». Au téléphone,
 * une barre du bas à quatre onglets ; les vues sont les pastilles des listes.
 *
 * ⚠️ RIEN DE L'APPLICATION N'Y EST MONTÉ : ni Plume, ni le sélecteur
 * d'établissement, ni la cloche. L'admin regarde des comptes ; il n'en habite aucun.
 */

export type Compteurs = FunctionReturnType<typeof api.admin.compteurs.compteurs>;

type Destination = {
	readonly cle: string;
	readonly libelle: string;
	readonly Icone: DestinationBarre['Icone'];
	readonly vers: DestinationBarre['vers'];
	readonly prefixes: readonly string[];
	/** Une vue enregistrée : la recherche d'URL qu'elle pose (`?vue=`, `?affichage=`). */
	readonly recherche?: Readonly<Record<string, string>>;
	/** Le compte affiché à droite de l'entrée. */
	readonly compte?: keyof Compteurs;
};

const AUJOURDHUI: Destination = {
	cle: 'aujourdhui',
	libelle: 'Aujourd’hui',
	vers: '/admin',
	Icone: IconeLetikette,
	prefixes: []
};
const COMPTES: Destination = {
	cle: 'comptes',
	libelle: 'Comptes',
	vers: '/admin/comptes',
	Icone: BuildingIcon,
	prefixes: ['/admin/comptes'],
	compte: 'comptes'
};
const PROSPECTS: Destination = {
	cle: 'prospects',
	libelle: 'Prospects',
	vers: '/admin/prospects',
	Icone: TargetIcon,
	prefixes: ['/admin/prospects'],
	compte: 'prospects'
};
/** Les appels du jour (19/10/2026, audit stratégique : le téléphone d'abord). */
const APPELS: Destination = {
	cle: 'appels',
	libelle: 'Appels du jour',
	vers: '/admin/appels',
	Icone: PhoneOutgoingIcon,
	prefixes: ['/admin/appels'],
	compte: 'appelsDuJour'
};
const TACHES: Destination = {
	cle: 'taches',
	libelle: 'Tâches',
	vers: '/admin/taches',
	Icone: ListChecksIcon,
	prefixes: ['/admin/taches'],
	compte: 'tachesDues'
};

/**
 * LA FILE D'ATTENTE (20/10/2026) : les recherches longues de la prospection, en arrière-plan.
 * Le compte dit ce qui tourne et ce qui est prêt sans avoir été ouvert.
 */
const TRAVAUX: Destination = {
	cle: 'travaux',
	libelle: 'File d’attente',
	vers: '/admin/travaux',
	Icone: ListRestartIcon,
	prefixes: ['/admin/travaux'],
	compte: 'travaux'
};

/**
 * LE SUPPORT (16/10/2026, spec du service client § 6). « À vous » mène à la boîte ;
 * les autres entrées sont des vues de la même liste (`?vue=`).
 */
const SUPPORT: Destination = {
	cle: 'support',
	libelle: 'À vous',
	vers: '/admin/support',
	Icone: InboxIcon,
	prefixes: ['/admin/support'],
	compte: 'supportAVous'
};
const SUPPORT_ONGLET: Destination = {
	...SUPPORT,
	cle: 'support-onglet',
	libelle: 'Support',
	Icone: LifeBuoyIcon
};

/**
 * Les quatre onglets du téléphone. Le support y remplace les tâches (16/10/2026) : elles
 * restent dans « Aujourd'hui ».
 */
/** Le CMS du blog (19/10/2026) : les articles du dépôt, édités et publiés sur GitHub. */
const BLOG: Destination = {
	cle: 'blog',
	libelle: 'Blog',
	vers: '/admin/blog',
	Icone: NewspaperIcon,
	prefixes: ['/admin/blog']
};

const ONGLETS: readonly Destination[] = [AUJOURDHUI, COMPTES, PROSPECTS, SUPPORT_ONGLET];

const GROUPES: readonly {
	readonly cle: string;
	readonly titre?: string;
	readonly fondateur?: boolean;
	readonly destinations: readonly Destination[];
}[] = [
	{ cle: 'travail', destinations: [AUJOURDHUI, APPELS, TACHES, TRAVAUX] },
	{ cle: 'fiches', titre: 'Fiches', destinations: [COMPTES, PROSPECTS] },
	{ cle: 'contenu', titre: 'Contenu', destinations: [BLOG] },
	{
		// Les parcours de prospection (19/10/2026, audit stratégique) : un kanban et un
		// entonnoir par façon de vendre, chacun avec ses étapes.
		cle: 'parcours',
		titre: 'Parcours',
		destinations: [
			{
				cle: 'parcours-public',
				libelle: 'Fournisseurs publics',
				vers: '/admin/prospects',
				Icone: LandmarkIcon,
				prefixes: ['/admin/prospects'],
				recherche: { parcours: 'FOURNISSEUR_PUBLIC' },
				compte: 'parcoursFournisseurPublic'
			},
			{
				cle: 'parcours-transport',
				libelle: 'Transporteurs',
				vers: '/admin/prospects',
				Icone: TruckIcon,
				prefixes: ['/admin/prospects'],
				recherche: { parcours: 'TRANSPORTEUR' },
				compte: 'parcoursTransporteur'
			},
			{
				cle: 'parcours-cabinets',
				libelle: 'Experts-comptables',
				vers: '/admin/prospects',
				Icone: CalculatorIcon,
				prefixes: ['/admin/prospects'],
				recherche: { parcours: 'EXPERT_COMPTABLE' },
				compte: 'parcoursExpertComptable'
			},
			{
				cle: 'parcours-pme',
				libelle: 'PME logiciel',
				vers: '/admin/prospects',
				Icone: BriefcaseIcon,
				prefixes: ['/admin/prospects'],
				recherche: { parcours: 'PME_LOGICIEL' },
				compte: 'parcoursPmeLogiciel'
			},
			{
				cle: 'parcours-pilote',
				libelle: 'Pilotes',
				vers: '/admin/prospects',
				Icone: HandshakeIcon,
				prefixes: ['/admin/prospects'],
				recherche: { parcours: 'PILOTE' },
				compte: 'parcoursPilote'
			}
		]
	},
	{
		cle: 'support',
		titre: 'Support',
		destinations: [
			SUPPORT,
			{
				cle: 'support-ouvertes',
				libelle: 'Chez l’équipe',
				vers: '/admin/support',
				Icone: CircleDashedIcon,
				prefixes: ['/admin/support'],
				recherche: { vue: 'OUVERTES' },
				compte: 'supportOuvertes'
			},
			{
				cle: 'support-en-attente',
				libelle: 'En attente du client',
				vers: '/admin/support',
				Icone: HourglassIcon,
				prefixes: ['/admin/support'],
				recherche: { vue: 'EN_ATTENTE' },
				compte: 'supportEnAttente'
			},
			{
				cle: 'support-plume',
				libelle: 'Chez Plume',
				vers: '/admin/support',
				Icone: FeatherIcon,
				prefixes: ['/admin/support'],
				recherche: { vue: 'PLUME' },
				compte: 'supportPlume'
			},
			{
				cle: 'support-terminees',
				libelle: 'Terminées',
				vers: '/admin/support',
				Icone: CircleCheckIcon,
				prefixes: ['/admin/support'],
				recherche: { vue: 'TERMINEES' }
			},
			{
				cle: 'support-mesure',
				libelle: 'Mesure',
				vers: '/admin/support/mesure',
				Icone: ChartColumnDecreasingIcon,
				prefixes: ['/admin/support/mesure']
			},
			{
				cle: 'support-reponses',
				libelle: 'Réponses enregistrées',
				vers: '/admin/support/reponses',
				Icone: MessageSquareReplyIcon,
				prefixes: ['/admin/support/reponses']
			}
		]
	},
	{
		cle: 'vues',
		titre: 'Vues',
		destinations: [
			{
				cle: 'a-appeler',
				libelle: 'À appeler',
				vers: '/admin/comptes',
				Icone: PhoneIcon,
				prefixes: ['/admin/comptes'],
				recherche: { vue: 'A_APPELER' },
				compte: 'aAppeler'
			},
			{
				cle: 'en-essai',
				libelle: 'En essai',
				vers: '/admin/comptes',
				Icone: HourglassIcon,
				prefixes: ['/admin/comptes'],
				recherche: { vue: 'ESSAI' },
				compte: 'enEssai'
			},
			{
				cle: 'sans-action',
				libelle: 'Sans prochaine action',
				vers: '/admin/prospects',
				Icone: CircleDashedIcon,
				prefixes: ['/admin/prospects'],
				recherche: { vue: 'SANS_ACTION' },
				compte: 'sansAction'
			},
			{
				cle: 'a-relancer',
				libelle: 'À relancer',
				vers: '/admin/prospects',
				Icone: BellRingIcon,
				prefixes: ['/admin/prospects'],
				recherche: { vue: 'A_RELANCER' },
				compte: 'aRelancer'
			},
			{
				cle: 'interesses',
				libelle: 'Intéressés',
				vers: '/admin/prospects',
				Icone: StarIcon,
				prefixes: ['/admin/prospects'],
				recherche: { vue: 'INTERESSES' },
				compte: 'interesses'
			}
		]
	},
	{
		cle: 'analyse',
		titre: 'Analyse',
		destinations: [
			{
				cle: 'entonnoir-comptes',
				libelle: 'Parcours des comptes',
				vers: '/admin/comptes',
				Icone: FilterIcon,
				prefixes: ['/admin/comptes'],
				recherche: { affichage: 'entonnoir' }
			},
			{
				cle: 'entonnoir-prospection',
				libelle: 'Prospection',
				vers: '/admin/prospects',
				Icone: ChartColumnDecreasingIcon,
				prefixes: ['/admin/prospects'],
				recherche: { affichage: 'entonnoir' }
			}
		]
	},
	{
		cle: 'equipe',
		titre: 'L’équipe',
		fondateur: true,
		destinations: [
			{
				cle: 'equipe',
				libelle: 'Équipe',
				vers: '/admin/equipe',
				Icone: UsersRoundIcon,
				prefixes: ['/admin/equipe']
			},
			{
				cle: 'journal',
				libelle: 'Journal',
				vers: '/admin/journal',
				Icone: ScrollTextIcon,
				prefixes: ['/admin/journal']
			},
			// Les codes privilèges (27/10/2026) : le fondateur seul les crée et les révoque.
			{
				cle: 'codes',
				libelle: 'Codes privilèges',
				vers: '/admin/codes',
				Icone: TicketIcon,
				prefixes: ['/admin/codes']
			}
		]
	}
];

/** Toutes les entrées de la barre, pour savoir laquelle est la plus précise. */
const TOUTES = GROUPES.flatMap((g) => g.destinations);

function surLeChemin(d: Destination, chemin: string): boolean {
	const nu = chemin.replace(/\/$/, '');
	if (d.vers === '/admin') return nu === '/admin';
	return d.prefixes.some((p) => nu.startsWith(p));
}

/** Une vue est allumée quand l'adresse porte sa recherche, sur la liste elle-même. */
function vueAllumee(
	d: Destination,
	chemin: string,
	recherche: Readonly<Record<string, unknown>>
): boolean {
	if (d.recherche === undefined) return false;
	if (chemin.replace(/\/$/, '') !== d.vers) return false;
	return Object.entries(d.recherche).every(([cle, valeur]) => recherche[cle] === valeur);
}

/**
 * ⚠️ L'ENTRÉE LA PLUS PRÉCISE GAGNE : sur `/admin/prospects?vue=A_RELANCER`, « À
 * relancer » s'allume et « Prospects » s'éteint ; sur une fiche de prospect,
 * « Prospects » s'allume.
 */
function estActive(
	d: Destination,
	chemin: string,
	recherche: Readonly<Record<string, unknown>>
): boolean {
	if (d.recherche !== undefined) return vueAllumee(d, chemin, recherche);
	return surLeChemin(d, chemin) && !TOUTES.some((autre) => vueAllumee(autre, chemin, recherche));
}

/** Une destination, allumée ou non selon l'adresse, avec son compte. */
function allumee(
	d: Destination,
	chemin: string,
	recherche: Readonly<Record<string, unknown>>,
	compteurs?: Compteurs
) {
	const compte =
		d.compte === undefined || compteurs === undefined ? undefined : compteurs[d.compte];
	return {
		cle: d.cle,
		libelle: d.libelle,
		Icone: d.Icone,
		vers: d.vers,
		actif: estActive(d, chemin, recherche),
		...(d.recherche === undefined ? {} : { recherche: d.recherche }),
		...(compte === undefined ? {} : { valeur: String(compte) })
	};
}

/** Les pages d'une fiche : le composeur y prend la place de la barre d'onglets. */
function surUneFiche(chemin: string): boolean {
	return (
		/^\/admin\/(comptes|prospects)\/(?!importer|trouver)[^/]+\/?$/.test(chemin) ||
		/^\/admin\/support\/(?!reponses|mesure)[^/]+\/?$/.test(chemin)
	);
}

const ContexteRole = createContext<RoleEquipe>('LECTURE');

/** Posé par la garde de `/admin`, une fois l'accès vérifié. */
export const FournisseurDuRole = ContexteRole.Provider;

/** Le rôle de celui qui regarde : les écrans cachent ce que le serveur lui refuserait. */
export function useRoleAdmin(): RoleEquipe {
	return useContext(ContexteRole);
}

/** « jules.dore@… » → « Jules ». */
function prenomDeLAdresse(email: string): string {
	const debut = email.split('@')[0]?.split(/[._-]/)[0] ?? '';
	return debut === '' ? 'L’équipe' : debut.charAt(0).toUpperCase() + debut.slice(1);
}

/**
 * Qui signe les e-mails et se présente au téléphone : le prénom affiché, sinon le début
 * de l'adresse (« jules » plutôt que rien), et s'il est fondateur. `undefined` le temps
 * de la lecture.
 */
export function useSignataireAdmin(): { prenom: string; fondateur: boolean } | undefined {
	const role = useRoleAdmin();
	const moi = useQuery(api.admin.support.moi, {});
	if (moi === undefined) return undefined;
	return {
		prenom: moi.prenomAffiche ?? prenomDeLAdresse(moi.email),
		fondateur: role === 'FONDATEUR'
	};
}

/** L'instant présent, à la minute, et les bornes du jour de Paris ; `null` sans horloge (rendu serveur). */
export function useHorlogeAdmin(): {
	maintenant: number;
	debutDuJour: number;
	finDuJour: number;
} | null {
	const minute = useMinute();
	if (minute === null) return null;
	const maintenant = minute * 60_000;
	const { debut, fin } = bornesDuJourDeParis(maintenant);
	return { maintenant, debutDuJour: debut, finDuJour: fin };
}

/** Le message d'un refus du serveur, sans l'enveloppe technique. */
export function messageDuServeur(erreur: unknown): string {
	if (erreur instanceof Error) {
		const donnee = (erreur as Error & { data?: unknown }).data;
		return typeof donnee === 'string' ? donnee : erreur.message;
	}
	return 'L’opération a échoué. Réessayez.';
}

/**
 * Un geste de l'équipe, et son mot : le refus du serveur se dit au lieu de se
 * perdre (un rôle en lecture, un accès retiré entre-temps). La promesse échoue
 * quand même : une feuille ne se ferme pas sur un geste refusé.
 */
export function useGesteAdmin() {
	const dire = usePlumeDit();
	return async function faire(geste: () => Promise<unknown>, mot?: Parameters<typeof dire>[0]) {
		try {
			await geste();
			if (mot !== undefined) dire(mot);
		} catch (e) {
			dire({ titre: 'Pas fait', texte: messageDuServeur(e), humeur: 'attention' });
			throw e;
		}
	};
}

/** Cocher une tâche, puis « Faite · Annuler » (Juicebox, HubSpot). */
export function useCocherTache(): (id: string, faite: boolean) => void {
	const cocher = useMutation(api.admin.taches.cocher);
	const faire = useGesteAdmin();
	return (id, faite) => {
		const tacheId = id as Id<'tachesCrm'>;
		faire(() => cocher({ tacheId, faite }), {
			titre: faite ? 'Faite' : 'Rouverte',
			texte: faite ? 'Tâche cochée.' : 'Tâche rouverte.',
			geste: { libelle: 'Annuler', faire: () => void cocher({ tacheId, faite: !faite }) }
		}).catch(() => undefined);
	};
}

export function permis(role: RoleEquipe, roleMin: RoleEquipe | undefined): boolean {
	return roleMin === undefined || rangDuRole(role) >= rangDuRole(roleMin);
}

/**
 * LA BARRE LATÉRALE DU CRM, sans lecture : la coquille lui passe l'adresse et les
 * compteurs, la salle des données de démonstration.
 */
export function BarreLateraleAdmin({
	role,
	chemin,
	recherche,
	compteurs,
	reduite,
	onBasculer
}: {
	readonly role: RoleEquipe | null;
	readonly chemin: string;
	readonly recherche: Readonly<Record<string, unknown>>;
	readonly compteurs?: Compteurs;
	readonly reduite: boolean;
	readonly onBasculer: () => void;
}) {
	const groupes: GroupeLateral[] =
		role === null
			? []
			: GROUPES.filter((g) => g.fondateur !== true || permis(role, 'FONDATEUR')).map((g) => ({
					cle: g.cle,
					...(g.titre === undefined ? {} : { titre: g.titre }),
					destinations: g.destinations.map((d) => allumee(d, chemin, recherche, compteurs))
				}));
	return (
		<BarreLaterale
			reduite={reduite}
			onBasculer={onBasculer}
			tete={
				<span className={CLASSE_IDENTITE_FIXE}>
					<IdentiteLaterale
						vignette={
							<span className="flex size-9 items-center justify-center rounded-full bg-cladd-fg text-cladd-bg">
								<IconeLetikette size={18} aria-hidden />
							</span>
						}
						nom="Letikette"
						ligne="Admin"
					/>
				</span>
			}
			groupes={groupes}
			pied={
				<Lien to="/app" className={CLASSE_IDENTITE_LATERALE}>
					<IdentiteLaterale
						vignette={
							<span className="flex size-9 items-center justify-center rounded-full bg-cladd-fg/[0.06]">
								<ArrowLeftIcon aria-hidden className="size-4" />
							</span>
						}
						nom="L’application"
						ligne="Revenir à votre établissement"
					/>
				</Lien>
			}
		/>
	);
}

export function CoquilleAdmin({
	role,
	children
}: {
	readonly role: RoleEquipe | null;
	readonly children: ReactNode;
}) {
	const chemin = useRouterState({ select: (etat) => etat.location.pathname });
	const [emplacementDuTitre, setEmplacementDuTitre] = useState<HTMLElement | null>(null);
	const [laterale, setLaterale] = usePreference('letikette:barre-laterale', 'ouverte', [
		'ouverte',
		'reduite'
	] as const);

	const recherche = useRouterState({ select: (etat) => etat.location.search }) as Readonly<
		Record<string, unknown>
	>;
	const compteurs = useQuery(api.admin.compteurs.compteurs, role === null ? 'skip' : {});
	const travaux = useQuery(api.admin.travaux.fileDAttente, role === null ? 'skip' : {});
	const travauxEnCours = (travaux ?? []).filter(
		(t) => t.etat === 'EN_ATTENTE' || t.etat === 'EN_COURS'
	).length;
	const travauxPrets = (travaux ?? []).filter(
		(t) => (t.etat === 'FAIT' || t.etat === 'ECHEC') && !t.vu
	).length;
	// La file et l'écran qui suit le travail le disent déjà : la pastille s'y tait.
	const pastilleTue =
		chemin.startsWith('/admin/travaux') || chemin.startsWith('/admin/prospects/trouver');

	return (
		<FournisseurDuTitreBureau value={emplacementDuTitre}>
			<div
				className="coquille-app fixed inset-0 flex flex-col overflow-hidden lg:flex-row"
				style={{ '--largeur-laterale': LARGEUR_LATERALE[laterale] } as CSSProperties}
			>
				<Fond />
				<BarreLateraleAdmin
					role={role}
					chemin={chemin}
					recherche={recherche}
					{...(compteurs === undefined ? {} : { compteurs })}
					reduite={laterale === 'reduite'}
					onBasculer={() => setLaterale(laterale === 'reduite' ? 'ouverte' : 'reduite')}
				/>
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					{role === null ? null : <HauteAdmin role={role} refTitre={setEmplacementDuTitre} />}
					<main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
				</div>
				{role === null || pastilleTue ? null : (
					<PastilleDesTravaux enCours={travauxEnCours} prets={travauxPrets} />
				)}
				{role === null || surUneFiche(chemin) ? null : (
					<div className="lg:hidden">
						<BarreDuBas
							// Au téléphone, l'onglet d'une liste reste allumé sur toutes ses vues.
							destinations={ONGLETS.map((d) => ({
								cle: d.cle,
								libelle: d.libelle,
								Icone: d.Icone,
								vers: d.vers,
								actif: surLeChemin(d, chemin)
							}))}
						/>
					</div>
				)}
			</div>
		</FournisseurDuTitreBureau>
	);
}

/** « ⌘ K » sur un Mac, « Ctrl K » ailleurs. */
function useRaccourci(): string {
	return useSyncExternalStore(
		abonnementFixe,
		() => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘ K' : 'Ctrl K'),
		() => 'Ctrl K'
	);
}
function abonnementFixe(): () => void {
	return () => undefined;
}

function HauteAdmin({
	role,
	refTitre
}: {
	readonly role: RoleEquipe;
	readonly refTitre: (element: HTMLDivElement | null) => void;
}) {
	const navigate = useNavigate();
	const raccourci = useRaccourci();
	const [ouvertures, setOuvertures] = useState(0);

	// Ctrl K / ⌘ K ouvre la recherche de n'importe où, au bureau. Le clavier est un
	// système extérieur : l'écoute vit dans un effet, l'état change dans le gestionnaire.
	useEffect(() => {
		function surTouche(evenement: KeyboardEvent) {
			if (evenement.key.toLowerCase() !== 'k' || (!evenement.metaKey && !evenement.ctrlKey)) return;
			if (!window.matchMedia('(min-width: 1024px)').matches) return;
			evenement.preventDefault();
			setOuvertures((n) => n + 1);
		}
		window.addEventListener('keydown', surTouche);
		return () => window.removeEventListener('keydown', surTouche);
	}, []);

	return (
		<BarreHauteBureau
			refTitre={refTitre}
			outils={
				<>
					<DeclencheurRechercheBureau
						onOuvrir={() => setOuvertures((n) => n + 1)}
						raccourci={raccourci}
						texte="Rechercher un compte, un prospect"
					/>
					{permis(role, 'SUPPORT') ? (
						<BoutonSecondaire
							className="shrink-0"
							aria-label="Ajouter un prospect"
							title="Ajouter un prospect"
							onClick={() => void navigate({ to: '/admin/prospects', search: { ajouter: 1 } })}
						>
							<UserPlusIcon aria-hidden />
							<span className="hidden xl:inline">Ajouter un prospect</span>
						</BoutonSecondaire>
					) : null}
					{ouvertures === 0 ? null : <RechercheAdmin key={ouvertures} />}
				</>
			}
		/>
	);
}

/** La recherche de l'admin : les comptes et les prospects, par nom ou SIREN. */
function RechercheAdmin() {
	const [ouverte, setOuverte] = useState(true);
	const [texte, setTexte] = useState('');
	const terme = texte.trim();
	const resultats = useRequeteEphemere(
		api.admin.recherche.chercher,
		ouverte && terme.length >= 2 ? { texte: terme } : 'skip'
	);
	return (
		<FeuillePleinEcran ouverte={ouverte} onFermer={() => setOuverte(false)} titre="Rechercher">
			<div className="flex flex-col gap-cladd-xs">
				<SearchField
					size="lg"
					tightFocusRing
					autoFocus
					value={texte}
					onChange={setTexte}
					placeholder="Nom de l’entreprise ou SIREN"
					inputComponentProps={{ 'aria-label': 'Rechercher un compte ou un prospect' }}
				/>
				{terme.length < 2 ? null : resultats === undefined ? null : resultats.length === 0 ? (
					<p className="px-1 text-cladd-2xs text-cladd-fg-soft">
						Aucun compte ni prospect à ce nom.
					</p>
				) : (
					<ListeDeCartes>
						{resultats.map((r) => (
							<CarteLien
								key={`${r.type}-${r.id}`}
								vers={r.type === 'COMPTE' ? '/admin/comptes/$id' : '/admin/prospects/$id'}
								parametres={{ id: r.id }}
								onClick={() => setOuverte(false)}
								titre={r.libelle}
								ligne={[r.type === 'COMPTE' ? 'Compte' : 'Prospect', r.detail]
									.filter(Boolean)
									.join(' · ')}
							/>
						))}
					</ListeDeCartes>
				)}
			</div>
		</FeuillePleinEcran>
	);
}

/**
 * LE MENU DE L'EN-TÊTE, AU TÉLÉPHONE : Équipe et Journal (fondateur), et le retour à
 * l'application. Au bureau, la barre latérale les porte.
 */
export function MenuAdmin({ role }: { readonly role: RoleEquipe }) {
	const [ouvert, setOuvert] = useState(false);
	return (
		<>
			<Button
				size="md"
				rounded
				square
				variant="solid"
				outline={false}
				className="ml-auto shrink-0"
				aria-label="Menu de l’admin"
				onClick={() => setOuvert(true)}
			>
				<EllipsisIcon />
			</Button>
			<FeuillePleinEcran ouverte={ouvert} onFermer={() => setOuvert(false)} titre="Admin">
				<div className="flex flex-col gap-cladd-xs">
					{permis(role, 'FONDATEUR') ? (
						<ListeDeRangees titre="L’équipe">
							<RangeeLien vers="/admin/equipe" titre="Équipe" icone={<UsersRoundIcon />} />
							<RangeeLien vers="/admin/journal" titre="Journal" icone={<ScrollTextIcon />} />
						</ListeDeRangees>
					) : null}
					<ListeDeRangees>
						<RangeeLien vers="/app" titre="Revenir à l’application" icone={<ArrowLeftIcon />} />
					</ListeDeRangees>
				</div>
			</FeuillePleinEcran>
		</>
	);
}
