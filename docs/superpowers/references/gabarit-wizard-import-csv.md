# Gabarit — wizard d'import CSV (drag-drop → mapping → validation)

Extrait de `src/lib/components/fleet/ImportFleetModal.svelte` (+ `CSVMappingStep.svelte` et
`CSVPreviewStep.svelte` qu'il orchestre) et de `src/lib/components/finance/ImportCostsModal.svelte`
(Mycelium Fleet OS, supprimés le 15/08/2026).

Deux variantes du même problème : `ImportFleetModal` fait un wizard 3 étapes avec mapping de
colonnes explicite (le CSV fournisseur a des en-têtes imprévisibles) ; `ImportCostsModal` fait
un wizard 2 étapes avec détection de colonnes automatique (les en-têtes attendus sont plus
stables). La Moulinette aura probablement besoin des deux : mapping explicite pour les exports
CSV de logiciels de gestion fournisseur hétérogènes, détection automatique si on standardise un
gabarit de facture EGalim.

## Étape 1 — Drop zone + parsing client (les deux modales, identique)

Papa Parse en mode `header: true`, avec détection automatique de séparateur et nettoyage du BOM
Excel — sans backend, tout se passe dans le navigateur avant le premier appel réseau :

```svelte
<script lang="ts">
	import Papa from 'papaparse';

	let isDragging = $state(false);
	let fileError = $state<string | null>(null);
	let isParsing = $state(false);
	let parsedFile = $state<{
		name: string;
		rowCount: number;
		headers: string[];
		rows: Record<string, string>[];
	} | null>(null);

	function validateFile(file: File): string | null {
		if (!file.name.toLowerCase().endsWith('.csv')) {
			return 'Le fichier doit etre au format .csv';
		}
		if (file.size > 5 * 1024 * 1024) {
			return 'Le fichier ne doit pas depasser 5 Mo';
		}
		return null;
	}

	function parseFile(file: File) {
		const error = validateFile(file);
		if (error) {
			fileError = error;
			parsedFile = null;
			return;
		}
		fileError = null;
		isParsing = true;
		parsedFile = null;

		Papa.parse<Record<string, string>>(file, {
			header: true,
			skipEmptyLines: true,
			dynamicTyping: false,
			// Détecte le français (;) et les autres séparateurs en plus de la virgule par défaut
			delimitersToGuess: [',', ';', '\t', '|'],
			// Retire le BOM UTF-8 (﻿) qu'Excel ajoute aux exports CSV
			beforeFirstChunk: (chunk) => chunk.replace(/^﻿/, ''),
			complete(results) {
				isParsing = false;
				if (results.errors.length > 0 && results.data.length === 0) {
					fileError = 'Impossible de lire le fichier CSV. Verifiez son format.';
					return;
				}
				parsedFile = {
					name: file.name,
					rowCount: results.data.length,
					headers: results.meta.fields ?? [],
					rows: results.data
				};
			},
			error(err) {
				isParsing = false;
				fileError = (err as Error).message ?? 'Erreur de parsing CSV';
			}
		});
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files[0];
		if (file) parseFile(file);
	}

	function handleFileInput(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		if (file) parseFile(file);
		target.value = '';
	}
</script>

<div
	role="button"
	tabindex={0}
	ondragover={(e) => { e.preventDefault(); isDragging = true; }}
	ondragleave={() => (isDragging = false)}
	ondrop={handleDrop}
	onclick={() => fileInputRef?.click()}
>
	<input type="file" accept=".csv" class="hidden" bind:this={fileInputRef} onchange={handleFileInput} />
	<!-- ... états visuels : idle / dragging / parsing / parsed / error ... -->
</div>
```

Détails qui comptent en pratique : `delimitersToGuess` évite d'obliger l'utilisateur à
pré-convertir un export Excel français (`;`) en CSV standard (`,`) ; `beforeFirstChunk` retire
le BOM qu'Excel insère systématiquement et qui, sans ce retrait, pollue le nom du premier
en-tête (`"﻿Immatriculation"` ne matche plus `"Immatriculation"`).

## Étape 2a — Mapping de colonnes explicite (ImportFleetModal → CSVMappingStep)

Auto-détection par ressemblance de nom, avec persistance du mapping choisi en `localStorage`
pour ne pas refaire le mapping à chaque import du même fournisseur :

```svelte
<script lang="ts">
	const MYCELIUM_FIELDS: { key: string; label: string; required: boolean }[] = [
		{ key: 'registration', label: 'Immatriculation', required: true },
		{ key: 'brand', label: 'Marque', required: true },
		// ...
		{ key: 'notes', label: 'Notes', required: false }
	];

	const LS_KEY = 'fleet-csv-mapping';

	const PATTERNS: Array<[string, string]> = [
		['immat', 'registration'],
		['registration', 'registration'],
		['marque', 'brand'],
		['brand', 'brand'],
		// ...
	];

	function normalize(s: string) {
		return s
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '') // retire les diacritiques
			.replace(/[^a-z0-9]/g, '');
	}

	function autoMap(hdrs: string[]): Record<string, string> {
		const result: Record<string, string> = {};
		// 1. Essaye de charger un mapping sauvegardé, filtré aux colonnes présentes
		if (browser) {
			try {
				const saved = localStorage.getItem(LS_KEY);
				if (saved) {
					const parsed = JSON.parse(saved) as Record<string, string>;
					const validSaved: Record<string, string> = {};
					for (const [field, col] of Object.entries(parsed)) {
						if (hdrs.includes(col)) validSaved[field] = col;
					}
					if (Object.keys(validSaved).length > 0) return validSaved;
				}
			} catch { /* ignore */ }
		}
		// 2. Sinon, auto-mapping par ressemblance de nom (substring)
		for (const hdr of hdrs) {
			const norm = normalize(hdr);
			const match = PATTERNS.find(([pattern]) => norm.includes(pattern));
			if (match && !result[match[1]]) result[match[1]] = hdr;
		}
		return result;
	}

	// Initialise le mapping au montage du composant
	$effect(() => {
		const initial = autoMap(headers);
		onMappingChange(initial);
	});

	function handleSelectChange(fieldKey: string, colValue: string) {
		const next = { ...mapping, [fieldKey]: colValue };
		if (!colValue) delete next[fieldKey];
		onMappingChange(next);
		if (browser) {
			try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
		}
	}

	const isValid = $derived(
		MYCELIUM_FIELDS.filter((f) => f.required).every((f) => !!mapping[f.key])
	);

	$effect(() => {
		onValidChange(isValid);
	});
</script>
```

Le champ requis manquant bloque le bouton « Suivant » via `onValidChange` remonté au parent —
la validation de structure (colonnes obligatoires présentes) est séparée de la validation de
contenu (chaque ligne est bien formée), qui arrive à l'étape suivante.

## Étape 2b — Détection de colonnes automatique (ImportCostsModal, alternative sans mapping manuel)

Pour un format où les en-têtes attendus varient peu, on saute l'étape de mapping utilisateur et
on détecte + valide chaque ligne en une passe, avec un dictionnaire de normalisation métier :

```svelte
<script lang="ts">
	const CATEGORY_MAP: Record<string, Category> = {
		leasing: 'LEASING', loyer: 'LEASING',
		carburant: 'CARBURANT', essence: 'CARBURANT', gazole: 'CARBURANT', diesel: 'CARBURANT',
		entretien: 'ENTRETIEN', maintenance: 'ENTRETIEN', revision: 'ENTRETIEN',
		assurance: 'ASSURANCE',
		// ...
	};

	function detectColumn(headers: string[], candidates: string[]): string | null {
		for (const h of headers) {
			const nk = normalizeKey(h);
			if (candidates.some((c) => nk === c || nk.includes(c))) return h;
		}
		return null;
	}

	// Dans complete() de Papa.parse :
	const headers = results.meta.fields ?? [];
	const vehicleReg = detectColumn(headers, ['vehicule', 'immatriculation', 'immat', 'vehicle', 'plaque']);
	const categoryCol = detectColumn(headers, ['categorie', 'category', 'type']);
	const amountCol = detectColumn(headers, ['montant_ttc', 'montant', 'amount', 'prix', 'cout', 'ttc']);
	const dateCol = detectColumn(headers, ['date', 'date_facture', 'date_depense']);

	parsedRows = results.data.map((row) => {
		const errors: string[] = [];

		const categoryRaw = categoryCol ? row[categoryCol]?.trim() ?? '' : '';
		const category = categoryRaw ? normalizeCategory(categoryRaw) : null;
		if (!category) errors.push(`Catégorie "${categoryRaw}" invalide`);

		const amountRaw = amountCol ? row[amountCol]?.trim() ?? '' : '';
		const amount = parseAmount(amountRaw);
		if (!amount || amount <= 0) errors.push('Montant invalide ou manquant');

		const dateRaw = dateCol ? row[dateCol]?.trim() ?? '' : '';
		const date = parseDate(dateRaw);
		if (!date) errors.push('Date invalide ou manquante');

		return { /* ... */ valid: errors.length === 0, errors };
	});
</script>
```

## Étape 3 — Prévisualisation + validation ligne par ligne + import chunké

Chaque ligne est convertie et validée côté client avant tout appel réseau ; les lignes
invalides sont affichées mais jamais envoyées. L'import lui-même est découpé en lots pour ne
pas dépasser les limites de payload d'une mutation Convex, avec une barre de progression pilotée
par le nombre de lots traités :

```svelte
<script lang="ts">
	function convertRow(row: Record<string, string>): VehicleInput | null {
		const registration = col(row, 'registration').trim();
		const year = parseInt(col(row, 'year').trim(), 10);
		const energy = normalizeEnergy(col(row, 'energy'));
		const category = normalizeCategory(col(row, 'category'));

		if (!registration || !brand || !model || isNaN(year) || !energy || !category) return null;

		return { registration, brand, model, year, energy, category, /* champs optionnels */ };
	}

	const converted = $derived.by(() => {
		const validList: VehicleInput[] = [];
		let invalidCount = 0;
		for (const row of rows) {
			const v = convertRow(row);
			if (v) validList.push(v);
			else invalidCount++;
		}
		return { valid: validList, invalidCount };
	});

	async function startImport() {
		if (converted.valid.length === 0) return;
		isImporting = true;
		progress = 0;

		const CHUNK_SIZE = 20;
		const chunks: VehicleInput[][] = [];
		for (let i = 0; i < converted.valid.length; i += CHUNK_SIZE) {
			chunks.push(converted.valid.slice(i, i + CHUNK_SIZE));
		}

		let totalInserted = 0;
		let totalSkipped = 0;
		const allSkipped: string[] = [];

		try {
			for (let i = 0; i < chunks.length; i++) {
				const result = await client.mutation(api.vehicles.bulkCreateVehicles, {
					vehicles: chunks[i]
				});
				totalInserted += result.inserted;
				totalSkipped += result.skipped;
				allSkipped.push(...result.skippedRegistrations);
				progress = (i + 1) / chunks.length; // barre de progression réelle, pas simulée
			}
			isImporting = false;
			isDone = true;
			onImportComplete({ inserted: totalInserted, skipped: totalSkipped, skippedRegistrations: allSkipped });
		} catch (err) {
			importError = err instanceof Error ? err.message : 'Une erreur est survenue';
			isImporting = false;
		}
	}
</script>
```

Affichage des erreurs ligne par ligne dans `ImportCostsModal` (tableau avec icône de statut et
titre au survol contenant le détail des erreurs) :

```svelte
<tbody class="divide-y divide-border/60">
	{#each parsedRows as row, i (i)}
		<tr class="transition-colors {row.valid ? 'hover:bg-muted/20' : 'bg-amber-500/5'}">
			<td class="px-3 py-2">
				{#if row.valid}
					<CheckIcon class="size-3.5 text-emerald-600" />
				{:else}
					<span title={row.errors.join(', ')}>
						<AlertTriangleIcon class="size-3.5 text-amber-500" />
					</span>
				{/if}
			</td>
			<!-- ... colonnes date / véhicule / catégorie / montant, chacune retombant
			     sur un affichage en orange de la valeur brute si invalide ... -->
		</tr>
	{/each}
</tbody>
```

## Gestion d'état Svelte 5 (runes)

Pattern constant sur les deux modales : `$bindable` pour `open` (contrôlé par le parent),
`$state` pour tout ce qui change pendant le wizard, `$derived`/`$derived.by` pour les valeurs
calculées (compteurs valides/invalides, conversion de lignes), `$effect` pour synchroniser un
état interne vers le parent (auto-mapping initial, validité du mapping) :

```ts
let { open = $bindable(false), onOpenChange, onSuccess }: Props = $props();

type Step = 1 | 2 | 3 | 4;
let currentStep = $state<Step>(1);

let isImporting = $state(false);
let isDone = $state(false);
let importResult = $state<{ inserted: number; skipped: number } | null>(null);

function resetState() {
	currentStep = 1;
	isDragging = false;
	fileError = null;
	// ... réinitialise tout l'état local à la fermeture de la modale
}

function handleOpenChange(isOpen: boolean) {
	if (!isOpen && !isImporting) resetState(); // jamais reset pendant un import en cours
	open = isOpen;
	onOpenChange?.(isOpen);
}
```

Un détail structurel à noter : `ImportFleetModal` ne fait pas lui-même le parsing/validation de
la ligne 2 et 3 — il délègue à `CSVMappingStep.svelte` et `CSVPreviewStep.svelte`, deux
composants enfants qui communiquent leur état vers le haut via des callbacks (`onMappingChange`,
`onValidChange`, `onImportComplete`) plutôt que par `bind:`. Ce découpage garde chaque étape
testable isolément et évite un fichier de 800+ lignes.

## Ce qu'on garde pour la Moulinette

- **Parsing Papa Parse avec `delimitersToGuess` + `beforeFirstChunk` anti-BOM** : à copier tel
  quel, c'est la source n°1 d'échecs silencieux sur des exports Excel français.
- **Auto-mapping par pattern de substring + persistance `localStorage`** : directement
  réutilisable si les factures fournisseur EGalim ont des en-têtes hétérogènes (grossistes,
  centrales d'achat, plateformes B2B ont chacun leur format).
- **Validation ligne par ligne avant tout appel réseau**, avec accumulation des erreurs par
  ligne (`errors: string[]`) plutôt qu'un rejet global du fichier : le principe UX (montrer ce
  qui va être importé ET ce qui sera ignoré, jamais bloquer sur la première erreur) est
  directement transposable à un import de facture PDF où certaines lignes seront mal extraites.
  Pour la Moulinette, « ligne invalide » devient un cran intermédiaire : au lieu d'un simple
  valide/invalide, on aura probablement valide / à classifier / à revoir manuellement.
- **Import chunké avec progression réelle** (`CHUNK_SIZE = 20`) : à réutiliser si le nombre de
  lignes d'une facture dépasse ce que la Moulinette veut envoyer à Claude en un seul batch.
- **Découpage en composants enfants avec callbacks montants** : à reproduire pour garder le
  wizard Moulinette lisible plutôt qu'un unique gros composant.
