import { useState, type ReactNode } from 'react';
import { Link, useRouterState, useNavigate, CatchBoundary } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Button } from '@cladd-ui/react';

import { HomeIcon, UsersIcon, GavelIcon, UploadIcon, SearchIcon } from 'lucide-react';

import { cn } from '../ui/cn';
import {
	PaletteRecherche,
	bougesDuFlux,
	type DestinationRecherche,
	type FamilleRecherche,
	type RecentAffiche,
	type ResultatRechercheAffiche
} from '../ui/palette-recherche';
import { LogoLetikette } from '../ui/logo';
import { Avatar } from '../ui/avatar';
import { VeilleurAvatar, type EtatVeilleur } from '../ui/veilleur-avatar';
import { api } from '../lib/convex/_generated/api';
import { SelecteurEtablissement } from './selecteur-etablissement';

/**
 * LA NAVIGATION.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'ELLE PORTAIT, ET POURQUOI C'ÉTAIT LE PROBLÈME
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle comptait HUIT cibles alignées sur une seule rangée : quatre onglets, un
 * champ de recherche, un sélecteur d'établissement, un bouton « Déposer » et un
 * engrenage. Huit choix de même poids, dont aucun ne dit ce qu'il faut faire
 * maintenant. C'est la définition d'un écran qu'on subit, et c'est ce que le
 * terrain a nommé.
 *
 * ⚠️ ET LE NEUVIÈME DÉFAUT ÉTAIT PIRE : le bouton « Déposer », l'action la plus
 * visible de la barre, pointait vers `/app/factures` — une route JAMAIS
 * DÉCLARÉE. Le lien menait à une page d'erreur, dans toutes les tailles
 * d'écran, depuis des semaines. Rien ne le signalait parce que `to` était
 * écrit en chaîne littérale et que rien ne vérifiait qu'elle existe. C'est la
 * même famille de défaut que « déclaré, lu, jamais alimenté » : une chose
 * écrite, plausible, et qui ne mène nulle part.
 *
 * La correction n'est pas seulement d'avoir retiré le bouton, c'est que
 * `ActionRonde.to` est désormais typé par le routeur (`LinkProps['to']`) : une
 * destination inexistante fait maintenant échouer la compilation.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE PORTE MAINTENANT : QUATRE ONGLETS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Accueil, Débiteurs, Procédures, Importer. Et rien d'autre.
 *
 * « Ce qui est dû » a disparu de la barre non pas parce qu'il compte moins,
 * mais parce qu'il compte PLUS : son total est devenu le hero de l'accueil, et
 * son détail s'ouvre en touchant ce total. Un onglet de moins, et le chiffre
 * qu'on vient chercher est la première chose qu'on voit au lieu d'être à un
 * clic.
 *
 * Les gestes du domaine — lettrer, arrêter un décompte — vivent dans la rangée
 * d'actions rondes de l'accueil, sous le montant. Une barre de navigation
 * n'est pas une barre d'outils : elle dit où l'on est, pas ce qu'on peut faire.
 */
/**
 * ⚠️ QUATRE ONGLETS, ET LE QUATRIÈME A SA RAISON. L'argument qui a ramené cette
 * barre de huit cibles à trois visait huit choix de même poids, dont aucun ne
 * disait quoi faire. Un dossier engagé n'est pas un huitième choix : c'est le
 * seul endroit du produit où un droit s'éteint à date fixe, et il n'était
 * atteignable qu'au bout de cinq gestes.
 */
const ENTREES = [
	{ to: '/app', label: 'Accueil', Icone: HomeIcon },
	{ to: '/app/debiteurs', label: 'Débiteurs', Icone: UsersIcon },
	{ to: '/app/procedures', label: 'Procédures', Icone: GavelIcon },
	{ to: '/app/import-factures', label: 'Importer', Icone: UploadIcon }
] as const;

function useActif() {
	const chemin = useRouterState({ select: (s) => s.location.pathname });
	return (to: string) => (to === '/app' ? chemin === '/app' : chemin.startsWith(to));
}

