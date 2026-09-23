import type { EvenementAffiche } from '../ui';

/**
 * LES DONNÉES DE L'APERÇU DU PRODUIT — partagées par les deux cadres.
 *
 * ⚠️ ELLES VIVAIENT DANS `apercu.tsx`, ET LE TÉLÉPHONE LES AURAIT RECOPIÉES.
 * Deux jeux de démonstration divergent : on corrige un montant d'un côté, et le
 * même écran raconte deux choses différentes selon l'appareil sur lequel on
 * ouvre la page. Sur un produit dont l'argument entier est l'exactitude d'un
 * décompte, c'est la pire chose à laisser possible.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * LES CHIFFRES SE TIENNENT ENTRE EUX, ET C'EST VÉRIFIABLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Chaque ligne affiche son propre montant, mais `TOTAL_IDENTIFIE` — le compteur
 * cumulé — ne somme QUE les deux factures distinctes de la liste :
 *
 *   PRESCRIPTION_PROCHE FA-2021-0087 (9 240,00 €)
 *   + FACTURE_ECHUE FA-2026-0311 (249,90 €)
 *   = 9 489,90 €
 *
 * JAMAIS LA CRÉANCE MÛRE (31 200,50 €) NI L'ÉCHÉANCE DE PROCÉDURE
 * (18 450,00 €) : ce sont des vues agrégées de la même monnaie que les factures
 * qui les composent — une créance additionne des factures, un dossier porte une
 * créance. Les additionner à leurs propres composants serait le double compte
 * que `montantIdentifie` corrige (voir
 * `verticales/recouvrement/surveillance.ts`).
 *
 * LE CAS LE PLUS DUR EST MONTRÉ EN PREMIER, et il est mauvais : une facture
 * DÉJÀ prescrite, c'est-à-dire de l'argent définitivement perdu. Un écran où
 * tout va bien vendrait le produit sur un mensonge et ne dirait rien de ce
 * qu'il sert à faire — c'est précisément ce qu'il repère qu'on vient voir.
 */
export const EVENEMENTS: EvenementAffiche[] = [
	{
		type: 'PRESCRIPTION_PROCHE',
		reference: 'FA-2021-0087',
		montant: 924_000n,
		urgence: 'CRITIQUE',
		explication: 'La facture FA-2021-0087 est PRESCRITE depuis le 14 août 2026.',
		action: 'Ne plus engager de frais sur cette facture : la créance est éteinte.'
	},
	{
		type: 'ECHEANCE_PROCEDURE',
		reference: 'Ateliers Martin',
		montant: 1_845_000n,
		urgence: 'CRITIQUE',
		// ⚠️ LA PERTE SE DIT, L'ACTE NE SE COMMANDE PAS. « Faire signifier sans
		// délai » était un impératif sur un acte de procédure, c'est-à-dire du
		// conseil juridique sur la page la plus lue du site. Le constat reste
		// entier ; le geste redevient celui que le produit sait demander.
		explication:
			'Signification de l’ordonnance : il reste 9 jours avant le 12 septembre. Passée cette ' +
			'date, le droit est perdu et 18 450,00 € cessent d’être couverts.',
		action: 'Ouvrir ce dossier : la date limite et son journal y sont.'
	},
	{
		type: 'CREANCE_MURE',
		reference: 'Fournitures Durand',
		montant: 3_120_050n,
		urgence: 'HAUTE',
		explication:
			'Sur la créance Fournitures Durand, le caractère certain, le caractère liquide, le ' +
			'caractère exigible et la qualité de commerçant des deux parties sont établis, et ' +
			'aucun risque bloquant n’est relevé.',
		action:
			'Ouvrir cette créance : les conditions établies et les pièces qui les soutiennent y sont.'
	},
	{
		type: 'FACTURE_ECHUE',
		reference: 'FA-2026-0311',
		montant: 24_990n,
		urgence: 'NORMALE',
		explication: 'La facture FA-2026-0311 est échue depuis le 1er août et reste due.',
		action: 'Rattacher cette facture à une créance, ou enregistrer son règlement.'
	}
];

export const TOTAL_IDENTIFIE = 948_990n;
