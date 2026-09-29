import { v, ConvexError, type Infer } from 'convex/values';
import type { QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { authedMutation, authedQuery } from '../functions';
import { getUserOrg, requireOrgAdmin } from '../lib/auth';
import { enCentimes } from '../../socle/montants';
import { sha256 } from '../../socle/empreinte';
import { ajouterJours, estDateReelle } from '../../verticales/recouvrement/calendrier';
import { libelleEvenement } from '../../verticales/recouvrement/apres-procedure';
import { periodesDeTauxParDefaut } from '../../verticales/recouvrement/pays/france/taux';
import {
	prescriptionDe,
	regimePrescription
} from '../../verticales/recouvrement/pays/france/prescription';
import type {
	Composition,
	CreancierCourrier,
	DebiteurCourrier,
	DecompteCourrier
} from '../../verticales/recouvrement/gabarits/commun';
import {
	MARGE_ACHEMINEMENT_JOURS,
	composerLettreRelance
} from '../../verticales/recouvrement/gabarits/lettre-relance-officielle';
import { composerAccordEcheancier } from '../../verticales/recouvrement/gabarits/accord-echeancier';
import {
	composerDeclaration,
	composerInformationMandataire
} from '../../verticales/recouvrement/gabarits/procedure-collective';
import {
	composerDemandeSignification,
	composerTransmissionAvocat
} from '../../verticales/recouvrement/gabarits/professionnels';
import { resteDu } from './lecture';
import { vModeleCourrier } from './tables';

/**
 * LES COURRIERS DU DOSSIER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE TEXTE SE RECOMPOSE ICI, JAMAIS SUR L'ÉCRAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * L'écran envoie les CHOIX du gérant ; le serveur relit le dossier, compose le
 * document avec le gabarit fixe et le rend tel qu'il partira. À la validation,
 * il le recompose encore et le compare au texte que l'administrateur a lu : si
 * le dossier a bougé entre-temps (un règlement arrivé, une adresse corrigée),
 * rien n'est figé et l'aperçu se met à jour.
 *
 * ⚠️ SEUL UN ADMINISTRATEUR VALIDE. Un membre prépare. La validation fige le
 * texte et son empreinte ; le logiciel n'expédie rien lui-même à ce jour.
 */

const vChoixCourrier = v.union(
	v.object({
		modele: v.literal('RELANCE_OFFICIELLE'),
		delaiJours: v.number(),
		suite: v.union(v.literal('SUITE_GENERALE'), v.literal('SUITE_JURIDICTION')),
		modalite: v.union(v.literal('VIREMENT_IBAN'), v.literal('SELON_FACTURES')),
		reserveIndemnisationComplementaire: v.boolean()
	}),
	v.object({
		modele: v.literal('ACCORD_ECHEANCIER'),
		nombre: v.number(),
		premiereEcheance: v.string(),
		intervalleMois: v.number(),
		penalites: v.union(v.literal('MAINTENUES'), v.literal('RENONCIATION'), v.null()),
		delaiRegularisationJours: v.number(),
		debiteurSignataireNom: v.string(),
		debiteurSignataireQualite: v.string()
	}),
	v.object({
		modele: v.literal('DECLARATION_CREANCE'),
		mandataireNom: v.string(),
		mandataireAdresse: v.string(),
		referenceDossier: v.string(),
		aucuneSurete: v.boolean(),
		aucunProces: v.boolean(),
		pouvoir: v.union(
			v.null(),
			v.object({
				representantNom: v.string(),
				representantQualite: v.string(),
				fonctionDuSignataire: v.string()
			})
		)
	}),
	v.object({
		modele: v.literal('INFORMATION_MANDATAIRE'),
		mandataireNom: v.string(),
		mandataireAdresse: v.string()
	}),
	v.object({
		modele: v.literal('TRANSMISSION_AVOCAT'),
		intervenantId: v.union(v.id('intervenants'), v.null()),
		confidentiel: v.boolean()
	}),
	v.object({
		modele: v.literal('DEMANDE_SIGNIFICATION'),
		intervenantId: v.union(v.id('intervenants'), v.null()),
		juridiction: v.string(),
		numero: v.string(),
		nombrePieces: v.number()
	})
);

type ChoixCourrier = Infer<typeof vChoixCourrier>;

const vComposition = v.union(
	v.object({
		ok: v.literal(true),
		titre: v.string(),
		destinataire: v.string(),
		canal: v.union(
			v.literal('IMPRIMER_RECOMMANDE'),
			v.literal('IMPRIMER_SIMPLE'),
			v.literal('MESSAGERIE')
		),
		objet: v.string(),
		corps: v.string(),
		resume: v.array(v.string())
	}),
	v.object({ ok: v.literal(false), manques: v.array(v.string()) })
);

/** Le titre d'un modèle, en mots de tous les jours. */
export const TITRE_MODELE: Record<Infer<typeof vModeleCourrier>, string> = {
	RELANCE_OFFICIELLE: 'Lettre de relance officielle',
	ACCORD_ECHEANCIER: 'Accord d’échéancier',
	DECLARATION_CREANCE: 'Déclarer ce qu’il vous doit',
	INFORMATION_MANDATAIRE: 'Demander des nouvelles à la personne nommée par le tribunal',
	TRANSMISSION_AVOCAT: 'Transmettre le dossier à votre avocat',
	DEMANDE_SIGNIFICATION: 'Demander au commissaire de justice de remettre la décision'
};

/** Les modèles qui s'adressent au client lui-même : ils font passer le dossier à « On lui écrit ». */
export const MODELES_AU_CLIENT: ReadonlySet<string> = new Set([
	'RELANCE_OFFICIELLE',
	'ACCORD_ECHEANCIER'
]);

/** Un segment a-t-il été calculé au taux applicable à défaut ? Comparé en fractions, jamais en flottants. */
function tauxParDefaut(
	debut: string,
	fin: string,
	taux: { numerateur: bigint; denominateur: bigint }
): boolean {
	const periodes = periodesDeTauxParDefaut(debut, fin);
	const applicable = [...periodes].reverse().find((p) => p.debut <= debut) ?? periodes[0];
	if (applicable === undefined) return false;
	const t = applicable.taux as unknown as { numerateur: bigint; denominateur: bigint };
	return t.numerateur * taux.denominateur === taux.numerateur * t.denominateur;
}

function decompteCourrier(d: Doc<'decomptes'>): DecompteCourrier {
	return {
		arreteAu: d.arreteAu,
		convention: d.convention,
		principal: d.principalRestantDu,
		interets: d.interets,
		indemnites: d.indemniteForfaitaire,
		total: d.total,
		lignes: d.lignes.map((l) => ({
			reference: l.reference,
			principal: l.principalRestantDu,
			interets: l.interets,
			indemnite: l.indemniteForfaitaire,
			total: l.total,
			tauxConvenu: l.segments.some((s) => {
				try {
					return !tauxParDefaut(s.debut, s.fin, s.taux);
				} catch {
					// Un semestre absent de la série légale : on ne sait pas dire, et le
					// doute ne profite jamais au produit — on ne prétend pas « à défaut ».
					return true;
				}
			})
		}))
	};
}

async function composer(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	creanceId: Id<'creances'>,
	choix: ChoixCourrier,
	aujourdHui: string
): Promise<{ composition: Composition; decompteId: Id<'decomptes'> | null }> {
	const creance = await ctx.db.get(creanceId);
	if (creance === null || creance.organizationId !== organizationId) {
		throw new ConvexError('Dossier introuvable');
	}
	const debiteur = await ctx.db.get(creance.debiteurId);
	if (debiteur === null) throw new ConvexError('Client introuvable');
	const profil = await ctx.db
		.query('profilsCreancier')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();

	const creancier: CreancierCourrier = {
		denomination: profil?.denomination ?? '',
		formeJuridique: profil?.formeJuridique,
		siren: profil?.siren,
		adresse: profil?.adresse,
		email: profil?.email,
		telephone: profil?.telephone,
		signataireNom: profil?.signataireNom,
		signataireQualite: profil?.signataireQualite,
		capitalSocial: profil?.capitalSocial,
		immatriculeRcs: profil?.immatriculeRcs,
		villeGreffeRcs: profil?.villeGreffeRcs,
		iban: profil?.iban
	};
	const client: DebiteurCourrier = {
		denomination: debiteur.denomination,
		formeJuridique: debiteur.formeJuridique,
		siren: debiteur.siren,
		adresse: debiteur.adresse,
		sante: debiteur.santeFinanciere
	};

	const facturesBrutes = await ctx.db
		.query('facturesVente')
		.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
		.collect();
	const factures = await Promise.all(
		facturesBrutes.map(async (f) => {
			const reste = enCentimes(await resteDu(ctx, f));
			return {
				reference: f.reference,
				dateEmission: f.dateEmission,
				dateExigibilite: f.dateExigibilite ?? f.dateEcheance,
				montantTTC: f.montantTTC,
				reglementsRecus: f.montantTTC - reste,
				resteDu: reste,
				exigibiliteLueSurLaFacture:
					f.dateExigibilite !== undefined && f.exigibiliteDeduite !== true,
				doc: f
			};
		})
	);

	const decomptes = await ctx.db
		.query('decomptes')
		.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
		.collect();
	const dernier = decomptes.sort((a, b) => b.produitLe - a.produitLe)[0] ?? null;
	const decompte = dernier === null ? null : decompteCourrier(dernier);
	const referenceInterne = `D-${(creanceId as string).slice(-6).toUpperCase()}`;
	// Seules les factures que le décompte chiffre entrent dans un courrier qui le cite.
	const duDecompte =
		decompte === null
			? factures
			: factures.filter((f) => decompte.lignes.some((l) => l.reference === f.reference));

	const journal = await ctx.db
		.query('evenementsProcedure')
		.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
		.collect();
	const dateEvenement = (cle: string) => journal.find((e) => e.cle === cle)?.survenuLe ?? null;
	const annonce = debiteur.annonceOuverture;

	let composition: Composition;
	switch (choix.modele) {
		case 'RELANCE_OFFICIELLE':
			composition = composerLettreRelance({
				creancier,
				debiteur: client,
				factures: duDecompte,
				decompte,
				referenceInterne,
				dateCourrier: aujourdHui,
				choix
			});
			break;
		case 'ACCORD_ECHEANCIER':
			composition = composerAccordEcheancier({
				creancier,
				debiteur: client,
				decompte,
				factures: duDecompte,
				referenceInterne,
				dateCourrier: aujourdHui,
				choix
			});
			break;
		case 'DECLARATION_CREANCE':
			composition = composerDeclaration({
				creancier,
				debiteur: client,
				procedure:
					annonce === undefined
						? null
						: {
								nature: annonce.nature,
								dateJugement: annonce.dateJugement,
								dateParution: annonce.dateParution,
								tribunal: annonce.tribunal,
								mandataireNom: choix.mandataireNom,
								mandataireAdresse: choix.mandataireAdresse,
								referenceDossier: choix.referenceDossier
							},
				factures: duDecompte,
				decompte,
				dateCourrier: aujourdHui,
				aucuneSurete: choix.aucuneSurete,
				aucunProces: choix.aucunProces,
				pouvoir: choix.pouvoir
			});
			break;
		case 'INFORMATION_MANDATAIRE':
			composition = composerInformationMandataire({
				creancier,
				debiteur: client,
				procedure:
					annonce === undefined
						? null
						: {
								nature: annonce.nature,
								dateJugement: annonce.dateJugement,
								dateParution: annonce.dateParution,
								tribunal: annonce.tribunal,
								mandataireNom: choix.mandataireNom,
								mandataireAdresse: choix.mandataireAdresse
							},
				dateCourrier: aujourdHui
			});
			break;
		case 'TRANSMISSION_AVOCAT': {
			const avocat = choix.intervenantId === null ? null : await ctx.db.get(choix.intervenantId);
			const envois = await ctx.db
				.query('envois')
				.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
				.collect();
			composition = composerTransmissionAvocat({
				creancier,
				debiteur: client,
				avocat:
					avocat === null || avocat.organizationId !== organizationId || avocat.role !== 'AVOCAT'
						? null
						: { nom: avocat.nom, adresse: avocat.adresse },
				factures,
				decompte,
				horsDecompte: [],
				etapesAccomplies: [
					...envois
						.filter((e) => e.etat === 'PARTI' && e.partiLe !== undefined)
						.map((e) => ({
							date: e.partiLe!,
							libelle: `${TITRE_MODELE[e.modele]} à ${e.destinataire}`
						})),
					...journal.map((e) => ({
						date: e.survenuLe,
						libelle: libelleEvenement(creance.procedureEngagee ?? '', e.cle) ?? e.cle
					}))
				].sort((a, b) => (a.date < b.date ? -1 : 1)),
				procedureCollective:
					annonce === undefined
						? null
						: {
								dateParution: annonce.dateParution,
								dateJugement: annonce.dateJugement,
								nature: annonce.nature
							},
				prescriptions: factures.flatMap((f) => {
					const secteur = debiteur.secteur ?? 'INDETERMINE';
					const p = prescriptionDe([f.doc.dateExigibilite, f.doc.dateEcheance], secteur);
					const depart = f.doc.dateExigibilite ?? f.doc.dateEcheance;
					if (p.datePrescription === undefined || depart === undefined) return [];
					const regime = regimePrescription(secteur);
					return [
						{
							reference: f.reference,
							date: p.datePrescription,
							pointDeDepart: depart,
							hypothese: regime.hypothese,
							dureeAnnees: regime.dureeAnnees,
							source: regime.source
						}
					];
				}),
				ordonnanceLe: dateEvenement('ordonnance-rendue'),
				significationLe: dateEvenement('ordonnance-signifiee'),
				oppositionLe: dateEvenement('opposition-formee'),
				projets: envois
					.filter((e) => e.etat === 'A_VALIDER' || e.etat === 'VALIDE')
					.map((e) => ({
						titre: TITRE_MODELE[e.modele],
						preparation: new Date(e.prepareLe).toISOString().slice(0, 10)
					})),
				pieces: factures.map((f) => `facture n° ${f.reference}`),
				dateCourrier: aujourdHui,
				confidentiel: choix.confidentiel
			});
			break;
		}
		case 'DEMANDE_SIGNIFICATION': {
			const etude = choix.intervenantId === null ? null : await ctx.db.get(choix.intervenantId);
			const ordonnanceLe = dateEvenement('ordonnance-rendue');
			const reglementsDepuis: { date: string; montant: bigint }[] = [];
			if (ordonnanceLe !== null) {
				for (const f of facturesBrutes) {
					const reglements = await ctx.db
						.query('reglements')
						.withIndex('by_facture', (q) => q.eq('factureId', f._id))
						.collect();
					for (const r of reglements) {
						if (r.date >= ordonnanceLe) reglementsDepuis.push({ date: r.date, montant: r.montant });
					}
				}
			}
			composition = composerDemandeSignification({
				creancier,
				debiteur: client,
				etude:
					etude === null ||
					etude.organizationId !== organizationId ||
					etude.role !== 'COMMISSAIRE_DE_JUSTICE'
						? null
						: { nom: etude.nom, adresse: etude.adresse },
				ordonnance:
					ordonnanceLe === null
						? null
						: { date: ordonnanceLe, juridiction: choix.juridiction, numero: choix.numero },
				nombrePieces: choix.nombrePieces,
				reglementsDepuis: reglementsDepuis.sort((a, b) => (a.date < b.date ? -1 : 1)),
				dateCourrier: aujourdHui
			});
			break;
		}
	}
	const chiffreUnDecompte =
		choix.modele === 'RELANCE_OFFICIELLE' ||
		choix.modele === 'ACCORD_ECHEANCIER' ||
		choix.modele === 'DECLARATION_CREANCE' ||
		choix.modele === 'TRANSMISSION_AVOCAT';
	return { composition, decompteId: chiffreUnDecompte && dernier !== null ? dernier._id : null };
}

function aujourdHuiIso(): string {
	return new Date().toISOString().slice(0, 10);
}

/** L'aperçu exact, recomposé depuis le dossier, avant toute préparation. */
export const apercu = authedQuery({
	args: { creanceId: v.id('creances'), choix: vChoixCourrier },
	returns: vComposition,
	handler: async (ctx, { creanceId, choix }): Promise<Infer<typeof vComposition>> => {
		const { organizationId } = await getUserOrg(ctx);
		const { composition } = await composer(ctx, organizationId, creanceId, choix, aujourdHuiIso());
		return composition.ok
			? { ...composition, resume: [...composition.resume] }
			: { ok: false, manques: [...composition.manques] };
	}
});

/** Un membre prépare : le courrier attend la validation d'un administrateur. */
export const preparer = authedMutation({
	args: { creanceId: v.id('creances'), choix: vChoixCourrier },
	returns: v.id('envois'),
	handler: async (ctx, { creanceId, choix }): Promise<Id<'envois'>> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const { composition, decompteId } = await composer(
			ctx,
			organizationId,
			creanceId,
			choix,
			aujourdHuiIso()
		);
		if (!composition.ok) {
			throw new ConvexError(
				`Ce courrier ne peut pas être préparé : ${composition.manques.join(' ; ')}.`
			);
		}
		return await ctx.db.insert('envois', {
			organizationId,
			creanceId,
			modele: choix.modele,
			...(decompteId === null ? {} : { decompteId }),
			destinataire: composition.destinataire,
			canal: composition.canal,
			objet: composition.objet,
			corps: composition.corps,
			resume: [...composition.resume],
			choix: JSON.stringify(choix),
			etat: 'A_VALIDER',
			preparePar: user._id,
			prepareLe: Date.now()
		});
	}
});

