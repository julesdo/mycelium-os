import { describe, expect, it } from 'vitest';
import { buildBreadcrumbs } from './breadcrumbs';

describe('buildBreadcrumbs', () => {
	it('returns the root crumb only for the bare prefix with a language segment', () => {
		expect(buildBreadcrumbs('/fr/app', 'app', 'App', 'fr')).toEqual([
			{ label: 'App', href: '/fr/app', isLast: true }
		]);
	});

	it('returns the root crumb only for the bare prefix without a language segment', () => {
		expect(buildBreadcrumbs('/app', 'app', 'App', 'fr')).toEqual([
			{ label: 'App', href: '/fr/app', isLast: true }
		]);
	});

	it('renders a 2-level path with the leaf marked isLast', () => {
		expect(buildBreadcrumbs('/fr/app/settings', 'app', 'App', 'fr')).toEqual([
			{ label: 'App', href: '/fr/app', isLast: false },
			{ label: 'Settings', href: '/fr/app/settings', isLast: true }
		]);
	});

	it('renders all intermediate segments for a 3-level path with cumulative hrefs', () => {
		expect(buildBreadcrumbs('/fr/app/settings/sessions', 'app', 'App', 'fr')).toEqual([
			{ label: 'App', href: '/fr/app', isLast: false },
			{ label: 'Settings', href: '/fr/app/settings', isLast: false },
			{ label: 'Sessions', href: '/fr/app/settings/sessions', isLast: true }
		]);
	});

	it('normalizes an unsupported locale segment to French across all hrefs', () => {
		// EGalim est une loi française : une seule langue est supportée. Tout code
		// non supporté (ici 'de', hérité d'un ancien lien) retombe sur 'fr'.
		expect(buildBreadcrumbs('/de/app/settings/sessions', 'app', 'App', 'de')).toEqual([
			{ label: 'App', href: '/fr/app', isLast: false },
			{ label: 'Settings', href: '/fr/app/settings', isLast: false },
			{ label: 'Sessions', href: '/fr/app/settings/sessions', isLast: true }
		]);
	});

	it('falls back to the default language when lang is undefined', () => {
		expect(buildBreadcrumbs('/app/settings', 'app', 'App', undefined)).toEqual([
			{ label: 'App', href: '/fr/app', isLast: false },
			{ label: 'Settings', href: '/fr/app/settings', isLast: true }
		]);
	});

	it('formats kebab-case segments to title case', () => {
		expect(buildBreadcrumbs('/fr/app/community-chat', 'app', 'App', 'fr')).toEqual([
			{ label: 'App', href: '/fr/app', isLast: false },
			{ label: 'Community Chat', href: '/fr/app/community-chat', isLast: true }
		]);
	});

	it('renders a 4-level path with cumulative hrefs through dynamic-looking segments', () => {
		expect(buildBreadcrumbs('/fr/admin/settings/members', 'admin', 'Admin', 'fr')).toEqual([
			{ label: 'Admin', href: '/fr/admin', isLast: false },
			{ label: 'Settings', href: '/fr/admin/settings', isLast: false },
			{ label: 'Members', href: '/fr/admin/settings/members', isLast: true }
		]);
	});

	it('returns an empty array when the prefix does not match', () => {
		expect(buildBreadcrumbs('/fr/marketing', 'app', 'App', 'fr')).toEqual([]);
	});

	it('returns an empty array for the root path', () => {
		expect(buildBreadcrumbs('/', 'app', 'App', 'fr')).toEqual([]);
	});
});
