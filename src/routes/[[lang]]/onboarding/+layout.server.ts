import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

function decodeJwtRole(token: string): string | null {
	try {
		const payload = token.split('.')[1];
		if (!payload) return null;
		const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
			role?: string;
		};
		return decoded.role ?? null;
	} catch {
		return null;
	}
}

export const load: LayoutServerLoad = async ({ locals, params }) => {
	const lang = params.lang ?? 'fr';

	if (!locals.token) {
		redirect(307, `/${lang}/signin?redirectTo=/${lang}/onboarding/organization`);
	}

	// Le staff Mycelium (role='admin') n'a pas d'organisation cliente.
	// L'onboarding ne leur est pas destiné : on les redirige vers leur portail.
	const role = decodeJwtRole(locals.token);
	if (role === 'admin') {
		redirect(307, `/${lang}/ops`);
	}
};
