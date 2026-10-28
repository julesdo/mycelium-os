import { PARAMETRES } from '../../lib/verticales/recouvrement/parametres';
import { HEURES_D_ENVOI } from '../../lib/verticales/recouvrement/plan-relance';

/**
 * LES CHIFFRES DU TÉLÉPHONE DE L'EN-TÊTE (28/10/2026).
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE QUE LA LOI DOIT VIENT DU MOTEUR, PAS D'UNE MAIN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le total dû, les tranches d'ancienneté et ce qui n'a jamais été réclamé sont ceux que le
 * moteur du produit calcule sur les factures de la salle d'exposition, arrêtés au jour de sa
 * démonstration (`routes/-salle/revelation.ts`, `REVELATION_DEMO`, `ARRETE_AU_DEMO`). Ils sont
 * recopiés ici pour ne pas tirer la salle dans le paquet de l'accueil, et
 * `__tests__/vitrine-demo.test.ts` refuse qu'ils s'en écartent d'un centime. Les frais se lisent
 * au registre (`indemniteForfaitaire`), comme les heures d'envoi (`HEURES_D_ENVOI`).
 *
 * La maquette disait « au 28 oct. 2026 » et détaillait « 17 803,92 € + 16 factures × 40 € » :
 * deux erreurs. Le moteur dit 18 283,92 € de pénalités et 4 factures × 40 €, au 9 septembre.
 *
 * Les montants PAR CLIENT, eux, sont une fiction de démonstration : ils s'additionnent au total
 * du moteur, et leurs dates suivent le jour de la démonstration.
 *
 * Des centimes entiers en `number` : le téléphone les fait défiler image par image.
 */
export const JOUR_DE_LA_DEMO = '2026-09-09';

const MOIS = [
	'janv.',
	'févr.',
	'mars',
	'avr.',
	'mai',
	'juin',
	'juil.',
	'août',
	'sept.',
	'oct.',
	'nov.',
	'déc.'
];

/** « 9 sept. 2026 », comme le produit écrit une date courte. */
export function dateCourte(iso: string): string {
	const [a, m, j] = iso.split('-').map(Number);
	return `${j ?? ''} ${MOIS[(m ?? 1) - 1] ?? ''} ${a ?? ''}`;
}

const indemnite = PARAMETRES.indemniteForfaitaire.valeur;
if (typeof indemnite !== 'bigint')
	throw new Error(
		'Le registre ne donne pas les frais de recouvrement en centimes (`indemniteForfaitaire`).'
	);

export const VITRINE = {
	/** Ce qu'on vous doit, pénalités comprises. */
	du: 6_670_482,
	factures: 4,
	moinsDe30: 0,
	de30a90: 29_330,
	plusDe90: 6_641_152,
	/** Jamais réclamé : les pénalités de retard, et les frais forfaitaires. */
	penalites: 1_828_392,
	indemnite: Number(indemnite),
	get frais(): number {
		return this.factures * this.indemnite;
	},
	get jamaisReclame(): number {
		return this.penalites + this.frais;
	},
	heures: HEURES_D_ENVOI,
	/** La fiction : cinq clients, dont Bâti-Sud qui arrive pendant la visite. */
	clients: {
		roux: 4_969_102,
		durand: 1_240_000,
		vidal: 432_050,
		bati: 186_000,
		rousseau: 29_330
	},
	/** Le deuxième rappel de Durand, tel qu'il le réclame. */
	durandReclame: 1_333_343,
	premierRappelDurand: '26 août',
	promesseVidal: '16 sept.'
} as const;

/** « 40 € » : un montant rond, sans ses centimes (le reste passe par `euros`). */
export function eurosRonds(c: number): string {
	return c % 100 === 0 ? `${c / 100}\u00a0€` : euros(c);
}

/** « 4 320,50 € » : l'espace insécable des montants posés, celui de la maquette. */
export function euros(c: number): string {
	const e = Math.floor(c / 100),
		d = String(c % 100).padStart(2, '0');
	return String(e).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + ',' + d + '\u00a0€';
}
