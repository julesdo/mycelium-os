import { v } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { internal } from '../_generated/api';
import { vEmailId, vEmailEvent } from '@convex-dev/resend';

/**
 * Le journal des envois — ce qu'on garde, et ce qu'on ne garde plus.
 *
 * Resend appelle ce point d'entrée à chaque étape de la vie d'un message :
 * remis, rejeté, signalé comme indésirable, ouvert, cliqué.
 *
 * ⚠️ ON N'ENREGISTRE PLUS LA CHARGE UTILE DU WEBHOOK, ET C'EST LE POINT DE CE
 * FICHIER. Elle portait l'adresse du destinataire, celles en copie, l'objet du
 * message et les en-têtes — indéfiniment, dans une table que RIEN dans le
 * produit ne relisait : un seul `insert`, aucune requête. Elle n'était couverte
 * par aucune purge : ni celle de l'établissement, faute de `organizationId`, ni
 * celle du compte. Un titulaire qui demandait l'effacement laissait donc son
 * adresse ici pour toujours.
 *
 * Ce qui sert réellement au suivi — quel envoi, quel type d'événement, quand —
 * tient dans trois champs qui ne désignent personne. L'adresse reste chez
 * Resend, sous sa propre rétention, où elle a une raison d'être.
 *
 * `data` reste DÉCLARÉ mais facultatif : les lignes écrites avant ce changement
 * la portent, et Convex valide la BASE, pas seulement le code — retirer le champ
 * du validateur ferait échouer le déploiement sur des documents existants.
 * `purgerJournalEnvois` les nettoie ; le champ pourra disparaître ensuite.
 */

/**
 * Combien de temps le journal se garde.
 *
 * QUATRE-VINGT-DIX JOURS, PARCE QUE CE N'EST PAS UNE PIÈCE COMPTABLE. Un journal
 * de distribution sert à comprendre une panne récente — un rejet en série, un
 * domaine qui refuse nos messages. Passé ce délai il ne sert plus à rien, et une
 * donnée qui ne sert plus ne peut plus que fuir.
 */
export const RETENTION_EVENEMENTS_EMAIL_JOURS = 90;

const JOUR_MS = 86_400_000;

/** Ce qu'une passe de purge traite au plus. Une passe Convex a un budget. */
const BUDGET_PASSE = 200;
const PASSES_MAX = 500;

export const handleEmailEvent = internalMutation({
	args: {
		id: vEmailId,
		event: vEmailEvent
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		// Le rejet et le signalement pour indésirable pèsent sur la réputation du
		// domaine : ils se voient dans les journaux, sans quitter le serveur.
		if (args.event.type === 'email.bounced') {
			console.warn(`Envoi ${args.id} rejeté.`);
		} else if (args.event.type === 'email.complained') {
			console.warn(`Envoi ${args.id} signalé comme indésirable.`);
		}

		await ctx.db.insert('emailEvents', {
			emailId: args.id,
			eventType: args.event.type,
			timestamp: Date.now()
		});
		return null;
	}
});

/**
 * Une passe de rétention. Elle se replanifie tant qu'il reste du travail.
 *
 * DEUX GESTES, ET LE SECOND N'ATTEND PAS LE PREMIER. On supprime ce qui a
 * dépassé la fenêtre, ET on efface la charge utile des lignes qui en portent
 * encore une, même récentes. Attendre leur expiration laisserait des adresses
 * lisibles pendant trois mois, alors qu'elles ne servent déjà plus à rien.
 */
export const purgerJournalEnvois = internalMutation({
	args: { passe: v.number() },
	returns: v.null(),
	handler: async (ctx, { passe }): Promise<null> => {
		if (passe > PASSES_MAX) {
			throw new Error(
				`Rétention du journal d’envois interrompue après ${PASSES_MAX} passes : quelque chose ne se supprime pas.`
			);
		}

		const limite = Date.now() - RETENTION_EVENEMENTS_EMAIL_JOURS * JOUR_MS;

		const perimes = await ctx.db
			.query('emailEvents')
			.withIndex('by_timestamp', (q) => q.lt('timestamp', limite))
			.take(BUDGET_PASSE);
		for (const releve of perimes) await ctx.db.delete(releve._id);

		let budget = BUDGET_PASSE - perimes.length;
		let aEncoreDeLaCharge = false;
		if (budget > 0) {
			// La charge utile n'a pas d'index : on balaie par lot, dans la fenêtre
			// de rétention seulement — au-delà, la suppression ci-dessus s'en charge.
			const dansLaFenetre = await ctx.db
				.query('emailEvents')
				.withIndex('by_timestamp', (q) => q.gte('timestamp', limite))
				.take(budget);
			for (const releve of dansLaFenetre) {
				if (releve.data === undefined) continue;
				await ctx.db.patch(releve._id, { data: undefined });
				budget -= 1;
				aEncoreDeLaCharge = true;
			}
		}

		if (perimes.length === BUDGET_PASSE || aEncoreDeLaCharge) {
			await ctx.scheduler.runAfter(0, internal.emails.events.purgerJournalEnvois, {
				passe: passe + 1
			});
		}
		return null;
	}
});
