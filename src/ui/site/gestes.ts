/**
 * LES GESTES COMMUNS DU SITE PUBLIC (transplantés de la maquette V26).
 *
 * Chaque fonction prend la racine de la page et rend de quoi tout défaire : la page peut être
 * quittée puis rouverte sans rechargement, et rien ne doit rester accroché à `window`.
 */

export const mouvementReduit = (): boolean =>
	window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sourisFine = (): boolean => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

type Defaire = () => void;

function ecouter<K extends keyof HTMLElementEventMap>(
	el: HTMLElement,
	type: K,
	f: (e: HTMLElementEventMap[K]) => void,
	defaires: Defaire[]
): void {
	el.addEventListener(type, f);
	defaires.push(() => el.removeEventListener(type, f));
}

/**
 * LES BOUTONS QUI COMPTENT. La lumière suit le curseur, et le bouton le suit de quelques
 * pixels : la transition CSS du transform lisse le mouvement et se réoriente à chaque
 * déplacement, sans boucle d'animation. Le cadre est mesuré à l'entrée, pas à chaque mouvement :
 * le bouton qui bouge ne se mesure pas lui-même en boucle. Souris seulement ; au doigt, le bouton
 * s'enfonce et c'est tout.
 */
export function demarrerBoutonsQuiComptent(racine: HTMLElement): Defaire {
	const defaires: Defaire[] = [];
	if (mouvementReduit() || !sourisFine()) return () => {};
	racine.querySelectorAll<HTMLElement>('[data-cta]').forEach((b) => {
		let cadre: { x: number; y: number; w: number; h: number } | null = null;
		ecouter(
			b,
			'pointerenter',
			(e) => {
				if (e.pointerType !== 'mouse') return;
				const r = b.getBoundingClientRect(),
					t = new DOMMatrixReadOnly(getComputedStyle(b).transform);
				cadre = { x: r.left - t.m41, y: r.top - t.m42, w: r.width, h: r.height };
			},
			defaires
		);
		ecouter(
			b,
			'pointermove',
			(e) => {
				if (!cadre || e.pointerType !== 'mouse') return;
				const x = e.clientX - cadre.x,
					y = e.clientY - cadre.y;
				b.style.setProperty('--mx', x.toFixed(1) + 'px');
				b.style.setProperty('--my', y.toFixed(1) + 'px');
				b.style.setProperty('--tx', ((x / cadre.w - 0.5) * 7).toFixed(2) + 'px');
				b.style.setProperty('--ty', ((y / cadre.h - 0.5) * 5).toFixed(2) + 'px');
			},
			defaires
		);
		ecouter(
			b,
			'pointerleave',
			() => {
				cadre = null;
				b.style.setProperty('--tx', '0px');
				b.style.setProperty('--ty', '0px');
			},
			defaires
		);
	});
	return () => defaires.forEach((d) => d());
}

/**
 * LES BLOCS VIVANTS. Le liseré suit le curseur, le paysage recule d'un cran à l'opposé. Le
 * cadre est relu à chaque mouvement : seul le canevas intérieur bouge, jamais le bloc lui-même.
 * Les variables s'écrivent sur le liseré et les canevas, une fois par image : jamais sur le bloc,
 * dont tout le contenu se recalculerait.
 */
export function demarrerBlocsVivants(racine: HTMLElement): Defaire {
	const defaires: Defaire[] = [];
	if (!sourisFine()) return () => {};
	const reduit = mouvementReduit();
	racine.querySelectorAll<HTMLElement>('[data-vivant]').forEach((el) => {
		const lueur = document.createElement('span');
		lueur.className = 'lueur';
		lueur.setAttribute('aria-hidden', 'true');
		el.appendChild(lueur);
		defaires.push(() => lueur.remove());
		const toiles = Array.from(el.children).filter(
			(c): c is HTMLCanvasElement => c instanceof HTMLCanvasElement
		);
		let dernier: [number, number] | null = null,
			prevu = false;
		function poser() {
			prevu = false;
			if (!dernier) return;
			const r = el.getBoundingClientRect(),
				x = dernier[0] - r.left,
				y = dernier[1] - r.top;
			lueur.style.setProperty('--mx', x.toFixed(0) + 'px');
			lueur.style.setProperty('--my', y.toFixed(0) + 'px');
			if (!reduit) {
				const px = ((x / r.width - 0.5) * 12).toFixed(1) + 'px',
					py = ((y / r.height - 0.5) * 8).toFixed(1) + 'px';
				toiles.forEach((t) => {
					t.style.setProperty('--px', px);
					t.style.setProperty('--py', py);
				});
			}
		}
		ecouter(
			el,
			'pointerenter',
			(e) => {
				if (e.pointerType === 'mouse') el.classList.add('survol');
			},
			defaires
		);
		ecouter(
			el,
			'pointermove',
			(e) => {
				if (e.pointerType !== 'mouse') return;
				dernier = [e.clientX, e.clientY];
				if (!prevu) {
					prevu = true;
					requestAnimationFrame(poser);
				}
			},
			defaires
		);
		ecouter(
			el,
			'pointerleave',
			() => {
				el.classList.remove('survol');
				dernier = null;
				toiles.forEach((t) => {
					t.style.setProperty('--px', '0px');
					t.style.setProperty('--py', '0px');
				});
			},
			defaires
		);
	});
	// La facture de conclusion : son étiquette se balance quand on s'en approche.
	const table = racine.querySelector<HTMLElement>('[data-table-conclusion]'),
		etq = racine.querySelector<HTMLElement>('[data-etiquette-recit]');
	if (table && etq && !reduit)
		ecouter(
			table,
			'pointerenter',
			(e) => {
				if (e.pointerType !== 'mouse') return;
				etq.classList.remove('balance');
				void etq.offsetWidth;
				etq.classList.add('balance');
			},
			defaires
		);
	return () => defaires.forEach((d) => d());
}

