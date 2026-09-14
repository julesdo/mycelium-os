import { useState } from 'react';
import type { Theme } from '../../app/use-theme';
import { BORNES_PALIER, TARIFS, palierDeTaille } from '../../lib/config/tarifs';
import { EcranAbonnement, type AbonnementAffiche } from '../../screens/abonnement/abonnement';
import { EcranPremierBilan } from '../../screens/abonnement/premier-bilan';
import { EcranSuiviOffre } from '../../screens/abonnement/suivi';
import {
	EcranCreancier,
	type CreancierAffiche,
	type EtatCritere
} from '../../screens/parametres/creancier';
import {
	EcranEtablissement,
	type EtablissementAffiche
} from '../../screens/parametres/etablissement';
import { EcranReglages } from '../../screens/parametres/reglages';
import { ETABLISSEMENT_DEMO } from './communes';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * LES ENTRÉES DE LA FAMILLE, DÉCLARÉES AVANT TOUT CE QUI S'EN CALCULE.
 *
 * L'établissement est celui de toute la salle : son nom, son SIREN, son
 * adresse, sa qualité de commerçant et son volume de factures ne s'écrivent
 * qu'une fois, dans `communes.ts` (`ETABLISSEMENT_DEMO`). Ne reste écrit ici que
 * ce que la base et le déploiement portent en plus, et qu'aucune fonction ne
 * produit : l'identifiant de l'établissement, l'absence de profil de créancier
 * enregistré, l'absence de clé Paddle, la fin de l'essai, et le volume déclaré
 * qui donne chacun des deux autres paliers.
 *
 * Le reste se compose comme le produit le compose : les pages du créancier et de
 * l'établissement comme leurs routes, l'abonnement comme `etatAbonnement`.
 */

/** L'établissement tel que `getMyOrg` le rend, réduit aux champs que les écrans de la famille lisent. */
const ORGANISATION_DEMO = {
	_id: 'demo-etablissement',
	name: ETABLISSEMENT_DEMO.nom,
	// Le champ que la page de l'établissement intitule « SIREN ».
	siret: ETABLISSEMENT_DEMO.siren,
	facturesParAn: ETABLISSEMENT_DEMO.facturesParAn
};

/** Un profil de créancier, tel que `monProfil` le rend (`src/lib/convex/recouvrement/profil.ts`, lignes 103 à 112). */
interface ProfilDemo {
	readonly denomination: string;
	readonly siren?: string;
	readonly adresse?: string;
	readonly estCommercant: EtatCritere;
}

/**
 * ⚠️ AUCUN PROFIL DE CRÉANCIER ENREGISTRÉ : `monProfil` rend `null`.
 *
 * C'est l'état que le reste de la salle montre déjà. L'accueil porte le verrou
 * « Votre identité de créancier » (`onglets.tsx`), qui mène à la page du
 * créancier, et la famille créance ne connaît pas la qualité de commerçant du
 * créancier (`creance.tsx`). Un profil enregistré ici ferait contredire la page
 * par la rangée qui y mène.
 */
const PROFIL_DEMO: ProfilDemo | null = null;

/** Le profil que le gérant enregistre sur la page du créancier : ce que l'établissement déclare. */
const PROFIL_ENREGISTRE_DEMO: ProfilDemo = {
	denomination: ETABLISSEMENT_DEMO.nom,
	siren: ETABLISSEMENT_DEMO.siren,
	adresse: ETABLISSEMENT_DEMO.adresse,
	estCommercant: ETABLISSEMENT_DEMO.estCommercant
};

/** La forme nommée des réglages et de la page du créancier : le profil enregistré, seule entrée changée. */
const FORMES_PROFIL_DEMO: Readonly<Record<string, ProfilDemo | null>> = {
	'profil enregistré': PROFIL_ENREGISTRE_DEMO
};

/** La page du créancier, composée comme sa route la compose (`src/routes/app/parametres_.creancier.tsx`). */
function creancierDe(profil: ProfilDemo | null): CreancierAffiche {
	return {
		cle: profil?.denomination ?? 'vide',
		initial: {
			denomination: profil?.denomination ?? ORGANISATION_DEMO.name,
			siren: profil?.siren ?? '',
			adresse: profil?.adresse ?? '',
			estCommercant: profil?.estCommercant ?? 'unknown'
		},
		onEnregistrer: () => Promise.resolve()
	};
}

/** La page de l'établissement, composée comme sa route la compose (`src/routes/app/parametres_.etablissement.tsx`). */
const PAGE_ETABLISSEMENT_DEMO: EtablissementAffiche = {
	nom: ORGANISATION_DEMO.name,
	cle: ORGANISATION_DEMO._id,
	initial: {
		nom: ORGANISATION_DEMO.name,
		factures: String(ORGANISATION_DEMO.facturesParAn),
		siret: ORGANISATION_DEMO.siret
	},
	onEnregistrer: () => Promise.resolve()
};

