import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAction, useMutation } from 'convex/react';
import { useQuery } from '../../app/donnees';
import { useToast } from '@cladd-ui/react';
import {
	AlarmClockIcon,
	ArchiveIcon,
	ArrowUpRightIcon,
	BriefcaseIcon,
	CalendarRangeIcon,
	LinkIcon,
	LockIcon,
	MessageSquareWarningIcon,
	HandCoinsIcon,
	HandIcon,
	MailIcon,
	SendIcon,
	StickyNoteIcon,
	UserCheckIcon,
	UserMinusIcon
} from 'lucide-react';
import { api } from '../../lib/convex/_generated/api';
import type { Id } from '../../lib/convex/_generated/dataModel';
import { evaluerPlafond } from '../../lib/verticales/recouvrement/compagnon/disponibilite';
import { relireTour } from '../../lib/verticales/recouvrement/compagnon/tour';
import { decrireGeste, type GenreGeste } from '../../lib/verticales/recouvrement/compagnon/gestes';
import { EcranConversationPilote, type MessageAffiche } from '../../screens/conversation-pilote';
import {
	BoutonSecondaire,
	CarteDeGeste,
	CarteEtatDuDossier,
	Lien,
	NOM_DU_PILOTE,
	aujourdHuiISO,
	dateRelative,
	eurosCentimes,
	pluriel,
	type EtapeDeTravail
} from '../../ui';

/**
 * `/app/pilote/$id` — PARLER À PLUME D'UN DOSSIER, plein écran.
 *
 * `?question=` remplit le compositeur (une question préparée ailleurs, que le
 * gérant relit). `?envoyer=` l'envoie d'emblée : c'est la question qu'il a déjà
 * tapée depuis la conversation de Plume, et qui l'a mené ici.
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

/**
 * ⚠️ `ConvexError` PORTE SON MESSAGE DANS `.data`, PAS DANS `.message`.
 */
function messageDeLaPanne(e: unknown): string {
	const convexe = e as { data?: unknown };
	if (typeof convexe.data === 'string') return convexe.data;
	return e instanceof Error ? e.message : 'La demande n’a pas abouti.';
}

/**
 * CE QUI MÈNE À CE QU'UN GESTE A PRODUIT, une fois fait (08/10/2026).
 *
 * Le fondateur, devant « Son lien se copie dans le dossier, sous « Pénalités et
 * frais » » : « qu'on puisse accéder directement aux éléments, c'est un principe
 * d'UX de base ». Chaque carte faite porte donc l'accès à ce qu'elle a fait : le
 * lien à copier et la page à voir, le courrier à relire, le décompte arrêté,
 * l'historique, la fiche du client.
 */
function accesDuGeste(
	geste: { readonly genre: GenreGeste; readonly cible?: string },
	{
		id,
		debiteurId,
		onCopier
	}: {
		readonly id: string;
		readonly debiteurId: string | null;
		readonly onCopier: (texte: string) => void;
	}
): ReactNode | undefined {
	const dossier = (ouvrir: string, libelle: string) => (
		<BoutonSecondaire
			as={Lien}
			to="/app/dossier/$id"
			// ⚠️ UNE ASSERTION : `as` efface le générique du routeur. La destination reste
			// vérifiée par `destinations-existent.test.ts`.
			params={{ id } as never}
			search={{ ouvrir } as never}
		>
			{libelle}
		</BoutonSecondaire>
	);
	const fiche =
		debiteurId === null ? undefined : (
			<BoutonSecondaire as={Lien} to="/app/clients/$id" params={{ id: debiteurId } as never}>
				Voir sa fiche
			</BoutonSecondaire>
		);
	switch (geste.genre) {
		case 'RELANCER':
		case 'RETENIR':
			return dossier(
				'courriers',
				geste.genre === 'RELANCER' ? 'Relire le courrier' : 'Voir ses courriers'
			);
		case 'RAPPEL':
		case 'PROMESSE':
		case 'NOTE':
			return dossier('suivi', 'Voir l’historique');
		case 'ECHEANCIER':
			return dossier('suivi', 'Voir le dossier');
		case 'CLASSER':
			return dossier('suivi', 'Voir le dossier');
		case 'CONTESTATION':
			return dossier('litige', 'Voir vos réponses');
		case 'EMAIL':
		case 'RETIRER_DU_PILOTE':
		case 'REMETTRE_AU_PILOTE':
			return fiche;
		case 'ARRETER_DECOMPTE':
		case 'REMISE_CONSEIL':
			return geste.cible === undefined ? (
				dossier('decompte', 'Voir le décompte')
			) : (
				<BoutonSecondaire as={Lien} to="/app/decompte/$id" params={{ id: geste.cible } as never}>
					{geste.genre === 'ARRETER_DECOMPTE' ? 'Voir le décompte' : 'Voir le suivi'}
				</BoutonSecondaire>
			);
		case 'LIEN_PAIEMENT':
			return geste.cible === undefined ? (
				dossier('decompte', 'Voir le lien')
			) : (
				<>
					<BoutonSecondaire
						onClick={() => onCopier(`${window.location.origin}/p/${geste.cible ?? ''}`)}
					>
						Copier le lien
					</BoutonSecondaire>
					<BoutonSecondaire as="a" href={`/p/${geste.cible}`} target="_blank" rel="noreferrer">
						Voir la page
					</BoutonSecondaire>
				</>
			);
		case 'OUVRIR':
			return undefined;
	}
}

