<script lang="ts">
	import { getTranslate } from '@tolgee/svelte';
	import { Check, ArrowUp, Car } from '@lucide/svelte';
	import Logo from '$lib/components/icons/logo.svelte';

	const { t } = getTranslate();
</script>

<div
	class="w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-card/95 shadow-glass-card backdrop-blur-xl"
>
	<!-- Header -->
	<div class="flex items-center gap-2.5 border-b border-border/70 px-4 py-3">
		<span
			class="flex size-6 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)]"
			style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.3);"
		>
			<Logo class="size-4 text-[var(--brand-foreground)]" />
		</span>
		<span class="text-sm font-semibold text-foreground">Concierge</span>
		<span class="ml-auto flex items-center gap-1.5">
			<span class="size-1.5 rounded-full bg-[oklch(0.72_0.19_150)]"></span>
			<span class="text-xs text-muted-foreground">{$t('landing.proof.hosting')}</span>
		</span>
	</div>

	<!-- Conversation -->
	<div class="space-y-3 p-4">
		<!-- User bubble -->
		<div class="flex justify-end">
			<p
				class="max-w-[78%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm text-primary-foreground"
			>
				{$t('landing.hero.chat.user')}
			</p>
		</div>

		<!-- Agent bubble -->
		<div class="flex justify-start">
			<p class="max-w-[82%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2 text-sm text-foreground">
				{$t('landing.hero.chat.agent')}
			</p>
		</div>

		<!-- Vehicle proposal widget -->
		<div
			class="flex items-center gap-3 rounded-xl border border-border bg-background/60 px-3.5 py-2.5"
		>
			<span
				class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
			>
				<Car class="size-4" />
			</span>
			<span class="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
				{$t('landing.hero.chat.vehicle')}
			</span>
			<span
				class="flex size-5 shrink-0 items-center justify-center rounded-full bg-[oklch(0.72_0.19_150)] text-white"
			>
				<Check class="size-3" />
			</span>
		</div>
	</div>

	<!-- Input -->
	<div class="border-t border-border/70 p-3">
		<div
			class="flex items-center gap-2 rounded-xl border border-border bg-background/60 py-2 pr-2 pl-3.5"
		>
			<span class="flex-1 truncate text-sm text-muted-foreground">
				{$t('landing.hero.chat.placeholder')}
			</span>
			<span
				class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-[var(--brand-foreground)]"
				style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.3);"
			>
				<ArrowUp class="size-4" />
			</span>
		</div>
	</div>
</div>
