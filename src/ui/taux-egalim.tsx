import { cn } from './cn';
import { euros, pourcent } from './format';

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
 * lecture que l'accent de marque est un bleu et jamais un vert.
 */

type Etat = 'atteint' | 'proche' | 'manque';

function etatDe(mesure: number, seuil: number): Etat {
	if (mesure >= seuil) return 'atteint';
	return seuil - mesure <= 0.05 ? 'proche' : 'manque';
}

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
		<div className="flex flex-col gap-cladd-3xs">
			<div className="flex items-baseline justify-between gap-cladd-3xs">
				<span className="text-cladd-2xs font-medium text-cladd-fg-soft">{titre}</span>
				<span className="text-cladd-2xs text-cladd-fg-softer tabular-nums">
					seuil {pourcent(seuil)}
				</span>
			</div>

			<div className="flex items-baseline gap-cladd-3xs">
				<span className={cn('text-cladd-taux leading-none font-bold tabular-nums tracking-tight', TEXTE[etat])}>
					{pourcent(mesure)}
				</span>
			</div>

			<div className="relative h-2 w-full overflow-hidden rounded-full bg-cladd-surface-cut">
				<div
					className={cn('h-full rounded-full', REMPLISSAGE[etat])}
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
		</div>
	);
}
