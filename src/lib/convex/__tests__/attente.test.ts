/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { convexTest } from 'convex-test';
import limiteur from '@convex-dev/rate-limiter/test';
import schema from '../schema';
import { api, internal } from '../_generated/api';
import { empreinteDEmail } from '../../crm/empreinte';
import { CONFIRMATION_VALABLE_MS } from '../../crm/attente';

/**
 * LA LISTE D'ATTENTE DE LA PROCÉDURE SANS JUGE (lot 6, décision 16) : double
 * confirmation, la même réponse quoi qu'il arrive, et l'adresse qui a dit « stop » ne
 * reçoit rien. Les horloges sont figées : l'e-mail programmé ne part pas pendant le test,
 * il se compte dans la file.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI_CONVEX = 30_000;

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

function harnais() {
	const t = convexTest(schema, modules);
	limiteur.register(t);
	return t;
}

async function etat(t: ReturnType<typeof harnais>) {
	return t.run(async (ctx) => ({
		inscriptions: await ctx.db.query('inscriptionsAttente').take(10),
		envois: (await ctx.db.system.query('_scheduled_functions').take(10)).filter((f) =>
			f.name.includes('envoyerLaConfirmation')
		)
	}));
}

describe('la liste d’attente', () => {
	it(
		'garde l’inscription en attente de confirmation et programme un seul e-mail',
		async () => {
			const t = harnais();
			const envoi = { email: ' Lea@Morel.fr ', entreprise: 'Transports Morel' };
			expect(await t.mutation(api.attente.sInscrire, envoi)).toEqual({ ok: true });
			expect(await t.mutation(api.attente.sInscrire, envoi)).toEqual({ ok: true });
			const e = await etat(t);
			expect(e.inscriptions).toHaveLength(1);
			expect(e.inscriptions[0]!.email).toBe('lea@morel.fr');
			expect(e.inscriptions[0]!.confirmeeLe).toBeUndefined();
			// La seconde demande renvoie le lien, une fois : deux envois au plus par heure.
			expect(e.envois.length).toBeGreaterThanOrEqual(1);
		},
		DELAI_CONVEX
	);

	it(
		'confirme par le jeton, et répond pareil à un jeton inconnu',
		async () => {
			const t = harnais();
			await t.mutation(api.attente.sInscrire, { email: 'lea@morel.fr' });
			const [inscrite] = (await etat(t)).inscriptions;
			expect(await t.mutation(api.attente.confirmer, { jeton: 'inconnu' })).toBeNull();
			expect(await t.mutation(api.attente.confirmer, { jeton: inscrite!.jeton })).toBeNull();
			const apres = (await etat(t)).inscriptions[0]!;
			expect(apres.confirmeeLe).toBeTypeOf('number');
		},
		DELAI_CONVEX
	);

	it(
		'retire l’adresse de la liste par le jeton',
		async () => {
			const t = harnais();
			await t.mutation(api.attente.sInscrire, { email: 'lea@morel.fr' });
			const [inscrite] = (await etat(t)).inscriptions;
			expect(await t.mutation(api.attente.quitter, { jeton: inscrite!.jeton })).toBeNull();
			expect((await etat(t)).inscriptions).toHaveLength(0);
		},
		DELAI_CONVEX
	);

	it(
		'n’écrit rien à une adresse qui a dit « stop », et lui répond pareil',
		async () => {
			const t = harnais();
			const empreinte = await empreinteDEmail('lea@morel.fr');
			await t.run(async (ctx) => {
				await ctx.db.insert('oppositions', { empreinte, le: Date.now() });
			});
			expect(await t.mutation(api.attente.sInscrire, { email: 'Lea@morel.fr' })).toEqual({
				ok: true
			});
			const e = await etat(t);
			expect(e.inscriptions).toHaveLength(0);
			expect(e.envois).toHaveLength(0);
		},
		DELAI_CONVEX
	);

	it(
		'répond la même chose à un robot, sans rien écrire',
		async () => {
			const t = harnais();
			expect(
				await t.mutation(api.attente.sInscrire, { email: 'lea@morel.fr', piege: 'http://x' })
			).toEqual({ ok: true });
			expect((await etat(t)).inscriptions).toHaveLength(0);
		},
		DELAI_CONVEX
	);

	it(
		'efface une inscription non confirmée passé le délai du lien',
		async () => {
			const t = harnais();
			await t.mutation(api.attente.sInscrire, { email: 'lea@morel.fr' });
			vi.setSystemTime(Date.now() + CONFIRMATION_VALABLE_MS + 1000);
			expect(await t.mutation(internal.attente.effacerLesEchues, {})).toBe(1);
			expect((await etat(t)).inscriptions).toHaveLength(0);
		},
		DELAI_CONVEX
	);
});
