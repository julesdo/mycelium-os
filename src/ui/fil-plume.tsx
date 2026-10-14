import {
	useRef,
	useState,
	type ClipboardEvent,
	type DragEvent,
	type KeyboardEvent,
	type ReactNode
} from 'react';
import { Button, Input, Select, Spinner, Textarea } from '@cladd-ui/react';
import { ArrowUpIcon, CheckIcon, ChevronRightIcon, EyeIcon, PlusIcon, XIcon } from 'lucide-react';
import { cn } from './cn';
import { DEGAGEMENT_LATERAL } from './coquille-bureau';
import type { PhraseAffichee } from './conversation';
import {
	VignetteDocument,
	ligneDuDocument,
	mimeProbable,
	tailleEnClair,
	type ResumeDocument
} from './coffre';
import { etatDuFichier, type FichierAuDepot } from './parcours-depot';
import { AvatarPlume, NOM_DU_PILOTE, Plume, type HumeurPlume } from './plume';

/**
 * LE FIL DE PLUME — la conversation, sur les codes de Claude (08/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUI A ÉTÉ JUGÉ « HORRIBLE », ET CE QUI LE REMPLACE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La conversation vivait dans une feuille : un champ, un bouton « Demander », et
 * chaque tour dans une carte de verre titrée « Vous » ou « Le logiciel ». Le
 * fondateur : « la bulle et popup de discussion est juste horrible et ne reprend
 * pas du tout les codes des interfaces agentiques comme Claude ».
 *
 * Relevé sur Claude iOS (Mobbin, 08/10) et repris ici, pièce par pièce :
 *
 *   · plein écran, sur le fond de l'application ;
 *   · la question du gérant dans une BULLE, à droite ;
 *   · la réponse SANS BULLE, pleine largeur, avec Plume à sa gauche ;
 *   · le travail qui se voit DANS le fil, étape par étape (Manus, Notion AI) ;
 *   · un compositeur FLOTTANT en bas, un bouton rond pour envoyer ;
 *   · ce qu'on peut demander, en pastilles au-dessus du compositeur.
 *
 * ⚠️ LES BARRIÈRES DE L'ANCIEN FIL RESTENT. Chaque phrase porte sa source, et une
 * phrase sans source qui porte un chiffre s'affiche dégradée, marquée « non
 * sourcé » (voir `aMarquer`). Le grain reste la phrase, jamais la réponse.
 */

/**
 * UN DOCUMENT DANS LE FIL — joint à la question qui part, ou à une question passée
 * (12/10/2026, sur Claude, DeepSeek et Copilot : la carte du fichier au-dessus de la
 * bulle, à droite). Il passe par le coffre comme tout dépôt : la ligne dit où il en
 * est, puis ce que sa lecture a donné, et la carte l'ouvre dans la visionneuse.
 */
export interface DocumentDuFil {
	readonly cle: string;
	readonly nom: string;
	readonly mime: string;
	readonly scelle: boolean;
	/** Ce qui se passe, ou ce que la lecture a donné, en quelques mots. */
	readonly ligne: string;
	readonly enCours: boolean;
	readonly onOuvrir?: () => void;
}

/** Ce qu'un fichier du dépôt en cours devient dans le fil. */
export function documentDepuisFichier(fichier: FichierAuDepot): DocumentDuFil {
	const suivi = fichier.suivi;
	return {
		cle: fichier.cle,
		nom: fichier.nom,
		mime: fichier.mime,
		scelle: suivi?.scelle ?? false,
		ligne: etatDuFichier(fichier, false),
		enCours:
			fichier.phase === 'VERIFICATION' ||
			fichier.phase === 'ENVOI' ||
			(fichier.phase === 'COFFRE' && (suivi === undefined || suivi.etat === 'EN_COURS'))
	};
}

/** Ce qu'un document d'une question passée devient dans le fil : son résumé du coffre, en direct. */
export function documentDepuisResume(
	cle: string,
	nom: string,
	resume: ResumeDocument | null,
	onOuvrir?: () => void
): DocumentDuFil {
	return resume === null
		? {
				cle,
				nom,
				mime: mimeProbable(undefined, nom),
				scelle: false,
				ligne: 'Retiré du coffre',
				enCours: false
			}
		: {
				cle,
				nom: resume.nom,
				mime: mimeProbable(resume.mime, resume.nom),
				scelle: resume.scelle,
				ligne: ligneDuDocument(resume),
				enCours: resume.etat === 'EN_COURS',
				...(onOuvrir === undefined ? {} : { onOuvrir })
			};
}

