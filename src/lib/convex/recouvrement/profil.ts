import { v, ConvexError } from 'convex/values';
import { internalMutation, internalQuery } from '../_generated/server';
import { internal } from '../_generated/api';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { normaliserSiren, sirenDepuisSiret } from '../../verticales/recouvrement/pays/france/siren';
import { vEtatCritere } from './tables';
import { depuisEuros, enCentimes } from '../../socle/montants';

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
		estCommercant: vEtatCritere,
		signataireNom: v.optional(v.string()),
		signataireQualite: v.optional(v.string()),
		email: v.optional(v.string()),
		telephone: v.optional(v.string()),
		capitalSocial: v.optional(v.int64()),
		immatriculeRcs: v.optional(v.boolean()),
		villeGreffeRcs: v.optional(v.string()),
		iban: v.optional(v.string())
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
			estCommercant: profil.estCommercant,
			signataireNom: profil.signataireNom,
			signataireQualite: profil.signataireQualite,
			email: profil.email,
			telephone: profil.telephone,
			capitalSocial: profil.capitalSocial,
			immatriculeRcs: profil.immatriculeRcs,
			villeGreffeRcs: profil.villeGreffeRcs,
			iban: profil.iban
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
			estCommercant: profil.estCommercant,
			signataireNom: profil.signataireNom,
			signataireQualite: profil.signataireQualite,
			email: profil.email,
			telephone: profil.telephone,
			capitalSocial: profil.capitalSocial,
			immatriculeRcs: profil.immatriculeRcs,
			villeGreffeRcs: profil.villeGreffeRcs,
			iban: profil.iban
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

/** L'IBAN vérifié par sa clé (ISO 13616, reste 1 modulo 97). Rend `null` quand il ne tombe pas. */
function ibanValide(saisi: string): string | null {
	const iban = saisi.replace(/s+/g, '').toUpperCase();
	if (!/^[A-Z]{2}d{2}[A-Z0-9]{11,30}$/.test(iban)) return null;
	const deplace = iban.slice(4) + iban.slice(0, 4);
	const chiffres = deplace.replace(/[A-Z]/g, (l) => String(l.charCodeAt(0) - 55));
	let reste = 0;
	for (const c of chiffres) reste = (reste * 10 + Number(c)) % 97;
	return reste === 1 ? iban : null;
}

/**
 * CE QUI S'IMPRIME SUR LES COURRIERS : le signataire, les coordonnées, les
 * mentions de l'en-tête et l'IBAN. Chaque champ vide efface le précédent.
 */
export const enregistrerCourriers = authedMutation({
	args: {
		signataireNom: v.string(),
		signataireQualite: v.string(),
		email: v.string(),
		telephone: v.string(),
		capitalSocialEuros: v.string(),
		immatriculeRcs: v.union(v.boolean(), v.null()),
		villeGreffeRcs: v.string(),
		iban: v.string()
	},
	returns: v.null(),
	handler: async (ctx, args): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		if (profil === null) {
			throw new ConvexError(
				'Renseignez d’abord votre entreprise : sa dénomination s’imprime en tête des courriers.'
			);
		}
		const email = args.email.trim();
		if (email !== '' && !/^[^s@]+@[^s@]+.[^s@]+$/.test(email)) {
			throw new ConvexError(`« ${email} » n’est pas une adresse électronique.`);
		}
		const ibanSaisi = args.iban.trim();
		const iban = ibanSaisi === '' ? undefined : ibanValide(ibanSaisi);
		if (iban === null) {
			throw new ConvexError(
				`« ${ibanSaisi} » n’est pas un IBAN : sa clé de contrôle ne tombe pas.`
			);
		}
		const capitalSaisi = args.capitalSocialEuros.trim();
		let capitalSocial: bigint | undefined;
		if (capitalSaisi !== '') {
			try {
				capitalSocial = enCentimes(depuisEuros(capitalSaisi));
			} catch {
				throw new ConvexError(`« ${capitalSaisi} » n’est pas un montant en euros.`);
			}
		}
		const texte = (s: string) => (s.trim() === '' ? undefined : s.trim());
		await ctx.db.patch(profil._id, {
			signataireNom: texte(args.signataireNom),
			signataireQualite: texte(args.signataireQualite),
			email: texte(email),
			telephone: texte(args.telephone),
			capitalSocial,
			immatriculeRcs: args.immatriculeRcs ?? undefined,
			villeGreffeRcs: texte(args.villeGreffeRcs),
			iban,
			majLe: Date.now()
		});
		return null;
	}
});
