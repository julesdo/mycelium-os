import { v, ConvexError } from 'convex/values';
import { internalMutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import type { Id } from '../_generated/dataModel';
import { authedAction, authedMutation, authedQuery } from '../functions';
import { getUserOrg, organisationCourante, requireOrgAdmin, requireOrgMember } from '../lib/auth';
import { lireCouleur, normaliserCouleur } from '../../socle/couleurs';
import { LOGO_COTE_MAX, LOGO_POIDS_MAX } from '../../verticales/recouvrement/marque';
import { CID_DU_LOGO, relanceHtml } from '../../verticales/recouvrement/courriel-relance';
import { relanceDExemple } from '../../verticales/recouvrement/exemple-de-relance';
import { expediteurPour } from './pilote';
import { piecesDuLogo, posterChezResend } from './expedition';

/**
 * LOGO ET COULEURS — l'image des courriers que reçoit le client (23/10/2026).
 *
 * Voir `docs/superpowers/specs/2026-10-23-logo-et-couleurs.md`. Le gérant pose
 * son logo et sa couleur sur UNE page, l'aperçu sous les yeux ; ils valent pour
 * la relance que Plume envoie et pour la page où le client paie.
 *
 * ⚠️ UN ADMINISTRATEUR LES POSE, comme il valide un courrier : c'est ce que
 * reçoivent ses clients. Un membre voit l'aperçu et peut s'envoyer un exemple.
 *
 * ⚠️ RIEN NE S'ÉCRIT AVANT « ENREGISTRER ». La couleur tirée du logo est une
 * proposition de l'écran ; le logo se téléverse au moment d'enregistrer.
 */

/** L'intervalle sous lequel un second exemple se refuse : la boîte du gérant n'est pas un banc d'essai. */
const ENTRE_DEUX_EXEMPLES_MS = 30_000;

const vLogo = v.object({
	storageId: v.id('_storage'),
	largeur: v.number(),
	hauteur: v.number(),
	teintes: v.optional(v.array(v.string()))
});

export const lire = authedQuery({
	args: {},
	returns: v.object({
		denomination: v.string(),
		logo: v.union(
			v.null(),
			v.object({
				url: v.string(),
				largeur: v.number(),
				hauteur: v.number(),
				teintes: v.array(v.string())
			})
		),
		couleur: v.union(v.null(), v.string()),
		modifiable: v.boolean(),
		courriel: v.union(v.null(), v.string()),
		envoiConfigure: v.boolean()
	}),
	handler: async (ctx) => {
		const { user, org, organizationId } = await getUserOrg(ctx);
		const membre = await requireOrgMember(ctx, organizationId, user._id);
		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		const logoPose = profil?.logoCourriers;
		const url = logoPose === undefined ? null : await ctx.storage.getUrl(logoPose.storageId);
		return {
			denomination: profil?.denomination ?? org.name,
			logo:
				logoPose === undefined || url === null
					? null
					: {
							url,
							largeur: logoPose.largeur,
							hauteur: logoPose.hauteur,
							teintes: logoPose.teintes ?? []
						},
			couleur: profil?.couleurCourriers ?? null,
			modifiable: membre.role === 'ORG_ADMIN',
			courriel: user.email === '' ? null : user.email,
			envoiConfigure:
				process.env.RESEND_API_KEY !== undefined &&
				(process.env.RELANCES_EMAIL !== undefined || process.env.AUTH_EMAIL !== undefined)
		};
	}
});

/** L'adresse d'envoi du logo, à usage unique. */
export const adresseDuLogo = authedMutation({
	args: {},
	returns: v.string(),
	handler: async (ctx): Promise<string> => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);
		return ctx.storage.generateUploadUrl();
	}
});

type LogoAPoser =
	| 'GARDER'
	| 'RETIRER'
	| {
			storageId: Id<'_storage'>;
			largeur: number;
			hauteur: number;
			teintes?: readonly string[];
	  };

