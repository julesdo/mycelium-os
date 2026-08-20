import { useState } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import { Button, Toolbar, Segmented, SegmentedButton, SectionTitle } from '@cladd-ui/react';
import { CheckCheckIcon, TriangleAlertIcon, UploadIcon } from 'lucide-react';
import {
	Page,
	PageHeader,
	PageBody,
	TauxEGalim,
	Bandeau,
	Tableau,
	TableauEntete,
	TableauCorps,
	TableauLigne,
	TableauTitre,
	TableauCellule,
	TwoPane,
	EmptyState,
	euros,
	pourcent,
	FAMILLES,
	ZoneDepot
} from '../ui';
import { ListeAConfirmer, type LibelleAConfirmer } from '../screens/confirmer/liste';
import { Attestations, type Attestation } from '../screens/diagnostic/attestations';
import { Shell } from '../app/shell';
import {
	MENTION_RESPONSABILITE,
	MENTION_FIGE,
	MENTION_OBLIGATION_DE_MOYENS
} from '../lib/convex/egalim/mentions';
import { PreuveEtDecision } from '../screens/confirmer/preuve';

/**
 * La salle d'exposition.
 *
 * Elle rend chaque écran avec des données de démonstration, sans backend et
 * sans authentification, pour qu'on puisse **les regarder** aux quatre largeurs
 * de référence avant de les déclarer finis.
 *
 * Ce n'est pas un confort : le motif principal des dérives visuelles du produit
 * précédent est qu'on ne regardait jamais le résultat. Un kit contraint les
 * contrôles, un lint contraint les classes, mais seul un coup d'œil attrape une
 * hiérarchie ratée ou un tableau qui déborde.
 *
 * La route n'existe qu'en développement : en production, elle renvoie 404.
 */
export const Route = createFileRoute('/showroom')({
	beforeLoad: () => {
		if (!import.meta.env.DEV) throw notFound();
	},
	component: Showroom
});

const LIBELLES: LibelleAConfirmer[] = [
	{
		normalizedLabel: 'FILET DE CABILLAUD MSC SURGELE',
		rawLabelExemple: 'FILET CABILLAUD MSC SURG 5KG',
		occurrences: 34,
		montantCumuleHT: 12480.5,
		motif: 'VIANDE_POISSON',
		proposition: {
			isFood: true,
			family: 'POISSON',
			qualifyingLabels: ['PECHE_DURABLE'],
			justification:
				'La mention MSC atteste une pêche durable, qui compte au titre du durable sans compter au bio.',
			confidence: 0.91
		},
		documentId: null
	},
	{
		normalizedLabel: 'ENTRECOTE VBF',
		rawLabelExemple: 'ENTRECOTE V.B.F. 220G X20',
		occurrences: 18,
		montantCumuleHT: 8940,
		motif: 'VIANDE_POISSON',
		proposition: {
			isFood: true,
			family: 'VIANDE',
			qualifyingLabels: [],
			justification:
				'« Viande bovine française » est une origine, pas une mention qualifiante au barème EGalim.',
			confidence: 0.88
		},
		documentId: null
	},
	{
		normalizedLabel: 'REMISE PROMO ETE',
		rawLabelExemple: 'REMISE PROMO ETE -10%',
		occurrences: 3,
		montantCumuleHT: -1240.8,
		motif: 'REGULARISATION',
		proposition: null,
		documentId: null
	},
	{
		normalizedLabel: 'CAROTTE RONDELLE BIO',
		rawLabelExemple: 'CAR0TTE RONDELLE 4/4 BIO 2.5KG',
		occurrences: 52,
		montantCumuleHT: 3120.4,
		motif: 'CONFIANCE_BASSE',
		proposition: {
			isFood: true,
			family: 'FRUITS_LEGUMES',
			qualifyingLabels: ['AB'],
			justification: 'La mention BIO figure au libellé ; le certificat fournisseur reste à obtenir.',
			confidence: 0.74
		},
		documentId: null
	}
];

const FAMILLES_DEMO = [
	{ family: 'VIANDE', totalHT: 50400, durableHT: 7100, bioHT: 900 },
	{ family: 'EPICERIE_APPERTISEE', totalHT: 27000, durableHT: 2400, bioHT: 2400 },
	{ family: 'FRUITS_LEGUMES', totalHT: 28800, durableHT: 12600, bioHT: 11800 },
	{ family: 'LAITIERS', totalHT: 25200, durableHT: 6200, bioHT: 4100 },
	{ family: 'EPICERIE_SECHE', totalHT: 19800, durableHT: 14900, bioHT: 14900 },
	{ family: 'BOISSONS', totalHT: 18000, durableHT: 0, bioHT: 0 },
	{ family: 'POISSON', totalHT: 10800, durableHT: 6500, bioHT: 0 }
];

