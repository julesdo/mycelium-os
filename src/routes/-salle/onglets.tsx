import { useState } from 'react';
import { parcoursDeLaVoie } from '../../lib/verticales/recouvrement/apres-procedure';
import { EcranProcedures, type DossierAffiche } from '../../screens/procedures';
import { EcranRevelation, type RevelationDuJour } from '../../screens/revelation';
import { RAIL_DEMO } from './communes';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';
import {
	ARRETE_AU_DEMO,
	BILAN_DEMO,
	BILAN_SANS_FACTURE_DEMO,
	BILAN_SURVEILLANCE_INTERROMPUE_DEMO,
	REVELATION_DEMO,
	REVELATION_SANS_FACTURE_DEMO
} from './revelation';

/**
 * LE JOUR DE LA SALLE, pour les deux écrans de ce fichier.
 *
 * ⚠️ FIXE, ET PARTAGÉ AVEC LA RÉVÉLATION. Tout l'écran des dossiers est une
 * soustraction de dates : avec le jour réel, la démonstration changerait de rang
 * à chaque semaine qui passe, et les quatre sections ne seraient plus visibles
 * ensemble. Avec deux jours différents d'un écran à l'autre, la salle
 * montrerait deux « aujourd'hui » voisins.
 */
const AUJOURD_HUI_DEMO = ARRETE_AU_DEMO;

/**
 * LES DOSSIERS ENGAGÉS — les quatre rangs de l'écran, côte à côte.
 *
 * ⚠️ IL EN FAUT QUATRE, ET PAS DEUX. L'écran range les dossiers par l'échéance
 * qui approche : date dépassée, échéance sous préavis, plus tard, aucune date
 * comptée. Un jeu qui n'en produirait que deux laisserait deux sections
 * invisibles au regard — et ce sont les deux dernières, celles qui disent ce que
 * le logiciel NE surveille PAS, qui sont les plus faciles à casser sans que rien
 * ne tombe.
 *
 * Chacun est là pour une raison :
 *
 *   · Transports Vidal — une caducité DÉPASSÉE. Ce que la date éteignait s'est
 *     joué, et le logiciel ne sait pas ce qui s'est passé ce jour-là ;
 *   · Comptoir Lefèvre — une échéance INFORMATIVE sous préavis. C'est le seul
 *     dossier qui porte la pastille ambre, et sa voie n'est pas la même : son
 *     rail vient de la machine L.126, calculé par le domaine et non écrit ici ;
 *   · Ateliers Martin — une caducité LOINTAINE. Elle reste rouge parce qu'une
 *     caducité éteint un droit quelle que soit sa date, et elle se lit quand
 *     même en dernier : ce qui expire en premier se lit en premier ;
 *   · Fournitures Durand — AUCUNE date comptée, un angle mort, et un montant
 *     introuvable. Les trois absences que l'écran doit nommer plutôt que
 *     combler.
 *
 * Il vit ici, et pas dans `communes.ts` : seul l'onglet des dossiers le montre.
 * Le rail de l'injonction, lui, reste commun.
 */
const DOSSIERS_DEMO: DossierAffiche[] = [
	{
		creanceId: 'demo-creance-vidal',
		debiteur: 'Transports Vidal',
		libelle: 'Ordonnance rendue',
		engageeLe: '2026-03-02',
		terminal: false,
		intervenant: null,
		principalRestantDu: 1_284_000n,
		nombreFactures: 2,
		prochaineEcheance: {
			libelle: 'Signification de l’ordonnance',
			dateLimite: '2026-08-28',
			gravite: 'CADUCITE',
			consequence:
				'Passé ce délai de 3 mois, l’ordonnance est caduque. La créance n’est pas éteinte, ' +
				'mais la procédure est à reprendre depuis le début, et le temps écoulé rapproche la ' +
				'prescription.'
		},
		anglesMorts: [],
		etapes: RAIL_DEMO
	},
	{
		creanceId: 'demo-creance-lefevre',
		debiteur: 'Comptoir Lefèvre',
		libelle: 'Mise en demeure envoyée',
		engageeLe: '2026-08-20',
		terminal: false,
		intervenant: 'SELARL Bonnet, commissaires de justice',
		principalRestantDu: 318_000n,
		nombreFactures: 1,
		prochaineEcheance: {
			libelle: 'Expiration du délai de contestation',
			dateLimite: '2026-09-20',
			gravite: 'INFORMATIVE',
			consequence:
				'Jusqu’à cette date, le débiteur peut contester et mettre fin à la procédure simplifiée.'
		},
		anglesMorts: [],
		/*
		  ⚠️ LE RAIL VIENT DU DOMAINE, il n'est pas recopié. Écrire à la main les
		  étapes de la L.126 en poserait une seconde version, qui divergerait de la
		  machine au premier ajustement — et la salle validerait au regard une voie
		  que le produit ne rend pas.
		*/
		etapes: parcoursDeLaVoie('l126-creances-commerciales', [], '2026-08-20').map((etape) => ({
			etat: etape.etat,
			libelle: etape.libelle,
			statut: etape.statut,
			atteinteLe: etape.atteinteLe,
			branches: etape.branches,
			brancheSuivie: etape.brancheSuivie
		}))
	},
	{
		creanceId: 'demo-creance-martin',
		debiteur: 'Ateliers Martin',
		libelle: 'Ordonnance rendue',
		engageeLe: '2026-06-04',
		terminal: false,
		intervenant: 'SCP Reynal & Vasseur, commissaires de justice',
		principalRestantDu: 3_199_100n,
		nombreFactures: 4,
		prochaineEcheance: {
			libelle: 'Signification de l’ordonnance',
			dateLimite: '2026-11-28',
			gravite: 'CADUCITE',
			consequence:
				'Passé ce délai de 3 mois, l’ordonnance est caduque. La créance n’est pas éteinte, ' +
				'mais la procédure est à reprendre depuis le début, et le temps écoulé rapproche la ' +
				'prescription.'
		},
		anglesMorts: [],
		etapes: RAIL_DEMO
	},
	{
		creanceId: 'demo-creance-durand',
		debiteur: 'Fournitures Durand',
		libelle: 'Ordonnance signifiée',
		engageeLe: '2026-01-10',
		terminal: false,
		intervenant: null,
		/*
		  ⚠️ `null`, ET PAS `0n`. C'est la branche qui protège l'écran du zéro de
		  confort : une créance introuvable affiche « montant non repris », jamais
		  « 0,00 € », qui se lirait « rien à perdre sur ce dossier ». Sans ce cas
		  dans la salle, la branche ne se regarde jamais, et rien ne tomberait le
		  jour où elle se remettrait à écrire un zéro.
		*/
		principalRestantDu: null,
		nombreFactures: null,
		prochaineEcheance: null,
		anglesMorts: [
			'Un délai d’opposition court depuis la signification. Sa durée n’est pas relevée dans le ' +
				'référentiel juridique de ce logiciel : cette échéance-là n’est pas surveillée, et reste ' +
				'à vérifier auprès de l’acte signifié, qui la porte.'
		],
		etapes: RAIL_DEMO.map((etape, rang) =>
			rang === 1
				? { ...etape, statut: 'FRANCHIE' as const }
				: rang === 2
					? { ...etape, statut: 'COURANTE' as const, atteinteLe: '2026-02-10' }
					: etape
		)
	}
];

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
				{
					dossiers: DOSSIERS_DEMO,
					ouvertId: ouvert,
					aujourdHui: AUJOURD_HUI_DEMO,
					onFermer: fermer
				},
				{ dossiers: [], ouvertId: null, aujourdHui: AUJOURD_HUI_DEMO, onFermer: fermer }
			)}
		/>
	);
}

