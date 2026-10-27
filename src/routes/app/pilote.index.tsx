import { useState } from 'react';
import { createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router';
import { useAction, useMutation } from 'convex/react';
import { useToast } from '@cladd-ui/react';
import { useQuery } from '../../app/donnees';
import { api } from '../../lib/convex/_generated/api';
import { useEchangeAvecPlume } from '../../app/echange-plume';
import { messageDeLaPanne, useGestesDePlume } from '../../app/gestes-plume';
import { evaluerPlafond } from '../../lib/verticales/recouvrement/compagnon/disponibilite';
import {
	serieEnMots,
	somme,
	titreDeLaJournee
} from '../../lib/verticales/recouvrement/compagnon/journee';
import {
	engagementsDePlume,
	etatDeLaVeille
} from '../../lib/verticales/recouvrement/compagnon/veille';
import { heureOuJour, quandEnMots } from '../../app/heures';
import { relireTour } from '../../lib/verticales/recouvrement/compagnon/tour';
import {
	ECRANS_DE_PLUME,
	libelleDuRegard,
	questionsDuRegard,
	type EcranDePlume,
	type RegardDePlume
} from '../../lib/verticales/recouvrement/compagnon/presence';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { EcranConversationPilote, type MessageAffiche } from '../../screens/conversation-pilote';
import {
	BoutonTexte,
	CarteBouton,
	CarteLien,
	FeuilleDActivation,
	FeuilleDesEngagements,
	ID_DU_SELECTEUR_DE_PLUME,
	MaisonDePlume,
	LigneDeReleve,
	ListeDeCartes,
	ListeDeReleve,
	NOM_DU_PILOTE,
	aujourdHuiISO,
	dateCourte,
	dateRelative,
	eurosCentimes,
	pluriel,
	type EtapeDeTravail,
	type HumeurPlume
} from '../../ui';
import { suivre } from '../../app/analytique';

/**
 * `/app/pilote` — LA CONVERSATION DE PLUME SUR TOUT L'ÉTABLISSEMENT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE RÉPOND, ELLE NE RENVOIE PLUS (12/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle cherchait un nom de client dans la question et menait à son dossier, ou
 * demandait « De quel client parlez-vous ? ». Le fondateur : « Plume doit être
 * capable de tout faire dans l'application ». Elle répond désormais sur tout
 * l'établissement (`conversation.repondreSurLEtablissement`) : qui doit le plus, ce
 * qui part, ce qui attend ; elle cite des dossiers, dessinés ici en cartes avec les
 * chiffres de l'écran Dossiers ; elle propose des gestes sur n'importe quel dossier,
 * et ouvre n'importe quel écran. On peut lui joindre des factures : elles partent au
 * coffre et sont lues avant qu'elle réponde.
 *
 * Avant la première question, Plume dit toujours ce qu'il fait et a fait : son
 * travail en cours, ses derniers travaux, ce qui attend d'être démarré, les relances
 * qui partent bientôt, chacune avec « Retenir ».
 *
 * ⚠️ ET ELLE S'OUVRE SUR SA MAISON (14/10/2026) : où il en est en une phrase, trois
 * faits vérifiables, sa journée, et ses engagements (`ui/maison-plume.tsx`,
 * `compagnon/veille.ts`). C'est là que mène la capsule en direct, et le point du
 * retour : la page où tout ce qu'il fait se vérifie.
 */
export const Route = createFileRoute('/app/pilote/')({
	/**
	 * `?question=` remplit le compositeur : une question préparée ailleurs (la santé d'un
	 * client), que le gérant relit. `?depuis=` et `?client=` disent d'où l'on a touché
	 * Plume (13/10/2026) : la pastille du regard, ses questions, et ce que lit le modèle.
	 */
	validateSearch: (
		recherche: Record<string, unknown>
	): { question?: string; depuis?: EcranDePlume; client?: string } => {
		const depuis = ECRANS_DE_PLUME.find((e) => e === recherche.depuis);
		return {
			...(typeof recherche.question === 'string' ? { question: recherche.question } : {}),
			...(depuis === undefined ? {} : { depuis }),
			...(typeof recherche.client === 'string' && recherche.client !== ''
				? { client: recherche.client }
				: {})
		};
	},
	component: ConversationDePlume
});

const HEURE = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const DEPART = new Intl.DateTimeFormat('fr-FR', {
	weekday: 'long',
	hour: '2-digit',
	minute: '2-digit'
});

function ConversationDePlume() {
	const navigate = useNavigate();
	const toast = useToast();
	const pilote = useQuery(api.recouvrement.pilote.etat, {});
	const fil = useQuery(api.recouvrement.conversationEtablissement.filDeLEtablissement, {});
	const dossiers = useQuery(api.recouvrement.lecture.indexDossiers, {});
	const clients = useQuery(api.recouvrement.lecture.listerDebiteurs, {});
	const recentes = useQuery(api.recouvrement.conversationEtablissement.conversationsRecentes, {});
	const journee = useQuery(api.recouvrement.journee.etat, {});
	const [engagements, setEngagements] = useState(false);
	const retenir = useMutation(api.recouvrement.pilote.retenir);
	const activerRelances = useMutation(api.recouvrement.pilote.activerRelances);
	const demanderAPlume = useAction(api.recouvrement.conversation.repondreSurLEtablissement);
	const [activation, setActivation] = useState(false);
	const aujourdHui = aujourdHuiISO();

	const ouverts = (dossiers ?? []).filter(
		(d) => !d.classe && d.etape !== 'REGLE' && d.principalRestantDu > 0n
	);
	const demarres = ouverts.filter((d) => d.aDemarrer !== true).length;
	const parId = new Map((dossiers ?? []).map((d) => [d._id as string, d]));

	const { question: questionDeLAdresse, depuis, client: clientDuRegard } = Route.useSearch();
	// Une question confiée par l'Aide arrive par l'état de la navigation, jamais par l'adresse.
	const questionDeLEtat = useRouterState({
		select: (etat) => etat.location.state.questionPourPlume
	});
	const questionDeDepart = questionDeLAdresse ?? questionDeLEtat;

	/*
	  D'OÙ L'ON PARLE (13/10/2026) — l'écran qu'on regardait en touchant Plume, et le
	  client qu'il montrait. Le ✕ de la pastille ramène à tout l'établissement.
	*/
	const nomDuClient =
		clientDuRegard === undefined
			? undefined
			: clients?.find((c) => c._id === clientDuRegard)?.denomination;
	const regard: RegardDePlume | null =
		depuis === undefined
			? null
			: {
					ecran: depuis,
					...(clientDuRegard === undefined || nomDuClient === undefined
						? {}
						: { client: { id: clientDuRegard, nom: nomDuClient } })
				};
	const libelleRegard = regard === null ? null : libelleDuRegard(regard);
	/** Une question est partie de cette visite : les questions du regard se retirent. */
	const [questionPartie, setQuestionPartie] = useState(false);

	const echange = useEchangeAvecPlume({
		questionDeDepart: questionDeDepart ?? '',
		// Des factures, comme le bouton rond de l'accueil : lues, puis rangées par client.
		destination: { genre: 'FACTURES' },
		joindrePossible: true,
		demanderAuServeur: (question, documents) =>
			demanderAPlume({
				question,
				...(documents.length === 0 ? {} : { documents: [...documents] }),
				...(depuis === undefined
					? {}
					: {
							regard: {
								ecran: depuis,
								...(clientDuRegard === undefined
									? {}
									: { client: clientDuRegard as Id<'debiteurs'> })
							}
						})
			}),
		etapes: [
			`Je relis vos ${ouverts.length > 1 ? `${ouverts.length} dossiers` : 'dossiers'}`,
			'Je regarde ce qui part et ce qui attend',
			'Je rédige ma réponse'
		]
	});

	const gestes = useGestesDePlume({
		dossierParId: (id) => {
			const dossier = parId.get(id);
			return dossier === undefined
				? undefined
				: { id, client: dossier.debiteur, debiteurId: dossier.debiteurId };
		},
		clientParId: (id) => clients?.find((c) => c._id === id)?.denomination,
		// « Déposer des factures » les joint ici même : le sélecteur du compositeur s'ouvre.
		onJoindre: () => document.getElementById(ID_DU_SELECTEUR_DE_PLUME)?.click(),
		onRelances: () => {
			if (pilote?.envoiAutomatique === true) {
				toast({
					title: 'Déjà activées',
					text: 'Les relances automatiques partent déjà ; chacune se retient encore d’un geste.'
				});
			} else setActivation(true);
		}
	});

	const travaux = pilote?.travaux ?? [];
	const travailDuPilote = travaux.find((t) => t.etat === 'EN_COURS') ?? null;
	const faits = travaux.filter((t) => t.etat === 'FAIT' || t.etat === 'ECHEC').slice(0, 3);
	const humeur: HumeurPlume = echange.enCours
		? 'travaille'
		: travailDuPilote !== null
			? 'travaille'
			: faits[0]?.etat === 'ECHEC' || (pilote?.aDemarrer ?? 0) > 0
				? 'attention'
				: 'repos';

	/* ── Le relevé de Plume, avant toute question ─────────────────────────── */
	const preambule: MessageAffiche[] = [];
	if (pilote !== undefined && travailDuPilote === null && faits.length === 0) {
		preambule.push({
			genre: 'PLUME',
			id: 'rien',
			texte:
				'Je n’ai encore rien eu à faire ici. Joignez-moi vos factures avec le bouton + : je les relis dès qu’elles arrivent, et j’ouvre le dossier de chaque client en retard.'
		});
	}
	if (faits.length > 0) {
		preambule.push({
			genre: 'PLUME',
			id: 'faits',
			texte: 'Ce que j’ai fait dernièrement :',
			suite: (
				<ListeDeReleve>
					{faits.map((travail) => (
						<LigneDeReleve
							key={travail.id}
							titre={travail.titre}
							ligne={
								travail.etat === 'ECHEC'
									? 'Interrompu. Je reprendrai à ma prochaine relecture.'
									: (travail.bilan ?? 'Terminé.')
							}
							{...(travail.termineLe === null
								? {}
								: {
										date:
											new Date(travail.termineLe).toISOString().slice(0, 10) === aujourdHui
												? HEURE.format(new Date(travail.termineLe))
												: dateCourte(new Date(travail.termineLe).toISOString().slice(0, 10))
									})}
						/>
					))}
				</ListeDeReleve>
			)
		});
	}
	const aDemarrer = pilote?.aDemarrer ?? 0;
	if (aDemarrer > 0) {
		preambule.push({
			genre: 'PLUME',
			id: 'a-demarrer',
			humeur: 'attention',
			texte: `J’ai préparé ${aDemarrer} dossier${pluriel(aDemarrer)} de clients en retard. Je ne relance rien tant que vous ne ${aDemarrer > 1 ? 'les avez' : 'l’avez'} pas démarré${pluriel(aDemarrer)}.`,
			suite: (
				<ListeDeCartes>
					<CarteBouton
						titre={aDemarrer > 1 ? `Démarrer les ${aDemarrer} dossiers` : 'Démarrer le dossier'}
						ligne="Tout est prêt : vous décochez ceux que vous gardez en main"
						onClick={() => void navigate({ to: '/app/demarrer' })}
					/>
				</ListeDeCartes>
			)
		});
	}
	const programmes = pilote?.programmes ?? [];
	if (programmes.length > 0) {
		preambule.push({
			genre: 'PLUME',
			id: 'programmes',
			texte: `Je relance bientôt ${programmes.length === 1 ? 'un client' : `${programmes.length} clients`}, à votre nom. Vous pouvez encore retenir chaque envoi.`,
			suite: (
				<ListeDeReleve>
					{programmes.slice(0, 5).map((relance) => (
						<div key={relance.envoiId} className="flex items-center gap-2 pr-2">
							<div className="min-w-0 flex-1">
								<LigneDeReleve
									titre={relance.client}
									ligne={`${relance.etape} · ${DEPART.format(new Date(relance.partiraLe))}`}
								/>
							</div>
							<BoutonTexte
								onClick={() =>
									void retenir({ envoiId: relance.envoiId }).catch((e: unknown) =>
										toast({ title: 'Pas retenue', text: messageDeLaPanne(e) })
									)
								}
							>
								Retenir
							</BoutonTexte>
						</div>
					))}
				</ListeDeReleve>
			)
		});
	}

	/*
	  LES DERNIÈRES CONVERSATIONS SUR UN DOSSIER, à reprendre d'un toucher (Perplexity,
	  Fireflies) : elles vivaient chacune dans leur dossier, sans chemin pour y revenir.
	*/
	if ((recentes ?? []).length > 0) {
		preambule.push({
			genre: 'PLUME',
			id: 'recentes',
			texte: 'Nos dernières conversations sur un dossier :',
			suite: (
				<ListeDeCartes>
					{(recentes ?? []).map((conversation) => (
						<CarteLien
							key={conversation.creanceId}
							titre={conversation.client}
							ligne="Reprendre la conversation"
							date={dateRelative(new Date(conversation.le).toISOString().slice(0, 10), aujourdHui)}
							vers="/app/pilote/$id"
							parametres={{ id: conversation.creanceId }}
						/>
					))}
				</ListeDeCartes>
			)
		});
	}

	/* ── Le fil : les questions, et ce que Plume y répond ────────────────── */
	const tours = fil?.tours ?? [];
	const principal = gestes.principalDe(tours);
	const messages: MessageAffiche[] = tours.map((tour): MessageAffiche => {
		if (tour.role === 'GERANT')
			return {
				genre: 'GERANT',
				id: tour._id,
				texte: tour.texte ?? '',
				...(tour.documents === undefined
					? {}
					: { documents: echange.documentsDuTour(tour._id, tour.documents) })
			};
		const cites = (tour.dossiersCites ?? [])
			.map((id) => parId.get(id))
			.filter((d): d is NonNullable<typeof d> => d !== undefined);
		const lesGestes = tour.gestes ?? [];
		return {
			genre: 'PLUME',
			id: tour._id,
			phrases: relireTour(tour),
			...(cites.length === 0 && lesGestes.length === 0
				? {}
				: {
						suite: (
							<div className="flex flex-col gap-2">
								{cites.length === 0 ? null : (
									<ListeDeCartes>
										{cites.map((dossier) => (
											<CarteLien
												key={dossier._id}
												titre={dossier.debiteur}
												montant={eurosCentimes(dossier.principalRestantDu)}
												ligne={ligneDuDossier(dossier, aujourdHui)}
												vers="/app/dossier/$id"
												parametres={{ id: dossier._id }}
											/>
										))}
									</ListeDeCartes>
								)}
								{gestes.cartes(tour._id, lesGestes, principal)}
							</div>
						)
					})
		};
	});
	if (echange.enAttente !== null)
		messages.push({
			genre: 'GERANT',
			id: 'en-cours',
			texte: echange.enAttente.texte,
			documents: echange.enAttente.documents
		});

	const etapesDuPilote: EtapeDeTravail[] | null =
		travailDuPilote === null
			? null
			: travailDuPilote.etapes.map((etape, i) => {
					const rang = travailDuPilote.etapes.findIndex((e) => !e.faite);
					return {
						libelle: etape.libelle,
						etat: etape.faite ? 'faite' : i === rang ? 'courante' : 'avenir'
					};
				});

	/*
	  CE QU'ON PEUT LUI DEMANDER, D'APRÈS CE QUI SE PASSE — pas une liste figée : ce
	  qui attend d'être démarré, ce qui part bientôt, le plus gros dossier.
	*/
	const plusGros = ouverts[0];
	const questionsDeLEcran = regard === null ? [] : questionsDuRegard(regard);
	const suggestions =
		questionsDeLEcran.length > 0
			? questionsDeLEcran
			: [
					'Qui me doit le plus ?',
					...(aDemarrer > 0 ? ['Quels dossiers attendent que je les démarre ?'] : []),
					...(programmes.length > 0 ? ['Qu’est-ce qui part cette semaine ?'] : []),
					...(plusGros === undefined ? [] : [`Où en est ${plusGros.debiteur} ?`]),
					'Montre-moi mes documents'
				];

	const refusDuPlafond = fil === undefined ? null : evaluerPlafond(fil.compteur.cumul).refus;

	/* ── Sa maison : où il en est, ses faits, sa journée, ses engagements ── */
	const relancesAutomatiques = pilote?.envoiAutomatique === true;
	const prochaine = [...programmes].sort((a, b) => a.partiraLe - b.partiraLe)[0];
	const veille = etatDeLaVeille({
		travail: travailDuPilote?.titre ?? null,
		enAttente: journee === undefined ? aDemarrer : somme(journee.restants),
		...(journee === undefined ? {} : { parGenre: journee.restants }),
		dossiersSuivis: ouverts.length,
		relancesAutomatiques,
		prochaine: prochaine === undefined ? null : quandEnMots(prochaine.partiraLe)
	});
	const maison =
		pilote === undefined ? undefined : (
			<MaisonDePlume
				humeur={echange.enCours ? 'travaille' : veille.humeur}
				titre={veille.titre}
				ligne={veille.ligne}
				faits={[
					{
						valeur: pilote.derniereVeille === null ? 'À venir' : heureOuJour(pilote.derniereVeille),
						libelle: 'dernière relecture'
					},
					// Démarrés, pas « suivis » (diagnostic UX du 27/10/2026) : « 5 dossiers suivis »
					// à côté de « Démarrer 0 sur 5 » comptait des dossiers seulement préparés.
					{
						valeur: String(demarres),
						libelle: demarres > 1 ? 'dossiers démarrés' : 'dossier démarré'
					},
					{
						valeur: relancesAutomatiques ? 'Activées' : 'Coupées',
						libelle: 'relances automatiques'
					}
				]}
				{...(journee === undefined
					? {}
					: {
							journee: {
								titre: titreDeLaJournee(
									{ faits: journee.faits, total: journee.total, defis: journee.defis },
									journee.tenue
								),
								serie: serieEnMots(journee.serie),
								defis: journee.defis.map((defi) => ({
									nom: defi.nom,
									fait: defi.fait,
									total: defi.total
								}))
							}
						})}
				onEngagements={() => setEngagements(true)}
				{...(tours.length === 0
					? {
							invitation:
								'Demandez-moi ce que vous voulez sur vos dossiers, dites-moi quoi faire, ou joignez-moi des factures.'
						}
					: {})}
			/>
		);

	return (
		<>
			{echange.visionneuse}
			<FeuilleDesEngagements
				ouverte={engagements}
				onFermer={() => setEngagements(false)}
				engagements={engagementsDePlume(relancesAutomatiques)}
			/>
			<FeuilleDActivation
				ouverte={activation}
				onFermer={() => setActivation(false)}
				onActiver={() => {
					setActivation(false);
					void activerRelances({ actif: true }).then(
						() => {
							suivre('relances-activees', { depuis: 'plume' });
							toast({
								title: 'Relances activées',
								text: 'Chacune s’affiche une heure avant de partir.'
							});
						},
						(e: unknown) => toast({ title: 'Pas activées', text: messageDeLaPanne(e) })
					);
				}}
			/>
			<EcranConversationPilote
				fil={{
					titre: NOM_DU_PILOTE,
					sousTitre: echange.enCours || travailDuPilote !== null ? 'Au travail' : 'Votre pilote',
					retour: retourDuRegard(depuis, clientDuRegard, nomDuClient),
					...(libelleRegard === null
						? {}
						: {
								regard: {
									libelle: libelleRegard,
									questionsOffertes: !questionPartie,
									onRetirer: () => void navigate({ to: '/app/pilote', search: {}, replace: true })
								}
							}),
					humeur,
					...(maison === undefined ? {} : { maison }),
					accueil: {
						titre:
							ouverts.length === 0
								? 'Je veille sur vos factures.'
								: `Je veille sur ${ouverts.length} dossier${pluriel(ouverts.length)}.`,
						sousTitre: (
							<>
								{travailDuPilote !== null
									? 'Je suis au travail en ce moment. '
									: pilote?.derniereVeille === null || pilote === undefined
										? ''
										: `J’ai tout relu à ${HEURE.format(new Date(pilote.derniereVeille))}. `}
								Demandez-moi ce que vous voulez sur vos dossiers, dites-moi quoi faire, ou
								joignez-moi des factures.
							</>
						)
					},
					preambule,
					messages,
					travail: echange.travail ?? (tours.length === 0 ? etapesDuPilote : null),
					...(echange.enCours || travailDuPilote === null || tours.length > 0
						? {}
						: { titreDuTravail: travailDuPilote.titre }),
					refus: refusDuPlafond,
					panne: echange.panne,
					avertissement:
						fil?.compteur.niveau === 'AVERTI'
							? 'La conversation de votre établissement approche de son plafond du mois. Au plafond, elle s’arrête, et rien d’autre : vos dossiers, leurs calculs et leurs relances continuent.'
							: null,
					suggestions,
					question: echange.question,
					onQuestion: echange.setQuestion,
					onEnvoyer: () => {
						setQuestionPartie(true);
						suivre('plume-question', { lieu: 'etablissement' });
						void echange.demander(echange.question);
					},
					enCours: echange.enCours,
					placeholder: `Demander à ${NOM_DU_PILOTE}…`,
					arretee: refusDuPlafond !== null,
					...(echange.pieces === undefined ? {} : { pieces: echange.pieces })
				}}
			/>
		</>
	);
}

/** Le retour rond ramène d'où l'on a touché Plume, et à l'accueil sinon. */
function retourDuRegard(
	depuis: EcranDePlume | undefined,
	client: string | undefined,
	nom: string | undefined
) {
	if (client !== undefined && depuis === 'CLIENT')
		return {
			vers: '/app/clients/$id',
			parametres: { id: client },
			libelle: nom ?? 'Ce client'
		} as const;
	if (client !== undefined && depuis === 'SANTE_CLIENT')
		return {
			vers: '/app/risque/$id',
			parametres: { id: client },
			libelle: nom ?? 'Sa santé'
		} as const;
	switch (depuis) {
		case 'DOSSIERS':
			return { vers: '/app/dossiers', libelle: 'Dossiers' } as const;
		case 'CLIENTS':
			return { vers: '/app/clients', libelle: 'Clients' } as const;
		case 'COFFRE':
			return { vers: '/app/coffre', libelle: 'Coffre-fort' } as const;
		case 'SANTE':
			return { vers: '/app/risque', libelle: 'La santé de vos clients' } as const;
		case 'DEFENSE':
			return { vers: '/app/defense', libelle: 'Défense' } as const;
		default:
			return { vers: '/app', libelle: 'Aujourd’hui' } as const;
	}
}

/** Ce qui se passe sur un dossier cité, en cinq mots : sa prochaine étape, ou son état. */
function ligneDuDossier(
	dossier: {
		readonly aDemarrer: boolean;
		readonly courrierAValider: boolean;
		readonly etape: string;
		readonly prochaineEtape?: {
			readonly nom: string;
			readonly le: string;
			readonly pause?: { readonly raison: 'PROMESSE' | 'ECHEANCIER'; readonly le: string };
		};
	},
	aujourdHui: string
): string {
	// Réglé entre-temps, il n'a plus rien à démarrer (audit des parcours Pro du 27/10/2026).
	if (dossier.etape === 'REGLE') return 'Réglé';
	if (dossier.aDemarrer) return 'Prêt, à démarrer';
	if (dossier.courrierAValider) return 'Un courrier à relire';
	if (dossier.etape === 'TRIBUNAL') return 'Chez un professionnel';
	const suite = dossier.prochaineEtape;
	if (suite === undefined) return 'Pas d’étape à venir';
	if (suite.pause !== undefined)
		return suite.pause.raison === 'PROMESSE'
			? `Promesse, ${dateRelative(suite.pause.le, aujourdHui)}`
			: `Échéancier, ${dateRelative(suite.pause.le, aujourdHui)}`;
	return `${suite.nom}, ${suite.le <= aujourdHui ? 'aujourd’hui' : dateRelative(suite.le, aujourdHui)}`;
}
