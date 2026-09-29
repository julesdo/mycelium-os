import { lireIban } from './iban';
import type { Montant } from './montants';

/**
 * LE VIREMENT EN QR — la charge utile normalisée EPC069-12.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE C'EST, ET CE QUE CE N'EST PAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un texte de onze lignes que l'application bancaire du payeur sait lire : elle
 * pré-remplit un virement SEPA vers le bénéficiaire, avec le montant et la
 * référence, et c'est LE PAYEUR qui le valide, chez lui, dans sa banque.
 *
 * Ce n'est donc PAS un service de paiement : rien n'est exécuté, rien n'est
 * encaissé, aucun ordre n'est initié à la place de qui que ce soit. L'ACPR
 * distingue exécuter une opération — qui demande un agrément — de transmettre
 * une information de paiement, qui n'en demande aucun (relevé le 29/09/2026).
 * C'est aussi pourquoi la deuxième ligne rouge du produit tient : aucun fonds
 * ne passe par ce logiciel, et il n'en voit même pas passer.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ IL REFUSE AU LIEU DE TRONQUER, ET C'EST TOUT L'INTÉRÊT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Une charge utile trop longue, un IBAN faux, un montant nul : chacun produit
 * un QR que l'application bancaire lira quand même, et qui pré-remplira un
 * virement FAUX. Un virement faux part vers un compte, et ne revient pas.
 * Chaque borne de la norme est donc un refus NOMMÉ, jamais une coupe.
 *
 * Source : European Payments Council, « Quick Response Code — Guidelines to
 * Enable Data Capture for the Initiation of a SEPA Credit Transfer »
 * (EPC069-12), version 2.1.
 */

/** Les bornes de la norme. Écrites une fois, lues par les contrôles. */
const MAX_NOM = 70;
const MAX_REFERENCE_LIBRE = 140;
/** EPC069-12 § 5.2.2 : la charge utile entière ne dépasse pas 331 octets. */
const MAX_OCTETS = 331;
/** Les bornes du montant, en centimes. */
const MONTANT_MINIMAL = 1n;
const MONTANT_MAXIMAL = 99_999_999_999n;

export type ChargeDeVirement =
	| { readonly ok: true; readonly charge: string }
	/** Chaque manque est une phrase, jamais un code : elle s'affiche telle quelle. */
	| { readonly ok: false; readonly manques: readonly string[] };

export interface VirementAPreparer {
	/** Le nom du bénéficiaire, tel qu'il s'imprime sur ses courriers. */
	readonly beneficiaire: string;
	readonly iban: string;
	/** Ce qu'il y a à payer, en centimes. */
	readonly montant: Montant;
	/**
	 * La référence à rappeler au virement.
	 *
	 * ⚠️ C'EST ELLE QUI RATTACHE LE VIREMENT AU DOSSIER, et rien d'autre. Un
	 * virement sans référence arrive sur le compte du créancier sans dire à quoi
	 * il se rapporte : il faudra le lettrer à la main, ce que ce produit existe
	 * précisément pour éviter.
	 */
	readonly reference: string;
}

/**
 * Le montant en euros, tel que la norme l'écrit : point décimal, deux
 * décimales, aucun séparateur de milliers.
 *
 * ⚠️ JAMAIS `versEuros`, QUI ÉCRIT EN FRANÇAIS. « 6 373,50 » est juste à
 * l'écran et illisible pour une banque : la virgule et l'espace insécable
 * feraient échouer la lecture, ou pire, la feraient réussir sur un autre
 * nombre.
 */
function eurosNormalise(centimes: Montant): string {
	const entier = centimes / 100n;
	const reste = centimes % 100n;
	return `${entier}.${reste.toString().padStart(2, '0')}`;
}

export function composerVirementEpc(virement: VirementAPreparer): ChargeDeVirement {
	const manques: string[] = [];

	const beneficiaire = virement.beneficiaire.trim();
	if (beneficiaire === '') {
		manques.push('Le nom du bénéficiaire manque : sans lui, le virement ne se pré-remplit pas.');
	} else if (beneficiaire.length > MAX_NOM) {
		manques.push(
			`Le nom du bénéficiaire fait ${beneficiaire.length} caractères, et la norme en admet ${MAX_NOM}.`
		);
	}

	const lu = lireIban(virement.iban);
	if (!lu.ok) {
		manques.push(
			lu.motif === 'FORME'
				? 'L’IBAN du bénéficiaire n’a pas la forme d’un IBAN.'
				: 'La clé de contrôle de l’IBAN du bénéficiaire ne tombe pas : un chiffre est faux.'
		);
	}

	if (virement.montant < MONTANT_MINIMAL) {
		manques.push('Le montant est nul : il n’y a rien à faire payer.');
	} else if (virement.montant > MONTANT_MAXIMAL) {
		manques.push('Le montant dépasse ce qu’un virement en QR peut porter (999 999 999,99 €).');
	}

	const reference = virement.reference.trim();
	if (reference === '') {
		manques.push('La référence manque : le virement arriverait sans dire à quoi il se rapporte.');
	} else if (reference.length > MAX_REFERENCE_LIBRE) {
		manques.push(
			`La référence fait ${reference.length} caractères, et la norme en admet ${MAX_REFERENCE_LIBRE}.`
		);
	}

	if (manques.length > 0) return { ok: false, manques };

	/*
	  LES ONZE LIGNES, DANS L'ORDRE DE LA NORME.

	  ⚠️ LA VERSION EST « 002 », ET C'EST CE QUI REND LE BIC FACULTATIF. En
	  « 001 » il serait obligatoire, et le produit ne le connaît pas : il n'est
	  pas au profil du créancier, et le déduire de l'IBAN demanderait une table
	  de correspondance qu'on ne tiendrait pas à jour. Dans l'espace économique
	  européen, la banque le retrouve seule depuis l'IBAN.

	  ⚠️ LA DIXIÈME LIGNE RESTE VIDE. La norme admet une référence STRUCTURÉE
	  (ISO 11649) ou une référence LIBRE, jamais les deux. La nôtre est libre :
	  elle porte le numéro du dossier tel que le créancier l'écrit sur ses
	  courriers, pas une référence bancaire normalisée.
	*/
	const charge = [
		'BCD',
		'002',
		'1',
		'SCT',
		'',
		beneficiaire,
		lu.ok ? lu.iban : '',
		`EUR${eurosNormalise(virement.montant)}`,
		'',
		'',
		reference
	].join('\n');

	const octets = new TextEncoder().encode(charge).length;
	if (octets > MAX_OCTETS) {
		return {
			ok: false,
			manques: [
				`Ce virement fait ${octets} octets, et la norme en admet ${MAX_OCTETS}. Un nom ou une référence plus courts le ramèneraient dans les bornes.`
			]
		};
	}

	return { ok: true, charge };
}
