import { localizedHref } from '$lib/utils/i18n';
import { cmdOrCtrl } from '$lib/hooks/is-mac.svelte';
import HomeIcon from '@lucide/svelte/icons/house';
import CalendarIcon from '@lucide/svelte/icons/calendar';
import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
import IdCardIcon from '@lucide/svelte/icons/id-card';
import ServerCogIcon from '@lucide/svelte/icons/server-cog';
import SettingsIcon from '@lucide/svelte/icons/settings';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import Logo from '$lib/components/icons/logo.svelte';
import { LEGAL_CONFIG } from '$lib/config/legal';
import type { SidebarConfig } from '../types';

interface PageState {
	pathname: string;
	lang?: string;
}

export function getAppSidebarConfig(pageState: PageState, userRole?: string): SidebarConfig {
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
				translationKey: 'app.sidebar.reservations',
				shortLabel: 'Trajets',
				url: localizedHref('/app/reservations'),
				icon: CalendarIcon,
				isActive:
					pathname.startsWith(`/${lang}/app/reservations`) ||
					pathname.startsWith('/app/reservations')
			},
			{
				translationKey: 'app.sidebar.expenses',
				shortLabel: 'Frais IK',
				url: localizedHref('/app/expenses'),
				icon: FileTextIcon,
				isActive:
					pathname.startsWith(`/${lang}/app/expenses`) ||
					pathname.startsWith('/app/expenses')
			},
			{
				translationKey: 'app.sidebar.incidents',
				shortLabel: 'Sinistres',
				url: localizedHref('/app/incidents'),
				icon: ShieldAlertIcon,
				isActive:
					pathname.startsWith(`/${lang}/app/incidents`) ||
					pathname.startsWith('/app/incidents')
			},
			{
				translationKey: 'app.sidebar.profile',
				shortLabel: 'Profil',
				url: localizedHref('/app/profile'),
				icon: IdCardIcon,
				isActive:
					pathname.startsWith(`/${lang}/app/profile`) ||
					pathname.startsWith('/app/profile')
			},
			{
				translationKey: 'app.sidebar.settings',
				shortLabel: 'Réglages',
				url: localizedHref('/app/settings'),
				icon: SettingsIcon,
				isActive:
					pathname.startsWith(`/${lang}/app/settings`) ||
					pathname.startsWith('/app/settings')
			}
		],
		footerLinks:
			userRole === 'admin' || userRole === 'ORG_ADMIN' || userRole === 'ORG_MANAGER'
				? [
						{
							translationKey: 'app.sidebar.admin_panel',
							url: localizedHref('/admin'),
							icon: ServerCogIcon,
							condition: true,
							kbd: [cmdOrCtrl, '.']
						}
					]
				: []
	};
}
