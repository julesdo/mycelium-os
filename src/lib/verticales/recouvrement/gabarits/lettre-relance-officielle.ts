import { ajouterJours } from '../calendrier';
import { PARAMETRES, exiger } from '../parametres';
import {
	commune,
	date,
	euros,
	manquesCreancier,
	manquesDebiteur,
	mentionForme,
	type Composition,
	type CreancierCourrier,
	type DebiteurCourrier,
	type DecompteCourrier,
	type FactureCourrier
} from './commun';

/**
 * LA LETTRE DE RELANCE OFFICIELLE — le mot du droit : mise en demeure de payer.
 *
 * Modèle : `docs/superpowers/specs/2026-09-25-modeles/lettre-relance-officielle.md`,
 * recopié au mot près. Trois contrôles bloquants (factures échues, cohérence
 * avec le décompte figé, point de départ lu sur la facture) et deux refus
 * (procédure collective, radiation).
 *
 * ⚠️ ELLE NE RECALCULE RIEN. Le seul chiffre réclamé est celui du décompte
 * arrêté, joint en annexe.
 */

export type SuiteRelance = 'SUITE_GENERALE' | 'SUITE_JURIDICTION';
export type ModaliteReglement = 'VIREMENT_IBAN' | 'SELON_FACTURES';

export interface ChoixRelance {
	/** Le délai laissé au client, choisi par le gérant : une valeur de produit, pas de loi. */
	readonly delaiJours: number;
	readonly suite: SuiteRelance;
	readonly modalite: ModaliteReglement;
	readonly reserveIndemnisationComplementaire: boolean;
}

/** Les jours d'acheminement ajoutés au délai choisi : une valeur de produit, dite à l'écran. */
export const MARGE_ACHEMINEMENT_JOURS = 3;

export interface EntreesRelance {
	readonly creancier: CreancierCourrier;
	readonly debiteur: DebiteurCourrier;
	/** Les factures du décompte, dans leur état au jour de l'arrêté. */
	readonly factures: readonly (FactureCourrier & {
		readonly exigibiliteLueSurLaFacture: boolean;
	})[];
	readonly decompte: DecompteCourrier | null;
	/** La référence du dossier, dans un format qui ne nomme pas le logiciel. */
	readonly referenceInterne: string;
	readonly dateCourrier: string;
	readonly choix: ChoixRelance;
}

const SUITES: Record<SuiteRelance, string> = {
	SUITE_GENERALE: 'nous nous réservons d’engager toute action utile au recouvrement de ces sommes.',
	SUITE_JURIDICTION:
		'nous nous réservons de saisir la juridiction compétente d’une demande en paiement de ces sommes.'
};

