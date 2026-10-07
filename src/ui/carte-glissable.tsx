import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Popup, PopupContent } from '@cladd-ui/react';
import { LigneBouton, ListeAnalyses } from './navigation';

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

interface Geste {
	readonly x0: number;
	readonly y0: number;
	/** L'ouverture au début du geste : on reprend une carte déjà ouverte là où elle est. */
	readonly depart: number;
	sens: 'horizontal' | null;
	decalage: number;
}

export function CarteGlissable({
	actions,
	titre,
	children
}: {
	/** Un ou deux gestes. Vide, la carte se rend telle quelle. */
	readonly actions: readonly ActionDeCarte[];
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
	const [ouverte, setOuverte] = useState(false);
	const [menu, setMenu] = useState(false);

	const largeur = actions.length * LARGEUR_ACTION + 8;

	// Un toucher hors de la carte ouverte la referme, comme dans Mail.
	useEffect(() => {
		if (!ouverte) return;
		function ailleurs(evenement: PointerEvent) {
			if (enveloppe.current?.contains(evenement.target as Node)) return;
			poser(devant.current, dessous.current, largeur, 0, true);
			setOuverte(false);
		}
		document.addEventListener('pointerdown', ailleurs, true);
		return () => document.removeEventListener('pointerdown', ailleurs, true);
	}, [ouverte, largeur]);

	// Une carte qui disparaît (la liste a changé) n'ouvre pas son menu après coup.
	useEffect(
		() => () => {
			if (minuterie.current !== null) clearTimeout(minuterie.current);
		},
		[]
	);

	if (actions.length === 0) return <>{children}</>;

	function fermer() {
		poser(devant.current, dessous.current, largeur, 0, true);
		setOuverte(false);
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
				className="relative touch-pan-y select-none [-webkit-touch-callout:none]"
				onPointerDown={(evenement) => {
					avaler.current = false;
					if (evenement.pointerType === 'mouse') return;
					geste.current = {
						x0: evenement.clientX,
						y0: evenement.clientY,
						depart: ouverte ? largeur : 0,
						sens: null,
						decalage: ouverte ? largeur : 0
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
							return;
						} else return;
					}
					// Au-delà de l'ouverture complète, la carte résiste : le ressort d'iOS.
					const brut = g.depart - dx;
					const decalage =
						brut <= 0 ? 0 : brut <= largeur ? brut : largeur + (brut - largeur) * 0.25;
					g.decalage = decalage;
					poser(devant.current, dessous.current, largeur, decalage, false);
				}}
				onPointerUp={() => {
					annulerAppuiLong();
					const g = geste.current;
					geste.current = null;
					if (g === null || g.sens !== 'horizontal') return;
					avaler.current = true;
					const ouvrir = g.decalage > largeur / 2;
					poser(devant.current, dessous.current, largeur, ouvrir ? largeur : 0, true);
					setOuverte(ouvrir);
				}}
				onPointerCancel={() => {
					annulerAppuiLong();
					geste.current = null;
					poser(devant.current, dessous.current, largeur, ouverte ? largeur : 0, true);
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
			</div>

			{/*
			  LE MENU DE L'APPUI LONG — les mêmes gestes, en rangées. C'est aussi le
			  chemin du clavier et de la souris.

			  ⚠️ HORS DE L'ENVELOPPE. Un portail garde ses parents React : posé dedans,
			  chaque toucher du menu remonterait jusqu'aux gestionnaires de la carte et
			  relancerait un appui long sous le doigt.
			*/}
			<Popup
				open={menu}
				onOpenChange={(o) => {
					if (!o) setMenu(false);
				}}
				headerLeft={<span className="px-2 pb-1 text-cladd-xs font-semibold">{titre}</span>}
				contentClassName="max-w-lg"
			>
				<PopupContent>
					<ListeAnalyses>
						{actions.map((action) => (
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
				</PopupContent>
			</Popup>
		</>
	);
}
