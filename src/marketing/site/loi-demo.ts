import { depuisCentimes, enCentimes } from '../../lib/socle/montants';
import { decompterFacture, joursEntre } from '../../lib/verticales/recouvrement/decompte';
import { PARAMETRES } from '../../lib/verticales/recouvrement/parametres';
import { mentionDeRetard } from '../../lib/verticales/recouvrement/pays/france/mention-de-facture';
import {
	dateDePrescription,
	regimePrescription
} from '../../lib/verticales/recouvrement/pays/france/prescription';
import {
	majorationLisible,
	periodesDeTauxParDefaut
} from '../../lib/verticales/recouvrement/pays/france/taux';
import { ajouterJours } from '../../lib/verticales/recouvrement/calendrier';
import { articleDe } from '../articles';

/**
 * LA VIE D'UNE FACTURE IMPAYÉE, CALCULÉE PAR LE MOTEUR (28/10/2026).
 *
 * La section « La loi » suit une facture de démonstration, de son échéance au jour où on la
 * réclame. Tout ce qu'elle chiffre sort ici du moteur du produit et du registre :
 * - les jours et les pénalités, semestre par semestre (`decompterFacture`, au taux relevé) ;
 * - les frais (`indemniteForfaitaire`) ;
 * - la date limite pour agir (`dateDePrescription`) ;
 * - les articles cités (les sources du registre).
 *
 * La maquette avait le bon total (893,43 €) mais une fausse répartition (94 j à 404,12 €, puis
 * 120 j à 489,31 €). Le moteur dit 95 j à 392,13 €, puis 119 j à 501,30 €.
 *
 * Le jour est FIGÉ, comme celui de la salle d'exposition : la frise va de mars à octobre, et la
 * lire sur l'horloge changerait l'histoire chaque jour.
 */
export const FACTURE_DE_LA_LOI = {
	reference: 'F-2026-118',
	emetteur: 'Menuiserie Laurent',
	ville: 'Lyon 7e',
	client: 'Fournitures Durand',
	emiseLe: '2026-02-26',
	echeance: '2026-03-28',
	hors: 1_033_333,
	tva: 206_667,
	ttc: 1_240_000,
	/** Les deux autres factures du même client, pour les frais qui s'additionnent. */
	autres: [
		{ reference: 'F-2026-142', ttc: 328_000 },
		{ reference: 'F-2026-131', ttc: 596_000 }
	]
} as const;

export const JOUR_DE_LA_LOI = '2026-10-28';

const ligne = decompterFacture(
	{
		reference: FACTURE_DE_LA_LOI.reference,
		montantExigible: depuisCentimes(BigInt(FACTURE_DE_LA_LOI.ttc)),
		dateExigibilite: FACTURE_DE_LA_LOI.echeance,
		reglements: [],
		taux: periodesDeTauxParDefaut(FACTURE_DE_LA_LOI.echeance, JOUR_DE_LA_LOI)
	},
	JOUR_DE_LA_LOI,
	'ACT_365',
	'PENALITES_DABORD'
);

const indemnite = PARAMETRES.indemniteForfaitaire.valeur;
if (typeof indemnite !== 'bigint')
	throw new Error(
		'Le registre ne donne pas les frais de recouvrement en centimes (`indemniteForfaitaire`).'
	);

const article = (source: string): string => {
	const a = articleDe(source);
	if (!a) throw new Error(`Le registre ne cite pas d’article dans « ${source} ».`);
	return a;
};

const EN_LETTRES: Readonly<Record<number, string>> = {
	1: 'un',
	2: 'deux',
	3: 'trois',
	4: 'quatre',
	5: 'cinq'
};
const annees = (n: number) => `${EN_LETTRES[n] ?? String(n)} an${n > 1 ? 's' : ''}`;

const MOIS = [
	'janvier',
	'février',
	'mars',
	'avril',
	'mai',
	'juin',
	'juillet',
	'août',
	'septembre',
	'octobre',
	'novembre',
	'décembre'
];
const parties = (iso: string) => iso.split('-').map(Number) as [number, number, number];
/** « 28 mars 2026 » */
export const dateLongue = (iso: string) => {
	const [a, m, j] = parties(iso);
	return `${j === 1 ? '1er' : j} ${MOIS[m - 1] ?? ''} ${a}`;
};
/** « 29 mars », « 1er juillet » */
export const jourEtMois = (iso: string) => {
	const [, m, j] = parties(iso);
	return `${j === 1 ? '1er' : j} ${MOIS[m - 1] ?? ''}`;
};
/** « mars 2027 » */
export const moisEtAnnee = (iso: string) => {
	const [a, m] = parties(iso);
	return `${MOIS[m - 1] ?? ''} ${a}`;
};

/** « 4 ans et 5 mois » entre deux jours. */
function duree(de: string, a: string): string {
	const [a1, m1, j1] = parties(de),
		[a2, m2, j2] = parties(a);
	const mois = (a2 - a1) * 12 + (m2 - m1) - (j2 < j1 ? 1 : 0);
	const ans = Math.floor(mois / 12),
		reste = mois % 12;
	return `${ans} an${ans > 1 ? 's' : ''}${reste ? ` et ${reste} mois` : ''}`;
}

const prescription = dateDePrescription(FACTURE_DE_LA_LOI.echeance, 'GENERAL');
const transport = dateDePrescription(FACTURE_DE_LA_LOI.echeance, 'TRANSPORT_MARCHANDISES');

export const LOI = {
	jours: joursEntre(FACTURE_DE_LA_LOI.echeance, JOUR_DE_LA_LOI),
	/** Le premier jour qui compte : le lendemain de l'échéance. */
	lendemain: ajouterJours(FACTURE_DE_LA_LOI.echeance, 1),
	penalites: Number(enCentimes(ligne.interets)),
	segments: ligne.segments.map((s) => ({
		debut: s.debut,
		jours: s.jours,
		interets: Number(enCentimes(s.interets))
	})),
	indemnite: Number(indemnite),
	get total(): number {
		return FACTURE_DE_LA_LOI.ttc + this.penalites + this.indemnite;
	},
	prescription,
	transport,
	pourAgir: duree(JOUR_DE_LA_LOI, prescription),
	majoration: majorationLisible(),
	general: annees(regimePrescription('GENERAL').dureeAnnees),
	enTransport: annees(regimePrescription('TRANSPORT_MARCHANDISES').dureeAnnees),
	articles: {
		penalites: article(PARAMETRES.tauxInteretLegalDefaut.source),
		frais: article(PARAMETRES.indemniteForfaitaire.source),
		prescription: article(PARAMETRES.delaiPrescriptionCommerciale.source)
	},
	mention: mentionDeRetard()
};

/** « 12 400,00 € », l'espace ordinaire de cette section de la maquette. */
export function eurosDeLaLoi(c: number): string {
	const e = Math.floor(c / 100),
		d = String(c % 100).padStart(2, '0');
	return String(e).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + d + ' €';
}
