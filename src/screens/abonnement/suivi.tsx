import { PageEcran, euros, type Lecture } from '../../ui';
import { sansEtablissement } from '../sans-etablissement';
import type { AbonnementAffiche } from './abonnement';
import { Offre } from './offre';

/**
 * L'ABONNEMENT — l'offre, dépliée.
 *
 * ⚠️ ELLE EST RECOMMANDÉE, ET C'EST UNE PRÉFÉRENCE ASSUMÉE, pas un verdict :
 * le produit est le MÊME à tous les paliers, seul le prix change. La pastille
 * dit lequel des deux chemins tient le chiffre à jour toute l'année.
 */
export function EcranSuiviOffre({ donnees }: { donnees: Lecture<AbonnementAffiche | null> }) {
	const etat = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/abonnement', libelle: 'Abonnement' },
				titre: 'L’abonnement',
				sousTitre: etat ? `Palier ${etat.palier} — ${etat.bornesPalier}` : undefined
			}}
			etat={
				donnees.etat === 'pret' && etat === null
					? sansEtablissement('Créez-en un pour voir votre offre.')
					: donnees.etat
			}
		>
			{etat === null ? null : (
				<Offre
					titre="L’abonnement"
					prix={euros(etat.tarifs.abonnementMensuel)}
					cadence="par mois"
					description="Votre chiffre reste à jour toute l’année, et votre déclaration de mars est prête avant mars."
					colonne="abonnement"
					actif={etat.tier === 'procedures'}
					recommande
				/>
			)}
		</PageEcran>
	);
}
