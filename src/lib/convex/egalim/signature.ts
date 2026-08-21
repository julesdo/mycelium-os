import { v, ConvexError } from 'convex/values';
import { authedQuery, authedMutation } from '../functions';
import { getUserOrg } from '../lib/auth';
import { empreinteBilan, type BilanAEmpreindre } from '../../egalim/empreinte';
import { MENTION_SIGNATURE, VERSION_MENTION_SIGNATURE } from './mentions';

/**
 * La signature d'un bilan.
 *
 * CE QUE ÇA VAUT, DIT UNE FOIS POUR TOUTES. Signature électronique SIMPLE au
 * sens du règlement eIDAS, adossée à une piste d'audit. Elle est recevable, et
 * sa force probante dépend de la fiabilité du procédé. Elle n'est PAS
 * qualifiée : une signature qualifiée suppose un prestataire de services de
 * confiance agréé qui vérifie l'identité du signataire et délivre un
 * certificat. Aucune brique libre et gratuite ne s'y substitue — la contrainte
 * est juridique, pas technique, et la prétendre remplie serait la promesse la
 * plus coûteuse de ce produit, parce qu'elle ne se découvrirait qu'en litige.
 *
 * D'OÙ VIENT LA FORCE PROBANTE, alors. De quatre éléments, et il suffit qu'un
 * seul manque pour que la signature redevienne une case cochée :
 *
 *   1. **Le signataire est authentifié.** L'identité vient du compte, jamais du
 *      formulaire. Le nom saisi ne sert qu'à l'affichage ; l'e-mail du compte
 *      est ce qui rattache la signature à une personne.
 *   2. **L'heure vient du serveur.** Une heure fournie par le client ne prouve
 *      rien : elle se règle.
 *   3. **L'empreinte est recalculée ICI.** Le client en envoie une, on la
 *      recalcule depuis la base, et on refuse si elles diffèrent. Sans ce
 *      recalcul, on signerait ce que le client dit avoir vu — c'est-à-dire
 *      n'importe quoi.
 *   4. **Le texte accepté est conservé avec sa version.** Une reformulation
 *      ultérieure ne doit pas réécrire ce que les signataires d'avant ont
 *      accepté.
 */

const vSignature = v.object({
	signatureId: v.id('bilanSignatures'),
	nomSignataire: v.string(),
	fonction: v.string(),
	email: v.string(),
	signeLe: v.number(),
	empreinte: v.string(),
	mention: v.string(),
	mentionVersion: v.string(),
	trace: v.union(v.string(), v.null()),
	revoqueeLe: v.union(v.number(), v.null()),
	motifRevocation: v.union(v.string(), v.null())
});

export const signerBilan = authedMutation({
	args: {
		diagnosticId: v.id('diagnostics'),
		/** L'empreinte calculée par le navigateur. Recalculée ici, jamais crue. */
		empreinte: v.string(),
		nomSignataire: v.string(),
		fonction: v.string(),
		/** Le tracé manuscrit en PNG (data URL). Facultatif. */
		trace: v.optional(v.string())
	},
	returns: v.id('bilanSignatures'),
	handler: async (ctx, args) => {
		const { organizationId, org } = await getUserOrg(ctx);

		const d = await ctx.db.get(args.diagnosticId);
		if (!d || d.organizationId !== organizationId) {
			throw new ConvexError('Ce bilan est introuvable.');
		}

		const nom = args.nomSignataire.trim();
		const fonction = args.fonction.trim();
		if (nom === '') {
			throw new ConvexError('Le nom du signataire est nécessaire : il figure sur le bilan.');
		}
		if (fonction === '') {
			throw new ConvexError(
				'La fonction du signataire est nécessaire : elle dit à quel titre vous signez.'
			);
		}

		// UNE SEULE SIGNATURE VIVANTE PAR BILAN. Un document qui en porte deux ne
		// dit pas laquelle fait foi. Pour resigner — après un changement de
		// direction, par exemple — on révoque d'abord, ce qui laisse la trace.
		const existantes = await ctx.db
			.query('bilanSignatures')
			.withIndex('by_diagnostic', (q) => q.eq('diagnosticId', args.diagnosticId))
			.collect();
		if (existantes.some((s) => s.revoqueeLe === undefined)) {
			throw new ConvexError(
				'Ce bilan porte déjà une signature. Retirez-la avant d’en apposer une autre.'
			);
		}

		// L'EMPREINTE SE RECALCULE, ELLE NE SE CROIT PAS. Sans ce contrôle, on
		// signerait ce que le navigateur affirme avoir affiché — et un bilan
		// modifié entre l'affichage et l'appui sur le bouton passerait sans
		// bruit. C'est le seul endroit du produit où cette précaution compte
		// vraiment, parce que c'est le seul acte qui engage une personne.
		const attendue = await empreinteBilan({
			organizationName: org.name ?? '',
			siret: org.siret ?? null,
			periodStart: d.periodStart,
			periodEnd: d.periodEnd,
			computedAt: d.computedAt,
			classifierVersion: d.classifierVersion,
			ratios: d.ratios,
			byFamily: d.byFamily,
			bySupplier: d.bySupplier
		} satisfies BilanAEmpreindre);

		if (attendue !== args.empreinte) {
			throw new ConvexError(
				'Le bilan affiché ne correspond plus à celui enregistré. Rechargez la page avant de signer.'
			);
		}

		// Un tracé est une image de quelques kilo-octets. Au-delà, ce n'est plus
		// une signature manuscrite : c'est une photo, et elle n'a rien à faire
		// dans un document Convex borné en taille.
		if (args.trace && args.trace.length > 200_000) {
			throw new ConvexError('Le tracé de signature est trop lourd.');
		}

		return await ctx.db.insert('bilanSignatures', {
			organizationId,
			diagnosticId: args.diagnosticId,
			userId: ctx.user._id,
			email: ctx.user.email ?? '',
			nomSignataire: nom,
			fonction,
			// L'heure du serveur, jamais celle du client.
			signeLe: Date.now(),
			empreinte: attendue,
			mention: MENTION_SIGNATURE,
			mentionVersion: VERSION_MENTION_SIGNATURE,
			trace: args.trace
		});
	}
});