function CarteDocumentDuFil({ document }: { readonly document: DocumentDuFil }) {
	const contenu = (
		<>
			<VignetteDocument mime={document.mime} scelle={document.scelle} />
			<span className="flex min-w-0 flex-col text-left">
				<span className="truncate text-cladd-2xs font-semibold text-cladd-fg">{document.nom}</span>
				<span className="flex items-center gap-1.5 text-cladd-3xs leading-snug text-cladd-fg-soft">
					{document.enCours ? <Spinner size="xs" /> : null}
					<span className="truncate">{document.ligne}</span>
				</span>
			</span>
		</>
	);
	const classe =
		'verre-carte flex min-h-14 w-full max-w-72 items-center gap-2.5 rounded-cladd-xl p-2 pr-3';
	return document.onOuvrir === undefined ? (
		<div className={classe}>{contenu}</div>
	) : (
		<button
			type="button"
			onClick={document.onOuvrir}
			aria-label={`Ouvrir ${document.nom}`}
			className={cn(classe, 'verre-bouton transition active:scale-[0.98]')}
		>
			{contenu}
		</button>
	);
}

/**
 * La question du gérant, dans sa bulle, à droite — et ses documents au-dessus.
 * Une question faite de documents seuls n'a pas de bulle de texte.
 */
export function BulleDuGerant({
	texte,
	documents = []
}: {
	readonly texte: string;
	readonly documents?: readonly DocumentDuFil[];
}) {
	return (
		<div className="flex flex-col items-end gap-1.5">
			{documents.map((document) => (
				<CarteDocumentDuFil key={document.cle} document={document} />
			))}
			{texte.trim() === '' ? null : (
				<p className="verre-dense max-w-[85%] rounded-[1.25rem] rounded-br-md px-3.5 py-2 text-cladd-xs leading-relaxed whitespace-pre-wrap text-cladd-fg">
					{texte}
				</p>
			)}
		</div>
	);
}

/**
 * LA SOURCE D'UNE PHRASE, À SA SUITE, DANS LE TEXTE.
 *
 * ⚠️ PLUS UNE PASTILLE SOUS CHAQUE PHRASE : trois phrases donnaient six lignes,
 * et la réponse se lisait comme un formulaire. La source suit la phrase, en
 * petit, comme une note — et elle reste visible, toujours.
 */
/**
 * ⚠️ UNE PHRASE SANS SOURCE N'EST MARQUÉE QUE SI ELLE PORTE UN CHIFFRE. « Je vous
 * propose de noter sa promesse » ne s'appuie sur rien et n'a pas à le faire : la
 * marquer « non sourcé », en italique, faisait douter de Plume au moment même où il
 * propose d'agir. Un chiffre sans source, lui (une date, un nombre de jours, un
 * compte), reste dégradé et marqué. Les montants et les règles de droit ne peuvent
 * de toute façon pas arriver jusqu'ici sans source : les filtres avant rendu les
 * arrêtent (`compagnon/filtres.ts`).
 */
function aMarquer(phrase: PhraseAffichee): boolean {
	return phrase.genreSource === 'AUCUNE' && /\d/.test(phrase.texte);
}

function SourceDeLaPhrase({ phrase }: { readonly phrase: PhraseAffichee }) {
	if (phrase.genreSource === 'AUCUNE' && !aMarquer(phrase)) return null;
	return (
		<span className="ml-1 inline-flex translate-y-[-1px] items-center rounded-full border border-cladd-outline px-1.5 align-middle text-cladd-3xs leading-5 whitespace-nowrap text-cladd-fg-soft not-italic">
			{phrase.genreSource === 'AUCUNE' ? 'non sourcé' : phrase.libelleSource}
		</span>
	);
}

/**
 * CE QUE PLUME RÉPOND — sans bulle, Plume à gauche.
 *
 * `phrases` pour une réponse sourcée ; `texte` pour ce qui n'a pas été découpé
 * (un tour ancien, un message de Plume lui-même) ; `children` pour ce qui suit la
 * réponse : les gestes proposés, un refus.
 */
export function ReponseDePlume({
	phrases,
	texte,
	humeur = 'repos',
	children
}: {
	readonly phrases?: readonly PhraseAffichee[];
	readonly texte?: string;
	readonly humeur?: HumeurPlume;
	readonly children?: ReactNode;
}) {
	return (
		<div className="flex items-start gap-2.5">
			<AvatarPlume humeur={humeur} taille={30} className="mt-0.5" />
			<div className="flex min-w-0 flex-1 flex-col gap-2.5">
				<span className="sr-only">{NOM_DU_PILOTE} :</span>
				{phrases === undefined || phrases.length === 0 ? null : (
					<div className="flex flex-col gap-2">
						{phrases.map((phrase, rang) => (
							<p
								key={rang}
								className={cn(
									'text-cladd-xs leading-relaxed',
									aMarquer(phrase) ? 'text-cladd-fg-softer italic' : 'text-cladd-fg'
								)}
							>
								{phrase.texte}
								<SourceDeLaPhrase phrase={phrase} />
							</p>
						))}
					</div>
				)}
				{texte === undefined ? null : (
					<p className="text-cladd-xs leading-relaxed whitespace-pre-wrap text-cladd-fg">{texte}</p>
				)}
				{children}
			</div>
		</div>
	);
}

