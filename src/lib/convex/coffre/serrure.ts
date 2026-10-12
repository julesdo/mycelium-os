import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';
import { internal } from '../_generated/api';
import {
	ALGORITHME,
	VERSION_DU_SCEAU,
	cleMaitresseDepuis,
	desceller,
	desenvelopper,
	empreinteDe,
	envelopper,
	type Octets,
	sceller,
	tirerUneCle
} from '../../socle/coffre/chiffrement';
import { verdictDesOctets } from '../../socle/coffre/fichiers';

/**
 * LA SERRURE DU COFFRE — sceller un fichier à son arrivée, le rouvrir pour le
 * lire ou le montrer (12/10/2026).
 *
 * Pas de `"use node"` : ces fonctions servent aux actions Node (la lecture d'un
 * dépôt, d'une pièce) ET à l'action HTTP qui sert un document, qui tourne dans
 * le moteur par défaut. Elles ne demandent au contexte que ce que les deux
 * partagent : lire et écrire le stockage, appeler des fonctions internes.
 *
 * ⚠️ LA CLÉ MAÎTRESSE SE LIT ICI, ET NULLE PART AILLEURS. Absente, tout échoue en
 * la nommant (`CleMaitresseInvalide`) : un coffre qui rangerait en clair « en
 * attendant » serait un mensonge à l'écran.
 */

type CtxCoffre = Pick<ActionCtx, 'runQuery' | 'runMutation' | 'storage'>;

export type Cible = { importId: Id<'importsRecouvrement'> } | { pieceId: Id<'pieces'> };

export interface Sceau {
	readonly algorithme: typeof ALGORITHME;
	readonly version: number;
	readonly iv: string;
}

/** La clé de l'établissement, désenveloppée — tirée et rangée au premier dépôt. */
export async function cleDeLEtablissement(
	ctx: CtxCoffre,
	organizationId: Id<'organizations'>
): Promise<Octets> {
	const maitresse = cleMaitresseDepuis(process.env.COFFRE_CLE_MAITRESSE);
	const existante = await ctx.runQuery(internal.coffre.coffreInterne.cleEnveloppee, {
		organizationId
	});
	if (existante !== null) return await desenvelopper(existante, maitresse);

	const rangee = await ctx.runMutation(internal.coffre.coffreInterne.poserCle, {
		organizationId,
		cleEnveloppee: await envelopper(tirerUneCle(), maitresse),
		version: VERSION_DU_SCEAU
	});
	// Une autre action a pu poser la sienne entre-temps : celle de la base fait foi.
	return await desenvelopper(rangee, maitresse);
}

/** Rouvrir un fichier scellé, et vérifier qu'il est bien celui qui a été déposé. */
export async function ouvrirLesOctets(
	ctx: CtxCoffre,
	document: {
		organizationId: Id<'organizations'>;
		chiffre: Octets;
		chiffrement: Sceau;
		empreinte?: string;
	}
): Promise<Octets> {
	const cle = await cleDeLEtablissement(ctx, document.organizationId);
	let octets: Octets;
	try {
		octets = await desceller(
			document.chiffre,
			document.chiffrement.iv,
			cle,
			document.organizationId
		);
	} catch {
		// L'étiquette de GCM n'a pas reconnu le chiffré : modifié, ou rangé sous une autre clé.
		throw new Error(
			'Ce document ne s’ouvre pas : son contenu ne correspond plus à ce qui a été scellé.'
		);
	}
	if (document.empreinte !== undefined && (await empreinteDe(octets)) !== document.empreinte) {
		throw new Error(
			'Ce document ne correspond plus à son empreinte de dépôt : il n’est pas montré.'
		);
	}
	return octets;
}

/** Ce que la lecture d'un document reçoit : ses octets en clair, en mémoire seulement. */
export type FichierLu =
	| { readonly refus: string }
	| {
			readonly octets: Octets;
			readonly mime: string;
			/** Le fichier qui fait foi désormais : le chiffré. */
			readonly storageId: Id<'_storage'>;
			readonly empreinte: string;
			/** Vrai quand c'est cette lecture qui vient de le sceller. */
			readonly vientDEtreScelle: boolean;
	  };

/**
 * LIRE AU COFFRE : rouvrir un document scellé, ou SCELLER celui qui vient
 * d'arriver — le vérifier dans ses octets, l'empreindre, le chiffrer, ranger le
 * chiffré, poser le sceau, effacer l'original — puis rendre ses octets en clair
 * à la lecture, sans les écrire nulle part.
 *
 * Un fichier refusé (un « PDF » qui n'en est pas un) est effacé sur-le-champ, et
 * le refus remonte en toutes lettres.
 */
export async function lireAuCoffre(
	ctx: CtxCoffre,
	document: {
		organizationId: Id<'organizations'>;
		cible: Cible;
		storageId: Id<'_storage'>;
		nom: string;
		chiffrement?: Sceau;
		empreinte?: string;
		/**
		 * Un document d'avant le coffre, déjà lu : scellé même si son format ne passe
		 * plus la vérification, jamais effacé (`anciens.ts`).
		 */
		conserverSiRefuse?: boolean;
	}
): Promise<FichierLu> {
	const blob = await ctx.storage.get(document.storageId);
	if (blob === null) throw new Error('Le fichier déposé est introuvable dans le stockage.');
	const brut = new Uint8Array(await blob.arrayBuffer());

	if (document.chiffrement !== undefined) {
		const octets = await ouvrirLesOctets(ctx, {
			organizationId: document.organizationId,
			chiffre: brut,
			chiffrement: document.chiffrement,
			...(document.empreinte === undefined ? {} : { empreinte: document.empreinte })
		});
		const verdict = verdictDesOctets(octets, document.nom);
		return {
			octets,
			mime: verdict.accepte ? verdict.mime : 'application/octet-stream',
			storageId: document.storageId,
			empreinte: document.empreinte ?? (await empreinteDe(octets)),
			vientDEtreScelle: false
		};
	}

	const verdict = verdictDesOctets(brut, document.nom);
	if (!verdict.accepte && document.conserverSiRefuse !== true) {
		await ctx.storage.delete(document.storageId);
		return { refus: verdict.raison };
	}
	const mime = verdict.accepte ? verdict.mime : 'application/octet-stream';

	const empreinte = await empreinteDe(brut);
	const cle = await cleDeLEtablissement(ctx, document.organizationId);
	const { chiffre, iv } = await sceller(brut, cle, document.organizationId);
	const nouveau = await ctx.storage.store(
		new Blob([chiffre], { type: 'application/octet-stream' })
	);
	const pose = await ctx.runMutation(internal.coffre.coffreInterne.marquerScelle, {
		cible: document.cible,
		ancien: document.storageId,
		nouveau,
		chiffrement: { algorithme: ALGORITHME, version: VERSION_DU_SCEAU, iv },
		empreinte,
		taille: brut.length,
		mime
	});
	if (!pose) {
		// Une lecture concurrente a scellé avant nous : son chiffré fait foi.
		await ctx.storage.delete(nouveau);
		return {
			octets: brut,
			mime,
			storageId: document.storageId,
			empreinte,
			vientDEtreScelle: false
		};
	}
	await ctx.storage.delete(document.storageId);
	return { octets: brut, mime, storageId: nouveau, empreinte, vientDEtreScelle: true };
}
