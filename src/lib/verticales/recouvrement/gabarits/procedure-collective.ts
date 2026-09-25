import { ajouterJours } from '../calendrier';
import { PARAMETRES, exiger } from '../parametres';
import {
	commune,
	coordonnees,
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
 * LES DEUX COURRIERS À LA PERSONNE NOMMÉE PAR LE TRIBUNAL.
 *
 * Modèles : `declaration-creance.md` et `lettre-information-mandataire.md`
 * (25/09/2026). La déclaration est le seul document que la loi permet au
 * créancier d'adresser lui-même dans une procédure ; il part à son seul nom,
 * sous sa signature, et un avocat désigné sur le dossier le reçoit d'abord
 * comme projet.
 *
 * ⚠️ LES PÉNALITÉS S'ARRÊTENT AU JUGEMENT, et par prudence la veille : le texte
 * ne dit pas si le jour même en produit. Le décompte joint est arrêté à cette
 * veille ; les factures qui tombent le jour du jugement ou après sont déclarées
 * pour leur principal seul.
 */

export type TypeProcedureCollective = 'SAUVEGARDE' | 'REDRESSEMENT' | 'LIQUIDATION';

/** Le type lu dans l'intitulé de l'annonce, tel que le registre l'écrit. `null` : illisible. */
export function typeDeLaProcedure(nature: string): TypeProcedureCollective | null {
	if (/liquidation/i.test(nature)) return 'LIQUIDATION';
	if (/redressement/i.test(nature)) return 'REDRESSEMENT';
	if (/sauvegarde/i.test(nature)) return 'SAUVEGARDE';
	return null;
}

export interface ProcedureCollectiveCourrier {
	readonly nature: string;
	readonly dateJugement?: string;
	readonly dateParution: string;
	readonly tribunal?: string;
	/** Nom et adresse de la personne nommée, lus par le gérant dans l'annonce. */
	readonly mandataireNom: string;
	readonly mandataireAdresse: string;
	readonly referenceDossier?: string;
}

function manquesProcedure(p: ProcedureCollectiveCourrier | null): string[] {
	if (p === null) {
		return [
			'l’annonce d’ouverture au journal officiel des entreprises : elle n’est pas encore relevée'
		];
	}
	const manques: string[] = [];
	if (typeDeLaProcedure(p.nature) === null) {
		manques.push(`le type de procédure, que l’intitulé « ${p.nature} » ne dit pas`);
	}
	if (p.dateJugement === undefined)
		manques.push('la date du jugement d’ouverture, absente de l’annonce');
	if (p.mandataireNom.trim() === '' || p.mandataireAdresse.trim() === '') {
		manques.push(
			'le nom et l’adresse de la personne nommée par le tribunal, à lire dans l’annonce'
		);
	}
	return manques;
}

function entete(c: CreancierCourrier, p: ProcedureCollectiveCourrier, libelle: string): string[] {
	return [
		c.denomination,
		`${c.formeJuridique ?? ''}${c.siren === undefined ? '' : `, SIREN ${c.siren}`}`,
		`${c.adresse}`,
		coordonnees(c),
		'',
		p.mandataireNom,
		libelle,
		p.mandataireAdresse
	];
}

export interface EntreesDeclaration {
	readonly creancier: CreancierCourrier;
	readonly debiteur: DebiteurCourrier;
	readonly procedure: ProcedureCollectiveCourrier | null;
	readonly factures: readonly FactureCourrier[];
	readonly decompte: DecompteCourrier | null;
	readonly dateCourrier: string;
	/** Le gérant confirme : ni gage, ni hypothèque, ni réserve de propriété. */
	readonly aucuneSurete: boolean;
	/** Le gérant confirme : aucun autre procès en cours sur ces factures. */
	readonly aucunProces: boolean;
	/** Présent quand le signataire n'est pas le représentant légal : le pouvoir est joint. */
	readonly pouvoir: {
		readonly representantNom: string;
		readonly representantQualite: string;
		readonly fonctionDuSignataire: string;
	} | null;
}

export function composerDeclaration(e: EntreesDeclaration): Composition {
	const manques = [
		...manquesCreancier(e.creancier, { siren: true }),
		...manquesProcedure(e.procedure)
	];
	if (e.debiteur.siren === undefined) manques.push('le numéro SIREN de votre client (sa fiche)');
	if (!e.aucuneSurete) {
		manques.push(
			'votre confirmation que rien ne protège cette créance (ni gage, ni hypothèque, ni clause de réserve de propriété) : sinon ce modèle ne s’applique pas'
		);
	}
	if (!e.aucunProces) {
		manques.push(
			'votre confirmation qu’aucun autre procès n’est en cours sur ces factures : sinon ce modèle ne s’applique pas'
		);
	}
	if (
		e.pouvoir !== null &&
		(e.pouvoir.representantNom.trim() === '' || e.pouvoir.fonctionDuSignataire.trim() === '')
	) {
		manques.push('le nom du représentant légal et la fonction du signataire, pour le pouvoir');
	}
	const p = e.procedure;
	const veille = p?.dateJugement === undefined ? null : ajouterJours(p.dateJugement, -1);
	const decompte = e.decompte;
	if (decompte === null) {
		manques.push('un calcul arrêté de ce qu’il vous doit au jour du jugement');
	} else if (veille !== null && decompte.arreteAu !== veille) {
		manques.push(
			`un calcul arrêté à la veille du jugement, le ${date(veille)} : le dernier calcul est arrêté au ${date(decompte.arreteAu)}. Arrêtez un nouveau calcul : il s’arrêtera de lui-même à cette date`
		);
	}
	const ville = commune(e.creancier.adresse);
	if (ville === undefined)
		manques.push('le code postal et la ville de votre siège, en fin d’adresse');
	if (
		manques.length > 0 ||
		p === null ||
		p.dateJugement === undefined ||
		decompte === null ||
		ville === undefined
	) {
		return { ok: false, manques };
	}

	const type = typeDeLaProcedure(p.nature)!;
	const destinataire = exiger(PARAMETRES.destinataireDeclarationCreance)[type];
	const c = e.creancier;
	const d = e.debiteur;
	const parReference = new Map(e.factures.map((f) => [f.reference, f]));
	const echues = decompte.lignes.filter((l) => {
		const f = parReference.get(l.reference);
		return f?.dateExigibilite !== undefined && f.dateExigibilite < p.dateJugement!;
	});
	const nonEchues = decompte.lignes.filter((l) => !echues.includes(l));
	const somme = (ls: typeof echues, champ: 'principal' | 'interets' | 'indemnite' | 'total') =>
		ls.reduce((t, l) => t + l[champ], 0n);
	const nombreIndemnites = echues.filter((l) => l.indemnite > 0n).length;
	const unitaire = exiger(PARAMETRES.indemniteForfaitaire);
	exiger(PARAMETRES.arretCoursInterets);
	exiger(PARAMETRES.exclusionIndemnitesProcedureCollective);
	const tousDefaut = decompte.lignes.every((l) => !l.tauxConvenu);
	const numeroPouvoir = e.factures.length + 2;

	const t: string[] = [
		...entete(c, p, destinataire.libelle),
		'',
		'Lettre recommandée avec demande d’avis de réception',
		'',
		`${ville}, le ${date(e.dateCourrier)}`,
		''
	];
	if (p.referenceDossier !== undefined && p.referenceDossier.trim() !== '') {
		t.push(`Vos références : ${p.referenceDossier}`);
	}
	t.push(
		`Objet : déclaration de créance au passif de ${d.denomination}, SIREN ${d.siren}`,
		'',
		'Madame, Monsieur,',
		'',
		`Par jugement du ${date(p.dateJugement)}${p.tribunal === undefined ? '' : `, rendu par le ${p.tribunal}`}, une procédure de ${destinataire.procedure} a été ouverte à l’égard de ${d.denomination}${d.formeJuridique === undefined ? '' : `, ${d.formeJuridique}`}, SIREN ${d.siren}${d.adresse === undefined ? '' : `, dont le siège est ${d.adresse}`}. Ce jugement a été publié au Bulletin officiel des annonces civiles et commerciales le ${date(p.dateParution)}. Il désigne ${p.mandataireNom} en qualité de ${destinataire.libelle}.`,
		'',
		`${c.denomination}${c.formeJuridique === undefined ? '' : `, ${c.formeJuridique}`}, SIREN ${c.siren}, dont le siège est ${c.adresse}, déclare par la présente sa créance sur ${d.denomination} et en requiert l’admission au passif pour un montant total de ${euros(decompte.total)} €, qui se décompose comme suit.`,
		'',
		`Sommes échues avant le ${date(p.dateJugement)}, jour du jugement d’ouverture`,
		''
	);
	for (const l of echues) {
		const f = parReference.get(l.reference)!;
		t.push(
			`Facture n° ${l.reference}${f.dateEmission === undefined ? '' : ` du ${date(f.dateEmission)}`}, exigible le ${date(f.dateExigibilite!)}`,
			`- Montant TTC : ${euros(f.montantTTC)} €`,
			`- Règlements reçus : ${euros(f.montantTTC - l.principal)} €`,
			`- Principal restant dû : ${euros(l.principal)} €`,
			`- Intérêts de retard du ${date(ajouterJours(f.dateExigibilite!, 1))} au ${date(decompte.arreteAu)} : ${euros(l.interets)} €`,
			`- Indemnité forfaitaire pour frais de recouvrement : ${euros(l.indemnite)} €`,
			`- Total pour cette facture : ${euros(l.total)} €`,
			''
		);
	}
	t.push(
		`Total des sommes échues : ${euros(somme(echues, 'total'))} €, dont principal ${euros(somme(echues, 'principal'))} €, intérêts de retard ${euros(somme(echues, 'interets'))} € et indemnités forfaitaires ${euros(somme(echues, 'indemnite'))} € (${nombreIndemnites} × ${euros(unitaire)} €).`,
		''
	);
	if (nonEchues.length > 0) {
		t.push('Sommes dont l’échéance tombe le jour du jugement d’ouverture ou après', '');
		for (const l of nonEchues) {
			const f = parReference.get(l.reference);
			t.push(
				`- Facture n° ${l.reference}${f?.dateEmission === undefined ? '' : ` du ${date(f.dateEmission)}`}${f?.dateExigibilite === undefined ? '' : `, échéance le ${date(f.dateExigibilite)}`} : ${euros(l.principal)} €`
			);
		}
		t.push(
			'',
			`Total de ces sommes : ${euros(somme(nonEchues, 'principal'))} €. Elles sont déclarées pour leur principal seul, sans intérêts de retard ni indemnité forfaitaire.`,
			''
		);
	}
	t.push(
		'Calcul des intérêts de retard',
		'',
		`Les intérêts de retard sont arrêtés au jugement d’ouverture du ${date(p.dateJugement)} (${PARAMETRES.arretCoursInterets.source}) ; le texte ne disant pas si le jour du jugement en produit, ils sont comptés jusqu’à la veille, le ${date(decompte.arreteAu)}. Pour chaque facture échue, ils sont calculés sur le principal restant dû, au taux applicable à chaque période (${tousDefaut ? `taux applicable à défaut de stipulation, ${PARAMETRES.tauxInteretLegalDefaut.source}` : 'taux prévu par nos conditions de règlement, ou à défaut le taux applicable sans stipulation'}). Le décompte joint en pièce n° 1 détaille, période par période, le principal, le taux, le nombre de jours, la base annuelle et le montant des intérêts.`,
		'',
		`L’indemnité forfaitaire pour frais de recouvrement, de ${euros(unitaire)} € par facture (${PARAMETRES.indemniteForfaitaire.source}), est déclarée pour chaque facture échue avant le jour du jugement d’ouverture.`,
		'',
		'Nature de la créance',
		'',
		'La créance est déclarée à titre chirographaire, c’est-à-dire sans privilège. Elle n’est assortie d’aucune sûreté.',
		'',
		'Justificatifs',
		'',
		`Les documents justificatifs sont joints en copie, sous le bordereau ci-dessous. Toute demande relative à cette déclaration peut être adressée à ${c.signataireNom}, à l’adresse figurant en tête de ce courrier ou par courriel à ${c.email}.`,
		'',
		`${c.denomination} ${exiger(PARAMETRES.mentionCertificationSincerite)} la présente déclaration de créance.`,
		'',
		'Nous vous prions d’agréer, Madame, Monsieur, l’expression de nos salutations distinguées.',
		'',
		`${c.signataireNom}`,
		`${c.signataireQualite}${e.pouvoir === null ? '' : `, agissant en vertu du pouvoir joint en pièce n° ${numeroPouvoir}`}`,
		'',
		'',
		'Bordereau des pièces jointes (copies)',
		'',
		`Pièce n° 1 : décompte de créance arrêté au ${date(decompte.arreteAu)}`
	);
	e.factures.forEach((f, i) => t.push(`Pièce n° ${i + 2} : facture n° ${f.reference}`));
	if (e.pouvoir !== null) {
		t.push(
			`Pièce n° ${numeroPouvoir} : pouvoir spécial du ${date(e.dateCourrier)}`,
			'',
			'POUVOIR SPÉCIAL',
			'',
			`Je soussigné(e) ${e.pouvoir.representantNom}, agissant en qualité de ${e.pouvoir.representantQualite} de ${c.denomination}${c.formeJuridique === undefined ? '' : `, ${c.formeJuridique}`}, SIREN ${c.siren}, dont le siège est ${c.adresse},`,
			'',
			`donne pouvoir spécial à ${c.signataireNom}, ${e.pouvoir.fonctionDuSignataire} de ${c.denomination}, à l’effet de :`,
			`- déclarer, au nom de ${c.denomination}, la créance de celle-ci sur ${d.denomination}, SIREN ${d.siren}, dans la procédure de ${destinataire.procedure} ouverte par jugement du ${date(p.dateJugement)}, auprès de ${p.mandataireNom}, ${destinataire.libelle} ;`,
			`- signer cette déclaration et la certifier sincère au nom de ${c.denomination} ;`,
			`- produire les documents justificatifs de cette créance que le ${destinataire.libelle} viendrait à demander.`,
			'',
			`Fait à ${ville}, le ${date(e.dateCourrier)}.`,
			'',
			`${e.pouvoir.representantNom}, ${e.pouvoir.representantQualite}`
		);
	}

	return {
		ok: true,
		titre: 'Déclarer ce qu’il vous doit',
		destinataire: `${p.mandataireNom}, ${destinataire.libelle}`,
		canal: 'IMPRIMER_RECOMMANDE',
		objet: `Déclaration de créance au passif de ${d.denomination}`,
		corps: t.join('\n'),
		resume: [
			`Ce courrier déclare ce que votre client vous doit, ${euros(decompte.total)} €, à ${p.mandataireNom}, la personne nommée par le tribunal pour recevoir les créances.`,
			'Il reprend vos factures, les pénalités arrêtées à la veille du jugement et les frais de recouvrement des factures déjà en retard avant ce jour. Les factures payables ce jour-là ou après comptent pour leur montant seul.',
			'Vous avez confirmé que rien ne protège cette créance et qu’aucun autre procès n’est en cours sur ces factures.',
			'Il part en recommandé avec avis de réception, à votre nom et sous votre signature : c’est la date d’envoi qui compte. Gardez la preuve de dépôt.',
			'Aucun avocat n’a relu ce modèle.'
		]
	};
}

export interface EntreesInformation {
	readonly creancier: CreancierCourrier;
	readonly debiteur: DebiteurCourrier;
	readonly procedure: ProcedureCollectiveCourrier | null;
	readonly dateCourrier: string;
}

export function composerInformationMandataire(e: EntreesInformation): Composition {
	const manques = [
		...manquesCreancier(e.creancier, { siren: true }),
		...manquesProcedure(e.procedure)
	];
	if (e.debiteur.siren === undefined) manques.push('le numéro SIREN de votre client (sa fiche)');
	const ville = commune(e.creancier.adresse);
	if (ville === undefined)
		manques.push('le code postal et la ville de votre siège, en fin d’adresse');
	const p = e.procedure;
	if (manques.length > 0 || p === null || p.dateJugement === undefined || ville === undefined) {
		return { ok: false, manques };
	}
	const type = typeDeLaProcedure(p.nature)!;
	const destinataire = exiger(PARAMETRES.destinataireDeclarationCreance)[type];
	exiger(PARAMETRES.listeCreanciersDuDebiteur);
	exiger(PARAMETRES.listeCreancesDeclarees);
	const c = e.creancier;
	const d = e.debiteur;
	const t = [
		...entete(c, p, destinataire.libelle),
		'',
		`${ville}, le ${date(e.dateCourrier)}`,
		'',
		`Objet : procédure de ${destinataire.procedure} de ${d.denomination}, SIREN ${d.siren}, demande d’information`,
		'',
		'Madame, Monsieur,',
		'',
		`Par jugement du ${date(p.dateJugement)}${p.tribunal === undefined ? '' : `, rendu par le ${p.tribunal}`}, une procédure de ${destinataire.procedure} a été ouverte à l’égard de ${d.denomination}${d.formeJuridique === undefined ? '' : `, ${d.formeJuridique}`}${d.adresse === undefined ? '' : `, dont le siège est ${d.adresse}`}. Ce jugement a été publié au Bulletin officiel des annonces civiles et commerciales le ${date(p.dateParution)}. Il désigne ${p.mandataireNom} en qualité de ${destinataire.libelle}.`,
		'',
		`${c.denomination} a entretenu des relations commerciales avec ${d.denomination}. Nous vous serions reconnaissants de bien vouloir nous indiquer :`,
		`- si ${c.denomination} figure sur la liste des créanciers que le débiteur vous a remise (${PARAMETRES.listeCreanciersDuDebiteur.source}) et, dans ce cas, pour quel montant ;`,
		'- la référence sous laquelle vous suivez cette procédure ;',
		`- lorsqu’elle aura été établie, la date de dépôt au greffe de la liste des créances déclarées (${PARAMETRES.listeCreancesDeclarees.source}).`,
		'',
		'Ce courrier est une demande d’information. Il ne constitue pas une déclaration de créance et ne contient aucune demande d’admission au passif.',
		'',
		`Votre réponse peut nous être adressée à l’adresse figurant en tête de ce courrier ou par courriel à ${c.email}.`,
		'',
		'Nous vous prions d’agréer, Madame, Monsieur, l’expression de nos salutations distinguées.',
		'',
		`${c.signataireNom}`,
		`${c.signataireQualite}`
	];
	return {
		ok: true,
		titre: 'Demander des nouvelles à la personne nommée par le tribunal',
		destinataire: `${p.mandataireNom}, ${destinataire.libelle}`,
		canal: 'MESSAGERIE',
		objet: `Procédure de ${destinataire.procedure} de ${d.denomination} : demande d’information`,
		corps: t.join('\n'),
		resume: [
			`Ce courrier demande à ${p.mandataireNom} si votre entreprise figure sur la liste des créanciers remise par votre client, et sous quelle référence le dossier est suivi.`,
			'Il ne déclare pas ce que votre client vous doit et ne donne aucun montant : la date limite pour déclarer continue de courir pendant que vous attendez la réponse.',
			'Rien, dans les textes lus, n’oblige la personne nommée à vous répondre, ni dans un délai donné.'
		]
	};
}
