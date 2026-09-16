import type { RecentAffiche, ResultatRechercheAffiche } from '../../ui';
import { bougesDuFlux } from '../../ui';
import { additionner, depuisCentimes, enCentimes, ZERO } from '../../lib/socle/montants';
import { normaliserFournisseur } from '../../lib/socle/normalisation';
import {
	normaliserSiren,
	sirenDepuisSiret
} from '../../lib/verticales/recouvrement/pays/france/siren';
import { PROCEDURES } from '../../lib/verticales/recouvrement/procedures';
import { EVENEMENTS_DEMO } from './communes';

/**
 * LA RECHERCHE, DANS LA SALLE D'EXPOSITION.
 *
 * ⚠️ LES RÉPONSES SE CALCULENT, ELLES NE SE RECOPIENT PAS. Le terme passe par
 * les fonctions mêmes du serveur (`normaliserFournisseur`, `normaliserSiren`,
 * `sirenDepuisSiret`), les encours par `additionner`, le nom des procédures par
 * le référentiel, et les récents par `bougesDuFlux` sur le flux de
 * démonstration : ce qu'on regarde ici est ce que la barre montrerait.
 *
 * ⚠️ LE DÉCOUPAGE DU PLEIN TEXTE, LUI, EST APPROCHÉ. Convex découpe et classe à
 * sa façon ; la démonstration cherche un mot qui commence par un mot tapé. Elle
 * sert à regarder les états de la palette, pas à prédire un classement.
 *
 * Les noms et les SIREN sont ceux des autres démonstrations : les quatre
 * « Martin » sont les candidats que le registre rend réellement pour ce nom,
 * et ils font déborder la famille (« Voir tout »).
 */

interface DebiteurDemo {
	readonly id: string;
	readonly denomination: string;
	readonly siren?: string;
}

const DEBITEURS: readonly DebiteurDemo[] = [
	{ id: 'demo-debiteur', denomination: 'Fournitures Durand', siren: '853479236' },
	{ id: 'demo-martin', denomination: 'Ateliers Martin' },
	{ id: 'demo-boulangerie-martin', denomination: 'Boulangerie Martin', siren: '421931452' },
	{ id: 'demo-saint-martin', denomination: 'Boulangerie Saint Martin', siren: '805188000' },
	{ id: 'demo-victor-martin', denomination: 'Boulangerie Victor Martin', siren: '803938745' }
];

const FACTURES = [
	// Celle du flux : 249,90 €, échue le 1er août.
	{
		id: 'demo-fa-0311',
		reference: 'FA-2026-0311',
		debiteurId: 'demo-debiteur',
		dateEcheance: '2026-08-01',
		resteDu: 24_990n
	},
	{
		id: 'demo-fa-0087',
		reference: 'FA-2021-0087',
		debiteurId: 'demo-debiteur',
		dateEcheance: '2021-08-14',
		resteDu: 924_000n
	},
	{
		id: 'demo-fa-0412',
		reference: 'FA-2026-0412',
		debiteurId: 'demo-martin',
		dateEcheance: '2026-05-30',
		resteDu: 1_845_000n
	}
] as const;

const DOSSIERS = [
	{
		creanceId: 'demo-creance-martin',
		cle: 'injonction-de-payer',
		debiteurId: 'demo-martin',
		prochaineEcheance: '2026-09-12'
	},
	{
		creanceId: 'demo-creance-durand',
		cle: 'injonction-de-payer',
		debiteurId: 'demo-debiteur',
		prochaineEcheance: null
	}
] as const;

function nomDu(debiteurId: string): string {
	return DEBITEURS.find((d) => d.id === debiteurId)?.denomination ?? 'Débiteur inconnu';
}

function encoursDu(debiteurId: string): bigint {
	const restes = FACTURES.filter((f) => f.debiteurId === debiteurId).map((f) =>
		depuisCentimes(f.resteDu)
	);
	return enCentimes(restes.length > 0 ? additionner(...restes) : ZERO);
}

/** Un mot du nom commence-t-il par un mot du terme ? Les deux passent par la normalisation du serveur. */
function nomRepond(denomination: string, nom: string): boolean {
	const mots = normaliserFournisseur(denomination).split(' ');
	return nom.split(' ').some((tape) => tape !== '' && mots.some((mot) => mot.startsWith(tape)));
}

export function chercherDansLaDemo(terme: string): ResultatRechercheAffiche {
	const cherche = terme.trim();
	const siren = normaliserSiren(cherche) ?? sirenDepuisSiret(cherche);
	const nom = normaliserFournisseur(cherche);

	const debiteurs =
		cherche === ''
			? []
			: DEBITEURS.filter(
					(d) => (siren !== null && d.siren === siren) || nomRepond(d.denomination, nom)
				);
	const factures =
		cherche === ''
			? []
			: FACTURES.filter((f) => f.reference.toLowerCase().includes(cherche.toLowerCase()));

	const debiteursTrouves = new Set(debiteurs.map((d) => d.id));
	const facturesTrouvees = new Set(factures.map((f) => f.debiteurId));
	const dossiers = DOSSIERS.filter(
		(dossier) =>
			debiteursTrouves.has(dossier.debiteurId) || facturesTrouvees.has(dossier.debiteurId)
	);

	return {
		debiteurs: {
			total: debiteurs.length,
			borne: false,
			premiers: debiteurs.map((d) => ({ ...d, encours: encoursDu(d.id) }))
		},
		factures: {
			total: factures.length,
			borne: false,
			premiers: factures.map((f) => ({ ...f, debiteur: nomDu(f.debiteurId) }))
		},
		procedures: {
			total: dossiers.length,
			borne: false,
			premiers: dossiers.map((dossier) => ({
				creanceId: dossier.creanceId,
				procedure: PROCEDURES[dossier.cle].nom,
				debiteur: nomDu(dossier.debiteurId),
				prochaineEcheance: dossier.prochaineEcheance
			}))
		}
	};
}

/** Les récents : le flux de démonstration, lu par la fonction de la barre. */
export const RECENTS_DEMO: readonly RecentAffiche[] = bougesDuFlux(EVENEMENTS_DEMO).map(
	(bouge) => ({ ...bouge, denomination: nomDu(bouge.id) })
);
