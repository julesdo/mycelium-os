import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Fusionne des classes Tailwind en laissant la dernière gagner.
 *
 * `tailwind-merge` doit connaître nos échelles personnalisées, sinon il se
 * trompe de conflit. Le cas qui l'a révélé : `cn('text-letikette-taux', 'text-seuil-manque')`
 * rendait un `40px` en `16px`, parce que `tailwind-merge` prenait
 * `text-letikette-taux` pour une COULEUR (les deux classes commencent par `text-`)
 * et ne gardait que la dernière.
 *
 * Le symptôme était silencieux et coûteux : le chiffre le plus important du
 * produit, le taux EGalim, s'affichait à la taille d'un paragraphe. Aucun test
 * ni aucun lint ne pouvait l'attraper — seul un coup d'œil, puis une mesure.
 */
const merge = extendTailwindMerge({
	extend: {
		classGroups: {
			'font-size': [
				{
					text: [
						'letikette-taux',
						'letikette-chiffre',
						'letikette-titre',
						'letikette-marque',
						'vignette-sm',
						'vignette-md',
						'vignette-lg',
						'cladd-md',
						'cladd-sm',
						'cladd-xs',
						'cladd-2xs',
						'cladd-3xs',
						'cladd-4xs'
					]
				}
			]
		}
	}
});

export const cn = (...inputs: ClassValue[]) => merge(clsx(inputs));
