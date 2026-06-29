<script lang="ts">
	// Google Favicon API — no auth, CDN-backed, same fallback used in admin integrations page
	function logoUrl(domain: string): string {
		return `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`;
	}

	const ROW1 = [
		{ name: 'Xero', domain: 'xero.com' },
		{ name: 'QuickBooks', domain: 'intuit.com' },
		{ name: 'Sage', domain: 'sage.com' },
		{ name: 'Slack', domain: 'slack.com' },
		{ name: 'Microsoft Teams', domain: 'microsoft.com' },
		{ name: 'Google Calendar', domain: 'google.com' },
		{ name: 'Smartcar', domain: 'smartcar.com' },
		{ name: 'Fortnox', domain: 'fortnox.se' },
		{ name: 'Visma', domain: 'visma.com' },
		{ name: 'FreeAgent', domain: 'freeagent.com' },
		{ name: 'Pennylane', domain: 'pennylane.com' },
		{ name: 'Webfleet', domain: 'webfleet.com' }
	];

	const ROW2 = [
		{ name: 'BambooHR', domain: 'bamboohr.com' },
		{ name: 'Shell Fleet', domain: 'shell.com' },
		{ name: 'BP Plus', domain: 'bpplus.co.uk' },
		{ name: 'Circle K', domain: 'circlek.com' },
		{ name: 'Tripletex', domain: 'tripletex.no' },
		{ name: 'e-conomic', domain: 'e-conomic.com' },
		{ name: 'HiBob', domain: 'hibob.com' },
		{ name: 'Personio', domain: 'personio.de' },
		{ name: 'Geotab', domain: 'geotab.com' },
		{ name: 'Outlook', domain: 'outlook.com' },
		{ name: 'EBP', domain: 'ebp.fr' },
		{ name: 'Allstar', domain: 'allstarcard.co.uk' }
	];

	// Duplicated tracks for seamless infinite loop
	const TRACK1 = [...ROW1, ...ROW1];
	const TRACK2 = [...ROW2, ...ROW2];
</script>

<section class="overflow-hidden py-12 sm:py-16">
	<p
		class="mb-8 text-center text-[11px] font-semibold tracking-[0.12em] text-muted-foreground/60 uppercase"
	>
		Connects with your existing tools
	</p>

	<div
		class="relative"
		style="-webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);"
	>
		<!-- Row 1 — scrolls left -->
		<div class="marquee-left mb-3 flex gap-3" style="width: max-content;">
			{#each TRACK1 as item, i (i)}
				<div
					class="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06);"
				>
					<img
						src={logoUrl(item.domain)}
						alt={item.name}
						width="16"
						height="16"
						class="size-4 rounded-sm object-contain"
						loading="lazy"
					/>
					<span class="text-xs font-medium whitespace-nowrap text-foreground/65">{item.name}</span>
				</div>
			{/each}
		</div>

		<!-- Row 2 — scrolls right -->
		<div class="marquee-right flex gap-3" style="width: max-content;">
			{#each TRACK2 as item, i (i)}
				<div
					class="flex shrink-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2"
					style="box-shadow: inset 0 1px 0 oklch(1 0 0 / 0.06);"
				>
					<img
						src={logoUrl(item.domain)}
						alt={item.name}
						width="16"
						height="16"
						class="size-4 rounded-sm object-contain"
						loading="lazy"
					/>
					<span class="text-xs font-medium whitespace-nowrap text-foreground/65">{item.name}</span>
				</div>
			{/each}
		</div>
	</div>
</section>

<style>
	.marquee-left {
		animation: marquee-left 35s linear infinite;
		will-change: transform;
	}

	.marquee-right {
		animation: marquee-right 42s linear infinite;
		will-change: transform;
	}

	@keyframes marquee-left {
		from {
			transform: translateX(0);
		}
		to {
			transform: translateX(-50%);
		}
	}

	@keyframes marquee-right {
		from {
			transform: translateX(-50%);
		}
		to {
			transform: translateX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.marquee-left,
		.marquee-right {
			animation: none;
		}
	}
</style>
