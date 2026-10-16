import { v, ConvexError } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { empreinteDEmail, normaliserEmail } from '../../crm/empreinte';
import { statutClos } from '../../crm/statuts';
import { equipeMutation, equipeQuery, noterAuJournal } from './enveloppe';
import { vCible, vStatutProspect } from './tables';

/**
 * LES PROSPECTS (16/10/2026) — des données de Letikette, pas d'un client.
 *
 * Chaque contact porte sa source légale (« Trouvé où »). « Stop » efface les
 * coordonnées personnelles et ajoute l'empreinte de l'adresse à la liste
 * d'opposition, que l'import consulte : un prospect qui a dit non ne revient pas.
 */

export const vVueProspects = v.union(
	v.literal('TOUS'),
	v.literal('SANS_ACTION'),
	v.literal('A_RELANCER'),
	v.literal('INTERESSES'),
	v.literal('PME'),
	v.literal('CABINETS')
);

const vLigneProspect = v.object({
	id: v.id('prospects'),
	entreprise: v.string(),
	ville: v.optional(v.string()),
	activite: v.optional(v.string()),
	dirigeant: v.optional(v.string()),
	cible: vCible,
	statut: vStatutProspect,
	prochaineAction: v.optional(v.string()),
	prochaineActionLe: v.optional(v.number()),
	dernierContactLe: v.optional(v.number()),
	responsable: v.optional(v.string()),
	compteId: v.optional(v.id('organizations'))
});

function ligne(p: Doc<'prospects'>): typeof vLigneProspect.type {
	return {
		id: p._id,
		entreprise: p.entreprise,
		cible: p.cible,
		statut: p.statut,
		...(p.ville === undefined ? {} : { ville: p.ville }),
		...(p.activite === undefined ? {} : { activite: p.activite }),
		...(p.dirigeant === undefined ? {} : { dirigeant: p.dirigeant }),
		...(p.prochaineAction === undefined ? {} : { prochaineAction: p.prochaineAction }),
		...(p.prochaineActionLe === undefined ? {} : { prochaineActionLe: p.prochaineActionLe }),
		...(p.dernierContactLe === undefined ? {} : { dernierContactLe: p.dernierContactLe }),
		...(p.responsable === undefined ? {} : { responsable: p.responsable }),
		...(p.compteId === undefined ? {} : { compteId: p.compteId })
	};
}

export const liste = equipeQuery('LECTURE')({
	args: { vue: vVueProspects },
	returns: v.array(vLigneProspect),
	handler: async (ctx, { vue }) => {
		const tous = await ctx.db.query('prospects').withIndex('by_cree').order('desc').take(3000);
		const maintenant = Date.now();
		return tous
			.filter((p) => {
				switch (vue) {
					case 'SANS_ACTION':
						return !statutClos(p.statut) && p.prochaineActionLe === undefined;
					case 'A_RELANCER':
						return (
							!statutClos(p.statut) &&
							p.prochaineActionLe !== undefined &&
							p.prochaineActionLe <= maintenant
						);
					case 'INTERESSES':
						return p.statut === 'INTERESSE' || p.statut === 'A_REPONDU';
					case 'PME':
						return p.cible === 'PME';
					case 'CABINETS':
						return p.cible === 'CABINET';
					default:
						return true;
				}
			})
			.map(ligne);
	}
});

export const fiche = equipeQuery('LECTURE')({
	args: { prospectId: v.id('prospects') },
	returns: v.union(
		v.null(),
		v.object({
			...vLigneProspect.fields,
			siren: v.optional(v.string()),
			effectif: v.optional(v.string()),
			fonction: v.optional(v.string()),
			email: v.optional(v.string()),
			telephone: v.optional(v.string()),
			site: v.optional(v.string()),
			trouveOu: v.optional(v.string()),
			notes: v.optional(v.string()),
			creeLe: v.number(),
			creePar: v.string()
		})
	),
	handler: async (ctx, { prospectId }) => {
		const p = await ctx.db.get(prospectId);
		if (p === null) return null;
		return {
			...ligne(p),
			...(p.siren === undefined ? {} : { siren: p.siren }),
			...(p.effectif === undefined ? {} : { effectif: p.effectif }),
			...(p.fonction === undefined ? {} : { fonction: p.fonction }),
			...(p.email === undefined ? {} : { email: p.email }),
			...(p.telephone === undefined ? {} : { telephone: p.telephone }),
			...(p.site === undefined ? {} : { site: p.site }),
			...(p.trouveOu === undefined ? {} : { trouveOu: p.trouveOu }),
			...(p.notes === undefined ? {} : { notes: p.notes }),
			creeLe: p.creeLe,
			creePar: p.creePar
		};
	}
});

