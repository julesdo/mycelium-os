import { useState } from 'react';
import { createFileRoute, notFound } from '@tanstack/react-router';
import {
	Button,
	Toolbar,
	Segmented,
	SegmentedButton,
	SectionTitle,
	Surface
} from '@cladd-ui/react';
import { CheckCheckIcon, TriangleAlertIcon, UploadCloudIcon, ArrowRightIcon } from 'lucide-react';
import {
	Page,
	PageHeader,
	PageBody,
	TauxEGalim,
	Bandeau,
	EmptyState,
	CarteProduit,
	FilTravail,
	Repartition,
	Illustration,
	ZoneDepot,
	euros,
	pourcent,
	FAMILLES,
	type Famille,
	type Decision,
	type DocumentEnCours,
	type LigneFamille
} from '../ui';
import { FeuilleCorrection, type ProduitACorriger } from '../screens/confirmer/correction';
import { Offre, OuvertureEnCours, EssaiEnCours } from '../screens/abonnement/offre';
import { Attestations, type Attestation } from '../screens/diagnostic/attestations';
import { Equipe, type MembreEquipe, type InvitationEnAttente } from '../screens/equipe/equipe';
import { Donnees } from '../screens/donnees/donnees';
import { Shell } from '../app/shell';
import {
	MENTION_RESPONSABILITE,
	MENTION_FIGE,
	MENTION_OBLIGATION_DE_MOYENS
} from '../lib/convex/egalim/mentions';

/**
 * La salle d'exposition.
 *
 * Elle rend chaque écran avec des données de démonstration, sans backend et
 * sans authentification, pour qu'on puisse **les regarder** aux quatre largeurs
 * de référence — 375, 768, 1024, 1280 — avant de les déclarer finis.
 *
 * Ce n'est pas un confort : le motif principal des dérives visuelles du produit
 * précédent est qu'on ne regardait jamais le résultat. Un kit contraint les
 * contrôles, un lint contraint les classes, mais seul un coup d'œil attrape une
 * hiérarchie ratée ou une carte qui déborde.
 *
 * Les données ne sont pas décoratives non plus : elles sont choisies pour
 * exposer les cas qui cassent — un avoir négatif, un libellé abîmé par l'OCR,
 * un produit que le classificateur n'a pas su trancher, un fichier illisible,
 * une famille à zéro. Un jeu de démonstration où tout va bien ne prouve rien.
 *
 * La route n'existe qu'en développement : en production, elle renvoie 404.
 */
export const Route = createFileRoute('/showroom')({
	beforeLoad: () => {
		if (!import.meta.env.DEV) throw notFound();
	},
	component: Showroom
});

const PRODUITS: ProduitACorriger[] = [
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
		}
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
		}
	},
	{
		normalizedLabel: 'CUISSE DE POULET LABEL ROUGE',
		rawLabelExemple: 'CUISSES POULET LABEL ROUGE 10KG',
		occurrences: 22,
		montantCumuleHT: 6310.2,
		motif: 'VIANDE_POISSON',
		proposition: {
			isFood: true,
			family: 'VIANDE',
			qualifyingLabels: ['LABEL_ROUGE'],
			justification:
				'Label Rouge est une mention qualifiante : elle compte au durable, et sur le seuil de 60 % de la viande.',
			confidence: 0.94
		}
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
			justification:
				'La mention BIO figure au libellé ; le certificat fournisseur reste à obtenir.',
			confidence: 0.74
		}
	},
	{
		normalizedLabel: 'EMMENTAL RAPE',
		rawLabelExemple: 'EMMENTAL RAPE 1KG',
		occurrences: 41,
		montantCumuleHT: 2870,
		motif: 'CONFIANCE_BASSE',
		proposition: {
			isFood: true,
			family: 'LAITIERS',
			qualifyingLabels: [],
			justification:
				'Aucune mention qualifiante au libellé. L’emmental générique ne relève d’aucune AOP.',
			confidence: 0.69
		}
	},
	{
		normalizedLabel: 'REMISE PROMO ETE',
		rawLabelExemple: 'REMISE PROMO ETE -10%',
		occurrences: 3,
		montantCumuleHT: -1240.8,
		motif: 'REGULARISATION',
		proposition: null
	},
	{
		normalizedLabel: 'PREPARATION TRAITEUR REF 88213',
		rawLabelExemple: 'PREP. TRAITEUR REF 88213 CAT A',
		occurrences: 7,
		montantCumuleHT: 1180.6,
		motif: 'NON_CLASSE',
		proposition: null
	},
	{
		normalizedLabel: 'LOCATION BACS INOX',
		rawLabelExemple: 'LOCATION BACS INOX GN1/1',
		occurrences: 12,
		montantCumuleHT: 640,
		motif: 'CONFIANCE_BASSE',
		proposition: {
			isFood: true,
			family: 'AUTRE',
			qualifyingLabels: [],
			justification: 'Libellé ambigu : matériel loué plutôt que denrée, mais le doute subsiste.',
			confidence: 0.51
		}
	}
];

