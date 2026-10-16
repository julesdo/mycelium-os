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
import {
	EcranConversationSupport,
	EcranFileSupport,
	EcranMesureSupport,
	EcranReponsesEnregistrees,
	type ConversationVueParLEquipe,
	type LigneDeFileAffichee
} from '../../screens/admin/support';
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

// ─────────────────────────────────────────────────────────────────────────
// LA BOÎTE DE L'ÉQUIPE
// ─────────────────────────────────────────────────────────────────────────

const FILE_EQUIPE: LigneDeFileAffichee[] = [
	{
		id: 'c2',
		etablissement: 'Garnier Bâtiment',
		ligne: 'Demande d’acte · Adresse ou titulaire du compte · Je veux changer l’adresse e-mail du compte',
		date: 'attend depuis 2 h',
		attention: true
	},
	{
		id: 'c7',
		etablissement: 'Atelier Morel',
		ligne: 'Prioritaire · Plume ne savait pas · Puis-je relier deux comptes Qonto ?',
		date: 'en retard de 20 min',
		attention: true
	},
	{
		id: 'c8',
		etablissement: 'Expéditeur non vérifié',
		ligne: 'Non vérifié · Par e-mail · Reçu par e-mail · Bonjour, je n’arrive pas à me connecter',
		date: 'attend depuis 40 min',
		attention: false
	}
];

function DemoFileEquipe({ etat }: { etat: EtatDemo }) {
	return (
		<EcranFileSupport
			titre="À vous"
			vide="Rien ne vous attend. Plume répond, l’équipe est à jour."
			lecture={lectureDemo(etat, FILE_EQUIPE, [])}
			absence={{ jusquAu: null, onAnnoncer: RIEN, onLever: RIEN }}
		/>
	);
}

const CONVERSATION_EQUIPE: ConversationVueParLEquipe = {
	etablissement: 'Garnier Bâtiment',
	titre: 'Je veux changer l’adresse e-mail du compte',
	etat: 'Chez l’équipe · attend depuis 2 h',
	etiquettes: ['Prioritaire'],
	ceQuePlumeACompris: {
		pourquoi: 'Demande d’acte : Adresse ou titulaire du compte',
		question: 'Je veux changer l’adresse e-mail du compte, mon IBAN est [IBAN masqué].',
		depuis: 'Compte › Sécurité'
	},
	elements: [
		{
			id: 'm1',
			voix: 'GERANT',
			nom: 'Jules Garnier',
			texte: 'Je veux changer l’adresse e-mail du compte, mon IBAN est [IBAN masqué].',
			heure: '10 h 12',
			parEmail: false,
			sources: [],
			onRetirer: RIEN
		},
		{ id: 'm2', voix: 'EVENEMENT', nom: '', texte: 'Transmis à l’équipe', heure: '10 h 12', parEmail: false, sources: [] },
		{
			id: 'm3',
			voix: 'NOTE',
			nom: 'Camille',
			texte: 'Vérifier que la demande vient bien de l’administrateur avant de changer quoi que ce soit.',
			heure: '10 h 30',
			parEmail: false,
			sources: []
		}
	],
	contexte: [
		{ libelle: 'Rôle', valeur: 'Administrateur' },
		{ libelle: 'Formule', valeur: 'Équipe · actif' },
		{ libelle: 'Membres', valeur: '3' },
		{ libelle: 'Relances automatiques', valeur: 'Activées' },
		{ libelle: 'Dossiers à démarrer', valeur: '2' },
		{ libelle: 'Relances programmées', valeur: '1, la prochaine le 2026-10-17 à 10:00' },
		{ libelle: 'Pennylane', valeur: 'a jour, lu 2026-10-15' },
		{ libelle: 'Documents en échec', valeur: '0' }
	],
	precedentes: [{ id: 'c3', titre: 'Comment inviter un collègue ?', ligne: 'Terminée · lun. 12 oct.' }],
	gestes: {
		assignee: null,
		onMePrendre: RIEN,
		prioritaire: true,
		onPrioritaire: RIEN,
		terminee: false,
		onTerminer: RIEN,
		onRouvrir: RIEN,
		onSuspendre: RIEN
	},
	composeur: {
		mode: 'REPONSE',
		onMode: RIEN,
		valeur: '',
		onChange: RIEN,
		onEnvoyer: RIEN,
		reponses: [{ id: 'r1', titre: 'Rebrancher Pennylane' }],
		onInserer: RIEN,
		enCours: false,
		brouillon: { onDemander: RIEN, enCours: false }
	}
};