export interface EtapeDeTravail {
	readonly libelle: string;
	readonly etat: 'faite' | 'courante' | 'avenir';
}

/**
 * LE TRAVAIL DE PLUME, DANS LE FIL : ses étapes, cochées une à une.
 *
 * ⚠️ CE QUI S'AFFICHE EST CE QUI SE FAIT. L'appelant ne déroule que des étapes
 * que le serveur fait vraiment (relire le dossier, reprendre ses factures et son
 * décompte, vérifier chaque chiffre à sa source, rédiger) : l'animation est le
 * rythme, le contenu est vrai.
 */
export function TravailDePlume({
	titre,
	etapes
}: {
	readonly titre?: string;
	readonly etapes: readonly EtapeDeTravail[];
}) {
	const courante = etapes.find((e) => e.etat === 'courante');
	return (
		<div className="flex items-start gap-2.5">
			<AvatarPlume humeur="reflechit" taille={30} className="mt-0.5" />
			<div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
				{/* Il réfléchit : la bulle et ses trois points, comme chez Duolingo et
				    dans toute messagerie (13/10/2026). Les étapes disent à quoi. */}
				<PointsDeSuspension />
				{titre === undefined ? null : <p className="text-cladd-2xs font-medium">{titre}</p>}
				<ol className="flex flex-col gap-1.5 border-l border-cladd-outline pl-3">
					{etapes.map((etape, i) => (
						<li
							key={`${i}-${etape.libelle}`}
							className={cn(
								'pilote-etape flex items-center gap-2 text-cladd-2xs leading-snug',
								etape.etat === 'faite' && 'text-cladd-fg-soft',
								etape.etat === 'courante' && 'text-cladd-fg',
								etape.etat === 'avenir' && 'text-cladd-fg-softest'
							)}
						>
							<span aria-hidden className="flex size-4 shrink-0 items-center justify-center">
								{etape.etat === 'faite' ? (
									<CheckIcon className="pilote-coche size-3.5" strokeWidth={2.5} />
								) : etape.etat === 'courante' ? (
									<Spinner size="xs" />
								) : (
									<span className="size-1.5 rounded-full bg-current opacity-50" />
								)}
							</span>
							<span className="min-w-0">{etape.libelle}</span>
						</li>
					))}
				</ol>
				<p className="sr-only" aria-live="polite">
					{courante?.libelle ?? ''}
				</p>
			</div>
		</div>
	);
}

/**
 * QUAND ON ARRIVE ET QUE RIEN N'A ENCORE ÉTÉ DIT : Plume, en grand.
 *
 * C'est l'accueil de Mo chez Alan : le personnage d'abord, puis ce qu'il fait ici,
 * en une phrase, et ce qu'on peut lui demander. Pas un paragraphe sur ce qu'il ne
 * sait pas faire.
 */
export function AccueilDePlume({
	humeur = 'ecoute',
	titre,
	sousTitre,
	children
}: {
	readonly humeur?: HumeurPlume;
	readonly titre: string;
	readonly sousTitre?: ReactNode;
	readonly children?: ReactNode;
}) {
	return (
		<div className="flex flex-col items-center gap-cladd-3xs pt-cladd-2xs pb-cladd-3xs text-center">
			<Plume humeur={humeur} taille={104} sol />
			<h2 className="mt-1 text-cladd-sm leading-snug font-semibold text-balance">{titre}</h2>
			{sousTitre === undefined ? null : (
				<div className="max-w-sm text-cladd-2xs leading-relaxed text-balance text-cladd-fg-soft">
					{sousTitre}
				</div>
			)}
			{children}
		</div>
	);
}

/**
 * CE QU'ON PEUT LUI DEMANDER — des pastilles à toucher, au-dessus du compositeur.
 *
 * ⚠️ UN TOUCHER REMPLIT LE CHAMP, IL N'ENVOIE PAS. La question part au modèle et
 * compte au plafond du mois : le gérant la relit, puis l'envoie.
 */
export function SuggestionsAPlume({
	suggestions,
	onChoisir
}: {
	readonly suggestions: readonly string[];
	readonly onChoisir: (suggestion: string) => void;
}) {
	if (suggestions.length === 0) return null;
	return (
		<div className="-mx-cladd-2xs flex gap-2 overflow-x-auto px-cladd-2xs pb-1 [scrollbar-width:none]">
			{suggestions.map((suggestion) => (
				<button
					key={suggestion}
					type="button"
					onClick={() => onChoisir(suggestion)}
					className="verre-carte verre-bouton min-h-9 shrink-0 rounded-full px-3.5 text-cladd-2xs whitespace-nowrap text-cladd-fg transition active:scale-[0.97]"
				>
					{suggestion}
				</button>
			))}
		</div>
	);
}

