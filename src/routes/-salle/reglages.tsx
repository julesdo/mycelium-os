import { useState, type ReactNode } from 'react';
import type { Theme } from '../../app/use-theme';
import {
	EcranCreancier,
	type CreancierAffiche,
	type EtablissementAuRegistre,
	type EtatCritere
} from '../../screens/parametres/creancier';
import {
	EcranEtablissement,
	type EtablissementAffiche
} from '../../screens/parametres/etablissement';
import {
	EcranReglages,
	type AbonnementEnRangee,
	type EquipeEnRangee,
	type SectionReglages
} from '../../screens/parametres/reglages';
import { palierDeTaille } from '../../lib/config/tarifs';
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
	/*
	  ⚠️ PLUS DE `siret` ICI, ET C'EST VOULU. Le champ existe toujours en base,
	  mais plus aucun écran ne l'écrit : le numéro se saisit une seule fois, sur
	  la page du créancier. La route de cette page l'y lit encore comme valeur de
	  DÉPART, pour les établissements qui n'avaient rempli que lui ; la salle
	  montre le cas qui compte, celui où rien n'est en base et où le registre est
	  proposé.
	*/
	facturesParAn: ETABLISSEMENT_DEMO.facturesParAn
};

/**
 * CE QUE LES DEUX RANGÉES DU COMPTE DISENT SANS QU'ON ENTRE.
 *
 * ⚠️ ÉCRIT ICI, ET PAS IMPORTÉ DES DEUX AUTRES FAMILLES. `abonnement.tsx` et
 * `equipe.tsx` importent tous deux `AvecLesReglages` de ce fichier : leur
 * emprunter leurs entrées refermerait un cycle d'imports, et une constante de
 * module lue au chargement dans un cycle vaut `undefined` sans rien dire. Les
 * deux valeurs reprennent donc ce que ces familles déclarent — trois personnes,
 * une invitation en attente, aucune clé Paddle sur le déploiement — et c'est
 * l'écran de la famille concernée qui reste la source.
 */
const ABONNEMENT_EN_RANGEE_DEMO: AbonnementEnRangee = {
	// Sans clé Paddle, `resolveEffectivePlan` rend le plan de développement :
	// c'est l'encart que l'écran d'abonnement montre déjà (`abonnement.tsx`).
	isDev: true,
	palier: palierDeTaille(ETABLISSEMENT_DEMO.facturesParAn),
	paddleStatus: null,
	essaiFiniLe: null
};

const EQUIPE_EN_RANGEE_DEMO: EquipeEnRangee = { membres: 3, invitations: 1 };

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
 * (`src/routes/app/_reglages.parametres_.creancier.tsx`) : la clé suit l'établissement, et
 * reste la même que le profil soit enregistré ou non.
 */
function creancierDe(profil: ProfilDemo | null): CreancierAffiche {
	return {
		cle: ORGANISATION_DEMO._id,
		nomEtablissement: ORGANISATION_DEMO.name,
		initial: {
			denomination: profil?.denomination ?? ORGANISATION_DEMO.name,
			siren: profil?.siren ?? '',
			adresse: profil?.adresse ?? '',
			estCommercant: profil?.estCommercant ?? 'unknown'
		},
		/*
		  Le registre répond, et il propose DEUX sociétés au même nom : c'est le
		  cas qui compte. Une liste à un seul élément ferait croire que le produit
		  peut choisir seul, et c'est précisément l'erreur qui rendrait une réponse
		  rassurante et fausse.
		*/
		onChercherAuRegistre: () => Promise.resolve(CANDIDATS_REGISTRE_DEMO),
		onEnregistrer: () => Promise.resolve()
	};
}

/** Ce que le registre public propose sur le nom de l'établissement de la salle. */
const CANDIDATS_REGISTRE_DEMO: readonly EtablissementAuRegistre[] = [
	{
		siren: ETABLISSEMENT_DEMO.siren,
		denomination: ETABLISSEMENT_DEMO.nom,
		adresse: ETABLISSEMENT_DEMO.adresse,
		derniereParution: '2026-04-18'
	},
	{
		siren: '552100554',
		denomination: ETABLISSEMENT_DEMO.nom,
		ville: 'Lyon',
		adresse: '14 Rue de Marseille 69007 Lyon',
		derniereParution: '2019-11-05'
	}
];

