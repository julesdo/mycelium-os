/**
 * LE DÉPÔT GITHUB, VU PAR LE CMS DU BLOG (19/10/2026).
 *
 * Le blog reste des fichiers `content/blog/*.mdx` dans le dépôt : GitHub est la base de
 * données, et chaque publication est un commit sur la branche que Vercel déploie. Le CMS
 * ne passe que par l'API « contents » de GitHub, avec un jeton à portée fine
 * (`GITHUB_CMS_TOKEN` : ce seul dépôt, « Contents : Read and write »), qui ne quitte
 * jamais Convex.
 *
 * Module pur : `fetch`, `atob`, `btoa` et `TextEncoder`, présents dans les deux
 * environnements de Convex.
 */

export interface ConfigurationDepot {
	readonly jeton: string;
	/** « propriétaire/dépôt ». */
	readonly depot: string;
	readonly branche: string;
}

export const DEPOT_PAR_DEFAUT = 'julesdo/mycelium-os';
export const BRANCHE_PAR_DEFAUT = 'main';
export const DOSSIER_DU_BLOG = 'content/blog';

/** La configuration lue dans l'environnement ; `null` sans jeton : le CMS dort. */
export function configurationDepuis(
	env: Record<string, string | undefined>
): ConfigurationDepot | null {
	const jeton = env.GITHUB_CMS_TOKEN;
	if (jeton === undefined || jeton.trim() === '') return null;
	return {
		jeton: jeton.trim(),
		depot: env.GITHUB_CMS_DEPOT?.trim() || DEPOT_PAR_DEFAUT,
		branche: env.GITHUB_CMS_BRANCHE?.trim() || BRANCHE_PAR_DEFAUT
	};
}

/** Une erreur de GitHub, dite au fondateur, sans jamais citer le jeton. */
export class ErreurGitHub extends Error {
	constructor(
		message: string,
		readonly statut: number
	) {
		super(message);
	}
}

function messageDuStatut(statut: number): string {
	if (statut === 401)
		return 'GitHub refuse le jeton : il a expiré ou il est faux (GITHUB_CMS_TOKEN).';
	if (statut === 403) {
		return 'GitHub refuse l’accès : le jeton doit pouvoir lire et écrire le contenu de ce dépôt.';
	}
	if (statut === 404) return 'Le dépôt, la branche ou le fichier est introuvable sur GitHub.';
	if (statut === 409 || statut === 422) {
		return 'L’article a changé sur GitHub depuis son ouverture : rechargez-le avant de publier.';
	}
	return `GitHub a répondu ${statut}.`;
}

async function appeler(
	config: ConfigurationDepot,
	chemin: string,
	init: { method?: string; body?: unknown } = {}
): Promise<unknown> {
	const reponse = await fetch(`https://api.github.com/repos/${config.depot}/${chemin}`, {
		method: init.method ?? 'GET',
		headers: {
			Authorization: `Bearer ${config.jeton}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'letikette-cms',
			...(init.body === undefined ? {} : { 'Content-Type': 'application/json' })
		},
		...(init.body === undefined ? {} : { body: JSON.stringify(init.body) })
	});
	if (!reponse.ok) throw new ErreurGitHub(messageDuStatut(reponse.status), reponse.status);
	return reponse.json();
}

/** Le texte UTF-8 d'un contenu base64 de GitHub (avec ses retours à la ligne). */
export function depuisBase64(base64: string): string {
	const binaire = atob(base64.replace(/\s/g, ''));
	const octets = Uint8Array.from(binaire, (c) => c.charCodeAt(0));
	return new TextDecoder().decode(octets);
}

/** Le base64 d'un texte UTF-8, par morceaux pour ne pas déborder la pile. */
export function versBase64(texte: string): string {
	const octets = new TextEncoder().encode(texte);
	let binaire = '';
	for (let i = 0; i < octets.length; i += 0x8000) {
		binaire += String.fromCharCode(...octets.subarray(i, i + 0x8000));
	}
	return btoa(binaire);
}

export interface FichierDuBlog {
	readonly nom: string;
	readonly chemin: string;
	readonly sha: string;
}

/** Les fichiers `.mdx` du dossier du blog, sur la branche déployée. */
export async function listerLesArticles(config: ConfigurationDepot): Promise<FichierDuBlog[]> {
	const entrees = (await appeler(
		config,
		`contents/${DOSSIER_DU_BLOG}?ref=${encodeURIComponent(config.branche)}`
	)) as { name: string; path: string; sha: string; type: string }[];
	return entrees
		.filter((e) => e.type === 'file' && e.name.endsWith('.mdx'))
		.map((e) => ({ nom: e.name, chemin: e.path, sha: e.sha }));
}

/** Le texte d'un fichier et son empreinte, qu'une mise à jour doit rendre. */
export async function lireLeFichier(
	config: ConfigurationDepot,
	chemin: string
): Promise<{ readonly texte: string; readonly sha: string }> {
	const fichier = (await appeler(
		config,
		`contents/${chemin}?ref=${encodeURIComponent(config.branche)}`
	)) as { content: string; sha: string };
	return { texte: depuisBase64(fichier.content), sha: fichier.sha };
}

/**
 * Écrit un fichier : un commit sur la branche. Sans `sha`, le fichier est créé (GitHub
 * refuse s'il existe déjà) ; avec, il est mis à jour (GitHub refuse s'il a changé).
 */
export async function ecrireLeFichier(
	config: ConfigurationDepot,
	chemin: string,
	texte: string,
	message: string,
	sha?: string
): Promise<{ readonly commit: string; readonly url: string; readonly sha: string }> {
	const reponse = (await appeler(config, `contents/${chemin}`, {
		method: 'PUT',
		body: {
			message,
			content: versBase64(texte),
			branch: config.branche,
			...(sha === undefined ? {} : { sha })
		}
	})) as { commit: { sha: string; html_url: string }; content: { sha: string } };
	return { commit: reponse.commit.sha, url: reponse.commit.html_url, sha: reponse.content.sha };
}