/**
 * TROIS POINTS DANS UNE BULLE — Plume réfléchit, ou va parler (13/10/2026).
 * Immobiles sous `prefers-reduced-motion`, et dits au lecteur d'écran.
 */
export function PointsDeSuspension({ className }: { readonly className?: string }) {
	return (
		<span
			role="status"
			aria-label={`${NOM_DU_PILOTE} réfléchit`}
			className={cn(
				'points-plume inline-flex h-7 w-fit items-center gap-1 rounded-full px-3',
				className
			)}
		>
			<span />
			<span />
			<span />
		</span>
	);
}

/**
 * D'OÙ L'ON PARLE À PLUME — une pastille au-dessus du compositeur (13/10/2026).
 *
 * Relevé chez Fabric (« 1 item »), ClickUp (« Ask about ») et monday (Mobbin,
 * 13/10/2026) : l'assistant ouvert depuis un élément le dit, et un ✕ l'oublie.
 * Plume sait ainsi de qui l'on parle quand on dit « il » ; le ✕ le ramène à tout
 * l'établissement.
 */
export function PastilleDuRegard({
	libelle,
	onRetirer
}: {
	readonly libelle: string;
	readonly onRetirer: () => void;
}) {
	return (
		<div className="flex">
			<span className="verre-carte inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-full py-0.5 pr-0.5 pl-3 text-cladd-2xs text-cladd-fg-soft">
				<EyeIcon size={14} aria-hidden className="shrink-0" />
				<span className="truncate">{libelle}</span>
				<Button
					size="sm"
					rounded
					square
					variant="transparent"
					outline={false}
					className="shrink-0"
					aria-label="Parler de tout l’établissement"
					onClick={onRetirer}
				>
					<XIcon size={14} aria-hidden />
				</Button>
			</span>
		</div>
	);
}

/**
 * LE COMPOSITEUR — une carte flottante en bas, comme chez Claude.
 *
 * ⚠️ ENTRÉE ENVOIE AU CLAVIER, MAJ+ENTRÉE VA À LA LIGNE. Sur un téléphone, la
 * touche « retour » du clavier va à la ligne : c'est le bouton rond qui envoie.
 *
 * ⚠️ PENDANT QUE PLUME RÉPOND, LE BOUTON TOURNE ET NE S'APPUIE PAS. Une seconde
 * question partie avant la première réponse croiserait deux fils.
 */
