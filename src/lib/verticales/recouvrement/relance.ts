import { versEuros, type Montant } from '../../socle/montants';
import { PARAMETRES, estUtilisable, type ParametreLegalBase } from './parametres';
import type { SanteDebiteur } from './scoring';

/**
 * LES RELANCES ASYMÉTRIQUES — module 3.1 du blueprint.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE SONT DES BROUILLONS. C'EST UNE LIGNE ROUGE, PAS UN CHOIX DE PRODUIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Le recouvrement amiable pour le compte d'autrui est une activité encadrée.
 * En Phase 1, les relances sont des BROUILLONS générés dans la boîte du client.
 * C'est lui qui envoie, depuis sa propre adresse, sous sa propre signature.
 * Letikette n'apparaît à aucun moment dans la chaîne. »
 *
 * Ce module compose donc un texte, et rien d'autre. Il n'expédie rien, ne
 * planifie rien, et aucun brouillon ne nomme le logiciel — un test balaie
 * chaque texte produit. Un débiteur qui lirait le nom d'un tiers y verrait un
 * mandat de recouvrement, c'est-à-dire précisément l'activité qu'on n'exerce
 * pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * L'ASYMÉTRIE : CHAQUE NIVEAU GARDE UNE MARCHE AU-DESSUS DE LUI
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un premier rappel qui annonce déjà des pénalités n'a plus rien à annoncer
 * ensuite. Le niveau 1 suppose donc l'oubli — une facture qui n'est pas
 * arrivée, une validation qui traîne — et ne mentionne NI intérêts, NI
 * indemnité, NI suite. Le niveau 2 arrête un compte. Le niveau 3 met en
 * demeure.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE NIVEAU 3 NE PEUT PAS ENCORE EXISTER, ET IL LE DIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une mise en demeure produit des effets de droit. Ses mentions obligatoires
 * n'ont pas été fournies, et la règle 0.1 interdit de les deviner. Elle se
 * déclare indisponible et NOMME ce qui lui manque, comme la procédure L.126.
 *
 * Une mise en demeure irrégulière est pire qu'aucune : elle ne produit pas les
 * effets qu'on lui prête, et le créancier calcule la suite sur un délai qui
 * n'a jamais couru.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET LE COUPE-CIRCUIT PASSE AVANT TOUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un débiteur en procédure collective ne se relance pas. Le blueprint donne
 * jusqu'à la formulation : « Les relances sont suspendues : ce débiteur est en
 * liquidation depuis le 14 mars » — un CONSTAT. « Déclarez votre créance au
 * mandataire » serait un conseil, et c'est la colonne interdite du tableau des
 * lignes rouges.
 */

export type NiveauRelance = 1 | 2 | 3;

export interface DescriptionNiveau {
	readonly niveau: NiveauRelance;
	readonly nom: string;
	/** Ce que ce niveau change, sans jamais promettre un résultat. */
	readonly intention: string;
}

export const NIVEAUX_RELANCE: readonly DescriptionNiveau[] = [
	{
		niveau: 1,
		nom: 'Rappel',
		intention:
			'Suppose l’oubli : une facture qui n’est pas arrivée, une validation qui traîne. ' +
			'Ne mentionne ni intérêts, ni indemnité, ni suite.'
	},
	{
		niveau: 2,
		nom: 'Compte arrêté',
		intention:
			'Reprend les montants d’un décompte figé et daté, sans rien recalculer. ' +
			'Ce n’est pas une mise en demeure et le texte n’en emprunte pas les mots.'
	},
	{
		niveau: 3,
		nom: 'Mise en demeure',
		intention:
			'Produit des effets de droit, et suppose des mentions obligatoires qui ne sont pas ' +
			'relevées dans le référentiel. Indisponible tant qu’elles manquent.'
	}
];

/** Le décompte ARRÊTÉ dont le niveau 2 reprend les chiffres. Jamais recalculé. */
export interface DecompteArrete {
	readonly arreteAu: string;
	readonly interets: Montant;
	readonly indemniteForfaitaire: Montant;
	readonly total: Montant;
}

