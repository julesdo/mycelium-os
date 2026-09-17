import { useState, type ReactNode } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import {
	Button,
	Chip,
	CollapsiblePanel,
	CollapsibleRoot,
	CollapsibleTrigger,
	Input,
	Surface
} from '@cladd-ui/react';
import { ChevronRightIcon, FileTextIcon, InfoIcon } from 'lucide-react';
import { cn } from './cn';
import { BoutonPrincipal, BoutonSecondaire } from './bouton';
import { dateCourte, eurosCentimes } from './format';
import { Lien } from './lien';

/**
 * UNE RANGÉE D'« AUJOURD'HUI » — un ÉNONCÉ DE TRAVAIL, pas le résumé d'un
 * enregistrement.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE MÈNE À UNE PAGE, ET PLUS À UN VOLET
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle a posé `?ligne=<id>` et ouvert un troisième panneau à droite, avec sa
 * propre rangée d'onglets. Ce panneau existait parce qu'aucune vraie page
 * n'existait : un client et une créance ont maintenant chacun LA leur —
 * `/app/debiteurs/$id` et `/app/creance/$id`, une page, un seul défilement.
 *
 * Taper une rangée y mène donc, et c'est un VRAI lien : il se garde en signet,
 * s'ouvre dans un autre onglet, et le navigateur en montre la destination avant
 * qu'on appuie. Un `<button>` qui pousse une adresse n'offre aucun des trois.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ UNE SEULE PUCE, ET C'EST LA DATE QUAND IL Y EN A UNE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La rangée portait une puce d'urgence — « Critique », « À traiter », « À
 * suivre » — sur CHAQUE ligne. Les rangées sont désormais groupées PAR urgence,
 * et le groupe porte l'intitulé : répéter « Critique » sur chacune de ses
 * rangées écrit le même mot quinze fois dans une colonne.
 *
 * Ce que le groupe ne dit pas, c'est le QUANTIÈME — le jour où la chose se
 * produit. C'est lui qui passe dans la puce, avec l'accent de l'urgence :
 *
 *   · une date → la date, teintée par l'urgence. « 27 oct. 2026 » en rouge dit
 *     les deux à la fois, et un quantième se vérifie sur un calendrier là où
 *     « dans 41 jours » demande de croire un calcul ;
 *   · pas de date et une urgence CRITIQUE ou HAUTE → le mot d'urgence, parce
 *     qu'un état sans échéance (une créance mûre, une santé dégradée) n'a que
 *     lui pour dire ce qu'il pèse ;
 *   · pas de date et une urgence normale → RIEN. Le groupe « À venir » le dit
 *     déjà, et une puce qui redit son groupe est du décor.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI LA CARTE EST UNE `Surface` ET LE VERBE VIT DEHORS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La rangée ENTIÈRE s'ouvre au doigt, et elle porte ses appuis, VISIBLES, à
 * 48 px. Un bouton dans un lien n'est pas du HTML valide : le lien couvre donc
 * la zone de LECTURE, et les appuis en sont les FRÈRES, sous elle.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AUCUNE COULEUR DE SEUIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le vert, le rouge et l'ambre de `--color-seuil-*` ne disent qu'une chose dans
 * ce produit : au-dessus du seuil, tout près, en dessous. Les puces d'urgence
 * empruntent les accents du kit, qui sont d'autres jetons, et elles ne sont pas
 * décoratives : elles disent qu'un droit va s'éteindre.
 */

export type UrgenceRangee = 'CRITIQUE' | 'HAUTE' | 'NORMALE';

/**
 * ⚠️ CES DEUX TABLES SONT UNE SECONDE COPIE, ET C'EST TEMPORAIRE.
 * `ui/flux-evenements.tsx` porte les mêmes, en privé, et il meurt avec l'accueil
 * (T16). Les exporter depuis un fichier condamné aurait fait dépendre la file de
 * ce qu'on supprime ; les recopier ici les met à l'endroit qui reste.
 */
const LIBELLE_URGENCE: Record<UrgenceRangee, string> = {
	CRITIQUE: 'Critique',
	HAUTE: 'À traiter',
	NORMALE: 'À suivre'
};

