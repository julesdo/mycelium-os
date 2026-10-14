import { Suspense, lazy, useSyncExternalStore } from 'react';
import { cn } from './cn';

/**
 * LE DÉGRADÉ, CHARGÉ APRÈS LA PAGE (09/10/2026, repris le 15/10). Son shader est un
 * décor : il ne retarde pas l'affichage des écrans, et son intro le fait paraître
 * en fondu depuis le papier.
 */
const Grainient = lazy(() => import('./grainient').then((m) => ({ default: m.Grainient })));

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

/**
 * LE DÉGRADÉ : UNE AUBE SUR LE PAPIER (15/10/2026).
 *
 * Les lamelles (MicroSlats, 07/10) ont été jugées « carrelage de grand-mère ou
 * salle de bain » par le fondateur, qui voulait « plus moderne, plus travaillé, et
 * qui perturbe moins l'UX ». Une première version près du papier (sable, brume
 * d'encre) était trop sage : « un truc qui donne envie d'utiliser l'application
 * plutôt qu'un truc plan-plan, et qui rassure aussi. Les impayés, c'est pas fun et
 * stressant. » D'où une AUBE : l'abricot, le rose poudré et la lavande d'un ciel
 * qui se lève, sur le papier — la couleur d'un jour qui commence bien, pas celle
 * d'une alerte. Grainient (React Bits) la fait couler lentement, avec une lumière
 * de soie et du grain ; aucun motif, aucun reflet qui scintille, aucune réaction
 * au curseur. En sombre, la nuit passe à l'indigo, au violet, puis à une braise
 * rosée.
 *
 * ⚠️ AUCUNE TEINTE DE SEUIL (vert, ambre, rouge) : elles ne disent qu'une chose dans
 * ce produit. L'abricot est un pastel clair (L 0,925), pas l'ambre d'une alerte ;
 * et pas de bleu décoratif en clair — la lavande tire au violet.
 *
 * ⚠️ UN PLAFOND MESURÉ. La première couleur est la page elle-même (`--cladd-bg`).
 * Contraste de `fg-softer` sur la couleur la plus marquée :
 *
 *   · clair — lavande #e0d6fa (oklch 0,895 0,05 298) : 4,83:1 ;
 *   · sombre — violet #2e1a46 (oklch 0,27 0,08 302) : 5,79:1.
 *
 * La soie peut écarter un pli de 3 % au plus de la base. NE PAS FONCER UNE COULEUR
 * SANS REFAIRE CE CALCUL. L'ordre compte : la base en bas de l'écran, la couleur la
 * plus marquée en haut (`angle` 340).
 */
const DEGRADES = {
	clair: ['#f7f0e5', '#ffe0c5', '#fbd3d2', '#e0d6fa'],
	sombre: ['#070c19', '#111e3b', '#17143a', '#2e1a46', '#391917']
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
 * 2. LE DÉGRADÉ (`grainient.tsx`, porté de React Bits), sur tout l'écran, plein en
 *    haut et adouci vers le bas par un masque (`.fondu-degrade`) : le haut porte
 *    la couleur, comme le champ de Revolut, et les cartes de verre ont partout
 *    quelque chose à flouter.
 * 3. LE GRAIN (`.fond-grain`), en dernier : la matière du papier.
 */
export function Fond({ className }: { className?: string }) {
	const theme = useSyncExternalStore(souscrireAuTheme, themePeint, (): 'light' | 'dark' => 'dark');
	const couleurs = DEGRADES[theme === 'dark' ? 'sombre' : 'clair'];

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
				<Grainient
					// La clé suit le thème : le dégradé repart de son papier, sans traverser
					// une palette mêlée de l'un et de l'autre.
					key={theme}
					className="fondu-degrade absolute inset-0"
					colors={couleurs}
					angle={340}
					// Lent : on ne le voit bouger qu'en le regardant.
					speed={0.5}
					flow={1.1}
					scale={1.3}
					softness={1}
					silk={0.5}
					grainAmount={0.04}
					grainSize={1.2}
					intro
				/>
			</Suspense>
			<div className="fond-grain absolute inset-0" />
		</div>
	);
}
