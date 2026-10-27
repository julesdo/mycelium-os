/// <reference types="vite/client" />
import { afterEach, describe, expect, it } from 'vitest';
import { convexTest, type TestConvex } from 'convex-test';
import schema from '../schema';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { ecrireAuSupport } from '../support/fil';
import { conversationDuGerant } from '../support/commun';
import { lireContexteDuCompte } from '../support/contexte';
import { repondreCommeEquipe } from '../admin/support';

/**
 * LE SERVICE CLIENT, VÉRIFIÉ SUR LA BASE (16/10/2026,
 * `docs/superpowers/specs/2026-10-16-service-client.md`).
 *
 * Ce qui rend le module tenable : une question ordinaire réveille Plume, une demande
 * d'acte passe à l'équipe à l'instant, ce qui se colle par mégarde n'est jamais écrit,
 * une réponse arrivée trop tard est jetée, une conversation reste privée à son auteur,
 * et le contexte que lit Plume ne contient jamais un client ni un montant.
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;
const USAGE = { tokensIn: 100, tokensOut: 50, cacheReadTokens: 0, coutEstime: 0.001 };

async function etablissement(t: TestConvex<typeof schema>) {
	return t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: 'Garnier Bâtiment',
			createdAt: Date.now()
		});
		await ctx.db.insert('organizationMembers', {
			organizationId,
			userId: 'user_gerant',
			role: 'ORG_ADMIN',
			joinedAt: Date.now()
		});
		return organizationId;
	});
}

function ecrire(
	t: TestConvex<typeof schema>,
	organizationId: Id<'organizations'>,
	args: Parameters<typeof ecrireAuSupport>[2]
) {
	return t.run((ctx) =>
		ecrireAuSupport(
			ctx,
			{ userId: 'user_gerant', nom: 'Jules', organisation: async () => organizationId },
			args
		)
	);
}

async function etat(t: TestConvex<typeof schema>, conversationId: Id<'conversationsSupport'>) {
	return t.run(async (ctx) => ({
		conversation: await ctx.db.get(conversationId),
		messages: await ctx.db
			.query('messagesSupport')
			.withIndex('by_conversation', (q) => q.eq('conversationId', conversationId))
			.collect(),
		planifiees: await ctx.db.system.query('_scheduled_functions').collect()
	}));
}

const plumeOuvert = process.env.PLUME_SUPPORT_OUVERT;
afterEach(() => {
	if (plumeOuvert === undefined) Reflect.deleteProperty(process.env, 'PLUME_SUPPORT_OUVERT');
	else process.env.PLUME_SUPPORT_OUVERT = plumeOuvert;
});

describe('le fil du gérant', () => {
	it(
		'réveille Plume sur une question de fonctionnement',
		async () => {
			process.env.PLUME_SUPPORT_OUVERT = 'oui';
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);

			const id = await ecrire(t, organizationId, { texte: 'Comment activer les relances ?' });

			const { conversation, messages, planifiees } = await etat(t, id);
			expect(conversation?.etat).toBe('PLUME');
			expect(conversation?.plumeReflechitDepuis).toBeDefined();
			expect(conversation?.titre).toBe('Comment activer les relances ?');
			expect(messages.map((m) => m.auteur)).toEqual(['GERANT']);
			expect(planifiees.some((f) => f.name.includes('support/plume'))).toBe(true);
		},
		DELAI_CONVEX
	);

	it(
		'passe une demande d’acte à l’équipe à l’instant, sans appeler Plume',
		async () => {
			process.env.PLUME_SUPPORT_OUVERT = 'oui';
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);

			const id = await ecrire(t, organizationId, { texte: 'Je veux un remboursement' });

			const { conversation, messages, planifiees } = await etat(t, id);
			expect(conversation?.etat).toBe('A_NOUS');
			expect(conversation?.raisonDePassage).toBe('ACTE');
			expect(conversation?.acte).toBe('REMBOURSEMENT');
			expect(conversation?.sujet).toBe('ABONNEMENT');
			expect(messages.some((m) => m.evenement === 'PASSE')).toBe(true);
			expect(planifiees.some((f) => f.name.includes('support/plume'))).toBe(false);
		},
		DELAI_CONVEX
	);

	it(
		'envoie tout à l’équipe tant que Plume support est fermé',
		async () => {
			Reflect.deleteProperty(process.env, 'PLUME_SUPPORT_OUVERT');
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);

			const id = await ecrire(t, organizationId, { texte: 'Comment activer les relances ?' });

			const { conversation } = await etat(t, id);
			expect(conversation?.etat).toBe('A_NOUS');
			expect(conversation?.raisonDePassage).toBe('FERME');
		},
		DELAI_CONVEX
	);

	it(
		'n’écrit jamais un IBAN collé par mégarde',
		async () => {
			process.env.PLUME_SUPPORT_OUVERT = 'oui';
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);

			const id = await ecrire(t, organizationId, {
				texte: 'Mon IBAN FR76 3000 6000 0112 3456 7890 189 est-il bien enregistré ?'
			});

			const { messages, conversation } = await etat(t, id);
			expect(messages[0]?.texte).not.toContain('3000 6000');
			expect(conversation?.titre).not.toContain('3000 6000');
			expect(messages[0]?.masques).toEqual([{ genre: 'IBAN', nombre: 1 }]);
		},
		DELAI_CONVEX
	);

	it(
		'répond par deux cartes, sans le modèle, à « arrêtez l’envoi »',
		async () => {
			process.env.PLUME_SUPPORT_OUVERT = 'oui';
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);

			const id = await ecrire(t, organizationId, { texte: 'Arrêtez l’envoi de cette relance !' });

			const { conversation, messages, planifiees } = await etat(t, id);
			expect(conversation?.etat).toBe('PLUME');
			expect(messages.find((m) => m.auteur === 'PLUME')?.carte).toBe('ARRETER_LES_ENVOIS');
			expect(planifiees.some((f) => f.name.includes('support/plume'))).toBe(false);
		},
		DELAI_CONVEX
	);

	it(
		'garde la conversation privée à son auteur, même pour un administrateur',
		async () => {
			process.env.PLUME_SUPPORT_OUVERT = 'oui';
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);
			const id = await ecrire(t, organizationId, { texte: 'Comment activer les relances ?' });
			await t.run(async (ctx) => {
				await ctx.db.insert('organizationMembers', {
					organizationId,
					userId: 'user_collegue',
					role: 'ORG_ADMIN',
					joinedAt: Date.now()
				});
			});

			expect(await t.run((ctx) => conversationDuGerant(ctx, id, 'user_collegue'))).toBeNull();
			expect(await t.run((ctx) => conversationDuGerant(ctx, id, 'user_gerant'))).not.toBeNull();
		},
		DELAI_CONVEX
	);
});

describe('la réponse de Plume', () => {
	it(
		's’écrit, se compte et rend la main au gérant',
		async () => {
			process.env.PLUME_SUPPORT_OUVERT = 'oui';
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);
			const id = await ecrire(t, organizationId, { texte: 'Comment activer les relances ?' });
			const question = (await etat(t, id)).messages[0]!;

			await t.mutation(internal.support.lecture.consignerReponse, {
				conversationId: id,
				messageId: question._id,
				phrases: [{ texte: 'Dans Aujourd’hui, le bloc Le pilote.', source: { genre: 'ARTICLE', cle: 'activer' } }],
				ecrans: ['PILOTE', 'HORS_LISTE'],
				sujet: 'RELANCES',
				nePeutPasRepondre: false,
				questionDeDossier: false,
				usage: USAGE
			});

			const { conversation, messages } = await etat(t, id);
			expect(conversation?.plumeReflechitDepuis).toBeUndefined();
			expect(conversation?.sujet).toBe('RELANCES');
			const reponse = messages.find((m) => m.auteur === 'PLUME');
			expect(reponse?.ecrans).toEqual(['PILOTE']);
			const compteurs = await t.run((ctx) => ctx.db.query('compteursSupport').collect());
			expect(compteurs.map((c) => c.reponses)).toEqual([1, 1]);
		},
		DELAI_CONVEX
	);

	it(
		'est jetée, son coût compté, si le gérant a demandé l’équipe entre-temps',
		async () => {
			process.env.PLUME_SUPPORT_OUVERT = 'oui';
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);
			const id = await ecrire(t, organizationId, { texte: 'Comment activer les relances ?' });
			const question = (await etat(t, id)).messages[0]!;
			await ecrire(t, organizationId, {
				conversationId: id,
				texte: 'Je préfère parler à quelqu’un'
			});

			await t.mutation(internal.support.lecture.consignerReponse, {
				conversationId: id,
				messageId: question._id,
				phrases: [{ texte: 'Dans Aujourd’hui.', source: { genre: 'ARTICLE', cle: 'activer' } }],
				ecrans: [],
				sujet: 'RELANCES',
				nePeutPasRepondre: false,
				questionDeDossier: false,
				usage: USAGE
			});

			const { conversation, messages } = await etat(t, id);
			expect(conversation?.etat).toBe('A_NOUS');
			expect(messages.some((m) => m.auteur === 'PLUME')).toBe(false);
			const compteurs = await t.run((ctx) => ctx.db.query('compteursSupport').collect());
			expect(compteurs.length).toBe(2);
		},
		DELAI_CONVEX
	);

	it(
		'passe la main quand Plume ne sait pas, ou quand l’appel tombe',
		async () => {
			process.env.PLUME_SUPPORT_OUVERT = 'oui';
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);
			const un = await ecrire(t, organizationId, { texte: 'Comment activer les relances ?' });
			const deux = await ecrire(t, organizationId, { texte: 'Et les horaires d’envoi ?' });

			await t.mutation(internal.support.lecture.consignerReponse, {
				conversationId: un,
				messageId: (await etat(t, un)).messages[0]!._id,
				phrases: [{ texte: 'Je passe la main à l’équipe.', source: { genre: 'AUCUNE' } }],
				ecrans: [],
				sujet: 'AUTRE',
				nePeutPasRepondre: true,
				questionDeDossier: false,
				usage: USAGE
			});
			await t.mutation(internal.support.lecture.consignerPanne, {
				conversationId: deux,
				messageId: (await etat(t, deux)).messages[0]!._id
			});

			expect((await etat(t, un)).conversation?.raisonDePassage).toBe('LACUNE');
			expect((await etat(t, deux)).conversation?.raisonDePassage).toBe('PANNE');
		},
		DELAI_CONVEX
	);
});

describe('l’entretien', () => {
	it(
		'fait passer la main à un Plume qui réfléchit depuis trop longtemps',
		async () => {
			process.env.PLUME_SUPPORT_OUVERT = 'oui';
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);
			const id = await ecrire(t, organizationId, { texte: 'Comment activer les relances ?' });
			const ilYADixMinutes = Date.now() - 10 * 60 * 1000;
			await t.run(async (ctx) => {
				await ctx.db.patch(id, { plumeReflechitDepuis: ilYADixMinutes, dernierMessageLe: ilYADixMinutes });
			});

			await t.mutation(internal.support.entretien.entretenir, {});

			expect((await etat(t, id)).conversation?.raisonDePassage).toBe('PANNE');
		},
		DELAI_CONVEX
	);
});

describe('le contexte que lit Plume', () => {
	it(
		'compte les dossiers sans jamais nommer un client ni dire un montant',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);
			await t.run(async (ctx) => {
				const debiteurId = await ctx.db.insert('debiteurs', {
					organizationId,
					denomination: 'DURAND-SENTINELLE',
					denominationNormalisee: 'DURAND SENTINELLE',
					denominationsBrutes: ['DURAND-SENTINELLE'],
					estCommercant: 'ok',
					santeFinanciere: 'SAINE',
					creeLe: Date.now()
				});
				const factureId = await ctx.db.insert('facturesVente', {
					organizationId,
					debiteurId,
					reference: 'FA-SENTINELLE-0042',
					montantHT: 0n,
					montantTTC: 9_876_543n,
					dateEmission: '2026-01-01',
					dateEcheance: '2026-02-01',
					statutPaiement: 'IMPAYEE',
					creeLe: Date.now()
				});
				return factureId;
			});
			const factureId = await t.run(
				async (ctx) => (await ctx.db.query('facturesVente').first())!._id
			);
			await t.mutation(internal.recouvrement.creances.creerCreance, {
				organizationId,
				factureIds: [factureId],
				aujourdHui: new Date().toISOString().slice(0, 10)
			});

			const contexte = await t.run((ctx) => lireContexteDuCompte(ctx, organizationId, 'user_gerant'));
			const serialise = JSON.stringify(contexte);

			expect(serialise).not.toMatch(/DURAND|SENTINELLE|9876|98 765|FA-/);
			expect(contexte.relancesBloquees.emailClient).toBe(1);
		},
		DELAI_CONVEX
	);

	// Audit des parcours Pro du 27/10/2026 : Arnaud, soldé, restait « à démarrer » ici
	// alors que les écrans du gérant ne le proposaient plus.
	it(
		'ne compte pas à démarrer un dossier préparé que son client a soldé',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);
			await t.run(async (ctx) => {
				for (const [nom, montantTTC, regle] of [
					['Arnaud', 481_240n, 481_240n],
					['Durand', 1_240_000n, 0n]
				] as const) {
					const debiteurId = await ctx.db.insert('debiteurs', {
						organizationId,
						denomination: nom,
						denominationNormalisee: nom.toUpperCase(),
						denominationsBrutes: [nom],
						estCommercant: 'ok',
						santeFinanciere: 'SAINE',
						creeLe: Date.now()
					});
					const creanceId = await ctx.db.insert('creances', {
						organizationId,
						debiteurId,
						statut: 'BROUILLON',
						certaine: 'unknown',
						liquide: 'ok',
						exigible: 'ok',
						entreCommercants: 'ok',
						aDemarrer: true,
						creeLe: Date.now()
					});
					const factureId = await ctx.db.insert('facturesVente', {
						organizationId,
						debiteurId,
						creanceId,
						reference: `F-${nom}`,
						montantHT: 0n,
						montantTTC,
						dateEmission: '2026-01-01',
						dateEcheance: '2026-02-01',
						statutPaiement: 'IMPAYEE',
						creeLe: Date.now()
					});
					if (regle > 0n) {
						await ctx.db.insert('reglements', {
							organizationId,
							factureId,
							date: '2026-10-20',
							montant: regle,
							nature: 'PAIEMENT',
							creeLe: Date.now()
						});
					}
				}
			});

			const contexte = await t.run((ctx) => lireContexteDuCompte(ctx, organizationId, 'user_gerant'));

			expect(contexte.dossiersADemarrer).toBe(1);
		},
		DELAI_CONVEX
	);
});

describe('la réponse de l’équipe', () => {
	const camille = {
		email: 'camille@letikette.com',
		role: 'SUPPORT' as const,
		userId: 'user_camille',
		nom: 'Camille Dupont'
	};

	async function equipe(t: TestConvex<typeof schema>, prenom?: string) {
		await t.run(async (ctx) => {
			await ctx.db.insert('equipe', {
				email: camille.email,
				role: 'SUPPORT',
				invitePar: 'amorçage',
				inviteLe: Date.now(),
				rejointLe: Date.now(),
				...(prenom === undefined ? {} : { prenomAffiche: prenom })
			});
		});
	}

	it(
		'arrive dans le fil, annonce l’humain une fois, notifie le gérant et programme l’e-mail',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);
			await equipe(t, 'Camille');
			const id = await ecrire(t, organizationId, { texte: 'Je veux un remboursement' });

			await t.run((ctx) =>
				repondreCommeEquipe(ctx, camille, { conversationId: id, texte: 'C’est fait.', terminer: false, confirme: false })
			);
			await t.run((ctx) =>
				repondreCommeEquipe(ctx, camille, { conversationId: id, texte: 'Autre chose ?', terminer: false, confirme: false })
			);

			const { conversation, messages, planifiees } = await etat(t, id);
			expect(conversation?.etat).toBe('EN_ATTENTE_CLIENT');
			expect(conversation?.repondantNom).toBe('Camille');
			expect(conversation?.premiereReponseOuvreeMin).toBeDefined();
			expect(messages.filter((m) => m.evenement === 'REJOINT')).toHaveLength(1);
			expect(messages.filter((m) => m.auteur === 'EQUIPE').map((m) => m.auteurNom)).toEqual(['Camille', 'Camille']);
			expect(planifiees.filter((f) => f.name.includes('envoyerLaReponse'))).toHaveLength(2);
			const notifications = await t.run((ctx) => ctx.db.query('notifications').collect());
			expect(notifications[0]?.link).toBe(`/app/aide/${id}`);
			expect(notifications[0]?.title).toBe('Camille vous a répondu');
		},
		DELAI_CONVEX
	);

	it(
		'refuse le mot interdit, et demande de confirmer une voie de justice',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);
			await equipe(t, 'Camille');
			const id = await ecrire(t, organizationId, { texte: 'Je veux un remboursement' });

			await expect(
				t.run((ctx) =>
					repondreCommeEquipe(ctx, camille, { conversationId: id, texte: 'Nous vous garantissons tout.', terminer: false, confirme: true })
				)
			).rejects.toThrow(/garantie/);
			await expect(
				t.run((ctx) =>
					repondreCommeEquipe(ctx, camille, { conversationId: id, texte: 'Il faudrait saisir le tribunal.', terminer: false, confirme: false })
				)
			).rejects.toThrow(/confirmez/);
		},
		DELAI_CONVEX
	);

	it(
		'ne répond pas sans le prénom que verront les clients',
		async () => {
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);
			await equipe(t);
			const id = await ecrire(t, organizationId, { texte: 'Je veux un remboursement' });

			await expect(
				t.run((ctx) =>
					repondreCommeEquipe(ctx, camille, { conversationId: id, texte: 'Bonjour.', terminer: false, confirme: false })
				)
			).rejects.toThrow(/prénom/);
		},
		DELAI_CONVEX
	);
});

describe('la mesure', () => {
	it(
		'se matérialise dans un seul document, sans aucun texte de gérant',
		async () => {
			process.env.PLUME_SUPPORT_OUVERT = 'oui';
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);
			const id = await ecrire(t, organizationId, { texte: 'Comment activer les relances ?' });
			await t.mutation(internal.support.lecture.consignerReponse, {
				conversationId: id,
				messageId: (await etat(t, id)).messages[0]!._id,
				phrases: [{ texte: 'Je passe la main.', source: { genre: 'AUCUNE' } }],
				ecrans: [],
				sujet: 'RELANCES',
				nePeutPasRepondre: true,
				questionDeDossier: false,
				usage: USAGE
			});

			await t.mutation(internal.support.mesure.materialiser, {});
			await t.mutation(internal.support.mesure.materialiser, {});

			const documents = await t.run((ctx) => ctx.db.query('mesuresSupport').collect());
			expect(documents).toHaveLength(1);
			expect(documents[0]?.entonnoir.conversations).toBe(1);
			expect(documents[0]?.lacunes).toEqual([{ id, sujet: 'RELANCES', raison: 'LACUNE' }]);
			expect(JSON.stringify(documents[0])).not.toContain('relances ?');
		},
		DELAI_CONVEX
	);
});

describe('la purge', () => {
	it(
		'efface les conversations, les messages et les compteurs de l’établissement',
		async () => {
			process.env.PLUME_SUPPORT_OUVERT = 'oui';
			const t = convexTest(schema, modules);
			const organizationId = await etablissement(t);
			const id = await ecrire(t, organizationId, { texte: 'Comment activer les relances ?' });
			await t.mutation(internal.support.lecture.consignerReponse, {
				conversationId: id,
				messageId: (await etat(t, id)).messages[0]!._id,
				phrases: [{ texte: 'Dans Aujourd’hui.', source: { genre: 'ARTICLE', cle: 'activer' } }],
				ecrans: [],
				sujet: 'RELANCES',
				nePeutPasRepondre: false,
				questionDeDossier: false,
				usage: USAGE
			});

			await t.mutation(internal.rgpd.purgerEtablissement, { organizationId, passe: 0 });

			const reste = await t.run(async (ctx) => ({
				conversations: await ctx.db.query('conversationsSupport').collect(),
				messages: await ctx.db.query('messagesSupport').collect(),
				compteurs: (await ctx.db.query('compteursSupport').collect()).filter(
					(c) => c.organizationId !== undefined
				)
			}));
			expect(reste).toEqual({ conversations: [], messages: [], compteurs: [] });
		},
		DELAI_CONVEX
	);
});
