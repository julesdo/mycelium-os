import { PageEcran, euros, type Lecture } from '../../ui';
import { sansEtablissement } from '../sans-etablissement';
import type { AbonnementAffiche } from './abonnement';
import { TITRE_ECRAN } from '../titres';
import { Offre } from './offre';

/**
 * LE PREMIER BILAN — l'offre, dépliée.
 *
 * ⚠️ UNE OFFRE NE SE COMPARE PAS EN FAISANT DÉFILER. Les deux cartes portaient
 * chacune leur prix, leur description et la liste complète de ce qui est
 * inclus ; empilées sur un téléphone, elles faisaient l'essentiel des 6,76
 * écrans de défilement de l'écran d'abonnement.
 *
 * ⚠️ ET LE PRIX VIENT DU SERVEUR. Le palier dépend du volume déclaré, et un
 * palier calculé dans le navigateur se falsifie pour payer le tarif d'en
 * dessous. `etatAbonnement` le renvoie déjà résolu.
 */
export function EcranPremierBilan({ donnees }: { donnees: Lecture<AbonnementAffiche | null> }) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: { vers: '/app/abonnement', libelle: TITRE_ECRAN.abonnement },
				titre: 'Le premier bilan',
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
					titre="Le premier bilan"
					prix={euros(pret.tarifs.bilan)}
					cadence="une fois"
					description="Douze mois de factures lus en une fois. Vous saurez où vous en êtes, et ce qu’il manque, en euros."
					colonne="bilan"
					actif={pret.tier === 'suivi'}
				/>
			)}
		</PageEcran>
	);
}
