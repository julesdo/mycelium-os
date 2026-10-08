import { useEffect, useRef, type ReactNode } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import {
	AccueilDePlume,
	BulleDuGerant,
	Composeur,
	EnteteDetail,
	NOM_DU_PILOTE,
	PageConversation,
	RefusEnQuatreParties,
	ReponseDePlume,
	SuggestionsAPlume,
	TravailDePlume,
	type EtapeDeTravail,
	type HumeurPlume,
	type PhraseAffichee,
	type RefusAffiche
} from '../ui';

/**
 * PARLER À PLUME — l'écran de la conversation, plein écran (08/10/2026).
 *
 * ⚠️ TOUT ARRIVE EN PROPRIÉTÉS. L'écran ne parle à aucune fonction Convex : la
 * salle d'exposition le rend avec des données inventées, aux quatre largeurs.
 *
 * Deux portées, un seul écran :
 *   · un DOSSIER (`/app/pilote/$id`) — la conversation bornée à ce dossier, qui
 *     cite ses sources et propose des gestes ;
 *   · l'ÉTABLISSEMENT (`/app/pilote`) — ce que Plume a fait et fait, et une
 *     question qui mène au dossier dont on parle.
 */

export type MessageAffiche =
	| { readonly genre: 'GERANT'; readonly id: string; readonly texte: string }
	| {
			readonly genre: 'PLUME';
			readonly id: string;
			readonly phrases?: readonly PhraseAffichee[];
			readonly texte?: string;
			readonly humeur?: HumeurPlume;
			/** Ce qui suit la réponse : les gestes proposés, une liste de dossiers. */
			readonly suite?: ReactNode;
	  };

export interface ConversationPiloteAffichee {
	readonly titre: string;
	readonly sousTitre?: string;
	readonly retour: {
		readonly vers: LinkProps['to'];
		readonly parametres?: LinkProps['params'];
		readonly libelle: string;
	};
	/** Ce qui s'affiche tant que rien n'a été dit, sous Plume en grand. */
	readonly accueil: { readonly titre: string; readonly sousTitre?: ReactNode; readonly contenu?: ReactNode };
	/** Ce qui se dit avant même la première question : le relevé de Plume, sur l'établissement. */
	readonly preambule?: readonly MessageAffiche[];
	readonly messages: readonly MessageAffiche[];
	/** Les étapes de ce que Plume fait en ce moment, ou `null` quand il ne fait rien. */
	readonly travail: readonly EtapeDeTravail[] | null;
	/** Ce que fait ce travail, quand ce n'est pas une réponse : « Relit votre dépôt ». */
	readonly titreDuTravail?: string;
	/** Le refus du dernier échange, ou celui du plafond : il prend la place du compositeur. */
	readonly refus: RefusAffiche | null;
	/** Une panne de transport : la question n'a pas abouti, elle peut être reposée. */
	readonly panne: string | null;
	readonly avertissement: string | null;
	readonly suggestions: readonly string[];
	readonly question: string;
	readonly onQuestion: (question: string) => void;
	readonly onEnvoyer: () => void;
	readonly enCours: boolean;
	readonly placeholder: string;
	/** Vrai quand la conversation libre est arrêtée pour le mois : le compositeur disparaît. */
	readonly arretee: boolean;
	/** L'humeur de Plume dans l'accueil. */
	readonly humeur: HumeurPlume;
}

function Message({ message }: { readonly message: MessageAffiche }) {
	if (message.genre === 'GERANT') return <BulleDuGerant texte={message.texte} />;
	return (
		<ReponseDePlume
			{...(message.phrases === undefined ? {} : { phrases: message.phrases })}
			{...(message.texte === undefined ? {} : { texte: message.texte })}
			humeur={message.humeur ?? 'repos'}
		>
			{message.suite}
		</ReponseDePlume>
	);
}

export function EcranConversationPilote({ fil }: { readonly fil: ConversationPiloteAffichee }) {
	const fin = useRef<HTMLDivElement>(null);
	const rien = fil.messages.length === 0;

	/*
	  ⚠️ LE FIL DESCEND TOUT SEUL VERS CE QUI ARRIVE : une question posée, une étape
	  qui se coche, une réponse. C'est une synchronisation avec le DOM, pas un état :
	  aucun `setState` ici.
	*/
	const etapesFaites = fil.travail?.filter((e) => e.etat === 'faite').length ?? -1;
	useEffect(() => {
		fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
	}, [fil.messages.length, etapesFaites, fil.refus]);

	return (
		<PageConversation
			entete={
				<EnteteDetail
					retourVers={fil.retour.vers}
					{...(fil.retour.parametres === undefined
						? {}
						: { retourParametres: fil.retour.parametres })}
					retourLibelle={fil.retour.libelle}
					donneesPretes
					titre={fil.titre}
					{...(fil.sousTitre === undefined ? {} : { sousTitre: fil.sousTitre })}
				/>
			}
			composeur={
				fil.arretee ? null : (
					<Composeur
						valeur={fil.question}
						onChange={fil.onQuestion}
						onEnvoyer={fil.onEnvoyer}
						enCours={fil.enCours}
						placeholder={fil.placeholder}
						dessus={
							fil.enCours || fil.question.trim() !== '' ? null : (
								<SuggestionsAPlume suggestions={fil.suggestions} onChoisir={fil.onQuestion} />
							)
						}
					/>
				)
			}
		>
			{rien ? (
				<AccueilDePlume
					humeur={fil.humeur}
					titre={fil.accueil.titre}
					{...(fil.accueil.sousTitre === undefined ? {} : { sousTitre: fil.accueil.sousTitre })}
				>
					{fil.accueil.contenu}
				</AccueilDePlume>
			) : null}

			{(fil.preambule ?? []).map((message) => (
				<Message key={message.id} message={message} />
			))}

			{fil.avertissement === null ? null : (
				<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">{fil.avertissement}</p>
			)}

			{fil.messages.map((message) => (
				<Message key={message.id} message={message} />
			))}

			{fil.travail === null ? null : (
				<TravailDePlume
					etapes={fil.travail}
					{...(fil.titreDuTravail === undefined ? {} : { titre: fil.titreDuTravail })}
				/>
			)}

			{fil.panne === null ? null : (
				<ReponseDePlume humeur="attention" texte={`${fil.panne} Le dossier, lui, n’a pas changé : vous pouvez reposer la question.`} />
			)}

			{fil.refus === null ? null : (
				<ReponseDePlume humeur="attention">
					<RefusEnQuatreParties
						peutFaire={fil.refus.peutFaire}
						constat={fil.refus.constat}
						blocages={fil.refus.blocages}
						coutDeLAttente={fil.refus.coutDeLAttente}
					/>
				</ReponseDePlume>
			)}

			{fil.arretee ? (
				<p className="text-center text-cladd-2xs text-cladd-fg-softer">
					La conversation libre avec {NOM_DU_PILOTE} reprend le mois prochain.
				</p>
			) : null}
			<div ref={fin} aria-hidden />
		</PageConversation>
	);
}
