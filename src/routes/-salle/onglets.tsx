import { useState } from 'react';
import { suivreProcedure } from '../../lib/verticales/recouvrement/apres-procedure';
import { EcranDossiers, type DossierDeLIndex, type DossiersAffiches } from '../../screens/dossiers';
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
 * UN DOSSIER DE L'INDEX, ET SON ÉCHÉANCE COMPOSÉE PAR LE DOMAINE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ RIEN DE JURIDIQUE N'EST ÉCRIT ICI, ET C'EST TOUT L'INTÉRÊT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'échéance qui commande sort de `suivreProcedure` — la MÊME fonction que
 * `lireSuivi` appelle côté base. La salle ne fournit que ce qu'un gérant
 * fournit : la voie engagée, sa date, et les faits consignés. Écrite à la main,
 * elle a déjà produit une incohérence qu'aucun test n'aurait attrapée.
 */
function auTribunal(
	identite: Omit<DossierDeLIndex, 'etape' | 'courrierAValider' | 'professionnelDesigne'>,
	voie: {
		readonly procedure: string;
		readonly engageeLe: string;
		readonly journal: readonly { readonly cle: string; readonly survenuLe: string }[];
	}
): DossierDeLIndex {
	const suivi = suivreProcedure(voie.procedure, voie.journal, voie.engageeLe);
	const echeance = suivi.echeances[0];
	return {
		...identite,
		etape: 'TRIBUNAL',
		courrierAValider: false,
		professionnelDesigne: true,
		...(echeance === undefined
			? {}
			: { prochaineEcheance: { libelle: echeance.libelle, dateLimite: echeance.dateLimite } })
	};
}

/**
 * LES DOSSIERS DE L'INDEX — une par étape, et les cas qui cassent.
 *
 * ⚠️ LES QUATRE ÉTAPES SONT REPRÉSENTÉES, parce que le filtre en a quatre et
 * qu'un filtre dont une position ne rend jamais rien ne se regarde pas.
 *
 * ⚠️ ET DEUX CAS SONT LÀ POUR CE QU'ILS CASSENT :
 *   · Ateliers Martin porte une échéance de procédure DÉPASSÉE — c'est le seul
 *     endroit du produit où un droit s'éteint à date fixe, et la rangée doit la
 *     faire passer devant tout le reste ;
 *   · Comptoir Lefèvre attend une validation de courrier : sa précision doit
 *     passer devant sa date limite pour agir, qui est à cinq ans.
 */
const DOSSIERS_DEMO: readonly DossierDeLIndex[] = [
	auTribunal(
		{
			_id: 'demo-creance-martin',
			debiteur: 'Ateliers Martin',
			debiteurId: 'demo-debiteur-martin',
			principalRestantDu: 3_199_100n,
			nombreFactures: 4,
			dateLimiteAgir: '2031-05-01'
		},
		{
			procedure: 'injonction-de-payer',
			engageeLe: '2025-10-14',
			/*
			  ⚠️ RENDUE AVANT LA BASCULE DU 1ER SEPTEMBRE 2026, donc six mois : la
			  date tombe au 1er juin 2026, DÉPASSÉE au jour de la salle. Choisie pour
			  ça, et à vérifier si le référentiel change de délai — une ordonnance de
			  mai 2026 vivait jusqu'en novembre, et la rangée ne montrait alors plus
			  aucun dépassement.
			*/
			journal: [{ cle: 'ordonnance-rendue', survenuLe: '2025-12-01' }]
		}
	),
	{
		_id: 'demo-creance-lefevre',
		debiteur: 'Comptoir Lefèvre',
		debiteurId: 'demo-debiteur-lefevre',
		etape: 'ON_LUI_ECRIT',
		principalRestantDu: 1_284_000n,
		nombreFactures: 2,
		dateLimiteAgir: '2031-08-20',
		dernierCourrierLe: '2026-08-20',
		courrierAValider: true,
		professionnelDesigne: false
	},
	{
		_id: 'demo-creance-durand',
		debiteur: 'Fournitures Durand',
		debiteurId: 'demo-debiteur-durand',
		etape: 'PRET',
		principalRestantDu: 620_050n,
		nombreFactures: 3,
		dateLimiteAgir: '2026-10-27',
		courrierAValider: false,
		professionnelDesigne: false
	},
	{
		_id: 'demo-creance-vidal',
		debiteur: 'Transports Vidal',
		debiteurId: 'demo-debiteur-vidal',
		etape: 'PRET',
		principalRestantDu: 318_000n,
		nombreFactures: 1,
		courrierAValider: false,
		professionnelDesigne: false
	},
	{
		_id: 'demo-creance-bellin',
		debiteur: 'Bellin & Fils',
		debiteurId: 'demo-debiteur-bellin',
		etape: 'REGLE',
		principalRestantDu: 0n,
		nombreFactures: 2,
		dernierCourrierLe: '2026-06-11',
		courrierAValider: false,
		professionnelDesigne: false
	}
];

/**
 * ⚠️ LE LOT SE REJOUE DANS LA SALLE, résultat compris. Sans lui, la feuille du
 * lot — celle qui dit ce qui a été préparé ET ce qui a été refusé — ne se
 * regarde jamais, et c'est exactement la partie qu'on ne peut pas se permettre
 * de casser en silence : un lot qui tait ses refus fait croire à des lettres
 * qui n'existent pas.
 */
function DossiersDemo({ etat }: { etat: EtatDemo }) {
	const [lot, setLot] = useState<DossiersAffiches['lot']>('AUCUN');

	const valeur: DossiersAffiches = {
		dossiers: DOSSIERS_DEMO,
		aujourdHui: AUJOURD_HUI_DEMO,
		lot,
		onPreparerRelances: (creanceIds) => {
			setLot({
				fait: {
					prepares: Math.max(creanceIds.length - 1, 0),
					refus:
						creanceIds.length > 1
							? [
									{
										debiteur: 'Comptoir Lefèvre',
										raison: 'Un courrier du même modèle attend déjà votre validation sur ce dossier.'
									}
								]
							: []
				}
			});
		},
		onFermerLeLot: () => setLot('AUCUN')
	};

	const vide: DossiersAffiches = { ...valeur, dossiers: [] };
	return <EcranDossiers donnees={lectureDemo(etat, valeur, vide)} />;
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
		route: '/app/dossiers',
		libelle: 'dossiers',
		vide: true,
		Demo: DossiersDemo
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
