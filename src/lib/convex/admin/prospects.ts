import { v, ConvexError } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';
import { empreinteDEmail, normaliserEmail } from '../../crm/empreinte';
import { statutClos, type Cible } from '../../crm/statuts';
import { aInformer } from '../../crm/consentement';
import {
	etapeInitiale,
	etapeValide,
	libelleDeLEtape,
	parcoursDe,
	type Parcours
} from '../../crm/parcours';
import { equipeMutation, equipeQuery, noterAuJournal } from './enveloppe';
import { vCible, vEstimationProspect, vParcours, vStatutProspect } from './tables';

/**
 * Ce qu'un prospect reçoit en naissant, d'où qu'il vienne (ajout, import, annuaire) :
 * son parcours (choisi, ou déduit de sa cible et de son activité), la première étape
 * de ce parcours, et le jeton de son lien de désinscription.
 */
export function naissanceDuProspect(p: {
	readonly parcours?: Parcours;
	readonly cible: Cible;
	readonly activite?: string;
}): { parcours: Parcours; etapeParcours: string; jetonDesinscription: string } {
	const parcours = parcoursDe(p);
	return {
		parcours,
		etapeParcours: etapeInitiale(parcours),
		jetonDesinscription: crypto.randomUUID()
	};
}

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
	v.literal('CABINETS'),
	v.literal('A_INFORMER')
);

const vLigneProspect = v.object({
	id: v.id('prospects'),
	entreprise: v.string(),
	ville: v.optional(v.string()),
	activite: v.optional(v.string()),
	dirigeant: v.optional(v.string()),
	cible: vCible,
	statut: vStatutProspect,
	/** Toujours rendu : lu, ou déduit pour un prospect d'avant le 19/10/2026. */
	parcours: vParcours,
	etapeParcours: v.string(),
	telephone: v.optional(v.string()),
	montantEstimeCentimes: v.optional(v.int64()),
	dateButoir: v.optional(v.string()),
	prochaineAction: v.optional(v.string()),
	prochaineActionLe: v.optional(v.number()),
	dernierContactLe: v.optional(v.number()),
	responsable: v.optional(v.string()),
	compteId: v.optional(v.id('organizations'))
});

