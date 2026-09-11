import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { Page, PageBody, aujourdHuiISO } from '../../ui';
import { EcranAccueil, type EtatSurveillance } from '../../screens/accueil';

export const Route = createFileRoute('/app/')({ component: Accueil });

/**
 * L'accueil, branché sur la base.
 *
 * Tout le dessin vit dans `screens/accueil.tsx`, qui ne sait pas interroger
 * Convex — c'est ce qui permet de le VOIR aux quatre largeurs de référence
 * depuis la salle d'exposition, sans backend ni authentification. Ce fichier-ci
 * ne fait que lire et traduire.
 */
function Accueil() {
	const flux = useQuery(api.recouvrement.surveillance.flux, {});
	// La date d'arrêté vient de la SEULE horloge de l'interface, partagée avec
	// l'écran de détail : deux lectures différentes feraient diverger les deux
	// totaux autour de minuit. Voir `ui/horloge.ts`.
	const revelation = useQuery(api.recouvrement.revelation.revelation, {
		arreteAu: aujourdHuiISO()
	});
	const battement = useQuery(api.recouvrement.battement.dernierBattement, {});

	if (flux === undefined || revelation === undefined) {
		return (
			<Page>
				<PageBody>
					<p className="sr-only">Chargement…</p>
				</PageBody>
			</Page>
		);
	}

	/**
	 * ⚠️ « JAMAIS TOURNÉ » NE SE DIT QUE S'IL Y A QUELQUE CHOSE À SURVEILLER.
	 * Sur un établissement sans aucune facture, l'annoncer serait du bruit : la
	 * carte de démarrage dit déjà, mieux, ce qu'il reste à faire. La décision se
	 * prend ici parce qu'elle dépend d'une donnée — le flux — que l'écran de
	 * présentation reçoit déjà, mais que seule cette route sait encore en
	 * chargement (`undefined`) plutôt que vide.
	 */
	const surveillance: EtatSurveillance =
		battement === undefined
			? { etat: 'INCONNU' }
			: battement === null
				? flux.evenements.length === 0
					? { etat: 'NORMAL' }
					: { etat: 'JAMAIS_TOURNE' }
				: battement.statut === 'ECHEC'
					? { etat: 'ECHEC', jour: battement.jour }
					: { etat: 'NORMAL' };

	return (
		<EcranAccueil
			vue={{
				total: revelation.total,
				nombreFactures: revelation.nombreFactures,
				interetsCourusDepuisHier: revelation.interetsCourusDepuisHier,
				// Les TROIS parts, jamais `supplement` — qui est deja la somme des deux
				// dernieres et les compterait deux fois. Voir `ui/composition.tsx`.
				parts: {
					principal: revelation.principal,
					interets: revelation.interets,
					indemnites: revelation.indemnites
				},
				evenements: flux.evenements,
				hypotheses: flux.hypotheses,
				anglesMorts: flux.anglesMorts,
				surveillance
			}}
		/>
	);
}
