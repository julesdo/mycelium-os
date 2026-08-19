<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import FileTextIcon from '@lucide/svelte/icons/file-text';

	interface Props {
		documentId: Id<'invoiceDocuments'> | null;
	}

	let { documentId }: Props = $props();

	// `'skip'` et non `undefined` : sans document sélectionné il n'y a rien à
	// charger, et `undefined` ferait choisir la mauvaise surcharge de `useQuery`.
	const preuve = useQuery(api.egalim.confirmation.obtenirPreuve, () =>
		documentId ? { documentId } : ('skip' as const)
	);

	const estImage = $derived(preuve.data?.mimeType.startsWith('image/') ?? false);
	const estPdf = $derived(preuve.data?.mimeType === 'application/pdf');
</script>

<!--
	La preuve : le fichier d'où sort le libellé qu'on est en train de trancher.
	C'est ce qui rend le chiffre défendable, et c'est là que le zoom au doigt
	sert vraiment.
-->
<div class="flex h-full min-h-0 flex-col rounded-xl border border-border bg-muted/20">
	{#if !documentId}
		<div class="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
			<FileTextIcon class="size-7 text-muted-foreground/40" />
			<p class="text-xs text-muted-foreground">
				Sélectionnez un produit pour voir la facture d'où il vient.
			</p>
		</div>
	{:else if preuve.isLoading}
		<Skeleton class="m-3 flex-1 rounded-lg" />
	{:else if !preuve.data?.url}
		<div class="flex flex-1 items-center justify-center p-6 text-center">
			<p class="text-xs text-muted-foreground">Le fichier source n'est plus disponible.</p>
		</div>
	{:else}
		<div class="shrink-0 border-b border-border px-3 py-2">
			<p class="truncate text-[13px] font-medium">{preuve.data.filename}</p>
			{#if preuve.data.invoiceNumber || preuve.data.invoiceDate}
				<p class="font-mono text-[11px] text-muted-foreground tabular-nums">
					{preuve.data.invoiceNumber ?? ''}
					{preuve.data.invoiceDate ?? ''}
				</p>
			{/if}
		</div>
		<div class="min-h-0 flex-1 overflow-auto p-2" style="touch-action: pinch-zoom">
			{#if estImage}
				<img src={preuve.data.url} alt="Facture {preuve.data.filename}" class="w-full rounded-lg" />
			{:else if estPdf}
				<iframe
					src={preuve.data.url}
					title="Facture {preuve.data.filename}"
					class="h-full min-h-96 w-full rounded-lg border-0"
				></iframe>
			{:else}
				<div class="flex h-full items-center justify-center p-6 text-center">
					<a
						href={preuve.data.url}
						class="text-xs text-[var(--brand)] underline"
						download={preuve.data.filename}
					>
						Ouvrir {preuve.data.filename}
					</a>
				</div>
			{/if}
		</div>
	{/if}
</div>