/**
 * Ce qui, en échouant, ne doit RIEN emporter.
 *
 * Tout ce qui interroge Convex depuis la barre — le sélecteur d'établissement —
 * lève quand la session manque : au chargement, après une expiration, ou dans
 * la salle d'exposition qui rend la coquille sans authentification. Sans
 * isolation, un ornement facultatif emporte la NAVIGATION ENTIÈRE et renvoie
 * le gérant sur un écran d'erreur, alors qu'il lui suffisait de ne pas voir
 * une pastille.
 */
function Facultatif({ children }: { children: ReactNode }) {
	return (
		<CatchBoundary getResetKey={() => 'barre'} errorComponent={() => null}>
			{children}
		</CatchBoundary>
	);
}

/**
 * LA PALETTE, BRANCHÉE SUR LA BASE.
 *
 * Le dessin vit dans `ui/palette-recherche.tsx`, qui n'interroge rien ; ce
 * composant-ci lit et traduit.
 *
 * ⚠️ LES DEUX REQUÊTES DORMENT TANT QUE LA PALETTE EST FERMÉE (`'skip'`). Le
 * flux est servi depuis le cache quand l'accueil l'a déjà demandé ; ailleurs,
 * il ne coûte qu'au moment où l'on cherche.
 *
 * ⚠️ LE DERNIER RÉSULTAT RESTE À L'ÉCRAN. `useQuery` rend `undefined` à chaque
 * nouveau terme : vider les cartes à ce moment ferait clignoter l'état vide à
 * chaque lettre. La réponse précédente est gardée au rendu (sans effet), et
 * `aJour` dit si celle qu'on montre répond au terme courant.
 */
function PaletteBranchee({ ouverte, onFermer }: { ouverte: boolean; onFermer: () => void }) {
	const navigate = useNavigate();
	const [terme, setTerme] = useState(String());
	const [deplie, setDeplie] = useState<FamilleRecherche | null>(null);

	const flux = useQuery(api.recouvrement.surveillance.flux, ouverte ? {} : 'skip');
	const bouges = bougesDuFlux(flux?.evenements ?? []);
	const cherche = terme.trim();

	const reponse = useQuery(
		api.recouvrement.recherche.recherche,
		!ouverte
			? 'skip'
			: cherche === ''
				? { terme: '', recents: bouges.map((b) => b.id) }
				: deplie === null
					? { terme: cherche }
					: { terme: cherche, deplier: deplie }
	);
	const [derniere, setDerniere] = useState(reponse);
	if (reponse !== undefined && reponse !== derniere) setDerniere(reponse);
	const affichee = reponse ?? derniere;

	const resultat: ResultatRechercheAffiche | null =
		affichee === undefined
			? null
			: {
					debiteurs: {
						...affichee.debiteurs,
						premiers: affichee.debiteurs.premiers.map(({ _id, ...debiteur }) => ({
							id: _id,
							...debiteur
						}))
					},
					factures: {
						...affichee.factures,
						premiers: affichee.factures.premiers.map(({ _id, ...facture }) => ({
							id: _id,
							...facture
						}))
					},
					procedures: affichee.procedures
				};

	// Les noms viennent de la même réponse que le reste : aucune rangée sans nom.
	const noms = new Map<string, string>(
		(affichee?.recents ?? []).map((d) => [d._id, d.denomination])
	);
	const recents: RecentAffiche[] = bouges.flatMap((bouge) => {
		const denomination = noms.get(bouge.id);
		return denomination === undefined ? [] : [{ ...bouge, denomination }];
	});

	const ouvrir = (destination: DestinationRecherche) => {
		onFermer();
		if (destination.genre === 'DEBITEUR') {
			void navigate({ to: '/app/debiteurs', search: { d: destination.debiteurId } });
		} else if (destination.genre === 'PROCEDURE') {
			void navigate({ to: '/app/procedures', search: { p: destination.creanceId } });
		} else {
			void navigate({ to: '/app/import-factures' });
		}
	};

	return (
		<PaletteRecherche
			ouverte={ouverte}
			terme={terme}
			onTerme={(valeur) => {
				setTerme(valeur);
				// Un autre terme, d'autres familles : ce qui était déplié ne l'est plus.
				setDeplie(null);
			}}
			onFermer={onFermer}
			resultat={resultat}
			aJour={reponse !== undefined}
			recents={recents}
			etablissementVide={affichee?.etablissementVide ?? false}
			deplie={deplie}
			onDeplier={setDeplie}
			onOuvrir={ouvrir}
		/>
	);
}