/**
 * LE REGARD DE PLUME. Partout où Plume est grand, il regarde la souris. Chaque pupille est
 * glissée dans un groupe dont on change l'attribut transform : ses propres animations (lire,
 * regarder ailleurs) continuent dedans. Hors de la fenêtre, il revient au centre.
 */
const PLUMES_QUI_REGARDENT =
	'.plume-vedette svg, .plume-coin svg, .plume-veille svg, .plume-mega svg, .plume-loi svg, .plume-fil svg';

export function demarrerRegardDePlume(racine: HTMLElement): Defaire {
	if (mouvementReduit() || !sourisFine()) return () => {};
	const ns = 'http://www.w3.org/2000/svg';
	const yeux: Array<{ svg: SVGSVGElement; g: SVGGElement[] }> = [];
	const defaires: Defaire[] = [];
	racine.querySelectorAll<SVGSVGElement>(PLUMES_QUI_REGARDENT).forEach((svg) => {
		const groupes: SVGGElement[] = [];
		svg.querySelectorAll<SVGElement>('.plume-pupille, .plume-oeil > g').forEach((pu) => {
			const parent = pu.parentNode;
			if (!parent) return;
			const g = document.createElementNS(ns, 'g');
			parent.insertBefore(g, pu);
			g.appendChild(pu);
			groupes.push(g);
			// Rendre la pupille à sa place : React retrouve l'arbre qu'il a dessiné.
			defaires.push(() => {
				if (g.parentNode) {
					g.parentNode.insertBefore(pu, g);
					g.remove();
				}
			});
		});
		if (groupes.length) yeux.push({ svg, g: groupes });
	});
	let cible: [number, number] | null = null,
		prevu = false;
	function maj() {
		prevu = false;
		yeux.forEach((o) => {
			const r = o.svg.getBoundingClientRect();
			if (!r.width || r.bottom < 0 || r.top > window.innerHeight) return;
			let dx = 0,
				dy = 0;
			if (cible) {
				const vx = cible[0] - (r.left + r.width * 0.5),
					vy = cible[1] - (r.top + r.height * 0.58);
				const d = Math.hypot(vx, vy) || 1,
					k = Math.min(1, d / 240);
				dx = (vx / d) * 1.9 * k;
				dy = (vy / d) * 1.4 * k;
			}
			const t = 'translate(' + dx.toFixed(2) + ' ' + dy.toFixed(2) + ')';
			o.g.forEach((g) => g.setAttribute('transform', t));
		});
	}
	function demander() {
		if (!prevu) {
			prevu = true;
			requestAnimationFrame(maj);
		}
	}
	const auMouvement = (e: PointerEvent) => {
		if (e.pointerType === 'mouse') {
			cible = [e.clientX, e.clientY];
			demander();
		}
	};
	const auDepart = () => {
		cible = null;
		demander();
	};
	window.addEventListener('pointermove', auMouvement, { passive: true });
	window.addEventListener('scroll', demander, { passive: true });
	document.documentElement.addEventListener('pointerleave', auDepart);
	return () => {
		window.removeEventListener('pointermove', auMouvement);
		window.removeEventListener('scroll', demander);
		document.documentElement.removeEventListener('pointerleave', auDepart);
		defaires.forEach((d) => d());
	};
}

/**
 * LA FLUIDITÉ. Une section loin de l'écran met ses animations en boucle en pause (la classe
 * « hors-champ ») ; elle les reprend un peu avant de revenir, pour qu'on ne la voie jamais figée.
 */
export function demarrerHorsChamp(racine: HTMLElement): Defaire {
	if (!('IntersectionObserver' in window)) return () => {};
	const zones = Array.from(
		racine.querySelectorAll<HTMLElement>(':scope > main > section, :scope > .pied')
	);
	const obs = new IntersectionObserver(
		(entrees) => {
			entrees.forEach((e) => e.target.classList.toggle('hors-champ', !e.isIntersecting));
		},
		{ rootMargin: '300px 0px' }
	);
	zones.forEach((z) => obs.observe(z));
	return () => obs.disconnect();
}
