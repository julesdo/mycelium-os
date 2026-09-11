import { Surface } from '@cladd-ui/react';
import { cn } from './cn';
import { eurosCentimes } from './format';

/**
 * DE QUOI LE TOTAL EST FAIT.
 *
 * Une barre segmentée, et sous elle les trois montants nommés. C'est le seul
 * graphique de l'accueil, et il répond à la question qui vient juste après
 * « combien » : « pourquoi autant ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL Y A TROIS PARTS, PAS QUATRE — ET LA QUATRIÈME EST UN PIÈGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La révélation expose `principal`, `interets`, `indemnites`, `supplement` et
 * `total`. Il est tentant d'en faire quatre segments. Ce serait FAUX :
 *
 *     total      = principal + interets + indemnites
 *     supplement = interets + indemnites
 *
 * `supplement` n'est pas une part, c'est un RÉSUMÉ des deux dernières — le
 * chiffre qu'on met en avant commercialement, « ce que vous ne réclamiez pas ».
 * L'ajouter à la barre compterait les intérêts et l'indemnité deux fois, et la
 * somme des segments dépasserait le total affiché juste au-dessus, sur un
 * produit dont l'argument entier est l'exactitude au centime.
 *
 * Ce composant ne reçoit donc QUE les trois parts, et il recalcule leur somme
 * lui-même pour établir les proportions. Il ne peut pas afficher une barre qui
 * contredit sa propre légende : c'est la même somme qui sert aux deux.
 *
 * Que cette somme égale bien le `total` porté par le hero est une propriété du
 * CALCUL, pas de l'écran — elle est tenue par une assertion dans les tests de
 * `verticales/recouvrement/revelation.ts`, là où le total est produit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI TROIS BLEUS ET AUCUNE AUTRE COULEUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le vert, l'ambre et le rouge ne veulent dire qu'une chose dans ce produit :
 * au-dessus du seuil, tout près, en dessous. Un graphique décoratif qui les
 * emprunterait ferait perdre au gérant la lecture instantanée de ses verdicts.
 *
 * La contrainte se résout en jouant sur la CLARTÉ plutôt que sur la teinte :
 * trois bleus nettement séparés se distinguent aussi bien que trois couleurs —
 * y compris pour un daltonien, ce qui n'est pas vrai d'un vert et d'un rouge.
 * Et chaque segment porte de toute façon son nom écrit dessous : la couleur ne
 * dit jamais rien toute seule.
 */

export interface PartsDues {
	readonly principal: bigint;
	readonly interets: bigint;
	readonly indemnites: bigint;
}

const PARTS = [
	{ cle: 'principal', libelle: 'Principal', teinte: 'bg-part-principal' },
	{ cle: 'interets', libelle: 'Intérêts de retard', teinte: 'bg-part-interets' },
	{ cle: 'indemnites', libelle: 'Indemnité forfaitaire', teinte: 'bg-part-indemnites' }
] as const;

export function CompositionDue({ parts, className }: { parts: PartsDues; className?: string }) {
	const total = parts.principal + parts.interets + parts.indemnites;

	// Rien à décomposer : on ne montre pas une barre vide, qui donnerait
	// l'impression d'un graphique en panne plutôt que d'une absence de dette.
	if (total <= 0n) return null;

	const valeurs = [parts.principal, parts.interets, parts.indemnites];

	/**
	 * ⚠️ LES POURCENTAGES SONT CALCULÉS EN ENTIERS DE CENTIMES, jamais en
	 * flottants. C'est la règle de toute la chaîne monétaire du produit, et elle
	 * vaut aussi pour un graphique : convertir en `number` pour faire une règle
	 * de trois réintroduirait ici la seule chose que le reste du code évite
	 * depuis le parseur.
	 *
	 * Le résultat est un pour-dix-mille, ramené en pourcentage à l'affichage —
	 * assez fin pour qu'un segment de 0,3 % reste visible.
	 */
	const parts10000 = valeurs.map((v) => Number((v * 10_000n) / total) / 100);

	return (
		<Surface
			as="section"
			variant="transparent"
			outline={false}
			className={cn('verre-carte rounded-cladd-xl', className)}
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<h2 className="text-cladd-2xs font-medium tracking-wide text-cladd-fg-softer uppercase">
				De quoi ce total est fait
			</h2>

			{/*
			  LA BARRE. Les segments sont séparés par un vrai écart plutôt que par
			  une bordure : sur un fond translucide, une bordure d'un pixel prend la
			  couleur de ce qui passe derrière et disparaît par endroits. Un écart,
			  lui, laisse voir le fond — donc il se lit toujours.

			  `min-w-1` sur chaque segment : une indemnité de deux cent quatre-vingts
			  euros sur un total de quarante-huit mille fait 0,58 % de la barre, soit
			  moins de deux pixels. Sans plancher, le segment existe dans le DOM et
			  ne se voit pas — et la légende dessous annonce alors une couleur
			  introuvable. Mesuré à l'écran, pas supposé.
			*/}
			<div className="flex h-2.5 w-full items-stretch gap-0.5 overflow-hidden rounded-full">
				{PARTS.map(({ cle, teinte, libelle }, rang) => {
					const pourcentage = parts10000[rang] ?? 0;
					if (pourcentage <= 0) return null;
					return (
						<div
							key={cle}
							className={cn('min-w-1 rounded-full', teinte)}
							style={{ width: `${pourcentage}%` }}
							role="presentation"
							title={`${libelle} — ${pourcentage.toFixed(1)} %`}
						/>
					);
				})}
			</div>

			{/*
			  UNE LIGNE PAR PART, ET RIEN DE PLUS.

			  ⚠️ CHAQUE LIGNE PORTAIT UNE SOUS-LÉGENDE EXPLICATIVE — « taux BCE
			  majoré de dix points », « quarante euros par facture ». Trois de plus,
			  en petit gris, sur un écran d'accueil : c'est de la notice, pas un
			  tableau de bord. La référence ne met jamais qu'un point, un mot et un
			  montant sur ce genre de légende.

			  Ces explications ne sont pas perdues : elles vivent sur le détail, où
			  quelqu'un est justement en train de vérifier un calcul. Sur l'accueil,
			  on vient lire des proportions, pas apprendre le droit applicable.
			*/}
			<dl className="flex flex-col gap-1.5">
				{PARTS.map(({ cle, libelle, teinte }, rang) => (
					<div key={cle} className="flex items-center gap-cladd-3xs">
						<span aria-hidden className={cn('size-2.5 shrink-0 rounded-full', teinte)} />
						<dt className="min-w-0 flex-1 truncate text-cladd-xs text-cladd-fg-soft">
							{libelle}
						</dt>
						<dd className="shrink-0 text-cladd-xs font-semibold tabular-nums">
							{eurosCentimes(valeurs[rang] ?? 0n)}
						</dd>
					</div>
				))}
			</dl>
		</Surface>
	);
}
