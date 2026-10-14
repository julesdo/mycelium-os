import { useAction } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import type { GestionAffichee } from '../screens/compte/gestion-formule';
import type { CaisseAffichee } from '../screens/compte/facturation';

/**
 * Changer de formule, résilier, reprendre : les quatre actions Convex
 * (`paddle.apercuDuChangement`, `changerDeFormule`, `resilier`, `reprendre`),
 * et le portail de Paddle pris à la caisse. `undefined` sans caisse : ni la
 * facturation ouverte, ni un administrateur.
 */
export function useGestionAbonnement(
	caisse: CaisseAffichee | undefined
): GestionAffichee | undefined {
	const apercu = useAction(api.paddle.apercuDuChangement);
	const changer = useAction(api.paddle.changerDeFormule);
	const resilier = useAction(api.paddle.resilier);
	const reprendre = useAction(api.paddle.reprendre);

	if (caisse === undefined) return undefined;
	return {
		apercu: (formule, rythme) => apercu({ formule, rythme }),
		changer: (formule, rythme) => changer({ formule, rythme }),
		resilier: (raison) => resilier(raison === undefined ? {} : { raison }),
		reprendre: () => reprendre({}),
		onGererLaCarte: caisse.onGerer,
		portailEnCours: caisse.enCours === 'portail'
	};
}
