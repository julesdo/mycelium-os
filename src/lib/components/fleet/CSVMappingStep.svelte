<script lang="ts">
	import * as Select from '$lib/components/ui/select/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { browser } from '$app/environment';

	interface Props {
		headers: string[];
		rows: Record<string, string>[];
		mapping: Record<string, string>;
		onMappingChange: (mapping: Record<string, string>) => void;
		onValidChange: (valid: boolean) => void;
	}

	let { headers, rows, mapping, onMappingChange, onValidChange }: Props = $props();

	const MYCELIUM_FIELDS: { key: string; label: string; required: boolean }[] = [
		{ key: 'registration', label: 'Immatriculation', required: true },
		{ key: 'brand', label: 'Marque', required: true },
		{ key: 'model', label: 'Modele', required: true },
		{ key: 'year', label: 'Annee', required: true },
		{ key: 'energy', label: 'Energie', required: true },
		{ key: 'category', label: 'Categorie', required: true },
		{ key: 'kilometers', label: 'Kilometrage', required: false },
		{ key: 'purchaseDate', label: "Date d'achat", required: false },
		{ key: 'leaseEndDate', label: 'Fin de leasing', required: false },
		{ key: 'location', label: 'Site', required: false },
		{ key: 'notes', label: 'Notes', required: false }
	];

	const LS_KEY = 'fleet-csv-mapping';

	const PATTERNS: Array<[string, string]> = [
		['immat', 'registration'],
		['registration', 'registration'],
		['marque', 'brand'],
		['brand', 'brand'],
		['modele', 'model'],
		['model', 'model'],
		['annee', 'year'],
		['year', 'year'],
		['energie', 'energy'],
		['energy', 'energy'],
		['categorie', 'category'],
		['category', 'category'],
		['km', 'kilometers'],
		['kilom', 'kilometers'],
		['mileage', 'kilometers'],
		['achat', 'purchaseDate'],
		['purchase', 'purchaseDate'],
		['leasing', 'leaseEndDate'],
		['lease', 'leaseEndDate'],
		['site', 'location'],
		['localisation', 'location'],
		['location', 'location'],
		['note', 'notes']
	];

	function normalize(s: string) {
		return s
			.toLowerCase()
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^a-z0-9]/g, '');
	}

	function autoMap(hdrs: string[]): Record<string, string> {
		const result: Record<string, string> = {};
		// Try to load saved mapping first
		if (browser) {
			try {
				const saved = localStorage.getItem(LS_KEY);
				if (saved) {
					const parsed = JSON.parse(saved) as Record<string, string>;
					// Only apply saved mapping for columns that exist in current CSV
					const validSaved: Record<string, string> = {};
					for (const [field, col] of Object.entries(parsed)) {
						if (hdrs.includes(col)) validSaved[field] = col;
					}
					if (Object.keys(validSaved).length > 0) return validSaved;
				}
			} catch {
				// ignore
			}
		}

		// Auto-map based on name similarity
		for (const hdr of hdrs) {
			const norm = normalize(hdr);
			const match = PATTERNS.find(([pattern]) => norm.includes(pattern));
			if (match) {
				const fieldKey = match[1];
				// Don't overwrite if already mapped
				if (!result[fieldKey]) {
					result[fieldKey] = hdr;
				}
			}
		}
		return result;
	}

	// Initialize mapping on mount
	$effect(() => {
		const initial = autoMap(headers);
		onMappingChange(initial);
	});

	function handleSelectChange(fieldKey: string, colValue: string) {
		const next = { ...mapping, [fieldKey]: colValue };
		if (!colValue) delete next[fieldKey];
		onMappingChange(next);

		// Persist to localStorage
		if (browser) {
			try {
				localStorage.setItem(LS_KEY, JSON.stringify(next));
			} catch {
				// ignore
			}
		}
	}

	const isValid = $derived(
		MYCELIUM_FIELDS.filter((f) => f.required).every((f) => !!mapping[f.key])
	);

	$effect(() => {
		onValidChange(isValid);
	});

	// Preview: first 5 rows with mapping applied
	const previewRows = $derived(rows.slice(0, 5));
	const mappedFields = $derived(MYCELIUM_FIELDS.filter((f) => !!mapping[f.key]));

	const headerOptions = $derived([
		{ value: '', label: '—' },
		...headers.map((h) => ({ value: h, label: h }))
	]);
</script>

<div class="flex flex-col gap-6" data-testid="step-mapping">
	<!-- Mapping table -->
	<div class="flex flex-col gap-2">
		<p class="text-sm text-muted-foreground">
			Associez chaque champ Mycelium a une colonne de votre fichier CSV.
			Les champs marques <span class="text-destructive">*</span> sont obligatoires.
		</p>
		<div class="overflow-hidden rounded-md border border-border">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-b border-border bg-muted/40">
						<th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Champ Mycelium</th>
						<th class="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Colonne CSV</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-border">
					{#each MYCELIUM_FIELDS as field (field.key)}
						<tr class="hover:bg-muted/20">
							<td class="px-3 py-2">
								<span class="font-medium">{field.label}</span>
								{#if field.required}
									<span class="ml-0.5 text-destructive">*</span>
								{/if}
							</td>
							<td class="px-3 py-2">
								<Select.Root
									type="single"
									value={mapping[field.key] ?? ''}
									onValueChange={(v) => handleSelectChange(field.key, v)}
								>
									<Select.Trigger
										class="h-7 w-full max-w-56 text-xs {field.required && !mapping[field.key] ? 'border-destructive/50' : ''}"
									>
										{mapping[field.key] ?? '—'}
									</Select.Trigger>
									<Select.Content>
										{#each headerOptions as opt (opt.value)}
											<Select.Item value={opt.value} class="text-xs">
												{opt.label}
											</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Preview -->
	{#if mappedFields.length > 0 && previewRows.length > 0}
		<div class="flex flex-col gap-2">
			<p class="text-xs font-medium text-muted-foreground uppercase tracking-wide">
				Apercu (5 premieres lignes)
			</p>
			<div class="overflow-x-auto rounded-md border border-border">
				<Table.Root>
					<Table.Header>
						<Table.Row class="bg-muted/40 hover:bg-muted/40">
							{#each mappedFields as field (field.key)}
								<Table.Head class="text-xs">{field.label}</Table.Head>
							{/each}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each previewRows as row, i (i)}
							<Table.Row>
								{#each mappedFields as field (field.key)}
									<Table.Cell class="max-w-32 truncate text-xs text-muted-foreground">
										{row[mapping[field.key] ?? ''] ?? '—'}
									</Table.Cell>
								{/each}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			</div>
		</div>
	{/if}
</div>