/** L'icône de chaque geste : ce qu'il touche, d'un coup d'œil. */
const ICONE_DU_GESTE: Readonly<Record<GenreGeste, ReactNode>> = {
	RELANCER: <SendIcon />,
	RAPPEL: <AlarmClockIcon />,
	PROMESSE: <HandCoinsIcon />,
	NOTE: <StickyNoteIcon />,
	EMAIL: <MailIcon />,
	RETIRER_DU_PILOTE: <UserMinusIcon />,
	REMETTRE_AU_PILOTE: <UserCheckIcon />,
	RETENIR: <HandIcon />,
	OUVRIR: <ArrowUpRightIcon />,
	CONTESTATION: <MessageSquareWarningIcon />,
	ARRETER_DECOMPTE: <LockIcon />,
	LIEN_PAIEMENT: <LinkIcon />,
	REMISE_CONSEIL: <BriefcaseIcon />,
	ECHEANCIER: <CalendarRangeIcon />,
	CLASSER: <ArchiveIcon />
};

/** Le temps qu'une étape reste affichée avant que la suivante commence. */
const CADENCE_DES_ETAPES_MS = 1100;

function ConversationDuDossier() {
	const { id } = Route.useParams();
	const recherche = Route.useSearch();
	const creanceId = id as Id<'creances'>;
	const fil = useQuery(api.recouvrement.conversationLecture.filDuDossier, { creanceId });
	const resume = useQuery(api.recouvrement.conversationLecture.resumeDuDossier, { creanceId });
	const demanderAPlume = useAction(api.recouvrement.conversation.repondre);
	const confirmerGeste = useMutation(api.recouvrement.gestesPlume.confirmer);
	const ecarterGeste = useMutation(api.recouvrement.gestesPlume.ecarter);
	const navigate = useNavigate();
	const toast = useToast();
	const [gesteEnCours, setGesteEnCours] = useState<string | null>(null);

	const [question, setQuestion] = useState(recherche.question ?? '');
	const [envoyee, setEnvoyee] = useState<string | null>(null);
	const [panne, setPanne] = useState<string | null>(null);
	const [etape, setEtape] = useState(0);
	const enCours = envoyee !== null;

	async function demander(texte: string) {
		const posee = texte.trim();
		if (posee === '' || envoyee !== null) return;
		setPanne(null);
		setEtape(0);
		setEnvoyee(posee);
		setQuestion('');
		try {
			// Un refus s'inscrit au fil, avec les gestes proposés malgré tout : il se lit là.
			await demanderAPlume({ creanceId, question: posee });
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

	/*
	  LE GESTE EN ATTENTE LE PLUS RÉCENT PORTE LE BOUTON PLEIN — un seul par écran.
	  Les plus anciens, encore proposés, gardent un bouton de verre.
	*/
	const tours = fil?.tours ?? [];
	const dernierAvecGeste = [...tours]
		.reverse()
		.find((t) => (t.gestes ?? []).some((g) => g.etat === 'PROPOSEE'));
	const principal =
		dernierAvecGeste === undefined
			? null
			: `${dernierAvecGeste._id}-${(dernierAvecGeste.gestes ?? []).findIndex((g) => g.etat === 'PROPOSEE')}`;

	async function confirmer(
		echangeId: Id<'echangesCompagnon'>,
		rang: number,
		genre: GenreGeste,
		ecran?: string
	) {
		const cle = `${echangeId}-${rang}`;
		if (genre === 'OUVRIR') {
			// Chaque écran s'ouvre à sa rubrique : ce qui dit où, y mène. « ARRET » vient
			// d'anciens échanges : le montant du jour vit dans « Pénalités et frais ».
			if (ecran === 'FICHE_CLIENT' && resume !== undefined && resume !== null) {
				void navigate({ to: '/app/clients/$id', params: { id: resume.debiteurId } });
			} else {
				const rubrique =
					ecran === 'COURRIERS'
						? 'courriers'
						: ecran === 'DOCUMENTS'
							? 'pieces'
							: ecran === 'PENALITES' || ecran === 'ARRET'
								? 'decompte'
								: undefined;
				void navigate({
					to: '/app/dossier/$id',
					params: { id },
					...(rubrique === undefined ? {} : { search: { ouvrir: rubrique as never } })
				});
			}
			return;
		}
		setGesteEnCours(cle);
		try {
			await confirmerGeste({ echangeId, rang });
		} catch (e) {
			toast({ title: 'Pas fait', text: messageDeLaPanne(e) });
		} finally {
			setGesteEnCours(null);
		}
	}

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
		if (tour.role === 'GERANT') return { genre: 'GERANT', id: tour._id, texte: tour.texte ?? '' };
		const phrases = relireTour(tour);
		const gestes = tour.gestes ?? [];
		const etat = (tour.etatDuDossier ?? []).map((ligne) => lireLigne(ligne));
		return {
			genre: 'PLUME',
			id: tour._id,
			phrases,
			...(gestes.length === 0 && etat.length === 0
				? {}
				: {
						suite: (
							<div className="flex flex-col gap-2">
								<CarteEtatDuDossier lignes={etat} />
								{gestes.map((geste, rang) => {
									const description = decrireGeste(geste);
									const cle = `${tour._id}-${rang}`;
									return (
										<CarteDeGeste
											key={cle}
											icone={ICONE_DU_GESTE[geste.genre]}
											titre={description.titre}
											{...(description.detail === undefined ? {} : { detail: description.detail })}
											etat={geste.etat}
											{...(geste.resultat === undefined ? {} : { resultat: geste.resultat })}
											principal={cle === principal}
											libelleConfirmer={description.confirmer}
											enCours={gesteEnCours === cle}
											onConfirmer={() => void confirmer(tour._id, rang, geste.genre, geste.texte)}
											{...(() => {
												const acces = accesDuGeste(geste, {
													id,
													debiteurId: resume?.debiteurId ?? null,
													onCopier: (texte) =>
														void navigator.clipboard
															.writeText(texte)
															.then(() => toast({ title: 'Lien copié', text: texte }))
												});
												return acces === undefined ? {} : { acces };
											})()}
											{...(geste.genre === 'OUVRIR'
												? {}
												: { onEcarter: () => void ecarterGeste({ echangeId: tour._id, rang }) })}
										/>
									);
								})}
							</div>
						)
					})
		};
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
							Demandez-moi ce que vous voulez sur ce dossier, ou dites-moi quoi faire : je vous
							propose le geste, vous confirmez.
						</>
					)
				},
				messages,
				travail,
				refus: refusDuPlafond,
				panne,
				avertissement:
					fil?.compteur.niveau === 'AVERTI'
						? `La conversation de votre établissement approche de son plafond du mois. Au plafond, elle s’arrête, et rien d’autre : vos dossiers, leurs calculs et leurs relances continuent.`
						: null,
				suggestions: [
					'Relance-le',
					'Rappelle-moi mardi prochain',
					'Il a promis de payer à la fin du mois',
					'Combien me doit-il, pénalités comprises ?'
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
