import { useState, type ReactNode } from 'react';
import { Chip, Input, Surface } from '@cladd-ui/react';
import { FileTextIcon, InfoIcon } from 'lucide-react';
import { cn } from './cn';
import { BoutonPrincipal, BoutonSecondaire } from './bouton';
import { dateCourte, eurosCentimes } from './format';

/**
 * UNE RANGÉE DE LA FILE — un ÉNONCÉ DE TRAVAIL, pas le résumé d'un
 * enregistrement.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'ELLE PORTE, ET DANS CET ORDRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le débiteur en titre, l'obstacle en UNE phrase au singulier, le montant à
 * droite, et UN verbe visible de 48 px. Une rangée qui ne sait pas nommer son
 * obstacle en une phrase n'entre pas dans la file : elle devient une section du
 * volet de preuve.
 *
 * ⚠️ ET LE VERBE NE CONFIRME QU'UNE CHOSE, dont son libellé dit laquelle. Un tap
 * qui emporterait la composition d'une créance, une réponse de litige et par
 * ricochet la qualité de commerçant serait un lot sur une qualification
 * juridique — ce que D6 refuse — et la piste d'audit qu'il produit ne
 * distinguerait plus ce que le gérant a confirmé de ce qu'il a subi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI LA CARTE EST UNE `Surface` ET LA ZONE DE LECTURE UN `<button>`
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Deux contraintes se rencontrent ici, et aucune primitive du kit ne les tient
 * ensemble :
 *
 *   · la rangée ENTIÈRE s'ouvre au doigt — c'est elle qui pose `?ligne=<id>` et
 *     porte la preuve dans le volet ;
 *   · et elle porte son verbe, VISIBLE, à 48 px, pas caché derrière l'ouverture.
 *
 * `ListButton` est bien la rangée pressable du kit, mais un bouton dans un
 * bouton n'est pas du HTML valide : le verbe ne peut pas y vivre. `Button`, lui,
 * impose sa hauteur par `size`, et la documentation du kit interdit nommément de
 * la surcharger — une rangée de trois lignes s'y écraserait.
 *
 * On garde donc `Surface` pour la carte, ce qu'elle est, et la zone de lecture
 * est un `<button>` nu, FRÈRE du verbe. `src/ui/` est la seule zone du produit
 * où des classes s'écrivent, et c'est exactement le cas qu'elle existe pour
 * couvrir.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AUCUNE COULEUR DE SEUIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La rangée ouverte se surligne en teinte NEUTRE. Le vert, le rouge et l'ambre
 * (`--color-seuil-*`) ne disent qu'une chose dans ce produit — au-dessus du
 * seuil, tout près, en dessous — et « c'est cette ligne-là que vous regardez »
 * n'en est pas une. Les puces d'urgence empruntent les accents du kit, qui sont
 * d'autres jetons, et elles ne sont pas décoratives : elles disent qu'un droit
 * va s'éteindre.
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
	ouverte = false,
	onOuvrir,
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
	/** La rangée dont la preuve est ouverte dans le volet. Surlignage NEUTRE. */
	ouverte?: boolean;
	/** Ouvrir la preuve. Absent, la rangée ne s'ouvre pas — et n'en a pas l'air. */
	onOuvrir?: () => void;
	/** LE VERBE. Un seul, et son libellé nomme ce qu'il confirme. */
	children?: ReactNode;
}) {
	const lecture = (
		<>
			<span className="flex min-w-0 flex-1 flex-col gap-1">
				<span className="flex flex-wrap items-center gap-1.5">
					<Chip size="md" color={ACCENT_URGENCE[urgence]}>
						{LIBELLE_URGENCE[urgence]}
					</Chip>
					<span className="text-cladd-xs font-semibold">{titre}</span>
					{dateDuFait === undefined ? null : (
						<span className="text-cladd-2xs text-cladd-fg-softer tabular-nums">
							{dateCourte(dateDuFait)}
						</span>
					)}
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

			{montant === null ? null : (
				<span className="shrink-0 text-cladd-sm font-bold tabular-nums">
					{eurosCentimes(montant)}
				</span>
			)}
		</>
	);

	return (
		<Surface
			variant="transparent"
			outline={false}
			// La rangée ouverte se distingue par la DENSITÉ du verre, jamais par une
			// teinte : le vert, le rouge et l'ambre ne disent qu'un seuil ici.
			className={cn('verre-carte rounded-cladd-xl', ouverte && 'verre-dense')}
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			{onOuvrir === undefined ? (
				<span className="flex items-start gap-cladd-3xs">{lecture}</span>
			) : (
				<button
					type="button"
					onClick={onOuvrir}
					aria-pressed={ouverte}
					className="flex items-start gap-cladd-3xs rounded-cladd-lg text-left transition-colors"
				>
					{lecture}
				</button>
			)}

			{/* LES DEUX APPUIS DE LA PROPOSITION, frères de la zone de lecture eux
			    aussi. Ils précèdent le verbe : la proposition est ce qu'on lit en
			    premier sous l'obstacle, donc c'est elle qu'on tranche en premier. */}
			{proposition === undefined ||
			(proposition.onRetenir === undefined && proposition.onEcarter === undefined) ? null : (
				<GestesDeLaProposition proposition={proposition} />
			)}

			{/* LE VERBE, FRÈRE DE LA ZONE DE LECTURE et jamais dedans : un bouton
			    dans un bouton n'est pas du HTML valide, et le verbe doit rester
			    visible et atteignable au doigt sans ouvrir la preuve. */}
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
			className="verre-carte rounded-cladd-xl"
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
