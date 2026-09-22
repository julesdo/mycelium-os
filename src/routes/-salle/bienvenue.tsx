import { useState } from 'react';
import { EcranBienvenue } from '../../screens/inscription/entreprise';
import type { EtablissementPropose, EtatRecherche } from '../../ui';
import { formeDemo, type EcranDuProduit } from './demo';

/**
 * L'INSCRIPTION, DANS LA SALLE — et c'est la première fois.
 *
 * ⚠️ `/bienvenue` N'A JAMAIS ÉTÉ REGARDÉ AUX QUATRE LARGEURS. L'entrée de la
 * salle était typée par le routeur et bornée à `/app/${string}` : le seul écran
 * de travail qui vit hors de `/app` — parce qu'il s'ouvre avant que
 * l'établissement existe — en était exclu par construction. Il portait un seul
 * champ, donc ça ne se voyait pas ; il porte maintenant une liste de candidats,
 * une carte de résultat et une déduction, et ça se verrait.
 *
 * ⚠️ DEUX CANDIDATS AU MOINS DANS L'ÉTAT « TROUVÉ ». Une liste à un seul
 * élément ferait croire que le produit peut choisir tout seul — il ne le peut
 * pas, et c'est la seule erreur de ce produit qui rende une réponse rassurante
 * ET fausse. La démonstration montre donc deux homonymes de villes différentes,
 * exactement le cas qui oblige à regarder avant de toucher.
 */

const CANDIDATS: readonly EtablissementPropose[] = [
	{
		siren: '732829320',
		denomination: 'FOURNITURES DURAND ET FILS',
		formeJuridique: 'Société par actions simplifiée',
		ville: 'Fécamp',
		adresse: '6 Place Nicolas Selle 76400 Fécamp',
		derniereParution: '2026-03-18'
	},
	{
		siren: '421931452',
		denomination: 'FOURNITURES DURAND',
		formeJuridique: 'Société à responsabilité limitée',
		ville: 'Rouen',
		adresse: '12 Rue Jeanne d’Arc 76000 Rouen',
		derniereParution: '2024-11-02'
	},
	{
		siren: '552100554',
		denomination: 'DURAND ET FILS',
		formeJuridique: 'Entrepreneur individuel',
		ville: 'Le Havre',
		derniereParution: '2021-06-30'
	}
];

/**
 * Chaque phase se rend telle quelle : l'écran ne tient aucun état, donc rien
 * n'est à cliquer pour l'atteindre. Le nom reste modifiable pour qu'on vérifie
 * que le bouton porte bien ce qui sera cherché.
 */
interface Etat {
	readonly phaseInitiale: EtatRecherche;
	readonly retenuInitial?: EtablissementPropose | null;
	readonly erreurInitiale?: string | null;
	readonly enCours?: boolean;
}

function Demonstration({
	phaseInitiale,
	retenuInitial = null,
	erreurInitiale = null,
	enCours = false
}: Etat) {
	const [nom, setNom] = useState(retenuInitial?.denomination ?? 'Fournitures Durand');
	const [recherche, setRecherche] = useState<EtatRecherche>(phaseInitiale);
	const [retenu, setRetenu] = useState<EtablissementPropose | null>(retenuInitial);

	return (
		<EcranBienvenue
			nom={nom}
			onNom={setNom}
			recherche={recherche}
			retenu={retenu}
			onChercher={() => setRecherche({ phase: 'TROUVE', candidats: CANDIDATS })}
			onRetenir={(candidat) => {
				setRetenu(candidat);
				setNom(candidat.denomination);
				setRecherche({ phase: 'REPOS' });
			}}
			onChanger={() => setRetenu(null)}
			enCours={enCours}
			erreur={erreurInitiale}
			onCreer={() => undefined}
		/>
	);
}

/**
 * Les formes nommées, en PROPRIÉTÉS et pas en éléments déjà construits.
 *
 * ⚠️ LA DÉMONSTRATION SE REMONTE SUR LA VARIANTE, sans quoi elle ne change pas.
 * Elle tient son propre état — c'est ce qui permet de toucher un candidat pour
 * vérifier ce que ça remplit — et ses propriétés ne servent qu'à l'initialiser.
 * Rendues au même endroit de l'arbre sous le même type, deux variantes
 * partageraient donc l'état de la première : on passait de « le registre
 * propose » à « aucune annonce » sans que l'écran bouge d'un pixel.
 */
const FORMES: Readonly<Record<string, Etat>> = {
	'recherche en cours': { phaseInitiale: { phase: 'EN_COURS' } },
	'le registre propose': { phaseInitiale: { phase: 'TROUVE', candidats: CANDIDATS } },
	'entreprise retenue': { phaseInitiale: { phase: 'REPOS' }, retenuInitial: CANDIDATS[0] ?? null },
	'forme non tranchee': { phaseInitiale: { phase: 'REPOS' }, retenuInitial: CANDIDATS[2] ?? null },
	'aucune annonce': { phaseInitiale: { phase: 'AUCUN' } },
	'registre muet': {
		phaseInitiale: {
			phase: 'ECHEC',
			message: 'Le registre a répondu 503. La recherche n’a pas pu aboutir.'
		}
	},
	'refus du serveur': {
		phaseInitiale: { phase: 'REPOS' },
		retenuInitial: CANDIDATS[0] ?? null,
		erreurInitiale: '« 732829321 » n’est pas un SIREN : sa clé de contrôle ne tombe pas.'
	}
};

const PRINCIPALE: Etat = { phaseInitiale: { phase: 'REPOS' } };

export const ECRANS_BIENVENUE: readonly EcranDuProduit[] = [
	{
		route: '/bienvenue',
		libelle: 'inscription',
		vide: false,
		variantes: Object.keys(FORMES),
		Demo: ({ variante }) => (
			<Demonstration key={variante ?? 'principale'} {...formeDemo(variante, PRINCIPALE, FORMES)} />
		)
	}
];
