import { cn } from './cn';

/**
 * LE CIEL DU PREMIER ÉCRAN — nébuleuse et champ d'étoiles.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ NI CANEVAS, NI VIDÉO, NI IMAGE. DU BRUIT FRACTAL, MASQUÉ.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La contrainte est celle de `brume.tsx`, et elle vaut encore plus ici : la
 * page d'accueil est celle qu'un prospect ouvre sur un téléphone, en 4G, dans
 * une salle d'attente. Le shader de l'application (`line-waves.tsx`, 359 lignes
 * sur `ogl`) n'entre aujourd'hui dans le paquet que par la coquille et
 * l'authentification ; le faire descendre ici pour décorer un fond coûterait
 * une bibliothèque entière avant le premier mot lu.
 *
 * `feTurbulence` fait le même travail dans une URI de données de quelques
 * centaines d'octets, rasterisée UNE fois puis composée sur le GPU comme un
 * aplat. C'est la fonction de bruit de Perlin qui sert à dessiner des nuages
 * depuis les années quatre-vingt : le résultat ne ressemble pas à un dégradé
 * parce qu'il a la structure fractale d'un vrai voile de poussière, à toutes
 * les échelles. Les réglages vivent dans `app.css`.
 *
 * ⚠️ LA COULEUR EST CELLE DE L'APPLICATION. `--color-aurore-*` est le dégradé
 * qui vit derrière le montant dû sur l'écran d'accueil du produit. Le premier
 * écran du site et le premier écran du logiciel partagent donc leur ciel :
 * c'est la seule chose qui relie visuellement la page publique à ce qu'on
 * achète, et elle ne coûte aucun jeton nouveau.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ `overflow-clip` ET SURTOUT PAS `overflow-hidden` — LE PIÈGE QUI ANNULE
 *    SILENCIEUSEMENT TOUTE LA PARALLAXE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `overflow: hidden` CRÉE UN CONTENEUR DE DÉFILEMENT. `overflow: clip` n'en
 * crée pas. Or `animation-timeline: scroll()` vaut `scroll(nearest block)` :
 * elle s'accroche au conteneur de défilement ANCESTRAL LE PLUS PROCHE. Une
 * couche parallaxée posée dans un `overflow-hidden` s'accroche donc à ce
 * conteneur-là — qui n'est jamais défilé par personne, dont la progression vaut
 * zéro en permanence, et dont les keyframes restent bloquées sur `from`.
 *
 * ⚠️ ET LA PANNE EST INVISIBLE. La règle du projet veut que l'état de repos
 * d'une couche décorative soit dans `from` : bloquée sur `from`, la couche est
 * donc peinte exactement là où elle doit être. Rien ne casse à l'œil, rien ne
 * tombe aux tests — l'effet n'existe simplement pas. C'est le défaut qu'une
 * relecture adversariale a trouvé le 23 septembre 2026 sur la brume, où il
 * dormait depuis sa livraison, et il se reproduit à chaque nouvelle couche si
 * on ne l'écrit pas ici.
 *
 * Le même piège vaut pour `view()` et pour le `<header>` du héros, qui portait
 * `overflow-hidden` : les quatre animations d'entrée qu'il contenait se
 * rapportaient à LUI et pas à la fenêtre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEUX MOUVEMENTS, DEUX NATURES, DEUX ÉLÉMENTS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La DÉRIVE est un mouvement de temps : le ciel avance qu'on défile ou non.
 * La PARALLAXE est un mouvement de défilement.
 *
 * Une règle `animation` ne porte qu'une chronologie à la fois. Plutôt que de
 * lister deux noms, deux durées et deux chronologies en parallèle — ce qui se
 * désynchronise à la première modification — chaque ciel est DEUX éléments
 * imbriqués : le parent parallaxe, l'enfant scintille.
 */
export function Nebuleuse({ className }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={cn('pointer-events-none absolute inset-0 overflow-clip', className)}
		>
			{/* LE CIEL LOINTAIN, sous la nébuleuse : ses étoiles sont celles que le
			    voile masque en partie, ce qui est la seule façon de faire croire
			    qu'un nuage est DEVANT quelque chose. */}
			<div className="derive-ciel-loin absolute inset-0">
				<div className="champ-etoiles-loin absolute inset-0" />
			</div>

			{/* LE VOILE, puis LE CŒUR. Les deux montent du bas : c'est le sol de la
			    section qui brille, pas son ciel — une nébuleuse posée en haut aurait
			    éclairé le titre par-derrière et il n'y a rien de pire à lire. */}
			<div className="nebuleuse-voile absolute inset-x-0 bottom-0 h-3/4" />
			<div className="nebuleuse-coeur absolute inset-x-0 bottom-0 h-3/5" />

			{/* LE CIEL PROCHE, PAR-DESSUS LE VOILE. Moins d'étoiles, plus vives,
			    trois fois plus rapides : c'est ce rapport, et rien d'autre, qui fait
			    la profondeur. */}
			<div className="derive-ciel-pres absolute inset-0">
				<div className="champ-etoiles-pres etoiles-scintillent absolute inset-0" />
			</div>
		</div>
	);
}

/**
 * LE BROUILLARD QUI PASSE DEVANT L'OBJET.
 *
 * ⚠️ C'EST LA SEULE COUCHE ATMOSPHÉRIQUE QUI SOIT AU-DESSUS DU CONTENU, ET
 * C'EST TOUT L'EFFET. Les autres sont derrière : elles font un décor. Celle-ci
 * recouvre le bas du téléphone, et c'est ce qui le fait ÉMERGER au lieu d'être
 * posé sur une image. Un objet dont on voit le pied est un objet POSÉ SUR un
 * fond ; un objet dont le pied se perd dans quelque chose est un objet DANS un
 * lieu. C'est le geste entier du premier écran de legend.xyz, et il ne tient
 * qu'à cet ordre d'empilement.
 *
 * Deux pièces, et il faut les deux. Le fondu plein ABSORBE le bas de l'objet,
 * quoi qu'il arrive — c'est la pièce qui ne peut pas rater. Le bruit fractal
 * donne les LANGUES de brume, c'est-à-dire la seule chose qui distingue du
 * brouillard d'un fondu au noir.
 *
 * ⚠️ `pointer-events-none` N'EST PAS UNE PRÉCAUTION ICI. Cette couche s'étale
 * sur toute la largeur, au-dessus du contenu : sans lui, elle intercepterait
 * tout clic dans le bas du premier écran, et rien à l'écran ne dirait pourquoi.
 */
export function BrouillardAvant({ className }: { className?: string }) {
	return (
		<div
			aria-hidden
			className={cn('pointer-events-none absolute inset-x-0 bottom-0 overflow-clip', className)}
		>
			<div className="brouillard-avant absolute -inset-x-1/4 inset-y-0" />
			<div className="fondu-nuit absolute inset-0" />
		</div>
	);
}
