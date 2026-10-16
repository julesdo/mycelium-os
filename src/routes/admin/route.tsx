import { useEffect } from 'react';
import { Outlet, createFileRoute, Link, Navigate } from '@tanstack/react-router';
import { useConvexAuth, useMutation } from 'convex/react';
import { KeyRoundIcon, LockIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import { useQuery } from '../../app/donnees';
import { CoquilleAdmin, FournisseurDuRole } from '../../app/coquille-admin';
import { BoutonPrincipal, PageEcran } from '../../ui';
import { PageDeRefus } from '../../ui/admin';

/**
 * L'ADMIN DE LETIKETTE, ET SA PORTE (16/10/2026).
 *
 * La garde lit `monAcces` : hors de l'équipe, une page sobre « Réservé à l'équipe de
 * Letikette » ; la double authentification manquante, une page qui mène à la rangée
 * « Sécurité » du compte. La porte n'est qu'une politesse : chaque requête de l'admin
 * repasse par l'enveloppe du serveur (`equipeQuery`, `equipeMutation`), qui refuse
 * d'elle-même.
 *
 * Les routes `/admin/*` sont découpées à part : rien de l'admin n'entre dans le
 * paquet de l'application.
 */
export const Route = createFileRoute('/admin')({
	component: LayoutAdmin
});

function LayoutAdmin() {
	const { isLoading, isAuthenticated } = useConvexAuth();
	const acces = useQuery(api.admin.acces.monAcces, isAuthenticated ? {} : 'skip');
	const noterArrivee = useMutation(api.admin.acces.noterArrivee);
	const premiereVenue = acces?.etat === 'OK' && acces.arrive === false;

	// La première venue d'un invité s'inscrit : son invitation passe de « en attente » à
	// membre. Une écriture vers le serveur, pas un état local.
	useEffect(() => {
		if (premiereVenue) void noterArrivee({});
	}, [premiereVenue, noterArrivee]);

	if (!isLoading && !isAuthenticated) {
		return <Navigate to="/connexion" search={{ suite: '/admin' }} replace />;
	}

	const role = acces?.etat === 'OK' && acces.role !== undefined ? acces.role : null;

	return (
		<CoquilleAdmin role={role}>
			{acces === undefined ? (
				<PageEcran entete={{ genre: 'aucun', titre: 'Admin' }} etat="attente" />
			) : acces.etat === 'OK' && role !== null ? (
				<FournisseurDuRole value={role}>
					<Outlet />
				</FournisseurDuRole>
			) : acces.etat === 'DOUBLE_AUTH_REQUISE' ? (
				<PageDeRefus
					icone={<KeyRoundIcon />}
					titre="Activez la double authentification"
					texte="L’admin montre les comptes de tous les clients : il ne s’ouvre qu’avec un code à usage unique en plus du mot de passe. Activez-la dans votre compte, puis revenez ici."
					action={
						<BoutonPrincipal as={Link} to="/app/compte" search={{ ouvrir: 'securite' } as never}>
							L’activer
						</BoutonPrincipal>
					}
				/>
			) : (
				<PageDeRefus
					icone={<LockIcon />}
					titre="Réservé à l’équipe de Letikette"
					texte="Cet espace sert à l’équipe qui fait tourner Letikette. Votre établissement vous attend dans l’application."
					action={
						<BoutonPrincipal as={Link} to="/app">
							Ouvrir l’application
						</BoutonPrincipal>
					}
				/>
			)}
		</CoquilleAdmin>
	);
}
