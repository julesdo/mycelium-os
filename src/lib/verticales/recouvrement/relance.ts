import { versEuros, type Montant } from '../../socle/montants';
import type { Refus } from './compagnon/refus';
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
 * Une mise en demeure produit des effets de droit. La loi ne lui impose aucune
 * liste de mentions — une interpellation suffisante, que le juge apprécie
 * (`PARAMETRES.modesMiseEnDemeure`) — et ce module a longtemps affirmé le
 * contraire. Ce qui manque est le MODÈLE de lettre de relance officielle,
 * rédigé et contre-vérifié le 25/09/2026, qui arrive avec l'envoi des
 * courriers. D'ici là, le niveau se déclare indisponible et le dit.
 *
 * ⚠️ UNE INTERPELLATION SUFFISANTE PEUT VALOIR MISE EN DEMEURE QUEL QUE SOIT
 * SON TITRE. Le niveau 2 ne dit donc pas qu'il « n'est pas une mise en
 * demeure » : il dit qu'il n'en porte pas l'intitulé.
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
			'Ce courrier ne porte pas l’intitulé « mise en demeure ».'
	},
	{
		niveau: 3,
		nom: 'Mise en demeure',
		intention:
			'Une interpellation suffisante de votre client, sous l’intitulé « mise en demeure ». ' +
			'Le modèle n’est pas encore disponible dans ce logiciel.'
	}
];

/** Le décompte ARRÊTÉ dont le niveau 2 reprend les chiffres. Jamais recalculé. */
export interface DecompteArrete {
	readonly arreteAu: string;
	/**
	 * ⚠️ LE PRINCIPAL DU DÉCOMPTE FIGÉ, PAS LE SOLDE DES FACTURES. La lettre prenait le
	 * solde du jour (le montant moins TOUS les règlements) à côté des intérêts et du
	 * total figés : ses lignes ne s'additionnaient plus dès qu'un règlement avait
	 * éteint des pénalités, ou était arrivé après l'arrêté.
	 */
	readonly principalRestantDu: Montant;
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

/**
 * ⚠️ LA BRANCHE QUI REFUSE PORTE LE `Refus` PARTAGÉ, ET NE LE REDÉCLARE PLUS.
 *
 * Les quatre champs (`peutFaire` requis, `constat`, `blocages`,
 * `coutDeLAttente`) sont nés ici, et ils y seraient restés seuls. Or D0 ne
 * s'applique pas en gros : il s'applique à chaque endroit du produit qui dit
 * non, et les filtres avant rendu du compagnon en ajoutent cinq d'un coup. La
 * forme vit donc dans `compagnon/refus.ts`, et le compilateur la réclame
 * partout ailleurs. Les trois refus de ce module, eux, n'ont pas bougé d'un
 * mot.
 */
export type Relance =
	| {
			readonly disponible: true;
			readonly niveau: NiveauRelance;
			readonly objet: string;
			/** Le texte, tel que le créancier l'enverra. Prêt, pas à retoucher. */
			readonly corps: string;
	  }
	| ({
			readonly disponible: false;
			/** Le geste qui lève ce refus, quand il en existe un DANS le produit. */
			readonly geste?: GesteRelance;
	  } & Refus);

/**
 * Le geste, à l'intérieur du produit, qui lève un refus de relance.
 *
 * ⚠️ UNE CLÉ, PAS UNE ADRESSE. Ce module compose du texte et ne connaît aucune
 * route ; l'interface traduit la clé en destination, et le compilateur vérifie
 * cette destination-là contre l'arbre des routes. Un seul refus du module se
 * lève d'un geste, et les autres n'en portent pas — ce qui est une information,
 * pas un oubli.
 */
export type GesteRelance = 'ARRETER_DECOMPTE';

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
		peutFaire:
			'La surveillance de cette créance continue, son décompte se chiffre au centime et ' +
			's’imprime, et ses pièces se déposent comme sur n’importe quel dossier.',
		// La formulation du blueprint, mot pour mot. Ce qui suit — déclarer la
		// créance, saisir qui que ce soit — est une conduite à tenir, donc hors
		// de ce que ce produit écrit.
		constat:
			`Les relances sont suspendues : le registre public porte « ${nature} » pour ` +
			`${elements.debiteur}${depuis}. Ce constat tient tant que le registre porte cette ` +
			`mention.`,
		blocages: [],
		// ⚠️ L'ANGLE MORT SE DÉCLARE AU LIEU DE SE TAIRE, et c'est la seule
		// formulation possible ici. Chiffrer ce que l'attente coûte supposerait
		// de savoir ce que devient une créance sur une entreprise en liquidation
		// — et le dire serait exactement la ligne rouge 3.
		coutDeLAttente:
			'Ce que cette suspension coûte n’est pas chiffrable par ce logiciel, et c’est un ' +
			'angle mort déclaré : il ne mesure pas ce que devient une créance sur une entreprise ' +
			'dans cet état, et il ne l’écrit donc pas.'
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
			// C'est le seul refus du module qui se lève d'un geste, et il le dit
			// avant de dire ce qui manque.
			peutFaire:
				'Le rappel du niveau 1 se compose dès maintenant sur les mêmes factures : il ' +
				'suppose l’oubli et n’annonce aucun chiffre, donc il n’attend aucun décompte.',
			constat:
				'Ce niveau reprend les montants d’un décompte arrêté, et aucun décompte n’a été ' +
				'produit pour cette créance. Les chiffres d’une relance ne se recalculent pas à la ' +
				'volée : seul un décompte figé et daté est opposable. Ce refus se lève par l’arrêt ' +
				'd’un décompte sur cette créance, qui fige ses chiffres et les date.',
			blocages: [],
			coutDeLAttente:
				`Tant qu’aucun décompte n’est arrêté, les ${versEuros(elements.principalRestantDu)} € ` +
				`de principal restent réclamés sans intérêts ni indemnité forfaitaire chiffrés dans ` +
				`un texte daté. Ce que ces intérêts représentent ne se chiffre que dans le décompte.`,
			geste: 'ARRETER_DECOMPTE'
		};
	}

	const { arreteAu, principalRestantDu, interets, indemniteForfaitaire, total } = elements.decompte;

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
			`Principal restant dû : ${versEuros(principalRestantDu)} €`,
			`Pénalités de retard : ${versEuros(interets)} €`,
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
 * Les deux moitiés de D0 partagées par les deux refus du niveau 3.
 *
 * Elles sont identiques parce que la situation l'est : dans les deux cas le
 * texte n'est pas composé, et dans les deux cas les deux premiers niveaux, eux,
 * le sont. Les recopier ferait deux endroits à corriger.
 */
