<script lang="ts">
	/* eslint-disable @typescript-eslint/consistent-type-imports */
	import { onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import ArrowUpRightIcon from '@lucide/svelte/icons/arrow-up-right';
	import RadioIcon from '@lucide/svelte/icons/radio';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';

	interface Vehicle {
		_id: string;
		brand: string;
		model: string;
		registration: string;
		status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';
		site: string | null;
		latitude: number | null;
		longitude: number | null;
		lastSync: number | null;
		smartcarLinked: boolean;
	}

	interface SiteData {
		site: string;
		total: number;
		available: number;
		inUse: number;
		maintenance: number;
		retired: number;
	}

	interface Props {
		vehicles: Vehicle[];
		sites: SiteData[];
		loading?: boolean;
		href?: string;
	}

	let { vehicles, sites, loading = false, href }: Props = $props();

	const gpsVehicles = $derived(vehicles.filter((v) => v.latitude !== null && v.longitude !== null));
	const pendingSync = $derived(vehicles.filter((v) => v.smartcarLinked && v.latitude === null));

	function statusColor(status: string): string {
		if (status === 'AVAILABLE') return '#4ade80';
		if (status === 'IN_USE') return '#60a5fa';
		if (status === 'MAINTENANCE') return '#fb923c';
		return '#6b7280';
	}

	function statusLabel(status: string): string {
		if (status === 'AVAILABLE') return 'Disponible';
		if (status === 'IN_USE') return 'En cours';
		if (status === 'MAINTENANCE') return 'Maintenance';
		return 'Retiré';
	}

	function healthColor(s: SiteData): string {
		const ratio = s.total > 0 ? s.available / s.total : 0;
		if (s.maintenance > 0 && ratio < 0.3) return 'oklch(0.62 0.22 25)';
		if (ratio >= 0.6) return 'oklch(0.72 0.17 145)';
		if (ratio >= 0.3) return 'oklch(0.78 0.20 70)';
		return 'oklch(0.62 0.22 25)';
	}

	function availPct(s: SiteData) {
		return s.total > 0 ? Math.round((s.available / s.total) * 100) : 0;
	}

	// Map state
	let mapContainer = $state<HTMLDivElement>(null!);
	let mapReady = $state(false);
	let mapInstance: import('maplibre-gl').Map | null = null;
	let popupInstance: import('maplibre-gl').Popup | null = null;
	let PopupClass: typeof import('maplibre-gl').Popup | null = null;

	const SOURCE_ID = 'fleet-vehicles';
	const LAYER_CIRCLES = 'fleet-circles';
	const LAYER_HALO = 'fleet-halo';

	// Map tile style — CARTO Positron (no API key, reliable CDN)
	const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';

	function buildGeoJSON(vList: Vehicle[]): GeoJSON.FeatureCollection {
		return {
			type: 'FeatureCollection',
			features: vList.map((v) => ({
				type: 'Feature',
				properties: {
					id: v._id,
					brand: v.brand,
					model: v.model,
					registration: v.registration,
					status: v.status,
					site: v.site ?? '—'
				},
				geometry: {
					type: 'Point',
					coordinates: [v.longitude!, v.latitude!]
				}
			}))
		};
	}

	function setupLayers(map: import('maplibre-gl').Map) {
		if (map.getLayer(LAYER_CIRCLES)) map.removeLayer(LAYER_CIRCLES);
		if (map.getLayer(LAYER_HALO)) map.removeLayer(LAYER_HALO);
		if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);

		map.addSource(SOURCE_ID, {
			type: 'geojson',
			data: buildGeoJSON(gpsVehicles)
		});

		map.addLayer({
			id: LAYER_HALO,
			type: 'circle',
			source: SOURCE_ID,
			paint: {
				'circle-radius': 16,
				'circle-color': [
					'match',
					['get', 'status'],
					'AVAILABLE',
					'#4ade80',
					'IN_USE',
					'#60a5fa',
					'MAINTENANCE',
					'#fb923c',
					'#6b7280'
				],
				'circle-opacity': 0.18,
				'circle-stroke-width': 0
			}
		});

		map.addLayer({
			id: LAYER_CIRCLES,
			type: 'circle',
			source: SOURCE_ID,
			paint: {
				'circle-radius': 7,
				'circle-color': [
					'match',
					['get', 'status'],
					'AVAILABLE',
					'#4ade80',
					'IN_USE',
					'#60a5fa',
					'MAINTENANCE',
					'#fb923c',
					'#6b7280'
				],
				'circle-stroke-width': 2,
				'circle-stroke-color': '#ffffff',
				'circle-opacity': 0.95
			}
		});

		map.on('click', LAYER_CIRCLES, (e) => {
			if (!e.features?.length || !PopupClass) return;
			const f = e.features[0]!;
			const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
			const status = f.properties!.status as string;

			const html = `
				<div style="min-width:160px;padding:6px 2px">
					<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
						<span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${statusColor(status)}"></span>
						<span style="font-size:12px;font-weight:600">${f.properties!.brand} ${f.properties!.model}</span>
					</div>
					<p style="font-size:11px;font-family:monospace;color:#666;margin:0 0 2px">${f.properties!.registration}</p>
					<p style="font-size:11px;color:#888;margin:0 0 8px">${f.properties!.site}</p>
					<span style="display:inline-flex;align-items:center;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:600;background:${statusColor(status)}22;color:${statusColor(status)}">${statusLabel(status)}</span>
				</div>`;

			popupInstance?.remove();
			popupInstance = new PopupClass({ closeButton: true, closeOnClick: false, offset: 14 })
				.setLngLat(coords)
				.setHTML(html)
				.addTo(map);
		});

		map.on('mouseenter', LAYER_CIRCLES, () => {
			map.getCanvas().style.cursor = 'pointer';
		});
		map.on('mouseleave', LAYER_CIRCLES, () => {
			map.getCanvas().style.cursor = '';
		});
	}

	let mapInitialized = $state(false);

	// Use $effect instead of onMount so this re-runs when mapContainer becomes
	// available — onMount fires once at initial render when loading=true, at which
	// point mapContainer is null (its div is inside the {:else} block).
	$effect(() => {
		const container = mapContainer; // read synchronously so Svelte tracks it
		if (!browser || !container || mapInitialized) return;
		mapInitialized = true;

		void (async () => {
			const { Map, Popup } = await import('maplibre-gl');
			import('maplibre-gl/dist/maplibre-gl.css').catch(() => {});
			PopupClass = Popup;

			const center = ((): [number, number] => {
				const vl = gpsVehicles;
				if (vl.length === 0) return [2.3488, 48.8534];
				return [
					vl.reduce((s, v) => s + v.longitude!, 0) / vl.length,
					vl.reduce((s, v) => s + v.latitude!, 0) / vl.length
				];
			})();

			mapInstance = new Map({
				container,
				style: MAP_STYLE,
				center,
				zoom: gpsVehicles.length === 0 ? 4 : gpsVehicles.length === 1 ? 12 : 6,
				fadeDuration: 0,
				renderWorldCopies: false,
				attributionControl: { compact: true }
			});

			mapInstance.on('load', () => {
				mapReady = true;
				requestAnimationFrame(() => mapInstance?.resize());
				setupLayers(mapInstance!);
			});

			mapInstance.on('error', (e) => {
				console.warn('[map] error:', e.error?.message ?? e);
				if (!mapReady) {
					mapReady = true;
					requestAnimationFrame(() => mapInstance?.resize());
				}
			});

			// Hard timeout — never spin forever
			setTimeout(() => {
				if (!mapReady) mapReady = true;
			}, 8000);
		})();
	});

	// Update source data reactively when gpsVehicles changes
	$effect(() => {
		if (!mapReady || !mapInstance) return;
		const vl = gpsVehicles; // track
		const source = mapInstance.getSource(SOURCE_ID) as
			| import('maplibre-gl').GeoJSONSource
			| undefined;
		if (source) source.setData(buildGeoJSON(vl));
	});

	onDestroy(() => {
		popupInstance?.remove();
		mapInstance?.remove();
		mapInstance = null;
	});
