import { useState, type ReactNode } from 'react';
import { Button, Input, Spinner } from '@cladd-ui/react';
import {
	CheckIcon,
	CircleIcon,
	EyeIcon,
	EyeOffIcon,
	FileUpIcon,
	KeyRoundIcon,
	LockIcon,
	PlusIcon,
	ShieldCheckIcon,
	UnplugIcon
} from 'lucide-react';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { Champ } from './cadre-auth';
import { CarteBouton, ListeDeCartes } from './carte-rangee';
import { cn } from './cn';
import { EnTeteDeGroupe } from './en-tete-groupe';
import { pluriel } from './format';
import {
	BarreDePleinEcran,
	ColonneDePleinEcran,
	FeuillePleinEcran,
	JaugeDEtapes,
	PiedDePleinEcran,
	PleinEcran
} from './plein-ecran';

/**
 * BRANCHER UN LOGICIEL : la page pleine qui relie la facturation ou la
 * comptabilité du gérant (13/10/2026).
 *
 *   1. LE LOGICIEL : ceux que l'établissement peut brancher, et ce que Letikette
 *      en fera, écrit AVANT qu'on touche quoi que ce soit ;
 *   2. L'ACCÈS : la fenêtre du logiciel (on s'y connecte, on accepte), ou la clé
 *      en lecture seule qu'il faut y créer, pas à pas ;
 *   3. BRANCHÉ : la coche, puis la lecture qui avance sous les yeux.
 *
 * Relevé sur Mobbin : le catalogue puis l'autorisation de Plaid et de Mercury
 * (« ce qui sera partagé » avant de partir), les étapes numérotées d'Acctual pour
 * coller une clé, et la coche de fin de Cash App.
 *
 * ⚠️ IL NE BRANCHE RIEN LUI-MÊME. `src/ui` ne connaît ni Convex ni Nango : tout
 * passe par `onChoisir` et `onBrancher`, que construit `app/connexion-nango.tsx`.
 *
 * ⚠️ `onBrancher` EST APPELÉ DANS LE CLIC, SANS RIEN ATTENDRE AVANT. La fenêtre
 * d'autorisation s'ouvre dans ce même geste : un navigateur bloque une fenêtre
 * ouverte après une attente. C'est pour cela que le bouton reste inerte tant que
 * la session se prépare (`PREPARATION`).
 */

/** Comment le logiciel se branche : par sa fenêtre d'autorisation, ou par une clé à coller. */
export type ModeDeBranchement = 'AUTORISATION' | 'CLE_PENNYLANE' | 'CLE_STRIPE' | 'REGION_ZOHO';

export interface LogicielABrancher {
	/** La clé de l'intégration dans le tableau de bord de Nango. */
	readonly integrationId: string;
	readonly nom: string;
	readonly mode: ModeDeBranchement;
	/** Combien de fois il est déjà branché dans l'établissement (plusieurs sociétés possibles). */
	readonly dejaBranche: number;
	/** Le logo officiel, auto-hébergé dans `public/connecteurs/`. Absent : l'initiale. */
	readonly logo?: string;
}

export type EtatDuCatalogue =
	| { readonly genre: 'CHARGEMENT' }
	| { readonly genre: 'ECHEC'; readonly message: string }
	| { readonly genre: 'PRET'; readonly logiciels: readonly LogicielABrancher[] };

/** Où en est le branchement du logiciel choisi. */
export type EtatDuBranchement =
	| { readonly genre: 'CHOIX' }
	/** La session se prépare : le bouton attend, pour que la fenêtre s'ouvre dans le clic. */
	| { readonly genre: 'PREPARATION'; readonly logiciel: LogicielABrancher }
	/** Prêt : `message` dit pourquoi la tentative d'avant n'a pas abouti. */
	| { readonly genre: 'PRET'; readonly logiciel: LogicielABrancher; readonly message?: string }
	/** La fenêtre du logiciel est ouverte, ou la clé est partie chez Nango. */
	| { readonly genre: 'AUTORISATION'; readonly logiciel: LogicielABrancher }
	/** Nango a dit oui : notre serveur relit la connexion avant de l'enregistrer. */
	| { readonly genre: 'VERIFICATION'; readonly logiciel: LogicielABrancher }
	| {
			readonly genre: 'BRANCHE';
			readonly logiciel: LogicielABrancher;
			/** Ce que le serveur publie de la lecture, en direct. */
			readonly lecture: string;
	  };

