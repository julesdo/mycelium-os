import { v } from 'convex/values';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { PLAN_PAR_DEFAUT, type CleEtapePlan } from '../../verticales/recouvrement/plan-relance';

/**
 * PLUME SUR CHAQUE ÉCRAN, CÔTÉ BASE (13/10/2026) — ce qu'il ne redira pas, et ce
 * qu'il vient de finir.
 *
 * Ce que Plume dit vit dans `verticales/recouvrement/compagnon/presence.ts` ; sa
 * bulle, dans `app/compagnon.tsx`. Ici, deux lectures étroites et une écriture.
 */

/** Assez pour des mois de ✕ ; au-delà, les plus anciens peuvent revenir. */
const SILENCES_LUS = 500;

/**
 * CE QUE PLUME NE REDIRA PAS À CE COMPTE — les clés, les plus récentes d'abord.
 */
export const silences = authedQuery({
	args: {},
	returns: v.array(v.string()),
	handler: async (ctx): Promise<string[]> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const lignes = await ctx.db
			.query('silencesPlume')
			.withIndex('by_org_and_user_and_le', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id)
			)
			.order('desc')
			.take(SILENCES_LUS);
		return lignes.map((ligne) => ligne.cle);
	}
});

/**
 * FAIRE TAIRE PLUME SUR UN POINT — le ✕ de sa bulle, ou une présentation faite.
 * Idempotent : une clé déjà tue ne s'écrit pas deux fois.
 */
export const taire = authedMutation({
	args: { cle: v.string() },
	returns: v.null(),
	handler: async (ctx, { cle }): Promise<null> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const propre = cle.trim().slice(0, 200);
		if (propre === '') return null;
		const deja = await ctx.db
			.query('silencesPlume')
			.withIndex('by_org_and_user_and_cle', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id).eq('cle', propre)
			)
			.first();
		if (deja !== null) return null;
		await ctx.db.insert('silencesPlume', {
			organizationId,
			userId: user._id,
			cle: propre,
			le: Date.now()
		});
		return null;
	}
});

/**
 * LA DERNIÈRE NOTIFICATION DE CE COMPTE — la bulle l'annonce si elle arrive pendant
 * qu'on travaille. Une lecture d'une ligne : elle ne bouge qu'à l'arrivée d'une
 * nouvelle, ou quand celle-ci est lue.
 */
export const derniereNotification = authedQuery({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			id: v.id('notifications'),
			genre: v.string(),
			creeeLe: v.number(),
			lue: v.boolean()
		})
	),
	handler: async (ctx) => {
		const { user } = await getUserOrg(ctx);
		const derniere = await ctx.db
			.query('notifications')
			.withIndex('by_user_and_created', (q) => q.eq('userId', user._id))
			.order('desc')
			.first();
		return derniere === null
			? null
			: {
					id: derniere._id,
					genre: derniere.type,
					creeeLe: derniere.createdAt,
					lue: derniere.isRead
				};
	}
});

/**
 * LES DERNIERS TRAVAUX FINIS DU PILOTE — ce que la bulle annonce.
 *
 * ⚠️ PAR L'INDEX DE L'ÉTAT, PAS PAR CELUI DU COMMENCEMENT. Un travail en cours
 * coche une étape toutes les 0,7 s ; lu par `by_org_and_commence`, chaque coche
 * relancerait cette requête. Lus par état, seuls les travaux finis entrent dans
 * ce qu'elle lit : elle ne bouge que quand un travail se termine.
 */
export const travauxTermines = authedQuery({
	args: {},
	returns: v.array(
		v.object({
			id: v.id('travauxPilote'),
			titre: v.string(),
			bilan: v.union(v.string(), v.null()),
			etat: v.union(v.literal('FAIT'), v.literal('ECHEC')),
			termineLe: v.number()
		})
	),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const lire = (etat: 'FAIT' | 'ECHEC', combien: number) =>
			ctx.db
				.query('travauxPilote')
				.withIndex('by_org_and_etat', (q) =>
					q.eq('organizationId', organizationId).eq('etat', etat)
				)
				.order('desc')
				.take(combien);
		const [faits, echecs] = await Promise.all([lire('FAIT', 6), lire('ECHEC', 2)]);
		return [...faits, ...echecs]
			.map((t) => ({
				id: t._id,
				titre: t.titre,
				bilan: t.bilan ?? null,
				etat: t.etat === 'ECHEC' ? ('ECHEC' as const) : ('FAIT' as const),
				termineLe: t.termineLe ?? t.commenceLe
			}))
			.sort((a, b) => b.termineLe - a.termineLe)
			.slice(0, 6);
	}
});

/**
 * LE DERNIER PAIEMENT ARRIVÉ — la bulle le fête s'il arrive pendant qu'on travaille.
 * Un avoir n'est pas de l'argent qui rentre : seuls un paiement et un acompte se
 * fêtent.
 */
