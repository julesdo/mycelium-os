import { useState } from 'react';
import { EcranAujourdhuiAdmin, type ResumeDuJour } from '../../screens/admin/aujourdhui';
import {
	EcranComptes,
	type AffichageComptes,
	type LigneCompte,
	type VueComptes
} from '../../screens/admin/comptes';
import { EcranFicheCompte, type DonneesFicheCompte } from '../../screens/admin/fiche-compte';
import {
	EcranProspects,
	type LigneProspect,
	type AffichageProspects,
	type VueProspects
} from '../../screens/admin/prospects';
import { EcranFicheProspect, type DonneesFicheProspect } from '../../screens/admin/fiche-prospect';
import { ParcoursImport } from '../../screens/admin/import';
import { ParcoursTrouver, type EntrepriseAffichee } from '../../screens/admin/trouver';
import { EcranTaches } from '../../screens/admin/taches';
import { EcranEquipe, type MembreDeLEquipe } from '../../screens/admin/equipe';
import { EcranJournal, type EntreeDuJournal } from '../../screens/admin/journal';
import type { TacheAffichee } from '../../screens/admin/commun';
import { bornesDuJourDeParis } from '../../lib/admin/dates';
import { BarreLateraleAdmin } from '../../app/coquille-admin';
import { lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * L'ADMIN DANS LA SALLE (16/10/2026) : chaque écran de l'équipe avec des données
 * de démonstration, pour le regard aux quatre largeurs. Les noms sont inventés ;
 * aucune donnée réelle n'entre ici.
 */

const MAINTENANT = Date.UTC(2026, 9, 16, 8, 30);
const { debut: DEBUT, fin: FIN } = bornesDuJourDeParis(MAINTENANT);
const HEURE = 3_600_000;
const JOUR = 24 * HEURE;
const RIEN = () => undefined;
const RIEN_ASYNC = async () => undefined;

const TACHES: TacheAffichee[] = [
	{
		id: 't1',
		titre: 'Appeler',
		pour: MAINTENANT - 2 * JOUR,
		origine: 'SCORE',
		assigneA: 'jules@letikette.com',
		fiche: { type: 'COMPTE', id: 'c1', libelle: 'Garnier Bâtiment' }
	},
	{
		id: 't2',
		titre: 'Envoyer la grille des formules',
		pour: MAINTENANT + 3 * HEURE,
		origine: 'MAIN',
		assigneA: 'camille@letikette.com',
		fiche: { type: 'PROSPECT', id: 'p2', libelle: 'Cabinet Morel Expertise' }
	},
	{
		id: 't3',
		titre: 'Relancer après le salon',
		pour: MAINTENANT + 4 * JOUR,
		origine: 'MAIN',
		assigneA: 'jules@letikette.com',
		fiche: { type: 'PROSPECT', id: 'p1', libelle: 'Transports Lemaire' }
	},
	{
		id: 't4',
		titre: 'Appeler',
		pour: MAINTENANT - 3 * JOUR,
		faiteLe: MAINTENANT - JOUR,
		origine: 'SCORE',
		assigneA: 'jules@letikette.com',
		fiche: { type: 'COMPTE', id: 'c2', libelle: 'Imprimerie Delorme' }
	}
];

const RESUME: ResumeDuJour = {
	taches: TACHES.filter((t) => t.faiteLe === undefined && t.pour < FIN),
	aAppeler: [
		{
			id: 'c1',
			nom: 'Garnier Bâtiment',
			score: 78,
			raison: 'Factures échues trouvées, relances activées'
		},
		{ id: 'c3', nom: 'Atelier Brunet', score: 64, raison: 'Essai commencé il y a 6 jours' }
	],
	inscrits: [
		{ id: 'c4', nom: 'Menuiserie Caron', source: 'Recherche Google', le: MAINTENANT - 2 * HEURE },
		{ id: 'c5', nom: 'Fournitures Pichon', source: 'Article du blog', le: MAINTENANT - JOUR },
		{ id: 'c6', nom: 'Hôtel des Lices', source: 'Direct', le: MAINTENANT - 4 * JOUR }
	]
};

function DemoAujourdhui({ etat }: { etat: EtatDemo }) {
	return (
		<EcranAujourdhuiAdmin
			lecture={lectureDemo(etat, RESUME, { taches: [], aAppeler: [], inscrits: [] })}
			maintenant={MAINTENANT}
			debutDuJour={DEBUT}
			finDuJour={FIN}
			onCocher={RIEN}
		/>
	);
}

const COMPTES: LigneCompte[] = [
	{
		id: 'c1',
		nom: 'Garnier Bâtiment',
		siren: '123456789',
		formule: 'Équipe',
		etape: 'Relances activées',
		etapes: ['INSCRIT', 'ENTREPRISE', 'FACTURES_DEPOSEES', 'MONTANT_REVELE', 'RELANCES_ACTIVEES'],
		score: 78,
		source: 'Recherche Google',
		inscritLe: MAINTENANT - 20 * JOUR
	},
	{
		id: 'c3',
		nom: 'Atelier Brunet',
		formule: 'Solo · essai',
		etape: 'Essai commencé',
		etapes: ['INSCRIT', 'ENTREPRISE', 'FACTURES_DEPOSEES', 'ESSAI'],
		score: 64,
		source: 'Article du blog',
		inscritLe: MAINTENANT - 6 * JOUR
	},
	{
		id: 'c4',
		nom: 'Menuiserie Caron',
		formule: 'Découverte',
		etape: 'Entreprise renseignée',
		etapes: ['INSCRIT', 'ENTREPRISE'],
		score: 22,
		source: 'Recherche Google',
		inscritLe: MAINTENANT - 2 * HEURE
	},
	{
		id: 'c2',
		nom: 'Imprimerie Delorme',
		formule: 'Pro',
		etape: 'Abonné',
		etapes: [
			'INSCRIT',
			'ENTREPRISE',
			'FACTURES_DEPOSEES',
			'MONTANT_REVELE',
			'RELANCES_ACTIVEES',
			'ESSAI',
			'ABONNE'
		],
		score: 91,
		source: 'Recommandation',
		inscritLe: MAINTENANT - 120 * JOUR
	}
];

function DemoComptes({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	const [vue, setVue] = useState<VueComptes>('TOUS');
	const [terme, setTerme] = useState('');
	const [affichage, setAffichage] = useState<AffichageComptes>(
		variante === 'kanban' || variante === 'entonnoir' || variante === 'cartes'
			? variante
			: 'tableau'
	);
	return (
		<EcranComptes
			lecture={lectureDemo(etat, COMPTES, [])}
			vue={vue}
			onVue={setVue}
			affichage={affichage}
			onAffichage={setAffichage}
			terme={terme}
			onTerme={setTerme}
			maintenant={MAINTENANT}
		/>
	);
}

const FICHE_COMPTE: DonneesFicheCompte = {
	fiche: {
		id: 'c1',
		nom: 'Garnier Bâtiment',
		siren: '123456789',
		ville: 'Rennes',
		inscritLe: MAINTENANT - 20 * JOUR,
		formule: 'Équipe',
		rythme: 'Au mois',
		prochainPrelevementLe: MAINTENANT + 10 * JOUR,
		source: 'Recherche Google',
		pageEntree: '/blog/indemnite-forfaitaire-40-euros',
		score: 78,
		raisonsDuScore: ['factures échues trouvées', 'relances activées', 'deux visites cette semaine'],
		etapes: [
			{ etape: 'INSCRIT', libelle: 'Inscrit', le: MAINTENANT - 20 * JOUR },
			{ etape: 'ENTREPRISE', libelle: 'Entreprise renseignée', le: MAINTENANT - 20 * JOUR },
			{ etape: 'FACTURES_DEPOSEES', libelle: 'Factures déposées', le: MAINTENANT - 19 * JOUR },
			{ etape: 'MONTANT_REVELE', libelle: 'Factures échues trouvées', le: MAINTENANT - 19 * JOUR },
			{ etape: 'RELANCES_ACTIVEES', libelle: 'Relances activées', le: MAINTENANT - 12 * JOUR },
			{ etape: 'ESSAI', libelle: 'Essai commencé', le: MAINTENANT - 12 * JOUR },
			{ etape: 'ABONNE', libelle: 'Abonné' },
			{ etape: 'MONTEE_EN_GAMME', libelle: 'Montée en gamme' },
			{ etape: 'RESILIE', libelle: 'Résilié' },
			{ etape: 'RECONQUIS', libelle: 'Reconquis' }
		],
		membres: [
			{
				nom: 'Paul Garnier',
				email: 'paul@garnier-batiment.fr',
				role: 'Administrateur',
				derniereVisite: MAINTENANT - 3 * HEURE
			},
			{ nom: 'Léa Martin', email: 'compta@garnier-batiment.fr', role: 'Membre' }
		],
		conseils: [
			{ cle: 'bienvenue', le: MAINTENANT - 20 * JOUR },
			{ cle: 'ce-qui-vous-est-du', le: MAINTENANT - 18 * JOUR }
		]
	},
	historique: [
		{
			id: 'e1',
			type: 'APPEL',
			texte: 'Content des relances, demande si l’on gère plusieurs établissements.',
			auteur: 'jules@letikette.com',
			le: MAINTENANT - HEURE
		},
		{
			id: 'e2',
			type: 'NOTE',
			texte: 'À rappeler avant la fin de l’essai.',
			auteur: 'camille@letikette.com',
			le: MAINTENANT - 2 * JOUR
		}
	],
	taches: TACHES.filter((t) => t.fiche?.id === 'c1')
};

function DemoFicheCompte({ etat }: { etat: EtatDemo }) {
	return (
		<EcranFicheCompte
			lecture={lectureDemo(etat, FICHE_COMPTE)}
			maintenant={MAINTENANT}
			finDuJour={FIN}
			gestes={{ onNoter: RIEN_ASYNC, onCreerTache: RIEN_ASYNC, onCocher: RIEN }}
		/>
	);
}

const PROSPECTS: LigneProspect[] = [
	{
		id: 'p1',
		entreprise: 'Transports Lemaire',
		ville: 'Nantes',
		activite: 'Transport routier de fret',
		cible: 'PME',
		statut: 'CONTACTE',
		prochaineAction: 'Relancer',
		prochaineActionLe: MAINTENANT + 4 * JOUR,
		responsable: 'jules@letikette.com'
	},
	{
		id: 'p2',
		entreprise: 'Cabinet Morel Expertise',
		ville: 'Angers',
		activite: 'Expertise comptable',
		cible: 'CABINET',
		statut: 'INTERESSE',
		prochaineAction: 'Envoyer la grille',
		prochaineActionLe: MAINTENANT + 3 * HEURE,
		responsable: 'camille@letikette.com'
	},
	{
		id: 'p3',
		entreprise: 'Boulangerie Ferrand',
		ville: 'Laval',
		activite: 'Boulangerie',
		cible: 'PME',
		statut: 'A_CONTACTER'
	},
	{
		id: 'p4',
		entreprise: 'Plomberie Royer',
		ville: 'Le Mans',
		cible: 'PME',
		statut: 'A_CONTACTER',
		prochaineAction: 'Appeler',
		prochaineActionLe: MAINTENANT - JOUR
	},
	{
		id: 'p5',
		entreprise: 'Garnier Bâtiment',
		ville: 'Rennes',
		cible: 'PME',
		statut: 'INSCRIT',
		compteId: 'c1'
	}
];

const EQUIPE_DEMO = ['camille@letikette.com', 'jules@letikette.com'];

function DemoProspects({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	const [vue, setVue] = useState<VueProspects>('TOUS');
	const [affichage, setAffichage] = useState<AffichageProspects>(
		variante === 'kanban' || variante === 'entonnoir' || variante === 'liste' ? variante : 'tableau'
	);
	const [terme, setTerme] = useState('');
	// Les statuts tenus en mémoire : une carte glissée reste où on l'a posée.
	const [prospects, setProspects] = useState(PROSPECTS);
	const [selection, setSelection] = useState<ReadonlySet<string>>(
		new Set(variante === 'sélection' ? ['p3', 'p4'] : [])
	);
	return (
		<EcranProspects
			lecture={lectureDemo(etat, prospects, [])}
			vue={vue}
			onVue={setVue}
			affichage={affichage}
			onAffichage={setAffichage}
			terme={terme}
			onTerme={setTerme}
			selection={selection}
			onSelection={setSelection}
			equipe={EQUIPE_DEMO}
			maintenant={MAINTENANT}
			gestes={{
				onChangerStatut: (ids, statut) =>
					setProspects((liste) => liste.map((p) => (ids.includes(p.id) ? { ...p, statut } : p))),
				onAssigner: RIEN,
				onAjouter: RIEN
			}}
		/>
	);
}

const FICHE_PROSPECT: DonneesFicheProspect = {
	fiche: {
		...(PROSPECTS[1] as LigneProspect),
		siren: '512345678',
		effectif: '6 à 9 salariés',
		dirigeant: 'Hélène Morel',
		fonction: 'Expert-comptable associée',
		email: 'contact@morel-expertise.fr',
		telephone: '02 41 00 00 00',
		site: 'morel-expertise.fr',
		trouveOu: 'Annuaire de l’Ordre des experts-comptables',
		notes: 'Canal : e-mail. Modèle : cabinet-1.',
		dernierContactLe: MAINTENANT - 2 * JOUR,
		creeLe: MAINTENANT - 9 * JOUR,
		creePar: 'jules@letikette.com'
	},
	historique: [
		{
			id: 'h1',
			type: 'STATUT',
			texte: 'INTERESSE',
			auteur: 'camille@letikette.com',
			le: MAINTENANT - 2 * JOUR
		},
		{
			id: 'h2',
			type: 'REPONSE',
			texte: 'Intéressée pour ses clients artisans, veut voir les tarifs.',
			auteur: 'camille@letikette.com',
			le: MAINTENANT - 2 * JOUR - HEURE
		},
		{
			id: 'h3',
			type: 'EMAIL',
			texte: 'Premier e-mail, modèle cabinet-1.',
			auteur: 'jules@letikette.com',
			le: MAINTENANT - 8 * JOUR
		}
	],
	taches: TACHES.filter((t) => t.fiche?.id === 'p2')
};

/** Un transporteur trouvé à l'annuaire, jamais contacté : la feuille « E-mail » porte le modèle. */
const FICHE_A_ECRIRE: DonneesFicheProspect = {
	fiche: {
		...(PROSPECTS[0] as LigneProspect),
		entreprise: 'TRANSPORTS MOREAU ET FILS',
		activite: 'Transports routiers de fret de proximité (49.41B)',
		statut: 'A_CONTACTER',
		siren: '512345678',
		effectif: '20 à 49 salariés',
		ville: 'Paris',
		dirigeant: 'Claire Moreau',
		fonction: 'Gérante',
		email: 'contact@transports-moreau.fr',
		trouveOu: 'Annuaire des entreprises (data.gouv.fr), le 18/10/2026',
		creeLe: MAINTENANT - JOUR,
		creePar: 'jules@letikette.com'
	},
	historique: [],
	taches: []
};

function DemoFicheProspect({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	return (
		<EcranFicheProspect
			lecture={lectureDemo(etat, variante === 'a-ecrire' ? FICHE_A_ECRIRE : FICHE_PROSPECT)}
			maintenant={MAINTENANT}
			finDuJour={FIN}
			gestes={{
				onNoter: RIEN_ASYNC,
				onCreerTache: RIEN_ASYNC,
				onCocher: RIEN,
				onChangerStatut: RIEN,
				onModifier: RIEN_ASYNC,
				onStop: RIEN_ASYNC,
				onChercherAuRegistre: async () => [],
				onEmailEcrit: RIEN_ASYNC
			}}
			signataire={{ prenom: 'Jules', fondateur: true }}
		/>
	);
}

const TROUVEES_DEMO: readonly EntrepriseAffichee[] = [
	{
		siren: '799531322',
		entreprise: '37 EXPRESS',
		activite: 'Transports routiers de fret interurbains (49.41A)',
		effectif: '10 à 19 salariés',
		ville: 'Aubervilliers',
		connue: false
	},
	{
		siren: '512345678',
		entreprise: 'TRANSPORTS MOREAU ET FILS',
		activite: 'Transports routiers de fret de proximité (49.41B)',
		effectif: '20 à 49 salariés',
		ville: 'Paris',
		dirigeant: 'Claire Moreau',
		fonction: 'Gérante',
		connue: false
	},
	{
		siren: '423456789',
		entreprise: 'LOGISTIQUE DU CANAL',
		activite: 'Transports routiers de fret interurbains (49.41A)',
		effectif: '6 à 9 salariés',
		ville: 'Pantin',
		dirigeant: 'Karim Benali',
		fonction: 'Président',
		connue: true
	}
];

function DemoTrouver() {
	return (
		<ParcoursTrouver
			onFermer={RIEN}
			onChercher={async () => ({ pages: 90, derniere: 1, entreprises: TROUVEES_DEMO })}
			onAjouter={async (_s, _z, e) => ({ importes: e.length, ecartes: 0 })}
		/>
	);
}

function DemoImport() {
	return (
		<ParcoursImport
			onFermer={RIEN}
			onVerifier={async () => ({ aImporter: 0, ecartees: [], apercu: [] })}
			onImporter={async () => ({ importes: 0, ecartes: 0 })}
			historique={[
				{
					fichier: 'prospection-octobre.csv',
					importes: 42,
					ecartes: 3,
					par: 'jules@letikette.com',
					le: MAINTENANT - 5 * JOUR
				}
			]}
		/>
	);
}

function DemoTaches({ etat }: { etat: EtatDemo }) {
	return (
		<EcranTaches
			lecture={lectureDemo(etat, TACHES, [])}
			maintenant={MAINTENANT}
			debutDuJour={DEBUT}
			finDuJour={FIN}
			onCocher={RIEN}
			onCreer={RIEN_ASYNC}
		/>
	);
}

const MEMBRES: MembreDeLEquipe[] = [
	{
		email: 'jules@letikette.com',
		nom: 'Jules',
		role: 'FONDATEUR',
		invitePar: 'amorçage',
		inviteLe: MAINTENANT - 2 * JOUR,
		rejointLe: MAINTENANT - 2 * JOUR,
		doubleAuth: true,
		moi: true
	},
	{
		email: 'camille@letikette.com',
		nom: 'Camille',
		role: 'SUPPORT',
		invitePar: 'jules@letikette.com',
		inviteLe: MAINTENANT - JOUR,
		rejointLe: MAINTENANT - JOUR,
		doubleAuth: false,
		moi: false
	},
	{
		email: 'alex@letikette.com',
		role: 'LECTURE',
		invitePar: 'jules@letikette.com',
		inviteLe: MAINTENANT - 3 * HEURE,
		doubleAuth: false,
		moi: false
	}
];

function DemoEquipe({ etat }: { etat: EtatDemo }) {
	return (
		<EcranEquipe
			lecture={lectureDemo(etat, MEMBRES)}
			onInviter={RIEN_ASYNC}
			onChangerRole={RIEN_ASYNC}
			onRetirer={RIEN_ASYNC}
		/>
	);
}

const JOURNAL: EntreeDuJournal[] = [
	{
		auteur: 'camille@letikette.com',
		action: 'FICHE_OUVERTE',
		cible: { type: 'COMPTE', id: 'c1', libelle: 'Garnier Bâtiment' },
		le: MAINTENANT - HEURE
	},
	{
		auteur: 'jules@letikette.com',
		action: 'IMPORT',
		cible: { type: 'IMPORT', libelle: 'prospection-octobre.csv' },
		le: MAINTENANT - 2 * HEURE
	},
	{
		auteur: 'jules@letikette.com',
		action: 'MEMBRE_INVITE',
		cible: { type: 'MEMBRE', libelle: 'alex@letikette.com' },
		le: MAINTENANT - JOUR
	}
];

function DemoJournal({ etat }: { etat: EtatDemo }) {
	const [auteur, setAuteur] = useState<string | null>(null);
	return (
		<EcranJournal
			lecture={lectureDemo(
				etat,
				JOURNAL.filter((e) => auteur === null || e.auteur === auteur),
				[]
			)}
			auteur={auteur}
			onAuteur={setAuteur}
			membres={EQUIPE_DEMO}
			maintenant={MAINTENANT}
		/>
	);
}

/** La barre latérale du CRM, seule : la salle rend ses écrans dans la coquille de l'application. */
function DemoBarreLaterale({ variante }: { etat: EtatDemo; variante?: string }) {
	const [reduite, setReduite] = useState(variante === 'repliée');
	return (
		<div className="flex h-160 overflow-hidden">
			<BarreLateraleAdmin
				role="FONDATEUR"
				chemin="/admin/prospects"
				recherche={variante === 'vue allumée' ? { vue: 'A_RELANCER' } : {}}
				compteurs={{
					tachesDues: 3,
					comptes: 42,
					aAppeler: 5,
					enEssai: 7,
					prospects: 128,
					sansAction: 14,
					aRelancer: 6,
					interesses: 9,
					supportAVous: 2,
					supportOuvertes: 3,
					supportEnAttente: 4,
					supportPlume: 1
				}}
				reduite={reduite}
				onBasculer={() => setReduite(!reduite)}
			/>
			<p className="p-cladd-xs text-cladd-xs text-cladd-fg-soft lg:hidden">
				La barre latérale ne paraît qu’au-delà de 1024 px.
			</p>
		</div>
	);
}

export const ECRANS_ADMIN: readonly EcranDuProduit[] = [
	{
		route: '/admin/',
		cle: 'admin-barre-laterale',
		libelle: 'admin · barre latérale',
		vide: false,
		variantes: ['vue allumée', 'repliée'],
		Demo: DemoBarreLaterale
	},
	{ route: '/admin/', libelle: 'admin · aujourd’hui', vide: true, Demo: DemoAujourdhui },
	{
		route: '/admin/comptes/',
		libelle: 'admin · comptes',
		vide: true,
		variantes: ['kanban', 'cartes', 'entonnoir'],
		Demo: DemoComptes
	},
	{
		route: '/admin/comptes/$id',
		libelle: 'admin · fiche d’un compte',
		vide: false,
		Demo: DemoFicheCompte
	},
	{
		route: '/admin/prospects/',
		libelle: 'admin · prospects',
		vide: true,
		variantes: ['kanban', 'liste', 'entonnoir', 'sélection'],
		Demo: DemoProspects
	},
	{
		route: '/admin/prospects/$id',
		libelle: 'admin · fiche d’un prospect',
		vide: false,
		variantes: ['a-ecrire'],
		Demo: DemoFicheProspect
	},
	{ route: '/admin/prospects/importer', libelle: 'admin · import', vide: false, Demo: DemoImport },
	{
		route: '/admin/prospects/trouver',
		libelle: 'admin · annuaire',
		vide: false,
		Demo: DemoTrouver
	},
	{ route: '/admin/taches', libelle: 'admin · tâches', vide: true, Demo: DemoTaches },
	{ route: '/admin/equipe', libelle: 'admin · équipe', vide: false, Demo: DemoEquipe },
	{ route: '/admin/journal', libelle: 'admin · journal', vide: true, Demo: DemoJournal }
];
