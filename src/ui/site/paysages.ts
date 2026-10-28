import { HORIZONS, PALETTES, estPalette, peindre } from './peinture';
import type { NomPalette } from './peinture';

/**
 * QUAND LES PAYSAGES SE PEIGNENT (transplanté de la maquette V26, passe « fluidité »).
 *
 * Un canevas `canvas[data-paysage="<palette>"]` se peint quand il approche de l'écran (900 px
 * de marge), une seule fois pour une taille donnée ; ce qui reste loin se peint quand le
 * navigateur n'a rien d'autre à faire. Au redimensionnement et à l'arrivée des polices, tout se
 * relit, et seul ce qui a changé de taille se repeint.
 *
 * Deux exceptions de la maquette, gardées telles quelles : `brume` alterne avec `rosee` d'une
 * tuile à l'autre, et `saisons` est peint par la frise de la loi au moment de la saison.
 */
export function demarrerPaysages(racine: HTMLElement): () => void {
	const aPeindre = new Map<HTMLCanvasElement, [NomPalette, number]>();
	const dejaPeint = new WeakMap<HTMLCanvasElement, string>();

	function cle(cv: HTMLCanvasElement, nom: string, horizon: number): string {
		const r = cv.getBoundingClientRect();
		return Math.round(r.width) + 'x' + Math.round(r.height) + ':' + nom + ':' + horizon.toFixed(3);
	}

	function peindreMaintenant(cv: HTMLCanvasElement): void {
		const t = aPeindre.get(cv);
		if (!t) return;
		aPeindre.delete(cv);
		const k = cle(cv, t[0], t[1]);
		if (dejaPeint.get(cv) === k) return;
		peindre(cv, PALETTES[t[0]], t[1]);
		dejaPeint.set(cv, k);
	}

	const guetteur =
		'IntersectionObserver' in window
			? new IntersectionObserver(
					(entrees) => {
						entrees.forEach((e) => {
							if (e.isIntersecting && e.target instanceof HTMLCanvasElement)
								peindreMaintenant(e.target);
						});
					},
					{ rootMargin: '900px 0px' }
				)
			: null;

	function demanderPeinture(cv: HTMLCanvasElement, nom: NomPalette, horizon: number): void {
		aPeindre.set(cv, [nom, horizon]);
		if (!guetteur) {
			peindreMaintenant(cv);
			return;
		}
		const r = cv.getBoundingClientRect();
		if (r.width && r.bottom > -900 && r.top < window.innerHeight + 900) peindreMaintenant(cv);
		else {
			guetteur.unobserve(cv);
			guetteur.observe(cv);
		}
	}

	function tout(): void {
		let tuile = 0;
		const tete = racine.querySelector<HTMLElement>('[data-tete]');
		racine.querySelectorAll<HTMLCanvasElement>('canvas[data-paysage]').forEach((cv) => {
			let nom = cv.getAttribute('data-paysage') ?? '';
			if (nom === 'brume') nom = tuile++ % 2 ? 'rosee' : 'brume';
			if (nom === 'saisons' || !estPalette(nom)) return;
			let horizon = HORIZONS[nom] || 0.6;
			if (nom === 'aube' && tete) {
				const rt = tete.getBoundingClientRect(),
					vit = racine.querySelector('[data-vitrine]');
				const y = vit
					? vit.getBoundingClientRect().top - rt.top + vit.getBoundingClientRect().height * 0.52
					: rt.height * 0.7;
				horizon = Math.min(0.85, y / rt.height);
				tete.style.setProperty('--horizon', Math.round(y) + 'px');
			}
			demanderPeinture(cv, nom, horizon);
		});
	}

	// Ce qui reste loin de l'écran se peint quand le navigateur n'a rien d'autre à faire.
	let arrete = false;
	const auRepos = (f: (d: { timeRemaining(): number }) => void): void => {
		if (arrete) return;
		if ('requestIdleCallback' in window) window.requestIdleCallback(f);
		else setTimeout(() => f({ timeRemaining: () => 8 }), 200);
	};
	function peindreAuRepos(d: { timeRemaining(): number }): void {
		if (arrete) return;
		let n = aPeindre.keys().next();
		while (!n.done && d.timeRemaining() > 6) {
			peindreMaintenant(n.value);
			n = aPeindre.keys().next();
		}
		if (aPeindre.size) auRepos(peindreAuRepos);
	}
	let minuteurRepos: ReturnType<typeof setTimeout> | undefined;
	const auChargement = () => {
		minuteurRepos = setTimeout(() => auRepos(peindreAuRepos), 1200);
	};
	if (document.readyState === 'complete') auChargement();
	else window.addEventListener('load', auChargement, { once: true });

	let minuteurPeinture: ReturnType<typeof setTimeout> | undefined;
	const auRedimensionnement = () => {
		clearTimeout(minuteurPeinture);
		minuteurPeinture = setTimeout(tout, 160);
	};
	window.addEventListener('resize', auRedimensionnement);
	tout();
	document.fonts?.ready.then(() => {
		if (!arrete) tout();
	});

	return () => {
		arrete = true;
		guetteur?.disconnect();
		clearTimeout(minuteurPeinture);
		clearTimeout(minuteurRepos);
		window.removeEventListener('resize', auRedimensionnement);
		window.removeEventListener('load', auChargement);
	};
}
