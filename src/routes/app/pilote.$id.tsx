import { useEffect, useRef } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAction } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { useEchangeAvecPlume } from '../../app/echange-plume';
import { useGestesDePlume } from '../../app/gestes-plume';
import { evaluerPlafond } from '../../lib/verticales/recouvrement/compagnon/disponibilite';
import { relireTour } from '../../lib/verticales/recouvrement/compagnon/tour';
import { EcranConversationPilote, type MessageAffiche } from '../../screens/conversation-pilote';
import {
	CarteEtatDuDossier,
	ID_DU_SELECTEUR_DE_PLUME,
	NOM_DU_PILOTE,
	aujourdHuiISO,
	dateRelative,
	eurosCentimes,
	pluriel
} from '../../ui';

/**
 * `/app/pilote/$id` — PARLER À PLUME D'UN DOSSIER, plein écran.
 *
 * `?question=` remplit le compositeur (une question préparée ailleurs, que le
 * gérant relit). `?envoyer=` l'envoie d'emblée : c'est la question qu'il a déjà
 * tapée ailleurs, et qui l'a mené ici.
 *
 * Les gestes se dessinent et se confirment par `app/gestes-plume.tsx`, l'envoi et
 * les documents joints passent par `app/echange-plume.tsx` : les mêmes que dans la
 * conversation de l'établissement.
 */
export const Route = createFileRoute('/app/pilote/$id')({
	validateSearch: (
		recherche: Record<string, unknown>
	): { question?: string; envoyer?: string } => ({
		...(typeof recherche.question === 'string' ? { question: recherche.question } : {}),
		...(typeof recherche.envoyer === 'string' ? { envoyer: recherche.envoyer } : {})
	}),
	component: ConversationDuDossier
});