/** La page de l'établissement, composée comme sa route la compose (`src/routes/app/_reglages.parametres_.etablissement.tsx`). */
const PAGE_ETABLISSEMENT_DEMO: EtablissementAffiche = {
	nom: ORGANISATION_DEMO.name,
	cle: ORGANISATION_DEMO._id,
	initial: {
		nom: ORGANISATION_DEMO.name,
		factures: String(ORGANISATION_DEMO.facturesParAn)
	},
	/*
	  ⚠️ LA MESURE NE TOMBE PAS SUR LE VOLUME DÉCLARÉ, ET C'EST LE CAS À MONTRER.
	  L'import ne couvre que ce qui a été déposé : un compte identique au chiffre
	  saisi ferait croire que les deux disent la même chose, alors que l'un est
	  une déclaration et l'autre une lecture. La fenêtre se lit sur l'horloge,
	  comme l'essai de l'abonnement, pour ne pas vieillir d'un jour chaque matin.
	*/
	mesure: {
		factures: Math.round(ORGANISATION_DEMO.facturesParAn * 0.78),
		depuis: unAnPlusTotDemo(),
		jusqua: new Date(Date.now()).toISOString().slice(0, 10),
		plafondAtteint: false
	},
	onEnregistrer: () => Promise.resolve()
};

/** Le premier jour de la fenêtre de douze mois, comme `volumeEmis` la calcule. */
function unAnPlusTotDemo(): string {
	const jour = new Date(Date.now()).toISOString().slice(0, 10);
	return `${Number.parseInt(jour.slice(0, 4), 10) - 1}${jour.slice(4)}`;
}

/**
 * Les réglages, avec un thème tenu par la démonstration : le choisir allume
 * l'autre bouton, sans changer le thème de la salle. La déconnexion ne fait rien.
 */
function ReglagesDemo({
	etat,
	variante,
	section = null,
	detail
}: {
	etat: EtatDemo;
	variante?: string;
	/** La section que l'adresse nomme, ou `null` sur `/app/parametres`. */
	section?: SectionReglages | null;
	/** Ce que le volet droit montre : la section, comme l'`Outlet` de la mise en page. */
	detail: ReactNode;
}) {
	// « Automatique », défaut du produit (`src/app/use-theme.ts`).
	const [theme, setTheme] = useState<Theme>('auto');

	// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
	const profil = formeDemo(variante, PROFIL_DEMO, FORMES_PROFIL_DEMO);

	return (
		<EcranReglages
			detail={detail}
			sectionOuverte={section}
			donnees={lectureDemo(etat, {
				org: ORGANISATION_DEMO,
				profil,
				abonnement: ABONNEMENT_EN_RANGEE_DEMO,
				equipe: EQUIPE_EN_RANGEE_DEMO,
				theme,
				onChoisirTheme: setTheme,
				onSeDeconnecter: () => undefined
			})}
		/>
	);
}

/**
 * UNE SECTION, DANS LE VOLET DROIT DES RÉGLAGES.
 *
 * La liste est prête, comme en production quand on touche une rangée : l'état
 * choisi dans la salle est celui de la section. À 1024 px et au-delà les deux
 * volets se voient ; en dessous, la section seule. Les familles abonnement,
 * équipe et données l'emploient aussi : leurs écrans sont des sections.
 */
export function AvecLesReglages({
	section,
	variante,
	children
}: {
	section: SectionReglages;
	/** La forme du profil que la liste montre, quand la section la change aussi. */
	variante?: string;
	children: ReactNode;
}) {
	return <ReglagesDemo etat="pret" variante={variante} section={section} detail={children} />;
}

export const ECRANS_REGLAGES: readonly EcranDuProduit[] = [
	{
		route: '/app/_reglages/parametres',
		libelle: 'réglages',
		vide: false,
		variantes: Object.keys(FORMES_PROFIL_DEMO),
		Demo: ({ etat, variante }) => (
			<ReglagesDemo
				etat={etat}
				variante={variante}
				// Comme la mise en page : son erreur emporte le volet droit. Sinon il
				// montre l'établissement, qui lit le même établissement et attend avec elle.
				detail={
					etat === 'erreur' ? null : (
						<EcranEtablissement donnees={lectureDemo(etat, PAGE_ETABLISSEMENT_DEMO, null)} />
					)
				}
			/>
		)
	},
	{
		route: '/app/_reglages/parametres_/creancier',
		libelle: 'créancier',
		vide: false,
		variantes: Object.keys(FORMES_PROFIL_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const profil = formeDemo(variante, PROFIL_DEMO, FORMES_PROFIL_DEMO);
			return (
				<AvecLesReglages section="creancier" variante={variante}>
					<EcranCreancier donnees={lectureDemo(etat, creancierDe(profil))} />
				</AvecLesReglages>
			);
		}
	},
	{
		route: '/app/_reglages/parametres_/etablissement',
		libelle: 'établissement',
		vide: true,
		Demo: ({ etat }) => (
			<AvecLesReglages section="etablissement">
				<EcranEtablissement donnees={lectureDemo(etat, PAGE_ETABLISSEMENT_DEMO, null)} />
			</AvecLesReglages>
		)
	}
];
