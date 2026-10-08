import { useEffect, useRef, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { evaluerPlafond } from '../../lib/verticales/recouvrement/compagnon/disponibilite';
import { relireTour } from '../../lib/verticales/recouvrement/compagnon/tour';
import {
	EcranConversationPilote,
	type MessageAffiche
} from '../../screens/conversation-pilote';
import {
	NOM_DU_PILOTE,
	aujourdHuiISO,
	dateRelative,
	eurosCentimes,
	pluriel,
	type EtapeDeTravail,
	type RefusAffiche
} from '../../ui';

/**
 * `/app/pilote/$id` — PARLER À PLUME D'UN DOSSIER, plein écran.
 *
 * `?question=` remplit le compositeur (une question préparée ailleurs, que le
 * gérant relit). `?envoyer=` l'envoie d'emblée : c'est la question qu'il a déjà
 * tapée depuis la conversation de Plume, et qui l'a mené ici.
 */
export const Route = createFileRoute('/app/pilote/$id')({
	validateSearch: (recherche: Record<string, unknown>): { question?: string; envoyer?: string } => ({
		...(typeof recherche.question === 'string' ? { question: recherche.question } : {}),
		...(typeof recherche.envoyer === 'string' ? { envoyer: recherche.envoyer } : {})
	}),
	component: ConversationDuDossier
});

/**
 * ⚠️ `ConvexError` PORTE SON MESSAGE DANS `.data`, PAS DANS `.message`.
 */
function messageDeLaPanne(e: unknown): string {
	const convexe = e as { data?: unknown };
	if (typeof convexe.data === 'string') return convexe.data;
	return e instanceof Error ? e.message : 'La demande n’a pas abouti.';
}

/** Le temps qu'une étape reste affichée avant que la suivante commence. */
const CADENCE_DES_ETAPES_MS = 1100;

function ConversationDuDossier() {
	const { id } = Route.useParams();
	const recherche = Route.useSearch();
	const creanceId = id as Id<'creances'>;
	const fil = useQuery(api.recouvrement.conversationLecture.filDuDossier, { creanceId });
	const resume = useQuery(api.recouvrement.conversationLecture.resumeDuDossier, { creanceId });
	const demanderAPlume = useAction(api.recouvrement.conversation.repondre);

	const [question, setQuestion] = useState(recherche.question ?? '');
	const [envoyee, setEnvoyee] = useState<string | null>(null);
	const [refusDuTour, setRefusDuTour] = useState<RefusAffiche | null>(null);
	const [panne, setPanne] = useState<string | null>(null);
	const [etape, setEtape] = useState(0);
	const enCours = envoyee !== null;

	async function demander(texte: string) {
		const posee = texte.trim();
		if (posee === '' || envoyee !== null) return;
		setRefusDuTour(null);
		setPanne(null);
		setEtape(0);
		setEnvoyee(posee);
		setQuestion('');
		try {
			const reponse = await demanderAPlume({ creanceId, question: posee });
			if (reponse.genre === 'REFUS') setRefusDuTour(reponse.refus);
		} catch (e) {
			// Une panne de transport n'est pas un refus du domaine : elle se dit telle quelle.
			setPanne(messageDeLaPanne(e));
		} finally {
			setEnvoyee(null);
		}
	}

	/*
	  LE RYTHME DES ÉTAPES, PENDANT QUE PLUME TRAVAILLE. L'état ne change que dans le
	  rappel de l'horloge, jamais dans le corps de l'effet.
	*/
	useEffect(() => {
		if (!enCours) return;
		const horloge = window.setInterval(() => setEtape((e) => e + 1), CADENCE_DES_ETAPES_MS);
		return () => window.clearInterval(horloge);
	}, [enCours]);

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
		const minuteur = window.setTimeout(() => void demander(texte), 0);
		return () => window.clearTimeout(minuteur);
		// Une seule fois, à l'arrivée : la question vient de l'adresse.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const client = resume?.client ?? 'ce client';
	const aujourdHui = aujourdHuiISO();
	const refusDuPlafond = fil === undefined ? null : evaluerPlafond(fil.compteur.cumul).refus;

	const messages: MessageAffiche[] = (fil?.tours ?? []).map((tour): MessageAffiche => {
		if (tour.role === 'GERANT') return { genre: 'GERANT', id: tour._id, texte: tour.texte ?? '' };
		const phrases = relireTour(tour);
		return { genre: 'PLUME', id: tour._id, phrases };
	});
	if (envoyee !== null) messages.push({ genre: 'GERANT', id: 'en-cours', texte: envoyee });

	const nombre = resume?.nombreFactures ?? 0;
	const libellesEtapes = [
		`Je relis le dossier de ${client}`,
		nombre === 0
			? 'Je reprends le décompte'
			: `Je reprends ${nombre} facture${pluriel(nombre)} et le décompte`,
		'Je vérifie chaque chiffre à sa source',
		'Je rédige ma réponse'
	];
	const travail: EtapeDeTravail[] | null = enCours
		? libellesEtapes.map((libelle, i) => ({
				libelle,
				etat:
					i < Math.min(etape, libellesEtapes.length - 1)
						? 'faite'
						: i === Math.min(etape, libellesEtapes.length - 1)
							? 'courante'
							: 'avenir'
			}))
		: null;

	const prochaine = resume?.prochaineEtape ?? null;

	return (
		<EcranConversationPilote
			fil={{
				titre: NOM_DU_PILOTE,
				sousTitre: resume?.client ?? 'Dossier',
				retour: {
					vers: '/app/dossier/$id',
					parametres: { id },
					libelle: resume?.client ?? 'Dossier'
				},
				humeur: enCours ? 'travaille' : 'ecoute',
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
							Posez-moi une question sur ce dossier : chaque phrase de ma réponse porte sa source.
						</>
					)
				},
				messages,
				travail,
				refus: refusDuTour ?? refusDuPlafond,
				panne,
				avertissement:
					fil?.compteur.niveau === 'AVERTI'
						? `La conversation de votre établissement approche de son plafond du mois. Au plafond, elle s’arrête, et rien d’autre : vos dossiers, leurs calculs et leurs relances continuent.`
						: null,
				suggestions: [
					'Combien me doit-il, pénalités comprises ?',
					'Quelles factures sont dans ce dossier ?',
					'Quel taux est appliqué aux pénalités ?'
				],
				question,
				onQuestion: setQuestion,
				onEnvoyer: () => void demander(question),
				enCours,
				placeholder: `Demander à ${NOM_DU_PILOTE}…`,
				arretee: refusDuPlafond !== null
			}}
		/>
	);
}
