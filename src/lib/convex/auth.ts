import { createClient, type GenericCtx, type AuthFunctions } from '@convex-dev/better-auth';
import { requireRunMutationCtx } from '@convex-dev/better-auth/utils';
import { convex } from '@convex-dev/better-auth/plugins';
import { components, internal } from './_generated/api';
import { type DataModel } from './_generated/dataModel';
import { query } from './_generated/server';
import { passkey } from '@better-auth/passkey';
import { admin } from 'better-auth/plugins/admin';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import authSchema from './betterAuth/schema';
import authConfig from './auth.config';
import { requireEnv, googleOAuth, githubOAuth } from './env';
import { devNotice } from '../dev/notice';

// Required for triggers to work - references internal auth functions
const authFunctions: AuthFunctions = internal.auth;

type BetterAuthCallbackArg<T extends (...args: any[]) => Promise<void>> = Parameters<T>[0];

type SendResetPasswordArgs = BetterAuthCallbackArg<
	NonNullable<NonNullable<BetterAuthOptions['emailAndPassword']>['sendResetPassword']>
>;

type SendVerificationEmailArgs = BetterAuthCallbackArg<
	NonNullable<NonNullable<BetterAuthOptions['emailVerification']>['sendVerificationEmail']>
>;

function requireAuthUserEmail(
	user: { email?: string | null },
	context: 'reset password email' | 'verification email'
): string {
	const email = user.email?.trim();
	if (!email) {
		throw new Error(`Better Auth attempted to send ${context} without a user email`);
	}
	return email;
}

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
// Using local schema to include admin plugin fields (role, banned, etc.)
export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
	local: {
		schema: authSchema
	},
	authFunctions,
	triggers: {
		user: {
			/**
			 * Called when a new user signs up.
			 *
			 * No-op: signup-notification scheduling, the founder welcome-email
			 * flow, and admin-notification-preference syncing were all removed
			 * alongside the /admin space (EGalim pivot triage — see docs/agri/).
			 * All three depended on Convex modules under admin/ that no longer
			 * exist. The trigger is kept (not deleted) so future user-lifecycle
			 * hooks have a home.
			 */
			onCreate: async () => {},

			/**
			 * Called when a user is deleted
			 */
			onDelete: async () => {
				// No-op: materialized dashboard counters removed with admin/counters.ts
			},

			/**
			 * Called when a user is updated.
			 *
			 * No-op for the same reason as onCreate — see comment above.
			 */
			onUpdate: async () => {}
		}
	}
});

// Export trigger handlers (required for triggers to be registered)
export const { onCreate, onUpdate, onDelete } = authComponent.triggersApi();

function buildTrustedOrigins(): string[] {
	const siteUrl = process.env.SITE_URL;
	if (!siteUrl) return [];
	try {
		return [new URL(siteUrl).origin];
	} catch {
		throw new Error(`Invalid SITE_URL: "${siteUrl}". Expected a valid URL.`);
	}
}

// Creates Better Auth options object (used by adapter and betterAuth CLI)
export const createAuthOptions = (ctx: GenericCtx<DataModel>): BetterAuthOptions => {
	return {
		baseURL: requireEnv('SITE_URL', { feature: 'Better Auth base URL' }),
		trustedOrigins: buildTrustedOrigins(),
		secret: requireEnv('BETTER_AUTH_SECRET', { feature: 'Better Auth session signing' }),
		database: authComponent.adapter(ctx),
		user: {
			additionalFields: {
				locale: {
					type: 'string',
					required: false,
					defaultValue: 'en',
					input: true
				}
			}
		},
		emailAndPassword: {
			enabled: true,
			minPasswordLength: 10,
			// L'INSCRIPTION OUVRE UNE SESSION. Elle exigeait la vérification de
			// l'adresse, et le compte se créait donc sans personne d'authentifié
			// derrière : l'écran suivant demandait le nom de l'établissement, puis
			// se faisait renvoyer `Unauthenticated` à la soumission. Un formulaire
			// qu'on remplit avant d'apprendre qu'il ne partira pas.
			//
			// L'e-mail de vérification part quand même (`sendOnSignUp` plus bas), et
			// son échec ne bloque plus rien : Better Auth l'exécute en tâche de
			// fond. Un gérant sur tablette entre dans le produit sans en sortir pour
			// aller chercher un lien.
			requireEmailVerification: false,
			// Password reset email
			sendResetPassword: async ({ user, url }: SendResetPasswordArgs) => {
				const mutationCtx = requireRunMutationCtx(ctx);
				const email = requireAuthUserEmail(user, 'reset password email');
				await mutationCtx.runMutation(internal.emails.send.sendResetPasswordEmail, {
					email,
					resetUrl: url,
					userName: user.name ?? undefined
				});
			}
		},
		emailVerification: {
			// Email verification (moved from emailAndPassword in Better Auth 1.4.x)
			sendVerificationEmail: async ({ user, url }: SendVerificationEmailArgs) => {
				const mutationCtx = requireRunMutationCtx(ctx);
				const email = requireAuthUserEmail(user, 'verification email');
				await mutationCtx.runMutation(internal.emails.send.sendVerificationEmail, {
					email,
					verificationUrl: url,
					expiryMinutes: 20
				});
			},
			sendOnSignUp: true,
			autoSignInAfterVerification: true
		},
		socialProviders: {
			google: {
				enabled: googleOAuth.enabled,
				clientId: googleOAuth.clientId as string,
				clientSecret: googleOAuth.clientSecret as string
			},
			github: {
				enabled: githubOAuth.enabled,
				clientId: githubOAuth.clientId as string,
				clientSecret: githubOAuth.clientSecret as string
			}
		},
		plugins: [
			// The Convex plugin is required for Convex compatibility
			convex({
				authConfig,
				jwksRotateOnTokenGenerationError: true
			}),
			passkey(),
			admin({
				defaultRole: 'user',
				adminRoles: ['admin']
			})
		]
	};
};

// Creates Better Auth instance (used in http.ts for routes)
export const createAuth = (ctx: GenericCtx<DataModel>) => {
	return betterAuth(createAuthOptions(ctx));
};

// Get current authenticated user
export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		return authComponent.getAuthUser(ctx);
	}
});

/** Returns which OAuth providers are configured and available */
export const getAvailableOAuthProviders = query({
	args: {},
	handler: async () => {
		if (!googleOAuth.enabled) {
			devNotice({
				feature: 'Google sign-in',
				missing: ['AUTH_GOOGLE_ID', 'AUTH_GOOGLE_SECRET'],
				scope: 'convex'
			});
		}
		if (!githubOAuth.enabled) {
			devNotice({
				feature: 'GitHub sign-in',
				missing: ['AUTH_GITHUB_ID', 'AUTH_GITHUB_SECRET'],
				scope: 'convex'
			});
		}
		return {
			google: googleOAuth.enabled,
			github: githubOAuth.enabled
		};
	}
});
