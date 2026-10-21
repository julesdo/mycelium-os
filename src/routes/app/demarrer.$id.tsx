import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranDemarrage } from '../../screens/demarrage';
import { aujourdHuiISO, PageEcran } from '../../ui';
import { suivre } from '../../app/analytique';
import { nomDeLaFormuleEnCours, useFormuleDuCompte } from '../../app/formule-du-compte';
import { auDelaDeLaLimite, formuleQuiSuit, monteeVers } from '../../screens/compte/montee';

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
	const compte = useFormuleDuCompte();

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

	/*
	  AU-DELÀ DE CE QUE LA FORMULE SUIT (moment 6) : un client hors pilote, en procédure
	  collective ou dont le dossier est déjà démarré ne compte pas de plus.
	*/
	const nouveaux =
		prepare.client.horsPilote ||
		prepare.client.suspendu ||
		(prepare.dossier !== null && !prepare.dossier.aDemarrer)
			? 0
			: 1;
	const suivi =
		compte === undefined
			? undefined
			: {
					auDela: auDelaDeLaLimite(compte.abonnement, nouveaux),
					montee: monteeVers(compte, formuleQuiSuit(compte.abonnement.clientsSuivis + nouveaux)),
					suivis: compte.abonnement.clientsSuivis,
					formuleActuelle: nomDeLaFormuleEnCours(compte),
					...(compte.caisse === undefined
						? {}
						: { onFormuleEnPlace: compte.caisse.onFermerLaReussite })
				};

	return (
		<EcranDemarrage
			{...(suivi === undefined ? {} : { suivi })}
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
					suivre('dossier-demarre');
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
