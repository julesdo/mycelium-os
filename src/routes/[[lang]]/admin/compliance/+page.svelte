<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import SubscriptionGate from '$lib/components/billing/SubscriptionGate.svelte';
	import { api } from '$lib/convex/_generated/api.js';
	import { copilot } from '$lib/components/copilot/copilot-store.svelte.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import ShieldAlertIcon from '@lucide/svelte/icons/shield-alert';
	import BotIcon from '@lucide/svelte/icons/bot';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import UsersIcon from '@lucide/svelte/icons/users';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import WrenchIcon from '@lucide/svelte/icons/wrench';

	const anyApi = api as any;

	const docsQ = useQuery(anyApi.agents.compliance.toolGetVehicleDocumentStatus, { daysAhead: 60 });
	const licensesQ = useQuery(anyApi.agents.compliance.toolGetDriverLicenseStatus, {
		daysAhead: 90
	});
	const violationsQ = useQuery(anyApi.agents.compliance.toolGetUnresolvedViolations, {});
	const maintenanceQ = useQuery(anyApi.agents.compliance.toolGetMaintenanceComplianceStatus, {});
	const dashQ = useQuery(anyApi.agents.compliance.toolGetFullComplianceDashboard, {});

	const RISK_COLOR: Record<string, string> = {
		COMPLIANT: 'text-emerald-600 dark:text-emerald-400',
		LOW: 'text-yellow-600 dark:text-yellow-400',
		MEDIUM: 'text-orange-500 dark:text-orange-400',
		HIGH: 'text-destructive'
	};
	const RISK_BG: Record<string, string> = {
		COMPLIANT: 'bg-emerald-500/10 border-emerald-500/20',
		LOW: 'bg-yellow-500/10 border-yellow-500/20',
		MEDIUM: 'bg-orange-500/10 border-orange-500/20',
		HIGH: 'bg-destructive/10 border-destructive/20'
	};
	const RISK_LABEL: Record<string, string> = {
		COMPLIANT: 'Flotte conforme',
		LOW: 'Risque faible',
		MEDIUM: 'Risque modéré',
		HIGH: 'Risque élevé'
	};
</script>

