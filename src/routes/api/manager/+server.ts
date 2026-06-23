import type { RequestHandler } from './$types';
import { PUBLIC_CONVEX_SITE_URL } from '$env/static/public';
import { error } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, locals }) => {
	const token = locals.token;
	if (!token) error(401, 'Non authentifié');

	const body = await request.json();

	const upstream = await fetch(`${PUBLIC_CONVEX_SITE_URL}/api/manager/chat`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(body)
	});

	if (!upstream.ok) {
		const text = await upstream.text().catch(() => `HTTP ${upstream.status}`);
		error(upstream.status, text);
	}

	return new Response(upstream.body, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			'X-Accel-Buffering': 'no'
		}
	});
};
