import { useState } from 'react';
import { EcranProcedure, type ProcedureDeLaCreance } from '../../screens/analyses/procedure';
import {
	libelleEvenement,
	suivreProcedure,
	type EvenementSurvenu
} from '../../lib/verticales/recouvrement/apres-procedure';
import type { ConditionsDeduites } from '../../lib/verticales/recouvrement/deduction';
import { PROCEDURES } from '../../lib/verticales/recouvrement/procedures';
import type { EtatRechercheAvocat, EtatRechercheCommissaire } from '../../ui';
import { AVOCATS_DEMO, BARREAUX_DEMO, CARNET_DEMO, ETUDES_DEMO, voieDeLaCreance } from './communes';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * LES ENTRÉES DE LA FAMILLE, DÉCLARÉES AVANT TOUT CE QUI S'EN CALCULE.
 *
 * ⚠️ LA PROCÉDURE MONTRE UNE AUTRE CRÉANCE QUE LA FAMILLE CRÉANCE. Celle de
 * `creance.tsx` attend encore la confirmation de la qualité de commerçant : le
 * domaine n'y rend pas l'injonction envisageable, et la montrer engagée
 * contredirait sa rangée, qui pose encore la question. Celle-ci est une créance
 * qu'on a pu engager : ses quatre conditions sont acquises, et son débiteur est
 * déclaré sain (`SAINE`).
 *
 * Tout ce que la famille montre se calcule depuis ces entrées, par les fonctions
 * que les requêtes du produit appellent : le suivi comme `lireSuivi` le rejoue,
 * les voies comme `creanceComplete` les liste. Ne reste écrit que ce qu'aucune
 * fonction ne produit : le nom du débiteur, ses conditions, la voie engagée et
 * le jour de son engagement, les faits du journal, et le jour de la
 * démonstration.
 *
 * La santé du débiteur n'a pas de constante : aucune fonction qui alimente cette
 * page ne la lit. `creanceComplete` la passe à `qualifier()` et aux relances,
 * que la page de procédure ne montre pas.
 */

/** Le débiteur, nommé une seule fois pour toute la famille : celui de la démonstration de la voie. */
const DEBITEUR_DEMO = 'Ateliers Martin';

/**
 * Les quatre conditions de la créance, acquises. Avec elles, le domaine rend
 * l'injonction envisageable, et sa feuille offre « Je l'ai engagée ».
 */
const CONDITIONS_DEMO: ConditionsDeduites = {
	certaine: 'ok',
	liquide: 'ok',
	exigible: 'ok',
	entreCommercants: 'ok'
};

/** La voie que le gérant a déclarée engagée (`engagerProcedure`). */
const PROCEDURE_ENGAGEE_DEMO = 'injonction-de-payer';

/** Le jour qu'il a déclaré : l'origine des délais tant qu'aucun fait n'a fait avancer la machine. */
const ENGAGEE_LE_DEMO = '2025-12-15';

/**
 * Le jour de la démonstration, figé : un « dans N jours » qui bouge chaque matin
 * ne se compare plus d'une capture à l'autre.
 */
const AUJOURD_HUI_DEMO = '2026-03-02';

/**
 * Le journal : l'ordonnance rendue, pas encore signifiée. C'est l'état où court
 * la caducité, l'échéance la plus dangereuse du produit.
 */
const JOURNAL_DEMO: readonly EvenementSurvenu[] = [
	{ cle: 'ordonnance-rendue', survenuLe: '2026-01-10' }
];

/**
 * Les formes nommées du journal. « voie terminée » : le même journal, puis
 * l'ordonnance signifiée et l'absence d'opposition constatée. La machine arrive
 * au titre exécutoire, terminal : aucune échéance, aucune suite, et l'angle mort
 * de la durée du titre.
 */
const FORMES_JOURNAL_DEMO: Readonly<Record<string, readonly EvenementSurvenu[]>> = {
	'voie terminée': [
		...JOURNAL_DEMO,
		{ cle: 'ordonnance-signifiee', survenuLe: '2026-01-20' },
		{ cle: 'absence-opposition-constatee', survenuLe: '2026-02-25' }
	]
};

/**
 * Le suivi, tel que `lireSuivi` le rend (`src/lib/convex/recouvrement/apresProcedure.ts`,
 * lignes 61 à 104) : le journal trié par date du fait, rejoué par
 * `suivreProcedure`, recopié champ par champ, et chaque fait nommé par
 * `libelleEvenement`. Une clé inconnue garde sa clé, comme dans le produit.
 */
function suiviDepuisJournal(evenements: readonly EvenementSurvenu[]) {
	const journal = [...evenements].sort((a, b) =>
		a.survenuLe < b.survenuLe ? -1 : a.survenuLe > b.survenuLe ? 1 : 0
	);
	const suivi = suivreProcedure(PROCEDURE_ENGAGEE_DEMO, journal, ENGAGEE_LE_DEMO);

	return {
		etat: suivi.etat,
		libelle: suivi.libelle,
		constat: suivi.constat,
		depuisLe: suivi.depuisLe,
		echeances: suivi.echeances.map((echeance) => ({ ...echeance })),
		anglesMorts: [...suivi.anglesMorts],
		suites: suivi.suites.map((suite) => ({ ...suite })),
		terminal: suivi.terminal,
		journal: journal.map((evenement) => ({
			...evenement,
			libelle: libelleEvenement(PROCEDURE_ENGAGEE_DEMO, evenement.cle) ?? evenement.cle
		}))
	};
}

