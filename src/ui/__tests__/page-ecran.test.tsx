import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PageEcran } from '../page-ecran';

/**
 * LA COQUILLE D'ÉCRAN, DANS SES ÉTATS.
 *
 * Ces tests RENDENT le composant : un état se juge à ce qu'il affiche.
 *
 * ⚠️ `Link` EST REMPLACÉ PAR UN LIEN NU. Le vrai exige un routeur, que le rendu
 * serveur d'un test n'a pas. Le remplacer permet de rendre ce qui dépend de
 * lui : le retour d'une page poussée, et l'issue par défaut de l'erreur. Ce
 * qu'on vérifie ici est l'ADRESSE écrite, pas la navigation.
 */
vi.mock('@tanstack/react-router', async (importOriginal) => {
	const original = await importOriginal<object>();
	const { createElement } = await import('react');
	return {
		...original,
		Link: ({
			to,
			className,
			children
		}: {
			to?: string;
			className?: string;
			children?: ReactNode;
		}) => createElement('a', { href: to, className }, children)
	};
});

const ONGLET = { genre: 'onglet', titre: 'Vos débiteurs' } as const;
const COLONNE = 'mx-auto flex w-full max-w-2xl flex-col gap-cladd-xs';

describe('la coquille d’écran', () => {
	it('garde l’en-tête pendant l’attente, montre un squelette, et le dit par un statut', () => {
		const html = renderToStaticMarkup(
			<PageEcran entete={ONGLET} etat="attente">
				<p>contenu prêt</p>
			</PageEcran>
		);
		expect(html).toContain('Vos débiteurs');
		expect(html).toContain('aria-busy="true"');
		expect(html).toContain('role="status"');
		expect(html).toContain('aria-hidden="true"');
		expect(html).not.toContain('contenu prêt');
		expect(html).not.toContain('<aside');
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

	it('montre le chemin quand il n’y a rien, sous l’en-tête', () => {
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
		expect(html).toContain('Vos débiteurs');
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

	it('ne lit dans l’alerte que ce qui s’est passé, jamais les boutons', () => {
		const html = renderToStaticMarkup(
			<PageEcran
				entete={ONGLET}
				etat="erreur"
				issue={<a href="/app/debiteurs">Voir mes débiteurs</a>}
			/>
		);
		const depuisAlerte = html.slice(html.indexOf('role="alert"'));
		const alerte = depuisAlerte.slice(0, depuisAlerte.indexOf('</div>'));
		expect(alerte).toContain('Cet écran n’a pas pu s’afficher.');
		expect(alerte).not.toContain('Voir mes débiteurs');
		expect(alerte).not.toContain('Recharger la page');
	});

	it('retombe sur l’accueil quand l’écran ne nomme pas d’issue', () => {
		const html = renderToStaticMarkup(<PageEcran entete={ONGLET} etat="erreur" />);
		expect(html).toContain('href="/app"');
		expect(html).toContain('Revenir à l’accueil');
	});

	it('rend le retour d’une page poussée, avec le nom de ce vers quoi il mène', () => {
		const html = renderToStaticMarkup(
			<PageEcran
				entete={{
					genre: 'poussee',
					retour: {
						vers: '/app/creance/$id',
						parametres: { id: 'c1' },
						libelle: 'Fournitures Durand'
					},
					titre: 'Décompte'
				}}
			>
				<p>contenu prêt</p>
			</PageEcran>
		);
		expect(html).toContain('href="/app/creance/$id"');
		expect(html).toContain('Fournitures Durand');
		expect(html).toContain('Décompte');
		expect(html).toContain('contenu prêt');
	});

	it('dégage la barre flottante quand l’écran n’a pas d’en-tête, et donne un titre de page à son erreur', () => {
		const attente = renderToStaticMarkup(<PageEcran entete={{ genre: 'aucun' }} etat="attente" />);
		expect(attente).toContain('pt-barre-app');

		const erreur = renderToStaticMarkup(<PageEcran entete={{ genre: 'aucun' }} etat="erreur" />);
		expect(erreur).toContain('pt-barre-app');
		expect(erreur).toContain('<h1');
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

	it('dessine l’attente d’un écran à deux volets en deux volets, pour que la page ne saute pas', () => {
		const html = renderToStaticMarkup(
			<PageEcran entete={ONGLET} etat="attente" disposition="volets" />
		);
		expect(html).toContain('aria-busy="true"');
		expect(html).toContain('<aside');
	});
});
