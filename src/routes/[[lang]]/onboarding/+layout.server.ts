import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	if (!locals.token) {
		const lang = params.lang ?? 'en';
		redirect(307, `/${lang}/signin?redirectTo=/${lang}/onboarding/organization`);
	}
};
