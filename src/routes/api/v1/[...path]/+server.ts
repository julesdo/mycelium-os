/**
 * Proxy pour l'API publique Mycelium v1.
 * Transfère les requêtes Bearer myc_live_... vers les Convex HTTP actions.
 * Cela permet aux clients d'appeler https://app.mycelium.fr/api/v1/* au lieu de l'URL Convex.
 */
import type { RequestHandler } from './$types';
import { PUBLIC_CONVEX_SITE_URL } from '$env/static/public';
import { error } from '@sveltejs/kit';

const handler: RequestHandler = async ({ request, params }) => {
	const path = params.path ?? '';
	const upstream = new URL(`${PUBLIC_CONVEX_SITE_URL}/api/v1/${path}`);

	// Forward query params
	const incoming = new URL(request.url);
	incoming.searchParams.forEach((v, k) => upstream.searchParams.set(k, v));

	const res = await fetch(upstream.toString(), {
		method: request.method,
		headers: {
			Authorization: request.headers.get('Authorization') ?? '',
			'Content-Type': 'application/json'
		},
		body: ['GET', 'HEAD', 'OPTIONS'].includes(request.method) ? undefined : await request.text()
	});

	if (!res.ok && res.status >= 500) {
		error(res.status, await res.text().catch(() => 'Erreur serveur'));
	}

	return new Response(res.body, {
		status: res.status,
		headers: {
			'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
			'X-Mycelium-API-Version': '1.0',
			'Access-Control-Allow-Origin': '*'
		}
	});
};

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS: RequestHandler = async () =>
	new Response(null, {
		status: 204,
		headers: {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Authorization, Content-Type'
		}
	});
