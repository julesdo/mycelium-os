<script lang="ts">
	import { untrack } from 'svelte';
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import LicenseUpload from './license-upload.svelte';
	import { toast } from 'svelte-sonner';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	type LicenseCategory = 'B' | 'BE' | 'C' | 'CE' | 'D';

	interface ExistingProfile {
		licenseNumber?: string;
		licenseCategories?: string[];
		licenseIssuedDate?: string;
		licenseExpiryDate?: string;
		licenseFrontStorageId?: string;
		licenseBackStorageId?: string;
		notes?: string;
	}

	interface Props {
		targetUserId?: string;
		profile?: ExistingProfile | null;
		onSaved?: () => void;
	}

	const { targetUserId, profile, onSaved }: Props = $props();

	const client = useConvexClient();

	const ALL_CATEGORIES: LicenseCategory[] = ['B', 'BE', 'C', 'CE', 'D'];

	let licenseNumber = $state(untrack(() => profile?.licenseNumber ?? ''));
	let licenseIssuedDate = $state(untrack(() => profile?.licenseIssuedDate ?? ''));
	let licenseExpiryDate = $state(untrack(() => profile?.licenseExpiryDate ?? ''));
	let notes = $state(untrack(() => profile?.notes ?? ''));
	let selectedCategories = $state<Set<LicenseCategory>>(
		new Set(untrack(() => (profile?.licenseCategories ?? []) as LicenseCategory[]))
	);
	let frontStorageId = $state(untrack(() => profile?.licenseFrontStorageId));
	let backStorageId = $state(untrack(() => profile?.licenseBackStorageId));
	let saving = $state(false);

	function toggleCategory(cat: LicenseCategory) {
		const next = new Set(selectedCategories);
		if (next.has(cat)) next.delete(cat);
		else next.add(cat);
		selectedCategories = next;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		saving = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await client.mutation((api as any).drivers.upsertDriverProfile, {
				targetUserId,
				licenseNumber: licenseNumber || undefined,
				licenseCategories: selectedCategories.size > 0 ? [...selectedCategories] : undefined,
				licenseIssuedDate: licenseIssuedDate || undefined,
				licenseExpiryDate: licenseExpiryDate || undefined,
				licenseFrontStorageId: frontStorageId,
				licenseBackStorageId: backStorageId,
				notes: notes || undefined
			});
			toast.success('Profil conducteur mis à jour');
			onSaved?.();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
		} finally {
			saving = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-5">
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<div class="space-y-1.5">
			<label for="license-number" class="text-sm font-medium">Numéro de permis</label>
			<Input id="license-number" bind:value={licenseNumber} placeholder="Ex: 12AB34567" />
		</div>
		<div class="space-y-1.5">
			<p class="text-sm font-medium">Catégories</p>
			<div class="flex flex-wrap gap-2">
				{#each ALL_CATEGORIES as cat}
					<button
						type="button"
						class="rounded-md border px-3 py-1 text-xs font-medium transition-colors {selectedCategories.has(cat)
							? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
							: 'border-neutral-300 text-neutral-600 hover:border-neutral-400 dark:border-neutral-600 dark:text-neutral-400'}"
						onclick={() => toggleCategory(cat)}
					>
						{cat}
					</button>
				{/each}
			</div>
		</div>
		<div class="space-y-1.5">
			<label for="issued-date" class="text-sm font-medium">Date de délivrance</label>
			<Input id="issued-date" type="date" bind:value={licenseIssuedDate} />
		</div>
		<div class="space-y-1.5">
			<label for="expiry-date" class="text-sm font-medium">Date d'expiration</label>
			<Input id="expiry-date" type="date" bind:value={licenseExpiryDate} />
		</div>
	</div>

	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
		<div class="space-y-1.5">
			<p class="text-sm font-medium">Recto du permis</p>
			<LicenseUpload
				label="Recto"
				currentStorageId={frontStorageId}
				onUpload={(id) => (frontStorageId = id)}
			/>
		</div>
		<div class="space-y-1.5">
			<p class="text-sm font-medium">Verso du permis</p>
			<LicenseUpload
				label="Verso"
				currentStorageId={backStorageId}
				onUpload={(id) => (backStorageId = id)}
			/>
		</div>
	</div>

	<div class="space-y-1.5">
		<label for="profile-notes" class="text-sm font-medium">Notes internes</label>
		<textarea
			id="profile-notes"
			bind:value={notes}
			rows={3}
			placeholder="Notes visibles par les gestionnaires uniquement"
			class="w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[var(--brand)] dark:border-neutral-700"
		></textarea>
	</div>

	<div class="flex justify-end">
		<Button type="submit" disabled={saving}>
			{#if saving}
				<Loader2Icon class="mr-2 h-4 w-4 animate-spin" />
			{/if}
			Enregistrer
		</Button>
	</div>
</form>
