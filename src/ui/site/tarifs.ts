import { mouvementReduit } from './gestes';

/**
 * LES TARIFS (transplantés de la maquette V26).
 *
 * Trois étiquettes pendues à un fil, Plume perché dessus, et une seule bascule. Rien ne se règle et
 * rien ne bouge tout seul : un prix qu'on lit ne change pas sous les yeux. Le seul mouvement est
 * physique : les étiquettes se balancent quand la main les frôle ou quand on les fait défiler, et
 * reviennent au repos d'elles-mêmes, comme de vraies étiquettes sur un fil.
 *
 * Les montants des deux rythmes sont écrits sur la page (`data-annuel`, `data-mensuel`) ; les mois
 * offerts sont lus dans la ligne qui les dit au chargement.
 */
const RAIDEUR = 22,
	AMORTI = 2;
const POUSSEES = [7, -6, 6.5];

type Point = readonly [number, number];
/** Une courbe qui passe par chaque point (Catmull-Rom, en courbes de Bézier). */
function lisse(p: readonly Point[]): string {
	const premier = p[0];
	if (!premier) return '';
	let d = 'M' + premier[0].toFixed(1) + ' ' + premier[1].toFixed(1);
	for (let i = 0; i < p.length - 1; i++) {
		const b = p[i] as Point,
			c = p[i + 1] as Point,
			a = p[i - 1] ?? b,
			e = p[i + 2] ?? c;
		d +=
			' C' +
			[
				b[0] + (c[0] - a[0]) / 6,
				b[1] + (c[1] - a[1]) / 6,
				c[0] - (e[0] - b[0]) / 6,
				c[1] - (e[1] - b[1]) / 6,
				c[0],
				c[1]
			]
				.map((n) => n.toFixed(1))
				.join(' ');
	}
	return d;
}

