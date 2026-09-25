import { depuisCentimes, versEuros, type Montant } from '../../socle/montants';
import { PARAMETRES, exiger } from './parametres';
import { dateLisible } from './calendrier';
import { tauxLisible } from './taux-lisible';
import type { ConventionJours } from './decompte';

/**
 * LA PIÈCE — le document que le client envoie à son expert-comptable.
 *
 * C'est le troisième critère de fin de MVP, et le blueprint le dit « le plus dur
 * et le plus important : celui qui prouve que le décompte est une pièce, et pas
 * un écran ». Tant qu'il faut le retoucher avant de l'envoyer, ce n'en est pas
 * une.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ CE N'EST PAS UN ACTE, ET LE DOCUMENT LE DIT LUI-MÊME
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Ni mise en demeure, ni requête, ni commandement. Un décompte est un CONSTAT
 * de compte arrêté, et il vit sous `exiger()` — jamais `exigerPourActe()`.
 *
 * La mention n'est pas une précaution juridique de façade : un avocat qui
 * prendrait ce document pour une mise en demeure croirait un délai lancé qui ne
 * l'est pas, et calculerait la suite de la procédure sur une date fausse.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ AUCUN ARTICLE N'EST ÉCRIT DANS CE FICHIER
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Les fondements viennent de `PARAMETRES`, avec leur source, par `exiger()`.
 * Recopier « article L441-10 » dans un gabarit créerait une seconde vérité, qui
 * ne serait pas corrigée le jour où la première change — et ce document part
 * chez un tiers qui le lira comme une citation.
 *
 * Un test relève les articles cités dans la pièce et vérifie que CHACUN figure
 * dans une source du registre. Il mord sur toute chaîne écrite à la main ici.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * ⚠️ LA RÈGLE EST ICI, LE RENDU EST BÊTE
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Ce module rend une DESCRIPTION ORDONNÉE, pas du PDF. C'est ce qui la rend
 * testable sans harnais, et ce qui garantit qu'un second format — page
 * imprimable, courriel — dira exactement la même chose. Le renderer ne fait que
 * poser des lignes.
 */

/** Ce qui n'entre pas dans le décompte, tel que `controlerDecompte` le chiffre. */
export interface AbandonFige {
	readonly reference: string;
	/** `null` quand la perte n'est pas chiffrable — un paramètre absent, par exemple. */
	readonly montantEnJeu: Montant | null;
	readonly explication: string;
}

export interface IdentiteFigee {
	readonly denomination: string;
	readonly siren?: string;
	readonly adresse?: string;
}

export interface SegmentFige {
	readonly debut: string;
	readonly fin: string;
	readonly jours: number;
	readonly principal: Montant;
	readonly taux: { readonly numerateur: bigint; readonly denominateur: bigint };
	readonly baseAnnuelle: number;
	readonly interets: Montant;
}

export interface ImputationFigee {
	readonly date: string;
	readonly nature: 'PAIEMENT' | 'ACOMPTE' | 'AVOIR' | 'CREDIT';
	readonly montant: Montant;
	readonly surInterets: Montant;
	readonly surPrincipal: Montant;
}

export interface LigneFigee {
	readonly reference: string;
	readonly principalRestantDu: Montant;
	readonly interets: Montant;
	readonly indemniteForfaitaire: Montant;
	readonly total: Montant;
	readonly segments: readonly SegmentFige[];
	/**
	 * Ce que chaque règlement a éteint. ⚠️ Absent d'un décompte figé avant le
	 * 25/09/2026 : il imputait tout au principal, et ses périodes font ses intérêts.
	 */
	readonly imputations?: readonly ImputationFigee[];
}

