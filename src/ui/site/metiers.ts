import { mouvementReduit } from './gestes';

/**
 * LES MÉTIERS (transplantés de la maquette V26).
 *
 * Au bureau, les panneaux s'ouvrent au survol (après un court temps, pour qu'une souris qui passe
 * ne les fasse pas défiler) et tournent seuls quand on regarde la section sans y toucher, avec la
 * barre du panneau ouvert. Au téléphone, un toucher ouvre une rangée, et rien ne tourne : une
 * rangée qui s'ouvre seule ferait sauter la page sous le pouce. Flèches au clavier.
 */
const DUREE = 7000;
const PAS: Readonly<Record<string, number>> = {
	ArrowRight: 1,
	ArrowDown: 1,
	ArrowLeft: -1,
	ArrowUp: -1
};

export function demarrerMetiers(racine: HTMLElement): () => void {
	const trouvee = racine.querySelector<HTMLElement>('[data-metiers]');
	if (!trouvee) return () => {};
	const rangee: HTMLElement = trouvee;
	const reduit = mouvementReduit();
	const panneaux = Array.from(rangee.querySelectorAll<HTMLElement>('[data-metier]'));
	const bureau = window.matchMedia('(min-width: 901px) and (hover: hover) and (pointer: fine)');
	let actuel = 0,
		horloge = 0,
		survol = false,
		hors = true,
		touche = false,
		attente: ReturnType<typeof setTimeout> | undefined;
	const defaires: Array<() => void> = [];
	function ecouter<E extends Event>(
		cible: EventTarget,
		type: string,
		f: (e: E) => void,
		options?: AddEventListenerOptions
	) {
		const g = f as EventListener;
		cible.addEventListener(type, g, options);
		defaires.push(() => cible.removeEventListener(type, g, options));
	}
	const onglet = (p: HTMLElement) => p.querySelector<HTMLElement>('[data-metier-onglet]');
	const progres = (p: HTMLElement | undefined) => p?.querySelector<HTMLElement>('.metier-progres');

	function largeur() {
		// La largeur du panneau ouvert, au repos : le contenu s'y tient pendant l'ouverture.
		if (!bureau.matches && window.innerWidth <= 900) {
			rangee.style.removeProperty('--large');
			return;
		}
		const total = rangee.clientWidth - 10 * (panneaux.length - 1);
		rangee.style.setProperty(
			'--large',
			Math.round((total * 4.2) / (4.2 + panneaux.length - 1)) + 'px'
		);
	}
	function ouvrir(k: number) {
		if (k === actuel) return;
		actuel = k;
		horloge = 0;
		panneaux.forEach((p, i) => {
			p.classList.toggle('active', i === k);
			onglet(p)?.setAttribute('aria-selected', i === k ? 'true' : 'false');
			progres(p)?.style.setProperty('--avance', '0');
		});
	}
	panneaux.forEach((p, k) => {
		const b = onglet(p);
		if (!b) return;
		ecouter(b, 'click', () => {
			touche = true;
			ouvrir(k);
		});
		ecouter<PointerEvent>(p, 'pointerenter', (e) => {
			if (e.pointerType !== 'mouse' || !bureau.matches) return;
			clearTimeout(attente);
			attente = setTimeout(() => ouvrir(k), 110);
		});
		ecouter(p, 'pointerleave', () => clearTimeout(attente));
		ecouter<KeyboardEvent>(b, 'keydown', (e) => {
			const pas = PAS[e.key];
			if (!pas) return;
			e.preventDefault();
			const n = (actuel + pas + panneaux.length) % panneaux.length;
			touche = true;
			ouvrir(n);
			panneaux[n]?.querySelector<HTMLElement>('.metier-lien')?.focus({ preventScroll: true });
		});
	});
	ecouter<PointerEvent>(rangee, 'pointerenter', (e) => {
		if (e.pointerType === 'mouse') survol = true;
	});
	ecouter<PointerEvent>(rangee, 'pointerleave', (e) => {
		if (e.pointerType === 'mouse') survol = false;
	});
	ecouter(rangee, 'focusin', () => (survol = true));
	ecouter(rangee, 'focusout', () => (survol = false));

	let avant = performance.now();
	const tic = setInterval(() => {
		const n = performance.now(),
			dt = Math.min(250, n - avant);
		avant = n;
		if (reduit || !bureau.matches || touche || hors || survol || document.hidden) return;
		horloge += dt;
		progres(panneaux[actuel])?.style.setProperty(
			'--avance',
			Math.min(1, horloge / DUREE).toFixed(4)
		);
		if (horloge >= DUREE) ouvrir((actuel + 1) % panneaux.length);
	}, 50);
	let prevu = false;
	function regarder() {
		prevu = false;
		const r = rangee.getBoundingClientRect(),
			vu = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
		hors = vu < Math.min(r.height, window.innerHeight) * 0.5;
	}
	ecouter(
		window,
		'scroll',
		() => {
			if (!prevu) {
				prevu = true;
				requestAnimationFrame(regarder);
			}
		},
		{ passive: true }
	);
	ecouter(window, 'resize', () => {
		largeur();
		regarder();
	});
	largeur();
	regarder();

	return () => {
		clearInterval(tic);
		clearTimeout(attente);
		defaires.forEach((f) => f());
	};
}