const vChampsProspect = {
	entreprise: v.optional(v.string()),
	siren: v.optional(v.string()),
	activite: v.optional(v.string()),
	effectif: v.optional(v.string()),
	ville: v.optional(v.string()),
	dirigeant: v.optional(v.string()),
	fonction: v.optional(v.string()),
	email: v.optional(v.string()),
	telephone: v.optional(v.string()),
	site: v.optional(v.string()),
	trouveOu: v.optional(v.string()),
	cible: v.optional(vCible),
	prochaineAction: v.optional(v.string()),
	prochaineActionLe: v.optional(v.union(v.number(), v.null())),
	notes: v.optional(v.string()),
	responsable: v.optional(v.union(v.string(), v.null()))
};

type ChampsProspect = {
	[K in keyof typeof vChampsProspect]?: (typeof vChampsProspect)[K]['type'];
};

/** Les champs saisis, nettoyés : un texte vide efface, un `null` efface la date ou le responsable. */
function champsPropres(c: ChampsProspect): Partial<Doc<'prospects'>> {
	const texte = (v: string | undefined) =>
		v === undefined ? undefined : v.trim().slice(0, 500) || undefined;
	const sortie: Record<string, unknown> = {};
	for (const cle of [
		'entreprise',
		'activite',
		'effectif',
		'ville',
		'dirigeant',
		'fonction',
		'telephone',
		'site',
		'trouveOu',
		'prochaineAction',
		'notes'
	] as const) {
		if (c[cle] !== undefined) sortie[cle] = texte(c[cle]);
	}
	if (c.email !== undefined)
		sortie.email = c.email.trim() === '' ? undefined : normaliserEmail(c.email);
	if (c.siren !== undefined) {
		const s = c.siren.replace(/\D/g, '');
		sortie.siren = s.length === 9 ? s : undefined;
	}
	if (c.cible !== undefined) sortie.cible = c.cible;
	if (c.prochaineActionLe !== undefined)
		sortie.prochaineActionLe = c.prochaineActionLe ?? undefined;
	if (c.responsable !== undefined) sortie.responsable = c.responsable ?? undefined;
	return sortie as Partial<Doc<'prospects'>>;
}

async function enOpposition(ctx: MutationCtx, email: string | undefined): Promise<boolean> {
	if (email === undefined) return false;
	const empreinte = await empreinteDEmail(email);
	const trouve = await ctx.db
		.query('oppositions')
		.withIndex('by_empreinte', (q) => q.eq('empreinte', empreinte))
		.first();
	return trouve !== null;
}

export const creer = equipeMutation('SUPPORT')({
	args: { ...vChampsProspect, entreprise: v.string() },
	returns: v.id('prospects'),
	handler: async (ctx, args): Promise<Id<'prospects'>> => {
		const champs = champsPropres(args);
		if (!champs.entreprise) throw new ConvexError('L’entreprise est obligatoire.');
		if (await enOpposition(ctx, champs.email)) {
			throw new ConvexError('Cette adresse a demandé à ne plus être contactée.');
		}
		if (champs.email !== undefined) {
			const deja = await ctx.db
				.query('prospects')
				.withIndex('by_email', (q) => q.eq('email', champs.email))
				.first();
			if (deja !== null) throw new ConvexError(`Ce prospect existe déjà : ${deja.entreprise}.`);
		}
		return await ctx.db.insert('prospects', {
			...champs,
			entreprise: champs.entreprise,
			cible: champs.cible ?? 'PME',
			statut: 'A_CONTACTER',
			creePar: ctx.equipier.email,
			creeLe: Date.now()
		});
	}
});

