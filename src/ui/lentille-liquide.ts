import {
	useLayoutEffect,
	useRef,
	useState,
	type MouseEvent as EvenementSouris,
	type PointerEvent as EvenementPointeur,
	type RefObject
} from 'react';

/**
 * LA LENTILLE LIQUIDE DE LA BARRE DU BAS — le bloc de verre qui se déforme en
 * glissant d'un onglet à l'autre, et qu'on peut tenir et faire glisser du doigt
 * (14/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI : « PLUS ORGANIQUE, AVEC UN EFFET DE DÉFORMATION AU GLISSER »
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le bloc glissait d'une pièce, sur une courbe de transition : un objet rigide.
 * Relevé (Mobbin, 14/10) : la barre d'onglets d'iOS 26, que reprennent Apple Store,
 * Apple Fitness, Waymo, Substack, Quizlet ou eBay, et celle de Telegram. Leur
 * sélection se comporte comme une goutte :
 *
 *   · AU TOUCHER, elle s'étire vers l'onglet visé — le bord de devant part vite, le
 *     bord de derrière suit plus lentement —, s'amincit en s'étirant, puis se
 *     ramasse sur l'onglet avec un léger rebond ;
 *   · TENUE, elle se soulève d'un rien sous le doigt ;
 *   · GLISSÉE, elle devient une lentille plus grande que la barre, suit le doigt en
 *     s'étirant selon sa vitesse, éclaire l'onglet qu'elle survole (un petit coup
 *     de vibreur à chaque onglet franchi, là où le téléphone le permet), et se pose
 *     au lâcher sur l'onglet le plus proche, qui s'ouvre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ DEUX RESSORTS, UN PAR BORD, ET C'EST TOUTE LA DÉFORMATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La lentille n'a pas UNE position mais DEUX bords, chacun tiré par son ressort
 * vers sa cible. Le bord qui fait face au mouvement a un ressort raide, celui de
 * derrière un ressort souple : l'écart entre les deux EST l'étirement, et il
 * naît de la physique au lieu d'être dessiné image par image. Il en va de même au
 * doigt : plus il va vite, plus le bord de derrière traîne. Un troisième ressort
 * soulève la lentille. Tout se calcule hors de React, image par image, et s'écrit
 * directement sur l'élément : rien ne se redessine dans l'arbre pendant le
 * mouvement.
 *
 * ⚠️ LE RANG RESTE LA VÉRITÉ, ET LE CSS LA POSITION DE DÉPART. Avant que le
 * JavaScript ne mesure la barre (au rendu serveur, au premier affichage), la
 * classe `lentille-barre` place le bloc par le rang, comme avant. Ensuite, la
 * largeur des onglets est mesurée (ils sont de parts égales, voir
 * `REMBOURRAGE_PILULE`) et les ressorts prennent la main.
 *
 * ⚠️ AUCUN `setState` DANS UN EFFET : les effets ne font que synchroniser
 * l'élément avec le rang. Le seul état React — l'onglet survolé pendant un
 * glisser — s'écrit dans les gestionnaires du pointeur.
 *
 * ⚠️ MOUVEMENT RÉDUIT : ni étirement, ni rebond, ni soulèvement. La lentille va
 * droit à sa place ; on peut toujours la faire glisser.
 */

/** Un ressort amorti, un pas d'Euler semi-implicite : stable aux pas de 1/30 s. */
export function pasDeRessort(
	x: number,
	v: number,
	cible: number,
	ressort: { readonly raideur: number; readonly amortissement: number },
	dt: number
): { readonly x: number; readonly v: number } {
	const a = ressort.raideur * (cible - x) - ressort.amortissement * v;
	const vitesse = v + a * dt;
	return { x: x + vitesse * dt, v: vitesse };
}

/**
 * LA HAUTEUR D'UNE GOUTTE QUI SE DÉFORME — à peu près à volume constant : étirée,
 * elle s'amincit (bornée, sinon elle deviendrait un fil) ; ramassée à l'arrivée,
 * elle gagne un rien de hauteur.
 */
export function amincissement(largeur: number, base: number): number {
	if (base <= 0) return 1;
	const rapport = largeur / base;
	if (rapport < 1) return 1 + Math.min(0.08, (1 - rapport) * 0.6);
	return 1 - Math.min(0.24, (rapport - 1) * 0.3);
}

