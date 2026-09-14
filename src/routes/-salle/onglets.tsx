import { useState } from 'react';
import type { AccueilAffiche } from '../../screens/accueil';
import { EcranAccueil } from '../../screens/accueil';
import { EcranProcedures } from '../../screens/procedures';
import { ceQuiManque, travauxDuVeilleur } from '../../ui';
import { DOSSIERS_DEMO, EVENEMENTS_DEMO } from './communes';
import { lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * L'ACCUEIL, DANS SES DEUX ÉTATS, ET C'EST TOUTE LA RAISON DE CES DEUX ENTRÉES.
 *
 * Le défaut qu'on corrige était qu'il en avait DEUX FORMES : un écran garni, et
 * une page d'accueil vide qui ne lui ressemblait pas. Les regarder côte à côte
 * dans la salle d'exposition est le seul moyen de vérifier qu'ils sont bien le
 * même écran — même hero, même rangée d'actions, même géométrie — et que seule
 * la carte du bas change.
 */
const ACCUEIL_DEMO: AccueilAffiche = {
	// 48 320,55 € : un montant à cinq chiffres avec des centimes non nuls, parce
	// que c'est le pire cas typographique du hero — l'espace de groupement, la
	// virgule et les deux petits chiffres doivent tenir sur une ligne à 375 px.
	total: 4_832_055n,
	nombreFactures: 7,
	interetsCourusDepuisHier: 274n,
	// ⚠️ LES TROIS PARTS SOMMENT EXACTEMENT AU TOTAL. Une donnée de
	// démonstration qui ne boucle pas est pire qu'absente : elle laisse passer
	// une barre dont les segments ne correspondent pas au chiffre du hero, et
	// c'est précisément le défaut que ce composant existe pour empêcher.
	//   4 500 015 + 304 040 + 28 000 = 4 832 055
	// L'indemnité vaut 7 × 40 € — une par facture en retard, ce qui la relie au
	// `nombreFactures` juste au-dessus.
	parts: { principal: 4_500_015n, interets: 304_040n, indemnites: 28_000n },
	evenements: EVENEMENTS_DEMO,
	hypotheses: [
		"Le secteur de Ateliers Martin n'est pas déterminé : la prescription est calculée sur le délai le plus court (1 an). Préciser le secteur lèvera cette hypothèse."
	],
	anglesMorts: [],
	surveillance: { etat: 'NORMAL' },
	/**
	 * ⚠️ DEUX RANGÉES, ET ELLES NE SE RESSEMBLENT PAS. La démonstration doit
	 * montrer le veilleur dans ses deux régimes à la fois : un dépôt qui TOURNE
	 * EN CE MOMENT — la seule ligne animée de toute l'application — et un relevé
	 * de la nuit qui porte la phrase exacte de la machine.
	 *
	 * C'est la seule façon de vérifier au regard que le pouls se distingue sans
	 * emprunter une couleur de seuil, et que « rien de nouveau, rien de
	 * critique » se lit comme un travail fait plutôt que comme un écran vide.
	 */
	travaux: travauxDuVeilleur({
		battement: {
			jour: '2026-09-11',
			statut: 'TU',
			raison: 'rien de nouveau, rien de critique',
			termineLe: Date.UTC(2026, 8, 11, 6, 12)
		},
		depotsEnCours: [
			{ id: 'demo-depot', filename: 'export-comptable-aout.csv', etape: 'lecture de 412 lignes' }
		],
		// Une trouvaille, et une seule : elles sont rares par construction.
		// Seul ce qui fait perdre un droit sans qu on ait rien fait en produit une.
		trouvailles: [
			{
				id: 'demo-notif',
				titre: 'Prescription proche',
				message: 'La facture FA-2021-0087 sera prescrite le 2026-10-14, dans 32 jours.',
				lien: '/app/debiteurs?d=demo-debiteur'
			}
		],
		aujourdHui: '2026-09-11'
	}),
	/**
	 * DEUX VERROUS SUR TROIS, et le plus coûteux en tête.
	 *
	 * ⚠️ CELUI DU PROFIL CRÉANCIER EST LE PLUS SILENCIEUX DU PRODUIT : sans lui,
	 * la condition « entre commerçants » reste indéterminée et l'éligibilité à
	 * l'injonction de payer n'est JAMAIS acquise. L'écran de créance affichait
	 * cette condition non remplie sans jamais dire d'où venait le blocage — et
	 * la salle d'exposition doit montrer l'état où le défaut se voyait.
	 */
	verrous: ceQuiManque({
		profilCreancierComplet: false,
		nombreFactures: 7,
		debiteursSansSiren: 4
	}),
	/**
	 * ⚠️ « CE QUI COURT » APPARAÎT ICI, ET NULLE PART DANS L'ÉTAT VIERGE. C'est
	 * la seule façon de vérifier au regard que la section se tait quand elle est
	 * vide : les deux accueils se regardent côte à côte, et le bloc doit être
	 * absent d'un et présent dans l'autre — pas présent et à zéro.
	 */
	dossiers: DOSSIERS_DEMO
};

/** Le premier jour : tout est à zéro, et RIEN ne disparaît pour autant. */
const ACCUEIL_VIERGE: AccueilAffiche = {
	total: 0n,
	nombreFactures: 0,
	interetsCourusDepuisHier: 0n,
	parts: { principal: 0n, interets: 0n, indemnites: 0n },
	evenements: [],
	hypotheses: [],
	anglesMorts: [],
	surveillance: { etat: 'NORMAL' },
	/**
	 * ⚠️ LE PREMIER JOUR, LE VEILLEUR PARLE QUAND MÊME — et il dit la vérité,
	 * qui est qu'il n'a pas encore tourné. C'est l'application de la règle « le
	 * vide montre le chemin » au travail de fond : un bloc absent apprendrait au
	 * gérant que son absence est normale, et le jour où il manque parce que la
	 * machine est tombée, plus rien ne le distinguerait d'un jour calme.
	 */
	travaux: travauxDuVeilleur({
		battement: null,
		depotsEnCours: [],
		aujourdHui: '2026-09-11'
	}),
	/**
	 * ⚠️ VIDE, ET C'EST JUSTE. Au premier jour, la carte de démarrage porte déjà
	 * « importez vos factures », seule à l'écran et avec le seul faisceau de
	 * l'application. Répéter la même consigne dans une seconde carte est le plus
	 * sûr moyen de n'en faire lire aucune — l'écran ne montre donc les verrous
	 * qu'une fois la première facture entrée.
	 */
	verrous: [],
	/** Rien d'engagé : la section « Ce qui court » ne doit pas exister du tout. */
	dossiers: []
};

/**
 * ⚠️ LE DOSSIER EST OUVERT D'EMBLÉE, et c'est ce qu'on vient regarder : sous
 * 1024 px la preuve est une feuille plein écran, au-dessus c'est le volet droit.
 */
function ProceduresDemo({ etat }: { etat: EtatDemo }) {
	const [ouvert, setOuvert] = useState<string | null>(DOSSIERS_DEMO[0]?.creanceId ?? null);
	const fermer = () => setOuvert(null);

	return (
		<EcranProcedures
			donnees={lectureDemo(
				etat,
				{ dossiers: DOSSIERS_DEMO, ouvertId: ouvert, onFermer: fermer },
				{ dossiers: [], ouvertId: null, onFermer: fermer }
			)}
		/>
	);
}

export const ECRANS_ONGLETS: readonly EcranDuProduit[] = [
	{
		route: '/app/',
		libelle: 'accueil',
		vide: true,
		Demo: ({ etat }) => <EcranAccueil donnees={lectureDemo(etat, ACCUEIL_DEMO, ACCUEIL_VIERGE)} />
	},
	{
		route: '/app/procedures',
		libelle: 'procédures',
		vide: true,
		Demo: ProceduresDemo
	}
];
