import { useState, type ReactNode } from 'react';
import {
	AccueilDePlume,
	BoutonDeReponse,
	CadreGuide,
	Echange,
	RangeeDeReponses,
	ReponseDePlume,
	messageDuRefus,
	type LigneConditionAffichee,
	type QuestionLitige,
	type ReponseFait
} from '../../ui';
import { RefusDuGeste, ReponsesDeFin, useAnnulation, type PropsDuFil } from './commun';

/**
 * « RÉPONDRE À MES QUESTIONS » — LES FAITS QUE LE GÉRANT SEUL PEUT DIRE, UN PAR UN
 * (22/10/2026).
 *
 * C'était la rangée « Vos réponses » : un questionnaire en carte, puis le tableau
 * « Ce que dit la loi, en face de votre dossier ». C'est désormais une conversation :
 * Plume pose chaque fait, Oui, Non ou Je ne sais pas, puis chaque condition à
 * confirmer, la loi et le dossier côte à côte.
 *
 * ⚠️ DES FAITS, PAS UNE APPRÉCIATION JURIDIQUE (ligne rouge n° 3). « Avez-vous reçu
 * une contestation écrite » se répond par oui ou par non ; le logiciel montre ce que
 * dit la loi et ce qu'il y a dans le dossier, le gérant répond.
 *
 * ⚠️ UNE PROPOSITION N'EST PAS UNE CASE COCHÉE. Quand le logiciel a lu une réponse
 * dans une pièce, Plume la cite avec sa source et sa date, et les trois réponses
 * gardent le même poids : rien n'est noté avant que le gérant ait répondu.
 *
 * ⚠️ LA LISTE VIENT DU SERVEUR, EN DIRECT. Une réponse peut en retirer d'autres (sans
 * contestation écrite, la question de sa date tombe) : la conversation pose toujours
 * la première de ce qui reste.
 */

/** Les faits et les conditions, tels que la page du dossier les lit en direct. */
export interface QuestionsDuGuide {
	readonly litige: {
		readonly litigieux: boolean;
		readonly constats: readonly string[];
		readonly questions: readonly QuestionLitige[];
	};
	readonly conditions: readonly LigneConditionAffichee[];
}

type Question =
	| { readonly genre: 'FAIT'; readonly cle: string; readonly fait: QuestionLitige }
	| { readonly genre: 'CONDITION'; readonly cle: string; readonly ligne: LigneConditionAffichee };

interface Repondue {
	readonly question: Question;
	readonly libelle: string;
}

const LIBELLE_FAIT: Readonly<Record<ReponseFait, string>> = {
	OUI: 'Oui',
	NON: 'Non',
	INCONNU: 'Je ne sais pas'
};

/** Les conditions que le gérant peut encore confirmer. */
function conditionsAConfirmer(conditions: readonly LigneConditionAffichee[]) {
	return conditions.filter((l) => l.repondable && l.etatReponse !== 'CONFIRMEE');
}

