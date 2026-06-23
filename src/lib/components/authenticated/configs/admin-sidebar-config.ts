import { localizedHref } from '$lib/utils/i18n';
import { cmdOrCtrl, ctrlSymbol } from '$lib/hooks/is-mac.svelte';
import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
import SettingsIcon from '@lucide/svelte/icons/settings';
import ServerCogIcon from '@lucide/svelte/icons/server-cog';
import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
import HomeIcon from '@lucide/svelte/icons/home';
import AppWindowIcon from '@lucide/svelte/icons/app-window';
import CarIcon from '@lucide/svelte/icons/car';
import CalendarIcon from '@lucide/svelte/icons/calendar';
import WrenchIcon from '@lucide/svelte/icons/wrench';
import EuroIcon from '@lucide/svelte/icons/euro';
import UsersIcon from '@lucide/svelte/icons/users';
import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
import FileTextIcon from '@lucide/svelte/icons/file-text';
import LandmarkIcon from '@lucide/svelte/icons/landmark';
import LeafIcon from '@lucide/svelte/icons/leaf';
import BadgePoundSterlingIcon from '@lucide/svelte/icons/badge-pound-sterling';
import type { SidebarConfig, TopbarNavGroup } from '../types';

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
			{ divider: true, translationKey: '__section_fleet', sectionLabel: 'Flotte' },
			{
				translationKey: 'admin.sidebar.fleet',
				url: localizedHref('/admin/fleet'),
				icon: CarIcon,
				isActive: pathname.startsWith(`/${lang}/admin/fleet`)
			},
			{
				translationKey: 'admin.sidebar.reservations',
				url: localizedHref('/admin/reservations'),
				icon: CalendarIcon,
				isActive: pathname.startsWith(`/${lang}/admin/reservations`),
				kbd: [ctrlSymbol, '⇧', '5']
			},
			{
				translationKey: 'admin.sidebar.maintenance',
				url: localizedHref('/admin/maintenance'),
				icon: WrenchIcon,
				isActive: pathname.startsWith(`/${lang}/admin/maintenance`)
			},
			{
				translationKey: 'admin.sidebar.finance',
				url: localizedHref('/admin/finance'),
				icon: EuroIcon,
				isActive: pathname.startsWith(`/${lang}/admin/finance`) && !pathname.includes('/fiscal') && !pathname.includes('/bik')
			},
			{
				translationKey: 'admin.sidebar.fiscal',
				url: localizedHref('/admin/finance/fiscal'),
				icon: LandmarkIcon,
				isActive: pathname.startsWith(`/${lang}/admin/finance/fiscal`)
			},
			{
				translationKey: 'admin.sidebar.bik',
				url: localizedHref('/admin/finance/bik'),
				icon: BadgePoundSterlingIcon,
				isActive: pathname.startsWith(`/${lang}/admin/finance/bik`)
			},
			{
				translationKey: 'admin.sidebar.sustainability',
				url: localizedHref('/admin/sustainability'),
				icon: LeafIcon,
				isActive: pathname.startsWith(`/${lang}/admin/sustainability`)
			},
			{
				translationKey: 'admin.sidebar.drivers',
				url: localizedHref('/admin/drivers'),
				icon: UsersIcon,
				isActive: pathname.startsWith(`/${lang}/admin/drivers`)
			},
			{
				translationKey: 'admin.sidebar.violations',
				url: localizedHref('/admin/violations'),
				icon: AlertTriangleIcon,
				isActive: pathname.startsWith(`/${lang}/admin/violations`)
			},
			{
				translationKey: 'admin.sidebar.incidents',
				url: localizedHref('/admin/incidents'),
				icon: ShieldAlertIcon,
				isActive: pathname.startsWith(`/${lang}/admin/incidents`)
			},
			{
				translationKey: 'admin.sidebar.compliance',
				url: localizedHref('/admin/compliance'),
				icon: ShieldCheckIcon,
				isActive: pathname.startsWith(`/${lang}/admin/compliance`)
			},
			{
				translationKey: 'admin.sidebar.expenses',
				url: localizedHref('/admin/expenses'),
				icon: FileTextIcon,
				isActive: pathname.startsWith(`/${lang}/admin/expenses`)
			},
			{ divider: true, translationKey: '__section_config', sectionLabel: 'Config' },
			{
				translationKey: 'admin.sidebar.settings',
				url: localizedHref('/admin/settings'),
				icon: SettingsIcon,
				isActive: pathname.startsWith(`/${lang}/admin/settings`),
				kbd: [ctrlSymbol, '⇧', '4']
			}
		],
		topbarGroups: [
			// ── Dashboard standalone ──────────────────────────────────────────
			{
				label: 'Dashboard',
				icon: LayoutDashboardIcon,
				items: [
					{
						translationKey: 'admin.sidebar.dashboard',
						url: localizedHref('/admin/dashboard'),
						icon: LayoutDashboardIcon,
						isActive: pathname.startsWith(`/${lang}/admin/dashboard`)
					}
				]
			},
			// ── Flotte dropdown ───────────────────────────────────────────────
			{
				label: 'Flotte',
				icon: CarIcon,
				items: [
					{
						translationKey: 'admin.sidebar.fleet',
						url: localizedHref('/admin/fleet'),
						icon: CarIcon,
						isActive: pathname.startsWith(`/${lang}/admin/fleet`)
					},
					{
						translationKey: 'admin.sidebar.reservations',
						url: localizedHref('/admin/reservations'),
						icon: CalendarIcon,
						isActive: pathname.startsWith(`/${lang}/admin/reservations`)
					},
					{
						translationKey: 'admin.sidebar.maintenance',
						url: localizedHref('/admin/maintenance'),
						icon: WrenchIcon,
						isActive: pathname.startsWith(`/${lang}/admin/maintenance`)
					},
					{
						translationKey: 'admin.sidebar.drivers',
						url: localizedHref('/admin/drivers'),
						icon: UsersIcon,
						isActive: pathname.startsWith(`/${lang}/admin/drivers`)
					}
				]
			},
			// ── Finance dropdown ──────────────────────────────────────────────
			{
				label: 'Finance',
				icon: EuroIcon,
				items: [
					{
						translationKey: 'admin.sidebar.finance',
						url: localizedHref('/admin/finance'),
						icon: EuroIcon,
						isActive:
							pathname.startsWith(`/${lang}/admin/finance`) &&
							!pathname.includes('/fiscal') &&
							!pathname.includes('/expenses') &&
							!pathname.includes('/bik')
					},
					{
						translationKey: 'admin.sidebar.fiscal',
						url: localizedHref('/admin/finance/fiscal'),
						icon: LandmarkIcon,
						isActive: pathname.startsWith(`/${lang}/admin/finance/fiscal`)
					},
					{
						translationKey: 'admin.sidebar.bik',
						url: localizedHref('/admin/finance/bik'),
						icon: BadgePoundSterlingIcon,
						isActive: pathname.startsWith(`/${lang}/admin/finance/bik`)
					},
					{
						translationKey: 'admin.sidebar.expenses',
						url: localizedHref('/admin/expenses'),
						icon: FileTextIcon,
						isActive: pathname.startsWith(`/${lang}/admin/expenses`)
					},
					{
						translationKey: 'admin.sidebar.sustainability',
						url: localizedHref('/admin/sustainability'),
						icon: LeafIcon,
						isActive: pathname.startsWith(`/${lang}/admin/sustainability`)
					}
				]
			},
			// ── Opérations dropdown ───────────────────────────────────────────
			{
				label: 'Opérations',
				icon: ShieldAlertIcon,
				items: [
					{
						translationKey: 'admin.sidebar.violations',
						url: localizedHref('/admin/violations'),
						icon: AlertTriangleIcon,
						isActive: pathname.startsWith(`/${lang}/admin/violations`)
					},
					{
						translationKey: 'admin.sidebar.incidents',
						url: localizedHref('/admin/incidents'),
						icon: ShieldAlertIcon,
						isActive: pathname.startsWith(`/${lang}/admin/incidents`)
					},
					{
						translationKey: 'admin.sidebar.compliance',
						url: localizedHref('/admin/compliance'),
						icon: ShieldCheckIcon,
						isActive: pathname.startsWith(`/${lang}/admin/compliance`)
					}
				]
			},
			// ── Paramètres standalone ─────────────────────────────────────────
			{
				label: 'Paramètres',
				icon: SettingsIcon,
				items: [
					{
						translationKey: 'admin.sidebar.settings',
						url: localizedHref('/admin/settings'),
						icon: SettingsIcon,
						isActive: pathname.startsWith(`/${lang}/admin/settings`)
					}
				]
			}
		] satisfies TopbarNavGroup[],
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
