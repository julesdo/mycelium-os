import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { CatchBoundary, useNavigate, useRouterState } from '@tanstack/react-router';
import {
	FeatherIcon,
	GavelIcon,
	HeartPulseIcon,
	LifeBuoyIcon,
	LockKeyholeIcon,
	ScaleIcon,
	UploadIcon,
	UsersIcon
} from 'lucide-react';
import { useQuery } from './donnees';
import { api } from '../lib/convex/_generated/api';
import { Avatar, BoutonSecondaire, Facultatif, IconeLetikette, Lien } from '../ui';
import {
	BarreHauteBureau,
	BarreLaterale,
	CLASSE_IDENTITE_LATERALE,
	ClocheBureau,
	DeclencheurRechercheBureau,
	EntreeLaterale,
	IdentiteLaterale,
	type DestinationLaterale,
	type GroupeLateral
} from '../ui/coquille-bureau';
import { cn } from '../ui/cn';
import { NOM_DU_PILOTE } from '../ui/plume';
import { SelecteurEtablissement } from './selecteur-etablissement';
import { suivre } from './analytique';

/**
 * LA COQUILLE DU BUREAU, BRANCHÉE — les destinations lues sur l'adresse, ce que la
 * barre du haut compte, et le raccourci de la recherche.
 *
 * Le dessin vit dans `ui/coquille-bureau.tsx`, qui ne sait rien du routeur ni de
 * Convex ; ici, on décide ce qui est actif et l'on branche les lectures. Tout est
 * isolé (`Facultatif`) : sans session — au chargement, dans la salle —, une lecture
 * lève, et la barre reste debout sans elle.
 */

type Destination = Omit<DestinationLaterale, 'actif' | 'rappel'> & {
	/** Les adresses qui allument l'entrée : la liste, et les pages qu'on ouvre d'elle. */
	readonly prefixes: readonly string[];
};

/**
 * ⚠️ LES PAGES D'UN OBJET ALLUMENT LA LISTE D'OÙ ELLES VIENNENT. Un dossier
 * (`/app/dossier/…`) n'a pas le préfixe de la liste des dossiers (`/app/dossiers`) :
 * comparé au seul `vers`, aucune entrée ne serait allumée sur la page qu'on ouvre
 * le plus souvent.
 */
const GROUPES: readonly (Omit<GroupeLateral, 'destinations'> & {
	readonly destinations: readonly Destination[];
})[] = [
	{
		cle: 'travail',
		destinations: [
			{
				cle: 'aujourdhui',
				libelle: 'Aujourd’hui',
				vers: '/app',
				Icone: IconeLetikette,
				prefixes: []
			},
			{
				cle: 'dossiers',
				libelle: 'Dossiers',
				vers: '/app/dossiers',
				Icone: GavelIcon,
				prefixes: ['/app/dossiers', '/app/dossier/', '/app/creance/', '/app/decompte/']
			},
			{
				cle: 'clients',
				libelle: 'Clients',
				vers: '/app/clients',
				Icone: UsersIcon,
				prefixes: ['/app/clients']
			}
		]
	},
	{
		cle: 'outils',
		titre: 'Vos outils',
		destinations: [
			{
				cle: 'plume',
				libelle: NOM_DU_PILOTE,
				vers: '/app/pilote',
				Icone: FeatherIcon,
				prefixes: ['/app/pilote', '/app/demarrer']
			},
			{
				cle: 'coffre',
				libelle: 'Coffre-fort',
				vers: '/app/coffre',
				Icone: LockKeyholeIcon,
				prefixes: ['/app/coffre', '/app/import-factures']
			},
			{
				cle: 'sante',
				libelle: 'Santé des clients',
				vers: '/app/risque',
				Icone: HeartPulseIcon,
				prefixes: ['/app/risque']
			},
			{
				cle: 'defense',
				libelle: 'Défense',
				vers: '/app/defense',
				Icone: ScaleIcon,
				prefixes: ['/app/defense']
			}
		]
	}
];

/** L'accueil se compare à l'égal : `/app` est le préfixe de toutes les adresses. */
function estActive(destination: Destination, chemin: string): boolean {
	const nu = chemin.replace(/\/$/, '');
	if (destination.vers === '/app') return nu === '/app';
	return destination.prefixes.some((prefixe) => nu.startsWith(prefixe));
}

export function LateraleBranchee({
	auRepos,
	reduite,
	onBasculer
}: {
	readonly auRepos: boolean;
	readonly reduite: boolean;
	readonly onBasculer: () => void;
}) {
	const chemin = useRouterState({ select: (etat) => etat.location.pathname });
	const groupes: GroupeLateral[] = GROUPES.map((groupe) => ({
		...groupe,
		destinations: groupe.destinations.map(({ prefixes, ...destination }) => ({
			...destination,
			actif: estActive({ ...destination, prefixes }, chemin)
		}))
	}));
	const surLeCompte = chemin.startsWith('/app/compte');

	return (
		<BarreLaterale
			reduite={reduite}
			onBasculer={onBasculer}
			tete={
				auRepos ? null : (
					<Facultatif>
						<SelecteurEtablissement variante="laterale" />
					</Facultatif>
				)
			}
			groupes={groupes}
			pied={
				auRepos ? null : (
					<Facultatif>
						<AideLaterale actif={chemin.startsWith('/app/aide')} reduite={reduite} />
						<CompteLateral actif={surLeCompte} />
					</Facultatif>
				)
			}
		/>
	);
}

