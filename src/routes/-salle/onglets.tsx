import { useState } from 'react';
import { EcranProcedures, type DossierAffiche } from '../../screens/procedures';
import { EcranRevelation, type RevelationDuJour } from '../../screens/revelation';
import { RAIL_DEMO } from './communes';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';
import {
	BILAN_DEMO,
	BILAN_SANS_FACTURE_DEMO,
	BILAN_SURVEILLANCE_INTERROMPUE_DEMO,
	REVELATION_DEMO,
	REVELATION_SANS_FACTURE_DEMO
} from './revelation';

/**
 * LES DOSSIERS ENGAGÉS — le pire cas d'abord.
 *
 * ⚠️ LE PREMIER PORTE UNE CADUCITÉ, ET LE SECOND UN ANGLE MORT. C'est le couple
 * qu'il faut voir côte à côte : une date que le logiciel COMPTE, et un délai
 * qu'il sait courir sans savoir jusqu'à quand. Un jeu où tout serait mesuré
 * cacherait précisément ce que la règle « ce que le logiciel ne voit pas
 * s'affiche aussi » existe pour montrer.
 *
 * Il vit ici, et pas dans `communes.ts` : seuls l'accueil et l'onglet des
 * procédures le montrent. Le rail qu'il porte, lui, reste commun.
 */
const DOSSIERS_DEMO: DossierAffiche[] = [
	{
		creanceId: 'demo-creance-martin',
		debiteur: 'Ateliers Martin',
		libelle: 'Ordonnance rendue',
		engageeLe: '2026-06-04',
		intervenant: 'SCP Reynal & Vasseur, commissaires de justice',
		prochaineEcheance: {
			libelle: 'Signification de l’ordonnance',
			dateLimite: '2026-11-28',
			gravite: 'CADUCITE',
			consequence:
				'Passé ce délai de 3 mois, l’ordonnance est caduque. La créance n’est pas éteinte, ' +
				'mais la procédure est à reprendre depuis le début, et le temps écoulé rapproche la ' +
				'prescription.'
		},
		anglesMorts: [],
		etapes: RAIL_DEMO
	},
	{
		creanceId: 'demo-creance-durand',
		debiteur: 'Fournitures Durand',
		libelle: 'Ordonnance signifiée',
		engageeLe: '2026-01-10',
		intervenant: null,
		prochaineEcheance: null,
		anglesMorts: [
			'Un délai d’opposition court depuis la signification. Sa durée n’est pas relevée dans le ' +
				'référentiel juridique de ce logiciel : cette échéance-là n’est pas surveillée, et reste ' +
				'à vérifier auprès de l’acte signifié, qui la porte.'
		],
		etapes: RAIL_DEMO.map((etape, rang) =>
			rang === 1
				? { ...etape, statut: 'FRANCHIE' as const }
				: rang === 2
					? { ...etape, statut: 'COURANTE' as const, atteinteLe: '2026-02-10' }
					: etape
		)
	}
];

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

/**
 * La révélation du jour : les factures de `revelation.ts`, calculées par le
 * domaine, et le bilan de ce qui s'en est éteint.
 */
const REVELATION_DU_JOUR_DEMO: RevelationDuJour = {
	revelation: REVELATION_DEMO,
	bilan: BILAN_DEMO
};

/** « surveillance interrompue » : un battement en échec depuis l'arrivée, seule entrée changée. */
const FORMES_REVELATION_DEMO: Readonly<Record<string, RevelationDuJour>> = {
	'surveillance interrompue': {
		...REVELATION_DU_JOUR_DEMO,
		bilan: BILAN_SURVEILLANCE_INTERROMPUE_DEMO
	}
};

/** Le vide : un établissement qui n'a encore déposé aucune facture. */
const JOUR_SANS_FACTURE_DEMO: RevelationDuJour = {
	revelation: REVELATION_SANS_FACTURE_DEMO,
	bilan: BILAN_SANS_FACTURE_DEMO
};

export const ECRANS_ONGLETS: readonly EcranDuProduit[] = [
	/*
	  ⚠️ L'ACCUEIL N'EST PLUS ICI, ET IL N'EXISTE PLUS. `/app/` rend la file
	  depuis la bascule (T15), et `screens/accueil.tsx` est supprimé : son entrée
	  dans la salle serait une démonstration d'un écran que personne ne verra.
	  C'est `-salle/file.tsx` qui tient `/app/` désormais, et sa clé de
	  cohabitation est partie avec cette entrée-ci.
	*/
	{
		route: '/app/procedures',
		libelle: 'procédures',
		vide: true,
		Demo: ProceduresDemo
	},
	{
		route: '/app/revelation',
		libelle: 'révélation',
		vide: true,
		variantes: Object.keys(FORMES_REVELATION_DEMO),
		Demo: ({ etat, variante }) => {
			// Lue avant `lectureDemo` : une variante inconnue lève dans chaque état.
			const jour = formeDemo(variante, REVELATION_DU_JOUR_DEMO, FORMES_REVELATION_DEMO);
			return <EcranRevelation donnees={lectureDemo(etat, jour, JOUR_SANS_FACTURE_DEMO)} />;
		}
	}
];
