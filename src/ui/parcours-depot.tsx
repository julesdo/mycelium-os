import { useRef, useState, type ReactNode } from 'react';
import { Button, Spinner } from '@cladd-ui/react';
import {
	CameraIcon,
	CheckIcon,
	FolderOpenIcon,
	LockIcon,
	RotateCcwIcon,
	ShieldCheckIcon,
	UploadIcon,
	XIcon
} from 'lucide-react';
import { BoutonPrincipal, BoutonTexte } from './bouton';
import { cn } from './cn';
import { EnTeteDeGroupe } from './en-tete-groupe';
import {
	ProtectionsDuCoffre,
	VignetteDocument,
	ligneDuDocument,
	tailleEnClair,
	type RefCoffre,
	type ResumeDocument
} from './coffre';
import {
	JaugeDEtapes,
	BarreDePleinEcran,
	ColonneDePleinEcran,
	PiedDePleinEcran,
	PleinEcran
} from './plein-ecran';

/**
 * LE DÉPÔT AU COFFRE — UN SEUL PARCOURS, PARTOUT (12/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL REMPLACE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le fondateur : « quand on upload, ça se fait de manière très dégueux au beau
 * milieu de l'accueil, et on n'a aucune sensation de sécurisation ; pareil depuis
 * un dossier ». Il y avait quatre portes — la zone dépliée au milieu
 * d'Aujourd'hui, l'écran des dépôts, les pièces d'un dossier, celles d'une fiche
 * client — et des cartes de bilan dans la file du matin. Il n'y en a plus qu'une,
 * ce parcours, ouvert depuis chacun de ces endroits avec sa destination :
 *
 *   1. VOS DOCUMENTS — choisir (fichiers, photo ; glisser à la souris) ; chaque
 *      fichier est vérifié AVANT l'envoi (format, taille, déjà au coffre) ; ce qui
 *      le protège est écrit, en quatre lignes vraies ;
 *   2. MISE AU COFFRE — l'envoi (son pourcentage réel), le chiffrement, la lecture,
 *      fichier par fichier, tels que le serveur les publie ;
 *   3. RÉSUMÉ — ce qui est au coffre, ce que la lecture a trouvé, ce qui a échoué
 *      et pourquoi. Fermer en route ne perd rien : la lecture continue.
 *
 * Relevé sur Mobbin : le choix en deux tuiles de Fi (« Upload files », « Add
 * photos »), les formats et la taille écrits de Deel, la liste puis « Next » de
 * Docusign, l'avancement d'envoi de Google Drive, l'aperçu plein écran de
 * Dropbox et Freeform.
 *
 * ⚠️ IL N'ENVOIE RIEN LUI-MÊME. Tout passe par `depot`, que la route construit
 * (`app/use-coffre.ts`) : `src/ui` ne connaît pas Convex.
 */

/** Où en est un fichier du dépôt. */
export type PhaseDuFichier =
	| 'VERIFICATION'
	| 'PRET'
	| 'REFUSE'
	| 'DEJA'
	| 'ENVOI'
	| 'COFFRE'
	| 'ECHEC_ENVOI';

export interface FichierAuDepot {
	readonly cle: string;
	readonly nom: string;
	readonly taille: number;
	readonly mime: string;
	readonly phase: PhaseDuFichier;
	/** Pendant l'envoi : la part envoyée, de 0 à 1, quand le navigateur la mesure. */
	readonly avancement?: number;
	/** Le refus avant l'envoi, ou l'échec de l'envoi : en toutes lettres. */
	readonly message?: string;
	/** Déjà au coffre : sous quel nom, et depuis quand. */
	readonly deja?: { readonly nom: string; readonly deposeLe: number };
	/** Une fois confié : ce que le serveur publie de lui, en direct. */
	readonly suivi?: ResumeDocument;
	/** Le service en ligne d'où il vient : « Dropbox ». Absent pour l'appareil. */
	readonly source?: string;
}

export interface DepotAuCoffre {
	readonly fichiers: readonly FichierAuDepot[];
	readonly onAjouter: (fichiers: File[]) => void;
	readonly onRetirer: (cle: string) => void;
	readonly onLancer: () => void;
	readonly onReessayer: (cle: string) => void;
	/** Vide le dépôt, pour en commencer un autre. */
	readonly onRecommencer: () => void;
	readonly lance: boolean;
	/** Les formats du sélecteur. */
	readonly accept: string;
	readonly formats: string;
	/**
	 * Les services en ligne (Google Drive, Dropbox…), sous les deux tuiles. Absent
	 * tant que le serveur de transfert n'est pas configuré.
	 */
	readonly sources?: ReactNode;
}

