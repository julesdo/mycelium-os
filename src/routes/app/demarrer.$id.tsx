import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranDemarrage } from '../../screens/demarrage';
import { aujourdHuiISO, PageEcran } from '../../ui';

/**
 * `/app/demarrer/$id` — DÉMARRER LE DOSSIER D'UN CLIENT, AVEC PLUME.
 *
 * `$id` est le CLIENT : son dossier préparé par Plume s'y démarre, ou un dossier
 * neuf s'y ouvre. C'est le même parcours depuis la page d'un dossier préparé, la
 * fiche d'un client (« Lancer un dossier ») et la liste des dossiers à démarrer.
 */
export const Route = createFileRoute('/app/demarrer/$id')({
	component: DemarrerUnDossier
});

function DemarrerUnDossier() {
	const { id } = Route.useParams();
	const debiteurId = id as Id<'debiteurs'>;
	const navigate = useNavigate();
	const prepare = useQuery(api.recouvrement.demarrage.preparer, { debiteurId });
	const demarrer = useMutation(api.recouvrement.demarrage.demarrer);

	if (prepare === undefined || prepare === null) {
		return (
			<PageEcran
				entete={{
					genre: 'poussee',
					retour: { vers: '/app/clients/$id', parametres: { id }, libelle: 'Client' },
					titre: 'Démarrer le dossier'
				}}
				etat={prepare === undefined ? 'attente' : 'erreur'}
			/>
		);
	}

	return (
		<EcranDemarrage
			demarrage={{
				client: prepare.client.denomination,
				emailClient: prepare.client.email,
				emailReponses: prepare.creancier.emailReponses,
				suspendu: prepare.client.suspendu,
				horsPilote: prepare.client.horsPilote,
				factures: prepare.factures.map((f) => ({
					id: f.id,
					reference: f.reference,
					resteDu: f.resteDu,
					echeance: f.echeance
				})),
				envoiAutomatique: prepare.envoiAutomatique,
				aujourdHui: aujourdHuiISO(),
				retour:
					prepare.dossier === null
						? { vers: '/app/clients/$id', parametres: { id }, libelle: prepare.client.denomination }
						: {
								vers: '/app/dossier/$id',
								parametres: { id: prepare.dossier.creanceId },
								libelle: prepare.client.denomination
							},
				onDemarrer: async (reponses) => {
					const resultat = await demarrer({
						debiteurId,
						factureIds: reponses.factureIds.map((f) => f as Id<'facturesVente'>),
						...(reponses.email === undefined ? {} : { email: reponses.email }),
						...(reponses.emailReponses === undefined
							? {}
							: { emailReponses: reponses.emailReponses }),
						contestation: reponses.contestation,
						avoir: reponses.avoir,
						...(reponses.promesse === undefined ? {} : { promesse: reponses.promesse })
					});
					return { creanceId: resultat.creanceId, prochaine: resultat.prochaine };
				},
				onVoirDossier: (creanceId) =>
					void navigate({ to: '/app/dossier/$id', params: { id: creanceId } }),
				onParlerAPlume: (creanceId) =>
					void navigate({ to: '/app/pilote/$id', params: { id: creanceId } }),
				onRevenir: () => void navigate({ to: '/app/clients/$id', params: { id } })
			}}
		/>
	);
}
