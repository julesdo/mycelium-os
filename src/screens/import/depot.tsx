import { BilanImport, PageEcran, type DepotAffiche, type Lecture } from '../../ui';
import { TITRE_ECRAN } from '../titres';

/**
 * LE BILAN D'UN DÉPÔT — une page, plus une carte dans une pile.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CETTE PAGE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le bilan d'UN SEUL dépôt mesure 1,87 écran de défilement à 375 px : ce qui
 * est entré, ce qui a été écarté à bon droit, et ce qui n'a PAS pu être lu,
 * ligne par ligne avec sa raison. L'écran d'import les empilait tous — et un
 * gérant qui importe chaque mois en accumule douze par an.
 *
 * La liste dit ce qui est entré ; la page dit ce qui manque. C'est justement la
 * seconde moitié qui compte : « 198 factures créées » sans mentionner les deux
 * lignes écartées ment par omission, et l'omission porte précisément sur
 * l'argent qu'on ne réclamera pas.
 *
 * ⚠️ ELLE SE MET À JOUR SEULE. La requête est réactive : un dépôt en cours de
 * lecture affiche son étape et bascule sur son bilan sans rechargement. C'est
 * la règle d'écran n° 2 — tout traitement se voit sans qu'on le demande.
 */
export function EcranDepot({ donnees }: { donnees: Lecture<DepotAffiche> }) {
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
				titre: depot?.filename ?? 'Dépôt',
				sousTitre: depot?.etape ?? undefined
			}}
			etat={donnees.etat}
		>
			{depot === null ? null : <BilanImport depot={depot} />}
		</PageEcran>
	);
}
