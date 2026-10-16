import { useState } from 'react';
import {
	EcranAide,
	EcranConversationAbsente,
	EcranConversationAide,
	EcranQuestionDAide,
	EcranQuestionsDAide,
	type AideAffichee,
	type ConversationAideAffichee,
	type ElementDuFilAide
} from '../../screens/aide';
import { CartesArreterLesEnvois } from '../../ui/aide';
import { ARTICLES } from '../../lib/support/articles';
import { LIBELLES_DES_SUJETS, SUJETS } from '../../lib/support/sujets';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * L'AIDE DANS LA SALLE (16/10/2026) : l'accueil, une réponse, toutes les questions et
 * le fil dans ses quatre états, avec des données inventées.
 */

const RIEN = () => undefined;

const EQUIPE: AideAffichee['equipe'] = {
	membres: [
		{ prenom: 'Camille', photo: null },
		{ prenom: 'Jules', photo: null }
	],
	horaires: 'L’équipe répond en semaine, de 9 h à 18 h.',
	attendue: 'Une question posée maintenant : réponse attendue aujourd’hui avant 15 h.'
};

const ACCUEIL: AideAffichee = {
	recherche: '',
	onRecherche: RIEN,
	onDemander: RIEN,
	resultats: [],
	enCours: [
		{
			id: 'c1',
			titre: 'Ma connexion à Pennylane ne lit plus rien',
			ligne: 'Camille vous a répondu',
			date: '10 h 42',
			attention: true
		},
		{
			id: 'c2',
			titre: 'Je veux changer l’adresse e-mail du compte',
			ligne: 'Transmis · réponse attendue aujourd’hui avant 17 h',
			date: '13 h 02',
			attention: false
		}
	],
	questions: [
		{ cle: 'connexion-erreur', question: 'Ma connexion à Pennylane ne lit plus rien' },
		{ cle: 'relances-rien-parti', question: 'Pourquoi rien n’est encore parti ?' },
		{ cle: 'ajouter-factures', question: 'Comment ajouter mes factures ?' }
	],
	equipe: EQUIPE,
	terminees: [
		{ id: 'c3', titre: 'Comment inviter un collègue ?', ligne: 'Terminée', date: 'lun. 12 oct.', attention: false },
		{ id: 'c4', titre: 'Quand serai-je prélevé ?', ligne: 'Terminée', date: 'jeu. 8 oct.', attention: false },
		{ id: 'c5', titre: 'Que fait Plume ?', ligne: 'Terminée', date: 'mar. 6 oct.', attention: false },
		{ id: 'c6', titre: 'Où sont hébergées mes données ?', ligne: 'Terminée', date: 'ven. 2 oct.', attention: false }
	],
	toutLHistorique: false,
	onToutLHistorique: RIEN
};

