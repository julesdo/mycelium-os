import { PARAMETRES, exiger } from '../parametres';
import { finDeDelai } from '../delais';
import {
	commune,
	date,
	euros,
	manquesCreancier,
	type Composition,
	type CreancierCourrier,
	type DebiteurCourrier,
	type DecompteCourrier,
	type FactureCourrier
} from './commun';

/**
 * LES COURRIERS AUX PROFESSIONNELS — votre avocat, le commissaire de justice.
 *
 * Modèles : `transmission-avocat.md` et `demande-signification.md` (25/09/2026).
 *
 * ⚠️ ILS PARTENT DE LA MESSAGERIE DU GÉRANT, JAMAIS D'UNE ADRESSE DE CE LOGICIEL :
 * les réponses doivent arriver chez lui (secret professionnel). Le logiciel
 * prépare le document ; le gérant le joint et l'envoie lui-même. Le logiciel ne
 * rédige pas leurs actes, ne leur fixe aucun délai et ne note pas leur travail.
 */

export interface Professionnel {
	readonly nom: string;
	readonly cabinet?: string;
	readonly adresse?: string;
}

export interface PrescriptionCourrier {
	readonly reference: string;
	readonly date: string;
	readonly pointDeDepart: string;
	readonly hypothese: boolean;
	readonly dureeAnnees: number;
	readonly source: string;
}

export interface EtapeAccomplie {
	readonly date: string;
	readonly libelle: string;
	readonly preuve?: string;
}

export interface EntreesAvocat {
	readonly creancier: CreancierCourrier;
	readonly debiteur: DebiteurCourrier;
	readonly avocat: Professionnel | null;
	readonly factures: readonly FactureCourrier[];
	readonly decompte: DecompteCourrier | null;
	/** Ce que le contrôle de complétude a chiffré hors du décompte, mot pour mot. */
	readonly horsDecompte: readonly string[];
	readonly etapesAccomplies: readonly EtapeAccomplie[];
	readonly procedureCollective: {
		readonly dateParution: string;
		readonly dateJugement?: string;
		readonly nature: string;
	} | null;
	readonly prescriptions: readonly PrescriptionCourrier[];
	readonly ordonnanceLe: string | null;
	readonly significationLe: string | null;
	readonly oppositionLe: string | null;
	readonly projets: readonly { readonly titre: string; readonly preparation: string }[];
	readonly pieces: readonly string[];
	readonly dateCourrier: string;
	readonly confidentiel: boolean;
}

/** Les démarches possibles, dans l'ordre où elles pourraient intervenir, sans préférence. */
const DECISIONS_EN_ATTENTE = [
	'une mise en demeure de payer adressée au débiteur',
	'un accord d’échéancier proposé au débiteur',
	'une requête en injonction de payer',
	'la signification d’une ordonnance, le cas échéant',
	'toute autre action que vous jugeriez adaptée'
];

