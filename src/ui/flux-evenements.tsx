import { Link, type LinkProps } from '@tanstack/react-router';
import { Chip, Surface, SurfaceCut } from '@cladd-ui/react';
import { AlertTriangleIcon, ChevronRightIcon, InfoIcon } from 'lucide-react';
import { cn } from './cn';
import { eurosCentimes, pluriel } from './format';

/**
 * Le flux de surveillance — l'écran qui donne une raison d'ouvrir le produit.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE MONTANT EST LA COLONNE QUI COMMANDE LA LECTURE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Chaque événement porte un montant, et il est posé en grand, à droite, aligné.
 * Ce n'est pas de la décoration : un gérant arbitre entre 12 000 € et 300 €, pas
 * entre « facture échue » et « échéance proche ». Une file d'alertes sans
 * montants est une liste de tâches, et une liste de tâches se referme.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * SUR LE ROUGE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `CLAUDE.md` réserve `--color-seuil-*` — vert, rouge, ambre — au seul sens
 * « au-dessus du seuil, tout près, en dessous », et interdit qu'un élément
 * décoratif les porte. Les puces d'urgence ci-dessous utilisent les accents
 * CLADD (`color="red"`), qui sont d'autres jetons, et elles ne sont pas
 * décoratives : elles disent qu'un droit va s'éteindre. La réserve tient.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUE LE PRODUIT NE SAIT PAS S'AFFICHE AUSSI
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `hypotheses` et `anglesMorts` ne sont pas relégués en bas de page en petit.
 * Un gérant qui croit sa prescription surveillée ne la surveille pas lui-même,
 * et c'est la seule échéance qui éteint une créance sans que personne n'ait
 * rien fait.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE COMPTEUR NE SOMME QUE LES FACTURES, JAMAIS LEURS AGRÉGATS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * `montantIdentifie` (calculé dans `verticales/recouvrement/surveillance.ts`)
 * ne retient que les événements FACTURE_ECHUE et PRESCRIPTION_PROCHE,
 * dédupliqués par facture — jamais le total d'une créance, le montant en jeu
 * d'un dossier ni l'encours d'un débiteur, qui sont des VUES AGRÉGÉES de la
 * MÊME monnaie que les factures affichées juste en dessous. L'étiquette le dit
 * : « factures », pas « factures et dossiers ». Et c'est un principal TTC —
 * NI intérêts de retard NI indemnité forfaitaire n'y entrent, et la précision
 * en dessous du chiffre le dit aussi, pour la même raison qu'au § courriel de
 * `emails/modeles/briefing.ts` : un chiffre juste sous une étiquette fausse
 * est pire qu'un chiffre absent, sur un produit dont l'argument entier est
 * l'exactitude.
 */

export type UrgenceEvenement = 'CRITIQUE' | 'HAUTE' | 'NORMALE';

export interface EvenementAffiche {
	readonly type: string;
	readonly reference: string;
	readonly montant: bigint | null;
	readonly urgence: UrgenceEvenement;
	readonly explication: string;
	readonly action: string;
}

const LIBELLE_URGENCE: Record<UrgenceEvenement, string> = {
	CRITIQUE: 'Critique',
	HAUTE: 'À traiter',
	NORMALE: 'À suivre'
};

const ACCENT_URGENCE: Record<UrgenceEvenement, 'red' | 'orange' | 'neutral'> = {
	CRITIQUE: 'red',
	HAUTE: 'orange',
	NORMALE: 'neutral'
};

function LigneEvenement({
	evenement,
	compact = false
}: {
	evenement: EvenementAffiche;
	compact?: boolean;
}) {
	return (
		<Surface
			// En verre comme toutes les cartes du produit — voir `carte-liste.tsx`
			// pour la raison : la surface opaque du kit empêche le fond de passer
			// au travers, et c'est ce qui distinguait cet écran de sa référence.
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex items-center gap-cladd-3xs p-cladd-2xs"
		>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex flex-wrap items-center gap-1.5">
					<Chip size="md" color={ACCENT_URGENCE[evenement.urgence]}>
						{LIBELLE_URGENCE[evenement.urgence]}
					</Chip>
					<span className="text-cladd-xs font-semibold">{evenement.reference}</span>
				</div>

				{/*
				  ⚠️ EN MODE COMPACT, L'EXPLICATION EST BORNÉE À DEUX LIGNES ET
				  L'ACTION DISPARAÎT.

				  La version complète empile quatre textes par rangée — puce,
				  référence, explication, action — plus le montant. Multiplié par sept
				  événements sur un téléphone, c'est un mur, et le chiffre du hero
				  qu'on est venu lire se retrouve à trois écrans de défilement.

				  L'action n'est pas perdue : elle est écrite en toutes lettres sur le
				  détail, où l'on va justement pour décider. Sur l'accueil on vient
				  voir CE QUI A BOUGÉ, pas exécuter — c'est la même séparation que
				  pour les hypothèses et les angles morts.
				*/}
				<p className={cn('text-cladd-xs text-cladd-fg-soft', compact && 'line-clamp-2')}>
					{evenement.explication}
				</p>

				{compact ? null : (
					<p className="text-cladd-xs text-cladd-fg-softer">{evenement.action}</p>
				)}
			</div>

			{evenement.montant === null ? null : (
				<p
					className={cn(
						'shrink-0 font-bold tabular-nums',
						// Le montant reste la colonne qui commande la lecture, mais il
						// n'a plus besoin du corps d'affiche sur une rangée compacte :
						// à 32 px il volait la vedette au hero, deux cents pixels plus
						// haut, qui porte le total.
						compact ? 'text-cladd-sm' : 'text-letikette-chiffre'
					)}
				>
					{eurosCentimes(evenement.montant)}
				</p>
			)}
		</Surface>
	);
}