export const dernierPaiement = authedQuery({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			id: v.id('reglements'),
			montant: v.int64(),
			client: v.string(),
			creeLe: v.number()
		})
	),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const derniers = await ctx.db
			.query('reglements')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.order('desc')
			.take(5);
		const paiement = derniers.find((r) => r.nature === 'PAIEMENT' || r.nature === 'ACOMPTE');
		if (paiement === undefined) return null;
		const facture = await ctx.db.get(paiement.factureId);
		const debiteur = facture === null ? null : await ctx.db.get(facture.debiteurId);
		return {
			id: paiement._id,
			montant: paiement.montant,
			client: debiteur?.denomination ?? 'Un client',
			creeLe: paiement.creeLe
		};
	}
});

/**
 * CE QUE PLUME FAIT ENSUITE — la prochaine relance programmée, pour la ligne du bas
 * de sa bulle. Rien quand les relances ne partent pas seules.
 */
export const prochaineRelance = authedQuery({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			creanceId: v.id('creances'),
			client: v.string(),
			etape: v.string(),
			partiraLe: v.number()
		})
	),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const programmes = await ctx.db
			.query('envois')
			.withIndex('by_org_and_etat', (q) =>
				q.eq('organizationId', organizationId).eq('etat', 'PROGRAMME')
			)
			.take(50);
		const premier = [...programmes].sort(
			(a, b) => (a.partiraLe ?? a.prepareLe) - (b.partiraLe ?? b.prepareLe)
		)[0];
		if (premier === undefined) return null;
		const creance = await ctx.db.get(premier.creanceId);
		const debiteur = creance === null ? null : await ctx.db.get(creance.debiteurId);
		return {
			creanceId: premier.creanceId,
			client: debiteur?.denomination ?? 'Client',
			etape:
				PLAN_PAR_DEFAUT.find((e) => e.cle === (premier.etapePlan as CleEtapePlan | undefined))
					?.nom ?? 'Relance',
			partiraLe: premier.partiraLe ?? premier.prepareLe
		};
	}
});

/**
 * LE TRAVAIL EN COURS, ÉTROIT — son titre et son avancement, pour la bulle ouverte.
 * Elle change à chaque coche : on ne la lit que la bulle ouverte.
 */
export const travailEnCours = authedQuery({
	args: {},
	returns: v.union(
		v.null(),
		v.object({
			titre: v.string(),
			/** L'étape qui se fait : la capsule en direct la dit. */
			etape: v.union(v.string(), v.null()),
			faites: v.number(),
			total: v.number(),
			genre: v.string()
		})
	),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const travail = await ctx.db
			.query('travauxPilote')
			.withIndex('by_org_and_etat', (q) =>
				q.eq('organizationId', organizationId).eq('etat', 'EN_COURS')
			)
			.first();
		if (travail === null) return null;
		const enCours = travail.etapes.find((e) => e.faiteLe === undefined);
		return {
			titre: travail.titre,
			etape: enCours?.libelle ?? null,
			faites: travail.etapes.filter((e) => e.faiteLe !== undefined).length,
			total: travail.etapes.length,
			genre: travail.genre
		};
	}
});

/**
 * LES RELANCES QUE PLUME A PROGRAMMÉES — la capsule en direct (14/10/2026) montre
 * celle qui part dans l'heure, avec « Retenir ».
 *
 * ⚠️ TOUTES, SANS FILTRE DE TEMPS. Une requête ne se recalcule pas quand l'heure
 * passe : c'est le composant, qui avance chaque minute, qui choisit ce qui part
 * dans l'heure (`compagnon/en-direct.ts`). La liste ne bouge qu'à une
 * programmation, un départ ou une relance retenue.
 */
export const relancesProgrammees = authedQuery({
	args: {},
	returns: v.array(
		v.object({
			envoiId: v.id('envois'),
			client: v.string(),
			clientId: v.id('debiteurs'),
			etape: v.string(),
			partiraLe: v.number()
		})
	),
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const programmes = await ctx.db
			.query('envois')
			.withIndex('by_org_and_etat', (q) =>
				q.eq('organizationId', organizationId).eq('etat', 'PROGRAMME')
			)
			.take(50);
		const premiers = [...programmes]
			.sort((a, b) => (a.partiraLe ?? a.prepareLe) - (b.partiraLe ?? b.prepareLe))
			.slice(0, 20);
		const lignes = await Promise.all(
			premiers.map(async (envoi) => {
				const creance = await ctx.db.get(envoi.creanceId);
				if (creance === null) return null;
				const debiteur = await ctx.db.get(creance.debiteurId);
				return {
					envoiId: envoi._id,
					client: debiteur?.denomination ?? 'Client',
					clientId: creance.debiteurId,
					etape:
						PLAN_PAR_DEFAUT.find((e) => e.cle === (envoi.etapePlan as CleEtapePlan | undefined))
							?.nom ?? 'Relance',
					partiraLe: envoi.partiraLe ?? envoi.prepareLe
				};
			})
		);
		return lignes.filter((ligne) => ligne !== null);
	}
});
