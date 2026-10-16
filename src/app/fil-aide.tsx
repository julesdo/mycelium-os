import { useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { ConvexError } from 'convex/values';
import { useQuery } from './donnees';
import { usePlumeDit } from './parole-de-plume';
import { delaiAnnonce, elementsDuFil, estAncienne, sousTitreDuFil } from './aide';
import { quandEnMots } from './heures';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import { moisDe } from '../lib/support/conversation';
import { EcranConversationAbsente, EcranConversationAide } from '../screens/aide';
import { CartesArreterLesEnvois } from '../ui/aide';
import { useMinute } from '../ui/minute';

function messageDuServeur(erreur: unknown, repli: string): string {
	return erreur instanceof ConvexError && typeof erreur.data === 'string' ? erreur.data : repli;
}

/**
 * LE FIL DE L'AIDE, BRANCHÉ (16/10/2026) — une conversation existante, ou un fil neuf
 * (`conversationId` nul) dont le premier envoi crée la conversation.
 */
export function FilAide({
	conversationId,
	questionInitiale,
	depuisPlume = false
}: {
	readonly conversationId: Id<'conversationsSupport'> | null;
	readonly questionInitiale: string;
	/** Le fil neuf vient du Plume de l'espace : il rappelle de relire avant d'envoyer. */
	readonly depuisPlume?: boolean;
}) {
	const navigate = useNavigate();
	const dire = usePlumeDit();
	const [question, setQuestion] = useState(questionInitiale);
	const [pourLEquipe, setPourLEquipe] = useState(false);
	const [enCours, setEnCours] = useState(false);
	// L'horloge à la minute, nulle au rendu serveur : les délais se calculent au client.
	const minute = useMinute();
	const maintenant = (minute ?? 0) * 60_000;

	const conversation = useQuery(
		api.support.fil.conversation,
		conversationId === null ? 'skip' : { conversationId }
	);
	const accueil = useQuery(
		api.support.fil.accueil,
		minute === null ? 'skip' : { mois: moisDe(maintenant) }
	);
	const aArreter = conversation?.messages.some((m) => m.carte === 'ARRETER_LES_ENVOIS') === true;
	const pilote = useQuery(api.recouvrement.pilote.etat, aArreter ? {} : 'skip');

	const envoyer = useMutation(api.support.fil.envoyer);
	const parler = useMutation(api.support.fil.parlerALEquipe);
	const avisSurPlume = useMutation(api.support.fil.avisSurPlume);
	const donnerSonAvis = useMutation(api.support.fil.donnerSonAvis);
	const marquerLue = useMutation(api.support.fil.marquerLue);
	const retenir = useMutation(api.recouvrement.pilote.retenir);
	const activerRelances = useMutation(api.recouvrement.pilote.activerRelances);

	// Lire le fil le marque lu, et annule l'e-mail qui devait porter la réponse.
	const vus = conversation?.messages.length ?? 0;
	useEffect(() => {
		if (conversationId !== null && vus > 0) void marquerLue({ conversationId });
	}, [conversationId, vus, marquerLue]);

	if (minute === null || (conversationId !== null && conversation === undefined)) {
		return <EcranConversationAbsente etat="attente" />;
	}
	if (conversationId !== null && conversation === null) {
		return <EcranConversationAbsente etat="erreur" />;
	}
	const fil = conversation ?? null;
	const plumeOuvert = accueil?.plumeOuvert === true && accueil.plafondAtteint !== true;
	const absentJusquAu = accueil?.absentJusquAu ?? null;
	const delaiHeures = accueil?.delaiHeures;

	const onEnvoyer = async () => {
		const texte = question.trim();
		if (texte === '' || enCours) return;
		setEnCours(true);
		try {
			const id = await envoyer({
				texte,
				...(conversationId === null ? {} : { conversationId }),
				...(pourLEquipe ? { aLEquipe: true } : {})
			});
			setQuestion('');
			if (conversationId === null) {
				void navigate({ to: '/app/aide/$id', params: { id }, replace: true });
			}
		} catch (erreur) {
			dire({
				titre: 'Message pas parti',
				texte: messageDuServeur(erreur, 'Votre message n’est pas parti : réessayez.'),
				humeur: 'attention'
			});
		} finally {
			setEnCours(false);
		}
	};

	const cartesArreter =
		pilote === undefined ? null : (
			<CartesArreterLesEnvois
				relances={pilote.programmes.slice(0, 3).map((p) => ({
					id: p.envoiId,
					client: p.client,
					quand: quandEnMots(p.partiraLe)
				}))}
				onRetenir={(id) => {
					const programme = pilote.programmes.find((p) => p.envoiId === id);
					if (programme === undefined) return;
					void retenir({ envoiId: programme.envoiId }).then(
						() =>
							dire({
								titre: 'Relance retenue',
								texte: `La relance à ${programme.client} ne partira pas.`
							}),
						(erreur: unknown) =>
							dire({
								titre: 'Pas retenue',
								texte: messageDuServeur(erreur, 'Réessayez.'),
								humeur: 'attention'
							})
					);
				}}
				{...(pilote.peutActiver
					? {
							onCouper: () =>
								void activerRelances({ actif: false }).then(
									() => dire({ titre: 'Relances coupées', texte: 'Rien ne partira plus seul.' }),
									(erreur: unknown) =>
										dire({
											titre: 'Pas coupées',
											texte: messageDuServeur(erreur, 'Réessayez.'),
											humeur: 'attention'
										})
								)
						}
					: {})}
				administrateurs={[]}
				relancesCoupees={!pilote.envoiAutomatique}
			/>
		);

	const attendue =
		fil?.etat === 'A_NOUS' && fil.passeeLe !== undefined
			? delaiAnnonce(fil.passeeLe, maintenant, absentJusquAu, delaiHeures)
			: undefined;

	return (
		<EcranConversationAide
			fil={{
				titre: fil?.titre ?? 'Nouvelle question',
				sousTitre: sousTitreDuFil(fil, plumeOuvert, attendue?.enRetard ?? attendue?.attendue),
				plumeOuvert,
				elements:
					fil === null
						? []
						: elementsDuFil(fil, maintenant, absentJusquAu, delaiHeures, {
								onAvis: (messageId, utile) =>
									void avisSurPlume({ messageId: messageId as Id<'messagesSupport'>, utile }),
								versLEspace: (question) =>
									void navigate({ to: '/app/pilote', state: { questionPourPlume: question } }),
								cartesArreter
							}),
				plumeReflechit: fil?.plumeReflechit === true,
				...(fil === null || fil.etat === 'PLUME'
					? {
							parlerALEquipe: () => {
								if (fil === null) setPourLEquipe(true);
								else void parler({ conversationId: fil.id });
							}
						}
					: {}),
				pourLEquipe,
				...(depuisPlume && fil === null
					? {
							relire:
								'Relisez avant d’envoyer : l’équipe Letikette ne doit lire aucun nom de client.'
						}
					: {}),
				...(fil?.avisDemande === true
					? {
							avis: {
								onRepondre: (utile: boolean) =>
									void donnerSonAvis({ conversationId: fil.id, utile })
							}
						}
					: {}),
				...(fil !== null && estAncienne(fil, maintenant)
					? { choixAncienne: { onNouveau: () => void navigate({ to: '/app/aide/nouvelle' }) } }
					: {}),
				question,
				onQuestion: setQuestion,
				onEnvoyer: () => void onEnvoyer(),
				enCours
			}}
		/>
	);
}
