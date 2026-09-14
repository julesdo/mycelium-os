import { PageEcran, Relances, type Lecture, type NiveauAffiche } from '../../ui';

/**
 * CE QUE VOUS POUVEZ LUI ÉCRIRE — les brouillons, sur leur propre page.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ C'EST L'ANALYSE QUI PRENAIT LE PLUS DE PLACE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mesurée sur l'écran de créance : 1 608 px, près de trois écrans de téléphone
 * à elle seule, parce qu'un brouillon dépliait son texte complet. Rabattue à
 * 924 px en refermant tout, elle restait la plus lourde des sept.
 *
 * Un brouillon est un TEXTE — plusieurs paragraphes destinés à être relus puis
 * copiés. Ça ne tient pas dans une carte au milieu d'autres cartes ; ça tient
 * sur une page, et c'est pour ça qu'une messagerie en est une.
 *
 * ⚠️ LA MENTION RESTE EN TÊTE. Le composant la porte lui-même : ces textes
 * partent de la messagerie du créancier, sous sa signature. La déplacer ici
 * ferait deux endroits où le produit dit ce qu'il n'est pas.
 */
export interface RelancesDeLaCreance {
	readonly debiteur: string;
	readonly niveaux: readonly NiveauAffiche[];
}

export function EcranRelances({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<RelancesDeLaCreance>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/creance/$id',
					parametres: { id: identifiant },
					libelle: pret?.debiteur ?? 'Créance'
				},
				titre: 'Ce que vous pouvez lui écrire',
				sousTitre: 'Des brouillons, à envoyer depuis votre messagerie.'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : <Relances niveaux={pret.niveaux} />}
		</PageEcran>
	);
}
