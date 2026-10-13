import { useState } from 'react';
import {
	EcranSanteClient,
	EcranSanteClients,
	EcranVerifierEntreprise,
	type AnalyseDeSante,
	type SanteClientAffichee,
	type SanteClientsAffichee
} from '../../screens/sante';
import {
	analyserLeRisque,
	type EntreesDeLAnalyse,
	type FicheEntreprise,
	type ParcoursDirigeant
} from '../../lib/verticales/recouvrement/risque/analyse';
import {
	santeDuPortefeuille,
	type ClientDuPortefeuille
} from '../../lib/verticales/recouvrement/risque/portefeuille';
import type { EcranDuProduit, EtatDemo } from './demo';

/**
 * LA SANTÉ DES CLIENTS DANS LA SALLE — le portefeuille, un client, une entreprise
 * à vérifier, chacun dans ses formes.
 *
 * ⚠️ LES ANALYSES VIENNENT DU MOTEUR, PAS D'UNE COPIE. Chaque fiche ci-dessous
 * passe par `analyserLeRisque`, et le portefeuille par `santeDuPortefeuille` :
 * écrire un indice ou un fait à la main en ferait une seconde vérité, qui
 * divergerait au premier réglage des règles.
 */

const AUJOURDHUI = '2026-10-13';
const MAINTENANT = Date.UTC(2026, 9, 13, 9, 30);
const JOUR = 86_400_000;

const DURAND: FicheEntreprise = {
	siren: '443061841',
	denomination: 'Fournitures Durand',
	formeJuridique: 'SARL, société à responsabilité limitée',
	personneMorale: true,
	dateCreation: '2019-03-04',
	fermee: false,
	procedureEnCours: false,
	procedures: [],
	comptes: [
		{
			anneeCloture: 2025,
			dateCloture: '2025-12-31',
			dateDepot: '2026-07-09',
			confidentiels: false,
			resultatConfidentiel: false
		}
	],
	exercices: [
		{
			annee: 2025,
			dateCloture: '2025-12-31',
			chiffreAffaires: 612_000_00n,
			resultat: -82_400_00n,
			tresorerie: -12_300_00n,
			autonomieFinancierePct: 7,
			liquiditeGenerale: 0.82,
			delaiFournisseursJours: 104,
			croissancePct: -24
		},
		{ annee: 2024, chiffreAffaires: 805_000_00n, resultat: -9_800_00n },
		{ annee: 2023, chiffreAffaires: 790_000_00n, resultat: 21_000_00n }
	],
	actifNetSousMoitie: { enCours: true, depuis: '2025-12-31' },
	dirigeants: [
		{
			nomComplet: 'Marc Durand',
			nom: 'Durand',
			prenom: 'Marc',
			personneMorale: false,
			qualites: ['Gérant'],
			depuis: '2019-03-04',
			naissance: { annee: 1974, mois: 6 }
		},
		{ nomComplet: 'Holding MD', personneMorale: true, siren: '552100554', qualites: ['Associé'] }
	],
	releveLe: AUJOURDHUI
};

const DIRIGEANT_DURAND: ParcoursDirigeant = {
	nomComplet: 'Marc Durand',
	qualites: ['Gérant'],
	depuis: '2019-03-04',
	rapprochement: 'IDENTIFIE',
	societesTotal: 6,
	societes: [
		{
			siren: '853479236',
			denomination: 'MD Négoce',
			enActivite: false,
			creeLe: '2017-02-01',
			fermeeLe: '2018-06-30'
		},
		{
			siren: '502592959',
			denomination: 'Durand Bureautique',
			enActivite: false,
			creeLe: '2014-01-10',
			fermeeLe: '2016-09-01'
		},
		{ siren: '552100554', denomination: 'Holding MD', enActivite: true }
	],
	procedures: [
		{
			siren: '853479236',
			denomination: 'MD Négoce',
			dateParution: '2018-05-14',
			nature: 'Jugement d’ouverture de liquidation judiciaire',
			url: 'https://www.bodacc.fr/'
		},
		{
			siren: '502592959',
			denomination: 'Durand Bureautique',
			dateParution: '2016-07-02',
			nature: 'Jugement d’ouverture de redressement judiciaire',
			url: 'https://www.bodacc.fr/'
		}
	]
};

