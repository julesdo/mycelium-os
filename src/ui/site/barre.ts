/**
 * LA BARRE DU SITE (transplantée de la maquette V26).
 *
 * Elle lit la section qui passe sous elle et en prend le ton ; elle se resserre en verre dès
 * qu'on défile, suit la lecture d'un filet, et marque la section en cours d'un point.
 *
 * UN SEUL INDICATEUR, POUR UNE SEULE IDÉE : « vous êtes ici, ou vous allez là ». Il repose sur
 * la section qu'on lit, part vers le lien survolé, et revient à la section quand la souris s'en
 * va. Menu « Logiciel » ouvert, il reste sur « Logiciel ». À la première apparition, il naît sur
 * place.
 *
 * Gains de la V26 gardés : rien n'est écrit qui n'a pas changé, et le glisseur ne se remesure
 * que s'il change de lien (lire `offsetLeft` à chaque image du défilement forçait la mise en page).
 */
const TONS: ReadonlyArray<readonly [string, 'sombre' | 'clair']> = [
	['.tete', 'sombre'],
	['.preuves', 'clair'],
	['.loi', 'clair'],
	['.plume-section', 'clair'],
	['.tout', 'clair'],
	['.metiers', 'clair'],
	['.securite', 'sombre'],
	['.tarifs', 'clair'],
	['.blog', 'clair'],
	['.appel', 'clair'],
	['.pied', 'clair']
];