/** Le décompte tel qu'il a été FIGÉ. La pièce ne recalcule rien. */
export interface DecompteFige {
	readonly arreteAu: string;
	readonly convention: ConventionJours;
	readonly principalRestantDu: Montant;
	readonly interets: Montant;
	readonly indemniteForfaitaire: Montant;
	readonly total: Montant;
	readonly creancier?: IdentiteFigee;
	readonly debiteur?: IdentiteFigee;
	readonly lignes: readonly LigneFigee[];
	/**
	 * L'ordre d'imputation figé avec le décompte. Absent d'un décompte figé avant le
	 * lot 1 de la page dossier.
	 */
	readonly imputation?: {
		readonly ordre: 'PENALITES_DABORD' | 'PRINCIPAL_DABORD';
		readonly confirme: boolean;
		readonly totalAutreOrdre: Montant | null;
	};
	readonly abandons: readonly AbandonFige[];
}

export interface PeriodeAffichee {
	readonly du: string;
	readonly au: string;
	readonly jours: number;
	readonly principal: string;
	readonly taux: string;
	readonly base: number;
	readonly interets: string;
}

export interface ReglementAffiche {
	readonly le: string;
	readonly nature: string;
	readonly montant: string;
	readonly surInterets: string;
	readonly surPrincipal: string;
}

export interface FactureAffichee {
	readonly reference: string;
	readonly principal: string;
	readonly interets: string;
	readonly indemnite: string;
	readonly total: string;
	readonly periodes: readonly PeriodeAffichee[];
	/** Les règlements, et ce que chacun a éteint. Vide quand il n'y en a pas. */
	readonly reglements: readonly ReglementAffiche[];
}

export interface Piece {
	readonly titre: string;
	/**
	 * La date d'arrêté en ISO, à part.
	 *
	 * ⚠️ ELLE EXISTE PARCE QUE LE NOM DU FICHIER L'EXTRAYAIT DU TITRE, par
	 * expression régulière. Tirer une donnée d'une chaîne d'AFFICHAGE marche
	 * jusqu'au jour où l'on retouche l'affichage — et ce jour est arrivé à la
	 * première relecture du PDF, quand « arrêté au 2026-09-01 » s'est révélé lire
	 * comme un export de machine sur un document destiné à un avocat.
	 */
	readonly dateArrete: string;
	readonly sousTitre: string;
	readonly creancier: readonly string[];
	readonly debiteur: readonly string[];
	readonly factures: readonly FactureAffichee[];
	readonly totaux: {
		readonly principal: string;
		readonly interets: string;
		readonly indemnites: string;
		readonly total: string;
	};
	/** Les fondements cités, tirés du registre. */
	readonly fondements: readonly string[];
	/** Ce que le décompte NE couvre PAS. Jamais vide : dit « rien » quand c'est le cas. */
	readonly horsDecompte: readonly string[];
	/**
	 * Ce qu'une correction du calcul, postérieure au décompte figé, change à sa lecture.
	 * ⚠️ UN DÉCOMPTE FIGÉ NE SE RÉÉCRIT PAS : il garde la règle de son jour, et ce
	 * document le DIT au lieu de l'habiller du texte du jour. Vide le plus souvent.
	 */
	readonly correctifs: readonly string[];
	/** Ce que ce document n'est pas. La dernière chose qu'un tiers doit lire. */
	readonly avertissement: string;
}

/** La nature d'un règlement, dite en clair sur le document. */
const NATURE_REGLEMENT: Record<ImputationFigee['nature'], string> = {
	PAIEMENT: 'Paiement',
	ACOMPTE: 'Acompte',
	AVOIR: 'Avoir',
	CREDIT: 'Crédit non détaillé'
};

/** Un montant en euros, format du produit. Une seule façon d'écrire un chiffre. */
function euros(montant: Montant): string {
	return `${versEuros(montant)} €`;
}

/**
 * L'identité, en lignes.
 *
 * ⚠️ UNE IDENTITÉ MANQUANTE SE DIT, elle ne se tait pas. Un décompte produit
 * avant que le profil créancier n'existe reste une pièce valable ; l'en-tête
 * manquant doit se voir, pour que le gérant sache quoi compléter AVANT
 * d'envoyer. Un blanc se lirait comme une négligence chez le destinataire.
 */
