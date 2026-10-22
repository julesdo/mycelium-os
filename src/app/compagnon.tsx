import { useEffect, useState, type ReactNode } from 'react';
import { CatchBoundary, useNavigate, useRouterState } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import { useQuery } from './donnees';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import { enDirect } from '../lib/verticales/recouvrement/compagnon/en-direct';
import { pointDuRetour } from '../lib/verticales/recouvrement/compagnon/retour';
import {
	cleDuBonjour,
	ligneDeLaSuite,
	type CibleDePlume
} from '../lib/verticales/recouvrement/compagnon/presence';
import {
	besoinsDuJour,
	serieEnMots,
	titreDeLaJournee
} from '../lib/verticales/recouvrement/compagnon/journee';
import {
	BoutonCompagnon,
	CapsulePlume,
	NOM_DU_PILOTE,
	ScenePlume,
	eurosCentimes,
	useReflexion,
	type HumeurPlume
} from '../ui';
import { aujourdHuiISO, heureDeParis } from '../ui/horloge';
import { heureEnMots, jourDuRetour, quandEnMots } from './heures';
import {
	paroleDePlume,
	prenomDe,
	useParoleDePlume,
	usePlumeDit,
	type ParoleAffichee
} from './parole-de-plume';
import { TITRE_DE_NOTIFICATION, type GenreNotification } from '../screens/titres';
import { suivre } from './analytique';

/**
 * PLUME, BRANCHÉ DANS LA BARRE — son humeur lue sur le pilote, ce qu'il dit, et où il
 * mène.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA FEUILLE DE DISCUSSION A DISPARU (08/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce fichier ouvrait une `Popup`. Jugée « horrible » par le fondateur, elle est
 * remplacée par une conversation PLEIN ÉCRAN (`/app/pilote/$id` pour un dossier,
 * `/app/pilote` partout ailleurs).
 *
 * ⚠️ PUIS IL A PARLÉ (13/10/2026), ET LE SOIR MÊME IL EST SORTI DE LA BARRE. Le
 * fondateur, sur la première bulle : « elles se ferment très vite et ne sont pas
 * assez utiles […] va voir sur Duolingo ». Plume sort désormais du bouton et se
 * tient au-dessus de la barre, grand, à côté de sa bulle (`ScenePlume`) ; il dit ce
 * qu'il a à dire, une chose après l'autre, et rien ne se ferme seul. Autour de lui,
 * l'anneau de la journée se remplit à mesure que ses défis tombent. Ce fichier
 * branche tout cela ; ce qu'il dit se décide dans `app/parole-de-plume.tsx`.
 *
 * ⚠️ ET IL SE VOIT TRAVAILLER, PARTOUT (14/10/2026). Le fondateur : « qu'on sente le
 * côté fiable du compagnon […] qu'il accompagne tout le temps, en automatique ».
 * Au-dessus de la barre, une capsule dit ce qu'il fait en ce moment, ou la relance
 * qui part dans l'heure, avec « Retenir » (`CapsuleBranchee`). Elle se tait quand
 * sa bulle parle, et sur Aujourd'hui, dont le bloc du pilote montre déjà tout cela.
 *
 * ⚠️ L'IDENTIFIANT SE LIT SUR LES PARAMÈTRES DE LA ROUTE, PAS SUR L'ADRESSE :
 * `matches` porte l'`id` résolu de `/app/dossier/$id`. (Une version d'avant lisait
 * un `?ligne=` disparu, et le compagnon était devenu injoignable.)
 */

const ROUTE_DOSSIER = '/app/dossier/$id';
/** Les pages d'un client : Plume s'ouvre en sachant duquel on parle. */
const ROUTES_D_UN_CLIENT: readonly string[] = ['/app/clients/$id', '/app/risque/$id'];
/** Au-delà de ces pixels défilés, on lit autre chose : Plume rentre dans la barre. */
const SEUIL_DE_DEFILEMENT = 120;

/** Ce que la bulle ne redit pas : la fête du paiement ou la célébration le disent déjà. */
const SANS_PAROLE: ReadonlySet<string> = new Set([
	'PAIEMENT_RECU',
	'JALON',
	'SEMAINE',
	'RECOMMANDATION'
]);