const ACCENT_URGENCE: Record<UrgenceRangee, 'red' | 'orange' | 'neutral'> = {
	CRITIQUE: 'red',
	HAUTE: 'orange',
	NORMALE: 'neutral'
};

/**
 * OÙ MÈNE UNE RANGÉE — la page d'un client, ou celle d'une créance.
 *
 * ⚠️ TYPÉE PAR LE ROUTEUR, jamais en `string`. C'est la même barrière que sur la
 * barre du bas : une destination qui n'existe pas échoue à `bun run check` au
 * lieu de mener à une page d'erreur pendant des semaines.
 */
export interface DestinationRangee {
	readonly vers: NonNullable<LinkProps['to']>;
	readonly parametres?: LinkProps['params'];
}

/**
 * CE QUE LE LOGICIEL PROPOSE, SOUS L'OBSTACLE, AVEC SA PROVENANCE.
 *
 * « Proposé : oui, réserve lue sur BL-2024-77, page 1. » Un tap la retient, un
 * tap la refuse — et une proposition non confirmée retombe sur `unknown`, jamais
 * sur `ok`. La provenance n'est pas un ornement : c'est elle qui distingue une
 * proposition d'une case précochée.
 */
export interface PropositionDeRangee {
	/** Ce qui est proposé, écrit comme on le lit : « oui », « 3 factures ». */
	readonly valeur: string;
	/** D'où elle vient, citée : une pièce nommée et sa page, une entrée du référentiel. */
	readonly source: string;
	/** La date du fait qui l'a produite. Une proposition sans date se croit sur parole. */
	readonly date: string;
	/**
	 * LES DEUX APPUIS. Absents, la proposition se LIT sans se décider.
	 *
	 * ⚠️ ILS SONT FACULTATIFS PARCE QU'UNE PROPOSITION DÉJÀ DÉCIDÉE N'EN A PLUS.
	 * Retenue ou écartée, elle reste affichée — c'est la trace de ce qui a été
	 * proposé ce jour-là — mais elle ne se rejoue pas.
	 */
	readonly onRetenir?: () => void;
	/**
	 * ⚠️ L'ÉCART EXIGE SON MOTIF EN TOUTES LETTRES, et la rangée le DEMANDE plutôt
	 * que de l'inventer. Un motif par défaut — « écartée par le gérant » —
	 * s'écrirait dans le journal sur toutes les propositions refusées, et le
	 * journal cesserait de dire pourquoi. C'est aussi ce qui distingue un écart
	 * d'une suppression : rien n'est effacé, on dit pourquoi on ne suit pas.
	 */
	readonly onEcarter?: (motif: string) => void;
}

/**
 * CE QU'UNE RANGÉE DIT D'ELLE-MÊME AU PLI — et B9 se tient ICI, au point d'usage.
 *
 * ⚠️ « LE PLI NE MANGE JAMAIS UNE HYPOTHÈSE, NI UNE PERTE CHIFFRÉE. » Trois
 * faits suffisent à tenir une rangée pleine, et ils sont portés par la rangée
 * elle-même plutôt que décidés par celui qui la range :
 *
 *   · une HYPOTHÈSE RETENUE — une créance dont le secteur est indéterminé, donc
 *     dont on retient le délai de prescription le plus court, est une rangée
 *     pleine qui le dit ;
 *   · une facture NON CHIFFRÉE — elle porte un obstacle nommable en une phrase,
 *     et le total de tête la nomme déjà ;
 *   · une LIGNE ÉCARTÉE d'un dépôt — une seule suffit. Un import qui annonce
 *     198 factures sans mentionner les deux lignes écartées ment par omission,
 *     et l'omission porte sur l'argent qu'on ne réclamera pas.
 *
 * Une invariante tenue à N endroits se perd au premier ajout : elle se tient
 * donc dans `trierSelonLePli`, qui est le SEUL chemin vers le pli.
 */