/**
 * LES RÉGLAGES, SIMULÉS AVANT D'ÊTRE POSÉS (14/10/2026). Un premier jeu étirait la
 * goutte à 2,3 fois sa largeur sur un saut de trois onglets, sans rebond : un fil
 * mou. Celui-ci, à 60 images par seconde : étirée de 1,33, 1,66 puis 1,8 fois
 * (plafond) pour un, deux et trois onglets, un rebond de 2 à 7 px à l'arrivée,
 * posée en 0,33 s.
 */
/** Le bord qui fait face au mouvement : raide et un peu vif, il part vite et rebondit d'un rien. */
export const RESSORT_DEVANT = { raideur: 680, amortissement: 32 } as const;
/** Le bord de derrière : souple, il traîne, et c'est ce qui étire la goutte. */
export const RESSORT_DERRIERE = { raideur: 300, amortissement: 24 } as const;
/** Au-delà, la goutte deviendrait un fil : le bord de derrière est tiré. */
export const ETIREMENT_MAX = 1.8;
const RESSORT_LEVEE = { raideur: 520, amortissement: 26 } as const;

/** Sous le doigt, posée : elle se soulève d'un rien. */
const LEVEE_TENUE = 1.06;
/** Glissée : une lentille plus grande que la barre, comme la bulle d'iOS 26. */
const LEVEE_GLISSEE = 1.18;
/** Ce que le doigt doit parcourir, de côté, avant que la lentille le suive. */
const SEUIL_DE_GLISSE = 8;
/** Le rembourrage de la pilule (`p-1.5`) : la piste commence là. */
const REMBOURRAGE = 6;

interface Moteur {
	/** Viser un onglet ; `instantane` pose la lentille sans mouvement. */
	viser(rang: number, instantane: boolean): void;
	/** Le doigt la tient, ou la glisse : le centre visé, en pixels dans la piste. */
	suivre(centre: number): number;
	lever(niveau: number): void;
	marquerLevee(levee: boolean): void;
	/** L'onglet sous un point de l'écran. */
	rangSous(clientX: number): number;
	xDansLaPiste(clientX: number): number;
	remesurer(): void;
	detruire(): void;
}

