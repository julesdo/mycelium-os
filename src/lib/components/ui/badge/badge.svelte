<script lang="ts" module>
	import { type VariantProps, tv } from 'tailwind-variants';

	export const badgeVariants = tv({
		base: 'inline-flex w-fit shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-full border border-transparent px-2 py-0.5 text-[11px] font-semibold transition-all has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&>svg]:size-3! focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] [&>svg]:pointer-events-none gap-1',
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground shadow-glass-btn [a]:hover:bg-primary/85',
				secondary:
					'bg-secondary text-secondary-foreground shadow-glass-outline [a]:hover:bg-secondary/80',
				destructive:
					'bg-destructive/10 text-destructive dark:bg-destructive/20 ring-1 ring-inset ring-destructive/15 shadow-[0_1px_2px_oklch(0_0_0/0.08),inset_0_1px_0_oklch(1_0_0/0.20)] dark:shadow-[0_1px_4px_oklch(0_0_0/0.35),inset_0_1px_0_oklch(1_0_0/0.08)] [a]:hover:bg-destructive/20',
				outline:
					'border-border text-foreground bg-card/60 backdrop-blur-sm shadow-glass-outline [a]:hover:bg-muted',
				ghost:
					'bg-muted/60 text-muted-foreground shadow-[inset_0_1px_0_oklch(1_0_0/0.50),0_0_0_1px_oklch(0_0_0/0.04)] dark:shadow-[inset_0_1px_0_oklch(1_0_0/0.06),0_0_0_1px_oklch(1_0_0/0.06)] hover:bg-muted hover:text-foreground',
				success:
					'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20 shadow-[0_1px_2px_oklch(0_0_0/0.06),inset_0_1px_0_oklch(1_0_0/0.22)]',
				warning:
					'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20 shadow-[0_1px_2px_oklch(0_0_0/0.06),inset_0_1px_0_oklch(1_0_0/0.22)]',
				link:
					'text-primary underline-offset-4 hover:underline'
			}
		},
		defaultVariants: {
			variant: 'default'
		}
	});

	export type BadgeVariant = VariantProps<typeof badgeVariants>['variant'];
</script>

<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		href,
		class: className,
		variant = 'default',
		children,
		...restProps
	}: WithElementRef<HTMLAnchorAttributes> & {
		variant?: BadgeVariant;
	} = $props();
</script>

<svelte:element
	this={href ? 'a' : 'span'}
	bind:this={ref}
	data-slot="badge"
	{href}
	class={cn(badgeVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</svelte:element>
