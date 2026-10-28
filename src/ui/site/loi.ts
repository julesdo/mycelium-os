import { mouvementReduit } from './gestes';
import { PALETTES, melanger, meler, peindre } from './peinture';

/**
 * LA FRISE DE LA LOI (transplantée de la maquette V26).
 *
 * Le fil se remplit à la lecture. Chaque tableau se joue une fois, quand on le regarde : le massif
 * vieillit de mars à octobre pendant que les jours défilent, la courbe des pénalités gravit la
 * montagne jusqu'à son étiquette, les étiquettes des frais descendent sur leurs fils, et la lumière
 * court sur le chemin qui mène à la date limite. À la souris, chaque tableau se lit : la souris
 * remonte le temps, un point suit la courbe et dit ce qui était dû ce jour-là.
 *
 * ⚠️ LES CHIFFRES ARRIVENT PAR `scenario`, CALCULÉS PAR LE MOTEUR (`marketing/site/loi-demo.ts`).
 * La maquette les tapait : 214 jours, 893,43 €, et une répartition fausse (94 j à 404,12 €). La
 * cassure de la courbe se place sur le vrai premier semestre.
 */
export interface ScenarioLoi {
	/** Le jour d'échéance, `AAAA-MM-JJ` : le point de départ. */
	readonly depart: string;
	readonly jours: number;
	readonly penalites: number;
	readonly segments: ReadonlyArray<{ readonly jours: number; readonly interets: number }>;
}

const MOIS_C = [
	'janvier',
	'février',
	'mars',
	'avril',
	'mai',
	'juin',
	'juillet',
	'août',
	'septembre',
	'octobre',
	'novembre',
	'décembre'
];

function euros(c: number): string {
	const e = Math.floor(c / 100),
		d = String(c % 100).padStart(2, '0');
	return String(e).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + d + ' €';
}
const adoucir = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
function dans(el: Element, ref: Element) {
	const a = el.getBoundingClientRect(),
		b = ref.getBoundingClientRect();
	return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
}

type Pt = [number, number];

