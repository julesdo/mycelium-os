/**
 * LES RÉUSSITES DU GÉRANT (21/10/2026, le parcours de l'habitude,
 * `docs/superpowers/specs/2026-10-21-parcours-habitude-design.md`).
 *
 * Sept clés fermées, une fois chacune par établissement, relevées sur ce qui s'est
 * vraiment passé : la première relance partie, le premier paiement, quatre paliers de
 * ce qui est rentré sur les dossiers suivis, le premier dossier soldé. Le module dit ce
 * qui est franchi, lequel montrer, quelle ligne mettre dessous et avec quels mots ;
 * Convex relève et inscrit (`convex/recouvrement/jalons.ts`).
 *
 * ⚠️ « RENTRÉS SUR LES DOSSIERS SUIVIS », JAMAIS « GRÂCE À » : le logiciel mesure ce qui
 * est arrivé, il ne s'en attribue pas le mérite.
 */

export const CLES_JALONS = [
	'PREMIERE_RELANCE',
	'PREMIER_PAIEMENT',
	'RENTRE_1000',
	'RENTRE_10000',
	'RENTRE_50000',
	'RENTRE_100000',
	'PREMIER_DOSSIER_SOLDE'
] as const;

export type CleJalon = (typeof CLES_JALONS)[number];

/** Les paliers de ce qui est rentré, en centimes. */
export const PALIERS_RENTRE: readonly { readonly cle: CleJalon; readonly seuil: bigint }[] = [
	{ cle: 'RENTRE_1000', seuil: 100_000n },
	{ cle: 'RENTRE_10000', seuil: 1_000_000n },
	{ cle: 'RENTRE_50000', seuil: 5_000_000n },
	{ cle: 'RENTRE_100000', seuil: 10_000_000n }
];

export function estJalonDArgent(cle: CleJalon): boolean {
	return PALIERS_RENTRE.some((p) => p.cle === cle);
}

export interface EtatDesJalons {
	readonly relancesParties: number;
	readonly paiements: number;
	readonly rentreCumule: bigint;
	readonly dossiersSoldes: number;
}

export function jalonsFranchis(e: EtatDesJalons): CleJalon[] {
	const franchis: CleJalon[] = [];
	if (e.relancesParties > 0) franchis.push('PREMIERE_RELANCE');
	if (e.paiements > 0) franchis.push('PREMIER_PAIEMENT');
	for (const p of PALIERS_RENTRE) if (e.rentreCumule >= p.seuil) franchis.push(p.cle);
	if (e.dossiersSoldes > 0) franchis.push('PREMIER_DOSSIER_SOLDE');
	return franchis;
}

/**
 * Plusieurs réussites en attente : la plus haute seule se montre. L'argent passe
 * avant le dossier soldé, qui passe avant le premier paiement, puis la relance.
 */
const RANG: Record<CleJalon, number> = {
	PREMIERE_RELANCE: 0,
	PREMIER_PAIEMENT: 1,
	PREMIER_DOSSIER_SOLDE: 2,
	RENTRE_1000: 3,
	RENTRE_10000: 4,
	RENTRE_50000: 5,
	RENTRE_100000: 6
};

export function plusHautJalon(cles: readonly CleJalon[]): CleJalon | null {
	let haut: CleJalon | null = null;
	for (const cle of cles) if (haut === null || RANG[cle] > RANG[haut]) haut = cle;
	return haut;
}

export type LigneSecondaire = 'PUSH' | 'ANNEE' | 'RECOMMANDATION';

/**
 * AU PLUS UNE LIGNE SOUS LE BOUTON, par ordre de priorité : les notifications quand
 * elles dorment (après la première relance), l'année à qui paie au mois et ne l'a
 * jamais vue proposée (jalon d'argent), puis la recommandation (jalon d'argent).
 */
export function ligneSecondaire(
	cle: CleJalon,
	ctx: {
		readonly pushActif: boolean;
		readonly mensuel: boolean;
		readonly anneeProposee: boolean;
		readonly recommandationCoupee: boolean;
	}
): LigneSecondaire | null {
	if (cle === 'PREMIERE_RELANCE') return ctx.pushActif ? null : 'PUSH';
	if (!estJalonDArgent(cle)) return null;
	if (ctx.mensuel && !ctx.anneeProposee) return 'ANNEE';
	if (!ctx.recommandationCoupee) return 'RECOMMANDATION';
	return null;
}

export interface TexteDuJalon {
	readonly titre: string;
	/** Le montant héros, en centimes ; `null` quand la réussite n'en porte pas. */
	readonly montant: bigint | null;
	readonly detail: string;
}

function pluriel(n: number, mot: string): string {
	return `${n} ${mot}${n > 1 ? 's' : ''}`;
}

/** Les mots d'une réussite : ce qui s'est passé, le montant, depuis quand et sur qui. */
export function texteDuJalon(
	cle: CleJalon,
	ctx: {
		readonly semaines: number;
		readonly clients: number;
		readonly client: string | null;
		readonly montant?: bigint | null;
	}
): TexteDuJalon {
	const palier = PALIERS_RENTRE.find((p) => p.cle === cle);
	if (palier !== undefined) {
		const semaines = Math.max(1, ctx.semaines);
		return {
			titre: 'Rentrés sur les dossiers suivis',
			montant: palier.seuil,
			detail: `En ${pluriel(semaines, 'semaine')}, sur ${pluriel(Math.max(1, ctx.clients), 'client')}.`
		};
	}
	switch (cle) {
		case 'PREMIERE_RELANCE':
			return {
				titre: 'Votre première relance est partie',
				montant: null,
				detail: 'À votre nom. Les réponses arrivent à votre adresse.'
			};
		case 'PREMIER_PAIEMENT':
			return {
				titre: 'Premier paiement reçu',
				montant: ctx.montant ?? null,
				detail:
					ctx.client !== null
						? `${ctx.client}, rapproché sur ses factures.`
						: 'Rapproché sur les factures du client.'
			};
		default:
			return {
				titre: 'Un premier dossier soldé',
				montant: ctx.montant ?? null,
				detail:
					ctx.client !== null ? `${ctx.client} a tout réglé.` : 'Toutes ses factures sont réglées.'
			};
	}
}
