import { ZERO, type Montant } from '../../socle/montants';
import type { EtatCritere } from './qualification';

/**
 * Ce que le logiciel déduit seul des quatre conditions légales.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * POURQUOI CE MODULE EXISTE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La première règle d'écran du projet dit : « le logiciel décide, le gérant
 * confirme. Aucun écran ne demande une saisie que le logiciel peut déduire. Un
 * champ vide qu'il aurait pu remplir est un défaut. »
 *
 * Sur les quatre conditions légales, deux se déduisent des données qu'on a
 * déjà, une se déduit de ce qu'on sait des deux parties, et une seule doit être
 * demandée. Poser quatre questions quand une suffit use la seule ressource
 * vraiment rare — l'attention du gérant — et la file de confirmation
 * d'EGalim a déjà montré ce que ça coûte.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * TROIS ÉTATS, ET « KO » N'EST PAS « UNKNOWN »
 * ─────────────────────────────────────────────────────────────────────────
 *
 * La distinction commande le travail. Une facture pas encore échue n'est pas
 * « d'exigibilité inconnue » : on SAIT qu'elle n'est pas exigible, et la date à
 * laquelle elle le deviendra. Répondre `unknown` reviendrait à demander au
 * gérant de confirmer une évidence ; répondre `ko` lui dit d'attendre.
 */

export interface ElementsDeduction {
	/** Ce qui reste dû, après règlements et avoirs. */
	readonly montantExigible: Montant;
	/** Absente tant que personne ne l'a renseignée ni déduite d'une échéance. */
	readonly dateExigibilite?: string;
	readonly aujourdHui: string;
	readonly creancierCommercant: EtatCritere;
	readonly debiteurCommercant: EtatCritere;
}

export interface ConditionsDeduites {
	readonly certaine: EtatCritere;
	readonly liquide: EtatCritere;
	readonly exigible: EtatCritere;
	readonly entreCommercants: EtatCritere;
}

/**
 * Deux états se combinent : `ko` l'emporte sur `unknown`, qui l'emporte sur `ok`.
 *
 * L'ORDRE N'EST PAS ARBITRAIRE. Savoir qu'une partie n'est PAS commerçante
 * tranche la question même si l'autre est inconnue — la condition ne sera pas
 * remplie, et poser la question sur l'autre partie ne servirait à rien. À
 * l'inverse, deux `ok` sont nécessaires : un seul ne suffit jamais.
 */
function combiner(a: EtatCritere, b: EtatCritere): EtatCritere {
	if (a === 'ko' || b === 'ko') return 'ko';
	if (a === 'unknown' || b === 'unknown') return 'unknown';
	return 'ok';
}

export function deduireConditions(elements: ElementsDeduction): ConditionsDeduites {
	// LIQUIDE : le montant est-il déterminé ? Il l'est par construction dès
	// qu'il reste quelque chose à réclamer. Un solde nul ou négatif — plus
	// d'avoirs que de factures — n'est pas une créance illiquide : c'est une
	// absence de créance.
	const liquide: EtatCritere = elements.montantExigible > ZERO ? 'ok' : 'ko';

	// EXIGIBLE : la date est-elle atteinte ? Le jour même compte — le paiement
	// est dû ce jour-là, et les intérêts courent à compter du lendemain.
	const exigible: EtatCritere =
		elements.dateExigibilite === undefined
			? 'unknown'
			: elements.aujourdHui >= elements.dateExigibilite
				? 'ok'
				: 'ko';

	// ENTRE COMMERÇANTS : il faut les deux côtés.
	const entreCommercants = combiner(elements.creancierCommercant, elements.debiteurCommercant);

	// CERTAINE : jamais déduit, et c'est le point important de ce module.
	//
	// Une créance est certaine si elle n'est pas sérieusement contestée. Rien
	// dans une facture ne dit qu'elle ne l'est pas : L'ABSENCE DE CONTESTATION
	// CONNUE N'EST PAS UNE ABSENCE DE CONTESTATION. La déduire à `ok` serait
	// présumer favorablement, ce que le brief interdit expressément — et c'est
	// précisément le mode de défaillance qui ferait engager des frais sur un
	// dossier qui se retourne.
	const certaine: EtatCritere = 'unknown';

	return { certaine, liquide, exigible, entreCommercants };
}

/** Les conditions qui restent à faire trancher par le gérant. */
export function conditionsADemander(conditions: ConditionsDeduites): string[] {
	return Object.entries(conditions)
		.filter(([, etat]) => etat === 'unknown')
		.map(([nom]) => nom);
}
