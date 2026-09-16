import { BoutonPrincipal, Lien, type VideEcran } from '../ui';

/**
 * AUCUN ÉTABLISSEMENT ACTIF.
 *
 * ⚠️ PRESQUE INATTEIGNABLE, ET C'EST POUR ÇA QU'IL DOIT ÊTRE JUSTE. La coquille
 * authentifiée envoie déjà un compte sans établissement vers `/bienvenue`. Cet
 * état ne survient que si l'établissement disparaît pendant la session : il
 * s'affichait alors en paragraphe sans issue, ou en « Chargement… » éternel.
 *
 * Il mène là où un établissement se crée.
 */
export function sansEtablissement(explication: string): { readonly vide: VideEcran } {
	return {
		vide: {
			illustration: '🏢',
			titre: 'Aucun établissement actif',
			explication,
			action: (
				<BoutonPrincipal as={Lien} to="/bienvenue">
					Créer votre entreprise
				</BoutonPrincipal>
			)
		}
	};
}
