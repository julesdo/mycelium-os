import { v, ConvexError } from 'convex/values';
import { bornesDuJourDeParis } from '../../admin/dates';
import { effetDeLIssue, estAAppeler } from '../../crm/appels';
import { jourDeRelance } from '../../crm/modeles';
import { parcoursDe, rangDeLEtape, etapeValide } from '../../crm/parcours';
import { equipeMutation, equipeQuery } from './enveloppe';
import { arreterLeProspect } from './prospects';
import { vIssueAppel, vParcours } from './tables';

/**
 * LES APPELS (19/10/2026, audit stratégique : « le téléphone passe en premier », dix par
 * jour). Noter un appel, c'est choisir son issue : elle avance le statut sans le faire
 * reculer, pose la prochaine action, note l'information de la personne quand elle
 * accepte un e-mail, et arrête tout sur un « Stop ». La logique est pure
 * (`crm/appels.ts`) ; ce module l'écrit.
 */

/** Ce qu'une issue « À rappeler » ou « Rendez-vous » propose comme délai, en jours. */
const vDansJours = v.union(v.literal(1), v.literal(3), v.literal(7));

export const noterUnAppel = equipeMutation('SUPPORT')({
	args: {
		prospectId: v.id('prospects'),
		issue: vIssueAppel,
		texte: v.optional(v.string()),
		dansJours: v.optional(vDansJours)
	},
	returns: v.null(),
	handler: async (ctx, { prospectId, issue, texte, dansJours }): Promise<null> => {
		const p = await ctx.db.get(prospectId);
		if (p === null) throw new ConvexError('Prospect introuvable.');
		if (p.statut === 'STOP')
			throw new ConvexError('Ce prospect a demandé à ne plus être contacté.');
		const maintenant = Date.now();
		const note = texte?.trim().slice(0, 3000);
		const effet = effetDeLIssue(
			issue,
			p.statut,
			maintenant,
			dansJours === undefined ? undefined : jourDeRelance(maintenant, dansJours)
		);
		await ctx.db.insert('evenementsCrm', {
			prospectId,
			type: 'APPEL',
			issue,
			...(note ? { texte: note } : {}),
			auteur: ctx.equipier.email,
			le: maintenant
		});
		if (effet.arreter) {
			await arreterLeProspect(ctx, p, ctx.equipier.email);
			return null;
		}
		// Un premier appel fait passer le parcours à « Appelé », s'il a cette étape et n'y
		// est pas encore : la colonne du kanban suit sans geste de plus.
		const parcours = parcoursDe(p);
		const avancer =
			etapeValide(parcours, 'APPELE') &&
			rangDeLEtape(parcours, p.etapeParcours) < rangDeLEtape(parcours, 'APPELE');
		await ctx.db.patch(prospectId, {
			statut: effet.statut,
			dernierContactLe: maintenant,
			dernierAppelLe: maintenant,
			...(effet.contactDuProspect ? { dernierContactDuProspectLe: maintenant } : {}),
			...(effet.informee ? { emailBase: 'INFORMEE' as const, emailInformeLe: maintenant } : {}),
			...(avancer ? { parcours, etapeParcours: 'APPELE' } : {}),
			...(effet.prochaineAction === undefined
				? {}
				: { prochaineAction: effet.prochaineAction, prochaineActionLe: effet.prochaineActionLe })
		});
		return null;
	}
});

const vLigneDAppel = v.object({
	id: v.id('prospects'),
	entreprise: v.string(),
	telephone: v.string(),
	parcours: vParcours,
	ville: v.optional(v.string()),
	dirigeant: v.optional(v.string()),
	trouveOu: v.optional(v.string()),
	montantEstimeCentimes: v.optional(v.int64()),
	dateButoir: v.optional(v.string()),
	prochaineAction: v.optional(v.string())
});

/**
 * La file d'appels du jour : les prospects ouverts qui ont un téléphone, dont la
 * prochaine action est due (ou absente), et que personne n'a appelés aujourd'hui. Les
 * fournisseurs publics d'abord, par date butoir puis par montant estimé : leur échéance
 * est la plus proche. Et le nombre d'appels que j'ai déjà notés aujourd'hui.
 */
export const fileDAppels = equipeQuery('LECTURE')({
	args: {},
	returns: v.object({ appels: v.array(vLigneDAppel), faitsAujourdhui: v.number() }),
	handler: async (ctx) => {
		const maintenant = Date.now();
		const jour = bornesDuJourDeParis(maintenant);
		const tous = await ctx.db.query('prospects').withIndex('by_cree').order('desc').take(3000);
		const dus = tous.filter((p) => estAAppeler(p, jour));
		const rang = (p: (typeof dus)[number]) => (parcoursDe(p) === 'FOURNISSEUR_PUBLIC' ? 0 : 1);
		dus.sort(
			(a, b) =>
				rang(a) - rang(b) ||
				(a.dateButoir ?? '9999').localeCompare(b.dateButoir ?? '9999') ||
				Number((b.montantEstimeCentimes ?? 0n) - (a.montantEstimeCentimes ?? 0n)) ||
				(a.prochaineActionLe ?? 0) - (b.prochaineActionLe ?? 0)
		);
		const mesAppels = await ctx.db
			.query('evenementsCrm')
			.withIndex('by_auteur_and_le', (q) =>
				q.eq('auteur', ctx.equipier.email).gte('le', jour.debut)
			)
			.take(500);
		return {
			appels: dus.slice(0, 50).map((p) => ({
				id: p._id,
				entreprise: p.entreprise,
				telephone: p.telephone!,
				parcours: parcoursDe(p),
				...(p.ville === undefined ? {} : { ville: p.ville }),
				...(p.dirigeant === undefined ? {} : { dirigeant: p.dirigeant }),
				...(p.trouveOu === undefined ? {} : { trouveOu: p.trouveOu }),
				...(p.montantEstimeCentimes === undefined
					? {}
					: { montantEstimeCentimes: p.montantEstimeCentimes }),
				...(p.dateButoir === undefined ? {} : { dateButoir: p.dateButoir }),
				...(p.prochaineAction === undefined ? {} : { prochaineAction: p.prochaineAction })
			})),
			faitsAujourdhui: mesAppels.filter((e) => e.type === 'APPEL').length
		};
	}
});
