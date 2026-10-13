import { ORDRE_DES_NIVEAUX, niveauDeLIndice, type Niveau } from './analyse';
import { AGE_AVANT_RELECTURE_MS, BAISSE_SIGNALEE } from './regles';

/**
 * LA SANTÉ DU PORTEFEUILLE — ce que les analyses disent ensemble, pondéré par ce
 * qu'on vous doit (13/10/2026).
 *
 * ⚠️ PONDÉRÉ PAR L'ARGENT DEHORS, et c'est la seule pondération qui réponde à la
 * question du gérant. Dix petits clients sereins et un gros client en procédure
 * ne font pas un portefeuille « plutôt sain » : 80 % de son argent dehors est
 * chez celui qui ne paiera peut-être pas.
 *
 * ⚠️ LES MISSIONS NE SONT PAS UN JEU POUR LE JEU. Chacune agrandit ce que le
 * logiciel voit (un SIREN rend un client analysable et surveillé au registre ;
 * une analyse le lit ; un plafond fait remonter un encours qui le dépasse).
 * Leur anneau mesure la couverture réelle, rien d'autre.
 */

export interface ClientDuPortefeuille {
	readonly id: string;
	readonly nom: string;
	readonly siren: string | null;
	/** Ce qu'il vous doit, en centimes. */
	readonly encours: bigint;
	readonly plafond: bigint | null;
	readonly analyse: {
		readonly indice: number;
		readonly niveau: Niveau;
		readonly analyseLe: number;
		readonly indicePrecedent: number | null;
		readonly niveauPrecedent: Niveau | null;
		/** Le fait le plus lourd, pour la carte. */
		readonly faitPrincipal: string | null;
	} | null;
}

export type CleMission = 'SIREN' | 'ANALYSE' | 'PLAFOND';

export interface Mission {
	readonly cle: CleMission;
	readonly titre: string;
	readonly detail: string;
	readonly faits: number;
	readonly total: number;
	/** Le premier client à qui la mission manque : la carte y mène. */
	readonly prochain: { readonly id: string; readonly nom: string } | null;
}

export type Tranche = Niveau | 'NON_ANALYSE';

export interface PartDuPortefeuille {
	readonly tranche: Tranche;
	readonly encours: bigint;
	readonly clients: number;
}

export interface ClientARegarder {
	readonly client: ClientDuPortefeuille;
	/** Pourquoi il est là : son niveau, un plafond dépassé, ou une baisse. */
	readonly raison: string;
}

export interface SanteDuPortefeuille {
	/** L'indice moyen, pondéré par l'encours ; `null` sans aucune analyse. */
	readonly indice: number | null;
	readonly niveau: Niveau | null;
	readonly encoursTotal: bigint;
	readonly encoursAnalyse: bigint;
	readonly repartition: readonly PartDuPortefeuille[];
	readonly missions: readonly Mission[];
	/** De 0 à 100 : la moyenne des missions. */
	readonly couverture: number;
	readonly aRegarder: readonly ClientARegarder[];
	readonly changements: readonly ClientARegarder[];
}

const GRAVES: readonly Niveau[] = [
	'A_SURVEILLER',
	'PRUDENCE',
	'RISQUE_ELEVE',
	'PROCEDURE',
	'FERMEE'
];

function rangDuNiveau(niveau: Niveau): number {
	return ORDRE_DES_NIVEAUX.indexOf(niveau);
}

/** Une analyse de moins d'un mois et demi compte comme faite. */
const ANALYSE_A_JOUR_MS = AGE_AVANT_RELECTURE_MS * 1.5;

