import { v, ConvexError } from 'convex/values';
import { query } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import type { Id } from '../_generated/dataModel';
import { depuisCentimes } from '../../socle/montants';
import { ibanLisible } from '../../socle/iban';
import { composerVirementEpc } from '../../socle/virement-epc';
import { daterLeDecompte } from './decompte';

/**
 * LA PAGE OÙ LE CLIENT VOIT CE QU'IL DOIT, ET COMMENT LE PAYER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI ELLE EXISTE, ET POURQUOI ELLE EST POSSIBLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit s'arrêtait au moment d'envoyer, et le client recevait un courrier
 * avec un IBAN à recopier. Recopier un IBAN à la main est le geste qui fait
 * remettre un paiement au lendemain, puis à la semaine suivante.
 *
 * Cette page MONTRE : le décompte arrêté, décomposé ; l'IBAN du créancier ; la
 * référence à rappeler ; et un QR que l'application bancaire du client sait
 * lire. C'est LUI qui valide le virement, chez lui, dans sa banque. Aucun fonds
 * ne passe par ce logiciel — l'ACPR distingue EXÉCUTER une opération de
 * paiement, qui demande un agrément, de TRANSMETTRE une information de
 * paiement, qui n'en demande aucun (relevé le 29/09/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA LECTURE EST PUBLIQUE, ET C'EST LE SEUL ENDROIT DU PRODUIT QUI L'EST
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `pageDePaiement` est une `query` NUE, sans `authedQuery` : le client du
 * créancier n'a pas de compte et n'en aura jamais. Trois choses la tiennent :
 *
 *   · le jeton vaut un `crypto.randomUUID()`, et il est la seule serrure ;
 *   · elle ne rend QUE ce que le créancier envoie déjà par courrier — son
 *     identité, celle de son client, le décompte arrêté, l'IBAN ;
 *   · un lien révoqué ou inconnu rend `null`, sans dire lequel des deux.
 *
 * ⚠️ ET RIEN NE REMONTE. Aucune mutation publique : pas de « je conteste », pas
 * de « j'ai payé ». Ce produit ne reçoit ni fonds ni réponse du débiteur (ligne
 * rouge n° 1) ; une question se pose à l'adresse du créancier, écrite sur la
 * page.
 */

/**
 * La référence à rappeler au virement.
 *
 * ⚠️ LA MÊME QUE CELLE DE LA LETTRE, ET PAS UNE AUTRE. `envois.ts` écrit déjà
 * `D-XXXXXX` dans le corps du courrier de relance : deux références pour un
 * dossier feraient arriver deux virements qu'on ne saurait pas rapprocher.
 */
function referenceDuDossier(creanceId: Id<'creances'>): string {
	return `D-${(creanceId as string).slice(-6).toUpperCase()}`;
}

const vPageDePaiement = v.union(
	v.null(),
	v.object({
		creancier: v.object({
			denomination: v.string(),
			adresse: v.optional(v.string()),
			email: v.optional(v.string()),
			telephone: v.optional(v.string())
		}),
		clientNom: v.string(),
		arreteAu: v.string(),
		total: v.int64(),
		principal: v.int64(),
		interets: v.int64(),
		indemniteForfaitaire: v.int64(),
		lignes: v.array(
			v.object({
				reference: v.string(),
				principalRestantDu: v.int64(),
				interets: v.int64(),
				indemniteForfaitaire: v.int64(),
				total: v.int64()
			})
		),
		reference: v.string(),
		/** L'IBAN groupé par quatre, tel qu'on le recopie. */
		ibanLisible: v.string(),
		/**
		 * La charge du QR, ou `null` quand elle n'a pas pu se composer.
		 *
		 * ⚠️ `null` NE CACHE PAS LA PAGE. L'IBAN et la référence restent lisibles
		 * et recopiables : un QR absent coûte trente secondes au client, une page
		 * absente lui coûte le paiement.
		 */
		chargeQr: v.union(v.string(), v.null())
	})
);

/**
 * CE QUE LE CLIENT VOIT. Sans authentification, et c'est voulu.
 *
 * ⚠️ `null` POUR UN JETON INCONNU COMME POUR UN LIEN RÉVOQUÉ, sans distinguer.
 * Dire « ce lien a été fermé » à qui essaie des jetons au hasard lui
 * confirmerait qu'il en a trouvé un.
 */