const PEUT_FAIRE_SANS_MISE_EN_DEMEURE =
	'Le rappel du niveau 1 se compose dès maintenant, et le compte arrêté du niveau 2 dès ' +
	'qu’un décompte est arrêté. Le décompte lui-même se chiffre au centime et s’imprime.';

/**
 * ⚠️ NON CHIFFRABLE, ET DÉCLARÉ TEL. Une mise en demeure ne réclame pas une
 * somme de plus : elle ouvre un délai. Chiffrer ce que ce délai vaut supposerait
 * de dire quels effets de droit il produit, ce que ce logiciel ne mesure pas.
 */
const COUT_SANS_MISE_EN_DEMEURE =
	'Ce que l’attente coûte ici ne se chiffre pas : une mise en demeure n’ajoute aucune somme ' +
	'à ce qui est réclamé, elle ouvre un délai. Les montants du dossier, eux, restent chiffrés ' +
	'et datés par le décompte.';

/**
 * NIVEAU 3 — la mise en demeure, et pourquoi elle n'est pas encore composée.
 *
 * ⚠️ CE NIVEAU ÉTAIT BLOQUÉ POUR UNE RAISON FAUSSE. Il attendait
 * `mentionsObligatoiresInjonction`, qui décrit une requête au tribunal, pas une
 * lettre au débiteur ; et il affirmait qu'une mise en demeure a des « mentions
 * obligatoires ». La loi n'en dresse aucune liste : elle demande une
 * interpellation suffisante (`PARAMETRES.modesMiseEnDemeure`), que le juge
 * apprécie. La relecture juridique du 25/09 l'a relevé.
 *
 * Ce qui manque vraiment est le MODÈLE : la lettre de relance officielle,
 * rédigée et contre-vérifiée le 25/09, qui arrive avec l'envoi des courriers.
 * D'ici là, ce niveau le dit, au lieu de composer un texte que personne n'a
 * relu.
 */
function miseEnDemeure(): Relance {
	const regle = parametre('modesMiseEnDemeure');
	const regleRelevee = regle !== undefined && estUtilisable(regle);

	return {
		disponible: false,
		peutFaire: PEUT_FAIRE_SANS_MISE_EN_DEMEURE,
		constat: regleRelevee
			? 'La loi n’impose pas de liste de mentions à une mise en demeure : elle demande une ' +
				'interpellation suffisante, que le juge apprécie. Ce logiciel ne compose pas encore ' +
				'cette lettre ; elle viendra avec le modèle de lettre de relance officielle, que vous ' +
				'relirez et validerez avant tout envoi.'
			: 'La règle qui encadre une mise en demeure n’est pas relevée au référentiel juridique ' +
				'de ce logiciel. Il ne compose donc pas cette lettre.',
		// ⚠️ NI CLÉ DE CODE, NI NOTE DE DÉVELOPPEUR À L'ÉCRAN. Le gérant a besoin
		// de savoir CE QUI MANQUE, pas comment on l'a nommé.
		blocages: [
			regleRelevee
				? 'Le modèle de lettre de relance officielle n’est pas encore disponible dans ce logiciel.'
				: 'La règle qui encadre une mise en demeure n’est pas relevée au référentiel juridique de ce logiciel.'
		],
		coutDeLAttente: COUT_SANS_MISE_EN_DEMEURE
	};
}
