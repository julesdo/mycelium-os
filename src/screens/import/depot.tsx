import { PageEcran, type DepotAffiche, type Lecture } from '../../ui';
import { TITRE_ECRAN } from '../titres';
import { Bilan } from './bilan';
import { useMinute } from './horloge';

/**
 * LE BILAN D'UN DÉPÔT — une page, plus une carte dans une pile.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CETTE PAGE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La liste dit ce qui est entré ; la page dit ce qui manque. C'est la seconde
 * moitié qui compte : « 198 factures créées » sans mentionner les deux lignes
 * écartées ment par omission, et l'omission porte précisément sur l'argent
 * qu'on ne réclamera pas.
 *
 * ⚠️ ELLE SE MET À JOUR SEULE. La requête est réactive : un dépôt en cours de
 * lecture affiche son étape et bascule sur son bilan sans rechargement. C'est
 * la règle d'écran n° 2 — tout traitement se voit sans qu'on le demande. Et
 * quand la lecture ne bascule JAMAIS parce que sa tâche est tombée, la page le
 * dit aussi : voir `horloge.ts`, qui porte la seule horloge du produit.
 *
 * ⚠️ DEUX NIVEAUX, PAS TROIS. Cette page est un détail de la liste d'import et
 * ne pousse vers rien : aucune sous-page, aucune rangée d'onglets. Tout y tient
 * dans un seul défilement, sections empilées.
 */
export function EcranDepot({ donnees }: { donnees: Lecture<DepotAffiche> }) {
	/**
	 * ⚠️ LE CROCHET EST APPELÉ AVANT TOUT RETOUR ANTICIPÉ, et il n'y en a pas
	 * ici pour cette raison : `PageEcran` porte les trois états, donc l'écran ne
	 * se branche jamais avant d'avoir lu l'heure. Un `if` posé plus haut
	 * changerait le nombre de crochets entre l'attente et l'arrivée des données.
	 */
	const minute = useMinute();
	const depot = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/import-factures',
					libelle: TITRE_ECRAN.imports,
					masqueEnVolets: true
				},
				titre: depot?.filename ?? 'Dépôt'
				// ⚠️ PAS DE SOUS-TITRE. L'étape y était, ET dans le bilan deux lignes
				// plus bas : « 198 factures enregistrées. » se lisait deux fois sur le
				// même écran.
			}}
			etat={donnees.etat}
		>
			{depot === null ? null : <Bilan depot={depot} minute={minute} />}
		</PageEcran>
	);
}
