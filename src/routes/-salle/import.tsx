import type { ReactNode } from 'react';
import { EcranDepot } from '../../screens/import/depot';
import { EcranImport, type ImportAffiche, type LigneDepot } from '../../screens/import/depots';
import type { EnvoiAffiche } from '../../screens/import/envois';
import type { BilanDepotAffiche, DepotAffiche } from '../../ui';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';
import {
	DEPOTS_DEMO,
	DEPOT_A_ECARTS_DEMO,
	DEPOT_EN_COURS_DEMO,
	DEPOT_EN_ECHEC_DEMO,
	DEPOT_PARFAIT_DEMO,
	type DepotDemo
} from './depots';

/**
 * L'IMPORT ET LE BILAN D'UN DÉPÔT.
 *
 * Les dépôts sont ceux de `depots.ts`, que la démonstration des quatre états
 * d'un dépôt montre aussi côte à côte. Ne se compose ici que ce que les deux
 * routes composent, dans l'ordre où leurs requêtes le rendent.
 */

/**
 * ⚠️ DEUX CORRECTIONS DE FIDÉLITÉ, POSÉES ICI PLUTÔT QUE DANS `depots.ts`.
 *
 * `depots.ts` sert aussi la démonstration de la CARTE de bilan
 * (`showroom.tsx`), et cette tâche-ci ne touche pas à ses fichiers. Les deux
 * corrections vivent donc dans la famille de l'import, avec la raison qui les
 * justifie ; elles ont vocation à remonter dans les données elles-mêmes.
 *
 * ── 1. LES RAISONS DE LA DÉMONSTRATION N'ÉTAIENT PAS CELLES DE LA PRODUCTION
 *
 * `depots.ts` écrit « Ligne 4128 : montant illisible (« 1 2З0,00 » — un З
 * cyrillique). » — une phrase qui NOMME la ligne et cite son contenu. Aucun
 * chemin du produit ne compose ça. Le lecteur d'export
 * (`verticales/recouvrement/import/exportComptable.ts`) écrit exactement
 * quatre raisons, toutes génériques : « Montant illisible en débit ou en
 * crédit. », « Date de pièce et date d'écriture illisibles, ou absentes du
 * calendrier. », etc. Ce qui identifie la ligne n'est PAS la raison, c'est le
 * `texte` brut conservé à côté.
 *
 * La salle montrait donc un écran qui se débrouillait bien avec des données
 * qu'il ne recevra jamais, et masquait le défaut qu'elle existe pour attraper :
 * l'interface jetait le `texte` et n'affichait que la raison, donc deux lignes
 * perdues sur dix mille donnaient deux fois la même phrase et rien pour
 * retrouver laquelle.
 *
 * ── 2. UNE LECTURE EN COURS DATÉE DE HUIT JOURS N'EST PAS UNE LECTURE EN COURS
 *
 * `DEPOT_EN_COURS_DEMO` porte une date figée au 9 septembre. Sur l'écran
 * refait, un dépôt encore en lecture huit jours après son dépôt est — à juste
 * titre — signalé « sans nouvelle » : la tâche est tombée. La forme principale
 * a donc besoin d'un dépôt RÉCENT pour qu'on puisse regarder la lecture
 * normale, et la variante muette d'un dépôt ancien pour regarder l'autre.
 */

/** L'instant du chargement de la salle. Les deux lectures s'y rapportent. */
const MAINTENANT = Date.now();

const RAISONS_REELLES: BilanDepotAffiche['ignorees'] = [
	{
		texte: '"2026";"VE";"4128";"20260312";"411DURAND";"Durand Menuiserie";"FA-2026-0188";"1 2З0,00";"0,00"',
		raison: 'Montant illisible en débit ou en crédit.'
	},
	{
		texte: '"2026";"VE";"4310";"";"411LEROY";"Leroy TP";"FA-2026-0203";"4 980,00";"0,00"',
		raison: 'Date de pièce et date d’écriture illisibles, ou absentes du calendrier.'
	}
];

const DEPOT_A_ECARTS: DepotDemo = {
	...DEPOT_A_ECARTS_DEMO,
	bilan:
		DEPOT_A_ECARTS_DEMO.bilan === undefined
			? undefined
			: { ...DEPOT_A_ECARTS_DEMO.bilan, ignorees: RAISONS_REELLES }
};

/** Une lecture qui vient de partir : l'étape bouge, rien à signaler. */
const DEPOT_EN_LECTURE: DepotDemo = {
	...DEPOT_EN_COURS_DEMO,
	deposeLe: MAINTENANT - 40_000
};

/** Une lecture tombée : son étape ne changera plus jamais. */
const DEPOT_MUET: DepotDemo = {
	...DEPOT_EN_COURS_DEMO,
	id: 'd5',
	filename: 'FA-2026-0419.pdf',
	deposeLe: MAINTENANT - 3 * 60 * 60_000
};

/**
 * Les rangées de l'import, telles que `listerImports` les rend : le dépôt le plus
 * récent d'abord (`src/lib/convex/recouvrement/depotMutations.ts`, lignes 167 à
 * 171), avec sa date de dépôt.
 */
function rangeeDe(depot: DepotDemo): LigneDepot {
	return {
		_id: depot.id,
		filename: depot.filename,
		mode: depot.mode,
		statut: depot.statut,
		etape: depot.etape,
		erreur: depot.erreur,
		bilan: depot.bilan,
		deposeLe: depot.deposeLe
	};
}

const DEPOTS_DE_LA_SALLE: readonly DepotDemo[] = DEPOTS_DEMO.map((depot) => {
	if (depot.id === DEPOT_A_ECARTS_DEMO.id) return DEPOT_A_ECARTS;
	if (depot.id === DEPOT_EN_COURS_DEMO.id) return DEPOT_EN_LECTURE;
	return depot;
});

