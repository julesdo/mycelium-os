import { internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import { components } from '../_generated/api';
import { resend, assertResendApiKey } from './resend';
import { requireEnv } from '../env';
import { shouldSkipTestEmail } from './helpers';
import {
	bilanPretHtml,
	bilanPretTexte,
	produitsAConfirmerHtml,
	produitsAConfirmerTexte,
	rappelDeclarationHtml,
	rappelDeclarationTexte,
	type EtatSeuil
} from './modeles';
import type { MutationCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

/**
 * Les e-mails du PRODUIT, par opposition à ceux de l'authentification.
 *
 * POURQUOI UN FICHIER À PART DE `send.ts`. Celui-là porte la vérification
 * d'adresse, le mot de passe oublié et trois notifications qui visent un espace
 * d'administration supprimé. Il est en anglais, il interroge la locale de
 * l'utilisateur, et il n'a rien à voir avec le métier. Les mélanger aurait
 * produit un fichier de quatre cents lignes où deux sujets sans rapport se
 * disputent les mêmes utilitaires.
 *
 * CE QUE CES TROIS E-MAILS TIENNENT. La page d'accueil promet un suivi mensuel :
 * cinq minutes par mois, un GPS plutôt qu'un constat après l'accident. Sans eux,
 * la promesse est fausse. Un gérant dépose ses factures une fois, referme
 * l'onglet, et redécouvre son dossier en mars, ce qui est exactement le
 * comportement qu'on prétend supprimer. Ce sont eux, et rien d'autre, qui font
 * exister l'abonnement.
 *
 * ILS SONT TOUS EN FRANÇAIS ET SANS NÉGOCIATION DE LOCALE. L'interface est en
 * français uniquement — EGalim est une loi française — et prétendre le contraire
 * dans un e-mail créerait une divergence qu'aucun test ne rattraperait.
 */

type UtilisateurBetterAuth = { email?: string | null } | null;

/**
 * Qui reçoit les e-mails d'une organisation.
 *
 * TOUS LES MEMBRES, sans distinction de rôle. Dans une cantine, le chef gérant
 * dépose les factures et le directeur signe la déclaration : les deux ont besoin
 * de savoir qu'un bilan est sorti. Filtrer sur `ORG_ADMIN` priverait justement
 * celui qui fait le travail.
 *
 * Les adresses introuvables sont ignorées en silence. Un membre dont le compte
 * a disparu de Better Auth ne doit pas faire échouer l'envoi aux autres.
 */
async function destinataires(ctx: MutationCtx, organizationId: Id<'organizations'>) {
	const membres = await ctx.db
		.query('organizationMembers')
		.withIndex('by_organization', (q) => q.eq('organizationId', organizationId))
		.collect();

	const adresses: string[] = [];
	for (const membre of membres) {
		const utilisateur = (await ctx.runQuery(components.betterAuth.adapter.findOne, {
			model: 'user',
			where: [{ field: '_id', operator: 'eq', value: membre.userId }]
		})) as UtilisateurBetterAuth;
		const email = utilisateur?.email;
		if (email) adresses.push(email);
	}
	return adresses;
}

/**
 * L'envoi proprement dit, commun aux trois.
 *
 * `X-Email-Category: produit` sépare ces envois de ceux de l'authentification
 * dans les statistiques Resend. Le jour où un taux de plainte monte, on veut
 * savoir lequel des deux flux en est la cause.
 */
async function envoyer(
	ctx: MutationCtx,
	organizationId: Id<'organizations'>,
	modele: string,
	sujet: string,
	html: string,
	texte: string
) {
	assertResendApiKey();
	const expediteur = requireEnv('AUTH_EMAIL', { feature: 'email delivery' });

	for (const adresse of await destinataires(ctx, organizationId)) {
		if (shouldSkipTestEmail(modele, adresse)) continue;
		await resend.sendEmail(ctx, {
			from: expediteur,
			to: adresse,
			subject: sujet,
			html,
			text: texte,
			headers: [
				{ name: 'X-Email-Category', value: 'produit' },
				{ name: 'X-Email-Template', value: modele }
			]
		});
	}
}

/** Construit une URL absolue de l'application. */
function lien(chemin: string): string {
	const base = requireEnv('SITE_URL', { feature: 'liens des e-mails produit' }).replace(/\/+$/, '');
	return `${base}${chemin}`;
}

const vEtatSeuil = v.union(v.literal('atteint'), v.literal('proche'), v.literal('manque'));

/**
 * « Votre bilan EGalim est prêt. »
 *
 * Déclenché à la production d'un diagnostic. Les trois taux voyagent dans
 * l'e-mail parce que c'est l'information attendue ; obliger à cliquer pour
 * l'obtenir serait un jeu.
 */
export const envoyerBilanPret = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		diagnosticId: v.id('diagnostics'),
		annee: v.number(),
		lignesLues: v.number(),
		taux: v.array(
			v.object({
				libelle: v.string(),
				valeur: v.string(),
				etat: vEtatSeuil,
				precision: v.optional(v.string())
			})
		)
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const donnees = {
			annee: args.annee,
			lignesLues: args.lignesLues,
			taux: args.taux as readonly {
				libelle: string;
				valeur: string;
				etat: EtatSeuil;
				precision?: string;
			}[],
			url: lien(`/app/diagnostic/${args.diagnosticId}`)
		};
		await envoyer(
			ctx,
			args.organizationId,
			'bilan-pret',
			`Votre bilan EGalim ${args.annee} est prêt`,
			bilanPretHtml(donnees),
			bilanPretTexte(donnees)
		);
	}
});

