import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from './cn';

/**
 * LA PARALLAXE AU CURSEUR — une scène qui réagit au pointeur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE FAIT, ET CE QU'ELLE NE FAIT PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle écrit DEUX NOMBRES sur son propre nœud — `--pointeur-x` et
 * `--pointeur-y`, entre −1 et 1, la position du curseur rapportée au centre de
 * la scène. Rien d'autre. Ce sont les classes `.suit-pointeur-*` qui décident
 * ce qu'un enfant en fait, et de combien il bouge.
 *
 * ⚠️ AUCUN `setState`, ET C'EST LA CONVENTION DU PROJET AUTANT QUE LA SEULE
 * FAÇON QUE ÇA TIENNE. Un mouvement de souris émet des dizaines d'événements
 * par seconde ; un `setState` par événement, c'est l'arbre React re-rendu
 * soixante fois par seconde pour déplacer un dégradé de douze pixels. On écrit
 * la propriété personnalisée directement sur le nœud, le navigateur recompose
 * sur le GPU, et React ne sait rien de tout ça.
 *
 * ⚠️ UNE SEULE ÉCRITURE PAR IMAGE. `pointermove` se déclenche plus souvent que
 * l'écran ne rafraîchit : sans le garde `requestAnimationFrame`, on écrirait
 * trois fois la même image pour rien. Le garde est un entier, pas un booléen,
 * parce qu'il faut pouvoir annuler l'image en attente au démontage.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE NE S'ACTIVE PAS PARTOUT, ET C'EST DÉLIBÉRÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Trois cas où l'abonnement n'est même pas posé :
 *
 *   SANS SURVOL RÉEL. Sur un écran tactile, `pointermove` n'arrive qu'au
 *   DOIGT POSÉ : la scène se décalerait au moment précis où l'on touche, ce qui
 *   se lit comme un défaut et non comme un effet. `(hover: hover) and
 *   (pointer: fine)` est la seule requête qui distingue vraiment une souris.
 *
 *   MOUVEMENT RÉDUIT. Une parallaxe au curseur est du mouvement continu piloté
 *   par le geste : c'est exactement ce que cette préférence demande d'éteindre.
 *
 *   AU RENDU SERVEUR. Il n'y a ni fenêtre ni pointeur ; l'effet n'existe qu'à
 *   partir de l'hydratation, et les deux variables valent zéro d'ici là — donc
 *   la scène est rendue centrée, qui est sa position juste.
 *
 * ⚠️ ET LE REPOS EST TOUJOURS LE CENTRE. À la sortie du pointeur, les deux
 * variables retournent à zéro et les couches reviennent en place : jamais de
 * scène restée de travers parce que la souris est sortie par un coin.
 */
export function ScenePointeur({
	className,
	children
}: {
	className?: string;
	children: ReactNode;
}) {
	const scene = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const noeud = scene.current;
		if (noeud === null) return;
		if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

		let x = 0;
		let y = 0;
		let image = 0;

		const poser = () => {
			image = 0;
			noeud.style.setProperty('--pointeur-x', x.toFixed(4));
			noeud.style.setProperty('--pointeur-y', y.toFixed(4));
		};

		const planifier = () => {
			if (image === 0) image = requestAnimationFrame(poser);
		};

		const bouge = (evenement: PointerEvent) => {
			const cadre = noeud.getBoundingClientRect();
			if (cadre.width === 0 || cadre.height === 0) return;
			// Rapporté au CENTRE : −1 au bord gauche, 0 au milieu, 1 au bord droit.
			x = ((evenement.clientX - cadre.left) / cadre.width) * 2 - 1;
			y = ((evenement.clientY - cadre.top) / cadre.height) * 2 - 1;
			planifier();
		};

		const sort = () => {
			x = 0;
			y = 0;
			planifier();
		};

		noeud.addEventListener('pointermove', bouge, { passive: true });
		noeud.addEventListener('pointerleave', sort, { passive: true });
		return () => {
			noeud.removeEventListener('pointermove', bouge);
			noeud.removeEventListener('pointerleave', sort);
			if (image !== 0) cancelAnimationFrame(image);
		};
	}, []);

	return (
		<div ref={scene} className={cn('scene-pointeur', className)}>
			{children}
		</div>
	);
}
