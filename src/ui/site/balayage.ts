/**
 * BALAYER LES RÉCITS (transplanté de la maquette V26).
 *
 * Au téléphone, la plaque de Plume et celle du blog se balaient comme des cartes : le contenu suit
 * le doigt dès que le geste est franchement horizontal, puis passe au suivant (vers la gauche) ou
 * au précédent (vers la droite) si le geste est assez long ou assez vif ; sinon il revient en
 * place. Le passage touche la barre du récit voisin : la section fait le reste, comme si on
 * l'avait touchée.
 */
export function demarrerBalayage(racine: HTMLElement): () => void {
	const telephone = window.matchMedia('(max-width: 900px)');
	const defaires: Array<() => void> = [];
	const minuteries = new Set<ReturnType<typeof setTimeout>>();
	const plus = (f: () => void, ms: number) => {
		const t = setTimeout(() => {
			minuteries.delete(t);
			f();
		}, ms);
		minuteries.add(t);
	};

	racine.querySelectorAll<HTMLElement>('.plume-grille').forEach((grille) => {
		const plaqueTrouvee = grille.querySelector<HTMLElement>('.plaque'),
			boutons = Array.from(grille.querySelectorAll<HTMLElement>('.capacite'));
		if (!plaqueTrouvee || boutons.length < 2) return;
		const plaque: HTMLElement = plaqueTrouvee;
		const blog = grille.classList.contains('blog-grille');
		const cible = () =>
			plaque.querySelector<HTMLElement>('.vue.active') ??
			plaque.querySelector<HTMLElement>('.b-feuille');
		const actif = () =>
			Math.max(
				0,
				boutons.findIndex((b) => b.classList.contains('active'))
			);
		let id: number | null = null,
			x0 = 0,
			y0 = 0,
			t0 = 0,
			dx = 0,
			verrou: 'x' | 'y' | null = null,
			el: HTMLElement | null = null,
			occupe = false;

		function sur<E extends Event>(type: string, f: (e: E) => void) {
			const g = f as EventListener;
			plaque.addEventListener(type, g);
			defaires.push(() => plaque.removeEventListener(type, g));
		}
		sur<PointerEvent>('pointerdown', (e) => {
			if (e.pointerType === 'mouse' || !telephone.matches || occupe || id !== null) return;
			id = e.pointerId;
			x0 = e.clientX;
			y0 = e.clientY;
			t0 = performance.now();
			dx = 0;
			verrou = null;
			el = cible();
		});
		sur<PointerEvent>('pointermove', (e) => {
			if (e.pointerId !== id || !el) return;
			const mx = e.clientX - x0,
				my = e.clientY - y0;
			if (!verrou) {
				if (Math.abs(mx) < 8 && Math.abs(my) < 8) return;
				verrou = Math.abs(mx) > Math.abs(my) * 1.15 ? 'x' : 'y';
				if (verrou === 'y') {
					id = null;
					return;
				}
				try {
					plaque.setPointerCapture(id);
				} catch {
					/* le pointeur est déjà parti */
				}
				el.style.transition = 'none';
			}
			dx = mx;
			el.style.transform =
				'translateX(' + (dx * 0.9).toFixed(1) + 'px) rotate(' + (dx * 0.012).toFixed(2) + 'deg)';
			el.style.opacity = String(1 - Math.min(0.45, Math.abs(dx) / 700));
		});
		function fin(e: PointerEvent) {
			if (e.pointerId !== id) return;
			id = null;
			if (verrou !== 'x' || !el) return;
			const v = dx / Math.max(1, performance.now() - t0);
			if (Math.abs(dx) > 64 || Math.abs(v) > 0.45) {
				passer(dx < 0 ? 1 : -1, el);
				return;
			}
			el.style.transition = 'transform 440ms cubic-bezier(0.34, 1.4, 0.64, 1), opacity 300ms ease';
			el.style.transform = '';
			el.style.opacity = '';
		}
		sur<PointerEvent>('pointerup', fin);
		sur<PointerEvent>('pointercancel', fin);
		function passer(sens: 1 | -1, ancien: HTMLElement) {
			occupe = true;
			const n = boutons.length,
				k = (actif() + sens + n) % n;
			plaque.setAttribute('data-sens', sens > 0 ? 'suivant' : 'precedent');
			ancien.style.transition = 'transform 200ms ease-in, opacity 200ms ease-in';
			ancien.style.transform =
				'translateX(' + (sens > 0 ? -110 : 110) + 'px) rotate(' + (sens > 0 ? -2 : 2) + 'deg)';
			ancien.style.opacity = '0';
			// Le blog réécrit sa feuille un quart de seconde après le toucher : on le lance tout de
			// suite. Plume change de scène sur-le-champ : on attend que l'ancienne soit sortie.
			if (blog) boutons[k]?.click();
			plus(
				() => {
					if (!blog) boutons[k]?.click();
					ancien.style.transition = 'none';
					ancien.style.transform = '';
					ancien.style.opacity = '';
					const neuf = cible();
					if (!neuf) {
						occupe = false;
						return;
					}
					neuf.style.transition = 'none';
					neuf.style.transform = 'translateX(' + (sens > 0 ? 72 : -72) + 'px)';
					neuf.style.opacity = '0';
					void neuf.offsetWidth;
					neuf.style.transition =
						'transform 480ms cubic-bezier(0.23, 1, 0.32, 1), opacity 320ms ease-out';
					neuf.style.transform = '';
					neuf.style.opacity = '';
					plus(() => {
						neuf.style.transition = '';
						plaque.removeAttribute('data-sens');
						occupe = false;
					}, 520);
				},
				blog ? 260 : 200
			);
		}
	});

	return () => {
		minuteries.forEach((t) => clearTimeout(t));
		defaires.forEach((f) => f());
	};
}