export function Composeur({
	valeur,
	onChange,
	onEnvoyer,
	enCours,
	placeholder,
	dessus,
	pieces = [],
	onJoindre,
	onRetirerPiece,
	accept
}: {
	readonly valeur: string;
	readonly onChange: (valeur: string) => void;
	readonly onEnvoyer: () => void;
	readonly enCours: boolean;
	readonly placeholder: string;
	/** Ce qui se pose juste au-dessus de la carte : les suggestions. */
	readonly dessus?: ReactNode;
	/**
	 * LES DOCUMENTS JOINTS À LA QUESTION QUI PART (12/10/2026) : vérifiés avant
	 * l'envoi (format, taille, déjà au coffre), comme dans le parcours de dépôt.
	 */
	readonly pieces?: readonly FichierAuDepot[];
	/** Absent : le compositeur n'offre pas de joindre (la portée ne le permet pas encore). */
	readonly onJoindre?: (fichiers: File[]) => void;
	readonly onRetirerPiece?: (cle: string) => void;
	/** Les formats du sélecteur. */
	readonly accept?: string;
}) {
	const selecteur = useRef<HTMLInputElement>(null);
	const vide = valeur.trim() === '';
	const prets = pieces.filter((p) => p.phase === 'PRET').length;
	const enVerification = pieces.some((p) => p.phase === 'VERIFICATION');
	// Un document encore vérifié partirait sans les autres : on attend qu'il soit prêt.
	const peutEnvoyer = !enCours && !enVerification && (!vide || prets > 0);

	function touche(evenement: KeyboardEvent<HTMLDivElement>) {
		if (evenement.key !== 'Enter' || evenement.shiftKey) return;
		evenement.preventDefault();
		if (peutEnvoyer) onEnvoyer();
	}
	/** Une capture d'écran collée dans le champ devient un document joint. */
	function coller(evenement: ClipboardEvent<HTMLDivElement>) {
		const fichiers = Array.from(evenement.clipboardData.files);
		if (fichiers.length === 0 || onJoindre === undefined) return;
		evenement.preventDefault();
		onJoindre(fichiers);
	}
	return (
		<div
			className={cn(
				'mb-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 px-cladd-3xs pb-cladd-3xs',
				// Au bureau, il se centre sur la conversation, à droite de la barre latérale.
				DEGAGEMENT_LATERAL
			)}
		>
			<div className="pointer-events-auto mx-auto flex w-full max-w-2xl flex-col gap-2">
				{dessus}
				<div className="verre-dense flex flex-col gap-1 rounded-[1.6rem] p-1.5" onPaste={coller}>
					{pieces.length === 0 ? null : (
						<ul
							aria-label="Documents joints"
							className="flex gap-2 overflow-x-auto px-0.5 pt-0.5 pb-1 [scrollbar-width:none]"
						>
							{pieces.map((piece) => (
								<li key={piece.cle} className="shrink-0">
									<PieceDuComposeur
										piece={piece}
										{...(onRetirerPiece === undefined
											? {}
											: { onRetirer: () => onRetirerPiece(piece.cle) })}
									/>
								</li>
							))}
						</ul>
					)}
					<div className="flex items-end gap-1.5">
						{onJoindre === undefined ? null : (
							<>
								<input
									ref={selecteur}
									id={ID_DU_SELECTEUR_DE_PLUME}
									type="file"
									multiple
									className="sr-only"
									tabIndex={-1}
									{...(accept === undefined ? {} : { accept })}
									onChange={(evenement) => {
										const fichiers = Array.from(evenement.target.files ?? []);
										evenement.target.value = '';
										if (fichiers.length > 0) onJoindre(fichiers);
									}}
								/>
								<Button
									size="md"
									rounded
									square
									variant="transparent"
									outline={false}
									className="shrink-0 text-cladd-fg-soft"
									disabled={enCours}
									onClick={() => selecteur.current?.click()}
									aria-label={`Joindre des documents pour ${NOM_DU_PILOTE}`}
								>
									<PlusIcon strokeWidth={2.2} />
								</Button>
							</>
						)}
						<Textarea
							size="md"
							value={valeur}
							onChange={(v) => onChange(v)}
							onKeyDown={touche}
							placeholder={
								prets > 0 && vide ? 'Ajoutez une question, ou envoyez tel quel' : placeholder
							}
							className={cn('min-w-0 flex-1 bg-transparent', onJoindre === undefined && 'pl-0.5')}
							inputClassName="max-h-40 overflow-y-auto"
							tightFocusRing
						/>
						<Button
							size="md"
							rounded
							square
							variant="transparent"
							outline={false}
							hoverable={false}
							className="pilule-principale shrink-0"
							disabled={!peutEnvoyer}
							onClick={onEnvoyer}
							aria-label={`Envoyer à ${NOM_DU_PILOTE}`}
						>
							{enCours ? <Spinner size="sm" /> : <ArrowUpIcon strokeWidth={2.4} />}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}

/**
 * LE SÉLECTEUR DE FICHIERS DU COMPOSITEUR, nommé pour qu'un geste de Plume
 * (« Me joindre le document ») l'ouvre au toucher de sa carte (12/10/2026).
 */
export const ID_DU_SELECTEUR_DE_PLUME = 'plume-joindre';

/**
 * UN DOCUMENT JOINT, DANS LE COMPOSITEUR — sa nature, son nom, ce que la
 * vérification en dit, et la croix pour le retirer (Claude, Manus, Copilot).
 */
function PieceDuComposeur({
	piece,
	onRetirer
}: {
	readonly piece: FichierAuDepot;
	readonly onRetirer?: () => void;
}) {
	const refusee =
		piece.phase === 'REFUSE' || piece.phase === 'ECHEC_ENVOI' || piece.phase === 'DEJA';
	const ligne =
		piece.phase === 'PRET' && piece.deja === undefined
			? tailleEnClair(piece.taille)
			: etatDuFichier(piece, false);
	return (
		<div
			className={cn(
				'verre-carte flex h-14 w-56 items-center gap-2 rounded-cladd-lg py-1.5 pr-1 pl-1.5',
				refusee && 'opacity-80'
			)}
		>
			<VignetteDocument mime={mimeProbable(piece.mime, piece.nom)} scelle={false} />
			<span className="flex min-w-0 flex-1 flex-col">
				<span className="truncate text-cladd-2xs font-semibold">{piece.nom}</span>
				<span
					className={cn(
						'flex items-center gap-1 truncate text-cladd-3xs leading-snug',
						refusee ? 'text-cladd-fg' : 'text-cladd-fg-soft'
					)}
				>
					{piece.phase === 'VERIFICATION' ? <Spinner size="xs" /> : null}
					<span className="truncate">{ligne}</span>
				</span>
			</span>
			{onRetirer === undefined ? null : (
				<Button
					size="sm"
					rounded
					square
					variant="transparent"
					outline={false}
					className="shrink-0 text-cladd-fg-soft"
					onClick={onRetirer}
					aria-label={`Retirer ${piece.nom}`}
				>
					<XIcon />
				</Button>
			)}
		</div>
	);
}

/**
 * UN GESTE PROPOSÉ PAR PLUME — une carte, puis « Confirmer ».
 *
 * ⚠️ RIEN NE SE FAIT SANS LE GÉRANT. Plume propose ; la carte dit ce qui sera
 * fait, en toutes lettres ; le geste n'a lieu qu'au toucher de « Confirmer ». Fait,
 * la carte le dit, et elle reste dans le fil : c'est la trace de ce qui a été
 * décidé, et par qui.
 */
/**
 * UN CHAMP QU'ON CORRIGE AVANT DE CONFIRMER (12/10/2026, sur Structured et Me+ :
 * la proposition se modifie sur place, sans tout redire à Plume). Le serveur relit
 * la valeur corrigée exactement comme celle que Plume avait proposée.
 */
export interface ChampDeGeste {
	readonly cle: 'date' | 'montant' | 'texte';
	readonly libelle: string;
	readonly valeur: string;
	readonly genre: 'date' | 'montant' | 'texte' | 'choix';
	/** Pour un choix : les valeurs permises, et leur libellé. */
	readonly choix?: readonly { readonly valeur: string; readonly libelle: string }[];
}

export type AjustementDeGeste = Partial<Record<ChampDeGeste['cle'], string>>;

/**
 * CE QUE LE GESTE ÉCRIRA, AVANT QU'IL L'ÉCRIVE — quelques lignes dans la carte : les
 * versements d'un échéancier, les factures qu'un paiement règle.
 */
export function ApercuDeGeste({
	lignes,
	note
}: {
	readonly lignes: readonly { readonly titre: string; readonly valeur?: string }[];
	readonly note?: string;
}) {
	if (lignes.length === 0 && note === undefined) return null;
	return (
		<div className="flex flex-col rounded-cladd-lg border border-cladd-outline">
			{lignes.map((ligne, rang) => (
				<div
					key={`${rang}-${ligne.titre}`}
					className={cn(
						'flex min-h-9 items-center justify-between gap-3 px-3 py-1.5 text-cladd-2xs',
						rang > 0 && 'border-t border-cladd-outline'
					)}
				>
					<span className="min-w-0 text-cladd-fg-soft">{ligne.titre}</span>
					{ligne.valeur === undefined ? null : (
						<span className="shrink-0 font-medium tabular-nums">{ligne.valeur}</span>
					)}
				</div>
			))}
			{note === undefined ? null : (
				<p
					className={cn(
						'px-3 py-2 text-cladd-3xs leading-snug text-cladd-fg-soft',
						lignes.length > 0 && 'border-t border-cladd-outline'
					)}
				>
					{note}
				</p>
			)}
		</div>
	);
}

export function CarteDeGeste({
	icone,
	titre,
	contexte,
	detail,
	etat,
	resultat,
	principal = false,
	onConfirmer,
	onEcarter,
	libelleConfirmer = 'Confirmer',
	enCours = false,
	acces,
	apercu,
	champs = []
}: {
	readonly icone: ReactNode;
	readonly titre: string;
	/**
	 * CE QUE LE GESTE TOUCHE, au-dessus du titre, quand la conversation ne le dit pas
	 * d'elle-même : le client d'un dossier, dans celle de l'établissement (12/10/2026).
	 */
	readonly contexte?: string;
	readonly detail?: string;
	readonly etat: 'PROPOSEE' | 'FAITE' | 'ECARTEE';
	/** Ce que le geste a produit, une fois fait. */
	readonly resultat?: string;
	/** La plus récente proposition en attente porte le bouton plein ; les autres, non. */
	readonly principal?: boolean;
	/** Confirmer, avec ce que le gérant a corrigé — ou rien, s'il n'a rien touché. */
	readonly onConfirmer?: (ajustement: AjustementDeGeste | null) => void;
	readonly onEcarter?: () => void;
	readonly libelleConfirmer?: string;
	readonly enCours?: boolean;
	/**
	 * CE QUI MÈNE À CE QUE LE GESTE A PRODUIT, une fois fait : « Copier le lien »,
	 * « Voir le décompte ». Une carte qui dit « c'est dans le dossier » sans y mener
	 * fait chercher ce qu'elle vient de montrer (08/10/2026).
	 */
	readonly acces?: ReactNode;
	/** Ce que le geste écrira, montré tant qu'il est proposé (`ApercuDeGeste`). */
	readonly apercu?: ReactNode;
	/** Ce qui se corrige avant de confirmer. Vide : la carte n'offre pas « Modifier ». */
	readonly champs?: readonly ChampDeGeste[];
}) {
	const [modification, setModification] = useState<AjustementDeGeste | null>(null);
	const proposee = etat === 'PROPOSEE' && onConfirmer !== undefined;
	return (
		<div
			className={cn(
				'verre-carte flex flex-col gap-2.5 rounded-cladd-xl p-3',
				etat !== 'PROPOSEE' && 'opacity-90'
			)}
		>
			<div className="flex items-start gap-3">
				<span className="verre flex size-9 shrink-0 items-center justify-center rounded-full text-cladd-fg [&>svg]:size-[18px]">
					{etat === 'FAITE' ? <CheckIcon strokeWidth={2.5} /> : icone}
				</span>
				<div className="flex min-w-0 flex-1 flex-col">
					{contexte === undefined ? null : (
						<p className="truncate text-cladd-3xs font-medium text-cladd-fg-soft">{contexte}</p>
					)}
					<p className="text-cladd-xs leading-snug font-semibold">{titre}</p>
					{detail === undefined ? null : (
						<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">{detail}</p>
					)}
					{etat === 'FAITE' ? (
						<p className="mt-0.5 text-cladd-2xs leading-snug text-cladd-fg-soft">
							{resultat ?? 'Fait.'}
						</p>
					) : etat === 'ECARTEE' ? (
						<p className="mt-0.5 text-cladd-2xs leading-snug text-cladd-fg-softer">
							Laissé de côté.
						</p>
					) : null}
				</div>
				{proposee && champs.length > 0 && modification === null ? (
					<button
						type="button"
						onClick={() =>
							setModification(Object.fromEntries(champs.map((c) => [c.cle, c.valeur])))
						}
						className="-mt-1 -mr-1 min-h-9 shrink-0 rounded-full px-2.5 text-cladd-2xs font-medium text-cladd-primary transition active:scale-[0.97]"
					>
						Modifier
					</button>
				) : null}
			</div>
			{proposee && modification !== null ? (
				<div className="flex flex-col gap-2">
					{champs.map((champ) => {
						const valeur = modification[champ.cle] ?? champ.valeur;
						// Un libellé relié à son champ ; le menu du kit porte déjà son titre.
						const Enveloppe = champ.genre === 'choix' ? 'div' : 'label';
						return (
							<Enveloppe key={champ.cle} className="flex flex-col gap-1">
								<span className="text-cladd-3xs font-medium text-cladd-fg-soft">
									{champ.libelle}
								</span>
								{champ.genre === 'choix' ? (
									<Select
										className="w-full"
										surface="cut"
										size="md"
										title={champ.libelle}
										options={[...(champ.choix ?? [])]}
										value={valeur}
										getOptionValue={(option) => option.valeur}
										onChange={(choisi) =>
											setModification({ ...modification, [champ.cle]: choisi as string })
										}
										renderOption={({ value }) => value.libelle}
										keyboardHints={false}
									>
										{champ.choix?.find((option) => option.valeur === valeur)?.libelle ?? valeur}
									</Select>
								) : (
									<Input
										size="md"
										type={champ.genre === 'date' ? 'date' : 'text'}
										{...(champ.genre === 'montant' ? { inputMode: 'decimal' as const } : {})}
										value={valeur}
										onChange={(saisie) => setModification({ ...modification, [champ.cle]: saisie })}
									/>
								)}
							</Enveloppe>
						);
					})}
				</div>
			) : null}
			{proposee && apercu !== undefined ? apercu : null}
			{etat === 'FAITE' && acces !== undefined ? (
				<div className="flex flex-wrap items-center gap-2 pl-12">{acces}</div>
			) : null}
			{proposee ? (
				<div className="flex items-center gap-2">
					<Button
						size="md"
						rounded
						variant="transparent"
						outline={false}
						hoverable={false}
						className={cn(
							'flex-1 font-semibold',
							principal ? 'pilule-principale' : 'pilule-secondaire'
						)}
						loading={enCours}
						onClick={() => onConfirmer(modification)}
					>
						{libelleConfirmer}
					</Button>
					{modification !== null ? (
						<Button
							size="md"
							rounded
							variant="transparent"
							outline={false}
							hoverable={false}
							className="px-3 font-medium text-cladd-fg-soft"
							onClick={() => setModification(null)}
						>
							Annuler
						</Button>
					) : onEcarter === undefined ? null : (
						<Button
							size="md"
							rounded
							variant="transparent"
							outline={false}
							hoverable={false}
							className="px-3 font-medium text-cladd-fg-soft"
							onClick={onEcarter}
						>
							Non merci
						</Button>
					)}
				</div>
			) : null}
		</div>
	);
}

/**
 * LA PAGE D'UNE CONVERSATION — l'en-tête en haut, le fil au milieu, le
 * compositeur posé en bas par-dessus.
 *
 * ⚠️ PAS DE BARRE D'ONGLETS ICI, comme chez Claude et Alan : le compositeur prend
 * sa place (`app/barre.tsx` la retire sur ces routes). Le fil réserve en bas la
 * hauteur du compositeur et de ses suggestions, pour que la dernière réponse ne
 * passe jamais dessous.
 */
export function PageConversation({
	entete,
	children,
	composeur,
	onDeposer
}: {
	readonly entete: ReactNode;
	readonly children: ReactNode;
	readonly composeur: ReactNode;
	/**
	 * DES FICHIERS GLISSÉS SUR LA CONVERSATION, À LA SOURIS (12/10/2026) : ils se
	 * joignent à la question comme par le bouton « + ». Absent : rien ne se dépose.
	 */
	readonly onDeposer?: (fichiers: File[]) => void;
}) {
	// Le survol compte les entrées et sorties : un glisser traverse les enfants.
	const [survol, setSurvol] = useState(0);
	const portentDesFichiers = (evenement: DragEvent) =>
		Array.from(evenement.dataTransfer.types).includes('Files');
	const glisser =
		onDeposer === undefined
			? {}
			: {
					onDragEnter: (evenement: DragEvent<HTMLDivElement>) => {
						if (!portentDesFichiers(evenement)) return;
						evenement.preventDefault();
						setSurvol((n) => n + 1);
					},
					onDragOver: (evenement: DragEvent<HTMLDivElement>) => {
						if (portentDesFichiers(evenement)) evenement.preventDefault();
					},
					onDragLeave: (evenement: DragEvent<HTMLDivElement>) => {
						if (portentDesFichiers(evenement)) setSurvol((n) => Math.max(0, n - 1));
					},
					onDrop: (evenement: DragEvent<HTMLDivElement>) => {
						if (!portentDesFichiers(evenement)) return;
						evenement.preventDefault();
						setSurvol(0);
						const fichiers = Array.from(evenement.dataTransfer.files);
						if (fichiers.length > 0) onDeposer(fichiers);
					}
				};
	return (
		<div className="relative flex h-full flex-col" {...glisser}>
			<div className="defilement-sans-barre min-h-0 flex-1 overflow-y-auto px-cladd-2xs pb-52">
				{entete}
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pt-cladd-3xs">{children}</div>
			</div>
			{composeur}
			{survol > 0 ? (
				<div
					aria-hidden
					className="pointer-events-none fixed inset-3 z-50 flex flex-col items-center justify-center gap-3 rounded-[2rem] border-2 border-dashed border-cladd-fg-soft bg-cladd-bg/90 text-center"
				>
					<Plume humeur="ecoute" taille={72} />
					<p className="text-cladd-sm font-semibold">Déposez vos documents</p>
					<p className="max-w-xs text-cladd-2xs text-cladd-fg-soft">
						Je les mets au coffre, je les lis, puis je vous dis ce qu’ils apportent.
					</p>
				</div>
			) : null}
		</div>
	);
}

/**
 * OÙ EN EST LE DOSSIER — ce que Plume joint à sa réponse, composé par le logiciel
 * depuis la base (pas par le modèle) : quand on lui demande où en est le dossier, ou
 * quand une de ses phrases n'a pas pu être rendue. La question a toujours une réponse.
 */
export interface LigneDEtatAffichee {
	readonly texte: string;
	/** Ce qui mène à ce que la ligne dit : la rubrique, la fiche, le décompte. */
	readonly onOuvrir?: () => void;
}

export function CarteEtatDuDossier({ lignes }: { readonly lignes: readonly LigneDEtatAffichee[] }) {
	if (lignes.length === 0) return null;
	return (
		<div className="verre-carte flex flex-col rounded-cladd-xl py-1.5">
			<p className="px-3.5 pt-2 pb-1 text-cladd-2xs font-semibold text-cladd-fg-soft">
				Où en est le dossier
			</p>
			<ul className="flex flex-col">
				{lignes.map((ligne) => (
					<li key={ligne.texte}>
						{/*
						  ⚠️ UNE LIGNE QUI MÈNE QUELQUE PART SE TOUCHE, ET LE DIT PAR SON CHEVRON
						  (08/10/2026, le fondateur : « qu'on puisse accéder directement aux
						  éléments »). Celle qui ne mène nulle part se lit.
						*/}
						{ligne.onOuvrir === undefined ? (
							<div className="flex min-h-11 items-start gap-2 px-3.5 py-2 text-cladd-xs leading-snug">
								<span
									aria-hidden
									className="mt-2 size-1.5 shrink-0 rounded-full bg-cladd-fg-soft"
								/>
								<span className="min-w-0">{ligne.texte}</span>
							</div>
						) : (
							<button
								type="button"
								onClick={ligne.onOuvrir}
								className="flex min-h-11 w-full items-center gap-2 px-3.5 py-2 text-left text-cladd-xs leading-snug transition active:scale-[0.99] active:bg-cladd-fg/5"
							>
								<span aria-hidden className="size-1.5 shrink-0 rounded-full bg-cladd-fg-soft" />
								<span className="min-w-0 flex-1">{ligne.texte}</span>
								<ChevronRightIcon className="size-4 shrink-0 text-cladd-fg-softer" aria-hidden />
							</button>
						)}
					</li>
				))}
			</ul>
		</div>
	);
}