const DELORME: FicheEntreprise = {
	siren: '552100554',
	denomination: 'Imprimerie Delorme',
	formeJuridique: 'SAS, société par actions simplifiée',
	personneMorale: true,
	dateCreation: '2003-05-12',
	fermee: false,
	procedureEnCours: false,
	procedures: [],
	comptes: [
		{
			anneeCloture: 2025,
			dateCloture: '2025-12-31',
			dateDepot: '2026-06-20',
			confidentiels: false,
			resultatConfidentiel: false
		}
	],
	exercices: [
		{
			annee: 2025,
			chiffreAffaires: 420_000_00n,
			resultat: 38_500_00n,
			tresorerie: 64_000_00n,
			autonomieFinancierePct: 46,
			liquiditeGenerale: 1.8,
			delaiFournisseursJours: 38,
			croissancePct: 12
		},
		{ annee: 2024, chiffreAffaires: 375_000_00n, resultat: 29_000_00n },
		{ annee: 2023, chiffreAffaires: 351_000_00n, resultat: 24_100_00n }
	],
	actifNetSousMoitie: { enCours: false },
	dirigeants: [
		{
			nomComplet: 'Claire Delorme',
			nom: 'Delorme',
			prenom: 'Claire',
			personneMorale: false,
			qualites: ['Présidente'],
			depuis: '2003-05-12',
			naissance: { annee: 1971, mois: 4 }
		}
	],
	releveLe: AUJOURDHUI
};

const MARTIN: FicheEntreprise = {
	siren: '853479236',
	denomination: 'Atelier Martin',
	formeJuridique: 'SAS, société par actions simplifiée',
	personneMorale: true,
	dateCreation: '2022-09-01',
	fermee: false,
	procedureEnCours: false,
	procedures: [],
	comptes: [
		{
			anneeCloture: 2025,
			dateCloture: '2025-12-31',
			confidentiels: true,
			resultatConfidentiel: false
		}
	],
	exercices: [],
	actifNetSousMoitie: { enCours: false },
	dirigeants: [
		{
			nomComplet: 'Léa Martin',
			nom: 'Martin',
			prenom: 'Léa',
			personneMorale: false,
			qualites: ['Présidente'],
			depuis: '2026-07-01'
		}
	],
	releveLe: AUJOURDHUI
};

function analyseDemo(entrees: EntreesDeLAnalyse, historique: readonly number[]): AnalyseDeSante {
	const a = analyserLeRisque(entrees);
	const indices = [...historique, a.indice];
	return {
		siren: entrees.fiche.siren,
		analyseLe: MAINTENANT,
		...(historique.length === 0 ? {} : { indicePrecedent: historique[historique.length - 1]! }),
		historique: indices.map((indice, i) => ({
			le: MAINTENANT - (indices.length - 1 - i) * 30 * JOUR,
			indice
		})),
		denomination: entrees.fiche.denomination,
		...(entrees.fiche.formeJuridique === undefined
			? {}
			: { formeJuridique: entrees.fiche.formeJuridique }),
		...(entrees.fiche.dateCreation === undefined
			? {}
			: { dateCreation: entrees.fiche.dateCreation }),
		indice: a.indice,
		niveau: a.niveau,
		faits: a.faits,
		piliers: a.piliers,
		lisibilite: a.lisibilite,
		...(a.lisibiliteRaison === null ? {} : { lisibiliteRaison: a.lisibiliteRaison }),
		dirigeants: entrees.dirigeants.map((d) => ({
			nomComplet: d.nomComplet,
			qualites: d.qualites,
			...(d.depuis === undefined ? {} : { depuis: d.depuis }),
			rapprochement: d.rapprochement,
			...(d.societesTotal === undefined ? {} : { societesTotal: d.societesTotal }),
			societesActives: d.societes.filter((s) => s.enActivite).length,
			societes: d.societes.map((s) => ({
				siren: s.siren,
				denomination: s.denomination,
				enActivite: s.enActivite
			})),
			procedures: d.procedures
		})),
		exercices: entrees.fiche.exercices.slice(0, 3),
		comptesConfidentiels: entrees.fiche.comptes[0]?.confidentiels === true,
		versionDesRegles: a.versionDesRegles
	};
}

