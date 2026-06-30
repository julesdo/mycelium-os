<script lang="ts">
	import { useConvexClient, useQuery } from '@mmailaender/convex-svelte';
	import { PUBLIC_LOGO_DEV_TOKEN, PUBLIC_CONVEX_SITE_URL } from '$env/static/public';
	import { api } from '$lib/convex/_generated/api.js';
	import { toast } from 'svelte-sonner';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Skeleton } from '$lib/components/ui/skeleton/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import IntegrationWizard from '$lib/components/billing/IntegrationWizard.svelte';
	import type { IntegrationProvider } from '$lib/components/billing/IntegrationWizard.svelte';
	import CheckCircle2Icon from '@lucide/svelte/icons/check-circle-2';
	import XCircleIcon from '@lucide/svelte/icons/x-circle';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import RefreshCwIcon from '@lucide/svelte/icons/refresh-cw';
	import LinkIcon from '@lucide/svelte/icons/link';
	import UnlinkIcon from '@lucide/svelte/icons/unlink';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import KeyIcon from '@lucide/svelte/icons/key';
	import WebhookIcon from '@lucide/svelte/icons/webhook';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import EyeOffIcon from '@lucide/svelte/icons/eye-off';
	import SearchIcon from '@lucide/svelte/icons/search';
	import FilterIcon from '@lucide/svelte/icons/filter';
	import type { Id } from '$lib/convex/_generated/dataModel.js';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';

	const client = useConvexClient();

	const anyApi = api as any;

	const integrationsQuery = useQuery(
		anyApi.integrations.accounting.getMyAccountingIntegrations,
		{}
	);
	const commsIntegrationsQuery = useQuery(anyApi.comms.getMyCommsIntegrations, {});
	const apiKeysQuery = useQuery(anyApi.integrations.apiKeys.listApiKeys, {});
	const webhooksQuery = useQuery(anyApi.integrations.apiKeys.listWebhookEndpoints, {});

	// ─── OAuth callback toasts ────────────────────────────────────────────────

	$effect(() => {
		const params = page.url.searchParams;
		const connected = params.get('connected');
		const oauthError = params.get('error');
		const oauthProvider = params.get('provider');

		if (connected) {
			const name = PROVIDERS.find((p) => p.id === connected)?.name ?? connected;
			toast.success(`${name} connecté avec succès`);
			replaceState(page.url.pathname, {});
		} else if (oauthError && oauthProvider) {
			const name = PROVIDERS.find((p) => p.id === oauthProvider)?.name ?? oauthProvider;
			const messages: Record<string, string> = {
				access_denied: 'Accès refusé',
				invalid_state: 'Session expirée, réessayez',
				token_exchange: 'Échange de tokens échoué',
				tenant_fetch: "Impossible de récupérer l'organisation",
				no_tenant: 'Aucune organisation trouvée'
			};
			toast.error(`${name} — ${messages[oauthError] ?? oauthError}`);
			replaceState(page.url.pathname, {});
		}
	});

	// ─── Logo helper ──────────────────────────────────────────────────────────

	function getLogoUrl(domain: string): string {
		const token = PUBLIC_LOGO_DEV_TOKEN;
		if (token) return `https://img.logo.dev/${domain}?token=${token}&size=64&format=png`;
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
	}

	// ─── Provider catalogue ───────────────────────────────────────────────────

	type ProviderEntry = IntegrationProvider & {
		implemented: boolean;
		csvRoute?: string;
	};

	const PROVIDERS: ProviderEntry[] = [
		// ── Comptabilité UK ──
		{
			id: 'xero',
			name: 'Xero',
			description: 'Synchronisation coûts flotte et notes de frais IK vers Xero. #1 UK/AU.',
			domain: 'xero.com',
			category: 'accounting',
			authType: 'oauth',
			markets: ['UK', 'AU', 'NZ'],
			planRequired: 'professional',
			docsUrl: 'https://developer.xero.com/documentation/api/accounting/overview',
			dataPoints: [
				'Coûts flotte → Bills',
				'Notes de frais IK → Expense Claims',
				'Mapping catégories PCG',
				'Devises multiples'
			],
			syncDescription: 'Chaque coût saisi dans Mycelium est poussé vers Xero en temps quasi-réel.',
			prerequisites: ['Compte Xero actif (trial ou payant)', 'Rôle Adviser ou Standard dans Xero'],
			implemented: true
		},
		{
			id: 'quickbooks',
			name: 'QuickBooks Online',
			description: 'Sync coûts et IK vers QuickBooks. Intuit ecosystem.',
			domain: 'quickbooks.intuit.com',
			category: 'accounting',
			authType: 'oauth',
			markets: ['UK', 'US', 'CA'],
			planRequired: 'professional',
			docsUrl: 'https://developer.intuit.com/app/developer/qbo/docs/api/accounting',
			dataPoints: [
				'Coûts → Bills',
				'IK → Expenses',
				'Comptes fournisseurs',
				'Reporting périodique'
			],
			syncDescription:
				'Les coûts flotte et notes de frais sont synchronisés vers votre fichier QuickBooks Online.',
			prerequisites: ['Abonnement QuickBooks Online actif', 'Rôle Admin ou Comptable'],
			implemented: true
		},
		{
			id: 'sage',
			name: 'Sage Business Cloud',
			description: 'Sage Business Cloud Accounting — 700 000+ entreprises en France et UK.',
			domain: 'sage.com',
			category: 'accounting',
			authType: 'apikey',
			markets: ['UK', 'FR', 'ES'],
			planRequired: 'professional',
			keyPlaceholder: 'Token OAuth Sage…',
			keyHint: 'Sage Business Cloud → Mes apps → Créer une intégration → Copier le token OAuth',
			docsUrl: 'https://developer.sage.com/accounting/reference/',
			dataPoints: ['Factures fournisseurs', 'Notes de frais', 'Analytique flotte', 'Export FEC'],
			syncDescription:
				'Coûts flotte et IK synchronisés automatiquement vers Sage Business Cloud Accounting.',
			prerequisites: [
				'Abonnement Sage Business Cloud actif',
				'Accès API activé dans les paramètres Sage'
			],
			implemented: true
		},
		{
			id: 'freeagent',
			name: 'FreeAgent',
			description: 'Comptabilité cloud pour freelancers et PME UK. 100 000+ utilisateurs.',
			domain: 'freeagent.com',
			category: 'accounting',
			authType: 'oauth',
			markets: ['UK'],
			planRequired: 'professional',
			docsUrl: 'https://dev.freeagent.com/docs/',
			dataPoints: ['Bills fournisseurs', 'Expense Claims', 'Bank transactions', 'VAT returns'],
			syncDescription:
				'Coûts flotte synchronisés vers FreeAgent Bills et notes de frais vers Expense Claims.',
			prerequisites: ['Compte FreeAgent actif', 'Admin access sur le compte'],
			implemented: true
		},
		{
			id: 'pennylane',
			name: 'Pennylane',
			description: 'Synchronisation automatique des coûts flotte et notes de frais IK.',
			domain: 'pennylane.com',
			category: 'accounting',
			authType: 'apikey',
			markets: ['FR'],
			planRequired: 'professional',
			keyPlaceholder: 'sk_live_…',
			keyHint: "Pennylane → Paramètres → API → Générer une clé d'accès",
			dataPoints: ['Coûts flotte', 'Notes de frais IK', 'Mapping PCG', 'Analytique'],
			syncDescription:
				'Chaque coût validé dans Mycelium est automatiquement poussé vers Pennylane.',
			prerequisites: ['Clé API Pennylane (paramètres → API)'],
			implemented: true
		},
		{
			id: 'ebp',
			name: 'EBP',
			description: 'EBP Open Line — idéal pour artisans, PME et TPE françaises.',
			domain: 'ebp.fr',
			category: 'accounting',
			authType: 'apikey',
			markets: ['FR'],
			planRequired: 'professional',
			keyPlaceholder: 'Clé API EBP…',
			keyHint: "EBP Compta → Préférences → API → Générer une clé d'intégration",
			dataPoints: ['Achats fournisseurs', 'Notes de frais', 'Analytique', 'TVA'],
			syncDescription: "Coûts flotte et IK synchronisés vers EBP Open Line via l'API officielle.",
			prerequisites: ['EBP Compta Pro ou supérieur', 'Module API activé (contactez EBP)'],
			implemented: true
		},
		// ── Comptabilité Nordique ──
		{
			id: 'fortnox',
			name: 'Fortnox',
			description: '#1 comptabilité cloud en Suède. 500 000+ entreprises.',
			domain: 'fortnox.se',
			category: 'accounting',
			authType: 'oauth',
			markets: ['SE'],
			planRequired: 'professional',
			docsUrl: 'https://developer.fortnox.se/documentation/',
			dataPoints: ['Leverantörsfaktura', 'Utläggsredovisning (IK)', 'Kostnadsställe', 'Bokföring'],
			syncDescription: 'Coûts flotte → Leverantörsfakturor, IK → Utlägg dans Fortnox Bokföring.',
			prerequisites: ['Compte Fortnox actif', 'Accès au portail développeur Fortnox'],
			implemented: true
		},
		{
			id: 'visma',
			name: 'Visma eAccounting',
			description: 'Dominant sur les 4 marchés nordiques. 1M+ entreprises SE/NO/DK/FI.',
			domain: 'vismaonline.com',
			category: 'accounting',
			authType: 'oauth',
			markets: ['SE', 'NO', 'DK', 'FI'],
			planRequired: 'professional',
			docsUrl: 'https://eaccounting.vismaonline.com/api',
			dataPoints: [
				'SupplierInvoices',
				'EmployeeExpenses',
				'Cost centers',
				'Multi-devises nordiques'
			],
			syncDescription: 'Sync complète coûts et IK vers Visma eAccounting pour SE, NO, DK et FI.',
			prerequisites: ['Abonnement Visma eAccounting', 'Connexion Visma Identity'],
			implemented: true
		},
		{
			id: 'tripletex',
			name: 'Tripletex',
			description: '#1 comptabilité en Norvège. 250 000+ entreprises.',
			domain: 'tripletex.no',
			category: 'accounting',
			authType: 'apikey',
			markets: ['NO'],
			planRequired: 'professional',
			keyPlaceholder: 'Employee token Tripletex…',
			keyHint: 'Tripletex → Profil → Intégrations → Générer employee token',
			docsUrl: 'https://tripletex.no/v2-docs/',
			dataPoints: ['supplier/invoice', 'travelExpense', 'ledger/account', 'Analytique'],
			syncDescription: 'Coûts flotte et frais de déplacement synchronisés vers Tripletex.',
			prerequisites: ['Compte Tripletex actif', 'employee token + consumer token'],
			implemented: true
		},
		{
			id: 'economic',
			name: 'e-conomic',
			description: '#1 comptabilité au Danemark. 180 000+ entreprises.',
			domain: 'e-conomic.com',
			category: 'accounting',
			authType: 'apikey',
			markets: ['DK', 'NO'],
			planRequired: 'professional',
			keyPlaceholder: 'Agreement grant token…',
			keyHint: 'e-conomic → Paramètres → API → Générer un agreement grant token',
			docsUrl: 'https://restdocs.e-conomic.com/',
			dataPoints: ['SupplierInvoices', 'Entries (IK)', 'Accounts', 'Cost centers'],
			syncDescription: 'Coûts flotte → SupplierInvoices drafts, IK → accruals dans e-conomic.',
			prerequisites: ['Compte e-conomic actif', 'Agreement grant token depuis les paramètres API'],
			implemented: true
		},
		// ── RH & Paie ──
		{
			id: 'personio',
			name: 'Personio',
			description: 'HRIS dominant en DACH et expansion UK/Nordiques. 10 000+ clients.',
			domain: 'personio.de',
			category: 'hr',
			authType: 'apikey',
			markets: ['UK', 'DE', 'SE', 'NO'],
			planRequired: 'business',
			keyPlaceholder: 'Client ID Personio…',
			keyHint: 'Personio → Paramètres → Intégrations → API → Générer des credentials',
			docsUrl: 'https://developer.personio.de/reference/get_company-employees',
			dataPoints: [
				'Employés → driverProfiles',
				'Départements → org structure',
				'Sites',
				'Cost centers'
			],
			syncDescription: 'Les employés Personio sont importés dans Mycelium comme conducteurs.',
			prerequisites: ['Abonnement Personio Core ou supérieur', 'Rôle Admin'],
			implemented: false
		},
		{
			id: 'bamboohr',
			name: 'BambooHR',
			description: 'HRIS populaire UK/US pour PME. 30 000+ entreprises clientes.',
			domain: 'bamboohr.com',
			category: 'hr',
			authType: 'apikey',
			markets: ['UK', 'US'],
			planRequired: 'business',
			keyPlaceholder: 'API key BambooHR…',
			keyHint: 'BambooHR → Compte → API Keys → Générer une clé',
			docsUrl: 'https://documentation.bamboohr.com/reference/get-employee-1',
			dataPoints: ['Employees → driverProfiles', 'Departments', 'Job titles', 'Locations'],
			syncDescription: 'Import automatique des employés BambooHR comme conducteurs dans Mycelium.',
			prerequisites: ['Compte BambooHR actif', 'Clé API dans les paramètres du compte'],
			implemented: false
		},
		{
			id: 'hibob',
			name: 'HiBob',
			description: 'HRIS moderne, favori des scale-ups UK et Nordiques.',
			domain: 'hibob.com',
			category: 'hr',
			authType: 'apikey',
			markets: ['UK', 'SE', 'NO'],
			planRequired: 'business',
			keyPlaceholder: 'Service User Token HiBob…',
			keyHint: 'HiBob → Paramètres → API → Service Users → Générer un token',
			docsUrl: 'https://apidocs.hibob.com/reference/get_people',
			dataPoints: ['People data → driverProfiles', 'Departments', 'Sites', 'Employment type'],
			syncDescription: 'Les employés HiBob sont synchronisés comme conducteurs dans Mycelium.',
			prerequisites: ['HiBob actif', 'Service User avec droits read:people'],
			implemented: false
		},
		// ── Carburant ──
		{
			id: 'shell',
			name: 'Shell Fleet',
			description: 'Import automatique des relevés Shell Fleet Solutions UK/EU.',
			domain: 'shell.com',
			category: 'fuel',
			authType: 'csv',
			markets: ['UK', 'EU'],
			planRequired: 'essential',
			dataPoints: [
				'Transactions carburant',
				'Immatriculations véhicules',
				'Volume (litres)',
				'Prix unitaire',
				'Site'
			],
			syncDescription: 'Importez vos relevés Shell Fleet Solutions au format CSV.',
			prerequisites: ['Accès à Shell Fleet Manager', 'Export CSV mensuel disponible'],
			csvRoute: '/admin/finance/fuel-import',
			implemented: true
		},
		{
			id: 'bp',
			name: 'BP Plus',
			description: 'Import automatique des relevés BP Plus Fleet UK/EU.',
			domain: 'bpplus.co.uk',
			category: 'fuel',
			authType: 'csv',
			markets: ['UK', 'EU'],
			planRequired: 'essential',
			dataPoints: [
				'Transactions carburant',
				'Immatriculations',
				'Volume (litres)',
				'Coût total',
				'TVA'
			],
			syncDescription: 'Importez vos relevés BP Plus Fleet au format CSV.',
			prerequisites: ['Accès au portail BP Plus Business'],
			csvRoute: '/admin/finance/fuel-import',
			implemented: true
		},
		{
			id: 'allstar',
			name: 'Allstar Fleet',
			description: '#1 carte carburant UK (300 000+ véhicules). API temps réel.',
			domain: 'allstarcard.co.uk',
			category: 'fuel',
			authType: 'apikey',
			markets: ['UK'],
			planRequired: 'professional',
			keyPlaceholder: 'Allstar API key…',
			keyHint:
				'Portail Allstar Business → Intégrations → Générer une clé API (programme partenaire)',
			docsUrl: 'https://developer.allstarcard.co.uk/',
			dataPoints: ['Transactions temps réel', 'Alertes fraude', 'MPG par véhicule', 'Reporting'],
			syncDescription: 'Chaque transaction Allstar est automatiquement importée dans Mycelium.',
			prerequisites: [
				'Compte Allstar Fleet actif',
				'Accès au programme partenaire Allstar/Fleetcor'
			],
			implemented: false
		},
		{
			id: 'circlek',
			name: 'Circle K Fleet',
			description: '#1 réseau de stations nordiques. 2 500+ sites SE/NO/DK/FI.',
			domain: 'circlek.com',
			category: 'fuel',
			authType: 'csv',
			markets: ['SE', 'NO', 'DK', 'FI'],
			planRequired: 'essential',
			dataPoints: ['Transactions carburant', 'Immatriculations', 'Site', 'Produit', 'Montant TTC'],
			syncDescription: 'Importez vos relevés Circle K Business Fleet au format CSV.',
			prerequisites: [
				'Compte Circle K Business actif',
				'Export CSV depuis le portail B2B Circle K'
			],
			csvRoute: '/admin/finance/fuel-import',
			implemented: true
		},
		// ── Télématique ──
		{
			id: 'smartcar',
			name: 'Smartcar',
			description: 'Odomètre, SoC batterie et localisation sans aucun hardware.',
			domain: 'smartcar.com',
			category: 'telematics',
			authType: 'csv',
			markets: ['UK', 'US', 'EU'],
			planRequired: 'business',
			docsUrl: 'https://smartcar.com/docs/api-reference/',
			dataPoints: ['Odomètre temps réel', 'SoC batterie (EV)', 'Localisation', 'Statut charge'],
			syncDescription: 'Connexion par véhicule depuis la page Flotte.',
			prerequisites: ['Véhicule compatible Smartcar (2015+)', 'Consentement conducteur requis'],
			csvRoute: '/admin/fleet',
			implemented: true
		},
		{
			id: 'webfleet',
			name: 'Webfleet',
			description: '#1 télématique Europe (TomTom). 50 000+ flottes UK et nordiques.',
			domain: 'webfleet.com',
			category: 'telematics',
			authType: 'apikey',
			markets: ['UK', 'SE', 'NO', 'DK', 'FI', 'EU'],
			planRequired: 'business',
			keyPlaceholder: 'Webfleet API key…',
			keyHint: 'Webfleet → Administration → Intégrations → Webfleet Connect → Générer une clé',
			docsUrl: 'https://www.webfleet.com/en_gb/webfleet/info/developer-documentation/',
			dataPoints: [
				'Positions GPS temps réel',
				'Trips complets',
				'Score éco-conduite',
				'Alertes vitesse',
				'Ralenti'
			],
			syncDescription:
				'Données télématiques Webfleet synchronisées en temps réel vers la flotte Mycelium.',
			prerequisites: ['Abonnement Webfleet actif', 'Clé Webfleet Connect (portail administration)'],
			implemented: false
		},
		{
			id: 'geotab',
			name: 'Geotab',
			description: '#2 mondial télématique. Fort dans les enterprise fleets UK.',
			domain: 'geotab.com',
			category: 'telematics',
			authType: 'apikey',
			markets: ['UK', 'EU', 'US'],
			planRequired: 'business',
			keyPlaceholder: 'mygeotab.com server…',
			docsUrl: 'https://docs.google.com/document/d/1LJfb57qyBB3FpATrSGBxHxqhwYmpBplScXKFnqpVsYk',
			dataPoints: [
				'Trips et trajets',
				'Exceptions (vitesse, frein)',
				'DVIR inspections',
				'Données moteur',
				'Coaching conducteur'
			],
			syncDescription:
				'Trips et exceptions Geotab synchronisés vers réservations et alertes conformité Mycelium.',
			prerequisites: ['Abonnement MyGeotab actif', 'Identifiants administrateur MyGeotab'],
			implemented: false
		},
		// ── Communication ──
		{
			id: 'slack',
			name: 'Slack',
			description: 'Alertes flotte Mycelium directement dans vos channels Slack.',
			domain: 'slack.com',
			category: 'comms',
			authType: 'apikey',
			markets: ['UK', 'SE', 'NO', 'DK', 'FI', 'Global'],
			planRequired: 'essential',
			keyPlaceholder: 'https://hooks.slack.com/services/T.../B.../...',
			keyHint: "Slack → App directory → Incoming WebHooks → Add to Slack → copier l'URL",
			docsUrl: 'https://api.slack.com/messaging/webhooks',
			dataPoints: [
				'Alertes maintenance',
				'Expiration permis',
				'Contraventions',
				'Conflits calendrier'
			],
			syncDescription:
				'Recevez les alertes admin Mycelium dans Slack : maintenance, permis, contraventions.',
			prerequisites: ['Workspace Slack actif', "Droits d'installer des apps Slack"],
			implemented: true
		},
		{
			id: 'teams',
			name: 'Microsoft Teams',
			description: 'Alertes flotte Mycelium via Incoming Webhook dans Microsoft Teams.',
			domain: 'teams.microsoft.com',
			category: 'comms',
			authType: 'apikey',
			markets: ['UK', 'SE', 'NO', 'DK', 'FI', 'Global'],
			planRequired: 'essential',
			keyPlaceholder: 'https://xxx.webhook.office.com/webhookb2/...',
			keyHint: "Teams → Canal → … → Connecteurs → Incoming Webhook → Configurer → copier l'URL",
			docsUrl:
				'https://learn.microsoft.com/en-us/microsoftteams/platform/webhooks-and-connectors/how-to/add-incoming-webhook',
			dataPoints: [
				'Alertes maintenance',
				'Expiration permis',
				'Contraventions',
				'Conflits calendrier'
			],
			syncDescription:
				'Notifications Mycelium via MessageCard Teams : maintenance, permis, contraventions.',
			prerequisites: ['Microsoft 365 actif', 'Droits Connecteurs Teams (admin IT requis)'],
			implemented: true
		},
		// ── Conformité ──
		{
			id: 'dvla',
			name: 'DVLA VES',
			description: 'Registre véhicules UK : MOT, tax, CO2, specs constructeur.',
			domain: 'driver-vehicle-licensing.api.gov.uk',
			category: 'compliance',
			authType: 'apikey',
			markets: ['UK'],
			planRequired: 'professional',
			keyPlaceholder: 'Clé API DVLA VES…',
			keyHint: 'Portail DVLA Developer → Créer un compte → Demander une clé VES API (gratuit)',
			docsUrl:
				'https://developer-portal.driver-vehicle-licensing.api.gov.uk/apis/vehicle-enquiry-service/vehicle-enquiry-service-description.html',
			dataPoints: [
				'Statut MOT',
				'Statut tax (road tax)',
				'CO2 g/km',
				'Type carburant',
				'Couleur officielle',
				'Date première immatriculation'
			],
			syncDescription:
				"Enrichissement automatique des véhicules au moment de l'import immatriculation.",
			prerequisites: [
				'Compte DVLA Developer (gratuit sur developer-portal.driver-vehicle-licensing.api.gov.uk)'
			],
			implemented: false
		},
		{
			id: 'nordic-registers',
			name: 'Registres véhicules nordiques',
			description: 'SE/NO/DK/FI : données officielles constructeur, CO2, fiscalité.',
			domain: 'transportstyrelsen.se',
			category: 'compliance',
			authType: 'apikey',
			markets: ['SE', 'NO', 'DK', 'FI'],
			planRequired: 'professional',
			keyPlaceholder: 'Clé API registre…',
			keyHint:
				'Transportstyrelsen (SE), Vegvesen (NO), Motorst (DK), Traficom (FI) — chaque pays a son portail partenaire.',
			dataPoints: [
				'Specs constructeur',
				'CO2 officiel',
				'Avantage en nature (Förmånsvärde SE)',
				'Statut fiscal',
				'Historique'
			],
			syncDescription:
				'Données officielles de chaque registre national pour le calcul des avantages en nature nordiques.',
			prerequisites: ['Clé API de chaque registre national (demande spécifique par pays)'],
			implemented: false
		}
	];

	// ─── Category filters ──────────────────────────────────────────────────────

	const CATEGORIES = [
		{ id: 'all', label: 'Tous' },
		{ id: 'accounting', label: 'Comptabilité' },
		{ id: 'hr', label: 'RH & Paie' },
		{ id: 'fuel', label: 'Carburant' },
		{ id: 'telematics', label: 'Télématique' },
		{ id: 'comms', label: 'Communication' },
		{ id: 'compliance', label: 'Conformité' }
	];

	const MARKET_FILTERS = [
		{ id: 'all', label: 'Tous marchés' },
		{ id: 'UK', label: 'Royaume-Uni' },
		{ id: 'SE', label: 'Suède' },
		{ id: 'NO', label: 'Norvège' },
		{ id: 'DK', label: 'Danemark' },
		{ id: 'FI', label: 'Finlande' }
	];

	let search = $state('');
	let activeCategory = $state('all');
	let activeMarket = $state('all');

	const filteredProviders = $derived(
		PROVIDERS.filter((p) => {
			const matchSearch =
				!search ||
				p.name.toLowerCase().includes(search.toLowerCase()) ||
				p.description.toLowerCase().includes(search.toLowerCase());
			const matchCat = activeCategory === 'all' || p.category === activeCategory;
			const matchMarket = activeMarket === 'all' || p.markets.includes(activeMarket);
			return matchSearch && matchCat && matchMarket;
		})
	);

	// ─── Wizard state ─────────────────────────────────────────────────────────

	let wizardOpen = $state(false);
	let wizardProvider = $state<ProviderEntry | null>(null);

	let oauthStarting = $state<string | null>(null);

	async function openWizard(provider: ProviderEntry) {
		if (!provider.implemented) {
			toast.info(`${provider.name} — disponible prochainement.`);
			return;
		}
		if (provider.authType === 'csv' && provider.csvRoute) {
			window.location.href = provider.csvRoute;
			return;
		}
		if (provider.authType === 'oauth') {
			oauthStarting = provider.id;
			try {
				const url = await client.mutation(anyApi.integrations.accounting.createOAuthStart, {
					provider: provider.id as 'xero' | 'quickbooks' | 'freeagent' | 'fortnox' | 'visma'
				});
				window.location.href = url as string;
			} catch (err: unknown) {
				const msg = err instanceof Error ? err.message : 'Erreur OAuth';
				toast.error(msg);
				oauthStarting = null;
			}
			return;
		}
		wizardProvider = provider;
		wizardOpen = true;
	}

	// ─── Disconnect ───────────────────────────────────────────────────────────

	let disconnecting = $state<string | null>(null);

	async function handleDisconnect(integrationId: Id<'accountingIntegrations'>) {
		disconnecting = integrationId;
		try {
			await client.mutation(anyApi.integrations.accounting.disconnectIntegration, {
				integrationId
			});
			toast.success('Intégration déconnectée');
		} catch {
			toast.error('Erreur lors de la déconnexion');
		} finally {
			disconnecting = null;
		}
	}

	// ─── Manual sync ─────────────────────────────────────────────────────────

	let syncing = $state<string | null>(null);

	async function handleSync(integrationId: Id<'accountingIntegrations'>) {
		syncing = integrationId;
		try {
			await client.mutation(anyApi.integrations.accounting.triggerManualSync, { integrationId });
			toast.success('Synchronisation relancée');
		} catch {
			toast.error('Erreur lors de la synchronisation');
		} finally {
			syncing = null;
		}
	}

	// ─── Mapping panel ────────────────────────────────────────────────────────

	let mappingOpen = $state(false);
	let selectedIntegrationId = $state<Id<'accountingIntegrations'> | null>(null);

	const mappingsQuery = useQuery(anyApi.integrations.accounting.getCategoryMappings, () =>
		selectedIntegrationId ? { integrationId: selectedIntegrationId } : 'skip'
	);
	const syncLogsQuery = useQuery(anyApi.integrations.accounting.getRecentSyncLogs, () =>
		selectedIntegrationId ? { integrationId: selectedIntegrationId, limit: 10 } : 'skip'
	);

	function openMapping(id: Id<'accountingIntegrations'>) {
		selectedIntegrationId = id;
		mappingOpen = true;
	}

	async function handleMappingUpdate(
		mappingId: Id<'accountingCategoryMappings'>,
		code: string,
		label: string
	) {
		try {
			await client.mutation(anyApi.integrations.accounting.updateCategoryMapping, {
				mappingId,
				externalAccountCode: code,
				externalAccountLabel: label
			});
			toast.success('Mapping mis à jour');
		} catch {
			toast.error('Erreur lors de la mise à jour');
		}
	}

	// ─── API Keys ─────────────────────────────────────────────────────────────

	let newKeyOpen = $state(false);
	let newKeyName = $state('');
	let newKeyScopes = $state<string[]>(['costs:read', 'vehicles:read']);
	let creatingKey = $state(false);
	let createdKey = $state<string | null>(null);

	const ALL_SCOPES = [
		{ id: 'costs:read', label: 'Coûts — lecture' },
		{ id: 'costs:write', label: 'Coûts — écriture' },
		{ id: 'vehicles:read', label: 'Véhicules — lecture' },
		{ id: 'expenses:read', label: 'Notes de frais — lecture' }
	];

	function toggleScope(scope: string) {
		newKeyScopes = newKeyScopes.includes(scope)
			? newKeyScopes.filter((s) => s !== scope)
			: [...newKeyScopes, scope];
	}

	async function handleCreateKey() {
		if (!newKeyName.trim() || !newKeyScopes.length) return;
		creatingKey = true;
		try {
			const result = await client.mutation(anyApi.integrations.apiKeys.createApiKey, {
				name: newKeyName.trim(),
				scopes: newKeyScopes
			});
			createdKey = result.key;
		} catch {
			toast.error('Erreur lors de la création de la clé');
		} finally {
			creatingKey = false;
		}
	}

	function closeNewKey() {
		newKeyOpen = false;
		newKeyName = '';
		newKeyScopes = ['costs:read', 'vehicles:read'];
		createdKey = null;
	}

	async function copyKey() {
		if (!createdKey) return;
		await navigator.clipboard.writeText(createdKey);
		toast.success('Clé copiée');
	}

	async function handleRevokeKey(keyId: Id<'apiKeys'>) {
		try {
			await client.mutation(anyApi.integrations.apiKeys.revokeApiKey, { keyId });
			toast.success('Clé révoquée');
		} catch {
			toast.error('Erreur lors de la révocation');
		}
	}

	// ─── Webhooks ─────────────────────────────────────────────────────────────

	let newWebhookOpen = $state(false);
	let webhookUrl = $state('');
	let webhookEvents = $state<string[]>(['cost.created']);
	let createdWebhookSecret = $state<string | null>(null);
	let showSecretDialog = $state(false);
	let creatingWebhook = $state(false);

	const ALL_EVENTS = [
		{ id: 'cost.created', label: 'Coût créé' },
		{ id: 'cost.updated', label: 'Coût modifié' },
		{ id: 'expense.approved', label: 'Note de frais approuvée' },
		{ id: 'reservation.created', label: 'Réservation créée' }
	];

	function toggleEvent(event: string) {
		webhookEvents = webhookEvents.includes(event)
			? webhookEvents.filter((e) => e !== event)
			: [...webhookEvents, event];
	}

	async function handleCreateWebhook() {
		if (!webhookUrl.trim() || !webhookEvents.length) return;
		creatingWebhook = true;
		try {
			const res = await fetch('/api/webhooks/create', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: webhookUrl.trim(), events: webhookEvents })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error((err as { error?: string }).error ?? 'Erreur lors de la création');
			}
			const data = await res.json();
			newWebhookOpen = false;
			webhookUrl = '';
			webhookEvents = ['cost.created'];
			createdWebhookSecret = data.secret;
			showSecretDialog = true;
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Erreur lors de la création');
		} finally {
			creatingWebhook = false;
		}
	}

	async function handleDeleteWebhook(endpointId: Id<'webhookEndpoints'>) {
		try {
			await client.mutation(anyApi.integrations.apiKeys.deleteWebhookEndpoint, { endpointId });
			toast.success('Webhook supprimé');
		} catch {
			toast.error('Erreur lors de la suppression');
		}
	}

	async function toggleWebhookActive(endpointId: Id<'webhookEndpoints'>, isActive: boolean) {
		try {
			await client.mutation(anyApi.integrations.apiKeys.updateWebhookEndpointMutation, {
				endpointId,
				isActive: !isActive
			});
		} catch {
			toast.error('Erreur');
		}
	}

	// ─── Helpers ─────────────────────────────────────────────────────────────

	function getIntegration(providerId: string) {
		return integrationsQuery.data?.find((i) => i.provider === providerId);
	}

	function getCommsIntegration(providerId: string) {
		return commsIntegrationsQuery.data?.find((c) => c.provider === providerId);
	}

	async function handleCommsDisconnect(provider: 'slack' | 'teams') {
		try {
			await client.mutation(anyApi.comms.disconnectCommsProvider, { provider });
			toast.success('Déconnecté avec succès');
		} catch {
			toast.error('Erreur lors de la déconnexion');
		}
	}

	function formatDate(ts: number) {
		return new Date(ts).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
	}

	const CATEGORY_LABELS: Record<string, string> = {
		LEASING: 'Leasing / Location',
		CARBURANT: 'Carburant',
		ENTRETIEN: 'Entretien',
		ASSURANCE: 'Assurance',
		TAXES: 'Taxes (TVS)',
		SINISTRE: 'Sinistres',
		PARKING: 'Parking',
		TELEPEAGE: 'Télépéage',
		AUTRE: 'Autres',
		IK: 'Indemnités kilométriques'
	};

	const connectedCount = $derived(
		(integrationsQuery.data?.filter((i) => i.status === 'CONNECTED').length ?? 0) +
			(commsIntegrationsQuery.data?.filter((c) => c.isActive).length ?? 0)
	);
