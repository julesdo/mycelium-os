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
import { Button, SearchField } from '@cladd-ui/react';
import {
	ArrowLeftIcon,
	BuildingIcon,
	EllipsisIcon,
	ListChecksIcon,
	ScrollTextIcon,
	TargetIcon,
	UserPlusIcon,
	UsersRoundIcon
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
import { useRequeteEphemere } from './donnees';
import { usePlumeDit } from './parole-de-plume';
import { usePreference } from './use-preference';

/**
 * LA COQUILLE DE L'ADMIN (16/10/2026, `docs/superpowers/specs/2026-10-16-admin-socle-crm.md`).
 *
 * La même charpente que l'application, pour que l'équipe passe de l'une à l'autre
 * sans réapprendre : au bureau, la barre latérale (Aujourd'hui, Comptes, Prospects,
 * Tâches ; puis Équipe et Journal pour le fondateur) et la barre du haut (le titre,
 * la recherche ⌘ K, « Ajouter un prospect ») ; au téléphone, une barre du bas à
 * quatre onglets, Équipe et Journal dans le menu de l'en-tête d'Aujourd'hui.
 *
 * ⚠️ RIEN DE L'APPLICATION N'Y EST MONTÉ : ni Plume, ni le sélecteur
 * d'établissement, ni la cloche. L'admin regarde des comptes ; il n'en habite aucun.
 */

type Destination = {
	readonly cle: string;
	readonly libelle: string;
	readonly Icone: DestinationBarre['Icone'];
	readonly vers: DestinationBarre['vers'];
	readonly prefixes: readonly string[];
};

const TRAVAIL: readonly Destination[] = [
	{
		cle: 'aujourdhui',
		libelle: 'Aujourd’hui',
		vers: '/admin',
		Icone: IconeLetikette,
		prefixes: []
	},
	{
		cle: 'comptes',
		libelle: 'Comptes',
		vers: '/admin/comptes',
		Icone: BuildingIcon,
		prefixes: ['/admin/comptes']
	},
	{
		cle: 'prospects',
		libelle: 'Prospects',
		vers: '/admin/prospects',
		Icone: TargetIcon,
		prefixes: ['/admin/prospects']
	},
	{
		cle: 'taches',
		libelle: 'Tâches',
		vers: '/admin/taches',
		Icone: ListChecksIcon,
		prefixes: ['/admin/taches']
	}
];

const EQUIPE: readonly Destination[] = [
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
	}
];

function estActive(d: Destination, chemin: string): boolean {
	const nu = chemin.replace(/\/$/, '');
	if (d.vers === '/admin') return nu === '/admin';
	return d.prefixes.some((p) => nu.startsWith(p));
}

/** Une destination, allumée ou non selon l'adresse. */
function allumee(d: Destination, chemin: string) {
	return {
		cle: d.cle,
		libelle: d.libelle,
		Icone: d.Icone,
		vers: d.vers,
		actif: estActive(d, chemin)
	};
}

/** Les pages d'une fiche : le composeur y prend la place de la barre d'onglets. */
function surUneFiche(chemin: string): boolean {
	return /^\/admin\/(comptes|prospects)\/(?!importer)[^/]+\/?$/.test(chemin);
}

const ContexteRole = createContext<RoleEquipe>('LECTURE');

/** Posé par la garde de `/admin`, une fois l'accès vérifié. */
export const FournisseurDuRole = ContexteRole.Provider;

/** Le rôle de celui qui regarde : les écrans cachent ce que le serveur lui refuserait. */
export function useRoleAdmin(): RoleEquipe {
	return useContext(ContexteRole);
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

	const groupes: GroupeLateral[] =
		role === null
			? []
			: [
					{
						cle: 'travail',
						destinations: TRAVAIL.map((d) => allumee(d, chemin))
					},
					...(permis(role, 'FONDATEUR')
						? [
								{
									cle: 'equipe',
									titre: 'L’équipe',
									destinations: EQUIPE.map((d) => allumee(d, chemin))
								}
							]
						: [])
				];

	return (
		<FournisseurDuTitreBureau value={emplacementDuTitre}>
			<div
				className="coquille-app fixed inset-0 flex flex-col overflow-hidden lg:flex-row"
				style={{ '--largeur-laterale': LARGEUR_LATERALE[laterale] } as CSSProperties}
			>
				<Fond />
				<BarreLaterale
					reduite={laterale === 'reduite'}
					onBasculer={() => setLaterale(laterale === 'reduite' ? 'ouverte' : 'reduite')}
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
				<div className="flex min-h-0 min-w-0 flex-1 flex-col">
					{role === null ? null : <HauteAdmin role={role} refTitre={setEmplacementDuTitre} />}
					<main className="min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
				</div>
				{role === null || surUneFiche(chemin) ? null : (
					<div className="lg:hidden">
						<BarreDuBas destinations={TRAVAIL.map((d) => allumee(d, chemin))} />
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
