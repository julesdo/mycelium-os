import { localizedHref } from '$lib/utils/i18n';
import HomeIcon from '@lucide/svelte/icons/house';
import SettingsIcon from '@lucide/svelte/icons/settings';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import Logo from '$lib/components/icons/logo.svelte';
import { LEGAL_CONFIG } from '$lib/config/legal';
import type { SidebarConfig } from '../types';

interface PageState {
	pathname: string;
	lang?: string;
}

/**
 * Canteen space nav (EGalim pivot). A canteen has a single user population,
 * its manager, so this is the only authenticated nav besides /ops (the
 * Mycelium operator space). Three entries is the right number for a POC:
 * every extra one is an opportunity to get lost.
 */
export function getAppSidebarConfig(pageState: PageState): SidebarConfig {
	const { pathname, lang } = pageState;

	return {
		header: {
			icon: Logo,
			title: LEGAL_CONFIG.brandName,
			href: localizedHref('/')
		},
		navItems: [
			{
				translationKey: 'app.sidebar.home',
				shortLabel: 'Accueil',
				url: localizedHref('/app'),
				icon: HomeIcon,
				isActive: /^(\/[a-z]{2})?\/app\/?$/.test(pathname)
			},
			{
				translationKey: 'app.sidebar.invoices',
				shortLabel: 'Factures',
				url: localizedHref('/app/factures'),
				icon: FileTextIcon,
				isActive:
					pathname.startsWith(`/${lang}/app/factures`) || pathname.startsWith('/app/factures')
			},
			{
				translationKey: 'admin.sidebar.settings',
				shortLabel: 'Paramètres',
				url: localizedHref('/app/parametres'),
				icon: SettingsIcon,
				isActive:
					pathname.startsWith(`/${lang}/app/parametres`) || pathname.startsWith('/app/parametres')
			}
		]
	};
}
