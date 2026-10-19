import { ajouterJours } from '../calendrier';
import { PARAMETRES, exiger } from '../parametres';
import {
	categorieAcheteurPublic,
	estCollectiviteTerritoriale
} from '../pays/france/commande-publique';
import {
	commune,
	date,
	euros,
	manquesCreancier,
	mentionForme,
	type Composition,
	type CreancierCourrier
} from './commun';

/**
 * LES COURRIERS DU CLIENT PUBLIC (19/10/2026, lot 1 bis).
 *
 * Modèles : `docs/superpowers/specs/2026-10-19-modeles/`, recopiés au mot près. Deux
 * documents : la demande de paiement des intérêts moratoires et de l'indemnité
 * forfaitaire, au ton d'un rappel réglementaire ; et le signalement pour mandatement
 * d'office, que seul le gérant décide, au préfet pour une collectivité territoriale ou
 * à l'agence régionale de santé pour un hôpital. La chambre régionale des comptes, qui
 * est une juridiction, n'est jamais proposée.
 *
 * ⚠️ AU SEUL NOM DU CRÉANCIER, ET SANS MENACE. Ni le nom de ce logiciel, ni « à défaut »,
 * ni une juridiction : le gérant demande ce que la loi lui accorde de plein droit.
 *
 * ⚠️ AUCUN RENVOI ABROGÉ. L1612-18 du CGCT et L6145-5 du CSP renvoient à des textes qui
 * n'existent plus ; le courrier cite L2192-13, R2192-31, D2192-35 et R2192-36, lus au
 * registre, jamais leurs renvois.
 */

/** L'acheteur public, tel qu'il s'adresse. */
export interface AcheteurCourrier {
	readonly denomination: string;
	readonly siren?: string;
	readonly adresse?: string;
	readonly categorieJuridique?: string;
}

/** Une facture réglée après le délai, et ce que la loi y ajoutait. Les chiffres viennent du décompte. */
export interface FacturePayeeEnRetardCourrier {
	readonly reference: string;
	readonly dateEmission?: string;
	/** En centimes. */
	readonly montantTTC: bigint;
	readonly echeance: string;
	readonly payeeLe: string;
	readonly jours: number;
	/** « 10,15 % » : le taux de sa période de décompte. */
	readonly taux: string;
	readonly interets: bigint;
	readonly indemnite: bigint;
}

interface Totaux {
	readonly interets: bigint;
	readonly indemnites: bigint;
	readonly total: bigint;
	readonly nombreIndemnites: number;
}

function totaux(factures: readonly FacturePayeeEnRetardCourrier[]): Totaux {
	const interets = factures.reduce((t, f) => t + f.interets, 0n);
	const indemnites = factures.reduce((t, f) => t + f.indemnite, 0n);
	return {
		interets,
		indemnites,
		total: interets + indemnites,
		nombreIndemnites: factures.filter((f) => f.indemnite > 0n).length
	};
}

function enTete(c: CreancierCourrier, mention: string): string[] {
	return [
		`${c.denomination} ${mention}`,
		`Siège : ${c.adresse}`,
		`SIREN ${c.siren}`,
		`${c.email}${c.telephone === undefined ? '' : ` – ${c.telephone}`}`
	];
}

function references(factures: readonly FacturePayeeEnRetardCourrier[]): string {
	return factures.map((f) => f.reference).join(', ');
}

export interface EntreesReclamation {
	readonly creancier: CreancierCourrier;
	readonly acheteur: AcheteurCourrier;
	readonly factures: readonly FacturePayeeEnRetardCourrier[];
	readonly dateCourrier: string;
}