const ATTESTATIONS: Attestation[] = [
	{
		attestationId: 'a1',
		supplierName: 'Grossiste Alpha',
		amountAtStake: 18400,
		pointsRecuperables: 5.2,
		produits: ['CAROTTE RONDELLE BIO', 'LENTILLE VERTE BIO', 'HUILE DE COLZA BIO'],
		status: 'DRAFT'
	},
	{
		attestationId: 'a2',
		supplierName: 'Maison Bertin',
		amountAtStake: 6200,
		pointsRecuperables: 1.8,
		produits: ['POULET LABEL ROUGE'],
		status: 'SENT'
	}
];

const ECRANS = ['pilotage', 'confirmer', 'diagnostic', 'depot', 'vide', 'coquille'] as const;
type Ecran = (typeof ECRANS)[number];

function Showroom() {
	const [ecran, setEcran] = useState<Ecran>('pilotage');
	const [selection, setSelection] = useState<string | null>(LIBELLES[0]!.normalizedLabel);
	const courant = LIBELLES.find((l) => l.normalizedLabel === selection) ?? LIBELLES[0]!;

	return (
		<div className="flex h-dvh flex-col">
			<div className="flex shrink-0 flex-wrap gap-cladd-3xs border-b border-cladd-outline p-cladd-3xs">
				{ECRANS.map((e) => (
					<Button key={e} size="sm" variant="gradient" pressed={ecran === e} onClick={() => setEcran(e)}>
						{e}
					</Button>
				))}
			</div>

			<div className="min-h-0 flex-1">
				{ecran === 'pilotage' ? <DemoPilotage /> : null}
				{ecran === 'vide' ? <DemoVide /> : null}
				{ecran === 'diagnostic' ? <DemoDiagnostic /> : null}
				{ecran === 'depot' ? <DemoDepot /> : null}
				{ecran === 'coquille' ? (
					<Shell>
						<DemoPilotage />
					</Shell>
				) : null}
				{ecran === 'confirmer' ? (
					<Page>
						<PageHeader titre="À confirmer" sousTitre={`4 produits, ${euros(25781.7)} en jeu.`} />
						<div className="min-h-0 flex-1">
							<TwoPane
								liste={
									<ListeAConfirmer
										libelles={LIBELLES}
										selection={courant.normalizedLabel}
										onSelectionner={setSelection}
									/>
								}
								preuve={
									<PreuveEtDecision
										key={courant.normalizedLabel}
										libelle={courant}
										urlDocument="#"
										nomDocument="export-comptable-2026-03.csv"
										enCours={false}
										onConfirmer={() => undefined}
										onCorriger={() => undefined}
									/>
								}
							/>
						</div>
					</Page>
				) : null}
			</div>
		</div>
	);
}

