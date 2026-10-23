/// <reference types="vite/client" />
import { afterEach, describe, expect, it, vi } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { enregistrerLaMarque } from '../recouvrement/marque';

/**
 * LA RELANCE QUI PART AVEC L'IMAGE DU GÉRANT (23/10/2026).
 *
 * Le logo voyage DANS l'e-mail : la relance part donc par l'API de Resend, et
 * plus par le composant, qui envoie par lots sans pièce jointe. Ce qui le rend
 * sûr se vérifie ici :
 *
 * 1. LE LOGO EST JOINT, APPELÉ PAR `cid:`, et aucune image n'est hébergée.
 * 2. UNE MÊME RELANCE NE PART QU'UNE FOIS : la clé d'idempotence la nomme.
 * 3. UNE PANNE PASSAGÈRE SE RÉESSAIE ; UN REFUS DÉFINITIF REND LA RELANCE AU
 *    GÉRANT, ET LE LUI DIT.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;
const JOUR = new Date().toISOString().slice(0, 10);
/** L'en-tête d'un PNG, assez pour un fichier que le test reconnaît. */
const OCTETS_PNG = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);

afterEach(() => {
	vi.unstubAllGlobals();
	Reflect.deleteProperty(process.env, 'RESEND_API_KEY');
	Reflect.deleteProperty(process.env, 'RELANCES_EMAIL');
});

/** Un établissement à l'image posée, un client, son dossier, et une relance partie. */
async function relancePartie(t: ReturnType<typeof convexTest>) {
	const { organizationId, factureId } = await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Ateliers Martin',
			createdAt: Date.now()
		});
		await ctx.db.insert('organizationMembers', {
			organizationId,
			userId: 'user_test_1',
			role: 'ORG_ADMIN',
			joinedAt: Date.now()
		});
		const storageId = await ctx.storage.store(new Blob([OCTETS_PNG], { type: 'image/png' }));
		await ctx.db.insert('profilsCreancier', {
			organizationId,
			denomination: 'Ateliers Martin',
			email: 'compta@ateliers-martin.fr',
			estCommercant: 'ok',
			logoCourriers: { storageId, largeur: 600, hauteur: 200 },
			couleurCourriers: '#1e3a5f',
			majLe: Date.now()
		});
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Fournitures Durand',
			denominationNormalisee: 'FOURNITURES DURAND',
			denominationsBrutes: ['Fournitures Durand'],
			estCommercant: 'ok',
			santeFinanciere: 'SAINE',
			email: 'compta@durand.fr',
			creeLe: Date.now()
		});
		const factureId = await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			reference: 'FA-2026-0042',
			montantHT: 0n,
			montantTTC: 1_200_00n,
			dateEmission: '2026-01-01',
			dateEcheance: '2026-02-01',
			statutPaiement: 'IMPAYEE',
			creeLe: Date.now()
		});
		return { organizationId, factureId };
	});
	const creanceId: Id<'creances'> = await t.mutation(
		internal.recouvrement.creances.creerCreance,
		{ organizationId, factureIds: [factureId], aujourdHui: JOUR }
	);
	const envoiId = await t.run(async (ctx) =>
		ctx.db.insert('envois', {
			organizationId,
			creanceId,
			modele: 'RELANCE_OFFICIELLE',
			destinataire: 'compta@durand.fr',
			canal: 'MESSAGERIE',
			objet: 'Facture FA-2026-0042 en attente',
			corps: 'Madame, Monsieur,\n\nLa facture FA-2026-0042 reste à régler.\n\nAteliers Martin',
			resume: [],
			choix: '{}',
			etat: 'PARTI',
			preparePar: 'pilote',
			prepareLe: Date.now(),
			partiLe: JOUR,
			etapePlan: 'RAPPEL'
		})
	);
	return { organizationId, creanceId, envoiId };
}

