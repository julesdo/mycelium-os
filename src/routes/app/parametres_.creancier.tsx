import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { EnteteDetail, Page, PageBody } from '../../ui';
import { FormulaireCreancier } from '../../screens/parametres/creancier';

export const Route = createFileRoute('/app/parametres_/creancier')({ component: PageCreancier });

/**
 * VOTRE ENTREPRISE, TELLE QU'ELLE APPARAÎT SUR UN DÉCOMPTE.
 *
 * ⚠️ C'EST LE PROFIL QUI BLOQUAIT L'ÉLIGIBILITÉ, et il mesure à lui seul 2,99
 * écrans de défilement à 375 px : dénomination, SIREN, adresse, qualité de
 * commerçant, chacun avec ce qu'il change. Déplié au milieu des réglages, il en
 * faisait l'essentiel de la hauteur.
 *
 * ⚠️ ET LA `key` SUR LA DÉNOMINATION RESTE. Le formulaire s'initialise sur ce
 * que dit le serveur ; sans elle, les champs partiraient vides au premier rendu
 * et y resteraient — React ne ré-initialise pas un `useState` sur un changement
 * de prop.
 */
function PageCreancier() {
	const org = useQuery(api.organizations.getMyOrg, {});
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const enregistrer = useMutation(api.recouvrement.profil.enregistrer);

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/parametres"
				retourLibelle="Réglages"
				titre="Votre entreprise sur un décompte"
				sousTitre="Ce qui sera cité sur les pièces qui partent chez un tiers."
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-2xs">
					{profil === undefined ? (
						<p className="text-cladd-xs text-cladd-fg-soft">Chargement…</p>
					) : (
						<FormulaireCreancier
							key={profil?.denomination ?? 'vide'}
							initial={{
								denomination: profil?.denomination ?? org?.name ?? '',
								siren: profil?.siren ?? '',
								adresse: profil?.adresse ?? '',
								estCommercant: profil?.estCommercant ?? 'unknown'
							}}
							onEnregistrer={enregistrer}
						/>
					)}
				</div>
			</PageBody>
		</Page>
	);
}