export function composerReclamationInteretsMoratoires(e: EntreesReclamation): Composition {
	const manques: string[] = [...manquesCreancier(e.creancier, { siren: true })];
	if (e.creancier.iban === undefined) manques.push('votre IBAN (Mon compte, vos courriers)');
	if (e.acheteur.adresse === undefined) manques.push(`l’adresse de ${e.acheteur.denomination}`);
	if (e.factures.length === 0) manques.push('une facture réglée en retard');
	const forme = mentionForme(e.creancier.formeJuridique);
	if (forme === null) {
		manques.push(
			'une forme juridique relue pour l’en-tête (SARL, SAS, SA, SNC, SCS, SCA, SE ou EI)'
		);
	}
	const ville = commune(e.creancier.adresse);
	if (ville === undefined && e.creancier.adresse !== undefined) {
		manques.push('le code postal et la ville de votre siège, en fin d’adresse');
	}
	if (manques.length > 0 || forme === null || ville === undefined) return { ok: false, manques };

	const pleinDroit = PARAMETRES.interetsMoratoiresDePleinDroit;
	exiger(pleinDroit);
	const indemnite = PARAMETRES.indemniteForfaitairePublique;
	const unitaire = exiger(indemnite);
	const taux = PARAMETRES.tauxInteretsMoratoiresPublics;
	const accessoires = PARAMETRES.paiementAccessoiresPublics;
	exiger(accessoires);

	const c = e.creancier;
	const a = e.acheteur;
	const t = totaux(e.factures);
	const plusieurs = e.factures.length > 1;
	const lignes: string[] = [
		...enTete(c, forme.mention),
		'',
		a.denomination,
		...(a.siren === undefined ? [] : [`SIREN ${a.siren}`]),
		'À l’attention de l’ordonnateur',
		`${a.adresse}`,
		'',
		`${ville}, le ${date(e.dateCourrier)}`,
		'',
		`Objet : demande de paiement des intérêts moratoires et de l’indemnité forfaitaire pour frais de recouvrement – ${plusieurs ? `${e.factures.length} factures` : `facture n° ${e.factures[0]!.reference}`}`,
		'',
		'Madame, Monsieur,',
		'',
		`${plusieurs ? 'Les factures suivantes ont été réglées' : 'La facture suivante a été réglée'} après l’expiration du délai de paiement :`,
		''
	];
	for (const f of e.factures) {
		lignes.push(
			`– facture n° ${f.reference}${f.dateEmission === undefined ? '' : ` du ${date(f.dateEmission)}`}, de ${euros(f.montantTTC)} € TTC : échue le ${date(f.echeance)}, réglée le ${date(f.payeeLe)}, soit ${f.jours} jours de retard ; intérêts moratoires ${euros(f.interets)} € au taux de ${f.taux} ; indemnité forfaitaire pour frais de recouvrement ${euros(f.indemnite)} €.`
		);
	}
	lignes.push(
		'',
		`Intérêts moratoires : ${euros(t.interets)} €`,
		`Indemnités forfaitaires pour frais de recouvrement : ${t.nombreIndemnites} × ${euros(unitaire)} €, soit ${euros(t.indemnites)} €`,
		`Total demandé : ${euros(t.total)} €`,
		'',
		`Le retard de paiement fait courir, de plein droit et sans autre formalité, des intérêts moratoires dès le lendemain de l’expiration du délai de paiement ou de l’échéance prévue par le marché, et donne lieu au versement d’une indemnité forfaitaire pour frais de recouvrement (${pleinDroit.source}). Le taux des intérêts moratoires est celui que fixe l’${taux.source.charAt(0).toLowerCase()}${taux.source.slice(1)}, pour chaque facture ci-dessus ; le montant de l’indemnité forfaitaire est de ${euros(unitaire)} € (${indemnite.source}). Les intérêts moratoires et l’indemnité forfaitaire sont payés dans un délai de quarante-cinq jours suivant la mise en paiement du principal (${accessoires.source}).`,
		'',
		`Nous vous remercions de bien vouloir procéder au mandatement de la somme de ${euros(t.total)} €, par virement sur le compte ${c.iban} ouvert au nom de ${c.denomination}, en rappelant les numéros des factures concernées.`,
		'',
		`Si l’un de vos paiements comprenait déjà tout ou partie de ces sommes, ou si vous relevez une erreur, nous vous remercions de nous le faire savoir par écrit, à l’adresse ${c.email}, en précisant la facture concernée.`,
		'',
		'Le décompte joint détaille le calcul facture par facture : principal, date d’échéance, date de paiement, nombre de jours, taux et base annuelle.',
		'',
		'Nous vous prions d’agréer, Madame, Monsieur, l’expression de nos salutations distinguées.',
		'',
		`${c.signataireNom}`,
		`${c.signataireQualite}, pour ${c.denomination}`,
		'',
		'Pièces jointes :',
		`– copie ${plusieurs ? 'des factures' : 'de la facture'} n° ${references(e.factures)} ;`,
		'– justificatifs des dates de paiement (avis de paiement ou relevés de compte) ;',
		'– décompte détaillé des intérêts moratoires.'
	);

	return {
		ok: true,
		titre: 'Demande de paiement des intérêts moratoires',
		destinataire: a.denomination,
		canal: 'IMPRIMER_SIMPLE',
		objet: `Intérêts moratoires et indemnité forfaitaire – ${plusieurs ? `${e.factures.length} factures` : `facture n° ${e.factures[0]!.reference}`}`,
		corps: lignes.join('\n'),
		resume: [
			`Cette lettre demande à ${a.denomination} de payer les intérêts de retard et les frais de recouvrement que la loi ajoute aux factures réglées après le délai : ${euros(t.total)} €.`,
			'Elle liste chaque facture, son échéance, la date du paiement, les jours de retard et le taux ; le calcul détaillé est joint.',
			`Envoyée avant le 31 décembre, une demande écrite interrompt le délai de quatre ans pour les droits de l’année qui se prescrit (${PARAMETRES.reclamationEcriteInterruptive.source}) : c’est une lecture.`,
			'Votre client vous paie directement. Rien ne part avant votre accord. Aucun avocat ne l’a relue.'
		]
	};
}