/**
 * LA RECHERCHE : un déclencheur, pas un champ.
 *
 * Elle n'est pas un ornement de barre : c'est la porte d'entrée vers « je veux
 * revoir où en est Fournitures Durand ». Sur téléphone, parcourir une liste au
 * pouce coûte bien plus qu'au clavier : elle y garde toute la largeur restante.
 *
 * ⚠️ ELLE ÉTAIT UN `<input>`, ET ENTRÉE JETAIT LE TERME. La touche menait à la
 * liste des débiteurs sans rien filtrer. Un champ dans la barre qui ouvrirait
 * un second champ dans la palette ferait aussi taper deux fois : les premières
 * lettres se perdraient pendant l'ouverture. On touche une pilule, et le curseur
 * est déjà dans le seul champ.
 *
 * Le marque-page apprend ce qui est cherchable : un nom, une référence.
 *
 * ⚠️ LA PALETTE EST REMONTÉE À CHAQUE OUVERTURE (clé) : elle repart d'un champ
 * vide. Et elle est isolée comme tout ce qui interroge Convex depuis la barre :
 * sans session (salle d'exposition, expiration), la requête lève, la palette se
 * referme, et la navigation reste debout.
 */
function Recherche() {
	const [ouverte, setOuverte] = useState(false);
	const [ouvertures, setOuvertures] = useState(0);

	return (
		<>
			<Button
				size="md"
				variant="transparent"
				outline={false}
				hoverable={false}
				rounded
				aria-haspopup="dialog"
				className="verre verre-actif min-w-0 flex-1 lg:max-w-80"
				contentClassName="w-full justify-start gap-cladd-3xs"
				onClick={() => {
					setOuvertures((n) => n + 1);
					setOuverte(true);
				}}
			>
				<SearchIcon aria-hidden className="shrink-0 text-cladd-fg-softer" />
				{/*
				 * ⚠️ LA PHRASE COMPLÈTE DEMANDE 261 px, ET LA PILULE N'EN OFFRE QUE 133
				 * À 768 px. Elle s'y coupait au milieu de la référence, ce qui apprenait
				 * le contraire de ce qu'elle est là pour apprendre : « FA-2026-03… » ne
				 * ressemble plus à un numéro de facture. Sous 1024 px, on garde le seul
				 * mot qui dise la fonction, entier ; au-dessus, l'exemple revient.
				 */}
				<span className="truncate text-cladd-xs font-normal text-cladd-fg-softer">
					<span className="lg:hidden">Rechercher</span>
					<span className="hidden lg:inline">Rechercher « Durand, FA-2026-0311… »</span>
				</span>
			</Button>
			<CatchBoundary
				getResetKey={() => ouvertures}
				errorComponent={() => null}
				onCatch={() => setOuverte(false)}
			>
				<PaletteBranchee key={ouvertures} ouverte={ouverte} onFermer={() => setOuverte(false)} />
			</CatchBoundary>
		</>
	);
}