<SubscriptionGate feature="compliance" requiredPlan="professional">
	<div class="space-y-6 px-4 py-6 md:px-6">
		<!-- Header -->
		<div class="flex items-start justify-between gap-4">
			<div>
				<h1 class="text-xl font-semibold">Conformité réglementaire</h1>
				<p class="mt-0.5 text-sm text-muted-foreground">
					Documents, permis, contraventions, maintenance.
				</p>
			</div>
			<Button onclick={() => copilot.open('compliance')} class="shrink-0 gap-2">
				<BotIcon class="size-4" />
				Compliance Officer IA
			</Button>
		</div>

		<!-- Risk banner -->
		{#if dashQ.isLoading}
			<Skeleton class="h-16 w-full rounded-xl" />
		{:else if dashQ.data}
			{@const d = dashQ.data}
			<div
				class={['flex items-center gap-4 rounded-xl border p-4', RISK_BG[d.riskLevel] ?? ''].join(
					' '
				)}
			>
				{#if d.riskLevel === 'COMPLIANT'}
					<ShieldCheckIcon class="size-8 shrink-0 text-emerald-500" />
				{:else}
					<ShieldAlertIcon class={['size-8 shrink-0', RISK_COLOR[d.riskLevel] ?? ''].join(' ')} />
				{/if}
				<div class="flex-1">
					<p class={['text-base font-semibold', RISK_COLOR[d.riskLevel] ?? ''].join(' ')}>
						{RISK_LABEL[d.riskLevel] ?? d.riskLevel}
					</p>
					<p class="text-xs text-muted-foreground">
						Score {d.riskScore} — {d.summary.vehiclesChecked} véhicules · {d.summary.driversChecked} conducteurs
						· {d.currentDate}
					</p>
				</div>
				{#if d.riskLevel !== 'COMPLIANT'}
					<Button
						variant="outline"
						size="sm"
						onclick={() => copilot.open('compliance')}
						class="shrink-0"
					>
						Analyser avec IA
					</Button>
				{/if}
			</div>
		{/if}

		<!-- KPI grid -->
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{#if docsQ.isLoading || licensesQ.isLoading || violationsQ.isLoading || maintenanceQ.isLoading}
				{#each { length: 4 } as _, i (i)}
					<Skeleton class="h-24 rounded-xl" />
				{/each}
			{:else}
				<div class="rounded-xl border border-border/60 bg-card p-4">
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<FileTextIcon class="size-3.5" />Documents véhicules
					</div>
					<p
						class={[
							'mt-2 text-2xl font-semibold tabular-nums',
							(docsQ.data?.summary.expiredCount ?? 0) > 0 ? 'text-destructive' : ''
						].join(' ')}
					>
						{docsQ.data?.summary.expiredCount ?? '—'}
					</p>
					<p class="mt-0.5 text-xs text-muted-foreground">
						expirés · <span class="text-orange-500">{docsQ.data?.summary.expiringCount ?? '—'}</span
						> dans 60j
					</p>
				</div>
				<div class="rounded-xl border border-border/60 bg-card p-4">
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<UsersIcon class="size-3.5" />Permis conducteurs
					</div>
					<p
						class={[
							'mt-2 text-2xl font-semibold tabular-nums',
							(licensesQ.data?.summary.expiredLicenses ?? 0) > 0 ? 'text-destructive' : ''
						].join(' ')}
					>
						{licensesQ.data?.summary.expiredLicenses ?? '—'}
					</p>
					<p class="mt-0.5 text-xs text-muted-foreground">
						expirés · <span class="text-orange-500"
							>{licensesQ.data?.summary.expiringLicenses ?? '—'}</span
						>
						dans 90j
						{#if (licensesQ.data?.summary.blockedDrivers ?? 0) > 0}
							· <span class="text-destructive"
								>{licensesQ.data?.summary.blockedDrivers} bloqués</span
							>
						{/if}
					</p>
				</div>
				<div class="rounded-xl border border-border/60 bg-card p-4">
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<AlertTriangleIcon class="size-3.5" />Contraventions
					</div>
					<p
						class={[
							'mt-2 text-2xl font-semibold tabular-nums',
							(violationsQ.data?.summary.total ?? 0) > 0 ? 'text-orange-500' : ''
						].join(' ')}
					>
						{violationsQ.data?.summary.total ?? '—'}
					</p>
					<p class="mt-0.5 text-xs text-muted-foreground">
						en attente · {(violationsQ.data?.summary.totalFinesAmount ?? 0).toLocaleString(
							'fr-FR',
							{ style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }
						)}
					</p>
				</div>
				<div class="rounded-xl border border-border/60 bg-card p-4">
					<div class="flex items-center gap-2 text-xs text-muted-foreground">
						<WrenchIcon class="size-3.5" />Maintenance en retard
					</div>
					<p
						class={[
							'mt-2 text-2xl font-semibold tabular-nums',
							(maintenanceQ.data?.summary.overdueRecords ?? 0) > 0 ? 'text-orange-500' : ''
						].join(' ')}
					>
						{maintenanceQ.data?.summary.overdueRecords ?? '—'}
					</p>
					<p class="mt-0.5 text-xs text-muted-foreground">entretiens en retard</p>
				</div>
			{/if}
		</div>

		<!-- Documents expirés -->
		{#if docsQ.data?.expired && docsQ.data.expired.length > 0}
			<div class="space-y-2">
				<h2 class="flex items-center gap-2 text-sm font-semibold">
					<span class="size-2 rounded-full bg-destructive"></span>
					Documents expirés ({docsQ.data.expired.length})
				</h2>
				<div
					class="divide-y divide-border/50 overflow-hidden rounded-xl border border-destructive/20 bg-destructive/5"
				>
					{#each docsQ.data.expired.slice(0, 8) as item (item.vehicle + item.document)}
						<div class="flex items-center justify-between px-4 py-2.5">
							<div>
								<p class="text-sm font-medium">{item.vehicle}</p>
								<p class="text-xs text-muted-foreground">{item.document}</p>
							</div>
							<Badge variant="destructive" class="text-[10px]"
								>{item.expiredDaysAgo}j de retard</Badge
							>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Documents expirant bientôt -->
		{#if docsQ.data?.expiring && docsQ.data.expiring.length > 0}
			<div class="space-y-2">
				<h2 class="flex items-center gap-2 text-sm font-semibold">
					<span class="size-2 rounded-full bg-orange-500"></span>
					Expirant dans 60 jours ({docsQ.data.expiring.length})
				</h2>
				<div
					class="divide-y divide-border/50 overflow-hidden rounded-xl border border-orange-500/20 bg-orange-500/5"
				>
					{#each docsQ.data.expiring as item (item.vehicle + item.document)}
						<div class="flex items-center justify-between px-4 py-2.5">
							<div>
								<p class="text-sm font-medium">{item.vehicle}</p>
								<p class="text-xs text-muted-foreground">{item.document} · {item.date}</p>
							</div>
							<Badge
								variant="outline"
								class={[
									'text-[10px]',
									item.daysLeft <= 14 ? 'border-orange-500/40 text-orange-500' : ''
								].join(' ')}
							>
								{item.daysLeft}j
							</Badge>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Alertes conducteurs -->
		{#if licensesQ.data && (licensesQ.data.expired.length > 0 || licensesQ.data.blocked.length > 0 || licensesQ.data.expiring.length > 0)}
			<div class="space-y-2">
				<h2 class="flex items-center gap-2 text-sm font-semibold">
					<UsersIcon class="size-3.5" />Alertes conducteurs
				</h2>
				<div
					class="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 bg-card"
				>
					{#each licensesQ.data.blocked as d (d.driver + 'b')}
						<div class="flex items-center justify-between px-4 py-2.5">
							<p class="text-sm font-medium">{d.driver}</p>
							<Badge variant="destructive" class="text-[10px]">Bloqué — {d.reason}</Badge>
						</div>
					{/each}
					{#each licensesQ.data.expired as d (d.driver + 'e')}
						<div class="flex items-center justify-between px-4 py-2.5">
							<p class="text-sm font-medium">{d.driver}</p>
							<Badge variant="destructive" class="text-[10px]"
								>Permis expiré il y a {d.expiredDaysAgo}j</Badge
							>
						</div>
					{/each}
					{#each licensesQ.data.expiring.slice(0, 5) as d (d.driver + 'x')}
						<div class="flex items-center justify-between px-4 py-2.5">
							<p class="text-sm font-medium">{d.driver}</p>
							<Badge variant="outline" class="text-[10px]">Permis dans {d.daysLeft}j</Badge>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Compliant state -->
		{#if dashQ.data?.riskLevel === 'COMPLIANT'}
			<div
				class="flex flex-col items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 py-12 text-center"
			>
				<ShieldCheckIcon class="size-12 text-emerald-500" />
				<p class="text-base font-semibold text-emerald-600 dark:text-emerald-400">
					Flotte conforme
				</p>
				<p class="max-w-sm text-sm text-muted-foreground">
					Aucun document expiré, permis valides, pas de contravention en attente.
				</p>
			</div>
		{/if}

		<!-- AI nudge -->
		<div class="rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-4">
			<div class="flex items-start gap-3">
				<BotIcon class="mt-0.5 size-4 shrink-0 text-[var(--brand)]" />
				<div class="flex-1">
					<p class="text-sm font-medium">Compliance Officer IA</p>
					<p class="mt-0.5 text-xs text-muted-foreground">
						Questions en langage naturel : « Quels véhicules ont un CT expiré ? », « Résume les
						risques de conformité », « Calcule le BiK UK de notre flotte ».
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onclick={() => copilot.open('compliance')}
					class="shrink-0">Ouvrir</Button
				>
			</div>
		</div>
	</div>
</SubscriptionGate>
