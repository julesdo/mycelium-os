import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, params }) => {
	const lang = params.lang ?? 'fr';

	if (!locals.token) {
		redirect(307, `/${lang}/signin?redirectTo=/${lang}/onboarding/organization`);
	}
};
