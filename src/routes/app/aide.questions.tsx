import { createFileRoute } from '@tanstack/react-router';
import { ARTICLES } from '../../lib/support/articles';
import { LIBELLES_DES_SUJETS, SUJETS } from '../../lib/support/sujets';
import { EcranQuestionsDAide } from '../../screens/aide';

export const Route = createFileRoute('/app/aide/questions')({ component: PageQuestions });

/** `/app/aide/questions` — toute la base d'aide, par sujet. */
function PageQuestions() {
	const sujets = SUJETS.map((sujet) => ({
		sujet: LIBELLES_DES_SUJETS[sujet],
		questions: ARTICLES.filter((a) => a.sujet === sujet).map((a) => ({ cle: a.cle, question: a.question }))
	})).filter((groupe) => groupe.questions.length > 0);
	return <EcranQuestionsDAide sujets={sujets} />;
}