type Journee = FunctionReturnType<typeof api.recouvrement.journee.etat>;

/**
 * LA VISITE S'OUVRE UNE FOIS PAR CHARGEMENT DE L'APPLICATION — pas à chaque montage :
 * en développement, React monte deux fois, et la seconde visite verrait la première
 * comme « votre passage d'il y a une seconde ».
 */
let visiteOuverte = false;

/** Le bouton de Plume, et sa capsule en direct quand il se passe quelque chose. */
type RenduDeLaBarre = (bouton: ReactNode, capsule: ReactNode) => ReactNode;

export function CompagnonBranche({
	children,
	auRepos = false
}: {
	readonly children: RenduDeLaBarre;
	/**
	 * Tant que la session s'ouvre : Plume au repos, sans lire le pilote. Le même
	 * composant reste monté quand elle est ouverte — la barre ne se refait pas.
	 */
	readonly auRepos?: boolean;
}) {
	return (
		/*
		  ⚠️ L'ÉTAT DU PILOTE PEUT LEVER (sans session, au chargement, dans la salle),
		  ET PLUME NE PART PAS AVEC LUI : on retombe sur Plume au repos, qui mène au
		  même endroit avec une information de moins.
		*/
		<CatchBoundary
			getResetKey={() => 'plume'}
			errorComponent={() => <Plume humeur="repos">{children}</Plume>}
		>
			<PlumeAvecEtat auRepos={auRepos}>{children}</PlumeAvecEtat>
		</CatchBoundary>
	);
}

function PlumeAvecEtat({
	children,
	auRepos
}: {
	readonly children: RenduDeLaBarre;
	readonly auRepos: boolean;
}) {
	// L'humeur seule, pas l'état entier : il change à chaque coche d'un travail.
	const etat = useQuery(api.recouvrement.pilote.humeurDePlume, auRepos ? 'skip' : {});
	const journee = useQuery(api.recouvrement.journee.etat, auRepos ? 'skip' : {});
	const lue: HumeurPlume = etat?.humeur ?? 'repos';
	// La nuit, rien ne tourne et rien n'attend : il dort (Duo aussi, à minuit).
	const heure = heureDeParis();
	const humeur: HumeurPlume = lue === 'repos' && (heure >= 22 || heure < 7) ? 'dort' : lue;
	return (
		<>
			{auRepos ? null : <VoixDePlume journee={journee} />}
			<Plume humeur={humeur} parle={!auRepos} journee={journee}>
				{children}
			</Plume>
		</>
	);
}

/**
 * CE QUI NOURRIT SA PAROLE — rien à l'écran : les silences du compte, les travaux
 * finis, les notifications, l'argent qui rentre, et la journée, versés dans le
 * magasin de la parole.
 *
 * ⚠️ LE DÉFILEMENT LE RENVOIE DANS LA BARRE, IL NE LE FAIT PAS TAIRE. La scène couvre
 * le bas de l'écran ; dès qu'on fait défiler, c'est qu'on lit autre chose. Ce qu'il
 * n'a pas dit reste compté sur la pastille.
 */