export function FluxEvenements({
	evenements,
	montantIdentifie,
	hypotheses,
	anglesMorts,
	limite,
	versDetail
}: {
	evenements: readonly EvenementAffiche[];
	/**
	 * ⚠️ OPTIONNEL DEPUIS QUE L'ACCUEIL PORTE SON PROPRE TOTAL, et c'est une
	 * correction, pas une commodité.
	 *
	 * L'accueil affiche désormais en hero ce qui est dû — principal, intérêts
	 * de retard et indemnité forfaitaire compris. Ce compteur-ci mesure autre
	 * chose : le principal TTC des seules factures échues ou proches de la
	 * prescription, hors intérêts et hors indemnité. Les deux sont justes.
	 *
	 * Posés sur le même écran, à deux cents pixels l'un de l'autre, ils ne se
	 * lisent pas comme deux mesures : ils se lisent comme une contradiction —
	 * sur un produit dont l'argument entier est l'exactitude au centime. C'est
	 * le défaut exact que la séparation en deux onglets tentait d'éviter, et
	 * qu'elle déplaçait au lieu de le régler.
	 *
	 * Il reste donc affiché là où sa composition est expliquée, sur le détail,
	 * et se tait sur l'accueil.
	 */
	montantIdentifie?: bigint;
	hypotheses: readonly string[];
	anglesMorts: readonly string[];
	/**
	 * LE MODE COMPACT DE L'ACCUEIL — combien d'événements au plus.
	 *
	 * ⚠️ IL EXISTE PARCE QUE CE COMPOSANT ALOURDISSAIT L'ACCUEIL. Il y rendait
	 * la liste entière, PLUS deux blocs de paragraphes explicatifs. Sur un
	 * téléphone, ça faisait un mur de texte sous un écran dont tout l'intérêt
	 * est de donner un chiffre en une seconde.
	 *
	 * Sur le détail, il n'y a pas de limite : c'est là qu'on vient tout lire.
	 */
	limite?: number;
	/** Où mène « Tout voir ». Requis dès que `limite` est posée. */
	versDetail?: LinkProps['to'];
}) {
	const montres = limite === undefined ? evenements : evenements.slice(0, limite);
	const restants = evenements.length - montres.length;
	const compact = limite !== undefined;

	return (
		<div className="flex flex-col gap-cladd-xs">
			{/* Le compteur cumulé : ce que le produit a permis d'identifier. C'est
			    la seule réponse qui décide du renouvellement de l'abonnement.
			    Voir la note de tête de fichier : uniquement des factures
			    distinctes, en principal TTC — jamais un agrégat, jamais un
			    intérêt ni l'indemnité forfaitaire. */}
			{montantIdentifie === undefined ? null : (
				<SurfaceCut contentClassName="flex flex-wrap items-center justify-between gap-cladd-3xs p-cladd-2xs">
					<div className="flex flex-col gap-0.5">
						<span className="text-cladd-sm text-cladd-fg-soft">
							Factures identifiées, principal TTC
						</span>
						<span className="text-cladd-2xs text-cladd-fg-softer">
							Hors intérêts de retard et indemnité forfaitaire
						</span>
					</div>
					<span className="text-letikette-titre font-bold tabular-nums">
						{eurosCentimes(montantIdentifie)}
					</span>
				</SurfaceCut>
			)}

			<div className="flex flex-col gap-cladd-3xs">
				{montres.map((evenement) => (
					<LigneEvenement
						key={`${evenement.type}-${evenement.reference}`}
						evenement={evenement}
						compact={compact}
					/>
				))}

				{/* « Tout voir », et le NOMBRE restant écrit dessus. Un « voir plus »
				    sans chiffre ne dit pas s'il reste deux lignes ou quatre-vingts,
				    donc on ne sait pas si ça vaut le geste. */}
				{restants > 0 && versDetail !== undefined ? (
					<Link
						to={versDetail}
						className="verre verre-actif flex min-h-cladd-md items-center justify-center gap-1.5 rounded-cladd-xl text-cladd-xs font-medium transition-colors"
					>
						Voir {restants} autre{pluriel(restants)}
						<ChevronRightIcon size={16} aria-hidden />
					</Link>
				) : null}
			</div>

			{/*
			  CE QUE LE LOGICIEL A SUPPOSÉ, ET CE QU'IL NE SURVEILLE PAS.

			  ⚠️ CES DEUX BLOCS NE PEUVENT PAS ÊTRE SUPPRIMÉS DE L'ACCUEIL. La
			  règle du produit est explicite : « Ce que le logiciel ne voit pas
			  s'affiche aussi. Un utilisateur qui croit sa prescription surveillée
			  ne la surveille pas lui-même. » Les cacher pour alléger l'écran
			  reviendrait à laisser quelqu'un se croire couvert.

			  Mais deux blocs de paragraphes sur un écran d'accueil, c'est un mur.
			  En mode compact on les REPLIE donc en une seule ligne qui les
			  dénombre et mène à l'endroit où ils sont écrits en toutes lettres.
			  L'information reste due, elle change seulement de forme.
			*/}
			{compact ? (
				<AvertissementReplie
					hypotheses={hypotheses.length}
					anglesMorts={anglesMorts.length}
					versDetail={versDetail}
				/>
			) : (
				<>
					{hypotheses.length > 0 ? (
						<Surface variant="transparent" outline={false} className="verre-carte rounded-cladd-xl" contentClassName="flex gap-cladd-3xs p-cladd-2xs">
							<InfoIcon className="mt-1 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
							<div className="flex min-w-0 flex-col gap-1.5">
								<p className="text-cladd-xs font-semibold">Ce que le logiciel a supposé</p>
								{hypotheses.map((hypothese) => (
									<p key={hypothese} className="text-cladd-xs text-cladd-fg-soft">
										{hypothese}
									</p>
								))}
							</div>
						</Surface>
					) : null}

					{anglesMorts.length > 0 ? (
						<Surface variant="transparent" outline={false} className="verre-carte rounded-cladd-xl" contentClassName="flex gap-cladd-3xs p-cladd-2xs">
							<AlertTriangleIcon className="mt-1 size-4 shrink-0 text-cladd-fg-soft" aria-hidden />
							<div className="flex min-w-0 flex-col gap-1.5">
								<p className="text-cladd-xs font-semibold">Ce que le logiciel ne surveille pas</p>
								{anglesMorts.map((angle) => (
									<p key={angle} className="text-cladd-xs text-cladd-fg-soft">
										{angle}
									</p>
								))}
							</div>
						</Surface>
					) : null}
				</>
			)}
		</div>
	);
}