export interface ElementsRelance {
	readonly creancier: string;
	readonly debiteur: string;
	readonly factures: readonly {
		readonly reference: string;
		readonly montantTTC: Montant;
		readonly dateEcheance?: string;
	}[];
	readonly principalRestantDu: Montant;
	readonly decompte?: DecompteArrete;
	readonly santeDebiteur: SanteDebiteur;
	readonly constatRegistre?: { readonly nature: string; readonly dateJugement?: string };
	readonly aujourdHui: string;
}

export type Relance =
	| {
			readonly disponible: true;
			readonly niveau: NiveauRelance;
			readonly objet: string;
			/** Le texte, tel que le créancier l'enverra. Prêt, pas à retoucher. */
			readonly corps: string;
	  }
	| {
			readonly disponible: false;
			/** Pourquoi il n'y a pas de brouillon. Un constat, jamais une consigne. */
			readonly constat: string;
			readonly blocages: readonly string[];
	  };

/** Une date ISO en français lisible. Le débiteur lit « 15/05/2026 ». */
function enFrancais(iso: string): string {
	const [annee, mois, jour] = iso.split('-');
	return `${jour}/${mois}/${annee}`;
}

function parametre(cle: string): ParametreLegalBase | undefined {
	return (PARAMETRES as Record<string, ParametreLegalBase>)[cle];
}

/**
 * La suspension, quand le registre dit que le débiteur n'est plus en état.
 *
 * ⚠️ ELLE PASSE AVANT LE NIVEAU. Relancer une entreprise en liquidation est au
 * mieux inutile, au pire une démarche que le créancier ne devrait pas faire
 * seul — et le produit n'a pas à dire laquelle il devrait faire.
 */
function suspension(elements: ElementsRelance): Relance | null {
	if (elements.santeDebiteur !== 'PROCEDURE_COLLECTIVE' && elements.santeDebiteur !== 'RADIEE') {
		return null;
	}

	// ⚠️ LA NATURE EST CITÉE, JAMAIS REFORMULÉE. Elle vient du registre public,
	// mot pour mot : « liquidation judiciaire » et « redressement » n'ont pas les
	// mêmes conséquences, et les confondre serait dire le droit à la place du
	// registre.
	const constat = elements.constatRegistre;
	const depuis =
		constat?.dateJugement !== undefined ? ` depuis le ${enFrancais(constat.dateJugement)}` : '';
	const nature = constat?.nature ?? 'une procédure collective ou une radiation';

	return {
		disponible: false,
		// La formulation du blueprint, mot pour mot. Ce qui suit — déclarer la
		// créance, saisir qui que ce soit — est une conduite à tenir, donc hors
		// de ce que ce produit écrit.
		constat:
			`Les relances sont suspendues : le registre public porte « ${nature} » pour ` +
			`${elements.debiteur}${depuis}.`,
		blocages: []
	};
}

export function composerRelance(niveau: NiveauRelance, elements: ElementsRelance): Relance {
	const arret = suspension(elements);
	if (arret !== null) return arret;

	if (niveau === 3) return miseEnDemeure();
	if (niveau === 2) return compteArrete(elements);
	return rappel(elements);
}

/**
 * NIVEAU 1 — le rappel administratif.
 *
 * ⚠️ IL NE MENTIONNE NI INTÉRÊTS, NI INDEMNITÉ, NI SUITE, et ce n'est pas une
 * timidité : un premier rappel qui menace déjà n'a plus de marche au-dessus de
 * lui. L'asymétrie est tout l'intérêt du module.
 */
function rappel(elements: ElementsRelance): Relance {
	const lignes = elements.factures.map((facture) => {
		const echeance =
			facture.dateEcheance !== undefined ? `, échue le ${enFrancais(facture.dateEcheance)}` : '';
		return `— facture ${facture.reference}, ${versEuros(facture.montantTTC)} €${echeance}`;
	});

	return {
		disponible: true,
		niveau: 1,
		objet: `Facture${elements.factures.length > 1 ? 's' : ''} en attente de règlement`,
		corps: [
			'Bonjour,',
			'',
			'Sauf erreur de notre part, le règlement de la ou des factures suivantes ne nous est',
			'pas encore parvenu :',
			'',
			...lignes,
			'',
			'Si le règlement a été émis entre-temps, merci de ne pas tenir compte de ce message.',
			'Si la facture ne vous est pas parvenue, nous vous la renvoyons sur simple demande.',
			'',
			'Bien cordialement,',
			elements.creancier
		].join('\n')
	};
}

