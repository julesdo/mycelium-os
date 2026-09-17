import type { EcranDuProduit } from './demo';
import { ECRANS_ABONNEMENT } from './abonnement';
import { ECRANS_CREANCE } from './creance';
import { ECRANS_DEBITEURS } from './debiteurs';
import { ECRANS_DONNEES } from './donnees';
import { ECRANS_EQUIPE } from './equipe';
import { ECRANS_IMPORT } from './import';
import { ECRANS_ONGLETS } from './onglets';
import { ECRANS_PIECE } from './piece';
import { ECRANS_PROCEDURE } from './procedure';
import { ECRANS_REGLAGES } from './reglages';

/**
 * LES ÉCRANS DU PRODUIT, TELS QU'IL LES AFFICHE.
 *
 * ⚠️ LA SALLE MONTRAIT D'AUTRES PAGES QUE CELLES DU PRODUIT. Ses démonstrations
 * recomposaient un en-tête autour d'un composant : « Son habitude de paiement »
 * là où l'écran dit « Comment il paie d'habitude ». On y vérifiait une page que
 * personne ne verrait.
 *
 * Chaque entrée rend ici le VRAI écran, importé de `src/screens/`, dans chacun
 * de ses états.
 *
 * ⚠️ AUCUN TEST N'EXIGE CETTE INSCRIPTION, ET CE COMMENTAIRE ANNONÇAIT LE
 * CONTRAIRE. Il citait un `salle-complete.test.ts` qui n'a jamais été écrit :
 * rien n'oblige donc un écran neuf à entrer ici, et un écran absent ne se voit
 * qu'en ouvrant la salle et en constatant qu'il manque. L'inscription se fait
 * à la main, écran par écran ; ce que le compilateur tient, en revanche, c'est
 * le libellé `route:` de chaque entrée (`demo.ts:17`), donc une adresse morte
 * ou mal orthographiée échoue à `bun run check`.
 *
 * Les entrées vivent par famille d'écrans, dans le fichier de leur famille,
 * avec les données qu'elles montrent : chaque tâche touche sa famille, et ce
 * fichier-ci ne fait que les réunir.
 */
export const ECRANS_DU_PRODUIT: readonly EcranDuProduit[] = [
	...ECRANS_ONGLETS,
	...ECRANS_CREANCE,
	...ECRANS_PIECE,
	...ECRANS_PROCEDURE,
	...ECRANS_DEBITEURS,
	...ECRANS_IMPORT,
	...ECRANS_REGLAGES,
	...ECRANS_ABONNEMENT,
	...ECRANS_EQUIPE,
	...ECRANS_DONNEES
];