function resendRepond(status: number, corps: unknown) {
	const appel = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
		async () =>
			new Response(JSON.stringify(corps), {
				status,
				headers: { 'Content-Type': 'application/json' }
			})
	);
	vi.stubGlobal('fetch', appel);
	return appel;
}

describe('l’envoi d’une relance à l’image du gérant', () => {
	it(
		'joint le logo, l’appelle par cid:, et n’héberge aucune image',
		async () => {
			const t = convexTest(schema, modules);
			const { envoiId } = await relancePartie(t);
			process.env.RESEND_API_KEY = 're_test';
			process.env.RELANCES_EMAIL = 'relances@example.com';
			const appel = resendRepond(200, { id: 'courriel_1' });

			await t.action(internal.recouvrement.expedition.expedier, { envoiId });

			expect(appel).toHaveBeenCalledTimes(1);
			const [url, init] = appel.mock.calls[0]!;
			expect(url).toBe('https://api.resend.com/emails');
			const entetes = new Headers(init?.headers);
			expect(entetes.get('Idempotency-Key')).toContain(envoiId);
			const envoye = JSON.parse(String(init?.body)) as {
				from: string;
				to: string[];
				reply_to: string[];
				html: string;
				text: string;
				attachments: { content_id: string; content_type: string; content: string }[];
			};
			expect(envoye.from).toBe('"Ateliers Martin" <relances@example.com>');
			expect(envoye.to).toEqual(['compta@durand.fr']);
			expect(envoye.reply_to).toEqual(['compta@ateliers-martin.fr']);
			expect(envoye.html).toContain('src="cid:logo"');
			expect(envoye.html).toContain('border-top:4px solid #1e3a5f');
			expect(envoye.html).not.toMatch(/<img[^>]+src="https?:/);
			expect(envoye.text).toContain('La facture FA-2026-0042 reste à régler.');
			expect(envoye.attachments).toHaveLength(1);
			expect(envoye.attachments[0]!.content_id).toBe('logo');
			expect(envoye.attachments[0]!.content_type).toBe('image/png');
			expect(envoye.attachments[0]!.content).toBe(btoa(String.fromCharCode(...OCTETS_PNG)));
		},
		DELAI_CONVEX
	);

	it(
		'rend la relance au gérant quand Resend la refuse, et le lui dit',
		async () => {
			const t = convexTest(schema, modules);
			const { envoiId } = await relancePartie(t);
			process.env.RESEND_API_KEY = 're_test';
			process.env.RELANCES_EMAIL = 'relances@example.com';
			resendRepond(422, { message: 'Invalid `to` field.' });

			await t.action(internal.recouvrement.expedition.expedier, { envoiId });

			const envoi = await t.run(async (ctx) => ctx.db.get(envoiId));
			expect(envoi?.etat).toBe('A_VALIDER');
			expect(envoi?.partiLe).toBeUndefined();
			const notifications = await t.run(async (ctx) => ctx.db.query('notifications').collect());
			const avis = notifications.find((n) => n.type === 'PILOTE_BLOQUE');
			expect(avis?.message).toContain('n’est pas parti');
			expect(avis?.link).toContain(envoiId);
		},
		DELAI_CONVEX
	);

	it(
		'réessaie plus tard une panne passagère, sans rien rendre',
		async () => {
			const t = convexTest(schema, modules);
			const { envoiId } = await relancePartie(t);
			process.env.RESEND_API_KEY = 're_test';
			process.env.RELANCES_EMAIL = 'relances@example.com';
			resendRepond(503, { message: 'Service unavailable' });

			await t.action(internal.recouvrement.expedition.expedier, { envoiId });

			const envoi = await t.run(async (ctx) => ctx.db.get(envoiId));
			expect(envoi?.etat).toBe('PARTI');
			const planifiees = await t.run(async (ctx) =>
				ctx.db.system.query('_scheduled_functions').collect()
			);
			expect(planifiees.some((f) => f.name.includes('expedition') && f.args[0]?.tentative === 2)).toBe(
				true
			);
		},
		DELAI_CONVEX
	);
});

describe('poser l’image de ses courriers', () => {
	it(
		'pose la couleur et le logo, et efface l’ancien fichier',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId } = await relancePartie(t);
			const ancien = await t.run(
				async (ctx) =>
					(await ctx.db.query('profilsCreancier').first())!.logoCourriers!.storageId
			);
			const nouveau = await t.run(async (ctx) =>
				ctx.storage.store(new Blob([OCTETS_PNG], { type: 'image/png' }))
			);

			const refus = await t.run(async (ctx) =>
				enregistrerLaMarque(ctx, organizationId, {
					couleur: '#2451B7',
					logo: { storageId: nouveau, largeur: 300, hauteur: 100 }
				})
			);
			expect(refus).toBeNull();

			const profil = await t.run(async (ctx) => ctx.db.query('profilsCreancier').first());
			expect(profil?.couleurCourriers).toBe('#2451b7');
			expect(profil?.logoCourriers).toEqual({
				storageId: nouveau,
				largeur: 300,
				hauteur: 100,
				teintes: []
			});
			expect(await t.run(async (ctx) => ctx.db.system.get(ancien))).toBeNull();
		},
		DELAI_CONVEX
	);

	it(
		'retire le logo et la couleur sur demande',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId } = await relancePartie(t);

			await t.run(async (ctx) =>
				enregistrerLaMarque(ctx, organizationId, { couleur: null, logo: 'RETIRER' })
			);

			const profil = await t.run(async (ctx) => ctx.db.query('profilsCreancier').first());
			expect(profil?.couleurCourriers).toBeUndefined();
			expect(profil?.logoCourriers).toBeUndefined();
		},
		DELAI_CONVEX
	);

	it(
		'refuse une couleur qui n’en est pas une, en la nommant',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId } = await relancePartie(t);

			const refus = await t.run(async (ctx) =>
				enregistrerLaMarque(ctx, organizationId, { couleur: 'bleu', logo: 'GARDER' })
			);
			expect(refus).toContain('« bleu »');
		},
		DELAI_CONVEX
	);

	it(
		'refuse un logo démesuré, et efface le fichier refusé',
		async () => {
			const t = convexTest(schema, modules);
			const { organizationId } = await relancePartie(t);
			const geant = await t.run(async (ctx) =>
				ctx.storage.store(new Blob([OCTETS_PNG], { type: 'image/png' }))
			);

			const refus = await t.run(async (ctx) =>
				enregistrerLaMarque(ctx, organizationId, {
					couleur: null,
					logo: { storageId: geant, largeur: 5000, hauteur: 100 }
				})
			);
			expect(refus).toContain('PNG');
			expect(await t.run(async (ctx) => ctx.db.system.get(geant))).toBeNull();
		},
		DELAI_CONVEX
	);

	it(
		'envoie la lettre sans logo quand le fichier n’est pas un PNG',
		async () => {
			const t = convexTest(schema, modules);
			const { envoiId } = await relancePartie(t);
			await t.run(async (ctx) => {
				const profil = (await ctx.db.query('profilsCreancier').first())!;
				const jpeg = await ctx.storage.store(new Blob([new Uint8Array([255, 216, 255, 224])]));
				await ctx.db.patch(profil._id, {
					logoCourriers: { storageId: jpeg, largeur: 300, hauteur: 100 }
				});
			});
			process.env.RESEND_API_KEY = 're_test';
			process.env.RELANCES_EMAIL = 'relances@example.com';
			const appel = resendRepond(200, { id: 'courriel_2' });

			await t.action(internal.recouvrement.expedition.expedier, { envoiId });

			const envoye = JSON.parse(String(appel.mock.calls[0]![1]?.body)) as {
				html: string;
				attachments?: unknown[];
			};
			expect(envoye.attachments).toBeUndefined();
			expect(envoye.html).not.toContain('<img');
			expect(envoye.html).toContain('Ateliers Martin');
		},
		DELAI_CONVEX
	);
});
