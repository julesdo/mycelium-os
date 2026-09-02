import { fraction, type Fraction } from '../../../../socle/montants';
import type { PeriodeDeTaux } from '../../decompte';

/**
 * Les taux d'intérêt de retard français, relevés sur sources publiques.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * LE TAUX PAR DÉFAUT N'EST PAS UNE CONSTANTE, C'EST UNE SÉRIE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le brief demandait « le taux d'intérêt de retard applicable par défaut »,
 * au singulier. Il n'y en a pas. L'article L441-10 II du code de commerce
 * dispose qu'à défaut de stipulation contractuelle, le taux est celui
 * « appliqué par la Banque centrale européenne à son opération de
 * refinancement la plus récente majoré de 10 points de pourcentage » — et ce
 * taux est réancré **deux fois par an**, sur celui en vigueur au 1er janvier
 * pour le premier semestre, au 1er juillet pour le second.
 *
 * Une facture impayée depuis dix-huit mois traverse donc trois taux. C'est
 * précisément le cas que `decompte.ts` sait traiter en segmentant la période :
 * `periodesDeTauxParDefaut()` produit la série qu'il attend.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DEUX TAUX LÉGAUX, ET C'EST LE SECOND QUI NOUS CONCERNE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le taux d'intérêt légal est publié par arrêté semestriel en **deux
 * catégories** : les créances des personnes physiques n'agissant pas pour des
 * besoins professionnels, et tous les autres cas. Le recouvrement B2B relève
 * de la seconde, systématiquement plus basse. Se tromper de colonne
 * multiplierait le plancher par deux à trois.
 *
 * Le taux légal ne sert PAS à calculer les intérêts en B2B : il sert à borner
 * le taux contractuel, qui « ne peut être inférieur à trois fois le taux
 * d'intérêt légal » (L441-10 II).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CE QUI N'EST PAS DANS LA SÉRIE N'EST PAS DEVINÉ
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Un semestre absent fait LEVER, en le nommant. Extrapoler le dernier taux
 * connu produirait un décompte faux qui a l'air juste — le mode de défaillance
 * que tout ce module existe pour empêcher. Quand un nouvel arrêté paraît, on
 * ajoute une ligne ici, et rien d'autre ne bouge.
 *
 * Sources :
 *   · L441-10 code de commerce — legifrance.gouv.fr/codes/article_lc/LEGIARTI000038414392
 *   · D441-5 code de commerce (indemnité de 40 €, décret n° 2012-1115 du 2 octobre 2012)
 *   · Taux d'intérêt légal : arrêtés semestriels, JO ; série relevée le 2026-09-03
 *   · Taux BCE de refinancement : série relevée le 2026-09-03
 *
 * Relevé PAR LE LOGICIEL, pas par un avocat. Voir `parametres.ts` : ces valeurs
 * sont `verifie: true` (sourcées) et `valideParAvocat: false` (pas de contrôle
 * juridique), et la production d'un acte exige le second.
 */

/** Un identifiant de semestre, `AAAA-S1` ou `AAAA-S2`. */
export type Semestre = string;

/** Les dix points de majoration de l'article L441-10 II, en centièmes de point. */
const MAJORATION_L441_10 = 1000n;

/** Le multiplicateur du plancher contractuel : « trois fois le taux légal ». */
const MULTIPLICATEUR_PLANCHER = 3n;

/**
 * Le taux de refinancement BCE en vigueur au premier jour de chaque semestre,
 * en centièmes de point (215 = 2,15 %).
 *
 * C'est bien le taux AU 1er JANVIER / 1er JUILLET qui vaut pour tout le
 * semestre, et non le taux du jour : une baisse en cours de semestre ne change
 * rien au taux applicable avant l'ancrage suivant.
 */
export const TAUX_BCE_PAR_SEMESTRE: Record<Semestre, bigint> = {
	'2021-S1': 0n,
	'2021-S2': 0n,
	'2022-S1': 0n,
	'2022-S2': 0n,
	'2023-S1': 250n,
	'2023-S2': 400n,
	'2024-S1': 450n,
	'2024-S2': 425n,
	'2025-S1': 315n,
	'2025-S2': 215n,
	'2026-S1': 215n,
	'2026-S2': 240n
};

/** Les deux taux d'intérêt légal, en centièmes de point. */
export const TAUX_INTERET_LEGAL: Record<
	Semestre,
	{ particuliers: bigint; professionnels: bigint }
> = {
	'2021-S1': { particuliers: 314n, professionnels: 79n },
	'2021-S2': { particuliers: 312n, professionnels: 76n },
	'2022-S1': { particuliers: 313n, professionnels: 76n },
	'2022-S2': { particuliers: 315n, professionnels: 77n },
	'2023-S1': { particuliers: 447n, professionnels: 206n },
	'2023-S2': { particuliers: 682n, professionnels: 422n },
	'2024-S1': { particuliers: 801n, professionnels: 507n },
	'2024-S2': { particuliers: 816n, professionnels: 492n },
	'2025-S1': { particuliers: 721n, professionnels: 371n },
	'2025-S2': { particuliers: 665n, professionnels: 276n },
	'2026-S1': { particuliers: 667n, professionnels: 262n },
	'2026-S2': { particuliers: 684n, professionnels: 275n }
};

