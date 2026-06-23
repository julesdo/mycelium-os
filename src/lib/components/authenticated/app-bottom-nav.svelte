<script lang="ts">
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils';
	import type { SidebarConfig } from './types';

	interface Props {
		config: SidebarConfig;
	}

	let { config }: Props = $props();

	const navItems = $derived(
		config.navItems.filter((item) => !item.divider && item.url).slice(0, 4)
	);
</script>

<!--
	In-flow bottom nav (not fixed) so the flex layout correctly allocates space.
	Hidden on md+ — desktop uses the topbar.
-->
<nav
	class="shrink-0 md:hidden"
	aria-label="Navigation principale"
>
	<div
		class="border-t border-border/40 bg-background/85 backdrop-blur-xl"
		style="padding-bottom: env(safe-area-inset-bottom, 0px)"
	>
		<div class="flex h-[60px] items-stretch">
			{#each navItems as item (item.translationKey)}
				{#if item.url}
					<a
						href={resolve(item.url)}
						class={cn(
							'relative flex flex-1 flex-col items-center justify-center gap-0.5 px-1 transition-all duration-200 focus:outline-none',
							item.isActive ? 'text-foreground' : 'text-muted-foreground'
						)}
						aria-current={item.isActive ? 'page' : undefined}
					>
						<!-- Icon pill -->
						<div
							class={cn(
								'flex size-9 items-center justify-center rounded-2xl transition-all duration-200',
								item.isActive
									? 'bg-[var(--brand)] shadow-sm'
									: 'group-hover:bg-muted/60'
							)}
						>
							{#if item.icon}
								<item.icon
									class={cn(
										'size-[18px] transition-all duration-200',
										item.isActive
											? 'text-[var(--brand-foreground)]'
											: 'text-muted-foreground'
									)}
								/>
							{/if}
						</div>

						<!-- Label -->
						<span
							class={cn(
								'text-[9.5px] font-medium leading-none transition-all duration-200',
								item.isActive ? 'font-semibold text-foreground' : 'text-muted-foreground/70'
							)}
						>
							{item.shortLabel ?? ''}
						</span>
					</a>
				{/if}
			{/each}
		</div>
	</div>
</nav>
