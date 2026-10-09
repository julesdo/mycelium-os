import { Suspense, lazy, useSyncExternalStore } from 'react';
import { cn } from './cn';

/**
 * LES LAMELLES, CHARGÉES APRÈS LA PAGE (09/10/2026). Le moteur WebGL (`ogl`) et le
 * shader pèsent une centaine de kilo-octets pour un décor : ils ne retardent plus
 * l'affichage des écrans, et l'intro des lamelles les fait apparaître en fondu.
 */
const MicroSlats = lazy(() => import('./micro-slats').then((m) => ({ default: m.MicroSlats })));

/**
 * LE THÈME RÉELLEMENT PEINT, LU SUR LA RACINE DU DOCUMENT.
 *
 * ⚠️ CE N'EST PAS LA PRÉFÉRENCE DU GÉRANT, ET C'EST VOULU. `use-theme` résout
 * « automatique », persiste le choix et pose les classes ; ce composant-ci n'a
 * besoin que du résultat — ce qui est PEINT — et il vit dans `src/ui`, qui
 * n'importe rien de `src/app`. Lire la classe est donc à la fois la plus petite
 * dépendance possible et la bonne : si un jour quelque chose d'autre pose
 * `.light` sur un sous-arbre, le fond de ce sous-arbre suit.
 *
 * `useSyncExternalStore` et non un effet : la liste de classes est un magasin
 * externe et mutable. La lire dans un effet pour appeler `setState`
 * déclencherait un second rendu en cascade, ce que ce projet s'interdit.
 *
 * Au rendu serveur il n'y a pas de racine à lire. On retient le sombre, qui est
 * aussi ce que l'amorce du `<head>` pose par défaut : l'hydratation ne voit donc
 * aucun écart, et `useSyncExternalStore` re-rend de lui-même si la racine dit
 * autre chose.
 */
function souscrireAuTheme(prevenir: () => void) {
	const observateur = new MutationObserver(prevenir);
	observateur.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
	return () => observateur.disconnect();
}

function themePeint(): 'light' | 'dark' {
	return document.documentElement.classList.contains('light') ? 'light' : 'dark';
}

/** Un pointeur fin (souris, trackpad) : seul lui remue l'eau. Un doigt fait défiler. */
const POINTEUR_FIN = '(pointer: fine)';

function souscrireAuPointeur(prevenir: () => void) {
	const requete = window.matchMedia(POINTEUR_FIN);
	requete.addEventListener('change', prevenir);
	return () => requete.removeEventListener('change', prevenir);
}

/**
 * LES LAMELLES : DE L'ENCRE SUR LE CRÈME, DU CRÈME SUR L'ENCRE (07/10/2026).
 *
 * Choix du fondateur : MicroSlats (React Bits), « recoloré en encre sur crème, en
 * fondu dégradé d'opacité vers le bas de l'écran, pour avoir l'animation qu'en
 * haut comme sur Revolut ».
 *
 * ⚠️ L'OPACITÉ EST UN PLAFOND CALCULÉ CONTRE LE TEXTE, AU PIRE. En haut de l'écran
 * — la barre, le montant, sa légende —, les tons posés directement sur le fond
 * sont `fg`, `fg-soft` et parfois `fg-softer` (mesuré écran par écran dans la
 * salle d'exposition). Une lamelle à son plafond y laisse chacun à 4,5:1 au moins :
 *
 *   · clair — encre #1b253f (oklch 0,27 0,05 266) à 14 % au plus, reflet blanc :
 *     au pire le papier tombe à #d8d4cd, `fg-softer` 4,53:1 ;
 *   · sombre — crème #f1eadc à 19 % au plus, reflet crème chaud #fee3c5 : au pire
 *     l'encre monte à #33363e, `fg-softer` 4,52:1.
 *
 * `fg-softest` n'est pas tenu au plafond : il ne se trouve pas dans le haut de
 * l'écran, et le fondu a éteint les lamelles avant les écrans où il apparaît
 * (le bilan d'un dépôt, plus bas). NE PAS MONTER UNE OPACITÉ SANS REFAIRE CE
 * CALCUL.
 */
const LAMELLES = {
	clair: { color: '#1b253f', glintColor: '#ffffff', opacity: 0.14 },
	sombre: { color: '#f1eadc', glintColor: '#fee3c5', opacity: 0.19 }
} as const;

/**
 * LE FOND — le papier, ses lamelles en haut d'écran, et son grain.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL EST `fixed`, ET IL NE PORTE AUCUNE INFORMATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il ne défile pas : c'est ce qui permet aux cartes de verre de GLISSER DEVANT
 * la houle. Et les trois couleurs de seuil — vert, ambre, rouge — sont les seules
 * du produit qui portent un verdict : le fond n'en porte aucune.
 *
 * LES TROIS COUCHES, DANS CET ORDRE :
 *
 * 1. LE RELÈVEMENT (`.fond-releve`) : le lavis immobile de la page.
 * 2. LES LAMELLES (`micro-slats.tsx`, porté de React Bits), en haut de l'écran
 *    seulement (`h-lamelles`) et éteintes vers le bas par un masque
 *    (`.fondu-lamelles`). Elles remplacent les ondes du sombre et le voile qui les
 *    rendait lisibles : leur opacité est plafonnée au pire cas, il n'y a plus rien
 *    à voiler. Le curseur remue l'eau sous une souris ; un doigt fait défiler, et
 *    ne déclenche rien.
 * 3. LE GRAIN (`.fond-grain`), en dernier : la matière du papier.
 */
export function Fond({ className }: { className?: string }) {
	const theme = useSyncExternalStore(souscrireAuTheme, themePeint, (): 'light' | 'dark' => 'dark');
	const pointeurFin = useSyncExternalStore(
		souscrireAuPointeur,
		() => window.matchMedia(POINTEUR_FIN).matches,
		() => false
	);
	const lamelles = LAMELLES[theme === 'dark' ? 'sombre' : 'clair'];

	return (
		<div
			aria-hidden
			// `-z-10` place la couche DERRIÈRE le contenu de la coquille sans lui
			// disputer le flux. C'est la condition pour que `backdrop-filter`
			// fonctionne : il échantillonne ce qui est peint derrière l'élément, et
			// une carte rendue À L'INTÉRIEUR de cette couche ne floute rien du tout,
			// en silence.
			className={cn('pointer-events-none fixed inset-0 -z-10 overflow-hidden', className)}
		>
			<div className="fond-releve absolute inset-0" />
			<Suspense fallback={null}>
				<MicroSlats
					className="fondu-lamelles absolute inset-x-0 top-0 h-lamelles"
					preset="swell"
					color={lamelles.color}
					glintColor={lamelles.glintColor}
					opacity={lamelles.opacity}
					backgroundColor="transparent"
					slatWidth={8}
					slatHeight={22}
					gap={3}
					roundness={0.75}
					// Le plafond d'opacité est bas (14 et 19 %) : on allume donc PRESQUE toutes
					// les lamelles près de lui, au lieu de laisser la houle les éteindre à moitié.
					// La houle se lit alors dans les reflets et la longueur des lamelles.
					contrast={0.45}
					glint={0.9}
					perspective={0.45}
					fog={0}
					interactive={pointeurFin}
					cursorStrength={1}
					cursorSize={48}
					trail={1.4}
					intro
				/>
			</Suspense>
			<div className="fond-grain absolute inset-0" />
		</div>
	);
}