export function demarrerTarifs(racine: HTMLElement): () => void {
	const bloc = racine.querySelector<HTMLElement>('[data-tarifs]');
	const section = bloc?.closest<HTMLElement>('.tarifs');
	const rangee = bloc?.querySelector<HTMLElement>('[data-etiquettes]');
	const corde = bloc?.querySelector<SVGSVGElement>('[data-corde]'),
		trait = bloc?.querySelector('[data-corde-trait]'),
		ombreCorde = bloc?.querySelector('[data-corde-ombre]');
	const plume = bloc?.querySelector<HTMLElement>('[data-plume-fil]'),
		conseil = bloc?.querySelector<HTMLElement>('[data-conseil]');
	const bascule = section?.querySelector<HTMLElement>('[data-rythme]');
	if (
		!bloc ||
		!section ||
		!rangee ||
		!corde ||
		!trait ||
		!ombreCorde ||
		!plume ||
		!conseil ||
		!bascule
	)
		return () => {};
	const reduit = mouvementReduit();
	const telephone = window.matchMedia('(max-width: 760px)');
	const etiquettes = Array.from(bloc.querySelectorAll<HTMLElement>('.prix'));
	let rythme: 'annuel' | 'mensuel' = 'annuel';
	let arrete = false;
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
	function rejouer(el: Element, c: string) {
		el.classList.remove(c);
		void (el as HTMLElement).offsetWidth;
		el.classList.add(c);
	}
	const sousAnnuel = bloc.querySelector('[data-rythme-sous]')?.textContent ?? '';

	// Chaque étiquette est un pendule amorti : un angle, une vitesse, un ressort qui la ramène.
	const pendules = etiquettes.map((t) => ({
		el: t.querySelector<HTMLElement>('.prix-pendu'),
		a: 0,
		v: 0
	}));
	let enCours = false,
		avant = 0,
		image = 0;
	function pas(t: number) {
		if (arrete) return;
		const dt = Math.min(0.032, (t - avant) / 1000);
		let bouge = false;
		avant = t;
		pendules.forEach((p) => {
			p.v += (-RAIDEUR * p.a - AMORTI * p.v) * dt;
			p.a = Math.max(-5, Math.min(5, p.a + p.v * dt));
			if (Math.abs(p.a) > 0.01 || Math.abs(p.v) > 0.05) bouge = true;
			else {
				p.a = 0;
				p.v = 0;
			}
			if (p.el) p.el.style.rotate = p.a.toFixed(3) + 'deg';
		});
		if (bouge) image = requestAnimationFrame(pas);
		else enCours = false;
	}
	function pousser(i: number, dv: number) {
		const p = pendules[i];
		if (reduit || !p) return;
		p.v = Math.max(-26, Math.min(26, p.v + dv));
		if (!enCours) {
			enCours = true;
			avant = performance.now();
			image = requestAnimationFrame(pas);
		}
	}

	// La main qui passe : la vitesse de la souris, à l'entrée dans une étiquette, la pousse dans son
	// sens (vers la droite, le bas de l'étiquette part à droite : l'angle est négatif).
	let vx = 0,
		px: number | null = null,
		pt = 0;
	ecouter<PointerEvent>(bloc, 'pointermove', (e) => {
		if (e.pointerType !== 'mouse') return;
		const t = performance.now();
		if (px !== null && t > pt) vx = vx * 0.6 + ((e.clientX - px) / (t - pt)) * 1000 * 0.4;
		px = e.clientX;
		pt = t;
	});
	ecouter(bloc, 'pointerleave', () => {
		px = null;
		vx = 0;
	});
	etiquettes.forEach((t, i) => {
		// Même une main lente la fait bouger d'un degré ; une main vive, de quelques degrés.
		ecouter<PointerEvent>(t, 'pointerenter', (e) => {
			if (e.pointerType === 'mouse')
				pousser(i, (vx >= 0 ? -1 : 1) * Math.min(26, 5 + Math.abs(vx) * 0.012));
		});
	});

	// Au téléphone, le carrousel les emporte : elles traînent un peu derrière le fil, puis se posent.
	// Celle qui s'arrête au centre passe devant et prend le bouton plein.
	let dernierX = rangee.scrollLeft,
		dernierT = performance.now(),
		prevu = false,
		sourdJusque = 0;
	function devant() {
		prevu = false;
		if (!telephone.matches) return;
		const milieu = rangee!.scrollLeft + rangee!.clientWidth / 2;
		let proche: HTMLElement | null = null,
			d = Infinity;
		etiquettes.forEach((t) => {
			const e = Math.abs(t.offsetLeft + t.offsetWidth / 2 - milieu);
			if (e < d) {
				d = e;
				proche = t;
			}
		});
		etiquettes.forEach((t) => t.classList.toggle('devant', t === proche));
	}
	ecouter(
		rangee,
		'scroll',
		() => {
			const t = performance.now(),
				dx = rangee.scrollLeft - dernierX,
				dt = Math.max(8, t - dernierT);
			dernierX = rangee.scrollLeft;
			dernierT = t;
			const v = (dx / dt) * 1000;
			// Un défilement posé par le code (le centrage) ne les secoue pas.
			if (t > sourdJusque) pendules.forEach((_, i) => pousser(i, -v * 0.006 * (i % 2 ? 0.8 : 1)));
			if (!prevu) {
				prevu = true;
				requestAnimationFrame(devant);
			}
		},
		{ passive: true }
	);

	// La bascule : à l'année, le prix de l'année et ses mois offerts ; au mois, sans engagement.
	function placerGlisseur() {
		const b = bascule!.querySelector<HTMLElement>('[aria-checked="true"]'),
			g = bascule!.querySelector<HTMLElement>('.segment-glisseur');
		if (!b || !g || !b.offsetWidth) return;
		g.style.width = b.offsetWidth + 'px';
		g.style.translate = b.offsetLeft + 'px 0';
	}
	function choisir(v: string | undefined) {
		if ((v !== 'annuel' && v !== 'mensuel') || v === rythme) return;
		rythme = v;
		const an = v === 'annuel';
		bascule!.querySelectorAll<HTMLElement>('button').forEach((b) => {
			const oui = b.dataset.valeur === v;
			b.setAttribute('aria-checked', oui ? 'true' : 'false');
			b.tabIndex = oui ? 0 : -1;
		});
		placerGlisseur();
		section!.querySelectorAll<HTMLElement>('[data-montant]').forEach((m) => {
			m.textContent = m.getAttribute(an ? 'data-annuel' : 'data-mensuel');
			if (m.tagName === 'B' && !reduit) rejouer(m, 'roule');
		});
		bloc!
			.querySelectorAll('[data-rythme-texte]')
			.forEach((s) => (s.textContent = an ? 'HT par an' : 'HT par mois'));
		bloc!
			.querySelectorAll('[data-rythme-sous]')
			.forEach((s) => (s.textContent = an ? sousAnnuel : 'sans engagement'));
		// Les étiquettes frémissent quand leur prix change, Plume sautille.
		pendules.forEach((_, i) => pousser(i, POUSSEES[i] ?? 6));
		if (!reduit) rejouer(plume!, 'saute');
	}
	ecouter(bascule, 'click', (e) => {
		const b = e.target instanceof Element ? e.target.closest<HTMLElement>('button') : null;
		if (b) choisir(b.dataset.valeur);
	});
	ecouter<KeyboardEvent>(bascule, 'keydown', (e) => {
		if (!['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
		e.preventDefault();
		const autre = bascule.querySelector<HTMLElement>('[aria-checked="false"]');
		if (!autre) return;
		choisir(autre.dataset.valeur);
		autre.focus();
	});

	// Le fil : il passe par le point d'attache de chaque étiquette et, au bureau, sous les pattes de
	// Plume, puis remonte vers les bords du tableau. Relu sur la mise en page, jamais deviné.
	function tendre() {
		const W = rangee!.scrollWidth,
			H = rangee!.offsetHeight,
			mobile = telephone.matches;
		if (!W || !H) return;
		corde!.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
		corde!.style.width = W + 'px';
		corde!.style.height = H + 'px';
		const pts: Point[] = etiquettes.map((t) => {
			const fil = parseFloat(getComputedStyle(t).getPropertyValue('--fil')) || 58;
			return [t.offsetLeft + t.offsetWidth / 2, t.offsetTop - fil];
		});
		const premier = pts[0],
			dernier = pts[pts.length - 1];
		if (!premier || !dernier) return;
		const bord = Math.min(premier[1], dernier[1]) - (mobile ? 36 : 52);
		const tous: Point[] = [[-40, bord]];
		if (!mobile) {
			const l = plume!.offsetWidth,
				xp = Math.max(l / 2 + 14, premier[0] * 0.32);
			const yp = bord + (premier[1] - bord) * ((xp + 40) / (premier[0] + 40)) + 5;
			tous.push([xp, yp]);
			plume!.style.setProperty('--pf-x', (xp - l / 2).toFixed(1) + 'px');
			plume!.style.setProperty('--pf-y', (yp - l * 0.912 + 1.5).toFixed(1) + 'px');
			conseil!.style.setProperty('--cs-x', (xp + l / 2 + 6).toFixed(1) + 'px');
			conseil!.style.setProperty('--cs-y', (yp - l * 0.98).toFixed(1) + 'px');
		}
		const d = lisse([...tous, ...pts, [W + 40, bord]]);
		trait!.setAttribute('d', d);
		ombreCorde!.setAttribute('d', d);
	}
	function centrer() {
		const t = bloc!.querySelector<HTMLElement>('.prix.recommandee');
		if (!t) return;
		sourdJusque = performance.now() + 160;
		if (telephone.matches)
			rangee!.scrollLeft = t.offsetLeft + t.offsetWidth / 2 - rangee!.clientWidth / 2;
		else etiquettes.forEach((e) => e.classList.toggle('devant', e === t));
		dernierX = rangee!.scrollLeft;
	}
	function relire() {
		if (arrete) return;
		placerGlisseur();
		tendre();
		centrer();
	}
	let minuteur: ReturnType<typeof setTimeout> | undefined;
	ecouter(window, 'resize', () => {
		clearTimeout(minuteur);
		minuteur = setTimeout(relire, 140);
	});
	void document.fonts?.ready.then(relire);

	// La comparaison complète, repliée.
	const comparer = section.querySelector<HTMLElement>('[data-comparer]'),
		boutonComparer = section.querySelector<HTMLElement>('[data-comparer-bouton]');
	if (comparer && boutonComparer)
		ecouter(boutonComparer, 'click', () => {
			const o = !comparer.classList.contains('ouvert');
			comparer.classList.toggle('ouvert', o);
			boutonComparer.setAttribute('aria-expanded', o ? 'true' : 'false');
			const s = boutonComparer.querySelector('span');
			if (s) s.textContent = o ? 'Masquer la comparaison' : 'Comparer les formules';
		});

	relire();
	const pret = requestAnimationFrame(() => bascule.classList.add('pret'));

	return () => {
		arrete = true;
		cancelAnimationFrame(image);
		cancelAnimationFrame(pret);
		clearTimeout(minuteur);
		bascule.classList.remove('pret');
		defaires.forEach((f) => f());
	};
}
