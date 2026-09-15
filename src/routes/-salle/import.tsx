import { useState } from 'react';
import { EcranDepot } from '../../screens/import/depot';
import {
	EcranImport,
	type ImportAffiche,
	type LigneDepot,
	type ModeDepot
} from '../../screens/import/depots';
import type { DepotAffiche } from '../../ui';
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
 * Les rangées de l'import, telles que `listerImports` les rend : le dépôt le plus
 * récent d'abord (`src/lib/convex/recouvrement/depotMutations.ts`, lignes 167 à
 * 171), avec sa date de dépôt.
 */
const LIGNES_DEPOTS_DEMO: readonly LigneDepot[] = [...DEPOTS_DEMO]
	.sort((a, b) => b.deposeLe - a.deposeLe)
	.map((depot) => ({
		_id: depot.id,
		filename: depot.filename,
		statut: depot.statut,
		etape: depot.etape,
		erreur: depot.erreur,
		bilan: depot.bilan,
		deposeLe: depot.deposeLe
	}));

/**
 * L'import, avec le chemin choisi tenu comme la route le tient : on passe d'un
 * chemin à l'autre, et les formats écrits sous la zone suivent.
 */
function ImportDemo({ etat }: { etat: EtatDemo }) {
	const [mode, setMode] = useState<ModeDepot>('EXPORT_COMPTABLE');
	const commun = {
		mode,
		onChoisirMode: setMode,
		envoiEnCours: false,
		erreur: null,
		onDeposer: () => undefined
	};

	return (
		<EcranImport
			donnees={lectureDemo<ImportAffiche>(
				etat,
				{ ...commun, imports: LIGNES_DEPOTS_DEMO },
				// Le vide : un établissement qui n'a encore rien déposé.
				{ ...commun, imports: [] }
			)}
		/>
	);
}

/**
 * La page d'un dépôt, composée comme sa route la compose
 * (`src/routes/app/import-factures_.$id.tsx`) : sans date de dépôt, que
 * `suivreImport` ne rend pas.
 */
function pageDe(depot: DepotDemo): DepotAffiche {
	return {
		id: depot.id,
		filename: depot.filename,
		statut: depot.statut,
		etape: depot.etape,
		erreur: depot.erreur,
		bilan: depot.bilan
	};
}

/** Les formes nommées de la page : les trois autres dépôts, chacun dans son état. */
const FORMES_DEPOT_DEMO: Readonly<Record<string, DepotAffiche>> = {
	'import parfait': pageDe(DEPOT_PARFAIT_DEMO),
	'lecture en cours': pageDe(DEPOT_EN_COURS_DEMO),
	'lecture en échec': pageDe(DEPOT_EN_ECHEC_DEMO)
};

export const ECRANS_IMPORT: readonly EcranDuProduit[] = [
	{
		route: '/app/import-factures',
		libelle: 'import',
		vide: true,
		Demo: ImportDemo
	},
	{
		route: '/app/import-factures_/$id',
		libelle: 'dépôt',
		vide: false,
		variantes: Object.keys(FORMES_DEPOT_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const depot = formeDemo(variante, pageDe(DEPOT_A_ECARTS_DEMO), FORMES_DEPOT_DEMO);
			return <EcranDepot donnees={lectureDemo(etat, depot)} />;
		}
	}
];