/** Ce que le gérant a saisi pour brancher : rien, une clé, ou l'adresse de son compte Zoho. */
export type SaisieDeBranchement =
	| { readonly genre: 'AUTORISATION' }
	| { readonly genre: 'CLE'; readonly cle: string }
	| { readonly genre: 'REGION'; readonly extension: string };

/* ═══════════════════════════════════════════════════════════════════════════
 * CE QUI SE VÉRIFIE AVANT L'ENVOI
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Le jeton d'entreprise de Pennylane : 43 caractères, lettres, chiffres, `_` et
 * `-` (motif publié par Nango pour `pennylane-company-api`, relevé le 13/10/2026).
 */
const FORME_JETON_PENNYLANE = /^[A-Za-z0-9_-]{43}$/;

/** Une clé restreinte de Stripe (`rk_live_…`), motif publié par Nango pour `stripe-api-key`. */
const FORME_CLE_STRIPE = /^rk_[a-z]+_[A-Za-z0-9]{8}[A-Za-z0-9]+([A-Za-z0-9]{8})$/;

/**
 * POURQUOI UNE CLÉ EST REFUSÉE AVANT DE PARTIR, ou `null` si elle a la bonne forme.
 *
 * ⚠️ UNE CLÉ SECRÈTE DE STRIPE (`sk_`) EST REFUSÉE, MÊME VALIDE. Elle ouvre tout
 * le compte, paiements et remboursements compris. Letikette ne lit que des
 * factures : la clé restreinte, en lecture seule, suffit, et c'est la seule
 * qu'on accepte de faire garder.
 */
export function refusDeLaCle(
	mode: ModeDeBranchement,
	cle: string,
	{ modeTestPermis }: { readonly modeTestPermis: boolean }
): string | null {
	const propre = cle.trim();
	if (propre === '') return 'Collez la clé ici.';
	if (mode === 'CLE_PENNYLANE') {
		return FORME_JETON_PENNYLANE.test(propre)
			? null
			: 'Un jeton Pennylane fait 43 caractères, sans espace. Recopiez-le en entier.';
	}
	if (mode === 'CLE_STRIPE') {
		if (propre.startsWith('sk_'))
			return 'C’est une clé secrète : elle ouvre tout votre compte Stripe. Créez plutôt une clé restreinte (rk_…), en lecture seule.';
		if (propre.startsWith('pk_'))
			return 'C’est une clé publique : elle ne lit pas les factures. Il faut une clé restreinte (rk_…).';
		if (propre.startsWith('rk_test_') && !modeTestPermis)
			return 'C’est une clé du mode test : elle lirait des factures fictives. Créez-la en mode réel (rk_live_…).';
		return FORME_CLE_STRIPE.test(propre)
			? null
			: 'Cette clé n’a pas la forme d’une clé restreinte de Stripe (rk_live_…). Recopiez-la en entier.';
	}
	return null;
}

/** Les adresses d'un compte Zoho, telles que Nango les nomme (`extension`). */
const ADRESSES_ZOHO: readonly { readonly extension: string; readonly libelle: string }[] = [
	{ extension: 'eu', libelle: 'zoho.eu · Europe' },
	{ extension: 'com', libelle: 'zoho.com · États-Unis' },
	{ extension: 'in', libelle: 'zoho.in · Inde' },
	{ extension: 'com.au', libelle: 'zoho.com.au · Australie' },
	{ extension: 'jp', libelle: 'zoho.jp · Japon' },
	{ extension: 'com.cn', libelle: 'zoho.com.cn · Chine' }
];

/* ═══════════════════════════════════════════════════════════════════════════
 * LES MORCEAUX
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * LA TUILE D'UN LOGICIEL : son logo officiel sur blanc, comme une icône
 * d'application, en clair comme en sombre. Sans logo, son initiale à l'encre.
 *
 * Les logos viennent du dépôt public de Nango (`template-logos`), relus et
 * auto-hébergés : aucune image ne se charge chez un tiers à l'affichage.
 */
export function TuileLogiciel({
	nom,
	logo,
	grande = false
}: {
	readonly nom: string;
	readonly logo?: string;
	readonly grande?: boolean;
}) {
	return (
		<span
			aria-hidden
			className={cn(
				'flex shrink-0 items-center justify-center overflow-hidden rounded-cladd-2xs bg-white font-bold text-encre-site ring-1 ring-black/5',
				grande ? 'text-cladd-lg size-16 shadow-lg' : 'size-10 text-cladd-sm'
			)}
		>
			{logo === undefined ? (
				nom.charAt(0).toUpperCase()
			) : (
				<img src={logo} alt="" className="size-full object-contain" loading="lazy" />
			)}
		</span>
	);
}

