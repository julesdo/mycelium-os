import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '../../lib/convex/_generated/api';
import { Page, PageBody, aujourdHuiISO, travauxDuVeilleur } from '../../ui';
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
	/**
	 * LES DÉPÔTS ENCORE EN MACHINE.
	 *
	 * ⚠️ LA REQUÊTE EST RÉACTIVE, ET C'EST TOUT LE POINT. Un dépôt qui passe de
	 * `EN_ATTENTE` à `LECTURE` puis à `TERMINE` fait bouger cette liste sans
	 * rechargement : la rangée apparaît sur l'accueil quand la lecture commence,
	 * son étape change, puis elle s'en va. C'est la règle d'écran n° 2 — tout
	 * traitement se voit sans qu'on le demande — appliquée à l'écran d'accueil et
	 * pas seulement à celui d'import.
	 *
	 * ⚠️ `limite: 5` BORNE LA LECTURE. Sans elle, `listerImports` rend les vingt
	 * derniers dépôts pour n'en retenir que ceux en cours ; un gérant qui importe
	 * chaque mois en accumule douze par an, et l'accueil paierait ce transport à
	 * chaque ouverture pour afficher zéro rangée. Cinq suffit : au-delà de cinq
	 * dépôts simultanément en machine, la sixième rangée n'apprend plus rien.
	 */
	const depots = useQuery(api.recouvrement.depotMutations.listerImports, { limite: 5 });

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

	/**
	 * ⚠️ C'EST ICI QUE LA PHRASE DE LA MACHINE SE PERDAIT.
	 *
	 * Le repli ci-dessus est juste pour ce qu'il fait — décider s'il faut ALERTER
	 * — et c'était le seul usage fait du battement. `raison` et `termineLe`
	 * arrivaient donc jusqu'à cette fonction et mouraient sur la ligne qui range
	 * `PARLE` et `TU` ensemble sous « NORMAL », lequel ne rend rien à l'écran.
	 *
	 * Les deux lectures coexistent maintenant, et elles ne se recouvrent pas :
	 * `surveillance` répond « faut-il alerter », `travaux` répond « qu'a fait la
	 * machine ». La seconde n'existait pas.
	 */
	const travaux = travauxDuVeilleur({
		battement,
		// `undefined` est le CHARGEMENT, pas le vide. Traiter l'un pour l'autre
		// ferait clignoter une rangée « en attente de lecture » à chaque ouverture,
		// le temps d'un aller-retour — et on apprend à ignorer ce qui clignote.
		depotsEnCours: (depots ?? [])
			.filter((depot) => depot.statut === 'EN_ATTENTE' || depot.statut === 'LECTURE')
			.map((depot) => ({ id: depot._id, filename: depot.filename, etape: depot.etape })),
		aujourdHui: aujourdHuiISO()
	});

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
				surveillance,
				travaux
			}}
		/>
	);
}