function DemoConversationEquipe({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	const [mode, setMode] = useState<'REPONSE' | 'NOTE'>(variante === 'note' ? 'NOTE' : 'REPONSE');
	const [valeur, setValeur] = useState(variante === 'avertissement' ? 'Nous ne saisissons pas le tribunal pour vous.' : '');
	return (
		<EcranConversationSupport
			lecture={lectureDemo(etat, {
				...CONVERSATION_EQUIPE,
				composeur: {
					...CONVERSATION_EQUIPE.composeur,
					mode,
					onMode: setMode,
					valeur,
					onChange: setValeur,
					...(variante === 'avertissement'
						? { avertissement: 'Ce message conseille, ou parle d’une voie de justice : relisez-le, puis confirmez l’envoi.' }
						: {})
				}
			})}
		/>
	);
}

function DemoReponsesEnregistrees({ etat }: { etat: EtatDemo }) {
	return (
		<EcranReponsesEnregistrees
			lecture={lectureDemo(
				etat,
				[
					{
						id: 'r1',
						titre: 'Rebrancher Pennylane',
						texte: 'Bonjour {prenom}, dans Compte puis Connexions, touchez Pennylane et « Rebrancher ». La lecture repart dans l’heure.'
					}
				],
				[]
			)}
			onEnregistrer={async () => undefined}
			onSupprimer={RIEN}
		/>
	);
}

function DemoMesure({ etat }: { etat: EtatDemo }) {
	return (
		<EcranMesureSupport
			lecture={lectureDemo(etat, {
				calculee: 'Calculée à 14 h, sur trente jours, comparés aux trente d’avant.',
				entonnoir: [
					{ libelle: 'Conversations', valeur: '86 (+12 sur la période d’avant)' },
					{ libelle: 'Résolues par Plume', valeur: '51 · 59 %' },
					{ libelle: 'Passées à l’équipe', valeur: '31 · 36 %' },
					{ libelle: 'Résolues par l’équipe', valeur: '27' },
					{ libelle: 'Sans nouvelles', valeur: '4' }
				],
				delais: [
					{ libelle: 'Première réponse (médiane)', valeur: '2,5 h, sur 29 réponses' },
					{ libelle: 'Résolution (médiane)', valeur: '6 h' }
				],
				plume: [
					{ libelle: 'Réponses de Plume jugées utiles', valeur: '78 %' },
					{ libelle: 'Satisfaction après l’équipe', valeur: '92 % d’avis utiles' }
				],
				parSujet: [
					{ libelle: 'Logiciels branchés', valeur: '24, dont 11 passées' },
					{ libelle: 'Relances', valeur: '19, dont 4 passées' }
				],
				lacunes: [
					{
						id: 'c7',
						titre: 'Puis-je relier deux comptes Qonto ?',
						ligne: 'Logiciels branchés · Plume ne savait pas',
						onCreerTache: RIEN
					}
				]
			})}
		/>
	);
}

export const ECRANS_SUPPORT_EQUIPE: readonly EcranDuProduit[] = [
	{ route: '/admin/support/', libelle: 'admin · support, la file', vide: true, Demo: DemoFileEquipe },
	{
		route: '/admin/support/$id',
		libelle: 'admin · support, une conversation',
		vide: false,
		variantes: ['note', 'avertissement'],
		Demo: DemoConversationEquipe
	},
	{ route: '/admin/support/mesure', libelle: 'admin · mesure du support', vide: false, Demo: DemoMesure },
	{
		route: '/admin/support/reponses',
		libelle: 'admin · réponses enregistrées',
		vide: true,
		Demo: DemoReponsesEnregistrees
	}
];
