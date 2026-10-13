import { useState } from 'react';
import { AlarmClockIcon, CalendarRangeIcon, HandCoinsIcon, SendIcon } from 'lucide-react';
import {
	ApercuDeGeste,
	AvatarPlume,
	BoutonSecondaire,
	CarteDeGeste,
	CarteEtatDuDossier,
	CarteLien,
	ListeDeCartes,
	NOM_DU_PILOTE,
	PageEcran,
	Plume,
	type DocumentDuFil,
	type FichierAuDepot,
	type HumeurPlume
} from '../../ui';
import { EcranConversationPilote, type MessageAffiche } from '../../screens/conversation-pilote';
import { EcranDemarrage } from '../../screens/demarrage';
import { EcranDemarrageEnLot, type DossierADemarrer } from '../../screens/demarrage-lot';
import type { EcranDuProduit, EtatDemo } from './demo';

/**
 * PLUME, DANS SES CINQ HUMEURS ET À SES TROIS TAILLES.
 *
 * La salle seule les montre côte à côte : en production, une humeur suit l'état
 * réel du pilote, et on n'en voit qu'une à la fois.
 */
const HUMEURS: readonly HumeurPlume[] = ['repos', 'travaille', 'content', 'attention', 'ecoute'];

function DemoPlume() {
	return (
		<PageEcran entete={{ genre: 'onglet', titre: NOM_DU_PILOTE }} etat="pret">
			<div className="flex flex-col items-center gap-cladd-2xs py-cladd-2xs">
				<Plume humeur="repos" taille={112} sol />
				<p className="text-cladd-xs font-semibold">{NOM_DU_PILOTE}</p>
			</div>
			<div className="grid grid-cols-5 gap-cladd-3xs">
				{HUMEURS.map((humeur) => (
					<div key={humeur} className="flex flex-col items-center gap-2">
						<Plume humeur={humeur} taille={56} sol />
						<AvatarPlume humeur={humeur} taille={32} />
						<span className="text-cladd-3xs text-cladd-fg-soft">{humeur}</span>
					</div>
				))}
			</div>
		</PageEcran>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LA CONVERSATION D'UN DOSSIER — vide, en travail, puis répondue.
 * ═══════════════════════════════════════════════════════════════════════════ */

const QUESTION_DEMO = 'Combien me doit-il, pénalités comprises ?';

/* Les documents joints, à chaque moment : dans le compositeur, en lecture, lus. */
const PIECES_DEMO: readonly FichierAuDepot[] = [
	{ cle: 'p1', nom: 'BL-2026-0771.pdf', taille: 248_000, mime: 'application/pdf', phase: 'PRET' },
	{
		cle: 'p2',
		nom: 'photo-signature.heic',
		taille: 3_100_000,
		mime: '',
		phase: 'REFUSE',
		message: 'Format non pris : PDF, image JPG ou PNG'
	}
];

const DOCUMENTS_EN_LECTURE: readonly DocumentDuFil[] = [
	{
		cle: 'd1',
		nom: 'BL-2026-0771.pdf',
		mime: 'application/pdf',
		scelle: true,
		ligne: 'Scellé · lecture en cours…',
		enCours: true
	}
];

const DOCUMENTS_LUS: readonly DocumentDuFil[] = [
	{
		cle: 'd1',
		nom: 'BL-2026-0771.pdf',
		mime: 'application/pdf',
		scelle: true,
		ligne: 'Bon de livraison · Fournitures Durand',
		enCours: false,
		onOuvrir: () => undefined
	}
];

function DemoConversation({ variante }: { etat: EtatDemo; variante?: string }) {
	const [question, setQuestion] = useState('');
	const forme = variante ?? 'vide';
	const messages: MessageAffiche[] =
		forme === 'vide' || forme === 'joindre'
			? []
			: forme === 'lecture'
				? [
						{
							genre: 'GERANT',
							id: 'q',
							texte: 'Il dit qu’il n’a jamais été livré.',
							documents: DOCUMENTS_EN_LECTURE
						}
					]
				: forme === 'documents'
					? [
							{
								genre: 'GERANT',
								id: 'q',
								texte: 'Il dit qu’il n’a jamais été livré.',
								documents: DOCUMENTS_LUS
							},
							{
								genre: 'PLUME',
								id: 'r',
								phrases: [
									{
										texte:
											'J’ai lu le bon de livraison BL-2026-0771 : il est daté du 2 septembre et porte la signature du client, sans réserve.',
										genreSource: 'PIECE',
										libelleSource: 'bon de livraison BL-2026-0771'
									},
									{
										texte: 'Il est rangé au dossier, avec ses factures.',
										genreSource: 'AUCUNE',
										libelleSource: ''
									}
								],
								suite: (
									<CarteDeGeste
										icone={<AlarmClockIcon />}
										titre="Noter au dossier"
										detail="« Le client dit ne pas avoir été livré ; le bon de livraison signé dit le contraire. »"
										etat="PROPOSEE"
										principal
										libelleConfirmer="Noter"
										onConfirmer={() => undefined}
										onEcarter={() => undefined}
									/>
								)
							}
						]
					: forme === 'geste'
						? [
								{
									genre: 'GERANT',
									id: 'q',
									texte: 'Je l’ai eu au téléphone, il paie 2 000 € le 20 et le reste fin novembre.'
								},
								{
									genre: 'PLUME',
									id: 'r',
									phrases: [
										{
											texte:
												'Je vous propose de noter sa promesse, et de poser un rappel le lendemain pour vérifier que le virement est arrivé.',
											genreSource: 'AUCUNE',
											libelleSource: ''
										}
									],
									suite: (
										<div className="flex flex-col gap-2">
											<CarteDeGeste
												icone={<HandCoinsIcon />}
												titre="Promesse de 2 000,00 € pour mardi 20 octobre"
												detail="Si rien n’arrive ce jour-là, le dossier remonte dans Aujourd’hui."
												etat="FAITE"
												resultat="Promesse de 2 000,00 € notée pour mardi 20 octobre."
											/>
											<CarteDeGeste
												icone={<AlarmClockIcon />}
												titre="Rappel mercredi 21 octobre"
												detail="Vérifier le virement promis. Ce jour-là, le dossier remonte dans Aujourd’hui."
												etat="PROPOSEE"
												libelleConfirmer="Poser le rappel"
												onConfirmer={() => undefined}
												onEcarter={() => undefined}
												champs={[
													{ cle: 'date', libelle: 'Le', valeur: '2026-10-21', genre: 'date' },
													{
														cle: 'texte',
														libelle: 'Pour',
														valeur: 'Vérifier le virement promis',
														genre: 'texte'
													}
												]}
											/>
											<CarteDeGeste
												icone={<CalendarRangeIcon />}
												titre="Paiement en 3 fois, à partir du mardi 20 octobre"
												detail="3 versements mensuels d’environ 2 000,00 €, hors pénalités. Tant qu’ils arrivent, je ne le relance pas."
												etat="PROPOSEE"
												principal
												libelleConfirmer="Convenir"
												onConfirmer={() => undefined}
												onEcarter={() => undefined}
												champs={[
													{
														cle: 'texte',
														libelle: 'En combien de fois',
														valeur: '3',
														genre: 'choix',
														choix: [2, 3, 4, 6].map((n) => ({
															valeur: String(n),
															libelle: `${n} fois`
														}))
													},
													{
														cle: 'date',
														libelle: 'Premier versement le',
														valeur: '2026-10-20',
														genre: 'date'
													}
												]}
												apercu={
													<ApercuDeGeste
														lignes={[
															{ titre: '1er versement · 20 oct.', valeur: '2 000,00 €' },
															{ titre: '2e versement · 20 nov.', valeur: '2 000,00 €' },
															{ titre: '3e versement · 20 déc.', valeur: '2 000,00 €' }
														]}
														note="Hors pénalités."
													/>
												}
											/>
											<div className="flex justify-end">
												<BoutonSecondaire onClick={() => undefined}>
													Tout confirmer (2)
												</BoutonSecondaire>
											</div>
										</div>
									)
								}
							]
						: forme === 'travail'
							? [{ genre: 'GERANT', id: 'q', texte: QUESTION_DEMO }]
							: [
									{ genre: 'GERANT', id: 'q', texte: QUESTION_DEMO },
									{
										genre: 'PLUME',
										id: 'r',
										phrases: [
											{
												texte:
													'Fournitures Durand doit 6 373,50 € à ce jour : 6 000,00 € de factures, 253,50 € de pénalités et 120,00 € de frais de recouvrement.',
												genreSource: 'DECOMPTE',
												libelleSource: 'calcul du jour'
											},
											{
												texte:
													'Les pénalités courent au taux de la BCE majoré de dix points, depuis l’échéance de chaque facture.',
												genreSource: 'PARAMETRE',
												libelleSource: 'taux des pénalités, relevé le 04/01'
											},
											{
												texte:
													'Le montant bouge chaque jour tant que les factures ne sont pas réglées.',
												genreSource: 'AUCUNE',
												libelleSource: ''
											}
										],
										// Ce que la base sait du dossier, joint par le logiciel à « où en est ».
										suite: (
											<CarteEtatDuDossier
												lignes={[
													{
														texte: 'Il reste 6 000,00 € à payer sur 3 factures.',
														onOuvrir: () => undefined
													},
													{
														texte: 'Prochaine étape : deuxième rappel, mardi 13 octobre.',
														onOuvrir: () => undefined
													},
													{ texte: 'Je lui écris à compta@durand.fr.', onOuvrir: () => undefined },
													{ texte: 'Il conteste : c’est noté, et le dossier continue.' },
													{
														texte: 'Aucun décompte n’est encore arrêté.',
														onOuvrir: () => undefined
													}
												]}
											/>
										)
									}
								];
	return (
		<EcranConversationPilote
			fil={{
				titre: NOM_DU_PILOTE,
				sousTitre: 'Fournitures Durand',
				retour: { vers: '/app/dossiers', libelle: 'Dossiers' },
				humeur: forme === 'travail' ? 'travaille' : 'ecoute',
				accueil: {
					titre: 'Je m’occupe du dossier de Fournitures Durand.',
					sousTitre: (
						<>
							6 000,00 € à recouvrer · rappel dans 3 j
							<br />
							Posez-moi une question sur ce dossier : chaque phrase de ma réponse porte sa source.
						</>
					)
				},
				messages,
				travail:
					forme === 'lecture'
						? [
								{ libelle: 'Je mets le document au coffre', etat: 'faite' },
								{ libelle: 'Je le lis', etat: 'courante' },
								{ libelle: 'Je relis le dossier de Fournitures Durand', etat: 'avenir' },
								{ libelle: 'Je rédige ma réponse', etat: 'avenir' }
							]
						: forme === 'travail'
							? [
									{ libelle: 'Je relis le dossier de Fournitures Durand', etat: 'faite' },
									{ libelle: 'Je reprends 3 factures et le décompte', etat: 'faite' },
									{ libelle: 'Je vérifie chaque chiffre à sa source', etat: 'courante' },
									{ libelle: 'Je rédige ma réponse', etat: 'avenir' }
								]
							: null,
				refus: null,
				panne: null,
				avertissement: null,
				suggestions: [
					'Combien me doit-il, pénalités comprises ?',
					'Quelles factures sont dans ce dossier ?',
					'Quel taux est appliqué aux pénalités ?'
				],
				question,
				onQuestion: setQuestion,
				onEnvoyer: () => setQuestion(''),
				enCours: forme === 'travail' || forme === 'lecture',
				placeholder: `Demander à ${NOM_DU_PILOTE}…`,
				arretee: false,
				pieces: {
					fichiers: forme === 'joindre' ? PIECES_DEMO : [],
					onJoindre: () => undefined,
					onRetirer: () => undefined,
					accept: '.pdf,image/*'
				}
			}}
		/>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * PLUME SUR TOUT L'ÉTABLISSEMENT — il répond, cite des dossiers en cartes, et
 * propose un geste sur l'un d'eux (12/10/2026).
 * ═══════════════════════════════════════════════════════════════════════════ */

function DemoConversationEtablissement({ variante }: { etat: EtatDemo; variante?: string }) {
	const [question, setQuestion] = useState('');
	const forme = variante ?? 'reponse';
	// Ouvert depuis la fiche d'un client (13/10/2026) : sa pastille et ses questions.
	const regard = forme === 'regard';
	const messages: MessageAffiche[] =
		forme === 'vide'
			? []
			: [
					{ genre: 'GERANT', id: 'q', texte: 'Qui me doit le plus ? Relance le premier.' },
					{
						genre: 'PLUME',
						id: 'r',
						phrases: [
							{
								texte:
									'Vos trois plus gros dossiers sont ceux-ci. Le premier n’a pas encore reçu de deuxième rappel.',
								genreSource: 'AUCUNE',
								libelleSource: ''
							},
							{
								texte: 'Je vous propose de préparer sa prochaine relance.',
								genreSource: 'AUCUNE',
								libelleSource: ''
							}
						],
						suite: (
							<div className="flex flex-col gap-2">
								<ListeDeCartes>
									<CarteLien
										titre="Fournitures Durand"
										montant="6 000,00 €"
										ligne="Deuxième rappel, dans 2 j"
										vers="/app/dossiers"
									/>
									<CarteLien
										titre="Transports Vidal"
										montant="4 320,50 €"
										ligne="Promesse, dans 6 j"
										vers="/app/dossiers"
									/>
									<CarteLien
										titre="Atelier Rousseau"
										montant="2 640,00 €"
										ligne="Prêt, à démarrer"
										vers="/app/dossiers"
									/>
								</ListeDeCartes>
								<CarteDeGeste
									icone={<SendIcon />}
									contexte="Fournitures Durand"
									titre="Préparer la prochaine relance"
									detail="Je la compose avec vos modèles. Vous la relisez avant qu’elle parte."
									etat="PROPOSEE"
									principal
									libelleConfirmer="Préparer"
									onConfirmer={() => undefined}
									onEcarter={() => undefined}
								/>
							</div>
						)
					}
				];
	return (
		<EcranConversationPilote
			fil={{
				titre: NOM_DU_PILOTE,
				sousTitre: 'Votre pilote',
				retour: regard
					? { vers: '/app/clients', libelle: 'Fournitures Durand' }
					: { vers: '/app', libelle: 'Aujourd’hui' },
				humeur: 'ecoute',
				...(regard
					? {
							regard: {
								libelle: 'Sur la fiche de Fournitures Durand',
								questionsOffertes: true,
								onRetirer: () => undefined
							}
						}
					: {}),
				accueil: {
					titre: 'Je veille sur 12 dossiers.',
					sousTitre:
						'J’ai tout relu à 14:02. Demandez-moi ce que vous voulez sur vos dossiers, dites-moi quoi faire, ou joignez-moi des factures.'
				},
				messages,
				travail: null,
				refus: null,
				panne: null,
				avertissement: null,
				suggestions: regard
					? [
							'Où en est Fournitures Durand ?',
							'Prépare la prochaine relance de Fournitures Durand',
							'Comment Fournitures Durand paie-t-il d’habitude ?',
							'Note que Fournitures Durand m’a appelé'
						]
					: [
							'Qui me doit le plus ?',
							'Qu’est-ce qui part cette semaine ?',
							'Où en est Fournitures Durand ?',
							'Montre-moi mes documents'
						],
				question,
				onQuestion: setQuestion,
				onEnvoyer: () => setQuestion(''),
				enCours: false,
				placeholder: `Demander à ${NOM_DU_PILOTE}…`,
				arretee: false,
				pieces: {
					fichiers: [],
					onJoindre: () => undefined,
					onRetirer: () => undefined,
					accept: '.pdf,.csv,.xlsx,image/*'
				}
			}}
		/>
	);
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DÉMARRER UN DOSSIER, GUIDÉ — on peut le parcourir en entier dans la salle.
 * ═══════════════════════════════════════════════════════════════════════════ */

function DemoDemarrage() {
	return (
		<EcranDemarrage
			demarrage={{
				client: 'Fournitures Durand',
				emailClient: 'compta@durand.fr',
				emailReponses: null,
				suspendu: false,
				horsPilote: false,
				factures: [
					{ id: 'f1', reference: 'FA-2026-0042', resteDu: 2_400_00n, echeance: '2026-08-31' },
					{ id: 'f2', reference: 'FA-2026-0057', resteDu: 1_850_00n, echeance: '2026-09-15' },
					{ id: 'f3', reference: 'FA-2026-0071', resteDu: 1_750_00n, echeance: '2026-09-30' }
				],
				envoiAutomatique: true,
				aujourdHui: '2026-10-08',
				retour: { vers: '/app/clients', libelle: 'Clients' },
				onDemarrer: () =>
					new Promise((resoudre) =>
						window.setTimeout(
							() => resoudre({ creanceId: 'demo', prochaine: { nom: 'Rappel', le: '2026-10-08' } }),
							1200
						)
					),
				onVoirDossier: () => undefined,
				onParlerAPlume: () => undefined,
				onRevenir: () => undefined
			}}
		/>
	);
}

const LOT_DEMO: readonly DossierADemarrer[] = [
	{
		creanceId: 'c1',
		debiteurId: 'd1',
		client: 'Fournitures Durand',
		restantDu: 6_000_00n,
		nombreFactures: 3,
		manque: null
	},
	{
		creanceId: 'c2',
		debiteurId: 'd2',
		client: 'Transports Vidal',
		restantDu: 4_320_50n,
		nombreFactures: 2,
		manque: null
	},
	{
		creanceId: 'c3',
		debiteurId: 'd3',
		client: 'Boulangerie Martin',
		restantDu: 1_180_00n,
		nombreFactures: 1,
		manque: null
	},
	{
		creanceId: 'c4',
		debiteurId: 'd4',
		client: 'Atelier Rousseau',
		restantDu: 2_640_00n,
		nombreFactures: 4,
		manque: 'Il me manque son adresse e-mail'
	},
	{
		creanceId: 'c5',
		debiteurId: 'd5',
		client: 'Garage Leroy',
		restantDu: 890_00n,
		nombreFactures: 1,
		manque: 'En procédure collective ou radié'
	}
];

function DemoLot({ variante }: { etat: EtatDemo; variante?: string }) {
	const forme = variante ?? 'liste';
	return (
		<EcranDemarrageEnLot
			lot={{
				dossiers: forme === 'vide' ? [] : LOT_DEMO,
				emailReponsesConnu: true,
				travail:
					forme === 'travail'
						? {
								titre: 'Démarre 3 dossiers',
								etapes: [
									{ libelle: 'Démarre le dossier de Fournitures Durand', etat: 'faite' },
									{ libelle: 'Démarre le dossier de Transports Vidal', etat: 'courante' },
									{ libelle: 'Démarre le dossier de Boulangerie Martin', etat: 'avenir' }
								]
							}
						: null,
				onDemarrer: async (ids) => ids.length,
				onCompleter: () => undefined
			}}
		/>
	);
}

export const ECRANS_PLUME: readonly EcranDuProduit[] = [
	{
		route: '/app/',
		cle: 'plume',
		libelle: 'Plume',
		vide: false,
		Demo: DemoPlume
	},
	{
		route: '/app/pilote/$id',
		libelle: 'Parler à Plume',
		vide: false,
		variantes: ['vide', 'travail', 'reponse', 'geste', 'joindre', 'lecture', 'documents'],
		Demo: DemoConversation
	},
	{
		route: '/app/pilote/',
		libelle: 'Plume, tout l’établissement',
		vide: false,
		variantes: ['reponse', 'vide', 'regard'],
		Demo: DemoConversationEtablissement
	},
	{
		route: '/app/demarrer/$id',
		libelle: 'Démarrer avec Plume',
		vide: false,
		Demo: DemoDemarrage
	},
	{
		route: '/app/demarrer/',
		libelle: 'Démarrer en lot',
		vide: false,
		variantes: ['liste', 'travail', 'vide'],
		Demo: DemoLot
	}
];
