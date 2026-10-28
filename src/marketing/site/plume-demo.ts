import { dureePourRetenir } from '../../lib/config/produit';
import { ajouterJours } from '../../lib/verticales/recouvrement/calendrier';
import { versements } from '../../lib/verticales/recouvrement/gabarits/accord-echeancier';
import { JOURS_DE_GRACE } from '../../lib/verticales/recouvrement/parole';
import { DELAI_POUR_RETENIR_MS } from '../../lib/verticales/recouvrement/plan-relance';
import type { PasDeFrise, ScenarioPlume } from '../../ui/site/plume';
import { FACTURE_DE_LA_LOI as F, LOI, jourEtMois } from './loi-demo';
import { VITRINE, dateCourte, euros } from './vitrine-demo';

/**
 * LES QUATRE SCÈNES DE PLUME, ET CE QU'ELLES CHIFFRENT (28/10/2026).
 *
 * La section suit les clients des autres démonstrations : Fournitures Durand et sa facture de la
 * loi (`loi-demo.ts`), Atelier Rousseau et Transports Vidal du téléphone (`vitrine-demo.ts`).
 * Ce qui tient à une règle du produit se lit sur la constante qui la tient :
 * - le délai pour retenir une relance (`DELAI_POUR_RETENIR_MS`), qui fait « dans 59:59 » ;
 * - la grâce après une promesse (`JOURS_DE_GRACE`), qui fait « jusqu’au 23 » ;
 * - le calendrier d'un paiement en plusieurs fois (`versements`, celui de l'accord écrit), qui
 *   met le reliquat sur le dernier versement.
 *
 * Le dépôt du matin (198 factures, 40 règlements) et les jours des rappels sont une fiction de
 * démonstration, la même que sur le téléphone de l'en-tête.
 */
/** « 4 000 € » : un montant rond, aux espaces insécables de la maquette. */
export const eurosRonds = (c: number) => euros(c).replace(/,00\u00a0€$/, '\u00a0€');
const court = (iso: string) => dateCourte(iso).replace(/ \d{4}$/, '');
const jour = (iso: string) => Number(iso.slice(8, 10));

export const DEPOT_DU_MATIN = {
	factures: 198,
	reglements: 40,
	clients: 23,
	retards: 17,
	dossiers: 4
};
export const ROUSSEAU = { client: 'Atelier Rousseau', du: VITRINE.clients.rousseau, jours: 41 };
export const VIDAL = { client: 'Transports Vidal', du: VITRINE.clients.vidal };
/** L'heure du prochain rappel, dans les heures d'envoi (`HEURES_D_ENVOI`). */
export const HEURE_DU_RAPPEL = '10:00';

/** Le jour que Vidal promet, et le premier de ses trois versements s'il paie en trois fois. */
export const PROMESSE = '2026-11-20';
const reprise = ajouterJours(PROMESSE, JOURS_DE_GRACE);
export const CALENDRIER_VIDAL = versements(BigInt(VIDAL.du), 3, '2026-11-05', 1);
const [v1, v2, v3] = CALENDRIER_VIDAL;
if (!v1 || !v2 || !v3)
	throw new Error('Le paiement en trois fois de Vidal doit avoir trois versements.');
const versement = (v: typeof v1): PasDeFrise => [court(v.date), euros(Number(v.montant)), true];

/** Ce que Durand paie pendant la conversation, et ce qui reste. */
export const PAIEMENT_DURAND = 400_000;
export const RESTE_DURAND = F.ttc - PAIEMENT_DURAND;

export const PLUME = {
	retenir: dureePourRetenir(),
	scenario: {
		lettre: `Bonjour, sauf erreur de notre part, la facture ${F.reference}, échue le ${jourEtMois(F.echeance)}, reste à régler. Vous trouverez ci-dessous le montant et nos coordonnées de virement.`,
		heureDEnvoi: HEURE_DU_RAPPEL,
		delai: DELAI_POUR_RETENIR_MS / 1000,
		reponses: {
			promesse: {
				message: `« Je règle le ${jour(PROMESSE)}, promis. »`,
				icone: 'temps',
				titre: 'Promesse notée',
				sous: `Les relances se taisent jusqu’au ${jour(reprise)}`,
				frise: [
					['Aujourd’hui', 'Rien ne part', true],
					[`Le ${jour(PROMESSE)}`, 'Jour promis', true],
					[`Le ${jour(reprise)}`, 'Le plan reprend s’il n’a rien reçu', false]
				]
			},
			echeancier: {
				message: '« Je peux payer en trois fois ? »',
				icone: 'temps',
				titre: 'Paiement en trois fois, prêt à convenir',
				sous: 'Rien ne part tant que les versements arrivent',
				frise: [versement(v1), versement(v2), versement(v3)]
			},
			conteste: {
				message: '« Je conteste cette facture. »',
				icone: 'papiers',
				titre: 'Contestation notée au dossier',
				sous: 'Le dossier continue, vous décidez de la suite',
				frise: [
					['Aujourd’hui', 'Notée au dossier', true],
					['Jeudi', 'Deuxième rappel, comme prévu', false],
					['Vous', 'Décidez de la suite', false]
				]
			}
		},
		question: `Durand a payé ${eurosRonds(PAIEMENT_DURAND)} ce matin.`,
		reponse: `Je le note sur sa facture ${F.reference}. Il restera ${euros(RESTE_DURAND)}, et le rappel de jeudi portera ce montant.`,
		fin: `C’est fait. Le rappel de jeudi portera ${euros(RESTE_DURAND)}.`
	} satisfies ScenarioPlume,
	/** « 59:59 » : le compte à rebours au départ, une seconde après la mise en file. */
	get compteARebours(): string {
		const s = this.scenario.delai - 1;
		return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
	},
	durand: { client: F.client, du: F.ttc, jours: LOI.jours, reference: F.reference },
	emetteur: F.emetteur
};

/** « ML » : les initiales d'un nom d'entreprise, comme les avatars du produit. */
export const initiales = (nom: string) =>
	nom
		.split(/\s+/)
		.slice(0, 2)
		.map((m) => m.charAt(0).toUpperCase())
		.join('');
