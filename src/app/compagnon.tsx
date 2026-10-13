import { useEffect, type ReactNode } from 'react';
import { CatchBoundary, useNavigate, useRouterState } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { useQuery } from './donnees';
import { api } from '../lib/convex/_generated/api';
import type { CibleDePlume } from '../lib/verticales/recouvrement/compagnon/presence';
import { BoutonCompagnon, BullePlume, NOM_DU_PILOTE, type HumeurPlume } from '../ui';
import { paroleDePlume, useParoleDePlume, type ParoleAffichee } from './parole-de-plume';

/**
 * PLUME, BRANCHÉ DANS LA BARRE — son humeur lue sur le pilote, et où il mène.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA FEUILLE DE DISCUSSION A DISPARU (08/10/2026)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Ce fichier ouvrait une `Popup` : le fil d'un dossier, ou une liste pour en
 * choisir un, ou le refus du plafond. Jugée « horrible » par le fondateur, elle
 * est remplacée par une conversation PLEIN ÉCRAN, sur les codes de Claude
 * (`/app/pilote/$id` pour un dossier, `/app/pilote` partout ailleurs). Le bouton
 * ne fait plus que deux choses : montrer Plume tel qu'il est, et y mener.
 *
 * ⚠️ ET DEPUIS LE 13/10/2026, IL PARLE. Le fondateur : « un vrai compagnon, pas
 * un chat ». Sa bulle sort de lui (`BullePlume`) : le mot après un geste, le
 * travail qu'il vient de finir, et ce qu'il a à dire de l'écran. Ce fichier la
 * branche : les silences du compte, les travaux finis, le défilement qui la range,
 * et où mène son bouton. Ce qu'il dit se décide ailleurs (`app/parole-de-plume.tsx`).
 *
 * ⚠️ L'IDENTIFIANT SE LIT SUR LES PARAMÈTRES DE LA ROUTE, PAS SUR L'ADRESSE :
 * `matches` porte l'`id` résolu de `/app/dossier/$id`. (Une version d'avant lisait
 * un `?ligne=` disparu, et le compagnon était devenu injoignable.)
 */

const ROUTE_DOSSIER = '/app/dossier/$id';

export function CompagnonBranche({
	children,
	auRepos = false
}: {
	readonly children: (bouton: ReactNode) => ReactNode;
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
	readonly children: (bouton: ReactNode) => ReactNode;
	readonly auRepos: boolean;
}) {
	// L'humeur seule, pas l'état entier : il change à chaque coche d'un travail.
	const etat = useQuery(api.recouvrement.pilote.humeurDePlume, auRepos ? 'skip' : {});
	const aDemarrer = etat?.aDemarrer ?? 0;
	const humeur: HumeurPlume = etat?.humeur ?? 'repos';
	return (
		<>
			{auRepos ? null : <VoixDePlume />}
			<Plume humeur={humeur} compte={aDemarrer} parle={!auRepos}>
				{children}
			</Plume>
		</>
	);
}

/**
 * CE QUI NOURRIT LA BULLE — rien à l'écran : les silences du compte et les travaux
 * finis du pilote, versés dans le magasin de la parole.
 *
 * ⚠️ LE DÉFILEMENT RANGE UNE REMARQUE, IL NE LA FAIT PAS TAIRE. La bulle couvre le
 * bas de l'écran ; dès qu'on fait défiler de quelques lignes, c'est qu'on lit
 * autre chose. Elle se range, et ne revient pas dans la visite.
 */
function VoixDePlume() {
	const silences = useQuery(api.recouvrement.presence.silences, {});
	const travaux = useQuery(api.recouvrement.presence.travauxTermines, {});
	const taire = useMutation(api.recouvrement.presence.taire);
	const parole = useParoleDePlume();
	const cleDeLaRemarque = parole?.voix === 'ECRAN' ? parole.cle : null;

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
	useEffect(() => {
		if (travaux !== undefined) paroleDePlume.annoncerTravaux(travaux);
	}, [travaux]);
	useEffect(() => {
		if (cleDeLaRemarque === null) return;
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
	}, [cleDeLaRemarque]);
	return null;
}

/** Au-delà de ces pixels défilés, on lit autre chose : la bulle se range. */
const SEUIL_DE_DEFILEMENT = 72;

function Plume({
	humeur,
	compte = 0,
	parle = false,
	children
}: {
	readonly humeur: HumeurPlume;
	/** Les dossiers préparés qui attendent d'être démarrés. */
	readonly compte?: number;
	/** Faux tant que la session s'ouvre : pas de bulle. */
	readonly parle?: boolean;
	readonly children: (bouton: ReactNode) => ReactNode;
}) {
	const navigate = useNavigate();
	const dossier = useRouterState({
		select: (etat) => {
			const match = etat.matches.find((m) => m.routeId === ROUTE_DOSSIER);
			const id = (match?.params as Record<string, string | undefined> | undefined)?.id;
			return id === undefined || id === '' ? null : id;
		}
	});

	const parole = useParoleDePlume();
	const dite = parle ? parole : null;

	function ouvrirLaConversation() {
		if (dossier === null) void navigate({ to: '/app/pilote' });
		else void navigate({ to: '/app/pilote/$id', params: { id: dossier } });
	}

	/** Où mène le bouton d'une remarque, quand l'écran ne le fait pas lui-même. */
	function mener(cible: CibleDePlume) {
		if (paroleDePlume.executer(cible)) return;
		switch (cible.genre) {
			case 'CONVERSATION':
				void navigate({ to: '/app/pilote' });
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

	return children(
		<BoutonCompagnon
			humeur={dite?.humeur ?? humeur}
			compte={compte}
			description={
				dossier === null ? `Parler à ${NOM_DU_PILOTE}` : `Parler à ${NOM_DU_PILOTE}, sur ce dossier`
			}
			onOuvrir={ouvrirLaConversation}
			{...(dite === null
				? {}
				: {
						bulle: (
							<BulleBranchee
								key={dite.cle}
								parole={dite}
								mener={mener}
								ouvrir={ouvrirLaConversation}
							/>
						)
					})}
		/>
	);
}

/** La bulle d'une parole : son bouton mène, son ✕ ferme, sa phrase ouvre la conversation. */
function BulleBranchee({
	parole,
	mener,
	ouvrir
}: {
	readonly parole: ParoleAffichee;
	readonly mener: (cible: CibleDePlume) => void;
	readonly ouvrir: () => void;
}) {
	const geste = parole.geste;
	const cible = parole.cible;
	const action =
		geste !== undefined
			? { libelle: geste.libelle, faire: geste.faire }
			: cible !== undefined && parole.libelleDuGeste !== undefined
				? { libelle: parole.libelleDuGeste, faire: () => mener(cible) }
				: null;
	return (
		<BullePlume
			texte={parole.texte}
			{...(action === null
				? {}
				: {
						libelleDuGeste: action.libelle,
						onGeste: () => {
							paroleDePlume.fermer({ ...parole, silencieuse: false });
							action.faire();
						}
					})}
			// Une remarque ou un travail s'ouvrent sur la conversation ; le mot d'un geste porte ses liens.
			{...(parole.voix === 'GESTE'
				? {}
				: {
						onOuvrir: () => {
							paroleDePlume.fermer({ ...parole, silencieuse: false });
							ouvrir();
						}
					})}
			onFermer={() => paroleDePlume.fermer(parole)}
			fermerPourDeBon={parole.silencieuse}
		/>
	);
}
