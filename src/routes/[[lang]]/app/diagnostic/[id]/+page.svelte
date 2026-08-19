<script lang="ts">
	import { useQuery } from '@mmailaender/convex-svelte';
	import { api } from '$lib/convex/_generated/api';
	import { page } from '$app/state';
	import type { Id } from '$lib/convex/_generated/dataModel';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import BarreAction from '$lib/components/egalim/app/BarreAction.svelte';
	import BoutonVoirPlus from '$lib/components/egalim/app/BoutonVoirPlus.svelte';
	import CarteTableau from '$lib/components/egalim/app/CarteTableau.svelte';
	import CarteVerre from '$lib/components/egalim/app/CarteVerre.svelte';
	import type { Famille } from '$lib/egalim/types';
	import PrinterIcon from '@lucide/svelte/icons/printer';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import MailIcon from '@lucide/svelte/icons/mail';

	const diagnosticId = $derived(page.params.id as Id<'diagnostics'>);
	const diag = useQuery(api.egalim.diagnostics.obtenirDiagnostic, () => ({ diagnosticId }));

	const FAMILLES_LISIBLES: Record<Famille, string> = {
		VIANDE: 'Viande',
		POISSON: 'Poisson',
		FRUITS_LEGUMES: 'Fruits et légumes',
		LAITIERS: 'Produits laitiers',
		EPICERIE_SECHE: 'Épicerie sèche',
		EPICERIE_APPERTISEE: 'Épicerie appertisée',
		BOISSONS: 'Boissons',
		AUTRE: 'Autre'
	};

	/** Au-delà, sur téléphone, une liste devient un mur. */
	const SEUIL_MOBILE = 5;

	let famillesOuvertes = $state(false);
	let fournisseursOuverts = $state(false);
	let attestationsOuvertes = $state(false);

	// Masquage en CSS et non en JS : tout reste dans le DOM, donc tout ressort à
	// l'impression. Les classes sont écrites en toutes lettres, sinon Tailwind ne
	// les génère pas.
	function replieBloc(index: number, ouvert: boolean): string {
		return !ouvert && index >= SEUIL_MOBILE ? 'hidden md:block' : 'block';
	}

	function euros(montant: number): string {
		return `${montant.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
	}

	function pourcent(fraction: number): string {
		return `${(fraction * 100).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
	}

	function points(valeur: number): string {
		return `${valeur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pts`;
	}

	function dateFr(ms: number): string {
		return new Date(ms).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	/** Une part n'existe pas quand il n'y a rien acheté : on ne l'invente pas. */
	function part(numerateur: number, denominateur: number): string {
		return denominateur !== 0 ? pourcent(numerateur / denominateur) : '-';
	}

	/** Les trois taux, avec leur seuil et leur écart en points. */
	const taux = $derived.by(() => {
		const d = diag.data;
		if (!d) return [];
		return [
			{
				cle: 'durable',
				titre: 'Produits durables et de qualité',
				mesure: d.ratios.durable,
				seuil: d.seuils.durable,
				ecartEuros: d.gapEuros.toDurable50
			},
			{
				cle: 'bio',
				titre: 'Produits biologiques',
				mesure: d.ratios.bio,
				seuil: d.seuils.bio,
				ecartEuros: d.gapEuros.toBio20
			},
			{
				cle: 'viandePoisson',
				titre: 'Durable sur la viande et le poisson',
				mesure: d.ratios.meatFishDurable,
				seuil: d.seuils.viandePoissonDurable,
				ecartEuros: d.gapEuros.toMeatFish60
			}
		];
	});

	function lignesMaCantine(): string[][] {
		const d = diag.data;
		if (!d) return [];
		const durableHorsBio = d.byFamily.reduce((s, f) => s + (f.durableHT - f.bioHT), 0);
		const bio = d.byFamily.reduce((s, f) => s + f.bioHT, 0);
		return [
			['Poste', 'Montant HT'],
			['Total des achats alimentaires', d.ratios.totalFoodHT.toFixed(2)],
			['Dont biologique et en conversion', bio.toFixed(2)],
			['Dont durable et de qualité hors bio', durableHorsBio.toFixed(2)],
			...d.byFamily.map((f) => [
				`Famille ${FAMILLES_LISIBLES[f.family]} : total`,
				f.totalHT.toFixed(2)
			]),
			...d.byFamily.map((f) => [
				`Famille ${FAMILLES_LISIBLES[f.family]} : dont bio`,
				f.bioHT.toFixed(2)
			]),
			...d.byFamily.map((f) => [
				`Famille ${FAMILLES_LISIBLES[f.family]} : dont durable hors bio`,
				(f.durableHT - f.bioHT).toFixed(2)
			])
		];
	}

	function telechargerSaisie() {
		const d = diag.data;
		if (!d) return;
		const csv = lignesMaCantine()
			.map((l) => l.map((c) => `"${c.replace(/"/g, '""')}"`).join(';'))
			.join('\r\n');
		// BOM UTF-8 : sans lui, Excel en français affiche les accents en charabia.
		const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `saisie-ma-cantine-${d.periodStart.slice(0, 4)}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	}

	function corpsCourrier(a: {
		supplierName: string;
		produits: string[];
		amountAtStake: number;
	}): string {
		const d = diag.data;
		if (!d) return '';
		return `Objet : demande d'attestation de labels et de certifications

Madame, Monsieur,

Dans le cadre de notre déclaration annuelle EGalim pour ${d.organizationName}, portant sur la période du ${d.periodStart} au ${d.periodEnd}, nous devons justifier la qualité des produits achetés.

Les produits suivants, que nous vous avons achetés sur cette période, portent sur nos factures une mention de label ou de certification :

${a.produits.map((p) => `  - ${p}`).join('\n')}

Ces achats représentent ${euros(a.amountAtStake)} HT sur la période.

Nous vous remercions de bien vouloir nous transmettre les attestations ou certificats correspondants (certificat de conformité biologique, homologation Label Rouge, cahier des charges AOP ou IGP, certification HVE niveau 3, certificat de pêche durable, selon les cas).

Ces documents nous sont demandés en cas de contrôle. Sans eux, ces produits ne peuvent pas être comptabilisés dans nos taux, alors même que vous nous les avez fournis.

Nous restons à votre disposition.

Cordialement,`;
	}

	async function copierCourrier(a: {
		supplierName: string;
		produits: string[];
		amountAtStake: number;
	}) {
		try {
			await navigator.clipboard.writeText(corpsCourrier(a));
			toast.success('Courrier copié. Collez-le dans votre messagerie.');
		} catch {
			toast.error('La copie a échoué. Sélectionnez le texte à la main.');
		}
	}
</script>

<svelte:head>
	<title>Diagnostic EGalim · Mycelium</title>
</svelte:head>

<div class="flex flex-col gap-5 px-4 pb-24 pt-3 lg:px-6 lg:pb-8 xl:px-8 2xl:px-16">
	{#if diag.isLoading}
		<Skeleton class="h-64 rounded-xl" />
	{:else if !diag.data}
		<p class="text-sm text-muted-foreground">Ce diagnostic est introuvable.</p>
	{:else}
		{@const d = diag.data}

		<!-- En-tête -->
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Diagnostic EGalim</h1>
				<p class="text-sm text-muted-foreground">
					{d.organizationName} · achats du
					<span class="font-mono tabular-nums">{d.periodStart}</span>
					au <span class="font-mono tabular-nums">{d.periodEnd}</span>
				</p>
				<p class="mt-1 text-xs leading-relaxed text-muted-foreground">
					Mesuré le <span class="font-mono tabular-nums">{dateFr(d.computedAt)}</span>, barème
					<span class="font-mono tabular-nums">{d.classifierVersion}</span>. Ce rapport est figé à
					cette date : une nouvelle mesure produira un nouveau diagnostic.
				</p>
			</div>
			<!-- Sur téléphone, ce bouton vit dans la barre collante du bas. -->
			<Button
				variant="outline"
				class="no-print hidden h-11 md:inline-flex"
				onclick={() => window.print()}
			>
				<PrinterIcon class="size-4" />
				Imprimer
			</Button>
		</div>

		<!-- 1. Le chiffre -->
		<section class="flex flex-col gap-3">
			<h2 class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
				Vos trois taux
			</h2>
			<!-- Un taux par ligne sur téléphone : trois colonnes de 100px ne se lisent pas. -->
			<div class="grid gap-3 md:grid-cols-3">
				{#each taux as t (t.cle)}
					{@const atteint = t.mesure >= t.seuil}
					<CarteVerre ton={atteint ? 'succes' : 'alerte'} class="rounded-3xl">
						<p class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
							{t.titre}
						</p>
						<p
							class="mt-2 font-mono text-3xl font-bold tabular-nums
								{atteint
								? 'text-emerald-600 dark:text-emerald-400'
								: 'text-amber-600 dark:text-amber-400'}"
						>
							{pourcent(t.mesure)}
						</p>
						<p class="mt-1 font-mono text-xs tabular-nums text-muted-foreground">
							seuil {pourcent(t.seuil)} · {atteint
								? 'atteint'
								: `${points((t.seuil - t.mesure) * 100)} manquants`}
						</p>
					</CarteVerre>
				{/each}
			</div>
			<p class="text-xs leading-relaxed text-muted-foreground">
				Calculés en valeur d'achat HT sur
				<span class="font-mono tabular-nums">{euros(d.ratios.totalFoodHT)}</span>
				d'achats alimentaires, sur
				<span class="font-mono tabular-nums">{euros(d.ratios.totalHT)}</span>
				d'achats au total.
			</p>
			{#if d.montantNonMesureHT !== 0}
				<p class="text-xs leading-relaxed text-amber-600 dark:text-amber-400">
					<span class="font-mono tabular-nums">{euros(d.montantNonMesureHT)}</span>
					de lignes n'ont pas pu être classées et sont exclues du calcul, plutôt que comptées comme
					non qualifiantes.
				</p>
			{/if}
		</section>

		<!-- 3. L'écart en euros -->
		<section class="flex flex-col gap-3">
			<h2 class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
				Ce que représente l'écart
			</h2>
			<CarteVerre>
				<ul class="flex flex-col gap-2 text-sm">
					{#each taux as t (t.cle)}
						<li class="leading-relaxed">
							{#if t.ecartEuros > 0}
								Pour atteindre <strong class="font-mono tabular-nums">{pourcent(t.seuil)}</strong>
								sur
								<em>{t.titre.toLowerCase()}</em>, il faut basculer
								<strong class="font-mono tabular-nums">{euros(t.ecartEuros)}</strong>
								d'achats vers des produits qualifiants.
							{:else}
								<em>{t.titre}</em> : le seuil est atteint.
							{/if}
						</li>
					{/each}
				</ul>
				<p class="mt-3 text-xs text-muted-foreground">
					Le pourcentage ne dit rien d'actionnable. L'euro, si.
				</p>
			</CarteVerre>
		</section>

		<!-- 4. Les points récupérables sans rien changer aux achats -->
		{#if d.attestations.length > 0}
			<section class="flex flex-col gap-3">
				<h2 class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
					Des points à récupérer sans changer un seul achat
				</h2>
				<CarteVerre ton="accent">
					<p class="text-sm leading-relaxed">
						Certains produits portent une mention de label sur la facture, sans le justificatif qui
						permettrait de la faire valoir en contrôle. Réclamer ces attestations à vos fournisseurs
						vaut
						<strong class="font-mono tabular-nums">
							{points(d.attestations.reduce((s, a) => s + a.pointsRecuperables, 0))}
						</strong>
						sur votre taux de durable, sans modifier une seule commande.
					</p>
				</CarteVerre>

				{#each d.attestations as a, i (a.attestationId)}
					<div class="deplie-a-l-impression {replieBloc(i, attestationsOuvertes)}">
						<CarteVerre>
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div class="min-w-0">
									<p class="text-sm font-semibold">{a.supplierName}</p>
									<p class="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
										{euros(a.amountAtStake)} · {points(a.pointsRecuperables)} récupérables
									</p>
								</div>
								<Button
									variant="outline"
									size="sm"
									class="no-print h-11 lg:h-9"
									onclick={() => copierCourrier(a)}
								>
									<CopyIcon class="size-3.5" />
									Copier le courrier
								</Button>
							</div>
							<details class="mt-3">
								<summary
									class="flex min-h-11 cursor-pointer items-center text-xs text-muted-foreground lg:min-h-0"
								>
									{a.produits.length} produit{a.produits.length > 1 ? 's' : ''} concerné{a.produits
										.length > 1
										? 's'
										: ''}
								</summary>
								<ul class="mt-2 flex flex-col gap-1">
									{#each a.produits as p (p)}
										<li class="text-xs text-muted-foreground">{p}</li>
									{/each}
								</ul>
							</details>
							<p class="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
								<MailIcon class="mt-0.5 size-3.5 shrink-0" />
								Le courrier part de votre messagerie et sous votre signature. Nous ne l'envoyons pas
								à votre place.
							</p>
						</CarteVerre>
					</div>
				{/each}

				{#if d.attestations.length > SEUIL_MOBILE}
					<BoutonVoirPlus
						class="no-print md:hidden"
						restants={d.attestations.length - SEUIL_MOBILE}
						ouvert={attestationsOuvertes}
						onbasculer={() => (attestationsOuvertes = !attestationsOuvertes)}
					/>
				{/if}
			</section>
		{/if}

		<!-- 2. D'où ça vient -->
		<section class="flex flex-col gap-3">
			<h2 class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
				D'où viennent vos achats
			</h2>

			<!-- Par famille. Sur téléphone, une ligne de tableau devient une carte. -->
			<div class="ecran-etroit-seulement flex flex-col gap-2 md:hidden">
				{#each d.byFamily as f, i (f.family)}
					<div class={replieBloc(i, famillesOuvertes)}>
						<CarteTableau
							titre={FAMILLES_LISIBLES[f.family]}
							valeurs={[
								{ cle: 'Achats HT', valeur: euros(f.totalHT) },
								{ cle: 'Dont durable', valeur: euros(f.durableHT) },
								{ cle: 'Dont bio', valeur: euros(f.bioHT) },
								{ cle: 'Part durable', valeur: part(f.durableHT, f.totalHT) }
							]}
						/>
					</div>
				{/each}
				{#if d.byFamily.length > SEUIL_MOBILE}
					<BoutonVoirPlus
						class="no-print"
						restants={d.byFamily.length - SEUIL_MOBILE}
						ouvert={famillesOuvertes}
						onbasculer={() => (famillesOuvertes = !famillesOuvertes)}
					/>
				{/if}
			</div>

			<div class="tableau-imprimable hidden overflow-x-auto rounded-xl border border-border md:block">
				<table class="w-full text-sm">
					<thead class="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
						<tr>
							<th class="px-3 py-2 text-left font-semibold">Famille</th>
							<th class="px-3 py-2 text-right font-semibold">Achats HT</th>
							<th class="px-3 py-2 text-right font-semibold">Dont durable</th>
							<th class="px-3 py-2 text-right font-semibold">Dont bio</th>
							<th class="px-3 py-2 text-right font-semibold">Part durable</th>
						</tr>
					</thead>
					<tbody>
						{#each d.byFamily as f (f.family)}
							<tr class="border-t border-border/60">
								<td class="px-3 py-2">{FAMILLES_LISIBLES[f.family]}</td>
								<td class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
									{euros(f.totalHT)}
								</td>
								<td class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
									{euros(f.durableHT)}
								</td>
								<td class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
									{euros(f.bioHT)}
								</td>
								<td class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
									{part(f.durableHT, f.totalHT)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Par fournisseur. -->
			<div class="ecran-etroit-seulement flex flex-col gap-2 md:hidden">
				{#each d.bySupplier as s, i (s.supplierName)}
					<div class={replieBloc(i, fournisseursOuverts)}>
						<CarteTableau
							titre={s.supplierName}
							valeurs={[
								{ cle: 'Achats HT', valeur: euros(s.totalHT) },
								{ cle: 'Dont durable', valeur: euros(s.durableHT) },
								{ cle: 'Part durable', valeur: part(s.durableHT, s.totalHT) }
							]}
						/>
					</div>
				{/each}
				{#if d.bySupplier.length > SEUIL_MOBILE}
					<BoutonVoirPlus
						class="no-print"
						restants={d.bySupplier.length - SEUIL_MOBILE}
						ouvert={fournisseursOuverts}
						onbasculer={() => (fournisseursOuverts = !fournisseursOuverts)}
					/>
				{/if}
			</div>

			<div class="tableau-imprimable hidden overflow-x-auto rounded-xl border border-border md:block">
				<table class="w-full text-sm">
					<thead class="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
						<tr>
							<th class="px-3 py-2 text-left font-semibold">Fournisseur</th>
							<th class="px-3 py-2 text-right font-semibold">Achats HT</th>
							<th class="px-3 py-2 text-right font-semibold">Dont durable</th>
							<th class="px-3 py-2 text-right font-semibold">Part durable</th>
						</tr>
					</thead>
					<tbody>
						{#each d.bySupplier as s (s.supplierName)}
							<tr class="border-t border-border/60">
								<td class="px-3 py-2">{s.supplierName}</td>
								<td class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
									{euros(s.totalHT)}
								</td>
								<td class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
									{euros(s.durableHT)}
								</td>
								<td class="whitespace-nowrap px-3 py-2 text-right font-mono tabular-nums">
									{part(s.durableHT, s.totalHT)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</section>

		<!-- 5. Où basculer -->
		{#if d.ouBasculer.length > 0}
			<section class="flex flex-col gap-3">
				<h2 class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
					Où il reste le plus de marge
				</h2>
				<div class="flex flex-col gap-2">
					{#each d.ouBasculer.slice(0, 3) as f (f.family)}
						<CarteVerre>
							<p class="text-sm font-semibold">{FAMILLES_LISIBLES[f.family]}</p>
							<p class="mt-1 text-[13px] leading-relaxed text-muted-foreground">
								<span class="font-mono tabular-nums">{euros(f.montantNonDurableHT)}</span>
								d'achats sans label. Les basculer entièrement vaudrait
								<span class="font-mono tabular-nums">
									{points(f.pointsSiTotalementBascule)}
								</span>
								sur votre taux de durable.
							</p>
						</CarteVerre>
					{/each}
				</div>
				<p class="text-xs leading-relaxed text-muted-foreground">
					Classement par montant basculable. Le surcoût réel dépend des prix que vos fournisseurs
					vous proposent : il se chiffre au devis, pas au tableau.
				</p>
			</section>
		{/if}

		<!-- 7. Le fichier de saisie ma cantine -->
		<section class="flex flex-col gap-3">
			<h2 class="text-[11px] font-bold uppercase tracking-[0.09em] text-muted-foreground">
				Votre saisie sur « ma cantine »
			</h2>
			<CarteVerre>
				<p class="text-sm leading-relaxed">
					Les montants à reporter dans le formulaire de télédéclaration, agrégés au format attendu.
					La déclaration reste faite et signée par votre établissement.
				</p>
				<!-- Deux colonnes : ce tableau tient sur un téléphone, il reste un tableau. -->
				<div class="mt-3 overflow-hidden rounded-lg border border-border">
					<table class="w-full text-sm">
						<tbody>
							{#each lignesMaCantine().slice(1, 4) as ligne (ligne[0])}
								<tr class="border-b border-border/60 last:border-0">
									<td class="px-3 py-2 text-[13px]">{ligne[0]}</td>
									<td class="whitespace-nowrap px-3 py-2 text-right font-mono text-[13px] tabular-nums">
										{euros(Number(ligne[1]))}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<Button variant="outline" class="no-print mt-3 h-11 w-full sm:w-auto" onclick={telechargerSaisie}>
					<DownloadIcon class="size-4" />
					Télécharger le détail par famille
				</Button>
			</CarteVerre>
		</section>

		<!-- L'action de l'écran, sous le pouce, tant qu'on est sur téléphone. -->
		<BarreAction class="no-print">
			<Button class="h-11 w-full" onclick={() => window.print()}>
				<PrinterIcon class="size-4" />
				Imprimer le rapport
			</Button>
		</BarreAction>
	{/if}
</div>

<style>
	/*
	 * Le rapport est le document que l'opérateur laisse après la restitution.
	 * Il doit sortir sur papier sans la navigation ni les boutons, et sans
	 * qu'un tableau soit coupé au milieu d'une ligne.
	 */
	@media print {
		:global(nav),
		:global(header),
		:global(aside),
		:global([data-sidebar]),
		:global(.no-print) {
			display: none !important;
		}

		:global(body) {
			background: white;
			color: black;
		}

		/*
		 * Sur papier on veut les tableaux, jamais les cartes qui les remplacent
		 * sur téléphone. La largeur de page à l'impression est imprévisible, donc
		 * on ne s'en remet pas au point de rupture `md:`.
		 */
		:global(.ecran-etroit-seulement) {
			display: none !important;
		}

		:global(.tableau-imprimable) {
			display: block !important;
			overflow: visible !important;
		}

		/* Rien ne reste replié sur le papier. */
		:global(.deplie-a-l-impression) {
			display: block !important;
		}

		section {
			break-inside: avoid;
			page-break-inside: avoid;
		}

		table {
			break-inside: auto;
		}

		tr {
			break-inside: avoid;
			page-break-inside: avoid;
		}

		details {
			display: none;
		}
	}
</style>
