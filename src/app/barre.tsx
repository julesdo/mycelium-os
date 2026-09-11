import { useState, type ReactNode } from 'react';
import { Link, useRouterState, useNavigate, CatchBoundary } from '@tanstack/react-router';

import { SettingsIcon, HomeIcon, UsersIcon, UploadIcon, SearchIcon } from 'lucide-react';

import { cn } from '../ui/cn';
import { LogoLetikette, MotLetikette } from '../ui/logo';
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
 * CE QU'ELLE PORTE MAINTENANT : TROIS ONGLETS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Accueil, Débiteurs, Importer. Et rien d'autre.
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
const ENTREES = [
	{ to: '/app', label: 'Accueil', Icone: HomeIcon },
	{ to: '/app/debiteurs', label: 'Débiteurs', Icone: UsersIcon },
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
 * LA RECHERCHE DE DÉBITEUR.
 *
 * Elle n'est pas un ornement de barre : c'est la porte d'entrée vers « je veux
 * revoir où en est Fournitures Durand ». Sans elle, un débiteur sorti du flux
 * n'est plus atteignable qu'en parcourant une liste.
 *
 * ⚠️ ELLE ÉTAIT CACHÉE SOUS 1024 px, et c'était le mauvais arbitrage. Sur
 * téléphone, parcourir une liste de débiteurs coûte bien plus qu'au clavier :
 * c'est précisément là que la recherche vaut le plus, et c'est là qu'elle
 * disparaissait. La référence lui donne toute la largeur de sa barre — c'est
 * l'élément le plus large de son écran d'accueil.
 *
 * ⚠️ EN VERRE, ET DONC PAS AVEC LE CHAMP DU KIT. `SearchField` s'appuie sur une
 * surface CREUSÉE, opaque : posée sur le drapé, elle fait un rectangle gris là
 * où la référence laisse voir le tissu. On garde la géométrie du kit — 48 px,
 * le plancher tactile — et on remplace le fond par du verre. C'est le seul
 * endroit de la barre où l'on s'écarte d'un contrôle du kit, et c'est pour
 * cette raison-là.
 */
function Recherche() {
	const navigate = useNavigate();
	const [terme, setTerme] = useState(String());

	return (
		<label className="verre verre-actif flex h-cladd-md min-w-0 flex-1 cursor-text items-center gap-cladd-3xs rounded-full px-cladd-3xs transition-colors lg:max-w-80">
			<SearchIcon size={18} className="shrink-0 text-cladd-fg-softer" aria-hidden />
			<input
				type="search"
				value={terme}
				onChange={(e) => setTerme(e.target.value)}
				placeholder="Rechercher un débiteur"
				aria-label="Rechercher un débiteur"
				// `bg-transparent` et `outline-none` : le verre porte déjà le fond et
				// l'anneau. Un champ natif qui repeint les siens par-dessus donnerait
				// un rectangle blanc dans une pilule de verre.
				className="min-w-0 flex-1 bg-transparent text-cladd-xs text-cladd-fg placeholder:text-cladd-fg-softer focus:outline-none"
				onKeyDown={(e) => {
					if (e.key !== 'Enter') return;
					void navigate({ to: '/app/debiteurs' });
				}}
			/>
		</label>
	);
}

/**
 * LA BARRE HAUTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE SUIT MAINTENANT LA COMPOSITION DE LA RÉFÉRENCE, ET PAS UNE AUTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sur téléphone : une pastille à gauche, une PILULE DE RECHERCHE qui prend
 * toute la place restante, deux boutons ronds à droite. Rien d'autre. Ce n'est
 * pas un choix d'apparence : sur un produit dont l'usage courant est « je veux
 * revoir où en est ce client-là », la recherche est l'action la plus fréquente
 * de l'écran. Elle mérite la largeur, et les onglets n'en ont pas besoin — ils
 * sont en bas.
 *
 * Sur grand écran, la capsule d'onglets réapparaît au centre : il y a la place,
 * et un pointeur n'a pas de barre basse.
 *
 * ⚠️ TOUT EST EN VERRE, ET RIEN N'EST OPAQUE. Le drapé passe derrière la barre
 * entière — elle n'a ni fond, ni filet de fermeture. Un bandeau opaque
 * couperait le fond net à soixante-quatre pixels du bord et rendrait visible
 * la jointure que toute cette architecture existe pour supprimer.
 */
export function Barre() {
	const actif = useActif();

	return (
		<header className="relative z-30 shrink-0">
			<div className="flex items-center gap-cladd-3xs px-cladd-3xs py-2">
				<Link
					to="/app"
					aria-label="Letikette, retour à l’accueil"
					className="flex shrink-0 items-center gap-cladd-3xs"
				>
					<LogoLetikette className="size-cladd-md shrink-0" />
					<MotLetikette className="hidden xl:block" />
				</Link>

				{/*
				  LA CAPSULE D'ONGLETS — grand écran seulement.

				  ⚠️ TOUS LES ONGLETS PORTENT LEUR ÉTIQUETTE, maintenant qu'il n'y en a
				  que trois. La version précédente n'étiquetait que l'onglet actif pour
				  faire tenir quatre entrées — ce qui obligeait à deviner les trois
				  autres au pictogramme. Trois mots tiennent ; on les écrit.
				*/}
				<nav
					aria-label="Navigation principale"
					className="verre mx-auto hidden items-center gap-1 rounded-full p-1 md:flex"
				>
					{ENTREES.map(({ to, label, Icone }) => {
						const ici = actif(to);
						return (
							<Link
								key={to}
								to={to}
								aria-current={ici ? 'page' : undefined}
								className={cn(
									'flex h-cladd-sm items-center gap-2 rounded-full px-cladd-3xs text-cladd-xs font-medium transition-colors',
									ici
										? // L'onglet actif est un verre PLUS CLAIR, pas un aplat
											// blanc ni une teinte d'accent. Un aplat blanc sur un
											// drapé fait un trou opaque ; une couleur entre en
											// concurrence avec le fond. Le verre éclairci reste du
											// verre : on voit toujours le tissu au travers.
											'verre text-cladd-fg'
										: 'text-cladd-fg-soft hover:text-cladd-fg'
								)}
							>
								<Icone size={18} />
								{label}
							</Link>
						);
					})}
				</nav>

				<Recherche />

				<div className="flex shrink-0 items-center gap-cladd-3xs">
					<Facultatif>
						<SelecteurEtablissement />
					</Facultatif>

					{/*
					  Bouton rond de verre, et pas un contrôle du kit. Le kit peint une
					  surface opaque sous son contenu : posée sur le drapé, elle fait une
					  pastille grise là où la référence laisse voir le fond. On garde la
					  géométrie — 48 px, le plancher tactile — et on remplace le fond.
					*/}
					<Link
						to="/app/parametres"
						aria-label="Réglages"
						aria-current={actif('/app/parametres') ? 'page' : undefined}
						className={cn(
							'verre verre-actif flex size-cladd-md shrink-0 items-center justify-center rounded-full transition-colors',
							actif('/app/parametres') ? 'text-cladd-fg' : 'text-cladd-fg-soft'
						)}
					>
						<SettingsIcon size={20} />
					</Link>
				</div>
			</div>
		</header>
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
 * Un seul bloc de verre se DÉPLACE d'un onglet à l'autre, au lieu que trois
 * fonds s'allument et s'éteignent. La différence n'est pas décorative : un
 * fond qui apparaît ailleurs oblige l'œil à retrouver où la sélection est
 * partie, alors qu'un objet qui se déplace est suivi sans effort. C'est la
 * même raison qui fait qu'on suit une balle des yeux et pas une ampoule qui
 * clignote.
 *
 * ⚠️ SA POSITION EST DÉRIVÉE DU RANG, PAS MESURÉE DANS LE DOM. C'est ce qui
 * permet de respecter la règle du projet — aucun `setState` dans un effet. Les
 * onglets sont en `flex-1`, donc tous de largeur égale : le segment occupe un
 * tiers de la piste et se translate de cent pour cent de sa propre largeur par
 * rang. Aucune mesure, aucun rendu supplémentaire, et rien à resynchroniser au
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
							  actif devient le moins lisible des trois.
							*/
							className={cn(
								'relative z-10 flex min-h-cladd-md flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-1.5',
								'transition duration-150 ease-out active:scale-95',
								ici ? 'text-cladd-fg' : 'text-cladd-fg-softer'
							)}
						>
							<Icone size={20} />
							<span className="text-cladd-3xs leading-none font-medium">{label}</span>
						</Link>
					);
				})}
			</div>
		</nav>
	);
}
