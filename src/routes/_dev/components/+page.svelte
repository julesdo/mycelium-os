<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Textarea } from '$lib/components/ui/textarea/index.js';
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import { Switch } from '$lib/components/ui/switch/index.js';
	import { Badge, badgeVariants } from '$lib/components/ui/badge/index.js';
	import {
		Avatar,
		AvatarImage,
		AvatarFallback
	} from '$lib/components/ui/avatar/index.js';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs/index.js';
	import {
		Skeleton
	} from '$lib/components/ui/skeleton/index.js';
	import { EmptyState } from '$lib/components/ui/empty-state/index.js';
	import { LoadingSpinner } from '$lib/components/ui/loading-spinner/index.js';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter,
		DialogTrigger
	} from '$lib/components/ui/dialog/index.js';
	import {
		Tooltip,
		TooltipContent,
		TooltipTrigger,
		TooltipProvider
	} from '$lib/components/ui/tooltip/index.js';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { toast } from 'svelte-sonner';

	let loading = $state(false);
	let checked = $state(false);
	let switchOn = $state(false);
	let inputValue = $state('');

	function simulateLoading() {
		loading = true;
		setTimeout(() => (loading = false), 2000);
	}

	const section = 'mb-12';
	const sectionTitle = 'mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground';
	const row = 'flex flex-wrap items-center gap-3';
</script>

<Toaster />

