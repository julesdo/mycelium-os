import { internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import { components } from '../_generated/api';
import { resend, assertResendApiKey } from './resend';
import { renderVerificationEmail, renderPasswordResetEmail } from './templates';
import { requireEnv } from '../env';
import { t, getValidLocale, type SupportedLocale } from '../i18n/translations';
import type { GenericMutationCtx } from 'convex/server';
import type { DataModel } from '../_generated/dataModel';
import { expediteurNomme, shouldSkipTestEmail } from './helpers';

/** Type for user result from Better Auth adapter with optional locale field */
type UserWithLocale = { locale?: string | null } | null;

/**
 * Look up a user's locale preference by email address.
 * Falls back to default locale if user not found or locale not set.
 */
async function getLocaleForEmail(
	ctx: GenericMutationCtx<DataModel>,
	email: string
): Promise<SupportedLocale> {
	const result = await ctx.runQuery(components.betterAuth.adapter.findOne, {
		model: 'user',
		where: [{ field: 'email', operator: 'eq', value: email }]
	});
	return getValidLocale((result as UserWithLocale)?.locale);
}

/**
 * Send verification email with verification link
 *
 * Uses pre-rendered HTML templates with template placeholders for dynamic content.
 * Looks up user's locale preference for translated subject.
 */
export const sendVerificationEmail = internalMutation({
	args: {
		email: v.string(),
		verificationUrl: v.string(),
		expiryMinutes: v.optional(v.number())
	},
	handler: async (ctx, args) => {
		const { email, verificationUrl, expiryMinutes = 20 } = args;

		if (shouldSkipTestEmail('sendVerificationEmail', email)) return;
		assertResendApiKey();

		const locale = await getLocaleForEmail(ctx, email);
		const { html, text } = renderVerificationEmail(verificationUrl, expiryMinutes);

		await resend.sendEmail(ctx, {
			from: expediteurNomme(requireEnv('AUTH_EMAIL', { feature: 'email delivery' })),
			to: email,
			subject: t(locale, 'email.subject.verify'),
			html,
			text,
			// Analytics tracking via custom headers
			headers: [
				{ name: 'X-Email-Category', value: 'authentication' },
				{ name: 'X-Email-Template', value: 'verification' }
			]
		});
	}
});

/**
 * Send password reset email with reset link
 *
 * Uses pre-rendered HTML templates with template placeholders for dynamic content.
 * Looks up user's locale preference for translated subject.
 */
export const sendResetPasswordEmail = internalMutation({
	args: {
		email: v.string(),
		resetUrl: v.string(),
		userName: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { email, resetUrl, userName } = args;

		if (shouldSkipTestEmail('sendResetPasswordEmail', email)) return;
		assertResendApiKey();

		const locale = await getLocaleForEmail(ctx, email);
		const { html, text } = renderPasswordResetEmail(resetUrl, userName);

		await resend.sendEmail(ctx, {
			from: expediteurNomme(requireEnv('AUTH_EMAIL', { feature: 'email delivery' })),
			to: email,
			subject: t(locale, 'email.subject.reset_password'),
			html,
			text,
			// Analytics tracking via custom headers
			headers: [
				{ name: 'X-Email-Category', value: 'authentication' },
				{ name: 'X-Email-Template', value: 'password-reset' }
			]
		});
	}
});
