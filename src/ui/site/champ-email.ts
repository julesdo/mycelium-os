import { mouvementReduit } from './gestes';

/**
 * LES CHAMPS D'E-MAIL DU SITE PUBLIC (transplantés de la maquette V26).
 *
 * On ne reproche rien pendant la frappe : la coche apparaît dès que l'adresse tient, l'erreur
 * n'est dite qu'en quittant le champ ou en envoyant, et elle dit quoi corriger. Une faute sur un
 * domaine courant se propose en correction d'un toucher.
 *
 * ⚠️ L'ADRESSE NE PASSE JAMAIS PAR L'URL : `auEnvoi` la remet à la page, qui ouvre l'inscription
 * en la portant dans l'état de l'historique. Une adresse dans l'URL finirait dans les journaux et
 * la mesure d'audience.
 */
const DOMAINES = [
	'gmail.com',
	'orange.fr',
	'wanadoo.fr',
	'free.fr',
	'sfr.fr',
	'laposte.net',
	'hotmail.com',
	'hotmail.fr',
	'outlook.com',
	'outlook.fr',
	'live.fr',
	'yahoo.com',
	'yahoo.fr',
	'icloud.com',
	'me.com',
	'bbox.fr',
	'neuf.fr',
	'protonmail.com',
	'proton.me'
];

function distance(a: string, b: string): number {
	const l: number[] = [];
	for (let i = 0; i <= b.length; i++) l[i] = i;
	for (let i = 1; i <= a.length; i++) {
		let prec = l[0] ?? 0;
		l[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const t = l[j] ?? 0;
			l[j] = Math.min(t + 1, (l[j - 1] ?? 0) + 1, prec + (a[i - 1] === b[j - 1] ? 0 : 1));
			prec = t;
		}
	}
	return l[b.length] ?? 0;
}

export function suggestionDAdresse(adresse: string): string | null {
	const at = adresse.lastIndexOf('@');
	if (at < 1) return null;
	const dom = adresse.slice(at + 1).toLowerCase();
	if (!dom || DOMAINES.includes(dom)) return null;
	let mieux: string | null = null,
		d = 3;
	DOMAINES.forEach((k) => {
		const x = distance(dom, k);
		if (x < d) {
			d = x;
			mieux = k;
		}
	});
	return mieux && d <= 2 ? adresse.slice(0, at + 1) + mieux : null;
}

export function problemeDAdresse(v: string): string | null {
	if (!v) return 'Indiquez votre adresse e-mail.';
	if (/\s/.test(v)) return 'Retirez les espaces de l’adresse.';
	const at = v.indexOf('@');
	if (at < 0) return 'Il manque le @ de votre adresse.';
	if (at === 0) return 'Il manque le début de l’adresse, avant le @.';
	const dom = v.slice(at + 1);
	if (!dom) return 'Il manque la fin de l’adresse, par exemple @votre-entreprise.fr.';
	if (dom.includes('@')) return 'Votre adresse contient deux @.';
	if (!/^[^.\s]+(\.[^.\s]+)+$/.test(dom) || !/\.[a-z]{2,}$/i.test(dom))
		return 'Il manque la fin de l’adresse, par exemple @votre-entreprise.fr.';
	return null;
}

function vibrer(ms: number | number[]): void {
	try {
		navigator.vibrate?.(ms);
	} catch {
		/* refusé dans ce cadre */
	}
}