function VoixDePlume({ journee }: { readonly journee: Journee | undefined }) {
	const silences = useQuery(api.recouvrement.presence.silences, {});
	const travaux = useQuery(api.recouvrement.presence.travauxTermines, {});
	const notification = useQuery(api.recouvrement.presence.derniereNotification, {});
	const paiement = useQuery(api.recouvrement.presence.dernierPaiement, {});
	const surLaBoite = useRouterState({
		select: (etat) => etat.location.pathname.startsWith('/app/notifications')
	});
	const taire = useMutation(api.recouvrement.presence.taire);
	const relever = useMutation(api.recouvrement.journee.relever);
	const ouvrirLaVisite = useMutation(api.recouvrement.journee.ouvrirLaVisite);
	const compte = useQuery(api.users.viewer, {});
	const prenom = compte === undefined ? undefined : prenomDe(compte?.name);
	const ouverte = useParoleDePlume().ouverte !== null;

	useEffect(
		() =>
			paroleDePlume.monter((cle) => {
				void taire({ cle }).catch(() => undefined);
			}),
		[taire]
	);
	useEffect(() => {
		if (silences !== undefined) paroleDePlume.poserSilences(silences);
	}, [silences]);

	/*
	  À VOTRE RETOUR, SON POINT (14/10/2026) : la visite s'ouvre, la base compte ce qui
	  s'est passé depuis la précédente, et Plume le dit en premier. Rien à la toute
	  première visite, ni après une simple recharge de page.
	*/
	useEffect(() => {
		if (prenom === undefined || visiteOuverte) return;
		visiteOuverte = true;
		void ouvrirLaVisite({}).then(
			(faits) => {
				if (faits === null) return;
				const point = pointDuRetour(faits, {
					prenom,
					heure: heureEnMots,
					jourDe: jourDuRetour,
					quand: quandEnMots,
					totalDesPaiements:
						faits.paiements.nombre > 0 ? eurosCentimes(faits.paiements.total) : null
				});
				if (point !== null) paroleDePlume.annoncerRetour(point, cleDuBonjour(aujourdHuiISO()));
			},
			() => {
				visiteOuverte = false;
			}
		);
	}, [prenom, ouvrirLaVisite]);
	useEffect(() => {
		if (travaux !== undefined) paroleDePlume.annoncerTravaux(travaux);
	}, [travaux]);
	useEffect(() => {
		if (notification === undefined) return;
		// Un paiement reçu se fête déjà par la bulle, une réussite par sa célébration.
		const titre =
			notification === null || SANS_PAROLE.has(notification.genre)
				? null
				: (TITRE_DE_NOTIFICATION[notification.genre as GenreNotification] ?? null);
		paroleDePlume.annoncerNotification(notification, titre, surLaBoite);
	}, [notification, surLaBoite]);
	useEffect(() => {
		if (paiement === undefined) return;
		paroleDePlume.annoncerPaiement(
			paiement,
			paiement === null ? null : eurosCentimes(paiement.montant)
		);
	}, [paiement]);

	/*
	  LA JOURNÉE : ses défis deviennent des paroles (comptées sur la pastille), elle se
	  garde en base quand ce qui reste change, et sa fin se fête.
	*/
	const cleDesBesoins =
		journee === undefined
			? null
			: JSON.stringify([journee.restants, journee.lettre, journee.question]);
	useEffect(() => {
		if (journee === undefined) return;
		paroleDePlume.poserBesoins(
			besoinsDuJour(journee.restants, { lettre: journee.lettre, question: journee.question })
		);
		void relever({}).catch(() => undefined);
		// `journee` change d'identité à chaque lecture ; seule sa matière compte.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cleDesBesoins, relever]);
	useEffect(() => {
		if (journee !== undefined) paroleDePlume.suivreLaJournee(journee);
	}, [journee]);

	useEffect(() => {
		if (!ouverte) return;
		const departs = new Map<EventTarget, number>();
		function surDefilement(evenement: Event) {
			const cible = evenement.target;
			if (cible === null) return;
			const element =
				cible instanceof Element ? cible : (document.scrollingElement ?? document.documentElement);
			const depart = departs.get(cible);
			if (depart === undefined) departs.set(cible, element.scrollTop);
			else if (Math.abs(element.scrollTop - depart) > SEUIL_DE_DEFILEMENT) paroleDePlume.ranger();
		}
		document.addEventListener('scroll', surDefilement, { capture: true, passive: true });
		return () => document.removeEventListener('scroll', surDefilement, { capture: true });
	}, [ouverte]);
	return null;
}

function Plume({
	humeur,
	parle = false,
	journee,
	children
}: {
	readonly humeur: HumeurPlume;
	/** Faux tant que la session s'ouvre, ou quand l'état a levé : pas de scène. */
	readonly parle?: boolean;
	readonly journee?: Journee | undefined;
	readonly children: RenduDeLaBarre;
}) {
	const navigate = useNavigate();
	const surLAccueil = useRouterState({
		select: (etat) => etat.location.pathname.replace(/\/$/, '') === '/app'
	});
	const dossier = useRouterState({
		select: (etat) => {
			const match = etat.matches.find((m) => m.routeId === ROUTE_DOSSIER);
			const id = (match?.params as Record<string, string | undefined> | undefined)?.id;
			return id === undefined || id === '' ? null : id;
		}
	});
	const clientRegarde = useRouterState({
		select: (etat) => {
			const match = etat.matches.find((m) => ROUTES_D_UN_CLIENT.includes(m.routeId));
			const id = (match?.params as Record<string, string | undefined> | undefined)?.id;
			return id === undefined || id === '' ? null : id;
		}
	});
	const parole = useParoleDePlume();
	const ouverte = parle ? parole.ouverte : null;
	// Il réfléchit à chaque parole nouvelle : la tête dans le bouton, les points dans la bulle.
	const reflechit = useReflexion(ouverte?.parole.cle ?? null);

	/**
	 * ⚠️ PLUME S'OUVRE EN SACHANT D'OÙ L'ON VIENT (13/10/2026). Sur un dossier, sa
	 * conversation à lui ; ailleurs, celle de l'établissement, avec l'écran qu'on
	 * regardait (`?depuis=`) et le client qu'il montrait (`?client=`).
	 */
	function ouvrirLaConversation() {
		if (dossier !== null) {
			void navigate({ to: '/app/pilote/$id', params: { id: dossier } });
			return;
		}
		const ecran = paroleDePlume.ecranCourant();
		if (ecran === null || ecran === 'AUJOURDHUI') {
			void navigate({ to: '/app/pilote' });
			return;
		}
		const surUnClient = ecran === 'CLIENT' || ecran === 'SANTE_CLIENT';
		void navigate({
			to: '/app/pilote',
			search: {
				depuis: ecran,
				...(surUnClient && clientRegarde !== null ? { client: clientRegarde } : {})
			}
		});
	}

	/** Où mène le geste d'une parole, quand l'écran ne le fait pas lui-même. */
	function mener(cible: CibleDePlume) {
		if (paroleDePlume.executer(cible)) return;
		switch (cible.genre) {
			case 'CONVERSATION':
				void navigate({ to: '/app/pilote' });
				return;
			case 'NOTIFICATIONS':
				void navigate({ to: '/app/notifications' });
				return;
			case 'AUJOURDHUI':
				void navigate({ to: '/app' });
				return;
			case 'DEMARRER_LOT':
				void navigate({ to: '/app/demarrer' });
				return;
			case 'DEPOSER':
				void navigate({ to: '/app/coffre', search: { deposer: 1 } });
				return;
			case 'DOSSIER':
				void navigate({
					to: '/app/dossier/$id',
					params: { id: cible.dossier },
					...(cible.rubrique === undefined ? {} : { search: { ouvrir: cible.rubrique } as never })
				});
				return;
			case 'CLIENT':
				void navigate({
					to: '/app/clients/$id',
					params: { id: cible.client },
					...(cible.rubrique === undefined ? {} : { search: { ouvrir: cible.rubrique } })
				});
				return;
			case 'SANTE':
				void navigate({ to: '/app/risque/$id', params: { id: cible.client } });
				return;
			// Préparer une relance, reprendre un client : seul l'écran qui les porte sait les faire.
			case 'REMETTRE_AU_PILOTE':
			case 'PREPARER_RELANCE':
				return;
		}
	}

	/** TOUCHER PLUME : il dit ce qu'il n'a pas encore dit ; sinon, sa conversation. */
	function toucher() {
		if (parle && paroleDePlume.ouvrir()) return;
		ouvrirLaConversation();
	}

	/*
	  LA CAPSULE EN DIRECT : pas pendant que sa bulle parle (elle occupe la même
	  place, et dit déjà ce qu'il fait en pied), ni sur Aujourd'hui, dont le bloc du
	  pilote coche son travail et liste ce qui part.
	*/
	const capsule =
		parle && ouverte === null && !surLAccueil ? (
			<CapsuleBranchee onOuvrir={() => void navigate({ to: '/app/pilote' })} />
		) : null;

	return children(
		<BoutonCompagnon
			humeur={reflechit ? 'reflechit' : (ouverte?.parole.humeur ?? humeur)}
			pensee={ouverte === null}
			compte={parle ? parole.aDire : 0}
			description={
				parle && parole.aDire > 0
					? `${NOM_DU_PILOTE} a ${parole.aDire === 1 ? 'une chose' : `${parole.aDire} choses`} à vous dire`
					: dossier !== null
						? `Parler à ${NOM_DU_PILOTE}, sur ce dossier`
						: clientRegarde !== null
							? `Parler à ${NOM_DU_PILOTE}, sur ce client`
							: `Parler à ${NOM_DU_PILOTE}`
			}
			onOuvrir={toucher}
			{...(journee !== undefined && journee.total > 0
				? { progression: journee.faits / journee.total }
				: {})}
			{...(ouverte === null
				? {}
				: {
						bulle: (
							<SceneBranchee
								reflechit={reflechit}
								parole={ouverte.parole}
								position={ouverte.position}
								total={ouverte.total}
								journee={journee}
								mener={mener}
								parler={ouvrirLaConversation}
							/>
						)
					})}
		/>,
		capsule
	);
}

/** L'heure qui avance, à la demi-minute : les « dans 23 min » de la capsule. */
function useMaintenant(): number {
	const [maintenant, setMaintenant] = useState(() => Date.now());
	useEffect(() => {
		const minuterie = setInterval(() => setMaintenant(Date.now()), 30_000);
		return () => clearInterval(minuterie);
	}, []);
	return maintenant;
}

/**
 * LA CAPSULE, BRANCHÉE — le travail en cours et les relances programmées, lus
 * étroitement (le travail change à chaque coche : seule la capsule se redessine).
 *
 * ⚠️ « RETENIR » SE VOIT AU TOUCHER : la relance quitte la liste avant la réponse
 * du serveur, et Plume dit ce que le geste a fait — le client lui est retiré, il
 * le rend depuis sa fiche.
 */
function CapsuleBranchee({ onOuvrir }: { readonly onOuvrir: () => void }) {
	const navigate = useNavigate();
	const dire = usePlumeDit();
	const travail = useQuery(api.recouvrement.presence.travailEnCours, {});
	const programmees = useQuery(api.recouvrement.presence.relancesProgrammees, {});
	const retenir = useMutation(api.recouvrement.pilote.retenir).withOptimisticUpdate(
		(local, { envoiId }) => {
			const liste = local.getQuery(api.recouvrement.presence.relancesProgrammees, {});
			if (liste === undefined) return;
			local.setQuery(
				api.recouvrement.presence.relancesProgrammees,
				{},
				liste.filter((p) => p.envoiId !== envoiId)
			);
		}
	);
	const maintenant = useMaintenant();
	if (travail === undefined || programmees === undefined) return null;
	const direct = enDirect({ maintenant, travail, programmees, heure: heureEnMots });
	if (direct === null) return null;

	if (direct.genre === 'TRAVAIL') {
		return (
			<CapsulePlume
				genre="TRAVAIL"
				titre={direct.titre}
				ligne={direct.ligne}
				part={direct.part}
				onOuvrir={onOuvrir}
			/>
		);
	}
	if (direct.plusieurs) {
		// Plusieurs départs : « Retenir » ne dirait pas lequel ; chacun a le sien chez Plume.
		return (
			<CapsulePlume
				genre="DEPART"
				titre={direct.titre}
				ligne={direct.ligne}
				part={direct.part}
				libelleDuGeste="Voir"
				onGeste={onOuvrir}
				onOuvrir={onOuvrir}
			/>
		);
	}
	return (
		<CapsulePlume
			genre="DEPART"
			titre={direct.titre}
			ligne={direct.ligne}
			part={direct.part}
			libelleDuGeste="Retenir"
			onGeste={() => {
				void retenir({ envoiId: direct.envoiId as Id<'envois'> }).then(
					() => {
						suivre('relance-retenue');
						dire({
							titre: 'Relance retenue',
							texte: `Rien ne part à ${direct.client}. Je vous le laisse en main : vous me le rendez depuis sa fiche.`,
							humeur: 'content',
							geste: {
								libelle: 'Sa fiche',
								faire: () =>
									void navigate({ to: '/app/clients/$id', params: { id: direct.clientId } })
							}
						});
					},
					() =>
						dire({
							titre: 'Trop tard pour la retenir',
							texte:
								'Cette relance n’est plus programmée : elle vient de partir, ou elle était déjà retenue.',
							humeur: 'attention'
						})
				);
			}}
			onOuvrir={onOuvrir}
		/>
	);
}

/**
 * LA SCÈNE D'UNE PAROLE — son geste mène, « Suivant » passe à la suite, le ✕ le renvoie
 * dans la barre. En pied, ce qu'il fait en ce moment ou ensuite : la bulle porte
 * toujours du contexte. Lues seulement la scène ouverte.
 */
function SceneBranchee({
	reflechit,
	parole,
	position,
	total,
	journee,
	mener,
	parler
}: {
	readonly reflechit: boolean;
	readonly parole: ParoleAffichee;
	readonly position: number;
	readonly total: number;
	readonly journee: Journee | undefined;
	readonly mener: (cible: CibleDePlume) => void;
	readonly parler: () => void;
}) {
	const travail = useQuery(api.recouvrement.presence.travailEnCours, {});
	const prochaine = useQuery(api.recouvrement.presence.prochaineRelance, {});

	const geste = parole.geste;
	const cible = parole.cible;
	const action =
		geste !== undefined
			? { libelle: geste.libelle, faire: geste.faire }
			: cible !== undefined && parole.libelleDuGeste !== undefined
				? { libelle: parole.libelleDuGeste, faire: () => mener(cible) }
				: null;

	const suite =
		parole.pied !== undefined
			? parole.pied
			: travail !== undefined && travail !== null
				? `En ce moment : ${minusculeInitiale(travail.titre)}, ${travail.faites} sur ${travail.total}.`
				: prochaine !== undefined && prochaine !== null
					? ligneDeLaSuite({
							etape: prochaine.etape,
							client: prochaine.client,
							quand: quandEnMots(prochaine.partiraLe)
						})
					: undefined;

	/*
	  ⚠️ LA JOURNÉE N'EST PLUS EN TÊTE DE CHAQUE BULLE (14/10/2026). Une jauge et une
	  série au-dessus de chaque phrase faisaient d'un collaborateur un jeu : « pas
	  cheap », a dit le fondateur. Elle vit sur sa page et dans l'anneau du bouton ;
	  elle ne revient ici que pour la journée bouclée, avec sa semaine en coches.
	*/
	return (
		<ScenePlume
			reflechit={reflechit}
			texte={parole.texte}
			{...(parole.semaine === undefined ? {} : { semaine: parole.semaine })}
			{...(parole.releve === undefined ? {} : { releve: parole.releve })}
			{...(journee === undefined || parole.semaine === undefined
				? {}
				: {
						journee: {
							titre: titreDeLaJournee(
								{ faits: journee.faits, total: journee.total, defis: journee.defis },
								journee.tenue
							),
							faits: journee.faits,
							total: journee.total,
							serie: serieEnMots(journee.serie)
						}
					})}
			{...(action === null
				? {}
				: {
						libelleDuGeste: action.libelle,
						onGeste: () => {
							paroleDePlume.fermer();
							action.faire();
						}
					})}
			rang={{ position, total }}
			{...(position < total
				? { onSuivant: () => paroleDePlume.suivant() }
				: {
						onParler: () => {
							paroleDePlume.fermer();
							parler();
						}
					})}
			onFermer={() => paroleDePlume.fermer()}
			{...(parole.silencieuse ? { onTaire: () => paroleDePlume.taire(parole) } : {})}
			{...(suite === undefined ? {} : { suite })}
		/>
	);
}

function minusculeInitiale(texte: string): string {
	return texte.charAt(0).toLowerCase() + texte.slice(1);
}
