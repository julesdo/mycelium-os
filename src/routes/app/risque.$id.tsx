import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAction, useMutation } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { precharger } from '../../app/prechargement';
import { messageDeRefus } from '../../app/televerser';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranSanteClient, messageDeLIssue } from '../../screens/sante';
import { retourDuQuota } from '../../screens/compte/montee';
import { useMonteeDesAnalyses } from '../../app/montee-des-analyses';
import { useRemarquesDePlume } from '../../app/parole-de-plume';
import { remarquesDeLEcran } from '../../lib/verticales/recouvrement/compagnon/presence';
import { NOM_DU_PILOTE } from '../../ui';

/**
 * `/app/risque/$id` — LA SANTÉ D'UN CLIENT : sa jauge, son bulletin, les faits,
 * ses dirigeants, ses comptes, votre exposition. Voir `screens/sante.tsx`.
 */
export const Route = createFileRoute('/app/risque/$id')({
	loader: ({ params }) => {
		precharger(api.risque.donnees.risqueDuClient, { debiteurId: params.id as Id<'debiteurs'> });
	},
	component: PageSanteDuClient,
	errorComponent: SanteDuClientEnErreur
});

const ENTETE = {
	genre: 'poussee',
	retour: { vers: '/app/risque', libelle: 'La santé de vos clients' },
	titre: 'Sa santé'
} as const;

function SanteDuClientEnErreur() {
	return <EcranSanteClient entete={ENTETE} donnees={{ etat: 'erreur' }} />;
}

function PageSanteDuClient() {
	// Plume se présente ici, la première fois (13/10/2026).
	useRemarquesDePlume('SANTE_CLIENT', remarquesDeLEcran('SANTE_CLIENT', NOM_DU_PILOTE));
	const { id } = Route.useParams();
	const debiteurId = id as Id<'debiteurs'>;
	const navigate = useNavigate();
	const donnees = useQuery(api.risque.donnees.risqueDuClient, { debiteurId });
	const dossiers = useQuery(api.recouvrement.lecture.indexDossiers, {});
	const analyser = useAction(api.risque.analyse.analyserClient);
	const fixerPlafond = useMutation(api.risque.donnees.fixerPlafond);
	const [enCours, setEnCours] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const quota = useMonteeDesAnalyses(`Analyser ${donnees?.denomination ?? 'ce client'}`, () =>
		lancerLAnalyse()
	);

	function lancerLAnalyse() {
		if (enCours) return;
		setEnCours(true);
		setMessage(null);
		analyser({ debiteurId })
			.then(({ etat }) => {
				setMessage(messageDeLIssue(etat, retourDuQuota(Date.now())));
				// Le quota du mois est atteint : la formule du dessus, au moment du besoin.
				if (etat === 'BUDGET') quota.proposer();
			})
			.catch((e: unknown) => setMessage(messageDeRefus(e)))
			.finally(() => setEnCours(false));
	}

	const entete = {
		...ENTETE,
		retour: {
			vers: '/app/clients/$id',
			parametres: { id },
			libelle: donnees?.denomination ?? 'Le client'
		}
	} as const;

	if (donnees === undefined)
		return <EcranSanteClient entete={entete} donnees={{ etat: 'attente' }} />;

	// Un dossier ouvert : Plume y connaît la santé du client et tout le reste.
	const dossier = dossiers?.find((d) => d.debiteurId === id && d.etape !== 'REGLE');
	const question = `Que dit l’analyse de santé de ${donnees.denomination} ?`;

	return (
		<>
			<EcranSanteClient
				entete={entete}
				donnees={{
					etat: 'pret',
					valeur: {
						mode: 'CLIENT',
						denomination: donnees.denomination,
						siren: donnees.siren,
						disponible: donnees.disponible,
						analyse: donnees.analyse,
						encours: donnees.encours,
						plafond: donnees.plafond,
						enCours,
						message,
						onAnalyser: lancerLAnalyse,
						onFixerPlafond: async (plafond) => {
							try {
								await fixerPlafond({ debiteurId, plafond });
								return true;
							} catch (e) {
								setMessage(messageDeRefus(e));
								return false;
							}
						},
						onDemanderAPlume: () =>
							void (dossier === undefined
								? navigate({
										to: '/app/pilote',
										search: { question, depuis: 'SANTE_CLIENT', client: id }
									})
								: navigate({
										to: '/app/pilote/$id',
										params: { id: dossier._id },
										search: { question }
									})),
						onOuvrirLaFiche: () => void navigate({ to: '/app/clients/$id', params: { id } })
					}
				}}
			/>
			{quota.feuille}
		</>
	);
}
