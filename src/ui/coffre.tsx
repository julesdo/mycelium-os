import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import {
	DownloadIcon,
	FileSpreadsheetIcon,
	FileTextIcon,
	FingerprintIcon,
	ImageIcon,
	KeyRoundIcon,
	LinkIcon,
	LockIcon,
	ScanSearchIcon,
	ShieldCheckIcon,
	Trash2Icon
} from 'lucide-react';
import { BoutonSecondaire, BoutonTexte } from './bouton';
import { cn } from './cn';
import { VignetteRangee } from './familles';
import { dateCourte } from './format';
import { LigneDeReleve, ListeDeReleve } from './carte-rangee';
import { TYPES_PIECE } from './pieces';
import { BarreDePleinEcran, BoutonRond, ColonneDePleinEcran, PleinEcran } from './plein-ecran';

/**
 * LE COFFRE-FORT DES DOCUMENTS — ce que l'écran en montre (12/10/2026).
 * Voir `docs/superpowers/specs/2026-10-12-coffre-fort.md`.
 *
 * ⚠️ CHAQUE PHRASE DE SÉCURITÉ EST VRAIE, ET VÉRIFIABLE. Les quatre protections
 * écrites ici sont en place dans le code (`socle/coffre`, `convex/coffre`) ; la
 * transmission au prestataire de lecture est dite, avec ce qui y échappe. Jamais
 * « de bout en bout », jamais « personne d'autre que vous », jamais « hébergé en
 * France » : nos serveurs détiennent les clés, et la base est aux États-Unis.
 *
 * ⚠️ IL N'INTERROGE RIEN. Le contenu d'un document arrive par `ouvrir`, que la
 * route construit : `src/ui` ne connaît pas Convex.
 */

export type GenreDocument = 'IMPORT' | 'PIECE';

export interface RefCoffre {
	readonly genre: GenreDocument;
	readonly id: string;
}

export function cleDeRef(ref: RefCoffre): string {
	return `${ref.genre}:${ref.id}`;
}

/** L'inverse : « PIECE:abc » redevient une référence, ou `null` s'il ne dit rien. */
export function refDepuisCle(cle: string | undefined): RefCoffre | null {
	if (cle === undefined) return null;
	const [genre, id] = cle.split(':');
	return (genre === 'IMPORT' || genre === 'PIECE') && id !== undefined && id !== ''
		? { genre, id }
		: null;
}

export interface BilanCourt {
	readonly facturesCreees: number;
	readonly facturesDejaConnues: number;
	readonly reglementsCrees: number;
	readonly ignoreesTotal: number;
}

/** Un document du coffre, tel que la liste et le suivi d'un dépôt le résument. */
export interface ResumeDocument {
	readonly ref: RefCoffre;
	readonly nom: string;
	readonly deposeLe: number;
	readonly taille?: number;
	readonly mime: string;
	readonly scelle: boolean;
	readonly etat: 'EN_COURS' | 'TERMINE' | 'ECHEC';
	readonly etape?: string;
	readonly bilan?: BilanCourt;
	readonly typePiece?: string;
	readonly client?: { readonly id: string; readonly nom: string };
}

export interface PersonneAffichee {
	readonly nom: string;
	readonly estMoi: boolean;
}

export type GesteDuJournal = 'DEPOT' | 'CONSULTATION' | 'TELECHARGEMENT' | 'RETRAIT';

/** Un document en détail : ses faits, ce que la lecture en a tiré, son journal. */
export interface DetailDocument {
	readonly resume: ResumeDocument;
	readonly empreinte?: string;
	readonly sceau?: { readonly algorithme: string; readonly version: number };
	readonly deposePar?: PersonneAffichee;
	readonly constat?: string;
	readonly reference?: string;
	readonly dateDocument?: string;
	readonly mode?: 'EXPORT_COMPTABLE' | 'FACTURE_DEPOSEE';
	readonly journal: readonly {
		readonly geste: GesteDuJournal;
		readonly le: number;
		readonly par: PersonneAffichee;
	}[];
}

