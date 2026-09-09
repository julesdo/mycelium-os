/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { EmailId } from '@convex-dev/resend';
import { RETENTION_EVENEMENTS_EMAIL_JOURS } from '../emails/events';

/**
 * LE JOURNAL D'ENVOI, ET CE QU'IL RETENAIT SANS QUE PERSONNE NE LE LISE.
 *
 * `emailEvents` enregistrait la charge utile COMPLÈTE de chaque webhook Resend :
 * l'adresse du destinataire, celles en copie, l'objet du message, les en-têtes.
 * Elle n'a jamais été relue par une seule ligne du produit — aucune requête, un
 * seul `insert` — et elle n'était couverte par AUCUNE purge : ni celle de
 * l'établissement, faute de `organizationId`, ni celle du compte.
 *
 * ⚠️ C'EST LE PIRE RAPPORT POSSIBLE : un risque permanent, sans contrepartie.
 * Un titulaire qui demandait l'effacement de son compte laissait son adresse
 * ici, indéfiniment, dans une table que rien n'ouvrait.
 *
 * DEUX DÉCISIONS, ET ELLES TIENNENT ENSEMBLE.
 *
 * 1. ON N'ÉCRIT PLUS LA CHARGE UTILE. Ce qui sert au suivi — quel envoi, quel
 *    type d'événement, quand — tient dans trois champs sans donnée personnelle.
 *    L'adresse reste chez Resend, sous sa propre rétention, où elle a une raison
 *    d'être.
 * 2. LE JOURNAL A UNE FIN. Un journal de distribution n'est pas une pièce
 *    comptable : il sert à comprendre une panne récente. Passé la fenêtre de
 *    rétention, il ne sert plus à rien et ne peut plus que fuir.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;
const JOUR_MS = 86_400_000;

function evenementResend(destinataire: string) {
	return {
		type: 'email.delivered' as const,
		created_at: '2026-09-03T06:00:00.000Z',
		data: {
			created_at: '2026-09-03T06:00:00.000Z',
			email_id: 'resend_abc',
			from: 'contact@letikette.com',
			to: destinataire,
			subject: 'Ce qui a bougé cette nuit'
		}
	};
}

describe('ce qui est écrit', () => {
	it(
		'n’enregistre plus l’adresse du destinataire',
		async () => {
			const t = convexTest(schema, modules);

			await t.mutation(internal.emails.events.handleEmailEvent, {
				// `vEmailId` est une chaîne marquée par le composant Resend ; le test
				// n'a pas de fabrique pour la produire.
				id: 'resend_abc' as unknown as EmailId,
				event: evenementResend('gerant@ateliers-martin.fr')
			});

			const releves = await t.run(async (ctx) => ctx.db.query('emailEvents').collect());
			expect(releves).toHaveLength(1);
			expect(JSON.stringify(releves[0])).not.toContain('gerant@ateliers-martin.fr');
		},
		DELAI_CONVEX
	);

	it(
		'garde ce qui sert au suivi : l’envoi, le type, le moment',
		async () => {
			const t = convexTest(schema, modules);

			await t.mutation(internal.emails.events.handleEmailEvent, {
				// `vEmailId` est une chaîne marquée par le composant Resend ; le test
				// n'a pas de fabrique pour la produire.
				id: 'resend_abc' as unknown as EmailId,
				event: evenementResend('gerant@ateliers-martin.fr')
			});

			const releve = (await t.run(async (ctx) => ctx.db.query('emailEvents').collect()))[0]!;
			expect(releve.emailId).toBe('resend_abc');
			expect(releve.eventType).toBe('email.delivered');
			expect(typeof releve.timestamp).toBe('number');
		},
		DELAI_CONVEX
	);
});

describe('la rétention du journal', () => {
	async function poser(
		t: ReturnType<typeof convexTest>,
		lignes: Array<{ ageJours: number; avecCharge?: boolean }>
	) {
		await t.run(async (ctx) => {
			for (const [rang, ligne] of lignes.entries()) {
				await ctx.db.insert('emailEvents', {
					emailId: `resend_${rang}`,
					eventType: 'email.delivered',
					timestamp: Date.now() - ligne.ageJours * JOUR_MS,
					data: ligne.avecCharge === true ? evenementResend('ancien@exemple.fr') : undefined
				});
			}
		});
	}

	it(
		'supprime ce qui a dépassé la fenêtre, garde ce qui est dedans',
		async () => {
			const t = convexTest(schema, modules);
			await poser(t, [
				{ ageJours: RETENTION_EVENEMENTS_EMAIL_JOURS + 1 },
				{ ageJours: RETENTION_EVENEMENTS_EMAIL_JOURS - 1 },
				{ ageJours: 0 }
			]);

			await t.mutation(internal.emails.events.purgerJournalEnvois, { passe: 0 });

			const restants = await t.run(async (ctx) => ctx.db.query('emailEvents').collect());
			expect(restants).toHaveLength(2);
			expect(restants.map((r) => r.emailId).sort()).toEqual(['resend_1', 'resend_2']);
		},
		DELAI_CONVEX
	);

	it(
		'efface la charge utile des lignes d’avant, sans attendre leur expiration',
		async () => {
			// Les lignes écrites AVANT ce changement portent l'adresse et sont
			// encore dans la fenêtre. Attendre qu'elles expirent laisserait ces
			// adresses lisibles pendant des mois, alors qu'elles ne servent à rien.
			const t = convexTest(schema, modules);
			await poser(t, [{ ageJours: 1, avecCharge: true }]);

			await t.mutation(internal.emails.events.purgerJournalEnvois, { passe: 0 });

			const restants = await t.run(async (ctx) => ctx.db.query('emailEvents').collect());
			expect(restants).toHaveLength(1);
			expect(restants[0]!.data).toBeUndefined();
			expect(JSON.stringify(restants[0])).not.toContain('ancien@exemple.fr');
		},
		DELAI_CONVEX
	);

	it(
		'ne touche pas à une ligne récente et déjà propre',
		async () => {
			const t = convexTest(schema, modules);
			await poser(t, [{ ageJours: 1 }]);

			await t.mutation(internal.emails.events.purgerJournalEnvois, { passe: 0 });

			const restants = await t.run(async (ctx) => ctx.db.query('emailEvents').collect());
			expect(restants).toHaveLength(1);
			expect(restants[0]!.emailId).toBe('resend_0');
		},
		DELAI_CONVEX
	);
});

/**
 * UNE RÉTENTION QUE PERSONNE N'APPELLE N'EST PAS UNE RÉTENTION.
 *
 * C'est le défaut le plus facile à commettre ici : écrire la purge, la tester,
 * et oublier de la déclencher. Le journal grossirait alors exactement comme
 * avant, avec en plus la conviction écrite que le problème est réglé.
 */
describe('le déclenchement', () => {
	it('est branché sur un cron quotidien', async () => {
		const crons = (await import('../crons')).default as unknown as {
			crons: Record<string, { name?: string; args?: unknown; schedule: unknown }>;
		};
		const declaré = Object.values(crons.crons).some((job) =>
			JSON.stringify(job).includes('purgerJournalEnvois')
		);
		expect(declaré).toBe(true);
	});
});