/**
 * « N produits attendent votre confirmation. »
 *
 * Déclenché à la fin de la lecture d'un lot, quand la file n'est pas vide.
 * C'est l'e-mail le plus important du produit : sans lui, la file ne se vide
 * jamais et aucun bilan ne sort.
 */
export const envoyerProduitsAConfirmer = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		nombre: v.number(),
		montantEnJeu: v.string(),
		viandePoisson: v.number()
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		if (args.nombre <= 0) return null;
		const donnees = {
			nombre: args.nombre,
			montantEnJeu: args.montantEnJeu,
			viandePoisson: args.viandePoisson,
			url: lien('/app/confirmer')
		};
		const pluriel = args.nombre > 1;
		await envoyer(
			ctx,
			args.organizationId,
			'produits-a-confirmer',
			`${args.nombre} produit${pluriel ? 's' : ''} attend${pluriel ? 'ent' : ''} votre confirmation`,
			produitsAConfirmerHtml(donnees),
			produitsAConfirmerTexte(donnees)
		);
	}
});

/**
 * « La campagne ferme le 31 mars. »
 *
 * Déclenché par le calendrier, deux fois, et adapté à l'état du dossier. Le
 * choix de l'état est fait par l'appelant, qui seul connaît les données.
 */
export const envoyerRappelDeclaration = internalMutation({
	args: {
		organizationId: v.id('organizations'),
		etat: v.union(
			v.object({ situation: v.literal('BILAN_PRET'), annee: v.number() }),
			v.object({
				situation: v.literal('FILE_PLEINE'),
				annee: v.number(),
				aConfirmer: v.number()
			}),
			v.object({
				situation: v.literal('INCOMPLET'),
				annee: v.number(),
				moisCouverts: v.number()
			})
		)
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const chemin =
			args.etat.situation === 'BILAN_PRET'
				? '/app/diagnostics'
				: args.etat.situation === 'FILE_PLEINE'
					? '/app/confirmer'
					: '/app/factures';

		const donnees = { etat: args.etat, url: lien(chemin) };
		await envoyer(
			ctx,
			args.organizationId,
			'rappel-declaration',
			'La campagne « ma cantine » ferme le 31 mars',
			rappelDeclarationHtml(donnees),
			rappelDeclarationTexte(donnees)
		);
	}
});