/** Un geste du journal de l'établissement : sur quel document, par qui, quand. */
export interface EntreeDuJournal {
	readonly nomDocument: string;
	readonly geste: GesteDuJournal;
	readonly le: number;
	readonly par: PersonneAffichee;
}

/** Ce que l'ouverture d'un document rend : ses octets, en mémoire seulement. */
export interface ContenuOuvert {
	readonly octets: ArrayBuffer;
	readonly mime: string;
	readonly nom: string;
}

export type NatureAffichee = 'PDF' | 'IMAGE' | 'TEXTE';

export function natureDuMime(mime: string): NatureAffichee {
	if (mime === 'application/pdf') return 'PDF';
	if (mime.startsWith('image/')) return 'IMAGE';
	return 'TEXTE';
}

/**
 * LE TYPE D'UN FICHIER, DÉDUIT DE SON NOM QUAND LA BASE NE LE DIT PAS — une
 * pièce ancienne n'a pas toujours son type. Pour la vignette seulement : ce qui
 * s'ouvre est vérifié dans ses octets, jamais d'après son nom.
 */
export function mimeProbable(mime: string | undefined, nom: string): string {
	if (mime !== undefined && mime !== '' && mime !== 'application/octet-stream') return mime;
	const extension = nom.toLowerCase().split('.').at(-1) ?? '';
	if (extension === 'pdf') return 'application/pdf';
	if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension)) return 'image/*';
	return 'text/plain';
}

