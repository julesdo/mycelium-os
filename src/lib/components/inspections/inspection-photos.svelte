<script lang="ts">
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import CameraIcon from '@lucide/svelte/icons/camera';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';
	import XIcon from '@lucide/svelte/icons/x';
	import { cn } from '$lib/utils.js';

	type Angle = 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'INTERIOR' | 'DASHBOARD';

	interface PhotoEntry {
		angle: Angle;
		storageId: string;
		previewUrl: string;
	}

	interface Props {
		photos: PhotoEntry[];
		onchange: (photos: PhotoEntry[]) => void;
	}

	let { photos, onchange }: Props = $props();

	const client = useConvexClient();

	const ANGLES: { key: Angle; label: string; icon: string }[] = [
		{ key: 'FRONT', label: 'Avant', icon: '⬆' },
		{ key: 'BACK', label: 'Arrière', icon: '⬇' },
		{ key: 'LEFT', label: 'Gauche', icon: '⬅' },
		{ key: 'RIGHT', label: 'Droite', icon: '➡' },
		{ key: 'INTERIOR', label: 'Intérieur', icon: '🪑' },
		{ key: 'DASHBOARD', label: 'Tableau de bord', icon: '🔢' }
	];

	let uploading = $state<Set<Angle>>(new Set());
	let errors = $state<Map<Angle, string>>(new Map());

	function getPhoto(angle: Angle): PhotoEntry | undefined {
		return photos.find((p) => p.angle === angle);
	}

	async function handleFileSelect(angle: Angle, event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		if (!file.type.startsWith('image/')) {
			errors = new Map(errors).set(angle, 'Fichier non valide');
			return;
		}
		if (file.size > 10 * 1024 * 1024) {
			errors = new Map(errors).set(angle, 'Fichier trop lourd (max 10 Mo)');
			return;
		}

		const newErrors = new Map(errors);
		newErrors.delete(angle);
		errors = newErrors;

		uploading = new Set([...uploading, angle]);
		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const uploadUrl = await client.mutation((api as any).inspections.generateInspectionUploadUrl, {});
			const res = await fetch(uploadUrl, {
				method: 'POST',
				headers: { 'Content-Type': file.type },
				body: file
			});
			if (!res.ok) throw new Error('Upload échoué');
			const { storageId } = await res.json();

			const previewUrl = URL.createObjectURL(file);
			const updated = photos.filter((p) => p.angle !== angle);
			updated.push({ angle, storageId, previewUrl });
			onchange(updated);
		} catch {
			errors = new Map(errors).set(angle, 'Erreur lors de l\'upload');
		} finally {
			uploading = new Set([...uploading].filter((a) => a !== angle));
			input.value = '';
		}
	}

	function removePhoto(angle: Angle) {
		onchange(photos.filter((p) => p.angle !== angle));
	}
</script>

<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
	{#each ANGLES as { key, label, icon }}
		{@const photo = getPhoto(key)}
		{@const isUploading = uploading.has(key)}
		{@const error = errors.get(key)}

		<div class="flex flex-col gap-1.5">
			<p class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
				{icon} {label}
			</p>

			{#if photo}
				<div class="relative aspect-video overflow-hidden rounded-xl border border-border">
					<img src={photo.previewUrl} alt={label} class="size-full object-cover" />
					<button
						type="button"
						onclick={() => removePhoto(key)}
						class="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
						aria-label="Supprimer"
					>
						<XIcon class="size-3" />
					</button>
					<div class="absolute bottom-1.5 left-1.5">
						<CheckCircleIcon class="size-4 text-green-400" />
					</div>
				</div>
			{:else}
				<label
					class={cn(
						'flex aspect-video cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed transition-colors',
						isUploading
							? 'border-muted bg-muted/30'
							: 'border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/40'
					)}
				>
					{#if isUploading}
						<LoaderCircleIcon class="size-5 animate-spin text-muted-foreground" />
						<span class="text-[11px] text-muted-foreground">Upload…</span>
					{:else}
						<CameraIcon class="size-5 text-muted-foreground" />
						<span class="text-[11px] text-muted-foreground">Ajouter</span>
					{/if}
					<input
						type="file"
						accept="image/*"
						capture="environment"
						class="sr-only"
						disabled={isUploading}
						onchange={(e) => handleFileSelect(key, e)}
					/>
				</label>
			{/if}

			{#if error}
				<p class="text-[11px] text-destructive">{error}</p>
			{/if}
		</div>
	{/each}
</div>
