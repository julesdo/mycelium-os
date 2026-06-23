<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import VehicleForm from '$lib/components/fleet/VehicleForm.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import CarIcon from '@lucide/svelte/icons/car';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';

	const lang = $derived(page.params.lang as string | undefined);

	function localHref(path: string): string {
		return lang ? `/${lang}${path}` : path;
	}

	function goToFleet() {
		goto(resolve(localHref('/admin/fleet')));
	}

	function onSuccess(id: string) {
		goto(resolve(localHref(`/admin/fleet/${id}`)));
	}
</script>

<div class="flex flex-col gap-6 px-4 lg:px-6 xl:px-8 2xl:px-16">
	<div class="flex items-center gap-3">
		<Button
			variant="ghost"
			size="icon-sm"
			onclick={goToFleet}
			aria-label="Retour a la flotte"
		>
			<ArrowLeftIcon class="size-4" />
		</Button>
		<h1 class="text-base font-semibold">Ajouter un véhicule</h1>
	</div>

	<Card.Root>
		<Card.Content class="p-6">
			<VehicleForm mode="create" {onSuccess} onCancel={goToFleet} />
		</Card.Content>
	</Card.Root>
</div>