export function demarrerBarre(racine: HTMLElement): () => void {
	const barre = racine.querySelector<HTMLElement>('[data-barre]');
	const progres = barre?.querySelector<HTMLElement>('[data-progres]');
	const capsule = barre?.querySelector<HTMLElement>('[data-capsule]');
	const glisseur = barre?.querySelector<HTMLElement>('[data-glisseur]');
	const boutonMega = barre?.querySelector<HTMLElement>('[data-ouvre-mega]');
	const boutonFeuille = barre?.querySelector<HTMLElement>('[data-ouvre-feuille]');
	const feuille = racine.querySelector<HTMLElement>('[data-feuille]');
	if (!barre || !progres || !capsule || !glisseur || !boutonMega || !boutonFeuille || !feuille)
		return () => {};
	const defaires: Array<() => void> = [];
	const ecouter = <K extends keyof WindowEventMap>(
		cible: Window | Document | HTMLElement,
		type: K,
		f: (e: WindowEventMap[K]) => void,
		options?: AddEventListenerOptions
	) => {
		cible.addEventListener(type, f as EventListener, options);
		defaires.push(() => cible.removeEventListener(type, f as EventListener, options));
	};

	const fin = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
	let actifLien: HTMLElement | null = null;
	let feuilleOuverte = false,
		prevu = false,
		survole: HTMLElement | null = null;
	let minuterieMega: ReturnType<typeof setTimeout> | undefined;
	const sections = TONS.map(([s, ton]) => ({ el: racine.querySelector(s), ton })).filter(
		(s): s is { el: Element; ton: 'sombre' | 'clair' } => s.el !== null
	);
	const espions = Array.from(barre.querySelectorAll<HTMLElement>('[data-spy]'));

	let hautEcrit: string | null = null;
	// `undefined` : rien n'est posé ; `null` : le glisseur est posé sur « aucun lien ».
	let lienPlace: HTMLElement | null | undefined;
	ecouter(window, 'resize', () => {
		lienPlace = undefined;
	});
	document.fonts?.ready.then(() => {
		lienPlace = undefined;
		demander();
	});
	function ecrireSiChange(el: HTMLElement, a: string, v: string) {
		if (el.getAttribute(a) !== v) el.setAttribute(a, v);
	}
	function maj() {
		prevu = false;
		if (!barre || !progres) return;
		const y = barre.getBoundingClientRect().bottom - 6;
		let ton: 'sombre' | 'clair' = 'sombre';
		for (const s of sections) {
			const r = s.el.getBoundingClientRect();
			if (r.top <= y && r.bottom > y) {
				ton = s.ton;
				break;
			}
		}
		ecrireSiChange(barre, 'data-ton', feuilleOuverte ? 'clair' : ton);
		const haut = feuilleOuverte || ton === 'clair' ? '#f5f5f9' : '#060a1c';
		if (haut !== hautEcrit) {
			hautEcrit = haut;
			document.documentElement.style.setProperty('--haut', haut);
		}
		ecrireSiChange(barre, 'data-defile', window.scrollY > 24 && !feuilleOuverte ? 'oui' : 'non');
		const h = document.documentElement.scrollHeight - window.innerHeight;
		progres.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, window.scrollY / h) : 0) + ')';
		const milieu = window.innerHeight * 0.4;
		let courant: HTMLElement | null = null;
		espions.forEach((l) => {
			const s = racine.querySelector('#' + (l.getAttribute('data-spy') ?? ''));
			if (!s) return;
			const r = s.getBoundingClientRect();
			if (r.top <= milieu && r.bottom > milieu) courant = l;
		});
		espions.forEach((l) => {
			l.classList.toggle('actif', l === courant);
			if (l === courant) {
				if (l.getAttribute('aria-current') !== 'location')
					l.setAttribute('aria-current', 'location');
			} else if (l.hasAttribute('aria-current')) l.removeAttribute('aria-current');
		});
		actifLien = courant;
		placer(cible());
	}
	function demander() {
		if (!prevu) {
			prevu = true;
			requestAnimationFrame(maj);
		}
	}
	ecouter(window, 'scroll', demander, { passive: true });
	ecouter(window, 'resize', demander);

	function cible(): HTMLElement | null {
		if (barre?.classList.contains('mega-ouvert')) return boutonMega ?? null;
		return survole || actifLien;
	}
	function placer(lien: HTMLElement | null) {
		if (!capsule || !glisseur) return;
		if (lien === lienPlace) return;
		lienPlace = lien;
		capsule
			.querySelectorAll('.lien-nav')
			.forEach((l) => l.classList.toggle('sous-glisseur', l === lien));
		if (!lien) {
			glisseur.style.opacity = '0';
			return;
		}
		if (glisseur.style.opacity !== '1') {
			glisseur.style.transition = 'none';
			glisseur.style.width = lien.offsetWidth + 'px';
			glisseur.style.transform = 'translateX(' + lien.offsetLeft + 'px)';
			void glisseur.offsetWidth;
			glisseur.style.transition = '';
		}
		glisseur.style.width = lien.offsetWidth + 'px';
		glisseur.style.transform = 'translateX(' + lien.offsetLeft + 'px)';
		glisseur.style.opacity = '1';
	}
	function ouvrirMega(o: boolean) {
		barre?.classList.toggle('mega-ouvert', o);
		boutonMega?.setAttribute('aria-expanded', o ? 'true' : 'false');
		placer(cible());
	}
	if (fin) {
		capsule.querySelectorAll<HTMLElement>('.lien-nav').forEach((l) => {
			ecouter(l, 'mouseenter', () => {
				survole = l;
				clearTimeout(minuterieMega);
				if (l === boutonMega) minuterieMega = setTimeout(() => ouvrirMega(true), 90);
				else ouvrirMega(false);
				placer(l);
			});
		});
		ecouter(capsule, 'mouseleave', () => {
			survole = null;
			placer(cible());
		});
		ecouter(barre, 'mouseleave', () => {
			clearTimeout(minuterieMega);
			minuterieMega = setTimeout(() => ouvrirMega(false), 180);
		});
		ecouter(barre, 'mouseenter', () => {
			if (barre.classList.contains('mega-ouvert')) clearTimeout(minuterieMega);
		});
	}
	ecouter(boutonMega, 'click', () => {
		clearTimeout(minuterieMega);
		ouvrirMega(boutonMega.getAttribute('aria-expanded') !== 'true');
	});
	barre
		.querySelectorAll<HTMLElement>('.mega a')
		.forEach((a) => ecouter(a, 'click', () => ouvrirMega(false)));
	ecouter(document, 'click', (e) => {
		if (!(e.target instanceof Node) || !barre.contains(e.target)) ouvrirMega(false);
	});

	// Le menu au téléphone.
	function basculer(o: boolean) {
		if (!feuille || !boutonFeuille) return;
		feuilleOuverte = o;
		feuille.classList.toggle('ouverte', o);
		feuille.inert = !o;
		document.documentElement.classList.toggle('menu-ouvert', o);
		boutonFeuille.setAttribute('aria-expanded', o ? 'true' : 'false');
		boutonFeuille.setAttribute('aria-label', o ? 'Fermer le menu' : 'Ouvrir le menu');
		maj();
	}
	feuille.inert = true;
	ecouter(boutonFeuille, 'click', () => basculer(!feuilleOuverte));
	feuille
		.querySelectorAll<HTMLElement>('a')
		.forEach((a) => ecouter(a, 'click', () => basculer(false)));
	ecouter(document, 'keydown', (e) => {
		if (e.key !== 'Escape') return;
		if (feuilleOuverte) basculer(false);
		if (barre.classList.contains('mega-ouvert')) {
			ouvrirMega(false);
			boutonMega.focus();
		}
	});
	maj();

	return () => {
		clearTimeout(minuterieMega);
		defaires.forEach((d) => d());
		// La page quittée ne laisse rien sur le document : ni la couleur du haut, ni le menu ouvert.
		document.documentElement.style.removeProperty('--haut');
		document.documentElement.classList.remove('menu-ouvert');
	};
}
