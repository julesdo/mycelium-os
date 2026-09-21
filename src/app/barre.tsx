import { useRouterState } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { CircleUserIcon, GavelIcon, UsersIcon } from 'lucide-react';
import { api } from '../lib/convex/_generated/api';
import {
	BarreDuBas,
	Facultatif,
	IconeLetikette,
	PastilleDeRappel,
	type DestinationBarre
} from '../ui';

/**
 * LA BARRE DU BAS, BRANCHÉE SUR LE ROUTEUR.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DESSIN VIT DANS `ui/barre-du-bas.tsx`, QUI NE SAIT RIEN DU ROUTEUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce fichier-ci ne dessine rien : il lit l'adresse, décide quel onglet est
 * actif, et branche la pastille de compte. C'est la même séparation que partout
 * ailleurs dans le produit — et ici elle paie deux fois, parce qu'elle permet à
 * la salle d'exposition de rendre la barre avec CHAQUE onglet actif tour à tour,
 * ce qu'aucune navigation réelle ne peut montrer d'un coup.
 *
 * ⚠️ IL REPREND LE NOM DU FICHIER SUPPRIMÉ PAR `ceaf8ce`, et c'est voulu : c'est
 * là qu'on le cherchera.
 */

/**
 * LES QUATRE DESTINATIONS.
 *
 * ⚠️ QUATRE, ET PAS HUIT. La barre haute d'avant comptait huit cibles alignées
 * sur une rangée — quatre onglets, un champ de recherche, un sélecteur
 * d'établissement, un bouton « Déposer » et un engrenage. Huit choix de même
 * poids, dont aucun ne dit ce qu'il faut faire maintenant. Tout ce qui n'est pas
 * une DESTINATION a quitté la navigation : la recherche, le veilleur, l'avatar
 * et le sélecteur vivent dans la `Toolbar` de la file, où ils appartiennent.
 *
 * ⚠️ ET `to` EST TYPÉ PAR LE ROUTEUR. L'ancienne barre écrivait ses
 * destinations en chaînes littérales, et son bouton le plus visible pointait
 * depuis des semaines vers `/app/factures`, une route JAMAIS DÉCLARÉE : le lien
 * menait à une page d'erreur à toutes les largeurs, et rien ne le signalait.
 * `DestinationBarre.vers` étant `LinkProps['to']`, la même faute échoue
 * maintenant à `bun run check`.
 */
const DESTINATIONS = [
	{ cle: 'aujourdhui', libelle: 'Aujourd’hui', vers: '/app', Icone: IconeLetikette },
	{ cle: 'clients', libelle: 'Clients', vers: '/app/debiteurs', Icone: UsersIcon },
	{ cle: 'creances', libelle: 'Créances', vers: '/app/procedures', Icone: GavelIcon },
	{ cle: 'compte', libelle: 'Compte', vers: '/app/compte', Icone: CircleUserIcon }
] as const satisfies readonly Omit<DestinationBarre, 'actif' | 'rappel'>[];

/**
 * ⚠️ L'ACCUEIL SE COMPARE À L'ÉGAL, LES AUTRES AU PRÉFIXE. `'/app'` est le
 * préfixe de toutes les adresses du produit : comparé au préfixe, il resterait
 * actif sur les vingt-six autres écrans, et le bloc de verre ne quitterait
 * jamais le premier onglet.
 */
function estActif(vers: string, chemin: string): boolean {
	return vers === '/app' ? chemin === '/app' : chemin.startsWith(vers);
}

/**
 * LE COMPTE DE CE QUE LE VEILLEUR A TROUVÉ.
 *
 * ⚠️ IL EST ALIMENTÉ, ET ÇA A ÉTÉ VÉRIFIÉ. `notifications.createNotification`
 * est appelée par `recouvrement/battement.ts` : la pastille compte des faits
 * réellement écrits, pas un champ déclaré et jamais rempli. Le dépôt porte déjà
 * la trace d'une version où ce n'était pas le cas.
 *
 * ⚠️ IL S'ISOLE, PARCE QU'IL PEUT LEVER. Sans session — au chargement, après une
 * expiration, dans la salle d'exposition qui rend la coquille sans
 * authentification — la requête lève. Enveloppé dans `Facultatif` par l'appelant
 * juste en dessous, il s'éteint seul ; passé en NOMBRE à la barre, il faudrait
 * l'interroger dans le même composant qu'elle, et la navigation entière
 * disparaîtrait avec la pastille.
 */
function RappelDuVeilleur() {
	const nonLues = useQuery(api.notifications.getUnreadCount, {});
	return <PastilleDeRappel compte={nonLues ?? 0} />;
}

export function BarreBranchee() {
	const chemin = useRouterState({ select: (etat) => etat.location.pathname });

	const destinations: DestinationBarre[] = DESTINATIONS.map((destination) => ({
		...destination,
		actif: estActif(destination.vers, chemin),
		/*
		  LA PASTILLE, SUR « AUJOURD'HUI » ET NULLE PART AILLEURS.

		  ⚠️ C'EST LÀ QUE CE QU'ELLE COMPTE SE LIT. Les notifications du veilleur
		  portent des prescriptions proches et des échéances de procédure : elles
		  atterrissent dans la file, qui est l'écran de cet onglet. Posée sur
		  « Compte », la même pastille enverrait chercher un délai dans les
		  réglages d'abonnement.
		*/
		...(destination.cle === 'aujourdhui'
			? {
					rappel: (
						<Facultatif>
							<RappelDuVeilleur />
						</Facultatif>
					)
				}
			: {})
	}));

	return <BarreDuBas destinations={destinations} />;
}