const FAMILLES_DEMO: LigneFamille[] = [
	{ family: 'VIANDE', totalHT: 50400, durableHT: 7100, bioHT: 900 },
	{ family: 'FRUITS_LEGUMES', totalHT: 28800, durableHT: 12600, bioHT: 11800 },
	{ family: 'EPICERIE_APPERTISEE', totalHT: 27000, durableHT: 2400, bioHT: 2400 },
	{ family: 'LAITIERS', totalHT: 25200, durableHT: 6200, bioHT: 4100 },
	{ family: 'EPICERIE_SECHE', totalHT: 19800, durableHT: 14900, bioHT: 14900 },
	{ family: 'BOISSONS', totalHT: 18000, durableHT: 0, bioHT: 0 },
	{ family: 'POISSON', totalHT: 10800, durableHT: 6500, bioHT: 0 }
];

const DOCUMENTS: DocumentEnCours[] = [
	{
		documentId: 'd1',
		filename: 'export-comptable-2026.csv',
		extractionStatus: 'DONE',
		linesCount: 1842
	},
	{
		documentId: 'd2',
		filename: 'facture-maison-bertin-mars.pdf',
		extractionStatus: 'DONE',
		linesCount: 47
	},
	{
		documentId: 'd3',
		filename: 'IMG_4471.jpeg',
		extractionStatus: 'PENDING',
		extractionEtape: 'Lecture de la facture par l’IA',
		linesCount: 0
	},
	{
		documentId: 'd4',
		filename: 'facture-avril-scan.pdf',
		extractionStatus: 'PENDING',
		extractionEtape: 'Vérification des totaux — 63 lignes lues',
		linesCount: 0
	},
	{
		documentId: 'd5',
		filename: 'photo-floue.jpg',
		extractionStatus: 'FAILED',
		extractionError: 'Image trop floue pour être lue.',
		linesCount: 0
	}
];