export const pageDePaiement = query({
	args: { jeton: v.string() },
	returns: vPageDePaiement,
	handler: async (ctx, { jeton }) => {
		const lien = await ctx.db
			.query('liensDePaiement')
			.withIndex('by_jeton', (q) => q.eq('jeton', jeton))
			.first();
		if (lien === null || lien.revoqueLe !== undefined) return null;

		const decompte = await ctx.db.get(lien.decompteId);
		if (decompte === null || decompte.organizationId !== lien.organizationId) return null;

		const creance = await ctx.db.get(lien.creanceId);
		if (creance === null) return null;
		const debiteur = await ctx.db.get(creance.debiteurId);

		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', lien.organizationId))
			.first();
		if (profil === null) return null;

		const reference = referenceDuDossier(lien.creanceId);

		/*
		  ⚠️ LE QR SE COMPOSE ICI, PAS À L'ÉCRAN. C'est le serveur qui connaît
		  l'IBAN du créancier et le total arrêté ; le composer au navigateur
		  obligerait à les lui envoyer deux fois, et ferait diverger le jour où
		  l'un des deux changerait de forme.
		*/
		const virement =
			profil.iban === undefined
				? null
				: composerVirementEpc({
						beneficiaire: profil.denomination,
						iban: profil.iban,
						// ⚠️ MARQUÉ, PAS BRUT. Toute la chaîne des montants est en centimes
						// entiers portant leur marque : un `bigint` nu entrerait ici comme
						// il entrerait ailleurs, et c'est ainsi qu'un jour un montant en
						// euros passe pour des centimes.
						montant: depuisCentimes(decompte.total),
						reference
					});

		return {
			creancier: {
				denomination: profil.denomination,
				adresse: profil.adresse,
				email: profil.email,
				telephone: profil.telephone
			},
			clientNom: debiteur?.denomination ?? '',
			arreteAu: decompte.arreteAu,
			total: decompte.total,
			principal: decompte.principalRestantDu,
			interets: decompte.interets,
			indemniteForfaitaire: decompte.indemniteForfaitaire,
			lignes: decompte.lignes.map((ligne) => ({
				reference: ligne.reference,
				principalRestantDu: ligne.principalRestantDu,
				interets: ligne.interets,
				indemniteForfaitaire: ligne.indemniteForfaitaire,
				total: ligne.total
			})),
			reference,
			ibanLisible: profil.iban === undefined ? '' : ibanLisible(profil.iban),
			chargeQr: virement !== null && virement.ok ? virement.charge : null
		};
	}
});

/**
 * Ouvrir un lien sur un décompte arrêté.
 *
 * ⚠️ UN SEUL LIEN VIVANT PAR DÉCOMPTE. En rouvrir un second ferait circuler
 * deux adresses pour le même montant : le créancier ne saurait plus laquelle il
 * a envoyée, donc laquelle fermer le jour où il veut fermer.
 *
 * ⚠️ ET IL REFUSE SANS IBAN, EN LE DISANT. Une page de paiement sans IBAN
 * n'affiche rien à payer : elle se contenterait de dire au client qu'il doit de
 * l'argent, ce qu'il sait déjà.
 */
export const ouvrirLienDePaiement = authedMutation({
	args: { creanceId: v.id('creances') },
	returns: v.string(),
	handler: async (ctx, { creanceId }): Promise<string> => {
		const { organizationId, user } = await getUserOrg(ctx);
		return await ouvrirLaPageDuJour(ctx, organizationId, user._id, creanceId);
	}
});

/**
 * OUVRIR LA PAGE OÙ LE CLIENT PAIE, SUR LE MONTANT DU JOUR (09/10/2026).
 *
 * Il fallait d'abord « arrêter un décompte », puis ouvrir le lien dessus. Le
 * montant se date désormais à l'ouverture (`daterLeDecompte`), et la page le
 * montre avec sa date, comme avant.
 *
 * ⚠️ UN SEUL LIEN VIVANT PAR DOSSIER. S'il en existe un, c'est lui qui est rendu,
 * avec le montant de son jour : il a peut-être déjà été envoyé, et en ouvrir un
 * second ferait circuler deux montants. Pour un montant plus récent, le gérant
 * ferme l'ancien, puis en ouvre un nouveau.
 */