/** La forme principale : une entreprise à regarder, sans être perdue. */
const DURAND_PRUDENCE: FicheEntreprise = {
	...DURAND,
	exercices: [
		{
			annee: 2025,
			dateCloture: '2025-12-31',
			chiffreAffaires: 612_000_00n,
			resultat: -18_400_00n,
			tresorerie: 21_300_00n,
			autonomieFinancierePct: 18,
			liquiditeGenerale: 1.1,
			delaiFournisseursJours: 72,
			croissancePct: 12
		},
		{ annee: 2024, chiffreAffaires: 546_000_00n, resultat: 9_800_00n },
		{ annee: 2023, chiffreAffaires: 498_000_00n, resultat: 21_000_00n }
	],
	actifNetSousMoitie: { enCours: false }
};

const ANALYSE_PRUDENCE = analyseDemo(
	{
		fiche: DURAND_PRUDENCE,
		dirigeants: [
			{ ...DIRIGEANT_DURAND, procedures: DIRIGEANT_DURAND.procedures.slice(0, 1) },
			{
				nomComplet: 'Holding MD',
				qualites: ['Associé'],
				rapprochement: 'PERSONNE_MORALE',
				societes: [],
				procedures: []
			}
		],
		paiements: { habitudeJours: 22, echantillon: 9, plusVieuxRetardJours: 64, facturesEnRetard: 2 },
		aujourdHui: AUJOURDHUI
	},
	[61, 55]
);

const ANALYSE_DURAND = analyseDemo(
	{
		fiche: DURAND,
		dirigeants: [
			DIRIGEANT_DURAND,
			{
				nomComplet: 'Holding MD',
				qualites: ['Associé'],
				rapprochement: 'PERSONNE_MORALE',
				societes: [],
				procedures: []
			}
		],
		paiements: { habitudeJours: 34, echantillon: 9, plusVieuxRetardJours: 97, facturesEnRetard: 3 },
		aujourdHui: AUJOURDHUI
	},
	[61, 55]
);

const ANALYSE_DELORME = analyseDemo(
	{
		fiche: DELORME,
		dirigeants: [
			{
				nomComplet: 'Claire Delorme',
				qualites: ['Présidente'],
				depuis: '2003-05-12',
				rapprochement: 'IDENTIFIE',
				societesTotal: 2,
				societes: [{ siren: '443061841', denomination: 'Delorme Immo', enActivite: true }],
				procedures: []
			}
		],
		paiements: {
			habitudeJours: 1,
			echantillon: 22,
			plusVieuxRetardJours: null,
			facturesEnRetard: 0
		},
		aujourdHui: AUJOURDHUI
	},
	[84]
);

const ANALYSE_MARTIN = analyseDemo(
	{
		fiche: MARTIN,
		dirigeants: [
			{
				nomComplet: 'Léa Martin',
				qualites: ['Présidente'],
				depuis: '2026-07-01',
				rapprochement: 'SANS_NAISSANCE',
				societes: [],
				procedures: []
			}
		],
		paiements: null,
		aujourdHui: AUJOURDHUI
	},
	[]
);

const ANALYSE_EN_PROCEDURE = analyseDemo(
	{
		fiche: {
			...DELORME,
			denomination: 'Transports Vidal',
			procedureEnCours: true,
			procedures: [{ type: 'Redressement judiciaire', debut: '2026-09-22' }]
		},
		dirigeants: [],
		paiements: { habitudeJours: 12, echantillon: 6, plusVieuxRetardJours: 64, facturesEnRetard: 2 },
		aujourdHui: AUJOURDHUI
	},
	[58]
);

// ── UN CLIENT ─────────────────────────────────────────────────────────────

const ENTETE_CLIENT = {
	genre: 'poussee',
	retour: { vers: '/app/risque', libelle: 'La santé de vos clients' },
	titre: 'Sa santé'
} as const;