/**
 * L'AVATAR DE LA BARRE — qui est connecté.
 *
 * Il remplace le logotype à gauche. Voir `ui/avatar.tsx` pour le raisonnement :
 * un logo dans une application où l'on est déjà connecté ne dit rien, et il
 * occupe le seul emplacement que toutes les références réservent à l'identité
 * de celui qui regarde.
 *
 * ⚠️ IL MÈNE AUX RÉGLAGES, ET L'ENGRENAGE A DONC DISPARU. Deux cibles pour la
 * même destination, à deux cents pixels l'une de l'autre, c'est un choix de
 * plus à faire pour rien — et c'est ce qui gonflait cette barre à huit cibles.
 *
 * Il est enveloppé dans `Facultatif` : la requête d'identité lève quand la
 * session manque — au chargement, après une expiration, ou dans la salle
 * d'exposition qui rend la coquille sans authentification. Sans isolation, un
 * avatar emporte la navigation entière.
 */
function AvatarConnecte() {
	const moi = useQuery(api.users.viewer, {});
	const actif = useActif();

	return (
		<Link
			to="/app/parametres"
			aria-label="Votre compte et vos réglages"
			aria-current={actif('/app/parametres') ? 'page' : undefined}
		>
			{/*
			  `moi?.name` peut être vide sur un compte créé par invitation, qui n'a
			  parfois qu'une adresse. `initiales` retombe alors sur l'adresse, puis
			  sur un point d'interrogation — jamais sur un disque vide, qu'on prend
			  pour un défaut de chargement.
			*/}
			<Avatar nom={moi?.name ?? moi?.email} />
		</Link>
	);
}

/**
 * LA BARRE HAUTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TROIS CIBLES, LÀ OÙ IL Y EN AVAIT HUIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'avatar à gauche, la recherche au milieu, l'établissement à droite. C'est la
 * composition de la référence, et chaque retrait a sa raison :
 *
 *   · le LOGOTYPE est parti dans la barre de navigation, où il sert enfin à
 *     quelque chose — il EST le bouton d'accueil ;
 *   · l'ENGRENAGE est parti parce que l'avatar mène aux mêmes réglages ;
 *   · le bouton « Déposer » était mort — il pointait vers une route jamais
 *     déclarée.
 *
 * Sur téléphone, la recherche prend toute la largeur restante : sur un produit
 * dont l'usage courant est « où en est ce client-là », c'est l'action la plus
 * fréquente de l'écran, et parcourir une liste au pouce coûte bien plus qu'au
 * clavier.
 *
 * ⚠️ TOUT EST EN VERRE, ET RIEN N'EST OPAQUE. Le fond passe derrière la barre
 * entière — elle n'a ni fond ni filet de fermeture. Un bandeau opaque couperait
 * le drapé net à soixante-quatre pixels du bord et rendrait visible la jointure
 * que toute cette architecture existe pour supprimer.
 */
/**
 * LE VEILLEUR, DANS LA BARRE — donc sur tous les écrans.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI IL EST ICI ET PAS SEULEMENT SUR L'ACCUEIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le journal du veilleur, posé sur l'accueil, dit ce que la machine a FAIT. Il
 * ne dit pas qu'elle est LÀ — sur l'écran des débiteurs, dans une créance, à
 * trois heures du matin. Un travail de fond qui ne se manifeste que sur un
 * écran n'est pas un travail de fond : c'est un rapport qu'on va consulter.
 *
 * ⚠️ ET IL EST UN LIEN VERS SON JOURNAL. Une pastille qui bouge et qu'on ne
 * peut pas interroger est une décoration ; celle-ci mène à ce qu'elle affirme.
 *
 * ⚠️ LES DEUX REQUÊTES SONT LES MÊMES QUE CELLES DE L'ACCUEIL, donc Convex les
 * sert depuis son cache : la barre ne paie pas un aller-retour de plus sur
 * l'écran qui les demande déjà.
 *
 * Enveloppé dans `Facultatif` comme tout ce qui interroge Convex depuis la
 * barre : sans session — au chargement, après une expiration, ou dans la salle
 * d'exposition — la requête lève, et un ornement ne doit jamais emporter la
 * navigation entière.
 */
