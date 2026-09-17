import { useState } from 'react';
import {
	parcoursDeLaVoie,
	suivreProcedure
} from '../../lib/verticales/recouvrement/apres-procedure';
import { EcranProcedures, type DossierAffiche } from '../../screens/procedures';
import { EcranRevelation, type RevelationDuJour } from '../../screens/revelation';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';
import {
	ABANDONS_AUCUN_DEMO,
	ABANDONS_DEMO,
	ABANDONS_SANS_DECOMPTE_DEMO,
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
 * ensemble. Avec deux jours différents d'un écran à l'autre, la salle montrerait
 * deux « aujourd'hui » voisins.
 */
const AUJOURD_HUI_DEMO = ARRETE_AU_DEMO;

/**
 * UN DOSSIER DE DÉMONSTRATION, COMPOSÉ PAR LE DOMAINE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ RIEN DE JURIDIQUE N'EST ÉCRIT ICI, ET C'EST TOUT L'INTÉRÊT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'état courant, sa date, l'échéance qui commande, sa conséquence et les
 * angles morts sortent de `suivreProcedure` — la MÊME fonction que
 * `lireSuivi` appelle côté base. Le rail sort de `parcoursDeLaVoie`, sur le
 * même journal. La salle ne fournit donc que ce qu'un gérant fournit : la voie
 * engagée, sa date, et les faits consignés.
 *
 * La première version écrivait ces textes à la main. Elle avait déjà produit
 * une incohérence qu'aucun test n'aurait attrapée : un dossier annoncé à
 * l'entrée de la voie L.126 portait l'échéance de contestation, qui ne court
 * qu'une fois le commandement signifié. Le rail montrait un état, la carte en
 * décrivait un autre — et le regard au navigateur validait les deux.
 */
function dossierDemo(
	identite: {
		readonly creanceId: string;
		readonly debiteur: string;
		readonly intervenant: string | null;
		readonly principalRestantDu: bigint | null;
		readonly nombreFactures: number | null;
	},
	voie: {
		readonly procedure: string;
		readonly engageeLe: string;
		readonly journal: readonly { readonly cle: string; readonly survenuLe: string }[];
	}
): DossierAffiche {
	const suivi = suivreProcedure(voie.procedure, voie.journal, voie.engageeLe);

	return {
		...identite,
		engageeLe: voie.engageeLe,
		libelle: suivi.libelle,
		terminal: suivi.terminal,
		prochaineEcheance: suivi.echeances[0] ?? null,
		anglesMorts: [...suivi.anglesMorts],
		etapes: parcoursDeLaVoie(voie.procedure, voie.journal, voie.engageeLe).map((etape) => ({
			etat: etape.etat,
			libelle: etape.libelle,
			statut: etape.statut,
			atteinteLe: etape.atteinteLe,
			branches: etape.branches,
			brancheSuivie: etape.brancheSuivie
		}))
	};
}

/**
 * LES DOSSIERS ENGAGÉS — les quatre rangs de l'écran, côte à côte.
 *
 * ⚠️ IL EN FAUT QUATRE, ET PAS DEUX. L'écran range les dossiers par l'échéance
 * qui approche : date dépassée, échéance proche, plus tard, aucune date comptée.
 * Un jeu qui n'en produirait que deux laisserait deux sections invisibles au
 * regard — et ce sont les deux dernières, celles qui disent ce que le logiciel
 * NE surveille PAS, qui sont les plus faciles à casser sans que rien ne tombe.
 *
 * Chacun est là pour une raison, et sa DATE est choisie pour tomber dans son
 * rang au jour de la salle (9 septembre 2026) :
 *
 *   · Transports Vidal — ordonnance rendue le 28 mai, donc caduque le 28 août :
 *     une date DÉPASSÉE de douze jours ;
 *   · Comptoir Lefèvre — commandement L.126 signifié le 20 août, donc délai de
 *     contestation au 20 septembre : la seule échéance INFORMATIVE du jeu, et
 *     donc la seule pastille ambre ;
 *   · Ateliers Martin — ordonnance rendue le 28 août, donc caduque le
 *     28 novembre. Elle reste ROUGE parce qu'une caducité éteint un droit quelle
 *     que soit sa date, et elle se lit quand même en dernier : ce qui expire en
 *     premier se lit en premier ;
 *   · Fournitures Durand — ordonnance signifiée : la machine ne compte AUCUNE
 *     date dans cet état et déclare son angle mort. Sa créance est introuvable,
 *     donc son montant aussi.
 */
const DOSSIERS_DEMO: DossierAffiche[] = [
	dossierDemo(
		{
			creanceId: 'demo-creance-vidal',
			debiteur: 'Transports Vidal',
			intervenant: null,
			principalRestantDu: 1_284_000n,
			nombreFactures: 2
		},
		{
			procedure: 'injonction-de-payer',
			engageeLe: '2026-03-02',
			journal: [{ cle: 'ordonnance-rendue', survenuLe: '2026-05-28' }]
		}
	),
	dossierDemo(
		{
			creanceId: 'demo-creance-lefevre',
			debiteur: 'Comptoir Lefèvre',
			intervenant: 'SELARL Bonnet, commissaires de justice',
			principalRestantDu: 318_000n,
			nombreFactures: 1
		},
		{
			procedure: 'l126-creances-commerciales',
			engageeLe: '2026-07-15',
			journal: [{ cle: 'commandement-signifie', survenuLe: '2026-08-20' }]
		}
	),
	dossierDemo(
		{
			creanceId: 'demo-creance-martin',
			debiteur: 'Ateliers Martin',
			intervenant: 'SCP Reynal & Vasseur, commissaires de justice',
			principalRestantDu: 3_199_100n,
			nombreFactures: 4
		},
		{
			procedure: 'injonction-de-payer',
			engageeLe: '2026-06-04',
			journal: [{ cle: 'ordonnance-rendue', survenuLe: '2026-08-28' }]
		}
	),
	dossierDemo(
		{
			creanceId: 'demo-creance-durand',
			debiteur: 'Fournitures Durand',
			intervenant: null,
			/*
			  ⚠️ `null`, ET PAS `0n`. C'est la branche qui protège l'écran du zéro de
			  confort : une créance introuvable affiche « montant non repris », jamais
			  « 0,00 € », qui se lirait « rien à perdre sur ce dossier ». Sans ce cas
			  dans la salle, la branche ne se regarde jamais, et rien ne tomberait le
			  jour où elle se remettrait à écrire un zéro.
			*/
			principalRestantDu: null,
			nombreFactures: null
		},
		{
			procedure: 'injonction-de-payer',
			engageeLe: '2026-01-10',
			journal: [
				{ cle: 'ordonnance-rendue', survenuLe: '2026-01-20' },
				{ cle: 'ordonnance-signifiee', survenuLe: '2026-02-10' }
			]
		}
	)
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
	arreteAu: ARRETE_AU_DEMO,
	/*
	  ⚠️ LA FORME PRINCIPALE PORTE DES ABANDONS, et ce n'est pas un hasard. Ce
	  bloc est le seul de l'écran dont le rendu dépend de plusieurs natures de
	  point, d'un regroupement par décompte et d'une addition qui doit retomber
	  sur le chiffre annoncé : c'est celui qu'on vient regarder. Le cas où tout
	  est complet est une phrase, et il a sa variante.
	*/
	laisseDeCote: { etat: 'pret', valeur: ABANDONS_DEMO }
};

/**
 * Les formes nommées de « Ce qui est dû ».
 *
 *   · « surveillance interrompue » — un battement en échec depuis l'arrivée : le
 *     bilan cesse de compter et dit pourquoi ;
 *   · « rien de chiffrable » — zéro facture chiffrée, mais des factures NON
 *     chiffrées. Ce n'est pas l'état vide, et c'est le cas qui posait un
 *     « 0,00 € » en corps de cinquante-six pixels sous « dus de plein droit ».
 *
 * Et les trois formes du contrôle de complétude, qui porte sa propre lecture :
 *
 *   · « rien laissé de côté » — des décomptes arrêtés, tous complets : une
 *     phrase qui rassure, jamais une carte à 0,00 € ;
 *   · « aucun décompte arrêté » — pas de sujet, donc pas de section : ce qu'on
 *     vient vérifier ici, c'est qu'elle DISPARAÎT ;
 *   · « contrôle en cours » et « contrôle en échec » — le bloc travaille, ou
 *     dit qu'il n'a rien pu vérifier, pendant que le reste de l'écran est prêt.
 */
const FORMES_REVELATION_DEMO: Readonly<Record<string, RevelationDuJour>> = {
	'surveillance interrompue': {
		...REVELATION_DU_JOUR_DEMO,
		bilan: BILAN_SURVEILLANCE_INTERROMPUE_DEMO
	},
	'rien laissé de côté': {
		...REVELATION_DU_JOUR_DEMO,
		laisseDeCote: { etat: 'pret', valeur: ABANDONS_AUCUN_DEMO }
	},
	'aucun décompte arrêté': {
		...REVELATION_DU_JOUR_DEMO,
		laisseDeCote: { etat: 'pret', valeur: ABANDONS_SANS_DECOMPTE_DEMO }
	},
	'contrôle en cours': {
		...REVELATION_DU_JOUR_DEMO,
		laisseDeCote: { etat: 'attente' }
	},
	'contrôle en échec': {
		...REVELATION_DU_JOUR_DEMO,
		laisseDeCote: { etat: 'erreur' }
	},
	/*
	  ⚠️ LE BILAN RESTE CELUI DE L'ÉTABLISSEMENT, ET N'EST PAS MIS À ZÉRO AVEC LE
	  RESTE. Ces factures EXISTENT : ce qui manque, c'est le taux qui permettrait
	  de chiffrer leurs intérêts. Ce qui s'est éteint, lui, se compte sur des
	  dates de prescription, qui n'ont pas besoin d'un taux. Remettre le bilan à
	  zéro aurait fabriqué un second cadran à zéro juste sous celui qu'on retire.
	*/
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
		}
	}
};

/**
 * Le vide : un établissement qui n'a encore déposé aucune facture.
 *
 * Sans facture, aucun décompte n'a pu être arrêté : le contrôle n'a rien à
 * contrôler, et l'écran vide n'affiche de toute façon aucune section.
 */
const JOUR_SANS_FACTURE_DEMO: RevelationDuJour = {
	revelation: REVELATION_SANS_FACTURE_DEMO,
	bilan: BILAN_SANS_FACTURE_DEMO,
	arreteAu: ARRETE_AU_DEMO,
	laisseDeCote: { etat: 'pret', valeur: ABANDONS_SANS_DECOMPTE_DEMO }
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
