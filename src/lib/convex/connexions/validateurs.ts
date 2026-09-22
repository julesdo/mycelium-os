import { v, type Infer } from 'convex/values';

/**
 * LES CINQ ÉTATS D'UNE CONNEXION, tels que l'écran les dit.
 *
 * EN_ATTENTE : le gérant est parti chez Qonto et n'est pas revenu.
 * SYNCHRONISATION : les factures arrivent. A_JOUR : tout est lu.
 * ECHEC : la dernière tentative a échoué, la connexion tient peut-être encore.
 * REVOQUEE : l'accès a été retiré depuis Qonto ; il faut se reconnecter.
 */
export const vStatutConnexionQonto = v.union(
	v.literal('EN_ATTENTE'),
	v.literal('SYNCHRONISATION'),
	v.literal('A_JOUR'),
	v.literal('ECHEC'),
	v.literal('REVOQUEE')
);

export type StatutConnexionQonto = Infer<typeof vStatutConnexionQonto>;