/** Comment ce logiciel se branche, en cinq mots : la sous-ligne de sa carte. */
function ligneDuLogiciel(logiciel: LogicielABrancher): string {
	const mode =
		logiciel.mode === 'CLE_PENNYLANE'
			? 'jeton en lecture seule'
			: logiciel.mode === 'CLE_STRIPE'
				? 'clé en lecture seule'
				: `autorisation chez ${logiciel.nom}`;
	if (logiciel.dejaBranche === 0) return mode.charAt(0).toUpperCase() + mode.slice(1);
	return `Déjà branché${logiciel.dejaBranche > 1 ? ` ${logiciel.dejaBranche} fois` : ''} · ${mode}`;
}

/**
 * CE QUI PROTÈGE UNE CONNEXION, en trois lignes vraies.
 *
 * ⚠️ CHAQUE PHRASE EST VÉRIFIÉE, ET AUCUNE N'EN DIT PLUS. Nango chiffre les accès
 * en AES-256-GCM et son relais ne garde ni le corps des requêtes ni celui des
 * réponses (« Security », docs Nango, relevé le 13/10/2026) ; notre clé chez lui
 * n'a pas la portée `read_credentials` ; les lecteurs n'envoient que des GET.
 * Jamais « de bout en bout » : les factures passent en clair par le relais.
 */
export function ProtectionsDesConnexions() {
	const lignes: { icone: ReactNode; titre: string; texte: string }[] = [
		{
			icone: <LockIcon />,
			titre: 'Lecture seule',
			texte:
				'Letikette lit vos factures de vente, leurs règlements et vos clients. Il n’écrit rien dans votre logiciel et n’y déclenche aucun paiement.'
		},
		{
			icone: <KeyRoundIcon />,
			titre: 'Vos accès restent chez Nango',
			texte:
				'Notre prestataire de connexion les garde, chiffrés (AES-256). La clé de Letikette chez lui ne permet pas de les lire.'
		},
		{
			icone: <UnplugIcon />,
			titre: 'Débranchable à tout moment',
			texte:
				'Ici, ou en retirant l’accès depuis votre logiciel. Les factures déjà entrées restent les vôtres.'
		}
	];
	return (
		<div className="verre-carte flex flex-col gap-cladd-3xs rounded-cladd-xl p-cladd-2xs">
			<p className="flex items-center gap-2 text-cladd-xs font-semibold">
				<ShieldCheckIcon className="size-4 text-cladd-primary" aria-hidden />
				Ce qui protège la connexion
			</p>
			<ul className="flex flex-col gap-2.5">
				{lignes.map((ligne) => (
					<li key={ligne.titre} className="flex items-start gap-2.5">
						<span className="mt-0.5 shrink-0 text-cladd-fg-soft [&>svg]:size-4" aria-hidden>
							{ligne.icone}
						</span>
						<span className="flex min-w-0 flex-col">
							<span className="text-cladd-2xs font-semibold">{ligne.titre}</span>
							<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">{ligne.texte}</span>
						</span>
					</li>
				))}
			</ul>
			<p className="text-cladd-3xs leading-relaxed text-cladd-fg-softer">
				Pendant la lecture, vos factures passent par le relais de Nango, qui n’en garde pas le
				contenu, puis sont enregistrées chez Letikette. Le détail est dans la politique de
				confidentialité.
			</p>
		</div>
	);
}

/** Un titre d'étape et sa phrase, comme dans le dépôt au coffre. */
function TeteDEtape({
	titre,
	children
}: {
	readonly titre: string;
	readonly children?: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1 px-1">
			<h2 className="text-cladd-lg leading-tight font-semibold">{titre}</h2>
			{children === undefined ? null : (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{children}</p>
			)}
		</div>
	);
}

/** Les étapes à faire chez le logiciel, numérotées : on les suit l'une après l'autre. */
function EtapesChezLeLogiciel({ etapes }: { readonly etapes: readonly ReactNode[] }) {
	return (
		<ol className="verre-carte flex flex-col gap-2.5 rounded-cladd-xl p-cladd-2xs">
			{etapes.map((etape, i) => (
				<li key={i} className="flex items-start gap-2.5">
					<span
						aria-hidden
						className="flex size-6 shrink-0 items-center justify-center rounded-full bg-cladd-fg/10 text-cladd-3xs font-semibold tabular-nums"
					>
						{i + 1}
					</span>
					<span className="min-w-0 pt-0.5 text-cladd-2xs leading-snug">{etape}</span>
				</li>
			))}
		</ol>
	);
}

