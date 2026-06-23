import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ params }) => {
	const lang = params.lang;
	redirect(301, lang ? `/${lang}/admin/settings` : '/admin/settings');
};
