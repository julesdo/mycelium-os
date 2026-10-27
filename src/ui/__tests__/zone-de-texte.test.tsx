import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ZoneDeTexte } from '../zone-de-texte';

/**
 * UN CHAMP DE PLUSIEURS LIGNES SE NOMME (audit des parcours Pro du 27/10/2026). Le
 * « Textarea » de Cladd écrit dans un \`contenteditable\` sans rôle ni nom : le champ où
 * l'on parle à Plume n'était annoncé par aucun lecteur d'écran, et un robot de saisie
 * ne le reconnaissait pas comme un champ. \`ZoneDeTexte\` lui donne son rôle, son nom,
 * et la phrase qui dit comment il se comporte.
 */

declare global {
	var IS_REACT_ACT_ENVIRONMENT: boolean;
}

describe('la zone de texte', () => {
	let conteneur: HTMLDivElement;
	let racine: Root;

	beforeEach(() => {
		globalThis.IS_REACT_ACT_ENVIRONMENT = true;
		conteneur = document.createElement('div');
		document.body.append(conteneur);
		racine = createRoot(conteneur);
	});
	afterEach(() => {
		act(() => racine.unmount());
		conteneur.remove();
	});

	it('se présente comme un champ de plusieurs lignes, nommé, avec son mode d’emploi', async () => {
		await act(async () =>
			racine.render(
				<ZoneDeTexte
					nom="Votre message à Plume"
					aide="Entrée pour envoyer, Maj et Entrée pour aller à la ligne."
					value=""
					onChange={() => undefined}
					placeholder="Écrivez à Plume"
				/>
			)
		);
		const champ = conteneur.querySelector('[contenteditable]');
		expect(champ?.getAttribute('role')).toBe('textbox');
		expect(champ?.getAttribute('aria-multiline')).toBe('true');
		expect(champ?.getAttribute('aria-label')).toBe('Votre message à Plume');
		expect(champ?.getAttribute('aria-placeholder')).toBe('Écrivez à Plume');
		const decrit = champ?.getAttribute('aria-describedby') ?? '';
		expect(document.getElementById(decrit)?.textContent).toBe(
			'Entrée pour envoyer, Maj et Entrée pour aller à la ligne.'
		);
	});

	it('dit qu’il est indisponible quand il l’est', async () => {
		await act(async () =>
			racine.render(<ZoneDeTexte nom="Note" value="" onChange={() => undefined} disabled />)
		);
		const champ = conteneur.querySelector('[data-part="control"]');
		expect(champ?.getAttribute('aria-disabled')).toBe('true');
	});
});

describe('la barrière des champs de plusieurs lignes', () => {
	it('ne laisse aucun Textarea de Cladd hors de la zone de texte', () => {
		const racineSrc = join(process.cwd(), 'src');
		const fichiers: string[] = [];
		const parcourir = (dossier: string) => {
			for (const nom of readdirSync(dossier)) {
				const chemin = join(dossier, nom);
				if (statSync(chemin).isDirectory()) {
					if (nom !== '__tests__' && nom !== '_generated') parcourir(chemin);
				} else if (nom.endsWith('.tsx')) fichiers.push(chemin);
			}
		};
		parcourir(racineSrc);
		const fautifs = fichiers
			.filter((f) => !f.endsWith(join('ui', 'zone-de-texte.tsx')))
			.filter((f) => /<Textarea\b/.test(readFileSync(f, 'utf8')))
			.map((f) => relative(racineSrc, f));
		expect(fautifs).toEqual([]);
	});
});
