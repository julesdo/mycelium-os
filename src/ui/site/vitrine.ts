import { mouvementReduit } from './gestes';

/**
 * LA VITRINE DE L'EN-TÊTE (transplantée de la maquette V26).
 *
 * Le téléphone est l'application qu'on essaie. Un seul état (`etat`) que chaque écran relit : un
 * geste fait sur un onglet se voit sur les autres. Plume travaille en direct, une tâche à la fois,
 * et l'effet d'une étape n'a lieu qu'à l'instant où elle se coche, comme dans l'app. Trois tâches
 * arrivent seules : relire le dépôt, rapprocher un virement, ouvrir un dossier.
 *
 * Personne n'est obligé de toucher : une visite guidée joue l'écran seule, un doigt fantôme montre
 * chaque geste, puis elle recommence sous un voile. Elle se fige quand le téléphone sort de
 * l'écran ou que la souris le survole, et le premier vrai geste rend la main. À la souris, le
 * téléphone s'incline (moins quand on vise l'écran).
 *
 * Ses chiffres arrivent par `scenario` : la page les lit dans `marketing/site/vitrine-demo.ts`,
 * que le moteur du produit tient au centime.
 */
export interface ScenarioVitrine {
	readonly du: number;
	readonly plusDe90: number;
	readonly factures: number;
	readonly jamaisReclame: number;
	readonly clients: { readonly roux: number; readonly vidal: number; readonly bati: number };
	readonly durandReclame: number;
	readonly premierRappelDurand: string;
	readonly promesseVidal: string;
	readonly heures: { readonly de: number; readonly a: number };
}

type Cle = 'roux' | 'durand' | 'vidal' | 'bati' | 'rousseau';
type Vue = 'aujourdhui' | 'clients' | 'dossiers' | 'compte' | 'jamais';
type Etape = readonly [string, (() => void)?];
interface Travail {
	readonly titre: string;
	readonly fait: string;
	readonly dit?: string;
	readonly etapes: readonly Etape[];
	readonly debut?: () => void;
	readonly fin?: () => void;
}
type Mode = 'joue' | 'survol' | 'pause' | 'main' | 'revoir' | 'pret';

const CLES: readonly Cle[] = ['roux', 'durand', 'vidal', 'bati', 'rousseau'];