export interface EntreesSignalement extends EntreesReclamation {
	/** L'adresse de la préfecture ou de l'agence régionale de santé, si le gérant l'a. */
	readonly adresseAutorite?: string;
	/** Le jour où la demande de paiement est partie, pour la citer. */
	readonly demandeAnterieureLe?: string;
}

interface Autorite {
	readonly libelle: string;
	readonly appel: string;
	readonly fondement: string;
}

/**
 * Les deux autorités, et l'article qui fonde la demande, lu au registre
 * (`PARAMETRES.mandatementDOffice.source` porte les deux, séparés par « ; »).
 */
function autorites(): Readonly<Record<'COLLECTIVITE' | 'SANTE', Autorite>> {
	const [cgct, csp] = PARAMETRES.mandatementDOffice.source.split(';').map((x) => x.trim());
	const article = (source: string | undefined) =>
		source === undefined ? '' : `l’${source.charAt(0).toLowerCase()}${source.slice(1)}`;
	return {
		COLLECTIVITE: {
			libelle: 'Préfecture du département',
			appel: 'Madame la Préfète, Monsieur le Préfet',
			fondement: article(cgct)
		},
		SANTE: {
			libelle: 'Agence régionale de santé, à l’attention du directeur général',
			appel: 'Madame la Directrice générale, Monsieur le Directeur général',
			fondement: article(csp)
		}
	};
}