const LIGNES_DEPOTS_DEMO: readonly LigneDepot[] = [...DEPOTS_DE_LA_SALLE]
	.sort((a, b) => b.deposeLe - a.deposeLe)
	.map(rangeeDe);

/** La même liste, plus la lecture qui ne dit plus rien. */
const LIGNES_AVEC_MUET: readonly LigneDepot[] = [rangeeDe(DEPOT_MUET), ...LIGNES_DEPOTS_DEMO];

/**
 * LES FICHIERS EN ROUTE, QUI N'EXISTAIENT NULLE PART.
 *
 * ⚠️ C'EST LE SEUL MOMENT DU PRODUIT QUE LE GÉRANT PASSE À ATTENDRE, et il
 * n'avait aucune représentation : l'écran ne recevait qu'un booléen. Les trois
 * états se regardent maintenant côte à côte, y compris celui qu'on ne peut pas
 * provoquer à volonté — un envoi refusé par le stockage.
 */
const ENVOIS_DEMO: readonly EnvoiAffiche[] = [
	{
		cle: 'envoi-1',
		nom: 'FEC-2026-T3.txt',
		taille: 18_400_000,
		etat: 'ENVOI',
		avancement: 0.42
	},
	{ cle: 'envoi-2', nom: 'export-ventes-septembre.csv', taille: 240_000, etat: 'ATTENTE' },
	{
		cle: 'envoi-3',
		nom: 'photo-facture.heic',
		taille: 3_900_000,
		etat: 'ECHEC',
		erreur: 'L’envoi n’a pas abouti : vérifiez votre connexion.'
	}
];

/**
 * L'import : une seule zone de dépôt, plus rien à choisir avant l'envoi. Le
 * chemin se déduit du fichier (`modeDuFichier`), et la rangée de chaque dépôt
 * dit après coup par où il est passé.
 */
const GESTES_INERTES = {
	onDeposer: () => undefined,
	onReessayer: () => undefined
} as const;

const FORMES_IMPORT: Readonly<Record<string, ImportAffiche>> = {
	'envois en route': {
		...GESTES_INERTES,
		imports: LIGNES_DEPOTS_DEMO,
		envois: ENVOIS_DEMO
	},
	'lecture sans nouvelle': {
		...GESTES_INERTES,
		imports: LIGNES_AVEC_MUET,
		envois: []
	}
};

function ImportDemo({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	const principale: ImportAffiche = {
		...GESTES_INERTES,
		imports: LIGNES_DEPOTS_DEMO,
		envois: []
	};

	return (
		<EcranImport
			// Comme la route sur `/app/import-factures` : aucun dépôt ouvert, pas de volet droit.
			detail={null}
			depotOuvert={null}
			donnees={lectureDemo<ImportAffiche>(
				etat,
				formeDemo(variante, principale, FORMES_IMPORT),
				// Le vide : un établissement qui n'a encore rien déposé.
				{ ...GESTES_INERTES, imports: [], envois: [] }
			)}
		/>
	);
}

/**
 * La page d'un dépôt, composée comme sa route la compose
 * (`src/routes/app/import-factures.$id.tsx`) : la date de dépôt n'accompagne que
 * ce qui est encore en lecture, seul cas où la page s'en sert.
 */
function pageDe(depot: DepotDemo): DepotAffiche {
	const enLecture = depot.statut !== 'TERMINE' && depot.statut !== 'ECHOUE';
	return {
		id: depot.id,
		filename: depot.filename,
		statut: depot.statut,
		etape: depot.etape,
		erreur: depot.erreur,
		bilan: depot.bilan,
		...(enLecture ? { deposeLe: depot.deposeLe } : {})
	};
}

/** Les formes nommées de la page : les autres dépôts, chacun dans son état. */
const FORMES_DEPOT_DEMO: Readonly<Record<string, DepotAffiche>> = {
	'import parfait': pageDe(DEPOT_PARFAIT_DEMO),
	'lecture en cours': pageDe(DEPOT_EN_LECTURE),
	'lecture sans nouvelle': pageDe(DEPOT_MUET),
	'lecture en échec': pageDe(DEPOT_EN_ECHEC_DEMO)
};

/**
 * LE BILAN D'UN DÉPÔT, DANS LE VOLET DROIT DE L'IMPORT.
 *
 * L'import est prêt et ce dépôt y est ouvert, comme en production quand on touche
 * sa rangée : l'état choisi dans la salle est celui du bilan.
 */
function AvecLesDepots({ depotId, children }: { depotId: string; children: ReactNode }) {
	return (
		<EcranImport
			detail={children}
			depotOuvert={depotId}
			donnees={lectureDemo<ImportAffiche>('pret', {
				...GESTES_INERTES,
				imports: LIGNES_AVEC_MUET,
				envois: []
			})}
		/>
	);
}

export const ECRANS_IMPORT: readonly EcranDuProduit[] = [
	{
		route: '/app/import-factures',
		libelle: 'import',
		vide: true,
		variantes: Object.keys(FORMES_IMPORT),
		Demo: ImportDemo
	},
	{
		route: '/app/import-factures/$id',
		libelle: 'dépôt',
		vide: false,
		variantes: Object.keys(FORMES_DEPOT_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const depot = formeDemo(variante, pageDe(DEPOT_A_ECARTS), FORMES_DEPOT_DEMO);
			return (
				<AvecLesDepots depotId={depot.id}>
					<EcranDepot donnees={lectureDemo(etat, depot)} />
				</AvecLesDepots>
			);
		}
	}
];