/**
 * Un administrateur valide : le texte est figé, avec son empreinte.
 *
 * ⚠️ RECOMPOSÉ ET COMPARÉ. Si le dossier a changé depuis la préparation, rien
 * n'est figé : le texte préparé est remplacé par le nouveau, et l'écran le
 * montre à relire.
 */
export const valider = authedMutation({
	args: { envoiId: v.id('envois') },
	returns: v.union(v.literal('VALIDE'), v.literal('A_RELIRE')),
	handler: async (ctx, { envoiId }): Promise<'VALIDE' | 'A_RELIRE'> => {
		const { organizationId, user } = await getUserOrg(ctx);
		await requireOrgAdmin(ctx, organizationId, user._id);
		const envoi = await ctx.db.get(envoiId);
		if (envoi === null || envoi.organizationId !== organizationId)
			throw new ConvexError('Courrier introuvable');
		if (envoi.etat !== 'A_VALIDER')
			throw new ConvexError('Ce courrier n’attend plus de validation.');
		const choix = JSON.parse(envoi.choix) as ChoixCourrier;
		const aujourdHui = aujourdHuiIso();
		const { composition } = await composer(ctx, organizationId, envoi.creanceId, choix, aujourdHui);
		if (!composition.ok) {
			throw new ConvexError(
				`Ce courrier ne peut plus partir : ${composition.manques.join(' ; ')}.`
			);
		}
		if (composition.corps !== envoi.corps) {
			await ctx.db.patch(envoiId, {
				corps: composition.corps,
				objet: composition.objet,
				resume: [...composition.resume],
				destinataire: composition.destinataire
			});
			return 'A_RELIRE';
		}
		await ctx.db.patch(envoiId, {
			etat: 'VALIDE',
			empreinte: sha256(envoi.corps),
			validePar: user._id,
			valideLe: Date.now()
		});
		return 'VALIDE';
	}
});

