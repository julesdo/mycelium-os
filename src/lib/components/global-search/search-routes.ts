export type SearchAccess = 'public' | 'authenticated' | 'admin';

export type SearchRouteGroup = 'public' | 'authentication' | 'app' | 'admin';

export interface SearchRouteEntry {
	href: string;
	access: SearchAccess;
	group: SearchRouteGroup;
	titleKey?: string;
	keywords?: string[];
}

export const SEARCH_ROUTES: SearchRouteEntry[] = [
	{
		href: '/',
		access: 'public',
		group: 'public',
		titleKey: 'nav.home',
		keywords: ['home', 'landing']
	},
	{
		href: '/pricing',
		access: 'public',
		group: 'public',
		titleKey: 'nav.pricing',
		keywords: ['pricing', 'plans', 'billing']
	},
	{
		href: '/about',
		access: 'public',
		group: 'public',
		titleKey: 'nav.about',
		keywords: ['about', 'team']
	},
	{
		href: '/signin',
		access: 'public',
		group: 'authentication',
		titleKey: 'auth.signin.tab_signin',
		keywords: ['signin', 'login', 'auth']
	},
	{
		href: '/forgot-password',
		access: 'public',
		group: 'authentication',
		titleKey: 'auth.forgot_password.title',
		keywords: ['forgot password', 'reset']
	},
	{
		href: '/app/reservations',
		access: 'authenticated',
		group: 'app',
		keywords: ['réservations', 'mes réservations', 'reservations', 'booking']
	},
	{
		href: '/app/settings',
		access: 'authenticated',
		group: 'app',
		titleKey: 'settings.title',
		keywords: ['paramètres', 'compte', 'settings', 'account', 'profil', 'intégrations']
	},
	{
		href: '/admin/dashboard',
		access: 'admin',
		group: 'admin',
		titleKey: 'admin.sidebar.dashboard',
		keywords: ['tableau de bord', 'dashboard', 'admin']
	},
	{
		href: '/admin/fleet',
		access: 'admin',
		group: 'admin',
		keywords: ['flotte', 'véhicules', 'fleet', 'voitures', 'importer']
	},
	{
		href: '/admin/reservations',
		access: 'admin',
		group: 'admin',
		keywords: ['réservations', 'calendrier', 'planning', 'calendar']
	},
{
		href: '/admin/support',
		access: 'admin',
		group: 'admin',
		titleKey: 'admin.sidebar.support',
		keywords: ['support', 'tickets', 'messages']
	},
	{
		href: '/admin/settings',
		access: 'admin',
		group: 'admin',
		titleKey: 'admin.sidebar.settings',
		keywords: ['paramètres', 'settings', 'organisation', 'admin']
	},
	{
		href: '/admin/settings/members',
		access: 'admin',
		group: 'admin',
		keywords: ['membres', 'invitations', 'équipe', 'team', 'inviter', 'rôles']
	},
	{
		href: '/admin/settings/plans',
		access: 'admin',
		group: 'admin',
		keywords: ['plans', 'facturation', 'abonnement', 'tarifs', 'billing', 'forfait']
	},
	{
		href: '/admin/maintenance',
		access: 'admin',
		group: 'admin',
		titleKey: 'admin.sidebar.maintenance',
		keywords: ['maintenance', 'entretien', 'révision', 'vidange', 'garage', 'pneus', 'freins']
	}
];

export function titleizeRouteFromHref(href: string): string {
	if (href === '/') return 'Home';

	const segments = href.split('/').filter(Boolean);
	const segment = segments[segments.length - 1] ?? href;

	return segment
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');
}
