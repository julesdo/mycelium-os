import { v, ConvexError } from 'convex/values';
import { internal } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import { SECTEURS, ZONES } from '../../crm/annuaire';
import { ACHETEURS } from '../../crm/decp';
import { equipeMutation, equipeQuery } from './enveloppe';
import {
	vAcheteurs,
	vEtatDeTravail,
	vGenreDeTravail,
	vResultatDeTravail,
	vSecteur,
	vTitulaireTrouve,
	vZone
} from './validateursProspection';

/**
 * LES TRAVAUX DE L'ÉQUIPE, LANCÉS ET SUIVIS (20/10/2026). Le fondateur : « une file
 * d'attente pour ces différentes recherches longues ».
 *
 * Lancer une recherche ou un ajout écrit un travail et confie son exécution au
 * planificateur (`travauxExecution.ts`) : l'écran rend la main tout de suite. La file
 * (`fileDAttente`) montre en direct ce qui tourne et ce qui est prêt ; un travail fini
 * garde son résultat jusqu'à ce qu'on le retire.
 */

/** Un ajout lit trois sources par fournisseur ; au-delà, il se fait en plusieurs fois. */
const AJOUT_MAX = 40;
/** La file montre les derniers travaux de l'équipe. */
const DANS_LA_FILE = 15;

const vResume = v.object({
	_id: v.id('travauxEquipe'),
	genre: vGenreDeTravail,
	libelle: v.string(),
	etat: vEtatDeTravail,
	etape: v.optional(v.string()),
	fait: v.optional(v.number()),
	total: v.optional(v.number()),
	erreur: v.optional(v.string()),
	/** Combien de lignes trouvées, ou de prospects ajoutés. */
	nombre: v.optional(v.number()),
	par: v.string(),
	vu: v.boolean(),
	creeLe: v.number(),
	finiLe: v.optional(v.number())
});

function nombreDe(travail: Doc<'travauxEquipe'>): number | undefined {
	const r = travail.resultat;
	if (r === undefined) return undefined;
	if (r.genre === 'ANNUAIRE') return r.entreprises.length;
	if (r.genre === 'DECP') return r.titulaires.length;
	if (r.genre === 'SELECTION') return r.ajoutes.length;
	return r.importes;
}

export const lancerRecherche = equipeMutation('SUPPORT')({
	args: {
		source: v.union(v.literal('ANNUAIRE'), v.literal('DECP')),
		secteur: v.optional(vSecteur),
		acheteurs: v.optional(vAcheteurs),
		zone: vZone,
		page: v.number()
	},
	returns: v.id('travauxEquipe'),
	handler: async (ctx, { source, secteur, acheteurs, zone, page }): Promise<Id<'travauxEquipe'>> => {
		const suite = page > 1 ? `, page ${page}` : '';
		let libelle: string;
		if (source === 'ANNUAIRE') {
			if (secteur === undefined) throw new ConvexError('Choisissez un secteur.');
			libelle = `${SECTEURS[secteur].libelle} · ${ZONES[zone].court}${suite}`;
		} else {
			if (acheteurs === undefined) throw new ConvexError('Choisissez des acheteurs.');
			libelle = `${ACHETEURS[acheteurs].libelle} · ${ZONES[zone].court}${suite}`;
		}
		const id = await ctx.db.insert('travauxEquipe', {
			genre: source === 'ANNUAIRE' ? 'CHERCHER_ANNUAIRE' : 'CHERCHER_DECP',
			libelle,
			criteres: {
				zone,
				page: Math.max(1, Math.trunc(page)),
				...(secteur === undefined ? {} : { secteur }),
				...(acheteurs === undefined ? {} : { acheteurs })
			},
			etat: 'EN_ATTENTE',
			etape: 'En attente',
			par: ctx.equipier.email,
			vu: false,
			creeLe: Date.now()
		});
		await ctx.scheduler.runAfter(0, internal.admin.travauxExecution.executer, { id });
		return id;
	}
});

