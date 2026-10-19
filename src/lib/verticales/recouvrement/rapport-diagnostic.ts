import { depuisCentimes, versEuros } from '../../socle/montants';
import { dateLisible } from './calendrier';
import { PARAMETRES, exiger } from './parametres';

/**
 * LE RAPPORT DU DIAGNOSTIC EXPRESS (19/10/2026) — ce qu'il DIT, et rien de sa forme.
 *
 * Comme `piece.ts` pour le décompte : une description pure, testée sans harnais, que
 * l'écran et le PDF (`ui/rapport-diagnostic-pdf.ts`) lisent tels quels. Deux rendus du
 * même rapport ne peuvent donc pas dire deux choses.
 *
 * ⚠️ AUCUNE VALEUR DE LOI N'EST TAPÉE ICI. Les fondements sont les sources du registre,
 * relues par `exiger` (une valeur non vérifiée ferait lever plutôt que d'être citée), et
 * le délai supplétif s'écrit avec sa valeur et sa source.
 *
 * ⚠️ IL MESURE, IL NE CONSEILLE PAS. Ni promesse de paiement, ni démarche à engager :
 * ce que la loi ajoute, d'après les factures importées, et ce que le calcul suppose.
 */

/** Ce que le rapport lit : la requête `diagnostic`, montants en centimes. */
export interface DiagnosticPourRapport {
	readonly du: string | null;
	readonly arreteAu: string;
	readonly impayees: {
		readonly nombreFactures: number;
		readonly principal: bigint;
		readonly interets: bigint;
		readonly indemnites: bigint;
		readonly supplement: bigint;
		readonly lignes: readonly {
			readonly reference: string;
			readonly debiteur: string | null;
			readonly principalRestantDu: bigint;
			readonly supplement: bigint;
		}[];
	};
	readonly payeesEnRetard: {
		readonly nombreFactures: number;
		readonly interets: bigint;
		readonly indemnites: bigint;
		readonly supplement: bigint;
		readonly lignes: readonly {
			readonly reference: string;
			readonly debiteur: string | null;
			readonly payeeLe: string;
			readonly joursDeRetard: number;
			readonly supplement: bigint;
			readonly echeanceSupposee: boolean;
		}[];
	};
	readonly horsPeriode: { readonly nombre: number; readonly principal: bigint };
	readonly nonChiffrees: readonly { readonly reference: string; readonly raison: string }[];
	readonly supplementTotal: bigint;
	readonly echeancesSupposees: number;
}

export interface LigneDuRapport {
	readonly libelle: string;
	readonly valeur: string;
}

export interface SectionDuRapport {
	readonly titre: string;
	readonly lignes: readonly LigneDuRapport[];
	readonly note?: string;
}

export interface TableauDuRapport {
	readonly titre: string;
	readonly colonnes: readonly string[];
	readonly lignes: readonly (readonly string[])[];
}

export interface RapportDiagnostic {
	readonly titre: string;
	readonly etablissement: string;
	readonly compteAu: string;
	readonly periode: string | null;
	/** La somme en jeu : ce que la loi ajoute aux impayées et aux payées en retard. */
	readonly enJeu: string;
	readonly sections: readonly SectionDuRapport[];
	readonly tableaux: readonly TableauDuRapport[];
	readonly nonChiffrees: readonly { readonly reference: string; readonly raison: string }[];
	readonly hypotheses: readonly string[];
	readonly fondements: readonly string[];
	readonly avertissement: string;
}

function euros(centimes: bigint): string {
	return `${versEuros(depuisCentimes(centimes))} €`;
}

function factures(n: number): string {
	return `${n} facture${n > 1 ? 's' : ''}`;
}

