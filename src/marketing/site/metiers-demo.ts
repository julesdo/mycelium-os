import { PARAMETRES } from '../../lib/verticales/recouvrement/parametres';
import { regimePrescription } from '../../lib/verticales/recouvrement/pays/france/prescription';
import { initiales } from '../../ui/avatar';
import { dateRelative } from '../../ui/format';
import { JOUR_DES_SCENES, SCENES_DES_METIERS, type FamilleDeCarte } from '../scenes-metiers';
import { NOMS_DES_SECTEURS, PUBLICS_DES_SECTEURS, type SecteurPublic } from '../secteurs';
import { euros } from './vitrine-demo';

/**
 * LES QUATRE MÉTIERS DE LA SECTION, ET LA RÈGLE DE CHACUN (28/10/2026).
 *
 * ⚠️ LA RÈGLE DU MÉTIER SE LIT AU REGISTRE (`parametres.ts`), jamais dans la maquette :
 * - le transport : son délai pour agir (`regimePrescription`, un an contre cinq) ;
 * - le bâtiment : les frais de recouvrement par situation de travaux (`indemniteForfaitaire`) ;
 * - les services : ces frais sur douze factures mensuelles payées en retard ;
 * - le secteur public : le délai de paiement d'un hôpital (`delaisPaiementPublics`).
 *
 * Le nom, le public et la page de chaque métier viennent de `secteurs.ts` ; la carte d'exemple
 * est la carte mise en avant de sa scène (`scenes-metiers.ts`), celle de sa capture d'écran, et
 * elle dit sa date comme le produit (`dateRelative`). La maquette écrivait « 10:00 » sur la
 * carte des services, et des initiales que le produit ne compose pas (« ST », « CV » : l'avatar
 * prend les deux premiers mots, « SL », « CD »).
 */
/** « 1 an », « 41 j », « 40 € » : l'espace insécable de la maquette avant l'unité. */
const nb = (s: string) => s.replace(/ (ans|an|jours|j|€)(?!\p{L})/gu, '\u00a0$1');

function enEuros(cle: 'indemniteForfaitaire'): number {
	const v = PARAMETRES[cle].valeur;
	if (typeof v !== 'bigint') throw new Error(`Le registre ne donne pas « ${cle} » en centimes.`);
	return Number(v);
}
const frais = enEuros('indemniteForfaitaire') / 100;
const ans = (n: number) => `${n} an${n > 1 ? 's' : ''}`;
const transport = regimePrescription('TRANSPORT_MARCHANDISES').dureeAnnees;
const general = regimePrescription('GENERAL').dureeAnnees;
const sante = PARAMETRES.delaisPaiementPublics.valeur.SANTE;
/** Des factures mensuelles, toute une année. */
const FACTURES_DANS_L_ANNEE = 12;

const FAMILLE: Readonly<Record<FamilleDeCarte, string>> = {
	ARGENT: 'm-argent',
	TEMPS: 'm-temps',
	PAPIERS: 'm-papiers',
	ENVOI: 'm-envoi',
	QUESTION: 'm-question',
	MACHINE: 'm-machine'
};

interface Metier {
	readonly secteur: SecteurPublic;
	readonly nom: string;
	readonly public: string;
	readonly page: `/secteurs/${SecteurPublic}`;
	readonly regle: { readonly chiffre: string; readonly sous: string };
	readonly carte: {
		readonly initiales: string;
		readonly famille: string;
		readonly client: string;
		readonly montant: string;
		readonly libelle: string;
		readonly quand: string;
	};
	readonly photo: string;
	readonly description: string;
}

const REGLES: Readonly<Record<SecteurPublic, Metier['regle']>> = {
	'transport-routier': {
		chiffre: nb(ans(transport)),
		sous: nb(
			`pour agir en justice sur une facture de transport, contre ${ans(general)} pour la plupart des factures`
		)
	},
	batiment: {
		chiffre: nb(`${frais} €`),
		sous: 'de frais de recouvrement pour chaque situation de travaux payée en retard'
	},
	'services-aux-entreprises': {
		chiffre: nb(`${FACTURES_DANS_L_ANNEE * frais} €`),
		sous: 'de frais en un an, pour un client qui règle chaque facture mensuelle en retard'
	},
	'fournisseurs-publics': {
		chiffre: nb(`${sante} jours`),
		sous: 'pour qu’un hôpital vous paie\u202f; au-delà, des pénalités courent de plein droit'
	}
};

const ORDRE: readonly SecteurPublic[] = [
	'transport-routier',
	'batiment',
	'services-aux-entreprises',
	'fournisseurs-publics'
];

export const METIERS: Readonly<Record<SecteurPublic, Metier>> = Object.fromEntries(
	ORDRE.map((secteur) => {
		const scene = SCENES_DES_METIERS[secteur];
		const carte = scene.cartes[scene.enAvant];
		if (!carte)
			throw new Error(`La scène du métier « ${secteur} » n'a pas de carte mise en avant.`);
		return [
			secteur,
			{
				secteur,
				nom: NOMS_DES_SECTEURS[secteur],
				public: PUBLICS_DES_SECTEURS[secteur],
				page: `/secteurs/${secteur}`,
				regle: REGLES[secteur],
				carte: {
					initiales: initiales(carte.client),
					famille: FAMILLE[carte.famille],
					client: carte.client,
					montant: euros(Number(carte.montant)),
					libelle: carte.libelle,
					quand: nb(dateRelative(carte.date, JOUR_DES_SCENES))
				},
				photo: `/photos/${scene.photo}-1280.webp`,
				description: scene.descriptionPhoto
			}
		];
	})
) as Record<SecteurPublic, Metier>;
