import type { SecteurPublic } from './secteurs';
import type { PhotoSite, TeinteSite } from './section';

/**
 * LES SCÈNES DES PAGES MÉTIER (19/10/2026) : un établissement fictif par métier, ses
 * clients, ses factures et ses relances. Le fondateur : « des écrans de l'app spécifiques
 * aux secteurs, bien mis en scène, avec de fausses données de chaque secteur ».
 *
 * DEUX LECTEURS, UNE SEULE SOURCE. La salle d'exposition en fait l'écran « Aujourd'hui »
 * de chaque métier (`routes/-salle/metiers.tsx`), que `scripts/capturer-ecrans.ts`
 * photographie ; le site pose les mêmes cartes en flottant sur ses photos. La carte qu'on
 * lit sur la photo est donc celle qu'on retrouve dans la capture, au centime.
 *
 * ⚠️ DES NOMS INVENTÉS, ET DITS COMME TELS. Aucun acheteur public réel n'est nommé avec
 * une dette qu'il n'a pas : Valbrune, Lisseval et Belcombe n'existent pas. Les pages
 * portent « Exemple » sous chaque scène.
 *
 * ⚠️ AUCUN DÉBITEUR NE REMONTE (ligne rouge des surfaces tierces) : rien ici ne dit
 * qu'un client a ouvert un e-mail ou une page de paiement. Le logiciel ne le sait pas.
 */

/** Le jour où les scènes sont prises : celui de la salle (`routes/-salle/file.tsx`). */
export const JOUR_DES_SCENES = '2026-09-17';

export type FamilleDeCarte = 'ARGENT' | 'TEMPS' | 'PAPIERS' | 'ENVOI' | 'QUESTION' | 'MACHINE';

/** Une carte de l'écran « Aujourd'hui » : le client, le montant, ce qui se passe et sa date. */
export interface CarteDeScene {
	readonly client: string;
	/** En centimes. */
	readonly montant: bigint;
	/** Ce qui se passe, nommé en cinq mots au plus. */
	readonly libelle: string;
	readonly famille: FamilleDeCarte;
	readonly urgence: 'CRITIQUE' | 'HAUTE' | 'NORMALE';
	/** La date du fait : passée, le jour même, ou à venir. */
	readonly date: string;
}

/** Une facture que la tête de l'écran chiffre (par le domaine, dans la salle). */
export interface FactureDeScene {
	readonly reference: string;
	readonly client: string;
	/** En centimes, TTC. */
	readonly montant: bigint;
	readonly emission: string;
	readonly echeance: string;
}

export interface RelanceDeScene {
	readonly client: string;
	readonly etape: 'Rappel' | 'Deuxième rappel' | 'Lettre officielle';
	/** L'heure de départ, à Paris, le jour de la scène. */
	readonly heure: string;
}

export interface SceneDuMetier {
	/** L'établissement du gérant, dans l'exemple. */
	readonly etablissement: string;
	readonly photo: PhotoSite;
	readonly descriptionPhoto: string;
	/** `object-top`, quand le sujet de la photo est en haut. */
	readonly cadrage?: string;
	readonly teinte: TeinteSite;
	/** Les cartes de l'écran, dans l'ordre où la salle les donne. */
	readonly cartes: readonly CarteDeScene[];
	/** La carte qui flotte sur la photo : un indice dans `cartes`. */
	readonly enAvant: number;
	readonly relances: readonly RelanceDeScene[];
	/** Ce que Plume vient de lire, pour son bloc « Au travail ». */
	readonly lecture: {
		readonly factures: number;
		readonly reglements: number;
		readonly clients: number;
		readonly enRetard: number;
	};
	readonly factures: readonly FactureDeScene[];
	/** Le virement qui vient d'arriver, noté par le gérant : la seconde carte flottante. */
	readonly virement: { readonly client: string; readonly montant: bigint };
	/** Les factures publiques se chiffrent au barème de la commande publique. */
	readonly public?: true;
}

