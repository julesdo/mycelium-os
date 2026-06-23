import { getContext } from 'svelte';
import type MapLibreGL from 'maplibre-gl';

interface MapContext {
	getMap: () => MapLibreGL.Map | null;
	isLoaded: () => boolean;
	isStyleReady: () => boolean;
}

export function useMap() {
	const ctx = getContext<MapContext>('map');

	// Children render only after hasInitiallyLoaded (Map.svelte guards with {#if hasInitiallyLoaded})
	// so these values are already set when this hook is called.
	return {
		get map() { return ctx?.getMap() ?? null; },
		get isLoaded() { return ctx?.isLoaded() ?? false; },
		get isStyleReady() { return ctx?.isStyleReady() ?? false; },
	};
}
