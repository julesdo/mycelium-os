/**
 * Custom Convex function builders with built-in authorization
 *
 * These wrappers provide type-safe authentication and authorization
 * following the official Convex pattern from convex-helpers.
 *
 * @see https://stack.convex.dev/custom-functions
 */
import {
	customQuery,
	customMutation,
	customAction,
	customCtx
} from 'convex-helpers/server/customFunctions';
import { ConvexError } from 'convex/values';
import { query, mutation, action } from './_generated/server';
import { authComponent } from './auth';

/**
 * Le compte tel que Better Auth le rend.
 *
 * Il vivait dans `admin/types.ts`, retiré avec la surface d'administration. Il
 * est recopié ici parce qu'`authedQuery` et `authedMutation` en ont besoin, et
 * AMPUTÉ de ce qui n'appartenait qu'à cette surface : `role`, `banned`,
 * `banReason`, `banExpires`. Les champs restent en base — le greffon `admin` de
 * Better Auth les déclare — mais plus aucune fonction du produit ne les lit,
 * donc plus aucune ne peut décider sur eux.
 */
export interface BetterAuthUser {
	_id: string;
	name?: string;
	email: string;
	emailVerified?: boolean;
	image?: string | null;
	createdAt?: number;
	updatedAt?: number;
}

/**
 * Query that requires any authenticated user
 *
 * Usage:
 * ```ts
 * export const myQuery = authedQuery({
 *   args: { ... },
 *   handler: async (ctx, args) => {
 *     // ctx.user is typed as BetterAuthUser
 *   }
 * });
 * ```
 */
export const authedQuery = customQuery(
	query,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user) {
			throw new ConvexError('Authentication required');
		}
		return { user };
	})
);

/**
 * Mutation that requires any authenticated user
 */
export const authedMutation = customMutation(
	mutation,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user) {
			throw new ConvexError('Authentication required');
		}
		return { user };
	})
);

/**
 * Action qui exige un compte authentifié — le seul chemin vers l'extérieur.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TOUTE `authedAction` ANNOTE LE TYPE DE RETOUR DE SON HANDLER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce n'est pas un goût de style, c'est le piège Convex qui casse TOUS les
 * écrans d'un coup. Une action appelle nécessairement `ctx.runQuery` et
 * `ctx.runMutation` sur `internal.<…>` ; dès que la cible vit dans le MÊME
 * module, le type d'`internal` contient celui du handler, qui dépend
 * d'`internal`. TypeScript renonce, retombe sur `any`, et cet `any` remonte
 * dans le type d'`api` TOUT ENTIER : des dizaines de `TS7006` apparaissent
 * alors dans des fichiers qu'on n'a pas touchés, et la cause n'est jamais
 * là où ça se plaint.
 *
 * Le remède tient en une annotation, et il est déjà documenté sur place à
 * `rgpd.ts` :
 *
 * ```ts
 * handler: async (ctx, args): Promise<ReponseCompagnon> => { … }
 * ```
 *
 * ⚠️ ET `ctx.user` NE DONNE PAS L'ÉTABLISSEMENT. Une action n'a pas de base de
 * données : elle ne peut pas appeler `getUserOrg`, qui lit `userProfiles` et
 * revérifie l'appartenance. Le cloisonnement se fait donc dans la `query` ou la
 * `mutation` interne qu'elle appelle, où il se fait déjà — jamais en passant un
 * `organizationId` en argument depuis le client, ce qui reviendrait à croire
 * l'appelant sur parole.
 */
export const authedAction = customAction(
	action,
	customCtx(async (ctx) => {
		const user = (await authComponent.getAuthUser(ctx)) as BetterAuthUser | null;
		if (!user) {
			throw new ConvexError('Authentication required');
		}
		return { user };
	})
);

/**
 * IL N'Y A PAS DE RÔLE STAFF, DONC IL N'Y A PAS DE GARDE QUI EN DÉPENDE.
 *
 * `adminQuery` et `adminMutation` vivaient ici, héritées de Fleet. Elles
 * gardaient un tableau de bord d'administration — bannir, révoquer les sessions,
 * changer un rôle, se faire passer pour un autre — dont aucun écran ni aucune
 * route n'a jamais existé dans ce produit, et dont la table d'audit était vide
 * en production.
 *
 * Elles ont été retirées avec lui, le 9 septembre 2026, ainsi que
 * `platformSwitchOrganization` : cette dernière posait N'IMPORTE QUELLE
 * organisation dans le profil du demandeur, et comme `organisationCourante` se
 * contentait alors de relire ce champ, toutes les lectures suivaient. C'était un
 * contournement délibéré du cloisonnement multi-tenant, pour un rôle que
 * `CLAUDE.md` déclare inexistant.
 *
 * `lib/auth.ts` vérifie désormais l'appartenance au point de LECTURE. Les deux
 * corrections vont ensemble : retirer la fonction ferme la porte connue, la
 * vérification ferme les portes qu'on n'a pas vues.
 */
