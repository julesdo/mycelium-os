import {
	HabitudePaiement,
	PageEcran,
	type HabitudeAffichee,
	type Lecture,
	type RuptureAffichee
} from '../../ui';

/** Ce que la page affiche : le nom du débiteur pour son retour, son habitude, et ses ruptures. */
export interface HabitudeDuDebiteur {
	/** Le nom, une fois la liste des débiteurs arrivée ; `null` avant. */
	readonly denomination: string | null;
	readonly habitude: HabitudeAffichee;
	readonly ruptures: readonly RuptureAffichee[];
}

/**
 * COMMENT CE CLIENT PAIE D'HABITUDE.
 *
 * ⚠️ C'EST UNE STATISTIQUE, ET ELLE A BESOIN D'ÊTRE LUE. Le délai médian, la
 * dispersion, la taille de l'échantillon, puis chaque rupture avec son écart :
 * ça ne se résume pas à un chiffre dans une carte au milieu d'un volet, et
 * c'est précisément le genre d'analyse qu'on ouvre quand on se demande si un
 * retard est un accident ou un signal.
 *
 * ⚠️ ET UN HISTORIQUE TROP COURT SE DIT. Le module est inopérant sur un client
 * nouveau ; le produit l'annonce au lieu de faire semblant, parce qu'une
 * habitude calculée sur trois règlements n'est pas une habitude.
 */
export function EcranHabitude({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<HabitudeDuDebiteur>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/debiteurs',
					recherche: { d: identifiant },
					libelle: pret?.denomination ?? 'Débiteurs'
				},
				titre: 'Comment il paie d’habitude'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<HabitudePaiement habitude={pret.habitude} ruptures={pret.ruptures} />
			)}
		</PageEcran>
	);
}