function creerMoteur(nav: HTMLElement, lentille: HTMLElement, nombre: number): Moteur {
	const reduit =
		typeof window.matchMedia === 'function' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	let base = 0;
	let gauche = 0;
	let droite = 0;
	let vGauche = 0;
	let vDroite = 0;
	let levee = 1;
	let vLevee = 0;
	let cibleGauche = 0;
	let cibleDroite = 0;
	let cibleLevee = 1;
	let posee = false;
	let image = 0;
	let derniere = 0;
	let rangVise = 0;

	function mesurer(): boolean {
		const largeur = nav.clientWidth;
		if (largeur <= 0) return false;
		base = (largeur - 2 * REMBOURRAGE) / nombre;
		return base > 0;
	}

	function dessiner() {
		const largeur = Math.max(0, droite - gauche);
		lentille.style.width = `${largeur}px`;
		lentille.style.transform = `translate3d(${gauche}px, 0, 0) scale(${levee}, ${levee * amincissement(largeur, base)})`;
	}

	function poser() {
		gauche = cibleGauche;
		droite = cibleDroite;
		vGauche = 0;
		vDroite = 0;
		levee = cibleLevee;
		vLevee = 0;
		posee = true;
		dessiner();
	}

	function auRepos(): boolean {
		return (
			Math.abs(gauche - cibleGauche) < 0.3 &&
			Math.abs(droite - cibleDroite) < 0.3 &&
			Math.abs(vGauche) < 4 &&
			Math.abs(vDroite) < 4 &&
			Math.abs(levee - cibleLevee) < 0.002 &&
			Math.abs(vLevee) < 0.02
		);
	}

	function boucle(t: number) {
		const dt = Math.min(1 / 30, Math.max(0, (t - derniere) / 1000));
		derniere = t;
		// Le bord qui fait face au mouvement est raide ; l'autre traîne.
		const sens = (cibleGauche + cibleDroite) / 2 - (gauche + droite) / 2;
		const ressortGauche = sens > 0.5 ? RESSORT_DERRIERE : RESSORT_DEVANT;
		const ressortDroit = sens < -0.5 ? RESSORT_DERRIERE : RESSORT_DEVANT;
		const g = pasDeRessort(gauche, vGauche, cibleGauche, ressortGauche, dt);
		const d = pasDeRessort(droite, vDroite, cibleDroite, ressortDroit, dt);
		const l = pasDeRessort(levee, vLevee, cibleLevee, RESSORT_LEVEE, dt);
		gauche = g.x;
		vGauche = g.v;
		droite = d.x;
		vDroite = d.v;
		levee = l.x;
		vLevee = l.v;
		// Le plafond de l'étirement : le bord de derrière est entraîné par celui de devant.
		const plafond = base * ETIREMENT_MAX;
		if (droite - gauche > plafond) {
			if (sens > 0) {
				gauche = droite - plafond;
				vGauche = Math.max(vGauche, vDroite * 0.9);
			} else {
				droite = gauche + plafond;
				vDroite = Math.min(vDroite, vGauche * 0.9);
			}
		}
		if (auRepos()) {
			poser();
			image = 0;
			return;
		}
		dessiner();
		image = requestAnimationFrame(boucle);
	}

	function lancer() {
		if (reduit) {
			poser();
			return;
		}
		if (image !== 0) return;
		derniere = performance.now();
		image = requestAnimationFrame(boucle);
	}

	function xDansLaPiste(clientX: number): number {
		return clientX - nav.getBoundingClientRect().left - REMBOURRAGE;
	}

	function fente(rang: number) {
		cibleGauche = rang * base;
		cibleDroite = (rang + 1) * base;
	}

	return {
		viser(rang, instantane) {
			rangVise = rang;
			if (!mesurer()) return;
			fente(rang);
			if (instantane || !posee) poser();
			else lancer();
		},
		suivre(centre) {
			if (base <= 0 && !mesurer()) return rangVise;
			const borne = Math.min(nombre * base - base / 2, Math.max(base / 2, centre));
			cibleGauche = borne - base / 2;
			cibleDroite = borne + base / 2;
			if (!posee) poser();
			else lancer();
			return Math.min(nombre - 1, Math.max(0, Math.floor(borne / base)));
		},
		lever(niveau) {
			cibleLevee = reduit ? 1 : niveau;
			if (posee) lancer();
		},
		marquerLevee(estLevee) {
			lentille.classList.toggle('lentille-levee', estLevee);
		},
		rangSous(clientX) {
			if (base <= 0 && !mesurer()) return -1;
			return Math.min(nombre - 1, Math.max(0, Math.floor(xDansLaPiste(clientX) / base)));
		},
		xDansLaPiste,
		remesurer() {
			if (!mesurer() || image !== 0) return;
			fente(rangVise);
			poser();
		},
		detruire() {
			if (image !== 0) cancelAnimationFrame(image);
			image = 0;
			lentille.style.removeProperty('width');
			lentille.style.removeProperty('transform');
		}
	};
}

/** Un petit coup de vibreur, là où le téléphone le permet (Android ; iOS l'ignore). */
function vibrer(duree: number) {
	if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
		try {
			navigator.vibrate(duree);
		} catch {
			// Refusé hors d'un geste : rien à faire.
		}
	}
}

/**
 * LA LENTILLE, BRANCHÉE SUR LA BARRE : les gestes du pointeur à poser sur la pilule,
 * et l'onglet survolé pendant un glisser (pour l'éclairer).
 *
 * `onChoisir` reçoit l'onglet sur lequel on a lâché la lentille : l'appelant
 * l'ouvre (en activant son vrai lien, pour que la navigation reste celle d'un
 * toucher).
 */
