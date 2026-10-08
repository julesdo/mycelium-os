import { Suspense, use, type ReactNode } from 'react';
import { Button, Popup, PopupContent } from '@cladd-ui/react';
import {
	BriefcaseIcon,
	CameraIcon,
	CheckIcon,
	ChevronRightIcon,
	GlobeIcon,
	MailIcon,
	MapPinIcon,
	NavigationIcon,
	PhoneIcon,
	PlusIcon,
	ScaleIcon,
	StampIcon
} from 'lucide-react';
import { ActionsRapides, type ActionRapide } from './actions-rapides';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { LigneDeReleve, ListeDeReleve } from './carte-rangee';
import { cn } from './cn';
import { dateCourte } from './format';
import { coordonneesDe, type Coordonnees } from './lieu';

/**
 * LA DÉFENSE — LES PROFESSIONNELS, MONTRÉS COMME DES PERSONNES (08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE LE FONDATEUR A DEMANDÉ, ET CE QU'ON NE FERA PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Toute cette partie choix d'avocats et de défense doit être hyper quali, avec
 * des images des avocats, cabinets, commissaires. Le choix de la défense est un
 * service qui fait partie de l'app. » Les références relevées sur Mobbin (la
 * fiche praticien d'Alan, les cartes de Zocdoc et Preply, le lieu chez Fresha)
 * montrent un visage, ce que la personne déclare, une carte, et UN geste.
 *
 * ⚠️ AUCUN VISAGE INVENTÉ. L'annuaire du Conseil national des barreaux et le
 * registre des entreprises ne publient aucune photo. Coller un visage — de banque
 * d'images ou généré — à côté du nom d'un avocat réel ferait croire que c'est lui :
 * c'est faux, et c'est son image. Le visuel est donc :
 *
 *   · un PORTRAIT GÉNÉRATIF, propre à chaque nom et toujours le même, aux
 *     initiales, avec le badge de la profession — comme les praticiens sans photo
 *     chez Alan ;
 *   · la VRAIE photo ou le vrai logo, quand le gérant l'a ajouté à son équipe ;
 *   · la CARTE du cabinet, depuis l'adresse publiée (Plan IGN).
 *
 * ⚠️ RIEN N'EST CLASSÉ PAR MÉRITE (ligne rouge n° 3). Ni note, ni avis, ni étoile —
 * il n'en existe aucun de vérifiable, et en inventer serait mentir. Ce qui
 * s'affiche est ce que les sources publient : où ils exercent, ce qu'ils ont
 * déclaré, depuis quand l'étude existe, qui y exerce. « Près de » dit où, pas qui
 * est compétent.
 */

export type RoleProfessionnel = 'AVOCAT' | 'COMMISSAIRE_DE_JUSTICE' | 'AUTRE';

const LIBELLE_ROLE: Readonly<Record<RoleProfessionnel, string>> = {
	AVOCAT: 'Avocat',
	COMMISSAIRE_DE_JUSTICE: 'Commissaire de justice',
	AUTRE: 'Professionnel'
};

/** Un professionnel tel que la défense le montre, d'où qu'il vienne. */
export interface ProfessionnelAffiche {
	readonly cle: string;
	readonly role: RoleProfessionnel;
	/** « Marie Dupont », ou le nom de l'étude tel que le registre le publie. */
	readonly nom: string;
	readonly cabinet?: string;
	readonly barreau?: string;
	/** Le ressort noté par le gérant, pour une fiche saisie à la main. */
	readonly ressort?: string;
	readonly adresse?: string;
	readonly commune?: string;
	/** Ce qu'il a DÉCLARÉ au fichier national : un fait du fichier, pas un avis. */
	readonly specialites: readonly string[];
	readonly latitude?: number;
	readonly longitude?: number;
	readonly creeeLe?: string;
	readonly effectif?: string;
	readonly associes?: readonly string[];
	readonly siren?: string;
	readonly telephone?: string;
	readonly courriel?: string;
	/** La vraie photo ou le vrai logo, ajouté par le gérant à son équipe. */
	readonly photoUrl?: string;
	/** D'où vient la fiche, et quand elle a été relevée : « Registre des entreprises, relevé du 8 oct. ». */
	readonly source?: string;
}

