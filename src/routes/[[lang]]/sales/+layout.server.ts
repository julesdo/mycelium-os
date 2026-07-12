import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

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
	const token = locals.token;

	if (!token) {
		redirect(307, `/${lang}/app`);
	}

	const payload = decodeJwtPayload(token);
	if (payload?.role !== 'admin') {
		// Pas de message d'erreur qui révèle l'existence de la route
		redirect(307, `/${lang}/app`);
	}

	// La vérification fine du staffRole 'sales' est faite par salesQuery/salesMutation côté Convex
	return {};
};
