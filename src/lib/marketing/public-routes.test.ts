import { describe, expect, it } from 'vitest';
import {
	PUBLIC_MARKETING_ROUTES,
	getLocalizedMarketingUrls,
	getMarketingMarkdownDocument,
	matchPublicMarketingRoute
} from './public-routes';
import { marketingMarkdown as aboutMarketingMarkdown } from '../../routes/[[lang]]/(marketing)/about/page.md';
import { marketingMarkdown as homeMarketingMarkdown } from '../../routes/[[lang]]/(marketing)/page.md';
import { marketingMarkdown as impressumMarketingMarkdown } from '../../routes/[[lang]]/(marketing)/impressum/page.md';
import { marketingMarkdown as privacyMarketingMarkdown } from '../../routes/[[lang]]/(marketing)/privacy/page.md';
import { marketingMarkdown as termsMarketingMarkdown } from '../../routes/[[lang]]/(marketing)/terms/page.md';

describe('public marketing route registry', () => {
	it('defines the canonical public marketing routes', () => {
		expect(PUBLIC_MARKETING_ROUTES).toEqual([
			{ key: 'home', pathSuffix: '' },
			{ key: 'about', pathSuffix: '/about' },
			{ key: 'privacy', pathSuffix: '/privacy' },
			{ key: 'terms', pathSuffix: '/terms' },
			{ key: 'impressum', pathSuffix: '/impressum' }
		]);
	});

	it('matches localized marketing paths to route keys', () => {
		expect(matchPublicMarketingRoute('/fr')).toEqual({ lang: 'fr', routeKey: 'home' });
		expect(matchPublicMarketingRoute('/fr/about')).toEqual({ lang: 'fr', routeKey: 'about' });
		expect(matchPublicMarketingRoute('/fr/privacy')).toEqual({
			lang: 'fr',
			routeKey: 'privacy'
		});
		expect(matchPublicMarketingRoute('/fr/terms')).toEqual({ lang: 'fr', routeKey: 'terms' });
		expect(matchPublicMarketingRoute('/fr/impressum')).toEqual({
			lang: 'fr',
			routeKey: 'impressum'
		});
	});

	it('rejects non-marketing or non-localized paths', () => {
		expect(matchPublicMarketingRoute('/')).toBeNull();
		expect(matchPublicMarketingRoute('/api')).toBeNull();
		expect(matchPublicMarketingRoute('/llms.txt')).toBeNull();
		expect(matchPublicMarketingRoute('/fr/app')).toBeNull();
		expect(matchPublicMarketingRoute('/fr/admin')).toBeNull();
		expect(matchPublicMarketingRoute('/en')).toBeNull();
		expect(matchPublicMarketingRoute('/it')).toBeNull();
	});

	it('returns the correct colocated markdown document for each route key', () => {
		expect(getMarketingMarkdownDocument('home')).toBe(homeMarketingMarkdown);
		expect(getMarketingMarkdownDocument('about')).toBe(aboutMarketingMarkdown);
		expect(getMarketingMarkdownDocument('privacy')).toBe(privacyMarketingMarkdown);
		expect(getMarketingMarkdownDocument('terms')).toBe(termsMarketingMarkdown);
		expect(getMarketingMarkdownDocument('impressum')).toBe(impressumMarketingMarkdown);
	});

	it('generates the expected localized public marketing URLs', () => {
		expect(getLocalizedMarketingUrls('https://example.com')).toEqual([
			'https://example.com/fr',
			'https://example.com/fr/about',
			'https://example.com/fr/privacy',
			'https://example.com/fr/terms',
			'https://example.com/fr/impressum'
		]);
	});
});
