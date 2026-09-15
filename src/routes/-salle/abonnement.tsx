import { BORNES_PALIER, TARIFS, palierDeTaille } from '../../lib/config/tarifs';
import { EcranAbonnement, type AbonnementAffiche } from '../../screens/abonnement/abonnement';
import { EcranPremierBilan } from '../../screens/abonnement/premier-bilan';
import { EcranSuiviOffre } from '../../screens/abonnement/suivi';
import { ETABLISSEMENT_DEMO } from './communes';
import { formeDemo, lectureDemo, type EcranDuProduit } from './demo';
import { AvecLesReglages } from './reglages';

/**
 * LES ENTRÉES DE LA FAMILLE, DÉCLARÉES AVANT TOUT CE QUI S'EN CALCULE.
 *
 * L'abonnement est celui de l'établissement de toute la salle, dont le volume de
 * factures ne s'écrit qu'une fois, dans `communes.ts` (`ETABLISSEMENT_DEMO`). Ne
 * reste écrit ici que ce que la base et le déploiement portent en plus, et
 * qu'aucune fonction ne produit : l'absence de clé Paddle, la fin de l'essai, et
 * le volume déclaré qui donne chacun des deux autres paliers.
 *
 * Le reste se compose comme `etatAbonnement` le compose. Les trois écrans de
 * l'abonnement partagent ces entrées, et aucune de celles des réglages : c'est
 * pourquoi ils ont leur famille, hors de `reglages.tsx`.
 */

/** Ce que la base et le déploiement portent pour l'abonnement de l'établissement. */
interface FacturationDemo {
	/**
	 * `organizations.facturesParAn`, le volume que l'établissement déclare. Absent
	 * tant qu'il ne l'a pas déclaré : le champ est facultatif à `/bienvenue`.
	 */
	readonly facturesParAn?: number;
	/** Une clé `PADDLE_API_KEY` posée sur le déploiement. */
	readonly clePaddle: boolean;
	/** `organizations.freeTrialEndsAt`, posé à la création de l'établissement. */
	readonly essaiJusquAu: number;
}

/**
 * ⚠️ AUCUNE CLÉ PADDLE : le compte marchand n'est pas ouvert, comme l'écran
 * d'abonnement le dit. Aucun abonnement souscrit, et l'essai court encore douze
 * jours.
 *
 * La fin de l'essai se lit sur l'horloge, et non sur un jour figé :
 * `EssaiEnCours` compte ses jours depuis `Date.now()` (`offre.tsx`, ligne 124).
 * Figée, elle ferait perdre un jour à la démonstration chaque matin.
 *
 * La famille de l'équipe en tire ses places, par `planEffectif` (`equipe.tsx`).
 */
export const FACTURATION_DEMO: FacturationDemo = {
	facturesParAn: ETABLISSEMENT_DEMO.facturesParAn,
	clePaddle: false,
	essaiJusquAu: Date.now() + 12 * 24 * 60 * 60 * 1000
};

/**
 * Le plan effectif, par les seules branches de `resolveEffectivePlan` que ces
 * entrées atteignent (`src/lib/convex/billing.ts`) : sans clé, le plan de
 * développement (lignes 104 à 114) ; avec une clé, l'essai qui court (lignes 131
 * à 134), et ses sièges dans `PLAN_SEATS` (lignes 71 à 76). Aucune forme ne pose
 * de plan simulé, de plan de développement ni d'abonnement Paddle, et aucune ne
 * pose une clé sur un essai terminé : ce dernier cas lève, plutôt que de montrer
 * un plan qu'aucune forme ne fait regarder. La fonction vit dans un module de
 * fonctions Convex, que la salle n'importe pas dans le navigateur.
 *
 * ⚠️ SANS CLÉ, `isDev` EST VRAI, et l'écran montre l'encart de développement :
 * `isDev` et `paddleConfigure` lisent la même variable (lignes 104 et 235).
 */
export function planEffectif(facturation: FacturationDemo) {
	if (!facturation.clePaddle) return { tier: 'dev', isDev: true, seatsAllowed: 9999 };
	if (facturation.essaiJusquAu > Date.now()) {
		return { tier: 'procedures', isDev: false, seatsAllowed: 3 };
	}
	throw new Error(
		'Démonstration incomplète : cette forme termine l’essai, et la salle ne reproduit pas le plan qui suit.'
	);
}

/**
 * L'état d'abonnement, composé comme `etatAbonnement` le rend (`billing.ts`,
 * lignes 222 à 240) : le palier par `palierDeTaille`, ses bornes et ses tarifs
 * lus dans la grille, jamais écrits. Un volume absent donne le palier que
 * `palierDeTaille` retient sans information, et `facturesParAn` à `null`.
 */
