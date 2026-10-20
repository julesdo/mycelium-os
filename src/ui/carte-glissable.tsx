import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
	Button,
	List,
	ListButton,
	Popover,
	PopoverClose,
	PopoverRoot,
	PopoverTrigger
} from '@cladd-ui/react';
import { EllipsisIcon } from 'lucide-react';
import { pasDeRessort } from './lentille-liquide';
import { LigneBouton, ListeAnalyses } from './navigation';
import { FeuillePleinEcran, SectionDeFeuille } from './plein-ecran';

/**
 * LA CARTE QU'ON BALAIE — les gestes d'une carte, sous elle, à portée de pouce.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI MANQUAIT (relevé du 07/10/2026, livré le 08/10)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mail, Shopee, GitHub, Notion Mail : sur iOS, une rangée qu'on balaie vers la
 * gauche découvre ses gestes (« Rappel », « Fait », « Archiver »), et un appui
 * long ouvre leur menu. Notre produit obligeait à ouvrir le dossier pour
 * préparer une relance qu'on avait décidée en lisant la carte.
 *
 * ⚠️ UN ACCÉLÉRATEUR, JAMAIS LE SEUL CHEMIN. Chaque geste ici existe aussi sur
 * la page que la carte ouvre : un geste caché sous une carte est un geste que
 * la moitié des gens ne trouvera pas. C'est pour ça qu'il n'en remplace aucun.
 *
 * ⚠️ DES DISQUES DE VERRE, PAS DES BLOCS ROUGES ET ORANGE. Mail peint ses gestes
 * de couleurs vives ; ici le rouge, l'ambre et le vert ne disent qu'une chose
 * (le seuil), et « un seul bouton plein par écran » vaut aussi pour ce qui se
 * découvre. Ce sont les disques des actions rapides de la fiche client.
 *
 * ⚠️ AU DOIGT SEULEMENT. À la souris, glisser une carte qui est un lien se lit
 * comme un glisser-déposer raté ; le clic droit ouvre le même menu, et la
 * touche « menu » du clavier aussi (le navigateur y lève `contextmenu`).
 */

export interface ActionDeCarte {
	readonly cle: string;
	/** Un mot, sous le disque : il a soixante-quatre pixels. */
	readonly libelle: string;
	/** Le nom entier, au menu et au lecteur d'écran : « Me le rappeler ». */
	readonly nomComplet?: string;
	readonly icone: ReactNode;
	readonly onClick: () => void;
}

/** Largeur d'une action découverte : le disque de 44 px, son nom, et l'air autour. */
const LARGEUR_ACTION = 72;
/** Au-delà de ce déplacement, le doigt a dit dans quel sens il va. */
const SEUIL_SENS = 8;
/** L'appui long d'iOS, à peu près : assez pour ne pas le confondre avec un toucher. */
const APPUI_LONG_MS = 480;

/** Le disque d'une action : celui des actions rapides, au verre des cartes. */
const DISQUE = {
	variant: 'transparent',
	outline: false,
	hoverable: false,
	rounded: true,
	square: true,
	size: 'lg',
	className: 'verre-carte verre-bouton'
} as const;

/**
 * ⚠️ LA POSITION S'ÉCRIT DANS LE STYLE, PAS DANS UN ÉTAT. Un rendu React par
 * mouvement du doigt ferait saccader la carte sur un téléphone moyen ; le style
 * posé à la main suit le doigt, et l'état ne dit que « ouverte ou non ».
 */
function poser(
	carte: HTMLElement | null,
	gestes: HTMLElement | null,
	largeur: number,
	decalage: number,
	anime: boolean
) {
	if (carte !== null) {
		carte.style.transition = anime ? 'transform 280ms cubic-bezier(0.2, 0.9, 0.25, 1)' : 'none';
		carte.style.transform = decalage === 0 ? '' : `translateX(${-decalage}px)`;
	}
	// Le verre des cartes laisse voir ce qui est dessous : les gestes restent
	// invisibles tant que la carte ne s'est pas écartée.
	if (gestes !== null) gestes.style.opacity = String(Math.min(1, decalage / (largeur * 0.6)));
}

