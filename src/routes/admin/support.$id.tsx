import { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { useAction, useMutation } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import type { FunctionReturnType } from 'convex/server';
import { useQuery } from '../../app/donnees';
import { usePlumeDit } from '../../app/parole-de-plume';
import { dureeEnMots } from '../../app/aide';
import { heureEnMots, heureOuJour } from '../../app/heures';
import { permis, useGesteAdmin, useHorlogeAdmin, useRoleAdmin } from '../../app/coquille-admin';
import { ECRANS_D_AIDE } from '../../lib/support/articles';
import { relireLeMessageDeLEquipe } from '../../lib/support/filtres';
import { LIBELLES_DES_ACTES, LIBELLES_DES_RAISONS } from '../../lib/support/passage';
import {
	EcranConversationSupport,
	PoserSonPrenom,
	type ElementVuParLEquipe
} from '../../screens/admin/support';
import type { ModeDuComposeur, VoixDuFil } from '../../ui/support-equipe';

export const Route = createFileRoute('/admin/support/$id')({ component: ConversationSupport });

type Conversation = FunctionReturnType<typeof api.admin.support.conversation>;
type Message = Conversation['messages'][number];

function voixDe(m: Message): VoixDuFil {
	if (m.genre === 'EVENEMENT') return 'EVENEMENT';
	if (m.genre === 'NOTE') return 'NOTE';
	if (m.genre === 'NON_VERIFIE') return 'NON_VERIFIE';
	if (m.auteur === 'PLUME') return 'PLUME';
	if (m.auteur === 'EQUIPE') return 'EQUIPE';
	return 'GERANT';
}

const ETATS: Record<Conversation['etat'], string> = {
	PLUME: 'Chez Plume',
	A_NOUS: 'Chez l’équipe',
	EN_ATTENTE_CLIENT: 'En attente du gérant',
	TERMINEE: 'Terminée'
};

/** Le contexte du compte en rangées : des nombres et des codes, jamais un dossier. */
function rangeesDuContexte(contexte: NonNullable<Conversation['contexte']>) {
	return [
		{ libelle: 'Rôle', valeur: contexte.role === 'ADMINISTRATEUR' ? 'Administrateur' : 'Membre' },
		{ libelle: 'Formule', valeur: `${contexte.formule} · ${contexte.etatAbonnement}` },
		...(contexte.finEssaiLe === undefined ? [] : [{ libelle: 'Fin de l’essai', valeur: contexte.finEssaiLe }]),
		...(contexte.prochainPrelevementLe === undefined
			? []
			: [{ libelle: 'Prochain prélèvement', valeur: contexte.prochainPrelevementLe }]),
		{ libelle: 'Membres', valeur: String(contexte.membres) },
		{ libelle: 'Relances automatiques', valeur: contexte.relancesActivees ? 'Activées' : 'Pas activées' },
		{ libelle: 'Dossiers à démarrer', valeur: String(contexte.dossiersADemarrer) },
		{
			libelle: 'Relances programmées',
			valeur: `${contexte.relancesProgrammees}${contexte.prochaineRelanceLe === undefined ? '' : `, la prochaine le ${contexte.prochaineRelanceLe}`}`
		},
		...(contexte.relancesBloquees.emailClient > 0
			? [{ libelle: 'Bloquées, e-mail du client', valeur: String(contexte.relancesBloquees.emailClient) }]
			: []),
		...(contexte.relancesBloquees.votreEmail ? [{ libelle: 'Son e-mail de réponse', valeur: 'Manquant' }] : []),
		...contexte.connexions.map((c) => ({
			libelle: c.fournisseur,
			valeur: `${c.etat.replace(/_/g, ' ').toLowerCase()}, lu ${c.derniereLecture ?? 'jamais'}`
		})),
		{ libelle: 'Documents en échec', valeur: String(contexte.documentsEnEchec) }
	];
}

/** « Ce que Plume a compris », relu dans le fil : la question et la réponse d'avant le passage. */
function ceQuePlumeACompris(c: Conversation) {
	if (c.raison === undefined) return undefined;
	const passage = c.messages.findIndex((m) => m.evenement === 'PASSE');
	const avant = passage < 0 ? c.messages : c.messages.slice(0, passage);
	const question = [...avant].reverse().find((m) => m.auteur === 'GERANT' && !m.retire);
	const reponse = [...avant].reverse().find((m) => m.auteur === 'PLUME' && !m.retire);
	const depuis =
		c.depuis !== undefined && c.depuis in ECRANS_D_AIDE
			? ECRANS_D_AIDE[c.depuis as keyof typeof ECRANS_D_AIDE].libelle
			: undefined;
	return {
		pourquoi:
			c.acte === undefined ? LIBELLES_DES_RAISONS[c.raison].equipe : `Demande d’acte : ${LIBELLES_DES_ACTES[c.acte]}`,
		question: question?.texte ?? c.titre,
		...(reponse === undefined ? {} : { reponse: reponse.texte }),
		...(depuis === undefined ? {} : { depuis })
	};
}

function ConversationSupport() {
	const { id } = Route.useParams();
	const conversationId = id as Id<'conversationsSupport'>;
	const role = useRoleAdmin();
	const horloge = useHorlogeAdmin();
	const peutLire = permis(role, 'SUPPORT');
	const conversation = useQuery(api.admin.support.conversation, peutLire ? { conversationId } : 'skip');
	const reponses = useQuery(api.admin.support.reponses, peutLire ? {} : 'skip');
	const moi = useQuery(api.admin.support.moi, {});
	const ouvrir = useMutation(api.admin.support.ouvrir);
	const repondre = useMutation(api.admin.support.repondre);
	const noter = useMutation(api.admin.support.noter);
	const regler = useMutation(api.admin.support.regler);
	const retirer = useMutation(api.admin.support.retirerContenu);
	const suspendre = useMutation(api.admin.support.suspendreRelances);
	const poserPrenom = useMutation(api.admin.support.poserPrenom);
	const preparerBrouillon = useAction(api.admin.brouillon.preparer);
	const [brouillonEnCours, setBrouillonEnCours] = useState(false);
	const faire = useGesteAdmin();
	const dire = usePlumeDit();
	const [mode, setMode] = useState<ModeDuComposeur>('REPONSE');
	const [valeur, setValeur] = useState('');
	const [enCours, setEnCours] = useState(false);

	// Une écriture vers le journal du serveur, une fois par conversation ouverte.
	useEffect(() => {
		if (peutLire) void ouvrir({ conversationId });
	}, [peutLire, conversationId, ouvrir]);

	if (!peutLire) return <EcranConversationSupport lecture={{ etat: 'erreur' }} />;
	if (conversation === undefined || horloge === null) {
		return <EcranConversationSupport lecture={{ etat: 'attente' }} />;
	}
	const c = conversation;
	const maintenant = horloge.maintenant;
	const relecture = mode === 'REPONSE' ? relireLeMessageDeLEquipe(valeur) : { refus: null, avertissement: null };
	const prenomDuGerant = (c.auteurNom ?? '').split(' ')[0] ?? '';

	const envoyer = async ({ terminer, confirme }: { terminer: boolean; confirme: boolean }) => {
		if (valeur.trim() === '' || enCours) return;
		setEnCours(true);
		try {
			await faire(
				() =>
					mode === 'NOTE'
						? noter({ conversationId, texte: valeur })
						: repondre({ conversationId, texte: valeur, terminer, confirme }),
				mode === 'NOTE'
					? { titre: 'Note ajoutée', texte: 'Le gérant ne la verra pas.' }
					: { titre: terminer ? 'Envoyé et terminé' : 'Envoyé', texte: 'Le gérant le lit dans son fil.' }
			);
			setValeur('');
		} catch {
			// Le refus est déjà dit par `faire`.
		} finally {
			setEnCours(false);
		}
	};

	const elements: ElementVuParLEquipe[] = c.messages.map((m) => ({
		id: m.id,
		voix: voixDe(m),
		nom:
			m.auteur === 'GERANT'
				? (c.auteurNom ?? 'Le gérant')
				: (m.auteurNom ?? (m.auteur === 'EQUIPE' ? 'L’équipe' : '')),
		texte: m.texte,
		heure: `${heureOuJour(m.le) === heureEnMots(m.le) ? '' : `${heureOuJour(m.le)}, `}${heureEnMots(m.le)}`,
		parEmail: m.canal === 'EMAIL',
		sources: (m.phrases ?? [])
			.map((p) => (p.source.genre === 'ARTICLE' ? `aide ${p.source.cle ?? ''}`.trim() : p.source.genre === 'COMPTE' ? 'compte' : ''))
			.filter((s) => s !== ''),
		...(m.retire ? { retirePar: m.retirePar ?? 'l’équipe' } : {}),
		...(m.genre === 'EVENEMENT' || m.retire
			? {}
			: {
					onRetirer: () =>
						void faire(() => retirer({ messageId: m.id }), {
							titre: 'Contenu retiré',
							texte: 'Sa trace reste dans le fil, et au journal.'
						})
				})
	}));
	const compris = ceQuePlumeACompris(c);
	const attendDepuis =
		c.etat === 'A_NOUS' && c.passeeLe !== undefined ? ` · attend depuis ${dureeEnMots(maintenant - c.passeeLe)}` : '';

	return (
		<EcranConversationSupport
			lecture={{
				etat: 'pret',
				valeur: {
					etablissement: c.etablissement,
					titre: c.titre,
					etat: `${ETATS[c.etat]}${attendDepuis}`,
					etiquettes: [
						...(c.prioritaire ? ['Prioritaire'] : []),
						...(c.reservee ? ['Réservée au fondateur'] : []),
						...(c.verifiee ? [] : ['Expéditeur non vérifié']),
						...(c.canal === 'EMAIL' ? ['Par e-mail'] : []),
						...(c.avis === undefined ? [] : [c.avis.utile ? 'Avis : utile' : 'Avis : pas utile'])
					],
					...(compris === undefined ? {} : { ceQuePlumeACompris: compris }),
					elements,
					contexte: c.contexte === null ? null : rangeesDuContexte(c.contexte),
					precedentes: c.precedentes.map((p) => ({
						id: p.id,
						titre: p.titre,
						ligne: `${ETATS[p.etat]} · ${heureOuJour(p.dernierMessageLe)}`
					})),
					gestes: {
						assignee: c.assigneA ?? null,
						...(moi !== undefined && c.assigneA !== moi.email
							? {
									onMePrendre: () =>
										void faire(() => regler({ conversationId, assigneA: moi.email }), {
											titre: 'Attribuée',
											texte: 'Elle est à vous.'
										})
								}
							: {}),
						prioritaire: c.prioritaire,
						onPrioritaire: () => void faire(() => regler({ conversationId, prioritaire: !c.prioritaire })),
						terminee: c.etat === 'TERMINEE',
						onTerminer: () =>
							void faire(() => regler({ conversationId, etat: 'TERMINEE' }), {
								titre: 'Terminée',
								texte: 'Si le gérant écrit, elle se rouvre.'
							}),
						onRouvrir: () => void faire(() => regler({ conversationId, etat: 'A_NOUS' })),
						...(c.organizationId !== undefined && c.verifiee
							? {
									onSuspendre: () =>
										void faire(() => suspendre({ conversationId }), {
											titre: 'Relances suspendues',
											texte: 'Ce qui était programmé est retenu, et le gérant le lit dans son fil.'
										})
								}
							: {})
					},
					composeur: {
						mode,
						onMode: setMode,
						valeur,
						onChange: setValeur,
						onEnvoyer: (options) => void envoyer(options),
						reponses: (reponses ?? []).map((r) => ({ id: r.id, titre: r.titre })),
						onInserer: (idReponse) => {
							const r = reponses?.find((x) => x.id === idReponse);
							if (r === undefined) return;
							const texte = r.texte
								.replaceAll('{prenom}', prenomDuGerant)
								.replaceAll('{etablissement}', c.etablissement);
							setValeur(valeur.trim() === '' ? texte : `${valeur}\n\n${texte}`);
						},
						enCours,
						...(c.verifiee && !c.messages.some((m) => m.genre === 'NON_VERIFIE')
							? {
									brouillon: {
										enCours: brouillonEnCours,
										onDemander: () => {
											setBrouillonEnCours(true);
											void preparerBrouillon({ conversationId })
												.then((texte) => {
													if (texte === null) {
														dire({
															titre: 'Pas de brouillon',
															texte: 'Plume n’a rien à proposer ici : écrivez la réponse.',
															humeur: 'attention'
														});
													} else {
														setValeur(texte);
													}
												})
												.finally(() => setBrouillonEnCours(false));
										}
									}
								}
							: {}),
						...(relecture.refus !== null
							? { avertissement: relecture.refus }
							: relecture.avertissement !== null
								? { avertissement: relecture.avertissement }
								: {}),
						...(moi !== undefined && moi.prenomAffiche === null
							? {
									prenomManquant: (
										<PoserSonPrenom
											onPoser={(prenom) =>
												void faire(() => poserPrenom({ prenom }), {
													titre: 'Prénom posé',
													texte: `Les clients liront « ${prenom.trim()} ».`
												})
											}
										/>
									)
								}
							: {})
					}
				}
			}}
		/>
	);
}
