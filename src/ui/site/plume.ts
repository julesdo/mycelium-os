import { mouvementReduit } from './gestes';

/**
 * LES QUATRE CAPACITÉS DE PLUME, ET LEURS SCÈNES VIVANTES (transplantées de la maquette V26).
 *
 * Une horloge propre à la section fait avancer la scène en cours et la barre de sa capacité ;
 * elle s'arrête quand la section sort de l'écran ou en pause. Sous la souris, la scène en cours
 * va au bout mais la suivante attend : on lit sans que la capacité change sous les yeux. Le
 * premier vrai geste sur la plaque rend la main ; un toucher sur une capacité rejoue sa scène et
 * relance la visite.
 *
 * Les textes et les chiffres arrivent par `scenario` (`marketing/site/plume-demo.ts`).
 */
export type CleReponse = 'promesse' | 'echeancier' | 'conteste';
/** Une étape de la frise : sa date, ce qui s'y passe, et si les relances s'y taisent. */
export type PasDeFrise = readonly [string, string, boolean];
export interface ReponseDuClient {
	readonly message: string;
	readonly icone: 'temps' | 'papiers';
	readonly titre: string;
	readonly sous: string;
	readonly frise: readonly [PasDeFrise, PasDeFrise, PasDeFrise];
}
export interface ScenarioPlume {
	readonly lettre: string;
	readonly heureDEnvoi: string;
	/** Le délai pour retenir, en secondes. */
	readonly delai: number;
	readonly reponses: Readonly<Record<CleReponse, ReponseDuClient>>;
	readonly question: string;
	readonly reponse: string;
	readonly fin: string;
}
type Mode = 'joue' | 'survol' | 'pause' | 'main' | 'revoir' | 'pret';
type Humeur = '' | 'plume-travaille' | 'plume-fete-anim' | 'plume-salue';

const ARRET = Symbol('arret');
const DUREES = [10100, 11900, 13400, 10600];
const LIBELLE: Readonly<Record<Mode, readonly [string, string]>> = {
	joue: ['Visite guidée', 'Mettre la visite en pause'],
	survol: ['À vous : tout se touche', 'Mettre la visite en pause'],
	pause: ['Reprendre la visite', 'Reprendre la visite'],
	main: ['Vous avez la main', 'Relancer la visite'],
	revoir: ['Relancer la visite', 'Relancer la visite'],
	pret: ['Lancer la visite', 'Lancer la visite guidée']
};
const ICONES = {
	papiers: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/></svg>',
	temps: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>'
};