/** Ce que la base et le déploiement portent pour l'abonnement de l'établissement. */
interface FacturationDemo {
	/** `organizations.facturesParAn`, le volume que l'établissement déclare. */
	readonly facturesParAn: number;
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
 */
const FACTURATION_DEMO: FacturationDemo = {
	facturesParAn: ORGANISATION_DEMO.facturesParAn,
	clePaddle: false,
	essaiJusquAu: Date.now() + 12 * 24 * 60 * 60 * 1000
};

/**
 * Le plan effectif, par les branches de `resolveEffectivePlan` que ces entrées
 * atteignent (`src/lib/convex/billing.ts`, lignes 104 à 114 et 131 à 136), avec
 * les sièges de `PLAN_SEATS` (lignes 71 à 76) : ni plan simulé, ni plan de
 * développement posé, ni abonnement Paddle. La fonction vit dans un module de
 * fonctions Convex, que la salle n'importe pas dans le navigateur.
 *
 * ⚠️ SANS CLÉ, `isDev` EST VRAI, et l'écran montre l'encart de développement :
 * `isDev` et `paddleConfigure` lisent la même variable (lignes 104 et 235).
 */
function planEffectif(facturation: FacturationDemo) {
	if (!facturation.clePaddle) return { tier: 'dev', isDev: true, seatsAllowed: 9999 };
	if (facturation.essaiJusquAu > Date.now()) {
		return { tier: 'procedures', isDev: false, seatsAllowed: 3 };
	}
	return { tier: 'none', isDev: false, seatsAllowed: 0 };
}

/**
 * L'état d'abonnement, composé comme `etatAbonnement` le rend (`billing.ts`,
 * lignes 222 à 240) : le palier par `palierDeTaille`, ses bornes et ses tarifs
 * lus dans la grille, jamais écrits.
 */
function abonnementDe(facturation: FacturationDemo): AbonnementAffiche {
	const { tier, isDev, seatsAllowed } = planEffectif(facturation);
	const palier = palierDeTaille(facturation.facturesParAn);

	return {
		tier,
		isDev,
		palier,
		bornesPalier: BORNES_PALIER[palier],
		facturesParAn: facturation.facturesParAn,
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
 * entrée changée. Le palier principal est celui de l'établissement.
 */
const FORMES_PALIERS_DEMO: Readonly<Record<string, AbonnementAffiche>> = {
	'palier S': abonnementDe({ ...FACTURATION_DEMO, facturesParAn: 180 }),
	'palier L': abonnementDe({ ...FACTURATION_DEMO, facturesParAn: 1_200 })
};

/**
 * « paiement ouvert » : une clé Paddle sur le déploiement, seule entrée changée.
 * L'encart de développement et celui de l'ouverture disparaissent, et l'essai
 * donne le plan `procedures` (ligne 133) : l'offre d'abonnement se dit « En
 * cours ». Le premier bilan ne se dit en cours que sous le plan `suivi` : cette
 * forme ne le change pas, et il n'a que les paliers.
 */
const FORMES_ABONNEMENT_DEMO: Readonly<Record<string, AbonnementAffiche>> = {
	...FORMES_PALIERS_DEMO,
	'paiement ouvert': abonnementDe({ ...FACTURATION_DEMO, clePaddle: true })
};

/**
 * Les réglages, avec un thème tenu par la démonstration : le choisir allume
 * l'autre bouton, sans changer le thème de la salle. La déconnexion ne fait rien.
 */
function ReglagesDemo({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	// Le sombre, défaut du produit (`src/app/use-theme.ts`, ligne 23).
	const [theme, setTheme] = useState<Theme>('dark');

	// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
	const profil = formeDemo(variante, PROFIL_DEMO, FORMES_PROFIL_DEMO);

	return (
		<EcranReglages
			donnees={lectureDemo(etat, {
				org: ORGANISATION_DEMO,
				profil,
				theme,
				onChoisirTheme: setTheme,
				onSeDeconnecter: () => undefined
			})}
		/>
	);
}

export const ECRANS_REGLAGES: readonly EcranDuProduit[] = [
	{
		route: '/app/parametres',
		libelle: 'réglages',
		vide: false,
		variantes: Object.keys(FORMES_PROFIL_DEMO),
		Demo: ReglagesDemo
	},
	{
		route: '/app/parametres_/creancier',
		libelle: 'créancier',
		vide: false,
		variantes: Object.keys(FORMES_PROFIL_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const profil = formeDemo(variante, PROFIL_DEMO, FORMES_PROFIL_DEMO);
			return <EcranCreancier donnees={lectureDemo(etat, creancierDe(profil))} />;
		}
	},
	{
		route: '/app/parametres_/etablissement',
		libelle: 'établissement',
		vide: true,
		Demo: ({ etat }) => (
			<EcranEtablissement donnees={lectureDemo(etat, PAGE_ETABLISSEMENT_DEMO, null)} />
		)
	},
	{
		route: '/app/abonnement',
		libelle: 'abonnement',
		vide: true,
		variantes: Object.keys(FORMES_ABONNEMENT_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const abonnement = formeDemo(variante, ABONNEMENT_DEMO, FORMES_ABONNEMENT_DEMO);
			return <EcranAbonnement donnees={lectureDemo(etat, abonnement, null)} />;
		}
	},
	{
		route: '/app/abonnement_/premier-bilan',
		libelle: 'premier bilan',
		vide: true,
		variantes: Object.keys(FORMES_PALIERS_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const abonnement = formeDemo(variante, ABONNEMENT_DEMO, FORMES_PALIERS_DEMO);
			return <EcranPremierBilan donnees={lectureDemo(etat, abonnement, null)} />;
		}
	},
	{
		route: '/app/abonnement_/suivi',
		libelle: 'offre suivi',
		vide: true,
		variantes: Object.keys(FORMES_ABONNEMENT_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const abonnement = formeDemo(variante, ABONNEMENT_DEMO, FORMES_ABONNEMENT_DEMO);
			return <EcranSuiviOffre donnees={lectureDemo(etat, abonnement, null)} />;
		}
	}
];
