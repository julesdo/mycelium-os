'use node';

import { v } from 'convex/values';
import Papa from 'papaparse';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import { decoderTexte } from '../../socle/documents/csv';
import {
	derniereLivraison,
	lireLivraison,
	type FicheAvocat
} from '../../verticales/recouvrement/annuaire-avocats';

/**
 * L'ANNUAIRE DES AVOCATS SE NOURRIT SEUL, CHAQUE NUIT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CETTE TÂCHE EXISTE (01/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'annuaire ne se remplissait que par `scripts/importer-annuaire-avocats.ts`,
 * lancé à la main avec la clé d'administration du déploiement. Personne ne l'a
 * jamais lancé en production : la table y était vide, et chaque recherche
 * d'avocat y rendait zéro fiche. Le fondateur, le même jour : « pourquoi on
 * doit nous-même mettre les caractéristiques […] alors qu'on a déjà toutes les
 * infos sur l'affaire ? » — proposer des avocats dans le dossier suppose
 * d'abord d'en avoir.
 *
 * Chaque nuit, la tâche demande à data.gouv.fr la liste des fichiers du jeu
 * « annuaire-des-avocats-de-france » (Conseil national des barreaux, Licence
 * Ouverte 2.0). Si le plus récent est plus récent que celui en base, elle le
 * télécharge, le lit avec le module que le script partage, et remplace
 * l'annuaire. Sinon elle ne fait rien : un appel de métadonnées par nuit.
 *
 * ⚠️ `use node` : le fichier pèse près de dix mégaoctets, et quatre-vingt mille
 * fiches en mémoire dépassent ce que le moteur par défaut accorde à une action.
 *
 * ⚠️ LE VIDAGE PRÉCÈDE L'INSERTION, comme dans le script, et pour la même
 * raison : un annuaire vide pendant une minute ne ment pas — l'écran dit qu'il
 * ne trouve rien —, alors qu'un annuaire à moitié remplacé ferait coexister deux
 * relevés sous une seule date.
 */

const JEU_DE_DONNEES = 'https://www.data.gouv.fr/api/1/datasets/annuaire-des-avocats-de-france/';

/** Le nombre de fiches par mutation : cinq cents tiennent largement dans une transaction. */
const LOT = 500;

/** Une fiche sans ses champs absents : une valeur `undefined` n'a pas sa place dans un argument. */
function sansVide(fiche: FicheAvocat): FicheAvocat {
	return Object.fromEntries(
		Object.entries(fiche).filter(([, valeur]) => valeur !== undefined)
	) as unknown as FicheAvocat;
}

export const rafraichirAnnuaireAvocats = internalAction({
	args: {},
	returns: v.union(v.null(), v.object({ releveeLe: v.string(), fiches: v.number() })),
	handler: async (ctx): Promise<{ releveeLe: string; fiches: number } | null> => {
		const reponse = await fetch(JEU_DE_DONNEES);
		if (!reponse.ok) {
			throw new Error(
				`data.gouv.fr a répondu ${reponse.status} sur le jeu de l’annuaire des avocats : ` +
					'l’annuaire en base est gardé tel quel, et la tâche repassera la nuit prochaine.'
			);
		}

		const livraison = derniereLivraison(await reponse.json());
		if (livraison === null) {
			throw new Error(
				'Aucun fichier « annuaire-avocats-AAAAMMJJ.csv » dans le jeu de data.gouv.fr : le ' +
					'Conseil national des barreaux a peut-être changé ses noms de fichier. L’annuaire en ' +
					'base est gardé tel quel.'
			);
		}

		const enBase = await ctx.runQuery(internal.recouvrement.annuaires.releveEnBase, {});
		if (enBase !== null && enBase >= livraison.releveeLe) return null;

		const fichier = await fetch(livraison.url);
		if (!fichier.ok) {
			throw new Error(
				`Le fichier du relevé du ${livraison.releveeLe} a répondu ${fichier.status} : l’annuaire ` +
					'en base est gardé tel quel.'
			);
		}

		// UTF-8 strict d'abord, puis windows-1252 : jamais de caractères de
		// remplacement en silence dans quatre-vingt mille adresses.
		const contenu = decoderTexte(new Uint8Array(await fichier.arrayBuffer()));
		const rangees = Papa.parse<string[]>(contenu, {
			delimiter: ';',
			header: false,
			skipEmptyLines: true
		}).data;

		// Lève sur une colonne disparue ou un fichier sans fiche : rien n'est vidé.
		const { fiches } = lireLivraison(rangees);

		for (;;) {
			const effacees = await ctx.runMutation(internal.recouvrement.annuaires.viderUnLot, {
				combien: LOT
			});
			if (effacees === 0) break;
		}
		for (let debut = 0; debut < fiches.length; debut += LOT) {
			await ctx.runMutation(internal.recouvrement.annuaires.insererUnLot, {
				releveeLe: livraison.releveeLe,
				fiches: fiches.slice(debut, debut + LOT).map(sansVide)
			});
		}

		return { releveeLe: livraison.releveeLe, fiches: fiches.length };
	}
});
