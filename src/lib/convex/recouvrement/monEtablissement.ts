import { v, ConvexError } from 'convex/values';
import { action } from '../_generated/server';
import { api } from '../_generated/api';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import {
	lireEtablissements,
	type EtablissementTrouve
} from '../../verticales/recouvrement/pays/france/etablissements';

/**
 * CE QUE LE LOGICIEL SAIT DÉJÀ DE L'ÉTABLISSEMENT DU GÉRANT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ DEUX CHAMPS VIDES QUE LE PRODUIT POUVAIT REMPLIR LUI-MÊME
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les réglages demandaient « Factures émises par an » à la création PUIS à
 * chaque passage, alors que le produit IMPORTE ces factures : il les compte.
 * Et ils demandaient une dénomination, un SIREN et une adresse à taper, alors
 * que le registre public rend les trois sur un nom, comme il le fait déjà pour
 * un débiteur.
 *
 * C'est la règle d'écran n° 1 prise à l'envers : « un champ vide que le
 * logiciel aurait pu remplir est un défaut ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ MESURER N'EST PAS DÉCIDER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le volume mesuré ne s'écrit nulle part et ne change AUCUN palier : un import
 * partiel sous-estime le volume, donc le palier facturé, et un abonnement qui
 * change de palier tout seul est une modification de prix que personne n'a
 * demandée. La mesure s'affiche avec sa FENÊTRE et sa SOURCE ; la déclaration
 * du gérant reste la valeur retenue, et reste modifiable.
 */

/**
 * Le plafond de lecture, et pourquoi il est dit plutôt que caché.
 *
 * Une requête Convex ne lit pas plus de 16 384 documents. Au-delà, la mesure
 * serait tronquée SANS que rien ne le signale, et le gérant lirait un volume
 * inférieur au sien — c'est-à-dire exactement le défaut que la mesure devait
 * corriger. On s'arrête un cran avant, et on le DIT : `plafondAtteint` fait
 * lire « au moins N », jamais « N ».
 */
const PLAFOND_LECTURE = 16_000;

/** `2026-09-16` → `2025-09-16`. Une borne de comparaison de chaînes, pas une date de calendrier. */
function unAnPlusTot(jour: string): string {
	const annee = Number.parseInt(jour.slice(0, 4), 10);
	if (!Number.isFinite(annee)) {
		throw new ConvexError(`« ${jour} » n’est pas une date exploitable.`);
	}
	return `${annee - 1}${jour.slice(4)}`;
}

/**
 * COMBIEN DE FACTURES ONT ÉTÉ ÉMISES SUR LES DOUZE DERNIERS MOIS.
 *
 * La fenêtre est renvoyée avec le compte : une mesure sans sa fenêtre ne se
 * vérifie pas, et c'est elle qui explique un chiffre plus bas que prévu quand
 * l'import ne couvre que six mois.
 */
export const volumeEmis = authedQuery({
	args: {},
	returns: v.object({
		factures: v.number(),
		/** Premier jour de la fenêtre, inclus (AAAA-MM-JJ). */
		depuis: v.string(),
		/** Dernier jour de la fenêtre, inclus (AAAA-MM-JJ). */
		jusqua: v.string(),
		/** La lecture s'est arrêtée au plafond : le compte est un PLANCHER. */
		plafondAtteint: v.boolean()
	}),
	handler: async (
		ctx
	): Promise<{ factures: number; depuis: string; jusqua: string; plafondAtteint: boolean }> => {
		const { organizationId } = await getUserOrg(ctx);

		const jusqua = new Date(Date.now()).toISOString().slice(0, 10);
		const depuis = unAnPlusTot(jusqua);

		const factures = await ctx.db
			.query('facturesVente')
			.withIndex('by_org_and_emission', (q) =>
				q
					.eq('organizationId', organizationId)
					.gte('dateEmission', depuis)
					.lte('dateEmission', jusqua)
			)
			.take(PLAFOND_LECTURE);

		return {
			factures: factures.length,
			depuis,
			jusqua,
			plafondAtteint: factures.length === PLAFOND_LECTURE
		};
	}
});

/**
 * Le même point d'entrée BODACC que la recherche d'un débiteur
 * (`debiteurs.chercherAuRegistre`). Il est recopié plutôt que partagé : les deux
 * recherches ne portent pas sur la même personne — l'une sur un client, l'autre
 * sur soi — et rien ne justifie de les faire bouger ensemble.
 */
const BASE_BODACC =
	'https://bodacc-datadila.opendatasoft.com/api/explore/v2.1/catalog/datasets/annonces-commerciales/records';

/** Assez d'annonces pour couvrir les homonymes, assez peu pour rester rapide. */
const ANNONCES_LUES = 60;

/** Au-delà, ce n'est plus un choix mais une liste à parcourir. */
const CANDIDATS_MAX = 8;

/**
 * IDENTIFIER SON PROPRE ÉTABLISSEMENT AU REGISTRE.
 *
 * ⚠️ AUCUN NOM LIBRE EN ARGUMENT, pour la même raison que du côté débiteur :
 * une action qui accepterait une chaîne quelconque serait un relais ouvert vers
 * une API tierce. Le serveur lit lui-même le nom de l'établissement du porteur
 * de session, et cherche sur celui-là.
 *
 * ⚠️ ON PROPOSE, ON N'ÉCRIT RIEN. Retenir un candidat ne fait que REMPLIR les
 * champs du formulaire ; c'est « Enregistrer » qui écrit, et c'est là que le
 * serveur vérifie la clé de contrôle du numéro (`profil.enregistrer`). Une
 * adresse d'annonce ancienne s'imprimerait sur des décomptes figés : la date de
 * parution part avec chaque candidat, pour qu'elle se lise avant le doigt.
 */
export const chercherMonEtablissementAuRegistre = action({
	args: {},
	returns: v.object({
		/** Le nom sur lequel la recherche a porté, pour que l'écran le rappelle. */
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
	handler: async (ctx): Promise<{ cherche: string; candidats: EtablissementTrouve[] }> => {
		const org = await ctx.runQuery(api.organizations.getMyOrg, {});
		const cherche = org?.name?.trim() ?? '';
		if (cherche === '') {
			throw new ConvexError(
				'Votre établissement n’a pas de nom : le registre ne peut pas être interrogé.'
			);
		}

		// Le guillemet fermerait le littéral ODSQL et laisserait passer une
		// expression : on le retire plutôt que de l'échapper.
		const terme = cherche.replace(/"/g, ' ').trim();
		if (terme === '') return { cherche, candidats: [] };

		const url =
			`${BASE_BODACC}?limit=${ANNONCES_LUES}&order_by=${encodeURIComponent('dateparution DESC')}` +
			`&where=${encodeURIComponent(`commercant like "${terme}"`)}`;

		const reponse = await fetch(url);
		// ⚠️ ON NE REND PAS UNE LISTE VIDE SUR UNE PANNE. « Aucun établissement
		// trouvé » et « le registre n'a pas répondu » mènent à deux gestes
		// opposés : saisir le numéro à la main, ou réessayer. Les confondre
		// serait un repli silencieux, donc un mensonge.
		if (!reponse.ok) {
			throw new ConvexError(
				`Le registre a répondu ${reponse.status}. La recherche n’a pas pu aboutir.`
			);
		}

		const charge = (await reponse.json()) as { results?: unknown[] };
		const annonces = Array.isArray(charge.results) ? charge.results : [];

		return { cherche, candidats: [...lireEtablissements(annonces)].slice(0, CANDIDATS_MAX) };
	}
});
