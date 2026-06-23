import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createServerConvexHttpClient } from '$lib/server/convex-http';
import { api } from '$lib/convex/_generated/api';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.token) {
		error(401, 'Non authentifié');
	}

	const body = await request.json().catch(() => null);
	const name = typeof body?.name === 'string' ? body.name.trim() : '';

	if (!name) {
		error(400, 'Le nom est obligatoire');
	}

	const client = createServerConvexHttpClient({ token: locals.token });

	const orgId = await client.mutation(api.organizations.createOrganization, {
		name,
		siren: typeof body?.siren === 'string' ? body.siren : undefined,
		sector: typeof body?.sector === 'string' ? body.sector : undefined,
		size: typeof body?.size === 'string' ? body.size : undefined
	});

	return json({ orgId }, { status: 201 });
};