/**
 * Les planchers contractuels tels qu'ILS SONT PUBLIÉS, relevés séparément.
 *
 * CE N'EST PAS UNE REDONDANCE, C'EST UN CONTRÔLE. Ces valeurs sont publiées
 * indépendamment des taux légaux, et un test vérifie qu'elles valent bien le
 * triple. Une faute de frappe sur un taux légal — un chiffre inversé, une
 * virgule déplacée — passerait inaperçue autrement, et fausserait le plancher
 * sans que rien ne le signale.
 *
 * Seuls les semestres dont le plancher a été trouvé publié figurent ici.
 */
export const PLANCHERS_PUBLIES: Record<Semestre, bigint> = {
	'2025-S1': 1113n, // 11,13 %
	'2025-S2': 828n, //  8,28 %
	'2026-S1': 786n, //  7,86 %
	'2026-S2': 825n //  8,25 %
};

const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function semestreDe(date: string): Semestre {
	const trouve = DATE_ISO.exec(date);
	if (trouve === null) {
		throw new Error(`Date attendue au format AAAA-MM-JJ, reçue : ${JSON.stringify(date)}`);
	}
	const mois = Number(trouve[2]);
	return `${trouve[1]}-S${mois <= 6 ? 1 : 2}`;
}

function exigerSemestre<T>(serie: Record<Semestre, T>, semestre: Semestre, quoi: string): T {
	const valeur = serie[semestre];
	if (valeur === undefined) {
		const connus = Object.keys(serie).sort();
		throw new Error(
			`${quoi} inconnu pour le semestre ${semestre}. Aucune extrapolation n'est faite : ` +
				`un taux deviné produirait un décompte faux qui a l'air juste. ` +
				`Semestres couverts : ${connus[0]} à ${connus[connus.length - 1]}. ` +
				`Ajouter la valeur publiée dans pays/france/taux.ts.`
		);
	}
	return valeur;
}

/**
 * Le taux applicable à défaut de stipulation contractuelle : BCE + 10 points.
 * Article L441-10 II du code de commerce.
 */
export function tauxPenaliteParDefaut(date: string): Fraction {
	const semestre = semestreDe(date);
	const bce = exigerSemestre(TAUX_BCE_PAR_SEMESTRE, semestre, 'Taux BCE de refinancement');
	return fraction(bce + MAJORATION_L441_10, 10000n);
}

/**
 * Le plancher que ne peut pas franchir un taux contractuel : trois fois le taux
 * d'intérêt légal de la catégorie « autres cas ».
 *
 * Ce module CONSTATE le plancher, il ne corrige aucun taux. Relever d'office un
 * taux contractuel jugé trop bas serait écrire une conséquence juridique que
 * personne n'a validée.
 */
export function plancherContractuel(date: string): Fraction {
	const semestre = semestreDe(date);
	const legal = exigerSemestre(TAUX_INTERET_LEGAL, semestre, "Taux d'intérêt légal");
	return fraction(legal.professionnels * MULTIPLICATEUR_PLANCHER, 10000n);
}

/** Le taux d'intérêt légal brut, pour les deux catégories. */
export function tauxInteretLegal(date: string): { particuliers: Fraction; professionnels: Fraction } {
	const legal = exigerSemestre(TAUX_INTERET_LEGAL, semestreDe(date), "Taux d'intérêt légal");
	return {
		particuliers: fraction(legal.particuliers, 10000n),
		professionnels: fraction(legal.professionnels, 10000n)
	};
}

function debutDeSemestreSuivant(date: string): string {
	const semestre = semestreDe(date);
	const [annee, moitie] = semestre.split('-S');
	return moitie === '1' ? `${annee}-07-01` : `${Number(annee) + 1}-01-01`;
}

/**
 * La série de périodes de taux couvrant `[debut, fin)`, prête pour
 * `decompterFacture`.
 *
 * Une période par semestre traversé : c'est ce découpage qui fait qu'une
 * facture impayée depuis dix-huit mois porte bien trois taux successifs, et
 * non le dernier appliqué rétroactivement à tout.
 */
export function periodesDeTauxParDefaut(debut: string, fin: string): PeriodeDeTaux[] {
	const periodes: PeriodeDeTaux[] = [];
	let curseur = debut;

	// Borne dure : douze semestres au-delà de la série connue, on aurait déjà
	// levé. Elle protège d'une boucle infinie si une date malformée passait les
	// gardes en amont.
	for (let garde = 0; garde < 200 && curseur < fin; garde++) {
		periodes.push({ debut: curseur, taux: tauxPenaliteParDefaut(curseur) });
		curseur = debutDeSemestreSuivant(curseur);
	}

	return periodes;
}
