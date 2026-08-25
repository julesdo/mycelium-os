import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

/**
 * Les crochets qui font bouger la page d'accueil.
 *
 * RIEN NE BOUGE SI L'UTILISATEUR NE VEUT PAS QUE ÇA BOUGE. Le système
 * d'exploitation le dit par `prefers-reduced-motion`, et un gérant qui l'a
 * activé a de bonnes raisons : vertiges, migraines, troubles vestibulaires.
 * Une page commerciale n'a pas le droit de passer outre.
 *
 * Quand le mouvement est refusé, rien ne dégrade : l'état final est livré
 * immédiatement. La page est complète, elle est juste déjà arrivée.
 *
 * AUCUN `setState` DANS UN CORPS D'EFFET, et ce n'est pas une coquetterie de
 * style : la règle est dans les conventions du projet, et le lint la fait
 * échouer. Elle est tenue ici de deux façons. La préférence de mouvement passe
 * par `useSyncExternalStore`, qui est la primitive prévue pour un état qui vit
 * hors de React. La progression, elle, est écrite depuis un `requestAnimation
 * Frame`, c'est-à-dire dans un rappel asynchrone, jamais pendant l'effet.
 */

const REQUETE = '(prefers-reduced-motion: reduce)';

function souscrire(rappel: () => void): () => void {
	const media = window.matchMedia(REQUETE);
	media.addEventListener('change', rappel);
	return () => media.removeEventListener('change', rappel);
}

/**
 * Dit si l'utilisateur refuse les animations.
 *
 * L'INSTANTANÉ SERVEUR VAUT « mouvement autorisé », et c'est un arbitrage
 * assumé. Le serveur ne peut pas connaître cette préférence ; il faut donc
 * choisir laquelle des deux populations subit une correction après
 * l'hydratation. En choisissant « autorisé », un visiteur ordinaire voit le
 * balisage de départ qu'il aura de toute façon, et celui qui refuse le
 * mouvement voit une seule image à zéro avant que tout se pose. L'inverse
 * ferait clignoter la page chez tout le monde sauf une minorité.
 */
function useMouvementReduit(): boolean {
	return useSyncExternalStore(
		souscrire,
		() => window.matchMedia(REQUETE).matches,
		() => false
	);
}

/**
 * Dit si un élément est entré dans l'écran, une fois pour toutes.
 *
 * Une fois vrai, il ne redevient jamais faux : une animation qui se rejoue à
 * chaque passage de la molette donne le mal de mer, et surtout elle attire
 * l'œil vers ce qui vient d'être lu au lieu de ce qui reste à lire.
 *
 * `setVu` n'est appelé que depuis le rappel de l'observateur, qui est
 * asynchrone par nature. Le cas « pas d'observateur du tout » se dérive au
 * rendu plutôt que de s'écrire dans l'effet.
 */
export function useVisible<T extends Element>(marge = '-12%') {
	const cible = useRef<T>(null);
	const [vu, setVu] = useState(false);
	const reduit = useMouvementReduit();

	useEffect(() => {
		const noeud = cible.current;
		if (!noeud || typeof IntersectionObserver === 'undefined') return;
		const observateur = new IntersectionObserver(
			(entrees) => {
				if (entrees.some((e) => e.isIntersecting)) {
					setVu(true);
					observateur.disconnect();
				}
			},
			{ rootMargin: `0px 0px ${marge} 0px` }
		);
		observateur.observe(noeud);
		return () => observateur.disconnect();
	}, [marge]);

	// Sans observateur, tout est réputé vu : mieux vaut une page entièrement
	// posée qu'une page qui n'apparaît jamais.
	const sansObservateur = typeof IntersectionObserver === 'undefined';
	return { cible, visible: vu || reduit || sansObservateur };
}

/**
 * Fait monter un nombre de zéro jusqu'à sa valeur, une fois activé.
 *
 * POURQUOI UN NOMBRE ET PAS UNE TRANSITION CSS. Les jauges de la page sont les
 * VRAIS composants du produit : `TauxEGalim` reçoit une mesure et en déduit
 * tout le reste, la largeur de la barre mais aussi la couleur de seuil et le
 * texte. Animer la largeur en CSS ferait glisser une barre déjà verte depuis
 * zéro. En animant la mesure elle-même, la jauge traverse ses états comme elle
 * le fait dans l'application : elle passe par le rouge, puis l'ambre, puis se
 * pose. C'est la démonstration, pas sa décoration.
 *
 * L'amortissement est un `easeOutCubic` : rapide au départ, freiné à
 * l'arrivée. Un chiffre qui s'arrête net paraît faux ; un chiffre qui décélère
 * paraît mesuré.
 *
 * La valeur rendue est DÉRIVÉE d'une progression de 0 à 1. C'est ce qui permet
 * de servir la valeur finale à quelqu'un qui refuse le mouvement sans jamais
 * toucher à l'état.
 */
export function useCompteur(valeur: number, actif: boolean, duree = 1100): number {
	const [progression, setProgression] = useState(0);
	const reduit = useMouvementReduit();

	useEffect(() => {
		if (!actif || reduit) return;
		let image = 0;
		const depart = performance.now();
		const avancer = (maintenant: number) => {
			const t = Math.min(1, (maintenant - depart) / duree);
			setProgression(1 - Math.pow(1 - t, 3));
			if (t < 1) image = requestAnimationFrame(avancer);
		};
		image = requestAnimationFrame(avancer);
		return () => cancelAnimationFrame(image);
	}, [actif, reduit, duree]);

	if (reduit) return actif ? valeur : 0;
	return valeur * progression;
}