<div class="min-h-screen bg-background p-8 md:p-12">
	<h1 class="mb-2 text-2xl font-semibold text-foreground">Mycelium UI — Composants</h1>
	<p class="mb-10 text-sm text-muted-foreground">Page de démo — /src/routes/_dev/components</p>

	<!-- BUTTON -->
	<section class={section}>
		<p class={sectionTitle}>Button — Variants</p>
		<div class={row}>
			<Button variant="default">Default</Button>
			<Button variant="secondary">Secondary</Button>
			<Button variant="outline">Outline</Button>
			<Button variant="ghost">Ghost</Button>
			<Button variant="destructive">Destructive</Button>
			<Button variant="danger">Danger</Button>
			<Button variant="success">Success</Button>
			<Button variant="link">Link</Button>
		</div>

		<p class="{sectionTitle} mt-6">Button — Sizes</p>
		<div class={row}>
			<Button size="xs">XSmall</Button>
			<Button size="sm">Small</Button>
			<Button>Default</Button>
			<Button size="lg">Large</Button>
		</div>

		<p class="{sectionTitle} mt-6">Button — States</p>
		<div class={row}>
			<Button disabled>Disabled</Button>
			<Button loading={true}>Loading</Button>
			<Button {loading} onclick={simulateLoading}>
				{loading ? 'Sauvegarde...' : 'Sauvegarder'}
			</Button>
		</div>
	</section>

	<!-- INPUT -->
	<section class={section}>
		<p class={sectionTitle}>Input</p>
		<div class="flex flex-col gap-3 max-w-sm">
			<Input type="text" placeholder="Texte libre" bind:value={inputValue} />
			<Input type="email" placeholder="email@exemple.com" />
			<Input type="password" placeholder="Mot de passe" />
			<Input type="number" placeholder="0" />
			<Input placeholder="Avec erreur" aria-invalid="true" />
			<Input placeholder="Désactivé" disabled />
		</div>
	</section>

	<!-- TEXTAREA -->
	<section class={section}>
		<p class={sectionTitle}>Textarea</p>
		<div class="max-w-sm">
			<Textarea placeholder="Votre message..." rows={4} />
		</div>
	</section>

	<!-- CHECKBOX & SWITCH -->
	<section class={section}>
		<p class={sectionTitle}>Checkbox & Switch</p>
		<div class={row}>
			<label class="flex items-center gap-2 text-sm text-foreground">
				<Checkbox bind:checked id="chk1" />
				Accepter les conditions
			</label>
			<label class="flex items-center gap-2 text-sm text-foreground">
				<Checkbox checked={true} disabled id="chk2" />
				Coché (désactivé)
			</label>
		</div>
		<div class="{row} mt-4">
			<label class="flex items-center gap-2 text-sm text-foreground">
				<Switch bind:checked={switchOn} id="sw1" />
				{switchOn ? 'Activé' : 'Désactivé'}
			</label>
			<label class="flex items-center gap-2 text-sm text-foreground">
				<Switch checked={true} disabled id="sw2" />
				Toujours activé (désactivé)
			</label>
		</div>
	</section>

	<!-- BADGE -->
	<section class={section}>
		<p class={sectionTitle}>Badge</p>
		<div class={row}>
			<Badge>Default</Badge>
			<Badge variant="secondary">Secondary</Badge>
			<Badge variant="destructive">Destructive</Badge>
			<Badge variant="outline">Outline</Badge>
		</div>
	</section>

	<!-- AVATAR -->
	<section class={section}>
		<p class={sectionTitle}>Avatar</p>
		<div class={row}>
			<Avatar>
				<AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
				<AvatarFallback>SC</AvatarFallback>
			</Avatar>
			<Avatar>
				<AvatarFallback>JD</AvatarFallback>
			</Avatar>
			<Avatar class="size-8">
				<AvatarFallback class="text-xs">SM</AvatarFallback>
			</Avatar>
			<Avatar class="size-14">
				<AvatarFallback>LG</AvatarFallback>
			</Avatar>
		</div>
	</section>

	<!-- TABS -->
	<section class={section}>
		<p class={sectionTitle}>Tabs</p>
		<Tabs value="apercu" class="max-w-md">
			<TabsList>
				<TabsTrigger value="apercu">Aperçu</TabsTrigger>
				<TabsTrigger value="details">Détails</TabsTrigger>
				<TabsTrigger value="historique">Historique</TabsTrigger>
			</TabsList>
			<TabsContent value="apercu" class="mt-4 text-sm text-foreground">
				Contenu de l'onglet Aperçu.
			</TabsContent>
			<TabsContent value="details" class="mt-4 text-sm text-foreground">
				Contenu de l'onglet Détails.
			</TabsContent>
			<TabsContent value="historique" class="mt-4 text-sm text-foreground">
				Contenu de l'onglet Historique.
			</TabsContent>
		</Tabs>
	</section>

	<!-- SKELETON -->
	<section class={section}>
		<p class={sectionTitle}>Skeleton</p>
		<div class="flex flex-col gap-3 max-w-sm">
			<Skeleton class="h-4 w-full" />
			<Skeleton class="h-4 w-3/4" />
			<Skeleton class="h-4 w-1/2" />
			<div class="flex items-center gap-3 mt-2">
				<Skeleton class="size-10 rounded-full" />
				<div class="flex flex-col gap-2 flex-1">
					<Skeleton class="h-3 w-full" />
					<Skeleton class="h-3 w-2/3" />
				</div>
			</div>
		</div>
	</section>

	<!-- LOADING SPINNER -->
	<section class={section}>
		<p class={sectionTitle}>LoadingSpinner</p>
		<div class={row}>
			<LoadingSpinner size="xs" />
			<LoadingSpinner size="sm" />
			<LoadingSpinner size="md" />
			<LoadingSpinner size="lg" />
			<LoadingSpinner size="md" class="text-primary" label="Chargement de la flotte..." />
		</div>
	</section>

	<!-- EMPTY STATE -->
	<section class={section}>
		<p class={sectionTitle}>Empty State</p>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 max-w-2xl">
			<div class="rounded-xl border border-border">
				<EmptyState
					title="Aucun véhicule"
					description="Importez votre première flotte pour commencer."
				>
					{#snippet action()}
						<Button size="sm">Importer des véhicules</Button>
					{/snippet}
				</EmptyState>
			</div>
			<div class="rounded-xl border border-border">
				<EmptyState
					title="Aucune réservation"
					description="Vos réservations apparaîtront ici."
				/>
			</div>
		</div>
	</section>

	<!-- DIALOG -->
	<section class={section}>
		<p class={sectionTitle}>Dialog</p>
		<Dialog>
			<DialogTrigger>
				{#snippet child({ props })}
					<Button {...props}>Ouvrir le dialog</Button>
				{/snippet}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Confirmer l'action</DialogTitle>
					<DialogDescription>
						Cette action est irréversible. Êtes-vous sûr de vouloir continuer ?
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button variant="outline">Annuler</Button>
					<Button variant="danger">Confirmer</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	</section>

	<!-- TOOLTIP -->
	<section class={section}>
		<p class={sectionTitle}>Tooltip</p>
		<TooltipProvider>
			<div class={row}>
				<Tooltip>
					<TooltipTrigger>
						{#snippet child({ props })}
							<Button variant="outline" {...props}>Survolez-moi</Button>
						{/snippet}
					</TooltipTrigger>
					<TooltipContent>Taux d'utilisation = réservations actives / total véhicules</TooltipContent>
				</Tooltip>
				<Tooltip>
					<TooltipTrigger>
						{#snippet child({ props })}
							<Button variant="ghost" size="icon" aria-label="Info" {...props}>
								<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4">
									<circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
								</svg>
							</Button>
						{/snippet}
					</TooltipTrigger>
					<TooltipContent>Information complémentaire</TooltipContent>
				</Tooltip>
			</div>
		</TooltipProvider>
	</section>

	<!-- TOAST -->
	<section class={section}>
		<p class={sectionTitle}>Toast (Sonner)</p>
		<div class={row}>
			<Button variant="outline" onclick={() => toast('Message d\'information')}>
				Info
			</Button>
			<Button variant="success" onclick={() => toast.success('Opération réussie')}>
				Succès
			</Button>
			<Button variant="danger" onclick={() => toast.error('Une erreur est survenue')}>
				Erreur
			</Button>
			<Button
				variant="secondary"
				onclick={() => toast.warning('Attention, vérifiez vos données', { duration: 5000 })}
			>
				Warning (5s)
			</Button>
		</div>
	</section>
</div>
