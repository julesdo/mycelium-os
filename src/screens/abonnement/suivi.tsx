import { PageEcran, euros, type Lecture } from '../../ui';
import { sansEtablissement } from '../sans-etablissement';
import type { AbonnementAffiche } from './abonnement';
import { TITRE_ECRAN } from '../titres';
import { Offre } from './offre';

/**
 * L'ABONNEMENT — l'offre, dépliée.
 *
 * ⚠️ ELLE EST RECOMMANDÉE, ET C'EST UNE PRÉFÉRENCE ASSUMÉE, pas un verdict :
 * le produit est le MÊME à tous les paliers, seul le prix change. La pastille
 * dit lequel des deux chemins tient le chiffre à jour toute l'année.
 */
export function EcranSuiviOffre({ donnees }: { donnees: Lecture<AbonnementAffiche | null> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/abonnement', libelle: TITRE_ECRAN.abonnement },
				titre: 'L’abonnement',
				sousTitre: pret ? `Palier ${pret.palier} — ${pret.bornesPalier}` : undefined
			}}
			etat={
				donnees.etat === 'pret' && pret === null
					? sansEtablissement('Créez-en un pour voir votre offre.')
					: donnees.etat
			}
		>
			{pret === null ? null : (
				<Offre
					titre="L’abonnement"
					prix={euros(pret.tarifs.abonnementMensuel)}
					cadence="par mois"
					description="Vos échéances surveillées toute l’année : ce qui arrive à terme, ce qui devient mûr, ce qui approche de la prescription."
					colonne="abonnement"
					actif={pret.tier === 'procedures'}
					recommande
				/>
			)}
		</PageEcran>
	);
}