const DECISIONS: Decision[] = [
	{
		label: 'CAROTTE RONDELLE BIO 2.5KG',
		family: 'FRUITS_LEGUMES',
		qualifyingLabels: ['AB'],
		isFood: true,
		source: 'IA'
	},
	{
		label: 'EMMENTAL RAPE 1KG',
		family: 'LAITIERS',
		qualifyingLabels: [],
		isFood: true,
		source: 'CACHE'
	},
	{
		label: 'FILET CABILLAUD MSC SURG 5KG',
		family: 'POISSON',
		qualifyingLabels: ['PECHE_DURABLE'],
		isFood: true,
		source: 'IA'
	},
	{
		label: 'SACS POUBELLE 100L X50',
		family: 'AUTRE',
		qualifyingLabels: [],
		isFood: false,
		source: 'CACHE'
	},
	{
		label: 'POMMES DE TERRE AGATA 25KG',
		family: 'FRUITS_LEGUMES',
		qualifyingLabels: [],
		isFood: true,
		source: 'CACHE'
	},
	{
		label: 'HUILE OLIVE VIERGE EXTRA 5L',
		family: 'EPICERIE_SECHE',
		qualifyingLabels: ['AOP_AOC_IGP_STG'],
		isFood: true,
		source: 'IA'
	},
	{
		label: 'YAOURT NATURE BIO X48',
		family: 'LAITIERS',
		qualifyingLabels: ['AB'],
		isFood: true,
		source: 'IA'
	},
	{
		label: 'FRAIS DE PORT',
		family: 'AUTRE',
		qualifyingLabels: [],
		isFood: false,
		source: 'CACHE'
	}
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

/** Figée au chargement du module : un `Date.now()` dans un rendu n'est pas idempotent. */
const FIN_ESSAI_DEMO = Date.now() + 18 * 24 * 60 * 60 * 1000;

const ECRANS = [
	'taux',
	'confirmer',
	'traitement',
	'depot',
	'diagnostic',
	'vide',
	'lexique',
	'abonnement',
	'equipe',
	'donnees',
	'coquille'
] as const;
type Ecran = (typeof ECRANS)[number];

function Showroom() {
	const [ecran, setEcran] = useState<Ecran>('confirmer');

	return (
		<div className="flex h-dvh flex-col">
			<div className="shrink-0 border-b border-cladd-bg-outline p-cladd-3xs">
				<Toolbar>
					<Segmented activeColor="neutral" activeVariant="solid">
						{ECRANS.map((e) => (
							<SegmentedButton key={e} active={ecran === e} onClick={() => setEcran(e)}>
								{e}
							</SegmentedButton>
						))}
					</Segmented>
				</Toolbar>
			</div>

			<div className="min-h-0 flex-1">
				{ecran === 'taux' ? <DemoTaux /> : null}
				{ecran === 'confirmer' ? <DemoConfirmer /> : null}
				{ecran === 'traitement' ? <DemoTraitement /> : null}
				{ecran === 'depot' ? <DemoDepot /> : null}
				{ecran === 'diagnostic' ? <DemoDiagnostic /> : null}
				{ecran === 'vide' ? <DemoVide /> : null}
				{ecran === 'lexique' ? <DemoLexique /> : null}
				{ecran === 'abonnement' ? <DemoAbonnement /> : null}
				{ecran === 'equipe' ? <DemoEquipe /> : null}
				{ecran === 'donnees' ? <DemoDonnees /> : null}
				{ecran === 'coquille' ? (
					<Shell>
						<DemoTaux />
					</Shell>
				) : null}
			</div>
		</div>
	);
}

function DemoTaux() {
	const total = FAMILLES_DEMO.reduce((s, f) => s + f.totalHT, 0);
	return (
		<Page>
			<PageHeader
				titre="Vos taux EGalim"
				sousTitre="Exercice 2026, à déclarer avant le 31 mars."
				actions={
					<Toolbar>
						<Segmented activeColor="neutral" activeVariant="solid">
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
				<div className="flex flex-col gap-cladd-2xs">
					<Bandeau ton="alerte" icone={<TriangleAlertIcon size={16} />}>
						2 fichiers n&rsquo;ont pas pu être lus, tous exercices confondus.
					</Bandeau>

					<Surface
						outline
						color="brand"
						variant="solid-fill"
						className="rounded-cladd-2xl shadow-carte-levee"
						contentClassName="flex flex-wrap items-center justify-between gap-cladd-2xs p-cladd-2xs"
					>
						<div className="flex items-center gap-cladd-2xs">
							<span
								aria-hidden
								className="flex size-vignette-sm shrink-0 items-center justify-center rounded-cladd-sm bg-cladd-on-primary/15"
							>
								<CheckCheckIcon size={24} />
							</span>
							<div className="min-w-0">
								<p className="text-cladd-sm font-semibold">8 produits à confirmer</p>
								<p className="text-cladd-2xs opacity-85">
									<span className="tabular-nums">{pourcent(0.14)}</span> de vos achats reposent
									encore sur une classification que vous n&rsquo;avez pas relue, soit{' '}
									<span className="tabular-nums">{euros(34301)}</span>.
								</p>
							</div>
						</div>
						<Button variant="solid" color="neutral">
							Confirmer
							<ArrowRightIcon />
						</Button>
					</Surface>

					<div className="grid gap-cladd-2xs lg:grid-cols-3">
						<TauxEGalim
							titre="Durable et de qualité"
							mesure={0.39}
							seuil={0.5}
							ecartEuros={19800}
						/>
						<TauxEGalim titre="Biologique" mesure={0.21} seuil={0.2} ecartEuros={0} />
						<TauxEGalim titre="Viande et poisson" mesure={0.56} seuil={0.6} ecartEuros={2400} />
					</div>

					<p className="text-cladd-2xs text-cladd-fg-softer">
						Calculés en valeur d&rsquo;achat HT sur{' '}
						<span className="tabular-nums">{euros(total)}</span> d&rsquo;achats alimentaires en
						2026.
					</p>

					<section className="flex flex-col gap-cladd-3xs">
						<SectionTitle>D&rsquo;où viennent vos achats</SectionTitle>
						<Repartition lignes={FAMILLES_DEMO} />
					</section>
				</div>
			</PageBody>
		</Page>
	);
}

function DemoConfirmer() {
	const [aCorriger, setACorriger] = useState<string | null>(null);
	const produit = PRODUITS.find((p) => p.normalizedLabel === aCorriger) ?? null;
	const total = PRODUITS.reduce((s, p) => s + Math.abs(p.montantCumuleHT), 0);

	return (
		<Page>
			<PageHeader
				titre="À confirmer"
				sousTitre={`${PRODUITS.length} produits, ${euros(total)} en jeu. Les plus lourds d'abord.`}
			/>
			<PageBody>
				<div className="grid gap-cladd-2xs md:grid-cols-2 2xl:grid-cols-3">
					{PRODUITS.map((p) => (
						<CarteProduit
							key={p.normalizedLabel}
							libelle={p.rawLabelExemple}
							occurrences={p.occurrences}
							montant={p.montantCumuleHT}
							motif={p.motif}
							proposition={
								p.proposition
									? {
											famille: p.proposition.family,
											mentions: p.proposition.qualifyingLabels,
											estAlimentaire: p.proposition.isFood,
											justification: p.proposition.justification,
											confiance: p.proposition.confidence
										}
									: null
							}
							onConfirmer={() => undefined}
							onCorriger={() => setACorriger(p.normalizedLabel)}
						/>
					))}
				</div>
			</PageBody>

			{produit ? (
				<FeuilleCorrection
					key={produit.normalizedLabel}
					produit={produit}
					urlDocument="#"
					nomDocument="export-comptable-2026.csv"
					enCours={false}
					onEnregistrer={() => setACorriger(null)}
					onFermer={() => setACorriger(null)}
				/>
			) : null}
		</Page>
	);
}

function DemoTraitement() {
	return (
		<Page>
			<PageHeader
				titre="Vos factures"
				sousTitre="Douze mois d'achats suffisent à calculer vos trois taux de l'exercice 2026."
			/>
			<PageBody>
				<div className="mx-auto flex max-w-4xl flex-col gap-cladd-2xs">
					<FilTravail
						documents={DOCUMENTS}
						classification={{
							total: 412,
							faits: 168,
							echoues: 3,
							termine: false,
							recents: DECISIONS
						}}
					/>
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
				<div className="mx-auto flex max-w-4xl flex-col gap-cladd-2xs">
					<ZoneDepot accept=".csv,.pdf" onFichiers={() => undefined}>
						<span
							aria-hidden
							className="flex size-vignette-md items-center justify-center rounded-cladd-lg bg-cladd-primary/10 text-cladd-primary"
						>
							<UploadCloudIcon size={34} />
						</span>
						<div className="flex flex-col gap-1">
							<span className="text-cladd-sm font-semibold">
								Déposez vos factures, on s&rsquo;occupe du reste
							</span>
							<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">
								Un export comptable en CSV va le plus vite. Les PDF et les photos conviennent
								aussi&nbsp;— même prises de travers.
							</span>
						</div>
					</ZoneDepot>
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
				sousTitre="Votre cantine · mesuré le 14 mars 2027"
			/>
			<PageBody>
				<div className="flex flex-col gap-cladd-2xs">
					<div className="grid gap-cladd-2xs lg:grid-cols-3">
						<TauxEGalim
							titre="Durable et de qualité"
							mesure={0.39}
							seuil={0.5}
							ecartEuros={19800}
						/>
						<TauxEGalim titre="Biologique" mesure={0.21} seuil={0.2} ecartEuros={0} />
						<TauxEGalim titre="Viande et poisson" mesure={0.47} seuil={0.6} ecartEuros={7900} />
					</div>

					<Attestations
						attestations={ATTESTATIONS}
						nomEtablissement="Votre cantine"
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

function DemoVide() {
	return (
		<Page>
			<PageHeader titre="Vos taux EGalim" sousTitre="Exercice 2026, à déclarer avant le 31 mars." />
			<PageBody>
				<EmptyState
					illustration="🧾"
					titre="Commençons par vos factures."
					explication="Douze mois d'achats suffisent à calculer vos trois taux. Vous n'avez rien d'autre à préparer, et rien à saisir."
					etapes={[
						'Déposez vos factures, ou photographiez-les. Un export comptable en CSV va le plus vite ; les PDF et les photos conviennent aussi.',
						'Nous lisons chaque ligne et la classons contre le barème EGalim, en vous montrant le travail au fur et à mesure.',
						"Vous confirmez la viande, le poisson et ce dont nous doutons. Vos taux s'affichent."
					]}
					action={
						<Button color="brand" variant="solid-fill" size="lg">
							Déposer mes factures
						</Button>
					}
				/>
			</PageBody>
		</Page>
	);
}

/**
 * Le lexique d'illustration, mis à l'épreuve.
 *
 * On y lit d'un coup si un libellé de facture tombe sur la bonne image, y
 * compris les cas tordus qu'on ne pense pas à tester : l'OCR qui écrit
 * « CAR0TTE » avec un zéro, l'avoir, les frais de port, le produit que le
 * classificateur n'a pas su nommer.
 */
function DemoLexique() {
	const exemples: ReadonlyArray<[string, Famille]> = [
		['POMMES DE TERRE AGATA 25KG', 'FRUITS_LEGUMES'],
		['CAR0TTE RONDELLE 4/4 BIO 2.5KG', 'FRUITS_LEGUMES'],
		['ENTRECOTE V.B.F. 220G X20', 'VIANDE'],
		['CUISSES POULET LABEL ROUGE 10KG', 'VIANDE'],
		['FILET CABILLAUD MSC SURG 5KG', 'POISSON'],
		['CREVETTES DECORTIQUEES 1KG', 'POISSON'],
		['EMMENTAL RAPE 1KG', 'LAITIERS'],
		['YAOURT NATURE BIO X48', 'LAITIERS'],
		['LAIT DEMI-ECREME 6X1L', 'LAITIERS'],
		['BAGUETTE TRADITION X20', 'EPICERIE_SECHE'],
		['COQUILLETTES 5KG', 'EPICERIE_SECHE'],
		['HUILE OLIVE VIERGE EXTRA 5L', 'EPICERIE_SECHE'],
		['TOMATES CONCASSEES 4/4', 'EPICERIE_APPERTISEE'],
		['JUS ORANGE 100% 1L X6', 'BOISSONS'],
		['SACS POUBELLE 100L X50', 'AUTRE'],
		['GANTS VINYLE T8', 'AUTRE'],
		['FRAIS DE PORT', 'AUTRE'],
		['AVOIR SUR FACTURE 2026-118', 'AUTRE'],
		['PREP. TRAITEUR REF 88213 CAT A', 'AUTRE']
	];

	return (
		<Page>
			<PageHeader
				titre="Lexique d'illustration"
				sousTitre="Un libellé de facture, une image. Le lexique ne classe rien : se tromper ici est laid, jamais faux au sens du barème."
			/>
			<PageBody>
				<div className="grid gap-cladd-3xs sm:grid-cols-2 lg:grid-cols-3">
					{exemples.map(([libelle, famille]) => (
						<Surface
							key={libelle}
							outline
							className="rounded-cladd-lg"
							contentClassName="flex items-center gap-cladd-3xs p-cladd-3xs"
						>
							<Illustration libelle={libelle} famille={famille} taille="sm" />
							<div className="min-w-0">
								<p className="truncate text-cladd-2xs font-medium">{libelle}</p>
								<p className="text-cladd-3xs text-cladd-fg-softer">{FAMILLES[famille]}</p>
							</div>
						</Surface>
					))}
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * Les cartes d'offre, aux trois paliers.
 *
 * L'écran d'abonnement lui-même est derrière l'authentification, et le regarder
 * supposerait de se connecter. Ce sont ses cartes qui portent la décision
 * commerciale, et ce sont elles qu'il faut voir : aux trois paliers d'un coup,
 * pour vérifier qu'un prix à quatre chiffres ne casse pas la mise en page.
 */
function DemoAbonnement() {
	return (
		<Page>
			<PageHeader
				titre="Abonnement"
				sousTitre="Les trois paliers, côte à côte. En production, un seul est affiché."
			/>
			<PageBody>
				<div className="flex flex-col gap-cladd-md">
					{(
						[
							{ palier: 'S', bornes: 'moins de 250 couverts par jour', bilan: 690, mois: 190 },
							{ palier: 'M', bornes: 'de 250 à 800 couverts par jour', bilan: 1190, mois: 290 },
							{ palier: 'L', bornes: 'plus de 800 couverts par jour', bilan: 1900, mois: 390 }
						] as const
					).map((p) => (
						<div key={p.palier} className="flex flex-col gap-cladd-3xs">
							<SectionTitle>
								Palier {p.palier} — {p.bornes}
							</SectionTitle>
							<div className="grid gap-cladd-2xs md:grid-cols-2">
								<Offre
									titre="Le premier bilan"
									prix={euros(p.bilan)}
									cadence="une fois"
									description="Douze mois de factures lus en une fois. Vous saurez où vous en êtes, et ce qu’il manque, en euros."
									colonne="bilan"
								/>
								<Offre
									titre="L’abonnement"
									prix={euros(p.mois)}
									cadence="par mois"
									description="Votre chiffre reste à jour toute l’année, et votre déclaration de mars est prête avant mars."
									colonne="abonnement"
									recommande
								/>
							</div>
						</div>
					))}

					<EssaiEnCours finLe={FIN_ESSAI_DEMO} />
					<OuvertureEnCours />
				</div>
			</PageBody>
		</Page>
	);
}

/**
 * L'écran d'équipe, aux deux rôles.
 *
 * Le jeu de démonstration expose ce qui casse : un compte sans nom, une adresse
 * jamais vérifiée, une invitation qui expire demain, et un établissement dont
 * les places sont presque toutes prises. Un écran où trois collègues bien
 * nommés se rangent en colonne ne prouve rien.
 */
const MEMBRES: MembreEquipe[] = [
	{
		id: 'm1',
		nom: 'Claire Béranger',
		email: 'c.beranger@clinique-des-ormes.fr',
		role: 'ORG_ADMIN',
		arriveLe: Date.parse('2026-02-11'),
		adresseVerifiee: true,
		estMoi: true
	},
	{
		id: 'm2',
		nom: 'Yannis K.',
		email: 'yannis.k@clinique-des-ormes.fr',
		role: 'ORG_MEMBER',
		arriveLe: Date.parse('2026-03-02'),
		adresseVerifiee: true,
		estMoi: false
	},
	{
		id: 'm3',
		nom: null,
		email: 'direction@clinique-des-ormes.fr',
		role: 'ORG_MEMBER',
		arriveLe: Date.parse('2026-08-19'),
		adresseVerifiee: false,
		estMoi: false
	}
];

const INVITATIONS: InvitationEnAttente[] = [
	{
		id: 'i1',
		email: 'nouveau.second@clinique-des-ormes.fr',
		role: 'ORG_MEMBER',
		lien: 'https://www.letikette.com/rejoindre/4f1c-demo',
		expireLe: Date.now() + 26 * 60 * 60 * 1000
	}
];

function DemoEquipe() {
	const [admin, setAdmin] = useState(true);
	const rien = async () => {};

	return (
		<Page>
			<PageHeader
				titre="Équipe"
				sousTitre="Qui accède aux factures et aux taux de cet établissement."
				actions={
					<Segmented activeColor="neutral" activeVariant="solid">
						<SegmentedButton active={admin} onClick={() => setAdmin(true)}>
							Vu par un admin
						</SegmentedButton>
						<SegmentedButton active={!admin} onClick={() => setAdmin(false)}>
							Vu par un membre
						</SegmentedButton>
					</Segmented>
				}
			/>
			<PageBody>
				<Equipe
					membres={MEMBRES}
					invitations={admin ? INVITATIONS : []}
					estAdmin={admin}
					siegesUtilises={MEMBRES.length}
					siegesAutorises={5}
					onInviter={rien}
					onChangerRole={rien}
					onRetirer={rien}
					onAnnulerInvitation={rien}
					onVerifierAdresse={rien}
				/>
			</PageBody>
		</Page>
	);
}

function DemoDonnees() {
	return (
		<Page>
			<PageHeader
				titre="Vos données"
				sousTitre="Ce que nous détenons, ce que vous pouvez en emporter, ce que vous pouvez en effacer."
			/>
			<PageBody>
				<Donnees
					apercu={{
						nomEtablissement: 'Clinique des Ormes',
						estAdmin: true,
						creeLe: Date.parse('2026-02-11'),
						depots: 3,
						documents: 47,
						lignes: 1842,
						bilans: 2,
						fournisseurs: 7,
						membres: 3
					}}
					emailDuCompte="c.beranger@clinique-des-ormes.fr"
					onExporter={async () => ({
						url: '#',
						octets: 2_410_000,
						lignes: 1842,
						nomFichier: 'letikette-export-2026-08-27.json'
					})}
					onSupprimerEtablissement={async () => {}}
					onSupprimerCompte={async () => {}}
				/>
			</PageBody>
		</Page>
	);
}
