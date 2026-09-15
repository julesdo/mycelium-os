import { createFileRoute, Outlet, useChildMatches, useNavigate } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { authClient } from '../../lib/client/auth';
import { useTheme } from '../../app/use-theme';
import { EcranReglages, type SectionReglages } from '../../screens/parametres/reglages';

/**
 * LA MISE EN PAGE DES RÉGLAGES, SANS CHEMIN.
 *
 * ⚠️ ELLE N'AJOUTE RIEN À L'ADRESSE. `/app/abonnement`, `/app/equipe` et
 * `/app/donnees` sont au premier niveau, à côté de `/app/parametres` : le
 * soulignement initial les regroupe sous une même liste sans changer une seule
 * adresse, ni un lien, ni un e-mail.
 *
 * Les suppressions de compte et d'établissement restent dehors
 * (`donnees_.supprimer-*`) : une confirmation destructrice se lit seule, en
 * pleine largeur.
 */
export const Route = createFileRoute('/app/_reglages')({
	component: Reglages,
	errorComponent: ReglagesEnErreur
});

/** L'erreur des réglages emporte leur volet droit : la section lirait le même établissement. */
function ReglagesEnErreur() {
	return <EcranReglages donnees={{ etat: 'erreur' }} detail={null} sectionOuverte={null} />;
}

/**
 * La section que l'adresse ouvre, lue sur le `routeId` de la FEUILLE.
 *
 * ⚠️ PAS `matchRoute` FLOU : c'est un préfixe, il ne distingue pas
 * `/app/parametres` de `/app/parametres/creancier`. Et une page qui remplace sa
 * section (le suivi de l'abonnement, l'export des données) garde sa section
 * allumée : `/app/_reglages/abonnement_/suivi` est de l'abonnement.
 *
 * `/app/_reglages/parametres` n'en nomme aucune : c'est la liste elle-même sur
 * un téléphone, et l'établissement par défaut en deux volets.
 */
function sectionDeLaFeuille(routeId: string | undefined): SectionReglages | null {
	const [, , , section, sousSection] = routeId?.split('/') ?? [];
	switch (section) {
		case 'parametres_':
			return sousSection === 'creancier' ? 'creancier' : 'etablissement';
		case 'abonnement':
		case 'abonnement_':
			return 'abonnement';
		case 'equipe':
		case 'equipe_':
			return 'equipe';
		case 'donnees':
		case 'donnees_':
			return 'donnees';
		default:
			return null;
	}
}

/**
 * Les réglages, branchés sur la base ; le dessin vit dans `screens/parametres/reglages.tsx`.
 *
 * ⚠️ LA PAGE ATTEND AUSSI LE PROFIL. La rangée du créancier en tire sa valeur :
 * rendue avant lui, elle montrait un tiret puis « SIREN manquant », à chaque
 * ouverture. L'attendre ne mène à aucune erreur : `monProfil` ne lève que sans
 * établissement, et la coquille `/app` renvoie vers `/bienvenue` avant d'ouvrir
 * une page.
 */
function Reglages() {
	const navigate = useNavigate();
	const org = useQuery(api.organizations.getMyOrg, {});
	const profil = useQuery(api.recouvrement.profil.monProfil, {});
	const { theme, setTheme } = useTheme();
	const feuille = useChildMatches({ select: (enfants) => enfants[enfants.length - 1]?.routeId });

	return (
		<EcranReglages
			detail={<Outlet />}
			sectionOuverte={sectionDeLaFeuille(feuille)}
			donnees={
				org === undefined || profil === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								org,
								profil,
								theme,
								onChoisirTheme: setTheme,
								onSeDeconnecter: () =>
									void authClient.signOut().then(() => navigate({ to: '/connexion' }))
							}
						}
			}
		/>
	);
}