function ligne(p: Doc<'prospects'>): typeof vLigneProspect.type {
	const parcours = parcoursDe(p);
	return {
		id: p._id,
		entreprise: p.entreprise,
		cible: p.cible,
		statut: p.statut,
		parcours,
		etapeParcours:
			p.etapeParcours !== undefined && etapeValide(parcours, p.etapeParcours)
				? p.etapeParcours
				: etapeInitiale(parcours),
		...(p.telephone === undefined ? {} : { telephone: p.telephone }),
		...(p.montantEstimeCentimes === undefined
			? {}
			: { montantEstimeCentimes: p.montantEstimeCentimes }),
		...(p.dateButoir === undefined ? {} : { dateButoir: p.dateButoir }),
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
	args: { vue: vVueProspects, parcours: v.optional(vParcours) },
	returns: v.array(vLigneProspect),
	handler: async (ctx, { vue, parcours }) => {
		const tous = await ctx.db.query('prospects').withIndex('by_cree').order('desc').take(3000);
		const maintenant = Date.now();
		return tous
			.filter((p) => parcours === undefined || parcoursDe(p) === parcours)
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
					case 'A_INFORMER':
						// Collecté il y a plus d'un mois, adresse nominative, personne jamais
						// informée (article 14 du RGPD) : à appeler ou à écarter.
						return aInformer(p, maintenant);
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
			codePartenaire: v.optional(v.string()),
			logicielComptable: v.optional(v.string()),
			estimation: v.optional(vEstimationProspect),
			emailBase: v.optional(v.union(v.literal('GENERIQUE'), v.literal('INFORMEE'))),
			emailInformeLe: v.optional(v.number()),
			jetonDesinscription: v.optional(v.string()),
			dernierContactDuProspectLe: v.optional(v.number()),
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
			...(p.codePartenaire === undefined ? {} : { codePartenaire: p.codePartenaire }),
			...(p.logicielComptable === undefined ? {} : { logicielComptable: p.logicielComptable }),
			...(p.estimation === undefined ? {} : { estimation: p.estimation }),
			...(p.emailBase === undefined ? {} : { emailBase: p.emailBase }),
			...(p.emailInformeLe === undefined ? {} : { emailInformeLe: p.emailInformeLe }),
			...(p.jetonDesinscription === undefined
				? {}
				: { jetonDesinscription: p.jetonDesinscription }),
			...(p.dernierContactDuProspectLe === undefined
				? {}
				: { dernierContactDuProspectLe: p.dernierContactDuProspectLe }),
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
	responsable: v.optional(v.union(v.string(), v.null())),
	parcours: v.optional(vParcours),
	codePartenaire: v.optional(v.string()),
	logicielComptable: v.optional(v.string())
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
		'notes',
		'codePartenaire',
		'logicielComptable'
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
	if (c.parcours !== undefined) sortie.parcours = c.parcours;
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
		const cible = champs.cible ?? 'PME';
		return await ctx.db.insert('prospects', {
			...champs,
			entreprise: champs.entreprise,
			cible,
			statut: 'A_CONTACTER',
			...naissanceDuProspect({
				...(champs.parcours === undefined ? {} : { parcours: champs.parcours }),
				cible,
				...(champs.activite === undefined ? {} : { activite: champs.activite })
			}),
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

/**
 * Avancer un prospect dans son parcours. L'étape est relue contre le registre du
 * parcours (une clé inconnue est refusée), notée à l'historique par son libellé, et
 * l'étape d'avant est rendue pour le « Annuler ».
 */
export const changerEtape = equipeMutation('SUPPORT')({
	args: { prospectId: v.id('prospects'), etape: v.string() },
	returns: v.union(v.null(), v.string()),
	handler: async (ctx, { prospectId, etape }): Promise<string | null> => {
		const p = await ctx.db.get(prospectId);
		if (p === null) throw new ConvexError('Prospect introuvable.');
		if (p.statut === 'STOP') {
			throw new ConvexError('Ce prospect a demandé à ne plus être contacté.');
		}
		const parcours = parcoursDe(p);
		if (!etapeValide(parcours, etape)) {
			throw new ConvexError('Cette étape n’existe pas pour ce parcours.');
		}
		const avant = p.etapeParcours ?? etapeInitiale(parcours);
		if (avant === etape) return null;
		await ctx.db.patch(prospectId, { parcours, etapeParcours: etape });
		await ctx.db.insert('evenementsCrm', {
			prospectId,
			type: 'ETAPE',
			texte: libelleDeLEtape(parcours, etape),
			auteur: ctx.equipier.email,
			le: Date.now()
		});
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
 * ARRÊTER UN PROSPECT, de l'une des trois façons dont il peut le demander : « Stop »
 * sur sa fiche, l'issue « Ne veut plus être contacté » d'un appel, ou le lien de
 * désinscription de ses e-mails. Ses coordonnées personnelles sont effacées,
 * l'empreinte de son adresse entre dans la liste d'opposition, ses tâches ouvertes
 * sont closes. Il reste visible en « Stop », sans coordonnées, et l'effacement de
 * trois ans ne le retire jamais : c'est lui qui empêche son retour par SIREN.
 */
export async function arreterLeProspect(
	ctx: MutationCtx,
	p: Doc<'prospects'>,
	auteur: string
): Promise<void> {
	const prospectId = p._id;
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
		prochaineActionLe: undefined,
		emailBase: undefined,
		emailInformeLe: undefined
	});
	for (const t of await ctx.db
		.query('tachesCrm')
		.withIndex('by_prospect', (q) => q.eq('prospectId', prospectId))
		.take(100)) {
		if (t.faiteLe === undefined) await ctx.db.patch(t._id, { faiteLe: Date.now() });
	}
	await noterAuJournal(ctx, auteur, {
		action: 'PROSPECT_EFFACE',
		cible: { type: 'PROSPECT', id: prospectId, libelle: p.entreprise }
	});
}

/** « STOP » depuis la fiche : la confirmation est faite par l'écran. */
export const stop = equipeMutation('SUPPORT')({
	args: { prospectId: v.id('prospects') },
	returns: v.null(),
	handler: async (ctx, { prospectId }): Promise<null> => {
		const p = await ctx.db.get(prospectId);
		if (p === null) throw new ConvexError('Prospect introuvable.');
		await arreterLeProspect(ctx, p, ctx.equipier.email);
		return null;
	}
});