/** Un nom de menu ou de bouton du logiciel, tel qu'il s'affiche chez lui. */
function Menu({ children }: { readonly children: ReactNode }) {
	return <span className="font-semibold">{children}</span>;
}

/** Ce que Letikette lira dans ce logiciel : écrit avant de partir, comme chez Plaid. */
function CeQuiSeraLu({ nom }: { readonly nom: string }) {
	return (
		<div className="verre-carte flex flex-col gap-2 rounded-cladd-xl p-cladd-2xs">
			<p className="text-cladd-2xs font-semibold">Ce que Letikette lira dans {nom}</p>
			<ul className="flex flex-col gap-1.5 text-cladd-2xs leading-snug text-cladd-fg-soft">
				{[
					'Vos factures de vente, leur échéance et ce qui en reste à payer',
					'Vos clients : leur nom, leur SIREN et leur e-mail',
					'Jamais vos achats, votre banque ni vos salariés'
				].map((ligne) => (
					<li key={ligne} className="flex items-start gap-2">
						<CheckIcon className="mt-0.5 size-3.5 shrink-0 text-cladd-fg-soft" aria-hidden />
						{ligne}
					</li>
				))}
			</ul>
		</div>
	);
}

/** Le champ d'une clé : masqué par défaut, l'œil pour relire ce qu'on a collé. */
function ChampDeCle({
	etiquette,
	valeur,
	onChange,
	refus
}: {
	readonly etiquette: string;
	readonly valeur: string;
	readonly onChange: (valeur: string) => void;
	/** Le refus, affiché sous le champ une fois qu'on a tenté d'envoyer. */
	readonly refus: string | null;
}) {
	const [visible, setVisible] = useState(false);
	return (
		<div className="flex flex-col gap-1.5">
			<Champ etiquette={etiquette}>
				<Input
					type={visible ? 'text' : 'password'}
					value={valeur}
					onChange={onChange}
					name="cle-logiciel"
					inputComponentProps={{
						autoComplete: 'off',
						spellCheck: false,
						autoCapitalize: 'off',
						autoCorrect: 'off'
					}}
					inputClassName="pr-1 font-mono"
					suffix={
						<Button
							type="button"
							size="sm"
							variant="transparent"
							outline={false}
							rounded
							square
							className="mr-1 shrink-0"
							aria-label={visible ? 'Masquer la clé' : 'Afficher la clé'}
							aria-pressed={visible}
							onClick={() => setVisible((v) => !v)}
						>
							{visible ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
						</Button>
					}
				/>
			</Champ>
			{refus === null ? null : (
				<p role="alert" className="px-1 text-cladd-2xs leading-snug text-cladd-fg">
					{refus}
				</p>
			)}
		</div>
	);
}

/** Le choix de l'adresse d'un compte Zoho : une carte par adresse, rien de coché d'avance. */
function ChoixAdresseZoho({
	choisie,
	onChoisir
}: {
	readonly choisie: string | null;
	readonly onChoisir: (extension: string) => void;
}) {
	return (
		<section className="flex flex-col gap-cladd-3xs" aria-label="L’adresse de votre compte Zoho">
			<EnTeteDeGroupe libelle="Où ouvrez-vous Zoho ?" />
			<ListeDeCartes>
				{ADRESSES_ZOHO.map((adresse) => (
					<CarteBouton
						key={adresse.extension}
						chevron={false}
						titre={adresse.libelle}
						icone={
							<span
								aria-hidden
								className="flex size-10 shrink-0 items-center justify-center text-cladd-fg-soft [&>svg]:size-5"
							>
								{choisie === adresse.extension ? (
									<CheckIcon className="text-cladd-primary" />
								) : (
									<CircleIcon />
								)}
							</span>
						}
						onClick={() => onChoisir(adresse.extension)}
					/>
				))}
			</ListeDeCartes>
		</section>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * L'ÉTAPE DE L'ACCÈS, PAR MODE
 * ═══════════════════════════════════════════════════════════════════════════ */

function AccesParAutorisation({ logiciel }: { readonly logiciel: LogicielABrancher }) {
	return (
		<>
			<TeteDEtape titre={`Autoriser ${logiciel.nom}`}>
				Une fenêtre de {logiciel.nom} va s’ouvrir. Connectez-vous et acceptez l’accès : elle se
				referme seule, et la lecture commence.
			</TeteDEtape>
			<CeQuiSeraLu nom={logiciel.nom} />
		</>
	);
}

function AccesParJetonPennylane({
	cle,
	onCle,
	refus
}: {
	readonly cle: string;
	readonly onCle: (cle: string) => void;
	readonly refus: string | null;
}) {
	return (
		<>
			<TeteDEtape titre="Votre jeton Pennylane">
				Un jeton en lecture seule, créé dans Pennylane en une minute.
			</TeteDEtape>
			<EtapesChezLeLogiciel
				etapes={[
					<>
						Dans Pennylane, ouvrez <Menu>Paramètres</Menu>, puis <Menu>Connectivité</Menu> et{' '}
						<Menu>Développeurs</Menu>.
					</>,
					<>
						Générez un jeton d’API pour l’<Menu>API V2</Menu>, en <Menu>lecture seule</Menu>. Sa
						durée est à votre choix : un jeton expiré se remplace ici.
					</>,
					<>Copiez-le tout de suite : Pennylane ne le remontre plus.</>,
					<>Collez-le ci-dessous.</>
				]}
			/>
			<ChampDeCle etiquette="Jeton d’API Pennylane" valeur={cle} onChange={onCle} refus={refus} />
			<p className="px-1 text-cladd-3xs leading-relaxed text-cladd-fg-soft">
				Le jeton part directement chez Nango, notre prestataire de connexion, sans passer par nos
				serveurs.
			</p>
			<CeQuiSeraLu nom="Pennylane" />
		</>
	);
}

function AccesParCleStripe({
	cle,
	onCle,
	refus
}: {
	readonly cle: string;
	readonly onCle: (cle: string) => void;
	readonly refus: string | null;
}) {
	return (
		<>
			<TeteDEtape titre="Votre clé Stripe">
				Une clé restreinte qui ne lit que vos factures, créée dans Stripe en une minute.
			</TeteDEtape>
			<EtapesChezLeLogiciel
				etapes={[
					<>
						Dans Stripe, ouvrez <Menu>Développeurs</Menu>, puis <Menu>Clés API</Menu>.
					</>,
					<>
						Créez une <Menu>clé restreinte</Menu>, en choisissant de la fournir à un autre site web
						: celui de Nango, <Menu>https://nango.dev</Menu>.
					</>,
					<>
						Personnalisez ses droits : <Menu>Factures</Menu> en lecture, rien d’autre.
					</>,
					<>Copiez la clé (elle commence par rk_live_) et collez-la ci-dessous.</>
				]}
			/>
			<ChampDeCle etiquette="Clé restreinte Stripe" valeur={cle} onChange={onCle} refus={refus} />
			<p className="px-1 text-cladd-3xs leading-relaxed text-cladd-fg-soft">
				La clé part directement chez Nango, notre prestataire de connexion, sans passer par nos
				serveurs. Une clé secrète (sk_) est refusée : elle ouvrirait tout votre compte.
			</p>
			<CeQuiSeraLu nom="Stripe" />
		</>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LE PARCOURS
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface ProprietesParcoursLogiciels {
	readonly ouvert: boolean;
	readonly onFermer: () => void;
	readonly catalogue: EtatDuCatalogue;
	readonly branchement: EtatDuBranchement;
	/** Le logiciel touché : la route prépare sa session pendant qu'on lit l'étape suivante. */
	readonly onChoisir: (logiciel: LogicielABrancher) => void;
	/** Revenir au choix du logiciel. */
	readonly onRetour: () => void;
	/** ⚠️ APPELÉ DANS LE CLIC : la fenêtre d'autorisation s'y ouvre. */
	readonly onBrancher: (logiciel: LogicielABrancher, saisie: SaisieDeBranchement) => void;
	/** Le logiciel n'y est pas : déposer un export au coffre. Absent là où le dépôt est déjà à l'écran. */
	readonly onDeposerUnExport?: () => void;
	/** Une clé de test de Stripe est permise (en développement seulement). */
	readonly modeTestPermis?: boolean;
}

export function ParcoursLogiciels({
	ouvert,
	onFermer,
	catalogue,
	branchement,
	onChoisir,
	onRetour,
	onBrancher,
	onDeposerUnExport,
	modeTestPermis = false
}: ProprietesParcoursLogiciels) {
	const etape = branchement.genre === 'CHOIX' ? 0 : branchement.genre === 'BRANCHE' ? 2 : 1;
	const titres = ['Le logiciel', 'L’accès', 'Branché'] as const;

	return (
		<PleinEcran ouvert={ouvert} onFermer={onFermer} libelle="Brancher un logiciel">
			<ColonneDePleinEcran>
				<BarreDePleinEcran
					titre="Brancher un logiciel"
					sousTitre={`Étape ${etape + 1} sur 3 · ${titres[etape]}`}
					onFermer={onFermer}
					{...(etape === 1 &&
					branchement.genre !== 'AUTORISATION' &&
					branchement.genre !== 'VERIFICATION'
						? { onRetour, libelleRetour: 'Choisir un autre logiciel' }
						: {})}
				>
					<JaugeDEtapes total={3} courante={etape} />
				</BarreDePleinEcran>

				{branchement.genre === 'CHOIX' ? (
					<EtapeDuChoix
						catalogue={catalogue}
						onChoisir={onChoisir}
						{...(onDeposerUnExport === undefined ? {} : { onDeposerUnExport })}
					/>
				) : branchement.genre === 'BRANCHE' ? (
					<EtapeBranchee
						logiciel={branchement.logiciel}
						lecture={branchement.lecture}
						onFermer={onFermer}
					/>
				) : (
					// Une clé par logiciel : la saisie d'un autre logiciel ne se recopie jamais ici.
					<EtapeDeLAcces
						key={branchement.logiciel.integrationId}
						logiciel={branchement.logiciel}
						branchement={branchement}
						onBrancher={onBrancher}
						modeTestPermis={modeTestPermis}
					/>
				)}
			</ColonneDePleinEcran>
		</PleinEcran>
	);
}

function EtapeDuChoix({
	catalogue,
	onChoisir,
	onDeposerUnExport
}: {
	readonly catalogue: EtatDuCatalogue;
	readonly onChoisir: (logiciel: LogicielABrancher) => void;
	readonly onDeposerUnExport?: () => void;
}) {
	return (
		<div className="flex flex-1 flex-col gap-cladd-xs pt-cladd-2xs pb-cladd-sm">
			<TeteDEtape titre="Quel logiciel ?">
				Vos factures arrivent seules, et passent payées quand elles le sont. Rien n’est branché
				avant que vous l’ayez autorisé.
			</TeteDEtape>

			{catalogue.genre === 'CHARGEMENT' ? (
				<div className="flex items-center justify-center gap-2 py-cladd-sm text-cladd-2xs text-cladd-fg-soft">
					<Spinner size="xs" />
					Recherche des logiciels…
				</div>
			) : catalogue.genre === 'ECHEC' ? (
				<p role="alert" className="px-1 text-cladd-2xs leading-relaxed">
					{catalogue.message}
				</p>
			) : catalogue.logiciels.length === 0 ? (
				<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Aucun logiciel ne se branche encore depuis votre établissement.
				</p>
			) : (
				<section className="flex flex-col gap-cladd-3xs">
					<EnTeteDeGroupe
						libelle="Facturation et comptabilité"
						nombre={catalogue.logiciels.length}
					/>
					<ListeDeCartes>
						{catalogue.logiciels.map((logiciel) => (
							<CarteBouton
								key={logiciel.integrationId}
								titre={logiciel.nom}
								ligne={ligneDuLogiciel(logiciel)}
								icone={
									<TuileLogiciel
										nom={logiciel.nom}
										{...(logiciel.logo === undefined ? {} : { logo: logiciel.logo })}
									/>
								}
								onClick={() => onChoisir(logiciel)}
							/>
						))}
					</ListeDeCartes>
				</section>
			)}

			<ProtectionsDesConnexions />

			{onDeposerUnExport === undefined ? null : (
				<div className="flex flex-col items-center gap-1 px-1 text-center">
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						Votre logiciel n’y est pas ? Un export de vos factures (CSV, Excel, PDF) se dépose au
						coffre, et se lit de la même façon.
					</p>
					<BoutonTexte onClick={onDeposerUnExport}>
						<FileUpIcon />
						Déposer un export
					</BoutonTexte>
				</div>
			)}
		</div>
	);
}

function EtapeDeLAcces({
	logiciel,
	branchement,
	onBrancher,
	modeTestPermis
}: {
	readonly logiciel: LogicielABrancher;
	readonly branchement: Exclude<EtatDuBranchement, { genre: 'CHOIX' } | { genre: 'BRANCHE' }>;
	readonly onBrancher: (logiciel: LogicielABrancher, saisie: SaisieDeBranchement) => void;
	readonly modeTestPermis: boolean;
}) {
	const [cle, setCle] = useState('');
	const [tente, setTente] = useState(false);
	const [extension, setExtension] = useState<string | null>(null);
	const avecCle = logiciel.mode === 'CLE_PENNYLANE' || logiciel.mode === 'CLE_STRIPE';
	const refus = avecCle ? refusDeLaCle(logiciel.mode, cle, { modeTestPermis }) : null;
	const occupe =
		branchement.genre === 'PREPARATION' ||
		branchement.genre === 'AUTORISATION' ||
		branchement.genre === 'VERIFICATION';
	// Ce qui manque encore pour partir : dit sous le bouton, jamais un bouton qui ne répond pas.
	const manque =
		logiciel.mode === 'REGION_ZOHO' && extension === null
			? 'Choisissez l’adresse de votre compte Zoho.'
			: null;

	const brancher = () => {
		if (occupe || manque !== null) return;
		if (avecCle) {
			setTente(true);
			if (refus !== null) return;
			onBrancher(logiciel, { genre: 'CLE', cle: cle.trim() });
			return;
		}
		onBrancher(
			logiciel,
			logiciel.mode === 'REGION_ZOHO' && extension !== null
				? { genre: 'REGION', extension }
				: { genre: 'AUTORISATION' }
		);
	};

	const libelle =
		branchement.genre === 'PREPARATION'
			? 'Préparation…'
			: branchement.genre === 'AUTORISATION'
				? avecCle
					? 'Vérification de la clé…'
					: `En attente de ${logiciel.nom}…`
				: branchement.genre === 'VERIFICATION'
					? 'Vérification…'
					: avecCle
						? `Brancher ${logiciel.nom}`
						: `Continuer vers ${logiciel.nom}`;

	return (
		<>
			<div className="flex flex-1 flex-col gap-cladd-xs pt-cladd-2xs pb-cladd-sm">
				<div className="flex justify-center pt-cladd-3xs">
					<TuileLogiciel
						nom={logiciel.nom}
						{...(logiciel.logo === undefined ? {} : { logo: logiciel.logo })}
						grande
					/>
				</div>

				{logiciel.mode === 'CLE_PENNYLANE' ? (
					<AccesParJetonPennylane cle={cle} onCle={setCle} refus={tente ? refus : null} />
				) : logiciel.mode === 'CLE_STRIPE' ? (
					<AccesParCleStripe cle={cle} onCle={setCle} refus={tente ? refus : null} />
				) : (
					<>
						<AccesParAutorisation logiciel={logiciel} />
						{logiciel.mode === 'REGION_ZOHO' ? (
							<ChoixAdresseZoho choisie={extension} onChoisir={setExtension} />
						) : null}
					</>
				)}

				{branchement.genre === 'PRET' && branchement.message !== undefined ? (
					<p
						role="alert"
						className="verre-carte rounded-cladd-xl p-cladd-2xs text-cladd-2xs leading-relaxed"
					>
						{branchement.message}
					</p>
				) : null}
			</div>

			<PiedDePleinEcran>
				{manque === null ? null : (
					<p className="text-center text-cladd-3xs text-cladd-fg-soft">{manque}</p>
				)}
				<BoutonPrincipal pleineLargeur readOnly={occupe || manque !== null} onClick={brancher}>
					{occupe ? <Spinner size="xs" /> : <LockIcon />}
					{libelle}
				</BoutonPrincipal>
			</PiedDePleinEcran>
		</>
	);
}

function EtapeBranchee({
	logiciel,
	lecture,
	onFermer
}: {
	readonly logiciel: LogicielABrancher;
	readonly lecture: string;
	readonly onFermer: () => void;
}) {
	return (
		<>
			<div className="flex flex-1 flex-col items-center justify-center gap-cladd-2xs pt-cladd-2xs pb-cladd-sm text-center">
				{/* La coche qui se trace, celle de la feuille de réussite : à l'encre, jamais verte. */}
				<span
					aria-hidden
					className="pilule-principale reussite-disque flex size-14 items-center justify-center rounded-full"
				>
					<svg
						viewBox="0 0 24 24"
						className="size-7"
						fill="none"
						stroke="currentColor"
						strokeWidth={2.5}
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M20 6 9 17l-5-5" pathLength={1} className="coche-tracee" />
					</svg>
				</span>
				<h2 className="text-cladd-lg leading-tight font-semibold">{logiciel.nom} est branché</h2>
				<p role="status" className="text-cladd-2xs text-cladd-fg-soft">
					{lecture}
				</p>
				<p className="max-w-sm text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Vous pouvez fermer : la lecture continue, et la carte de {logiciel.nom} dit où elle en
					est. Elle se refait d’elle-même toutes les six heures.
				</p>
			</div>
			<PiedDePleinEcran>
				<BoutonPrincipal pleineLargeur onClick={onFermer}>
					Terminé
				</BoutonPrincipal>
			</PiedDePleinEcran>
		</>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SOUS LA CARTE D'UN LOGICIEL BRANCHÉ
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * LES FACTURES ANNULÉES À LA SOURCE ET ENCORE OUVERTES ICI.
 *
 * ⚠️ RIEN NE SE FERME TOUT SEUL. Une facture annulée dans le logiciel peut avoir
 * été remplacée par un avoir, refaite sous un autre numéro, ou annulée par erreur :
 * le logiciel le signale, le gérant regarde et tranche. « C'est vérifié » ne fait
 * que retirer l'avertissement.
 */
export function AnnuleesALaSource({
	nom,
	references,
	onVerifie
}: {
	readonly nom: string;
	readonly references: readonly string[];
	/** Absent pour un membre qui n'administre pas l'établissement. */
	readonly onVerifie?: () => void;
}) {
	if (references.length === 0) return null;
	const n = references.length;
	return (
		<div className="verre-carte flex flex-col gap-1.5 rounded-cladd-xl p-cladd-2xs">
			<p className="text-cladd-2xs font-semibold">
				{n} facture{pluriel(n)} annulée{pluriel(n)} dans {nom}, encore ouverte{pluriel(n)} ici
			</p>
			<p className="text-cladd-2xs leading-snug text-cladd-fg-soft tabular-nums">
				{references.join(', ')}
			</p>
			<p className="text-cladd-3xs leading-relaxed text-cladd-fg-soft">
				Un avoir, une facture refaite sous un autre numéro ? Regardez, puis notez le règlement ou
				classez le dossier si c’est le cas. Rien ne se ferme seul.
			</p>
			{onVerifie === undefined ? null : (
				<div>
					<BoutonTexte onClick={onVerifie}>
						<CheckIcon />
						C’est vérifié
					</BoutonTexte>
				</div>
			)}
		</div>
	);
}

/**
 * DÉBRANCHER, APRÈS AVOIR DIT CE QUE ÇA FAIT. Le geste ne se défait pas d'un
 * toucher : l'accès disparaît chez Nango, et le rebrancher redemande une
 * autorisation ou une nouvelle clé. Ce qui reste est dit aussi : les factures.
 */
export function ConfirmationDebranchement({
	nom,
	logo,
	facturesLues,
	ouverte,
	enCours,
	message,
	onConfirmer,
	onFermer
}: {
	readonly nom: string;
	readonly logo?: string;
	readonly facturesLues: number;
	readonly ouverte: boolean;
	readonly enCours: boolean;
	/** Pourquoi la tentative d'avant a échoué. */
	readonly message: string | null;
	readonly onConfirmer: () => void;
	readonly onFermer: () => void;
}) {
	return (
		<FeuillePleinEcran
			ouverte={ouverte}
			onFermer={onFermer}
			titre={`Débrancher ${nom}`}
			pied={
				<BoutonPrincipal pleineLargeur readOnly={enCours} onClick={onConfirmer}>
					{enCours ? <Spinner size="xs" /> : <UnplugIcon />}
					{enCours ? 'Débranchement…' : `Débrancher ${nom}`}
				</BoutonPrincipal>
			}
		>
			<div className="flex justify-center pt-cladd-3xs">
				<TuileLogiciel nom={nom} {...(logo === undefined ? {} : { logo })} grande />
			</div>
			<TeteDEtape titre={`Débrancher ${nom} ?`}>
				Letikette arrête de lire {nom}, et Nango supprime l’accès qu’il gardait. Pour reprendre, il
				faudra le rebrancher.
			</TeteDEtape>
			<div className="verre-carte flex flex-col gap-1.5 rounded-cladd-xl p-cladd-2xs text-cladd-2xs leading-snug">
				<p className="font-semibold">Ce qui reste</p>
				<p className="text-cladd-fg-soft">
					{facturesLues === 0
						? 'Les factures déjà entrées, avec leurs dossiers et leurs relances.'
						: `Les factures déjà entrées (${facturesLues} à la dernière lecture), avec leurs dossiers et leurs relances.`}
				</p>
			</div>
			{message === null ? null : (
				<p role="alert" className="px-1 text-cladd-2xs leading-relaxed">
					{message}
				</p>
			)}
		</FeuillePleinEcran>
	);
}

/** Sous les cartes des logiciels branchés : en brancher un autre, en texte, à gauche. */
export function BrancherUnAutreLogiciel({ onClick }: { readonly onClick: () => void }) {
	return (
		<div className="flex">
			<BoutonTexte onClick={onClick}>
				<PlusIcon />
				Brancher un autre logiciel
			</BoutonTexte>
		</div>
	);
}
