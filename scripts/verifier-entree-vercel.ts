/**
 * Vérifie que Vercel appellera le point d'entrée comme le serveur l'attend.
 *
 * POURQUOI CE SCRIPT EXISTE. La construction passait, la fonction se déployait,
 * et chaque requête mourait en `TypeError: Invalid URL, input: '/'`. La cause
 * n'est visible ni à la compilation, ni au lint, ni dans un test qui appelle le
 * gestionnaire à la main : elle tient entièrement à la façon dont la plateforme
 * choisit de l'appeler.
 *
 * `@vercel/node` inspecte le module et prend une branche sur deux :
 *
 *     const isWebHandler =
 *       HTTP_METHODS.some(m => typeof listener[m] === 'function') ||
 *       typeof listener.fetch === 'function';
 *
 * Sans `fetch`, c'est la branche Node : le gestionnaire reçoit `(req, res)`, et
 * `req.url` vaut le chemin seul — `/`. Le serveur, lui, attend une `Request`
 * Web. Avec `fetch`, la plateforme construit elle-même la requête à partir du
 * chemin ET de l'hôte, et l'URL est absolue.
 *
 * Ma première sonde passait une `Request` Web toute faite. Elle a répondu 200 et
 * n'a donc rien prouvé : elle validait le serveur, pas le pont. C'est la leçon
 * que ce fichier fige — on reproduit la convention d'appel de la plateforme,
 * pas celle qui arrange.
 *
 * DEUX CONTRÔLES, du plus solide au plus fidèle :
 *
 *   1. **Le module expose-t-il `fetch` ?** C'est l'invariant, écrit ici en clair
 *      et indépendant de toute copie de code tiers. C'est lui qui aurait
 *      attrapé la panne.
 *   2. **Une vraie requête HTTP traverse-t-elle ?** Le pont ci-dessous est
 *      recopié de `@vercel/node/dist/bundling-handler.js`. Une copie peut
 *      dériver si la plateforme change : elle ne remplace pas le contrôle 1,
 *      elle y ajoute la preuve que la réponse se réécrit bien vers Node.
 *
 * Usage : bun scripts/verifier-entree-vercel.ts
 */

import http from 'node:http';
import { Readable } from 'node:stream';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const ENTREE = 'api/index.js';
const SERVEUR_CONSTRUIT = 'dist/server/server.js';

/** Les sept méthodes que la plateforme route vers un gestionnaire web. */
const METHODES = ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'DELETE', 'PATCH'];

type GestionnaireWeb = (requete: Request) => Response | Promise<Response>;

/** La plateforme déballe `.default` jusqu'à cinq fois avant d'inspecter. */
function deballer(mod: unknown): unknown {
	let courant = mod;
	for (let i = 0; i < 5; i++) {
		if (
			courant !== null &&
			(typeof courant === 'object' || typeof courant === 'function') &&
			'default' in courant &&
			courant.default
		) {
			courant = courant.default;
		} else break;
	}
	return courant;
}

/**
 * Lit une propriété exportée si c'est une fonction.
 *
 * Un module chargé dynamiquement n'a pas de forme connue : c'est précisément ce
 * qu'on inspecte. Le seul point de contact avec le typage est ici, une fois.
 */
function exportFonction(listener: unknown, nom: string): GestionnaireWeb | undefined {
	if (listener === null || (typeof listener !== 'object' && typeof listener !== 'function')) {
		return undefined;
	}
	const valeur = (listener as Record<string, unknown>)[nom];
	return typeof valeur === 'function' ? (valeur as GestionnaireWeb) : undefined;
}

/** Le pont web → Node, tel que la plateforme le construit. */
function pontWeb(listener: unknown) {
	const parMethode: Record<string, GestionnaireWeb> = Object.create(null);
	const global = exportFonction(listener, 'fetch');
	if (global) {
		for (const m of METHODES) parMethode[m] = global;
	}
	for (const m of METHODES) {
		const nomme = exportFonction(listener, m);
		if (nomme) parMethode[m] = nomme;
	}

	return async (req: http.IncomingMessage, res: http.ServerResponse) => {
		const methode = req.method || 'GET';
		const fn = parMethode[methode];
		if (!fn) {
			res.statusCode = 405;
			res.end('Method Not Allowed');
			return;
		}
		const proto = req.headers['x-forwarded-proto'] || 'https';
		const hote = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
		const url = new URL(req.url || '/', `${proto}://${hote}`);
		const init: RequestInit & { duplex?: string } = {
			method: methode,
			headers: req.headers as unknown as HeadersInit,
			duplex: 'half'
		};
		if (methode !== 'GET' && methode !== 'HEAD') {
			init.body = Readable.toWeb(req) as unknown as BodyInit;
		}
		const reponse = await fn(new Request(url, init));
		res.statusCode = reponse.status;
		for (const [cle, valeur] of reponse.headers) res.appendHeader(cle, valeur);
		if (reponse.body) {
			for await (const morceau of reponse.body) res.write(morceau);
		}
		res.end();
	};
}

async function main(): Promise<void> {
	if (!existsSync(SERVEUR_CONSTRUIT)) {
		console.error(`${SERVEUR_CONSTRUIT} absent. Lancer \`bun run build\` avant ce contrôle.`);
		process.exit(1);
	}

	const listener = deballer(await import(pathToFileURL(resolve(ENTREE)).href));

	// ── 1. La branche que prendra la plateforme ───────────────────────────────
	const estWeb =
		METHODES.some((m) => exportFonction(listener, m) !== undefined) ||
		exportFonction(listener, 'fetch') !== undefined;

	if (!estWeb) {
		console.error(`\n${ENTREE} n'expose ni \`fetch\` ni de méthode HTTP nommée.\n`);
		console.error('Vercel l\'appellera donc en (req, res), avec un IncomingMessage dont');
		console.error("`.url` vaut le chemin seul. Le serveur attend une Request Web : chaque");
		console.error('requête mourra en `TypeError: Invalid URL`.\n');
		console.error('Exposer le gestionnaire ainsi :\n');
		console.error("    export const fetch = (request) => serveur.fetch(request);\n");
		process.exit(1);
	}

	// ── 2. Une vraie requête, du socket à la réponse ──────────────────────────
	const serveur = http.createServer(pontWeb(listener));
	await new Promise<void>((r) => serveur.listen(0, '127.0.0.1', () => r()));
	const port = (serveur.address() as { port: number }).port;

	const chemins: Array<[string, string]> = [
		['GET', '/'],
		['GET', '/connexion'],
		['HEAD', '/connexion']
	];

	let echecs = 0;
	try {
		for (const [methode, chemin] of chemins) {
			try {
				const r = await fetch(`http://127.0.0.1:${port}${chemin}`, {
					method: methode,
					redirect: 'manual',
					signal: AbortSignal.timeout(30_000)
				});
				if (r.status >= 500) {
					echecs++;
					console.error(`  ${methode} ${chemin} -> ${r.status}`);
				}
				await r.arrayBuffer();
			} catch (e) {
				echecs++;
				console.error(`  ${methode} ${chemin} -> ${(e as Error).message}`);
			}
		}
	} finally {
		serveur.close();
	}

	if (echecs > 0) {
		console.error(`\n${echecs} requête(s) en erreur serveur à travers le pont Vercel.\n`);
		process.exit(1);
	}

	console.log(`${ENTREE} : gestionnaire web, ${chemins.length} requêtes traversées.`);
}

await main();
