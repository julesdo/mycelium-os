import { useQuery } from 'convex/react';
import { useRouterState } from '@tanstack/react-router';

import { Avatar } from '../ui/avatar';
import { Lien } from '../ui/lien';
import { api } from '../lib/convex/_generated/api';

/**
 * QUI REGARDE, ET SI LA MACHINE TOURNE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE FICHIER EST CE QUI RESTE DE LA BARRE (T15)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `src/app/barre.tsx` portait huit cibles sur tous les écrans. Il n'y a plus
 * qu'un écran de travail, donc il n'y a plus de barre : ces deux surfaces-ci
 * se réhébergent dans la `Toolbar` de la file, et le reste — quatre onglets,
 * une barre basse, une capsule de verre — n'a plus d'objet.
 *
 * Elles restent dans `src/app/` et non dans `src/ui/` pour la même raison que
 * le sélecteur d'établissement : elles INTERROGENT Convex. La file, elle, ne
 * sait pas interroger — c'est ce qui permet de la regarder aux quatre largeurs
 * de référence sans backend ni authentification.
 */

/**
 * L'AVATAR — qui est connecté, et la SEULE entrée de `/app/compte`.
 *
 * ⚠️ IL N'EST PAS UN ORNEMENT D'IDENTITÉ. `/app/compte` tient l'établissement,
 * l'identité du créancier, la facturation, l'équipe, les données et le carnet
 * d'intervenants : treize écrans réunis en une page (T11). Sans cet avatar, la
 * page n'a plus une seule arête entrante et les six sections deviennent
 * inatteignables le jour de la bascule.
 *
 * ⚠️ ET L'ENGRENAGE N'EST PAS REVENU. Deux cibles pour la même destination, à
 * deux cents pixels l'une de l'autre, c'est un choix de plus à faire pour rien
 * — et c'est ce qui gonflait l'ancienne barre à huit cibles.
 */
export function AvatarConnecte() {
	const moi = useQuery(api.users.viewer, {});
	const ici = useRouterState({ select: (s) => s.location.pathname === '/app/compte' });

	return (
		<Lien to="/app/compte" aria-label="Votre compte" aria-current={ici ? 'page' : undefined}>
			{/*
			  `moi?.name` peut être vide sur un compte créé par invitation, qui n'a
			  parfois qu'une adresse. `initiales` retombe alors sur l'adresse, puis
			  sur un point d'interrogation — jamais sur un disque vide, qu'on prend
			  pour un défaut de chargement.
			*/}
			<Avatar nom={moi?.name ?? moi?.email} />
		</Lien>
	);
}
