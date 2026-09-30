import type { ReactNode } from 'react';
import { Button, Surface } from '@cladd-ui/react';
import { CheckIcon } from 'lucide-react';
import { cn } from './cn';

/**
 * LE FIL DU DOSSIER — un rail vertical, et il EST la page.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QU'IL REMPLACE, ET POURQUOI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La page portait une frise HORIZONTALE (« Prêt · On lui écrit · Le tribunal,
 * si besoin · Réglé ») puis, deux cents pixels plus bas, une carte « Maintenant »
 * qui réécrivait le titre de l'étape en cours et l'expliquait en deux phrases.
 * Le même fait, dit deux fois, en quatre-vingt-dix mots.
 *
 * Pire : les sept blocs qui APPARTIENNENT à une étape — les courriers, les
 * relances, les voies, le suivi, les situations — vivaient ailleurs, dans deux
 * accordéons rangés par nature (« ce qu'on peut faire » à gauche, « ce que
 * contient le dossier » à droite). C'est la taxonomie du LOGICIEL, pas celle du
 * moment : le gérant ne se demande pas si ce qu'il cherche est une chose-à-faire
 * ou une chose-à-savoir, il demande où ça en est et quoi faire.
 *
 * Ici le rail porte tout. Chaque bloc pend à l'étape à laquelle il appartient,
 * et l'ordre de lecture est l'ordre du temps — le seul que personne n'a besoin
 * d'apprendre.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ TROIS ÉTATS, TROIS POIDS, ET LA DIFFÉRENCE EST PHYSIQUE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * - FAITE : un disque plein, un titre, UNE ligne de ce qu'elle a produit.
 * - EN_COURS : une carte de verre SURÉLEVÉE, qui contient son explication ET
 *   son geste. C'est le seul endroit de la page où l'on agit.
 * - A_VENIR : une ligne grise, et ce qui s'y passerait.
 *
 * Une étape qui n'est pas la vôtre ne coûte qu'une ligne. C'est la moitié du
 * gain : on lit les quatre étapes en un regard au lieu de les faire défiler.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL. Le vert, l'ambre et le rouge ne disent qu'une
 * chose dans ce produit — au-dessus du seuil, tout près, en dessous. Une étape
 * franchie n'est pas un seuil : elle se marque par un disque plein, comme sur
 * le rail d'une voie.
 */

export type EtatEchelon = 'FAITE' | 'EN_COURS' | 'A_VENIR';

function Disque({ etat }: { etat: EtatEchelon }) {
	if (etat === 'FAITE') {
		return (
			<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-cladd-fg">
				<CheckIcon className="size-3 text-cladd-bg" aria-hidden />
			</span>
		);
	}
	return (
		<span
			className={cn(
				'size-5 shrink-0 rounded-full',
				etat === 'EN_COURS' ? 'border-[5px] border-cladd-fg' : 'border-2 border-cladd-outline'
			)}
		/>
	);
}

/** Le rail. Une liste ordonnée, parce que c'en est une. */
export function FilDuDossier({
	children,
	classe = false
}: {
	readonly children: ReactNode;
	/** Le dossier est classé : le fil s'estompe, sans disparaître. */
	readonly classe?: boolean;
}) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			<ol
				className={cn('flex flex-col', classe && 'opacity-60')}
				aria-label="Les étapes du dossier"
			>
				{children}
			</ol>
			{classe ? (
				<p className="text-cladd-2xs text-cladd-fg-soft">Dossier classé. Il peut être rouvert.</p>
			) : null}
		</div>
	);
}

/**
 * UN ÉCHELON DU RAIL.
 *
 * ⚠️ LE TRAIT EST TIRÉ PAR L'ÉCHELON, PAS PAR LE RAIL. Une barre posée derrière
 * la liste devrait deviner où s'arrêter : elle dépasserait sous le dernier
 * disque, ou s'arrêterait trop tôt sur un échelon qui grandit. Chaque échelon
 * tire le sien jusqu'à son propre bas, et le dernier n'en tire aucun.
 */