/** « 2,4 Mo », « 840 Ko ». */
export function tailleEnClair(octets: number): string {
	if (octets < 1024) return `${octets} o`;
	if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
	return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`;
}

function pluriel(n: number, mot: string): string {
	return `${n} ${mot}${n > 1 ? 's' : ''}`;
}

/** Le nom d'une nature de pièce : « Bon de livraison », « À classer ». */
export function libelleDeLaPiece(type: string | undefined): string {
	return TYPES_PIECE.find((t) => t.cle === type)?.libelle ?? 'À classer';
}

/**
 * CE QU'UN DOCUMENT A DONNÉ, EN CINQ MOTS — la seconde ligne de sa carte.
 * Le détail (une erreur entière, le constat) vit dans la visionneuse.
 */
export function ligneDuDocument(document: ResumeDocument): string {
	if (document.etat === 'EN_COURS')
		return document.scelle ? 'Lecture en cours…' : 'Mise au coffre…';
	if (document.etat === 'ECHEC')
		return document.scelle ? 'Lecture impossible' : 'Refusé à l’arrivée';
	if (document.ref.genre === 'PIECE') {
		const nature = libelleDeLaPiece(document.typePiece);
		return document.client === undefined ? nature : `${nature} · ${document.client.nom}`;
	}
	const bilan = document.bilan;
	if (bilan === undefined) return 'Lu';
	if (bilan.facturesCreees > 0)
		return `${pluriel(bilan.facturesCreees, 'facture')} entrée${bilan.facturesCreees > 1 ? 's' : ''}`;
	if (bilan.facturesDejaConnues > 0) return 'Factures déjà connues';
	return 'Aucune facture lue';
}

/** La vignette d'un document : sa nature, et le cadenas quand il est scellé. */
export function VignetteDocument({
	mime,
	scelle,
	grande = false
}: {
	readonly mime: string;
	readonly scelle: boolean;
	readonly grande?: boolean;
}) {
	const nature = natureDuMime(mime);
	const Icone =
		nature === 'PDF' ? FileTextIcon : nature === 'IMAGE' ? ImageIcon : FileSpreadsheetIcon;
	return (
		<span className="relative inline-flex shrink-0">
			<VignetteRangee
				famille="PAPIERS"
				picto={Icone}
				className={grande ? 'size-16' : 'size-10'}
				{...(grande ? { classePicto: 'size-7' } : {})}
			/>
			{scelle ? (
				<span
					aria-label="Scellé dans le coffre"
					className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-cladd-fg text-cladd-bg ring-2 ring-cladd-bg [&>svg]:size-3"
				>
					<LockIcon aria-hidden />
				</span>
			) : null}
		</span>
	);
}

/**
 * CE QUI PROTÈGE VOS DOCUMENTS — quatre lignes, toutes vraies, et la seule
 * sortie de données qui existe, dite avant qu'elle ait lieu.
 */
export function ProtectionsDuCoffre({ compact = false }: { readonly compact?: boolean }) {
	const lignes: { icone: ReactNode; titre: string; texte: string }[] = [
		{
			icone: <LockIcon />,
			titre: 'Chiffré dès son arrivée',
			texte: 'AES-256, avec une clé propre à votre établissement, rangée hors de la base.'
		},
		{
			icone: <LinkIcon />,
			titre: 'Aucun lien public',
			texte: 'Il s’ouvre par votre session, une fois, et chaque ouverture est notée.'
		},
		{
			icone: <ScanSearchIcon />,
			titre: 'Vérifié',
			texte: 'Son format est lu dans le fichier même : un fichier déguisé est refusé.'
		},
		{
			icone: <FingerprintIcon />,
			titre: 'Intègre',
			texte: 'Son empreinte est relevée au dépôt et revérifiée à chaque ouverture.'
		}
	];
	return (
		<div className="verre-carte flex flex-col gap-cladd-3xs rounded-cladd-xl p-cladd-2xs">
			<p className="flex items-center gap-2 text-cladd-xs font-semibold">
				<ShieldCheckIcon className="size-4 text-cladd-primary" aria-hidden />
				Votre coffre-fort
			</p>
			<ul className={cn('flex flex-col', compact ? 'gap-1.5' : 'gap-2.5')}>
				{lignes.map((ligne) => (
					<li key={ligne.titre} className="flex items-start gap-2.5">
						<span className="mt-0.5 shrink-0 text-cladd-fg-soft [&>svg]:size-4" aria-hidden>
							{ligne.icone}
						</span>
						<span className="flex min-w-0 flex-col">
							<span className="text-cladd-2xs font-semibold">{ligne.titre}</span>
							{compact ? null : (
								<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">
									{ligne.texte}
								</span>
							)}
						</span>
					</li>
				))}
			</ul>
			<p className="text-cladd-3xs leading-relaxed text-cladd-fg-softer">
				Pour lire une facture ou un document en PDF ou en photo, son contenu est transmis à notre
				prestataire de lecture (Anthropic) ; une facture électronique (Factur-X, XML) est lue sur
				nos serveurs. Le détail est dans la politique de confidentialité.
			</p>
		</div>
	);
}

/** La tête du coffre : un cadenas, le compte des documents, ce qui les protège. */
export function TeteDuCoffre({
	total,
	scelles
}: {
	readonly total: number;
	readonly scelles: number;
}) {
	return (
		<div className="flex flex-col items-center gap-1.5 pt-cladd-3xs text-center">
			<span className="flex size-14 items-center justify-center rounded-full bg-cladd-primary/10 text-cladd-primary [&>svg]:size-7">
				<LockIcon aria-hidden />
			</span>
			<p className="text-cladd-lg leading-tight font-semibold tabular-nums">
				{total === 0 ? 'Votre coffre est vide' : `${total} document${total > 1 ? 's' : ''}`}
			</p>
			<p className="text-cladd-2xs text-cladd-fg-soft">
				{total === 0
					? 'Factures, exports, bons de livraison, contrats : tout entre ici, chiffré.'
					: scelles === total
						? 'Tous chiffrés avec la clé de votre établissement'
						: `${scelles} chiffré${scelles > 1 ? 's' : ''} avec la clé de votre établissement`}
			</p>
		</div>
	);
}

/** Des pastilles de filtre, une seule allumée : « Tous », « Factures », « Pièces ». */
export function PastillesDeFiltre<C extends string>({
	libelle,
	options,
	active,
	onChoisir
}: {
	readonly libelle: string;
	readonly options: readonly { readonly cle: C; readonly libelle: string }[];
	readonly active: C;
	readonly onChoisir: (cle: C) => void;
}) {
	return (
		<div role="radiogroup" aria-label={libelle} className="flex gap-1.5">
			{options.map((option) => {
				const allumee = option.cle === active;
				return (
					<button
						key={option.cle}
						type="button"
						role="radio"
						aria-checked={allumee}
						onClick={() => onChoisir(option.cle)}
						className={cn(
							'h-8 cursor-pointer rounded-full px-3 text-cladd-2xs font-medium',
							allumee ? 'bg-cladd-fg text-cladd-bg' : 'verre-carte verre-bouton text-cladd-fg-soft'
						)}
					>
						{option.libelle}
					</button>
				);
			})}
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LA VISIONNEUSE
 * ═══════════════════════════════════════════════════════════════════════════ */

const ApercuPdf = lazy(() => import('./apercu-pdf'));

/** Le contenu d'un document, montré depuis la mémoire — jamais depuis une adresse durable. */
function Apercu({ contenu }: { readonly contenu: ContenuOuvert }) {
	const nature = natureDuMime(contenu.mime);
	const [url] = useState(() =>
		nature === 'IMAGE'
			? URL.createObjectURL(new Blob([contenu.octets], { type: contenu.mime }))
			: null
	);
	useEffect(
		() => () => {
			if (url !== null) URL.revokeObjectURL(url);
		},
		[url]
	);

	if (nature === 'PDF') {
		return (
			<Suspense fallback={<ApercuEnAttente />}>
				<ApercuPdf octets={contenu.octets} />
			</Suspense>
		);
	}
	if (nature === 'IMAGE' && url !== null) {
		return (
			<img
				src={url}
				alt={`Le document ${contenu.nom}`}
				className="w-full rounded-cladd-xl bg-white object-contain shadow-sm"
			/>
		);
	}
	// Un export texte : ses premières lignes, telles quelles.
	const texte = new TextDecoder().decode(contenu.octets.slice(0, 200 * 1024));
	return (
		<pre className="verre-carte max-h-[70dvh] overflow-auto rounded-cladd-xl p-cladd-2xs text-cladd-3xs leading-relaxed whitespace-pre">
			{texte}
		</pre>
	);
}

function ApercuEnAttente() {
	return (
		<div className="flex aspect-[1/1.3] w-full animate-pulse flex-col items-center justify-center gap-2 rounded-cladd-xl bg-cladd-fg/[0.05] text-cladd-2xs text-cladd-fg-soft">
			<LockIcon className="size-5" aria-hidden />
			Ouverture du coffre…
		</div>
	);
}

const LIBELLE_GESTE: Readonly<Record<GesteDuJournal, string>> = {
	DEPOT: 'Déposé',
	CONSULTATION: 'Ouvert',
	TELECHARGEMENT: 'Téléchargé',
	RETRAIT: 'Retiré'
};

function horodatage(le: number): string {
	const date = new Date(le);
	// Le jour LOCAL : `toISOString` le donnerait en heure universelle, la veille
	// passé minuit à Paris.
	const jour = dateCourte(date.toLocaleDateString('fr-CA'));
	const heure = date
		.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
		.replace(':', ' h ');
	return `${jour} à ${heure}`;
}

function parQui(personne: PersonneAffichee): string {
	return personne.estMoi ? 'par vous' : `par ${personne.nom}`;
}

/**
 * LA VISIONNEUSE D'UN DOCUMENT — une page pleine, comme une fiche de
 * professionnel : le document lui-même d'abord, puis ce qu'on en sait, ce que
 * la lecture en a tiré, et le journal de ses accès. Télécharger et retirer en bas.
 */
export function VisionneuseDocument({
	ouverte,
	detail,
	ouvrir,
	onTelecharger,
	onRetirer,
	onFermer,
	versLeClient
}: {
	readonly ouverte: boolean;
	/** `undefined` pendant la lecture du détail. */
	readonly detail: DetailDocument | null | undefined;
	/** Rend le contenu du document, pour l'aperçu : un jeton d'une minute, consommé une fois. */
	readonly ouvrir: (ref: RefCoffre) => Promise<ContenuOuvert>;
	readonly onTelecharger: (ref: RefCoffre) => void;
	/** Retire le document ; un refus (une lecture en cours) se dit sous le bouton. */
	readonly onRetirer: (ref: RefCoffre) => Promise<void>;
	readonly onFermer: () => void;
	/** Le lien vers le client d'une pièce. */
	readonly versLeClient?: (clientId: string) => ReactNode;
}) {
	const cle = detail === null || detail === undefined ? null : cleDeRef(detail.resume.ref);
	return (
		<PleinEcran ouvert={ouverte} onFermer={onFermer} libelle={detail?.resume.nom ?? 'Document'}>
			<ColonneDePleinEcran large>
				<BarreDePleinEcran
					titre={detail?.resume.nom ?? 'Document'}
					sousTitre="Coffre-fort"
					onRetour={onFermer}
					libelleRetour="Fermer le document"
					droite={
						detail === null || detail === undefined ? undefined : (
							<BoutonRond libelle="Télécharger" onClick={() => onTelecharger(detail.resume.ref)}>
								<DownloadIcon />
							</BoutonRond>
						)
					}
				/>
				<div className="flex flex-1 flex-col gap-cladd-xs pt-cladd-2xs pb-cladd-sm">
					{detail === undefined ? (
						<ApercuEnAttente />
					) : detail === null ? (
						<p className="px-1 text-cladd-xs text-cladd-fg-soft">
							Ce document n’est plus dans le coffre.
						</p>
					) : (
						<ContenuDeLaVisionneuse
							key={cle}
							detail={detail}
							ouvrir={ouvrir}
							onRetirer={onRetirer}
							{...(versLeClient === undefined ? {} : { versLeClient })}
						/>
					)}
				</div>
			</ColonneDePleinEcran>
		</PleinEcran>
	);
}

type EtatApercu =
	| { readonly etat: 'OUVERTURE' }
	| { readonly etat: 'OUVERT'; readonly contenu: ContenuOuvert }
	| { readonly etat: 'ECHEC'; readonly message: string };

function ContenuDeLaVisionneuse({
	detail,
	ouvrir,
	onRetirer,
	versLeClient
}: {
	readonly detail: DetailDocument;
	readonly ouvrir: (ref: RefCoffre) => Promise<ContenuOuvert>;
	readonly onRetirer: (ref: RefCoffre) => Promise<void>;
	readonly versLeClient?: (clientId: string) => ReactNode;
}) {
	const { resume } = detail;
	const [refusDuRetrait, setRefusDuRetrait] = useState<string | null>(null);
	const ouvrable = resume.scelle || resume.etat === 'TERMINE';
	const [apercu, setApercu] = useState<EtatApercu>({ etat: 'OUVERTURE' });
	const [confirmerRetrait, setConfirmerRetrait] = useState(false);

	// L'ouverture part une fois, quand la visionneuse se monte sur ce document.
	useEffect(() => {
		if (!ouvrable) return;
		let annule = false;
		ouvrir(resume.ref).then(
			(contenu) => {
				if (!annule) setApercu({ etat: 'OUVERT', contenu });
			},
			(erreur: unknown) => {
				if (!annule) {
					setApercu({
						etat: 'ECHEC',
						message: erreur instanceof Error ? erreur.message : 'Ce document ne s’ouvre pas.'
					});
				}
			}
		);
		return () => {
			annule = true;
		};
		// La référence suffit : le composant est remonté pour chaque document.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const faits: { titre: string; ligne?: string; date?: string }[] = [
		{
			titre: 'Déposé',
			date: horodatage(resume.deposeLe),
			...(detail.deposePar ? { ligne: parQui(detail.deposePar) } : {})
		},
		...(resume.taille === undefined
			? []
			: [{ titre: 'Taille', date: tailleEnClair(resume.taille) }]),
		{
			titre: 'Nature',
			date:
				resume.ref.genre === 'PIECE'
					? libelleDeLaPiece(resume.typePiece)
					: detail.mode === 'EXPORT_COMPTABLE'
						? 'Export comptable'
						: 'Facture'
		},
		...(detail.reference === undefined ? [] : [{ titre: 'Numéro', date: detail.reference }]),
		...(detail.dateDocument === undefined
			? []
			: [{ titre: 'Daté du', date: dateCourte(detail.dateDocument) }])
	];

	/*
	  DEUX VOLETS AU-DESSUS DE 1024 PX, comme l'aperçu de Dropbox, de Google Drive
	  ou de Box : le document en grand à gauche, ce qu'on en sait à droite, qui
	  reste en vue pendant qu'on lit les pages. En dessous, une colonne : l'aperçu
	  d'abord, les faits ensuite.
	*/
	return (
		<div className="flex flex-col gap-cladd-xs lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-cladd-sm">
			<div className="flex min-w-0 flex-col gap-cladd-xs">
				{!ouvrable ? (
					<div className="verre-carte flex flex-col items-center gap-2 rounded-cladd-xl p-cladd-sm text-center">
						<VignetteDocument mime={resume.mime} scelle={false} grande />
						<p className="text-cladd-xs leading-relaxed text-cladd-fg-soft">
							{resume.etat === 'EN_COURS'
								? 'Ce document se met au coffre : il s’ouvrira dans quelques secondes.'
								: 'Ce fichier a été refusé à son arrivée : il n’a pas été conservé.'}
						</p>
					</div>
				) : apercu.etat === 'OUVERTURE' ? (
					<ApercuEnAttente />
				) : apercu.etat === 'ECHEC' ? (
					<p
						role="alert"
						className="verre-carte rounded-cladd-xl p-cladd-2xs text-cladd-xs leading-relaxed"
					>
						{apercu.message}
					</p>
				) : (
					<Apercu contenu={apercu.contenu} />
				)}

				{resume.etat === 'ECHEC' && resume.etape !== undefined ? (
					<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">{resume.etape}</p>
				) : null}
			</div>

			<div className="flex flex-col gap-cladd-xs lg:sticky lg:top-24">
				{/* Ce que la lecture en a tiré, mot pour mot. */}
				<ListeDeReleve>
					<LigneDeReleve titre="Ce que la lecture a donné" ligne={ligneDuDocument(resume)} retour />
					{detail.constat === undefined ? null : (
						<LigneDeReleve titre="Constat" ligne={detail.constat} retour />
					)}
					{resume.bilan !== undefined && resume.bilan.ignoreesTotal > 0 ? (
						<LigneDeReleve
							titre="Lignes non lues"
							date={String(resume.bilan.ignoreesTotal)}
							ligne="Le détail est dans le bilan du dépôt."
							retour
						/>
					) : null}
					{resume.client === undefined ? null : (
						<LigneDeReleve titre="Client" ligne={resume.client.nom} retour />
					)}
				</ListeDeReleve>
				{resume.client !== undefined && versLeClient !== undefined
					? versLeClient(resume.client.id)
					: null}

				<ListeDeReleve>
					{faits.map((fait) => (
						<LigneDeReleve key={fait.titre} retour {...fait} />
					))}
				</ListeDeReleve>

				{/* Le sceau : ce qui le protège, en faits. */}
				<ListeDeReleve>
					<LigneDeReleve
						titre="Chiffrement"
						ligne={
							detail.sceau === undefined
								? 'Pas encore scellé'
								: `${detail.sceau.algorithme} · clé de votre établissement`
						}
						retour
					/>
					{detail.empreinte === undefined ? null : (
						<LigneDeReleve
							titre="Empreinte SHA-256"
							ligne={`${detail.empreinte.slice(0, 16)}…${detail.empreinte.slice(-8)}`}
							retour
						/>
					)}
				</ListeDeReleve>

				{detail.journal.length === 0 ? null : (
					<section className="flex flex-col gap-cladd-3xs">
						<h3 className="flex items-center gap-1.5 px-1 text-cladd-sm font-semibold">
							<KeyRoundIcon className="size-4 text-cladd-fg-soft" aria-hidden />
							Journal des accès
						</h3>
						<ListeDeReleve>
							{detail.journal.map((entree, i) => (
								<LigneDeReleve
									key={`${entree.le}-${i}`}
									titre={`${LIBELLE_GESTE[entree.geste]} ${parQui(entree.par)}`}
									date={horodatage(entree.le)}
									retour
								/>
							))}
						</ListeDeReleve>
					</section>
				)}

				{confirmerRetrait ? (
					<div className="verre-carte flex flex-col gap-cladd-3xs rounded-cladd-xl p-cladd-2xs">
						<p className="text-cladd-xs font-semibold">Retirer ce document du coffre ?</p>
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{resume.ref.genre === 'PIECE'
								? 'Son fichier est effacé définitivement, et il cesse de soutenir ses dossiers.'
								: 'Son fichier est effacé définitivement. Les factures qu’il a fait entrer restent, sans leur document source.'}
						</p>
						<div className="flex gap-cladd-3xs">
							<BoutonSecondaire className="flex-1" onClick={() => setConfirmerRetrait(false)}>
								Garder
							</BoutonSecondaire>
							<BoutonSecondaire
								className="flex-1"
								onClick={() => {
									setRefusDuRetrait(null);
									onRetirer(resume.ref).catch((erreur: unknown) =>
										setRefusDuRetrait(
											erreur instanceof Error && erreur.message !== ''
												? erreur.message
												: 'Le retrait n’a pas abouti.'
										)
									);
								}}
							>
								<Trash2Icon />
								Retirer
							</BoutonSecondaire>
						</div>
						{refusDuRetrait === null ? null : (
							<p role="alert" className="text-cladd-2xs leading-relaxed">
								{refusDuRetrait}
							</p>
						)}
					</div>
				) : (
					<BoutonTexte className="self-center" onClick={() => setConfirmerRetrait(true)}>
						<Trash2Icon />
						Retirer du coffre
					</BoutonTexte>
				)}
			</div>
		</div>
	);
}

/**
 * LES DERNIERS ACCÈS AU COFFRE, tous documents confondus — le journal d'activité
 * de 1Password ou de Dropbox. Qui a déposé, ouvert, téléchargé ou retiré quoi :
 * un accès qu'on n'attendait pas se voit ici, sans aller le chercher document
 * par document. Les dix plus récents ; chaque document porte le sien en entier.
 */
export function JournalDuCoffre({ journal }: { readonly journal: readonly EntreeDuJournal[] }) {
	return (
		<section className="flex flex-col gap-cladd-3xs">
			<h2 className="flex items-center gap-1.5 px-1 text-cladd-sm font-semibold">
				<KeyRoundIcon className="size-4 text-cladd-fg-soft" aria-hidden />
				Derniers accès
			</h2>
			<ListeDeReleve>
				{journal.slice(0, 10).map((entree, i) => (
					<LigneDeReleve
						key={`${entree.le}-${i}`}
						titre={entree.nomDocument}
						// La date descend avec le geste : à droite, elle tronquait le nom.
						ligne={`${LIBELLE_GESTE[entree.geste]} ${parQui(entree.par)}, le ${horodatage(entree.le)}`}
						retour
					/>
				))}
			</ListeDeReleve>
		</section>
	);
}
