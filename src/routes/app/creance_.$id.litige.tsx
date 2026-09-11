import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useMutation } from 'convex/react';
import { Button, Surface } from '@cladd-ui/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import {
	BoutonPrincipal,
	EnteteDetail,
	Page,
	PageBody,
	QuestionnaireLitige,
	SectionEcran,
	type ReponseFait
} from '../../ui';

export const Route = createFileRoute('/app/creance_/$id/litige')({ component: PageLitige });

/**
 * CE QUE VOUS SEUL POUVEZ DIRE — le questionnaire, sur sa propre page.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ C'EST L'ANALYSE QUI MÉRITAIT LE PLUS UNE PAGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle POSE UNE QUESTION. Une question glissée au milieu de six autres cartes
 * se lit en diagonale et se répond au hasard — et ces réponses-là décident si
 * une procédure s'ouvre. Seule sur un écran, avec la portée sous la question,
 * elle se lit.
 *
 * On y a joint les conditions légales que le logiciel n'a pas pu déduire :
 * elles relèvent de la même chose — ce que le gérant est seul à savoir — et
 * les séparer faisait deux cartes pour un seul sujet.
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
		<Page>
			<EnteteDetail
				retourVers="/app/creance/$id"
				retourParametres={{ id }}
				retourLibelle={creance?.debiteur ?? 'Créance'}
				titre="Ce que vous seul pouvez dire"
				sousTitre="Des faits, pas une appréciation juridique."
			/>
			<PageBody>
				<div className="mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs">
					{creance === undefined ? (
						<p className="sr-only">Chargement…</p>
					) : (
						<>
							<QuestionnaireLitige
								questions={creance.litige.questions}
								constats={creance.litige.constats}
								litigieux={creance.litige.litigieux}
								enCours={enCours}
								onRepondre={(cle, reponse) => void declarer(cle, reponse)}
							/>

							{/* Les conditions légales restées indéterminées. Même sujet — ce
							    que le gérant est seul à savoir — donc même page. */}
							{creance.questions.length > 0 ? (
								<SectionEcran titre="Ce que le logiciel ne peut pas déduire">
									<div className="flex flex-col gap-cladd-3xs">
										{creance.questions.map((question) => (
											<Surface
												key={question.condition}
												variant="transparent"
												outline={false}
												className="verre-carte rounded-cladd-xl"
												contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
											>
												<p className="text-cladd-sm leading-snug text-balance">
													{question.libelle}
												</p>
												<div className="flex flex-wrap gap-cladd-3xs">
													<BoutonPrincipal
														onClick={() =>
															void repondre({
																creanceId,
																reponses: { [question.condition]: 'ok' }
															})
														}
													>
														Oui
													</BoutonPrincipal>
													<Button
														size="lg"
														variant="transparent"
														outline={false}
														hoverable={false}
														rounded
														className="verre verre-bouton font-medium"
														onClick={() =>
															void repondre({
																creanceId,
																reponses: { [question.condition]: 'ko' }
															})
														}
													>
														Non
													</Button>
												</div>
											</Surface>
										))}
									</div>
								</SectionEcran>
							) : null}

							{erreur ? <p className="text-cladd-xs text-cladd-fg">{erreur}</p> : null}
						</>
					)}
				</div>
			</PageBody>
		</Page>
	);
}
