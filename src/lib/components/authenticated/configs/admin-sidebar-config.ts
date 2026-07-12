import { localizedHref } from '$lib/utils/i18n';
import { cmdOrCtrl, ctrlSymbol } from '$lib/hooks/is-mac.svelte';
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import SettingsIcon from '@lucide/svelte/icons/settings';
import ServerCogIcon from '@lucide/svelte/icons/server-cog';
import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
import HomeIcon from '@lucide/svelte/icons/home';
import AppWindowIcon from '@lucide/svelte/icons/app-window';
import CarIcon from '@lucide/svelte/icons/car';
import WalletIcon from '@lucide/svelte/icons/wallet';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import PlugIcon from '@lucide/svelte/icons/plug';
import type { SidebarConfig } from '../types';

interface PageState {
	pathname: string;
	lang?: string;
}

export function getAdminSidebarConfig(pageState: PageState): SidebarConfig {
	const { pathname, lang } = pageState;

	return {
		header: {
			icon: ServerCogIcon,
			titleKey: 'admin.title',
			href: localizedHref('/admin'),
			dropdownItems: [
				{
					translationKey: 'admin.navigation.home',
					url: localizedHref('/'),
					icon: HomeIcon
				},
				{
					translationKey: 'admin.navigation.app',
					url: localizedHref('/app'),
					icon: AppWindowIcon
				}
			]
		},
		navItems: [
			{
				translationKey: 'admin.sidebar.dashboard',
				url: localizedHref('/admin/dashboard'),
				icon: LayoutDashboardIcon,
				isActive: pathname.startsWith(`/${lang}/admin/dashboard`),
				kbd: [ctrlSymbol, '⇧', '1']
			},
			{ divider: true, translationKey: '__section_fleet', sectionLabel: 'Gestion' },
			{
				translationKey: 'admin.sidebar.fleet',
				url: localizedHref('/admin/fleet'),
				icon: CarIcon,
				isActive:
					pathname.startsWith(`/${lang}/admin/fleet`) ||
					pathname.startsWith(`/${lang}/admin/reservations`) ||
					pathname.startsWith(`/${lang}/admin/maintenance`) ||
					pathname.startsWith(`/${lang}/admin/drivers`)
			},
			{
				translationKey: 'admin.sidebar.finance',
				url: localizedHref('/admin/finance'),
				icon: WalletIcon,
				isActive:
					(pathname.startsWith(`/${lang}/admin/finance`) &&
						!pathname.includes('/finance/bik')) ||
					pathname.startsWith(`/${lang}/admin/expenses`)
			},
			{
				translationKey: 'admin.sidebar.compliance',
				url: localizedHref('/admin/compliance'),
				icon: ShieldCheckIcon,
				isActive:
					pathname.startsWith(`/${lang}/admin/compliance`) ||
					pathname.startsWith(`/${lang}/admin/violations`) ||
					pathname.startsWith(`/${lang}/admin/incidents`) ||
					pathname.startsWith(`/${lang}/admin/sustainability`) ||
					pathname.startsWith(`/${lang}/admin/finance/bik`)
			},
			{ divider: true, translationKey: '__section_config', sectionLabel: 'Config' },
			{
				translationKey: 'admin.sidebar.integrations',
				url: localizedHref('/admin/settings/integrations'),
				icon: PlugIcon,
				isActive: pathname.startsWith(`/${lang}/admin/settings/integrations`)
			},
			{
				translationKey: 'admin.sidebar.settings',
				url: localizedHref('/admin/settings/organization'),
				icon: SettingsIcon,
				isActive:
					pathname.startsWith(`/${lang}/admin/settings`) &&
					!pathname.includes('/settings/integrations'),
				kbd: [ctrlSymbol, '⇧', '4']
			}
		],
		footerLinks: [
			{
				translationKey: 'admin.sidebar.back_to_app',
				url: localizedHref('/app'),
				icon: ArrowLeftIcon,
				condition: true,
				kbd: [cmdOrCtrl, '.']
			}
		]
	};
}