export function composerRapportDiagnostic(
	d: DiagnosticPourRapport,
	etablissement: string
): RapportDiagnostic {
	const regleesApres = PARAMETRES.sommesRegleesApresLEcheance;
	exiger(regleesApres);
	const indemnite = PARAMETRES.indemniteForfaitaire;
	exiger(indemnite);
	const pleinDroit = PARAMETRES.indemniteDuePleinDroit;
	exiger(pleinDroit);
	const taux = PARAMETRES.tauxInteretLegalDefaut;
	const suppletif = PARAMETRES.delaiDeReglementSuppletif;
	const jours = exiger(suppletif);

	const hypotheses: string[] = [];
	if (d.echeancesSupposees > 0) {
		hypotheses.push(
			`${factures(d.echeancesSupposees)} sans échéance dans le fichier : le calcul suppose un règlement à ${jours} jours de la date de la facture (${suppletif.source}). Une échéance connue plus tardive réduirait les pénalités.`
		);
	}
	if (d.du !== null && d.horsPeriode.nombre > 0) {
		hypotheses.push(
			`${factures(d.horsPeriode.nombre)} plus ancienne${d.horsPeriode.nombre > 1 ? 's' : ''} que le ${dateLisible(d.du)}${d.horsPeriode.principal > 0n ? `, dont ${euros(d.horsPeriode.principal)} encore dus,` : ''} ${d.horsPeriode.nombre > 1 ? 'ne sont' : 'n’est'} pas chiffrée${d.horsPeriode.nombre > 1 ? 's' : ''} ici.`
		);
	}

	return {
		titre: 'Diagnostic de vos factures',
		etablissement,
		compteAu: dateLisible(d.arreteAu),
		periode: d.du === null ? null : `Factures depuis le ${dateLisible(d.du)}`,
		enJeu: euros(d.supplementTotal),
		sections: [
			{
				titre: 'Factures encore dues',
				lignes: [
					{ libelle: 'Factures', valeur: String(d.impayees.nombreFactures) },
					{ libelle: 'Montant encore dû', valeur: euros(d.impayees.principal) },
					{ libelle: 'Pénalités de retard', valeur: euros(d.impayees.interets) },
					{ libelle: 'Frais de recouvrement', valeur: euros(d.impayees.indemnites) }
				]
			},
			{
				titre: 'Factures payées en retard',
				lignes: [
					{ libelle: 'Factures', valeur: String(d.payeesEnRetard.nombreFactures) },
					{ libelle: 'Pénalités de retard', valeur: euros(d.payeesEnRetard.interets) },
					{ libelle: 'Frais de recouvrement', valeur: euros(d.payeesEnRetard.indemnites) }
				],
				note: 'Le montant de ces factures est rentré. La loi y ajoute les pénalités, du lendemain de l’échéance au jour du paiement, et les frais de recouvrement.'
			}
		],
		tableaux: [
			{
				titre: 'Factures encore dues',
				colonnes: ['Facture', 'Client', 'Encore dû', 'La loi y ajoute'],
				lignes: d.impayees.lignes.map((l) => [
					l.reference,
					l.debiteur ?? '',
					euros(l.principalRestantDu),
					euros(l.supplement)
				])
			},
			{
				titre: 'Factures payées en retard',
				colonnes: ['Facture', 'Client', 'Payée le', 'Retard', 'La loi y ajoutait'],
				lignes: d.payeesEnRetard.lignes.map((l) => [
					l.reference,
					l.debiteur ?? '',
					dateLisible(l.payeeLe),
					`${l.joursDeRetard} j`,
					euros(l.supplement)
				])
			}
		],
		nonChiffrees: d.nonChiffrees.map((n) => ({ ...n })),
		hypotheses,
		fondements: [regleesApres.source, pleinDroit.source, indemnite.source, taux.source].filter(
			(source, i, toutes) => toutes.indexOf(source) === i
		),
		avertissement:
			'Ce rapport mesure ce que la loi ajoute à vos factures, d’après les données importées. Il ne dit pas qu’une somme sera payée, ni qu’une démarche est à engager : c’est à vous de décider.'
	};
}
