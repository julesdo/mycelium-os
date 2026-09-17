import type { EcranDuProduit } from './demo';
import { ECRANS_COMPTE } from './compte';
import { ECRANS_CREANCE } from './creance';
import { ECRANS_DEBITEURS } from './debiteurs';
import { ECRANS_FILE } from './file';
import { ECRANS_IMPORT } from './import';
import { ECRANS_ONGLETS } from './onglets';
import { ECRANS_PIECE } from './piece';
import { ECRANS_PROCEDURE } from './procedure';

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
 * ⚠️ `salle-complete.test.ts` N'EXISTE PAS, et ce commentaire a annoncé pendant
 * des semaines qu'il tenait cette liste. Rien n'oblige donc un écran neuf à
 * entrer ici : chaque tâche l'y inscrit à la main. Ce qui tient, une fois
 * l'entrée posée, c'est `demo.ts:17` — le champ `route` est typé par le
 * routeur, et un libellé de route périmé échoue à `bun run check`. C'est ce qui
 * a fait tomber les treize entrées de réglages avec leurs treize adresses.
 *
 * Les entrées vivent par famille d'écrans, dans le fichier de leur famille,
 * avec les données qu'elles montrent : chaque tâche touche sa famille, et ce
 * fichier-ci ne fait que les réunir.
 */
export const ECRANS_DU_PRODUIT: readonly EcranDuProduit[] = [
	/**
	 * ⚠️ LA FILE EN PREMIER, ET L'ACCUEIL JUSTE APRÈS. Elle le REMPLACE à `/app/`
	 * (T6, T7), mais la bascule est une tâche séparée et volontairement révocable
	 * (T15) : les deux cohabitent ici le temps qu'on les regarde côte à côte, ce
	 * qui est la seule façon de vérifier au regard que la seconde rend ce que la
	 * première rendait. La file porte donc une `cle`, faute de quoi la salle
	 * choisirait par la route et ne rendrait jamais que l'accueil.
	 */
	...ECRANS_FILE,
	...ECRANS_ONGLETS,
	...ECRANS_CREANCE,
	...ECRANS_PIECE,
	...ECRANS_PROCEDURE,
	...ECRANS_DEBITEURS,
	...ECRANS_IMPORT,
	...ECRANS_COMPTE
];
