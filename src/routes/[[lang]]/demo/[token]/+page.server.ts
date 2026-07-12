import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createServerConvexHttpClient } from '$lib/server/convex-http';
import { api } from '$lib/convex/_generated/api';

export const load: PageServerLoad = async ({ params }) => {
	const { token } = params;

	const client = createServerConvexHttpClient({});

	let demoInfo: {
		orgName: string;
		expiresAt: number;
		commercialName: string;
		commercialPhone: string;
		commercialCalendlyUrl: string | null;
	} | null = null;

	try {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		demoInfo = await client.query((api as any)['demo/demoAccess'].getByToken, { token });
	} catch {
		// Convex unreachable or token invalid
	}

	if (!demoInfo) {
		throw error(404, 'Démo introuvable ou expirée');
	}

	return {
		token,
		orgName: demoInfo.orgName,
		expiresAt: demoInfo.expiresAt,
		commercialName: demoInfo.commercialName,
		commercialPhone: demoInfo.commercialPhone,
		commercialCalendlyUrl: demoInfo.commercialCalendlyUrl
	};
};
