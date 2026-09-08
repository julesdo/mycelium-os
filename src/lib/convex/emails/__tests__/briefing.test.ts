import { describe, it, expect } from 'vitest';
import { briefingHtml, briefingTexte, type BriefingData } from '../modeles/briefing';

/**
 * Le briefing du matin.
 *
 * Ce module ne fait qu'assembler un `BlocEmail` : la coquille elle-même
 * (échappement, mise en forme, couleurs de seuil) est déjà vérifiée par
 * `produit.test.ts`. Ce qui reste à vérifier ici est propre au briefing :
 * `nomEntreprise` et `lignes` viennent de la base — un nom d'entreprise n'est
 * pas un champ contrôlé — et la branche « rien à faire » ne doit fuiter ni
 * bouton ni action.
 */

const BASE: BriefingData = {
	nomEntreprise: 'Menuiserie Dupont',
	titre: 'Votre point du matin',
	intro: '1 point critique sur 1 au total.',
	lignes: [
		'1 point critique sur 1 au total.',
		'Le détail de chaque montant est décomposable dans le produit.'
	],
	action: 'Relancer la facture F-2024-118 avant le 12 septembre.',
	montantLisible: '1 842 €',
	url: 'https://app.letikette.com/creances/abc'
};

describe('le briefing quand il y a une action', () => {
	it('affiche le bouton vers le produit', () => {
		const html = briefingHtml(BASE);
		expect(html).toContain('Ouvrir le produit');
		expect(html).toContain(BASE.url);
	});

	it("porte l'action du jour dans la note, en HTML comme en texte", () => {
		const html = briefingHtml(BASE);
		const texte = briefingTexte(BASE);
		expect(html).toContain('À faire aujourd');
		expect(html).toContain('Relancer la facture F-2024-118');
		expect(texte).toContain('À faire aujourd');
		expect(texte).toContain('Relancer la facture F-2024-118');
	});

	it('affiche le montant identifié dans les deux versions', () => {
		expect(briefingHtml(BASE)).toContain(BASE.montantLisible);
		expect(briefingTexte(BASE)).toContain(BASE.montantLisible);
	});
});

describe('le briefing quand il n’y a rien à faire', () => {
	const calme: BriefingData = { ...BASE, action: null };

	it('ne pose aucun bouton', () => {
		const html = briefingHtml(calme);
		expect(html).not.toContain('Ouvrir le produit');
		expect(html).not.toContain('<a href');
	});

	it('dit que rien ne réclame d’attention, jamais « à faire aujourd’hui »', () => {
		const html = briefingHtml(calme);
		const texte = briefingTexte(calme);
		expect(html).toContain('Rien ne réclame votre attention');
		expect(html).not.toContain('À faire aujourd');
		expect(texte).toContain('Rien ne réclame votre attention');
		expect(texte).not.toContain('À faire aujourd');
	});

	it('nomme l’entreprise suivie dans la note', () => {
		expect(briefingHtml(calme)).toContain('Menuiserie Dupont');
	});
});

describe('les données venues de la base', () => {
	// Le nom d'une entreprise est une saisie libre au moment de l'inscription,
	// pas un champ contrôlé : rien n'empêche un « & » ou une tentative
	// d'injection d'y atterrir.
	const PIEGE = `<script>alert(1)</script> & Fils`;

	it('échappe un nom d’entreprise injecté dans la note', () => {
		const html = briefingHtml({ ...BASE, action: null, nomEntreprise: PIEGE });
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
	});

	it('échappe une ligne de briefing injectée dans le corps', () => {
		const html = briefingHtml({ ...BASE, lignes: [PIEGE] });
		expect(html).not.toContain('<script>');
	});

	it('laisse la version texte lisible, sans entités HTML, pour le nom et les lignes', () => {
		const texte = briefingTexte({ ...BASE, nomEntreprise: 'Carotte & compagnie', action: null });
		expect(texte).toContain('Carotte & compagnie');
		expect(texte).not.toContain('&amp;');
	});
});

describe('le montant identifié', () => {
	it('apparaît, déjà formaté par l’appelant, sans recalcul', () => {
		const d: BriefingData = { ...BASE, montantLisible: '12 480,50 €' };
		expect(briefingHtml(d)).toContain('12 480,50 €');
		expect(briefingTexte(d)).toContain('12 480,50 €');
	});

	it('porte l’étiquette « Identifié à ce jour », en vert : un fait constaté, pas un seuil raté', () => {
		const html = briefingHtml(BASE);
		expect(html).toContain('Identifié à ce jour');
		expect(html).toContain('#05893e');
	});
});
