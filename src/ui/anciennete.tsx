import { Surface } from '@cladd-ui/react';
import { ecartJours, estDateReelle } from '../lib/verticales/recouvrement/calendrier';
import { cn } from './cn';
import { eurosCentimes } from './format';

/**
 * L'ANCIENNETÉ DE CE QU'ON VOUS DOIT — une barre et trois colonnes, sous le
 * montant héros de l'écran du matin.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE PRODUIT N'AVAIT AUCUNE VISUALISATION (relevé du 07/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Toutes les références posent une forme sous leur solde : la courbe de
 * Mercury, de Monzo, de Monarch ; et chez Afterpay, sous « Total you owe »,
 * trois colonnes « dû dans 15 j / 30 j / 60 j ». Notre accueil n'avait qu'un
 * nombre. C'est la forme d'Afterpay qui sert ici, à l'envers : ce qui est dû
 * DEPUIS combien de temps. Moins de 30 jours, c'est un oubli ; plus de 90, un
 * client qui ne paiera pas seul — et c'est ce que le gérant cherche en ouvrant
 * l'application, sans avoir à additionner les cartes de la file.
 *
 * ⚠️ CE SONT DES DATES, PAS UN VERDICT. Chaque tranche range une facture par le
 * jour d'où court son retard — le même que le calcul (`exigibleDepuis`) —, et
 * rien d'autre. Aucune n'est dite « irrécouvrable ».
 *
 * ⚠️ DES NUANCES D'ENCRE, JAMAIS LE VERT, L'AMBRE OU LE ROUGE : ces trois
 * teintes ne disent qu'une chose dans ce produit (au-dessus du seuil, tout près,
 * en dessous). L'ancienneté se lit à l'intensité, et à l'ordre.
 *
 * ⚠️ LA SOMME DES TROIS COLONNES EST LE MONTANT HÉROS. Une facture sans jour de
 * départ n'est rangée nulle part au hasard : elle est NOMMÉE dessous, avec son
 * montant, sinon les colonnes ne feraient plus le total et personne ne saurait
 * pourquoi.
 */

export interface LigneDAnciennete {
	/** Ce que la facture porte au total : son principal et ce qui s'y ajoute. */
	readonly montant: bigint;
	/** Le jour d'où court le retard, AAAA-MM-JJ. Absent : la facture est nommée à part. */
	readonly exigibleDepuis?: string;
}

const TRANCHES = [
	{ cle: 'recent', libelle: 'moins de 30 j', teinte: 'bg-cladd-fg/25' },
	{ cle: 'moyen', libelle: '30 à 90 j', teinte: 'bg-cladd-fg/55' },
	{ cle: 'ancien', libelle: 'plus de 90 j', teinte: 'bg-cladd-fg/90' }
] as const;

type CleTranche = (typeof TRANCHES)[number]['cle'];

function trancheDe(jours: number): CleTranche {
	if (jours < 30) return 'recent';
	if (jours <= 90) return 'moyen';
	return 'ancien';
}

/** Le partage, exporté pour être vérifiable sans rendu. */
export function repartirParAnciennete(
	lignes: readonly LigneDAnciennete[],
	aujourdHui: string
): { readonly parTranche: Readonly<Record<CleTranche, bigint>>; readonly sansDate: bigint } {
	const parTranche: Record<CleTranche, bigint> = { recent: 0n, moyen: 0n, ancien: 0n };
	let sansDate = 0n;
	for (const ligne of lignes) {
		const depuis = ligne.exigibleDepuis;
		if (depuis === undefined || !estDateReelle(depuis) || !estDateReelle(aujourdHui)) {
			sansDate += ligne.montant;
			continue;
		}
		parTranche[trancheDe(Math.max(0, ecartJours(depuis, aujourdHui)))] += ligne.montant;
	}
	return { parTranche, sansDate };
}

export function BandeDAnciennete({
	lignes,
	aujourdHui
}: {
	readonly lignes: readonly LigneDAnciennete[];
	readonly aujourdHui: string;
}) {
	const { parTranche, sansDate } = repartirParAnciennete(lignes, aujourdHui);
	const range = parTranche.recent + parTranche.moyen + parTranche.ancien;
	// Rien à ranger : pas de barre vide (règle d'écran n° 4).
	if (range === 0n) return null;

	return (
		/*
		  UNE CARTE DE VERRE, comme celles de la file dessous. Posée nue sur le fond,
		  la bande s'alignait à gauche sous un montant centré et flottait entre deux
		  objets qui n'avaient pas sa forme.
		*/
		<Surface
			as="section"
			aria-label="Depuis combien de temps"
			variant="transparent"
			outline={false}
			className="verre-carte rounded-cladd-xl"
			contentClassName="flex flex-col gap-2.5 p-3.5"
		>
			{/*
			  LA BARRE : trois segments à la largeur de leur part, séparés de deux
			  pixels. Un segment vide disparaît au lieu de laisser un trait.
			*/}
			<div aria-hidden className="flex h-1.5 w-full gap-0.5 overflow-hidden rounded-full">
				{TRANCHES.map(({ cle, teinte }) =>
					parTranche[cle] === 0n ? null : (
						<span
							key={cle}
							className={cn('h-full rounded-full', teinte)}
							// ⚠️ LA SEULE DIVISION EST ICI, POUR L'ŒIL : une proportion de
							// largeur, jamais un montant. Les montants restent en centimes.
							style={{ flexGrow: Number((parTranche[cle] * 10000n) / range) }}
						/>
					)
				)}
			</div>

			<dl className="grid grid-cols-3 gap-2">
				{TRANCHES.map(({ cle, libelle, teinte }) => (
					// `flex-col-reverse` : le terme (`dt`) précède sa valeur dans le code, comme
					// le veut une liste de définitions, et se lit SOUS le montant à l'écran.
					<div key={cle} className="flex min-w-0 flex-col-reverse gap-0.5">
						<dt className="flex items-center gap-1.5 text-cladd-3xs text-cladd-fg-soft">
							<span aria-hidden className={cn('size-1.5 shrink-0 rounded-full', teinte)} />
							{libelle}
						</dt>
						{/* Une tranche vide s'efface d'un cran : l'œil va aux montants qui
						    comptent, et le zéro reste lisible — c'est aussi une information. */}
						<dd
							className={cn(
								'text-cladd-xs font-semibold tabular-nums',
								parTranche[cle] === 0n && 'text-cladd-fg-softer'
							)}
						>
							{eurosCentimes(parTranche[cle])}
						</dd>
					</div>
				))}
			</dl>

			{sansDate === 0n ? null : (
				<p className="text-cladd-3xs text-cladd-fg-softer">
					Et {eurosCentimes(sansDate)} dont le jour de départ du retard n’est pas connu.
				</p>
			)}
		</Surface>
	);
}