export function demarrerLoi(racine: HTMLElement, s: ScenarioLoi): () => void {
	const reduit = mouvementReduit();
	const defaires: Array<() => void> = [];
	let arrete = false;
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

	const chrono = racine.querySelector<HTMLElement>('[data-chrono]');
	const fil = chrono?.querySelector<HTMLElement>('[data-fil]');
	const t1 = chrono?.querySelector<HTMLElement>('[data-tableau="saisons"]');
	const t2 = chrono?.querySelector<HTMLElement>('[data-tableau="courbe"]');
	const t4 = chrono?.querySelector<HTMLElement>('[data-tableau="horizon"]');
	if (!chrono || !fil || !t1 || !t2 || !t4) return () => {};
	const [premier, second] = s.segments;
	const s1 = premier ?? { jours: s.jours, interets: s.penalites },
		s2 = second ?? { jours: 0, interets: 0 };

	const jalons = Array.from(chrono.querySelectorAll<HTMLElement>('.jalon'));
	let prevu = false;
	function majFil() {
		prevu = false;
		if (!chrono || !fil) return;
		const r = chrono.getBoundingClientRect(),
			repere = window.innerHeight * 0.55;
		const p = reduit ? 1 : Math.max(0, Math.min(1, (repere - r.top) / r.height));
		fil.style.transform = 'scaleY(' + p + ')';
		jalons.forEach((j) =>
			j.classList.toggle('atteint', reduit || j.getBoundingClientRect().top + 60 < repere)
		);
	}
	ecouter(
		window,
		'scroll',
		() => {
			if (!prevu) {
				prevu = true;
				requestAnimationFrame(majFil);
			}
		},
		{ passive: true }
	);
	majFil();

	// 1. Les saisons : le même massif, de mars (t = 0) à octobre (t = 1).
	const cv1 = t1.querySelector('canvas'),
		cpt1 = t1.querySelector('[data-jours-t]'),
		ciel1 = t1.querySelector<HTMLElement>('[data-ciel-saisons]');
	let saison = reduit ? 1 : 0;
	function peindreSaison(t: number, rapide?: boolean) {
		saison = t;
		if (cv1)
			peindre(cv1, melanger(PALETTES.printemps, PALETTES.automne, t), 0.62, rapide ? 0.5 : 1);
		if (cpt1) cpt1.textContent = String(Math.round(s.jours * t));
		const c = Math.max(0, Math.min(1, (t - 0.3) / 0.4));
		if (ciel1) {
			ciel1.style.color = meler('#0c1124', '#ffffff', c);
			ciel1.style.textShadow = '0 2px 24px rgba(10,10,50,' + (0.35 * c).toFixed(2) + ')';
		}
	}
	let introSaisons = false;
	function jouerSaisons() {
		const t0 = performance.now(),
			duree = 2800;
		const pas = (t: number) => {
			if (arrete) return;
			const p = Math.min(1, (t - t0) / duree);
			peindreSaison(adoucir(p), p < 1);
			if (p < 1) requestAnimationFrame(pas);
			else {
				introSaisons = true;
				t1?.classList.add('pret');
			}
		};
		pas(t0);
	}

	// 2. La courbe : trois points (le lendemain de l'échéance, le nouveau taux, aujourd'hui).
	const svg2 = t2.querySelector<SVGSVGElement>('[data-courbe-svg]'),
		etq2 = t2.querySelector<HTMLElement>('[data-etq-courbe]'),
		pen2 = t2.querySelector('[data-pen-t]');
	let geo: { p0: Pt; p1: Pt; p2: Pt; H: number; W: number } | null = null;
	// La cassure : la part du temps puis la part des pénalités passées au premier taux.
	const kx = s.jours ? s1.jours / s.jours : 0.5,
		ky = s.penalites ? s1.interets / s.penalites : 0.5;
	function placerCourbe() {
		if (!t2 || !svg2 || !etq2) return;
		const W = t2.clientWidth,
			H = t2.clientHeight;
		if (!W) return;
		svg2.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
		const ew = etq2.offsetWidth;
		const p0: Pt = [W * 0.08, H * 0.84];
		const p2: Pt = [Math.min(W * 0.6, W - ew - W * 0.04 + 20), H * 0.3];
		const p1: Pt = [p0[0] + (p2[0] - p0[0]) * kx, p0[1] + (p2[1] - p0[1]) * ky];
		const d = 'M' + p0.join(' ') + ' L' + p1.join(' ') + ' L' + p2.join(' ');
		geo = { p0, p1, p2, H, W };
		svg2.querySelector('[data-courbe]')?.setAttribute('d', d);
		svg2.querySelector('[data-courbe-halo]')?.setAttribute('d', d);
		const cp = svg2.querySelector('[data-coupure]');
		if (cp) {
			cp.setAttribute('x1', String(p1[0]));
			cp.setAttribute('x2', String(p1[0]));
			cp.setAttribute('y1', String(p1[1] - 46));
			cp.setAttribute('y2', String(H * 0.9));
		}
		['[data-point]', '[data-point-halo]'].forEach((sel) => {
			const c = svg2.querySelector(sel);
			c?.setAttribute('cx', String(p2[0]));
			c?.setAttribute('cy', String(p2[1]));
		});
		const gauche = p2[0] - 20,
			haut = p2[1] + 58;
		etq2.style.left = gauche + 'px';
		etq2.style.top = haut + 'px';
		const ox = gauche + 19.5,
			oy = haut + 19.5;
		svg2
			.querySelector('[data-fil-courbe]')
			?.setAttribute(
				'd',
				'M' +
					p2[0] +
					' ' +
					p2[1] +
					' Q' +
					(p2[0] + 8) +
					' ' +
					(p2[1] + oy) / 2 +
					' ' +
					ox +
					' ' +
					oy
			);
		const debut = t2.querySelector<HTMLElement>('[data-repere="debut"]'),
			coupure = t2.querySelector<HTMLElement>('[data-repere="coupure"]');
		if (debut) {
			debut.style.left = p0[0] - 4 + 'px';
			debut.style.top = p0[1] + 12 + 'px';
		}
		if (coupure) {
			coupure.style.left = p1[0] + 10 + 'px';
			coupure.style.top = p1[1] + 16 + 'px';
		}
	}
	let introCourbe = false;
	function jouerCourbe() {
		const t0 = performance.now() + 200,
			duree = 1500;
		const pas = (t: number) => {
			if (arrete) return;
			const p = Math.max(0, Math.min(1, (t - t0) / duree));
			if (pen2) pen2.textContent = euros(Math.round(s.penalites * adoucir(p)));
			if (p < 1) requestAnimationFrame(pas);
			else {
				introCourbe = true;
				t2?.classList.add('pret');
			}
		};
		pas(performance.now());
	}

	// 4. L'horizon : un chemin de Plume à la date limite, le transport à un cinquième du trajet.
	const svg4 = t4.querySelector<SVGSVGElement>('[data-horizon-svg]'),
		drapeau = t4.querySelector<HTMLElement>('[data-drapeau]'),
		plume4 = t4.querySelector('[data-plume-veille]');
	function placerHorizon() {
		if (!t4 || !svg4 || !drapeau || !plume4) return;
		const W = t4.clientWidth,
			H = t4.clientHeight;
		if (!W) return;
		svg4.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
		const pl = dans(plume4, t4);
		const a: Pt = [pl.x + pl.w * 0.86, pl.y + pl.h * 0.78];
		const e: Pt = [W * 0.84, H * 0.585];
		const c: Pt = [W * 0.5, H * 0.99];
		const d = 'M' + a.join(' ') + ' Q' + c.join(' ') + ' ' + e.join(' ');
		svg4.querySelector('[data-chemin]')?.setAttribute('d', d);
		svg4.querySelector('[data-lueur]')?.setAttribute('d', d);
		const k = 0.2,
			u = 1 - k;
		const pt: Pt = [
			u * u * a[0] + 2 * u * k * c[0] + k * k * e[0],
			u * u * a[1] + 2 * u * k * c[1] + k * k * e[1]
		];
		['[data-transport]', '[data-transport-halo]'].forEach((q) => {
			const el = svg4.querySelector(q);
			el?.setAttribute('cx', String(pt[0]));
			el?.setAttribute('cy', String(pt[1]));
		});
		const rep = t4.querySelector<HTMLElement>('[data-repere="transport"]');
		if (rep) {
			rep.style.left = pt[0] + 12 + 'px';
			rep.style.top = pt[1] - 28 + 'px';
		}
		drapeau.style.left = e[0] - drapeau.offsetWidth + 'px';
		drapeau.style.top = e[1] - drapeau.offsetHeight + 'px';
	}

	function regler() {
		peindreSaison(saison);
		placerCourbe();
		placerHorizon();
		majFil();
	}
	regler();
	let minuterie: ReturnType<typeof setTimeout> | undefined;
	ecouter(window, 'resize', () => {
		clearTimeout(minuterie);
		minuterie = setTimeout(regler, 200);
	});
	document.fonts?.ready.then(() => {
		if (arrete) return;
		placerCourbe();
		placerHorizon();
	});

	// À LA SOURIS, CHAQUE TABLEAU SE LIT.
	const fin = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
	const [an, mo, jo] = s.depart.split('-').map(Number);
	const origine = Date.UTC(an ?? 2026, (mo ?? 1) - 1, jo ?? 1);
	const dateDe = (jour: number) => {
		const d = new Date(origine + jour * 86400000);
		return (d.getUTCDate() === 1 ? '1er' : d.getUTCDate()) + ' ' + MOIS_C[d.getUTCMonth()];
	};
	const penaliteAu = (jour: number) =>
		jour <= s1.jours
			? Math.round((s1.interets * jour) / (s1.jours || 1))
			: s1.interets + Math.round((s2.interets * (jour - s1.jours)) / (s2.jours || 1));
	if (fin) {
		const sous1 = ciel1?.querySelector(':scope > span');
		const texte1 = sous1?.textContent ?? '';
		let cibleSaison = 1,
			rafSaison: number | null = null,
			retourSaison: number | null = null,
			netSaison: ReturnType<typeof setTimeout> | undefined;
		ecouter<PointerEvent>(t1, 'pointermove', (e) => {
			if (!introSaisons || e.pointerType !== 'mouse' || !t1) return;
			if (retourSaison) cancelAnimationFrame(retourSaison);
			const r = t1.getBoundingClientRect();
			cibleSaison = Math.max(0, Math.min(1, ((e.clientX - r.left) / r.width - 0.06) / 0.88));
			if (!rafSaison)
				rafSaison = requestAnimationFrame(() => {
					rafSaison = null;
					peindreSaison(cibleSaison, true);
					clearTimeout(netSaison);
					netSaison = setTimeout(() => peindreSaison(saison), 140);
					if (sous1)
						sous1.textContent =
							'sans paiement, du ' + dateDe(0) + ' au ' + dateDe(Math.round(s.jours * cibleSaison));
				});
		});
		ecouter(t1, 'pointerleave', () => {
			if (!introSaisons) return;
			if (rafSaison) cancelAnimationFrame(rafSaison);
			rafSaison = null;
			const depart = saison,
				t0 = performance.now();
			const pas = (t: number) => {
				if (arrete) return;
				const p = reduit ? 1 : Math.min(1, (t - t0) / 700);
				peindreSaison(depart + (1 - depart) * adoucir(p), p < 1);
				if (p < 1) retourSaison = requestAnimationFrame(pas);
				else if (sous1) sous1.textContent = texte1;
			};
			pas(t0);
		});

		if (svg2) {
			const ns = 'http://www.w3.org/2000/svg';
			const forme = (nom: string, classe: string) => {
				const el = document.createElementNS(ns, nom);
				el.setAttribute('class', classe);
				svg2.appendChild(el);
				defaires.push(() => el.remove());
				return el;
			};
			const ligne2 = forme('line', 't-curseur-ligne'),
				halo2 = forme('circle', 't-curseur-halo'),
				point2 = forme('circle', 't-curseur');
			halo2.setAttribute('r', '11');
			point2.setAttribute('r', '4.5');
			const info2 = document.createElement('span');
			info2.className = 't-info';
			info2.setAttribute('aria-hidden', 'true');
			t2.appendChild(info2);
			defaires.push(() => info2.remove());
			ecouter<PointerEvent>(t2, 'pointermove', (e) => {
				if (!introCourbe || !geo || e.pointerType !== 'mouse' || !t2) return;
				const r = t2.getBoundingClientRect(),
					p0 = geo.p0,
					p1 = geo.p1,
					p2 = geo.p2;
				const x = Math.max(p0[0], Math.min(p2[0], e.clientX - r.left));
				const y =
					x <= p1[0]
						? p0[1] + ((p1[1] - p0[1]) * (x - p0[0])) / (p1[0] - p0[0])
						: p1[1] + ((p2[1] - p1[1]) * (x - p1[0])) / (p2[0] - p1[0]);
				const jour = Math.round((s.jours * (x - p0[0])) / (p2[0] - p0[0]));
				[halo2, point2].forEach((c) => {
					c.setAttribute('cx', String(x));
					c.setAttribute('cy', String(y));
				});
				ligne2.setAttribute('x1', String(x));
				ligne2.setAttribute('x2', String(x));
				ligne2.setAttribute('y1', String(y + 8));
				ligne2.setAttribute('y2', String(geo.H * 0.9));
				info2.style.left = Math.max(80, Math.min(geo.W - 80, x)) + 'px';
				info2.style.top = y + 'px';
				info2.innerHTML = dateDe(jour) + '<b>' + euros(penaliteAu(jour)) + '</b>';
				t2.classList.add('lecture');
			});
			ecouter(t2, 'pointerleave', () => t2?.classList.remove('lecture'));
		}

		if (!reduit) {
			const t3 = chrono.querySelector<HTMLElement>('[data-tableau="forfait"]');
			const pendants = Array.from(t3?.querySelectorAll<HTMLElement>('.pendant') ?? []);
			const retours = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
			let dernierX: number | null = null;
			if (t3) {
				ecouter<PointerEvent>(t3, 'pointermove', (e) => {
					if (e.pointerType !== 'mouse') return;
					if (dernierX === null) {
						dernierX = e.clientX;
						return;
					}
					const vx = e.clientX - dernierX;
					dernierX = e.clientX;
					pendants.forEach((p) => {
						const r = p.getBoundingClientRect();
						if (
							Math.abs(e.clientX - (r.left + r.width / 2)) > r.width * 0.75 ||
							e.clientY > r.bottom + 12
						)
							return;
						const a = Math.max(-14, Math.min(14, -vx * 0.9));
						if (Math.abs(a) < 1.2) return;
						p.style.rotate = a.toFixed(1) + 'deg';
						clearTimeout(retours.get(p));
						retours.set(
							p,
							setTimeout(() => {
								p.style.rotate = '0deg';
							}, 150)
						);
					});
				});
				ecouter(t3, 'pointerleave', () => {
					dernierX = null;
				});
			}
		}
	}

	const jeux: Record<string, () => void> = { saisons: jouerSaisons, courbe: jouerCourbe };
	const tableaux = Array.from(chrono.querySelectorAll<HTMLElement>('[data-tableau]'));
	if (reduit || !('IntersectionObserver' in window)) {
		tableaux.forEach((v) => v.classList.add('vu'));
		introSaisons = introCourbe = true;
		t1.classList.add('pret');
		t2.classList.add('pret');
	} else {
		if (pen2) pen2.textContent = euros(0);
		const observateur = new IntersectionObserver(
			(entrees) => {
				entrees.forEach((en) => {
					if (!en.isIntersecting || !(en.target instanceof HTMLElement)) return;
					const v = en.target;
					v.classList.add('vu');
					jeux[v.getAttribute('data-tableau') ?? '']?.();
					observateur.unobserve(v);
				});
			},
			{ threshold: 0.5 }
		);
		tableaux.forEach((v) => observateur.observe(v));
		defaires.push(() => observateur.disconnect());
	}

	return () => {
		arrete = true;
		clearTimeout(minuterie);
		defaires.forEach((d) => d());
	};
}
