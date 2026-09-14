import { Button, Surface } from '@cladd-ui/react';
import {
	BoutonPrincipal,
	PageEcran,
	QuestionnaireLitige,
	SectionEcran,
	type Lecture,
	type QuestionLitige,
	type ReponseFait
} from '../../ui';

/** Une condition légale que le logiciel n'a pas pu déduire, à confirmer par le gérant. */
export interface ConditionAConfirmer {
	readonly condition: string;
	readonly libelle: string;
}

/** Ce que l'écran affiche : le débiteur, le questionnaire de litige, et les conditions légales restées indéterminées. */
export interface LitigeDeLaCreance {
	readonly debiteur: string;
	readonly questions: readonly QuestionLitige[];
	readonly constats: readonly string[];
	readonly litigieux: boolean;
	readonly conditions: readonly ConditionAConfirmer[];
	readonly enCours: boolean;
	readonly erreur: string | null;
	readonly onDeclarer: (cle: string, reponse: ReponseFait) => void;
	readonly onRepondre: (condition: string, reponse: 'ok' | 'ko') => void;
}

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
export function EcranLitige({
	identifiant,
	donnees
}: {
	identifiant: string;
	donnees: Lecture<LitigeDeLaCreance>;
}) {
	const pret = donnees.etat === 'pret' ? donnees.valeur : null;

	return (
		<PageEcran
			entete={{
				genre: 'poussee',
				retour: {
					vers: '/app/creance/$id',
					parametres: { id: identifiant },
					libelle: pret?.debiteur ?? 'Créance'
				},
				titre: 'Ce que vous seul pouvez dire',
				sousTitre: 'Des faits, pas une appréciation juridique.'
			}}
			etat={donnees.etat}
		>
			{pret === null ? null : (
				<>
					<QuestionnaireLitige
						questions={pret.questions}
						constats={pret.constats}
						litigieux={pret.litigieux}
						enCours={pret.enCours}
						onRepondre={pret.onDeclarer}
					/>

					{/* Les conditions légales restées indéterminées. Même sujet — ce
					    que le gérant est seul à savoir — donc même page. */}
					{pret.conditions.length > 0 ? (
						<SectionEcran titre="Ce que le logiciel ne peut pas déduire">
							<div className="flex flex-col gap-cladd-3xs">
								{pret.conditions.map((question) => (
									<Surface
										key={question.condition}
										variant="transparent"
										outline={false}
										className="verre-carte rounded-cladd-xl"
										contentClassName="flex flex-col gap-cladd-3xs p-cladd-2xs"
									>
										<p className="text-cladd-sm leading-snug text-balance">{question.libelle}</p>
										<div className="flex flex-wrap gap-cladd-3xs">
											<BoutonPrincipal onClick={() => pret.onRepondre(question.condition, 'ok')}>
												Oui
											</BoutonPrincipal>
											<Button
												size="lg"
												variant="transparent"
												outline={false}
												hoverable={false}
												rounded
												className="verre verre-bouton font-medium"
												onClick={() => pret.onRepondre(question.condition, 'ko')}
											>
												Non
											</Button>
										</div>
									</Surface>
								))}
							</div>
						</SectionEcran>
					) : null}

					{pret.erreur ? <p className="text-cladd-xs text-cladd-fg">{pret.erreur}</p> : null}
				</>
			)}
		</PageEcran>
	);
}