/**
 * NIVEAU 2 — le compte arrêté.
 *
 * ⚠️ IL NE RECALCULE RIEN. Le seul chiffre opposable est celui d'un décompte
 * figé et daté ; en recomposer un ici ferait un second calcul, donc une seconde
 * vérité, dans un texte qui part chez le débiteur. Sans décompte, il refuse.
 *
 * ⚠️ ET CE N'EST PAS UNE MISE EN DEMEURE. Un texte qui en emprunterait la forme
 * sans en avoir les mentions ferait croire au créancier qu'un délai est lancé,
 * et la suite de sa procédure se calculerait sur une date fausse.
 */
function compteArrete(elements: ElementsRelance): Relance {
	if (elements.decompte === undefined) {
		return {
			disponible: false,
			constat:
				'Ce niveau reprend les montants d’un décompte arrêté, et aucun décompte n’a été ' +
				'produit pour cette créance. Les chiffres d’une relance ne se recalculent pas à la ' +
				'volée : seul un décompte figé et daté est opposable.',
			blocages: []
		};
	}

	const { arreteAu, interets, indemniteForfaitaire, total } = elements.decompte;

	return {
		disponible: true,
		niveau: 2,
		objet: `Compte arrêté au ${enFrancais(arreteAu)}`,
		corps: [
			'Bonjour,',
			'',
			`Nous n’avons pas reçu le règlement de la ou des factures suivantes, dont le compte est arrêté au ${enFrancais(arreteAu)} :`,
			'',
			...elements.factures.map(
				(facture) => `— facture ${facture.reference}, ${versEuros(facture.montantTTC)} €`
			),
			'',
			`Principal restant dû : ${versEuros(elements.principalRestantDu)} €`,
			`Intérêts de retard : ${versEuros(interets)} €`,
			`Indemnité forfaitaire de recouvrement : ${versEuros(indemniteForfaitaire)} €`,
			`Total arrêté au ${enFrancais(arreteAu)} : ${versEuros(total)} €`,
			'',
			'Le détail de ce compte, période par période, vous est communiqué sur demande. Si un règlement nous a échappé, merci de nous le signaler.',
			'',
			'Bien cordialement,',
			elements.creancier
		].join('\n')
	};
}

/**
 * NIVEAU 3 — la mise en demeure, et pourquoi elle n'existe pas.
 *
 * Le même raisonnement que `procedures.ts` pour la requête en injonction :
 * évaluer est possible, produire l'acte ne l'est pas. Ici il n'y a même rien à
 * évaluer — un texte aux mentions inventées serait inopérant, et ferait croire
 * un délai lancé.
 */
function miseEnDemeure(): Relance {
	const cle = 'mentionsObligatoiresInjonction';
	const p = parametre(cle);
	const disponible = p !== undefined && estUtilisable(p);

	if (disponible) {
		// Le jour où les mentions sont relevées ET validées, ce niveau se
		// construira ici. Refuser en le disant vaut mieux que composer un texte
		// dont personne n'a vérifié la portée.
		return {
			disponible: false,
			constat:
				'Les mentions obligatoires sont désormais disponibles au référentiel : ce niveau ' +
				'reste à construire, et à faire valider avant tout envoi.',
			blocages: []
		};
	}

	return {
		disponible: false,
		constat:
			'Une mise en demeure produit des effets de droit, et ses mentions obligatoires ne sont ' +
			'pas relevées dans le référentiel juridique de ce logiciel. Elle n’est donc pas ' +
			'composée : une mise en demeure irrégulière ne produit pas les effets qu’on lui prête.',
		blocages: [
			p === undefined ? `« ${cle} » : paramètre absent du référentiel.` : `« ${cle} » : ${p.note}`
		]
	};
}
