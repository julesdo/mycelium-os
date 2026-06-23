import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { createServerConvexHttpClient } from '$lib/server/convex-http';
import { api } from '$lib/convex/_generated/api';

function decodeJwtPayload(token: string): { role?: string } | null {
	try {
		const payload = token.split('.')[1];
		if (!payload) return null;
		return JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
	} catch {
		return null;
	}
}

export const load: LayoutServerLoad = async ({ locals, params }) => {
	const lang = params.lang ?? 'en';
	const token = locals.token!;

	// Fast path: platform admin via JWT (no Convex query)
	const payload = decodeJwtPayload(token);
	if (payload?.role === 'admin') {
		return { adminType: 'platform' as const };
	}

	// Slow path: check ORG_ADMIN/ORG_MANAGER membership via Convex
	try {
		const client = createServerConvexHttpClient({ token });
		const membership = await client.query(api.organizations.getMyOrgMembership, {});
		if (membership?.role === 'ORG_ADMIN' || membership?.role === 'ORG_MANAGER') {
			return { adminType: 'org' as const };
		}
	} catch {
		// Convex unreachable — fall through to redirect
	}

	redirect(307, `/${lang}/app`);
};