function DemoAccueil({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	const [recherche, setRecherche] = useState(variante === 'recherche' ? 'relance' : '');
	const [tout, setTout] = useState(false);
	const pret = formeDemo(variante, ACCUEIL, {
		recherche: ACCUEIL,
		'plume fermé': { ...ACCUEIL, avantLaSaisie: 'Ce mois-ci, vos questions vont directement à l’équipe.' }
	});
	return (
		<EcranAide
			donnees={lectureDemo<AideAffichee>(
				etat,
				{
					...pret,
					recherche,
					onRecherche: setRecherche,
					resultats:
						recherche.trim() === ''
							? []
							: ARTICLES.filter((a) => a.question.toLowerCase().includes('relance') || a.sujet === 'RELANCES')
									.slice(0, 3)
									.map((a) => ({ cle: a.cle, question: a.question })),
					toutLHistorique: tout,
					onToutLHistorique: () => setTout(true)
				},
				{ ...ACCUEIL, enCours: [], terminees: [] }
			)}
		/>
	);
}

function DemoQuestion({ etat }: { etat: EtatDemo }) {
	const article = ARTICLES[0]!;
	return (
		<EcranQuestionDAide
			donnees={lectureDemo(etat, {
				question: article.question,
				reponse: article.reponse,
				ecran: { libelle: 'Aujourd’hui › Le pilote', vers: '/app' },
				onDemander: RIEN
			})}
		/>
	);
}

function DemoQuestions() {
	return (
		<EcranQuestionsDAide
			sujets={SUJETS.map((sujet) => ({
				sujet: LIBELLES_DES_SUJETS[sujet],
				questions: ARTICLES.filter((a) => a.sujet === sujet).map((a) => ({ cle: a.cle, question: a.question }))
			})).filter((g) => g.questions.length > 0)}
		/>
	);
}

const QUESTION: ElementDuFilAide = {
	genre: 'GERANT',
	id: 'm1',
	texte: 'Ma connexion à Pennylane ne lit plus rien depuis lundi.',
	heure: '10 h 12',
	parEmail: false
};

const REPONSE_DE_PLUME: ElementDuFilAide = {
	genre: 'PLUME',
	id: 'm2',
	phrases: [
		{
			texte: 'La dernière lecture de Pennylane a échoué : il faut rebrancher le logiciel.',
			genreSource: 'PARAMETRE',
			libelleSource: 'votre compte'
		},
		{
			texte: 'Dans Compte, puis Connexions, touchez Pennylane et « Rebrancher ».',
			genreSource: 'PARAMETRE',
			libelleSource: 'aide'
		}
	],
	heure: '10 h 12',
	ecrans: [{ libelle: 'Compte › Connexions', vers: '/app/compte', recherche: { ouvrir: 'connexions' } }]
};

const BASE: ConversationAideAffichee = {
	titre: 'Ma connexion à Pennylane ne lit plus rien',
	sousTitre: 'Assistant automatique · l’équipe peut aussi répondre',
	plumeOuvert: true,
	elements: [QUESTION, { ...REPONSE_DE_PLUME, satisfaction: { onOui: RIEN, onNon: RIEN } }],
	plumeReflechit: false,
	parlerALEquipe: RIEN,
	pourLEquipe: false,
	question: '',
	onQuestion: RIEN,
	onEnvoyer: RIEN,
	enCours: false
};

const TRANSMIS: ConversationAideAffichee = {
	...BASE,
	titre: 'Je veux changer l’adresse e-mail du compte',
	sousTitre: 'Transmis · réponse attendue aujourd’hui avant 17 h',
	elements: [
		{ ...QUESTION, texte: 'Je veux changer l’adresse e-mail du compte, mon IBAN est [IBAN masqué].', masquage: 'J’ai masqué un IBAN dans votre message : l’équipe ne le verra pas.' },
		{
			genre: 'TRANSMIS',
			id: 'm3',
			heure: '13 h 02',
			question: 'Je veux changer l’adresse e-mail du compte',
			pourquoi: 'Adresse ou titulaire du compte : seule l’équipe peut traiter cette demande.',
			depuis: 'Compte › Sécurité',
			attendue: 'Réponse attendue aujourd’hui avant 17 h'
		}
	]
};
/** Le fil chez l'équipe : « Parler à l'équipe » n'a plus lieu d'être. */
function sansAction(fil: ConversationAideAffichee): ConversationAideAffichee {
	const { parlerALEquipe, ...reste } = fil;
	void parlerALEquipe;
	return reste;
}
const TRANSMIS_SANS_ACTION = sansAction(TRANSMIS);

const AVEC_L_EQUIPE: ConversationAideAffichee = {
	...TRANSMIS_SANS_ACTION,
	sousTitre: 'Avec Camille',
	elements: [
		...TRANSMIS.elements,
		{
			genre: 'LIGNE',
			id: 'm4',
			texte: 'Camille, de l’équipe Letikette, a rejoint la conversation',
			heure: '14 h 10',
			annoncee: true
		},
		{
			genre: 'EQUIPE',
			id: 'm5',
			nom: 'Camille',
			photo: null,
			texte: 'Bonjour Jules, c’est fait : la nouvelle adresse recevra un lien à confirmer. Dites-moi si rien n’arrive d’ici une heure.',
			heure: '14 h 12'
		}
	]
};

const ARRETER: ConversationAideAffichee = {
	...BASE,
	titre: 'Arrêtez l’envoi de cette relance !',
	elements: [
		{ ...QUESTION, texte: 'Arrêtez l’envoi de cette relance !' },
		{
			genre: 'PLUME',
			id: 'm6',
			phrases: [
				{
					texte: 'Je peux retenir une relance qui part bientôt, ou couper toutes les relances automatiques. Les deux se font ici, tout de suite.',
					genreSource: 'AUCUNE',
					libelleSource: ''
				}
			],
			heure: '10 h 12',
			ecrans: [],
			cartes: (
				<CartesArreterLesEnvois
					relances={[{ id: 'e1', client: 'Fournitures Durand', quand: 'aujourd’hui à 11 h' }]}
					onRetenir={RIEN}
					onCouper={RIEN}
					administrateurs={[]}
					relancesCoupees={false}
				/>
			)
		}
	]
};

const TERMINEE: ConversationAideAffichee = {
	...AVEC_L_EQUIPE,
	sousTitre: 'Terminée',
	elements: [
		...AVEC_L_EQUIPE.elements,
		{ genre: 'LIGNE', id: 'm7', texte: 'Conversation terminée', heure: '14 h 30', annoncee: false }
	],
	avis: { onRepondre: RIEN }
};

function DemoConversation({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	const [question, setQuestion] = useState('');
	if (etat === 'attente' || etat === 'erreur') return <EcranConversationAbsente etat={etat} />;
	const fil = formeDemo(variante, BASE, {
		transmis: TRANSMIS_SANS_ACTION,
		'avec l’équipe': AVEC_L_EQUIPE,
		'arrêter les envois': ARRETER,
		terminée: TERMINEE,
		'Plume réfléchit': { ...BASE, elements: [QUESTION], plumeReflechit: true }
	});
	return <EcranConversationAide fil={{ ...fil, question, onQuestion: setQuestion }} />;
}

function DemoNouvelle({ etat }: { etat: EtatDemo }) {
	const [question, setQuestion] = useState('Comment activer les relances ?');
	const [pourLEquipe, setPourLEquipe] = useState(false);
	if (etat === 'attente' || etat === 'erreur') return <EcranConversationAbsente etat={etat} />;
	return (
		<EcranConversationAide
			fil={{
				...BASE,
				titre: 'Nouvelle question',
				elements: [],
				parlerALEquipe: () => setPourLEquipe(true),
				pourLEquipe,
				question,
				onQuestion: setQuestion
			}}
		/>
	);
}

export const ECRANS_AIDE: readonly EcranDuProduit[] = [
	{
		route: '/app/aide/',
		libelle: 'aide · accueil',
		vide: true,
		variantes: ['recherche', 'plume fermé'],
		Demo: DemoAccueil
	},
	{ route: '/app/aide/nouvelle', libelle: 'aide · nouvelle question', vide: false, Demo: DemoNouvelle },
	{
		route: '/app/aide/$id',
		libelle: 'aide · conversation',
		vide: false,
		variantes: ['Plume réfléchit', 'transmis', 'avec l’équipe', 'arrêter les envois', 'terminée'],
		Demo: DemoConversation
	},
	{ route: '/app/aide/question/$cle', libelle: 'aide · une réponse', vide: false, Demo: DemoQuestion },
	{ route: '/app/aide/questions', libelle: 'aide · toutes les questions', vide: false, Demo: DemoQuestions }
];
