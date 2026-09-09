import { v, ConvexError } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { authedMutation } from '../functions';
import { internal } from '../_generated/api';
import { getUserOrg } from '../lib/auth';
import { normaliserSiren, sirenDepuisSiret } from '../../verticales/recouvrement/pays/france/siren';
import { vSecteurCreance } from './tables';

/**
 * CE QUE LE GÉRANT SEUL PEUT DIRE DE SON DÉBITEUR.
 *
 * « Le logiciel décide, le gérant confirme » : aucun écran ne demande une saisie
 * que le logiciel peut déduire. Restent deux choses qu'il ne peut PAS déduire, et
 * que le gérant connaît par cœur.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE SIREN — la charnière vers les registres publics
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Aucun débiteur en base n'en portait avant le 9 septembre 2026 : le champ
 * existait, il était lu à l'écran, et rien ne l'écrivait. Le rattraper par
 * l'API Sirene demande une clé qui n'est pas obtenue ; le gérant, lui, connaît
 * ses clients. C'est la seule voie qui ne dépend de personne.
 *
 * ⚠️ ET IL DOIT POUVOIR L'EFFACER. Un SIREN faux mais bien formé désigne une
 * AUTRE entreprise : il ferait interroger le BODACC sur un tiers, et un
 * « aucune procédure » sur le mauvais numéro se lirait comme un feu vert. C'est
 * la seule erreur de saisie de ce produit qui rend une réponse rassurante et
 * fausse.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE SECTEUR — une dette qu'on solde ici
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Il commande le DÉLAI DE PRESCRIPTION : cinq ans en régime général, un an sur
 * le transport de marchandises. La surveillance déclarait depuis des mois
 * l'hypothèse « préciser le secteur lèvera cette hypothèse » — et AUCUNE
 * mutation ne permettait de le préciser. Une consigne impossible à suivre est
 * pire qu'aucune consigne : le gérant cherche, ne trouve pas, et cesse de croire
 * les autres.
 */

/**
 * Le débiteur, si et seulement s'il appartient à cet établissement.
 *
 * La barrière du cloisonnement, posée AVANT toute écriture. Un identifiant de
 * document Convex est devinable ; l'appartenance ne l'est pas.
 */
async function debiteurDe(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'>
): Promise<Doc<'debiteurs'>> {
	const debiteur = await ctx.db.get(debiteurId);
	if (debiteur === null || debiteur.organizationId !== organizationId) {
		throw new ConvexError('Débiteur introuvable');
	}
	return debiteur;
}

export const renseignerSirenInterne = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		debiteurId: v.id('debiteurs'),
		/** Vide pour effacer. Espaces, points et tirets sont tolérés. */
		siren: v.string()
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, debiteurId, siren }): Promise<null> => {
		const debiteur = await debiteurDe(ctx, organizationId, debiteurId);

		const saisi = siren.trim();
		if (saisi === '') {
			await ctx.db.patch(debiteur._id, { siren: undefined });
			return null;
		}

		// Un SIRET est accepté et réduit à son SIREN : c'est ce que le gérant a
		// sous les yeux sur un document, et lui demander de compter les chiffres
		// serait lui faire faire le travail du logiciel.
		const retenu = sirenDepuisSiret(saisi) ?? normaliserSiren(saisi);
		if (retenu === null) {
			// LE MESSAGE PORTE CE QUI A ÉTÉ REÇU, ET RIEN DE PLUS. « Numéro
			// invalide » sur un champ qu'on vient de taper n'aide personne à voir sa
			// faute de frappe ; le numéro cité, si.
			//
			// ⚠️ ET IL RESTE COURT PARCE QUE L'ÉCRAN LE PORTE DANS UNE ÉTIQUETTE
			// FLOTTANTE, dessinée pour une ligne. Le POURQUOI — qu'un seul chiffre
			// changé désignerait une autre entreprise — vit dans l'aide permanente
			// du champ, qui est visible AVANT la faute plutôt qu'après.
			throw new ConvexError(`« ${saisi} » n’est pas un SIREN : sa clé de contrôle ne tombe pas.`);
		}

		await ctx.db.patch(debiteur._id, { siren: retenu });
		return null;
	}
});

export const renseignerSecteurInterne = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		debiteurId: v.id('debiteurs'),
		secteur: vSecteurCreance
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, debiteurId, secteur }): Promise<null> => {
		const debiteur = await debiteurDe(ctx, organizationId, debiteurId);
		await ctx.db.patch(debiteur._id, { secteur });
		return null;
	}
});

/**
 * ⚠️ ANNOTATION DE RETOUR OBLIGATOIRE sur les deux handlers publics : ils
 * appellent `internal.<leur propre module>`, ce qui crée un cycle d'inférence
 * faisant retomber le type `api` ENTIER à `any` — avec des dizaines d'erreurs
 * dans des fichiers qu'on n'a pas touchés.
 */
export const renseignerSiren = authedMutation({
	args: { debiteurId: v.id('debiteurs'), siren: v.string() },
	returns: v.null(),
	handler: async (ctx, { debiteurId, siren }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		await ctx.runMutation(internal.recouvrement.debiteurs.renseignerSirenInterne, {
			organizationId,
			debiteurId,
			siren
		});
		return null;
	}
});

export const renseignerSecteur = authedMutation({
	args: { debiteurId: v.id('debiteurs'), secteur: vSecteurCreance },
	returns: v.null(),
	handler: async (ctx, { debiteurId, secteur }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		await ctx.runMutation(internal.recouvrement.debiteurs.renseignerSecteurInterne, {
			organizationId,
			debiteurId,
			secteur
		});
		return null;
	}
});
