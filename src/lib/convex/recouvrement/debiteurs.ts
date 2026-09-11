import { v, ConvexError } from 'convex/values';
import { action, internalMutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { authedMutation, authedQuery } from '../functions';
import { api, internal } from '../_generated/api';
import { getUserOrg } from '../lib/auth';
import { normaliserSiren, sirenDepuisSiret } from '../../verticales/recouvrement/pays/france/siren';
import { vSecteurCreance } from './tables';
import { lireEtablissements } from '../../verticales/recouvrement/pays/france/etablissements';
import type { EtablissementTrouve } from '../../verticales/recouvrement/pays/france/etablissements';

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
 * ses clients.
 *
 * ⚠️ « C'EST LA SEULE VOIE QUI NE DÉPEND DE PERSONNE » — C'ÉTAIT FAUX, et cette
 * phrase a laissé un champ de saisie vide pendant des semaines sur l'écran le
 * plus fréquenté du produit. Elle n'avait envisagé qu'UNE source, l'API Sirene,
 * et concluait de son indisponibilité qu'aucune n'existait.
 *
 * Le BODACC est branché depuis le radar de solvabilité. Il est ouvert, sans
 * clé, et il se cherche PAR NOM : chaque annonce porte la dénomination, le
 * SIREN, la forme juridique et l'adresse du siège. Tout ce que le formulaire
 * réclamait y était, à une requête de distance.
 *
 * Voir `chercherAuRegistre`, plus bas, et la raison pour laquelle il PROPOSE
 * au lieu de choisir.
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
		siren: v.string(),
		/**
		 * Ce que le registre dit de la forme, quand le SIREN vient de LUI.
		 *
		 * ⚠️ LE CHAMP EXISTAIT DEPUIS TOUJOURS ET RIEN NE L'ÉCRIVAIT — onzième cas
		 * de la même famille dans ce dépôt. Il est déclaré à `tables.ts`, lu à
		 * l'écran, et aucune mutation ne le remplissait : il ne pouvait donc
		 * qu'être vide, pour toujours.
		 *
		 * Retenir un établissement proposé par le BODACC est le seul moment où le
		 * produit la CONNAÎT. Une saisie manuelle ne la porte pas, et on ne
		 * l'invente pas : absente, elle reste absente.
		 */
		formeJuridique: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { organizationId, debiteurId, siren, formeJuridique }): Promise<null> => {
		const debiteur = await debiteurDe(ctx, organizationId, debiteurId);

		const saisi = siren.trim();
		if (saisi === '') {
			// La forme part avec le numéro : elle venait du registre, à ce numéro-là.
			await ctx.db.patch(debiteur._id, { siren: undefined, formeJuridique: undefined });
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

		await ctx.db.patch(debiteur._id, {
			siren: retenu,
			// Absente d'une saisie manuelle : on garde alors celle qu'on avait, plutôt
			// que d'effacer une information juste.
			...(formeJuridique === undefined ? {} : { formeJuridique })
		});
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
	args: {
		debiteurId: v.id('debiteurs'),
		siren: v.string(),
		formeJuridique: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { debiteurId, siren, formeJuridique }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		await ctx.runMutation(internal.recouvrement.debiteurs.renseignerSirenInterne, {
			organizationId,
			debiteurId,
			siren,
			...(formeJuridique === undefined ? {} : { formeJuridique })
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

/**
 * La denomination d'un debiteur de CET etablissement.
 *
 * Elle existe pour que `chercherAuRegistre` n'accepte pas de nom libre : la
 * recherche part d'un identifiant de debiteur, et le serveur va lire le nom
 * lui-meme. Une action qui prendrait une chaine quelconque serait un relais
 * ouvert vers une API tierce, utilisable par n'importe quel porteur de session
 * pour autre chose que ses propres clients.
 */
export const denominationDuDebiteur = authedQuery({
	args: { debiteurId: v.id('debiteurs') },
	returns: v.string(),
	handler: async (ctx, { debiteurId }): Promise<string> => {
		const { organizationId } = await getUserOrg(ctx);
		const debiteur = await ctx.db.get(debiteurId);
		if (debiteur === null || debiteur.organizationId !== organizationId) {
			throw new ConvexError('Debiteur introuvable');
		}
		return debiteur.denomination;
	}
});

const BASE_BODACC =
	'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records';

/** Assez d'annonces pour couvrir les homonymes, assez peu pour rester rapide. */
const ANNONCES_LUES = 60;

/** Au-dela, ce n'est plus un choix mais une liste a parcourir. */
const CANDIDATS_MAX = 8;

export const chercherAuRegistre = action({
	args: { debiteurId: v.id('debiteurs') },
	returns: v.object({
		/** Le nom sur lequel la recherche a porte, pour que l'ecran le rappelle. */
		cherche: v.string(),
		candidats: v.array(
			v.object({
				siren: v.string(),
				denomination: v.string(),
				formeJuridique: v.optional(v.string()),
				ville: v.optional(v.string()),
				adresse: v.optional(v.string()),
				derniereParution: v.optional(v.string())
			})
		)
	}),
	handler: async (
		ctx,
		{ debiteurId }
	): Promise<{ cherche: string; candidats: EtablissementTrouve[] }> => {
		// L'annotation de retour n'est pas decorative : une action qui appelle une
		// requete de son propre module cree un cycle d'inference, TypeScript
		// retombe sur `any`, et le type de `api` TOUT ENTIER se degrade.
		const cherche: string = await ctx.runQuery(
			api.recouvrement.debiteurs.denominationDuDebiteur,
			{ debiteurId }
		);

		// Le guillemet fermerait le litteral ODSQL et laisserait passer une
		// expression : on le retire plutot que de l'echapper, parce qu'un nom
		// commercial n'en contient jamais un qui compte pour la recherche.
		const terme = cherche.replace(/"/g, ' ').trim();
		if (terme === '') return { cherche, candidats: [] };

		const url =
			`${BASE_BODACC}?limit=${ANNONCES_LUES}&order_by=${encodeURIComponent('dateparution DESC')}` +
			`&where=${encodeURIComponent(`commercant like "${terme}"`)}`;

		const reponse = await fetch(url);
		// ⚠️ ON NE REND PAS UNE LISTE VIDE SUR UNE PANNE. « Aucun etablissement
		// trouve » et « le registre n'a pas repondu » menent le gerant a deux
		// gestes opposes : saisir le SIREN a la main, ou reessayer dans une
		// minute. Les confondre serait un repli silencieux, donc un mensonge.
		if (!reponse.ok) {
			throw new ConvexError(
				`Le registre a repondu ${reponse.status}. La recherche n'a pas pu aboutir.`
			);
		}

		const charge = (await reponse.json()) as { results?: unknown[] };
		const annonces = Array.isArray(charge.results) ? charge.results : [];

		return { cherche, candidats: [...lireEtablissements(annonces)].slice(0, CANDIDATS_MAX) };
	}
});
