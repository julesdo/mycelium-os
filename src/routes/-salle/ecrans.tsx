import { useState, type ReactNode } from 'react';
import type { Lecture } from '../../ui';
import { Shell } from '../../app/shell';
import { EcranAccueil } from '../../screens/accueil';
import { EcranCreance } from '../../screens/creance';
import { EcranProcedures } from '../../screens/procedures';
import { ACCUEIL_DEMO, ACCUEIL_VIERGE, CREANCE_DEMO, DOSSIERS_DEMO } from './donnees';

/**
 * LES ÉCRANS DU PRODUIT, TELS QU'IL LES AFFICHE.
 *
 * ⚠️ LA SALLE MONTRAIT D'AUTRES PAGES QUE CELLES DU PRODUIT. Ses démonstrations
 * recomposaient un en-tête autour d'un composant : « Son habitude de paiement »
 * là où l'écran dit « Comment il paie d'habitude ». On y vérifiait une page que
 * personne ne verrait.
 *
 * Chaque entrée rend ici le VRAI écran, importé de `src/screens/`, dans chacun
 * de ses états. `salle-complete.test.ts` échoue si une route de `src/routes/app/`
 * n'y figure pas.
 */

/** Les états qu'on vient regarder. `vide` n'existe que pour les écrans qui en ont un. */
export type EtatDemo = 'pret' | 'vide' | 'attente' | 'erreur';

export interface EcranDuProduit {
	/** La route, écrite exactement comme `createFileRoute` la déclare. */
	readonly route: string;
	readonly libelle: string;
	/** Vrai si l'écran a une forme vide à regarder. */
	readonly vide: boolean;
	readonly rendre: (etat: EtatDemo) => ReactNode;
}

/** La lecture d'un état de démonstration. Hors du vide, `pret` et `vide` portent la même valeur. */
export function lectureDemo<T>(etat: EtatDemo, pret: T, vide?: T): Lecture<T> {
	if (etat === 'attente' || etat === 'erreur') return { etat };
	return { etat: 'pret', valeur: etat === 'vide' && vide !== undefined ? vide : pret };
}

/**
 * ⚠️ LE DOSSIER EST OUVERT D'EMBLÉE, et c'est ce qu'on vient regarder : sous
 * 1024 px la preuve est une feuille plein écran, au-dessus c'est le volet droit.
 */
function ProceduresDemo({ etat }: { etat: EtatDemo }) {
	const [ouvert, setOuvert] = useState<string | null>(DOSSIERS_DEMO[0]?.creanceId ?? null);
	const fermer = () => setOuvert(null);

	return (
		<EcranProcedures
			donnees={lectureDemo(
				etat,
				{ dossiers: DOSSIERS_DEMO, ouvertId: ouvert, onFermer: fermer },
				{ dossiers: [], ouvertId: null, onFermer: fermer }
			)}
		/>
	);
}

export const ECRANS_DU_PRODUIT: readonly EcranDuProduit[] = [
	{
		route: '/app/',
		libelle: 'accueil',
		vide: true,
		rendre: (etat) => (
			<Shell>
				<EcranAccueil donnees={lectureDemo(etat, ACCUEIL_DEMO, ACCUEIL_VIERGE)} />
			</Shell>
		)
	},
	{
		route: '/app/procedures',
		libelle: 'procédures',
		vide: true,
		rendre: (etat) => (
			<Shell>
				<ProceduresDemo etat={etat} />
			</Shell>
		)
	},
	{
		route: '/app/creance/$id',
		libelle: 'créance',
		vide: false,
		rendre: (etat) => (
			<Shell>
				<EcranCreance
					identifiant="demo"
					donnees={lectureDemo(etat, {
						creance: CREANCE_DEMO,
						etatProcedure: null,
						totalDecompte: null
					})}
				/>
			</Shell>
		)
	}
];