function VeilleurPresent() {
	const battement = useQuery(api.recouvrement.battement.dernierBattement, {});
	const depots = useQuery(api.recouvrement.depotMutations.listerImports, { limite: 5 });
	const nonLues = useQuery(api.notifications.getUnreadCount, {});

	const travaille = (depots ?? []).some(
		(depot) => depot.statut === 'EN_ATTENTE' || depot.statut === 'LECTURE'
	);

	/**
	 * ⚠️ `undefined` NE VAUT PAS « ROMPU ». Tant que la réponse n'est pas là, on
	 * ne sait pas : afficher un veilleur éteint le temps d'un aller-retour ferait
	 * clignoter une panne à chaque ouverture, et on apprendrait à l'ignorer —
	 * exactement sur le signal qui ne doit jamais être ignoré.
	 */
	const etat: EtatVeilleur = travaille
		? 'TRAVAILLE'
		: battement?.statut === 'ECHEC'
			? 'ROMPU'
			: 'VEILLE';

	return (
		<Link
			to="/app"
			aria-label="Le veilleur, et ce qu'il a fait"
			className="verre-bouton relative flex size-cladd-md shrink-0 items-center justify-center rounded-full"
		>
			<VeilleurAvatar etat={etat} />
			{/*
			  ⚠️ LE COMPTE NE S'AFFICHE QU'AU-DESSUS DE ZERO, et il est RARE par
			  construction : seul ce qui fait perdre un droit sans qu'on ait rien
			  fait en produit un. Une pastille permanente a « 0 » serait du decor,
			  et le chiffre ne dirait plus rien le jour ou il compte.
			*/}
			{nonLues !== undefined && nonLues > 0 ? (
				<span className="compte-veilleur absolute -top-0.5 -right-0.5">
					{nonLues > 9 ? '9+' : nonLues}
				</span>
			) : null}
		</Link>
	);
}

export function Barre() {
	return (
		<header className="relative z-30 shrink-0">
			<div className="flex items-center gap-cladd-3xs px-cladd-3xs py-2">
				<Facultatif>
					<AvatarConnecte />
				</Facultatif>

				<Facultatif>
					<VeilleurPresent />
				</Facultatif>

				<Recherche />

				{/*
				  LA CAPSULE D'ONGLETS — grand écran seulement. Sur téléphone, la
				  navigation est en bas, là où le pouce l'atteint.
				*/}
				<CapsuleOnglets />

				<div className="flex shrink-0 items-center gap-cladd-3xs">
					<Facultatif>
						<SelecteurEtablissement />
					</Facultatif>
				</div>
			</div>
		</header>
	);
}

/**
 * Les onglets, en capsule de verre, sur grand écran.
 *
 * ⚠️ TOUS PORTENT LEUR ÉTIQUETTE, et la capsule ne paraît qu'au-dessus de
 * 768 px, où ils tiennent. La version précédente n'étiquetait que l'onglet
 * actif — ce qui obligeait à deviner les autres au pictogramme.
 */
function CapsuleOnglets() {
	const actif = useActif();

	return (
		<nav
			aria-label="Navigation principale"
			className="verre hidden items-center gap-1 rounded-full p-1 md:flex"
		>
			{ENTREES.map(({ to, label, Icone }) => {
				const ici = actif(to);
				return (
					<Link
						key={to}
						to={to}
						aria-current={ici ? 'page' : undefined}
						className={cn(
							// ⚠️ `h-cladd-md` — 48 px, pas `sm` qui en fait 40. La capsule
							// n'apparaît qu'au-dessus de 768 px, et il a été facile d'y voir
							// une commande de souris : 40 px suffisent à un curseur. Mais la
							// cible PREMIÈRE de ce produit est une TABLETTE EN PAYSAGE, qui
							// est large ET tactile. C'est donc un doigt qui vise ces onglets,
							// et le plancher du projet est de 48. Mesuré au navigateur.
							'flex h-cladd-md items-center gap-2 rounded-full px-cladd-3xs text-cladd-xs font-medium transition',
							ici
								? // L'onglet actif est un verre PLUS CLAIR, pas un aplat blanc
									// ni une teinte d'accent. Un aplat blanc sur le fond fait un
									// trou opaque ; une couleur entre en concurrence avec lui.
									'verre text-cladd-fg'
								: 'text-cladd-fg-soft hover:text-cladd-fg'
						)}
					>
						<IconeOnglet to={to} Icone={Icone} actif={ici} />
						{label}
					</Link>
				);
			})}
		</nav>
	);
}

