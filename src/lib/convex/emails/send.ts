import { internalMutation } from '../_generated/server';
import { v } from 'convex/values';
import { components } from '../_generated/api';
import { resend, assertResendApiKey } from './resend';
import {
	renderVerificationEmail,
	renderPasswordResetEmail,
	renderAdminReplyNotificationEmail,
	renderNewTicketAdminNotificationEmail
} from './templates';
import { requireEnv } from '../env';
import type { NotificationMessage } from './types';
import { t, getValidLocale, type SupportedLocale } from '../i18n/translations';
import type { GenericMutationCtx } from 'convex/server';
import type { DataModel } from '../_generated/dataModel';
import { shouldSkipTestEmail } from './helpers';

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
			from: requireEnv('AUTH_EMAIL', { feature: 'email delivery' }),
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
			from: requireEnv('AUTH_EMAIL', { feature: 'email delivery' }),
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

/**
 * Send notification email when admin replies to a support thread
 *
 * Called when an admin responds to a user's support request.
 * Uses pre-rendered HTML templates with template placeholders for dynamic content.
 * Looks up user's locale preference for translated subject.
 */
export const sendAdminReplyNotification = internalMutation({
	args: {
		email: v.string(),
		adminName: v.string(),
		messagePreview: v.string(),
		threadId: v.string(),
		pageUrl: v.optional(v.string())
	},
	handler: async (ctx, args) => {
		const { email, adminName, messagePreview, threadId, pageUrl } = args;

		if (shouldSkipTestEmail('sendAdminReplyNotification', email)) return;
		assertResendApiKey();

		const locale = await getLocaleForEmail(ctx, email);
		const siteUrl = requireEnv('SITE_URL', { feature: 'email deep links' });

		// Build deep link that opens the support widget to this thread
		// Strip any existing support/thread params to avoid duplicates
		const url = new URL(pageUrl || siteUrl);
		url.searchParams.delete('support');
		url.searchParams.delete('thread');
		url.searchParams.set('support', 'open');
		url.searchParams.set('thread', threadId);
		const deepLink = url.toString();

		const { html, text } = renderAdminReplyNotificationEmail(adminName, messagePreview, deepLink);

		await resend.sendEmail(ctx, {
			from: requireEnv('AUTH_EMAIL', { feature: 'email delivery' }),
			to: email,
			subject: t(locale, 'email.subject.support_reply'),
			html,
			text,
			// Analytics tracking via custom headers
			headers: [
				{ name: 'X-Email-Category', value: 'support' },
				{ name: 'X-Email-Template', value: 'admin-reply' },
				{ name: 'X-Thread-ID', value: threadId }
			]
		});
	}
});

/**
 * Send notification email to admin when a new ticket is created or reopened
 *
 * Called after the debounce period expires when a user creates a new ticket
 * or sends a message to a previously closed ticket.
 *
 * Uses pre-rendered HTML templates with template placeholders for dynamic content.
 * Looks up admin's locale preference for translated subject.
 */
export const sendNewTicketAdminNotification = internalMutation({
	args: {
		email: v.string(),
		isReopen: v.boolean(),
		userName: v.string(),
		messages: v.array(
			v.object({
				text: v.string(),
				timestamp: v.string()
			})
		),
		threadId: v.string()
	},
	handler: async (ctx, args) => {
		const { email, isReopen, userName, messages, threadId } = args;
		assertResendApiKey();
		const siteUrl = requireEnv('SITE_URL', { feature: 'email deep links' });
		const locale = await getLocaleForEmail(ctx, email);

		// Build admin dashboard link for this thread
		const adminDashboardLink = `${siteUrl}/admin/support?thread=${threadId}`;

		const { html, text } = renderNewTicketAdminNotificationEmail(
			{
				isReopen,
				userName,
				messages: messages as NotificationMessage[],
				adminDashboardLink
			},
			locale
		);

		const subject = isReopen
			? t(locale, 'email.subject.ticket_reopened', { userName })
			: t(locale, 'email.subject.ticket_new', { userName });

		await resend.sendEmail(ctx, {
			from: requireEnv('AUTH_EMAIL', { feature: 'email delivery' }),
			to: email,
			subject,
			html,
			text,
			// Analytics tracking via custom headers
			headers: [
				{ name: 'X-Email-Category', value: 'support-admin' },
				{ name: 'X-Email-Template', value: isReopen ? 'ticket-reopened' : 'new-ticket' },
				{ name: 'X-Thread-ID', value: threadId }
			]
		});
	}
});