export function composerTransmissionAvocat(e: EntreesAvocat): Composition {
	const manques = manquesCreancier(e.creancier);
	if (e.avocat === null)
		manques.push('l’avocat à qui transmettre : choisissez-le dans votre carnet');
	if (e.decompte === null) manques.push('un calcul arrêté de ce qu’il vous doit, à joindre');
	const ville = commune(e.creancier.adresse);
	if (ville === undefined)
		manques.push('le code postal et la ville de votre siège, en fin d’adresse');
	if (manques.length > 0 || e.avocat === null || e.decompte === null || ville === undefined) {
		return { ok: false, manques };
	}
	const c = e.creancier;
	const d = e.debiteur;
	const a = e.avocat;
	const k = e.decompte;
	exiger(PARAMETRES.computationDelaisMois);
	exiger(PARAMETRES.reportDelaiJourNonOuvrable);

	const t: string[] = [];
	if (e.confidentiel) t.push('Confidentiel : correspondance entre un client et son avocat', '');
	t.push(
		c.denomination,
		`${c.formeJuridique ?? ''}${c.siren === undefined ? '' : `, SIREN ${c.siren}`}`,
		`${c.adresse}`,
		'',
		`${a.nom}${a.cabinet === undefined ? '' : `, ${a.cabinet}`}`
	);
	if (a.adresse !== undefined) t.push(a.adresse);
	t.push(
		'',
		`À ${ville}, le ${date(e.dateCourrier)}`,
		'',
		`Objet : créance de ${c.denomination} sur ${d.denomination}, transmission du dossier pour examen`,
		'',
		'Maître,',
		'',
		`Je vous transmets le dossier de la créance de la société ${c.denomination} sur la société ${d.denomination}${d.formeJuridique === undefined ? '' : `, ${d.formeJuridique}`}${d.siren === undefined ? '' : `, SIREN ${d.siren}`}${d.adresse === undefined ? '' : `, dont le siège social inscrit au registre est situé ${d.adresse}`}. Je vous remercie de bien vouloir l’examiner.`,
		'',
		'1. Les sommes en cause',
		''
	);
	for (const f of e.factures) {
		t.push(
			`- facture ${f.reference}${f.dateEmission === undefined ? '' : ` émise le ${date(f.dateEmission)}`}${f.dateExigibilite === undefined ? '' : `, exigible le ${date(f.dateExigibilite)}`} : ${euros(f.montantTTC)} € TTC, reste dû ${euros(f.resteDu)} €`
		);
	}
	const nombreIndemnites = k.lignes.filter((l) => l.indemnite > 0n).length;
	t.push(
		'',
		`Décompte arrêté au ${date(k.arreteAu)} : principal ${euros(k.principal)} €, intérêts de retard ${euros(k.interets)} €, indemnités forfaitaires de recouvrement ${euros(k.indemnites)} € (sur ${nombreIndemnites} facture(s)), soit un total de ${euros(k.total)} €. Le décompte joint détaille le calcul facture par facture et période par période, et cite ses fondements.`,
		''
	);
	for (const ligne of e.horsDecompte) t.push(ligne);
	t.push('2. Les démarches accomplies', '');
	if (e.etapesAccomplies.length === 0) {
		t.push(
			'Aucune démarche n’a été engagée à ce jour auprès du débiteur ni auprès d’une juridiction.'
		);
	} else {
		for (const etape of e.etapesAccomplies) {
			t.push(
				`- le ${date(etape.date)} : ${etape.libelle}${etape.preuve === undefined ? '' : ` (preuve : ${etape.preuve})`}`
			);
		}
	}
	if (e.procedureCollective !== null) {
		t.push(
			`Le Bulletin officiel des annonces civiles et commerciales a publié le ${date(e.procedureCollective.dateParution)} une annonce concernant le débiteur${e.procedureCollective.dateJugement === undefined ? '' : `, relative à un jugement du ${date(e.procedureCollective.dateJugement)}`}, sous l’intitulé « ${e.procedureCollective.nature} ».`
		);
	}
	t.push(
		'Aucun des projets joints n’a été envoyé.',
		'',
		'3. Les échéances relevées dans le dossier',
		'',
		`Les dates ci-dessous ont été calculées automatiquement à partir des textes cités et des informations du dossier, selon ${PARAMETRES.computationDelaisMois.source}, sans le report prévu par ${PARAMETRES.reportDelaiJourNonOuvrable.source}. Aucun juriste ne les a contrôlées.`,
		''
	);
	if (e.prescriptions.length > 0) {
		t.push(
			'- Date limite pour agir en justice, calculée pour chaque facture sans tenir compte d’aucun événement qui aurait pu interrompre ou suspendre ce délai :'
		);
		for (const p of e.prescriptions) {
			t.push(
				`  - facture ${p.reference} : ${date(p.date)}, calculée depuis le ${date(p.pointDeDepart)} ; ${p.hypothese ? `hypothèse : le secteur d’activité n’étant pas connu, le délai le plus court relevé (${p.dureeAnnees} an${p.dureeAnnees > 1 ? 's' : ''}) a été retenu` : `fondement : ${p.source}`}`
			);
		}
	}
	if (e.ordonnanceLe !== null)
		t.push(`- Ordonnance portant injonction de payer rendue le ${date(e.ordonnanceLe)}.`);
	if (e.significationLe !== null) {
		t.push(
			`- Signification effectuée le ${date(e.significationLe)}. Délai d’opposition : ${exiger(PARAMETRES.delaiOppositionInjonction)} mois à compter de la signification (${PARAMETRES.delaiOppositionInjonction.source}).`
		);
	}
	if (e.oppositionLe !== null) t.push(`- Opposition formée le ${date(e.oppositionLe)}.`);
	t.push('', '4. Le contenu du dossier', '');
	for (const p of e.projets)
		t.push(`- Projet non envoyé : ${p.titre} (préparé le ${date(p.preparation)})`);
	t.push(`- Décompte de créance arrêté au ${date(k.arreteAu)}`, '- Bordereau des pièces');
	e.pieces.forEach((p, i) => t.push(`- Pièce n° ${i + 1} : ${p}`));
	t.push(
		'',
		'5. La préparation des projets',
		'',
		'Les projets joints ont été établis avec un logiciel de gestion des créances, à partir de modèles de rédaction fixes. Seuls les faits et les calculs du dossier y ont été insérés automatiquement : identités, références des factures, montants, dates et calcul des intérêts. Ni ces modèles ni leur contenu n’ont été relus par un avocat. Vous êtes libre de les modifier, de les réécrire entièrement ou de ne pas les utiliser.',
		'',
		'6. Ce qui reste à décider',
		'',
		'Aucune des démarches ci-dessous n’est engagée. Elles sont présentées dans l’ordre où elles pourraient intervenir, sans ordre de préférence :'
	);
	for (const decision of DECISIONS_EN_ATTENTE) t.push(`- ${decision}`);
	t.push(
		'- aucune suite pour le moment.',
		'',
		'Je souhaite connaître votre avis avant toute suite. Si vous acceptez de vous charger de ce dossier, l’étendue de votre mission et vos conditions d’intervention, notamment vos honoraires, sont à convenir directement entre nous.',
		'',
		`Vous pouvez me joindre directement : ${c.signataireNom}, ${c.signataireQualite}, ${c.email}${c.telephone === undefined ? '' : `, ${c.telephone}`}. Je vous remercie de me répondre à cette adresse.`,
		'',
		'Je vous prie d’agréer, Maître, l’expression de mes salutations distinguées.',
		'',
		`${c.signataireNom}`,
		`${c.signataireQualite} de ${c.denomination}`
	);

	return {
		ok: true,
		titre: 'Transmettre le dossier à votre avocat',
		destinataire: a.nom,
		canal: 'MESSAGERIE',
		objet: `Créance de ${c.denomination} sur ${d.denomination} : transmission du dossier pour examen`,
		corps: t.join('\n'),
		resume: [
			'Cette lettre envoie tout votre dossier à votre avocat : les projets de courrier, le calcul de ce que votre client vous doit, vos documents et les dates à surveiller.',
			'Elle lui dit que rien n’est encore parti, que les projets ont été remplis par le logiciel, et qu’il peut tout changer ou tout écarter.',
			'Ses honoraires se règlent entre vous et lui.',
			'Vous l’envoyez depuis votre propre messagerie : il vous répondra directement, à votre adresse.'
		]
	};
}

