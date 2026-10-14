import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * L'INVITATION À INSTALLER L'APPLICATION, SUR ANDROID (15/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CHROME PRÊTE SON BOUTON D'INSTALLATION UNE FOIS, ET IL FAUT LE RETENIR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « proposer à tous les Android une magnifique et discrète
 * notification, quand ils n'ont pas l'app, de l'installer directement ». Chrome
 * annonce qu'un site s'installe par `beforeinstallprompt` ; l'événement retenu,
 * son `prompt()` ouvre la vraie fenêtre d'installation d'Android, au toucher de
 * notre bouton. Il part TÔT, parfois avant que la coquille de l'application ne
 * soit chargée : une amorce dans le `<head>` le retient dès la première ligne
 * (`AMORCE_INSTALLATION`), et ce module prend le relais.
 *
 * Sur iOS, aucun navigateur ne donne cet événement : l'installation ne se fait
 * qu'à la main (Partager › Sur l'écran d'accueil). Rien ne s'y affiche.
 *
 * ⚠️ ELLE NE REVIENT PAS SANS CESSE. « Plus tard » la fait taire trois semaines ;
 * une fois l'application installée, plus jamais. Et elle attend quelques secondes
 * après l'ouverture : elle ne passe pas devant ce qu'on est venu lire.
 */

/** L'événement de Chrome, que le DOM ne type pas encore. */
interface EvenementInstallation extends Event {
	prompt(): Promise<void>;
	readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
	interface Window {
		__invitationInstallation?: EvenementInstallation | null;
	}
}

const CLE = 'letikette:installation';
/** « Plus tard » : trois semaines de silence. */
const SILENCE_MS = 21 * 24 * 60 * 60 * 1000;
/** Le temps d'ouvrir ce qu'on est venu voir, avant de proposer quoi que ce soit. */
const DELAI_MS = 6000;

/**
 * L'AMORCE, POSÉE DANS LE `<head>` (`routes/__root.tsx`) : elle retient l'événement
 * avant tout script de l'application, et retire la petite barre de Chrome, que
 * notre invitation remplace.
 */
export const AMORCE_INSTALLATION =
	"window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__invitationInstallation=e;});";

const abonnes = new Set<() => void>();
function prevenir() {
	for (const abonne of abonnes) abonne();
}

let branche = false;
/** Les événements qui suivent l'amorce : une nouvelle offre, ou l'application installée. */
function brancher() {
	if (branche || typeof window === 'undefined') return;
	branche = true;
	window.addEventListener('beforeinstallprompt', (evenement) => {
		evenement.preventDefault();
		window.__invitationInstallation = evenement as EvenementInstallation;
		prevenir();
	});
	window.addEventListener('appinstalled', () => {
		window.__invitationInstallation = null;
		memoriser('installee');
		prevenir();
	});
}

function souscrire(abonne: () => void) {
	brancher();
	abonnes.add(abonne);
	return () => {
		abonnes.delete(abonne);
	};
}

function memoriser(etat: 'installee' | 'plus-tard') {
	try {
		localStorage.setItem(CLE, etat === 'installee' ? 'installee' : String(Date.now()));
	} catch {
		/* stockage indisponible : l'invitation reviendra à la prochaine ouverture */
	}
}

/** Faut-il se taire ? Installée, ou écartée il y a moins de trois semaines. */
function silencieuse(): boolean {
	try {
		const valeur = localStorage.getItem(CLE);
		if (valeur === null) return false;
		if (valeur === 'installee') return true;
		const le = Number(valeur);
		return Number.isFinite(le) && Date.now() - le < SILENCE_MS;
	} catch {
		return false;
	}
}

/** Un téléphone Android, dans le navigateur (pas déjà dans l'application installée). */
function proposable(): boolean {
	if (!/Android/i.test(navigator.userAgent)) return false;
	return !window.matchMedia('(display-mode: standalone)').matches;
}

/** L'offre de Chrome est-elle là, et a-t-on le droit de la montrer ? */
function lireOffre(): boolean {
	return Boolean(window.__invitationInstallation) && proposable() && !silencieuse();
}

export function useInvitationInstallation(actif: boolean): {
	readonly montrer: boolean;
	readonly installer: () => void;
	readonly plusTard: () => void;
} {
	const offre = useSyncExternalStore(souscrire, lireOffre, () => false);
	const [delaiPasse, setDelaiPasse] = useState(false);

	// Quelques secondes après l'ouverture : la minuterie écrit, l'effet ne fait que la poser.
	useEffect(() => {
		if (!actif) return;
		const minuterie = setTimeout(() => setDelaiPasse(true), DELAI_MS);
		return () => clearTimeout(minuterie);
	}, [actif]);

	return {
		montrer: actif && offre && delaiPasse,
		installer: () => {
			const evenement = window.__invitationInstallation;
			if (!evenement) return;
			// Une offre ne s'ouvre qu'une fois : on la rend tout de suite.
			window.__invitationInstallation = null;
			prevenir();
			void evenement
				.prompt()
				.then(() => evenement.userChoice)
				.then(
					({ outcome }) => memoriser(outcome === 'accepted' ? 'installee' : 'plus-tard'),
					() => memoriser('plus-tard')
				);
		},
		plusTard: () => {
			memoriser('plus-tard');
			prevenir();
		}
	};
}