/**
 * Les hypothèses et les angles morts, repliés en une ligne.
 *
 * Elle DÉNOMBRE au lieu de résumer : « 2 hypothèses, 1 angle mort » se vérifie
 * d'un coup d'œil et ne peut pas être faux, là où un résumé de la première
 * hypothèse laisserait croire qu'il n'y en a qu'une.
 */
function AvertissementReplie({
	hypotheses,
	anglesMorts,
	versDetail
}: {
	hypotheses: number;
	anglesMorts: number;
	versDetail?: LinkProps['to'];
}) {
	if (hypotheses === 0 && anglesMorts === 0) return null;

	const morceaux: string[] = [];
	if (hypotheses > 0) morceaux.push(`${hypotheses} hypothèse${pluriel(hypotheses)}`);
	if (anglesMorts > 0) morceaux.push(`${anglesMorts} angle${pluriel(anglesMorts)} mort${pluriel(anglesMorts)}`);

	const contenu = (
		<>
			<InfoIcon size={16} className="shrink-0 text-cladd-fg-softer" aria-hidden />
			<span className="min-w-0 flex-1 truncate text-cladd-xs text-cladd-fg-soft">
				{morceaux.join(' · ')}
			</span>
			{versDetail !== undefined ? (
				<ChevronRightIcon size={16} className="shrink-0 text-cladd-fg-softer" aria-hidden />
			) : null}
		</>
	);

	const habits =
		'verre-carte flex min-h-cladd-md items-center gap-cladd-3xs rounded-cladd-xl px-cladd-2xs';

	if (versDetail === undefined) return <div className={habits}>{contenu}</div>;
	return (
		<Link to={versDetail} className={cn(habits, 'verre-carte-actif transition-colors')}>
			{contenu}
		</Link>
	);
}
