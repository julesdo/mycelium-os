import { ZERO, additionner, versEuros, type Montant } from '../../socle/montants';
import { PARAMETRES, estUtilisable, type ParametreLegalBase } from './parametres';
import type { DecompteCreance } from './decompte';

/**
 * Le contrôle de complétude — le garde-fou le plus important du produit.
 *
 * LA RÈGLE QU'IL PROTÈGE. Le titre exécutoire ne porte que sur les sommes
 * chiffrées dans l'acte. Ce qui n'y figure pas n'est pas « à réclamer plus
 * tard » : c'est perdu, définitivement. Un acte produit sur un décompte
 * incomplet éteint la créance manquante en même temps qu'il en recouvre une
 * autre.
 *
 * POURQUOI CE DÉFAUT EST INVISIBLE SANS CE CONTRÔLE. Un décompte amputé d'une
 * facture ne ressemble pas à un décompte cassé. Il n'affiche ni erreur, ni
 * zéro, ni montant aberrant : il affiche un total plus petit, parfaitement
 * cohérent avec lui-même. Personne ne peut s'en apercevoir en le relisant —
 * seule la comparaison avec ce qu'on sait par ailleurs des factures du débiteur
 * peut le révéler. C'est exactement le raisonnement qui a fait construire la
 * détection de doublons d'EGalim, et le même mode de défaillance.
 *
 * C'EST LE SEUL ENDROIT DU PRODUIT OÙ UN REFUS VAUT MIEUX QU'UN RÉSULTAT.
 * Partout ailleurs on dégrade, on met en file d'arbitrage, on affiche un doute.
 * Ici on bloque, et on chiffre ce qui serait abandonné.
 */

export type NatureAbandon =
	/** Une facture connue du débiteur ne figure pas au décompte. */
	| 'FACTURE_ECARTEE'
	/** Les périodes détaillées ne justifient pas les intérêts annoncés. */
	| 'INTERETS_INEXPLIQUES'
	/** Une valeur juridique nécessaire n'est pas validée. */
	| 'PARAMETRE_MANQUANT';

export interface Abandon {
	readonly nature: NatureAbandon;
	/** La référence de facture, ou la clé du paramètre. */
	readonly reference: string;
	/** `null` quand la perte n'est pas chiffrable — un paramètre absent, par exemple. */
	readonly montantEnJeu: Montant | null;
	readonly explication: string;
}

export interface ControleDecompte {
	readonly complet: boolean;
	readonly abandons: readonly Abandon[];
	/** La somme des abandons chiffrables. Les autres ne s'additionnent pas. */
	readonly montantAbandonne: Montant;
}

/** Ce qu'on sait par ailleurs des factures du débiteur. */
export interface FactureConnue {
	readonly reference: string;
	readonly montantExigible: Montant;
}

export interface ArgumentsControle {
	readonly decompte: DecompteCreance;
	/**
	 * TOUTES les factures connues de ce débiteur, y compris celles qu'on a
	 * choisi de ne pas poursuivre. C'est la comparaison avec cette liste qui
	 * révèle l'oubli — sans elle, le contrôle ne peut rien voir.
	 */
	readonly facturesConnues: readonly FactureConnue[];
	/** Les clés de `PARAMETRES` dont la procédure visée a besoin. */
	readonly parametresRequis?: readonly string[];
}

function parametreParCle(cle: string): ParametreLegalBase | undefined {
	return (PARAMETRES as Record<string, ParametreLegalBase>)[cle];
}

export function controlerDecompte(args: ArgumentsControle): ControleDecompte {
	const { decompte, facturesConnues, parametresRequis = [] } = args;
	const abandons: Abandon[] = [];

	// 1. Les factures connues qui ne sont pas au décompte.
	const referencesDecomptees = new Set(decompte.lignes.map((ligne) => ligne.reference));
	for (const connue of facturesConnues) {
		if (referencesDecomptees.has(connue.reference)) continue;
		abandons.push({
			nature: 'FACTURE_ECARTEE',
			reference: connue.reference,
			montantEnJeu: connue.montantExigible,
			explication:
				`La facture ${connue.reference} (${versEuros(connue.montantExigible)} €) est connue ` +
				`de ce débiteur mais ne figure pas au décompte. Elle ne sera pas couverte par l'acte, ` +
				`et ne pourra plus être réclamée au titre de cette procédure.`
		});
	}

	// 2. Les lignes dont les segments n'expliquent pas les intérêts annoncés.
	//
	//    C'est la traçabilité érigée en invariant : « tout montant affiché est
	//    traçable jusqu'à sa pièce source » (critère d'acceptation du brief).
	//    Un intérêt qu'aucune période ne justifie est indéfendable devant un
	//    débiteur qui refait le calcul — et le fait qu'il soit peut-être juste
	//    n'y change rien, puisque personne ne peut le vérifier.
	//
	//    Une facture pas encore exigible passe : zéro segment, zéro intérêt,
	//    les deux concordent.
	for (const ligne of decompte.lignes) {
		const expliques = ligne.segments.reduce((somme, segment) => somme + segment.interets, 0n);
		if (expliques === (ligne.interets as bigint)) continue;
		abandons.push({
			nature: 'INTERETS_INEXPLIQUES',
			reference: ligne.reference,
			montantEnJeu: null,
			explication:
				`Sur la facture ${ligne.reference}, les intérêts annoncés ` +
				`(${versEuros(ligne.interets)} €) ne correspondent pas à la somme des périodes ` +
				`détaillées. Un montant qu'aucune période ne justifie ne peut pas figurer dans un ` +
				`acte : il serait indéfendable si le débiteur refaisait le calcul.`
		});
	}

	// 3. Les paramètres juridiques que la procédure exige et qui ne sont pas validés.
	for (const cle of parametresRequis) {
		const parametre = parametreParCle(cle);
		if (parametre !== undefined && estUtilisable(parametre)) continue;
		abandons.push({
			nature: 'PARAMETRE_MANQUANT',
			reference: cle,
			montantEnJeu: null,
			explication:
				parametre === undefined
					? `Le paramètre juridique « ${cle} » n'existe pas dans le référentiel.`
					: `Le paramètre juridique « ${cle} » n'est pas utilisable : ${parametre.note}`
		});
	}

	const chiffrables = abandons
		.map((abandon) => abandon.montantEnJeu)
		.filter((montant): montant is Montant => montant !== null);

	return {
		complet: abandons.length === 0,
		abandons,
		montantAbandonne: chiffrables.length > 0 ? additionner(...chiffrables) : ZERO
	};
}

/**
 * La barrière avant toute production d'acte.
 *
 * Elle lève avec un message qui NOMME chaque abandon et le chiffre quand c'est
 * possible. Un message générique (« décompte incomplet ») laisserait
 * l'utilisateur chercher quoi corriger, et l'inciterait à passer outre.
 */
export function exigerDecompteComplet(controle: ControleDecompte): void {
	if (controle.complet) return;

	const details = controle.abandons
		.map((abandon) => `  · ${abandon.explication}`)
		.join('\n');

	throw new Error(
		`Décompte incomplet : l'acte ne peut pas être produit.\n\n${details}\n\n` +
			`Montant chiffrable qui serait abandonné DÉFINITIVEMENT : ` +
			`${versEuros(controle.montantAbandonne)} €.\n` +
			`Le titre exécutoire ne porte que sur les sommes qu'il chiffre.`
	);
}