export function santeDuPortefeuille(
	clients: readonly ClientDuPortefeuille[],
	maintenant: number
): SanteDuPortefeuille {
	const exposes = clients.filter((c) => c.encours > 0n);
	const encoursTotal = exposes.reduce((t, c) => t + c.encours, 0n);

	// ── L'INDICE, PONDÉRÉ PAR L'ARGENT DEHORS ──────────────────────────────
	const analyses = exposes.filter((c) => c.analyse !== null);
	const encoursAnalyse = analyses.reduce((t, c) => t + c.encours, 0n);
	let indice: number | null = null;
	if (encoursAnalyse > 0n) {
		// En centimes jusqu'au bout : l'indice ne sort de l'entier qu'à la division finale.
		const pondere = analyses.reduce((t, c) => t + BigInt(c.analyse!.indice) * c.encours, 0n);
		indice = Math.round(Number((pondere * 100n) / encoursAnalyse) / 100);
	} else {
		const tous = clients.filter((c) => c.analyse !== null);
		if (tous.length > 0) {
			indice = Math.round(tous.reduce((t, c) => t + c.analyse!.indice, 0) / tous.length);
		}
	}

	// ── LA RÉPARTITION DE L'ARGENT DEHORS ──────────────────────────────────
	const parTranche = new Map<Tranche, { encours: bigint; clients: number }>();
	for (const c of exposes) {
		const tranche: Tranche = c.analyse?.niveau ?? 'NON_ANALYSE';
		const avant = parTranche.get(tranche) ?? { encours: 0n, clients: 0 };
		parTranche.set(tranche, { encours: avant.encours + c.encours, clients: avant.clients + 1 });
	}
	const repartition: PartDuPortefeuille[] = [...ORDRE_DES_NIVEAUX, 'NON_ANALYSE' as const].flatMap(
		(tranche) => {
			const part = parTranche.get(tranche);
			return part === undefined ? [] : [{ tranche, ...part }];
		}
	);

	// ── LES MISSIONS ────────────────────────────────────────────────────────
	const parEncours = [...exposes].sort((a, b) =>
		b.encours > a.encours ? 1 : b.encours < a.encours ? -1 : 0
	);
	const sansSiren = parEncours.filter((c) => c.siren === null);
	const avecSiren = parEncours.filter((c) => c.siren !== null);
	const nonAnalyses = avecSiren.filter(
		(c) => c.analyse === null || maintenant - c.analyse.analyseLe > ANALYSE_A_JOUR_MS
	);
	const plusGros = parEncours.slice(0, 3);
	const sansPlafond = plusGros.filter((c) => c.plafond === null);
	const prochain = (liste: readonly ClientDuPortefeuille[]) =>
		liste[0] === undefined ? null : { id: liste[0].id, nom: liste[0].nom };

	const missions: Mission[] = [
		{
			cle: 'SIREN',
			titre: 'Identifier vos clients',
			detail: 'Un SIREN rend un client lisible et surveillé chaque nuit au registre.',
			faits: avecSiren.length,
			total: exposes.length,
			prochain: prochain(sansSiren)
		},
		{
			cle: 'ANALYSE',
			titre: 'Analyser ceux qui vous doivent de l’argent',
			detail: 'Leurs comptes, leurs dirigeants et votre historique, relus chaque mois.',
			faits: avecSiren.length - nonAnalyses.length,
			total: avecSiren.length,
			prochain: prochain(nonAnalyses)
		},
		{
			cle: 'PLAFOND',
			titre: 'Fixer un plafond à vos plus gros clients',
			detail: 'Au-delà, leur encours remonte ici. C’est vous qui fixez le chiffre.',
			faits: plusGros.length - sansPlafond.length,
			total: plusGros.length,
			prochain: prochain(sansPlafond)
		}
	];
	const avecObjet = missions.filter((m) => m.total > 0);
	const couverture =
		avecObjet.length === 0
			? 100
			: Math.round((avecObjet.reduce((t, m) => t + m.faits / m.total, 0) / avecObjet.length) * 100);

	// ── CE QUI MÉRITE UN REGARD ─────────────────────────────────────────────
	const aRegarder: ClientARegarder[] = [];
	for (const c of parEncours) {
		const depasse = c.plafond !== null && c.encours > c.plafond;
		if (c.analyse !== null && GRAVES.includes(c.analyse.niveau)) {
			aRegarder.push({
				client: c,
				raison: depasse ? 'Au-dessus de votre plafond' : (c.analyse.faitPrincipal ?? '')
			});
		} else if (depasse) {
			aRegarder.push({ client: c, raison: 'Au-dessus de votre plafond' });
		}
	}
	aRegarder.sort((a, b) => {
		const ga = a.client.analyse === null ? 0 : rangDuNiveau(a.client.analyse.niveau);
		const gb = b.client.analyse === null ? 0 : rangDuNiveau(b.client.analyse.niveau);
		if (ga !== gb) return gb - ga;
		return b.client.encours > a.client.encours ? 1 : -1;
	});

	const changements: ClientARegarder[] = clients.flatMap((c) => {
		const a = c.analyse;
		if (a === null || a.indicePrecedent === null) return [];
		const baisse = a.indicePrecedent - a.indice;
		const pire =
			a.niveauPrecedent !== null && rangDuNiveau(a.niveau) > rangDuNiveau(a.niveauPrecedent);
		if (baisse < BAISSE_SIGNALEE && !pire) return [];
		return [{ client: c, raison: `${a.indicePrecedent} → ${a.indice}` }];
	});

	return {
		indice,
		niveau: indice === null ? null : niveauDeLIndice(indice),
		encoursTotal,
		encoursAnalyse,
		repartition,
		missions,
		couverture,
		aRegarder,
		changements
	};
}
