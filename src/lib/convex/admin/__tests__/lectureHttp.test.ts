import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConvexError } from 'convex/values';
import { lireJson } from '../lectureHttp';

/**
 * UNE SOURCE PUBLIQUE QUI HOQUETTE NE FAIT PLUS TOMBER UNE RECHERCHE (20/10/2026). La
 * passerelle des données de la commande publique rendait 504 et l'ajout entier échouait.
 */

const reponse = (statut: number, corps: unknown = { ok: true }) =>
	new Response(JSON.stringify(corps), { status: statut });

describe('lireJson', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('reprend un 504, puis rend la réponse', async () => {
		const appels = vi
			.fn()
			.mockResolvedValueOnce(reponse(504))
			.mockResolvedValueOnce(reponse(200, { lignes: 3 }));
		vi.stubGlobal('fetch', appels);
		const lu = lireJson('https://exemple.test', 'La source');
		await vi.advanceTimersByTimeAsync(2_000);
		await expect(lu).resolves.toEqual({ lignes: 3 });
		expect(appels).toHaveBeenCalledTimes(2);
	});

	it('dit au bout de trois essais que la source est surchargée', async () => {
		const appels = vi.fn().mockImplementation(async () => reponse(504));
		vi.stubGlobal('fetch', appels);
		const lu = lireJson('https://exemple.test', 'La source');
		const verdict = expect(lu).rejects.toThrow(ConvexError);
		await vi.advanceTimersByTimeAsync(8_000);
		await verdict;
		expect(appels).toHaveBeenCalledTimes(3);
	});

	it('ne reprend pas une erreur durable', async () => {
		const appels = vi.fn().mockResolvedValue(reponse(400));
		vi.stubGlobal('fetch', appels);
		await expect(lireJson('https://exemple.test', 'La source')).rejects.toThrow(ConvexError);
		expect(appels).toHaveBeenCalledTimes(1);
	});
});
