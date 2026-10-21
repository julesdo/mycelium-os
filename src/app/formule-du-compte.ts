import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import { GRILLE } from '../lib/config/tarifs';
import type { FormuleDuCompte } from '../screens/compte/montee';
import { useCaissePaddle } from './caisse-paddle';
import { useQuery } from './donnees';
import { useGestionAbonnement } from './gestion-abonnement';

/**
 * LA FORMULE DU COMPTE, ET DE QUOI LA CHANGER, POUR TOUT ÉCRAN (21/10/2026, le parcours
 * de l'habitude, moment 6) : l'abonnement, la caisse Paddle et la gestion du changement,
 * comme le compte les branche. Le démarrage d'un dossier et la santé des clients s'en
 * servent pour montrer la formule du dessus au moment du besoin.
 */
export function useFormuleDuCompte(): FormuleDuCompte | undefined {
	const abonnement = useQuery(api.billing.etatAbonnement, {});
	const caisseServeur = useQuery(api.paddle.caisse, {});
	const ouvrirLePortail = useAction(api.paddle.getPortalUrl);
	const caisse = useCaissePaddle({
		caisse: caisseServeur,
		ouvrirLePortail: () => ouvrirLePortail({})
	});
	const gestion = useGestionAbonnement(caisse);
	const [maintenant] = useState(() => Date.now());
	if (abonnement === undefined || abonnement === null) return undefined;
	return {
		abonnement,
		maintenant,
		...(caisse === undefined ? {} : { caisse }),
		...(gestion === undefined ? {} : { gestion })
	};
}

/** Le nom de la formule en cours, « Découverte » sans abonnement. */
export function nomDeLaFormuleEnCours(compte: FormuleDuCompte): string {
	return compte.abonnement.formule === null ? 'Découverte' : GRILLE[compte.abonnement.formule].nom;
}
