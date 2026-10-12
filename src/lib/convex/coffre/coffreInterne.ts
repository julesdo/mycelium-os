import { v } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { vChiffrementDocument } from '../recouvrement/tables';

/**
 * LE COFFRE, CÔTÉ MACHINE — ce que les actions appellent, et que personne
 * d'autre ne voit (12/10/2026). Voir `docs/superpowers/specs/2026-10-12-coffre-fort.md`.
 *
 * ⚠️ AUCUNE FONCTION D'ICI NE DÉCHIFFRE. Les mutations ne manipulent que des
 * enveloppes et des métadonnées ; le chiffrement vit dans les actions
 * (`serrure.ts`), là où la clé maîtresse se lit et où les octets passent.
 */

const vCible = v.union(
	v.object({ importId: v.id('importsRecouvrement') }),
	v.object({ pieceId: v.id('pieces') })
);

/** L'enveloppe de la clé d'un établissement, ou `null` avant son premier dépôt. */
export const cleEnveloppee = internalQuery({
	args: { organizationId: v.id('organizations') },
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, { organizationId }): Promise<string | null> => {
		const rangee = await ctx.db
			.query('coffresCles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		return rangee?.cleEnveloppee ?? null;
	}
});

/**
 * Pose la clé d'un établissement — SAUF si une autre action l'a posée entre-temps.
 * Rend l'enveloppe qui fait foi : deux dépôts simultanés ne tirent jamais deux
 * clés, sans quoi la moitié des documents ne se rouvrirait plus.
 */
export const poserCle = internalMutation({
	args: { organizationId: v.id('organizations'), cleEnveloppee: v.string(), version: v.number() },
	returns: v.string(),
	handler: async (ctx, { organizationId, cleEnveloppee, version }): Promise<string> => {
		const deja = await ctx.db
			.query('coffresCles')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		if (deja !== null) return deja.cleEnveloppee;
		await ctx.db.insert('coffresCles', {
			organizationId,
			cleEnveloppee,
			version,
			creeeLe: Date.now()
		});
		return cleEnveloppee;
	}
});

/**
 * POSE LE SCEAU SUR UN DOCUMENT : son nouveau fichier (le chiffré), le vecteur,
 * l'empreinte, la taille et le type vérifié.
 *
 * ⚠️ SEULEMENT SI LE DOCUMENT POINTE ENCORE SUR L'ORIGINAL ET N'EST PAS SCELLÉ.
 * Deux lectures concurrentes du même dépôt ne scellent qu'une fois ; la seconde
 * apprend `false` et efface son chiffré en trop.
 */
export const marquerScelle = internalMutation({
	args: {
		cible: vCible,
		ancien: v.id('_storage'),
		nouveau: v.id('_storage'),
		chiffrement: vChiffrementDocument,
		empreinte: v.string(),
		taille: v.number(),
		mime: v.string()
	},
	returns: v.boolean(),
	handler: async (ctx, args): Promise<boolean> => {
		const document =
			'importId' in args.cible
				? await ctx.db.get(args.cible.importId)
				: await ctx.db.get(args.cible.pieceId);
		if (
			document === null ||
			document.storageId !== args.ancien ||
			document.chiffrement !== undefined
		) {
			return false;
		}
		await ctx.db.patch(document._id, {
			storageId: args.nouveau,
			chiffrement: args.chiffrement,
			empreinte: args.empreinte,
			taille: args.taille,
			mimeType: args.mime
		});
		return true;
	}
});

/**
 * Reporte le nouveau fichier d'un dépôt sur les factures qu'il avait produites
 * (`facturesVente.documentId`), une page à la fois. Ne sert qu'aux dépôts
 * scellés APRÈS leur lecture — ceux d'avant le coffre.
 */
export const reporterSurLesFactures = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		ancien: v.id('_storage'),
		nouveau: v.id('_storage'),
		curseur: v.union(v.string(), v.null())
	},
	returns: v.union(v.string(), v.null()),
	handler: async (ctx, { organizationId, ancien, nouveau, curseur }): Promise<string | null> => {
		const page = await ctx.db
			.query('facturesVente')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.paginate({ cursor: curseur, numItems: 500 });
		for (const facture of page.page) {
			if (facture.documentId === ancien) await ctx.db.patch(facture._id, { documentId: nouveau });
		}
		return page.isDone ? null : page.continueCursor;
	}
});

