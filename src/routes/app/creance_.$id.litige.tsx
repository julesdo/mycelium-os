import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import type { ReponseFait } from '../../ui';
import { EcranLitige } from '../../screens/analyses/litige';

export const Route = createFileRoute('/app/creance_/$id/litige')({
	component: PageLitige,
	errorComponent: LitigeEnErreur
});

function LitigeEnErreur() {
	const { id } = Route.useParams();
	return <EcranLitige identifiant={id} donnees={{ etat: 'erreur' }} />;
}

/**
 * Branchée sur la base ; le dessin vit dans `screens/analyses/litige.tsx`.
 */
function PageLitige() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;

	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });
	const declarerFait = useMutation(api.recouvrement.creances.declarerFait);
	const repondre = useMutation(api.recouvrement.creances.repondre);

	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);

	async function declarer(cle: string, reponse: ReponseFait) {
		setErreur(null);
		setEnCours(true);
		try {
			await declarerFait({ creanceId, cle: cle as 'CONTESTATION_ECRITE', reponse });
		} catch (e) {
			setErreur(e instanceof Error ? e.message : 'Déclaration refusée.');
		} finally {
			setEnCours(false);
		}
	}

	return (
		<EcranLitige
			identifiant={id}
			donnees={
				creance === undefined
					? { etat: 'attente' }
					: {
							etat: 'pret',
							valeur: {
								debiteur: creance.debiteur,
								questions: creance.litige.questions,
								constats: creance.litige.constats,
								litigieux: creance.litige.litigieux,
								conditions: creance.questions,
								enCours,
								erreur,
								onDeclarer: (cle, reponse) => void declarer(cle, reponse),
								onRepondre: (condition, reponse) =>
									void repondre({ creanceId, reponses: { [condition]: reponse } })
							}
						}
			}
		/>
	);
}