/**
 * LE CŒUR DE « ENREGISTRER », hors de l'enveloppe d'authentification : les tests
 * l'appellent directement (Better Auth ne se monte pas dans `convex-test`).
 *
 * ⚠️ UN REFUS SE REND, IL NE SE LÈVE PAS. Une mutation qui lève annule tout ce
 * qu'elle a écrit, l'effacement du fichier refusé compris : il resterait orphelin
 * au stockage. Le cœur efface donc ce qu'il refuse, puis RENVOIE la raison, que
 * l'écran affiche. `null` : tout est enregistré.
 *
 * ⚠️ LE TYPE ANNONCÉ, LE POIDS ET LES DIMENSIONS SE VÉRIFIENT ICI ; LES OCTETS, À
 * L'ENVOI. Une mutation ne lit pas un fichier ; l'expédition, si, et elle ne
 * joint qu'un PNG (`expedition.ts`).
 */
export async function enregistrerLaMarque(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	args: { couleur: string | null; logo: LogoAPoser }
): Promise<string | null> {
	const televerse = typeof args.logo === 'object' ? args.logo.storageId : null;
	async function refuser(raison: string): Promise<string> {
		if (televerse !== null) await ctx.storage.delete(televerse);
		return raison;
	}

	let couleur: string | undefined;
	if (args.couleur !== null) {
		if (lireCouleur(args.couleur) === null) {
			return refuser(
				`« ${args.couleur} » n’est pas une couleur : un dièse et six chiffres, comme #1e3a5f.`
			);
		}
		couleur = normaliserCouleur(args.couleur);
	}

	if (typeof args.logo === 'object') {
		const { storageId, largeur, hauteur } = args.logo;
		const fichier = await ctx.db.system.get(storageId);
		if (fichier === null) return 'Le logo n’est pas arrivé : réessayez.';
		const dimensionsLues = [largeur, hauteur].every(
			(n) => Number.isInteger(n) && n >= 1 && n <= LOGO_COTE_MAX
		);
		const typeRefuse = fichier.contentType !== undefined && fichier.contentType !== 'image/png';
		const teintesLues = (args.logo.teintes ?? []).every((t) => lireCouleur(t) !== null);
		if (typeRefuse || fichier.size > LOGO_POIDS_MAX || !dimensionsLues || !teintesLues) {
			return refuser(
				`Le logo doit arriver en PNG de ${LOGO_POIDS_MAX / 1000} Ko au plus, ${LOGO_COTE_MAX} pixels de côté au plus : choisissez une autre image.`
			);
		}
	}

	const existant = await ctx.db
		.query('profilsCreancier')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	let profilId = existant?._id;
	if (profilId === undefined) {
		const organisation = await ctx.db.get(organizationId);
		const denomination = organisation?.name.trim() ?? '';
		if (denomination === '') {
			return refuser(
				'Renseignez d’abord votre entreprise : son nom accompagne le logo sur vos courriers.'
			);
		}
		profilId = await ctx.db.insert('profilsCreancier', {
			organizationId,
			denomination,
			estCommercant: 'unknown',
			majLe: Date.now()
		});
	}

	const ancien = existant?.logoCourriers;
	if (args.logo === 'GARDER') {
		await ctx.db.patch(profilId, { couleurCourriers: couleur, majLe: Date.now() });
		return null;
	}
	const nouveau =
		args.logo === 'RETIRER'
			? undefined
			: {
					storageId: args.logo.storageId,
					largeur: args.logo.largeur,
					hauteur: args.logo.hauteur,
					teintes: (args.logo.teintes ?? []).slice(0, 3).map(normaliserCouleur)
				};
	if (ancien !== undefined && ancien.storageId !== nouveau?.storageId) {
		await ctx.storage.delete(ancien.storageId);
	}
	await ctx.db.patch(profilId, {
		logoCourriers: nouveau,
		couleurCourriers: couleur,
		majLe: Date.now()
	});
	return null;
}

