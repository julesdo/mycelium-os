import { useState } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import { Input, Popup, PopupContent, Surface } from '@cladd-ui/react';
import { FileTextIcon } from 'lucide-react';
import { cn } from './cn';
import { BoutonPrincipal, BoutonSecondaire, BoutonTexte } from './bouton';
import { dateCourte, eurosCentimes } from './format';
import { Lien } from './lien';

/**
 * LA FILE D'« AUJOURD'HUI » — CE QUI RESTE DE SA RANGÉE, ET LA FEUILLE OÙ L'ON
 * TRANCHE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA CARTE DE FILE A DISPARU LE 30/09/2026, ET C'EST UNE MESURE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Chaque rangée de la file était une carte à part : une puce de date teintée,
 * le nom, le montant, une phrase d'obstacle sur trois lignes, une provenance en
 * petits caractères — et, sous elle, ses boutons. « Retenir », « Écarter » ;
 * « Oui », « Non », « Je ne sais pas ». Relevé à 393 px sur l'écran du matin :
 * vingt-neuf cibles, dont treize dans la file, et quatre formes de carte
 * différentes à apprendre. Verdict du fondateur : « on doit cliquer partout, il
 * n'y a rien de clair ».
 *
 * Chez Remote, Wise ou Airwallex — des files de choses à approuver, relevées
 * sur Mobbin le même jour —, une rangée est TOUJOURS la même : un avatar, un
 * nom, une ligne, un montant. Aucun bouton dedans. La décision se prend dans le
 * détail, à un appui.
 *
 * La file rend donc ses rangées avec la rangée partagée du produit
 * (`LigneAnalyse`, `LigneBouton` — les mêmes que l'écran des dossiers), et ce
 * qui attend une réponse s'ouvre dans `FeuilleDeDecision`.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ AUCUNE COULEUR DE SEUIL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le vert, le rouge et l'ambre de `--color-seuil-*` ne disent qu'une chose dans
 * ce produit : au-dessus du seuil, tout près, en dessous. Le groupe « En retard »
 * dit l'urgence ; la rangée n'en porte plus aucune couleur.
 */

export type UrgenceRangee = 'CRITIQUE' | 'HAUTE' | 'NORMALE';

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
 * LA FEUILLE OÙ L'ON TRANCHE — la phrase entière, la proposition et sa
 * provenance, puis les appuis.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE LA RANGÉE COUPE, LA FEUILLE LE REND EN ENTIER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La rangée de la file tient sur deux lignes : le client, et le début de la
 * question. C'est ce qui la rend balayable. La question entière, la proposition
 * du logiciel et sa source — « réserve lue sur BL-2024-77, page 1 » — se lisent
 * ICI, là où l'on décide. Une réponse de litige décide de l'éligibilité d'une
 * créance : elle ne se donne pas sur une phrase amputée.
 *
 * ⚠️ LES MÊMES RÈGLES QU'AVANT, À LA LETTRE. Trois réponses de même poids et
 * aucune présélectionnée ; une proposition affichée REMPLACE les trois réponses
 * (deux chemins d'écriture pour le même fait laissaient la proposition ouverte à
 * vie) ; l'écart exige son motif. Seule la place a changé.
 *
 * ⚠️ ELLE SE REFERME APRÈS L'APPUI. La rangée tranchée quitte la file ; la
 * laisser ouverte sur une décision déjà prise ferait croire qu'elle n'a pas été
 * enregistrée.
 *
 * ⚠️ UNE FEUILLE À TOUTES LES LARGEURS, et c'est une exception assumée à la
 * règle « au-delà de 1024 px, le panneau se déplie ». Cette règle protège la
 * place de lecture dans une page ; ici, on tranche UNE chose, et la file doit
 * rester intacte derrière pour qu'on y revienne à la même rangée.
 */