export interface EntreesSignification {
	readonly creancier: CreancierCourrier;
	readonly debiteur: DebiteurCourrier;
	readonly etude: Professionnel | null;
	readonly ordonnance: {
		readonly date: string;
		readonly juridiction: string;
		readonly numero: string;
	} | null;
	readonly nombrePieces: number;
	readonly reglementsDepuis: readonly { readonly date: string; readonly montant: bigint }[];
	readonly dateCourrier: string;
}

/** Le délai de signification qui s'applique à une ordonnance, selon sa date. */
export function delaiSignificationDe(dateOrdonnance: string): {
	readonly mois: number;
	readonly source: string;
	readonly fin: string;
	readonly reporteeDe: string | null;
} {
	const bascule = exiger(PARAMETRES.basculeDelaiSignificationInjonction);
	const parametre =
		dateOrdonnance >= bascule
			? PARAMETRES.delaiSignificationInjonction
			: PARAMETRES.delaiSignificationInjonctionAncien;
	const mois = exiger(parametre);
	const { fin, reporteeDe } = finDeDelai(
		dateOrdonnance,
		{ valeur: mois, unite: 'mois' },
		{ reporterJourNonOuvrable: true }
	);
	return { mois, source: parametre.source, fin, reporteeDe };
}

export function composerDemandeSignification(e: EntreesSignification): Composition {
	const manques = manquesCreancier(e.creancier);
	if (e.etude === null || e.etude.adresse === undefined) {
		manques.push(
			'l’étude du commissaire de justice et son adresse : choisissez-la dans votre carnet'
		);
	}
	if (
		e.ordonnance === null ||
		e.ordonnance.juridiction.trim() === '' ||
		e.ordonnance.numero.trim() === ''
	) {
		manques.push('la date, le tribunal et le numéro de l’ordonnance, lus sur la décision');
	}
	if (e.debiteur.adresse === undefined)
		manques.push('l’adresse du siège de votre client (sa fiche)');
	if (!Number.isInteger(e.nombrePieces) || e.nombrePieces < 1) {
		manques.push('le nombre de documents justificatifs que le greffe vous a rendus');
	}
	const ville = commune(e.creancier.adresse);
	if (ville === undefined)
		manques.push('le code postal et la ville de votre siège, en fin d’adresse');
	if (manques.length > 0 || e.etude === null || e.ordonnance === null || ville === undefined) {
		return { ok: false, manques };
	}
	const c = e.creancier;
	const d = e.debiteur;
	const o = e.ordonnance;
	const delai = delaiSignificationDe(o.date);
	const t = [
		c.denomination,
		`${c.formeJuridique ?? ''}${c.siren === undefined ? '' : `, SIREN ${c.siren}`}`,
		`${c.adresse}`,
		`${c.email}${c.telephone === undefined ? '' : `, ${c.telephone}`}`,
		'',
		e.etude.nom,
		`${e.etude.adresse}`,
		'',
		`À ${ville}, le ${date(e.dateCourrier)}`,
		'',
		'Objet : demande de signification d’une ordonnance portant injonction de payer',
		`Ordonnance rendue le ${date(o.date)} par ${o.juridiction}, n° ${o.numero}`,
		`Débiteur : ${d.denomination}`,
		'',
		'Maître,',
		'',
		`Je vous prie de bien vouloir signifier au débiteur désigné ci-dessous l’ordonnance portant injonction de payer rendue le ${date(o.date)} par ${o.juridiction} sous le n° ${o.numero}.`,
		'',
		'La société qui vous adresse cette demande :',
		`- dénomination : ${c.denomination}`,
		`- forme juridique : ${c.formeJuridique ?? 'non renseignée'}`,
		`- siège social : ${c.adresse}`,
		`- représentée par : ${c.signataireNom}, ${c.signataireQualite}`,
		'',
		'Le débiteur :',
		`- dénomination : ${d.denomination}`,
		...(d.formeJuridique === undefined ? [] : [`- forme juridique : ${d.formeJuridique}`]),
		...(d.siren === undefined ? [] : [`- SIREN : ${d.siren}`]),
		`- siège social inscrit au registre : ${d.adresse}`,
		'',
		'Je vous remets à cette fin :',
		'1. la copie certifiée conforme de la requête et de l’ordonnance revêtue de la formule exécutoire, que le greffe m’a remise ;',
		'2. le bordereau des documents justificatifs produits à l’appui de la requête ;',
		`3. les ${e.nombrePieces} documents justificatifs énumérés à ce bordereau, que le greffe m’a restitués.`,
		'Ces documents sont joints en copie numérique. Je tiens les originaux à votre disposition et vous les remets sur simple demande.',
		'',
		`J’ai relevé que cette ordonnance est non avenue si elle n’est pas signifiée dans les ${delai.mois} mois de sa date (${delai.source}). La signification devrait donc intervenir au plus tard le ${date(delai.fin)} ; cette date a été calculée à partir de la date de l’ordonnance, et je vous remercie de la vérifier.`,
		''
	];
	if (e.reglementsDepuis.length > 0) {
		t.push(`Depuis le ${date(o.date)}, j’ai reçu de ce débiteur les règlements suivants :`);
		for (const r of e.reglementsDepuis) t.push(`- le ${date(r.date)} : ${euros(r.montant)} €`);
	} else {
		t.push(
			`À ma connaissance, à la date de la présente lettre, ce débiteur n’a effectué aucun règlement depuis le ${date(o.date)}.`
		);
	}
	t.push(
		'',
		`Je réglerai directement vos émoluments, frais et débours pour cette signification, y compris la provision que vous me demanderez. Je vous remercie d’établir votre demande de provision et votre facture au nom de ${c.denomination}, à l’adresse figurant en tête de la présente lettre.`,
		'',
		`Je vous remercie également de me faire parvenir l’acte de signification dès qu’il aura été délivré. Vous pouvez me joindre directement pour toute question : ${c.signataireNom}, ${c.email}${c.telephone === undefined ? '' : `, ${c.telephone}`}.`,
		'',
		'Je vous prie d’agréer, Maître, l’expression de mes salutations distinguées.',
		'',
		`${c.signataireNom}`,
		`${c.signataireQualite} de ${c.denomination}`,
		'',
		'Pièces jointes :',
		'1. Copie certifiée conforme de la requête et de l’ordonnance revêtue de la formule exécutoire',
		'2. Bordereau des documents justificatifs',
		`3. Documents justificatifs n° 1 à ${e.nombrePieces}`
	);
	return {
		ok: true,
		titre: 'Demander au commissaire de justice de lui remettre la décision',
		destinataire: e.etude.nom,
		canal: 'MESSAGERIE',
		objet: `Demande de signification : ordonnance du ${date(o.date)}, n° ${o.numero}`,
		corps: t.join('\n'),
		resume: [
			'Cette lettre demande au commissaire de justice (l’ancien huissier) que vous avez choisi de remettre officiellement la décision du juge à votre client.',
			'Elle part à votre nom, signée par vous, avec la décision et les documents que le tribunal vous a rendus.',
			'Vous payez le commissaire de justice vous-même, directement ; il peut vous demander ses frais d’avance.',
			`Si la décision n’est pas remise au plus tard le ${date(delai.fin)}, elle n’a plus d’effet.`
		]
	};
}