export const SCENES_DES_METIERS: Readonly<Record<SecteurPublic, SceneDuMetier>> = {
	'transport-routier': {
		etablissement: 'Transports Lemaire',
		photo: 'chauffeur',
		descriptionPhoto: 'Un chauffeur souriant au volant de sa camionnette, vitre baissée.',
		teinte: 'temps',
		cartes: [
			{
				client: 'Distribution Ménard',
				montant: 294_000n,
				libelle: 'Versement non reçu',
				famille: 'ARGENT',
				urgence: 'HAUTE',
				date: '2026-09-12'
			},
			{
				client: 'Logistique Arnaud',
				montant: 481_240n,
				libelle: 'Date limite pour agir',
				famille: 'TEMPS',
				urgence: 'CRITIQUE',
				date: '2026-10-28'
			},
			{
				client: 'Primeurs Vallon',
				montant: 128_650n,
				libelle: 'Rappel prêt à partir',
				famille: 'ENVOI',
				urgence: 'HAUTE',
				date: '2026-09-17'
			},
			{
				client: 'Cartonnages Rivière',
				montant: 9_712n,
				libelle: 'Payée en retard, frais dus',
				famille: 'ARGENT',
				urgence: 'NORMALE',
				date: '2026-09-17'
			},
			{
				client: 'Négoce Bréhat',
				montant: 96_000n,
				libelle: 'Échéance à venir',
				famille: 'TEMPS',
				urgence: 'NORMALE',
				date: '2026-09-27'
			}
		],
		enAvant: 1,
		relances: [
			{ client: 'Primeurs Vallon', etape: 'Rappel', heure: '10:00' },
			{ client: 'Distribution Ménard', etape: 'Deuxième rappel', heure: '10:15' }
		],
		lecture: { factures: 86, reglements: 31, clients: 14, enRetard: 9 },
		factures: [
			{
				reference: 'LV-2025-1043',
				client: 'Logistique Arnaud',
				montant: 481_240n,
				emission: '2025-10-28',
				echeance: '2025-11-27'
			},
			{
				reference: 'LV-2026-0214',
				client: 'Logistique Arnaud',
				montant: 236_800n,
				emission: '2026-02-10',
				echeance: '2026-03-12'
			},
			{
				reference: 'LV-2026-0388',
				client: 'Distribution Ménard',
				montant: 294_000n,
				emission: '2026-05-04',
				echeance: '2026-06-03'
			},
			{
				reference: 'LV-2026-0451',
				client: 'Primeurs Vallon',
				montant: 128_650n,
				emission: '2026-07-01',
				echeance: '2026-07-31'
			}
		],
		virement: { client: 'Cartonnages Rivière', montant: 341_000n }
	},

	batiment: {
		etablissement: 'Menuiserie Caron',
		photo: 'artisan',
		descriptionPhoto: 'Un menuisier souriant qui rabote une planche dans son atelier.',
		cadrage: 'object-top',
		teinte: 'abricot',
		cartes: [
			{
				client: 'Bérard Promotion',
				montant: 1_845_000n,
				libelle: 'Situation n° 3 impayée',
				famille: 'ARGENT',
				urgence: 'HAUTE',
				date: '2026-09-10'
			},
			{
				client: 'SCI Les Tilleuls',
				montant: 1_135_600n,
				libelle: 'Lettre officielle prête',
				famille: 'ENVOI',
				urgence: 'CRITIQUE',
				date: '2026-09-17'
			},
			{
				client: 'Hôtel des Arcades',
				montant: 348_000n,
				libelle: 'Rappel prêt à partir',
				famille: 'ENVOI',
				urgence: 'HAUTE',
				date: '2026-09-17'
			},
			{
				client: 'Syndic Moreau',
				montant: 6_812n,
				libelle: 'Payée en retard, frais dus',
				famille: 'ARGENT',
				urgence: 'NORMALE',
				date: '2026-09-17'
			},
			{
				client: 'Maisons Lefèvre',
				montant: 1_192_000n,
				libelle: 'Paiement promis le 30',
				famille: 'TEMPS',
				urgence: 'NORMALE',
				date: '2026-09-30'
			}
		],
		enAvant: 1,
		relances: [
			{ client: 'SCI Les Tilleuls', etape: 'Lettre officielle', heure: '10:00' },
			{ client: 'Hôtel des Arcades', etape: 'Rappel', heure: '10:15' }
		],
		lecture: { factures: 54, reglements: 22, clients: 11, enRetard: 7 },
		factures: [
			{
				reference: 'SIT-2026-03',
				client: 'Bérard Promotion',
				montant: 1_845_000n,
				emission: '2026-06-30',
				echeance: '2026-07-30'
			},
			{
				reference: 'FA-2025-402',
				client: 'SCI Les Tilleuls',
				montant: 412_000n,
				emission: '2025-11-05',
				echeance: '2025-12-05'
			},
			{
				reference: 'FA-2026-118',
				client: 'SCI Les Tilleuls',
				montant: 723_600n,
				emission: '2026-04-15',
				echeance: '2026-05-15'
			},
			{
				reference: 'FA-2026-097',
				client: 'Maisons Lefèvre',
				montant: 1_192_000n,
				emission: '2026-03-10',
				echeance: '2026-04-09'
			},
			{
				reference: 'FA-2026-131',
				client: 'Hôtel des Arcades',
				montant: 348_000n,
				emission: '2026-07-20',
				echeance: '2026-08-19'
			}
		],
		virement: { client: 'Syndic Moreau', montant: 264_000n }
	},

	'services-aux-entreprises': {
		etablissement: 'Propreté Delta',
		photo: 'proprete',
		descriptionPhoto: 'Un agent de propreté qui passe l’aspirateur dans des bureaux vitrés.',
		teinte: 'papiers',
		cartes: [
			{
				client: 'Biscuiterie Hélary',
				montant: 314_000n,
				libelle: 'Deuxième rappel sans réponse',
				famille: 'ENVOI',
				urgence: 'HAUTE',
				date: '2026-09-11'
			},
			{
				client: 'Hôtels Delmas',
				montant: 1_404_000n,
				libelle: 'Rappel prêt à partir',
				famille: 'ENVOI',
				urgence: 'CRITIQUE',
				date: '2026-09-17'
			},
			{
				client: 'Cabinet Roussel',
				montant: 8_436n,
				libelle: 'Payée en retard, frais dus',
				famille: 'ARGENT',
				urgence: 'NORMALE',
				date: '2026-09-17'
			},
			{
				client: 'Garage Peyrot',
				montant: 142_000n,
				libelle: 'Paiement promis le 25',
				famille: 'TEMPS',
				urgence: 'NORMALE',
				date: '2026-09-25'
			},
			{
				client: 'Clinique des Ormes',
				montant: 96_000n,
				libelle: 'Échéance à venir',
				famille: 'TEMPS',
				urgence: 'NORMALE',
				date: '2026-10-02'
			}
		],
		enAvant: 1,
		relances: [
			{ client: 'Hôtels Delmas', etape: 'Rappel', heure: '10:00' },
			{ client: 'Biscuiterie Hélary', etape: 'Lettre officielle', heure: '10:15' }
		],
		lecture: { factures: 112, reglements: 47, clients: 23, enRetard: 8 },
		factures: [
			{
				reference: 'FA-2026-161',
				client: 'Hôtels Delmas',
				montant: 540_000n,
				emission: '2026-04-03',
				echeance: '2026-05-03'
			},
			{
				reference: 'FA-2026-214',
				client: 'Hôtels Delmas',
				montant: 864_000n,
				emission: '2026-06-02',
				echeance: '2026-07-02'
			},
			{
				reference: 'FA-2025-379',
				client: 'Biscuiterie Hélary',
				montant: 98_000n,
				emission: '2025-12-01',
				echeance: '2025-12-31'
			},
			{
				reference: 'FA-2026-187',
				client: 'Biscuiterie Hélary',
				montant: 216_000n,
				emission: '2026-05-12',
				echeance: '2026-06-11'
			},
			{
				reference: 'FA-2026-233',
				client: 'Garage Peyrot',
				montant: 142_000n,
				emission: '2026-07-08',
				echeance: '2026-08-07'
			}
		],
		virement: { client: 'Cabinet Roussel', montant: 186_000n }
	},

	'fournisseurs-publics': {
		etablissement: 'Médical Fournitures Ouest',
		photo: 'hopital',
		descriptionPhoto:
			'Une employée souriante qui pousse un chariot de fournitures dans un couloir d’hôpital.',
		teinte: 'argent',
		cartes: [
			{
				client: 'CHU de Valbrune',
				montant: 1_926_500n,
				libelle: 'Délai de paiement dépassé',
				famille: 'TEMPS',
				urgence: 'HAUTE',
				date: '2026-09-08'
			},
			{
				client: 'Commune de Lisseval',
				montant: 32_416n,
				libelle: 'Demande de paiement prête',
				famille: 'ENVOI',
				urgence: 'CRITIQUE',
				date: '2026-09-17'
			},
			{
				client: 'EHPAD Les Glycines',
				montant: 24_812n,
				libelle: 'Payée en retard, pénalités dues',
				famille: 'ARGENT',
				urgence: 'NORMALE',
				date: '2026-09-17'
			},
			{
				client: 'Ville de Belcombe',
				montant: 486_000n,
				libelle: 'Délai de paiement à venir',
				famille: 'TEMPS',
				urgence: 'NORMALE',
				date: '2026-10-05'
			}
		],
		enAvant: 0,
		relances: [
			{ client: 'CHU de Valbrune', etape: 'Rappel', heure: '10:00' },
			{ client: 'Commune de Lisseval', etape: 'Rappel', heure: '10:15' }
		],
		lecture: { factures: 138, reglements: 96, clients: 9, enRetard: 6 },
		factures: [
			{
				reference: 'FA-2026-076',
				client: 'CHU de Valbrune',
				montant: 1_284_000n,
				emission: '2026-05-20',
				echeance: '2026-07-09'
			},
			{
				reference: 'FA-2026-091',
				client: 'CHU de Valbrune',
				montant: 642_500n,
				emission: '2026-06-15',
				echeance: '2026-08-04'
			},
			{
				reference: 'FA-2026-058',
				client: 'Commune de Lisseval',
				montant: 418_000n,
				emission: '2026-04-08',
				echeance: '2026-05-08'
			}
		],
		virement: { client: 'EHPAD Les Glycines', montant: 712_000n },
		public: true
	}
};