export function Echelon({
	etat,
	titre,
	detail,
	dernier = false,
	children
}: {
	readonly etat: EtatEchelon;
	readonly titre: string;
	/** Ce que l'étape a produit, ou ce qui s'y passerait. UNE ligne, jamais deux. */
	readonly detail?: string | null;
	readonly dernier?: boolean;
	/** Le contenu de l'étape. Rendu dans la carte quand l'étape est en cours. */
	readonly children?: ReactNode;
}) {
	const enCours = etat === 'EN_COURS';
	return (
		<li
			className="flex gap-cladd-3xs"
			aria-current={enCours ? 'step' : undefined}
			data-etape={titre}
		>
			<div className="flex shrink-0 flex-col items-center pt-0.5">
				<Disque etat={etat} />
				{dernier ? null : <span className="w-px flex-1 bg-cladd-outline" />}
			</div>

			<div className={cn('min-w-0 flex-1', dernier ? 'pb-0' : 'pb-cladd-2xs')}>
				<p
					className={cn(
						'leading-tight',
						enCours
							? 'text-cladd-sm font-bold'
							: etat === 'FAITE'
								? 'text-cladd-xs font-semibold text-cladd-fg-soft'
								: 'text-cladd-xs text-cladd-fg-softest'
					)}
				>
					{titre}
				</p>
				{detail === null || detail === undefined ? null : (
					<p
						className={cn(
							'text-cladd-2xs leading-snug',
							enCours ? 'text-cladd-fg-soft' : 'text-cladd-fg-softest'
						)}
					>
						{detail}
					</p>
				)}
				{children === undefined ? null : (
					<div className={cn(enCours ? 'mt-cladd-3xs' : 'mt-1')}>{children}</div>
				)}
			</div>
		</li>
	);
}

/**
 * LA CARTE DE L'ÉTAPE EN COURS — le seul endroit de la page où l'on agit.
 *
 * ⚠️ UNE PHRASE, PAS DEUX. `ceQuiSePasse` tenait en deux phrases et
 * `siRienNeBouge` en ajoutait deux autres, avec une date déjà écrite trois fois
 * ailleurs sur l'écran. Ce qui court se lit maintenant dans les pastilles de
 * l'en-tête, où il tient en trois mots.
 *
 * ⚠️ ET LE GESTE PRINCIPAL NE NOMME JAMAIS UNE VOIE DE DROIT. « Préparer un
 * courrier » est un geste de bureau ; « Engager une injonction de payer » serait
 * une recommandation, et c'est la troisième ligne rouge du projet. Ce qui mène à
 * une voie reste une ligne d'échelon à venir, qui énumère sans classer.
 */
export function CarteEtape({
	ceQuiSePasse,
	siRienNeBouge,
	children
}: {
	readonly ceQuiSePasse: string;
	/**
	 * Le coût de l'attente, en une ligne.
	 *
	 * ⚠️ C'EST LA THÈSE DU PRODUIT, ET ELLE NE SE SUPPRIME PAS. « Une facture
	 * impayée ne fait aucun bruit le jour où elle devient irrécouvrable » : cette
	 * ligne est le bruit. Elle a perdu la date limite — devenue pastille en tête
	 * de page — et gardé ce qu'aucun autre bloc ne dit, c'est-à-dire que les
	 * pénalités courent pendant qu'on ne fait rien.
	 */
	readonly siRienNeBouge: string;
	readonly children: ReactNode;
}) {
	return (
		<Surface
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<p className="text-cladd-xs leading-snug">{ceQuiSePasse}</p>
			<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
				Si rien ne bouge : {siRienNeBouge}
			</p>
			{children}
		</Surface>
	);
}

/**
 * LES GESTES DE L'ÉTAPE : un principal, le reste en liens.
 *
 * ⚠️ LA HIÉRARCHIE EST VISUELLE, PAS PRESCRIPTIVE. Le geste mis en avant est le
 * geste du logiciel — préparer, écrire —, jamais la voie qu'il faudrait suivre.
 * Les autres restent tous atteignables au même appui, et aucun n'est grisé : une
 * commande grisée s'active par accident, une commande absente jamais.
 */
export function GestesDeLEtape({
	principal,
	autres = []
}: {
	readonly principal: ReactNode;
	/**
	 * Les gestes de second rang, en texte.
	 *
	 * ⚠️ ILS SONT DÉCRITS, PAS COMPOSÉS PAR L'APPELANT. Un `ReactNode` laisserait
	 * un écran y glisser un `BoutonPrincipal` de plus, et la hiérarchie que ce
	 * composant existe pour tenir tomberait sans qu'aucun test ne bronche.
	 */
	readonly autres?: readonly { readonly libelle: string; readonly onClick: () => void }[];
}) {
	return (
		<div className="flex flex-col gap-cladd-3xs">
			{principal}
			{autres.length === 0 ? null : (
				<div className="flex flex-wrap items-center gap-x-cladd-2xs gap-y-1">
					{autres.map((geste) => (
						<Button
							key={geste.libelle}
							size="md"
							variant="transparent"
							outline={false}
							hoverable={false}
							className="h-auto min-h-12 px-0 text-cladd-xs font-medium text-cladd-fg-soft underline underline-offset-2"
							onClick={geste.onClick}
						>
							{geste.libelle}
						</Button>
					))}
				</div>
			)}
		</div>
	);
}