export function composerSignalementMandatement(e: EntreesSignalement): Composition {
	const manques: string[] = [...manquesCreancier(e.creancier, { siren: true })];
	const categorie = categorieAcheteurPublic(e.acheteur.categorieJuridique);
	const type =
		categorie === 'SANTE'
			? 'SANTE'
			: estCollectiviteTerritoriale(e.acheteur.categorieJuridique)
				? 'COLLECTIVITE'
				: null;
	if (type === null) {
		manques.push(
			`la démarche n’a été relue que pour une collectivité territoriale ou un établissement public de santé : ${e.acheteur.denomination} n’en est pas un, d’après sa catégorie au registre`
		);
	}
	if (e.factures.length === 0) manques.push('une facture réglée en retard');
	const delais = exiger(PARAMETRES.mandatementDOffice);
	for (const f of e.factures) {
		if (ajouterJours(f.payeeLe, delais.apresPaiementDuPrincipalJours) >= e.dateCourrier) {
			manques.push(
				`pour la facture ${f.reference}, ${delais.apresPaiementDuPrincipalJours} jours ne se sont pas encore écoulés depuis le paiement du principal`
			);
		}
	}
	const forme = mentionForme(e.creancier.formeJuridique);
	if (forme === null) {
		manques.push(
			'une forme juridique relue pour l’en-tête (SARL, SAS, SA, SNC, SCS, SCA, SE ou EI)'
		);
	}
	const ville = commune(e.creancier.adresse);
	if (ville === undefined && e.creancier.adresse !== undefined) {
		manques.push('le code postal et la ville de votre siège, en fin d’adresse');
	}
	if (manques.length > 0 || type === null || forme === null || ville === undefined) {
		return { ok: false, manques };
	}

	const pleinDroit = PARAMETRES.interetsMoratoiresDePleinDroit;
	exiger(pleinDroit);
	const autorite = autorites()[type];
	const c = e.creancier;
	const a = e.acheteur;
	const t = totaux(e.factures);
	const plusieurs = e.factures.length > 1;
	const lignes: string[] = [
		...enTete(c, forme.mention),
		'',
		autorite.libelle,
		...(e.adresseAutorite === undefined ? [] : [e.adresseAutorite]),
		'',
		`${ville}, le ${date(e.dateCourrier)}`,
		'',
		`Objet : signalement – intérêts moratoires non mandatés par ${a.denomination}`,
		'',
		`${autorite.appel},`,
		'',
		`${a.denomination}${a.siren === undefined ? '' : ` (SIREN ${a.siren})`} a réglé le principal ${plusieurs ? 'des factures suivantes' : 'de la facture suivante'} après l’expiration du délai de paiement, sans mandater les intérêts moratoires et l’indemnité forfaitaire pour frais de recouvrement dus de plein droit (${pleinDroit.source}) :`,
		''
	];
	for (const f of e.factures) {
		lignes.push(
			`– facture n° ${f.reference} : principal réglé le ${date(f.payeeLe)} ; intérêts moratoires ${euros(f.interets)} € ; indemnité forfaitaire ${euros(f.indemnite)} €.`
		);
	}
	lignes.push(
		'',
		`Total non mandaté : ${euros(t.total)} €.`,
		'',
		`Plus de ${delais.apresPaiementDuPrincipalJours} jours se sont écoulés depuis le paiement du principal. ${e.demandeAnterieureLe === undefined ? '' : `Notre demande du ${date(e.demandeAnterieureLe)} est restée sans suite. `}Nous vous signalons cette situation et vous demandons de bien vouloir adresser à l’ordonnateur la mise en demeure de mandatement prévue par ${autorite.fondement}.`,
		'',
		'Nous tenons à votre disposition les factures, les justificatifs de paiement et le décompte détaillé, joints au présent courrier.',
		'',
		`Nous vous prions d’agréer, ${autorite.appel}, l’expression de notre haute considération.`,
		'',
		`${c.signataireNom}`,
		`${c.signataireQualite}, pour ${c.denomination}`,
		'',
		'Pièces jointes :',
		`– copie ${plusieurs ? 'des factures' : 'de la facture'} n° ${references(e.factures)} ;`,
		'– justificatifs des dates de paiement ;',
		'– décompte détaillé des intérêts moratoires ;',
		...(e.demandeAnterieureLe === undefined
			? []
			: [`– copie de notre demande du ${date(e.demandeAnterieureLe)} ;`])
	);

	return {
		ok: true,
		titre: 'Signalement pour mandatement d’office',
		destinataire: autorite.libelle,
		canal: 'IMPRIMER_SIMPLE',
		objet: `Intérêts moratoires non mandatés par ${a.denomination}`,
		corps: lignes.join('\n'),
		resume: [
			`Ce courrier signale à l’autorité de tutelle que ${a.denomination} n’a pas payé les intérêts de retard dans les ${delais.apresPaiementDuPrincipalJours} jours qui ont suivi le paiement des factures, et lui demande de lui adresser la mise en demeure de les mandater que prévoit la loi.`,
			'C’est une démarche administrative, pas une action en justice. Rien ne part avant votre accord. Aucun avocat ne l’a relu.'
		]
	};
}
