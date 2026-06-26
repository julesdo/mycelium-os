<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { useConvexClient } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';
	import TerminalIcon from '@lucide/svelte/icons/terminal';
	import LoaderCircleIcon from '@lucide/svelte/icons/loader-circle';

	// Only renders when isDev === true (no PADDLE_API_KEY)

	const billingQ = useQuery((api as any).billing.getBillingStatus, {});
	const convexClient = useConvexClient();

	const status = $derived(billingQ.data);
	const show = $derived(status?.isDev === true && status?.tier !== 'dev');

	let loading = $state(false);

	async function activate() {
		loading = true;
		try {
			await convexClient.mutation((api as any).billing.activateDevPlan, {});
			toast.success('Plan dev activé — accès illimité à toutes les fonctionnalités.');
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Erreur');
		} finally {
			loading = false;
		}
	}
</script>

{#if show}
	<div
		class="rounded-lg border border-dashed border-[var(--brand)]/40 bg-[var(--brand)]/5 px-4 py-3"
	>
		<div class="flex items-center gap-3">
			<TerminalIcon class="size-4 shrink-0 text-[var(--brand)]" />
			<div class="min-w-0 flex-1">
				<p class="text-xs font-medium text-foreground">Mode développement détecté</p>
				<p class="text-[11px] text-muted-foreground">
					Aucune clé Paddle configurée. Activez le plan dev pour accéder à toutes les
					fonctionnalités sans limite.
				</p>
			</div>
			<Button size="sm" class="h-7 shrink-0 px-3 text-xs" onclick={activate} disabled={loading}>
				{#if loading}<LoaderCircleIcon class="mr-1.5 size-3 motion-safe:animate-spin" />{/if}
				Activer plan dev
			</Button>
		</div>
	</div>
{/if}
