import { useState } from 'react';
import type { Theme } from '../../app/use-theme';
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
 * ce que la base porte en plus, et qu'aucune fonction ne produit : l'identifiant
 * de l'établissement, et l'absence de profil de créancier enregistré.
 *
 * Le reste se compose comme le produit le compose : les pages du créancier et de
 * l'établissement comme leurs routes. L'abonnement a sa propre famille,
 * `abonnement.tsx`, avec ses propres entrées.
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

/**
 * La page du créancier, composée comme sa route la compose
 * (`src/routes/app/parametres_.creancier.tsx`) : la clé suit l'établissement, et
 * reste la même que le profil soit enregistré ou non.
 */
function creancierDe(profil: ProfilDemo | null): CreancierAffiche {
	return {
		cle: ORGANISATION_DEMO._id,
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
	}
];
