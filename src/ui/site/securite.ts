import { mouvementReduit } from './gestes';

/**
 * LA SÉCURITÉ (transplantée de la maquette V26).
 *
 * Trois tableaux, trois objets de papier. L'enveloppe et la lettre se jouent seules quand on les
 * regarde, comme les autres démonstrations : un doigt fantôme fait le geste, la souris fige la
 * visite, le premier vrai geste rend la main, et une pastille la relance. Le relevé, lui, n'a pas
 * de geste : les virements y arrivent, et ce qui passe par Letikette reste à zéro.
 *
 * ⚠️ LA MAQUETTE ANIMAIT LA FACTURE AVEC GSAP (Draggable, quickTo, une chronologie). Ici, aucune
 * dépendance : la facture se glisse aux événements de pointeur, avec les mêmes bornes, la même
 * résistance au bord (0,8) et le même test de recouvrement (18 % de la plus petite surface) ; ses
 * mouvements gardent les durées et les courbes de GSAP (`COURBES`). dnd-kit, prévu d'abord, range
 * des listes dans React : il ne sait ni borner un objet libre ni l'incliner sous le doigt.
 */
export interface ScenarioSecurite {
	readonly virements: readonly (readonly [string, string, number])[];
	readonly solde: number;
	/** Le délai pour retenir une relance, en secondes. */
	readonly delai: number;
}

const ARRET = Symbol('arret');
const NB = '\u00a0';
function euros(c: number): string {
	const e = Math.floor(c / 100),
		d = String(c % 100).padStart(2, '0');
	return String(e).replace(/\B(?=(\d{3})+(?!\d))/g, NB) + ',' + d + NB + '€';
}
const pause = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));
const heure = () => {
	const d = new Date();
	return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
};

