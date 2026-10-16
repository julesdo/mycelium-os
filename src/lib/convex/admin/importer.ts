import { v, ConvexError } from 'convex/values';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { CHAMPS_IMPORT, type ChampImport } from '../../crm/colonnes';
import { empreinteDEmail, normaliserEmail } from '../../crm/empreinte';
import { verifierImport, type BilanDImport } from '../../crm/import';
import { equipeMutation, equipeQuery, noterAuJournal } from './enveloppe';

/**
 * L'IMPORT DU TABLEUR DE PROSPECTION (16/10/2026).
 *
 * L'écran lit le fichier dans le navigateur (`crm/csv.ts`) et associe les colonnes ;
 * l'aperçu dit, sans rien écrire, ce qui entrera et ce qui sera écarté ; l'import
 * rejoue la même vérification côté serveur, puis écrit. Les oppositions et les
 * doublons se lisent dans la base au moment même.
 */

const MAX_LIGNES = 2000;
const vLignes = v.array(v.array(v.string()));
const vAssociation = v.array(v.union(v.string(), v.null()));

function associationSure(brute: readonly (string | null)[]): (ChampImport | null)[] {
	return brute.map((c) =>
		c !== null && (CHAMPS_IMPORT as readonly string[]).includes(c) ? (c as ChampImport) : null
	);
}

async function bilan(
	ctx: QueryCtx | MutationCtx,
	lignes: readonly (readonly string[])[],
	association: readonly (string | null)[]
): Promise<BilanDImport> {
	if (lignes.length > MAX_LIGNES) throw new ConvexError(`Au plus ${MAX_LIGNES} lignes par import.`);
	const assoc = associationSure(association);
	const prospects = await ctx.db.query('prospects').take(10_000);
	const emails = new Set(prospects.flatMap((p) => (p.email === undefined ? [] : [p.email])));
	const sirens = new Set(prospects.flatMap((p) => (p.siren === undefined ? [] : [p.siren])));

	// Les empreintes des adresses du fichier, pour consulter la liste d'opposition.
	const colonneEmail = assoc.indexOf('email');
	const enOpposition = new Set<string>();
	if (colonneEmail >= 0) {
		for (const ligne of lignes) {
			const brut = ligne[colonneEmail]?.trim();
			if (!brut) continue;
			const email = normaliserEmail(brut);
			const empreinte = await empreinteDEmail(email);
			const trouve = await ctx.db
				.query('oppositions')
				.withIndex('by_empreinte', (q) => q.eq('empreinte', empreinte))
				.first();
			if (trouve !== null) enOpposition.add(email);
		}
	}
	return verifierImport(lignes, assoc, { emails, sirens }, (email) => enOpposition.has(email));
}

const vBilan = v.object({
	aImporter: v.number(),
	ecartees: v.array(v.object({ ligne: v.number(), raison: v.string(), entreprise: v.string() })),
	apercu: v.array(
		v.object({ entreprise: v.string(), ville: v.optional(v.string()), statut: v.string() })
	)
});

export const apercu = equipeQuery('SUPPORT')({
	args: { lignes: vLignes, association: vAssociation },
	returns: vBilan,
	handler: async (ctx, { lignes, association }) => {
		const b = await bilan(ctx, lignes, association);
		return {
			aImporter: b.aImporter.length,
			ecartees: b.ecartees.map((e) => ({
				ligne: e.ligne,
				raison: e.raison,
				entreprise: e.entreprise
			})),
			apercu: b.aImporter.slice(0, 5).map((p) => ({
				entreprise: p.entreprise,
				...(p.ville === undefined ? {} : { ville: p.ville }),
				statut: p.statut
			}))
		};
	}
});

export const importer = equipeMutation('SUPPORT')({
	args: { fichier: v.string(), lignes: vLignes, association: vAssociation },
	returns: v.object({ importes: v.number(), ecartes: v.number() }),
	handler: async (ctx, { fichier, lignes, association }) => {
		const b = await bilan(ctx, lignes, association);
		const maintenant = Date.now();
		const importId = await ctx.db.insert('importsProspects', {
			fichier: fichier.slice(0, 200),
			lignes: lignes.length,
			importes: b.aImporter.length,
			ecartes: b.ecartees.length,
			oppositions: b.oppositionsNouvelles.length,
			par: ctx.equipier.email,
			le: maintenant
		});
		for (const p of b.aImporter) {
			await ctx.db.insert('prospects', {
				...p,
				importId,
				creePar: ctx.equipier.email,
				creeLe: maintenant
			});
		}
		for (const email of b.oppositionsNouvelles) {
			const empreinte = await empreinteDEmail(email);
			const deja = await ctx.db
				.query('oppositions')
				.withIndex('by_empreinte', (q) => q.eq('empreinte', empreinte))
				.first();
			if (deja === null) await ctx.db.insert('oppositions', { empreinte, le: maintenant });
		}
		await noterAuJournal(ctx, ctx.equipier.email, {
			action: 'IMPORT',
			cible: {
				type: 'IMPORT',
				id: importId,
				libelle: `${fichier} : ${b.aImporter.length} prospects`
			}
		});
		return { importes: b.aImporter.length, ecartes: b.ecartees.length };
	}
});

export const historiqueDesImports = equipeQuery('LECTURE')({
	args: {},
	returns: v.array(
		v.object({
			fichier: v.string(),
			importes: v.number(),
			ecartes: v.number(),
			par: v.string(),
			le: v.number()
		})
	),
	handler: async (ctx) =>
		(await ctx.db.query('importsProspects').withIndex('by_le').order('desc').take(20)).map((i) => ({
			fichier: i.fichier,
			importes: i.importes,
			ecartes: i.ecartes,
			par: i.par,
			le: i.le
		}))
});