const CLIENT_BASE: SanteClientAffichee = {
	mode: 'CLIENT',
	denomination: DURAND.denomination,
	siren: DURAND.siren,
	disponible: true,
	analyse: ANALYSE_PRUDENCE,
	encours: 31_200_50n,
	plafond: 25_000_00n,
	enCours: false,
	message: null,
	onAnalyser: () => undefined,
	onFixerPlafond: async () => true,
	onDemanderAPlume: () => undefined
};

const FORMES_CLIENT: Readonly<Record<string, SanteClientAffichee>> = {
	'risque élevé': { ...CLIENT_BASE, analyse: ANALYSE_DURAND },
	'rien à signaler': {
		...CLIENT_BASE,
		denomination: DELORME.denomination,
		siren: DELORME.siren,
		analyse: ANALYSE_DELORME,
		encours: 4_120_00n,
		plafond: null
	},
	'en procédure': {
		...CLIENT_BASE,
		denomination: 'Transports Vidal',
		analyse: ANALYSE_EN_PROCEDURE,
		encours: 12_480_33n,
		plafond: null
	},
	'comptes confidentiels': {
		...CLIENT_BASE,
		denomination: MARTIN.denomination,
		siren: MARTIN.siren,
		analyse: { ...ANALYSE_MARTIN },
		encours: 2_400_00n,
		plafond: null
	},
	'pas encore analysé': { ...CLIENT_BASE, analyse: null, plafond: null },
	'sans SIREN': {
		...CLIENT_BASE,
		siren: null,
		analyse: null,
		plafond: null,
		onOuvrirLaFiche: () => undefined
	},
	'non activée': { ...CLIENT_BASE, disponible: false, analyse: null }
};