/** Le gérant déclare la date du départ : c'est elle qui compte. */
export const declarerParti = authedMutation({
	args: {
		envoiId: v.id('envois'),
		partiLe: v.string(),
		/**
		 * Poser un rappel au jour où le délai de la lettre expire.
		 *
		 * ⚠️ DEMANDÉ, JAMAIS SUPPOSÉ. Écrire dans le suivi du gérant sans qu'il
		 * l'ait coché serait une note qu'il n'a pas prise, et il la retrouverait
		 * dans sa file sans savoir d'où elle vient. L'écran le propose coché — le
		 * geste qui suit un envoi est toujours d'attendre, et attendre sans date
		 * est précisément ce qui fait perdre les dossiers.
		 */
		avecRappel: v.optional(v.boolean())
	},
	returns: v.null(),
	handler: async (ctx, { envoiId, partiLe, avecRappel }): Promise<null> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const envoi = await ctx.db.get(envoiId);
		if (envoi === null || envoi.organizationId !== organizationId)
			throw new ConvexError('Courrier introuvable');
		if (envoi.etat !== 'VALIDE')
			throw new ConvexError('Seul un courrier validé peut être déclaré parti.');
		if (!estDateReelle(partiLe) || partiLe > aujourdHuiIso()) {
			throw new ConvexError(`« ${partiLe} » n’est pas une date de départ possible.`);
		}
		await ctx.db.patch(envoiId, { etat: 'PARTI', partiLe, partiDeclarePar: user._id });

		/*
		  ⚠️ LE RAPPEL EST POSÉ SUR LE DÉLAI DE LA LETTRE, PAS SUR UN NOMBRE ROND.
		  La lettre dit « au plus tard le X » ; le jour où l'on veut savoir si
		  quelque chose est arrivé est celui-là, pas « dans quinze jours ». Le
		  délai vit dans le choix figé avec le texte, ce qui le rend exact même si
		  le réglage de l'établissement a changé depuis.

		  ⚠️ ET CE N'EST PAS UNE RELANCE PROGRAMMÉE. Rien ne partira ce jour-là :
		  le logiciel remonte le dossier dans la file, et le gérant décide. Envoyer
		  à sa place, même sur son instruction préalable, serait procéder au
		  recouvrement POUR LE COMPTE D'AUTRUI (décret n° 96-1112, article 1er,
		  qui vise cette activité « même à titre accessoire ») — et l'article 4
		  imposerait alors à la lettre de nommer le logiciel comme agent de
		  recouvrement, ce que la ligne rouge n° 1 interdit.
		*/
		if (avecRappel === true) {
			const choix = JSON.parse(envoi.choix) as ChoixCourrier;
			if (choix.modele === 'RELANCE_OFFICIELLE') {
				await ctx.db.insert('suiviDossier', {
					organizationId,
					creanceId: envoi.creanceId,
					genre: 'RAPPEL',
					texte: `Le délai de votre lettre du ${partiLe} expire. Regarder si un règlement est arrivé.`,
					rappelLe: ajouterJours(partiLe, choix.delaiJours + MARGE_ACHEMINEMENT_JOURS),
					auteurUserId: user._id,
					ecritLe: Date.now()
				});
			}
		}
		return null;
	}
});

