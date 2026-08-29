import { Dessin, type NomDessin } from '../ui';

/**
 * Les dessins qui habillent le lavis du héros.
 *
 * CE QU'ILS FONT. Un dégradé nu est un fond de gabarit ; les mêmes couleurs
 * avec une dizaine de traits dessinés dessus deviennent une page de carnet de
 * cuisine. C'est la seule chose de toute la page qui dise, sans un mot, que ce
 * logiciel parle de nourriture — et elle le dit avant qu'on ait lu l'accroche.
 *
 * D'OÙ ILS VIENNENT. OpenMoji, en dessin au trait, copiés dans le dépôt plutôt
 * qu'appelés chez un tiers. Licence, attribution et jeux écartés : voir
 * `public/CREDITS.md` et l'en-tête de `scripts/telecharger-doodles.ts`.
 *
 * OÙ ILS SONT, ET CE QU'ILS ÉVITENT. Uniquement dans la BANDE HAUTE, et sur
 * les MARGES : la colonne centrale porte l'accroche, et un dessin derrière un
 * titre de cent pixels le rend illisible pour rien. Sous 55 % de la hauteur
 * commence la tablette, qui est opaque — tout ce qu'on y poserait serait
 * simplement caché.
 *
 * POURQUOI DES STYLES EN LIGNE plutôt que des classes. Une position de dessin
 * n'est pas une décision de conception réutilisable : c'est une COORDONNÉE,
 * différente pour chacun des dix. L'écrire en classe demanderait dix valeurs
 * arbitraires, que la muselière refuse hors de `src/ui/` — et elle a raison,
 * puisque ce ne sont pas des jetons. L'attribut `style` est l'échappement prévu
 * pour ça, et le seul qui reste lisible ligne à ligne.
 *
 * L'ÉPAISSEUR DESCEND QUAND LA TAILLE MONTE. Le trait est décrit en unités
 * d'une grille de 72 : à taille constante d'unité, un dessin de 160px porte un
 * trait deux fois plus épais qu'un de 80px, et il cesse d'être une trace pour
 * devenir un objet. Elle se règle donc par dessin, pas une fois pour toutes.
 */

type Pose = {
	nom: NomDessin;
	/** En pourcentage de la boîte. `gauche` et `droite` sont exclusifs. */
	haut: string;
	gauche?: string;
	droite?: string;
	/** Le côté du carré, en pixels. */
	taille: number;
	epaisseur: number;
	rotation: number;
	opacite: number;
	/** Gardé sur téléphone. Les autres se retirent : la colonne y prend tout. */
	surTelephone?: boolean;
};

const POSES: Pose[] = [
	// La marge gauche, de haut en bas.
	{
		nom: 'tomate',
		haut: '6%',
		gauche: '11%',
		taille: 74,
		epaisseur: 2,
		rotation: 14,
		opacite: 0.2
	},
	{
		nom: 'carotte',
		haut: '17%',
		gauche: '2%',
		taille: 132,
		epaisseur: 1.5,
		rotation: -14,
		opacite: 0.22,
		surTelephone: true
	},
	{
		nom: 'salade',
		haut: '44%',
		gauche: '9%',
		taille: 96,
		epaisseur: 1.7,
		rotation: 9,
		opacite: 0.18
	},
	{
		nom: 'epi',
		haut: '58%',
		gauche: '1%',
		taille: 146,
		epaisseur: 1.4,
		rotation: -7,
		opacite: 0.16,
		surTelephone: true
	},
	{
		nom: 'oeuf',
		haut: '33%',
		gauche: '17%',
		taille: 62,
		epaisseur: 2.2,
		rotation: -20,
		opacite: 0.16
	},

	// La marge droite.
	{
		nom: 'poisson',
		haut: '9%',
		droite: '2%',
		taille: 148,
		epaisseur: 1.4,
		rotation: 11,
		opacite: 0.22,
		surTelephone: true
	},
	{
		nom: 'brocoli',
		haut: '4%',
		droite: '13%',
		taille: 80,
		epaisseur: 2,
		rotation: -17,
		opacite: 0.18
	},
	{
		nom: 'fromage',
		haut: '31%',
		droite: '11%',
		taille: 92,
		epaisseur: 1.8,
		rotation: -9,
		opacite: 0.18
	},
	{
		nom: 'pain',
		haut: '52%',
		droite: '1%',
		taille: 128,
		epaisseur: 1.5,
		rotation: 8,
		opacite: 0.16,
		surTelephone: true
	},
	{
		nom: 'ticket',
		haut: '46%',
		droite: '16%',
		taille: 66,
		epaisseur: 2.2,
		rotation: 15,
		opacite: 0.16
	}
];

/**
 * `inverse` sert la section d'encre qui ferme la page.
 *
 * La page s'ouvre sur un lavis semé de dessins et se referme sur un aplat de
 * nuit : lui donner les mêmes traces, en clair, boucle la page sans répéter le
 * même effet — c'est le négatif du premier écran, pas sa copie.
 *
 * Les opacités sont MULTIPLIÉES, pas remplacées. Un trait clair sur un fond
 * sombre se voit plus qu'un trait sombre sur un fond clair, à opacité égale :
 * la lumière déborde. Les valeurs réglées pour le lavis, reprises telles quelles
 * sur l'encre, donneraient un fond bavard qui dispute l'attention au seul
 * bouton de la section.
 */
export function FondDessine({ inverse = false }: { inverse?: boolean }) {
	return (
		<div
			aria-hidden
			className={
				inverse
					? 'pointer-events-none absolute inset-0 -z-10 overflow-hidden text-plume-inversee'
					: 'cladd-color-brand pointer-events-none absolute inset-0 -z-10 overflow-hidden text-cladd-primary'
			}
		>
			{POSES.map((p) => (
				<Dessin
					key={p.nom}
					nom={p.nom}
					epaisseur={p.epaisseur}
					className={p.surTelephone ? 'absolute' : 'absolute hidden md:block'}
					// La rotation est portée par le dessin lui-même, pas par un conteneur :
					// un calque de plus par dessin coûterait dix nœuds pour rien.
					style={{
						top: p.haut,
						left: p.gauche,
						right: p.droite,
						width: p.taille,
						height: p.taille,
						opacity: inverse ? p.opacite * 0.45 : p.opacite,
						transform: `rotate(${p.rotation}deg)`
					}}
				/>
			))}
		</div>
	);
}