function DemoClient({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	const valeur = variante === undefined ? CLIENT_BASE : FORMES_CLIENT[variante];
	if (valeur === undefined)
		throw new Error(`Démonstration incomplète : aucune variante « ${variante ?? ''} ».`);
	if (etat === 'attente' || etat === 'erreur')
		return <EcranSanteClient entete={ENTETE_CLIENT} donnees={{ etat }} />;
	return <EcranSanteClient entete={ENTETE_CLIENT} donnees={{ etat: 'pret', valeur }} />;
}

// ── LE PORTEFEUILLE ──────────────────────────────────────────────────────

const CLIENTS: readonly ClientDuPortefeuille[] = [
	{
		id: 'durand',
		nom: 'Fournitures Durand',
		siren: DURAND.siren,
		encours: 31_200_50n,
		plafond: 25_000_00n,
		analyse: {
			indice: ANALYSE_PRUDENCE.indice,
			niveau: ANALYSE_PRUDENCE.niveau,
			analyseLe: MAINTENANT,
			indicePrecedent: 55,
			niveauPrecedent: 'A_SURVEILLER',
			faitPrincipal: 'Capitaux propres entamés'
		}
	},
	{
		id: 'vidal',
		nom: 'Transports Vidal',
		siren: '502592959',
		encours: 12_480_33n,
		plafond: null,
		analyse: {
			indice: ANALYSE_EN_PROCEDURE.indice,
			niveau: ANALYSE_EN_PROCEDURE.niveau,
			analyseLe: MAINTENANT,
			indicePrecedent: 58,
			niveauPrecedent: 'A_SURVEILLER',
			faitPrincipal: 'Procédure en cours'
		}
	},
	{
		id: 'delorme',
		nom: 'Imprimerie Delorme',
		siren: DELORME.siren,
		encours: 4_120_00n,
		plafond: 15_000_00n,
		analyse: {
			indice: ANALYSE_DELORME.indice,
			niveau: ANALYSE_DELORME.niveau,
			analyseLe: MAINTENANT,
			indicePrecedent: 84,
			niveauPrecedent: 'RIEN_A_SIGNALER',
			faitPrincipal: null
		}
	},
	{
		id: 'martin',
		nom: 'Atelier Martin',
		siren: MARTIN.siren,
		encours: 2_400_00n,
		plafond: null,
		analyse: null
	},
	{
		id: 'bastide',
		nom: 'Bastide & fils',
		siren: null,
		encours: 6_900_00n,
		plafond: null,
		analyse: null
	}
];

function portefeuilleDemo(
	clients: readonly ClientDuPortefeuille[],
	disponible: boolean
): SanteClientsAffichee {
	const sante = santeDuPortefeuille(clients, MAINTENANT);
	return {
		disponible,
		indice: sante.indice,
		niveau: sante.niveau,
		encoursTotal: sante.encoursTotal,
		encoursAnalyse: sante.encoursAnalyse,
		repartition: sante.repartition,
		couverture: sante.couverture,
		missions: sante.missions.map((m) => ({
			cle: m.cle,
			titre: m.titre,
			detail: m.detail,
			faits: m.faits,
			total: m.total,
			...(m.prochain === null
				? {}
				: {
						geste: {
							libelle:
								m.cle === 'ANALYSE' && m.total - m.faits > 1
									? `Analyser les ${m.total - m.faits} restants`
									: m.cle === 'ANALYSE'
										? `Analyser ${m.prochain.nom}`
										: `Continuer avec ${m.prochain.nom}`,
							onClick: () => undefined
						}
					})
		})),
		aRegarder: sante.aRegarder,
		changements: sante.changements,
		message: null
	};
}

const FORMES_PORTEFEUILLE: Readonly<Record<string, SanteClientsAffichee>> = {
	'premier jour': portefeuilleDemo(
		CLIENTS.map((c) => ({ ...c, analyse: null, plafond: null })),
		true
	),
	'non activée': portefeuilleDemo(CLIENTS, false)
};

function DemoPortefeuille({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	if (etat === 'attente' || etat === 'erreur') return <EcranSanteClients donnees={{ etat }} />;
	const valeur =
		variante === undefined ? portefeuilleDemo(CLIENTS, true) : FORMES_PORTEFEUILLE[variante];
	if (valeur === undefined)
		throw new Error(`Démonstration incomplète : aucune variante « ${variante ?? ''} ».`);
	return <EcranSanteClients donnees={{ etat: 'pret', valeur }} />;
}

// ── VÉRIFIER UNE ENTREPRISE ──────────────────────────────────────────────

function DemoVerifier({ variante }: { etat: EtatDemo; variante?: string }) {
	const [terme, setTerme] = useState(variante === 'résultats' ? 'Martin' : '');
	if (variante === 'analysée') {
		return (
			<EcranSanteClient
				entete={{
					genre: 'poussee',
					retour: { vers: '/app/risque/verifier', libelle: 'Vérifier une entreprise' },
					titre: MARTIN.denomination
				}}
				donnees={{
					etat: 'pret',
					valeur: {
						mode: 'ENTREPRISE',
						denomination: MARTIN.denomination,
						siren: MARTIN.siren,
						disponible: true,
						analyse: ANALYSE_MARTIN,
						enCours: false,
						message: null,
						onAnalyser: () => undefined
					}
				}}
			/>
		);
	}
	return (
		<EcranVerifierEntreprise
			recherche={{
				terme,
				onTerme: setTerme,
				onChercher: () => undefined,
				enCours: false,
				resultats:
					variante === 'résultats'
						? [
								{ siren: '853479236', denomination: 'Atelier Martin', ville: 'Lyon' },
								{ siren: '502592959', denomination: 'Martin Frères', ville: 'Bordeaux' }
							]
						: null,
				erreur: null,
				onChoisir: () => undefined
			}}
		/>
	);
}

export const ECRANS_SANTE: readonly EcranDuProduit[] = [
	{
		route: '/app/risque/',
		libelle: 'la santé de vos clients',
		vide: false,
		variantes: Object.keys(FORMES_PORTEFEUILLE),
		Demo: DemoPortefeuille
	},
	{
		route: '/app/risque/$id',
		libelle: 'sa santé',
		vide: false,
		variantes: Object.keys(FORMES_CLIENT),
		Demo: DemoClient
	},
	{
		route: '/app/risque/verifier',
		libelle: 'vérifier une entreprise',
		vide: false,
		variantes: ['résultats', 'analysée'],
		Demo: DemoVerifier
	}
];