export interface FaitsDuPli {
	/**
	 * Ce que la rangée dit d'elle-même une fois repliée, DANS LES DEUX NOMBRES.
	 *
	 * ⚠️ DEUX CHAÎNES, ET PAS UN `s` AJOUTÉ. Un accord français porte sur le nom ET
	 * son participe — « 1 dépôt terminé », « 2 dépôts terminés » — et une règle
	 * qui colle un `s` à la fin rend « 1 dépôts terminés ». Sur un produit dont
	 * l'argument entier est l'exactitude, un compte mal accordé se lit comme un
	 * compte mal fait.
	 */
	readonly libelle: { readonly un: string; readonly plusieurs: string };
	/** Vrai quand rien n'est à trancher. Sans ça, la rangée reste pleine, toujours. */
	readonly rienATrancher: boolean;
	/** L'hypothèse retenue pour la calculer. Présente, la rangée reste pleine. */
	readonly hypothese?: string;
	/** Vrai si la rangée porte une facture que le calcul n'a pas su chiffrer. */
	readonly nonChiffree?: boolean;
	/** Combien de lignes un dépôt a écartées. Une seule tient la rangée pleine. */
	readonly lignesEcartees?: number;
}

/** B9, au point d'usage. Le doute tient la rangée pleine. */
function seReplie(faits: FaitsDuPli): boolean {
	if (!faits.rienATrancher) return false;
	if (faits.hypothese !== undefined) return false;
	if (faits.nonChiffree === true) return false;
	return (faits.lignesEcartees ?? 0) === 0;
}

/**
 * Le partage entre ce qui reste à l'écran et ce qui se replie.
 *
 * ⚠️ C'EST LE SEUL CHEMIN VERS LE PLI, et c'est délibéré. Laisser l'écran
 * décider rangée par rangée ferait perdre B9 au premier type de rangée ajouté,
 * sans qu'aucun test ne tombe — le pli est justement l'endroit où l'oubli ne se
 * voit pas.
 */
export function trierSelonLePli<T extends { readonly pli: FaitsDuPli }>(
	rangees: readonly T[]
): { readonly pleines: readonly T[]; readonly repliees: readonly T[] } {
	const pleines: T[] = [];
	const repliees: T[] = [];
	for (const rangee of rangees) {
		if (seReplie(rangee.pli)) repliees.push(rangee);
		else pleines.push(rangee);
	}
	return { pleines, repliees };
}

