import { ajouterMois } from '../calendrier';
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
	type DecompteCourrier
} from './commun';

/**
 * LA RECONNAISSANCE DE DETTE ET L'ACCORD D'ÉCHÉANCIER.
 *
 * Modèle : `accord-echeancier.md` (25/09/2026), recopié au mot près. Deux
 * originaux papier : la signature électronique viendra au lot 5d.
 *
 * ⚠️ LES PÉNALITÉS MAINTENUES NE SONT PAS PROPOSÉES. Le modèle impose un ordre
 * d'imputation (pénalités, puis frais de recouvrement, puis principal) que le
 * calcul ne suit pas encore pour les frais : le décompte final contredirait
 * l'accord signé. Seule la renonciation aux pénalités futures, sur choix exprès
 * du gérant, se compose.
 */

export type PenalitesPendantEcheancier = 'MAINTENUES' | 'RENONCIATION';

export interface ChoixEcheancier {
	readonly nombre: number;
	readonly premiereEcheance: string;
	/** L'intervalle entre deux versements, en mois. */
	readonly intervalleMois: number;
	readonly penalites: PenalitesPendantEcheancier | null;
	/** Jours laissés pour régulariser après une mise en demeure : une valeur de produit. */
	readonly delaiRegularisationJours: number;
	readonly debiteurSignataireNom: string;
	readonly debiteurSignataireQualite: string;
}

export interface EntreesEcheancier {
	readonly creancier: CreancierCourrier;
	readonly debiteur: DebiteurCourrier;
	readonly decompte: DecompteCourrier | null;
	readonly factures: readonly {
		readonly reference: string;
		readonly dateEmission?: string;
		readonly dateExigibilite?: string;
	}[];
	readonly referenceInterne: string;
	readonly dateCourrier: string;
	readonly choix: ChoixEcheancier;
}

/** Les versements : parts égales au centime, le reliquat sur le dernier. */
export function versements(
	total: bigint,
	nombre: number,
	premiere: string,
	intervalleMois: number
): readonly { readonly numero: number; readonly montant: bigint; readonly date: string }[] {
	const n = BigInt(nombre);
	const part = total / n;
	const reliquat = total - part * n;
	return Array.from({ length: nombre }, (_, i) => ({
		numero: i + 1,
		montant: i === nombre - 1 ? part + reliquat : part,
		date: ajouterMois(premiere, i * intervalleMois)
	}));
}