function lignesIdentite(identite: IdentiteFigee | undefined, absent: string): string[] {
	if (identite === undefined) return [absent];
	const lignes = [identite.denomination];
	if (identite.siren !== undefined) lignes.push(`SIREN ${identite.siren}`);
	if (identite.adresse !== undefined) lignes.push(identite.adresse);
	return lignes;
}

/**
 * Ce que le décompte ne couvre pas — et le dire même quand la réponse est
 * « rien ».
 *
 * Le silence se lirait comme « on n'a pas regardé ». Une pièce professionnelle
 * dit ce qu'elle couvre ET ce qu'elle ne couvre pas.
 */
function horsDecompte(abandons: readonly AbandonFige[]): string[] {
	if (abandons.length === 0) {
		return [
			'Toutes les factures connues de ce débiteur sont comprises dans ce décompte : ' +
				'aucune somme n’en a été écartée.'
		];
	}

	return abandons.map((abandon) => {
		const pesee =
			abandon.montantEnJeu === null
				? 'montant non chiffrable en l’état'
				: `${euros(abandon.montantEnJeu)} en jeu`;
		return `${abandon.reference} : ${pesee}. ${abandon.explication}`;
	});
}

/**
 * Ce que les corrections du 25/09/2026 changent à la lecture d'un décompte figé avant.
 *
 * ⚠️ L'INDEMNITÉ D'UNE FACTURE QUI N'ÉTAIT PAS EN RETARD. Le calcul comptait les
 * 40 € même sur une facture pas encore échue à la date d'arrêté. Une ligne figée
 * SANS AUCUNE PÉRIODE d'intérêts et AVEC une indemnité est exactement ce cas : le
 * décompte reste tel quel, et le document le signale.
 */
function correctifs(decompte: DecompteFige): string[] {
	return decompte.lignes
		.filter((ligne) => ligne.segments.length === 0 && (ligne.indemniteForfaitaire as bigint) > 0n)
		.map(
			(ligne) =>
				`La facture ${ligne.reference} porte ${euros(ligne.indemniteForfaitaire)} d’indemnité ` +
				`forfaitaire alors qu’elle n’était pas échue à la date d’arrêté. Ce décompte a été figé ` +
				`avant la correction du 25 septembre 2026, qui ne compte plus l’indemnité d’une facture ` +
				`qui n’est pas en retard ; un décompte arrêté depuis ne la porte plus.`
		);
}

/**
 * Ce que la pièce dit de l'ordre d'imputation.
 *
 * ⚠️ UN DÉCOMPTE FIGÉ AVANT LE CHOIX DU GÉRANT n'a pas d'`imputation` : il
 * imputait les paiements d'abord sur les pénalités (25/09/2026) ou sur le
 * principal (avant), et ses règlements le montrent ligne par ligne.
 */
function fondementImputation(imputation: DecompteFige['imputation']): string {
	const avoirs =
		'Avoirs, et crédits dont la nature n’est pas détaillée, imputés sur le principal à leur date. ' +
		'Aucune clause d’imputation des conditions générales n’a été lue par ce logiciel.';
	if (imputation === undefined) {
		return `Règlements imputés comme le détaille le tableau de chaque facture. ${avoirs}`;
	}
	const ordre =
		imputation.ordre === 'PENALITES_DABORD'
			? `Paiements imputés d’abord sur les pénalités déjà courues, puis sur le principal : ${PARAMETRES.imputationPaiementPartiel.source}.`
			: 'Paiements imputés d’abord sur le principal, puis sur les pénalités déjà courues.';
	const choix = imputation.confirme
		? ' Ordre choisi par le créancier.'
		: ' Ordre non confirmé par le créancier : des deux ordres possibles, le calcul le plus bas est retenu.';
	return `${ordre}${choix} ${avoirs}`;
}

/**
 * ⚠️ `dateLisible` SEULEMENT DANS LE TITRE. Les périodes d'intérêts restent en
 * ISO : elles se lisent en colonne, se trient, et un tiers qui refait le calcul
 * y cherche des bornes non ambiguës, pas une jolie phrase.
 */