/**
 * LE LÂCHER SUIT LE DOIGT (20/10/2026, « Designing Fluid Interfaces », WWDC 2018).
 *
 * La carte tranchait sur la position au lâcher, à mi-chemin, puis partait sur une
 * courbe de 280 ms : un balayage vif mais court se refermait, et la carte
 * repartait de zéro au lieu de garder la vitesse du doigt. Trois règles d'Apple,
 * désormais :
 *
 *   · l'ÉLAN se projette — la carte va là où la mènerait sa lancée, puis se range
 *     au cran le plus proche de ce point, comme un défilement qui ralentit ;
 *   · la vitesse du doigt devient celle d'un RESSORT, sans couture entre le geste
 *     et l'animation ; amorti critique (réponse 0,3 s), un rien de rebond quand le
 *     doigt a lancé la carte vers l'ouverture (0,8, le tiroir d'iOS) ;
 *   · une carte rattrapée EN VOL s'arrête sous le doigt, là où elle est affichée,
 *     au lieu de sauter à sa position logique.
 */
const RESSORT_CALME = { raideur: 439, amortissement: 42 } as const;
const RESSORT_LANCE = { raideur: 439, amortissement: 33.5 } as const;
/** Au-delà de cette vitesse (px/s), le doigt a lancé la carte. */
const VITESSE_DE_LANCER = 500;
/** La décélération de la projection : celle d'Apple pour un geste vif. */
const DECELERATION = 0.99;

/** Où la lancée mènerait la carte, en pixels, d'une vitesse en px/s. */
function projeter(vitesse: number): number {
	return ((vitesse / 1000) * DECELERATION) / (1 - DECELERATION);
}

/** Au-delà de l'ouverture, la carte suit de moins en moins : la résistance d'iOS. */
function resistance(depassement: number, dimension: number): number {
	return (depassement * dimension * 0.55) / (dimension + 0.55 * Math.abs(depassement));
}

/** L'ouverture AFFICHÉE, lue à l'écran : celle d'une carte qu'on rattrape en vol. */
function ouvertureAffichee(carte: HTMLElement | null): number {
	if (carte === null) return 0;
	const transform = getComputedStyle(carte).transform;
	return transform === 'none' ? 0 : -new DOMMatrixReadOnly(transform).m41;
}

function arreter(ressort: { current: number | null }) {
	if (ressort.current !== null) cancelAnimationFrame(ressort.current);
	ressort.current = null;
}

interface Geste {
	readonly x0: number;
	readonly y0: number;
	/** L'ouverture au début du geste : on reprend une carte déjà ouverte là où elle est. */
	readonly depart: number;
	sens: 'horizontal' | null;
	decalage: number;
	/** Les derniers points du geste (100 ms), pour la vitesse au lâcher. */
	readonly echantillons: Array<{ t: number; d: number }>;
}