function DemoPilotage() {
	const total = FAMILLES_DEMO.reduce((s, f) => s + f.totalHT, 0);
	return (
		<Page>
			<PageHeader
				titre="Tableau de bord"
				sousTitre="Vos trois taux EGalim sur l'année 2026."
				actions={
					<Toolbar>
							<Segmented>
								{['2026', '2025', '2024'].map((a) => (
									<SegmentedButton key={a} active={a === '2026'}>
										{a}
									</SegmentedButton>
								))}
							</Segmented>
						</Toolbar>
				}
			/>
			<PageBody>
				<div className="flex flex-col gap-cladd-xs">
					<Bandeau ton="alerte" icone={<TriangleAlertIcon size={16} />}>
						2 fichiers n&rsquo;ont pas pu être lus, tous exercices confondus.
					</Bandeau>

					<div className="grid gap-cladd-xs sm:grid-cols-2 lg:grid-cols-3">
						<TauxEGalim titre="Durable et de qualité" mesure={0.39} seuil={0.5} ecartEuros={19800} />
						<TauxEGalim titre="Biologique" mesure={0.21} seuil={0.2} ecartEuros={0} />
						<TauxEGalim titre="Viande et poisson" mesure={0.47} seuil={0.6} ecartEuros={7900} />
					</div>

					<p className="text-cladd-2xs text-cladd-fg-softer">
						Calculés en valeur d&rsquo;achat HT sur{' '}
						<span className="tabular-nums">{euros(total)}</span> d&rsquo;achats alimentaires en
						2026.
					</p>

					<Bandeau
						icone={<CheckCheckIcon size={16} />}
						action={
							<Button color="brand" variant="solid-fill">
								Confirmer
							</Button>
						}
					>
						<span className="font-semibold tabular-nums">{pourcent(0.14)}</span> de vos achats
						reposent sur une classification non confirmée.{' '}
						<span className="text-cladd-fg-soft">
							4 produits à confirmer, <span className="tabular-nums">{euros(25781)}</span> en jeu.
						</span>
					</Bandeau>

					<section className="flex flex-col gap-cladd-3xs">
						<SectionTitle>D&rsquo;où viennent vos achats</SectionTitle>
						<Tableau legende="Répartition des achats par famille">
							<TableauEntete>
								<TableauTitre>Famille</TableauTitre>
								<TableauTitre aDroite>Achats HT</TableauTitre>
								<TableauTitre aDroite>Dont durable</TableauTitre>
								<TableauTitre aDroite>Dont bio</TableauTitre>
								<TableauTitre aDroite>Part durable</TableauTitre>
							</TableauEntete>
							<TableauCorps>
								{FAMILLES_DEMO.map((f) => (
									<TableauLigne key={f.family}>
										<TableauCellule>{FAMILLES[f.family]}</TableauCellule>
										<TableauCellule aDroite chiffre>
											{euros(f.totalHT)}
										</TableauCellule>
										<TableauCellule aDroite chiffre>
											{euros(f.durableHT)}
										</TableauCellule>
										<TableauCellule aDroite chiffre>
											{euros(f.bioHT)}
										</TableauCellule>
										<TableauCellule aDroite chiffre>
											{pourcent(f.durableHT / f.totalHT)}
										</TableauCellule>
									</TableauLigne>
								))}
							</TableauCorps>
						</Tableau>
					</section>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoDiagnostic() {
	return (
		<Page>
			<PageHeader
				titre="Diagnostic EGalim 2026"
				sousTitre="Restaurant du Parc · mesuré le 14 mars 2027"
			/>
			<PageBody>
				<div className="flex flex-col gap-cladd-xs">
					<div className="grid gap-cladd-xs sm:grid-cols-2 lg:grid-cols-3">
						<TauxEGalim titre="Durable et de qualité" mesure={0.39} seuil={0.5} ecartEuros={19800} />
						<TauxEGalim titre="Biologique" mesure={0.21} seuil={0.2} ecartEuros={0} />
						<TauxEGalim titre="Viande et poisson" mesure={0.47} seuil={0.6} ecartEuros={7900} />
					</div>

					<Attestations
						attestations={ATTESTATIONS}
						nomEtablissement="Restaurant du Parc"
						periodeDebut="2026-01-01"
						periodeFin="2026-12-31"
						onChangerStatut={() => undefined}
					/>

					<footer className="flex flex-col gap-1 border-t border-cladd-outline pt-cladd-xs text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						<p>{MENTION_OBLIGATION_DE_MOYENS}</p>
						<p>{MENTION_RESPONSABILITE}</p>
						<p>{MENTION_FIGE('14 mars 2027')}</p>
					</footer>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoDepot() {
	return (
		<Page>
			<PageHeader
				titre="Vos factures"
				sousTitre="Douze mois d'achats suffisent à calculer vos trois taux de l'exercice 2026."
			/>
			<PageBody>
				<ZoneDepot accept=".csv,.pdf" onFichiers={() => undefined}>
					<UploadIcon size={24} className="text-cladd-fg-softer" />
					<span className="text-cladd-xs font-medium">
						Glissez vos factures ici, ou cliquez pour les choisir
					</span>
					<span className="text-cladd-2xs text-cladd-fg-soft">
						Un export comptable en CSV va le plus vite. Les PDF et les photos conviennent aussi.
					</span>
				</ZoneDepot>
			</PageBody>
		</Page>
	);
}

function DemoVide() {
	return (
		<Page>
			<PageHeader titre="Tableau de bord" sousTitre="Vos trois taux EGalim sur l'année civile." />
			<PageBody>
				<EmptyState
					titre="Commençons par vos factures."
					explication="Douze mois d'achats suffisent à calculer vos trois taux. Vous n'avez rien d'autre à préparer."
					etapes={[
						"Déposez vos factures. Un export comptable en CSV va le plus vite ; à défaut, les PDF et les photos conviennent.",
						'Nous lisons et classons chaque ligne contre le barème EGalim.',
						"Vous confirmez la viande, le poisson et ce dont nous doutons. Vos taux s'affichent."
					]}
					action={
						<Button color="brand" variant="solid-fill">
							Déposer mes factures
						</Button>
					}
				/>
			</PageBody>
		</Page>
	);
}