export function FilQuestions({
	dossier: d,
	gestes,
	titre,
	prelude,
	onFermer,
	onAutreChose,
	questions
}: PropsDuFil & { readonly questions: QuestionsDuGuide }) {
	const [repondues, setRepondues] = useState<readonly Repondue[]>([]);
	const [aModifier, setAModifier] = useState<string | null>(null);
	const [enCours, setEnCours] = useState(false);
	const [erreur, setErreur] = useState<string | null>(null);
	const annulation = useAnnulation();
	const [auDepart] = useState(
		() => questions.litige.questions.length + conditionsAConfirmer(questions.conditions).length
	);

	const dejaVues = new Set(repondues.map((r) => r.question.cle));
	const prochaine: Question | null = (() => {
		const modifiee = repondues.find((r) => r.question.cle === aModifier);
		if (modifiee !== undefined) return modifiee.question;
		const fait = questions.litige.questions.find((q) => !dejaVues.has(q.cle));
		if (fait !== undefined) return { genre: 'FAIT', cle: fait.cle, fait };
		const ligne = conditionsAConfirmer(questions.conditions).find(
			(l) => !dejaVues.has(l.condition)
		);
		return ligne === undefined ? null : { genre: 'CONDITION', cle: ligne.condition, ligne };
	})();

	function repondre(question: Question, libelle: string, geste: () => Promise<void>) {
		setEnCours(true);
		setErreur(null);
		geste().then(
			() => {
				setEnCours(false);
				setAModifier(null);
				setRepondues((avant) =>
					avant.some((r) => r.question.cle === question.cle)
						? avant.map((r) => (r.question.cle === question.cle ? { question, libelle } : r))
						: [...avant, { question, libelle }]
				);
			},
			(e: unknown) => {
				setEnCours(false);
				setErreur(messageDuRefus(e));
			}
		);
	}

	function enonce(question: Question): ReactNode {
		if (question.genre === 'FAIT') {
			const { fait } = question;
			return (
				<ReponseDePlume texte={fait.question}>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{fait.portee}</p>
					{fait.proposition === undefined ? null : (
						<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
							{`D’après ${fait.proposition.source}, je dirais « ${LIBELLE_FAIT[fait.proposition.reponse]} » (${fait.proposition.date}). Rien n’est noté tant que vous n’avez pas répondu.`}
						</p>
					)}
				</ReponseDePlume>
			);
		}
		const { ligne } = question;
		return (
			<ReponseDePlume texte={`${ligne.nom} : ${ligne.ceQueDitLaLoi} Est-ce le cas ?`}>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
					Dans votre dossier : {ligne.dansLeDossier}
				</p>
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-softer">{ligne.source}</p>
			</ReponseDePlume>
		);
	}

	function zone(): ReactNode {
		if (prochaine === null) {
			return (
				<ReponsesDeFin
					annulation={null}
					etat={annulation.etat}
					onAnnuler={annulation.annuler}
					onFermer={onFermer}
					onAutreChose={onAutreChose}
				/>
			);
		}
		if (prochaine.genre === 'FAIT') {
			return (
				<RangeeDeReponses>
					{(['NON', 'OUI', 'INCONNU'] as const).map((reponse) => (
						<BoutonDeReponse
							key={reponse}
							libelle={LIBELLE_FAIT[reponse]}
							desactive={enCours}
							onClick={() =>
								repondre(prochaine, LIBELLE_FAIT[reponse], () =>
									gestes.declarerFait(prochaine.cle, reponse)
								)
							}
						/>
					))}
				</RangeeDeReponses>
			);
		}
		return (
			<RangeeDeReponses>
				{(
					[
						['ko', 'Non'],
						['ok', 'Oui']
					] as const
				).map(([reponse, libelle]) => (
					<BoutonDeReponse
						key={reponse}
						libelle={libelle}
						desactive={enCours}
						onClick={() =>
							repondre(prochaine, libelle, () => gestes.repondreCondition(prochaine.cle, reponse))
						}
					/>
				))}
			</RangeeDeReponses>
		);
	}

	const restantes =
		questions.litige.questions.filter((q) => !dejaVues.has(q.cle)).length +
		conditionsAConfirmer(questions.conditions).filter((l) => !dejaVues.has(l.condition)).length;

	return (
		<CadreGuide
			titre={titre}
			sousTitre={d.client}
			onFermer={onFermer}
			etapes={{
				noms: ['Les faits', 'Ce que dit la loi', 'C’est noté'],
				courante: prochaine === null ? 3 : prochaine.genre === 'FAIT' ? 0 : 1
			}}
			suivi={`${prochaine?.cle ?? 'fin'}-${repondues.length}-${String(enCours)}`}
			reponses={zone()}
		>
			{prelude(enCours)}
			<ReponseDePlume
				texte={
					auDepart === 0
						? `Je n’ai aucune question en attente sur le dossier de ${d.client}.`
						: `${auDepart === 1 ? 'Un fait' : `${auDepart} faits`} que vous seul pouvez dire sur le dossier de ${d.client}. On y répond par oui ou par non : ce n’est pas une question de droit.`
				}
			/>
			{repondues
				.filter((r) => r.question.cle !== aModifier)
				.map((r) => (
					<Echange
						key={r.question.cle}
						question={enonce(r.question)}
						reponse={r.libelle}
						{...(enCours ? {} : { onModifier: () => setAModifier(r.question.cle) })}
					/>
				))}
			{prochaine === null ? null : enonce(prochaine)}
			{prochaine !== null && restantes > 1 && aModifier === null ? (
				<p className="px-1 text-center text-cladd-3xs text-cladd-fg-softer">
					Encore {restantes - 1} après celle-ci
				</p>
			) : null}
			<RefusDuGeste erreur={erreur} />
			{prochaine === null ? (
				<>
					{questions.litige.constats.length === 0 ? null : (
						<ReponseDePlume texte={questions.litige.constats.join(' ')} />
					)}
					<AccueilDePlume
						humeur="content"
						titre={
							auDepart === 0 ? 'Rien à répondre.' : 'C’est tout. Vos réponses sont au dossier.'
						}
					/>
				</>
			) : null}
		</CadreGuide>
	);
}
