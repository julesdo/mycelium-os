import type { EcranDuProduit } from './demo';
import { ECRANS_BARRE_ET_COMPAGNON } from './barre-et-compagnon';
import { ECRANS_BIENVENUE } from './bienvenue';
import { ECRANS_COMPTE } from './compte';
import { ECRANS_CREANCE } from './creance';
import { ECRANS_DEBITEURS } from './debiteurs';
import { ECRANS_FILE } from './file';
import { ECRANS_IMPORT } from './import';
import { ECRANS_ONGLETS } from './onglets';
import { ECRANS_PIECE } from './piece';

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
	/*
	  ⚠️ L'INSCRIPTION EN TÊTE, PARCE QUE C'EST LE PREMIER ÉCRAN. C'est aussi le
	  seul de cette liste qui ne vive pas sous `/app/` : il s'ouvre avant que
	  l'établissement existe, et c'est ce qui l'avait tenu hors de la salle depuis
	  le début — une borne de typage, pas une décision.
	*/
	...ECRANS_BIENVENUE,
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
	/*
	  ⚠️ `ECRANS_VOLET` A DISPARU AVEC LE VOLET DE PREUVE (écran/aujourdhui).
	  `?ligne=` ouvrait un troisième panneau à droite d'« Aujourd'hui », avec sa
	  propre rangée de trois positions et ses sept sections : c'est l'empilement
	  que le terrain a nommé. Il existait parce qu'aucune vraie page n'existait ;
	  un client et une créance ont maintenant la leur, et ce sont les entrées
	  `créance` et `débiteurs` ci-dessous qui les montrent.
	*/
	...ECRANS_CREANCE,
	...ECRANS_PIECE,
	/*
	  ⚠️ `ECRANS_PROCEDURE` A DISPARU AVEC SA ROUTE. `/app/creance/$id/procedure`
	  n'existe plus : la procédure est une SECTION de la page de créance, et ses
	  deux états — la voie engagée, la voie terminée — sont devenus des variantes
	  de l'entrée `créance`, qui les rend avec le reste du dossier autour. Les
	  regarder isolément montrait un écran dont on ne voyait ni les conditions ni
	  le décompte qui les fondent.
	*/
	...ECRANS_DEBITEURS,
	...ECRANS_IMPORT,
	...ECRANS_COMPTE,

	/* ── LA BARRE DU BAS ET LE COMPAGNON (refonte/barre-et-compagnon) ──────────
	 *
	 * ⚠️ CE N'EST PAS UN ÉCRAN, ET ÇA VIT QUAND MÊME ICI. La coquille monte les
	 * deux flottants sur TOUS les écrans de la salle — c'est ce qui permet d'y
	 * mesurer le dégagement du bas. Mais la barre y est branchée sur le routeur,
	 * et l'adresse de la salle est `/showroom` : aucun onglet n'y est jamais
	 * actif. Cette entrée montre les sept états que la navigation réelle ne
	 * produit pas d'un coup, chacun dans son cadre. */
	...ECRANS_BARRE_ET_COMPAGNON
];