export const modifier = equipeMutation('SUPPORT')({
	args: { prospectId: v.id('prospects'), ...vChampsProspect },
	returns: v.null(),
	handler: async (ctx, { prospectId, ...champs }): Promise<null> => {
		const p = await ctx.db.get(prospectId);
		if (p === null) throw new ConvexError('Prospect introuvable.');
		if (p.statut === 'STOP')
			throw new ConvexError('Ce prospect a demandé à ne plus être contacté.');
		const propres = champsPropres(champs);
		if (propres.entreprise === undefined && champs.entreprise !== undefined) {
			throw new ConvexError('L’entreprise est obligatoire.');
		}
		await ctx.db.patch(prospectId, propres);
		return null;
	}
});

export const changerStatut = equipeMutation('SUPPORT')({
	args: { prospectIds: v.array(v.id('prospects')), statut: vStatutProspect },
	returns: v.array(v.object({ id: v.id('prospects'), avant: vStatutProspect })),
	handler: async (ctx, { prospectIds, statut }) => {
		if (statut === 'STOP')
			throw new ConvexError('« Stop » passe par la fiche, qui efface les coordonnées.');
		const avant = [];
		for (const id of prospectIds.slice(0, 200)) {
			const p = await ctx.db.get(id);
			if (p === null || p.statut === 'STOP' || p.statut === statut) continue;
			avant.push({ id, avant: p.statut });
			await ctx.db.patch(id, {
				statut,
				...(statut === 'CONTACTE' || statut === 'RELANCE' ? { dernierContactLe: Date.now() } : {})
			});
			await ctx.db.insert('evenementsCrm', {
				prospectId: id,
				type: 'STATUT',
				texte: statut,
				auteur: ctx.equipier.email,
				le: Date.now()
			});
		}
		return avant;
	}
});

/** Remettre les statuts d'avant : le « Annuler » du mot qui suit un changement. */
export const remettreStatuts = equipeMutation('SUPPORT')({
	args: { changements: v.array(v.object({ id: v.id('prospects'), avant: vStatutProspect })) },
	returns: v.null(),
	handler: async (ctx, { changements }): Promise<null> => {
		for (const { id, avant } of changements.slice(0, 200)) {
			const p = await ctx.db.get(id);
			if (p === null || p.statut === 'STOP' || avant === 'STOP') continue;
			await ctx.db.patch(id, { statut: avant });
		}
		return null;
	}
});

export const assigner = equipeMutation('SUPPORT')({
	args: { prospectIds: v.array(v.id('prospects')), responsable: v.union(v.string(), v.null()) },
	returns: v.null(),
	handler: async (ctx, { prospectIds, responsable }): Promise<null> => {
		for (const id of prospectIds.slice(0, 200)) {
			const p = await ctx.db.get(id);
			if (p === null) continue;
			await ctx.db.patch(id, { responsable: responsable ?? undefined });
		}
		return null;
	}
});

/**
 * « STOP » : le prospect ne veut plus être contacté. Ses coordonnées personnelles
 * sont effacées, l'empreinte de son adresse entre dans la liste d'opposition, ses
 * tâches ouvertes sont closes. Il reste visible en « Stop », sans coordonnées.
 */
export const stop = equipeMutation('SUPPORT')({
	args: { prospectId: v.id('prospects') },
	returns: v.null(),
	handler: async (ctx, { prospectId }): Promise<null> => {
		const p = await ctx.db.get(prospectId);
		if (p === null) throw new ConvexError('Prospect introuvable.');
		if (p.email !== undefined) {
			const empreinte = await empreinteDEmail(p.email);
			const deja = await ctx.db
				.query('oppositions')
				.withIndex('by_empreinte', (q) => q.eq('empreinte', empreinte))
				.first();
			if (deja === null) await ctx.db.insert('oppositions', { empreinte, le: Date.now() });
		}
		await ctx.db.patch(prospectId, {
			statut: 'STOP',
			email: undefined,
			telephone: undefined,
			dirigeant: undefined,
			fonction: undefined,
			prochaineAction: undefined,
			prochaineActionLe: undefined
		});
		for (const t of await ctx.db
			.query('tachesCrm')
			.withIndex('by_prospect', (q) => q.eq('prospectId', prospectId))
			.take(100)) {
			if (t.faiteLe === undefined) await ctx.db.patch(t._id, { faiteLe: Date.now() });
		}
		await noterAuJournal(ctx, ctx.equipier.email, {
			action: 'PROSPECT_EFFACE',
			cible: { type: 'PROSPECT', id: prospectId, libelle: p.entreprise }
		});
		return null;
	}
});
