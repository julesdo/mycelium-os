import { v } from 'convex/values';
import { internalQuery, type QueryCtx } from '../_generated/server';
import type { Doc, Id } from '../_generated/dataModel';
import { authedQuery } from '../functions';
import { getUserOrg } from '../lib/auth';
import { depuisCentimes, enCentimes } from '../../socle/montants';
import { decompterFacture, joursEntre } from '../../verticales/recouvrement/decompte';
import {
	baremeDuDebiteur,
	periodesDeTauxPublics
} from '../../verticales/recouvrement/pays/france/commande-publique';
import { datePrescriptionQuadriennale } from '../../verticales/recouvrement/pays/france/prescription';
import { tauxLisible } from '../../verticales/recouvrement/taux-lisible';
import {
	composerReclamationInteretsMoratoires,
	composerSignalementMandatement,
	type FacturePayeeEnRetardCourrier
} from '../../verticales/recouvrement/gabarits/commande-publique';
import type { Composition, CreancierCourrier } from '../../verticales/recouvrement/gabarits/commun';

/**
 * LES COURRIERS D'UN CLIENT PUBLIC (19/10/2026, lot 1 bis) : la demande de paiement des
 * intérêts moratoires et le signalement pour mandatement d'office, composés sur ses
 * factures réglées en retard. C'est ce qui livre la « réclamation clé en main » : le
 * fondateur la prépare dans l'application, au nom du client, qui la valide et l'envoie.
 *
 * ⚠️ UN COURRIER NE PORTE QUE DES CHIFFRES SÛRS. Une facture n'y entre que si son
 * échéance est CONNUE (jamais supposée), sa date de paiement réelle (jamais celle d'une
 * lecture), et ses droits non prescrits d'après la lecture du registre (quatre ans à
 * compter du 1er janvier qui suit l'année de la facture). Les autres sont nommées, avec
 * leur raison, à côté du courrier.
 */

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

function enValidateur(c: Composition) {
	return c.ok ? { ...c, resume: [...c.resume] } : { ok: false as const, manques: [...c.manques] };
}