export function FeuilleDeDecision({
	ouverte,
	onFermer,
	titre,
	enonce,
	montant,
	proposition,
	reponses,
	destination
}: {
	readonly ouverte: boolean;
	readonly onFermer: () => void;
	/** Le client : la preuve, pour le doigt, qu'il a ouvert la bonne rangée. */
	readonly titre: string;
	/** La phrase entière — la question, ou l'obstacle —, celle que la rangée coupe. */
	readonly enonce: string;
	readonly montant: bigint | null;
	readonly proposition?: PropositionDeRangee;
	/** Les trois réponses d'une question de litige, quand aucune proposition ne les remplace. */
	readonly reponses?: {
		readonly onRepondre: (reponse: 'OUI' | 'NON' | 'INCONNU') => void;
		readonly enCours: boolean;
	};
	readonly destination?: DestinationRangee;
}) {
	const decidable =
		proposition !== undefined &&
		(proposition.onRetenir !== undefined || proposition.onEcarter !== undefined);

	/*
	  LES APPUIS REFERMENT LA FEUILLE, et c'est ici qu'on l'ajoute : la proposition
	  reste celle de la route, rien n'est recopié.
	*/
	const propositionQuiReferme: PropositionDeRangee | undefined =
		proposition === undefined
			? undefined
			: {
					...proposition,
					...(proposition.onRetenir === undefined
						? {}
						: {
								onRetenir: () => {
									proposition.onRetenir?.();
									onFermer();
								}
							}),
					...(proposition.onEcarter === undefined
						? {}
						: {
								onEcarter: (motif: string) => {
									proposition.onEcarter?.(motif);
									onFermer();
								}
							})
				};

	return (
		<Popup
			open={ouverte}
			onOpenChange={(o) => {
				if (!o) onFermer();
			}}
			headerLeft={<span className="px-2 pb-1 text-cladd-xs font-semibold">{titre}</span>}
		>
			<PopupContent>
				<div className="flex flex-col gap-cladd-2xs">
					<div className="flex flex-col gap-1">
						{montant === null ? null : (
							<p className="text-cladd-2xs text-cladd-fg-soft tabular-nums">
								{eurosCentimes(montant)}
							</p>
						)}
						<p className="text-cladd-sm leading-snug font-semibold">{enonce}</p>
					</div>

					{proposition === undefined ? null : (
						<Surface
							variant="transparent"
							outline={false}
							className="verre-carte rounded-cladd-xl"
							contentClassName="flex items-start gap-cladd-3xs p-cladd-2xs"
						>
							<FileTextIcon className="mt-0.5 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
							<span className="flex min-w-0 flex-col gap-0.5">
								<span className="text-cladd-xs">
									Proposé : <span className="font-semibold">{proposition.valeur}</span>
								</span>
								<span className="text-cladd-2xs leading-snug text-cladd-fg-soft">
									{proposition.source} · {dateCourte(proposition.date)}
								</span>
								<span className="text-cladd-2xs leading-snug text-cladd-fg-softer">
									Rien n’est enregistré tant que vous n’avez pas appuyé.
								</span>
							</span>
						</Surface>
					)}

					{decidable && propositionQuiReferme !== undefined ? (
						<GestesDeLaProposition proposition={propositionQuiReferme} />
					) : null}

					{/* TROIS RÉPONSES DE MÊME POIDS, et aucune n'est présélectionnée : une
					    pilule pleine sur la réponse attendue ferait de l'appui une
					    formalité, sur une déclaration qui décide de l'éligibilité. */}
					{reponses === undefined || proposition !== undefined ? null : (
						<div className="flex flex-wrap gap-cladd-3xs">
							{(
								[
									['OUI', 'Oui'],
									['NON', 'Non'],
									['INCONNU', 'Je ne sais pas']
								] as const
							).map(([reponse, libelle]) => (
								<BoutonSecondaire
									key={reponse}
									disabled={reponses.enCours}
									onClick={() => {
										reponses.onRepondre(reponse);
										onFermer();
									}}
								>
									{libelle}
								</BoutonSecondaire>
							))}
						</div>
					)}

					{destination === undefined ? null : (
						<BoutonTexte
							as={Lien}
							to={destination.vers}
							// ⚠️ UNE ASSERTION : `as` efface le générique du routeur. La
							// destination reste typée par `DestinationRangee`.
							params={destination.parametres as never}
							className="self-start"
						>
							{destination.vers === '/app/clients/$id' ? 'Voir le client' : 'Ouvrir le dossier'}
						</BoutonTexte>
					)}
				</div>
			</PopupContent>
		</Popup>
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