export const lancerAjoutDecp = equipeMutation('SUPPORT')({
	args: { acheteurs: vAcheteurs, zone: vZone, titulaires: v.array(vTitulaireTrouve) },
	returns: v.id('travauxEquipe'),
	handler: async (ctx, { acheteurs, zone, titulaires }): Promise<Id<'travauxEquipe'>> => {
		if (titulaires.length === 0) throw new ConvexError('Aucun fournisseur coché.');
		if (titulaires.length > AJOUT_MAX)
			throw new ConvexError(`Au plus ${AJOUT_MAX} fournisseurs à la fois.`);
		const n = titulaires.length;
		const id = await ctx.db.insert('travauxEquipe', {
			genre: 'AJOUTER_DECP',
			libelle: `Ajouter ${n} fournisseur${n > 1 ? 's' : ''} · ${ACHETEURS[acheteurs].libelle}`,
			criteres: { acheteurs, zone, page: 1 },
			titulaires,
			etat: 'EN_ATTENTE',
			etape: 'En attente',
			fait: 0,
			total: n,
			par: ctx.equipier.email,
			vu: false,
			creeLe: Date.now()
		});
		await ctx.scheduler.runAfter(0, internal.admin.travauxExecution.executer, { id });
		return id;
	}
});

/** Les derniers travaux de l'équipe, les plus récents d'abord, sans leurs résultats. */
export const fileDAttente = equipeQuery('LECTURE')({
	args: {},
	returns: v.array(vResume),
	handler: async (ctx) => {
		const travaux = await ctx.db
			.query('travauxEquipe')
			.withIndex('by_creeLe')
			.order('desc')
			.take(DANS_LA_FILE);
		return travaux.map((t) => ({
			_id: t._id,
			genre: t.genre,
			libelle: t.libelle,
			etat: t.etat,
			...(t.etape === undefined ? {} : { etape: t.etape }),
			...(t.fait === undefined ? {} : { fait: t.fait }),
			...(t.total === undefined ? {} : { total: t.total }),
			...(t.erreur === undefined ? {} : { erreur: t.erreur }),
			...(nombreDe(t) === undefined ? {} : { nombre: nombreDe(t) }),
			par: t.par,
			vu: t.vu,
			creeLe: t.creeLe,
			...(t.finiLe === undefined ? {} : { finiLe: t.finiLe })
		}));
	}
});

/** Un travail entier, résultat compris : ce que l'écran « Trouver » rouvre. */
export const travail = equipeQuery('LECTURE')({
	args: { id: v.id('travauxEquipe') },
	returns: v.union(
		v.null(),
		v.object({
			_id: v.id('travauxEquipe'),
			genre: vGenreDeTravail,
			libelle: v.string(),
			criteres: v.object({
				secteur: v.optional(vSecteur),
				acheteurs: v.optional(vAcheteurs),
				zone: vZone,
				page: v.number()
			}),
			etat: vEtatDeTravail,
			etape: v.optional(v.string()),
			fait: v.optional(v.number()),
			total: v.optional(v.number()),
			resultat: v.optional(vResultatDeTravail),
			erreur: v.optional(v.string())
		})
	),
	handler: async (ctx, { id }) => {
		const t = await ctx.db.get(id);
		if (t === null) return null;
		return {
			_id: t._id,
			genre: t.genre,
			libelle: t.libelle,
			criteres: t.criteres,
			etat: t.etat,
			...(t.etape === undefined ? {} : { etape: t.etape }),
			...(t.fait === undefined ? {} : { fait: t.fait }),
			...(t.total === undefined ? {} : { total: t.total }),
			...(t.resultat === undefined ? {} : { resultat: t.resultat }),
			...(t.erreur === undefined ? {} : { erreur: t.erreur })
		};
	}
});

/** Le résultat est ouvert : la file ne le signale plus comme nouveau. */
export const marquerVu = equipeMutation('LECTURE')({
	args: { id: v.id('travauxEquipe') },
	returns: v.null(),
	handler: async (ctx, { id }) => {
		const t = await ctx.db.get(id);
		if (t !== null && !t.vu && (t.etat === 'FAIT' || t.etat === 'ECHEC')) {
			await ctx.db.patch(id, { vu: true });
		}
		return null;
	}
});

/** Retirer de la file un travail fini ; ce qu'il a ajouté au CRM reste. */
export const retirer = equipeMutation('SUPPORT')({
	args: { id: v.id('travauxEquipe') },
	returns: v.null(),
	handler: async (ctx, { id }) => {
		const t = await ctx.db.get(id);
		if (t === null) return null;
		if (t.etat === 'EN_ATTENTE' || t.etat === 'EN_COURS')
			throw new ConvexError('Ce travail tourne encore : il se retire une fois fini.');
		await ctx.db.delete(id);
		return null;
	}
});
