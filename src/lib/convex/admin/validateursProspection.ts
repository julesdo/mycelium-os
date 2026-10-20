import { v, type Infer } from 'convex/values';
import type { CleSecteur, CleZone } from '../../crm/annuaire';
import type { CleAcheteurs } from '../../crm/decp';

/**
 * LES VALIDATEURS DE LA PROSPECTION (20/10/2026) : ce que cherchent et ajoutent les travaux
 * de l'équipe. Un module sans fonction ni `internal`, que lisent à la fois le schéma
 * (`tables.ts`), les travaux et leur exécution : aucun cycle d'inférence possible.
 */

export const vSecteur = v.union(
	v.literal('TRANSPORT'),
	v.literal('BATIMENT'),
	v.literal('SERVICES'),
	v.literal('CABINETS')
);
export const vZone = v.union(
	v.literal('PARIS'),
	v.literal('PETITE_COURONNE'),
	v.literal('ILE_DE_FRANCE')
);
export const vAcheteurs = v.union(v.literal('HOPITAUX'), v.literal('COLLECTIVITES'));

// Les validateurs suivent les clés des modules purs : une clé ajoutée là casse ici.
const _secteurs: Record<CleSecteur, Infer<typeof vSecteur>> = {
	TRANSPORT: 'TRANSPORT',
	BATIMENT: 'BATIMENT',
	SERVICES: 'SERVICES',
	CABINETS: 'CABINETS'
};
const _zones: Record<CleZone, Infer<typeof vZone>> = {
	PARIS: 'PARIS',
	PETITE_COURONNE: 'PETITE_COURONNE',
	ILE_DE_FRANCE: 'ILE_DE_FRANCE'
};
const _acheteurs: Record<CleAcheteurs, Infer<typeof vAcheteurs>> = {
	HOPITAUX: 'HOPITAUX',
	COLLECTIVITES: 'COLLECTIVITES'
};
void _secteurs;
void _zones;
void _acheteurs;

export const vEntrepriseTrouvee = v.object({
	siren: v.string(),
	entreprise: v.string(),
	activite: v.optional(v.string()),
	effectif: v.optional(v.string()),
	ville: v.optional(v.string()),
	dirigeant: v.optional(v.string()),
	fonction: v.optional(v.string())
});

export const vTitulaireTrouve = v.object({
	siren: v.string(),
	siret: v.string(),
	nom: v.string(),
	departement: v.optional(v.string()),
	marches: v.number(),
	nombreDAcheteurs: v.number(),
	acheteurs: v.array(v.string()),
	plafondCentimes: v.int64(),
	dernierMarche: v.string()
});

/** Un segment que Plume parcourt chaque matin : un secteur à l'annuaire, des acheteurs publics. */
export const vSegment = v.union(
	v.object({ source: v.literal('ANNUAIRE'), secteur: vSecteur }),
	v.object({ source: v.literal('DECP'), acheteurs: vAcheteurs })
);

/** Ce que rend un travail fini : une page de recherche, le bilan d'un ajout, ou le choix de Plume. */
export const vResultatDeTravail = v.union(
	v.object({
		genre: v.literal('ANNUAIRE'),
		pages: v.number(),
		derniere: v.number(),
		entreprises: v.array(v.object({ ...vEntrepriseTrouvee.fields, connue: v.boolean() }))
	}),
	v.object({
		genre: v.literal('DECP'),
		pages: v.number(),
		derniere: v.number(),
		nonDiffusibles: v.number(),
		titulaires: v.array(v.object({ ...vTitulaireTrouve.fields, connue: v.boolean() }))
	}),
	v.object({
		genre: v.literal('AJOUT'),
		importes: v.number(),
		ecartes: v.number(),
		horsZone: v.number(),
		/** Les fournisseurs que les sources n'ont pas servis, même après reprises. */
		echecs: v.array(v.string())
	}),
	v.object({
		genre: v.literal('SELECTION'),
		/** Combien d'entreprises neuves Plume a regardées. */
		examines: v.number(),
		/** Plume a classé ; sinon, les règles seules (clé absente, appel tombé). */
		parPlume: v.boolean(),
		ajoutes: v.array(
			v.object({
				siren: v.string(),
				entreprise: v.string(),
				segment: v.string(),
				pourquoi: v.string()
			})
		),
		echecs: v.array(v.string())
	})
);

export const vGenreDeTravail = v.union(
	v.literal('CHERCHER_ANNUAIRE'),
	v.literal('CHERCHER_DECP'),
	v.literal('AJOUTER_DECP'),
	v.literal('PROSPECTS_DU_JOUR')
);

export const vEtatDeTravail = v.union(
	v.literal('EN_ATTENTE'),
	v.literal('EN_COURS'),
	v.literal('FAIT'),
	v.literal('ECHEC')
);

export type ResultatDeTravail = Infer<typeof vResultatDeTravail>;
export type GenreDeTravail = Infer<typeof vGenreDeTravail>;
