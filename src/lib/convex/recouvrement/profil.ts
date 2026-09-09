import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { normaliserSiren, sirenDepuisSiret } from '../../verticales/recouvrement/pays/france/siren';
import { vEtatCritere } from './tables';

/**
 * LE PROFIL CRÉANCIER — déclaré depuis le remodelage, lu à deux endroits, et
 * JAMAIS écrit.
 *
 * La table existe, elle est purgée par le RGPD, elle est lue par la production
 * de décompte et par la qualification de créance — et aucun chemin du produit ne
 * l'alimentait. C'est le troisième « déclaré, jamais renseigné » de la semaine,
 * après le SIREN du débiteur et `santePrecedente`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ CELUI-CI NE COÛTAIT PAS QU'UN EN-TÊTE MANQUANT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `creances.ts` passe `creancierCommercant: profil?.estCommercant ?? 'unknown'`
 * à la déduction des conditions. Sans profil, ce critère valait TOUJOURS
 * `unknown` — donc `entreCommercants` aussi, et l'éligibilité à l'injonction de
 * payer ne pouvait **jamais** être acquise.
 *
 * Le produit annonçait donc une condition non remplie que rien ne permettait de
 * remplir. Le défaut n'était pas le défaut prudent — `unknown` est le bon, le
 * doute ne profite jamais au produit — mais l'absence de porte de sortie.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ET C'EST AUSSI L'EN-TÊTE DE LA PIÈCE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `composerPiece` écrit « Identité du créancier non renseignée » quand il
 * manque : honnête, et pas envoyable à un expert-comptable.
 */

export const enregistrerInterne = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		denomination: v.string(),
		/** Accepte un SIRET : le gérant a le document sous les yeux, pas nos règles. */
		siren: v.optional(v.string()),
		formeJuridique: v.optional(v.string()),
		adresse: v.optional(v.string()),
		estCommercant: vEtatCritere
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const denomination = args.denomination.trim();
		if (denomination === '') {
			// C'EST CE QUI S'IMPRIME EN TÊTE DE LA PIÈCE. Un décompte qui part chez
			// un tiers sans nom de créancier n'est pas un document, c'est un brouillon.
			throw new ConvexError(
				'La dénomination du créancier est ce qui s’imprime en tête du décompte : ' +
					'elle ne peut pas être vide.'
			);
		}

		let siren: string | undefined;
		const saisi = args.siren?.trim() ?? '';
		if (saisi !== '') {
			// Même discipline que sur le débiteur : un numéro faux mais bien formé
			// désigne une AUTRE entreprise, et il s'imprimerait sur une pièce qui
			// part chez un tiers.
			const retenu = sirenDepuisSiret(saisi) ?? normaliserSiren(saisi);
			if (retenu === null) {
				throw new ConvexError(`« ${saisi} » n’est pas un SIREN : sa clé de contrôle ne tombe pas.`);
			}
			siren = retenu;
		}

		// UN SEUL PROFIL PAR ÉTABLISSEMENT. En créer un second laisserait le
		// `.first()` de `figerDecompte` en choisir un au hasard, et le décompte
		// porterait une identité différente d'une production à l'autre.
		const existant = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', args.organizationId))
			.first();

		const champs = {
			denomination,
			siren,
			formeJuridique: args.formeJuridique?.trim() || undefined,
			estCommercant: args.estCommercant,
			adresse: args.adresse?.trim() || undefined,
			majLe: Date.now()
		};

		if (existant === null) {
			await ctx.db.insert('profilsCreancier', {
				organizationId: args.organizationId,
				...champs
			});
		} else {
			await ctx.db.patch(existant._id, champs);
		}
		return null;
	}
});

const vProfil = v.union(
	v.null(),
	v.object({
		denomination: v.string(),
		siren: v.optional(v.string()),
		formeJuridique: v.optional(v.string()),
		adresse: v.optional(v.string()),
		estCommercant: vEtatCritere
	})
);

export const monProfilInterne = internalQuery({
	args: { organizationId: v.id('organizations') },
	returns: vProfil,
	handler: async (ctx, { organizationId }) => {
		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		if (profil === null) return null;
		return {
			denomination: profil.denomination,
			siren: profil.siren,
			formeJuridique: profil.formeJuridique,
			adresse: profil.adresse,
			estCommercant: profil.estCommercant
		};
	}
});

export const monProfil = authedQuery({
	args: {},
	returns: vProfil,
	handler: async (ctx) => {
		const { organizationId } = await getUserOrg(ctx);
		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		if (profil === null) return null;
		return {
			denomination: profil.denomination,
			siren: profil.siren,
			formeJuridique: profil.formeJuridique,
			adresse: profil.adresse,
			estCommercant: profil.estCommercant
		};
	}
});

/**
 * ⚠️ ANNOTATION DE RETOUR OBLIGATOIRE : ce handler appelle
 * `internal.<son propre module>`, ce qui crée un cycle d'inférence faisant
 * retomber le type `api` ENTIER à `any`.
 */
export const enregistrer = authedMutation({
	args: {
		denomination: v.string(),
		siren: v.optional(v.string()),
		formeJuridique: v.optional(v.string()),
		adresse: v.optional(v.string()),
		estCommercant: vEtatCritere
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		await ctx.runMutation(internal.recouvrement.profil.enregistrerInterne, {
			organizationId,
			...args
		});
		return null;
	}
});