/**
 * L'ICÔNE D'UN ONGLET — et pour l'accueil, C'EST LA MARQUE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE BOUTON D'ACCUEIL EST LE LOGO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * C'est le motif de toutes les applications financières relevées : Revolut pose
 * son R à la première place de sa barre basse, Revolut Business aussi. La
 * marque cesse d'être un ornement posé dans un coin et devient le geste le plus
 * fréquent de l'application — on la touche pour revenir au chiffre.
 *
 * ⚠️ ET ELLE PORTE UN FAISCEAU, mais PAS celui du bouton d'action. Deux
 * faisceaux identiques sur un écran n'en font aucun : celui de l'action appelle
 * — vif, rapide, avec un halo — celui de la marque respire, deux fois et demie
 * plus lent et sans lueur portée. Voir `.faisceau-lent` dans `app.css`.
 *
 * Le faisceau ne tourne que sur l'onglet ACTIF. Une marque qui scintille en
 * permanence sur tous les écrans redevient un ornement, et le scintillement ne
 * dit plus rien le jour où il compte.
 */
function IconeOnglet({
	to,
	Icone,
	actif,
	taille = 18
}: {
	to: string;
	Icone: typeof HomeIcon;
	actif: boolean;
	/** La barre basse vise un peu plus gros que la capsule de bureau. */
	taille?: number;
}) {
	if (to !== '/app') return <Icone size={taille} />;
	return (
		<span
			className={cn('inline-flex rounded-cladd-3xs', actif && 'faisceau-lent')}
			style={{ width: taille, height: taille }}
		>
			<LogoLetikette className="size-full" />
		</span>
	);
}

/**
 * LA BARRE BASSE DU TÉLÉPHONE.
 *
 * Elle flotte, au-dessus du contenu et au-dessus de la zone de geste système :
 * une barre collée au bord bas se fait manger par le trait d'accueil d'iOS, et
 * le dernier onglet devient inatteignable.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LE SEGMENT QUI GLISSE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un seul bloc de verre se DÉPLACE d'un onglet à l'autre, au lieu que quatre
 * fonds s'allument et s'éteignent. La différence n'est pas décorative : un
 * fond qui apparaît ailleurs oblige l'œil à retrouver où la sélection est
 * partie, alors qu'un objet qui se déplace est suivi sans effort. C'est la
 * même raison qui fait qu'on suit une balle des yeux et pas une ampoule qui
 * clignote.
 *
 * ⚠️ SA POSITION EST DÉRIVÉE DU RANG, PAS MESURÉE DANS LE DOM. C'est ce qui
 * permet de respecter la règle du projet — aucun `setState` dans un effet. Les
 * onglets sont en `flex-1`, donc tous de largeur égale : le segment occupe la
 * piste divisée par `ENTREES.length` et se translate de cent pour cent de sa
 * propre largeur par rang. Il suit donc tout seul quand un onglet s'ajoute.
 * Aucune mesure, aucun rendu supplémentaire, et rien à resynchroniser au
 * redimensionnement.
 *
 * La conséquence à ne pas oublier : la piste doit être EXACTEMENT pavée par
 * les onglets. Un `gap` entre eux, ou un onglet plus large que les autres, et
 * le segment se désaligne progressivement vers la droite.
 *
 * ⚠️ ET IL FAUT QUE QUELQUE CHOSE PASSE DERRIÈRE, sans quoi il n'y a pas
 * d'effet de verre du tout — seulement une bande sombre. C'est `PageBody` qui
 * le garantit, en portant lui-même son rembourrage bas : les cartes glissent
 * sous la barre au lieu de s'arrêter avant elle.
 *
 * Le défaut a existé, et il ne se voyait qu'à l'écran : le rembourrage était
 * posé sur `main`, c'est-à-dire HORS du conteneur qui défile. La zone visible
 * s'arrêtait donc au-dessus de la barre, le flou n'avait plus rien à flouter,
 * et il ne restait qu'un bandeau noir. Aucun test ne l'attrape ; c'est
 * exactement le genre de chose pour quoi la règle du regard existe.
 */