/** Abandonner un courrier qui n'est pas parti. Un texte validé reste lisible, figé. */
export const abandonner = authedMutation({
	args: { envoiId: v.id('envois') },
	returns: v.null(),
	handler: async (ctx, { envoiId }): Promise<null> => {
		const { organizationId } = await getUserOrg(ctx);
		const envoi = await ctx.db.get(envoiId);
		if (envoi === null || envoi.organizationId !== organizationId)
			throw new ConvexError('Courrier introuvable');
		if (envoi.etat === 'PARTI') throw new ConvexError('Ce courrier est déjà parti.');
		await ctx.db.patch(envoiId, { etat: 'ABANDONNE' });
		return null;
	}
});

/** Les courriers du dossier, le plus récent d'abord, et si ce compte peut valider. */
export const lister = authedQuery({
	args: { creanceId: v.id('creances') },
	returns: v.object({
		peutValider: v.boolean(),
		envois: v.array(
			v.object({
				_id: v.id('envois'),
				modele: vModeleCourrier,
				titre: v.string(),
				destinataire: v.string(),
				canal: v.union(
					v.literal('IMPRIMER_RECOMMANDE'),
					v.literal('IMPRIMER_SIMPLE'),
					v.literal('MESSAGERIE')
				),
				objet: v.string(),
				corps: v.string(),
				resume: v.array(v.string()),
				etat: v.union(
					v.literal('A_VALIDER'),
					v.literal('VALIDE'),
					v.literal('PARTI'),
					v.literal('ABANDONNE')
				),
				prepareLe: v.number(),
				valideLe: v.optional(v.number()),
				empreinte: v.optional(v.string()),
				partiLe: v.optional(v.string()),
				decompteId: v.optional(v.id('decomptes'))
			})
		)
	}),
	handler: async (ctx, { creanceId }) => {
		const { organizationId, user } = await getUserOrg(ctx);
		const creance = await ctx.db.get(creanceId);
		if (creance === null || creance.organizationId !== organizationId)
			throw new ConvexError('Dossier introuvable');
		const membre = await ctx.db
			.query('organizationMembers')
			.withIndex('by_org_and_user', (q) =>
				q.eq('organizationId', organizationId).eq('userId', user._id)
			)
			.first();
		const envois = await ctx.db
			.query('envois')
			.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
			.collect();
		return {
			peutValider: membre?.role === 'ORG_ADMIN',
			envois: envois
				.filter((e) => e.organizationId === organizationId)
				.sort((a, b) => b.prepareLe - a.prepareLe)
				.map((e) => ({
					_id: e._id,
					modele: e.modele,
					titre: TITRE_MODELE[e.modele],
					destinataire: e.destinataire,
					canal: e.canal,
					objet: e.objet,
					corps: e.corps,
					resume: e.resume,
					etat: e.etat,
					prepareLe: e.prepareLe,
					...(e.valideLe === undefined ? {} : { valideLe: e.valideLe }),
					...(e.empreinte === undefined ? {} : { empreinte: e.empreinte }),
					...(e.partiLe === undefined ? {} : { partiLe: e.partiLe }),
					...(e.decompteId === undefined ? {} : { decompteId: e.decompteId })
				}))
		};
	}
});

