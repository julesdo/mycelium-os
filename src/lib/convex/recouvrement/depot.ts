'use node';

import { v } from 'convex/values';
import { internalAction } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { decoderTexte } from '../../socle/documents/csv';
import {
	importerExportComptable,
	type ResultatImport
} from '../../verticales/recouvrement/import/exportComptable';

/**
 * Le traitement d'un fichier déposé — l'endroit où le fichier devient des
 * factures.
 *
 * `"use node"` pour le décodage de buffer ; ce fichier n'exporte donc AUCUNE
 * `query` ni `mutation`. Elles vivent dans `depotMutations.ts`, à côté, comme
 * EGalim sépare `extraction.ts` de `extractionMutations.ts`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * IL NE LÈVE JAMAIS VERS L'APPELANT
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Toute sortie d'erreur passe par `marquerEchec`, jamais par une exception qui
 * remonterait. C'est la même discipline que l'extraction d'EGalim, et pour la
 * même raison : un fichier qui échoue ne doit pas emporter le dépôt entier, et
 * surtout, un échec doit laisser une TRACE LISIBLE à l'écran. Une exception
 * remontée disparaît dans les journaux du serveur, où le gérant ne va pas.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE BILAN DIT AUSSI CE QUI N'A PAS MARCHÉ
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Un import qui affiche « 198 factures créées » sans mentionner les deux lignes
 * écartées ment par omission — et l'omission porte précisément sur l'argent
 * qu'on ne réclamera pas. Le bilan sépare donc trois choses :
 *
 *   · ce qui est entré ;
 *   · ce qui a été écarté À BON DROIT (produits, TVA, trésorerie) ;
 *   · ce qui n'a PAS PU être lu, avec la raison, ligne par ligne.
 */

/**
 * Les lignes illisibles conservées dans le bilan.
 *
 * Cinquante suffisent : au-delà, le problème est le fichier lui-même et pas
 * telle ou telle ligne. Le TOTAL, lui, est toujours exact — c'est lui qui dit
 * l'ampleur, la liste ne sert qu'à comprendre.
 */
const IGNOREES_MONTREES = 50;

function bilanDe(resultat: ResultatImport, enregistrement: {
	debiteursCrees: number;
	facturesCreees: number;
	facturesDejaConnues: number;
	reglementsCrees: number;
	reglementsOrphelins: number;
}) {
	return {
		format: resultat.format,
		debiteursCrees: enregistrement.debiteursCrees,
		facturesCreees: enregistrement.facturesCreees,
		facturesDejaConnues: enregistrement.facturesDejaConnues,
		reglementsCrees: enregistrement.reglementsCrees,
		reglementsOrphelins: enregistrement.reglementsOrphelins,
		horsPerimetre: resultat.horsPerimetre,
		ignorees: resultat.ignorees.slice(0, IGNOREES_MONTREES).map((ligne) => ({
			// Une ligne de FEC peut être très longue ; on garde de quoi la
			// reconnaître dans le fichier, pas de quoi la rejouer.
			texte: ligne.texte.slice(0, 300),
			raison: ligne.raison
		})),
		ignoreesTotal: resultat.ignorees.length
	};
}

export const traiterImport = internalAction({
	args: { importId: v.id('importsRecouvrement') },
	returns: v.null(),
	handler: async (ctx, { importId }) => {
		const suivi = await ctx.runQuery(internal.recouvrement.depotMutations.obtenirImport, {
			importId
		});
		if (suivi === null) return null;

		// Rejouer un import déjà traité ne doit rien recréer. La mutation
		// d'enregistrement est idempotente, mais s'arrêter ici évite de relire
		// le fichier et de réécrire un bilan identique.
		if (suivi.statut === 'TERMINE') return null;

		await ctx.runMutation(internal.recouvrement.depotMutations.marquerEtape, {
			importId,
			statut: 'LECTURE',
			etape: 'Lecture du fichier…'
		});

		let contenu: string;
		try {
			const blob = await ctx.storage.get(suivi.storageId as Id<'_storage'>);
			if (blob === null) {
				throw new Error('Le fichier déposé est introuvable dans le stockage.');
			}
			contenu = decoderTexte(Buffer.from(await blob.arrayBuffer()));
		} catch (erreur) {
			await ctx.runMutation(internal.recouvrement.depotMutations.marquerEchec, {
				importId,
				erreur: erreur instanceof Error ? erreur.message : 'Fichier illisible.'
			});
			return null;
		}

		let resultat: ResultatImport;
		try {
			resultat = importerExportComptable(contenu);
		} catch (erreur) {
			await ctx.runMutation(internal.recouvrement.depotMutations.marquerEchec, {
				importId,
				erreur: erreur instanceof Error ? erreur.message : 'Export non reconnu.'
			});
			return null;
		}

		await ctx.runMutation(internal.recouvrement.depotMutations.marquerEtape, {
			importId,
			statut: 'LECTURE',
			etape: `${resultat.factures.length} facture(s) lue(s), enregistrement…`
		});

		const enregistrement = await ctx.runMutation(
			internal.recouvrement.import.enregistrerImport,
			{
				organizationId: suivi.organizationId,
				factures: resultat.factures.map((facture) => ({
					reference: facture.reference,
					debiteur: facture.debiteur,
					debiteurCompte: facture.debiteurCompte,
					montantTTC: facture.montantTTC,
					dateEmission: facture.dateEmission,
					dateEcheance: facture.dateEcheance
				})),
				reglements: resultat.reglements.map((reglement) => ({
					reference: reglement.reference,
					date: reglement.date,
					montant: reglement.montant
				}))
			}
		);

		await ctx.runMutation(internal.recouvrement.depotMutations.marquerBilan, {
			importId,
			// L'étape finale RESTE affichée : un écran qui se vide à la fin laisse
			// croire qu'il ne s'est rien passé.
			etape: `${enregistrement.facturesCreees} facture(s) enregistrée(s).`,
			bilan: bilanDe(resultat, enregistrement)
		});

		return null;
	}
});