/**
 * Retire une signature, sans l'effacer.
 *
 * La ligne reste, marquée et motivée. La supprimer effacerait la trace qu'elle
 * a existé — ce qu'un journal ne doit jamais permettre, y compris quand la
 * suppression serait légitime.
 */
export const revoquerSignature = authedMutation({
	args: { signatureId: v.id('bilanSignatures'), motif: v.string() },
	returns: v.null(),
	handler: async (ctx, { signatureId, motif }) => {
		const { organizationId } = await getUserOrg(ctx);
		const s = await ctx.db.get(signatureId);
		if (!s || s.organizationId !== organizationId) {
			throw new ConvexError('Cette signature est introuvable.');
		}
		if (s.revoqueeLe !== undefined) return null;
		if (motif.trim() === '') {
			throw new ConvexError('Un motif est nécessaire : c’est lui qui explique le retrait.');
		}
		await ctx.db.patch(signatureId, {
			revoqueeLe: Date.now(),
			motifRevocation: motif.trim()
		});
		return null;
	}
});

/**
 * La signature d'un bilan, et l'état de sa vérification.
 *
 * `empreinteConcorde` est recalculé à CHAQUE lecture. Un diagnostic est figé
 * par construction, donc l'empreinte ne devrait jamais bouger — et c'est
 * exactement pour ça qu'on vérifie : le jour où elle bougerait, c'est que
 * quelque chose aurait modifié une mesure censée être immuable, et personne ne
 * s'en apercevrait autrement.
 */
export const obtenirSignature = authedQuery({
	args: { diagnosticId: v.id('diagnostics') },
	returns: v.union(
		v.object({
			signature: vSignature,
			empreinteConcorde: v.boolean(),
			empreinteActuelle: v.string()
		}),
		v.null()
	),
	handler: async (ctx, { diagnosticId }) => {
		const { organizationId, org } = await getUserOrg(ctx);
		const d = await ctx.db.get(diagnosticId);
		if (!d || d.organizationId !== organizationId) return null;

		const signatures = await ctx.db
			.query('bilanSignatures')
			.withIndex('by_diagnostic', (q) => q.eq('diagnosticId', diagnosticId))
			.collect();
		const vivante = signatures.find((s) => s.revoqueeLe === undefined);
		if (!vivante) return null;

		const empreinteActuelle = await empreinteBilan({
			organizationName: org.name ?? '',
			siret: org.siret ?? null,
			periodStart: d.periodStart,
			periodEnd: d.periodEnd,
			computedAt: d.computedAt,
			classifierVersion: d.classifierVersion,
			ratios: d.ratios,
			byFamily: d.byFamily,
			bySupplier: d.bySupplier
		} satisfies BilanAEmpreindre);

		return {
			signature: {
				signatureId: vivante._id,
				nomSignataire: vivante.nomSignataire,
				fonction: vivante.fonction,
				email: vivante.email,
				signeLe: vivante.signeLe,
				empreinte: vivante.empreinte,
				mention: vivante.mention,
				mentionVersion: vivante.mentionVersion,
				trace: vivante.trace ?? null,
				revoqueeLe: vivante.revoqueeLe ?? null,
				motifRevocation: vivante.motifRevocation ?? null
			},
			empreinteConcorde: empreinteActuelle === vivante.empreinte,
			empreinteActuelle
		};
	}
});