/** Le siège du client, d'où se mesure la distance. */
export interface Depuis extends Coordonnees {
	readonly client: string;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LE PORTRAIT
 * ═══════════════════════════════════════════════════════════════════════════ */

/**
 * LA TEINTE D'UN PORTRAIT, TIRÉE DU NOM — entre le cyan et le violet (195° à 310°
 * sur le cercle d'oklch), jamais une teinte de seuil : le vert, le rouge et
 * l'ambre ne disent qu'une chose dans ce produit. Deux teintes voisines, une
 * clarté qui varie : douze portraits côte à côte se distinguent sans qu'aucun
 * ne crie.
 */
function teintesDe(h: number) {
	const t1 = 195 + (h % 116);
	const t2 = Math.min(318, t1 + 18 + ((h >>> 7) % 42));
	const l1 = 0.5 + ((h >>> 13) % 12) / 100;
	const c1 = 0.12 + ((h >>> 17) % 8) / 100;
	return {
		fond: `oklch(${l1.toFixed(2)} ${c1.toFixed(2)} ${t1})`,
		profond: `oklch(${(l1 - 0.14).toFixed(2)} ${(c1 + 0.02).toFixed(2)} ${t2})`,
		lueur: `oklch(${(l1 + 0.2).toFixed(2)} ${(c1 - 0.04).toFixed(2)} ${t1 - 10})`,
		angle: 120 + ((h >>> 3) % 90)
	};
}

/** Les mots qui ne font pas des initiales : formes sociales, articles, professions. */
const MOTS_SANS_INITIALE = new Set([
	'SCP',
	'SELARL',
	'SELAS',
	'SELAFA',
	'SAS',
	'SARL',
	'SCPA',
	'AARPI',
	'SELURL',
	'CABINET',
	'ETUDE',
	'ÉTUDE',
	'OFFICE',
	'DE',
	'DU',
	'DES',
	'LA',
	'LE',
	'LES',
	'ET',
	'COMMISSAIRES',
	'COMMISSAIRE',
	'JUSTICE',
	'HUISSIERS',
	'HUISSIER',
	'AVOCATS',
	'AVOCAT',
	'ASSOCIES',
	'ASSOCIÉS'
]);

function empreinte(texte: string): number {
	let h = 2166136261;
	for (let i = 0; i < texte.length; i++) {
		h ^= texte.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/** « Marie Dupont » → « MD » ; « SCP Martin & Associés » → « M ». */
export function initialesDe(nom: string): string {
	const mots = nom
		.replace(/\([^)]*\)/g, ' ')
		.split(/[\s\-'’&]+/)
		.filter((mot) => mot.length > 1 && !MOTS_SANS_INITIALE.has(mot.toUpperCase()));
	const lettres = mots
		.slice(0, 2)
		.map((mot) => mot[0]?.toUpperCase() ?? '')
		.join('');
	return lettres === '' ? (nom.trim()[0]?.toUpperCase() ?? '?') : lettres;
}

const BADGE: Readonly<Record<RoleProfessionnel, ReactNode>> = {
	AVOCAT: <ScaleIcon aria-hidden />,
	COMMISSAIRE_DE_JUSTICE: <StampIcon aria-hidden />,
	AUTRE: <BriefcaseIcon aria-hidden />
};

/**
 * LE PORTRAIT D'UN PROFESSIONNEL — sa vraie photo, ou un portrait génératif propre
 * à son nom (toujours le même), et le badge de sa profession.
 */
export function AvatarProfessionnel({
	nom,
	role,
	photoUrl,
	taille = 48
}: {
	readonly nom: string;
	readonly role: RoleProfessionnel;
	readonly photoUrl?: string;
	readonly taille?: number;
}) {
	const { fond, profond, lueur, angle } = teintesDe(empreinte(nom));
	const badge = Math.max(18, Math.round(taille * 0.36));
	return (
		<span
			className="relative inline-flex shrink-0"
			style={{ width: taille, height: taille }}
			role="img"
			aria-label={`${nom}, ${LIBELLE_ROLE[role].toLowerCase()}`}
		>
			{photoUrl === undefined ? (
				<span
					aria-hidden
					className="flex size-full items-center justify-center rounded-full font-semibold tracking-tight text-white"
					style={{
						fontSize: Math.round(taille * 0.36),
						background: `radial-gradient(90% 90% at 22% 14%, ${lueur} 0%, transparent 60%), linear-gradient(${angle}deg, ${fond} 0%, ${profond} 100%)`,
						boxShadow:
							'inset 0 1px 0 0 rgb(255 255 255 / 0.25), inset 0 -8px 16px -8px rgb(0 0 0 / 0.25)',
						textShadow: '0 1px 2px rgb(0 0 0 / 0.25)'
					}}
				>
					{initialesDe(nom)}
				</span>
			) : (
				<img
					src={photoUrl}
					alt=""
					className="size-full rounded-full bg-white object-cover"
					loading="lazy"
					decoding="async"
				/>
			)}
			<span
				aria-hidden
				className="badge-profession absolute -right-0.5 -bottom-0.5 flex items-center justify-center rounded-full [&>svg]:size-[58%]"
				style={{ width: badge, height: badge }}
			>
				{BADGE[role]}
			</span>
		</span>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LA CARTE DU LIEU
 * ═══════════════════════════════════════════════════════════════════════════ */

/** La distance à vol d'oiseau, en kilomètres. */
export function distanceKm(a: Coordonnees, b: Coordonnees): number {
	const rad = Math.PI / 180;
	const dLat = (b.latitude - a.latitude) * rad;
	const dLng = (b.longitude - a.longitude) * rad;
	const s =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2;
	return 6371 * 2 * Math.asin(Math.sqrt(s));
}

/** « à 3,2 km », « à 850 m ». À vol d'oiseau : c'est écrit dans la fiche. */
export function distanceEnClair(km: number): string {
	if (km < 1) return `à ${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
	return `à ${km < 10 ? km.toFixed(1).replace('.', ',') : Math.round(km)} km`;
}

/** La distance au siège du client, quand les deux sont sur la carte. */
export function distanceDepuis(
	depuis: Depuis | undefined,
	lieu: Partial<Coordonnees> | null | undefined
): string | undefined {
	if (depuis === undefined || lieu?.latitude === undefined || lieu.longitude === undefined) {
		return undefined;
	}
	return distanceEnClair(distanceKm(depuis, { latitude: lieu.latitude, longitude: lieu.longitude }));
}

/** Le lien d'itinéraire : il ouvre l'application de cartes du téléphone. */
export function lienItineraire(adresse: string): string {
	return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}

const ZOOM = 16;
const TUILE = 256;
const HAUTEUR_CARTE = 168;
const LARGEUR_MAX = 560;

function enTuiles({ latitude, longitude }: Coordonnees) {
	const n = 2 ** ZOOM;
	const x = ((longitude + 180) / 360) * n;
	const rad = (latitude * Math.PI) / 180;
	const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
	return { x, y };
}

/**
 * Le Plan IGN, tuile par tuile, depuis la Géoplateforme : un service public, sans
 * clé, sous Licence Ouverte — la source se cite sur la carte.
 */
function urlTuile(colonne: number, rangee: number): string {
	return (
		'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
		'&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png' +
		`&TILEMATRIX=${ZOOM}&TILEROW=${rangee}&TILECOL=${colonne}`
	);
}

/**
 * LA CARTE DU CABINET — un plan, l'épingle au bon endroit, l'adresse et
 * l'itinéraire, comme le lieu d'un salon chez Fresha.
 */
export function CarteDuLieu({
	lieu,
	adresse,
	legende
}: {
	readonly lieu: Coordonnees;
	readonly adresse: string;
	/** Sous l'adresse : « à 3,2 km du siège de Durand, à vol d'oiseau ». */
	readonly legende?: string;
}) {
	const { x, y } = enTuiles(lieu);
	const demiLargeur = LARGEUR_MAX / 2 / TUILE;
	const demiHauteur = HAUTEUR_CARTE / 2 / TUILE;
	const tuiles: { cle: string; colonne: number; rangee: number }[] = [];
	for (let colonne = Math.floor(x - demiLargeur); colonne <= Math.floor(x + demiLargeur); colonne++) {
		for (let rangee = Math.floor(y - demiHauteur); rangee <= Math.floor(y + demiHauteur); rangee++) {
			tuiles.push({ cle: `${colonne}-${rangee}`, colonne, rangee });
		}
	}
	return (
		<a
			href={lienItineraire(adresse)}
			target="_blank"
			rel="noreferrer"
			aria-label={`Ouvrir ${adresse} dans les cartes`}
			className="verre-carte verre-bouton flex flex-col overflow-hidden rounded-cladd-xl"
		>
			<span className="relative block w-full overflow-hidden" style={{ height: HAUTEUR_CARTE }}>
				{tuiles.map((t) => (
					<img
						key={t.cle}
						src={urlTuile(t.colonne, t.rangee)}
						alt=""
						width={TUILE}
						height={TUILE}
						loading="lazy"
						decoding="async"
						draggable={false}
						className="plan-ign absolute max-w-none select-none"
						style={{
							left: `calc(50% + ${(t.colonne - x) * TUILE}px)`,
							top: `calc(50% + ${(t.rangee - y) * TUILE}px)`,
							width: TUILE,
							height: TUILE
						}}
					/>
				))}
				<span
					aria-hidden
					className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-full flex-col items-center"
				>
					<span className="flex size-9 items-center justify-center rounded-full bg-cladd-primary text-white shadow-lg ring-[3px] ring-white [&>svg]:size-4">
						<MapPinIcon />
					</span>
					<span className="-mt-1.5 size-2.5 rotate-45 bg-cladd-primary" />
				</span>
				<span className="absolute right-1.5 bottom-1 rounded-sm bg-white/85 px-1 text-[9px] leading-4 text-black/70">
					© IGN · Plan IGN
				</span>
			</span>
			<span className="flex items-center gap-3 px-3.5 py-2.5">
				<span className="flex min-w-0 flex-1 flex-col">
					<span className="text-cladd-xs leading-snug">{adresse}</span>
					{legende === undefined ? null : (
						<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">{legende}</span>
					)}
				</span>
				<NavigationIcon className="size-4 shrink-0 text-cladd-primary" aria-hidden />
			</span>
		</a>
	);
}

/** L'adresse seule, quand rien ne la place sur la carte. */
function AdresseSansCarte({ adresse, legende }: { adresse: string; legende?: string }) {
	return (
		<ListeDeReleve>
			<LigneDeReleve titre={adresse} {...(legende === undefined ? {} : { ligne: legende })} />
		</ListeDeReleve>
	);
}

function legendeDistance(depuis: Depuis | undefined, lieu: Coordonnees | null): string | undefined {
	const distance = distanceDepuis(depuis, lieu);
	return distance === undefined || depuis === undefined
		? undefined
		: `${distance} du siège de ${depuis.client}, à vol d’oiseau`;
}

/** La carte d'une adresse que la source ne plaçait pas : géocodée à l'ouverture. */
function CarteGeocodee({ adresse, depuis }: { adresse: string; depuis?: Depuis }) {
	const lieu = use(coordonneesDe(adresse));
	const legende = legendeDistance(depuis, lieu);
	return lieu === null ? (
		<AdresseSansCarte adresse={adresse} {...(legende === undefined ? {} : { legende })} />
	) : (
		<CarteDuLieu lieu={lieu} adresse={adresse} {...(legende === undefined ? {} : { legende })} />
	);
}

function CarteEnAttente({ adresse }: { adresse: string }) {
	return (
		<div className="verre-carte flex flex-col overflow-hidden rounded-cladd-xl">
			<div className="w-full animate-pulse bg-cladd-fg/[0.05]" style={{ height: HAUTEUR_CARTE }} />
			<p className="px-3.5 py-2.5 text-cladd-xs leading-snug">{adresse}</p>
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LA CARTE DE LISTE — comme un praticien chez Zocdoc
 * ═══════════════════════════════════════════════════════════════════════════ */

function capitaliser(texte: string): string {
	return texte
		.toLowerCase()
		.split(/([\s-])/)
		.map((mot) => (mot.length > 2 ? (mot[0]?.toUpperCase() ?? '') + mot.slice(1) : mot))
		.join('');
}

/** « Avocat · Barreau de Nantes », « Commissaire de justice · depuis 2009 ». */
export function qualiteDe(pro: ProfessionnelAffiche): string {
	if (pro.role === 'AVOCAT') {
		return pro.barreau === undefined ? 'Avocat' : `Avocat · Barreau de ${capitaliser(pro.barreau)}`;
	}
	if (pro.role === 'COMMISSAIRE_DE_JUSTICE') return LIBELLE_ROLE.COMMISSAIRE_DE_JUSTICE;
	return LIBELLE_ROLE.AUTRE;
}

/** Les mots d'un nom, sans accents ni casse, dans l'ordre : « BAILLEUX VÉRONIQUE » = « Véronique Bailleux ». */
function motsDuNom(nom: string): string {
	return nom
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.toLowerCase()
		.split(/[\s-]+/)
		.filter((mot) => mot !== '')
		.sort()
		.join(' ');
}

/**
 * Le cabinet, quand il dit autre chose que le nom : beaucoup d'avocats exercent
 * sous leur propre nom, et le répéter en capitales ne dit rien.
 */
export function cabinetDistinct(pro: ProfessionnelAffiche): string | undefined {
	if (pro.cabinet === undefined) return undefined;
	return motsDuNom(pro.cabinet) === motsDuNom(pro.nom) ? undefined : pro.cabinet;
}

/** La seconde ligne d'une carte : la profession, et le cabinet s'il dit quelque chose. */
function ligneDeCarte(pro: ProfessionnelAffiche): string {
	const cabinet = cabinetDistinct(pro);
	return cabinet === undefined ? qualiteDe(pro) : `${LIBELLE_ROLE[pro.role]} · ${capitaliser(cabinet)}`;
}

/** Une spécialité déclarée, raccourcie pour tenir dans une pastille. */
export function specialiteCourte(specialite: string): string {
	const s = specialite.toLowerCase();
	if (s.includes('commercial')) return 'Droit commercial';
	if (s.includes('exécution') || s.includes('execution') || s.includes('sûreté')) {
		return 'Mesures d’exécution';
	}
	if (s.includes('procédures collectives') || s.includes('difficulté')) {
		return 'Entreprises en difficulté';
	}
	const court = specialite.replace(/^droit (du |de la |des |de l’|de l'|de )?/i, '');
	const majuscule = (court[0]?.toUpperCase() ?? '') + court.slice(1);
	return majuscule.length > 28 ? `${majuscule.slice(0, 27)}…` : majuscule;
}

function Pastilles({ specialites, max }: { specialites: readonly string[]; max?: number }) {
	const montrees = [...new Set(specialites.map(specialiteCourte))].slice(0, max);
	return (
		<span className="flex flex-wrap gap-1">
			{montrees.map((specialite) => (
				<span
					key={specialite}
					className="rounded-full bg-cladd-fg/[0.06] px-2 py-0.5 text-cladd-3xs text-cladd-fg-soft"
				>
					{specialite}
				</span>
			))}
		</span>
	);
}

/**
 * LE GESTE AU BOUT D'UNE CARTE — un disque : « + » pour choisir ou ajouter, la
 * coche quand c'est fait. Jamais plein : l'écran n'a qu'un bouton plein.
 */
export function GesteDeCarte({
	fait,
	libelle,
	onClick,
	desactive = false
}: {
	readonly fait: boolean;
	readonly libelle: string;
	readonly onClick: () => void;
	readonly desactive?: boolean;
}) {
	return (
		<Button
			variant="transparent"
			outline={false}
			hoverable={false}
			rounded
			square
			size="md"
			aria-label={libelle}
			aria-pressed={fait}
			disabled={desactive}
			className={cn('verre-carte verre-bouton shrink-0', fait && 'text-cladd-primary')}
			onClick={onClick}
		>
			{fait ? <CheckIcon strokeWidth={2.5} /> : <PlusIcon />}
		</Button>
	);
}

export function CarteProfessionnel({
	pro,
	distance,
	dansLEquipe = false,
	choisi = false,
	onOuvrir,
	geste
}: {
	readonly pro: ProfessionnelAffiche;
	/** « à 3,2 km », depuis le siège du client. */
	readonly distance?: string;
	readonly dansLEquipe?: boolean;
	readonly choisi?: boolean;
	readonly onOuvrir: () => void;
	/** Le geste de la carte, à droite (`GesteDeCarte`). Absent, un chevron. */
	readonly geste?: ReactNode;
}) {
	const lieu = [pro.commune === undefined ? undefined : capitaliser(pro.commune), distance]
		.filter((p) => p !== undefined && p !== '')
		.join(' · ');
	return (
		<div
			className={cn(
				'verre-carte flex items-center gap-3 rounded-cladd-xl py-3 pr-3 pl-3.5',
				choisi && 'ring-2 ring-cladd-primary'
			)}
		>
			<button
				type="button"
				onClick={onOuvrir}
				className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
				aria-label={`Voir la fiche de ${pro.nom}`}
			>
				<AvatarProfessionnel
					nom={pro.nom}
					role={pro.role}
					{...(pro.photoUrl === undefined ? {} : { photoUrl: pro.photoUrl })}
					taille={52}
				/>
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="flex items-center gap-1.5">
						<span className="truncate text-cladd-xs font-semibold">{pro.nom}</span>
						{dansLEquipe ? (
							<span className="shrink-0 rounded-full bg-cladd-primary/10 px-1.5 text-cladd-3xs font-medium text-cladd-primary">
								Équipe
							</span>
						) : null}
					</span>
					<span className="truncate text-cladd-2xs text-cladd-fg-soft">{ligneDeCarte(pro)}</span>
					{lieu === '' ? null : (
						<span className="flex items-center gap-1 text-cladd-2xs text-cladd-fg-soft">
							<MapPinIcon className="size-3 shrink-0" aria-hidden />
							<span className="truncate">{lieu}</span>
						</span>
					)}
					{pro.specialites.length === 0 ? null : (
						<span className="mt-1">
							<Pastilles specialites={pro.specialites} max={2} />
						</span>
					)}
				</span>
			</button>
			{geste ?? <ChevronRightIcon className="size-4 shrink-0 text-cladd-fg-softer" aria-hidden />}
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LA FICHE — comme un praticien chez Alan
 * ═══════════════════════════════════════════════════════════════════════════ */

/** L'adresse complète, sans répéter la commune qu'elle contient déjà. */
export function adresseComplete(pro: ProfessionnelAffiche): string {
	const commune = pro.commune;
	const adresse = pro.adresse;
	if (adresse === undefined || adresse === '') return commune ?? '';
	if (commune === undefined) return adresse;
	// « Nantes 44100 » est déjà dans « … 44100 NANTES » : chaque mot y est, dans le désordre.
	const dedans = adresse.toLowerCase();
	const dejaDit = commune
		.toLowerCase()
		.split(/\s+/)
		.every((mot) => mot === '' || dedans.includes(mot));
	return dejaDit ? adresse : `${adresse}, ${commune}`;
}

function rechercheWeb(pro: ProfessionnelAffiche): string {
	const metier =
		pro.role === 'AVOCAT'
			? 'avocat'
			: pro.role === 'COMMISSAIRE_DE_JUSTICE'
				? 'commissaire de justice'
				: '';
	return `https://www.google.com/search?q=${encodeURIComponent(
		[pro.nom, metier, pro.commune].filter((p) => p !== undefined && p !== '').join(' ')
	)}`;
}

export interface GestesDeLaFiche {
	/** Le bouton plein : « Choisir ce professionnel », « Ajouter à mon équipe »… */
	readonly principal?: { readonly libelle: string; readonly onClick: () => void };
	/** Une sortie en texte, sous le bouton : « Retirer de mon équipe ». */
	readonly secondaire?: { readonly libelle: string; readonly onClick: () => void };
	/** Ajouter sa vraie photo ou son logo : seulement pour quelqu'un de votre équipe. */
	readonly onPhoto?: (fichier: File) => void;
	readonly enCours?: boolean;
}

/**
 * LA FICHE D'UN PROFESSIONNEL : le portrait, ce qu'il est, les gestes (appeler,
 * écrire, l'itinéraire, le web), la carte, ce que les sources publient, et UN
 * bouton plein. Le contenu seul : la feuille du choix l'affiche à la place de sa
 * liste, l'écran « Défense » dans sa propre feuille.
 */
export function FicheProfessionnel({
	pro,
	depuis,
	dansLEquipe,
	gestes
}: {
	readonly pro: ProfessionnelAffiche;
	readonly depuis?: Depuis;
	readonly dansLEquipe: boolean;
	readonly gestes: GestesDeLaFiche;
}) {
	const adresse = adresseComplete(pro);
	const lieuConnu =
		pro.latitude === undefined || pro.longitude === undefined
			? null
			: { latitude: pro.latitude, longitude: pro.longitude };
	const legende = legendeDistance(depuis, lieuConnu);

	const actions: ActionRapide[] = [
		...(pro.telephone === undefined
			? []
			: [{ cle: 'appeler', libelle: 'Appeler', icone: <PhoneIcon />, href: `tel:${pro.telephone}` }]),
		...(pro.courriel === undefined
			? []
			: [{ cle: 'ecrire', libelle: 'Écrire', icone: <MailIcon />, href: `mailto:${pro.courriel}` }]),
		...(adresse === ''
			? []
			: [
					{
						cle: 'itineraire',
						libelle: 'Itinéraire',
						icone: <NavigationIcon />,
						href: lienItineraire(adresse)
					}
				]),
		{
			cle: 'web',
			libelle: 'Sur le web',
			icone: <GlobeIcon />,
			nomComplet: `Chercher ${pro.nom} sur le web`,
			href: rechercheWeb(pro)
		}
	];

	const faits: { titre: string; ligne?: string; date?: string }[] = [];
	const cabinet = cabinetDistinct(pro);
	if (cabinet !== undefined) faits.push({ titre: 'Cabinet', ligne: capitaliser(cabinet) });
	if (pro.creeeLe !== undefined) faits.push({ titre: 'Créée le', date: dateCourte(pro.creeeLe) });
	if (pro.effectif !== undefined) faits.push({ titre: 'Taille', date: pro.effectif });
	if ((pro.associes ?? []).length > 0) {
		// Le registre écrit les noms en capitales : on les lit comme des noms de personnes.
		faits.push({ titre: 'Y exercent', ligne: (pro.associes ?? []).map(capitaliser).join(', ') });
	}
	if (pro.specialites.length > 0) {
		faits.push({ titre: 'Spécialités déclarées', ligne: pro.specialites.join(' · ') });
	}
	if (pro.siren !== undefined) {
		faits.push({ titre: 'SIREN', date: pro.siren.replace(/(\d{3})(?=\d)/g, '$1 ') });
	}

	return (
		<div className="flex flex-col gap-cladd-2xs">
			<div className="flex flex-col items-center gap-2.5 pt-1 text-center">
				<AvatarProfessionnel
					nom={pro.nom}
					role={pro.role}
					{...(pro.photoUrl === undefined ? {} : { photoUrl: pro.photoUrl })}
					taille={92}
				/>
				<div className="flex flex-col gap-0.5">
					<h2 className="text-cladd-sm leading-snug font-semibold text-balance">{pro.nom}</h2>
					<p className="text-cladd-2xs text-cladd-fg-soft">{qualiteDe(pro)}</p>
				</div>
				{pro.specialites.length === 0 ? null : <Pastilles specialites={pro.specialites} />}
				{dansLEquipe ? (
					<p className="flex items-center gap-1 text-cladd-2xs font-medium text-cladd-primary">
						<CheckIcon className="size-3.5" aria-hidden />
						Dans votre équipe
					</p>
				) : null}
			</div>

			<ActionsRapides actions={actions} />

			{adresse === '' ? null : pro.adresse === undefined && lieuConnu === null ? (
				// Une commune seule ne se met pas sur la carte : l'épingle mentirait.
				<AdresseSansCarte adresse={adresse} {...(legende === undefined ? {} : { legende })} />
			) : lieuConnu !== null ? (
				<CarteDuLieu
					lieu={lieuConnu}
					adresse={adresse}
					{...(legende === undefined ? {} : { legende })}
				/>
			) : (
				<Suspense fallback={<CarteEnAttente adresse={adresse} />}>
					<CarteGeocodee adresse={adresse} {...(depuis === undefined ? {} : { depuis })} />
				</Suspense>
			)}

			{faits.length === 0 ? null : (
				<ListeDeReleve>
					{faits.map((fait) => (
						<LigneDeReleve key={fait.titre} retour {...fait} />
					))}
				</ListeDeReleve>
			)}

			{gestes.onPhoto === undefined ? null : (
				<label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 text-cladd-xs font-medium text-cladd-primary">
					<CameraIcon className="size-4" aria-hidden />
					{pro.photoUrl === undefined ? 'Ajouter sa photo ou son logo' : 'Changer la photo'}
					<input
						type="file"
						accept="image/png,image/jpeg,image/webp,image/gif"
						className="sr-only"
						onChange={(e) => {
							const fichier = e.target.files?.[0];
							e.target.value = '';
							if (fichier !== undefined) gestes.onPhoto?.(fichier);
						}}
					/>
				</label>
			)}

			{gestes.principal === undefined ? null : (
				<BoutonPrincipal
					pleineLargeur
					disabled={gestes.enCours}
					onClick={gestes.principal.onClick}
				>
					{gestes.principal.libelle}
				</BoutonPrincipal>
			)}
			{gestes.secondaire === undefined ? null : (
				<BoutonTexte
					className="self-center"
					disabled={gestes.enCours}
					onClick={gestes.secondaire.onClick}
				>
					{gestes.secondaire.libelle}
				</BoutonTexte>
			)}

			<p className="text-center text-cladd-3xs leading-relaxed text-cladd-fg-softest">
				{pro.source === undefined ? '' : `${pro.source}. `}Ni note ni avis : aucune source
				vérifiable n’en publie. « Près de » dit où il exerce, pas qui est compétent.
			</p>
		</div>
	);
}

/** La fiche, en feuille : pour l'écran « Défense ». */
export function FeuilleProfessionnel({
	pro,
	onFermer,
	...fiche
}: {
	readonly pro: ProfessionnelAffiche | null;
	readonly onFermer: () => void;
	readonly depuis?: Depuis;
	readonly dansLEquipe: boolean;
	readonly gestes: GestesDeLaFiche;
}) {
	return (
		<Popup
			open={pro !== null}
			onOpenChange={(ouverte) => {
				if (!ouverte) onFermer();
			}}
			contentClassName="max-w-lg"
		>
			<PopupContent>
				{pro === null ? null : <FicheProfessionnel pro={pro} {...fiche} />}
			</PopupContent>
		</Popup>
	);
}

/**
 * L'ÉQUIPE EN UN COUP D'ŒIL — les portraits qui se chevauchent, comme les
 * participants d'un groupe chez Splitwise, et ce qu'ils sont dessous.
 */
export function PortraitsDeLEquipe({
	equipe,
	legende
}: {
	readonly equipe: readonly Pick<ProfessionnelAffiche, 'cle' | 'nom' | 'role' | 'photoUrl'>[];
	readonly legende: string;
}) {
	const montres = equipe.slice(0, 5);
	return (
		<div className="flex flex-col items-center gap-2.5 py-2 text-center">
			<div className="flex items-center justify-center">
				{montres.length === 0 ? (
					<span
						aria-hidden
						className="verre-carte flex size-16 items-center justify-center rounded-full text-cladd-fg-soft [&>svg]:size-7"
					>
						<ScaleIcon />
					</span>
				) : (
					montres.map((pro, rang) => (
						<span
							key={pro.cle}
							className={cn('rounded-full ring-[3px] ring-cladd-bg', rang > 0 && '-ml-4')}
							style={{ zIndex: montres.length - rang }}
						>
							<AvatarProfessionnel
								nom={pro.nom}
								role={pro.role}
								{...(pro.photoUrl === undefined ? {} : { photoUrl: pro.photoUrl })}
								taille={60}
							/>
						</span>
					))
				)}
			</div>
			<p className="max-w-xs text-cladd-xs leading-snug text-balance text-cladd-fg-soft">{legende}</p>
		</div>
	);
}