export function composerLettreRelance(e: EntreesRelance): Composition {
	const manques: string[] = [];
	if (e.debiteur.sante === 'PROCEDURE_COLLECTIVE') {
		manques.push(
			'votre client est en procédure collective : aucune lettre de relance ne lui est préparée, seule une déclaration de ce qu’il vous doit'
		);
	}
	if (e.debiteur.sante === 'RADIEE') {
		manques.push('votre client est radié : personne n’a qualité pour recevoir cette lettre');
	}
	manques.push(
		...manquesCreancier(e.creancier, { entete: true, siren: true }),
		...manquesDebiteur(e.debiteur)
	);
	if (e.choix.modalite === 'VIREMENT_IBAN' && e.creancier.iban === undefined) {
		manques.push('votre IBAN (Mon compte, vos courriers), ou le choix « selon mes factures »');
	}
	if (!Number.isInteger(e.choix.delaiJours) || e.choix.delaiJours <= 0) {
		manques.push('le délai laissé à votre client');
	}
	const decompte = e.decompte;
	if (decompte === null) {
		manques.push(
			'un calcul arrêté de ce qu’il vous doit : la lettre réclame ce chiffre-là, et aucun autre'
		);
	} else {
		// Contrôle bloquant : chaque facture est échue à l'arrêté et reste due.
		for (const f of e.factures) {
			if (
				f.dateExigibilite === undefined ||
				!(f.dateExigibilite < decompte.arreteAu) ||
				f.resteDu <= 0n
			) {
				manques.push(
					`la facture ${f.reference} n’était pas en retard au ${date(decompte.arreteAu)} : retirez-la du dossier ou arrêtez un nouveau calcul`
				);
			}
			if (!f.exigibiliteLueSurLaFacture) {
				manques.push(
					`la date de paiement de la facture ${f.reference} a été déduite, pas lue sur la facture : la phrase sur le point de départ des pénalités la contredirait`
				);
			}
		}
		// Contrôle bloquant : la somme des restes dus égale le principal figé.
		const somme = e.factures.reduce((t, f) => t + f.resteDu, 0n);
		if (somme !== decompte.principal) {
			manques.push(
				`un règlement a changé ce qui reste dû depuis le calcul du ${date(decompte.arreteAu)} : arrêtez un nouveau calcul`
			);
		}
		const unitaire = exiger(PARAMETRES.indemniteForfaitaire);
		for (const l of decompte.lignes) {
			if (l.indemnite !== 0n && l.indemnite !== unitaire) {
				manques.push(
					`les frais de recouvrement de la facture ${l.reference} ne correspondent plus au montant en vigueur : arrêtez un nouveau calcul`
				);
			}
		}
	}
	const forme = mentionForme(e.creancier.formeJuridique);
	const ville = commune(e.creancier.adresse);
	if (ville === undefined && e.creancier.adresse !== undefined) {
		manques.push('le code postal et la ville de votre siège, en fin d’adresse');
	}
	if (manques.length > 0 || decompte === null || forme === null || ville === undefined) {
		return { ok: false, manques };
	}

	const c = e.creancier;
	const d = e.debiteur;
	const plusieurs = e.factures.length > 1;
	const dateLimite = ajouterJours(e.dateCourrier, e.choix.delaiJours + MARGE_ACHEMINEMENT_JOURS);
	const unitaire = exiger(PARAMETRES.indemniteForfaitaire);
	const nombreIndemnites = decompte.lignes.filter((l) => l.indemnite > 0n).length;
	exiger(PARAMETRES.indemniteDuePleinDroit);
	const sansRappel = exiger(PARAMETRES.penalitesExigiblesSansRappel);

	const lignes: string[] = [];
	lignes.push(
		`${c.denomination} ${forme.mention}${forme.capitalExige && c.capitalSocial !== undefined ? `, au capital de ${euros(c.capitalSocial)} €` : ''}`,
		`Siège : ${c.adresse}`,
		`SIREN ${c.siren}${c.immatriculeRcs === true ? ` – RCS ${c.villeGreffeRcs}` : ''}`,
		`${c.email}${c.telephone === undefined ? '' : ` – ${c.telephone}`}`,
		'',
		d.denomination,
		`${d.formeJuridique} – SIREN ${d.siren}`,
		`${d.adresse}`,
		'',
		'Lettre recommandée avec demande d’avis de réception',
		`${ville}, le ${date(e.dateCourrier)}`,
		'',
		`Objet : mise en demeure de payer – ${plusieurs ? `${e.factures.length} factures` : `facture n° ${e.factures[0]!.reference}`}`,
		`Nos références : ${e.referenceInterne}`,
		'',
		'Madame, Monsieur,',
		'',
		`À ce jour, ${plusieurs ? 'les factures suivantes, que nous vous avons adressées, demeurent impayées' : 'la facture suivante, que nous vous avons adressée, demeure impayée'} :`,
		''
	);
	for (const f of e.factures) {
		lignes.push(
			`– facture n° ${f.reference}${f.dateEmission === undefined ? '' : ` du ${date(f.dateEmission)}`}, échue le ${date(f.dateExigibilite!)} : ${euros(f.montantTTC)} € TTC${f.reglementsRecus > 0n ? `, dont ${euros(f.reglementsRecus)} € déjà réglés` : ''} ; reste dû ${euros(f.resteDu)} €.`
		);
	}
	lignes.push('', `Compte arrêté au ${date(decompte.arreteAu)} :`, '');
	for (const l of decompte.lignes) {
		const fondement = l.tauxConvenu
			? 'taux prévu par nos conditions de règlement'
			: `taux applicable à défaut de stipulation, ${PARAMETRES.tauxInteretLegalDefaut.source}`;
		lignes.push(
			`– facture n° ${l.reference} : principal restant dû ${euros(l.principal)} € ; pénalités de retard ${euros(l.interets)} € (${fondement}) ; indemnité forfaitaire pour frais de recouvrement ${euros(l.indemnite)} € ; total ${euros(l.total)} €.`
		);
	}
	lignes.push(
		'',
		`Principal restant dû : ${euros(decompte.principal)} €`,
		`Pénalités de retard : ${euros(decompte.interets)} €`,
		`Indemnités forfaitaires pour frais de recouvrement : ${nombreIndemnites} × ${euros(unitaire)} €, soit ${euros(decompte.indemnites)} €`,
		`Total dû au ${date(decompte.arreteAu)} : ${euros(decompte.total)} €`,
		'',
		`Les pénalités de retard sont exigibles ${exiger(PARAMETRES.formulationPointDepartPenalites)}${sansRappel ? ', sans qu’un rappel soit nécessaire' : ''} (${PARAMETRES.formulationPointDepartPenalites.source}). Elles sont calculées sur le principal restant dû de chaque facture, au taux indiqué pour chaque facture ci-dessus, en base ${decompte.convention === 'ACT_365' ? '365 jours' : 'exacte (365 ou 366 jours selon l’année)'}. L’indemnité forfaitaire pour frais de recouvrement est due de plein droit par tout professionnel en situation de retard de paiement (${PARAMETRES.indemniteDuePleinDroit.source}) ; son montant est de ${euros(unitaire)} € (${PARAMETRES.indemniteForfaitaire.source}). Le décompte la compte une fois pour chaque facture non réglée à son échéance. Le décompte joint détaille le calcul facture par facture et période par période : principal, taux, nombre de jours, base annuelle et montant.`,
		'',
		`En conséquence, nous vous mettons en demeure de nous régler la somme de ${euros(decompte.total)} € au plus tard le ${date(dateLimite)}, ${e.choix.modalite === 'VIREMENT_IBAN' ? `par virement sur le compte ${c.iban} ouvert au nom de ${c.denomination}` : 'selon les modalités de règlement figurant sur nos factures'}, en rappelant la référence ${e.referenceInterne}. Ce montant est arrêté au ${date(decompte.arreteAu)} : les pénalités de retard courues après cette date n’y sont pas comprises.`,
		'',
		`Si vous contestez tout ou partie de ces sommes, ou si un règlement est intervenu depuis le ${date(decompte.arreteAu)}, nous vous remercions de nous le faire savoir par écrit avant le ${date(dateLimite)}, en précisant les factures concernées et, le cas échéant, la date et la référence du règlement, à l’adresse ${c.email} ou à l’adresse postale ci-dessus.`,
		'',
		`À défaut de règlement à cette date, ${SUITES[e.choix.suite]}`
	);
	if (e.choix.reserveIndemnisationComplementaire) {
		exiger(PARAMETRES.indemnisationComplementaireSurJustification);
		lignes.push(
			'',
			`Nous nous réservons en outre de demander une indemnisation complémentaire, sur justification, si les frais de recouvrement exposés dépassent le montant de l’indemnité forfaitaire (${PARAMETRES.indemnisationComplementaireSurJustification.source}).`
		);
	}
	lignes.push(
		'',
		'Nous vous prions d’agréer, Madame, Monsieur, l’expression de nos salutations distinguées.',
		'',
		`${c.signataireNom}`,
		`${c.signataireQualite}, pour ${c.denomination}`,
		'',
		'',
		'Pièces jointes :',
		`– copie ${plusieurs ? 'des factures' : 'de la facture'} n° ${e.factures.map((f) => f.reference).join(', ')} ;`,
		`– décompte détaillé arrêté au ${date(decompte.arreteAu)}.`
	);

	return {
		ok: true,
		titre: 'Lettre de relance officielle',
		destinataire: d.denomination,
		canal: 'IMPRIMER_RECOMMANDE',
		objet: `Mise en demeure de payer – ${plusieurs ? `${e.factures.length} factures` : `facture n° ${e.factures[0]!.reference}`}`,
		corps: lignes.join('\n'),
		resume: [
			`Cette lettre réclame officiellement ${euros(decompte.total)} €, à votre nom et sous votre signature, avec une date limite : le ${date(dateLimite)} (le délai que vous avez choisi, plus ${MARGE_ACHEMINEMENT_JOURS} jours d’acheminement).`,
			'Elle liste les factures et le compte arrêté au centime ; le calcul détaillé est joint.',
			'Votre client vous répond et vous paie directement, sans intermédiaire.',
			'Elle ne repousse pas la date limite pour aller en justice, et elle ne permet pas à elle seule de faire saisir.',
			'Rien ne part avant votre accord. Aucun avocat ne l’a relue.'
		]
	};
}
