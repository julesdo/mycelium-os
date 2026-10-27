/// <reference types="vite/client" />
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { resolveEffectivePlan } from '../billing';
import { revoquerLeCode } from '../admin/codes';
import {
	MAX_ESSAIS,
	REFUS_DU_CODE,
	REFUS_SANS_ADMINISTRATEUR,
	REFUS_TROP_D_ESSAIS,
	empreinteDuCode,
	type AvantagePrivilege
} from '../../paiement/codes-privilege';

/**
 * LES CODES PRIVILÈGES, EN BASE (27/10/2026) : un code ne sert qu'une fois, un code
 * révoqué ou expiré ne sert plus, l'accès à vie ouvre sa formule et se retire avec le
 * code, et cinq essais par quart d'heure suffisent à arrêter qui les devinerait.
 * Better Auth ne se monte pas dans `convex-test` : on appelle les cœurs internes, avec
 * l'utilisateur en argument, comme le font les actions publiques.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI = 30_000;
const CODE = 'ABCD-EFGH-JKMN-PQRS';
const PRO_A_VIE: AvantagePrivilege = { genre: 'A_VIE', formule: 'pro' };

/** La facturation ouverte, pour que la formule effective se lise comme en production. */
function ouvrirLaFacturation() {
	const avant = {
		cle: process.env.PADDLE_API_KEY,
		ouverte: process.env.PADDLE_FACTURATION_OUVERTE
	};
	beforeEach(() => {
		process.env.PADDLE_API_KEY = 'pdl_sdbx_test';
		process.env.PADDLE_FACTURATION_OUVERTE = 'oui';
	});
	afterEach(() => {
		if (avant.cle === undefined) delete process.env.PADDLE_API_KEY;
		else process.env.PADDLE_API_KEY = avant.cle;
		if (avant.ouverte === undefined) delete process.env.PADDLE_FACTURATION_OUVERTE;
		else process.env.PADDLE_FACTURATION_OUVERTE = avant.ouverte;
	});
}

async function installer(
	t: ReturnType<typeof convexTest>,
	{
		avantage = PRO_A_VIE,
		role = 'ORG_ADMIN' as 'ORG_ADMIN' | 'ORG_MEMBER',
		expireLe
	}: { avantage?: AvantagePrivilege; role?: 'ORG_ADMIN' | 'ORG_MEMBER'; expireLe?: number } = {}
): Promise<{ organizationId: Id<'organizations'>; codeId: Id<'codesPrivilege'> }> {
	const empreinte = await empreinteDuCode(CODE);
	return t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Menuiserie Dupont',
			createdAt: Date.now()
		});
		await ctx.db.insert('organizationMembers', {
			organizationId,
			userId: 'gerant',
			role,
			joinedAt: Date.now()
		});
		await ctx.db.insert('userProfiles', {
			userId: 'gerant',
			currentOrganizationId: organizationId
		});
		const codeId = await ctx.db.insert('codesPrivilege', {
			empreinte,
			fin: 'PQRS',
			libelle: 'Cabinet Martin, partenaire',
			avantage,
			creePar: 'fondateur@letikette.com',
			creeLe: Date.now(),
			...(expireLe === undefined ? {} : { expireLe })
		});
		return { organizationId, codeId };
	});
}

async function consommer(t: ReturnType<typeof convexTest>, code: string | null = CODE) {
	return t.mutation(internal.codesPrivilege._consommer, {
		userId: 'gerant',
		empreinte: code === null ? null : await empreinteDuCode(code)
	});
}