/**
 * PRÉPARER LA MÊME LETTRE SUR PLUSIEURS DOSSIERS, EN UN GESTE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ POURQUOI CETTE MUTATION EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Tout se faisait par dossier, un par un. L'audit du 29/09/2026 l'a chiffré :
 * sur un import de 198 factures, dix-sept dossiers s'ouvrent, et écrire à tous
 * demandait dix-sept fois le même parcours. Au palier L — plus de huit cents
 * factures par an — le produit devenait impraticable.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ELLE NE VALIDE RIEN, ET C'EST LA LIGNE ROUGE 1
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Elle PRÉPARE. Chaque lettre atterrit dans « à valider », à son dossier, et
 * c'est le gérant qui la relit et la valide, une par une, comme avant. Ce qui
 * est groupé est la composition, jamais l'engagement.
 *
 * ⚠️ ET UN ÉCHEC NE FAIT PAS TOMBER LE LOT. Un dossier dont la lettre ne peut
 * pas se composer — une adresse absente, un décompte manquant — rend sa raison,
 * NOMMÉE, et les autres se préparent quand même. Un lot qui échoue en entier
 * pour un dossier abîmé ferait recommencer seize compositions valables ; un lot
 * qui tait ses échecs ferait croire à dix-sept lettres là où il y en a seize.
 */
