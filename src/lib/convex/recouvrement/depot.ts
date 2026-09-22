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
import {
	construirePromptVente,
	documentVenteSchema,
	resultatDepuisDocument
} from '../../verticales/recouvrement/import/factureVente';
import { lireFacturXDuPdf } from '../../socle/documents/facturx';
import { resultatDepuisFacturX } from '../../verticales/recouvrement/import/factureFacturX';
import { extraireAvecClaude, type ContenuDocument } from '../../socle/documents/extracteur';
import { pluriel } from '../../socle/francais';

/** Ce que Claude sait lire directement, sans conversion préalable. */
const TYPES_IMAGE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

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

function bilanDe(
	resultat: ResultatImport,
	enregistrement: {
		debiteursCrees: number;
		facturesCreees: number;
		facturesDejaConnues: number;
		reglementsCrees: number;
		reglementsOrphelins: number;
	}
) {
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

/**
 * Une facture déposée : lue dans le fichier quand elle s'y laisse lire, relue
 * par le modèle sinon.
 *
 * ⚠️ ELLE REND LA MÊME FORME QUE L'EXPORT COMPTABLE. Tout ce qui suit —
 * enregistrement, dédoublonnage, bilan, lignes illisibles — est déjà écrit et
 * déjà testé. Un second chemin d'enregistrement aurait fini par diverger sur le
 * dédoublonnage, c'est-à-dire par créer deux créances contre le même débiteur
 * pour la même facture.
 *
 * ⚠️ C'EST LE SEUL ENDROIT OÙ LA BIFURCATION PEUT VIVRE, et ce n'est pas une
 * préférence : c'est la seule fonction qui connaisse ensemble le type MIME, les
 * octets et le nom du fichier. `traiterImport` n'a donc pas une ligne à changer.
 *
 * ⚠️ ET LE PDF PART TEL QUEL AU MODÈLE. Le rastériser détruirait sa couche texte
 * et ferait relire par OCR des références et des montants déjà présents — sur un
 * document dont le total entre dans un décompte opposable.
 */
async function lireFactureDeposee(
	octets: Buffer,
	mimeType: string,
	nomFichier: string,
	sirenDuCreancier: string | undefined
): Promise<ResultatImport> {
	if (mimeType === 'application/pdf') {
		/*
		  ⚠️ LU DANS LE FICHIER : EXACT, GRATUIT, INSTANTANÉ. Les montants y sont
		  du texte décimal, ils ne traversent aucun flottant, et aucun appel modèle
		  n'a lieu.

		  ⚠️ ABSENT ≠ FAUTIF. `null` veut dire « ce PDF ne porte pas de Factur-X » —
		  une donnée absente, et le modèle prend légitimement le relais. Un
		  Factur-X PRÉSENT mais fautif ne rend pas `null` : il ressort avec ses
		  champs, et `resultatDepuisFacturX` le refuse EN LE NOMMANT. On ne
		  retombe jamais discrètement sur le modèle après avoir constaté qu'un
		  document dit autre chose que ce qu'on attend.
		*/
		const champs = await lireFacturXDuPdf(new Uint8Array(octets));
		if (champs !== null) return resultatDepuisFacturX(champs, nomFichier, sirenDuCreancier);
	}

	const contenu: ContenuDocument =
		mimeType === 'application/pdf'
			? { type: 'pdf', base64: octets.toString('base64') }
			: TYPES_IMAGE.includes(mimeType)
				? { type: 'images', images: [{ mediaType: mimeType, base64: octets.toString('base64') }] }
				: { type: 'texte', texte: decoderTexte(octets) };

	const { doc } = await extraireAvecClaude({
		contenu,
		schema: documentVenteSchema,
		prompt: construirePromptVente()
	});

	return resultatDepuisDocument(doc, nomFichier);
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

		let octets: Buffer;
		try {
			const blob = await ctx.storage.get(suivi.storageId as Id<'_storage'>);
			if (blob === null) {
				throw new Error('Le fichier déposé est introuvable dans le stockage.');
			}
			octets = Buffer.from(await blob.arrayBuffer());
		} catch (erreur) {
			await ctx.runMutation(internal.recouvrement.depotMutations.marquerEchec, {
				importId,
				erreur: erreur instanceof Error ? erreur.message : 'Fichier illisible.'
			});
			return null;
		}

		/**
		 * ⚠️ LE MODE EST ENFIN LU, ET C'EST LA CORRECTION DE CE COMMIT.
		 *
		 * `FACTURE_DEPOSEE` était enregistré en base, rendu par les requêtes, et
		 * proposé à l'écran sous « Factures en PDF — chaque facture est relue par
		 * le modèle ». Cette action l'ignorait : elle décodait le PDF en texte et
		 * le passait au parseur d'export comptable, qui répondait « Export non
		 * reconnu ».
		 *
		 * Neuvième occurrence du défaut « déclaré, lu, jamais alimenté » dans ce
		 * dépôt, et la plus visible : une promesse faite à l'écran.
		 */
		/*
		  ⚠️ LE SIREN DU CRÉANCIER SERT À REFUSER UNE FACTURE D'ACHAT DÉPOSÉE PAR
		  ERREUR. Le chemin modèle devine ce piège ; le XML d'un Factur-X permet de
		  le trancher, à condition de savoir qui l'on est. Absent, on laisse passer
		  et on le DIT : refuser bloquerait tout dépôt tant que l'identité n'est pas
		  renseignée, se taire laisserait croire que la vérification a eu lieu.
		*/
		const profil = await ctx.runQuery(internal.recouvrement.profil.monProfilInterne, {
			organizationId: suivi.organizationId
		});

		let resultat: ResultatImport;
		try {
			resultat =
				suivi.mode === 'FACTURE_DEPOSEE'
					? await lireFactureDeposee(
							octets,
							suivi.mimeType,
							suivi.filename,
							profil?.siren ?? undefined
						)
					: importerExportComptable(decoderTexte(octets));
		} catch (erreur) {
			await ctx.runMutation(internal.recouvrement.depotMutations.marquerEchec, {
				importId,
				erreur:
					erreur instanceof Error
						? erreur.message
						: suivi.mode === 'FACTURE_DEPOSEE'
							? 'Document non exploitable.'
							: 'Export non reconnu.'
			});
			return null;
		}

		await ctx.runMutation(internal.recouvrement.depotMutations.marquerEtape, {
			importId,
			statut: 'LECTURE',
			etape: `${resultat.factures.length} facture${pluriel(resultat.factures.length)} lue${pluriel(resultat.factures.length)}, enregistrement…`
		});

		const enregistrement = await ctx.runMutation(internal.recouvrement.import.enregistrerImport, {
			organizationId: suivi.organizationId,
			// Le jour se lit ici, une fois : l'enregistrement rejoue la qualification
			// des clients que le lot touche, et cette date-là est un argument.
			aujourdHui: new Date().toISOString().slice(0, 10),
			// Le fichier depose, porte jusqu'a chaque facture qu'il a produite.
			documentId: suivi.storageId as Id<'_storage'>,
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
		});

		await ctx.runMutation(internal.recouvrement.depotMutations.marquerBilan, {
			importId,
			// L'étape finale RESTE affichée : un écran qui se vide à la fin laisse
			// croire qu'il ne s'est rien passé.
			etape: `${enregistrement.facturesCreees} facture${pluriel(enregistrement.facturesCreees)} enregistrée${pluriel(enregistrement.facturesCreees)}.`,
			bilan: bilanDe(resultat, enregistrement)
		});

		return null;
	}
});
