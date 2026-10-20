import { v, ConvexError, type Infer } from 'convex/values';
import { internalAction, internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { jourDeParis } from '../../admin/dates';
import { ZONES } from '../../crm/annuaire';
import { ACHETEURS } from '../../crm/decp';
import {
	chercherALAnnuaire,
	chercherDansLaCommandePublique,
	preparerFournisseur,
	type Suivi
} from './prospection';
import {
	vAcheteurs,
	vEtatDeTravail,
	vGenreDeTravail,
	vResultatDeTravail,
	vSecteur,
	vTitulaireTrouve,
	vZone,
	type ResultatDeTravail
} from './validateursProspection';

/**
 * L'EXÉCUTION DES TRAVAUX DE L'ÉQUIPE, PAR LE PLANIFICATEUR (20/10/2026).
 *
 * `executer` tourne hors de tout écran : il écrit son étape à chaque pas (l'admin la
 * montre en direct), reprend les erreurs passagères des sources (`lectureHttp.ts`), et
 * un fournisseur que les sources ne servent pas s'inscrit en échec sans arrêter le lot.
 * Un ajout long se fait en plusieurs passes de six minutes au plus : chaque passe reprend
 * où la précédente s'est arrêtée, loin de la limite de dix minutes d'une action.
 * `interrompre` (crons) clôt un travail resté muet dix minutes : la file ne ment pas.
 */

/** Une passe ; au-delà, le travail se reprend dans une passe nouvelle. */
const PASSE_MS = 6 * 60_000;
/** Un travail qui n'a rien écrit depuis dix minutes s'est arrêté. */
const MUET_MS = 10 * 60_000;

const vEtat = v.object({
	genre: vGenreDeTravail,
	criteres: v.object({
		secteur: v.optional(vSecteur),
		acheteurs: v.optional(vAcheteurs),
		zone: vZone,
		page: v.number()
	}),
	titulaires: v.optional(v.array(vTitulaireTrouve)),
	etat: vEtatDeTravail,
	fait: v.optional(v.number()),
	importId: v.optional(v.id('importsProspects')),
	resultat: v.optional(vResultatDeTravail),
	par: v.string()
});

export const lire = internalQuery({
	args: { id: v.id('travauxEquipe') },
	returns: v.union(v.null(), vEtat),
	handler: async (ctx, { id }) => {
		const t = await ctx.db.get(id);
		if (t === null) return null;
		return {
			genre: t.genre,
			criteres: t.criteres,
			...(t.titulaires === undefined ? {} : { titulaires: t.titulaires }),
			etat: t.etat,
			...(t.fait === undefined ? {} : { fait: t.fait }),
			...(t.importId === undefined ? {} : { importId: t.importId }),
			...(t.resultat === undefined ? {} : { resultat: t.resultat }),
			par: t.par
		};
	}
});

const vNote = {
	etat: v.optional(vEtatDeTravail),
	etape: v.optional(v.string()),
	fait: v.optional(v.number()),
	total: v.optional(v.number()),
	importId: v.optional(v.id('importsProspects')),
	resultat: v.optional(vResultatDeTravail),
	erreur: v.optional(v.string()),
	commenceLe: v.optional(v.number()),
	finiLe: v.optional(v.number())
};

export const noter = internalMutation({
	args: { id: v.id('travauxEquipe'), ...vNote },
	returns: v.null(),
	handler: async (ctx, { id, ...note }) => {
		const t = await ctx.db.get(id);
		// Un travail retiré, ou déjà clos par `interrompre`, ne se rouvre pas.
		if (t === null || t.etat === 'FAIT' || t.etat === 'ECHEC') return null;
		const patch = Object.fromEntries(Object.entries(note).filter(([, val]) => val !== undefined));
		await ctx.db.patch(id, { ...patch, majLe: Date.now() });
		return null;
	}
});

type Note = { [K in keyof typeof vNote]?: Infer<(typeof vNote)[K]> };
/** Ce qu'un travail écrit de lui-même : son étape, son avancement, son résultat. */
export type NoteDeTravail = Note;
type BilanDAjout = Extract<ResultatDeTravail, { genre: 'AJOUT' }>;

function messageDe(e: unknown): string {
	if (e instanceof ConvexError && typeof e.data === 'string') return e.data;
	return 'Le travail s’est arrêté sur une erreur inattendue. Relancez-le.';
}

export const executer = internalAction({
	args: { id: v.id('travauxEquipe') },
	returns: v.null(),
	handler: async (ctx, { id }): Promise<null> => {
		const t = await ctx.runQuery(internal.admin.travauxExecution.lire, { id });
		if (t === null || t.etat === 'FAIT' || t.etat === 'ECHEC') return null;
		// Le choix du matin de Plume a son exécution (`prospectsDuJourExecution.ts`).
		if (t.genre === 'PROSPECTS_DU_JOUR') return null;
		const debut = Date.now();
		const noter = async (note: Note): Promise<void> => {
			await ctx.runMutation(internal.admin.travauxExecution.noter, { id, ...note });
		};
		const suivi: Suivi = async (etape, fait, total) => {
			await noter({
				etape,
				...(fait === undefined ? {} : { fait }),
				...(total === undefined ? {} : { total })
			});
		};
		if (t.etat === 'EN_ATTENTE') await noter({ etat: 'EN_COURS', commenceLe: debut });
		const { zone, page } = t.criteres;
		const jour = jourDeParis(debut);

		try {
			if (t.genre === 'CHERCHER_ANNUAIRE') {
				const secteur = t.criteres.secteur;
				if (secteur === undefined) throw new ConvexError('Le secteur de la recherche manque.');
				const resultat = await chercherALAnnuaire(ctx, { secteur, zone, page }, suivi);
				await noter({ etat: 'FAIT', etape: 'Fini', resultat, finiLe: Date.now() });
				return null;
			}
			if (t.genre === 'CHERCHER_DECP') {
				const acheteurs = t.criteres.acheteurs;
				if (acheteurs === undefined) throw new ConvexError('Les acheteurs de la recherche manquent.');
				const resultat = await chercherDansLaCommandePublique(
					ctx,
					{ acheteurs, zone, page, jour },
					suivi
				);
				await noter({ etat: 'FAIT', etape: 'Fini', resultat, finiLe: Date.now() });
				return null;
			}

			// AJOUTER_DECP : fournisseur après fournisseur, chacun écrit dès qu'il est prêt.
			const acheteurs = t.criteres.acheteurs;
			if (acheteurs === undefined) throw new ConvexError('Les acheteurs de l’ajout manquent.');
			const titulaires = t.titulaires ?? [];
			const libelle = `Commande publique : ${ACHETEURS[acheteurs].libelle}, ${ZONES[zone].libelle}`;
			const bilan: BilanDAjout =
				t.resultat?.genre === 'AJOUT'
					? { ...t.resultat, echecs: [...t.resultat.echecs] }
					: { genre: 'AJOUT', importes: 0, ecartes: 0, horsZone: 0, echecs: [] };
			let importId = t.importId;
			let fait = t.fait ?? 0;
			while (fait < titulaires.length) {
				if (Date.now() - debut > PASSE_MS) {
					await noter({ fait, resultat: bilan, etape: 'Une pause, puis la suite' });
					await ctx.scheduler.runAfter(0, internal.admin.travauxExecution.executer, { id });
					return null;
				}
				const titulaire = titulaires[fait];
				if (titulaire === undefined) break;
				await suivi(`${titulaire.nom} : ses marchés et son estimation`, fait, titulaires.length);
				try {
					const pret = await preparerFournisseur(titulaire, { zone, jour, maintenant: Date.now() });
					if (pret.genre === 'HORS_ZONE') {
						bilan.horsZone += 1;
					} else {
						const ecrit = await ctx.runMutation(internal.admin.decpEcriture.ajouterAuLot, {
							fournisseurs: [pret.fournisseur],
							...(importId === undefined ? {} : { importId }),
							libelle,
							lignes: titulaires.length,
							par: t.par
						});
						importId = ecrit.importId;
						bilan.importes += ecrit.importes;
						bilan.ecartes += ecrit.ecartes;
					}
				} catch {
					// Les sources n'ont pas servi ce fournisseur, même après reprises : on passe.
					bilan.echecs.push(titulaire.nom);
				}
				fait += 1;
				await noter({ fait, resultat: bilan, ...(importId === undefined ? {} : { importId }) });
			}
			await noter({ etat: 'FAIT', etape: 'Fini', fait, resultat: bilan, finiLe: Date.now() });
		} catch (e) {
			await noter({ etat: 'ECHEC', erreur: messageDe(e), finiLe: Date.now() });
		}
		return null;
	}
});

/** Les travaux restés muets dix minutes : une action interrompue ne laisse pas « en cours ». */
export const interrompre = internalMutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const seuil = Date.now() - MUET_MS;
		for (const etat of ['EN_ATTENTE', 'EN_COURS'] as const) {
			const travaux = await ctx.db
				.query('travauxEquipe')
				.withIndex('by_etat', (q) => q.eq('etat', etat))
				.take(50);
			for (const t of travaux) {
				if ((t.majLe ?? t.creeLe) < seuil) {
					await ctx.db.patch(t._id, {
						etat: 'ECHEC',
						erreur: 'Le travail s’est interrompu. Relancez-le.',
						finiLe: Date.now()
					});
				}
			}
		}
		return null;
	}
});
