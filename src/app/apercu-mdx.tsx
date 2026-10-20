import { useEffect, useState, type ComponentType } from 'react';

/**
 * L'APERÇU D'UN ARTICLE DANS LE CMS (19/10/2026) : le corps MDX compilé dans le navigateur,
 * avec les mêmes composants et le même greffon (remark-gfm) que la construction du site.
 * Ce que le fondateur voit est ce que le blog affichera, valeurs du registre comprises.
 *
 * Le compilateur ne se charge qu'à l'ouverture de l'éditeur, et la compilation attend une
 * pause dans la frappe. Une erreur de syntaxe rend sa ligne et sa colonne : c'est elle qui
 * bloque la publication, puisque la construction échouerait au même endroit.
 */

type ContenuMdx = ComponentType<{ components?: Record<string, unknown> }>;

export type Apercu =
	| { readonly etat: 'compilation' }
	| { readonly etat: 'pret'; readonly Contenu: ContenuMdx }
	| { readonly etat: 'erreur'; readonly message: string };

const PAUSE_MS = 400;

/** Un morceau de MDX compilé avec le greffon du site : l'aperçu, et les blocs de l'éditeur. */
export async function compilerMdx(corps: string): Promise<ContenuMdx> {
	const [{ evaluate }, runtime, { default: remarkGfm }] = await Promise.all([
		import('@mdx-js/mdx'),
		import('react/jsx-runtime'),
		import('remark-gfm')
	]);
	const module = await evaluate(corps, { ...runtime, remarkPlugins: [remarkGfm] });
	return module.default as ContenuMdx;
}

/** Le corps compilé, après une pause dans la frappe. */
export function useApercuMdx(corps: string): Apercu {
	const [apercu, setApercu] = useState<Apercu>({ etat: 'compilation' });
	useEffect(() => {
		let annule = false;
		const minuterie = setTimeout(() => {
			compilerMdx(corps)
				.then((Contenu) => {
					if (!annule) setApercu({ etat: 'pret', Contenu });
				})
				.catch((e: unknown) => {
					if (annule) return;
					const erreur = e as { message?: string; line?: number; column?: number };
					const ou =
						typeof erreur.line === 'number'
							? ` (ligne ${erreur.line}${typeof erreur.column === 'number' ? `, colonne ${erreur.column}` : ''})`
							: '';
					setApercu({ etat: 'erreur', message: `${erreur.message ?? 'Erreur de syntaxe'}${ou}` });
				});
		}, PAUSE_MS);
		return () => {
			annule = true;
			clearTimeout(minuterie);
		};
	}, [corps]);
	return apercu;
}