export function RangeeFile({
	titre,
	obstacle,
	urgence,
	montant,
	dateDuFait,
	hypothese,
	proposition,
	destination,
	children
}: {
	/** Le débiteur, en titre. C'est lui qu'on cherche des yeux en balayant la file. */
	titre: string;
	/** L'obstacle, en UNE phrase au singulier. Jamais deux. */
	obstacle: string;
	urgence: UrgenceRangee;
	/** `null` quand l'enjeu est réellement inconnu — jamais un zéro de confort. */
	montant: bigint | null;
	/** Le jour où ce que la rangée constate se produit. Jamais le jour de la détection. */
	dateDuFait?: string;
	/** L'hypothèse retenue pour calculer cette rangée. Affichée, jamais repliée. */
	hypothese?: string;
	proposition?: PropositionDeRangee;
	/**
	 * La page que cette rangée ouvre. Absente, la rangée ne mène nulle part — et
	 * n'en a pas l'air.
	 *
	 * ⚠️ TOUTE RANGÉE N'A PAS DE PAGE. Une dégradation au registre vise un CLIENT ;
	 * si ce client n'a encore aucune créance constituée, il n'y a pas de dossier à
	 * ouvrir. La rangée s'affiche alors sans lien plutôt que d'ouvrir une page qui
	 * dirait « ce dossier ne s'est pas lu », ce qui serait faux : il n'existe pas.
	 */
	destination?: DestinationRangee;
	/** LE VERBE. Un seul, et son libellé nomme ce qu'il confirme. */
	children?: ReactNode;
}) {
	/*
	  LA PUCE, ET LA RÈGLE QUI DÉCIDE CE QU'ELLE PORTE. Voir l'en-tête : le
	  groupe dit déjà l'urgence, la puce dit le quantième — et quand il n'y a ni
	  quantième ni urgence à signaler, elle ne se rend pas du tout.
	*/
	const puce =
		dateDuFait !== undefined ? (
			<Chip size="md" color={ACCENT_URGENCE[urgence]}>
				{dateCourte(dateDuFait)}
			</Chip>
		) : urgence === 'NORMALE' ? null : (
			<Chip size="md" color={ACCENT_URGENCE[urgence]}>
				{LIBELLE_URGENCE[urgence]}
			</Chip>
		);

	const lecture = (
		<>
			<span className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="flex flex-wrap items-center gap-1.5">
					{puce}
					<span className="text-cladd-xs font-semibold">{titre}</span>
				</span>

				<span className="text-cladd-xs leading-snug text-cladd-fg-soft">{obstacle}</span>

				{proposition === undefined ? null : (
					<span className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						<FileTextIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
						<span>
							Proposé : <span className="font-medium">{proposition.valeur}</span>,{' '}
							{proposition.source}. {dateCourte(proposition.date)}. Rien n’est enregistré tant que
							vous n’avez pas appuyé.
						</span>
					</span>
				)}

				{hypothese === undefined ? null : (
					<span className="flex items-start gap-1.5 text-cladd-2xs leading-relaxed text-cladd-fg-softer">
						<InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
						<span>{hypothese}</span>
					</span>
				)}
			</span>

			<span className="flex shrink-0 items-center gap-cladd-3xs">
				{montant === null ? null : (
					<span className="text-cladd-sm font-bold tabular-nums">{eurosCentimes(montant)}</span>
				)}
				{/* LE CHEVRON DIT QUE ÇA MÈNE QUELQUE PART, et il n'apparaît que
				    lorsque c'est vrai. Une rangée qui a l'air ouvrable et ne fait rien
				    est pire qu'une rangée qui n'en a pas l'air. */}
				{destination === undefined ? null : (
					<ChevronRightIcon className="size-4 text-cladd-fg-softest" aria-hidden />
				)}
			</span>
		</>
	);

	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			{destination === undefined ? (
				<span className="flex items-start gap-cladd-3xs">{lecture}</span>
			) : (
				<Lien
					to={destination.vers}
					// Le `to` générique du routeur est effacé par le type de CE composant,
					// qui le borne déjà à une route existante. Même assertion qu'à
					// `navigation.tsx`, et pour la même raison.
					params={destination.parametres as never}
					className="flex items-start gap-cladd-3xs rounded-cladd-lg text-left transition-colors"
				>
					{lecture}
				</Lien>
			)}

			{/* LES DEUX APPUIS DE LA PROPOSITION, frères de la zone de lecture eux
			    aussi. Ils précèdent le verbe : la proposition est ce qu'on lit en
			    premier sous l'obstacle, donc c'est elle qu'on tranche en premier. */}
			{proposition === undefined ||
			(proposition.onRetenir === undefined && proposition.onEcarter === undefined) ? null : (
				<GestesDeLaProposition proposition={proposition} />
			)}

			{/* LE VERBE, FRÈRE DE LA ZONE DE LECTURE et jamais dedans : un bouton
			    dans un lien n'est pas du HTML valide, et le verbe doit rester
			    visible et atteignable au doigt sans ouvrir la page. */}
			{children === undefined ? null : (
				<div className="flex flex-wrap items-center gap-cladd-3xs">{children}</div>
			)}
		</Surface>
	);
}

/**
 * RETENIR, OU ÉCARTER AVEC SON MOTIF.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ DEUX APPUIS DE MÊME POIDS, ET AUCUN N'EST PRÉSÉLECTIONNÉ
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une pilule pleine sur « Retenir » ferait de l'appui une formalité, sur une
 * valeur que le logiciel a DÉDUITE et que le gérant est le seul à pouvoir
 * confirmer. « Rien n'est enregistré tant que vous n'avez pas appuyé » est écrit
 * juste au-dessus, et ces deux boutons sont ce que cette phrase promet.
 *
 * ⚠️ LE MOTIF S'OUVRE EN PLACE, ET IL EST EXIGÉ. « Écarter » ne déclenche rien
 * tant qu'il est vide : un motif par défaut s'écrirait au journal sur toutes les
 * propositions refusées, et le journal cesserait de dire pourquoi. Ce champ est
 * la seule saisie libre de la file, et c'est le seul endroit où le logiciel ne
 * peut RIEN déduire — la règle d'écran n° 1 ne s'y applique donc pas.
 *
 * ⚠️ ET « ANNULER » REFERME SANS RIEN ÉCRIRE. Un champ qu'on ouvre par erreur et
 * qu'on ne peut plus fermer pousse à écrire n'importe quoi pour en sortir.
 */
