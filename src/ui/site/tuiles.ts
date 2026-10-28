import { mouvementReduit } from './gestes';

/**
 * LES SIX TUILES (transplantées de la maquette V26).
 *
 * Souris : l'instant se joue à l'entrée, se défait à la sortie, et la scène suit le curseur en
 * profondeur. Clavier : le focus joue l'instant comme le survol. Doigt : il se joue une fois,
 * quand la tuile entre à l'écran, et la scène reste dans son état final.
 *
 * Le cadran part de l'indice de départ et passe par chaque fait de l'analyse (`sante`, lu dans
 * `marketing/site/tout-demo.ts`). Les autres valeurs sont lues sur la page.
 */
export interface ScenarioTuiles {
	readonly sante: {
		readonly depart: number;
		readonly indice: number;
		readonly chemin: readonly number[];
	};
}
type Tuile = HTMLElement & { _m?: ReturnType<typeof setTimeout>; _r?: number };
interface Histoire {
	readonly entrer: (t: Tuile) => void;
	readonly sortir: (t: Tuile) => void;
}

function heure(): string {
	const d = new Date();
	return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
}
const adoucir = (p: number) => 1 - Math.pow(1 - p, 3);

export function demarrerTuiles(racine: HTMLElement, s: ScenarioTuiles): () => void {
	const tuiles = Array.from(racine.querySelectorAll<Tuile>('[data-tuile]'));
	if (!tuiles.length) return () => {};
	const reduit = mouvementReduit();
	const souris = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
	const defaires: Array<() => void> = [];
	function ecouter<E extends Event>(cible: EventTarget, type: string, f: (e: E) => void) {
		const g = f as EventListener;
		cible.addEventListener(type, g);
		defaires.push(() => cible.removeEventListener(type, g));
	}
	const histoires: Record<string, Histoire> = {};

	// Le cadran : graduations tous les 2 points, une majeure tous les 10.
	const cadran = racine.querySelector<SVGSVGElement>('[data-cadran]');
	const aiguille = cadran?.querySelector('[data-aiguille]');
	const indice = racine.querySelector<HTMLElement>('[data-indice]');
	const groupe = cadran?.querySelector('[data-graduations]');
	if (cadran && aiguille && indice && groupe) {
		const grads: { v: number; el: SVGLineElement }[] = [];
		const ns = 'http://www.w3.org/2000/svg';
		groupe.replaceChildren();
		for (let v = 0; v <= 100; v += 2) {
			const t = ((180 - v * 1.8) * Math.PI) / 180,
				maj = v % 10 === 0,
				r1 = 84,
				r0 = maj ? 72 : 77;
			const l = document.createElementNS(ns, 'line');
			l.setAttribute('x1', (100 + r0 * Math.cos(t)).toFixed(2));
			l.setAttribute('y1', (100 - r0 * Math.sin(t)).toFixed(2));
			l.setAttribute('x2', (100 + r1 * Math.cos(t)).toFixed(2));
			l.setAttribute('y2', (100 - r1 * Math.sin(t)).toFixed(2));
			l.setAttribute('class', 'graduation' + (maj ? ' majeure' : ''));
			groupe.appendChild(l);
			grads.push({ v, el: l });
		}
		defaires.push(() => groupe.replaceChildren());
		let valeur = s.sante.indice,
			course = 0;
		const poser = (v: number) => {
			valeur = v;
			aiguille.setAttribute('transform', 'rotate(' + (1.8 * v - 90).toFixed(2) + ' 100 100)');
			indice.textContent = String(Math.round(v));
			grads.forEach((g) => g.el.classList.toggle('allumee', g.v <= v + 0.01));
		};
		const vers = (cible: number, duree: number, suite?: () => void) => {
			cancelAnimationFrame(course);
			const depart = valeur,
				t0 = performance.now();
			const pas = (t: number) => {
				const p = reduit ? 1 : Math.min(1, (t - t0) / duree);
				poser(depart + (cible - depart) * adoucir(p));
				if (p < 1) course = requestAnimationFrame(pas);
				else suite?.();
			};
			pas(t0);
		};
		poser(s.sante.indice);
		defaires.push(() => cancelAnimationFrame(course));
		const faits = racine.querySelector<HTMLElement>('[data-faits]');
		const lignes = faits ? Array.from(faits.querySelectorAll<HTMLElement>('li')) : [];
		let minuteries: ReturnType<typeof setTimeout>[] = [];
		defaires.push(() => minuteries.forEach(clearTimeout));
		const rejouerSante = () => {
			minuteries.forEach(clearTimeout);
			minuteries = [];
			faits?.classList.add('cache');
			lignes.forEach((li) => (li.style.transitionDelay = '0ms'));
			vers(s.sante.depart, 380, () => {
				s.sante.chemin.forEach((cible, i) => {
					minuteries.push(
						setTimeout(
							() => {
								const li = lignes[i];
								if (li) li.style.transitionDelay = '0ms';
								faits?.classList.remove('cache');
								lignes.forEach((l, k) => {
									l.style.opacity = k <= i ? '' : '0';
									l.style.transform = k <= i ? '' : 'translateX(10px)';
								});
								vers(cible, 520);
							},
							160 + i * 640
						)
					);
				});
				minuteries.push(
					setTimeout(
						() =>
							lignes.forEach((l) => {
								l.style.opacity = '';
								l.style.transform = '';
							}),
						160 + s.sante.chemin.length * 640
					)
				);
			});
		};
		histoires.sante = { entrer: rejouerSante, sortir: () => {} };
	}

	histoires.coffre = (() => {
		const t0 = racine.querySelector<HTMLElement>('[data-tuile="coffre"]');
		const nom = t0?.querySelector<HTMLElement>('[data-etq-nom]'),
			heureEl = t0?.querySelector<HTMLElement>('[data-etq-heure]');
		const nomAuRepos = nom?.textContent ?? '',
			heureAuRepos = heureEl?.textContent ?? '';
		// Le dernier document de la pile est celui qui arrive au survol.
		const documents = t0 ? Array.from(t0.querySelectorAll('.feuillet b')) : [];
		const arrive = documents.at(-1)?.textContent ?? nomAuRepos;
		return {
			entrer: (t: Tuile) => {
				const etq = t.querySelector<HTMLElement>('[data-etq-coffre]');
				t._m = setTimeout(() => {
					if (nom) nom.textContent = arrive;
					if (heureEl) heureEl.textContent = 'Scellé à ' + heure();
					if (!reduit && etq) {
						etq.classList.remove('balance');
						void etq.offsetWidth;
						etq.classList.add('balance');
					}
				}, 700);
			},
			sortir: (t: Tuile) => {
				clearTimeout(t._m);
				if (nom) nom.textContent = nomAuRepos;
				if (heureEl) heureEl.textContent = heureAuRepos;
			}
		};
	})();
	histoires.echeancier = {
		entrer: (t) => {
			const recu = t.querySelector<HTMLElement>('[data-recu]');
			t._m = setTimeout(() => {
				if (recu) recu.textContent = recu.dataset.apres ?? '';
			}, 760);
		},
		sortir: (t) => {
			clearTimeout(t._m);
			const recu = t.querySelector<HTMLElement>('[data-recu]');
			if (recu) recu.textContent = recu.dataset.avant ?? '';
		}
	};
	histoires.logiciels = (() => {
		const el = racine.querySelector<HTMLElement>('[data-tuile="logiciels"] [data-factures]');
		const total = Number(el?.textContent ?? 0);
		return {
			entrer: (t: Tuile) => {
				if (!el) return;
				const t0 = performance.now() + 450;
				if (t._r) cancelAnimationFrame(t._r);
				const pas = (now: number) => {
					const p = reduit ? 1 : Math.max(0, Math.min(1, (now - t0) / 1300));
					el.textContent = String(Math.round(total * adoucir(p)));
					if (p < 1) t._r = requestAnimationFrame(pas);
				};
				pas(performance.now());
			},
			sortir: (t: Tuile) => {
				if (t._r) cancelAnimationFrame(t._r);
			}
		};
	})();

	function entrer(t: Tuile) {
		if (t.classList.contains('anime')) return;
		t.classList.add('anime');
		histoires[t.getAttribute('data-tuile') ?? '']?.entrer(t);
	}
	function sortir(t: Tuile) {
		t.classList.remove('anime');
		t.style.setProperty('--px', '0px');
		t.style.setProperty('--py', '0px');
		histoires[t.getAttribute('data-tuile') ?? '']?.sortir(t);
	}

	tuiles.forEach((t) => {
		ecouter(t, 'focusin', () => entrer(t));
		ecouter(t, 'focusout', () => {
			if (!t.matches(':hover')) sortir(t);
		});
		if (!souris) return;
		ecouter<PointerEvent>(t, 'pointerenter', (e) => {
			if (e.pointerType === 'mouse') entrer(t);
		});
		ecouter<PointerEvent>(t, 'pointerleave', (e) => {
			if (e.pointerType === 'mouse' && document.activeElement !== t) sortir(t);
		});
		ecouter<PointerEvent>(t, 'pointermove', (e) => {
			if (e.pointerType !== 'mouse') return;
			const r = t.getBoundingClientRect(),
				x = (e.clientX - r.left) / r.width,
				y = (e.clientY - r.top) / r.height;
			t.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
			t.style.setProperty('--my', (y * 100).toFixed(1) + '%');
			if (!reduit) {
				t.style.setProperty('--px', ((0.5 - x) * 12).toFixed(1) + 'px');
				t.style.setProperty('--py', ((0.5 - y) * 8).toFixed(1) + 'px');
			}
		});
	});
	if (!souris && 'IntersectionObserver' in window) {
		const obs = new IntersectionObserver(
			(entrees) => {
				entrees.forEach((en) => {
					if (en.isIntersecting) {
						entrer(en.target as Tuile);
						obs.unobserve(en.target);
					}
				});
			},
			{ threshold: 0.65 }
		);
		tuiles.forEach((t) => obs.observe(t));
		defaires.push(() => obs.disconnect());
	}

	return () => {
		tuiles.forEach((t) => {
			clearTimeout(t._m);
			if (t._r) cancelAnimationFrame(t._r);
			t.classList.remove('anime');
		});
		defaires.forEach((f) => f());
	};
}