export function BarreBasse() {
	const actif = useActif();

	// −1 quand on est sur un écran hors barre (les réglages, le détail d'une
	// créance). Le segment s'efface alors au lieu de rester accroché au dernier
	// onglet visité, ce qui affirmerait qu'on est quelque part où l'on n'est pas.
	const rang = ENTREES.findIndex(({ to }) => actif(to));

	return (
		/* `mb-safe` vient de Cladd : il reporte `env(safe-area-inset-bottom)`,
		   c'est-à-dire la hauteur du trait d'accueil d'iOS. Sans lui, la barre se
		   cale dessous et le dernier onglet ne se touche plus. */
		<nav
			aria-label="Navigation principale"
			className="mb-safe fixed inset-x-0 bottom-0 z-40 px-cladd-3xs pb-cladd-3xs md:hidden"
		>
			{/* `rounded-full` et non un rayon d'échelle : la référence pose une vraie
			    pilule, et c'est ce qui la fait lire comme un objet POSÉ sur l'écran
			    plutôt que comme un bandeau accroché au bord. */}
			<div className="verre-dense relative flex items-stretch rounded-full p-1.5">
				{/*
				  LE SEGMENT. `aria-hidden` : il ne dit rien qu'`aria-current` ne dise
				  déjà sur l'onglet lui-même, et un lecteur d'écran n'a que faire d'un
				  bloc décoratif qui se déplace.

				  La largeur retire le rembourrage de la pilule (deux fois 0,375rem)
				  avant de diviser : sans ça, le segment est trop large d'un tiers du
				  rembourrage et le décalage s'accumule sur le dernier onglet.
				*/}
				<span
					aria-hidden
					className="verre absolute inset-y-1.5 left-1.5 rounded-full transition duration-500 ease-glisse"
					style={{
						width: `calc((100% - 0.75rem) / ${ENTREES.length})`,
						transform: `translateX(${Math.max(rang, 0) * 100}%)`,
						opacity: rang === -1 ? 0 : 1
					}}
				/>

				{ENTREES.map(({ to, label, Icone }) => {
					const ici = actif(to);
					return (
						<Link
							key={to}
							to={to}
							aria-current={ici ? 'page' : undefined}
							/*
							  `active:scale-95` — l'enfoncement au doigt.

							  Il est posé sur l'ONGLET et non sur la pilule entière : c'est
							  le retour tactile de « j'ai touché ça », et il doit désigner
							  ce qu'on a touché. Une pilule entière qui se contracte
							  donnerait l'impression d'avoir appuyé sur la barre.

							  `duration-150` : au-delà, l'enfoncement survit au doigt qui
							  s'est déjà levé et le geste paraît collant.

							  `z-10` : au-dessus du segment, qui est absolu. Sans lui, les
							  libellés passent DERRIÈRE le verre du segment et l'onglet
							  actif devient le moins lisible de tous.
							*/
							className={cn(
								'relative z-10 flex min-h-cladd-md flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-1.5',
								'transition duration-150 ease-out active:scale-95',
								ici ? 'text-cladd-fg' : 'text-cladd-fg-softer'
							)}
						>
							{/* La marque EST le bouton d'accueil — voir `IconeOnglet`. */}
							<IconeOnglet to={to} Icone={Icone} actif={ici} taille={22} />
							<span className="text-cladd-3xs leading-none font-medium">{label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
