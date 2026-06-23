<script lang="ts">
	import type { PageData } from './$types';
	import SEOHead from '$lib/components/SEOHead.svelte';
	import { T, getTranslate } from '@tolgee/svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import * as v from 'valibot';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import AccountSettings from './account-settings.svelte';
	import PasswordSettings from './password-settings.svelte';
	import EmailSettings from './email-settings.svelte';
	import SecuritySettings from './security-settings.svelte';
	import GoogleCalendarConnect from '$lib/components/integrations/GoogleCalendarConnect.svelte';
	import MicrosoftCalendarConnect from '$lib/components/integrations/MicrosoftCalendarConnect.svelte';
	import UserCircleIcon from '@lucide/svelte/icons/user-circle';
	import LockIcon from '@lucide/svelte/icons/lock';
	import MailIcon from '@lucide/svelte/icons/mail';
	import ShieldIcon from '@lucide/svelte/icons/shield';
	import PlugIcon from '@lucide/svelte/icons/plug';

	interface Props { data: PageData; }
	let { data }: Props = $props();
	let user = $derived(data.user);
	const { t } = getTranslate();

	const SETTINGS_TABS = ['account', 'password', 'email', 'security', 'integrations'] as const;
	type SettingsTab = (typeof SETTINGS_TABS)[number];
	const DEFAULT_SETTINGS_TAB: SettingsTab = 'account';
	const tabFallback = v.fallback(v.picklist(SETTINGS_TABS), DEFAULT_SETTINGS_TAB);
	const activeTab = $derived(
		v.parse(tabFallback, page.url.searchParams.get('tab') ?? DEFAULT_SETTINGS_TAB)
	);

	function updateTab(value: string) {
		if (value === activeTab) return;
		const url = new URL(page.url);
		if (value === DEFAULT_SETTINGS_TAB) url.searchParams.delete('tab');
		else url.searchParams.set('tab', value);
		goto(resolve(url.pathname + url.search), { keepFocus: true, noScroll: true });
	}

	const tabs = [
		{ value: 'account',      label: 'Profil',        icon: UserCircleIcon },
		{ value: 'password',     label: 'Mot de passe',  icon: LockIcon       },
		{ value: 'email',        label: 'E-mail',        icon: MailIcon       },
		{ value: 'security',     label: 'Sécurité',      icon: ShieldIcon     },
		{ value: 'integrations', label: 'Intégrations',  icon: PlugIcon       },
	];
</script>

<SEOHead title={$t('meta.app.settings.title')} description={$t('meta.app.settings.description')} />

<div class="flex flex-col gap-5 px-4 pb-24 pt-3 lg:pb-8 lg:px-6 xl:px-8 2xl:px-16">

	<!-- ── Header ──────────────────────────────────────────────────────────── -->
	<div>
		<h1 class="text-xl font-black tracking-tight">Réglages</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">Gérez votre compte et vos préférences</p>
	</div>

	<!-- ── Tabs ──────────────────────────────────────────────────────────── -->
	<Tabs.Root value={activeTab} onValueChange={(v) => updateTab(v)}>
		<Tabs.List class="self-start">
			{#each tabs as tab}
				<Tabs.Trigger value={tab.value} class="gap-1.5">
					<tab.icon class="size-3.5 shrink-0" />
					{tab.label}
				</Tabs.Trigger>
			{/each}
		</Tabs.List>

		<!-- ── Content ─────────────────────────────────────────────────────── -->
		<div class="mt-6 max-w-xl">

			<Tabs.Content value="account">
				{#if user}
					<AccountSettings {user} />
				{/if}
			</Tabs.Content>

			<Tabs.Content value="password">
				<PasswordSettings />
			</Tabs.Content>

			<Tabs.Content value="email">
				{#if user}
					<EmailSettings {user} />
				{/if}
			</Tabs.Content>

			<Tabs.Content value="security">
				<SecuritySettings />
			</Tabs.Content>

			<Tabs.Content value="integrations">
				<div class="flex flex-col gap-5">
					<div>
						<p class="text-sm font-bold">Intégrations calendrier</p>
						<p class="mt-0.5 text-sm text-muted-foreground">
							Connectez votre calendrier pour synchroniser automatiquement vos réservations.
						</p>
					</div>
					<GoogleCalendarConnect />
					<MicrosoftCalendarConnect />
				</div>
			</Tabs.Content>

		</div>
	</Tabs.Root>

</div>