export function useLentilleLiquide({
	nav,
	lentille,
	rang,
	nombre,
	onChoisir
}: {
	readonly nav: RefObject<HTMLElement | null>;
	readonly lentille: RefObject<HTMLElement | null>;
	readonly rang: number;
	readonly nombre: number;
	readonly onChoisir: (rang: number) => void;
}) {
	const [survole, setSurvole] = useState<number | null>(null);
	const moteur = useRef<Moteur | null>(null);
	const survoleCourant = useRef<number | null>(null);
	const geste = useRef<{
		readonly id: number;
		readonly x0: number;
		readonly y0: number;
		glisse: boolean;
	} | null>(null);
	const avalerLeClic = useRef(false);
	const rangPrecedent = useRef(rang);

	// Le moteur naît avec la barre, et se remesure quand elle change de largeur.
	useLayoutEffect(() => {
		const elementNav = nav.current;
		const elementLentille = lentille.current;
		if (elementNav === null || elementLentille === null) return;
		const m = creerMoteur(elementNav, elementLentille, nombre);
		moteur.current = m;
		m.viser(Math.max(0, rangPrecedent.current), true);
		const observateur =
			typeof ResizeObserver === 'function' ? new ResizeObserver(() => m.remesurer()) : null;
		observateur?.observe(elementNav);
		return () => {
			observateur?.disconnect();
			m.detruire();
			moteur.current = null;
		};
	}, [nav, lentille, nombre]);

	// Le rang change (un toucher, une navigation) : la goutte s'étire jusqu'à lui.
	useLayoutEffect(() => {
		const m = moteur.current;
		const avant = rangPrecedent.current;
		rangPrecedent.current = rang;
		if (m === null || rang < 0 || geste.current?.glisse === true) return;
		// Revenue d'une page sans onglet : elle réapparaît en place, sans traverser la barre.
		m.viser(rang, avant < 0);
	}, [rang]);

	function relacher() {
		geste.current = null;
		const m = moteur.current;
		m?.lever(1);
		m?.marquerLevee(false);
	}

	return {
		survole,
		gestes: {
			onPointerDown(evenement: EvenementPointeur<HTMLElement>) {
				if (evenement.button !== 0 || !evenement.isPrimary) return;
				geste.current = {
					id: evenement.pointerId,
					x0: evenement.clientX,
					y0: evenement.clientY,
					glisse: false
				};
				// Le doigt posé sur l'onglet actif tient la lentille : elle se soulève d'un rien.
				const m = moteur.current;
				if (m !== null && rang >= 0 && m.rangSous(evenement.clientX) === rang) {
					m.lever(LEVEE_TENUE);
				}
			},
			onPointerMove(evenement: EvenementPointeur<HTMLElement>) {
				const enCours = geste.current;
				const m = moteur.current;
				if (enCours === null || m === null || enCours.id !== evenement.pointerId) return;
				if (!enCours.glisse) {
					const dx = evenement.clientX - enCours.x0;
					const dy = evenement.clientY - enCours.y0;
					if (Math.abs(dx) < SEUIL_DE_GLISSE || Math.abs(dx) < Math.abs(dy)) return;
					enCours.glisse = true;
					// Le doigt peut sortir de la pilule sans lâcher la lentille. Une capture
					// refusée (pointeur déjà relâché) ne doit pas faire échouer le geste.
					try {
						evenement.currentTarget.setPointerCapture(evenement.pointerId);
					} catch {
						// Le geste continue sans capture.
					}
					m.lever(LEVEE_GLISSEE);
					m.marquerLevee(true);
				}
				const sous = m.suivre(m.xDansLaPiste(evenement.clientX));
				if (sous !== survoleCourant.current) {
					// Un onglet franchi : un petit coup, comme un cran.
					if (survoleCourant.current !== null) vibrer(6);
					survoleCourant.current = sous;
					setSurvole(sous);
				}
			},
			onPointerUp(evenement: EvenementPointeur<HTMLElement>) {
				const enCours = geste.current;
				if (enCours === null || enCours.id !== evenement.pointerId) return;
				const glissait = enCours.glisse;
				relacher();
				if (!glissait) return; // Un toucher : le lien de l'onglet fait le reste.
				const choisi = survoleCourant.current ?? rang;
				survoleCourant.current = null;
				setSurvole(null);
				if (choisi >= 0) moteur.current?.viser(choisi, false);
				if (choisi >= 0 && choisi !== rang) {
					vibrer(10);
					onChoisir(choisi);
				}
				// Le clic natif qui suit le lâcher n'ouvre rien de plus.
				avalerLeClic.current = true;
				window.setTimeout(() => {
					avalerLeClic.current = false;
				}, 400);
			},
			onPointerCancel(evenement: EvenementPointeur<HTMLElement>) {
				if (geste.current?.id !== evenement.pointerId) return;
				relacher();
				survoleCourant.current = null;
				setSurvole(null);
				if (rang >= 0) moteur.current?.viser(rang, false);
			},
			onClickCapture(evenement: EvenementSouris<HTMLElement>) {
				if (!avalerLeClic.current) return;
				avalerLeClic.current = false;
				evenement.preventDefault();
				evenement.stopPropagation();
			}
		}
	};
}
