import type { CreanceAffichee } from '../../screens/creance';
import { EcranCreance } from '../../screens/creance';
import { pyramideDePreuves } from '../../lib/verticales/recouvrement/solidite';
import { questionsRestantes } from '../../lib/verticales/recouvrement/litige';
import { lectureDemo, type EcranDuProduit } from './demo';

/** La pyramide de preuves utilisée par `CREANCE_DEMO`, pour son décompte de solidité. */
const PYRAMIDE_DEMO = pyramideDePreuves(['FACTURE', 'BON_DE_COMMANDE']);

const CREANCE_DEMO: CreanceAffichee = {
	debiteur: 'Fournitures Durand',
	debiteurId: 'demo-debiteur',
	/**
	 * ⚠️ UNE PROCÉDURE COLLECTIVE DANS LA DÉMONSTRATION, délibérément.
	 *
	 * C'est le cas qui rend la rangée du débiteur indispensable : le radar
	 * l'a relevée au registre pendant la nuit, elle a fait baisser le score
	 * affiché juste au-dessus, et jusqu'ici l'écran n'en disait rien. La
	 * salle d'exposition doit montrer l'état où le défaut se voyait, pas
	 * celui où il ne se voyait pas.
	 */
	santeDebiteur: 'PROCEDURE_COLLECTIVE',
	score: 0.65,
	eligible: false,
	principalRestantDu: 1_200_000n,
	factures: [{ _id: 'f1' }, { _id: 'f2' }],
	questions: [
		{ condition: 'entreCommercants', libelle: 'Les deux parties sont-elles commerçantes ?' }
	],
	litige: {
		litigieux: false,
		constats: [],
		questions: questionsRestantes({ CONTESTATION_ECRITE: 'NON' }).map((q) => ({ cle: q.cle }))
	},
	risques: [{ type: 'RETARDS_REPETES', gravite: 'MOYENNE' }],
	solidite: { etablies: PYRAMIDE_DEMO.etablies, attendues: PYRAMIDE_DEMO.attendues },
	relances: [
		{ niveau: 1, disponible: true },
		{ niveau: 2, disponible: false },
		{ niveau: 3, disponible: false }
	],
	procedures: [
		{ cle: 'relance-amiable', disponible: true },
		{ cle: 'injonction-de-payer', disponible: false }
	],
	regimePrescriptionNote: 'Régime général : cinq ans à compter de l’exigibilité. Secteur déterminé.'
};

export const ECRANS_CREANCE: readonly EcranDuProduit[] = [
	{
		route: '/app/creance/$id',
		libelle: 'créance',
		vide: false,
		Demo: ({ etat }) => (
			<EcranCreance
				donnees={lectureDemo(etat, {
					identifiant: 'demo',
					creance: CREANCE_DEMO,
					etatProcedure: null,
					totalDecompte: null
				})}
			/>
		)
	}
];
