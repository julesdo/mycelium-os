import type { KeyboardEvent, ReactNode } from 'react';
import { Button, Spinner, Textarea } from '@cladd-ui/react';
import { ArrowUpIcon, CheckIcon } from 'lucide-react';
import { cn } from './cn';
import type { PhraseAffichee } from './conversation';
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

/** La question du gérant, dans sa bulle, à droite. */
export function BulleDuGerant({ texte }: { readonly texte: string }) {
	return (
		<div className="flex justify-end">
			<p className="verre-dense max-w-[85%] rounded-[1.25rem] rounded-br-md px-3.5 py-2 text-cladd-xs leading-relaxed whitespace-pre-wrap text-cladd-fg">
				{texte}
			</p>
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
			<AvatarPlume humeur="travaille" taille={30} className="mt-0.5" />
			<div className="flex min-w-0 flex-1 flex-col gap-1.5 pt-1">
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
	dessus
}: {
	readonly valeur: string;
	readonly onChange: (valeur: string) => void;
	readonly onEnvoyer: () => void;
	readonly enCours: boolean;
	readonly placeholder: string;
	/** Ce qui se pose juste au-dessus de la carte : les suggestions. */
	readonly dessus?: ReactNode;
}) {
	const vide = valeur.trim() === '';
	function touche(evenement: KeyboardEvent<HTMLDivElement>) {
		if (evenement.key !== 'Enter' || evenement.shiftKey) return;
		evenement.preventDefault();
		if (!vide && !enCours) onEnvoyer();
	}
	return (
		<div className="mb-safe pointer-events-none fixed inset-x-0 bottom-0 z-40 px-cladd-3xs pb-cladd-3xs">
			<div className="pointer-events-auto mx-auto flex w-full max-w-2xl flex-col gap-2">
				{dessus}
				<div className="verre-dense flex items-end gap-2 rounded-[1.6rem] p-1.5 pl-2">
					<Textarea
						size="md"
						value={valeur}
						onChange={(v) => onChange(v)}
						onKeyDown={touche}
						placeholder={placeholder}
						className="min-w-0 flex-1 bg-transparent"
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
						disabled={vide || enCours}
						onClick={onEnvoyer}
						aria-label={`Envoyer à ${NOM_DU_PILOTE}`}
					>
						{enCours ? <Spinner size="sm" /> : <ArrowUpIcon strokeWidth={2.4} />}
					</Button>
				</div>
			</div>
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
export function CarteDeGeste({
	icone,
	titre,
	detail,
	etat,
	resultat,
	principal = false,
	onConfirmer,
	onEcarter,
	libelleConfirmer = 'Confirmer',
	enCours = false
}: {
	readonly icone: ReactNode;
	readonly titre: string;
	readonly detail?: string;
	readonly etat: 'PROPOSEE' | 'FAITE' | 'ECARTEE';
	/** Ce que le geste a produit, une fois fait. */
	readonly resultat?: string;
	/** La plus récente proposition en attente porte le bouton plein ; les autres, non. */
	readonly principal?: boolean;
	readonly onConfirmer?: () => void;
	readonly onEcarter?: () => void;
	readonly libelleConfirmer?: string;
	readonly enCours?: boolean;
}) {
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
				<div className="flex min-w-0 flex-col">
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
			</div>
			{etat === 'PROPOSEE' && onConfirmer !== undefined ? (
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
						onClick={onConfirmer}
					>
						{libelleConfirmer}
					</Button>
					{onEcarter === undefined ? null : (
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
	composeur
}: {
	readonly entete: ReactNode;
	readonly children: ReactNode;
	readonly composeur: ReactNode;
}) {
	return (
		<div className="flex h-full flex-col">
			<div className="defilement-sans-barre min-h-0 flex-1 overflow-y-auto px-cladd-2xs pb-52">
				{entete}
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 pt-cladd-3xs">{children}</div>
			</div>
			{composeur}
		</div>
	);
}