function ConversationDuDossier() {
	const { id } = Route.useParams();
	const recherche = Route.useSearch();
	const creanceId = id as Id<'creances'>;
	const fil = useQuery(api.recouvrement.conversationLecture.filDuDossier, { creanceId });
	const resume = useQuery(api.recouvrement.conversationLecture.resumeDuDossier, { creanceId });
	const demanderAPlume = useAction(api.recouvrement.conversation.repondre);
	const navigate = useNavigate();

	const client = resume?.client ?? 'ce client';
	const nombre = resume?.nombreFactures ?? 0;

	/*
	  LES DOCUMENTS JOINTS (12/10/2026) : ils passent par le coffre comme tout dépôt,
	  rangés avec les pièces de ce client et de ses factures, puis Plume attend leur
	  lecture avant de répondre.
	*/
	const echange = useEchangeAvecPlume({
		destination: {
			genre: 'PIECES',
			...(resume === undefined || resume === null ? {} : { debiteurId: resume.debiteurId }),
			factureIds: resume?.factureIds ?? []
		},
		joindrePossible: resume !== undefined && resume !== null,
		demanderAuServeur: (question, documents) =>
			demanderAPlume({
				creanceId,
				question,
				...(documents.length === 0 ? {} : { documents: [...documents] })
			}),
		etapes: [
			`Je relis le dossier de ${client}`,
			nombre === 0
				? 'Je reprends le décompte'
				: `Je reprends ${nombre} facture${pluriel(nombre)} et le décompte`,
			'Je vérifie chaque chiffre à sa source',
			'Je rédige ma réponse'
		],
		questionDeDepart: recherche.question ?? ''
	});

	const gestes = useGestesDePlume({
		...(resume === undefined || resume === null
			? {}
			: { dossierDuFil: { id, client: resume.client, debiteurId: resume.debiteurId } }),
		// « Me joindre le document » ouvre le sélecteur du compositeur, au toucher.
		onJoindre: () => document.getElementById(ID_DU_SELECTEUR_DE_PLUME)?.click()
	});

	/*
	  LA QUESTION DÉJÀ TAPÉE AILLEURS PART D'EMBLÉE, une fois. Différée d'un tour
	  d'horloge : l'envoi change l'état, et il ne le change pas dans le corps de
	  l'effet.
	*/
	const dejaEnvoyee = useRef(false);
	useEffect(() => {
		if (recherche.envoyer === undefined || dejaEnvoyee.current) return;
		dejaEnvoyee.current = true;
		const texte = recherche.envoyer;
		const minuteur = window.setTimeout(() => void echange.demander(texte), 0);
		return () => window.clearTimeout(minuteur);
		// Une seule fois, à l'arrivée : la question vient de l'adresse.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const aujourdHui = aujourdHuiISO();
	const refusDuPlafond = fil === undefined ? null : evaluerPlafond(fil.compteur.cumul).refus;
	const tours = fil?.tours ?? [];
	const principal = gestes.principalDe(tours);

	/**
	 * UNE LIGNE DE « OÙ EN EST LE DOSSIER », ET OÙ ELLE MÈNE. Les lignes écrites
	 * avant qu'elles mènent quelque part (une chaîne seule) se lisent sans geste.
	 */
	function lireLigne(ligne: string | { readonly texte: string; readonly vers?: string }) {
		if (typeof ligne === 'string' || ligne.vers === undefined) {
			return { texte: typeof ligne === 'string' ? ligne : ligne.texte };
		}
		const vers = ligne.vers;
		const onOuvrir = (): void => {
			if (vers.startsWith('section:')) {
				void navigate({
					to: '/app/dossier/$id',
					params: { id },
					search: { ouvrir: vers.slice('section:'.length) as never }
				});
			} else if (vers.startsWith('decompte:')) {
				void navigate({ to: '/app/decompte/$id', params: { id: vers.slice('decompte:'.length) } });
			} else if (vers === 'arret') {
				// Anciennes lignes : l'écran d'arrêt n'existe plus.
				void navigate({
					to: '/app/dossier/$id',
					params: { id },
					search: { ouvrir: 'decompte' as never }
				});
			} else if (vers === 'fiche' && resume !== undefined && resume !== null) {
				void navigate({ to: '/app/clients/$id', params: { id: resume.debiteurId } });
			} else if (vers === 'demarrer' && resume !== undefined && resume !== null) {
				void navigate({ to: '/app/demarrer/$id', params: { id: resume.debiteurId } });
			}
		};
		return { texte: ligne.texte, onOuvrir };
	}

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
		const lesGestes = tour.gestes ?? [];
		const etat = (tour.etatDuDossier ?? []).map((ligne) => lireLigne(ligne));
		return {
			genre: 'PLUME',
			id: tour._id,
			phrases: relireTour(tour),
			...(lesGestes.length === 0 && etat.length === 0
				? {}
				: {
						suite: (
							<div className="flex flex-col gap-2">
								<CarteEtatDuDossier lignes={etat} />
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

	const prochaine = resume?.prochaineEtape ?? null;

	return (
		<>
			{echange.visionneuse}
			<EcranConversationPilote
				fil={{
					titre: NOM_DU_PILOTE,
					sousTitre: resume?.client ?? 'Dossier',
					retour: {
						vers: '/app/dossier/$id',
						parametres: { id },
						libelle: resume?.client ?? 'Dossier'
					},
					humeur: echange.enCours ? 'travaille' : 'ecoute',
					accueil: {
						titre: `Je m’occupe du dossier de ${client}.`,
						sousTitre: (
							<>
								{resume === undefined || resume === null
									? null
									: `${eurosCentimes(resume.restantDu)} à recouvrer`}
								{prochaine === null
									? null
									: ` · ${prochaine.nom.toLowerCase()} ${prochaine.le <= aujourdHui ? 'aujourd’hui' : dateRelative(prochaine.le, aujourdHui)}`}
								<br />
								Demandez-moi ce que vous voulez sur ce dossier, ou joignez-moi un document : je vous
								propose le geste, vous confirmez.
							</>
						)
					},
					messages,
					travail: echange.travail,
					refus: refusDuPlafond,
					panne: echange.panne,
					avertissement:
						fil?.compteur.niveau === 'AVERTI'
							? `La conversation de votre établissement approche de son plafond du mois. Au plafond, elle s’arrête, et rien d’autre : vos dossiers, leurs calculs et leurs relances continuent.`
							: null,
					// Ce qu'on peut lui dire, y compris ce qu'il sait faire depuis le 12/10 :
					// noter un paiement, recevoir un document, ouvrir le choix d'un avocat.
					suggestions: [
						'Relance-le',
						'Il a payé 500 € hier',
						'Il a promis de payer à la fin du mois',
						'Rappelle-moi mardi prochain',
						'Combien me doit-il, pénalités comprises ?',
						'Je veux choisir un avocat'
					],
					question: echange.question,
					onQuestion: echange.setQuestion,
					onEnvoyer: () => void echange.demander(echange.question),
					enCours: echange.enCours,
					placeholder: `Demander à ${NOM_DU_PILOTE}…`,
					arretee: refusDuPlafond !== null,
					...(echange.pieces === undefined ? {} : { pieces: echange.pieces })
				}}
			/>
		</>
	);
}
