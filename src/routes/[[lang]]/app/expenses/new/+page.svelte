<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { localizedHref } from '$lib/utils/i18n.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import ExpenseForm from '$lib/components/expenses/expense-form.svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
</script>

<div class="mx-auto flex max-w-2xl flex-col gap-6 px-4 pb-24 pt-3 lg:pb-8 lg:px-0">

	<!-- Header -->
	<div class="flex items-center gap-3">
		<Button variant="ghost" size="icon" href={resolve(localizedHref('/app/expenses'))} class="size-8 shrink-0">
			<ArrowLeftIcon class="size-4" />
		</Button>
		<div class="flex items-center gap-2">
			<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)]/15">
				<FileTextIcon class="size-4 text-[var(--brand)]" />
			</div>
			<div>
				<h1 class="text-lg font-black tracking-tight">Nouvelle note de frais IK</h1>
				<p class="text-xs text-muted-foreground">Barème URSSAF {new Date().getFullYear()}</p>
			</div>
		</div>
	</div>

	<!-- Info banner -->
	<div class="rounded-xl border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
		<strong class="text-foreground">Véhicule personnel uniquement.</strong> Cette note concerne les trajets effectués avec votre propre voiture,
		pas un véhicule de la flotte d'entreprise.
	</div>

	<!-- Form card -->
	<div class="rounded-2xl border bg-card p-6 shadow-sm">
		<ExpenseForm
			onsuccess={() => goto(resolve(localizedHref('/app/expenses')))}
			oncancel={() => goto(resolve(localizedHref('/app/expenses')))}
		/>
	</div>
</div>