export async function ouvrirLaPageDuJour(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	userId: string,
	creanceId: Id<'creances'>
): Promise<string> {
	const creance = await ctx.db.get(creanceId);
	if (creance === null || creance.organizationId !== organizationId) {
		throw new ConvexError('Dossier introuvable');
	}
	const vivant = (
		await ctx.db
			.query('liensDePaiement')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect()
	).find((lien) => lien.revoqueLe === undefined);
	if (vivant !== undefined) return vivant.jeton;

	const profil = await ctx.db
		.query('profilsCreancier')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	if (profil?.iban === undefined) {
		throw new ConvexError(
			'Renseignez votre IBAN dans « Ce qui s’imprime sur vos courriers » : sans lui, la page ne dit pas où payer.'
		);
	}
	const date = await daterLeDecompte(ctx, {
		creance,
		aujourdHui: new Date().toISOString().slice(0, 10),
		pour: 'la page où votre client paie',
		auteur: 'GERANT',
		userId
	});
	if ('refus' in date) throw new ConvexError(date.refus);
	return await ouvrirLaPageDePaiement(ctx, organizationId, userId, date.decompte._id);
}

/**
 * OUVRIR LA PAGE OÙ LE CLIENT PAIE, sur un décompte arrêté — le cœur de
 * `ouvrirLienDePaiement`, que Plume emploie aussi (son geste « Ouvrir sa page de
 * paiement », confirmé par le gérant). Un lien vivant sur ce décompte est rendu tel
 * quel : on n'en ouvre pas deux.
 */
export async function ouvrirLaPageDePaiement(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	userId: string,
	decompteId: Id<'decomptes'>
): Promise<string> {
	const decompte = await ctx.db.get(decompteId);
	if (decompte === null || decompte.organizationId !== organizationId) {
		throw new ConvexError('Décompte introuvable');
	}

	const profil = await ctx.db
		.query('profilsCreancier')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	if (profil?.iban === undefined) {
		throw new ConvexError(
			'Renseignez votre IBAN dans « Ce qui s’imprime sur vos courriers » : sans lui, la page ne dit pas où payer.'
		);
	}

	const deja = await ctx.db
		.query('liensDePaiement')
		.withIndex('by_creance', (q) => q.eq('creanceId', decompte.creanceId))
		.collect();
	const vivant = deja.find(
		(lien) => lien.decompteId === decompteId && lien.revoqueLe === undefined
	);
	if (vivant !== undefined) return vivant.jeton;

	const jeton = crypto.randomUUID();
	await ctx.db.insert('liensDePaiement', {
		organizationId,
		creanceId: decompte.creanceId,
		decompteId,
		jeton,
		creePar: userId,
		creeLe: Date.now()
	});
	return jeton;
}

/** Fermer un lien : l'adresse cesse de répondre, pour tout le monde et tout de suite. */
export const fermerLienDePaiement = authedMutation({
	args: { jeton: v.string() },
	returns: v.null(),
	handler: async (ctx, { jeton }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const lien = await ctx.db
			.query('liensDePaiement')
			.withIndex('by_jeton', (q) => q.eq('jeton', jeton))
			.first();
		if (lien === null || lien.organizationId !== organizationId) {
			throw new ConvexError('Lien introuvable');
		}
		await ctx.db.patch(lien._id, { revoqueLe: Date.now() });
		return null;
	}
});

/** Les liens d'un dossier, pour que le gérant sache ce qui circule à son nom. */
export const liensDuDossier = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.array(
		v.object({
			jeton: v.string(),
			decompteId: v.id('decomptes'),
			arreteAu: v.string(),
			total: v.int64(),
			creeLe: v.number(),
			revoqueLe: v.optional(v.number())
		})
	),
	handler: async (ctx, { creanceId }) => {
		const { organizationId } = await getUserOrg(ctx);
		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId) {
			throw new ConvexError('Dossier introuvable');
		}

		const liens = await ctx.db
			.query('liensDePaiement')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();

		const lus = await Promise.all(
			liens
				.filter((lien) => lien.organizationId === organizationId)
				.map(async (lien) => {
					const decompte = await ctx.db.get(lien.decompteId);
					if (decompte === null) return null;
					return {
						jeton: lien.jeton,
						decompteId: lien.decompteId,
						arreteAu: decompte.arreteAu,
						total: decompte.total,
						creeLe: lien.creeLe,
						...(lien.revoqueLe === undefined ? {} : { revoqueLe: lien.revoqueLe })
					};
				})
		);

		// Le plus récent d'abord : c'est celui qui circule.
		return lus.filter((lien) => lien !== null).sort((a, b) => b.creeLe - a.creeLe);
	}
});
