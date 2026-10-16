import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { ecranDuFil } from '../../app/aide';
import { ARTICLES } from '../../lib/support/articles';
import { EcranQuestionDAide } from '../../screens/aide';
import { useProvenance } from '../../ui';

export const Route = createFileRoute('/app/aide/question/$cle')({ component: PageQuestion });

/** `/app/aide/question/<clé>` — une réponse de la base d'aide, tout de suite. */
function PageQuestion() {
	const { cle } = Route.useParams();
	const navigate = useNavigate();
	const provenance = useProvenance();
	const article = ARTICLES.find((a) => a.cle === cle);
	if (article === undefined) return <EcranQuestionDAide donnees={{ etat: 'erreur' }} />;
	const ecran = article.ecran === undefined ? null : ecranDuFil(article.ecran);
	return (
		<EcranQuestionDAide
			donnees={{
				etat: 'pret',
				valeur: {
					question: article.question,
					reponse: article.reponse,
					...(ecran === null ? {} : { ecran }),
					onDemander: () =>
						void navigate({ to: '/app/aide/nouvelle', state: { ...provenance, questionPourLAide: '' } })
				}
			}}
		/>
	);
}