function GestesDeLaProposition({ proposition }: { proposition: PropositionDeRangee }) {
	const [motif, setMotif] = useState<string | null>(null);
	const { onRetenir, onEcarter } = proposition;

	if (motif === null) {
		return (
			<div className="flex flex-wrap items-center gap-cladd-3xs">
				{onRetenir === undefined ? null : (
					<BoutonSecondaire onClick={onRetenir}>Retenir</BoutonSecondaire>
				)}
				{onEcarter === undefined ? null : (
					<BoutonSecondaire onClick={() => setMotif('')}>Écarter</BoutonSecondaire>
				)}
			</div>
		);
	}

	return (
		<div className="flex flex-wrap items-center gap-cladd-3xs">
			{/*
			  `size="md"` : la rangée entière est en `md`, et le kit interdit de mêler
			  les tailles dans une même ligne. Le défaut d'`Input` est `lg`.

			  `tightFocusRing` : le champ vit dans une carte qui peut défiler, et
			  l'anneau décalé de Cladd y ajouterait un débordement.
			*/}
			{/*
			  ⚠️ `basis-full` : LE CHAMP PREND SA PROPRE LIGNE, À TOUTES LES LARGEURS.
			  Sur la même ligne que ses deux boutons, il tombait à une centaine de
			  pixels à 375 px et son intitulé s'y coupait — « Pourquoi vo… » — sur la
			  SEULE saisie libre du produit, celle qui part au journal telle quelle.
			  Mesuré au navigateur.
			*/}
			<Input
				size="md"
				tightFocusRing
				className="min-w-0 basis-full"
				placeholder="Pourquoi vous ne la suivez pas"
				infoMessage="Il part au journal, daté, tel quel."
				value={motif}
				onChange={setMotif}
			/>
			<BoutonPrincipal
				disabled={motif.trim() === ''}
				onClick={() => {
					const dit = motif.trim();
					if (dit === '' || onEcarter === undefined) return;
					setMotif(null);
					onEcarter(dit);
				}}
			>
				Écarter
			</BoutonPrincipal>
			<BoutonSecondaire onClick={() => setMotif(null)}>Annuler</BoutonSecondaire>
		</div>
	);
}

/**
 * UN GROUPE DE LA FILE — son intitulé, son compte, et son pli.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE N'EST PAS UN ONGLET, ET C'EST TOUTE LA DIFFÉRENCE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran portait une rangée de huit puces — « Aujourd'hui · 151 »,
 * « Prescription · 1 », « À trancher · 4 »… — qui FILTRAIT la liste : ouvrir
 * l'une fermait les sept autres, et ce qu'on ne regardait pas cessait
 * d'exister. Le terrain l'a nommé : « ces tabs qui s'empilent de partout ».
 *
 * Les groupes, eux, sont tous là, l'un sous l'autre, dans un seul défilement.
 * On les lit d'un coup d'œil — « En retard · 2, Aujourd'hui · 5, À venir · 9 » —
 * et on replie ce qui n'est pas pour maintenant. Rien ne disparaît, rien ne
 * s'exclut, et le compte est toujours sous les yeux.
 *
 * ⚠️ IL N'A NI CARTE NI VERRE. Ses rangées EN SONT ; une carte de plus autour
 * d'elles ferait du verre sur du verre, que la doc du kit refuse et que l'œil
 * lit comme une profondeur qui n'existe pas. L'intitulé est un simple bouton, et
 * c'est l'idiome relevé (Attio, Asana, ClickUp).
 *
 * ⚠️ ET UN GROUPE VIDE NE SE REND PAS. Un intitulé « En retard · 0 » est un
 * cadran à zéro (règle d'écran n° 4) : il n'apprend rien, et il apprend surtout
 * à sauter les intitulés des yeux.
 */