/**
 * La révélation du jour : les factures de `revelation.ts`, calculées par le
 * domaine, et le bilan de ce qui s'en est éteint.
 */
const REVELATION_DU_JOUR_DEMO: RevelationDuJour = {
	revelation: REVELATION_DEMO,
	bilan: BILAN_DEMO,
	arreteAu: ARRETE_AU_DEMO
};

/**
 * Les formes nommées de « Ce qui est dû ».
 *
 *   · « surveillance interrompue » — un battement en échec depuis l'arrivée : le
 *     bilan cesse de compter et dit pourquoi ;
 *   · « rien de chiffrable » — zéro facture chiffrée, mais des factures NON
 *     chiffrées. Ce n'est pas l'état vide, et c'est le cas qui posait un
 *     « 0,00 € » en corps de cinquante-six pixels sous « dus de plein droit ».
 */
const FORMES_REVELATION_DEMO: Readonly<Record<string, RevelationDuJour>> = {
	'surveillance interrompue': {
		...REVELATION_DU_JOUR_DEMO,
		bilan: BILAN_SURVEILLANCE_INTERROMPUE_DEMO
	},
	'rien de chiffrable': {
		...REVELATION_DU_JOUR_DEMO,
		revelation: {
			...REVELATION_SANS_FACTURE_DEMO,
			nonChiffrees: REVELATION_DEMO.lignes.map((ligne) => ({
				reference: ligne.reference,
				raison:
					'l’échéance est antérieure à la première période de taux relevée : le décompte refuse ' +
					'de chiffrer plutôt que d’extrapoler.'
			}))
		},
		bilan: BILAN_SANS_FACTURE_DEMO
	}
};

/** Le vide : un établissement qui n'a encore déposé aucune facture. */
const JOUR_SANS_FACTURE_DEMO: RevelationDuJour = {
	revelation: REVELATION_SANS_FACTURE_DEMO,
	bilan: BILAN_SANS_FACTURE_DEMO,
	arreteAu: ARRETE_AU_DEMO
};

export const ECRANS_ONGLETS: readonly EcranDuProduit[] = [
	/*
	  ⚠️ L'ACCUEIL N'EST PLUS ICI, ET IL N'EXISTE PLUS. `/app/` rend la file
	  depuis la bascule (T15), et `screens/accueil.tsx` est supprimé : son entrée
	  dans la salle serait une démonstration d'un écran que personne ne verra.
	  C'est `-salle/file.tsx` qui tient `/app/` désormais, et sa clé de
	  cohabitation est partie avec cette entrée-ci.
	*/
	{
		route: '/app/procedures',
		libelle: 'dossiers',
		vide: true,
		Demo: ProceduresDemo
	},
	{
		route: '/app/revelation',
		libelle: 'ce qui est dû',
		vide: true,
		variantes: Object.keys(FORMES_REVELATION_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const jour = formeDemo(variante, REVELATION_DU_JOUR_DEMO, FORMES_REVELATION_DEMO);
			return <EcranRevelation donnees={lectureDemo(etat, jour, JOUR_SANS_FACTURE_DEMO)} />;
		}
	}
];
