<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import AlertTriangleIcon from '@lucide/svelte/icons/alert-triangle';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import ClipboardListIcon from '@lucide/svelte/icons/clipboard-list';

	interface Member {
		_id: string;
		userId: string;
		role: string;
	}

	interface DriverProfile {
		licenseNumber?: string;
		licenseCategories?: string[];
		licenseExpiryDate?: string;
		licenseValidated?: boolean;
		isBlocked?: boolean;
	}

	interface DriverRow {
		member: Member;
		profile: DriverProfile | null;
		isExpiringSoon: boolean;
		isExpired: boolean;
	}

	interface Props {
		drivers: DriverRow[];
		userNames: Record<string, string>;
		userEmails: Record<string, string>;
	}

	const { drivers, userNames, userEmails }: Props = $props();

	const lang = $derived(page.params.lang as string | undefined);

	function localHref(path: string): string {
		return lang ? `/${lang}${path}` : path;
	}

	function formatExpiry(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}
</script>

<div class="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
	<table class="w-full text-sm">
		<thead>
			<tr class="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/50">
				<th class="px-4 py-3 text-left font-medium text-neutral-500">Nom</th>
				<th class="hidden px-4 py-3 text-left font-medium text-neutral-500 sm:table-cell">Email</th>
				<th class="hidden px-4 py-3 text-left font-medium text-neutral-500 md:table-cell">Permis</th>
				<th class="hidden px-4 py-3 text-left font-medium text-neutral-500 lg:table-cell">Expiration</th>
				<th class="px-4 py-3 text-left font-medium text-neutral-500">Statut</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
			{#each drivers as { member, profile, isExpiringSoon, isExpired }}
				<tr
					class="cursor-pointer transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
					onclick={() => goto(localHref(`/admin/drivers/${member.userId}`))}
				>
					<td class="px-4 py-3 font-medium">
						{userNames[member.userId] ?? member.userId.slice(0, 8)}
					</td>
					<td class="hidden px-4 py-3 text-neutral-500 sm:table-cell">
						{userEmails[member.userId] ?? '—'}
					</td>
					<td class="hidden px-4 py-3 md:table-cell">
						{#if profile?.licenseCategories?.length}
							<span class="text-neutral-700 dark:text-neutral-300">
								{profile.licenseCategories.join(', ')}
							</span>
						{:else}
							<span class="text-neutral-400">—</span>
						{/if}
					</td>
					<td class="hidden px-4 py-3 lg:table-cell">
						{#if profile?.licenseExpiryDate}
							<span
								class={isExpired
									? 'text-red-600 dark:text-red-400'
									: isExpiringSoon
										? 'text-orange-500 dark:text-orange-400'
										: 'text-neutral-600 dark:text-neutral-400'}
							>
								{formatExpiry(profile.licenseExpiryDate)}
							</span>
						{:else}
							<span class="text-neutral-400">—</span>
						{/if}
					</td>
					<td class="px-4 py-3">
						{#if profile?.isBlocked || isExpired}
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400"
							>
								<XCircleIcon class="h-3.5 w-3.5" />
								Bloqué
							</span>
						{:else if isExpiringSoon}
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
							>
								<AlertTriangleIcon class="h-3.5 w-3.5" />
								Bientôt
							</span>
						{:else if profile && !profile.licenseValidated}
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
							>
								<ClipboardListIcon class="h-3.5 w-3.5" />
								Non validé
							</span>
						{:else if profile?.licenseValidated}
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
							>
								<CheckCircle2Icon class="h-3.5 w-3.5" />
								Valide
							</span>
						{:else}
							<span
								class="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500"
							>
								<ClipboardListIcon class="h-3.5 w-3.5" />
								Incomplet
							</span>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
