/**
 * CE QUE MET UN ACHETEUR PUBLIC À PAYER, D'APRÈS LES DONNÉES PUBLIÉES (19/10/2026,
 * audit stratégique, lot 5).
 *
 * Des MESURES, pas des valeurs juridiques : les délais permis (trente jours, cinquante
 * pour un hôpital) restent au registre (`PARAMETRES.delaisPaiementPublics`). Chaque
 * mesure porte sa source et sa date de relevé, comme une entrée du registre, parce que
 * l'estimation qui s'en sert les écrit dans ses hypothèses.
 *
 * - Hôpitaux : aucune donnée publique par établissement (relevé du 19/10/2026 :
 *   data.gouv.fr, data.economie.gouv.fr, data.ofgl.fr). L'Observatoire des délais de
 *   paiement publie la métropole entière et quatre tranches de taille ; la taille d'un
 *   hôpital n'étant pas connue ici, l'estimation retient la métropole et cite l'écart.
 * - Collectivités : la DGFiP publie le délai moyen de CHAQUE budget (90 545 en 2025),
 *   qui se joint par SIRET à l'acheteur des marchés. À défaut, la moyenne de métropole.
 *
 * ⚠️ UNE MOYENNE PAR LIGNE DE MANDAT, sans pondération par le montant (méthode de la
 * DGFiP) : passer de là à des euros reste un ordre de grandeur, et l'estimation le dit.
 *
 * Les délais sont en DIXIÈMES DE JOUR et les parts en POUR MILLE : le calcul reste en
 * entiers jusqu'au bout.
 */

export interface MesureDeRetard {
	/** Le délai moyen de paiement, en dixièmes de jour. */
	readonly delaiMoyen: number;
	/** La part des paiements faits après le délai permis, en pour mille. */
	readonly partAuDela: number;
	readonly source: string;
	readonly releveLe: string;
}

const OBSERVATOIRE =
	'Rapport 2025 de l’Observatoire des délais de paiement (Banque de France), données de la DGFiP';

export const RETARDS_PUBLICS = {
	hopitaux: {
		delaiMoyen: 702,
		partAuDela: 507,
		source: `${OBSERVATOIRE} : établissements publics de santé de métropole, au 31 décembre 2025`,
		releveLe: '2026-10-19'
	},
	collectivites: {
		delaiMoyen: 189,
		partAuDela: 150,
		source: `${OBSERVATOIRE} : secteur public local de métropole, au 31 décembre 2025`,
		releveLe: '2026-10-19'
	}
} as const satisfies Record<string, MesureDeRetard>;

/** Les hôpitaux par taille (recettes annuelles), pour dire l'écart que cache la moyenne. */
export const HOPITAUX_PAR_TAILLE: readonly {
	readonly tranche: string;
	readonly delaiMoyen: number;
	readonly partAuDela: number;
}[] = [
	{ tranche: 'moins de 20 M€ de recettes', delaiMoyen: 537, partAuDela: 371 },
	{ tranche: 'de 20 à 70 M€', delaiMoyen: 829, partAuDela: 591 },
	{ tranche: 'de 70 à 150 M€', delaiMoyen: 851, partAuDela: 623 },
	{ tranche: 'plus de 150 M€', delaiMoyen: 672, partAuDela: 495 }
];

/** Le délai de chaque budget de collectivité : l'API Opendatasoft de data.economie.gouv.fr. */
export const DELAIS_DES_BUDGETS = {
	adresse:
		'https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/delai-paiement-moyen-collectivites-2025/records',
	source:
		'DGFiP, délais de paiement 2025 des collectivités territoriales (data.economie.gouv.fr, Licence Ouverte)',
	releveLe: '2026-10-19'
} as const;

/** Les SIRET se demandent cinquante à la fois. */
export const BUDGETS_PAR_APPEL = 50;

/** La demande du délai moyen des budgets de ces SIRET (le champ `code_insee` est un SIRET). */
export function adresseDelaisDesBudgets(sirets: readonly string[]): string {
	const propres = sirets.filter((s) => /^\d{14}$/.test(s)).slice(0, BUDGETS_PAR_APPEL);
	const p = new URLSearchParams();
	p.set('where', `code_insee in (${propres.join(', ')})`);
	p.set('select', 'code_insee,type_bc,dgp_annuel_moyen');
	p.set('limit', '100');
	return `${DELAIS_DES_BUDGETS.adresse}?${p.toString()}`;
}

/**
 * Le délai moyen de chaque SIRET, en dixièmes de jour. Le budget principal (« BP ») d'une
 * collectivité est celui qui paie ses marchés courants ; sans lui, le plus long de ses
 * budgets annexes, pour ne rien sous-estimer.
 */
export function lireDelaisDesBudgets(json: unknown): Map<string, number> {
	const r = json as { readonly results?: unknown };
	if (typeof r !== 'object' || r === null || !Array.isArray(r.results))
		throw new Error('Les délais de paiement des collectivités ont rendu une réponse inattendue.');
	const principaux = new Map<string, number>();
	const annexes = new Map<string, number>();
	for (const brut of r.results as Record<string, unknown>[]) {
		const siret = String(brut.code_insee ?? '').padStart(14, '0');
		const delai = brut.dgp_annuel_moyen;
		if (!/^\d{14}$/.test(siret) || typeof delai !== 'number' || !Number.isFinite(delai)) continue;
		const dixiemes = Math.round(delai * 10);
		const cible = brut.type_bc === 'BP' ? principaux : annexes;
		cible.set(siret, Math.max(cible.get(siret) ?? 0, dixiemes));
	}
	const delais = new Map(annexes);
	for (const [siret, d] of principaux) delais.set(siret, d);
	return delais;
}

/** « 70,2 » : des dixièmes, en clair. */
export function dixiemesLisibles(dixiemes: number): string {
	return `${Math.floor(dixiemes / 10)},${dixiemes % 10}`;
}