/** Le montant qui défile : l'espace fine des milliers, l'espace simple avant l'euro. */
function euros(c: number): string {
	const e = Math.floor(c / 100),
		d = String(c % 100).padStart(2, '0');
	return String(e).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f') + ',' + d + ' €';
}
function grand(c: number): string {
	return euros(c).replace(/,(\d\d) €$/, '<small>,$1\u00a0€</small>');
}
/** Le montant posé dans une phrase : les espaces insécables de la maquette. */
function eurosPoses(c: number): string {
	const e = Math.floor(c / 100),
		d = String(c % 100).padStart(2, '0');
	return String(e).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + ',' + d + '\u00a0€';
}
function heure(): string {
	const d = new Date();
	return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/** L'arrêt d'une visite : il rejette les attentes en cours, sans être une erreur. */
const ARRET = Symbol('arret');

export function demarrerVitrine(racine: HTMLElement, s: ScenarioVitrine): () => void {
	const vitrine = racine.querySelector<HTMLElement>('[data-vitrine]');
	const telephone = vitrine?.querySelector<HTMLElement>('[data-v-tel]');
	const ecranTrouve = vitrine?.querySelector<HTMLElement>('[data-ecran]');
	if (!vitrine || !telephone || !ecranTrouve) return () => {};
	// Des constantes non nulles : les fermetures qui suivent les lisent sans garde.
	const vit: HTMLElement = vitrine,
		tel: HTMLElement = telephone,
		ecran: HTMLElement = ecranTrouve;
	const reduit = mouvementReduit();
	const plumeBloc = vit.querySelector<HTMLElement>('.plume-vedette'),
		plume = plumeBloc?.querySelector('svg') ?? null;
	function $<T extends Element = HTMLElement>(sel: string): T {
		const el = ecran.querySelector<T>(sel);
		if (!el) throw new Error(`La vitrine n'a pas de ${sel}`);
		return el;
	}
	const $$ = <T extends Element = HTMLElement>(sel: string): T[] =>
		Array.from(ecran.querySelectorAll<T>(sel));
	const souris = window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduit;

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

	function rouler(
		el: HTMLElement,
		de: number,
		a: number,
		ms: number,
		fmt: (c: number) => string,
		retard?: number
	) {
		if (reduit) {
			el.innerHTML = fmt(a);
			return;
		}
		const t0 = performance.now() + (retard || 0);
		const pas = (n: number) => {
			if (arrete) return;
			const x = Math.max(0, Math.min(1, (n - t0) / ms)),
				e = 1 - Math.pow(1 - x, 3);
			el.innerHTML = fmt(Math.round(de + (a - de) * e));
			if (x < 1) requestAnimationFrame(pas);
		};
		pas(performance.now());
	}

	// Plume, à côté du téléphone : il saute à chaque geste et change de tête selon ce qu'il fait.
	function hop() {
		if (reduit || !plume) return;
		plume.classList.remove('hop');
		void plume.getBoundingClientRect();
		plume.classList.add('hop');
		plus(() => plume.classList.remove('hop'), 760);
	}
	let humeurT: ReturnType<typeof setTimeout> | undefined;
	function humeur(h: string, ms?: number) {
		if (!plume) return;
		clearTimeout(humeurT);
		plume.classList.remove('plume-salue', 'plume-travaille', 'plume-fete-anim');
		if (h) plume.classList.add(h);
		if (ms) humeurT = plus(() => humeur(travail ? 'plume-travaille' : ''), ms);
	}

	// L'état de l'application.
	const ETAT0 = {
		du: s.du,
		age1: 0,
		age3: s.plusDe90,
		retard: s.factures,
		auto: true,
		roux: 'programme',
		durand: 'envoye',
		vidal: 'promesse',
		bati: 'absent',
		rousseau: 'pret'
	};
	const etat = { ...ETAT0 };
	const ile = $('[data-ile]'),
		elM = $('[data-v-montant]'),
		elSous = $('[data-v-sous]'),
		elAge1 = $('[data-v-age1]'),
		elAge3 = $('[data-v-age3]');
	const b1 = $('[data-b1]'),
		b3 = $('[data-b3]');
	function changerDu(delta: number, age1: number | null, age3: number | null) {
		const avant = etat.du;
		etat.du += delta;
		rouler(elM, avant, etat.du, 1300, grand);
		if (age1 != null) {
			rouler(elAge1, etat.age1, age1, 1300, euros);
			etat.age1 = age1;
		}
		if (age3 != null) {
			rouler(elAge3, etat.age3, age3, 1300, euros);
			etat.age3 = age3;
		}
		elSous.style.opacity = '0';
		plus(() => {
			elSous.textContent = etat.retard + ' factures en retard';
			elSous.style.opacity = '';
		}, 220);
	}
	rouler(elM, Math.round(etat.du * 0.82), etat.du, 1600, grand, 450);

	// Ce que chaque écran dit de chaque client, lu sur l'état.
	const STATUT: Record<Cle, () => string> = {
		roux: () =>
			!etat.auto
				? 'Rappel en pause'
				: etat.roux === 'retenu'
					? 'Rappel retenu'
					: 'Premier rappel jeudi',
		durand: () =>
			etat.durand === 'programme'
				? etat.auto
					? 'Deuxième rappel vendredi'
					: 'Deuxième rappel en pause'
				: 'Premier rappel envoyé',
		vidal: () =>
			etat.vidal === 'regle' ? 'Réglé aujourd’hui' : 'Promesse pour le ' + s.promesseVidal,
		bati: () => (etat.bati === 'demarre' ? 'Premier rappel lundi' : 'Dossier à démarrer'),
		rousseau: () => (etat.rousseau === 'demarre' ? 'Premier rappel lundi' : 'Prêt à démarrer')
	};
	const ETAT_DOSSIER: Record<Cle, () => string> = {
		roux: () =>
			!etat.auto
				? 'Premier rappel · en pause'
				: etat.roux === 'retenu'
					? 'Premier rappel retenu · ne partira pas'
					: 'Premier rappel · jeu. 10:00',
		durand: () =>
			etat.durand === 'programme'
				? 'Deuxième rappel · ' + (etat.auto ? 'ven. 10:00' : 'en pause')
				: 'Premier rappel envoyé le ' + s.premierRappelDurand,
		vidal: () =>
			etat.vidal === 'regle'
				? 'Réglé aujourd’hui · relances arrêtées'
				: 'Promesse pour le ' + s.promesseVidal,
		bati: () => (etat.bati === 'demarre' ? 'Premier rappel · lun. 10:00' : 'Prêt à démarrer'),
		rousseau: () =>
			etat.rousseau === 'demarre' ? 'Premier rappel · lun. 10:00' : 'Prêt à démarrer'
	};
	const DIT: Record<Cle, () => string> = {
		roux: () =>
			!etat.auto
				? 'Les relances sont en pause : rien ne part sans vous.'
				: etat.roux === 'retenu'
					? 'Son rappel est retenu : rien ne partira.'
					: 'Son premier rappel part demain à 10:00. Vous pouvez encore le retenir.',
		durand: () =>
			etat.durand === 'programme'
				? 'Son deuxième rappel part vendredi à 10:00.'
				: 'Premier rappel envoyé le ' +
					s.premierRappelDurand +
					'. Le deuxième est à faire : glissez son dossier.',
		vidal: () =>
			etat.vidal === 'regle'
				? 'Il a tout réglé ce matin. J’ai arrêté ses relances.'
				: 'Il a promis de payer le ' + s.promesseVidal + ' : je me tais jusque-là.',
		bati: () =>
			etat.bati === 'demarre'
				? 'Son premier rappel part lundi à 10:00.'
				: 'Son dossier est prêt. Démarrez-le, je m’occupe du reste.',
		rousseau: () =>
			etat.rousseau === 'demarre'
				? 'Son premier rappel part lundi à 10:00.'
				: 'Son dossier est prêt. Démarrez-le, je m’occupe du reste.'
	};
	const ACTION: Partial<Record<Cle, () => string>> = {
		roux: () => (etat.roux === 'retenu' ? 'Remettre' : 'Retenir'),
		durand: () => 'Relancer'
	};
	const glissable = (cle: Cle) =>
		cle === 'roux' ? etat.auto : cle === 'durand' && etat.durand === 'envoye';

	const relance = $('[data-relance]'),
		relTitre = $('[data-rel-titre]'),
		relQuand = $('[data-rel-quand]'),
		relBouton = relance.querySelector<HTMLElement>('[data-retenir]');
	const capsule = $('[data-v-capsule]'),
		capTitre = $('[data-cap-titre]'),
		capSous = $('[data-cap-sous]'),
		capBouton = capsule.querySelector<HTMLElement>('[data-retenir]');
	function prochaine(): { titre: string; quand: string; etat: string; retenue?: boolean } {
		if (!etat.auto)
			return { titre: 'Relances en pause', quand: 'Rien ne part sans vous', etat: 'pause' };
		if (etat.roux === 'retenu')
			return {
				titre: 'Rappel · Charpentes Roux',
				quand: 'Retenu, ne partira pas',
				etat: 'repos',
				retenue: true
			};
		return { titre: 'Rappel · Charpentes Roux', quand: 'jeu. 10:00', etat: 'repos' };
	}
	function maj() {
		CLES.forEach((cle) => {
			const ligne = $(`[data-client="${cle}"]`),
				dos = $(`[data-dos="${cle}"]`);
			const statut = ligne.querySelector('[data-statut]'),
				etatDos = dos.querySelector('[data-etat]'),
				nom = dos.querySelector('[data-action-nom]');
			if (statut) statut.textContent = STATUT[cle]();
			if (etatDos) etatDos.textContent = ETAT_DOSSIER[cle]();
			const action = ACTION[cle];
			if (action && nom) nom.textContent = action();
		});
		const vidalRegle = etat.vidal === 'regle';
		$('[data-client="vidal"]').classList.toggle('solde', vidalRegle);
		$('[data-dos="vidal"]').classList.toggle('solde', vidalRegle);
		(['bati', 'rousseau'] as const).forEach((cle) =>
			$(`[data-dos="${cle}"]`).classList.toggle('demarre', etat[cle] === 'demarre')
		);
		const e = (cle: Cle, i: number, c: string) => {
			const el = ecran.querySelector(`[data-dos="${cle}"] .v-etapes i:nth-child(${i})`);
			if (el) el.className = c;
		};
		e('roux', 1, etat.roux === 'retenu' || !etat.auto ? '' : 'p');
		e('durand', 2, etat.durand === 'programme' ? 'p' : '');
		e('vidal', 2, vidalRegle ? 'f' : '');
		e('vidal', 3, vidalRegle ? 'f' : '');
		e('vidal', 4, vidalRegle ? 'f' : '');
		e('bati', 1, etat.bati === 'demarre' ? 'p' : '');
		e('rousseau', 1, etat.rousseau === 'demarre' ? 'p' : '');
		$('[data-v-compte]').textContent = String(etat.retard);
		$('[data-total-clients]').textContent = euros(etat.du);
		const p = prochaine();
		relTitre.textContent = p.titre;
		relQuand.textContent = p.quand;
		relance.classList.toggle('retenue', !!p.retenue);
		relance.classList.toggle('pause', p.etat === 'pause');
		const libelle = p.retenue ? 'Annuler' : 'Retenir';
		if (relBouton) relBouton.textContent = libelle;
		if (capBouton) capBouton.textContent = libelle;
		if (!travail) peindreCapsule();
	}
	function peindreCapsule() {
		if (travail) {
			capsule.dataset.etat = 'travail';
			capsule.classList.remove('retenue');
			capTitre.textContent =
				'Plume ' + travail.def.titre.charAt(0).toLowerCase() + travail.def.titre.slice(1);
			capSous.textContent =
				'Étape ' +
				Math.min(travail.i + 1, travail.def.etapes.length) +
				' sur ' +
				travail.def.etapes.length;
			return;
		}
		const p = prochaine();
		capsule.dataset.etat = p.etat;
		capsule.classList.toggle('retenue', !!p.retenue);
		capTitre.textContent = p.titre;
		capSous.textContent = p.quand;
	}

	// Ce que dit Plume, au-dessus de la barre, sur les onglets où sa carte n'est pas.
	const fente = $('[data-fente]'),
		bulleTexte = $('[data-bulle-texte]');
	let bulleT: ReturnType<typeof setTimeout> | undefined;
	function dire(texte: string, ms?: number) {
		if (visible() === 'aujourdhui') return;
		bulleTexte.textContent = texte;
		fente.dataset.montre = 'bulle';
		clearTimeout(bulleT);
		bulleT = plus(taire, ms || 5600);
		hop();
	}
	function taire() {
		clearTimeout(bulleT);
		fente.dataset.montre = 'capsule';
	}
	ecouter($('[data-bulle-fermer]'), 'click', taire);

	// Le travail de Plume : une tâche à la fois, chaque étape se coche (0,7 s) et produit son effet.
	const carte = $('[data-pilote]'),
		sous = $('[data-pilote-sous]'),
		liste = $<HTMLOListElement>('[data-travail]'),
		faits = $('[data-v-faits]'),
		plumeCarte = carte.querySelector('svg');
	const FAITS0 = faits.innerHTML;
	const COCHE =
		'<span class="v-coche"><svg viewBox="0 0 16 16"><path d="M4.6 8.3l2.3 2.3 4.5-4.9"/></svg></span>';
	function etapes(ol: HTMLElement, noms: readonly string[]) {
		ol.innerHTML = noms.map(() => '<li>' + COCHE + '<span></span></li>').join('');
		Array.from(ol.children).forEach((li, i) => {
			if (li.lastChild) li.lastChild.textContent = noms[i] ?? '';
		});
	}
	function cocher(ol: HTMLElement, i: number) {
		const li = ol.children;
		const avant = li[i - 1],
			courant = li[i];
		if (avant) {
			avant.classList.remove('encours');
			avant.classList.add('fait');
		}
		if (courant) courant.classList.add('encours');
	}
	const TRAVAUX: Record<'depot' | 'vidal' | 'bati', Travail> = {
		depot: {
			titre: 'Relit votre dépôt',
			fait: 'Dépôt Pennylane relu',
			etapes: [['198 factures lues'], ['40 règlements rapprochés'], ['4 retards repérés']]
		},
		vidal: {
			titre: 'Rapproche un virement',
			fait: 'Virement de Transports Vidal rapproché',
			dit: 'Transports Vidal a réglé : j’ai arrêté ses relances.',
			debut: () => {
				ile.classList.add('ouverte');
				plus(() => ile.classList.remove('ouverte'), 4600);
			},
			etapes: [
				[eurosPoses(s.clients.vidal) + ' de Transports Vidal'],
				[
					'Facture F-2026-131 soldée',
					() => {
						etat.retard = etat.retard - 1;
						b3.style.setProperty('--f', '22.4');
						changerDu(-s.clients.vidal, null, etat.age3 - s.clients.vidal);
					}
				],
				[
					'Ses relances arrêtées',
					() => {
						etat.vidal = 'regle';
						maj();
					}
				]
			],
			fin: () => humeur('plume-fete-anim', 1900)
		},
		bati: {
			titre: 'Ouvre un dossier',
			fait: 'Dossier de Bâti-Sud ouvert',
			dit: 'Bâti-Sud a une facture en retard. Son dossier vous attend.',
			etapes: [
				[
					'Bâti-Sud : facture échue hier',
					() => {
						etat.retard = etat.retard + 1;
						b1.style.setProperty('--f', '2.6');
						changerDu(s.clients.bati, s.clients.bati, null);
						montrerRang($('[data-client="bati"]'));
					}
				],
				[
					'Son dossier est prêt',
					() => {
						etat.bati = 'pret';
						maj();
						montrerRang($('[data-dos="bati"]'));
					}
				],
				[
					'Il n’attend que vous',
					() => {
						if (visible() !== 'dossiers') $('[data-pastille]').hidden = false;
					}
				]
			]
		}
	};
	function montrerRang(el: HTMLElement) {
		el.classList.remove('cache');
		el.classList.add('arrive');
		plus(() => el.classList.remove('arrive'), 1700);
	}
	let file: Array<keyof typeof TRAVAUX> = [],
		travail: { def: Travail; i: number } | null = null,
		generation = 0;
	function lancer(cle: keyof typeof TRAVAUX) {
		file.push(cle);
		if (!travail) suivant();
	}
	function suivant() {
		const cle = file.shift();
		if (!cle) return;
		const def = TRAVAUX[cle],
			gen = generation;
		const courant = { def, i: 0 };
		travail = courant;
		etapes(
			liste,
			def.etapes.map((e) => e[0])
		);
		sous.textContent = def.titre;
		carte.classList.add('travaille');
		plumeCarte?.classList.add('plume-travaille');
		humeur('plume-travaille');
		def.debut?.();
		cocher(liste, 0);
		peindreCapsule();
		const pas = () => {
			plus(() => {
				if (gen !== generation) return;
				const e = def.etapes[courant.i];
				courant.i++;
				cocher(liste, courant.i);
				e?.[1]?.();
				peindreCapsule();
				if (courant.i < def.etapes.length) pas();
				else plus(() => gen === generation && finir(), 900);
			}, 700);
		};
		pas();
	}
	function finir() {
		if (!travail) return;
		const def = travail.def;
		travail = null;
		carte.classList.remove('travaille');
		plumeCarte?.classList.remove('plume-travaille');
		const li = document.createElement('li');
		li.className = 'neuf';
		li.innerHTML = '<span></span><time></time>';
		if (li.firstChild) li.firstChild.textContent = def.fait;
		if (li.lastChild) li.lastChild.textContent = heure();
		faits.insertBefore(li, faits.firstChild);
		while (faits.children.length > 2) faits.lastChild?.remove();
		sous.textContent = 'Dernière veille à ' + heure();
		humeur('');
		def.fin?.();
		maj();
		if (def.dit) dire(def.dit);
		plus(suivant, 400);
	}

	// Les vues : quatre onglets, une page poussée depuis Aujourd'hui.
	let vue: Vue = 'aujourdhui',
		pousse: Vue | null = null;
	const vues: Partial<Record<Vue, HTMLElement>> = {};
	$$('section[data-vue]').forEach((v) => {
		vues[v.dataset.vue as Vue] = v;
	});
	const laVue = (v: Vue): HTMLElement => {
		const el = vues[v];
		if (!el) throw new Error(`La vitrine n'a pas de vue ${v}`);
		return el;
	};
	const visible = (): Vue => pousse || vue;
	const REMARQUE: Partial<Record<Vue, () => string>> = {
		clients: () =>
			etat.rousseau === 'pret'
				? 'Atelier Rousseau est prêt à démarrer : il n’attend que vous.'
				: 'Touchez un client : je vous dis où il en est.',
		dossiers: () =>
			etat.durand === 'envoye'
				? 'Glissez Fournitures Durand vers la gauche : je prépare son rappel.'
				: 'Un dossier se balaie vers la gauche : relancer, retenir.',
		compte: () => 'Tout part à votre nom, depuis votre adresse.',
		jamais: () => 'La lettre officielle les réclame pour vous, datés du jour où elle part.'
	};
	let remarques: Partial<Record<Vue, true>> = {};
	function remarquer(v: Vue) {
		const r = REMARQUE[v];
		if (!remarques[v] && r) {
			remarques[v] = true;
			plus(() => visible() === v && dire(r()), 500);
		}
	}
	function entrer(el: HTMLElement) {
		el.classList.remove('entre');
		void el.offsetWidth;
		el.classList.add('entre');
		plus(() => el.classList.remove('entre'), 600);
	}
	const pilule = $('[data-pilule]'),
		lentille = $('[data-lentille]'),
		onglets = $$('[data-onglet]');
	let lentL = 4;
	function placerLentille(btn: HTMLElement, anime: boolean) {
		const l = btn.offsetLeft,
			r = pilule.clientWidth - btn.offsetLeft - btn.offsetWidth,
			droite = l > lentL;
		lentille.style.setProperty('--dl', anime && !reduit ? (droite ? '440ms' : '240ms') : '0ms');
		lentille.style.setProperty('--dr', anime && !reduit ? (droite ? '240ms' : '440ms') : '0ms');
		lentille.style.left = l + 'px';
		lentille.style.right = r + 'px';
		lentL = l;
	}
	function montrer(cible: Vue) {
		if (pousse) retour();
		if (cible === vue) return;
		laVue(vue).classList.remove('active');
		laVue(cible).classList.add('active');
		entrer(laVue(cible));
		vue = cible;
		ecran.dataset.vue = cible;
		onglets.forEach((o) => {
			const a = o.dataset.onglet === cible;
			o.classList.toggle('actif', a);
			if (a) o.setAttribute('aria-current', 'page');
			else o.removeAttribute('aria-current');
		});
		placerLentille($(`[data-onglet="${cible}"]`), true);
		taire();
		if (cible === 'dossiers') {
			$('[data-pastille]').hidden = true;
			indiquer();
		}
		remarquer(cible);
	}
	function pousser(cible: Vue) {
		if (vue !== 'aujourdhui') montrer('aujourdhui');
		pousse = cible;
		laVue('aujourdhui').classList.add('recule');
		laVue(cible).classList.add('active');
		ecran.dataset.vue = cible;
		remarquer(cible);
	}
	function retour() {
		if (!pousse) return;
		laVue(pousse).classList.remove('active');
		laVue('aujourdhui').classList.remove('recule');
		pousse = null;
		ecran.dataset.vue = vue;
		taire();
	}
	onglets.forEach((o) => ecouter(o, 'click', () => montrer(o.dataset.onglet as Vue)));
	ecouter($('[data-pousser]'), 'click', () => pousser('jamais'));
	ecouter($('[data-retour]'), 'click', () => retour());
	const premierOnglet = onglets[0];
	if (premierOnglet) placerLentille(premierOnglet, false);
	ecouter(window, 'resize', () => placerLentille($(`[data-onglet="${vue}"]`), false));

	// Retenir le prochain rappel : depuis la carte de Plume, sa capsule ou en balayant le dossier.
	function retenir() {
		if (!etat.auto) return;
		etat.roux = etat.roux === 'retenu' ? 'programme' : 'retenu';
		maj();
		hop();
		dire(
			etat.roux === 'retenu'
				? 'Retenu : ce rappel ne partira pas.'
				: 'C’est reparti : il part jeudi à 10:00.'
		);
	}
	$$('[data-retenir]').forEach((b) => ecouter(b, 'click', retenir));

	// Les clients : un toucher, et Plume dit où en est le client.
	$$('[data-client]').forEach((l) =>
		ecouter(l, 'click', () => dire(DIT[l.dataset.client as Cle]()))
	);

	// Démarrer un dossier que Plume a préparé.
	$$('[data-demarrer]').forEach((b) =>
		ecouter(b, 'click', () => {
			const cle = b.closest<HTMLElement>('[data-dos]')?.dataset.dos as
				| 'bati'
				| 'rousseau'
				| undefined;
			if (!cle) return;
			etat[cle] = 'demarre';
			maj();
			hop();
			dire('C’est parti : premier rappel lundi à 10:00. Vous pourrez le retenir.');
		})
	);

	// Les dossiers se balaient vers la gauche, comme dans l'app.
	const OUVERT = 84,
		SEUIL = 118;
	const balayeurs: Partial<Record<Cle, (surPas: (v: number) => void) => Promise<void>>> = {};
	function faire(cle: Cle) {
		if (cle === 'roux') {
			retenir();
			return;
		}
		etat.durand = 'programme';
		maj();
		hop();
		dire(
			etat.auto
				? 'C’est prêt : son deuxième rappel part vendredi à 10:00, à votre nom.'
				: 'Il est prêt. Les relances sont en pause : il attend votre feu vert.'
		);
	}
	const elastique = (x: number, d: number) => (x * d * 0.55) / (d + 0.55 * Math.abs(x));
	$$('[data-dos]').forEach((dos) => {
		const cle = dos.dataset.dos as Cle,
			carteDos = dos.querySelector<HTMLElement>('[data-carte]'),
			action = dos.querySelector<HTMLElement>('[data-action]');
		if (!carteDos || !action) return;
		let actif = false,
			sens: 'h' | 'v' | null = null,
			x0 = 0,
			y0 = 0,
			base = 0,
			x = 0,
			k = 1,
			hist: Array<[number, number]> = [],
			ouvert = false,
			sauterClic = false,
			repos: ReturnType<typeof setTimeout> | undefined;
		function poser(v: number, anime: boolean) {
			if (!carteDos) return;
			carteDos.style.transition = anime ? '' : 'none';
			carteDos.style.transform = v ? 'translateX(' + v.toFixed(1) + 'px)' : '';
			x = v;
			clearTimeout(repos);
			if (v) dos.classList.add('glisse');
			else repos = plus(() => dos.classList.remove('glisse'), 440);
		}
		function fermer() {
			ouvert = false;
			poser(0, true);
			if (action) action.tabIndex = -1;
		}
		balayeurs[cle] = (surPas) =>
			new Promise((fin) => {
				const t0 = performance.now(),
					cible = -(SEUIL + 16);
				const image = (t: number) => {
					if (arrete) return;
					const p = Math.min(1, (t - t0) / 560),
						v = cible * (1 - Math.pow(1 - p, 3));
					poser(v, false);
					action.classList.toggle('tire', v < -SEUIL);
					surPas(v);
					if (p < 1) {
						requestAnimationFrame(image);
						return;
					}
					action.classList.remove('tire');
					poser(-OUVERT, true);
					surPas(-OUVERT);
					plus(() => {
						faire(cle);
						fermer();
						fin();
					}, 260);
				};
				image(t0);
			});
		ecouter<PointerEvent>(carteDos, 'pointerdown', (e) => {
			if (e.button || (e.target instanceof Element && e.target.closest('button'))) return;
			actif = true;
			sens = null;
			x0 = e.clientX;
			y0 = e.clientY;
			base = ouvert ? -OUVERT : 0;
			hist = [[e.timeStamp, e.clientX]];
			k = carteDos.offsetWidth / (carteDos.getBoundingClientRect().width || carteDos.offsetWidth);
		});
		ecouter<PointerEvent>(carteDos, 'pointermove', (e) => {
			if (!actif) return;
			const mx = (e.clientX - x0) * k,
				my = (e.clientY - y0) * k;
			if (!sens) {
				if (Math.abs(mx) < 7 && Math.abs(my) < 7) return;
				sens = Math.abs(mx) > Math.abs(my) ? 'h' : 'v';
				if (sens === 'v') {
					actif = false;
					return;
				}
				carteDos.setPointerCapture(e.pointerId);
				prendreLaMain(e);
			}
			hist.push([e.timeStamp, e.clientX]);
			if (hist.length > 6) hist.shift();
			let v = base + mx;
			if (!glissable(cle)) v = elastique(v, 60);
			else if (v > 0) v = elastique(v, 60);
			else if (v < -SEUIL - 30) v = -SEUIL - 30 + elastique(v + SEUIL + 30, 80);
			action.classList.toggle('tire', v < -SEUIL);
			poser(v, false);
		});
		function lacher() {
			if (!actif) return;
			actif = false;
			if (!sens) {
				if (ouvert) {
					fermer();
					sauterClic = true;
				}
				return;
			}
			const a = hist[0],
				b = hist[hist.length - 1];
			const vit = a && b && b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0;
			action?.classList.remove('tire');
			if (!glissable(cle)) {
				poser(0, true);
				if (Math.abs(x) > 10) dire(DIT[cle]());
				return;
			}
			if (x < -SEUIL || (vit < -0.7 && x < -30)) {
				poser(-OUVERT, true);
				plus(() => {
					faire(cle);
					fermer();
				}, 260);
				return;
			}
			if (x < -36 || vit < -0.3) {
				ouvert = true;
				poser(-OUVERT, true);
				if (action) action.tabIndex = 0;
				return;
			}
			fermer();
		}
		ecouter(carteDos, 'pointerup', lacher);
		ecouter(carteDos, 'pointercancel', lacher);
		ecouter<MouseEvent>(carteDos, 'click', (e) => {
			if (sauterClic) {
				sauterClic = false;
				return;
			}
			if (!sens && !ouvert && !(e.target instanceof Element && e.target.closest('button')))
				dire(DIT[cle]());
		});
		ecouter(action, 'click', () => {
			if (glissable(cle)) faire(cle);
			fermer();
		});
	});
	// La première fois qu'on ouvre les dossiers, la carte de Durand montre qu'elle se balaie.
	let indique = false;
	function indiquer() {
		if (indique || reduit || etat.durand !== 'envoye') return;
		indique = true;
		const c = $('[data-dos="durand"] [data-carte]');
		const dos = c.parentElement;
		plus(() => {
			dos?.classList.add('glisse');
			c.style.transform = 'translateX(-46px)';
			plus(() => {
				c.style.transform = '';
				plus(() => dos?.classList.remove('glisse'), 440);
			}, 520);
		}, 700);
	}

	// Les relances automatiques, depuis le compte.
	const auto = $<HTMLInputElement>('[data-auto]');
	ecouter(auto, 'change', () => {
		etat.auto = auto.checked;
		maj();
		hop();
		dire(
			etat.auto
				? `Je reprends : en semaine, de ${s.heures.de} h à ${s.heures.a} h.`
				: 'Compris : je prépare, vous envoyez. Rien ne part sans vous.'
		);
	});

	// La conversation avec Plume.
	const feuille = $('[data-v-feuille]'),
		conv = $('[data-conv]'),
		champ = $<HTMLInputElement>('[data-champ]'),
		suggestions = $('[data-suggestions]');
	let occupe = false,
		fil = 0;
	const CONV0 = conv.innerHTML;
	function ouvrirPlume(e?: Event) {
		feuille.inert = false;
		feuille.classList.add('ouverte');
		ecran.classList.add('vu-plume');
		taire();
		hop();
		if (e && e.isTrusted && e instanceof MouseEvent && e.detail === 0)
			$('[data-fermer-plume]').focus({ preventScroll: true });
	}
	function fermerPlume() {
		feuille.classList.remove('ouverte');
		feuille.inert = true;
		champ.blur();
	}
	$$('[data-ouvrir-plume]').forEach((b) => ecouter(b, 'click', ouvrirPlume));
	ecouter($('[data-fermer-plume]'), 'click', fermerPlume);
	ecouter<KeyboardEvent>(feuille, 'keydown', (e) => {
		if (e.key === 'Escape') fermerPlume();
	});
	function defiler() {
		conv.scrollTop = conv.scrollHeight;
	}
	function ajouter<T extends HTMLElement>(el: T): T {
		conv.appendChild(el);
		defiler();
		return el;
	}
	function bloc(classe: string, html?: string): HTMLDivElement {
		const d = document.createElement('div');
		d.className = classe;
		if (html) d.innerHTML = html;
		return d;
	}
	function direPlume(texte: string) {
		const m = bloc('v-msg');
		m.textContent = texte;
		ajouter(m);
	}
	function ecrire(el: HTMLElement, texte: string, fin: () => void) {
		const mots = texte.split(' ');
		let i = 0;
		if (reduit) {
			el.textContent = texte;
			fin();
			return;
		}
		const mot = () => {
			if (!el.isConnected || arrete) return;
			el.textContent = mots.slice(0, ++i).join(' ');
			defiler();
			if (i < mots.length) plus(mot, 34);
			else fin();
		};
		mot();
	}
	function repondre(texte: string, extra?: HTMLElement) {
		const pense = ajouter(bloc('v-pense', '<i></i><i></i><i></i>')),
			g = fil;
		humeur('plume-travaille');
		plus(
			() => {
				if (g !== fil) return;
				pense.remove();
				const m = ajouter(bloc('v-msg'));
				ecrire(m, texte, () => {
					if (g !== fil) return;
					if (extra) ajouter(extra);
					humeur(travail ? 'plume-travaille' : '');
					occupe = false;
					suggestions.classList.remove('occupe');
				});
			},
			reduit ? 200 : 950
		);
	}
	const CHEVRON =
		'<svg class="v-chevron" viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5L8 6l-3.5 3.5"/></svg>';
	function citer(html: string, quand: () => void): HTMLButtonElement {
		const b = document.createElement('button');
		b.type = 'button';
		b.className = 'v-cite';
		b.innerHTML = html + CHEVRON;
		b.addEventListener('click', quand);
		return b;
	}
	function flash(el: HTMLElement) {
		el.classList.remove('arrive');
		void el.offsetWidth;
		el.classList.add('arrive');
		plus(() => el.classList.remove('arrive'), 1700);
	}
	type Reponse = readonly [string, HTMLElement?];
	const REPONSES: Record<
		'plus' | 'relance' | 'penalites' | 'vidal' | 'poli' | 'autre',
		() => Reponse
	> = {
		plus: () => {
			const texte =
				'Charpentes Roux, et de loin. ' +
				(!etat.auto
					? 'Les relances sont en pause : rien ne part sans vous.'
					: etat.roux === 'retenu'
						? 'Vous avez retenu son rappel : rien ne part.'
						: 'Son premier rappel part demain à 10:00.');
			return [
				texte,
				citer(
					'<span class="v-av" style="background:linear-gradient(135deg,#7ec4c9,#3d8f9e)">CR</span><span class="v-t"><b>Charpentes Roux</b><span>' +
						ETAT_DOSSIER.roux() +
						'</span></span><b class="v-val">' +
						eurosPoses(s.clients.roux) +
						'</b>',
					() => {
						fermerPlume();
						montrer('dossiers');
						plus(() => flash($('[data-dos="roux"] [data-carte]')), 300);
					}
				)
			];
		},
		relance: () => {
			if (etat.durand === 'programme')
				return [
					'C’est déjà prêt : son deuxième rappel part vendredi à 10:00. Vous pouvez encore le retenir.'
				];
			const g = bloc(
				'v-geste',
				'<div class="v-geste-tete"><span class="v-ic"><svg viewBox="0 0 24 24"><path d="M4.5 12.5l15-7.5-5.5 15-2.6-6.2z"/><path d="M11.4 13.8L19.5 5"/></svg></span><span class="v-t"><b>Deuxième rappel</b><span>Fournitures Durand</span></span></div><div class="v-geste-l"><span>Réclamé, daté du jour</span><b>' +
					eurosPoses(s.durandReclame) +
					'</b></div><div class="v-geste-l"><span>Part</span><b>ven. 10:00, à votre nom</b></div><button type="button" class="v-confirmer">Confirmer</button>'
			);
			const confirmer = g.querySelector<HTMLElement>('.v-confirmer');
			confirmer?.addEventListener('click', () => {
				if (etat.durand === 'programme') {
					confirmer.remove();
					return;
				}
				const ol = document.createElement('ol');
				ol.className = 'v-travail';
				confirmer.replaceWith(ol);
				etapes(ol, ['Montant daté du jour', 'Lettre à votre nom', 'Programmé vendredi 10:00']);
				cocher(ol, 0);
				hop();
				humeur('plume-travaille');
				defiler();
				let i = 0;
				const gen = fil;
				const pas = () => {
					plus(() => {
						if (gen !== fil) return;
						cocher(ol, ++i);
						if (i < 3) pas();
						else {
							etat.durand = 'programme';
							maj();
							humeur('plume-fete-anim', 1400);
							plus(
								() =>
									gen === fil &&
									direPlume('C’est fait. Vous pourrez le retenir jusqu’à son départ.'),
								400
							);
						}
					}, 650);
				};
				pas();
			});
			return [
				'Je prépare son deuxième rappel, daté du jour. Relisez-le : il partira à votre nom.',
				g
			];
		},
		penalites: () => [
			'Personne ne les a encore réclamées. Je les compte chaque jour, période par période :',
			citer(
				'<span class="v-ic"><svg viewBox="0 0 16 16"><path d="M3 5h10M3 8h7M3 11h9"/></svg></span><span class="v-t"><b>Jamais réclamé</b><span>Dus de plein droit</span></span><b class="v-val">' +
					eurosPoses(s.jamaisReclame) +
					'</b>',
				() => {
					fermerPlume();
					plus(() => pousser('jamais'), 120);
				}
			)
		],
		vidal: () => [
			etat.vidal === 'regle'
				? 'Transports Vidal a tout réglé ce matin. J’ai arrêté ses relances.'
				: 'Pas encore. Je vous préviens dès que son virement arrive.'
		],
		poli: () => ['Avec plaisir. Je reste là : je surveille vos factures.'],
		autre: () => [
			'Ici, je ne connais que ces trois questions. Dans l’application, je réponds sur tout votre compte.'
		]
	};
	function sujet(texte: string): keyof typeof REPONSES {
		const t = texte.toLowerCase();
		if (/relan|durand|rappel/.test(t)) return 'relance';
		if (/p[ée]nal|frais|int[ée]r[êe]t|loi|r[ée]clam|combien/.test(t)) return 'penalites';
		if (/vidal|virement|pay|re[çc]u|r[ée]gl/.test(t)) return 'vidal';
		if (/plus|doit|qui|gros/.test(t)) return 'plus';
		if (/bonjour|salut|merci|hello|coucou|bravo/.test(t)) return 'poli';
		return 'autre';
	}
	function demander(brut: string) {
		const texte = brut.trim();
		if (!texte || occupe) return;
		occupe = true;
		suggestions.classList.add('occupe');
		const moi = ajouter(bloc('v-msg moi'));
		moi.textContent = texte;
		champ.value = '';
		const r = REPONSES[sujet(texte)]();
		repondre(r[0], r[1]);
	}
	ecouter<SubmitEvent>($('[data-composer]'), 'submit', (e) => {
		e.preventDefault();
		demander(champ.value);
	});
	$$('[data-q]').forEach((b) =>
		ecouter(b, 'click', () => {
			if (occupe) return;
			const q = b.dataset.q ?? '';
			let i = 0;
			const g = fil;
			occupe = true;
			suggestions.classList.add('occupe');
			if (reduit) {
				occupe = false;
				demander(q);
				return;
			}
			const frappe = () => {
				if (g !== fil) return;
				champ.value = q.slice(0, ++i);
				if (i < q.length) plus(frappe, 16);
				else
					plus(() => {
						if (g !== fil) return;
						occupe = false;
						demander(q);
					}, 160);
			};
			frappe();
		})
	);

	// La visite guidée. Une seule horloge fait avancer la visite : elle s'arrête quand le
	// téléphone sort de l'écran, quand l'onglet est caché, quand on met en pause, ou quand la souris
	// survole le téléphone pendant la visite. Les trois tâches de Plume suivent cette horloge, même
	// quand la main est rendue : elles arrivent « en direct ». Le premier vrai geste dans l'écran
	// arrête la visite ; la pastille sous le téléphone la reprend, ou la rejoue depuis le début.
	const DUREE = 50000;
	const EVENEMENTS: ReadonlyArray<readonly [number, keyof typeof TRAVAUX]> = [
		[700, 'depot'],
		[6200, 'vidal'],
		[16000, 'bati']
	];
	let horloge = 0,
		prochain = 0,
		attentes: Array<{ t: number; ok: () => void; non: (raison: unknown) => void }> = [],
		jeton = 0,
		demarree = false;
	let visite: Mode = reduit ? 'pret' : 'joue',
		hors = true,
		survol = false,
		cache = document.hidden;
	const doigt = $('[data-doigt]'),
		voile = $('[data-voile]');
	const pastille = vit.querySelector<HTMLElement>('[data-visite]'),
		pastilleTexte = vit.querySelector<HTMLElement>('[data-visite-texte]'),
		arc = vit.querySelector<SVGElement>('[data-arc]');
	const LIBELLE: Record<Mode, readonly [string, string]> = {
		joue: ['Visite guidée', 'Mettre la visite en pause'],
		survol: ['À vous : tout se touche', 'Mettre la visite en pause'],
		pause: ['Reprendre la visite', 'Reprendre la visite'],
		main: ['Vous avez la main', 'Revoir la visite depuis le début'],
		revoir: ['Revoir la visite', 'Revoir la visite depuis le début'],
		pret: ['Lancer la visite', 'Lancer la visite guidée']
	};
	function peindreVisite() {
		if (!pastille || !pastilleTexte) return;
		const m: Mode = visite === 'joue' && survol ? 'survol' : visite;
		if (pastille.dataset.mode === m) return;
		pastille.dataset.mode = m;
		pastilleTexte.textContent = LIBELLE[m][0];
		pastille.setAttribute('aria-label', LIBELLE[m][1]);
	}
	const figee = () => hors || cache || visite === 'pause' || (visite === 'joue' && survol);
	let avant = performance.now();
	const tic = setInterval(() => {
		const t = performance.now(),
			dt = Math.min(250, t - avant);
		avant = t;
		if (!demarree || figee()) return;
		horloge += dt;
		while (prochain < EVENEMENTS.length && horloge >= (EVENEMENTS[prochain]?.[0] ?? Infinity)) {
			const ev = EVENEMENTS[prochain++];
			if (ev) lancer(ev[1]);
		}
		if (attentes.length)
			attentes = attentes.filter((a) => {
				if (horloge >= a.t) {
					a.ok();
					return false;
				}
				return true;
			});
		if (visite === 'joue' && arc)
			arc.style.strokeDashoffset = (100 - Math.min(100, (horloge / DUREE) * 100)).toFixed(1);
	}, 50);
	defaires.push(() => clearInterval(tic));
	function attendre(ms: number): Promise<void> {
		const j = jeton;
		return new Promise((ok, non) => {
			attentes.push({
				t: horloge + ms,
				ok: () => (j === jeton ? ok() : non(ARRET)),
				non
			});
		});
	}
	function arreterVisite() {
		jeton++;
		attentes.splice(0).forEach((a) => a.non(ARRET));
		doigt.classList.remove('vu', 'appuie', 'onde');
	}

	// Le doigt fantôme : il se pose sur la cible, appuie, et c'est le vrai bouton qui répond.
	function local(el: Element) {
		const re = ecran.getBoundingClientRect(),
			r = el.getBoundingClientRect(),
			k = re.width / ecran.offsetWidth || 1;
		return { x: (r.left + r.width / 2 - re.left) / k, y: (r.top + r.height / 2 - re.top) / k };
	}
	function poserDoigt(p: { x: number; y: number }) {
		doigt.style.translate = p.x.toFixed(1) + 'px ' + p.y.toFixed(1) + 'px';
	}
	function onde() {
		doigt.classList.remove('onde');
		void doigt.offsetWidth;
		doigt.classList.add('onde');
	}
	async function toucher(el: HTMLElement | null | undefined) {
		if (!el) return;
		poserDoigt(local(el));
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
	async function glisser(cle: Cle) {
		const c = $(`[data-dos="${cle}"] [data-carte]`),
			p = local(c);
		p.x += 70;
		poserDoigt(p);
		doigt.classList.add('vu');
		await attendre(300);
		doigt.classList.add('appuie');
		await attendre(160);
		await balayeurs[cle]?.((v) => poserDoigt({ x: p.x + v, y: p.y }));
		doigt.classList.remove('appuie', 'vu');
	}
	const trouver = (sel: string) => ecran.querySelector<HTMLElement>(sel);

	// Le scénario : Plume au travail, puis les gestes qui comptent, un par un.
	async function jouer() {
		await attendre(3900);
		await toucher(relBouton); // Retenir le prochain rappel…
		await attendre(700);
		await toucher(relBouton); // … et le laisser repartir.
		await attendre(4000); // Le virement arrive, le montant descend.
		await toucher(trouver('[data-pousser="jamais"]'));
		await attendre(2600);
		await toucher(trouver('[data-retour]'));
		await attendre(600);
		await toucher(trouver('[data-onglet="dossiers"]'));
		await attendre(1900);
		await glisser('durand'); // Relancer d'un balayage.
		await attendre(3800); // Pendant ce temps, Bâti-Sud arrive.
		await toucher(trouver('[data-dos="bati"] [data-demarrer]'));
		await attendre(2400);
		await toucher(trouver('[data-onglet="clients"]'));
		await attendre(2600);
		await toucher(trouver('[data-client="vidal"]'));
		await attendre(2400);
		await toucher(trouver('.v-fab'));
		await attendre(700);
		await toucher(trouver('[data-q="Qui me doit le plus ?"]'));
		await attendre(3400);
		await toucher(trouver('[data-q="Combien de pénalités ?"]'));
		await attendre(2600);
		const cites = $$('.v-conv .v-cite');
		await toucher(cites[cites.length - 1]);
		await attendre(2400);
		await toucher(trouver('[data-retour]'));
		await attendre(2600);
	}
	async function enBoucle() {
		const j = jeton;
		while (j === jeton && !arrete) {
			try {
				await jouer();
			} catch (e) {
				if (e === ARRET) return;
				throw e;
			}
			if (j !== jeton) return;
			await renouveler();
		}
	}

	// Entre deux tours, l'écran revient à son état du matin, sous un voile.
	function reinitialiser() {
		generation++;
		travail = null;
		file = [];
		carte.classList.remove('travaille');
		plumeCarte?.classList.remove('plume-travaille');
		liste.innerHTML = '';
		faits.innerHTML = FAITS0;
		sous.textContent = 'Au repos';
		Object.assign(etat, ETAT0);
		elM.innerHTML = grand(etat.du);
		elAge1.textContent = euros(etat.age1);
		elAge3.textContent = euros(etat.age3);
		elSous.textContent = etat.retard + ' factures en retard';
		elSous.style.opacity = '';
		b1.style.setProperty('--f', '0.6');
		b3.style.setProperty('--f', '24');
		ile.classList.remove('ouverte');
		$('[data-client="bati"]').classList.add('cache');
		$('[data-dos="bati"]').classList.add('cache');
		$('[data-pastille]').hidden = true;
		auto.checked = true;
		fil++;
		conv.innerHTML = CONV0;
		champ.value = '';
		occupe = false;
		suggestions.classList.remove('occupe');
		fermerPlume();
		retour();
		montrer('aujourdhui');
		remarques = {};
		indique = false;
		taire();
		$$('[data-dos] [data-carte]').forEach((c) => {
			c.style.transition = '';
			c.style.transform = '';
		});
		$$('[data-dos]').forEach((dos) => dos.classList.remove('glisse'));
		humeur('');
		maj();
		horloge = 0;
		prochain = 0;
		if (arc) arc.style.strokeDashoffset = '100';
	}
	function renouveler(): Promise<void> {
		return new Promise((fin) => {
			voile.classList.add('couvre');
			plus(() => {
				reinitialiser();
				plus(() => {
					voile.classList.remove('couvre');
					fin();
				}, 140);
			}, 340);
		});
	}
	function rejouer() {
		arreterVisite();
		visite = 'joue';
		peindreVisite();
		const j = jeton;
		void renouveler().then(() => {
			if (j === jeton) void enBoucle();
		});
	}

	// Le premier vrai geste rend la main ; la pastille met en pause, reprend ou rejoue.
	let mainT: ReturnType<typeof setTimeout> | undefined;
	function prendreLaMain(e: Event) {
		if (!e.isTrusted || (visite !== 'joue' && visite !== 'pause' && visite !== 'pret')) return;
		arreterVisite();
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
	ecouter(ecran, 'click', prendreLaMain, true);
	ecouter(ecran, 'keydown', prendreLaMain, true);
	if (pastille)
		ecouter(pastille, 'click', () => {
			if (visite === 'joue') visite = 'pause';
			else if (visite === 'pause') visite = 'joue';
			else {
				rejouer();
				return;
			}
			peindreVisite();
		});
	ecouter<PointerEvent>(tel, 'pointerenter', (e) => {
		if (e.pointerType === 'mouse') {
			survol = true;
			peindreVisite();
		}
	});
	ecouter<PointerEvent>(tel, 'pointerleave', (e) => {
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
		if (visite === 'joue') void enBoucle();
	}
	if ('IntersectionObserver' in window) {
		const guetteur = new IntersectionObserver(
			(entrees) => {
				hors = !entrees[0]?.isIntersecting;
				if (!hors) demarrer();
			},
			{ threshold: 0.35 }
		);
		guetteur.observe(tel);
		defaires.push(() => guetteur.disconnect());
	} else {
		hors = false;
		demarrer();
	}
	peindreVisite();
	plus(() => plume && !travail && humeur(''), 3200);

	// Le relief, lissé ; moins fort quand la souris vise l'écran, pour viser juste.
	const cible = { x: 0, y: 0 },
		cur = { x: 0, y: 0 };
	let boucle: number | null = null;
	function relief() {
		boucle = null;
		if (arrete || !tel) return;
		cur.x += (cible.x - cur.x) * 0.09;
		cur.y += (cible.y - cur.y) * 0.09;
		tel.style.transform =
			'rotateY(' + (cur.x * 12).toFixed(2) + 'deg) rotateX(' + (-cur.y * 9).toFixed(2) + 'deg)';
		if (plumeBloc)
			plumeBloc.style.translate = (cur.x * 16).toFixed(1) + 'px ' + (cur.y * 10).toFixed(1) + 'px';
		if (Math.abs(cible.x - cur.x) > 0.0006 || Math.abs(cible.y - cur.y) > 0.0006)
			boucle = requestAnimationFrame(relief);
	}
	function relancerRelief() {
		if (!boucle) boucle = requestAnimationFrame(relief);
	}
	const tete = racine.querySelector<HTMLElement>('.tete');
	if (souris && tete) {
		ecouter<PointerEvent>(tete, 'pointermove', (e) => {
			if (e.pointerType !== 'mouse' || !ecran) return;
			const r = vit.getBoundingClientRect(),
				f = e.target instanceof Node && tel.contains(e.target) ? 0.18 : 0.5;
			cible.x =
				Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2))) *
				f;
			cible.y =
				Math.max(
					-1,
					Math.min(1, (e.clientY - (r.top + r.height * 0.4)) / (window.innerHeight / 2))
				) * f;
			const re = ecran.getBoundingClientRect();
			ecran.style.setProperty('--gx', (e.clientX - re.left).toFixed(0) + 'px');
			ecran.style.setProperty('--gy', (e.clientY - re.top).toFixed(0) + 'px');
			relancerRelief();
		});
		ecouter(tete, 'pointerleave', () => {
			cible.x = cible.y = 0;
			relancerRelief();
		});
	}

	return () => {
		arrete = true;
		arreterVisite();
		clearTimeout(bulleT);
		clearTimeout(humeurT);
		clearTimeout(mainT);
		if (boucle) cancelAnimationFrame(boucle);
		defaires.forEach((d) => d());
	};
}