export const preparerEnLot = authedMutation({
	args: { creanceIds: v.array(v.id('creances')), choix: vChoixCourrier },
	returns: v.array(
		v.object({
			creanceId: v.id('creances'),
			envoiId: v.optional(v.id('envois')),
			refus: v.optional(v.string())
		})
	),
	handler: async (
		ctx,
		{ creanceIds, choix }
	): Promise<{ creanceId: Id<'creances'>; envoiId?: Id<'envois'>; refus?: string }[]> => {
		const { organizationId, user } = await getUserOrg(ctx);
		const aujourdHui = aujourdHuiIso();
		const resultats: { creanceId: Id<'creances'>; envoiId?: Id<'envois'>; refus?: string }[] = [];

		for (const creanceId of creanceIds) {
			// ⚠️ UN DOSSIER DÉJÀ EN ATTENTE NE SE DOUBLE PAS. Sans ce garde-fou, un
			// second passage sur la même sélection poserait deux lettres identiques
			// à valider sur le même dossier, et le gérant en enverrait deux.
			const dejaEnAttente = await ctx.db
				.query('envois')
				.withIndex('by_creance', (q) => q.eq('creanceId', creanceId))
				.collect();
			if (dejaEnAttente.some((e) => e.etat === 'A_VALIDER' && e.modele === choix.modele)) {
				resultats.push({
					creanceId,
					refus: 'Un courrier du même modèle attend déjà votre validation sur ce dossier.'
				});
				continue;
			}

			const { composition, decompteId } = await composer(
				ctx,
				organizationId,
				creanceId,
				choix,
				aujourdHui
			);
			if (!composition.ok) {
				resultats.push({ creanceId, refus: composition.manques.join(' ; ') });
				continue;
			}
			const envoiId = await ctx.db.insert('envois', {
				organizationId,
				creanceId,
				modele: choix.modele,
				...(decompteId === null ? {} : { decompteId }),
				destinataire: composition.destinataire,
				canal: composition.canal,
				objet: composition.objet,
				corps: composition.corps,
				resume: [...composition.resume],
				choix: JSON.stringify(choix),
				etat: 'A_VALIDER',
				preparePar: user._id,
				prepareLe: Date.now()
			});
			resultats.push({ creanceId, envoiId });
		}

		return resultats;
	}
});