</script>

<div class="relative overflow-hidden rounded-2xl bg-card" data-slot="card">
	<!-- Glass top highlight -->
	<div
		class="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-linear-to-r from-transparent via-white/70 to-transparent dark:via-white/8"
	></div>

	<div class="flex flex-col @4xl/main:flex-row">
		<!-- MAP PANEL — fixed height on mobile, flex-stretch on desktop -->
		<div class="relative h-[280px] flex-1 @4xl/main:h-auto">
			{#if loading}
				<div
					class="absolute inset-0 animate-pulse rounded-t-2xl bg-muted @4xl/main:rounded-l-2xl @4xl/main:rounded-tr-none"
				></div>
			{:else}
				<!-- Map canvas container — must be absolute inset-0 so height is guaranteed -->
				<div
					class="absolute inset-0 overflow-hidden rounded-t-2xl @4xl/main:rounded-l-2xl @4xl/main:rounded-tr-none"
				>
					<div bind:this={mapContainer} class="h-full w-full"></div>

					<!-- Loading spinner until MapLibre 'load' fires -->
					{#if !mapReady}
						<div
							class="absolute inset-0 flex items-center justify-center bg-muted/50 backdrop-blur-sm"
						>
							<div class="flex gap-1.5">
								<span class="size-1.5 animate-pulse rounded-full bg-muted-foreground/50"></span>
								<span
									class="size-1.5 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:150ms]"
								></span>
								<span
									class="size-1.5 animate-pulse rounded-full bg-muted-foreground/50 [animation-delay:300ms]"
								></span>
							</div>
						</div>
					{/if}
				</div>

				<!-- Bottom overlays (above map) -->
				<div class="absolute right-3 bottom-3 left-3 z-10 flex items-end justify-between gap-2">
					{#if gpsVehicles.length > 0}
						<div
							class="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/90 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur"
						>
							<RadioIcon class="size-2.5 text-emerald-500" />
							{gpsVehicles.length} véhicule{gpsVehicles.length > 1 ? 's' : ''} localisé{gpsVehicles.length >
							1
								? 's'
								: ''}
						</div>
					{:else if pendingSync.length > 0}
						<div
							class="flex items-center gap-1.5 rounded-full border border-border/50 bg-card/80 px-2.5 py-1 text-[10px] text-muted-foreground/70 backdrop-blur"
						>
							<MapPinIcon class="size-2.5" />
							GPS non disponible — sync requis
						</div>
					{:else}
						<div
							class="flex items-center gap-1.5 rounded-full border border-border/40 bg-card/80 px-2.5 py-1 text-[10px] text-muted-foreground/60 backdrop-blur"
						>
							<MapPinIcon class="size-2.5" />
							Connectez Smartcar pour la localisation
						</div>
					{/if}

					<!-- eslint-disable svelte/no-navigation-without-resolve -->
					<a
						href="./fleet"
						class="flex items-center gap-1.5 rounded-full border border-border/60 bg-card/90 px-2.5 py-1 text-[10px] font-medium text-muted-foreground backdrop-blur transition-colors hover:bg-card hover:text-foreground"
						title="Connecter via Smartcar dans la fiche véhicule"
					>
						<RefreshCwIcon class="size-2.5" />
						Sync
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve -->
				</div>

				{#if gpsVehicles.length === 0 && pendingSync.length === 0 && mapReady}
					<div
						class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/10"
					>
						<MapPinIcon class="size-7 text-muted-foreground/20" />
					</div>
				{/if}
			{/if}
		</div>

		<!-- SITE LIST PANEL — min-h forces the flex container to stretch the map panel too -->
		<div
			class="flex w-full flex-col px-5 py-4 @4xl/main:min-h-[320px] @4xl/main:w-[220px] @4xl/main:shrink-0 @4xl/main:border-l @4xl/main:border-border/50"
		>
			<div class="mb-3 flex items-center justify-between">
				<div>
					<h2 class="text-sm font-semibold text-foreground">Sites</h2>
					<p class="text-[11px] text-muted-foreground">
						{#if !loading}
							{sites.length} site{sites.length > 1 ? 's' : ''} · {sites.reduce(
								(a, s) => a + s.total,
								0
							)} véhicules
						{:else}
							Chargement…
						{/if}
					</p>
				</div>
				{#if href}
					<!-- eslint-disable svelte/no-navigation-without-resolve, local/no-hardcoded-aria-label -->
					<a
						{href}
						class="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
						aria-label="Voir la flotte"
					>
						<ArrowUpRightIcon class="size-3" />
					</a>
					<!-- eslint-enable svelte/no-navigation-without-resolve, local/no-hardcoded-aria-label -->
				{/if}
			</div>

			{#if loading}
				<div class="flex flex-col gap-2">
					{#each Array(3) as _, i (i)}
						<div
							class="h-9 animate-pulse rounded-lg bg-muted"
							style="animation-delay: {i * 60}ms"
						></div>
					{/each}
				</div>
			{:else if sites.length === 0}
				<div class="flex flex-1 flex-col items-center justify-center gap-1.5 py-6 text-center">
					<MapPinIcon class="size-6 text-muted-foreground/30" />
					<p class="text-[11px] text-muted-foreground/70">
						Aucun site.<br />Ajoutez un emplacement<br />à vos véhicules.
					</p>
				</div>
			{:else}
				<div class="flex flex-col gap-1">
					{#each sites as s, i (s.site)}
						<div
							class="group flex animate-enter-blur-up flex-col gap-1 rounded-xl px-2.5 py-2 transition-colors hover:bg-muted/50"
							style="--enter-delay: {i * 35}ms"
						>
							<div class="flex items-center gap-2">
								<span class="size-1.5 shrink-0 rounded-full" style="background: {healthColor(s)}"
								></span>
								<span class="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground"
									>{s.site}</span
								>
								<span class="shrink-0 text-[11px] font-bold text-foreground tabular-nums"
									>{s.total}</span
								>
							</div>
							<div class="relative ml-3.5 h-1 overflow-hidden rounded-full bg-muted">
								<div
									class="absolute inset-y-0 left-0 rounded-full"
									style="width: {s.total > 0
										? (s.available / s.total) * 100
										: 0}%; background: oklch(0.72 0.17 145); opacity: 0.85"
								></div>
								<div
									class="absolute inset-y-0 rounded-full"
									style="left: {s.total > 0 ? (s.available / s.total) * 100 : 0}%; width: {s.total >
									0
										? (s.inUse / s.total) * 100
										: 0}%; background: oklch(0.62 0.19 248); opacity: 0.85"
								></div>
								<div
									class="absolute inset-y-0 rounded-full"
									style="left: {s.total > 0
										? ((s.available + s.inUse) / s.total) * 100
										: 0}%; width: {s.total > 0
										? (s.maintenance / s.total) * 100
										: 0}%; background: oklch(0.78 0.20 70); opacity: 0.85"
								></div>
							</div>
							<p class="ml-3.5 text-[10px] text-muted-foreground/70 tabular-nums">
								{availPct(s)}% dispo
							</p>
						</div>
					{/each}
				</div>

				<div
					class="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border/40 pt-3"
				>
					{#each [{ label: 'Dispo', color: 'oklch(0.72 0.17 145)' }, { label: 'En cours', color: 'oklch(0.62 0.19 248)' }, { label: 'Maint.', color: 'oklch(0.78 0.20 70)' }] as leg (leg.label)}
						<div class="flex items-center gap-1">
							<span class="size-1.5 rounded-sm" style="background: {leg.color}; opacity: 0.85"
							></span>
							<span class="text-[10px] text-muted-foreground">{leg.label}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
