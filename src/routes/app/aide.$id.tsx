import { createFileRoute } from '@tanstack/react-router';
import { FilAide } from '../../app/fil-aide';
import type { Id } from '../../lib/convex/_generated/dataModel';

export const Route = createFileRoute('/app/aide/$id')({ component: PageConversationAide });

/** `/app/aide/<id>` — une conversation avec Plume, puis l'équipe, dans le même fil. */
function PageConversationAide() {
	const { id } = Route.useParams();
	return <FilAide key={id} conversationId={id as Id<'conversationsSupport'>} questionInitiale="" />;
}