export function demarrerPlume(racine: HTMLElement, s: ScenarioPlume): () => void {
	const grilleTrouvee = racine.querySelector<HTMLElement>('.plume-grille:not(.blog-grille)');
	const plaqueTrouvee = grilleTrouvee?.querySelector<HTMLElement>('.plaque');
	if (!grilleTrouvee || !plaqueTrouvee) return () => {};
	const grille: HTMLElement = grilleTrouvee,
		plaque: HTMLElement = plaqueTrouvee;
	const reduit = mouvementReduit();
	function q<T extends Element = HTMLElement>(v: ParentNode, sel: string): T {
		const el = v.querySelector<T>(sel);
		if (!el) throw new Error(`La section Plume n'a pas de ${sel}`);
		return el;
	}
	const qq = <T extends Element = HTMLElement>(v: ParentNode, sel: string): T[] =>
		Array.from(v.querySelectorAll<T>(sel));
	const boutons = qq(grille, '.capacite');
	const vues = qq(plaque, '.vue');
	const coin = plaque.querySelector<SVGElement>('.plume-coin svg');
	const doigt = q(plaque, '[data-p-doigt]'),
		pastille = q(plaque, '[data-p-visite]'),
		pastilleTexte = q(plaque, '[data-p-visite-texte]'),
		arc = q<SVGElement>(plaque, '[data-p-arc]');
	let horloge = 0,
		attentes: { t: number; ok: () => void; non: (e: unknown) => void }[] = [],
		jeton = 0,
		actuelle = 0,
		demarree = false;
	let visite: Mode = reduit ? 'pret' : 'joue',
		hors = true,
		survol = false,
		cache = document.hidden;

	// Tout ce qui doit s'arrêter quand on quitte la page.
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
	const plus = (f: () => void, ms: number) => setTimeout(() => !arrete && f(), ms);

	// Plume, dans le coin de la plaque, fait la tête de ce qui se passe.
	let humeurT: ReturnType<typeof setTimeout> | undefined;
	function humeur(h: Humeur, ms?: number) {
		if (!coin) return;
		clearTimeout(humeurT);
		coin.classList.remove('plume-travaille', 'plume-fete-anim', 'plume-salue');
		if (h) coin.classList.add(h);
		if (ms) humeurT = plus(() => humeur('plume-travaille'), ms);
	}

	// L'horloge et les attentes de la visite.
	function peindreVisite() {
		const m: Mode = visite === 'joue' && survol ? 'survol' : visite;
		if (pastille.dataset.mode === m) return;
		pastille.dataset.mode = m;
		pastilleTexte.textContent = LIBELLE[m][0];
		pastille.setAttribute('aria-label', LIBELLE[m][1]);
	}
	const figee = () => hors || cache || visite === 'pause';
	async function libre() {
		while (visite === 'joue' && survol) await attendre(200);
	}
	function avancer() {
		const a = Math.min(1, horloge / (DUREES[actuelle] ?? 1));
		boutons[actuelle]?.style.setProperty('--avance', a.toFixed(4));
		arc.style.strokeDashoffset = (100 - a * 100).toFixed(1);
	}
	let avant = performance.now();
	const tic = setInterval(() => {
		const t = performance.now(),
			dt = Math.min(250, t - avant);
		avant = t;
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
		if (visite === 'joue') avancer();
		if (actuelle === 1) decompte();
	}, 50);
	defaires.push(() => clearInterval(tic));
	function attendre(ms: number): Promise<void> {
		const j = jeton;
		if (visite === 'pret') return Promise.resolve();
		return new Promise((ok, non) => {
			attentes.push({
				t: horloge + ms,
				ok: () => (j === jeton ? ok() : non(ARRET)),
				non
			});
		});
	}
	function arreter() {
		jeton++;
		attentes.splice(0).forEach((a) => a.non(ARRET));
		doigt.classList.remove('vu', 'appuie', 'onde');
	}

	// Le doigt fantôme, aux coordonnées de la plaque.
	function onde() {
		doigt.classList.remove('onde');
		void doigt.offsetWidth;
		doigt.classList.add('onde');
	}
	async function toucher(el: HTMLElement | null) {
		if (!el) return;
		if (visite === 'pret') {
			el.click();
			return;
		}
		const rp = plaque.getBoundingClientRect(),
			r = el.getBoundingClientRect();
		doigt.style.translate =
			(r.left + r.width / 2 - rp.left).toFixed(1) +
			'px ' +
			(r.top + r.height / 2 - rp.top).toFixed(1) +
			'px';
		doigt.classList.add('vu');
		await attendre(300);
		doigt.classList.add('appuie');
		await attendre(140);
		doigt.classList.remove('appuie');
		onde();
		el.click();
		await attendre(260);
		doigt.classList.remove('vu');
	}
	async function taper(el: HTMLElement, texte: string, ms: number) {
		const mots = texte.split(' ');
		for (let i = 1; i <= mots.length; i++) {
			el.textContent = mots.slice(0, i).join(' ');
			if (visite !== 'pret') await attendre(ms);
		}
	}
	function cocher(li: HTMLElement[], i: number) {
		const avant = li[i - 1];
		if (avant) {
			avant.classList.remove('encours');
			avant.classList.add('fait');
		}
		li[i]?.classList.add('encours');
	}
	const vue = (n: number) => {
		const v = vues[n];
		if (!v) throw new Error(`La section Plume n'a pas de scène ${n}`);
		return v;
	};

	// 0. Il ouvre vos dossiers : le dépôt se relit, deux dossiers attendent d'être démarrés.
	const v0 = vue(0),
		pilote = q(v0, '.p-pilote'),
		etapes0 = qq(v0, '[data-etapes] li'),
		part = q(v0, '[data-part]');
	const SOUS0: Record<string, string> = {};
	qq(v0, '[data-ligne]').forEach((l) => {
		const cle = l.dataset.ligne ?? '';
		const sous = q(l, '[data-sous]');
		SOUS0[cle] = sous.textContent ?? '';
		ecouter(q(l, '[data-demarrer]'), 'click', () => {
			l.classList.add('demarre');
			sous.textContent = `Démarré · premier rappel ${l.dataset.quand ?? ''} ${s.heureDEnvoi}`;
			humeur('plume-fete-anim', 1500);
		});
	});
	function preparer0() {
		etapes0.forEach((li) => (li.className = ''));
		part.classList.remove('ouverte');
		pilote.classList.remove('repos');
		qq(v0, '[data-ligne]').forEach((l) => {
			l.classList.remove('demarre');
			q(l, '[data-sous]').textContent = SOUS0[l.dataset.ligne ?? ''] ?? '';
		});
	}
	function fini0() {
		etapes0.forEach((li) => (li.className = 'fait'));
		part.classList.add('ouverte');
		pilote.classList.add('repos');
	}
	async function scene0() {
		humeur('plume-travaille');
		for (let i = 0; i <= etapes0.length; i++) {
			cocher(etapes0, i);
			if (i < etapes0.length) await attendre(780);
		}
		fini0();
		humeur('');
		await attendre(1500);
		await toucher(v0.querySelector('[data-ligne="durand"] [data-demarrer]'));
		await attendre(1500);
		await toucher(v0.querySelector('[data-ligne="rousseau"] [data-demarrer]'));
		await attendre(2200);
	}

	// 1. Il relance à votre nom : Plume écrit la lettre, elle part dans l'heure, on peut la retenir.
	const v1 = vue(1),
		corps = q(v1, '[data-corps]'),
		ecrit = q(v1, '[data-ecrit]'),
		envoi = q(v1, '[data-envoi]');
	const envoiTitre = q(v1, '[data-envoi-titre]'),
		envoiSous = q(v1, '[data-envoi-sous]'),
		retenirBtn = q(v1, '[data-retenir]');
	const PART = `Part à ${s.heureDEnvoi}`;
	const mmss = (n: number) => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
	let departA = 0;
	function decompte() {
		if (!envoi.classList.contains('ouverte') || envoi.classList.contains('retenue')) return;
		const n = Math.max(0, s.delai - 1 - Math.floor((horloge - departA) / 1000));
		envoiSous.textContent = 'dans ' + mmss(n) + ' · à votre nom';
	}
	ecouter(retenirBtn, 'click', () => {
		const r = !envoi.classList.contains('retenue');
		envoi.classList.toggle('retenue', r);
		envoiTitre.textContent = r ? 'Retenue' : PART;
		retenirBtn.textContent = r ? 'Annuler' : 'Retenir';
		if (r) envoiSous.textContent = 'Elle ne partira pas';
		else decompte();
		humeur(r ? '' : 'plume-travaille');
	});
	function preparer1() {
		corps.textContent = '';
		ecrit.classList.remove('vu');
		envoi.classList.remove('ouverte', 'retenue');
		envoiTitre.textContent = PART;
		retenirBtn.textContent = 'Retenir';
		envoiSous.textContent = 'dans ' + mmss(s.delai - 1) + ' · à votre nom';
	}
	async function scene1() {
		humeur('plume-travaille');
		ecrit.classList.add('vu');
		await attendre(500);
		await taper(corps, s.lettre, 55);
		ecrit.classList.remove('vu');
		await attendre(500);
		departA = horloge;
		envoi.classList.add('ouverte');
		decompte();
		await attendre(2600);
		await toucher(retenirBtn);
		await attendre(2200);
		await toucher(retenirBtn);
		await attendre(2000);
	}

	// 2. Il écoute votre client : la réponse arrive, Plume la comprend et le plan s'ajuste.
	const v2 = vue(2),
		message = q(v2, '[data-message]'),
		compris = q(v2, '[data-compris]'),
		frise = q(v2, '[data-frise]');
	const comprisIc = q(v2, '[data-compris-ic]'),
		comprisTitre = q(v2, '[data-compris-titre]'),
		comprisSous = q(v2, '[data-compris-sous]');
	const choix = qq<HTMLButtonElement>(v2, '[data-reponse]');
	let lecture = 0;
	function repondre(cle: CleReponse, anime: boolean) {
		const r = s.reponses[cle],
			g = ++lecture;
		choix.forEach((b) =>
			b.setAttribute('aria-pressed', b.dataset.reponse === cle ? 'true' : 'false')
		);
		function poser() {
			message.textContent = r.message;
			comprisIc.className = 'vignette v-' + r.icone;
			comprisIc.innerHTML = ICONES[r.icone];
			comprisTitre.textContent = r.titre;
			comprisSous.textContent = r.sous;
			qq(frise, 'li').forEach((li, i) => {
				const pas = r.frise[i];
				if (!pas) return;
				if (li.firstChild) li.firstChild.textContent = pas[0];
				if (li.lastChild) li.lastChild.textContent = pas[1];
				li.classList.toggle('calme', pas[2]);
			});
		}
		if (!anime || reduit) {
			poser();
			compris.classList.remove('lit');
			frise.classList.remove('cache');
			message.classList.remove('change');
			return;
		}
		message.classList.add('change');
		compris.classList.add('lit');
		frise.classList.add('cache');
		plus(() => {
			if (g !== lecture) return;
			message.textContent = r.message;
			message.classList.remove('change');
			humeur('plume-salue');
		}, 240);
		plus(() => {
			if (g !== lecture) return;
			poser();
			compris.classList.remove('lit');
			humeur('');
		}, 1150);
		plus(() => {
			if (g !== lecture) return;
			frise.classList.remove('cache');
		}, 1350);
	}
	choix.forEach((b) =>
		ecouter(b, 'click', () => repondre((b.dataset.reponse ?? 'promesse') as CleReponse, true))
	);
	function preparer2() {
		lecture++;
		message.classList.add('change');
		compris.classList.add('lit');
		frise.classList.add('cache');
		choix.forEach((b) =>
			b.setAttribute('aria-pressed', b.dataset.reponse === 'promesse' ? 'true' : 'false')
		);
	}
	async function scene2() {
		await attendre(300);
		repondre('promesse', true);
		await attendre(5200);
		await toucher(v2.querySelector('[data-reponse="echeancier"]'));
		await attendre(4400);
		await toucher(v2.querySelector('[data-reponse="conteste"]'));
		await attendre(2000);
	}

	// 3. Il répond, et il agit : une phrase du gérant devient un geste, qu'il confirme.
	const v3 = vue(3),
		question = q(v3, '[data-question]'),
		reponse = q(v3, '[data-reponse-plume]'),
		texte = q(v3, '[data-texte]'),
		geste = q(v3, '[data-geste]'),
		fin = q(v3, '[data-fin]');
	const etapes3 = qq(v3, '[data-etapes-geste] li');
	let conversation = 0;
	ecouter(q(v3, '[data-confirmer]'), 'click', () => {
		const g = conversation;
		let i = 0;
		geste.classList.add('confirme');
		cocher(etapes3, 0);
		humeur('plume-travaille');
		const pas = () => {
			plus(() => {
				if (g !== conversation) return;
				cocher(etapes3, ++i);
				if (i < etapes3.length) {
					pas();
					return;
				}
				fin.textContent = s.fin;
				fin.classList.add('vu');
				humeur('plume-fete-anim', 1500);
			}, 650);
		};
		pas();
	});
	ecouter(q(v3, '[data-annuler]'), 'click', () => {
		geste.classList.add('annule');
		fin.textContent = 'Annulé : rien n’a été écrit.';
		fin.classList.add('vu');
		humeur('');
	});
	function preparer3() {
		conversation++;
		question.textContent = '';
		texte.textContent = '';
		reponse.classList.remove('vu', 'pense');
		geste.classList.remove('vu', 'confirme', 'annule');
		etapes3.forEach((li) => (li.className = ''));
		fin.textContent = '';
		fin.classList.remove('vu');
	}
	async function scene3() {
		await attendre(400);
		const phrase = s.question;
		for (let i = 1; i <= phrase.length; i++) {
			question.textContent = phrase.slice(0, i);
			if (visite !== 'pret') await attendre(28);
		}
		await attendre(400);
		reponse.classList.add('vu', 'pense');
		humeur('plume-travaille');
		await attendre(1000);
		reponse.classList.remove('pense');
		await taper(texte, s.reponse, 45);
		geste.classList.add('vu');
		humeur('');
		await attendre(1600);
		await toucher(v3.querySelector('[data-confirmer]'));
		await attendre(3600);
	}

	// La rotation : une scène par capacité, puis la suivante.
	const PREPARER = [preparer0, preparer1, preparer2, preparer3],
		SCENES = [scene0, scene1, scene2, scene3];
	function montrer(n: number) {
		actuelle = n;
		horloge = 0;
		boutons.forEach((b, k) => {
			b.classList.toggle('active', k === n);
			b.classList.toggle('fini', k < n);
			b.setAttribute('aria-selected', k === n ? 'true' : 'false');
			b.style.setProperty('--avance', '0');
		});
		vues.forEach((v, k) => v.classList.toggle('active', k === n));
		arc.style.strokeDashoffset = '100';
		PREPARER[n]?.();
	}
	async function tourner(depart: number) {
		const j = jeton;
		let k = depart;
		while (j === jeton && !arrete) {
			montrer(k);
			try {
				await SCENES[k]?.();
				await libre();
			} catch (e) {
				if (e === ARRET) return;
				throw e;
			}
			if (j !== jeton || visite === 'pret') return;
			k = (k + 1) % boutons.length;
		}
	}
	function relancer(k: number) {
		arreter();
		if (visite !== 'pret') visite = 'joue';
		peindreVisite();
		void tourner(k);
	}

	// Un toucher sur une capacité rejoue sa scène ; un vrai geste sur la plaque rend la main.
	boutons.forEach((b, k) => ecouter(b, 'click', () => relancer(k)));
	let mainT: ReturnType<typeof setTimeout> | undefined;
	function prendreLaMain(e: Event) {
		const cible = e.target instanceof Element ? e.target : null;
		if (
			!e.isTrusted ||
			cible?.closest('[data-p-visite]') ||
			(visite !== 'joue' && visite !== 'pause')
		)
			return;
		arreter();
		visite = 'main';
		peindreVisite();
		clearTimeout(mainT);
		mainT = plus(() => {
			if (visite === 'main') {
				visite = 'revoir';
				peindreVisite();
			}
		}, 2600);
	}
	ecouter(plaque, 'click', prendreLaMain, true);
	ecouter(plaque, 'keydown', prendreLaMain, true);
	ecouter(pastille, 'click', () => {
		if (visite === 'joue') visite = 'pause';
		else if (visite === 'pause') visite = 'joue';
		else {
			visite = 'joue';
			relancer(actuelle);
			return;
		}
		peindreVisite();
	});
	ecouter<PointerEvent>(grille, 'pointerenter', (e) => {
		if (e.pointerType === 'mouse') {
			survol = true;
			peindreVisite();
		}
	});
	ecouter<PointerEvent>(grille, 'pointerleave', (e) => {
		if (e.pointerType === 'mouse') {
			survol = false;
			peindreVisite();
		}
	});
	ecouter(document, 'visibilitychange', () => {
		cache = document.hidden;
	});
	function demarrer() {
		if (demarree) return;
		demarree = true;
		void tourner(0);
	}
	montrer(0);
	if (reduit) {
		fini0();
		repondre('promesse', false);
	}
	peindreVisite();
	if ('IntersectionObserver' in window) {
		const obs = new IntersectionObserver(
			(en) => {
				hors = !en[0]?.isIntersecting;
				if (!hors) demarrer();
			},
			{ threshold: 0.3 }
		);
		obs.observe(plaque);
		defaires.push(() => obs.disconnect());
	} else {
		hors = false;
		demarrer();
	}

	return () => {
		arrete = true;
		arreter();
		clearTimeout(humeurT);
		clearTimeout(mainT);
		defaires.forEach((f) => f());
	};
}
