import { Surface } from '@cladd-ui/react';
import { cn } from './cn';
import { euros, pourcent } from './format';
import { etatDeSeuil, type EtatSeuil } from '../lib/egalim/referentiel';

/**
 * Le taux EGalim, l'élément le plus important du produit.
 *
 * Il répond à une seule question, et il doit y répondre sans être lu :
 * **est-ce que je passe la barre ?**
 *
 * Choix de forme : une barre horizontale avec un repère de seuil, pas un
 * cadran circulaire. Un cercle raconte une progression vers 100 % ; or 100 %
 * n'est ni l'objectif ni le seuil. Ce qui compte est une ligne à franchir, et
 * une ligne se dessine droite.
 *
 * La couleur ne décore rien : elle est l'information. Vert au-dessus du seuil,
 * ambre à moins de cinq points, rouge en dessous. C'est pour préserver cette
 * lecture que l'accent de marque est un bleu, et que rien d'autre dans le
 * produit — pas une barre de progression, pas une coche de fichier lu — ne
 * porte ces trois couleurs.
 *
 * Le chiffre est délibérément énorme. C'est le seul de l'écran qu'un gérant
 * retiendra, celui qu'il répétera à son directeur, et celui qu'il doit pouvoir
 * lire d'un mètre, tablette posée sur un plan de travail.
 */

// La règle qui décide de l'état vit dans le référentiel, avec le barème. Elle
// n'a rien de visuel : elle affirme quelque chose sur la conformité d'un
// établissement, et l'écran, le PDF et l'e-mail doivent en dire autant.
type Etat = EtatSeuil;
const etatDe = etatDeSeuil;

const REMPLISSAGE: Record<Etat, string> = {
	atteint: 'bg-seuil-atteint',
	proche: 'bg-seuil-proche',
	manque: 'bg-seuil-manque'
};

const TEXTE: Record<Etat, string> = {
	atteint: 'text-seuil-atteint',
	proche: 'text-seuil-proche',
	manque: 'text-seuil-manque'
};

const RAIL: Record<Etat, string> = {
	atteint: 'bg-seuil-atteint-fond',
	proche: 'bg-seuil-proche-fond',
	manque: 'bg-seuil-manque-fond'
};

/**
 * Le même taux, en petit, quand il y en a trois à comparer sur une rangée.
 *
 * Il garde la seule chose qui ne se négocie pas : la couleur du chiffre, qui
 * dit si le seuil est franchi. Il perd la barre, le repère et l'écart en
 * euros — dans une liste d'exercices, ce qui compte est la trajectoire, pas le
 * détail d'une année qu'on ouvrira si elle surprend.
 */
export function TauxCompact({
	titre,
	mesure,
	seuil
}: {
	titre: string;
	mesure: number;
	seuil: number;
}) {
	const etat = etatDe(mesure, seuil);
	return (
		<div className="flex min-w-0 flex-col gap-0.5">
			<span className="truncate text-cladd-3xs text-cladd-fg-softer">{titre}</span>
			<span className={cn('text-cladd-md leading-none font-bold tabular-nums', TEXTE[etat])}>
				{pourcent(mesure)}
			</span>
		</div>
	);
}

export function TauxEGalim({
	titre,
	mesure,
	seuil,
	ecartEuros
}: {
	titre: string;
	/** La part mesurée, de 0 à 1. */
	mesure: number;
	/** Le seuil légal, de 0 à 1. */
	seuil: number;
	/** Ce qu'il manque en euros d'achats pour atteindre le seuil. 0 si atteint. */
	ecartEuros: number;
}) {
	const etat = etatDe(mesure, seuil);

	// L'échelle s'arrête au plus grand de 100 % et de la mesure : un taux
	// au-dessus de 100 % est impossible, mais un avoir mal classé peut en
	// produire un, et la barre ne doit pas sortir de son rail.
	const plafond = Math.max(1, mesure);
	const largeur = Math.max(0, Math.min(1, mesure / plafond));
	const repere = seuil / plafond;

	return (
		<Surface
			outline
			className="rounded-cladd-2xl shadow-carte"
			contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
		>
			<div className="flex items-baseline justify-between gap-cladd-3xs">
				<span className="text-cladd-xs font-semibold text-cladd-fg-soft">{titre}</span>
				<span className="shrink-0 text-cladd-2xs text-cladd-fg-softer tabular-nums">
					seuil {pourcent(seuil)}
				</span>
			</div>

			<span
				className={cn(
					'text-letikette-taux leading-none font-bold tracking-tight tabular-nums',
					TEXTE[etat]
				)}
			>
				{pourcent(mesure)}
			</span>

			<div className={cn('relative mt-1 h-3 w-full overflow-hidden rounded-full', RAIL[etat])}>
				<div
					className={cn('h-full rounded-full transition-[width] duration-700 ease-out', REMPLISSAGE[etat])}
					style={{ width: `${largeur * 100}%` }}
				/>
				{/* Le repère du seuil, posé par-dessus le remplissage : c'est la
				    ligne à franchir, elle doit rester visible même quand la barre
				    la dépasse. */}
				<div
					aria-hidden
					className="absolute inset-y-0 w-0.5 bg-cladd-fg"
					style={{ left: `${repere * 100}%` }}
				/>
			</div>

			<p className="text-cladd-2xs leading-snug text-cladd-fg-soft">
				{etat === 'atteint' ? (
					<>Le seuil est franchi.</>
				) : (
					<>
						Il manque <span className="font-semibold tabular-nums">{euros(ecartEuros)}</span>{' '}
						d&rsquo;achats qualifiants.
					</>
				)}
			</p>
		</Surface>
	);
}
