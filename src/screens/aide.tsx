import { useEffect, useRef, type FormEvent, type ReactNode } from 'react';
import type { LinkProps } from '@tanstack/react-router';
import { SearchField } from '@cladd-ui/react';
import { MessageCircleQuestionIcon, UsersIcon } from 'lucide-react';
import {
	BoutonPrincipal,
	BoutonSecondaire,
	BoutonTexte,
	BulleDuGerant,
	CarteLien,
	Composeur,
	EnTeteDeGroupe,
	EnteteDetail,
	ListeDeCartes,
	PageConversation,
	PageEcran,
	PointsDeSuspension,
	ReponseDePlume,
	type Lecture,
	type PhraseAffichee
} from '../ui';
import {
	AvisApresLEquipe,
	CarteTransmise,
	CarteVersUnEcran,
	EquipeDuSupport,
	LegendeDuMessage,
	LigneDuFil,
	MessageDeLEquipe,
	MessageRetire,
	NoteDeMasquage,
	PresentationDuFil,
	QuestionDeSatisfaction,
	type AuteurAffiche,
	type MembreDuSupport
} from '../ui/aide';
import { VignetteIcone } from '../ui/familles';

/**
 * L'AIDE — l'accueil, une réponse de la base d'aide, et le fil (16/10/2026,
 * `docs/superpowers/specs/2026-10-16-service-client.md` § 3).
 *
 * ⚠️ TOUT ARRIVE EN PROPRIÉTÉS : la salle d'exposition rend ces écrans sans serveur.
 */

const RETOUR_COMPTE = { vers: '/app/compte', libelle: 'Compte' } as const;

export interface CarteDeConversationAffichee {
	readonly id: string;
	readonly titre: string;
	/** « Camille vous a répondu », « Transmis à l'équipe · réponse attendue avant 17 h ». */
	readonly ligne: string;
	readonly date: string;
	/** L'équipe a répondu, non lu : la pastille des questions. */
	readonly attention: boolean;
}

export interface QuestionAffichee {
	readonly cle: string;
	readonly question: string;
}

export interface AideAffichee {
	readonly recherche: string;
	readonly onRecherche: (texte: string) => void;
	/** Entrée, ou « Demander » : la question part dans un fil neuf, à relire. */
	readonly onDemander: () => void;
	/** Les questions de la base d'aide qui répondent à ce qui se tape. */
	readonly resultats: readonly QuestionAffichee[];
	/** « Ce mois-ci, vos questions vont directement à l'équipe », dit AVANT la saisie. */
	readonly avantLaSaisie?: string;
	readonly enCours: readonly CarteDeConversationAffichee[];
	readonly questions: readonly QuestionAffichee[];
	readonly equipe: {
		readonly membres: readonly MembreDuSupport[];
		readonly horaires: string;
		readonly attendue: string;
		readonly absence?: string;
		readonly adresse?: string;
	};
	readonly terminees: readonly CarteDeConversationAffichee[];
	readonly toutLHistorique: boolean;
	readonly onToutLHistorique: () => void;
}

const ID_FORMULAIRE = 'aide-demander';

function CartesDeConversations({ cartes }: { readonly cartes: readonly CarteDeConversationAffichee[] }) {
	return (
		<ListeDeCartes>
			{cartes.map((carte) => (
				<CarteLien
					key={carte.id}
					vers="/app/aide/$id"
					parametres={{ id: carte.id }}
					titre={carte.titre}
					ligne={carte.ligne}
					date={carte.date}
					attention={carte.attention}
					famille={carte.attention ? 'QUESTION' : 'MACHINE'}
					icone={<VignetteIcone icone={<MessageCircleQuestionIcon aria-hidden />} />}
				/>
			))}
		</ListeDeCartes>
	);
}

function CartesDeQuestions({ questions }: { readonly questions: readonly QuestionAffichee[] }) {
	return (
		<ListeDeCartes>
			{questions.map((q) => (
				<CarteLien
					key={q.cle}
					vers="/app/aide/question/$cle"
					parametres={{ cle: q.cle }}
					titre={q.question}
					icone={<VignetteIcone icone={<MessageCircleQuestionIcon aria-hidden />} />}
				/>
			))}
		</ListeDeCartes>
	);
}

