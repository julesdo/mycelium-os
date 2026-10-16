import { v, ConvexError } from 'convex/values';
import { internalMutation } from '../_generated/server';
import { resend, assertResendApiKey } from './resend';
import { expediteurNomme } from './helpers';
import { renderPasswordResetEmail, renderVerificationEmail } from './templates';
import {
	briefingHtml,
	briefingTexte,
	invitationHtml,
	invitationTexte,
	rappelAbonnementHtml,
	rappelAbonnementTexte
} from './modeles';
import { relanceHtml } from './modeles/relance';
import { t } from '../i18n/translations';
import { requireEnv } from '../env';
import { expediteurPour } from '../recouvrement/pilote';
import { texteDuPreavis } from '../ouvertureFacturation';
import { texteDuRappel } from '../../paiement/rappels';
import { DUREE_ESSAI_JOURS } from '../../config/tarifs';
import { depuisCentimes, versEuros } from '../../socle/montants';
import { composerBriefing } from '../../verticales/recouvrement/briefing';
import { composerRelance } from '../../verticales/recouvrement/relance';
import { ajouterJours, dateLisible } from '../../verticales/recouvrement/calendrier';
import { decompterCreance } from '../../verticales/recouvrement/decompte';
import { periodesDeTauxParDefaut } from '../../verticales/recouvrement/pays/france/taux';
import { composerLettreRelance } from '../../verticales/recouvrement/gabarits/lettre-relance-officielle';
import type { Evenement } from '../../verticales/recouvrement/surveillance';
import { conseilHtml, conseilTexte, objetDuConseil } from './modeles/conseils';
import { CLES_CONSEILS } from '../../croissance/conseils';
import { lignesDuPlan } from '../croissance/conseils';
import { PARAMETRES, exiger } from '../../verticales/recouvrement/parametres';

/**
 * TOUS LES E-MAILS DE LETIKETTE, ENVOYÉS À UNE SEULE ADRESSE (15/10/2026).
 *
 * Pour voir le rendu dans une vraie boîte de réception : chaque e-mail que
 * l'application peut envoyer, composé par ses VRAIS modèles et ses vrais moteurs
 * (le point du matin par `composerBriefing`, les rappels par `composerRelance`,
 * la lettre officielle par son gabarit, sur un décompte calculé par
 * `decompterCreance`), avec des données de démonstration. L'objet porte
 * « [Essai n/N] » devant l'objet réel, pour qu'aucun ne se confonde avec un vrai.
 *
 *   npx convex run --prod emails/essai:envoyerTout '{"a":"vous@exemple.fr"}'
 *
 * ⚠️ INTERNE. Aucun écran ne l'appelle, et elle n'écrit rien en base : seul le
 * composant Resend garde la trace de l'envoi.
 */

const SITE = 'https://www.letikette.com';
const CREANCIER = 'Menuiserie Dupont';
const CLIENT = 'Durand Bâtiment';

type Essai = {
	readonly objet: string;
	readonly de: string;
	readonly html: string;
	readonly texte: string;
	readonly repondreA?: boolean;
};

