import { Hero, LaLoi, Preuve, Bandeau, Abonnement, Pied } from '../../marketing';
import { formeDemo, type EcranDuProduit } from './demo';

/**
 * LA PAGE D'ACCUEIL, DANS LA SALLE — et c'est la première fois.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LA RÈGLE DES QUATRE LARGEURS NE S'Y APPLIQUAIT PAS, FAUTE D'OUTILLAGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Chaque écran s'ouvre dans le navigateur intégré aux quatre largeurs de
 * référence AVANT d'être déclaré fini » — et la salle ne rendait aucun
 * composant de `src/marketing/`. Un balayage sur « marketing », « Hero » et
 * « Navbar » dans `showroom.tsx` ne renvoyait rien.
 *
 * La conséquence s'est vue le 23 septembre 2026, et elle était grosse : la
 * tablette du héros gardait une toile de 1180 px à toutes les largeurs et
 * laissait le CADRE rétrécir. À 375 px, le facteur tombait à 0,277 et le corps
 * de 14 px des rangées rendait à **3,9 px**. Le seul élément de la page qui
 * réponde à « à quoi ça ressemble, en vrai » était illisible sur l'appareil où
 * un prospect ouvre le site le plus souvent — depuis des mois, sans que rien ne
 * le signale.
 *
 * ⚠️ CINQ SECTIONS, PAS ONZE, ET C'EST DÉLIBÉRÉ. Une entrée qui rendrait la
 * page entière serait une seconde page d'accueil : on la regarderait comme on
 * regarde le site, c'est-à-dire en la faisant défiler sans rien mesurer. Ce
 * qu'on vient vérifier ici, ce sont les cinq endroits où la mise en page peut
 * casser : le grand corps du héros, l'objet mis à l'échelle, les trois chiffres
 * de la loi en colonnes, le décompte décomposé, et le pied qui porte désormais
 * quatre liens légaux.
 */

const SECTIONS = {
	'héros et téléphone': () => <Hero />,
	'les chiffres de la loi': () => <LaLoi />,
	'le décompte décomposé': () => <Preuve />,
	'la respiration et son ciel': () => <Bandeau />,
	'les raisons de l’abonnement': () => <Abonnement />,
	'le pied et ses liens légaux': () => <Pied />
} as const;

/**
 * ⚠️ LE FOND DE LA SALLE EST CELUI DE L'APPLICATION, PAS CELUI DE LA PAGE.
 *
 * Les deux identités sont séparées volontairement — le blueprint l'écrit noir
 * sur blanc — et la salle vit du côté de l'application. Chaque section peint
 * donc son propre fond, ce qu'elle fait déjà en production : c'est précisément
 * ce qu'on vient vérifier, qu'aucune ne dépende d'un fond hérité.
 */
function Vitrine({ rendu }: { rendu: () => React.ReactElement }) {
	return <div className="w-full">{rendu()}</div>;
}

export const ECRANS_ACCUEIL: readonly EcranDuProduit[] = [
	{
		route: '/',
		libelle: 'page d’accueil',
		vide: false,
		variantes: Object.keys(SECTIONS),
		Demo: ({ variante }) => (
			<Vitrine
				key={variante ?? 'héros et téléphone'}
				rendu={formeDemo(variante, SECTIONS['héros et téléphone'], SECTIONS)}
			/>
		)
	}
];
