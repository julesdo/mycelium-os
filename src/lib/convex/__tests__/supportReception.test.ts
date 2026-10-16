/// <reference types="vite/client" />
import { afterEach, describe, expect, it } from 'vitest';
import { convexTest, type TestConvex } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';

/**
 * LA RÉCEPTION DES E-MAILS DU SUPPORT, VÉRIFIÉE SUR LA BASE (16/10/2026, spec § 5.2).
 *
 * Fermée tant que les relances partent du domaine de Letikette ; ouverte, une signature
 * fausse est refusée, un e-mail ne s'inscrit qu'une fois, un inconnu va « à trier » chez
 * le fondateur, un prospect sur sa fiche, une réponse automatique nulle part.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;
const SECRET = `whsec_${btoa('cle-de-test-du-webhook-de-reception')}`;
const ENV = ['RESEND_RECEPTION_WEBHOOK_SECRET', 'SUPPORT_RECEPTION_DOMAINE', 'RELANCES_EMAIL', 'AUTH_EMAIL'] as const;
const avant = Object.fromEntries(ENV.map((cle) => [cle, process.env[cle]]));

function ouvrir() {
	process.env.RESEND_RECEPTION_WEBHOOK_SECRET = SECRET;
	process.env.SUPPORT_RECEPTION_DOMAINE = 'aide.letikette.com';
	process.env.RELANCES_EMAIL = 'relances@envoi-neutre.fr';
	process.env.AUTH_EMAIL = 'Letikette <bonjour@letikette.com>';
}

afterEach(() => {
	for (const cle of ENV) {
		if (avant[cle] === undefined) Reflect.deleteProperty(process.env, cle);
		else process.env[cle] = avant[cle];
	}
});

async function signer(id: string, timestamp: string, corps: string): Promise<string> {
	const cle = await crypto.subtle.importKey(
		'raw',
		Uint8Array.from(atob(SECRET.replace(/^whsec_/, '')), (c) => c.charCodeAt(0)),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const signature = new Uint8Array(
		await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(`${id}.${timestamp}.${corps}`))
	);
	return `v1,${btoa(String.fromCharCode(...signature))}`;
}

async function trier(
	t: TestConvex<typeof schema>,
	de: string,
	plus: { enTetes?: Record<string, string>; authentification?: Record<string, string> } = {}
) {
	await t.mutation(internal.support.entrant.enregistrer, { emailId: `e-${de}`, de });
	const id = (await t.run(async (ctx) => ctx.db.query('emailsEntrants').order('desc').first()))!._id;
	await t.mutation(internal.support.entrant.trier, {
		id,
		de,
		destinataires: ['bonjour@aide.letikette.com'],
		objet: 'Question sur mon compte',
		texte: 'Bonjour, mon IBAN est FR76 3000 6000 0112 3456 7890 189.\n\nLe 12 oct. Camille a écrit :\n> ancien message',
		html: '',
		enTetes: plus.enTetes ?? {},
		authentification: plus.authentification ?? { spf: 'pass', dkim: 'pass', dmarc: 'pass' }
	});
	return t.run(async (ctx) => ({
		ligne: await ctx.db.get(id),
		conversations: await ctx.db.query('conversationsSupport').collect(),
		messages: await ctx.db.query('messagesSupport').collect()
	}));
}

describe('la route de réception', () => {
	it(
		'répond sans rien traiter tant que la réception est fermée',
		async () => {
			const t = convexTest(schema, modules);
			const reponse = await t.fetch('/resend/reception', { method: 'POST', body: '{}' });
			expect(await reponse.text()).toBe('fermée');
		},
		DELAI_CONVEX
	);

	it(
		'refuse une signature fausse, et n’inscrit un e-mail qu’une fois',
		async () => {
			ouvrir();
			const t = convexTest(schema, modules);
			const corps = JSON.stringify({
				type: 'email.received',
				data: { email_id: 'abc-123', from: 'inconnu@exemple.fr', subject: 'Bonjour' }
			});
			const timestamp = String(Math.floor(Date.now() / 1000));
			const faux = await t.fetch('/resend/reception', {
				method: 'POST',
				body: corps,
				headers: { 'svix-id': 'msg_1', 'svix-timestamp': timestamp, 'svix-signature': 'v1,faux' }
			});
			expect(faux.status).toBe(401);

			const signature = await signer('msg_1', timestamp, corps);
			for (let i = 0; i < 2; i++) {
				const vrai = await t.fetch('/resend/reception', {
					method: 'POST',
					body: corps,
					headers: { 'svix-id': 'msg_1', 'svix-timestamp': timestamp, 'svix-signature': signature }
				});
				expect(vrai.status).toBe(200);
			}
			const lignes = await t.run((ctx) => ctx.db.query('emailsEntrants').collect());
			expect(lignes).toHaveLength(1);
			expect(lignes[0]?.etat).toBe('A_LIRE');
		},
		DELAI_CONVEX
	);
});

describe('le tri', () => {
	it(
		'range un inconnu « à trier », pour le fondateur seul, sans établissement, masqué',
		async () => {
			ouvrir();
			const t = convexTest(schema, modules);
			const { ligne, conversations, messages } = await trier(t, 'Inconnu <inconnu@exemple.fr>');
			expect(ligne?.etat).toBe('LU');
			expect(ligne?.classement).toBe('A_TRIER');
			expect(conversations).toHaveLength(1);
			expect(conversations[0]?.organizationId).toBeUndefined();
			expect(conversations[0]?.reserveeAuFondateur).toBe(true);
			expect(conversations[0]?.etat).toBe('A_NOUS');
			const recu = messages.find((m) => m.genre === 'NON_VERIFIE');
			expect(recu?.texte).not.toContain('3000 6000');
			expect(recu?.texte).not.toContain('ancien message');
		},
		DELAI_CONVEX
	);

	it(
		'range la réponse d’un prospect sur sa fiche',
		async () => {
			ouvrir();
			const t = convexTest(schema, modules);
			const prospectId = await t.run((ctx) =>
				ctx.db.insert('prospects', {
					entreprise: 'Atelier Morel',
					email: 'contact@morel.fr',
					cible: 'PME',
					statut: 'CONTACTE',
					creePar: 'jules@letikette.com',
					creeLe: Date.now()
				})
			);
			const { ligne, conversations } = await trier(t, 'contact@morel.fr');
			expect(ligne?.classement).toBe('PROSPECT');
			expect(conversations).toHaveLength(0);
			const fiche = await t.run(async (ctx) => ({
				prospect: await ctx.db.get(prospectId),
				evenements: await ctx.db.query('evenementsCrm').collect()
			}));
			expect(fiche.prospect?.statut).toBe('A_REPONDU');
			expect(fiche.evenements[0]?.type).toBe('REPONSE');
		},
		DELAI_CONVEX
	);

	it(
		'ignore une réponse automatique, et met de côté ce dont tout échoue',
		async () => {
			ouvrir();
			const t = convexTest(schema, modules);
			const auto = await trier(t, 'absent@exemple.fr', { enTetes: { 'auto-submitted': 'auto-replied' } });
			expect(auto.ligne?.etat).toBe('IGNORE');
			const douteux = await trier(t, 'douteux@exemple.fr', {
				authentification: { spf: 'fail', dkim: 'fail', dmarc: 'fail' }
			});
			expect(douteux.ligne?.etat).toBe('INDESIRABLE');
			expect(douteux.conversations).toHaveLength(0);
		},
		DELAI_CONVEX
	);
});
