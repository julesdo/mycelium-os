import type { ReactNode } from 'react';
import { CatchBoundary, useNavigate, useRouterState } from '@tanstack/react-router';
import { useQuery } from './donnees';
import { api } from '../lib/convex/_generated/api';
import { BoutonCompagnon, NOM_DU_PILOTE, type HumeurPlume } from '../ui';

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
		<Plume humeur={humeur} compte={aDemarrer}>
			{children}
		</Plume>
	);
}

function Plume({
	humeur,
	compte = 0,
	children
}: {
	readonly humeur: HumeurPlume;
	/** Les dossiers préparés qui attendent d'être démarrés. */
	readonly compte?: number;
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

	return children(
		<BoutonCompagnon
			humeur={humeur}
			compte={compte}
			description={
				dossier === null ? `Parler à ${NOM_DU_PILOTE}` : `Parler à ${NOM_DU_PILOTE}, sur ce dossier`
			}
			onOuvrir={() => {
				if (dossier === null) void navigate({ to: '/app/pilote' });
				else void navigate({ to: '/app/pilote/$id', params: { id: dossier } });
			}}
		/>
	);
}