export const enregistrer = authedMutation({
	args: {
		couleur: v.union(v.null(), v.string()),
		logo: v.union(v.literal('GARDER'), v.literal('RETIRER'), vLogo)
	},
	/** La raison d'un refus, ou `null` quand tout est enregistré. */
	returns: v.union(v.null(), v.string()),
	handler: async (ctx, args): Promise<string | null> => {
		const { user, organizationId } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);
		return enregistrerLaMarque(ctx, organizationId, args);
	}
});

/**
 * L'EXEMPLE QUE LE GÉRANT S'ENVOIE : de quoi le composer, et la trace qui en
 * espace deux. Ce qui est ENREGISTRÉ part, pas ce que l'écran propose encore.
 */
export const reserverUnExemple = internalMutation({
	args: { userId: v.string() },
	returns: v.object({
		denomination: v.string(),
		repondreA: v.union(v.null(), v.string()),
		logo: v.union(v.null(), vLogo),
		couleur: v.union(v.null(), v.string())
	}),
	handler: async (ctx, { userId }) => {
		const organizationId = await organisationCourante(ctx, userId);
		await requireOrgMember(ctx, organizationId, userId);
		if (process.env.RESEND_API_KEY === undefined) {
			throw new ConvexError('L’envoi des e-mails n’est pas configuré : l’exemple ne peut pas partir.');
		}
		const profil = await ctx.db
			.query('profilsCreancier')
			.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
			.first();
		const organisation = await ctx.db.get(organizationId);
		if (
			profil?.exempleCourrierLe !== undefined &&
			Date.now() - profil.exempleCourrierLe < ENTRE_DEUX_EXEMPLES_MS
		) {
			throw new ConvexError('Un exemple vient de partir : il arrive dans votre boîte.');
		}
		if (profil !== null) await ctx.db.patch(profil._id, { exempleCourrierLe: Date.now() });
		return {
			denomination: profil?.denomination ?? organisation?.name ?? '',
			repondreA: profil?.email === undefined || profil.email === '' ? null : profil.email,
			logo: profil?.logoCourriers ?? null,
			couleur: profil?.couleurCourriers ?? null
		};
	}
});

/**
 * M'ENVOYER UN EXEMPLE — la relance d'exemple, à l'image enregistrée, dans la
 * boîte de la personne connectée : le rendu de SA messagerie, pas seulement celui
 * de l'aperçu. Jamais ailleurs qu'à sa propre adresse.
 */
export const envoyerUnExemple = authedAction({
	args: {},
	returns: v.object({ destinataire: v.string() }),
	handler: async (ctx): Promise<{ destinataire: string }> => {
		const destinataire = ctx.user.email;
		if (destinataire === '') throw new ConvexError('Votre compte n’a pas d’adresse e-mail.');
		const marque = await ctx.runMutation(internal.recouvrement.marque.reserverUnExemple, {
			userId: ctx.user._id
		});
		const exemple = relanceDExemple(marque.denomination, new Date().toISOString().slice(0, 10));
		const pieces = await piecesDuLogo(ctx, marque.logo);
		const logo =
			marque.logo !== null && pieces.length > 0
				? { src: `cid:${CID_DU_LOGO}`, largeur: marque.logo.largeur, hauteur: marque.logo.hauteur }
				: null;
		const reponse = await posterChezResend(
			{
				from: expediteurPour(marque.denomination),
				to: [destinataire],
				subject: `Exemple · ${exemple.objet}`,
				text: exemple.corps,
				html: relanceHtml(exemple.corps, marque.denomination, { logo, couleur: marque.couleur }),
				...(marque.repondreA === null ? {} : { reply_to: [marque.repondreA] }),
				...(pieces.length > 0 ? { attachments: pieces } : {})
			},
			`exemple-${ctx.user._id}-${Date.now()}`
		);
		if (!reponse.ok) throw new ConvexError(`L’exemple n’est pas parti : ${reponse.raison}`);
		return { destinataire };
	}
});
