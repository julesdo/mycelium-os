import type { Action } from 'svelte/action';

type RevealParams = {
	/** Délai d'entrée en ms (stagger). */
	delay?: number;
	/** Seuil d'intersection avant déclenchement. */
	threshold?: number;
};

/**
 * use:reveal : révèle un élément au scroll via IntersectionObserver.
 *
 * S'appuie sur les utilitaires définis dans layout.css :
 * `enter-blur-up-wait` (état caché initial) + `animate-enter-blur-up` (entrée).
 * `prefers-reduced-motion` est déjà géré par ces utilitaires.
 *
 * Fallback : sans IntersectionObserver, l'élément est révélé immédiatement.
 */
export const reveal: Action<HTMLElement, RevealParams | undefined> = (node, params) => {
	const delay = params?.delay ?? 0;
	const threshold = params?.threshold ?? 0.15;

	node.style.setProperty('--enter-delay', `${delay}ms`);

	if (typeof IntersectionObserver === 'undefined') {
		node.classList.remove('enter-blur-up-wait');
		node.classList.add('animate-enter-blur-up');
		return;
	}

	node.classList.add('enter-blur-up-wait');

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					node.classList.remove('enter-blur-up-wait');
					node.classList.add('animate-enter-blur-up');
					observer.unobserve(node);
				}
			}
		},
		{ threshold, rootMargin: '0px 0px -10% 0px' }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
};