/**
 * L'AIDE, EN PIED DE LA BARRE, AU-DESSUS DU COMPTE (16/10/2026, comme chez Melio) : ce
 * qu'on cherche quand on est perdu se trouve au même endroit sur chaque page, et le
 * nombre de réponses de l'équipe à lire s'y pose.
 */
function AideLaterale({ actif, reduite }: { readonly actif: boolean; readonly reduite: boolean }) {
	const nonLues = useQuery(api.support.fil.nonLues, {});
	return (
		<EntreeLaterale
			reduite={reduite}
			destination={{
				cle: 'aide',
				libelle: 'Aide',
				Icone: LifeBuoyIcon,
				vers: '/app/aide',
				actif,
				...(nonLues === undefined || nonLues === 0 ? {} : { valeur: String(nonLues) })
			}}
		/>
	);
}

/** Le compte, en pied de la barre : votre visage, votre nom, et « Votre compte ». */
function CompteLateral({ actif }: { readonly actif: boolean }) {
	const moi = useQuery(api.users.viewer, {});
	const image = useQuery(api.imageDeProfil.monImage, {});
	if (moi === undefined) return null;
	const nom = moi?.name ?? moi?.email ?? 'Votre compte';
	return (
		<Lien
			to="/app/compte"
			aria-current={actif ? 'page' : undefined}
			className={cn(CLASSE_IDENTITE_LATERALE, actif && 'entree-laterale-active')}
		>
			<IdentiteLaterale
				vignette={
					<Avatar
						nom={nom}
						image={
							image?.avatar != null
								? image.avatar
								: image?.imageUrl != null
									? { url: image.imageUrl }
									: null
						}
					/>
				}
				nom={nom}
				ligne="Compte, abonnement, réglages"
			/>
		</Lien>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LA BARRE DU HAUT
// ─────────────────────────────────────────────────────────────────────────

/** La palette ne se charge qu'à sa première ouverture : le paquet d'entrée ne porte que le socle. */
const PaletteBranchee = lazy(() =>
	import('./recherche').then((module) => ({ default: module.PaletteBranchee }))
);

/** « ⌘ K » sur un Mac, « Ctrl K » ailleurs ; « Ctrl K » au rendu serveur. */
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

export function HauteBranchee({
	auRepos,
	refTitre
}: {
	readonly auRepos: boolean;
	readonly refTitre: (element: HTMLDivElement | null) => void;
}) {
	const navigate = useNavigate();
	const raccourci = useRaccourci();
	const [ouvertures, setOuvertures] = useState(0);
	const [ouverte, setOuverte] = useState(false);
	const ouvrir = () => {
		suivre('recherche-ouverte', { depuis: 'bureau' });
		setOuvertures((n) => n + 1);
		setOuverte(true);
	};

	/*
	  ⚠️ LE RACCOURCI DES APPLICATIONS DE BUREAU : Ctrl K (⌘ K sur un Mac) ouvre la
	  recherche de n'importe où, comme chez Mercury, Stripe et Linear. Un système
	  extérieur (le clavier) : l'écoute vit dans un effet, l'état change dans le
	  gestionnaire.
	*/
	useEffect(() => {
		if (auRepos) return;
		function surTouche(evenement: KeyboardEvent) {
			if (evenement.key.toLowerCase() !== 'k') return;
			if (!evenement.metaKey && !evenement.ctrlKey) return;
			// Sous 1024 px, la barre du haut n'existe pas : le téléphone garde sa pilule.
			if (!window.matchMedia('(min-width: 1024px)').matches) return;
			evenement.preventDefault();
			setOuvertures((n) => n + 1);
			setOuverte(true);
		}
		window.addEventListener('keydown', surTouche);
		return () => window.removeEventListener('keydown', surTouche);
	}, [auRepos]);

	return (
		<BarreHauteBureau
			refTitre={refTitre}
			outils={
				<>
					<DeclencheurRechercheBureau onOuvrir={ouvrir} raccourci={raccourci} />
					{auRepos ? null : (
						<Facultatif>
							<ClocheBranchee />
						</Facultatif>
					)}
					{/*
					  LE GESTE DU JOUR, SECONDAIRE : l'écran garde son seul bouton plein. Il
					  mène au dépôt du coffre (`?deposer=1`), celui qu'ouvrent tous les
					  « Importer » du produit.
					*/}
					<BoutonSecondaire
						className="shrink-0"
						aria-label="Ajouter des factures"
						title="Ajouter des factures"
						onClick={() => void navigate({ to: '/app/coffre', search: { deposer: 1 } })}
					>
						<UploadIcon aria-hidden />
						{/* Sous 1280 px, l'icône seule : le titre de la page garde sa place. */}
						<span className="hidden xl:inline">Ajouter des factures</span>
					</BoutonSecondaire>
					{ouvertures === 0 ? null : (
						<CatchBoundary
							getResetKey={() => ouvertures}
							errorComponent={() => null}
							onCatch={() => setOuverte(false)}
						>
							<Suspense fallback={null}>
								<PaletteBranchee
									key={ouvertures}
									ouverte={ouverte}
									onFermer={() => setOuverte(false)}
								/>
							</Suspense>
						</CatchBoundary>
					)}
				</>
			}
		/>
	);
}

function ClocheBranchee() {
	const nonLues = useQuery(api.notifications.getUnreadCount, {});
	return <ClocheBureau vers="/app/notifications" nonLues={nonLues ?? 0} />;
}