describe('un code privilège', () => {
	ouvrirLaFacturation();

	it(
		'ouvre sa formule à vie, et ne sert qu’une fois',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, codeId } = await installer(t);

			const premier = await consommer(t);
			expect(premier).toMatchObject({ ok: true, titre: 'Accès Pro offert à vie' });

			await t.run(async (ctx) => {
				const org = await ctx.db.get(organizationId);
				expect(org?.accesOffert).toMatchObject({ formule: 'pro', codeId });
				expect(resolveEffectivePlan(org!).tier).toBe('pro');
				const code = await ctx.db.get(codeId);
				expect(code?.utiliseParOrganisation).toBe(organizationId);
				expect(code?.utiliseParNom).toBe('Menuiserie Dupont');
			});

			// Une seconde fois, même par le même établissement : le refus commun.
			await t.run(async (ctx) => ctx.db.patch(organizationId, { accesOffert: undefined }));
			expect(await consommer(t)).toEqual({ ok: false, raison: REFUS_DU_CODE });
		},
		DELAI
	);

	it(
		'garde sa remise en attente tant qu’aucun abonnement ne court',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, codeId } = await installer(t, {
				avantage: { genre: 'REMISE', pourcent: 50, mois: 3 }
			});
			const resultat = await consommer(t);
			expect(resultat).toMatchObject({ ok: true, titre: '−50\u00a0% pendant 3 mois' });
			await t.run(async (ctx) => {
				const org = await ctx.db.get(organizationId);
				expect(org?.remisePrivilege).toMatchObject({
					pourcent: 50,
					mois: 3,
					codeId,
					etat: 'EN_ATTENTE'
				});
				// Rien d'ouvert de plus : Découverte, jusqu'à la formule.
				expect(resolveEffectivePlan(org!).tier).toBe('none');
			});
		},
		DELAI
	);

	it(
		'ne sert plus une fois révoqué ou expiré, avec le même refus qu’un code inconnu',
		async () => {
			const t = convexTest(schema, modules);
			const { codeId } = await installer(t, { expireLe: Date.now() - 1 });
			expect(await consommer(t)).toEqual({ ok: false, raison: REFUS_DU_CODE });
			await t.run(async (ctx) =>
				ctx.db.patch(codeId, { expireLe: undefined, revoqueLe: Date.now() })
			);
			expect(await consommer(t)).toEqual({ ok: false, raison: REFUS_DU_CODE });
			expect(await consommer(t, 'ZZZZ-ZZZZ-ZZZZ-ZZZZ')).toEqual({
				ok: false,
				raison: REFUS_DU_CODE
			});
		},
		DELAI
	);

	it(
		'ne s’utilise que par un administrateur de l’établissement',
		async () => {
			const t = convexTest(schema, modules);
			const { codeId } = await installer(t, { role: 'ORG_MEMBER' });
			expect(await consommer(t)).toEqual({ ok: false, raison: REFUS_SANS_ADMINISTRATEUR });
			await t.run(async (ctx) => {
				expect((await ctx.db.get(codeId))?.utiliseLe).toBeUndefined();
			});
		},
		DELAI
	);

	it(
		`s’arrête après ${MAX_ESSAIS} essais manqués, même pour le bon code`,
		async () => {
			const t = convexTest(schema, modules);
			await installer(t);
			for (let i = 0; i < MAX_ESSAIS; i++) {
				expect(await consommer(t, 'ZZZZ-ZZZZ-ZZZZ-ZZZZ')).toMatchObject({ ok: false });
			}
			expect(await consommer(t)).toEqual({ ok: false, raison: REFUS_TROP_D_ESSAIS });
		},
		DELAI
	);

	it(
		'laisse le code à qui saura s’en servir quand l’établissement a déjà un accès à vie',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, codeId } = await installer(t);
			await t.run(async (ctx) =>
				ctx.db.patch(organizationId, {
					accesOffert: { formule: 'solo', depuis: Date.now(), codeId }
				})
			);
			expect(await consommer(t)).toMatchObject({ ok: false });
			await t.run(async (ctx) => {
				expect((await ctx.db.get(codeId))?.utiliseLe).toBeUndefined();
			});
		},
		DELAI
	);

	it(
		'se montre sans se consommer à l’examen',
		async () => {
			const t = convexTest(schema, modules);
			const { codeId } = await installer(t);
			const examen = await t.query(internal.codesPrivilege._examiner, {
				userId: 'gerant',
				empreinte: await empreinteDuCode(CODE)
			});
			expect(examen).toMatchObject({ ok: true, titre: 'Accès Pro offert à vie' });
			await t.run(async (ctx) => {
				expect((await ctx.db.get(codeId))?.utiliseLe).toBeUndefined();
			});
		},
		DELAI
	);
});

describe('la révocation', () => {
	ouvrirLaFacturation();

	it(
		'retire l’accès à vie d’un code déjà utilisé, et le note au journal',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, codeId } = await installer(t);
			await consommer(t);
			await t.run((ctx) => revoquerLeCode(ctx, codeId, 'fondateur@letikette.com'));
			await t.run(async (ctx) => {
				const org = await ctx.db.get(organizationId);
				expect(org?.accesOffert).toBeUndefined();
				expect(resolveEffectivePlan(org!).tier).toBe('none');
				expect((await ctx.db.get(codeId))?.revoquePar).toBe('fondateur@letikette.com');
				const journal = await ctx.db.query('journalEquipe').collect();
				expect(journal.map((j) => j.action)).toEqual(['CODE_REVOQUE']);
				expect(journal[0]?.cible.libelle).not.toContain('ABCD');
			});
		},
		DELAI
	);

	it(
		'efface la remise qui attendait, et ne révoque pas deux fois',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, codeId } = await installer(t, {
				avantage: { genre: 'REMISE', pourcent: 100, mois: 2 }
			});
			await consommer(t);
			await t.run((ctx) => revoquerLeCode(ctx, codeId, 'fondateur@letikette.com'));
			await t.run((ctx) => revoquerLeCode(ctx, codeId, 'fondateur@letikette.com'));
			await t.run(async (ctx) => {
				expect((await ctx.db.get(organizationId))?.remisePrivilege).toBeUndefined();
				expect(await ctx.db.query('journalEquipe').collect()).toHaveLength(1);
			});
		},
		DELAI
	);

	it(
		'ferme un code jamais utilisé',
		async () => {
			const t = convexTest(schema, modules);
			const { codeId } = await installer(t);
			await t.run((ctx) => revoquerLeCode(ctx, codeId, 'fondateur@letikette.com'));
			expect(await consommer(t)).toEqual({ ok: false, raison: REFUS_DU_CODE });
		},
		DELAI
	);
});

describe('la purge d’un établissement qui a utilisé un code', () => {
	it(
		'efface son nom et son lien, garde le code',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId, codeId } = await installer(t);
			await consommer(t);
			await t.mutation(internal.rgpd.purgerEtablissement, { organizationId, passe: 0 });
			await t.run(async (ctx) => {
				const code = await ctx.db.get(codeId);
				expect(code).not.toBeNull();
				expect(code?.utiliseLe).toBeDefined();
				expect(code?.utiliseParOrganisation).toBeUndefined();
				expect(code?.utiliseParNom).toBeUndefined();
			});
		},
		DELAI
	);
});
