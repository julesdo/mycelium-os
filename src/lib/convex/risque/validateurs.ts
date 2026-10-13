import { v, type Infer } from 'convex/values';

/**
 * LES FORMES D'UNE ANALYSE DE RISQUE, telles que la base les garde et que
 * l'écran les reçoit. Elles recopient `verticales/recouvrement/risque/analyse.ts`
 * champ par champ : le validateur refuse tout champ en trop.
 */

export const vNiveau = v.union(
	v.literal('RIEN_A_SIGNALER'),
	v.literal('A_SURVEILLER'),
	v.literal('PRUDENCE'),
	v.literal('RISQUE_ELEVE'),
	v.literal('PROCEDURE'),
	v.literal('FERMEE')
);

export const vPilier = v.union(
	v.literal('REGISTRE'),
	v.literal('FINANCES'),
	v.literal('TRANSPARENCE'),
	v.literal('DIRIGEANTS'),
	v.literal('PAIEMENTS')
);

export const vFait = v.object({
	cle: v.string(),
	pilier: vPilier,
	titre: v.string(),
	court: v.string(),
	detail: v.optional(v.string()),
	effet: v.number(),
	poids: v.union(
		v.literal('FORT'),
		v.literal('MOYEN'),
		v.literal('FAIBLE'),
		v.literal('INFORMATIF')
	),
	source: v.object({
		nom: v.string(),
		date: v.optional(v.string()),
		url: v.optional(v.string()),
		article: v.optional(v.string())
	})
});

export const vEtatDuPilier = v.object({
	pilier: vPilier,
	traits: v.number(),
	resume: v.string(),
	connu: v.boolean()
});

export const vRapprochement = v.union(
	v.literal('IDENTIFIE'),
	v.literal('HOMONYMES'),
	v.literal('SANS_NAISSANCE'),
	v.literal('NON_TROUVE'),
	v.literal('PERSONNE_MORALE'),
	v.literal('NON_LU')
);

/**
 * CE QUE L'ÉCRAN MONTRE D'UN DIRIGEANT : son nom, sa qualité, sa prise de poste,
 * ses sociétés et leurs procédures. ⚠️ JAMAIS SA DATE DE NAISSANCE : elle a servi
 * à le rapprocher, elle n'est pas gardée.
 */
export const vDirigeantAffiche = v.object({
	nomComplet: v.string(),
	qualites: v.array(v.string()),
	depuis: v.optional(v.string()),
	rapprochement: vRapprochement,
	societesTotal: v.optional(v.number()),
	societesActives: v.number(),
	societes: v.array(
		v.object({
			siren: v.string(),
			denomination: v.string(),
			enActivite: v.boolean()
		})
	),
	procedures: v.array(
		v.object({
			siren: v.string(),
			denomination: v.string(),
			dateParution: v.string(),
			nature: v.string(),
			url: v.string()
		})
	)
});

export const vExerciceAffiche = v.object({
	annee: v.number(),
	chiffreAffaires: v.optional(v.int64()),
	resultat: v.optional(v.int64()),
	tresorerie: v.optional(v.int64()),
	delaiFournisseursJours: v.optional(v.number())
});

export const vLisibilite = v.union(v.literal('BONNE'), v.literal('PARTIELLE'), v.literal('FAIBLE'));

/** Le corps d'une analyse, sans son en-tête (établissement, client, dates). */
export const vCorpsDAnalyse = {
	denomination: v.string(),
	formeJuridique: v.optional(v.string()),
	dateCreation: v.optional(v.string()),
	indice: v.number(),
	niveau: vNiveau,
	faits: v.array(vFait),
	piliers: v.array(vEtatDuPilier),
	lisibilite: vLisibilite,
	lisibiliteRaison: v.optional(v.string()),
	dirigeants: v.array(vDirigeantAffiche),
	exercices: v.array(vExerciceAffiche),
	/** Comptes confidentiels au dernier dépôt : l'écran le dit au lieu d'afficher des barres vides. */
	comptesConfidentiels: v.boolean(),
	versionDesRegles: v.number()
};

export type NiveauDeRisque = Infer<typeof vNiveau>;
