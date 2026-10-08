import { useState } from 'react';
import type { FicheIntervenant } from '../../ui';
import { EcranDefense, type DefenseAffichee } from '../../screens/defense';
import type { EcranDuProduit, EtatDemo } from './demo';
import { AVOCATS_DEMO, BARREAUX_DEMO, ETUDES_DEMO, PROPOSITIONS_DEMO } from './communes';

/**
 * VOTRE DÉFENSE — l'équipe, les professionnels près des clients, et l'ajout.
 *
 * L'équipe de la salle reprend de VRAIES fiches publiques (une étude du registre,
 * un avocat de l'annuaire national), pour que la carte, les associés et les
 * spécialités déclarées s'y voient comme en production. Aucun visage : les
 * portraits sont dessinés d'après le nom, comme en production.
 */
const EQUIPE_DEMO: readonly FicheIntervenant[] = [
	{
		_id: 'equipe-commissaire',
		nom: "COMMISSAIRES DE L'OUEST (COMMISSAIRES DE L'OUEST) (CDOUEST)",
		role: 'COMMISSAIRE_DE_JUSTICE',
		ressort: 'NANTES 44100',
		adresse: '14 BOULEVARD WINSTON CHURCHILL 44100 NANTES',
		siren: '921924908',
		sourceRepertoire: ETUDES_DEMO.source,
		sourceReleveeLe: '2026-10-08'
	},
	{
		_id: 'equipe-avocat',
		nom: 'Véronique BAILLEUX',
		role: 'AVOCAT',
		ressort: 'NANTES',
		adresse: '8 impasse de Lande Bourne, Zone artisanale Pan Loup, 44220 COUERON',
		siren: '411007768',
		sourceRepertoire: AVOCATS_DEMO.source,
		sourceReleveeLe: '2026-09-23'
	},
	// Une fiche FICTIVE, saisie à la main : c'est la seule qui porte des coordonnées, et
	// elles sont sur un domaine réservé aux exemples. Aucun numéro n'est prêté à une vraie étude.
	{
		_id: 'equipe-main',
		nom: 'Cabinet Perrin',
		role: 'AVOCAT',
		ressort: 'Paris',
		courriel: 'contact@cabinet-perrin.example'
	}
];

const CLIENTS_DEMO = [
	{ id: 'client-durand', nom: 'Fournitures Durand', ligne: '2 dossiers en cours' },
	{ id: 'client-martin', nom: 'Ateliers Martin', ligne: '1 dossier en cours' }
];

function defenseDemo(
	equipe: readonly FicheIntervenant[],
	presDuClient: DefenseAffichee['presDuClient'],
	ouvrir: (id: string | null) => void
): DefenseAffichee {
	return {
		equipe,
		erreur: null,
		enCours: false,
		onAjouterALaMain: () => undefined,
		onOublier: () => undefined,
		onPhoto: () => undefined,
		clients: CLIENTS_DEMO,
		presDuClient,
		onOuvrirClient: (id) => ouvrir(id),
		onFermerClient: () => ouvrir(null),
		onAjouterEtude: () => undefined,
		onAjouterAvocat: () => undefined,
		rechercheCommissaireOuverte: false,
		etatRechercheCommissaire: { phase: 'TROUVE', resultat: ETUDES_DEMO },
		onOuvrirRechercheCommissaire: () => undefined,
		onFermerRechercheCommissaire: () => undefined,
		onChercherCommissaire: () => undefined,
		onRetenirEtude: () => undefined,
		rechercheAvocatOuverte: false,
		repertoire: BARREAUX_DEMO,
		barreau: AVOCATS_DEMO.barreau,
		specialite: '',
		etatAvocats: { phase: 'TROUVE', resultat: AVOCATS_DEMO },
		onOuvrirRechercheAvocat: () => undefined,
		onFermerRechercheAvocat: () => undefined,
		onChoisirBarreau: () => undefined,
		onChoisirSpecialite: () => undefined,
		onRetenirAvocat: () => undefined
	};
}

const FORMES: Record<string, readonly FicheIntervenant[]> = {
	'avec une équipe': EQUIPE_DEMO,
	'équipe vide': []
};

function DemoDefense({ variante }: { variante: string }) {
	const [ouvert, setOuvert] = useState<string | null>(null);
	const equipe = FORMES[variante];
	if (equipe === undefined) throw new Error(`Forme inconnue : « ${variante} ».`);
	const client = CLIENTS_DEMO.find((c) => c.id === ouvert);
	return (
		<EcranDefense
			donnees={{
				etat: 'pret',
				valeur: defenseDemo(
					equipe,
					client === undefined ? null : { client: client.nom, propositions: PROPOSITIONS_DEMO },
					setOuvert
				)
			}}
		/>
	);
}

export const ECRANS_DEFENSE: readonly EcranDuProduit[] = [
	{
		route: '/app/defense',
		libelle: 'votre défense',
		vide: false,
		variantes: Object.keys(FORMES),
		Demo: ({ etat, variante }: { etat: EtatDemo; variante?: string }) => {
			if (etat === 'attente') return <EcranDefense donnees={{ etat: 'attente' }} />;
			if (etat === 'erreur') return <EcranDefense donnees={{ etat: 'erreur' }} />;
			return <DemoDefense variante={variante ?? 'avec une équipe'} />;
		}
	}
];
