<script lang="ts">
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import CheckIcon from '@lucide/svelte/icons/check';
	import Loader2Icon from '@lucide/svelte/icons/loader-2';

	interface Props {
		label: string;
		currentStorageId?: string;
		onUpload: (storageId: string) => void;
	}

	const { label, currentStorageId, onUpload }: Props = $props();

	const client = useConvexClient();

	let isUploading = $state(false);
	let justUploaded = $state(false);
	const uploaded = $derived(!!currentStorageId || justUploaded);
	let fileInput: HTMLInputElement | undefined = $state();

	async function handleFileChange(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;

		isUploading = true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const uploadUrl = await client.mutation((api as any).drivers.generateLicenseUploadUrl, {});
			const response = await fetch(uploadUrl as string, {
				method: 'POST',
				headers: { 'Content-Type': file.type },
				body: file
			});
			if (!response.ok) throw new Error('Upload échoué');
			const { storageId } = await response.json();
			onUpload(storageId);
			justUploaded = true;
		} catch {
			justUploaded = false;
		} finally {
			isUploading = false;
		}
	}
</script>

<button
	type="button"
	class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 px-4 py-6 text-sm transition-colors hover:border-neutral-400 dark:border-neutral-600 dark:hover:border-neutral-500"
	onclick={() => fileInput?.click()}
	disabled={isUploading}
>
	{#if isUploading}
		<Loader2Icon class="h-4 w-4 animate-spin text-neutral-400" />
		<span class="text-neutral-500">Envoi en cours…</span>
	{:else if uploaded}
		<CheckIcon class="h-4 w-4 text-emerald-500" />
		<span class="text-emerald-600 dark:text-emerald-400">{label} — envoyé</span>
	{:else}
		<UploadIcon class="h-4 w-4 text-neutral-400" />
		<span class="text-neutral-500">{label}</span>
	{/if}
</button>

<input
	bind:this={fileInput}
	type="file"
	accept="image/*,application/pdf"
	class="hidden"
	onchange={handleFileChange}
/>