/** Les voies, les mêmes dans les trois formes : toutes, disponibles ou non, évaluées sur les seules conditions. */
const VOIES_DEMO = Object.values(PROCEDURES).map((procedure) =>
	voieDeLaCreance(procedure, CONDITIONS_DEMO)
);

/**
 * ⚠️ LES FEUILLES ET LES RECHERCHES PARTENT TOUTES FERMÉES. La démonstration les
 * tient dans ses états, comme la route, et les ouvre au geste : un rendu serveur
 * de la salle ne doit dépendre d'aucune feuille ouverte.
 *
 * Les recherches répondent avec les listes que montrent leurs démonstrations de
 * composant. Les gestes qui écriraient en base n'écrivent rien : quand la route
 * referme une feuille sur un succès, celle-ci la referme aussi, et les données
 * ne bougent pas.
 */
function ProcedureDemo({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	const [voieOuverte, setVoieOuverte] = useState<string | null>(null);
	const [declaree, setDeclaree] = useState<string | null>(null);
	const [carnetOuvert, setCarnetOuvert] = useState(false);
	const [rechercheOuverte, setRechercheOuverte] = useState(false);
	const [etatRecherche, setEtatRecherche] = useState<EtatRechercheCommissaire>({ phase: 'REPOS' });
	const [rechercheAvocatOuverte, setRechercheAvocatOuverte] = useState(false);
	const [barreau, setBarreau] = useState('');
	const [specialite, setSpecialite] = useState('');

	// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état, comme
	// dans `creance.tsx`.
	const journal = formeDemo(variante, JOURNAL_DEMO, FORMES_JOURNAL_DEMO);

	const voie = VOIES_DEMO.find((procedure) => procedure.cle === voieOuverte) ?? null;
	const voieDeclaree = VOIES_DEMO.find((procedure) => procedure.cle === declaree) ?? null;
	// Comme la route : sans barreau choisi, aucune recherche n'est demandée.
	const etatAvocats: EtatRechercheAvocat =
		barreau === '' ? { phase: 'AUCUN_BARREAU' } : { phase: 'TROUVE', resultat: AVOCATS_DEMO };

	const commun: Omit<ProcedureDeLaCreance, 'suivi'> = {
		debiteur: DEBITEUR_DEMO,
		procedures: VOIES_DEMO,
		carnet: CARNET_DEMO,
		// Aucun intervenant rattaché : la route relit alors « Moi-même ».
		intervenantChoisi: null,
		nomIntervenant: null,
		enCours: false,
		erreur: null,
		aujourdHui: AUJOURD_HUI_DEMO,
		voieOuverte: voie,
		voieDeclaree,
		carnetOuvert,
		rechercheOuverte,
		etatRecherche,
		rechercheAvocatOuverte,
		repertoire: BARREAUX_DEMO,
		barreau,
		specialite,
		etatAvocats,
		onOuvrirVoie: (cle) => setVoieOuverte(cle),
		onFermerVoie: () => setVoieOuverte(null),
		onDeclarerVoie: () => setDeclaree(voie?.cle ?? null),
		onFermerDeclaration: () => setDeclaree(null),
		onDeclarer: () => {
			setDeclaree(null);
			setVoieOuverte(null);
		},
		onConsigner: () => undefined,
		onOuvrirCarnet: () => setCarnetOuvert(true),
		onFermerCarnet: () => setCarnetOuvert(false),
		onRattacher: () => setCarnetOuvert(false),
		onAjouter: () => undefined,
		onOublier: () => undefined,
		onOuvrirRechercheCommissaire: () => setRechercheOuverte(true),
		onFermerRechercheCommissaire: () => setRechercheOuverte(false),
		onChercherCommissaire: () => setEtatRecherche({ phase: 'TROUVE', resultat: ETUDES_DEMO }),
		onRetenirEtude: () => setRechercheOuverte(false),
		onOuvrirRechercheAvocat: () => setRechercheAvocatOuverte(true),
		onFermerRechercheAvocat: () => setRechercheAvocatOuverte(false),
		onChoisirBarreau: (choisi) => {
			setBarreau(choisi);
			setSpecialite('');
		},
		onChoisirSpecialite: (choisie) => setSpecialite(choisie),
		onRetenirAvocat: () => setRechercheAvocatOuverte(false)
	};

	return (
		<EcranProcedure
			identifiant="demo"
			donnees={lectureDemo(
				etat,
				{ ...commun, suivi: suiviDepuisJournal(journal) },
				{ ...commun, suivi: null }
			)}
		/>
	);
}

export const ECRANS_PROCEDURE: readonly EcranDuProduit[] = [
	{
		route: '/app/creance_/$id/procedure',
		libelle: 'procédure',
		vide: true,
		variantes: Object.keys(FORMES_JOURNAL_DEMO),
		Demo: ProcedureDemo
	}
];
