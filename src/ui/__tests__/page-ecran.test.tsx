import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageEcran } from '../page-ecran';

/**
 * LA COQUILLE D'ÉCRAN, DANS SES QUATRE ÉTATS.
 *
 * Ces tests RENDENT le composant, ils ne lisent pas sa source : un état se juge
 * à ce qu'il affiche. Aucun ne rend de `Link`, qui exige un routeur ; l'issue
 * par défaut, elle, se vérifie dans la source (dernier test).
 */

const ONGLET = { genre: 'onglet', titre: 'Vos débiteurs' } as const;
const COLONNE = 'mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs';

describe('la coquille d’écran', () => {
	it('garde l’en-tête pendant l’attente, et l’annonce par aria-busy', () => {
		const html = renderToStaticMarkup(
			<PageEcran entete={ONGLET} etat="attente">
				<p>contenu prêt</p>
			</PageEcran>
		);
		expect(html).toContain('Vos débiteurs');
		expect(html).toContain('aria-busy="true"');
		expect(html).not.toContain('contenu prêt');
		expect(html).not.toContain('sr-only');
	});

	it('rend le contenu dans la colonne de lecture une fois prêt', () => {
		const html = renderToStaticMarkup(
			<PageEcran entete={ONGLET}>
				<p>contenu prêt</p>
			</PageEcran>
		);
		expect(html).toContain('contenu prêt');
		expect(html).toContain(COLONNE);
		expect(html).not.toContain('aria-busy');
	});

	it('montre le chemin quand il n’y a rien', () => {
		const html = renderToStaticMarkup(
			<PageEcran
				entete={ONGLET}
				etat={{
					vide: {
						titre: 'Aucun débiteur pour l’instant',
						explication: 'Ils apparaissent à l’import.'
					}
				}}
			>
				<p>contenu prêt</p>
			</PageEcran>
		);
		expect(html).toContain('Aucun débiteur pour l’instant');
		expect(html).not.toContain('contenu prêt');
	});

	it('garde l’en-tête en erreur, dit ce qui s’est passé, et place l’issue avant le rechargement', () => {
		const html = renderToStaticMarkup(
			<PageEcran
				entete={ONGLET}
				etat="erreur"
				issue={<a href="/app/debiteurs">Voir mes débiteurs</a>}
			/>
		);
		expect(html).toContain('Vos débiteurs');
		expect(html).toContain('Cet écran n’a pas pu s’afficher.');
		expect(html).toContain('role="alert"');
		expect(html.indexOf('Voir mes débiteurs')).toBeGreaterThan(-1);
		expect(html.indexOf('Voir mes débiteurs')).toBeLessThan(html.indexOf('Recharger la page'));
	});

	it('dégage la barre flottante quand l’écran n’a pas d’en-tête', () => {
		const html = renderToStaticMarkup(<PageEcran entete={{ genre: 'aucun' }} etat="attente" />);
		expect(html).toContain('pt-barre-app');
	});

	it('pose les deux volets à la place de la colonne quand l’écran en a', () => {
		const html = renderToStaticMarkup(
			<PageEcran
				entete={ONGLET}
				volets={{
					liste: <p>la liste</p>,
					preuve: <p>la preuve</p>,
					preuveOuverte: false,
					onFermerPreuve: () => undefined
				}}
			/>
		);
		expect(html).toContain('la liste');
		expect(html).toContain('la preuve');
		expect(html).not.toContain(COLONNE);
	});

	it('retombe sur l’accueil quand l’écran ne nomme pas d’issue', () => {
		const source = readFileSync(join(process.cwd(), 'src', 'ui', 'page-ecran.tsx'), 'utf8');
		expect(source).toContain('<BoutonPrincipal as={Link} to="/app">');
	});
});