</script>

<!-- ─── Integration Wizard ──────────────────────────────────────────────────── -->
{#if wizardProvider}
	<IntegrationWizard
		provider={wizardProvider}
		bind:open={wizardOpen}
		onSuccess={() => toast.success(`${wizardProvider?.name} connecté avec succès`)}
	/>
{/if}

<!-- ─── Mapping panel ──────────────────────────────────────────────────────── -->
<Dialog.Root bind:open={mappingOpen}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Mapping comptable</Dialog.Title>
			<Dialog.Description
				>Associez chaque catégorie Mycelium à un compte PCG et un axe analytique.</Dialog.Description
			>
		</Dialog.Header>
		<div class="max-h-[60vh] space-y-1 overflow-y-auto py-2">
			{#if mappingsQuery.isLoading}
				{#each { length: 6 } as _, i (i)}
					<Skeleton class="h-10 w-full rounded-lg" />
				{/each}
			{:else if mappingsQuery.data}
				<div
					class="grid grid-cols-[1fr_7rem_7rem] gap-2 px-1 py-1 text-xs font-medium text-muted-foreground"
				>
					<span>Catégorie</span><span>Compte PCG</span><span>Axe analytique</span>
				</div>
				{#each mappingsQuery.data as m (m._id)}
					<div
						class="grid grid-cols-[1fr_7rem_7rem] items-center gap-2 rounded-lg border border-border/50 px-3 py-2"
					>
						<span class="text-sm">{CATEGORY_LABELS[m.myceliumCategory] ?? m.myceliumCategory}</span>
						<Input
							class="h-7 text-xs"
							value={m.externalAccountCode}
							onblur={(e) =>
								handleMappingUpdate(
									m._id,
									(e.target as HTMLInputElement).value,
									m.externalAccountLabel ?? ''
								)}
						/>
						<span class="text-xs text-muted-foreground">{m.analyticAxis ?? 'Flotte'}</span>
					</div>
				{/each}
			{/if}
		</div>
		{#if syncLogsQuery.data?.length}
			<div class="border-t border-border/60 pt-3">
				<p class="mb-2 text-xs font-medium text-muted-foreground">Dernières synchronisations</p>
				<div class="max-h-40 space-y-1 overflow-y-auto">
					{#each syncLogsQuery.data as log (log._id)}
						<div class="flex items-center gap-2 rounded px-2 py-1 text-xs">
							{#if log.status === 'SUCCESS'}
								<CheckCircle2Icon class="h-3.5 w-3.5 shrink-0 text-emerald-500" />
							{:else if log.status === 'FAILED'}
								<XCircleIcon class="h-3.5 w-3.5 shrink-0 text-destructive" />
							{:else}
								<ClockIcon class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
							{/if}
							<span class="text-muted-foreground">{log.entityType}</span>
							<span class="truncate font-mono text-[10px] text-muted-foreground/60"
								>{log.entityId.slice(-8)}</span
							>
							{#if log.error}
								<span class="ml-auto max-w-[160px] truncate text-destructive">{log.error}</span>
							{:else if log.syncedAt}
								<span class="ml-auto text-muted-foreground/60">{formatDate(log.syncedAt)}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (mappingOpen = false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ─── New API Key modal ──────────────────────────────────────────────────── -->
<Dialog.Root bind:open={newKeyOpen} onOpenChange={(o) => !o && closeNewKey()}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Nouvelle clé API</Dialog.Title>
			<Dialog.Description
				>La clé ne sera affichée qu'une seule fois. Conservez-la en lieu sûr.</Dialog.Description
			>
		</Dialog.Header>
		{#if createdKey}
			<div class="space-y-3 py-2">
				<p class="text-sm text-muted-foreground">
					Copiez cette clé maintenant — elle ne sera plus affichée.
				</p>
				<div class="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2">
					<EyeOffIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
					<code class="flex-1 truncate font-mono text-xs">{createdKey}</code>
					<Button size="sm" variant="ghost" class="h-7 w-7 p-0" onclick={copyKey}>
						<CopyIcon class="h-3.5 w-3.5" />
					</Button>
				</div>
			</div>
			<Dialog.Footer>
				<Button onclick={closeNewKey}>Fermer</Button>
			</Dialog.Footer>
		{:else}
			<div class="space-y-4 py-2">
				<div class="space-y-1.5">
					<Label for="key-name">Nom de la clé</Label>
					<Input id="key-name" placeholder="Odoo production" bind:value={newKeyName} />
				</div>
				<div class="space-y-1.5">
					<Label>Permissions (scopes)</Label>
					<div class="grid grid-cols-2 gap-2">
						{#each ALL_SCOPES as scope (scope.id)}
							<button
								type="button"
								onclick={() => toggleScope(scope.id)}
								class={[
									'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors',
									newKeyScopes.includes(scope.id)
										? 'border-[var(--brand)]/40 bg-[var(--brand)]/10 text-foreground'
										: 'border-border/50 text-muted-foreground hover:border-border'
								].join(' ')}
							>
								<span
									class={[
										'h-3.5 w-3.5 shrink-0 rounded-sm border',
										newKeyScopes.includes(scope.id)
											? 'border-[var(--brand)] bg-[var(--brand)]'
											: 'border-muted-foreground/40'
									].join(' ')}
								></span>
								{scope.label}
							</button>
						{/each}
					</div>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={closeNewKey}>Annuler</Button>
				<Button
					onclick={handleCreateKey}
					disabled={creatingKey || !newKeyName.trim() || !newKeyScopes.length}
				>
					{#if creatingKey}
						<span
							class="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
						></span>
					{:else}
						<KeyIcon class="mr-2 h-4 w-4" />
					{/if}
					Créer la clé
				</Button>
			</Dialog.Footer>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- ─── New Webhook modal ──────────────────────────────────────────────────── -->
<Dialog.Root bind:open={newWebhookOpen}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Nouveau webhook</Dialog.Title>
			<Dialog.Description
				>Les payloads sont signés HMAC SHA-256 via le header <code>X-Mycelium-Signature</code
				>.</Dialog.Description
			>
		</Dialog.Header>
		<div class="space-y-4 py-2">
			<div class="space-y-1.5">
				<Label for="webhook-url">URL HTTPS</Label>
				<Input
					id="webhook-url"
					placeholder="https://votre-app.com/hooks/mycelium"
					bind:value={webhookUrl}
				/>
			</div>
			<div class="space-y-1.5">
				<Label>Événements</Label>
				<div class="space-y-1.5">
					{#each ALL_EVENTS as event (event.id)}
						<button
							type="button"
							onclick={() => toggleEvent(event.id)}
							class={[
								'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs transition-colors',
								webhookEvents.includes(event.id)
									? 'border-[var(--brand)]/40 bg-[var(--brand)]/10 text-foreground'
									: 'border-border/50 text-muted-foreground hover:border-border'
							].join(' ')}
						>
							<span
								class={[
									'h-3.5 w-3.5 shrink-0 rounded-sm border',
									webhookEvents.includes(event.id)
										? 'border-[var(--brand)] bg-[var(--brand)]'
										: 'border-muted-foreground/40'
								].join(' ')}
							></span>
							{event.label}
							<code class="ml-auto text-[10px] text-muted-foreground/60">{event.id}</code>
						</button>
					{/each}
				</div>
			</div>
		</div>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (newWebhookOpen = false)}>Annuler</Button>
			<Button
				onclick={handleCreateWebhook}
				disabled={creatingWebhook || !webhookUrl.trim() || !webhookEvents.length}
			>
				{#if creatingWebhook}
					<span
						class="mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin"
					></span>
				{:else}
					<WebhookIcon class="mr-2 h-4 w-4" />
				{/if}
				Créer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ─── Webhook secret (shown once) ──────────────────────────────────────── -->
<Dialog.Root bind:open={showSecretDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Clé secrète du webhook</Dialog.Title>
			<Dialog.Description>
				Copiez cette clé maintenant — elle ne sera plus jamais affichée. Utilisez-la pour vérifier
				la signature
				<code>X-Mycelium-Signature</code>.
			</Dialog.Description>
		</Dialog.Header>
		<div class="rounded-lg border border-border bg-muted/50 p-3">
			<code class="font-mono text-xs break-all select-all">{createdWebhookSecret}</code>
		</div>
		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={() => {
					if (createdWebhookSecret) {
						navigator.clipboard.writeText(createdWebhookSecret);
						toast.success('Clé copiée');
					}
				}}
			>
				<CopyIcon class="mr-2 h-3.5 w-3.5" />
				Copier
			</Button>
			<Button
				onclick={() => {
					showSecretDialog = false;
					createdWebhookSecret = null;
				}}
			>
				J'ai copié la clé
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- ─── Main content ──────────────────────────────────────────────────────── -->
<div class="space-y-4">
	<div class="flex items-start justify-between gap-4">
		<div>
			<h2 class="text-sm font-semibold">Intégrations & API</h2>
			<p class="mt-0.5 text-sm text-muted-foreground">
				{PROVIDERS.length} intégrations disponibles — comptabilité, RH, carburant, télématique et plus.
			</p>
		</div>
		{#if connectedCount > 0}
			<div class="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1">
				<div class="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
				<span class="text-xs font-medium text-emerald-600 dark:text-emerald-400">
					{connectedCount} connecté{connectedCount > 1 ? 's' : ''}
				</span>
			</div>
		{/if}
	</div>

	<Tabs.Root value="connectors">
		<Tabs.List class="mb-4">
			<Tabs.Trigger value="connectors">Connecteurs</Tabs.Trigger>
			<Tabs.Trigger value="dev">Développeurs / API</Tabs.Trigger>
		</Tabs.List>

		<!-- ─── Tab Connecteurs ──────────────────────────────────────────── -->
		<Tabs.Content value="connectors" class="space-y-4">
			<!-- Search + filters -->
			<div class="space-y-3">
				<div class="relative">
					<SearchIcon
						class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground/60"
					/>
					<input
						type="text"
						placeholder="Rechercher Xero, Fortnox, Slack…"
						bind:value={search}
						class="h-9 w-full rounded-lg border border-border/60 bg-muted/20 pr-4 pl-9 text-sm transition-colors outline-none placeholder:text-muted-foreground/50 focus:border-[var(--brand)]/40 focus:ring-1 focus:ring-[var(--brand)]/20"
					/>
				</div>

				<!-- Category pills -->
				<div class="scrollbar-none flex gap-2 overflow-x-auto pb-0.5">
					{#each CATEGORIES as cat (cat.id)}
						<button
							type="button"
							onclick={() => (activeCategory = cat.id)}
							class={[
								'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
								activeCategory === cat.id
									? 'border-[var(--brand)]/40 bg-[var(--brand)]/10 text-foreground'
									: 'border-border/50 text-muted-foreground hover:border-border hover:text-foreground'
							].join(' ')}
						>
							{cat.label}
						</button>
					{/each}
					<div class="mx-1 w-px shrink-0 bg-border/40"></div>
					{#each MARKET_FILTERS as m (m.id)}
						<button
							type="button"
							onclick={() => (activeMarket = m.id)}
							class={[
								'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
								activeMarket === m.id
									? 'border-border bg-muted text-foreground'
									: 'border-border/40 text-muted-foreground/60 hover:border-border hover:text-muted-foreground'
							].join(' ')}
						>
							{m.label}
						</button>
					{/each}
				</div>
			</div>

			<!-- Provider grid -->
			{#if integrationsQuery.isLoading}
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each { length: 6 } as _, i (i)}
						<Skeleton class="h-44 w-full rounded-xl" />
					{/each}
				</div>
			{:else if filteredProviders.length === 0}
				<div
					class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-12 text-center"
				>
					<FilterIcon class="h-8 w-8 text-muted-foreground/30" />
					<p class="text-sm text-muted-foreground">Aucune intégration trouvée pour ces filtres.</p>
					<button
						type="button"
						onclick={() => {
							search = '';
							activeCategory = 'all';
							activeMarket = 'all';
						}}
						class="text-xs text-[var(--brand)] hover:underline"
					>
						Réinitialiser les filtres
					</button>
				</div>
			{:else}
				<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					{#each filteredProviders as provider (provider.id)}
						{@const integration = getIntegration(provider.id)}
						{@const commsIntegration = getCommsIntegration(provider.id)}
						{@const isComms = provider.category === 'comms'}
						{@const isConnected = isComms
							? !!commsIntegration?.isActive
							: integration?.status === 'CONNECTED'}
						{@const isError = !isComms && integration?.status === 'ERROR'}

						<Card.Root
							class={[
								'relative overflow-hidden rounded-xl border bg-card transition-all duration-200',
								isConnected
									? 'border-emerald-500/20 shadow-[0_0_0_1px_rgba(34,197,94,0.08)]'
									: 'border-border/60 hover:border-border'
							].join(' ')}
						>
							<Card.Content class="p-4">
								<!-- Logo + status -->
								<div class="flex items-start justify-between gap-3">
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-border/30"
									>
										<img
											src={getLogoUrl(provider.domain)}
											alt={provider.name}
											class="h-full w-full object-contain"
											onerror={(e) => {
												const el = e.currentTarget as HTMLImageElement;
												el.style.display = 'none';
												el.parentElement!.innerHTML = `<span class="text-xs font-bold text-muted-foreground">${provider.name.slice(0, 2)}</span>`;
											}}
										/>
									</div>
									<div class="flex flex-wrap items-center justify-end gap-1.5">
										<span
											class={[
												'rounded-full px-2 py-0.5 text-[10px] font-medium',
												isConnected
													? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
													: isError
														? 'bg-destructive/10 text-destructive'
														: provider.authType === 'csv'
															? 'bg-blue-500/10 text-blue-500'
															: !provider.implemented
																? 'bg-muted text-muted-foreground'
																: 'bg-[var(--brand)]/10 text-[var(--brand)]'
											].join(' ')}
										>
											{isConnected
												? 'Connecté'
												: isError
													? 'Erreur'
													: provider.authType === 'csv'
														? 'CSV'
														: !provider.implemented
															? 'Bientôt'
															: 'Disponible'}
										</span>
									</div>
								</div>

								<!-- Name + markets + description -->
								<div class="mt-3">
									<div class="flex flex-wrap items-center gap-2">
										<p class="text-sm font-semibold">{provider.name}</p>
										<div class="flex gap-1">
											{#each provider.markets.slice(0, 3) as m (m)}
												<span
													class="rounded bg-muted/50 px-1 py-0 text-[8px] font-medium tracking-wide text-muted-foreground/70 uppercase"
													>{m}</span
												>
											{/each}
											{#if provider.markets.length > 3}
												<span
													class="rounded bg-muted/50 px-1 py-0 text-[8px] text-muted-foreground/70"
													>+{provider.markets.length - 3}</span
												>
											{/if}
										</div>
									</div>
									<p class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
										{provider.description}
									</p>
								</div>

								<!-- Last used info (comms) / Last sync info (accounting) -->
								{#if isComms && commsIntegration?.lastUsedAt}
									<p class="mt-2 text-[10px] text-muted-foreground/60">
										Dernier message : {formatDate(commsIntegration.lastUsedAt)}
									</p>
									{#if commsIntegration.lastError}
										<p class="mt-1 flex items-center gap-1 text-[10px] text-destructive">
											<AlertCircleIcon class="h-3 w-3" />
											{commsIntegration.lastError}
										</p>
									{/if}
								{:else if integration?.lastSyncAt}
									<p class="mt-2 text-[10px] text-muted-foreground/60">
										Dernière sync : {formatDate(integration.lastSyncAt)}
									</p>
								{/if}
								{#if isError && integration?.lastSyncError}
									<p class="mt-1 flex items-center gap-1 text-[10px] text-destructive">
										<AlertCircleIcon class="h-3 w-3" />
										{integration.lastSyncError}
									</p>
								{/if}

								<!-- Actions -->
								<div class="mt-3 flex flex-wrap items-center gap-1.5">
									{#if isComms && isConnected}
										<span class="mr-auto text-[10px] text-emerald-600 dark:text-emerald-400">
											{commsIntegration?.label ?? 'Webhook actif'}
										</span>
										<Button
											size="sm"
											variant="ghost"
											class="h-7 text-xs text-muted-foreground hover:text-destructive"
											onclick={() => handleCommsDisconnect(provider.id as 'slack' | 'teams')}
										>
											<UnlinkIcon class="h-3 w-3" />
										</Button>
									{:else if isConnected || isError}
										<Button
											size="sm"
											variant="outline"
											class="h-7 text-xs"
											disabled={syncing === integration?._id}
											onclick={() => integration && handleSync(integration._id)}
										>
											<RefreshCwIcon
												class={[
													'mr-1.5 h-3 w-3',
													syncing === integration?._id ? 'motion-safe:animate-spin' : ''
												].join(' ')}
											/>
											Sync
										</Button>
										<Button
											size="sm"
											variant="ghost"
											class="h-7 text-xs"
											onclick={() => integration && openMapping(integration._id)}
										>
											<SettingsIcon class="mr-1.5 h-3 w-3" />
											Mapping
										</Button>
										<Button
											size="sm"
											variant="ghost"
											class="ml-auto h-7 text-xs text-muted-foreground hover:text-destructive"
											disabled={disconnecting === integration?._id}
											onclick={() => integration && handleDisconnect(integration._id)}
										>
											<UnlinkIcon class="h-3 w-3" />
										</Button>
									{:else if provider.authType === 'csv'}
										<Button size="sm" class="h-7 text-xs" onclick={() => openWizard(provider)}>
											Importer CSV
										</Button>
									{:else if provider.implemented}
										<Button
											size="sm"
											class="h-7 gap-1 text-xs"
											disabled={oauthStarting === provider.id}
											onclick={() => openWizard(provider)}
										>
											{#if oauthStarting === provider.id}
												<svg
													class="h-3 w-3 motion-safe:animate-spin"
													viewBox="0 0 24 24"
													fill="none"
												>
													<circle
														class="opacity-25"
														cx="12"
														cy="12"
														r="10"
														stroke="currentColor"
														stroke-width="4"
													/>
													<path
														class="opacity-75"
														fill="currentColor"
														d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"
													/>
												</svg>
											{:else}
												<LinkIcon class="h-3 w-3" />
											{/if}
											Connecter
										</Button>
									{:else}
										<span class="text-[10px] text-muted-foreground/50"
											>Disponible prochainement</span
										>
									{/if}
								</div>
							</Card.Content>
						</Card.Root>
					{/each}
				</div>
			{/if}

			<!-- Info banner -->
			<div class="rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-3">
				<p class="text-xs text-muted-foreground">
					<span class="font-medium text-foreground"
						>{PROVIDERS.filter((p) => p.implemented).length} intégrations actives</span
					>
					— {PROVIDERS.filter((p) => !p.implemented).length} en développement (UK + Nordiques). Toutes
					les connexions sont chiffrées AES-256-GCM.
				</p>
			</div>
		</Tabs.Content>

		<!-- ─── Tab Développeurs ──────────────────────────────────────────── -->
		<Tabs.Content value="dev" class="space-y-6">
			<!-- API Keys -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-sm font-semibold">Clés API</h3>
						<p class="mt-0.5 text-xs text-muted-foreground">
							Authentification Bearer <code class="text-[10px]">myc_live_…</code> sur l'API REST v1.
						</p>
					</div>
					<Button size="sm" class="h-7 text-xs" onclick={() => (newKeyOpen = true)}>
						<PlusIcon class="mr-1.5 h-3 w-3" />
						Nouvelle clé
					</Button>
				</div>

				{#if apiKeysQuery.isLoading}
					<Skeleton class="h-20 w-full rounded-xl" />
				{:else if !apiKeysQuery.data?.length}
					<div
						class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-8 text-center"
					>
						<KeyIcon class="h-8 w-8 text-muted-foreground/40" />
						<p class="text-sm text-muted-foreground">
							Aucune clé API — créez-en une pour commencer.
						</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each apiKeysQuery.data as key (key._id)}
							<div
								class="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3"
							>
								<KeyIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium">{key.name}</p>
									<p class="font-mono text-[10px] text-muted-foreground/60">{key.prefix}…</p>
								</div>
								<div class="flex flex-wrap items-center justify-end gap-1.5">
									{#each key.scopes as scope (scope)}
										<Badge variant="outline" class="px-1.5 py-0 text-[9px]">{scope}</Badge>
									{/each}
								</div>
								{#if key.lastUsedAt}
									<span class="shrink-0 text-[10px] text-muted-foreground/60"
										>{formatDate(key.lastUsedAt)}</span
									>
								{/if}
								<Button
									size="sm"
									variant="ghost"
									class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
									onclick={() => handleRevokeKey(key._id)}
								>
									<TrashIcon class="h-3.5 w-3.5" />
								</Button>
							</div>
						{/each}
					</div>
				{/if}

				<div class="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
					<p class="text-xs font-medium text-muted-foreground">Base URL</p>
					<code class="text-xs"
						>{PUBLIC_CONVEX_SITE_URL ?? 'https://yourapp.convex.site'}/api/v1</code
					>
					<p class="mt-2 text-[10px] text-muted-foreground/70">
						Endpoints : <code>GET /costs</code>, <code>POST /costs</code>,
						<code>GET /vehicles</code>, <code>GET /expenses</code>, <code>GET /webhooks</code>
					</p>
				</div>
			</div>

			<!-- Webhooks -->
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-sm font-semibold">Webhooks</h3>
						<p class="mt-0.5 text-xs text-muted-foreground">
							Payloads signés HMAC SHA-256 — header <code class="text-[10px]"
								>X-Mycelium-Signature</code
							>. Retry x5 avec backoff.
						</p>
					</div>
					<Button size="sm" class="h-7 text-xs" onclick={() => (newWebhookOpen = true)}>
						<PlusIcon class="mr-1.5 h-3 w-3" />
						Nouveau webhook
					</Button>
				</div>

				{#if webhooksQuery.isLoading}
					<Skeleton class="h-20 w-full rounded-xl" />
				{:else if !webhooksQuery.data?.length}
					<div
						class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-8 text-center"
					>
						<WebhookIcon class="h-8 w-8 text-muted-foreground/40" />
						<p class="text-sm text-muted-foreground">
							Aucun webhook — créez-en un pour recevoir des événements.
						</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each webhooksQuery.data as endpoint (endpoint._id)}
							<div class="rounded-xl border border-border/60 bg-card px-4 py-3">
								<div class="flex items-center gap-3">
									<WebhookIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
									<div class="min-w-0 flex-1">
										<p class="truncate font-mono text-sm">{endpoint.url}</p>
										<div class="mt-1 flex flex-wrap gap-1">
											{#each endpoint.events as event (event)}
												<Badge variant="outline" class="px-1.5 py-0 text-[9px]">{event}</Badge>
											{/each}
										</div>
									</div>
									<button
										type="button"
										onclick={() => toggleWebhookActive(endpoint._id, endpoint.isActive)}
										class={[
											'shrink-0 cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors',
											endpoint.isActive
												? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
												: 'bg-muted text-muted-foreground hover:bg-muted/80'
										].join(' ')}
									>
										{endpoint.isActive ? 'Actif' : 'Inactif'}
									</button>
									{#if endpoint.lastDeliveredAt}
										<span class="shrink-0 text-[10px] text-muted-foreground/60"
											>{formatDate(endpoint.lastDeliveredAt)}</span
										>
									{/if}
									<Button
										size="sm"
										variant="ghost"
										class="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
										onclick={() => handleDeleteWebhook(endpoint._id)}
									>
										<TrashIcon class="h-3.5 w-3.5" />
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<div class="rounded-lg border border-[var(--brand)]/20 bg-[var(--brand)]/5 p-3">
				<p class="text-xs text-muted-foreground">
					<span class="font-medium text-foreground"
						>API publique — Plan Business (1 490€/mois).</span
					>
					Intégrez Mycelium dans vos outils internes ou utilisez le module Odoo community.
				</p>
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>
