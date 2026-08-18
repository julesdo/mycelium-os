<script lang="ts">
	import { untrack } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import type { Famille, Label as LabelEGalim } from '$lib/egalim/types';
	import { FAMILLES } from '$lib/egalim/types';
	import { LABELS_QUALIFIANTS } from '$lib/egalim/referentiel';

	interface Props {
		isFood: boolean;
		family: Famille;
		qualifyingLabels: LabelEGalim[];
		justification: string;
		enCours: boolean;
		onvalider: (d: {
			isFood: boolean;
			family: Famille;
			qualifyingLabels: LabelEGalim[];
			justification: string;
		}) => void;
		onannuler: () => void;
	}

	let {
		isFood: isFoodInitial,
		family: familyInitial,
		qualifyingLabels: labelsInitiaux,
		justification: justificationInitiale,
		enCours,
		onvalider,
		onannuler
	}: Props = $props();

	// Amorcé UNE fois depuis la proposition du classifieur, puis autonome :
	// l'opérateur édite son brouillon, il ne le voit pas se faire réécrire sous
	// ses doigts si la query se rafraîchit. Le composant est remonté à chaque
	// ouverture, donc l'amorce est toujours à jour.
	let isFood = $state(untrack(() => isFoodInitial));
	let family = $state<Famille>(untrack(() => familyInitial));
	let labels = $state<LabelEGalim[]>(untrack(() => [...labelsInitiaux]));
	let justification = $state(untrack(() => justificationInitiale));

	const CODES_LABELS = Object.keys(LABELS_QUALIFIANTS) as LabelEGalim[];

	const FAMILLES_LISIBLES: Record<Famille, string> = {
		VIANDE: 'Viande',
		POISSON: 'Poisson',
		FRUITS_LEGUMES: 'Fruits et légumes',
		LAITIERS: 'Produits laitiers',
		EPICERIE_SECHE: 'Épicerie sèche',
		EPICERIE_APPERTISEE: 'Épicerie appertisée',
		BOISSONS: 'Boissons',
		AUTRE: 'Autre'
	};

	function basculerLabel(code: LabelEGalim) {
		labels = labels.includes(code) ? labels.filter((l) => l !== code) : [...labels, code];
	}

	function valider() {
		onvalider({
			isFood,
			// Un produit non alimentaire n'a pas de famille : la ramener à AUTRE
			// ici évite d'envoyer une incohérence que le verdict corrigerait en
			// silence côté serveur.
			family: isFood ? family : 'AUTRE',
			qualifyingLabels: isFood ? labels : [],
			justification: justification.trim()
		});
	}
</script>

<div
	class="relative overflow-hidden rounded-xl border border-border bg-card p-4"
	style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06)"
>
	<div
		class="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent dark:via-white/20"
	></div>

	<div class="flex flex-col gap-4">
		<!-- Alimentaire ou non : la bascule qui décide de l'entrée au dénominateur -->
		<div class="flex flex-col gap-2">
			<Label class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
				Nature
			</Label>
			<div class="flex gap-2">
				{#each [{ v: true, l: 'Alimentaire' }, { v: false, l: 'Hors alimentaire' }] as opt (String(opt.v))}
					<button
						type="button"
						onclick={() => (isFood = opt.v)}
						class="flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-all
							{isFood === opt.v
							? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
							: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
					>
						{opt.l}
					</button>
				{/each}
			</div>
		</div>

		{#if isFood}
			<div class="flex flex-col gap-2">
				<Label class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
					Famille
				</Label>
				<div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
					{#each FAMILLES as f (f)}
						<button
							type="button"
							onclick={() => (family = f)}
							class="flex h-10 items-center justify-center rounded-lg border px-2 text-[13px] font-medium transition-all
								{family === f
								? 'border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]'
								: 'border-border bg-muted/40 text-muted-foreground hover:bg-muted'}"
						>
							{FAMILLES_LISIBLES[f]}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<Label class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
					Labels du barème
				</Label>
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{#each CODES_LABELS as code (code)}
						{@const actif = labels.includes(code)}
						<button
							type="button"
							onclick={() => basculerLabel(code)}
							class="flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] transition-all
								{actif
								? 'border-[var(--brand)] bg-[var(--brand)]/10'
								: 'border-border bg-muted/40 hover:bg-muted'}"
						>
							<span
								class="flex size-4 shrink-0 items-center justify-center rounded border
									{actif ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-border'}"
							>
								{#if actif}
									<span class="text-[10px] font-black text-[var(--brand-foreground)]">✓</span>
								{/if}
							</span>
							<span class={actif ? 'text-[var(--brand)]' : 'text-muted-foreground'}>
								{LABELS_QUALIFIANTS[code].libelle}
								<span class="ml-1 text-[11px] opacity-70">
									{LABELS_QUALIFIANTS[code].bio ? 'bio + durable' : 'durable'}
								</span>
							</span>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<div class="flex flex-col gap-2">
			<Label
				for="justification"
				class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground"
			>
				Justification
			</Label>
			<Textarea
				id="justification"
				bind:value={justification}
				rows={2}
				placeholder="Ce qui, dans le libellé, fonde la décision."
			/>
			<p class="text-xs text-muted-foreground">
				Elle sera relue en contrôle. Une classification sans justification est inutilisable.
			</p>
		</div>

		<div class="flex items-center justify-end gap-2">
			<Button variant="ghost" onclick={onannuler} disabled={enCours}>Annuler</Button>
			<Button onclick={valider} disabled={enCours || justification.trim().length === 0}>
				Enregistrer la correction
			</Button>
		</div>
	</div>
</div>