export function composerPiece(decompte: DecompteFige): Piece {
	// Lue pour être citée : le « par facture » vient d'elle, pas de l'article du montant.
	exiger(PARAMETRES.indemniteParFacture);
	return {
		titre: `Décompte de créance arrêté au ${dateLisible(decompte.arreteAu)}`,
		dateArrete: decompte.arreteAu,
		sousTitre:
			`Intérêts calculés en base ${decompte.convention === 'ACT_365' ? '365 jours' : 'exacte'} ` +
			`(${decompte.convention}). Chaque période est détaillée ci-dessous et se recalcule à la main.`,

		creancier: lignesIdentite(decompte.creancier, 'Identité du créancier non renseignée'),
		debiteur: lignesIdentite(decompte.debiteur, 'Identité du débiteur non renseignée'),

		factures: decompte.lignes.map((ligne) => ({
			reference: ligne.reference,
			principal: euros(ligne.principalRestantDu),
			interets: euros(ligne.interets),
			indemnite: euros(ligne.indemniteForfaitaire),
			total: euros(ligne.total),
			// LES PÉRIODES SONT LA PREUVE. C'est par elles que le destinataire refait
			// le calcul, et c'est exactement ce que fera le débiteur qui conteste.
			periodes: ligne.segments.map((segment) => ({
				du: segment.debut,
				au: segment.fin,
				jours: segment.jours,
				principal: euros(segment.principal),
				taux: tauxLisible(segment.taux),
				base: segment.baseAnnuelle,
				interets: euros(segment.interets)
			})),
			// L'AUTRE MOITIÉ DE LA PREUVE : ce que les règlements ont éteint. Sans
			// elle, la somme des périodes dépasse les intérêts dus.
			reglements: (ligne.imputations ?? []).map((imputation) => ({
				le: imputation.date,
				nature: NATURE_REGLEMENT[imputation.nature],
				montant: euros(imputation.montant),
				surInterets: euros(imputation.surInterets),
				surPrincipal: euros(imputation.surPrincipal)
			}))
		})),

		totaux: {
			principal: euros(decompte.principalRestantDu),
			interets: euros(decompte.interets),
			indemnites: euros(decompte.indemniteForfaitaire),
			total: euros(decompte.total)
		},

		// ⚠️ LES SOURCES VIENNENT DU REGISTRE, PAR `exiger()`. Aucun numéro
		// d'article n'est écrit dans ce fichier, et un test le fait respecter en
		// relevant les articles cités pour les confronter au registre.
		fondements: [
			`Intérêts de retard : ${PARAMETRES.tauxInteretLegalDefaut.source}.`,
			// `depuisCentimes`, et surtout PAS un cast. Le type branché n'est pas une
			// formalité : c'est lui qui garantit qu'aucun `number` ni aucun bigint
			// non marqué n'entre dans la chaîne monétaire. Un `as unknown as Montant`
			// ici rouvrirait la porte que tout le socle ferme.
			`Indemnité forfaitaire de recouvrement, ${euros(
				depuisCentimes(exiger(PARAMETRES.indemniteForfaitaire))
			)} : ${PARAMETRES.indemniteForfaitaire.source}. Due une fois par facture non réglée à ` +
				`son échéance : ${PARAMETRES.indemniteParFacture.source}.`,
			// Cité seulement quand un règlement a été imputé : une règle qui ne sert
			// pas au calcul n'a rien à faire dans ses fondements.
			...(decompte.lignes.some((ligne) => (ligne.imputations ?? []).length > 0)
				? [fondementImputation(decompte.imputation)]
				: [])
		],

		horsDecompte: horsDecompte(decompte.abandons),

		correctifs: correctifs(decompte),

		avertissement:
			'Ce document est un décompte de créance arrêté à la date indiquée. Ce n’est pas une ' +
			'mise en demeure, ni un acte de procédure, et il ne fait courir aucun délai. Il présente ' +
			'les sommes dues et le détail de leur calcul, à toutes fins utiles.'
	};
}
