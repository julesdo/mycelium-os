import { v, ConvexError } from 'convex/values';
import { equipeMutation, equipeQuery } from './enveloppe';
import { vIssueAppel, vTypeEvenementCrm } from './tables';
import { jourDeRelance, LIBELLES_DES_ETAPES, SUITE_DES_ETAPES } from '../../crm/modeles';
import { emailPermis, RAISONS_DU_REFUS } from '../../crm/consentement';

/**
 * L'HISTORIQUE D'UNE FICHE (16/10/2026) : les notes, les appels, les e-mails notés,
 * les réponses et les changements de statut, saisis d'un geste. Pour un compte, la
 * fiche y ajoute ses étapes et les conseils de Plume (`admin/comptes.ts`).
 */

const vCibleFiche = v.union(
	v.object({ compte: v.id('organizations') }),
	v.object({ prospect: v.id('prospects') })
);

export const deLaFiche = equipeQuery('LECTURE')({
	args: { cible: vCibleFiche },
	returns: v.array(
		v.object({
			id: v.id('evenementsCrm'),
			type: vTypeEvenementCrm,
			texte: v.optional(v.string()),
			issue: v.optional(vIssueAppel),
			auteur: v.string(),
			le: v.number()
		})
	),
	handler: async (ctx, { cible }) => {
		const evenements =
			'compte' in cible
				? await ctx.db
						.query('evenementsCrm')
						.withIndex('by_org', (q) => q.eq('organizationId', cible.compte))
						.order('desc')
						.take(200)
				: await ctx.db
						.query('evenementsCrm')
						.withIndex('by_prospect', (q) => q.eq('prospectId', cible.prospect))
						.order('desc')
						.take(200);
		return evenements.map((e) => ({
			id: e._id,
			type: e.type,
			...(e.texte === undefined ? {} : { texte: e.texte }),
			...(e.issue === undefined ? {} : { issue: e.issue }),
			auteur: e.auteur,
			le: e.le
		}));
	}
});

export const noter = equipeMutation('SUPPORT')({
	args: {
		cible: vCibleFiche,
		type: v.union(v.literal('NOTE'), v.literal('APPEL'), v.literal('EMAIL'), v.literal('REPONSE')),
		texte: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { cible, type, texte }): Promise<null> => {
		const propre = texte?.trim().slice(0, 4000);
		if (type === 'NOTE' && !propre) throw new ConvexError('La note est vide.');
		const maintenant = Date.now();
		if ('compte' in cible) {
			if ((await ctx.db.get(cible.compte)) === null) throw new ConvexError('Compte introuvable.');
			await ctx.db.insert('evenementsCrm', {
				organizationId: cible.compte,
				type,
				...(propre ? { texte: propre } : {}),
				auteur: ctx.equipier.email,
				le: maintenant
			});
			return null;
		}
		const p = await ctx.db.get(cible.prospect);
		if (p === null) throw new ConvexError('Prospect introuvable.');
		await ctx.db.insert('evenementsCrm', {
			prospectId: cible.prospect,
			type,
			...(propre ? { texte: propre } : {}),
			auteur: ctx.equipier.email,
			le: maintenant
		});
		// Un échange avance le prospect : un appel ou un e-mail le dit contacté,
		// une réponse le dit « a répondu » — sans jamais reculer un statut plus loin.
		if (type === 'APPEL' || type === 'EMAIL') {
			await ctx.db.patch(cible.prospect, {
				dernierContactLe: maintenant,
				...(p.statut === 'A_CONTACTER' ? { statut: 'CONTACTE' as const } : {})
			});
		}
		if (type === 'REPONSE' && ['A_CONTACTER', 'CONTACTE', 'RELANCE'].includes(p.statut)) {
			await ctx.db.patch(cible.prospect, {
				statut: 'A_REPONDU',
				dernierContactLe: maintenant,
				// Une réponse vient du prospect : la durée de conservation repart d'elle.
				dernierContactDuProspectLe: maintenant
			});
		}
		return null;
	}
});

/**
 * UN E-MAIL DE PROSPECTION ÉCRIT DEPUIS SON MODÈLE (18/10/2026) : il se note avec son
 * étape et son objet, avance le statut (contacté, puis relancé) et pose la prochaine
 * action de la routine — relancer à J+4, la dernière relance à J+10, puis classer.
 * Un prospect qui a répondu ne recule pas.
 */
export const emailEcrit = equipeMutation('SUPPORT')({
	args: {
		prospect: v.id('prospects'),
		etape: v.union(v.literal('PREMIER'), v.literal('RELANCE_1'), v.literal('RELANCE_2')),
		objet: v.string(),
		texte: v.optional(v.string())
	},
	returns: v.null(),
	handler: async (ctx, { prospect, etape, objet, texte }): Promise<null> => {
		const p = await ctx.db.get(prospect);
		if (p === null) throw new ConvexError('Prospect introuvable.');
		if (p.statut === 'STOP') throw new ConvexError('Ce prospect ne veut plus être contacté.');
		const maintenant = Date.now();
		// Le modèle n'est permis qu'à une adresse générique, à une personne informée, ou
		// au premier contact dans le mois de la collecte (`crm/consentement.ts`).
		const permission = emailPermis(p, maintenant);
		if (!permission.permis) throw new ConvexError(RAISONS_DU_REFUS[permission.raison]);
		const note = texte?.trim().slice(0, 3000);
		await ctx.db.insert('evenementsCrm', {
			prospectId: prospect,
			type: 'EMAIL',
			texte: `${LIBELLES_DES_ETAPES[etape]} : « ${objet.trim().slice(0, 200)} »${note ? `\n${note}` : ''}`,
			auteur: ctx.equipier.email,
			le: maintenant
		});
		const avance =
			p.statut === 'A_CONTACTER'
				? 'CONTACTE'
				: p.statut === 'CONTACTE' && etape !== 'PREMIER'
					? 'RELANCE'
					: null;
		const enCours = p.statut === 'A_CONTACTER' || p.statut === 'CONTACTE' || p.statut === 'RELANCE';
		const suite = SUITE_DES_ETAPES[etape];
		await ctx.db.patch(prospect, {
			dernierContactLe: maintenant,
			// Le premier e-mail porte l'information de l'article 14 : la personne est
			// informée dès qu'il est parti. Une adresse générique se note comme telle.
			...(permission.base === 'GENERIQUE' && p.emailBase === undefined
				? { emailBase: 'GENERIQUE' as const }
				: {}),
			...(permission.base === 'PREMIER_CONTACT'
				? { emailBase: 'INFORMEE' as const, emailInformeLe: maintenant }
				: {}),
			...(avance === null ? {} : { statut: avance }),
			...(enCours
				? {
						prochaineAction: suite.action,
						prochaineActionLe: jourDeRelance(maintenant, suite.dans)
					}
				: {})
		});
		return null;
	}
});
