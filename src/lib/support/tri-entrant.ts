/**
 * LE TRI D'UN E-MAIL ENTRANT (16/10/2026, spec du service client § 5.2) — une table de
 * vérité, testée, hors de Convex.
 *
 * ⚠️ L'EXPÉDITEUR D'UN E-MAIL NE SE CROIT PAS. Il n'est prouvé que si l'adresse est celle,
 * vérifiée, d'un titulaire ET que DMARC vaut « pass » ; une forme d'authentification
 * inconnue vaut « non vérifié ». Un message non prouvé n'entre jamais dans le fil du
 * gérant : il va à l'équipe seule, marqué. Un inconnu ne reçoit aucune réponse
 * automatique (ni rétrodiffusion, ni quatrième surface vers un tiers).
 */

export type AdresseLue = { readonly genre: 'BONJOUR' } | { readonly genre: 'FIL'; readonly jeton: string };

/** Le domaine parent du domaine de réception : `aide.letikette.com` → `letikette.com`. */
function parent(domaine: string): string {
	const morceaux = domaine.split('.');
	return morceaux.length > 2 ? morceaux.slice(1).join('.') : domaine;
}

/** Seules `bonjour@` et `fil-<jeton>@` se lisent ; toute autre adresse est ignorée. */
export function adresseLue(destinataires: readonly string[], domaineDeReception: string): AdresseLue | null {
	const domaine = domaineDeReception.toLowerCase();
	const domaines = new Set([domaine, parent(domaine)]);
	for (const brute of destinataires) {
		const adresse = (/<([^>]+)>/.exec(brute)?.[1] ?? brute).trim().toLowerCase();
		const [local, sonDomaine] = adresse.split('@');
		if (local === undefined || sonDomaine === undefined || !domaines.has(sonDomaine)) continue;
		if (local === 'bonjour') return { genre: 'BONJOUR' };
		const jeton = /^fil-([a-z0-9]{8,64})$/.exec(local)?.[1];
		if (jeton !== undefined && sonDomaine === domaine) return { genre: 'FIL', jeton };
	}
	return null;
}

/** Le résultat d'une vérification, quelle que soit sa forme : « pass », `{ result: 'PASS' }`… */
function resultat(valeur: unknown): string {
	if (typeof valeur === 'string') return valeur.toLowerCase();
	if (typeof valeur === 'object' && valeur !== null) {
		const objet = valeur as Record<string, unknown>;
		for (const cle of ['result', 'status', 'verdict']) {
			if (typeof objet[cle] === 'string') return (objet[cle] as string).toLowerCase();
		}
	}
	return 'inconnu';
}

export type Authentification = Readonly<Record<string, unknown>> | undefined;

export function dmarcPasse(authentification: Authentification): boolean {
	return authentification !== undefined && resultat(authentification.dmarc) === 'pass';
}

/** SPF, DKIM et DMARC échouent tous trois : le message va aux indésirables. */
export function toutEchoue(authentification: Authentification): boolean {
	if (authentification === undefined) return false;
	return ['spf', 'dkim', 'dmarc'].every((cle) => resultat(authentification[cle]) === 'fail');
}

/** `Auto-Submitted`, `X-Autoreply`, `Precedence: bulk|junk|list|auto_reply`. */
export function estReponseAutomatique(enTetes: Readonly<Record<string, string | undefined>>): boolean {
	const lire = (cle: string) => (enTetes[cle] ?? '').trim().toLowerCase();
	const auto = lire('auto-submitted');
	if (auto !== '' && auto !== 'no') return true;
	if (lire('x-autoreply') !== '' || lire('x-autorespond') !== '') return true;
	return ['bulk', 'junk', 'list', 'auto_reply'].includes(lire('precedence'));
}

export type ExpediteurConnu = 'TITULAIRE_VERIFIE' | 'TITULAIRE_NON_VERIFIE' | 'PROSPECT' | 'INCONNU';

export interface EntreeDuTri {
	readonly adresse: AdresseLue | null;
	readonly automatique: boolean;
	readonly dmarc: boolean;
	readonly toutEchoue: boolean;
	/** Ce que l'adresse de l'expéditeur est pour nous. */
	readonly expediteur: ExpediteurConnu;
	/** Le jeton désigne une conversation qui existe. */
	readonly conversationDuJeton: boolean;
	/** L'expéditeur est l'auteur de cette conversation (ou un administrateur de son établissement). */
	readonly jetonDeLAuteur: boolean;
}

export type Classement =
	| 'IGNORE'
	| 'INDESIRABLE'
	| 'FIL_VERIFIE'
	| 'FIL_NON_VERIFIE'
	| 'NOUVELLE_VERIFIEE'
	| 'NOUVELLE_NON_VERIFIEE'
	| 'PROSPECT'
	| 'A_TRIER';

export function classerEntrant(e: EntreeDuTri): Classement {
	if (e.adresse === null || e.automatique) return 'IGNORE';
	if (e.toutEchoue) return 'INDESIRABLE';
	if (e.adresse.genre === 'FIL') {
		if (!e.conversationDuJeton) return 'A_TRIER';
		return e.dmarc && e.jetonDeLAuteur && e.expediteur === 'TITULAIRE_VERIFIE'
			? 'FIL_VERIFIE'
			: 'FIL_NON_VERIFIE';
	}
	if (e.expediteur === 'TITULAIRE_VERIFIE') return e.dmarc ? 'NOUVELLE_VERIFIEE' : 'NOUVELLE_NON_VERIFIEE';
	if (e.expediteur === 'TITULAIRE_NON_VERIFIE') return 'NOUVELLE_NON_VERIFIEE';
	if (e.expediteur === 'PROSPECT') return 'PROSPECT';
	return 'A_TRIER';
}