export function composerAccordEcheancier(e: EntreesEcheancier): Composition {
	const manques = [
		...manquesCreancier(e.creancier, { entete: true, siren: true }),
		...manquesDebiteur(e.debiteur)
	];
	if (e.debiteur.sante !== 'SAINE' && e.debiteur.sante !== 'INCONNUE') {
		manques.push(
			'votre client est en procédure collective ou radié : un accord ne se signe pas dans ce cas'
		);
	}
	if (e.creancier.iban === undefined)
		manques.push('votre IBAN, où arrivent les versements (Mon compte, vos courriers)');
	if (e.decompte === null)
		manques.push('un calcul arrêté de ce qu’il vous doit : l’accord reconnaît ce chiffre-là');
	const c = e.choix;
	if (!Number.isInteger(c.nombre) || c.nombre < 2)
		manques.push('le nombre de versements (au moins deux)');
	if (!Number.isInteger(c.intervalleMois) || c.intervalleMois < 1)
		manques.push('l’intervalle entre deux versements');
	if (c.premiereEcheance < e.dateCourrier)
		manques.push('une date de premier versement qui ne soit pas passée');
	if (c.penalites === null) {
		manques.push('votre choix sur les pénalités pendant l’échéancier');
	} else if (c.penalites === 'MAINTENUES') {
		manques.push(
			'les pénalités maintenues pendant l’échéancier ne sont pas encore proposées : le calcul ne suit pas l’ordre d’imputation que l’accord écrit, et le décompte final le contredirait'
		);
	}
	if (c.debiteurSignataireNom.trim() === '' || c.debiteurSignataireQualite.trim() === '') {
		manques.push('le nom et la fonction de la personne qui signe pour votre client');
	}
	if (!Number.isInteger(c.delaiRegularisationJours) || c.delaiRegularisationJours < 1) {
		manques.push('le délai laissé pour régulariser un versement manqué');
	}
	const forme = mentionForme(e.creancier.formeJuridique);
	const ville = commune(e.creancier.adresse);
	if (ville === undefined)
		manques.push('le code postal et la ville de votre siège, en fin d’adresse');
	const k = e.decompte;
	if (manques.length > 0 || k === null || forme === null || ville === undefined) {
		return { ok: false, manques };
	}
	const cr = e.creancier;
	const d = e.debiteur;
	const plan = versements(k.total, c.nombre, c.premiereEcheance, c.intervalleMois);
	const parReference = new Map(e.factures.map((f) => [f.reference, f]));
	exiger(PARAMETRES.imputationPaiementPartiel);

	const t = [
		'RECONNAISSANCE DE DETTE ET ACCORD D’ÉCHÉANCIER',
		'',
		'Entre les soussignés :',
		'',
		`${cr.denomination} ${forme.mention}${forme.capitalExige && cr.capitalSocial !== undefined ? `, au capital de ${euros(cr.capitalSocial)} €` : ''}, dont le siège est ${cr.adresse}, SIREN ${cr.siren}${cr.immatriculeRcs === true ? ` – RCS ${cr.villeGreffeRcs}` : ''}, agissant par ${cr.signataireNom}, ${cr.signataireQualite},`,
		'ci-après « le Créancier »,',
		'',
		'et',
		'',
		`${d.denomination}, ${d.formeJuridique}, dont le siège est ${d.adresse}, SIREN ${d.siren}, agissant par ${c.debiteurSignataireNom}, ${c.debiteurSignataireQualite}, qui déclare disposer du pouvoir de l’engager,`,
		'ci-après « le Débiteur ».',
		'',
		'1. Reconnaissance de dette',
		'',
		`Le Débiteur reconnaît devoir au Créancier la somme de ${euros(k.total)} €, arrêtée au ${date(k.arreteAu)}, au titre des factures suivantes :`,
		''
	];
	for (const l of k.lignes) {
		const f = parReference.get(l.reference);
		t.push(
			`– facture n° ${l.reference}${f?.dateEmission === undefined ? '' : ` du ${date(f.dateEmission)}`}${f?.dateExigibilite === undefined ? '' : `, échue le ${date(f.dateExigibilite)}`} : principal restant dû ${euros(l.principal)} € ; pénalités de retard ${euros(l.interets)} € ; indemnité forfaitaire pour frais de recouvrement ${euros(l.indemnite)} € ; total ${euros(l.total)} €.`
		);
	}
	t.push(
		'',
		`Soit : principal ${euros(k.principal)} € ; pénalités de retard ${euros(k.interets)} € ; indemnités forfaitaires ${euros(k.indemnites)} € ; total ${euros(k.total)} €.`,
		'',
		'Le détail du calcul, facture par facture et période par période, figure dans le décompte annexé.',
		'',
		'2. Échéancier',
		'',
		`Le Créancier accepte que cette somme lui soit réglée en ${c.nombre} versements, aux dates et pour les montants suivants :`,
		''
	);
	for (const v of plan)
		t.push(`– versement n° ${v.numero} : ${euros(v.montant)} €, au plus tard le ${date(v.date)} ;`);
	t.push(
		'',
		`soit un total de ${euros(k.total)} €.`,
		'',
		`Chaque versement est effectué par virement sur le compte ${cr.iban} ouvert au nom du Créancier, en rappelant la référence ${e.referenceInterne}. Il est réputé effectué à la date à laquelle ce compte est crédité. Le Débiteur peut régler par anticipation tout ou partie des sommes restant dues.`,
		'',
		'3. Imputation des versements',
		'',
		'Chaque versement s’impute sur les factures visées au point 1 dans l’ordre de leur date d’échéance, en commençant par la plus ancienne. Pour chaque facture, il s’impute d’abord sur les pénalités de retard, puis sur l’indemnité forfaitaire pour frais de recouvrement, puis sur le principal.',
		'',
		'4. Pénalités de retard pendant l’échéancier',
		'',
		`Sous réserve que chaque versement soit payé à sa date, le Créancier renonce aux pénalités de retard qui courraient sur le principal restant dû après le ${date(k.arreteAu)}. Si le Débiteur perd le bénéfice du terme dans les conditions du point 5, cette renonciation est sans effet, et ces pénalités sont dues comme si elle n’avait pas été consentie.`,
		'',
		'5. Défaut de paiement',
		'',
		`À défaut de paiement de tout ou partie d’un versement à sa date, le Créancier peut mettre le Débiteur en demeure de régulariser, par lettre recommandée avec demande d’avis de réception ou par lettre recommandée électronique. Si le versement n’est pas intégralement réglé dans les ${c.delaiRegularisationJours} jours suivant la réception de cette mise en demeure ou, à défaut, sa première présentation, le Débiteur perd le bénéfice du terme. La totalité des sommes restant dues au titre du présent accord devient alors immédiatement exigible, et le Créancier peut en poursuivre le recouvrement.`,
		'',
		'Le fait pour le Créancier de ne pas se prévaloir d’un retard ne vaut pas renonciation à s’en prévaloir ultérieurement.',
		'',
		'6. Engagement du Créancier',
		'',
		'Tant que les versements sont payés à leur date, le Créancier n’engage aucune action en paiement des sommes visées au point 1. Cet engagement ne l’empêche pas d’accomplir tout acte nécessaire à la conservation de ses droits.',
		'',
		'7. Portée de l’accord',
		'',
		'Le présent accord n’emporte pas novation : les factures visées au point 1 conservent leur nature et leurs accessoires. Le Créancier ne renonce à aucun droit autre que ceux expressément prévus au point 4.',
		'',
		'8. Signature',
		'',
		`Fait à ${ville}, le ${date(e.dateCourrier)}, en deux exemplaires originaux, dont un pour chaque partie.`,
		'',
		`Pour le Créancier : ${cr.signataireNom}, ${cr.signataireQualite}`,
		'',
		'',
		`Pour le Débiteur : ${c.debiteurSignataireNom}, ${c.debiteurSignataireQualite}`,
		'Mention à écrire par le signataire lui-même, à la main, la somme en toutes lettres puis en chiffres :',
		'« Bon pour reconnaissance de dette de la somme de [somme en toutes lettres] euros ([somme en chiffres] €). »',
		'',
		'',
		`Annexe : décompte de créance arrêté au ${date(k.arreteAu)}.`
	);
	return {
		ok: true,
		titre: 'Accord d’échéancier',
		destinataire: d.denomination,
		canal: 'IMPRIMER_SIMPLE',
		objet: 'Reconnaissance de dette et accord d’échéancier',
		corps: t.join('\n'),
		resume: [
			`Votre client reconnaît vous devoir ${euros(k.total)} € et s’engage à payer en ${c.nombre} fois, aux dates fixées.`,
			`S’il manque un versement, vous pouvez lui écrire en recommandé. Sans paiement dans les ${c.delaiRegularisationJours} jours, tout le reste devient dû.`,
			'Vous renoncez aux pénalités futures tant qu’il paie à l’heure ; s’il cesse, elles reviennent.',
			'Il écrit lui-même la somme en lettres et en chiffres, signe les deux exemplaires, et il vous paie directement.',
			'Cet accord ne permet pas à lui seul de faire saisir. Aucun avocat ne l’a relu.'
		]
	};
}