async function creancierDe(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>
): Promise<CreancierCourrier> {
	const profil = await ctx.db
		.query('profilsCreancier')
		.withIndex('by_org', (q) => q.eq('organizationId', organizationId))
		.first();
	return {
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
}

/** Les factures réglées en retard qu'un courrier peut porter, et celles qu'il laisse, avec leur raison. */
async function facturesDuCourrier(
	ctx: QueryCtx,
	debiteur: Doc<'debiteurs'>,
	aujourdHui: string
): Promise<{
	factures: FacturePayeeEnRetardCourrier[];
	laissees: { reference: string; raison: string }[];
}> {
	const factures: FacturePayeeEnRetardCourrier[] = [];
	const laissees: { reference: string; raison: string }[] = [];
	const toutes = await ctx.db
		.query('facturesVente')
		.withIndex('by_debiteur', (q) => q.eq('debiteurId', debiteur._id))
		.collect();
	for (const facture of toutes) {
		if (facture.statutPaiement !== 'SOLDEE') continue;
		const reglements = await ctx.db
			.query('reglements')
			.withIndex('by_facture', (q) => q.eq('factureId', facture._id))
			.collect();
		const payeeLe = reglements.reduce<string | null>(
			(dernier, r) => (dernier === null || r.date > dernier ? r.date : dernier),
			null
		);
		const echeance = facture.dateExigibilite ?? facture.dateEcheance;
		if (payeeLe === null) continue;
		if (echeance === undefined) {
			laissees.push({
				reference: facture.reference,
				raison:
					'échéance inconnue : la date de réception de la demande de paiement (son dépôt sur Chorus Pro) est à renseigner'
			});
			continue;
		}
		if (payeeLe <= echeance) continue;
		if (reglements.some((r) => r.dateSource === 'LECTURE')) {
			laissees.push({
				reference: facture.reference,
				raison: 'date de paiement inconnue : le logiciel de comptabilité ne la transmet pas'
			});
			continue;
		}
		const annee = Number(facture.dateEmission.slice(0, 4));
		if (
			Number.isInteger(annee) &&
			datePrescriptionQuadriennale(annee).dernierJourPourAgir < aujourdHui
		) {
			laissees.push({
				reference: facture.reference,
				raison:
					'droits de plus de quatre ans : ils peuvent être prescrits (lecture de la loi n° 68-1250)'
			});
			continue;
		}
		try {
			const decompte = decompterFacture(
				{
					reference: facture.reference,
					bareme: 'COMMANDE_PUBLIQUE',
					montantExigible: depuisCentimes(facture.montantTTC),
					dateExigibilite: echeance,
					reglements: reglements.map((r) => ({
						date: r.date,
						montant: depuisCentimes(r.montant),
						nature: r.nature
					})),
					taux: periodesDeTauxPublics(echeance)
				},
				aujourdHui,
				'ACT_365',
				'PRINCIPAL_DABORD'
			);
			const segment = decompte.segments[0];
			factures.push({
				reference: facture.reference,
				dateEmission: facture.dateEmission,
				montantTTC: facture.montantTTC,
				echeance,
				payeeLe,
				jours: joursEntre(echeance, payeeLe),
				taux: segment === undefined ? '' : tauxLisible(segment.taux),
				interets: decompte.segments.reduce((t, s) => t + enCentimes(s.interets), 0n),
				indemnite: enCentimes(decompte.indemniteForfaitaire)
			});
		} catch (erreur) {
			laissees.push({
				reference: facture.reference,
				raison: erreur instanceof Error ? erreur.message : String(erreur)
			});
		}
	}
	factures.sort((a, b) => a.echeance.localeCompare(b.echeance));
	return { factures, laissees };
}

const vCourriersPublics = v.union(
	v.null(),
	v.object({
		acheteur: v.string(),
		reclamation: vComposition,
		signalement: vComposition,
		laissees: v.array(v.object({ reference: v.string(), raison: v.string() }))
	})
);

async function composerCourriersPublics(
	ctx: QueryCtx,
	organizationId: Id<'organizations'>,
	debiteurId: Id<'debiteurs'>,
	aujourdHui: string
) {
	const debiteur = await ctx.db.get(debiteurId);
	if (debiteur === null || debiteur.organizationId !== organizationId) return null;
	const { bareme } = baremeDuDebiteur({
		...(debiteur.categorieJuridique === undefined
			? {}
			: { categorieJuridique: debiteur.categorieJuridique }),
		...(debiteur.acheteurPublic === undefined ? {} : { acheteurPublic: debiteur.acheteurPublic })
	});
	if (bareme !== 'COMMANDE_PUBLIQUE') return null;
	const creancier = await creancierDe(ctx, organizationId);
	const { factures, laissees } = await facturesDuCourrier(ctx, debiteur, aujourdHui);
	const acheteur = {
		denomination: debiteur.denomination,
		...(debiteur.siren === undefined ? {} : { siren: debiteur.siren }),
		...(debiteur.adresse === undefined ? {} : { adresse: debiteur.adresse }),
		...(debiteur.categorieJuridique === undefined
			? {}
			: { categorieJuridique: debiteur.categorieJuridique })
	};
	return {
		acheteur: debiteur.denomination,
		reclamation: enValidateur(
			composerReclamationInteretsMoratoires({
				creancier,
				acheteur,
				factures,
				dateCourrier: aujourdHui
			})
		),
		signalement: enValidateur(
			composerSignalementMandatement({ creancier, acheteur, factures, dateCourrier: aujourdHui })
		),
		laissees
	};
}

export const courriersPublics = authedQuery({
	args: { debiteurId: v.id('debiteurs'), aujourdHui: v.string() },
	returns: vCourriersPublics,
	handler: async (ctx, { debiteurId, aujourdHui }) => {
		const { organizationId } = await getUserOrg(ctx);
		return composerCourriersPublics(ctx, organizationId, debiteurId, aujourdHui);
	}
});

/** Les mêmes courriers, sans authentification : pour les tests. */
export const courriersPublicsInterne = internalQuery({
	args: {
		organizationId: v.id('organizations'),
		debiteurId: v.id('debiteurs'),
		aujourdHui: v.string()
	},
	returns: vCourriersPublics,
	handler: async (ctx, { organizationId, debiteurId, aujourdHui }) =>
		composerCourriersPublics(ctx, organizationId, debiteurId, aujourdHui)
});