function abonnementDe(facturation: FacturationDemo): AbonnementAffiche {
	const { tier, isDev, seatsAllowed } = planEffectif(facturation);
	const palier = palierDeTaille(facturation.facturesParAn);

	return {
		tier,
		isDev,
		palier,
		bornesPalier: BORNES_PALIER[palier],
		facturesParAn: facturation.facturesParAn ?? null,
		tarifs: TARIFS[palier],
		seatsAllowed,
		// Aucun abonnement souscrit : `organizations.paddleStatus` n'est pas posé.
		paddleStatus: null,
		paddleConfigure: facturation.clePaddle,
		essaiFiniLe: facturation.essaiJusquAu > Date.now() ? facturation.essaiJusquAu : null
	};
}

/** L'abonnement de l'établissement, sur les entrées de la famille. */
const ABONNEMENT_DEMO: AbonnementAffiche = abonnementDe(FACTURATION_DEMO);

/**
 * Les deux autres paliers de la grille, chacun par un autre volume déclaré, seule
 * entrée changée. Le palier principal est celui de l'établissement. Le premier
 * bilan n'a que ces formes.
 */
const FORMES_PALIERS_DEMO: Readonly<Record<string, AbonnementAffiche>> = {
	'palier S': abonnementDe({ ...FACTURATION_DEMO, facturesParAn: 180 }),
	'palier L': abonnementDe({ ...FACTURATION_DEMO, facturesParAn: 1_200 })
};

/**
 * « paiement ouvert » : une clé Paddle sur le déploiement, seule entrée changée.
 * Sur la page d'abonnement, l'encart de développement et celui de l'ouverture
 * disparaissent. L'essai donne le plan `procedures` (ligne 133) : l'offre
 * d'abonnement se dit « En cours ». Le premier bilan ne se dit en cours que sous
 * le plan `suivi` : cette forme ne le change pas, et il n'a que les paliers.
 */
const FORMES_SUIVI_DEMO: Readonly<Record<string, AbonnementAffiche>> = {
	...FORMES_PALIERS_DEMO,
	'paiement ouvert': abonnementDe({ ...FACTURATION_DEMO, clePaddle: true })
};

/**
 * « volume non renseigné » : l'établissement n'a déclaré aucun volume, seule
 * entrée changée. C'est le défaut d'un nouveau client, le volume étant facultatif
 * à `/bienvenue` (`src/routes/bienvenue.tsx`, lignes 92 et 117). `palierDeTaille`
 * retient alors le palier le plus bas, et la page d'abonnement dit que le volume
 * n'est pas renseigné au lieu de citer un nombre de factures.
 *
 * Seule la page d'abonnement la montre, parce qu'elle seule lit le volume : le
 * premier bilan et l'offre d'abonnement la rendraient exactement comme « palier S ».
 */
const FORMES_ABONNEMENT_DEMO: Readonly<Record<string, AbonnementAffiche>> = {
	...FORMES_SUIVI_DEMO,
	'volume non renseigné': abonnementDe({ ...FACTURATION_DEMO, facturesParAn: undefined })
};

export const ECRANS_ABONNEMENT: readonly EcranDuProduit[] = [
	{
		route: '/app/_reglages/abonnement',
		libelle: 'abonnement',
		vide: true,
		variantes: Object.keys(FORMES_ABONNEMENT_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const abonnement = formeDemo(variante, ABONNEMENT_DEMO, FORMES_ABONNEMENT_DEMO);
			return (
				<AvecLesReglages section="abonnement">
					<EcranAbonnement donnees={lectureDemo(etat, abonnement, null)} />
				</AvecLesReglages>
			);
		}
	},
	{
		route: '/app/_reglages/abonnement_/premier-bilan',
		libelle: 'premier bilan',
		vide: true,
		variantes: Object.keys(FORMES_PALIERS_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const abonnement = formeDemo(variante, ABONNEMENT_DEMO, FORMES_PALIERS_DEMO);
			return (
				<AvecLesReglages section="abonnement">
					<EcranPremierBilan donnees={lectureDemo(etat, abonnement, null)} />
				</AvecLesReglages>
			);
		}
	},
	{
		route: '/app/_reglages/abonnement_/suivi',
		libelle: 'offre suivi',
		vide: true,
		variantes: Object.keys(FORMES_SUIVI_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const abonnement = formeDemo(variante, ABONNEMENT_DEMO, FORMES_SUIVI_DEMO);
			return (
				<AvecLesReglages section="abonnement">
					<EcranSuiviOffre donnees={lectureDemo(etat, abonnement, null)} />
				</AvecLesReglages>
			);
		}
	}
];