export function GroupeDeFile({
	titre,
	compte,
	ton = 'NEUTRE',
	ouvert,
	onBasculer,
	children
}: {
	titre: string;
	/** Le nombre de rangées. Jamais zéro : un groupe vide ne se rend pas. */
	compte: number;
	/** `ALERTE` sur ce dont la date est passée. Le seul groupe qui porte un accent. */
	ton?: 'ALERTE' | 'NEUTRE';
	ouvert: boolean;
	onBasculer: () => void;
	children: ReactNode;
}) {
	return (
		<CollapsibleRoot open={ouvert} onOpenChange={onBasculer}>
			<CollapsibleTrigger>
				{/*
				  `size="md"` vaut 48 px sur l'échelle décalée du produit : le plancher
				  tactile, sans hauteur écrite à la main. `transparent` et sans contour :
				  c'est un intitulé, pas une commande.
				*/}
				<Button
					className="group w-full"
					variant="transparent"
					outline={false}
					hoverable={false}
					size="md"
					contentClassName="w-full items-center justify-start gap-cladd-3xs px-cladd-3xs"
				>
					<ChevronRightIcon
						className="shrink-0 text-cladd-fg-softest transition-transform duration-150 group-data-[open]:rotate-90"
						aria-hidden
					/>
					<span className="text-cladd-xs font-semibold">{titre}</span>
					<Chip size="md" color={ton === 'ALERTE' ? 'red' : 'neutral'}>
						{compte}
					</Chip>
				</Button>
			</CollapsibleTrigger>

			{/* Le rembourrage vit sur un élément IMBRIQUÉ : le panneau anime sa propre
			    hauteur jusqu'à zéro, et une marge verticale posée sur lui l'empêcherait
			    de se refermer tout à fait. C'est la doc du kit, mot pour mot. */}
			<CollapsiblePanel>
				<div className="flex flex-col gap-cladd-3xs pt-cladd-3xs">{children}</div>
			</CollapsiblePanel>
		</CollapsibleRoot>
	);
}

/**
 * LE PLI — ce qui n'appelle aucune décision, COMPTÉ ET TYPÉ, à sa place.
 *
 * « 142 factures payées dans les délais, rien à faire. » Jamais un dossier
 * caché, jamais un résumé : un compte par type, et le type dit ce que c'est.
 * Un résumé de la première rangée laisserait croire qu'il n'y en a qu'une ;
 * un compte se vérifie d'un coup d'œil et ne peut pas être faux.
 *
 * ⚠️ IL NE REND RIEN QUAND IL EST VIDE. Une ligne « 0 replié » est un cadran à
 * zéro (règle d'écran n° 4).
 */
export function PliDeLaFile({ faits }: { faits: readonly FaitsDuPli[] }) {
	if (faits.length === 0) return null;

	// Groupé sur la forme au pluriel, qui est la clé stable ; la forme au
	// singulier voyage avec elle pour le cas où le compte vaut un.
	const comptes = new Map<string, { readonly un: string; compte: number }>();
	for (const fait of faits) {
		const deja = comptes.get(fait.libelle.plusieurs);
		if (deja === undefined) comptes.set(fait.libelle.plusieurs, { un: fait.libelle.un, compte: 1 });
		else deja.compte += 1;
	}

	return (
		<Surface
			as="section"
			aria-label="Ce qui n’appelle aucune décision"
			variant="transparent"
			outline={false}
			className={cn('verre-carte rounded-cladd-xl')}
			contentClassName="flex flex-col gap-1 p-cladd-2xs"
		>
			{[...comptes].map(([plusieurs, { un, compte }]) => (
				<p key={plusieurs} className="text-cladd-xs text-cladd-fg-soft">
					<span className="font-semibold tabular-nums">{compte}</span>{' '}
					{compte === 1 ? un : plusieurs}, rien à faire
				</p>
			))}
		</Surface>
	);
}