/** Ce qui sera envoyé : prêt, ou déjà au coffre quand la destination l'accepte. */
function aEnvoyer(fichier: FichierAuDepot): boolean {
	return fichier.phase === 'PRET';
}

/** Un fichier a fini quand le serveur dit terminé ou échoué, ou qu'il n'est jamais parti. */
function estFini(fichier: FichierAuDepot): boolean {
	if (fichier.phase === 'REFUSE' || fichier.phase === 'DEJA' || fichier.phase === 'ECHEC_ENVOI')
		return true;
	return (
		fichier.phase === 'COFFRE' && fichier.suivi !== undefined && fichier.suivi.etat !== 'EN_COURS'
	);
}

function dateLisible(le: number): string {
	return new Date(le).toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LE CHOIX
 * ═══════════════════════════════════════════════════════════════════════════ */

function Tuile({
	icone,
	titre,
	texte,
	onClick
}: {
	readonly icone: ReactNode;
	readonly titre: string;
	readonly texte: string;
	readonly onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="verre-carte verre-bouton flex min-h-32 flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-cladd-xl p-cladd-2xs text-center"
		>
			<span className="text-cladd-primary [&>svg]:size-6" aria-hidden>
				{icone}
			</span>
			<span className="text-cladd-xs font-semibold">{titre}</span>
			<span className="text-cladd-3xs leading-snug text-cladd-fg-soft">{texte}</span>
		</button>
	);
}

/** Les deux tuiles de Fi : des fichiers, ou une photo. Le glisser marche sur toute la zone. */
function Selecteur({
	accept,
	onFichiers
}: {
	readonly accept: string;
	readonly onFichiers: (fichiers: File[]) => void;
}) {
	const fichiers = useRef<HTMLInputElement>(null);
	const photo = useRef<HTMLInputElement>(null);
	const [survols, setSurvols] = useState(0);
	const recevoir = (liste: FileList | null) => {
		const choisis = [...(liste ?? [])];
		if (choisis.length > 0) onFichiers(choisis);
	};

	return (
		<div
			onDragEnter={(e) => {
				e.preventDefault();
				setSurvols((n) => n + 1);
			}}
			onDragLeave={(e) => {
				e.preventDefault();
				setSurvols((n) => Math.max(0, n - 1));
			}}
			onDragOver={(e) => e.preventDefault()}
			onDrop={(e) => {
				e.preventDefault();
				setSurvols(0);
				recevoir(e.dataTransfer.files);
			}}
			className={cn(
				'flex flex-col gap-cladd-3xs rounded-cladd-xl transition-shadow',
				survols > 0 && 'ring-2 ring-cladd-primary ring-offset-4 ring-offset-cladd-bg'
			)}
		>
			<div className="flex gap-cladd-3xs">
				<Tuile
					icone={<FolderOpenIcon />}
					titre="Choisir des fichiers"
					texte="Sur l’appareil ou un service de fichiers"
					onClick={() => fichiers.current?.click()}
				/>
				<Tuile
					icone={<CameraIcon />}
					titre="Prendre une photo"
					texte="D’une facture ou d’un bon papier"
					onClick={() => photo.current?.click()}
				/>
			</div>
			<p className="hidden text-center text-cladd-3xs text-cladd-fg-soft [@media(pointer:fine)]:block">
				Ou glissez vos fichiers ici.
			</p>
			<input
				ref={fichiers}
				type="file"
				multiple
				accept={accept}
				className="sr-only"
				tabIndex={-1}
				aria-hidden
				onChange={(e) => {
					recevoir(e.target.files);
					e.target.value = '';
				}}
			/>
			<input
				ref={photo}
				type="file"
				accept="image/jpeg,image/png,image/webp"
				capture="environment"
				className="sr-only"
				tabIndex={-1}
				aria-hidden
				onChange={(e) => {
					recevoir(e.target.files);
					e.target.value = '';
				}}
			/>
		</div>
	);
}

/** La ligne d'état d'un fichier, à chaque étape du dépôt. */
export function etatDuFichier(fichier: FichierAuDepot, destinationFactures: boolean): string {
	switch (fichier.phase) {
		case 'VERIFICATION':
			return 'Vérification…';
		case 'PRET':
			return fichier.deja === undefined
				? `Prêt · ${tailleEnClair(fichier.taille)}${fichier.source === undefined ? '' : ` · depuis ${fichier.source}`}`
				: `Déjà au coffre depuis le ${dateLisible(fichier.deja.deposeLe)} · sera rangé ici aussi`;
		case 'DEJA':
			return destinationFactures
				? `Déjà dans votre coffre depuis le ${dateLisible(fichier.deja?.deposeLe ?? Date.now())} : il n’est pas renvoyé`
				: 'Déjà dans votre coffre';
		case 'REFUSE':
		case 'ECHEC_ENVOI':
			return fichier.message ?? 'Refusé';
		case 'ENVOI':
			return fichier.avancement === undefined
				? 'Envoi chiffré en HTTPS…'
				: `Envoi chiffré en HTTPS · ${Math.round(fichier.avancement * 100)} %`;
		case 'COFFRE': {
			const suivi = fichier.suivi;
			if (suivi === undefined) return 'Mise au coffre…';
			if (suivi.etat === 'ECHEC') return suivi.etape ?? 'La lecture a échoué.';
			if (suivi.etat === 'TERMINE') return ligneDuDocument(suivi);
			return suivi.scelle ? 'Scellé · lecture en cours…' : 'Chiffrement…';
		}
	}
}

/** La part accomplie d'un fichier, de l'envoi à la lecture : une barre qui ne ment pas. */
export function partAccomplie(fichier: FichierAuDepot): number {
	if (fichier.phase === 'ENVOI') return 0.05 + 0.55 * (fichier.avancement ?? 0);
	if (fichier.phase !== 'COFFRE') return 0;
	const suivi = fichier.suivi;
	if (suivi === undefined) return 0.65;
	if (suivi.etat !== 'EN_COURS') return 1;
	return suivi.scelle ? 0.85 : 0.7;
}

function CarteDuFichier({
	fichier,
	destinationFactures,
	onRetirer,
	onReessayer
}: {
	readonly fichier: FichierAuDepot;
	readonly destinationFactures: boolean;
	readonly onRetirer?: () => void;
	readonly onReessayer?: () => void;
}) {
	const enCours =
		fichier.phase === 'VERIFICATION' ||
		fichier.phase === 'ENVOI' ||
		(fichier.phase === 'COFFRE' &&
			(fichier.suivi === undefined || fichier.suivi.etat === 'EN_COURS'));
	const fini = fichier.phase === 'COFFRE' && fichier.suivi?.etat === 'TERMINE';
	const echoue =
		fichier.phase === 'REFUSE' ||
		fichier.phase === 'ECHEC_ENVOI' ||
		(fichier.phase === 'COFFRE' && fichier.suivi?.etat === 'ECHEC');
	const scelle = fichier.suivi?.scelle ?? false;
	const part = partAccomplie(fichier);

	return (
		<div className="verre-carte flex flex-col gap-2 rounded-cladd-xl py-3 pr-3 pl-3.5">
			<div className="flex items-center gap-3">
				<VignetteDocument mime={fichier.mime} scelle={scelle} />
				<span className="flex min-w-0 flex-1 flex-col gap-0.5">
					<span className="truncate text-cladd-xs font-semibold">{fichier.nom}</span>
					<span
						className={cn(
							'text-cladd-2xs leading-snug',
							echoue ? 'text-cladd-fg' : 'text-cladd-fg-soft'
						)}
						aria-live={enCours ? 'polite' : undefined}
					>
						{etatDuFichier(fichier, destinationFactures)}
					</span>
				</span>
				{enCours ? (
					<Spinner size="xs" />
				) : fini ? (
					<CheckIcon className="size-5 shrink-0 text-cladd-primary" aria-label="Au coffre" />
				) : null}
				{onReessayer === undefined ? null : (
					<Button
						variant="transparent"
						outline={false}
						rounded
						square
						size="md"
						aria-label={`Renvoyer ${fichier.nom}`}
						className="verre-carte verre-bouton shrink-0"
						onClick={onReessayer}
					>
						<RotateCcwIcon />
					</Button>
				)}
				{onRetirer === undefined ? null : (
					<Button
						variant="transparent"
						outline={false}
						rounded
						square
						size="md"
						aria-label={`Retirer ${fichier.nom} du dépôt`}
						className="verre-carte verre-bouton shrink-0 text-cladd-fg-soft"
						onClick={onRetirer}
					>
						<XIcon />
					</Button>
				)}
			</div>
			{part > 0 && part < 1 ? (
				<div
					className="h-1 overflow-hidden rounded-full bg-cladd-fg/10"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(part * 100)}
					aria-label={`Avancement de ${fichier.nom}`}
				>
					<div
						className="h-full rounded-full bg-cladd-primary transition-[width] duration-500"
						style={{ width: `${Math.round(part * 100)}%` }}
					/>
				</div>
			) : null}
		</div>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LE PARCOURS
 * ═══════════════════════════════════════════════════════════════════════════ */

export interface ProprietesParcoursDepot {
	readonly ouvert: boolean;
	readonly onFermer: () => void;
	/** Où vont les documents : « Vos factures », « Pièces du dossier ». */
	readonly destination: { readonly titre: string; readonly precision: string };
	/** Des factures à lire (un doublon n'est pas renvoyé), ou des pièces. */
	readonly genre: 'FACTURES' | 'PIECES';
	readonly depot: DepotAuCoffre;
	/** Ouvrir un document du coffre depuis le résumé. */
	readonly onVoir?: (ref: RefCoffre) => void;
	/** Mener au coffre depuis le résumé. */
	readonly onVoirLeCoffre?: () => void;
}

export function ParcoursDepot({
	ouvert,
	onFermer,
	destination,
	genre,
	depot,
	onVoir,
	onVoirLeCoffre
}: ProprietesParcoursDepot) {
	const { fichiers } = depot;
	const envoyables = fichiers.filter(aEnvoyer);
	const enVerification = fichiers.some((f) => f.phase === 'VERIFICATION');
	const confies = fichiers.filter(
		(f) => f.phase === 'ENVOI' || f.phase === 'COFFRE' || f.phase === 'ECHEC_ENVOI'
	);
	const toutFini = depot.lance && fichiers.length > 0 && fichiers.every(estFini);
	// L'étape se DÉRIVE de l'état du dépôt : aucune ne se désynchronise de ce qui se passe.
	const etape = !depot.lance ? 0 : toutFini ? 2 : 1;
	const destinationFactures = genre === 'FACTURES';
	const auCoffre = confies.filter((f) => f.phase === 'COFFRE' && f.suivi?.etat === 'TERMINE');
	// Au coffre veut dire SCELLÉ, lu ou non : un document dont la lecture a échoué y
	// est quand même, chiffré, et se rouvre.
	const scelles = confies.filter((f) => f.phase === 'COFFRE' && f.suivi?.scelle === true);
	const rates = fichiers.filter(
		(f) =>
			f.phase === 'REFUSE' ||
			f.phase === 'ECHEC_ENVOI' ||
			(f.phase === 'COFFRE' && f.suivi?.etat === 'ECHEC')
	);

	const fermer = () => {
		onFermer();
		// Un dépôt fini se vide en fermant ; un dépôt en route continue sans l'écran.
		if (toutFini || !depot.lance) depot.onRecommencer();
	};

	const titres = ['Vos documents', 'Mise au coffre', 'Résumé'] as const;

	return (
		<PleinEcran ouvert={ouvert} onFermer={fermer} libelle="Déposer des documents au coffre">
			<ColonneDePleinEcran>
				<BarreDePleinEcran
					titre="Déposer au coffre"
					sousTitre={`Étape ${etape + 1} sur 3 · ${titres[etape]}`}
					onFermer={fermer}
				>
					<JaugeDEtapes total={3} courante={etape} />
				</BarreDePleinEcran>

				<div className="flex flex-1 flex-col gap-cladd-xs pt-cladd-2xs pb-cladd-sm">
					{etape === 0 ? (
						<>
							<div className="flex flex-col gap-1 px-1">
								<h2 className="text-cladd-lg leading-tight font-semibold">Vos documents</h2>
								<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
									Rangés dans{' '}
									<span className="font-semibold text-cladd-fg">{destination.titre}</span>
									{destination.precision === '' ? '' : ` · ${destination.precision}`}
								</p>
							</div>
							<Selecteur accept={depot.accept} onFichiers={depot.onAjouter} />
							<p className="px-1 text-center text-cladd-3xs text-cladd-fg-soft">
								{depot.formats} · 20 Mo par fichier
							</p>
							{depot.sources}

							{fichiers.length === 0 ? null : (
								<section className="flex flex-col gap-cladd-3xs">
									<EnTeteDeGroupe libelle="À mettre au coffre" nombre={envoyables.length} />
									<div className="flex flex-col gap-2">
										{fichiers.map((fichier) => (
											<CarteDuFichier
												key={fichier.cle}
												fichier={fichier}
												destinationFactures={destinationFactures}
												onRetirer={() => depot.onRetirer(fichier.cle)}
											/>
										))}
									</div>
								</section>
							)}

							<ProtectionsDuCoffre />
						</>
					) : etape === 1 ? (
						<>
							<div className="flex flex-col gap-1 px-1">
								<h2 className="text-cladd-lg leading-tight font-semibold">Mise au coffre</h2>
								<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
									Chaque document part en HTTPS, est chiffré dès son arrivée, puis lu. Vous pouvez
									fermer : la lecture continue, et le coffre montre où elle en est.
								</p>
							</div>
							<div className="flex flex-col gap-2">
								{fichiers.map((fichier) => (
									<CarteDuFichier
										key={fichier.cle}
										fichier={fichier}
										destinationFactures={destinationFactures}
										{...(fichier.phase === 'ECHEC_ENVOI'
											? { onReessayer: () => depot.onReessayer(fichier.cle) }
											: {})}
									/>
								))}
							</div>
						</>
					) : (
						<>
							<div className="flex flex-col items-center gap-2 px-1 pt-cladd-2xs text-center">
								<span className="flex size-16 items-center justify-center rounded-full bg-cladd-primary/10 text-cladd-primary [&>svg]:size-8">
									<ShieldCheckIcon aria-hidden />
								</span>
								<h2 className="text-cladd-lg leading-tight font-semibold">
									{scelles.length === 0
										? 'Aucun document au coffre'
										: `${scelles.length} document${scelles.length > 1 ? 's' : ''} au coffre`}
								</h2>
								<p className="flex items-center gap-1.5 text-cladd-2xs text-cladd-fg-soft">
									<LockIcon className="size-3.5" aria-hidden />
									Chiffrés avec la clé de votre établissement
								</p>
							</div>

							{auCoffre.length === 0 ? null : (
								<section className="flex flex-col gap-cladd-3xs">
									<EnTeteDeGroupe libelle="Ce que la lecture a trouvé" nombre={auCoffre.length} />
									<div className="flex flex-col gap-2">
										{auCoffre.map((fichier) =>
											onVoir === undefined || fichier.suivi === undefined ? (
												<CarteDuFichier
													key={fichier.cle}
													fichier={fichier}
													destinationFactures={destinationFactures}
												/>
											) : (
												<button
													key={fichier.cle}
													type="button"
													className="cursor-pointer text-left"
													onClick={() => fichier.suivi !== undefined && onVoir(fichier.suivi.ref)}
													aria-label={`Ouvrir ${fichier.nom}`}
												>
													<CarteDuFichier
														fichier={fichier}
														destinationFactures={destinationFactures}
													/>
												</button>
											)
										)}
									</div>
								</section>
							)}

							{rates.length === 0 ? null : (
								<section className="flex flex-col gap-cladd-3xs">
									<EnTeteDeGroupe libelle="Pas entrés" nombre={rates.length} />
									<div className="flex flex-col gap-2">
										{rates.map((fichier) => (
											<CarteDuFichier
												key={fichier.cle}
												fichier={fichier}
												destinationFactures={destinationFactures}
												{...(fichier.phase === 'ECHEC_ENVOI'
													? { onReessayer: () => depot.onReessayer(fichier.cle) }
													: {})}
											/>
										))}
									</div>
								</section>
							)}

							{fichiers.some((f) => f.phase === 'DEJA') ? (
								<p className="px-1 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
									Les documents déjà présents dans votre coffre n’ont pas été renvoyés.
								</p>
							) : null}

							<div className="flex flex-wrap justify-center gap-x-cladd-xs">
								<BoutonTexte onClick={depot.onRecommencer}>
									<UploadIcon />
									Déposer d’autres documents
								</BoutonTexte>
								{onVoirLeCoffre === undefined ? null : (
									<BoutonTexte
										onClick={() => {
											fermer();
											onVoirLeCoffre();
										}}
									>
										<LockIcon />
										Voir le coffre
									</BoutonTexte>
								)}
							</div>
						</>
					)}
				</div>

				<PiedDePleinEcran>
					{etape === 0 ? (
						<BoutonPrincipal
							pleineLargeur
							// Rien ne part tant qu'un fichier se vérifie : il pourrait être un doublon.
							readOnly={envoyables.length === 0 || enVerification}
							onClick={depot.onLancer}
						>
							<LockIcon />
							{enVerification
								? 'Vérification…'
								: envoyables.length === 0
									? 'Mettre au coffre'
									: `Mettre au coffre (${envoyables.length})`}
						</BoutonPrincipal>
					) : etape === 1 ? (
						<BoutonPrincipal pleineLargeur onClick={fermer}>
							Continuer sans attendre
						</BoutonPrincipal>
					) : (
						<BoutonPrincipal pleineLargeur onClick={fermer}>
							Terminé
						</BoutonPrincipal>
					)}
				</PiedDePleinEcran>
			</ColonneDePleinEcran>
		</PleinEcran>
	);
}
