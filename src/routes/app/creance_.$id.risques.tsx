import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Surface } from '@cladd-ui/react';
import { AlertTriangleIcon } from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EnteteDetail, Page, PageBody } from '../../ui';

export const Route = createFileRoute('/app/creance_/$id/risques')({ component: PageRisques });

/**
 * CE QUI AFFAIBLIT CE DOSSIER.
 *
 * ⚠️ CHAQUE RISQUE EST UN CONSTAT, JAMAIS UNE CONSÉQUENCE JURIDIQUE. « Le
 * débiteur fait l'objet d'une procédure collective » est un fait relevé au
 * registre ; ce qu'il faudrait en faire n'a été validé par personne, et le
 * produit ne l'écrit pas.
 *
 * ⚠️ ET UN RISQUE BLOQUANT LE DIT. Une contestation, même infondée, met fin à
 * une procédure simplifiée : le dossier peut être parfait par ailleurs, il ne
 * passera pas. Le noyer parmi les autres reviendrait à le taire.
 */
function PageRisques() {
	const { id } = Route.useParams();
	const creanceId = id as Id<'creances'>;
	const creance = useQuery(api.recouvrement.lecture.creanceComplete, { creanceId });

	return (
		<Page>
			<EnteteDetail
				retourVers="/app/creance/$id"
				retourParametres={{ id }}
				retourLibelle={creance?.debiteur ?? 'Créance'}
				titre="Ce qui affaiblit ce dossier"
				sousTitre={creance === undefined ? undefined : `${creance.risques.length} relevé(s)`}
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-3xs">
					{creance === undefined ? (
						<p className="sr-only">Chargement…</p>
					) : creance.risques.length === 0 ? (
						<Surface
							variant="transparent"
							outline={false}
							className="verre-carte rounded-cladd-xl"
							contentClassName="p-cladd-2xs"
						>
							<p className="text-cladd-sm text-cladd-fg-soft">
								Rien de relevé sur ce dossier. Ce n’est pas une absence de risque : c’est une
								absence de risque CONNU.
							</p>
						</Surface>
					) : (
						creance.risques.map((risque) => (
							<Surface
								key={risque.type}
								variant="transparent"
								outline={false}
								className="verre-carte rounded-cladd-xl"
								contentClassName="flex gap-cladd-3xs p-cladd-2xs"
							>
								<AlertTriangleIcon
									className="mt-0.5 size-4 shrink-0 text-cladd-fg-soft"
									aria-hidden
								/>
								<div className="flex min-w-0 flex-col gap-1">
									<p className="text-cladd-sm leading-snug">{risque.description}</p>
									{risque.gravite === 'BLOQUANTE' ? (
										<p className="text-cladd-2xs text-cladd-fg-soft">
											Ce constat ferme les procédures que ce logiciel évalue : elles se déroulent
											toutes sans débat contradictoire.
										</p>
									) : null}
								</div>
							</Surface>
						))
					)}
				</div>
			</PageBody>
		</Page>
	);
}
