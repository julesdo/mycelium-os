<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { page } from '$app/state';
	import { localizedHref } from '$lib/utils/i18n';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import CircleIcon from '@lucide/svelte/icons/circle';
	import XIcon from '@lucide/svelte/icons/x';
	import { browser } from '$app/environment';

	const progressQ = useQuery((api as any).organizations.getOnboardingProgress, {});
	const progress = $derived(progressQ.data);

	const lang = $derived(page.params.lang as string | undefined);

	type ChecklistItem = { key: keyof typeof progress; label: string; href: string; desc: string };
	const ITEMS: ChecklistItem[] = [
		{
			key: 'orgCreated',
			label: 'Organisation créée',
			href: localizedHref('/admin/settings/organization'),
			desc: 'Configurez le nom et la localisation'
		},
		{
			key: 'vehicleAdded',
			label: 'Premier véhicule ajouté',
			href: localizedHref('/admin/fleet/new'),
			desc: 'Importez votre flotte ou ajoutez manuellement'
		},
		{
			key: 'teamInvited',
			label: 'Équipe invitée',
			href: localizedHref('/admin/settings/members'),
			desc: 'Invitez gestionnaires et conducteurs'
		},
		{
			key: 'firstReservation',
			label: 'Première réservation effectuée',
			href: localizedHref('/admin/reservations'),
			desc: 'Testez le parcours salarié'
		}
	];

	const done = $derived(
		progress ? ITEMS.filter((i) => progress[i.key as keyof typeof progress]).length : 0
	);
	const total = ITEMS.length;
	const allDone = $derived(done === total);

	// Dismissed state (localStorage)
	let dismissed = $state(false);

	$effect(() => {
		if (!browser) return;
		dismissed = !!localStorage.getItem('mycelium:onboarding:checklist:dismissed');
	});

	function dismiss() {
		if (browser) localStorage.setItem('mycelium:onboarding:checklist:dismissed', '1');
		dismissed = true;
	}
</script>

{#if !dismissed && progress && !allDone}
	<div
		class="relative overflow-hidden rounded-2xl border border-[var(--brand)]/20 bg-card px-5 py-4"
		data-slot="card"
	>
		<div
			class="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/70 to-transparent dark:via-white/8"
		></div>

		<!-- header -->
		<div class="mb-3 flex items-center justify-between gap-3">
			<div>
				<h2 class="text-sm font-semibold text-foreground">Démarrage</h2>
				<p class="text-xs text-muted-foreground">{done}/{total} étapes complètes</p>
			</div>
			<div class="flex items-center gap-3">
				<!-- progress bar -->
				<div class="hidden h-1.5 w-28 overflow-hidden rounded-full bg-muted sm:block">
					<div
						class="h-full rounded-full bg-[var(--brand)] transition-all duration-500"
						style="width: {(done / total) * 100}%"
					></div>
				</div>
				<button
					type="button"
					onclick={dismiss}
					class="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:text-foreground"
					aria-label="Masquer"
				>
					<XIcon class="size-3.5" />
				</button>
			</div>
		</div>

		<!-- checklist -->
		<div class="grid gap-1.5 sm:grid-cols-2">
			{#each ITEMS as item}
				{@const checked = progress[item.key as keyof typeof progress] as boolean}
				<a
					href={checked ? undefined : item.href}
					class="group flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors
						{checked ? 'cursor-default opacity-60' : 'cursor-pointer hover:bg-muted/50'}"
				>
					{#if checked}
						<CheckCircleIcon class="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
					{:else}
						<CircleIcon class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
					{/if}
					<div class="min-w-0">
						<div
							class="text-xs font-medium {checked
								? 'text-muted-foreground line-through'
								: 'text-foreground'}"
						>
							{item.label}
						</div>
						{#if !checked}
							<div class="text-[11px] text-muted-foreground">{item.desc}</div>
						{/if}
					</div>
				</a>
			{/each}
		</div>
	</div>
{/if}