export function demarrerChampsEmail(
	racine: HTMLElement,
	auEnvoi: (adresse: string) => void
): () => void {
	const reduit = mouvementReduit();
	const defaires: Array<() => void> = [];
	racine.querySelectorAll<HTMLFormElement>('[data-inscription]').forEach((f) => {
		const champ = f.querySelector('input'),
			aide = racine.querySelector<HTMLElement>(
				'#' + (champ?.getAttribute('aria-describedby') ?? '')
			),
			bouton = f.querySelector<HTMLElement>('.cta'),
			effacer = f.querySelector<HTMLElement>('.champ-effacer'),
			boite = f.querySelector<HTMLElement>('.champ');
		if (!champ || !aide || !bouton || !effacer || !boite) return;
		let minuterie: ReturnType<typeof setTimeout> | undefined,
			etaitValide = false;
		function dire(html: string, alerte?: boolean) {
			if (!champ || !aide) return;
			aide.innerHTML = html;
			aide.classList.remove('aide-entree');
			void aide.offsetWidth;
			if (html) aide.classList.add('aide-entree');
			f.classList.toggle('erreur', !!alerte);
			if (alerte) champ.setAttribute('aria-invalid', 'true');
			else champ.removeAttribute('aria-invalid');
		}
		function proposer(s: string) {
			const echap = s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
			dire(
				'<button type="button" class="correction">Vous vouliez dire <b>' + echap + '</b> ?</button>'
			);
			aide?.querySelector('.correction')?.addEventListener('click', () => {
				if (!champ) return;
				champ.value = s;
				maj();
				dire('');
				champ.focus();
			});
		}
		function maj() {
			if (!champ || !bouton) return;
			const v = champ.value.trim(),
				ok = !problemeDAdresse(v);
			f.classList.toggle('rempli', champ.value.length > 0);
			f.classList.toggle('valide', ok);
			if (ok && !etaitValide) {
				bouton.classList.remove('reflet');
				void bouton.offsetWidth;
				bouton.classList.add('reflet');
				vibrer(8);
				if (f.classList.contains('erreur')) dire('');
			}
			etaitValide = ok;
		}
		const auClavier = () => {
			maj();
			if (f.classList.contains('erreur') && !problemeDAdresse(champ.value.trim())) dire('');
			clearTimeout(minuterie);
			minuterie = setTimeout(() => {
				const s = suggestionDAdresse(champ.value.trim());
				if (s) proposer(s);
				else if (aide.querySelector('.correction')) dire('');
			}, 700);
		};
		const enSortant = () => {
			const v = champ.value.trim();
			if (!v || aide.querySelector('.correction')) return;
			const p = problemeDAdresse(v);
			if (p) dire('<span class="signe" aria-hidden="true">!</span>' + p, true);
		};
		const garderLeFocus = (e: PointerEvent) => e.preventDefault();
		const vider = () => {
			champ.value = '';
			maj();
			dire('');
			champ.focus();
		};
		const viserLeChamp = (e: MouseEvent) => {
			if (e.target === boite) champ.focus();
		};
		const envoyer = (e: SubmitEvent) => {
			e.preventDefault();
			const v = champ.value.trim(),
				p = problemeDAdresse(v);
			if (p) {
				dire('<span class="signe" aria-hidden="true">!</span>' + p, true);
				if (!reduit) {
					f.classList.remove('secoue');
					void f.offsetWidth;
					f.classList.add('secoue');
				}
				vibrer([12, 40, 12]);
				champ.focus();
				return;
			}
			champ.value = v;
			vibrer(14);
			auEnvoi(v);
		};
		const finDeSecousse = (e: AnimationEvent) => {
			if (e.animationName === 'site-secoue') f.classList.remove('secoue');
		};
		champ.addEventListener('input', auClavier);
		champ.addEventListener('blur', enSortant);
		effacer.addEventListener('pointerdown', garderLeFocus);
		effacer.addEventListener('click', vider);
		boite.addEventListener('click', viserLeChamp);
		f.addEventListener('submit', envoyer);
		f.addEventListener('animationend', finDeSecousse);
		maj();
		defaires.push(() => {
			clearTimeout(minuterie);
			champ.removeEventListener('input', auClavier);
			champ.removeEventListener('blur', enSortant);
			effacer.removeEventListener('pointerdown', garderLeFocus);
			effacer.removeEventListener('click', vider);
			boite.removeEventListener('click', viserLeChamp);
			f.removeEventListener('submit', envoyer);
			f.removeEventListener('animationend', finDeSecousse);
		});
	});
	return () => defaires.forEach((d) => d());
}
