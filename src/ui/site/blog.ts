import { mouvementReduit } from './gestes';
import { PALETTES, peindre, type NomPalette } from './peinture';

/**
 * LE BLOG (transplanté de la maquette V26).
 *
 * Les articles avancent seuls, comme les capacités de Plume : une barre par article, figée sous la
 * souris et hors de l'écran ; un toucher choisit. À chaque article, la plaque prend une autre heure
 * du massif (deux toiles en fondu), l'étiquette se balance avec son chiffre, et la feuille change.
 *
 * Les articles arrivent par `articles` : ceux que la page a rendus (`marketing/site/blog-demo.ts`).
 */
export interface ArticleDuRecit {
	readonly adresse: string;
	readonly rubrique: string;
	readonly date: string;
	readonly minutes: number;
	readonly titre: string;
	readonly bref: readonly string[];
	readonly etiquette: readonly [string, string, string] | null;
}

/** Une heure du massif par article, dans l'ordre de la maquette. */
const HEURES: readonly NomPalette[] = ['blogA', 'blogB', 'blogC', 'blogD'];
const DUREE = 9000;

export function demarrerBlog(racine: HTMLElement, articles: readonly ArticleDuRecit[]): () => void {
	const grille = racine.querySelector<HTMLElement>('[data-blog]');
	const plaque = grille?.querySelector<HTMLElement>('[data-b-plaque]');
	const pendu = plaque?.querySelector<HTMLElement>('[data-b-pendu]'),
		feuille = plaque?.querySelector<HTMLElement>('[data-b-feuille]');
	if (!grille || !plaque || !pendu || !feuille || !articles.length) return () => {};
	const reduit = mouvementReduit();
	const boutons = Array.from(grille.querySelectorAll<HTMLElement>('[data-b-article]'));
	const toiles = Array.from(plaque.querySelectorAll<HTMLCanvasElement>('[data-b-toile]'));
	const q = (s: string) => plaque.querySelector<HTMLElement>(s);
	let actuel = 0,
		horloge = 0,
		survol = false,
		hors = true,
		arrete = false;
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
	const heureDe = (k: number): NomPalette => HEURES[k % HEURES.length] ?? 'blogA';

	// L'heure de la plaque : la toile du dessus se peint avec la palette suivante, puis apparaît ;
	// celle du dessous la rejoint ensuite, en silence.
	let dessus = false;
	function peindreHeure(nom: NomPalette, net?: boolean) {
		const [a, b] = toiles;
		if (!a || !b) return;
		if (net || reduit) {
			peindre(a, PALETTES[nom], 0.62);
			b.classList.remove('visible');
			dessus = false;
			return;
		}
		peindre(dessus ? a : b, PALETTES[nom], 0.62);
		b.classList.toggle('visible', !dessus);
		dessus = !dessus;
	}
	let changement: ReturnType<typeof setTimeout> | undefined;
	function montrer(k: number, anime: boolean) {
		actuel = k;
		horloge = 0;
		boutons.forEach((b, i) => {
			b.classList.toggle('active', i === k);
			b.classList.toggle('fini', i < k);
			b.setAttribute('aria-selected', i === k ? 'true' : 'false');
			b.style.setProperty('--avance', '0');
		});
		const a = articles[k];
		if (!a) return;
		function ecrire() {
			if (!a) return;
			const texte = (s: string, v: string) => {
				const el = q(s);
				if (el) el.textContent = v;
			};
			texte('[data-b-rubrique]', a.rubrique + ' · ' + a.date);
			texte('[data-b-titre]', a.titre);
			const bref = q('[data-b-bref]');
			if (bref)
				bref.replaceChildren(
					...a.bref.map((p) => {
						const li = document.createElement('li');
						li.textContent = p;
						return li;
					})
				);
			texte('[data-b-min]', a.minutes + ' min de lecture');
			q('[data-b-lire]')?.setAttribute('href', `/blog/${a.adresse}`);
			pendu!.hidden = a.etiquette === null;
			if (a.etiquette) {
				texte('[data-b-etq-label]', a.etiquette[0]);
				texte('[data-b-etq-grand]', a.etiquette[1]);
				texte('[data-b-etq-sous]', a.etiquette[2]);
			}
		}
		if (!anime || reduit) {
			ecrire();
			return;
		}
		peindreHeure(heureDe(k));
		feuille!.classList.remove('entre');
		feuille!.classList.add('sort');
		clearTimeout(changement);
		changement = setTimeout(() => {
			if (arrete) return;
			ecrire();
			feuille!.classList.remove('sort');
			void feuille!.offsetWidth;
			feuille!.classList.add('entre');
			pendu!.classList.remove('balance');
			void pendu!.offsetWidth;
			pendu!.classList.add('balance');
		}, 240);
	}
	boutons.forEach((b, k) =>
		ecouter(b, 'click', () => {
			if (k !== actuel) montrer(k, true);
			else horloge = 0;
		})
	);

	// L'horloge : elle avance quand la grille est à l'écran, sans souris dessus, onglet visible.
	let avant = performance.now();
	const tic = setInterval(() => {
		const n = performance.now(),
			dt = Math.min(250, n - avant);
		avant = n;
		if (reduit || hors || survol || document.hidden) return;
		horloge += dt;
		boutons[actuel]?.style.setProperty('--avance', Math.min(1, horloge / DUREE).toFixed(4));
		if (horloge >= DUREE) montrer((actuel + 1) % boutons.length, true);
	}, 50);
	ecouter<PointerEvent>(grille, 'pointerenter', (e) => {
		if (e.pointerType === 'mouse') survol = true;
	});
	ecouter<PointerEvent>(grille, 'pointerleave', (e) => {
		if (e.pointerType === 'mouse') survol = false;
	});
	let prevu = false;
	function regarder() {
		prevu = false;
		const r = grille!.getBoundingClientRect(),
			vu = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
		hors = vu < Math.min(r.height, window.innerHeight) * 0.4;
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
	let minuteur: ReturnType<typeof setTimeout> | undefined;
	ecouter(window, 'resize', () => {
		regarder();
		clearTimeout(minuteur);
		minuteur = setTimeout(() => peindreHeure(heureDe(actuel), true), 200);
	});
	regarder();
	montrer(0, false);
	peindreHeure(heureDe(0), true);

	return () => {
		arrete = true;
		clearInterval(tic);
		clearTimeout(changement);
		clearTimeout(minuteur);
		defaires.forEach((f) => f());
	};
}