/** Ce qu'il faut à l'action HTTP pour ouvrir un document. */
const vOuverture = v.object({
	organizationId: v.id('organizations'),
	storageId: v.id('_storage'),
	nom: v.string(),
	mime: v.string(),
	chiffrement: v.optional(vChiffrementDocument),
	empreinte: v.optional(v.string()),
	geste: v.union(v.literal('CONSULTATION'), v.literal('TELECHARGEMENT'))
});

/**
 * CONSOMME UN JETON D'OUVERTURE : une seule fois, avant son expiration. Rend ce
 * qu'il faut pour ouvrir le document, ou `null` — et le jeton disparaît dans
 * les deux cas, pour qu'un jeton intercepté ne serve jamais deux fois.
 */
export const consommerTicket = internalMutation({
	args: { jeton: v.string(), maintenant: v.number() },
	returns: v.union(v.null(), vOuverture),
	handler: async (ctx, { jeton, maintenant }) => {
		const ticket = await ctx.db
			.query('ticketsCoffre')
			.withIndex('by_jeton', (q) => q.eq('jeton', jeton))
			.first();
		if (ticket === null) return null;
		await ctx.db.delete(ticket._id);
		if (ticket.expireLe < maintenant) return null;

		const document =
			ticket.importId !== undefined
				? await ctx.db.get(ticket.importId)
				: ticket.pieceId !== undefined
					? await ctx.db.get(ticket.pieceId)
					: null;
		// Le cloisonnement, revérifié au moment d'ouvrir.
		if (document === null || document.organizationId !== ticket.organizationId) return null;

		return {
			organizationId: ticket.organizationId,
			storageId: document.storageId,
			nom: document.filename,
			mime: document.mimeType ?? 'application/octet-stream',
			...(document.chiffrement === undefined ? {} : { chiffrement: document.chiffrement }),
			...(document.empreinte === undefined ? {} : { empreinte: document.empreinte }),
			geste: ticket.geste
		};
	}
});

/** Les jetons expirés, effacés une fois par jour : ils ne servent plus à rien. */
export const purgerTicketsExpires = internalMutation({
	args: {},
	returns: v.number(),
	handler: async (ctx): Promise<number> => {
		const expires = await ctx.db
			.query('ticketsCoffre')
			.withIndex('by_expire', (q) => q.lt('expireLe', Date.now()))
			.take(500);
		for (const ticket of expires) await ctx.db.delete(ticket._id);
		return expires.length;
	}
});

/** Une ligne au journal du coffre. */
export async function journaliser(
	ctx: MutationCtx,
	entree: {
		organizationId: Id<'organizations'>;
		importId?: Id<'importsRecouvrement'>;
		pieceId?: Id<'pieces'>;
		nomDocument: string;
		geste: 'DEPOT' | 'CONSULTATION' | 'TELECHARGEMENT' | 'RETRAIT';
		userId: string;
	}
): Promise<void> {
	await ctx.db.insert('accesDocuments', { ...entree, le: Date.now() });
}

/** Les dépôts et pièces d'avant le coffre, encore en clair : la migration les scelle un à un. */
export const documentsEnClair = internalQuery({
	args: {},
	returns: v.array(
		v.object({
			cible: vCible,
			organizationId: v.id('organizations'),
			storageId: v.id('_storage'),
			nom: v.string()
		})
	),
	handler: async (ctx) => {
		const imports = (await ctx.db.query('importsRecouvrement').take(1000))
			.filter((d) => d.chiffrement === undefined)
			.map((d) => ({
				cible: { importId: d._id },
				organizationId: d.organizationId,
				storageId: d.storageId,
				nom: d.filename
			}));
		const pieces = (await ctx.db.query('pieces').take(1000))
			.filter((d) => d.chiffrement === undefined)
			.map((d) => ({
				cible: { pieceId: d._id },
				organizationId: d.organizationId,
				storageId: d.storageId,
				nom: d.filename
			}));
		return [...imports, ...pieces].slice(0, 50);
	}
});