export function EcranAide({ donnees }: { readonly donnees: Lecture<AideAffichee> }) {
	const entete = { genre: 'poussee', retour: RETOUR_COMPTE, titre: 'Aide' } as const;
	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;
	const aide = donnees.valeur;
	const soumettre = (evenement: FormEvent) => {
		evenement.preventDefault();
		if (aide.recherche.trim() !== '') aide.onDemander();
	};
	const historique = aide.toutLHistorique ? aide.terminees : aide.terminees.slice(0, 3);

	return (
		<PageEcran entete={entete}>
			<div className="flex flex-col gap-cladd-2xs">
				<form id={ID_FORMULAIRE} onSubmit={soumettre} className="flex flex-col gap-1.5">
					<SearchField
						size="lg"
						tightFocusRing
						value={aide.recherche}
						onChange={(valeur) => aide.onRecherche(valeur)}
						placeholder="Demandez à Plume ou cherchez"
						inputComponentProps={{ 'aria-label': 'Demandez à Plume ou cherchez', enterKeyHint: 'send' }}
					/>
					<p className="text-cladd-2xs leading-relaxed text-cladd-fg-soft">
						{aide.avantLaSaisie ?? 'Plume répond en quelques secondes. L’équipe prend le relais dans le même fil.'}
					</p>
				</form>

				{aide.recherche.trim() === '' ? null : (
					<section className="flex flex-col gap-2">
						{aide.resultats.length === 0 ? null : <CartesDeQuestions questions={aide.resultats} />}
						<BoutonPrincipal type="submit" form={ID_FORMULAIRE} pleineLargeur>
							{aide.resultats.length === 0 ? 'Demander' : 'Ce n’est pas ça ? Demander'}
						</BoutonPrincipal>
					</section>
				)}

				{aide.enCours.length === 0 ? null : (
					<section className="flex flex-col gap-2">
						<EnTeteDeGroupe libelle="En cours" nombre={aide.enCours.length} />
						<CartesDeConversations cartes={aide.enCours} />
					</section>
				)}

				{aide.recherche.trim() !== '' ? null : (
					<section className="flex flex-col gap-2">
						<EnTeteDeGroupe libelle="Vos questions" />
						<CartesDeQuestions questions={aide.questions} />
						<CarteLien
							vers="/app/aide/questions"
							titre="Toutes les questions"
							icone={<VignetteIcone icone={<MessageCircleQuestionIcon aria-hidden />} />}
						/>
					</section>
				)}

				<EquipeDuSupport
					membres={aide.equipe.membres}
					horaires={aide.equipe.horaires}
					attendue={aide.equipe.attendue}
					{...(aide.equipe.absence === undefined ? {} : { absence: aide.equipe.absence })}
					{...(aide.equipe.adresse === undefined ? {} : { adresse: aide.equipe.adresse })}
				/>

				{aide.terminees.length === 0 ? null : (
					<section className="flex flex-col gap-2">
						<EnTeteDeGroupe libelle="Terminées" nombre={aide.terminees.length} />
						<CartesDeConversations cartes={historique} />
						{aide.toutLHistorique || aide.terminees.length <= 3 ? null : (
							<BoutonTexte onClick={aide.onToutLHistorique}>Tout l’historique</BoutonTexte>
						)}
					</section>
				)}
			</div>
		</PageEcran>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// TOUTES LES QUESTIONS, ET UNE RÉPONSE
// ─────────────────────────────────────────────────────────────────────────

export interface SujetDeQuestions {
	readonly sujet: string;
	readonly questions: readonly QuestionAffichee[];
}

export function EcranQuestionsDAide({ sujets }: { readonly sujets: readonly SujetDeQuestions[] }) {
	return (
		<PageEcran entete={{ genre: 'poussee', retour: { vers: '/app/aide', libelle: 'Aide' }, titre: 'Toutes les questions' }}>
			<div className="flex flex-col gap-cladd-2xs">
				{sujets.map((groupe) => (
					<section key={groupe.sujet} className="flex flex-col gap-2">
						<EnTeteDeGroupe libelle={groupe.sujet} nombre={groupe.questions.length} />
						<CartesDeQuestions questions={groupe.questions} />
					</section>
				))}
			</div>
		</PageEcran>
	);
}

export interface ReponseDAideAffichee {
	readonly question: string;
	readonly reponse: string;
	readonly ecran?: {
		readonly libelle: string;
		readonly vers: NonNullable<LinkProps['to']>;
		readonly recherche?: LinkProps['search'];
	};
	readonly onDemander: () => void;
}

/** Une réponse de la base d'aide, tout de suite, et l'écran qui règle la question. */
export function EcranQuestionDAide({ donnees }: { readonly donnees: Lecture<ReponseDAideAffichee> }) {
	const entete = {
		genre: 'poussee',
		retour: { vers: '/app/aide', libelle: 'Aide' },
		titre: 'Question'
	} as const;
	if (donnees.etat !== 'pret') return <PageEcran entete={entete} etat={donnees.etat} />;
	const r = donnees.valeur;
	return (
		<PageEcran entete={entete}>
			<article className="flex flex-col gap-cladd-2xs">
				<h2 className="text-cladd-md leading-snug font-semibold text-balance">{r.question}</h2>
				<p className="text-cladd-sm leading-relaxed text-cladd-fg">{r.reponse}</p>
				{r.ecran === undefined ? null : (
					<CarteVersUnEcran
						libelle={r.ecran.libelle}
						vers={r.ecran.vers}
						{...(r.ecran.recherche === undefined ? {} : { recherche: r.ecran.recherche })}
					/>
				)}
				<div className="flex flex-col items-start gap-1 pt-cladd-3xs">
					<p className="text-cladd-2xs text-cladd-fg-soft">Ce n’est pas ça ?</p>
					<BoutonSecondaire onClick={r.onDemander}>Demander à Plume</BoutonSecondaire>
				</div>
			</article>
		</PageEcran>
	);
}

// ─────────────────────────────────────────────────────────────────────────
// LE FIL
// ─────────────────────────────────────────────────────────────────────────

export interface EcranDuFil {
	readonly libelle: string;
	readonly vers: NonNullable<LinkProps['to']>;
	readonly recherche?: LinkProps['search'];
}

export type ElementDuFilAide =
	| {
			readonly genre: 'GERANT';
			readonly id: string;
			readonly texte: string;
			readonly heure: string;
			readonly parEmail: boolean;
			readonly masquage?: string;
	  }
	| {
			readonly genre: 'PLUME';
			readonly id: string;
			readonly phrases: readonly PhraseAffichee[];
			readonly heure: string;
			readonly ecrans: readonly EcranDuFil[];
			/** Les deux cartes de « arrêtez l'envoi ». */
			readonly cartes?: ReactNode;
			/** Une question de dossier : le Plume de l'espace la reprend. */
			readonly versLEspace?: () => void;
			readonly satisfaction?: { readonly onOui: () => void; readonly onNon: () => void };
	  }
	| {
			readonly genre: 'EQUIPE';
			readonly id: string;
			readonly nom: string;
			readonly photo: string | null;
			readonly texte: string;
			readonly heure: string;
	  }
	| { readonly genre: 'RETIRE'; readonly id: string; readonly auteur: AuteurAffiche; readonly heure: string }
	| {
			readonly genre: 'LIGNE';
			readonly id: string;
			readonly texte: string;
			readonly heure: string;
			readonly annoncee: boolean;
	  }
	| {
			readonly genre: 'TRANSMIS';
			readonly id: string;
			readonly heure: string;
			readonly question: string;
			readonly pourquoi: string;
			readonly depuis?: string;
			readonly attendue: string;
			readonly enRetard?: string;
	  };

export interface ConversationAideAffichee {
	readonly titre: string;
	/** « Assistant automatique · l'équipe peut aussi répondre », « Avec Camille », « Terminée ». */
	readonly sousTitre: string;
	readonly plumeOuvert: boolean;
	readonly elements: readonly ElementDuFilAide[];
	readonly plumeReflechit: boolean;
	/** Tant que la conversation est chez Plume (ou pas encore écrite). */
	readonly parlerALEquipe?: () => void;
	/** « Parler à l'équipe » touché avant d'écrire : la question ira droit à l'équipe. */
	readonly pourLEquipe: boolean;
	readonly avis?: { readonly onRepondre: (utile: boolean) => void };
	/** Une conversation terminée depuis plus de sept jours : écrire ici, ou un nouveau sujet. */
	readonly choixAncienne?: { readonly onNouveau: () => void };
	readonly question: string;
	readonly onQuestion: (question: string) => void;
	readonly onEnvoyer: () => void;
	readonly enCours: boolean;
}

function Element({ element }: { readonly element: ElementDuFilAide }) {
	switch (element.genre) {
		case 'GERANT':
			return (
				<div className="flex flex-col gap-1">
					<BulleDuGerant texte={element.texte} />
					{element.masquage === undefined ? null : <NoteDeMasquage texte={element.masquage} />}
					<LegendeDuMessage auteur="GERANT" parEmail={element.parEmail} heure={element.heure} />
				</div>
			);
		case 'PLUME':
			return (
				<ReponseDePlume phrases={element.phrases}>
					{element.ecrans.map((ecran) => (
						<CarteVersUnEcran
							key={ecran.libelle}
							libelle={ecran.libelle}
							vers={ecran.vers}
							{...(ecran.recherche === undefined ? {} : { recherche: ecran.recherche })}
						/>
					))}
					{element.cartes}
					{element.versLEspace === undefined ? null : (
						<BoutonSecondaire onClick={element.versLEspace} className="self-start">
							Demander dans votre espace
						</BoutonSecondaire>
					)}
					<LegendeDuMessage auteur="PLUME" heure={element.heure} />
					{element.satisfaction === undefined ? null : (
						<QuestionDeSatisfaction onOui={element.satisfaction.onOui} onNon={element.satisfaction.onNon} />
					)}
				</ReponseDePlume>
			);
		case 'EQUIPE':
			return (
				<MessageDeLEquipe
					nom={element.nom}
					photo={element.photo}
					texte={element.texte}
					legende={<LegendeDuMessage auteur="EQUIPE" nom={element.nom} heure={element.heure} />}
				/>
			);
		case 'RETIRE':
			return <MessageRetire legende={<LegendeDuMessage auteur={element.auteur} heure={element.heure} />} />;
		case 'LIGNE':
			return <LigneDuFil texte={element.texte} heure={element.heure} annoncee={element.annoncee} />;
		case 'TRANSMIS':
			return (
				<CarteTransmise
					heure={element.heure}
					question={element.question}
					pourquoi={element.pourquoi}
					{...(element.depuis === undefined ? {} : { depuis: element.depuis })}
					attendue={element.attendue}
					{...(element.enRetard === undefined ? {} : { enRetard: element.enRetard })}
				/>
			);
	}
}

export function EcranConversationAide({ fil }: { readonly fil: ConversationAideAffichee }) {
	const fin = useRef<HTMLDivElement>(null);
	// Le fil descend vers ce qui arrive : une synchronisation avec le DOM, pas un état.
	useEffect(() => {
		fin.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
	}, [fil.elements.length, fil.plumeReflechit]);

	return (
		<PageConversation
			entete={
				<EnteteDetail
					retourVers="/app/aide"
					retourLibelle="Aide"
					donneesPretes
					titre={fil.titre}
					sousTitre={fil.sousTitre}
				/>
			}
			composeur={
				<Composeur
					valeur={fil.question}
					onChange={fil.onQuestion}
					onEnvoyer={fil.onEnvoyer}
					enCours={fil.enCours}
					placeholder={fil.pourLEquipe ? 'Votre question pour l’équipe' : 'Votre question'}
					dessus={
						fil.choixAncienne !== undefined ? (
							<div className="flex flex-wrap items-center gap-2">
								<p className="text-cladd-2xs text-cladd-fg-soft">Écrire ici rouvre ce sujet.</p>
								<BoutonSecondaire onClick={fil.choixAncienne.onNouveau}>Nouveau sujet</BoutonSecondaire>
							</div>
						) : fil.parlerALEquipe === undefined ? null : fil.pourLEquipe ? (
							<p className="flex items-center gap-1.5 text-cladd-2xs text-cladd-fg-soft">
								<UsersIcon aria-hidden className="size-3.5" />
								Votre question ira directement à l’équipe.
							</p>
						) : (
							<div>
								<BoutonSecondaire onClick={fil.parlerALEquipe}>
									<UsersIcon aria-hidden className="size-4" />
									Parler à l’équipe
								</BoutonSecondaire>
							</div>
						)
					}
				/>
			}
		>
			<PresentationDuFil plumeOuvert={fil.plumeOuvert} />
			{fil.elements.map((element) => (
				<Element key={element.id} element={element} />
			))}
			{fil.plumeReflechit ? <PointsDeSuspension /> : null}
			{fil.avis === undefined ? null : <AvisApresLEquipe onRepondre={fil.avis.onRepondre} />}
			<div ref={fin} aria-hidden />
		</PageConversation>
	);
}

/** Le fil, le temps qu'il arrive — ou quand il n'est pas à vous. */
export function EcranConversationAbsente({ etat }: { readonly etat: 'attente' | 'erreur' }) {
	return (
		<PageEcran
			entete={{ genre: 'poussee', retour: { vers: '/app/aide', libelle: 'Aide' }, titre: 'Conversation' }}
			etat={etat}
		/>
	);
}
