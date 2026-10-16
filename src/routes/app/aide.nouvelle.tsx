import { createFileRoute, useRouterState } from '@tanstack/react-router';
import { FilAide } from '../../app/fil-aide';

export const Route = createFileRoute('/app/aide/nouvelle')({ component: PageNouvelle });

/**
 * `/app/aide/nouvelle` — UN FIL NEUF. La question tapée à l'accueil arrive par l'état de
 * la navigation, à relire sous la présentation qui dit qui lit.
 */
function PageNouvelle() {
	const question = useRouterState({
		select: (etat) => etat.location.state.questionPourLAide ?? ''
	});
	return <FilAide key={question} conversationId={null} questionInitiale={question} />;
}
