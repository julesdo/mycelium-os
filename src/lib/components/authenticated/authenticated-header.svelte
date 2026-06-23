<script lang="ts">
	import { page } from '$app/state';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import CommandTrigger from '$lib/components/global-search/command-trigger.svelte';
	import NotificationCenter from '$lib/components/notifications/NotificationCenter.svelte';
	import { buildBreadcrumbs } from './breadcrumbs';

	interface Props {
		routePrefix: string;
		rootLabel: string;
	}

	let { routePrefix, rootLabel }: Props = $props();

	const breadcrumbs = $derived(
		buildBreadcrumbs(page.url.pathname, routePrefix, rootLabel, page.params.lang)
	);
</script>

<header
	class="flex h-12 shrink-0 items-center border-b border-border/40 bg-background"
>
	<div class="flex w-full items-center gap-3 px-4">
		<Sidebar.Trigger class="-ml-1 shrink-0" />

		<Breadcrumb.Root class="min-w-0 flex-1">
			<Breadcrumb.List class="flex-nowrap">
				{#each breadcrumbs as item, index (item.href)}
					{#if index > 0}
						<Breadcrumb.Separator class="hidden md:block" />
					{/if}
					<Breadcrumb.Item class={index === 0 ? 'hidden md:inline-flex' : ''}>
						{#if item.isLast}
							<Breadcrumb.Page class="font-medium">{item.label}</Breadcrumb.Page>
						{:else}
							<Breadcrumb.Link href={item.href} class="text-muted-foreground/70 hover:text-foreground">{item.label}</Breadcrumb.Link>
						{/if}
					</Breadcrumb.Item>
				{/each}
			</Breadcrumb.List>
		</Breadcrumb.Root>

		<div class="flex shrink-0 items-center gap-1.5">
			<CommandTrigger class="hidden md:inline-flex" />
			<NotificationCenter />
		</div>
	</div>
</header>