export function CarteGlissable({
	actions,
	menuEnPlus = [],
	titre,
	children
}: {
	/** Un ou deux gestes. Vide (et sans `menuEnPlus`), la carte se rend telle quelle. */
	readonly actions: readonly ActionDeCarte[];
	/**
	 * CE QUE LE MENU DE L'APPUI LONG AJOUTE, sans geste balayé : « Demander à Plume »
	 * (13/10/2026). Un geste de plus sous le doigt ferait trois disques ; au menu, il
	 * est une rangée de plus, comme « Partager » dans le menu de Mail.
	 */
	readonly menuEnPlus?: readonly ActionDeCarte[];
	/** Le nom de la carte : le titre du menu de l'appui long. */
	readonly titre: string;
	readonly children: ReactNode;
}) {
	const enveloppe = useRef<HTMLDivElement>(null);
	const devant = useRef<HTMLDivElement>(null);
	const dessous = useRef<HTMLDivElement>(null);
	const geste = useRef<Geste | null>(null);
	/** Le clic qui suit un glissement ou un appui long ne doit pas ouvrir la carte. */
	const avaler = useRef(false);
	const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
	/** L'image en attente du ressort du lâcher, s'il court. */
	const ressort = useRef<number | null>(null);
	const [ouverte, setOuverte] = useState(false);
	const [menu, setMenu] = useState(false);

	const largeur = actions.length * LARGEUR_ACTION + 8;

	// Un toucher hors de la carte ouverte la referme, comme dans Mail.
	useEffect(() => {
		if (!ouverte) return;
		function ailleurs(evenement: PointerEvent) {
			if (enveloppe.current?.contains(evenement.target as Node)) return;
			arreter(ressort);
			poser(devant.current, dessous.current, largeur, 0, true);
			setOuverte(false);
		}
		document.addEventListener('pointerdown', ailleurs, true);
		return () => document.removeEventListener('pointerdown', ailleurs, true);
	}, [ouverte, largeur]);

	// Une carte qui disparaît (la liste a changé) n'ouvre pas son menu après coup,
	// et son ressort ne court plus.
	useEffect(
		() => () => {
			if (minuterie.current !== null) clearTimeout(minuterie.current);
			arreter(ressort);
		},
		[]
	);

	if (actions.length === 0 && menuEnPlus.length === 0) return <>{children}</>;

	function fermer() {
		arreter(ressort);
		poser(devant.current, dessous.current, largeur, 0, true);
		setOuverte(false);
	}

	/** Lâche la carte vers `vers`, à la vitesse du doigt (px/s), sur un ressort. */
	function lacher(depuis: number, vitesse: number, vers: number) {
		arreter(ressort);
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
			poser(devant.current, dessous.current, largeur, vers, true);
			return;
		}
		const parametres = vers > 0 && vitesse > VITESSE_DE_LANCER ? RESSORT_LANCE : RESSORT_CALME;
		let x = depuis;
		let v = vitesse;
		let avant: number | null = null;
		const image = (maintenant: number) => {
			const dt = avant === null ? 1 / 60 : Math.min(0.032, (maintenant - avant) / 1000);
			avant = maintenant;
			({ x, v } = pasDeRessort(x, v, vers, parametres, dt));
			if (Math.abs(vers - x) < 0.5 && Math.abs(v) < 20) {
				poser(devant.current, dessous.current, largeur, vers, false);
				ressort.current = null;
				return;
			}
			poser(devant.current, dessous.current, largeur, x, false);
			ressort.current = requestAnimationFrame(image);
		};
		ressort.current = requestAnimationFrame(image);
	}

	/** Une carte arrêtée en vol par un toucher qui n'était pas un balayage repart. */
	function reprendre() {
		const ici = ouvertureAffichee(devant.current);
		const vers = ouverte ? largeur : 0;
		if (Math.abs(ici - vers) > 0.5) lacher(ici, 0, vers);
	}

	function annulerAppuiLong() {
		if (minuterie.current !== null) clearTimeout(minuterie.current);
		minuterie.current = null;
	}

	return (
		<>
			<div
				ref={enveloppe}
				// `touch-pan-y` : le navigateur garde le défilement vertical et nous laisse
				// l'horizontal. Sans lui, il prendrait le geste pour un retour arrière.
				// Pas de bulle de lien ni de sélection de texte à l'appui long : c'est le
				// menu des gestes qui s'ouvre.
				className="group/carte relative touch-pan-y select-none [-webkit-touch-callout:none]"
				onPointerDown={(evenement) => {
					avaler.current = false;
					if (evenement.pointerType === 'mouse') return;
					// Rattrapée en vol, la carte s'arrête sous le doigt, là où elle est.
					arreter(ressort);
					const ici = ouvertureAffichee(devant.current);
					if (Math.abs(ici - (ouverte ? largeur : 0)) > 0.5) {
						poser(devant.current, dessous.current, largeur, ici, false);
					}
					geste.current = {
						x0: evenement.clientX,
						y0: evenement.clientY,
						depart: ici,
						sens: null,
						decalage: ici,
						echantillons: [{ t: evenement.timeStamp, d: ici }]
					};
					annulerAppuiLong();
					minuterie.current = setTimeout(() => {
						minuterie.current = null;
						if (geste.current === null || geste.current.sens !== null) return;
						geste.current = null;
						avaler.current = true;
						if (ouverte) fermer();
						navigator.vibrate?.(8);
						setMenu(true);
					}, APPUI_LONG_MS);
				}}
				onPointerMove={(evenement) => {
					const g = geste.current;
					if (g === null) return;
					const dx = evenement.clientX - g.x0;
					const dy = evenement.clientY - g.y0;
					if (g.sens === null) {
						if (Math.abs(dx) > SEUIL_SENS && Math.abs(dx) > Math.abs(dy)) {
							// Rien à découvrir sous la carte : le doigt qui glisse n'est pas un appui long.
							if (actions.length === 0) {
								annulerAppuiLong();
								geste.current = null;
								return;
							}
							g.sens = 'horizontal';
							annulerAppuiLong();
							// Le doigt peut sortir de la carte sans lâcher le geste. Un pointeur
							// déjà relâché lève ici : le geste continue sans capture.
							try {
								evenement.currentTarget.setPointerCapture(evenement.pointerId);
							} catch {
								/* rien à capturer */
							}
						} else if (Math.abs(dy) > SEUIL_SENS) {
							// Le doigt fait défiler la liste : la carte ne bouge pas.
							annulerAppuiLong();
							geste.current = null;
							reprendre();
							return;
						} else return;
					}
					// Au-delà de l'ouverture complète, la carte résiste, de plus en plus.
					const brut = g.depart - dx;
					const decalage =
						brut <= 0 ? 0 : brut <= largeur ? brut : largeur + resistance(brut - largeur, largeur);
					g.decalage = decalage;
					g.echantillons.push({ t: evenement.timeStamp, d: decalage });
					while (g.echantillons.length > 2 && evenement.timeStamp - g.echantillons[0]!.t > 100) {
						g.echantillons.shift();
					}
					poser(devant.current, dessous.current, largeur, decalage, false);
				}}
				onPointerUp={(evenement) => {
					annulerAppuiLong();
					const g = geste.current;
					geste.current = null;
					if (g === null || g.sens !== 'horizontal') {
						reprendre();
						return;
					}
					avaler.current = true;
					// La vitesse des 100 dernières ms ; un doigt qui s'est arrêté avant de se
					// lever n'en a plus.
					const premier = g.echantillons[0]!;
					const dernier = g.echantillons[g.echantillons.length - 1]!;
					const duree = dernier.t - premier.t;
					const vitesse =
						duree > 0 && evenement.timeStamp - dernier.t < 80
							? ((dernier.d - premier.d) / duree) * 1000
							: 0;
					const ouvrir = g.decalage + projeter(vitesse) > largeur / 2;
					lacher(g.decalage, vitesse, ouvrir ? largeur : 0);
					setOuverte(ouvrir);
				}}
				onPointerCancel={() => {
					annulerAppuiLong();
					geste.current = null;
					lacher(ouvertureAffichee(devant.current), 0, ouverte ? largeur : 0);
				}}
				onClickCapture={(evenement) => {
					// Le clic qui termine un glissement, ou qui touche une carte ouverte, la
					// referme — il n'ouvre pas le dossier. Un disque, lui, fait son geste.
					if (dessous.current?.contains(evenement.target as Node)) return;
					if (avaler.current || ouverte) {
						evenement.preventDefault();
						evenement.stopPropagation();
						avaler.current = false;
						if (ouverte) fermer();
					}
				}}
				onContextMenu={(evenement) => {
					evenement.preventDefault();
					annulerAppuiLong();
					setMenu(true);
				}}
			>
				<div
					ref={dessous}
					// Fermée, la rangée des gestes n'existe ni pour le clavier ni pour le
					// lecteur d'écran : ils passent par le menu.
					inert={!ouverte}
					aria-hidden={!ouverte}
					className="absolute inset-y-0 right-0 flex items-center justify-end gap-1 pr-1 opacity-0"
					style={{ width: largeur }}
				>
					{actions.map((action) => (
						<div key={action.cle} className="flex w-16 flex-col items-center gap-1">
							<Button
								{...DISQUE}
								aria-label={action.nomComplet ?? action.libelle}
								onPointerDown={(evenement) => evenement.stopPropagation()}
								onClick={() => {
									fermer();
									action.onClick();
								}}
							>
								{action.icone}
							</Button>
							<span
								aria-hidden
								className="text-center text-cladd-4xs leading-tight whitespace-nowrap text-cladd-fg-soft"
							>
								{action.libelle}
							</span>
						</div>
					))}
				</div>

				<div ref={devant} className="relative will-change-transform">
					{children}
				</div>

				{/*
				  AU BUREAU, À LA SOURIS : LES GESTES DANS UN MENU, AU SURVOL (14/10/2026).
				  Une souris ne balaie pas, et le clic droit ne se devine pas. Comme chez
				  Midday et Linear, un « ⋯ » paraît sur la carte survolée, à la place du
				  chevron, et déroule les mêmes gestes que le menu de l'appui long.

				  ⚠️ INVISIBLE ET INERTE SANS SURVOL : `hover:` ne vaut que sur un écran qui
				  survole (Tailwind 4), et le bouton ne prend aucun toucher tant qu'il ne se
				  voit pas — une tablette en paysage ouvre la carte, pas le menu. Le clavier
				  l'atteint, et il paraît dès qu'il a le focus.
				*/}
				<div className="pointer-events-none absolute top-1/2 right-1.5 z-10 hidden -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover/carte:pointer-events-auto group-hover/carte:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 lg:block">
					<PopoverRoot>
						<PopoverTrigger>
							<Button
								size="sm"
								square
								rounded
								variant="transparent"
								outline={false}
								hoverable={false}
								className="verre-carte verre-bouton"
								aria-label={`Les gestes pour ${titre}`}
								title="Gestes"
							>
								<EllipsisIcon />
							</Button>
						</PopoverTrigger>
						<Popover className="w-64" offset={6} position="bottom-end">
							<List>
								{[...actions, ...menuEnPlus].map((action) => (
									<PopoverClose key={action.cle}>
										<ListButton size="md" icon={action.icone} onClick={action.onClick}>
											{action.nomComplet ?? action.libelle}
										</ListButton>
									</PopoverClose>
								))}
							</List>
						</Popover>
					</PopoverRoot>
				</div>
			</div>

			{/*
			  LE MENU DE L'APPUI LONG — les mêmes gestes, en rangées. C'est aussi le
			  chemin du clavier et de la souris.

			  ⚠️ HORS DE L'ENVELOPPE. Un portail garde ses parents React : posé dedans,
			  chaque toucher du menu remonterait jusqu'aux gestionnaires de la carte et
			  relancerait un appui long sous le doigt.
			*/}
			<FeuillePleinEcran ouverte={menu} onFermer={() => setMenu(false)} titre={titre}>
				<SectionDeFeuille>
					<ListeAnalyses>
						{[...actions, ...menuEnPlus].map((action) => (
							<LigneBouton
								key={action.cle}
								genre="contenu"
								titre={action.nomComplet ?? action.libelle}
								icone={action.icone}
								onClick={() => {
									setMenu(false);
									action.onClick();
								}}
							/>
						))}
					</ListeAnalyses>
				</SectionDeFeuille>
			</FeuillePleinEcran>
		</>
	);
}