export function lesEssais(
	aujourdHui: string,
	plateforme: string,
	plume: string,
	relances: string
): Essai[] {
	const essais: Essai[] = [];

	// Le compte.
	const verification = renderVerificationEmail(`${SITE}/api/auth/verify-email?token=essai`, 20);
	essais.push({
		objet: t('fr', 'email.subject.verify'),
		de: plateforme,
		html: verification.html,
		texte: verification.text
	});
	const motDePasse = renderPasswordResetEmail(
		`${SITE}/reinitialiser?token=essai`,
		'Camille Dupont'
	);
	essais.push({
		objet: t('fr', 'email.subject.reset_password'),
		de: plateforme,
		html: motDePasse.html,
		texte: motDePasse.text
	});
	const invitation = {
		nomEtablissement: CREANCIER,
		roleLibelle: 'Membre',
		url: `${SITE}/invitation/essai`
	};
	essais.push({
		objet: `Rejoindre ${CREANCIER} sur Letikette`,
		de: plateforme,
		html: invitationHtml(invitation),
		texte: invitationTexte(invitation)
	});

	// Le point du matin : un jour chargé, puis un jour calme.
	const echue = ajouterJours(aujourdHui, -32);
	const evenements: Evenement[] = [
		{
			type: 'FACTURE_ECHUE',
			reference: 'FA-2026-0142',
			montant: depuisCentimes(184_200n),
			urgence: 'CRITIQUE',
			explication: `La facture FA-2026-0142 est échue depuis le ${dateLisible(echue)} et reste due.`,
			action: 'Rattacher cette facture à un dossier, ou enregistrer son règlement.'
		},
		{
			type: 'FACTURE_ECHUE',
			reference: 'FA-2026-0157',
			montant: depuisCentimes(62_040n),
			urgence: 'HAUTE',
			explication: `La facture FA-2026-0157 est échue depuis le ${dateLisible(ajouterJours(aujourdHui, -15))} et reste due.`,
			action: 'Rattacher cette facture à un dossier, ou enregistrer son règlement.'
		}
	];
	for (const briefing of [
		composerBriefing(evenements, depuisCentimes(246_240n)),
		composerBriefing([], depuisCentimes(0n))
	]) {
		const donnees = {
			nomEntreprise: CREANCIER,
			titre: briefing.titre,
			intro: briefing.intro,
			lignes: briefing.lignes,
			action: briefing.action,
			montantLisible:
				briefing.montantIdentifie > 0n ? `${versEuros(briefing.montantIdentifie)} €` : null,
			url: `${SITE}/app`
		};
		essais.push({
			objet: briefing.titre,
			de: plume,
			html: briefingHtml(donnees),
			texte: briefingTexte(donnees)
		});
	}

	// L'abonnement : le premier prélèvement après l'essai, le renouvellement
	// annuel, et le préavis de l'ouverture du paiement.
	const dans = (jours: number) => Date.parse(`${ajouterJours(aujourdHui, jours)}T09:00:00Z`);
	const rien = { relancesParties: 0, rentre: 0n };
	for (const texte of [
		texteDuRappel(
			{ cle: 'essai', genre: 'essai', jours: 2, date: dans(2), email: true },
			'equipe',
			'mensuel',
			rien
		),
		texteDuRappel(
			{ cle: 'renouvellement', genre: 'renouvellement', jours: 30, date: dans(30), email: true },
			'pro',
			'annuel',
			rien
		),
		texteDuPreavis(dateLisible(ajouterJours(aujourdHui, DUREE_ESSAI_JOURS)))
	]) {
		const donnees = {
			nomEntreprise: CREANCIER,
			titre: texte.titre,
			message: texte.message,
			url: `${SITE}/app/compte?ouvrir=facturation`
		};
		essais.push({
			objet: texte.titre,
			de: plateforme,
			html: rappelAbonnementHtml(donnees),
			texte: rappelAbonnementTexte(donnees)
		});
	}

	// Les conseils de Plume, dans l'ordre où ils partent (`croissance/conseils.ts`).
	const unitaire = depuisCentimes(exiger(PARAMETRES.indemniteForfaitaire));
	for (const cle of CLES_CONSEILS) {
		const donnees = {
			cle,
			prenom: 'Camille',
			nomEtablissement: CREANCIER,
			site: SITE,
			desinscription: `${SITE}/conseils`,
			du: {
				montant: `${versEuros(depuisCentimes(246_240n))} €`,
				factures: 2,
				indemnite: `${versEuros(unitaire)} €`,
				indemniteTotale: `${versEuros(depuisCentimes((unitaire as bigint) * 2n))} €`
			},
			plan: lignesDuPlan()
		};
		essais.push({
			objet: objetDuConseil(cle),
			de: plume,
			html: conseilHtml(donnees),
			texte: conseilTexte(donnees)
		});
	}

	// Les relances au client du gérant : premier rappel, second rappel, rappel
	// après une promesse non tenue, puis la lettre officielle.
	const factures = [
		{ reference: 'FA-2026-0142', montantTTC: depuisCentimes(184_200n), dateEcheance: echue },
		{
			reference: 'FA-2026-0157',
			montantTTC: depuisCentimes(62_040n),
			dateEcheance: ajouterJours(aujourdHui, -15)
		}
	];
	const base = {
		creancier: CREANCIER,
		debiteur: CLIENT,
		factures,
		principalRestantDu: depuisCentimes(246_240n),
		santeDebiteur: 'SAINE' as const,
		aujourdHui
	};
	for (const rappel of [
		composerRelance(1, base),
		composerRelance(1, { ...base, rang: 2 }),
		composerRelance(1, {
			...base,
			promesseManquee: { le: ajouterJours(aujourdHui, -6), montant: depuisCentimes(184_200n) }
		})
	]) {
		if (!rappel.disponible) throw new ConvexError(`Rappel refusé : ${rappel.constat}`);
		essais.push({
			objet: rappel.objet,
			de: relances,
			html: relanceHtml(rappel.corps, CREANCIER),
			texte: rappel.corps,
			repondreA: true
		});
	}

	const decompte = decompterCreance(
		factures.map((f) => ({
			reference: f.reference,
			montantExigible: f.montantTTC,
			dateExigibilite: f.dateEcheance,
			reglements: [],
			taux: periodesDeTauxParDefaut(f.dateEcheance, aujourdHui)
		})),
		aujourdHui,
		'ACT_365',
		'A_CONFIRMER'
	);
	const lettre = composerLettreRelance({
		creancier: {
			denomination: CREANCIER,
			formeJuridique: 'SARL',
			siren: '123456789',
			adresse: '12 rue des Artisans, 33000 Bordeaux',
			email: 'contact@menuiserie-dupont.fr',
			telephone: '05 56 00 00 00',
			signataireNom: 'Camille Dupont',
			signataireQualite: 'Gérante',
			capitalSocial: 1_000_000n,
			immatriculeRcs: true,
			villeGreffeRcs: 'Bordeaux',
			iban: 'FR76 3000 6000 0112 3456 7890 189'
		},
		debiteur: {
			denomination: CLIENT,
			formeJuridique: 'SAS',
			siren: '987654321',
			adresse: '4 avenue de la Gare, 33130 Bègles',
			sante: 'SAINE'
		},
		factures: factures.map((f) => ({
			reference: f.reference,
			dateEmission: ajouterJours(f.dateEcheance, -30),
			dateExigibilite: f.dateEcheance,
			montantTTC: f.montantTTC,
			reglementsRecus: 0n,
			resteDu: f.montantTTC,
			exigibiliteLueSurLaFacture: true
		})),
		decompte: {
			arreteAu: decompte.arreteAu,
			convention: decompte.convention,
			principal: decompte.principalRestantDu,
			interets: decompte.interets,
			indemnites: decompte.indemniteForfaitaire,
			total: decompte.total,
			lignes: decompte.lignes.map((l) => ({
				reference: l.reference,
				principal: l.principalRestantDu,
				interets: l.interets,
				indemnite: l.indemniteForfaitaire,
				total: l.total,
				tauxConvenu: false
			}))
		},
		referenceInterne: 'DOS-2026-014',
		dateCourrier: aujourdHui,
		choix: {
			delaiJours: 8,
			suite: 'SUITE_GENERALE',
			modalite: 'VIREMENT_IBAN',
			reserveIndemnisationComplementaire: false
		},
		relancesAnterieures: [ajouterJours(aujourdHui, -20), ajouterJours(aujourdHui, -10)]
	});
	if (!lettre.ok)
		throw new ConvexError(`Lettre officielle refusée : ${lettre.manques.join(' ; ')}`);
	essais.push({
		objet: lettre.objet,
		de: relances,
		html: relanceHtml(lettre.corps, CREANCIER),
		texte: lettre.corps,
		repondreA: true
	});

	return essais;
}

export const envoyerTout = internalMutation({
	args: { a: v.string() },
	returns: v.array(v.string()),
	handler: async (ctx, { a }): Promise<string[]> => {
		const adresse = a.trim();
		if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(adresse)) {
			throw new ConvexError('Adresse e-mail invalide.');
		}
		assertResendApiKey();
		const brute = requireEnv('AUTH_EMAIL', { feature: 'e-mails d’essai' });
		const essais = lesEssais(
			new Date().toISOString().slice(0, 10),
			expediteurNomme(brute),
			expediteurNomme(brute, 'Plume de Letikette'),
			expediteurPour(CREANCIER)
		);
		const objets: string[] = [];
		for (const [i, essai] of essais.entries()) {
			const objet = `[Essai ${i + 1}/${essais.length}] ${essai.objet}`;
			await resend.sendEmail(ctx, {
				from: essai.de,
				to: adresse,
				subject: objet,
				html: essai.html,
				text: essai.texte,
				...(essai.repondreA ? { replyTo: [adresse] } : {})
			});
			objets.push(objet);
		}
		return objets;
	}
});