/** Les courbes de GSAP que la maquette nommait. */
const COURBES = {
	'power2.out': (p: number) => 1 - Math.pow(1 - p, 3),
	'power2.in': (p: number) => p * p * p,
	'power2.inOut': (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
	'power3.out': (p: number) => 1 - Math.pow(1 - p, 4),
	'back.out(1.25)': (p: number) => {
		const q = p - 1;
		return q * q * (2.25 * q + 1.25) + 1;
	}
} as const;
type Courbe = keyof typeof COURBES;
type Prop = 'x' | 'y' | 'rotation' | 'scale';
type Pose = Record<Prop, number>;

/**
 * UN OBJET QUI SE DÉPLACE : sa pose (déplacement, rotation, échelle), écrite sur l'élément, et
 * ses mouvements en cours. Un mouvement nouveau sur une propriété reprend la main sur celle-ci,
 * depuis la valeur affichée, comme le « overwrite » de GSAP.
 */
function objetMobile(el: HTMLElement, pose: Pose, arrete: () => boolean) {
	interface Mouvement {
		pistes: Map<Prop, readonly [number, number]>;
		t0: number;
		duree: number;
		courbe: (p: number) => number;
		surMaj?: (p: number) => void;
		fin?: () => void;
	}
	const mouvements = new Set<Mouvement>();
	let image = 0;
	// `translate3d`, comme GSAP : l'objet a son propre calque, il glisse sans repeindre la scène,
	// et ses bords se lissent comme dans la maquette.
	const ecrire = () => {
		el.style.transform = `translate3d(${pose.x.toFixed(2)}px, ${pose.y.toFixed(2)}px, 0px) rotate(${pose.rotation.toFixed(3)}deg) scale(${pose.scale.toFixed(4)})`;
	};
	const pas = (n: number) => {
		image = 0;
		if (arrete()) return;
		for (const m of [...mouvements]) {
			const p = m.duree ? Math.min(1, Math.max(0, (n - m.t0) / m.duree)) : 1,
				e = m.courbe(p);
			m.pistes.forEach(([de, a], prop) => (pose[prop] = de + (a - de) * e));
			m.surMaj?.(p);
			if (p >= 1) {
				mouvements.delete(m);
				m.fin?.();
			}
		}
		ecrire();
		if (mouvements.size) image = requestAnimationFrame(pas);
	};
	return {
		pose,
		ecrire,
		poser(valeurs: Partial<Pose>) {
			Object.assign(pose, valeurs);
			ecrire();
		},
		/** Arrête les mouvements (de certaines propriétés), là où ils sont. */
		arreter(props?: readonly Prop[]) {
			for (const m of [...mouvements]) {
				for (const p of props ?? [...m.pistes.keys()]) m.pistes.delete(p);
				if (!m.pistes.size) mouvements.delete(m);
			}
		},
		vers(
			cibles: Partial<Pose>,
			secondes: number,
			courbe: Courbe,
			options: { surMaj?: (p: number) => void; fin?: () => void } = {}
		): Promise<void> {
			const props = Object.keys(cibles) as Prop[];
			this.arreter(props);
			return new Promise((ok) => {
				const m: Mouvement = {
					pistes: new Map(props.map((p) => [p, [pose[p], cibles[p] ?? pose[p]] as const])),
					t0: performance.now(),
					duree: secondes * 1000,
					courbe: COURBES[courbe],
					...(options.surMaj ? { surMaj: options.surMaj } : {}),
					fin: () => {
						options.fin?.();
						ok();
					}
				};
				mouvements.add(m);
				if (!image) image = requestAnimationFrame(pas);
			});
		},
		defaire() {
			mouvements.clear();
			cancelAnimationFrame(image);
			el.style.transform = '';
		}
	};
}

interface ApiVisite {
	readonly attendre: (ms: number) => Promise<void>;
	readonly toucher: (el: HTMLElement) => Promise<void>;
	readonly placer: (x: number, y: number) => void;
	readonly doigt: HTMLElement | null;
	readonly active: (j: number) => boolean;
}
interface OptionsVisite {
	readonly duree: number;
	readonly preparer: (anime: boolean) => Promise<void>;
	readonly interrompre?: (e: Event) => void;
	readonly scenario: (v: ApiVisite, j: number) => Promise<void>;
}

const LIBELLE = {
	joue: ['Visite guidée', 'Mettre la visite en pause'],
	survol: ['À vous : tout se touche', 'Mettre la visite en pause'],
	pause: ['Reprendre la visite', 'Reprendre la visite'],
	main: ['Vous avez la main', 'Relancer la visite'],
	revoir: ['Relancer la visite', 'Relancer la visite'],
	pret: ['Lancer la visite', 'Lancer la visite guidée']
} as const;
type Mode = keyof typeof LIBELLE;

export function demarrerSecurite(racine: HTMLElement, s: ScenarioSecurite): () => void {
	const tableaux = Array.from(racine.querySelectorAll<HTMLElement>('[data-tableau-sec]'));
	if (!tableaux.length) return () => {};
	const reduit = mouvementReduit();
	let arrete = false;
	const defaires: Array<() => void> = [];
	function ecouter<E extends Event>(
		cible: EventTarget,
		type: string,
		f: (e: E) => void,
		options?: boolean | AddEventListenerOptions
	) {
		const g = f as EventListener;
		cible.addEventListener(type, g, options);
		defaires.push(() => cible.removeEventListener(type, g, options));
	}
	const un = (n: string) => racine.querySelector<HTMLElement>(`[data-tableau-sec="${n}"]`);
	const minuteries = new Set<ReturnType<typeof setTimeout>>();
	const plus = (f: () => void, ms: number) => {
		const t = setTimeout(() => {
			minuteries.delete(t);
			if (!arrete) f();
		}, ms);
		minuteries.add(t);
		return t;
	};

	// La scène se dessine à sa taille propre et se met à l'échelle du tableau.
	function echelle() {
		tableaux.forEach((t) => {
			const sc = t.querySelector<HTMLElement>('[data-scene-sec]');
			if (sc?.offsetWidth) t.style.setProperty('--k', (t.clientWidth / sc.offsetWidth).toFixed(4));
		});
	}
	echelle();
	ecouter(window, 'resize', echelle);

	// Une visite guidée par tableau : sa propre horloge, figée hors de l'écran, en pause et sous la souris.
	function visiteGuidee(t: HTMLElement, o: OptionsVisite): void {
		const doigt = t.querySelector<HTMLElement>('[data-s-doigt]'),
			pastille = t.querySelector<HTMLElement>('[data-s-visite]');
		const texte = pastille?.querySelector<HTMLElement>('[data-s-visite-texte]'),
			arc = pastille?.querySelector<SVGElement>('[data-s-arc]');
		let horloge = 0,
			attentes: { t: number; ok: () => void; non: (e: unknown) => void }[] = [],
			jeton = 0,
			demarree = false,
			debut = 0;
		let visite: Mode = reduit ? 'pret' : 'joue',
			hors = true,
			survol = false;
		function peindre() {
			if (!pastille) return;
			const m: Mode = visite === 'joue' && survol ? 'survol' : visite;
			if (pastille.dataset.mode === m) return;
			pastille.dataset.mode = m;
			if (texte) texte.textContent = LIBELLE[m][0];
			pastille.setAttribute('aria-label', LIBELLE[m][1]);
		}
		const figee = () => hors || document.hidden || (!!pastille && survol) || visite === 'pause';
		let avant = performance.now();
		const tic = setInterval(() => {
			const n = performance.now(),
				dt = Math.min(250, n - avant);
			avant = n;
			if (!demarree || figee()) return;
			horloge += dt;
			if (attentes.length)
				attentes = attentes.filter((a) => {
					if (horloge >= a.t) {
						a.ok();
						return false;
					}
					return true;
				});
			if (arc && visite === 'joue')
				arc.style.strokeDashoffset = (100 - Math.min(1, (horloge - debut) / o.duree) * 100).toFixed(
					1
				);
		}, 50);
		defaires.push(() => clearInterval(tic));
		function attendre(ms: number): Promise<void> {
			const j = jeton;
			if (visite === 'pret') return Promise.resolve();
			return new Promise((ok, non) => {
				attentes.push({ t: horloge + ms, ok: () => (j === jeton ? ok() : non(ARRET)), non });
			});
		}
		function arreter() {
			jeton++;
			attentes.splice(0).forEach((a) => a.non(ARRET));
			doigt?.classList.remove('vu', 'appuie', 'onde');
		}
		defaires.push(arreter);
		function placer(x: number, y: number) {
			if (!doigt) return;
			const r = t.getBoundingClientRect();
			doigt.style.translate = (x - r.left).toFixed(1) + 'px ' + (y - r.top).toFixed(1) + 'px';
		}
		function onde() {
			if (!doigt) return;
			doigt.classList.remove('onde');
			void doigt.offsetWidth;
			doigt.classList.add('onde');
		}
		async function toucher(el: HTMLElement) {
			if (visite === 'pret' || !doigt) {
				el.click();
				return;
			}
			const r = el.getBoundingClientRect();
			placer(r.left + r.width / 2, r.top + r.height / 2);
			doigt.classList.add('vu');
			await attendre(320);
			doigt.classList.add('appuie');
			await attendre(140);
			doigt.classList.remove('appuie');
			onde();
			el.click();
			await attendre(260);
			doigt.classList.remove('vu');
		}
		const api: ApiVisite = { attendre, toucher, placer, doigt, active: (j) => j === jeton };
		async function boucle(anime: boolean) {
			const j = jeton;
			while (j === jeton && visite !== 'pret' && !arrete) {
				debut = horloge;
				await o.preparer(anime);
				anime = true;
				if (j !== jeton || arrete) return;
				try {
					await o.scenario(api, j);
				} catch (e) {
					if (e === ARRET) return;
					throw e;
				}
			}
		}
		function relancer() {
			arreter();
			visite = 'joue';
			demarree = true;
			peindre();
			void boucle(true);
		}
		let mainT: ReturnType<typeof setTimeout> | undefined;
		function prendreLaMain(e: Event) {
			const cible = e.target instanceof Element ? e.target : null;
			if (
				!e.isTrusted ||
				cible?.closest('[data-s-visite]') ||
				(visite !== 'joue' && visite !== 'pause')
			)
				return;
			arreter();
			o.interrompre?.(e);
			visite = 'main';
			peindre();
			clearTimeout(mainT);
			mainT = plus(() => {
				if (visite === 'main') {
					visite = 'revoir';
					peindre();
				}
			}, 2600);
		}
		if (pastille) {
			ecouter(t, 'click', prendreLaMain, true);
			ecouter(t, 'keydown', prendreLaMain, true);
			ecouter(
				t,
				'pointerdown',
				(e) => {
					if (e.target instanceof Element && e.target.closest('button, [data-s-facture]'))
						prendreLaMain(e);
				},
				true
			);
			ecouter(pastille, 'click', () => {
				if (visite === 'joue') visite = 'pause';
				else if (visite === 'pause') visite = 'joue';
				else {
					relancer();
					return;
				}
				peindre();
			});
			ecouter<PointerEvent>(t, 'pointerenter', (e) => {
				if (e.pointerType === 'mouse') {
					survol = true;
					peindre();
				}
			});
			ecouter<PointerEvent>(t, 'pointerleave', (e) => {
				if (e.pointerType === 'mouse') {
					survol = false;
					peindre();
				}
			});
		}
		// Regardé quand plus d'un tiers du tableau est à l'écran. Relu au défilement.
		let prevu = false;
		function regarder() {
			prevu = false;
			const r = t.getBoundingClientRect(),
				vu = Math.min(r.bottom, window.innerHeight) - Math.max(r.top, 0);
			hors = vu < Math.min(r.height, window.innerHeight) * 0.35;
			if (!hors && !demarree && visite !== 'pret') {
				demarree = true;
				void boucle(false);
			}
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
		ecouter(window, 'resize', regarder);
		peindre();
		regarder();
	}

	// 1. LE SCELLÉ. La facture suit le doigt ; lâchée sur l'enveloppe, elle y glisse, le rabat se
	// ferme, le cachet tombe et l'étiquette dit quand et sous quelle clé. Entrée la scelle au clavier.
	(() => {
		const t = un('scelle');
		const scene = t?.querySelector<HTMLElement>('[data-scene-sec]'),
			fac = t?.querySelector<HTMLElement>('[data-s-facture]'),
			env = t?.querySelector<HTMLElement>('[data-s-enveloppe]'),
			heureEl = t?.querySelector<HTMLElement>('[data-s-heure]');
		if (!t || !scene || !fac || !env || !heureEl) return;
		const ROT = -7;
		const heureAuRepos = heureEl.textContent ?? '';
		let etat: 'libre' | 'encours' | 'scelle' = 'libre',
			glisseActif = true,
			generation = 0;
		const objet = objetMobile(fac, { x: 0, y: 0, rotation: ROT, scale: 1 }, () => arrete);
		objet.ecrire();
		defaires.push(() => {
			objet.defaire();
			fac.style.zIndex = '';
			heureEl.textContent = heureAuRepos;
			t.classList.remove('depose', 'ferme', 'scelle', 'etiquetee', 'deplace', 'au-dessus', 'saisi');
		});
		const tourner = (r: number) => void objet.vers({ rotation: r }, 0.45, 'power3.out');
		let repos: ReturnType<typeof setTimeout> | undefined;
		/** L'échelle de la scène : un pixel d'écran vaut 1/k pixel de la scène. */
		const k = () => scene.getBoundingClientRect().width / (scene.offsetWidth || 1) || 1;
		// Où la facture se place : au-dessus de l'ouverture, puis tout entière dans l'enveloppe.
		function cibles() {
			const dx = env!.offsetLeft + env!.offsetWidth / 2 - (fac!.offsetLeft + fac!.offsetWidth / 2),
				cy = fac!.offsetTop + fac!.offsetHeight / 2,
				h = (fac!.offsetHeight * 0.74) / 2;
			return { x: dx, haut: env!.offsetTop - 104 + h - cy, dedans: env!.offsetTop + 6 + h - cy };
		}
		/** Le recouvrement de GSAP : au moins 18 % de la surface de l'un des deux. */
		function surLEnveloppe(): boolean {
			const a = fac!.getBoundingClientRect(),
				b = env!.getBoundingClientRect();
			const l = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)),
				h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
			const commun = l * h;
			return commun > 0 && commun >= 0.18 * Math.min(a.width * a.height, b.width * b.height);
		}
		function retour() {
			tourner(ROT);
			void objet.vers({ x: 0, y: 0, scale: 1 }, reduit ? 0.01 : 0.6, 'back.out(1.25)', {
				fin: () => t!.classList.remove('deplace')
			});
		}
		async function sceller(): Promise<void> {
			if (etat !== 'libre') return;
			etat = 'encours';
			glisseActif = false;
			const g = generation;
			t!.classList.add('depose');
			t!.classList.remove('au-dessus');
			const c = cibles(),
				d = reduit ? 0.01 : 1;
			await objet.vers({ x: c.x, y: c.haut, rotation: 0, scale: 0.74 }, 0.5 * d, 'power2.out');
			if (g !== generation || arrete) return;
			fac!.style.zIndex = '3';
			await objet.vers({ y: c.dedans }, 0.55 * d, 'power2.in');
			await pause(50 * d);
			if (g !== generation || arrete) return;
			t!.classList.add('ferme');
			await pause(600 * d);
			if (g !== generation || arrete) return;
			heureEl!.textContent = heure();
			t!.classList.add('scelle');
			await pause(500 * d);
			if (g !== generation || arrete) return;
			t!.classList.add('etiquetee');
			etat = 'scelle';
		}

		// Le glisser : la facture suit le doigt, bornée au tableau, et résiste au bord.
		let pointeur: number | null = null,
			depart = { x: 0, y: 0, px: 0, py: 0 },
			bornes = { gauche: 0, droite: 0, haut: 0, bas: 0 },
			echelleDuGeste = 1,
			dernierX = 0;
		const resister = (v: number, min: number, max: number) =>
			v < min ? min + (v - min) * 0.2 : v > max ? max + (v - max) * 0.2 : v;
		ecouter<PointerEvent>(fac, 'pointerdown', (e) => {
			if (!glisseActif || pointeur !== null || (e.pointerType === 'mouse' && e.button !== 0))
				return;
			pointeur = e.pointerId;
			try {
				fac.setPointerCapture(e.pointerId);
			} catch {
				/* le pointeur est déjà parti */
			}
			echelleDuGeste = k();
			const p = objet.pose,
				fr = fac.getBoundingClientRect(),
				tr = t.getBoundingClientRect();
			depart = { x: p.x, y: p.y, px: e.clientX, py: e.clientY };
			dernierX = p.x;
			bornes = {
				gauche: p.x + (tr.left - fr.left) / echelleDuGeste,
				droite: p.x + (tr.right - fr.right) / echelleDuGeste,
				haut: p.y + (tr.top - fr.top) / echelleDuGeste,
				bas: p.y + (tr.bottom - fr.bottom) / echelleDuGeste
			};
			t.classList.add('saisi');
			objet.arreter(['x', 'y']);
			void objet.vers({ scale: 1.06 }, 0.16, 'power2.out');
			tourner(0);
		});
		ecouter<PointerEvent>(fac, 'pointermove', (e) => {
			if (e.pointerId !== pointeur) return;
			const dx = (e.clientX - depart.px) / echelleDuGeste,
				dy = (e.clientY - depart.py) / echelleDuGeste;
			if (Math.abs(dx) < 2 && Math.abs(dy) < 2 && !t.classList.contains('deplace')) return;
			const x = resister(depart.x + dx, bornes.gauche, bornes.droite),
				y = resister(depart.y + dy, bornes.haut, bornes.bas);
			objet.arreter(['x', 'y']);
			objet.poser({ x, y });
			t.classList.add('deplace');
			tourner(Math.max(-12, Math.min(12, (x - dernierX) * 1.5)));
			dernierX = x;
			clearTimeout(repos);
			repos = plus(() => tourner(0), 90);
			t.classList.toggle('au-dessus', surLEnveloppe());
		});
		function lacher(e: PointerEvent) {
			if (e.pointerId !== pointeur) return;
			pointeur = null;
			clearTimeout(repos);
			t!.classList.remove('saisi');
			if (surLEnveloppe()) void sceller();
			else {
				t!.classList.remove('au-dessus');
				retour();
			}
		}
		ecouter(fac, 'pointerup', lacher);
		ecouter(fac, 'pointercancel', lacher);
		ecouter<KeyboardEvent>(fac, 'keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				void sceller();
			}
		});
		async function preparer(anime: boolean) {
			if (anime && !reduit) {
				scene!.classList.add('voile');
				await pause(440);
			}
			generation++;
			objet.arreter();
			t!.classList.remove(
				'depose',
				'ferme',
				'scelle',
				'etiquetee',
				'deplace',
				'au-dessus',
				'saisi'
			);
			fac!.style.zIndex = '';
			objet.poser({ x: 0, y: 0, rotation: ROT, scale: 1 });
			glisseActif = true;
			etat = 'libre';
			if (anime && !reduit) {
				await pause(60);
				scene!.classList.remove('voile');
				await pause(300);
			}
		}
		visiteGuidee(t, {
			duree: 9200,
			preparer,
			interrompre: (e) => {
				// Saisie pendant le transport : la facture reste dans la main. Ailleurs : elle rentre.
				if (etat !== 'libre') return;
				objet.arreter();
				t.classList.remove('au-dessus', 'saisi');
				if (!(e.target instanceof Element && e.target.closest('[data-s-facture]'))) retour();
			},
			scenario: async (v, j) => {
				await v.attendre(1500);
				const r = fac.getBoundingClientRect();
				v.placer(r.left + r.width / 2, r.top + r.height * 0.42);
				v.doigt?.classList.add('vu');
				await v.attendre(340);
				v.doigt?.classList.add('appuie');
				t.classList.add('saisi');
				void objet.vers({ scale: 1.06, rotation: 0 }, 0.2, 'power2.out');
				t.classList.add('deplace');
				await v.attendre(220);
				const c = cibles();
				await objet.vers({ x: c.x - 12, y: c.haut - 30, rotation: 3 }, 1, 'power2.inOut', {
					surMaj: (p) => {
						if (!v.active(j)) return;
						const q = fac.getBoundingClientRect();
						v.placer(q.left + q.width / 2, q.top + q.height * 0.42);
						if (p > 0.72) t.classList.add('au-dessus');
					}
				});
				if (!v.active(j)) return;
				v.doigt?.classList.remove('appuie');
				t.classList.remove('saisi');
				await sceller();
				v.doigt?.classList.remove('vu');
				await v.attendre(3800);
			}
		});
	})();

	// 2. L'ARGENT. Trois virements arrivent sur votre relevé, le solde monte ; dans le ciel, ce qui
	// est passé par Letikette ne bouge pas.
	(() => {
		const t = un('argent');
		const scene = t?.querySelector<HTMLElement>('[data-scene-sec]'),
			lignes = t?.querySelector<HTMLElement>('[data-lignes]'),
			soldeEl = t?.querySelector<HTMLElement>('[data-solde]');
		if (!t || !scene || !lignes || !soldeEl) return;
		const DEPART = lignes.innerHTML,
			SOLDE_AU_REPOS = soldeEl.textContent ?? '';
		let solde = s.solde,
			image = 0;
		soldeEl.textContent = euros(s.solde);
		defaires.push(() => {
			cancelAnimationFrame(image);
			lignes.innerHTML = DEPART;
			soldeEl.textContent = SOLDE_AU_REPOS;
		});
		function compter(de: number, a: number) {
			const t0 = performance.now(),
				duree = reduit ? 0 : 900;
			soldeEl!.classList.remove('monte');
			void soldeEl!.offsetWidth;
			soldeEl!.classList.add('monte');
			cancelAnimationFrame(image);
			const pas = (n: number) => {
				if (arrete) return;
				const p = duree ? Math.min(1, (n - t0) / duree) : 1,
					e = 1 - Math.pow(1 - p, 3);
				soldeEl!.textContent = euros(Math.round(de + (a - de) * e));
				if (p < 1) image = requestAnimationFrame(pas);
			};
			pas(t0);
		}
		function arrive([jour, client, montant]: readonly [string, string, number]) {
			const l = document.createElement('span');
			l.className = 'releve-ligne' + (reduit ? '' : ' arrive');
			const i = document.createElement('i'),
				nom = document.createElement('span'),
				petit = document.createElement('small'),
				b = document.createElement('b');
			i.textContent = jour;
			petit.textContent = 'Virement';
			nom.append(petit, client);
			b.textContent = '+' + euros(montant);
			l.append(i, nom, b);
			lignes!.insertBefore(l, lignes!.firstChild);
			while (lignes!.children.length > 4) lignes!.lastChild?.remove();
			compter(solde, solde + montant);
			solde += montant;
		}
		async function preparer(anime: boolean) {
			if (anime && !reduit) {
				scene!.classList.add('voile');
				await pause(440);
			}
			lignes!.innerHTML = DEPART;
			solde = s.solde;
			soldeEl!.textContent = euros(s.solde);
			if (anime && !reduit) {
				await pause(60);
				scene!.classList.remove('voile');
			}
		}
		if (reduit) {
			s.virements.forEach(arrive);
			return;
		}
		visiteGuidee(t, {
			duree: 13000,
			preparer,
			scenario: async (v) => {
				await v.attendre(1400);
				for (const p of s.virements) {
					arrive(p);
					await v.attendre(2600);
				}
				await v.attendre(3200);
			}
		});
	})();

	// 3. LA LETTRE. Elle flotte, prête à partir ; le compte à rebours court. Retenue, elle se pose et
	// ne partira pas ; un second toucher la laisse partir.
	(() => {
		const t = un('retenir');
		const depart = t?.querySelector<HTMLElement>('[data-s-depart]'),
			compte = t?.querySelector<HTMLElement>('[data-s-compte]'),
			bouton = t?.querySelector<HTMLElement>('[data-s-retenir]');
		if (!t || !depart || !compte || !bouton) return;
		const PART = depart.textContent ?? '';
		let retenue = false,
			secondes = s.delai - 1;
		const mmss = () => Math.floor(secondes / 60) + ':' + String(secondes % 60).padStart(2, '0');
		function peindre() {
			t!.classList.toggle('retenue', retenue);
			depart!.textContent = retenue ? 'Retenue' : PART;
			compte!.textContent = retenue ? 'Elle ne partira pas' : 'dans ' + mmss() + ' · à votre nom';
			bouton!.textContent = retenue ? 'Laisser partir' : 'Retenir';
		}
		ecouter(bouton, 'click', () => {
			retenue = !retenue;
			peindre();
		});
		const tic = setInterval(() => {
			if (retenue || document.hidden || arrete) return;
			const r = t.getBoundingClientRect();
			if (r.bottom < 0 || r.top > window.innerHeight) return;
			secondes = secondes > 0 ? secondes - 1 : s.delai - 1;
			compte.textContent = 'dans ' + mmss() + ' · à votre nom';
		}, 1000);
		defaires.push(() => clearInterval(tic));
		peindre();
		visiteGuidee(t, {
			duree: 9800,
			preparer: () => {
				retenue = false;
				peindre();
				return Promise.resolve();
			},
			scenario: async (v) => {
				await v.attendre(2600);
				await v.toucher(bouton);
				await v.attendre(3400);
				await v.toucher(bouton);
				await v.attendre(2400);
			}
		});
	})();

	return () => {
		arrete = true;
		minuteries.forEach((m) => clearTimeout(m));
		defaires.forEach((f) => f());
	};
}
