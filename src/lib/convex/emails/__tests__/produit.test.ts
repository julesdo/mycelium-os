import { describe, it, expect } from 'vitest';
import {
	coquilleHtml,
	coquilleTexte,
	formaterEntier,
	formaterEuros
} from '../modeles/disposition';

/**
 * Les e-mails produit.
 *
 * Ce qu'on vérifie ici n'est pas l'esthétique, qui se regarde, mais les trois
 * choses qui cassent en silence : un nombre mal formaté, un libellé de facture
 * qui s'échappe dans le HTML, et une version texte qui raconte autre chose que
 * la version HTML.
 */

/**
 * L'espace insécable, déclarée par son point de code et jamais tapée.
 *
 * C'est elle que le formateur insère, pour qu'un montant ne se coupe pas en fin
 * de ligne dans un client de messagerie. Écrite littéralement dans un test, elle
 * est invisible : le prochain éditeur la remplacerait par une espace ordinaire
 * sans que personne le voie, et l'assertion deviendrait fausse pour une raison
 * qu'on mettrait une heure à trouver. Le même piège a déjà coûté du temps sur
 * les assertions du PDF.
 */
const INSECABLE = String.fromCharCode(0x00a0);

describe('le formatage des nombres', () => {
	// `Intl` n'est que partiellement supporté par le moteur de Convex, d'où un
	// formateur écrit à la main. Il faut donc le tester comme du code, pas comme
	// un appel de bibliothèque.
	it('sépare les milliers par une espace insécable', () => {
		expect(formaterEntier(1842)).toBe(`1${INSECABLE}842`);
		expect(formaterEntier(180000)).toBe(`180${INSECABLE}000`);
		expect(formaterEntier(1234567)).toBe(`1${INSECABLE}234${INSECABLE}567`);
	});

	it('laisse les petits nombres intacts', () => {
		expect(formaterEntier(0)).toBe('0');
		expect(formaterEntier(7)).toBe('7');
		expect(formaterEntier(999)).toBe('999');
	});

	it('ne perd pas le signe des avoirs', () => {
		expect(formaterEntier(-1240)).toBe(`-1${INSECABLE}240`);
	});

	it('arrondit plutôt que de tronquer', () => {
		expect(formaterEntier(1240.6)).toBe(`1${INSECABLE}241`);
		expect(formaterEuros(12480.5)).toBe(`12${INSECABLE}481${INSECABLE}€`);
	});
});

describe("l'échappement", () => {
	// Les libellés viennent de factures passées à l'OCR. Un « & » y est banal,
	// et rien n'interdit à un fournisseur d'écrire ce qu'il veut sur une ligne.
	const PIEGE = `<script>alert("x")</script> & 'co'`;

	it('neutralise le HTML injecté dans un titre', () => {
		const html = coquilleHtml({ titre: PIEGE, intro: 'peu importe' });
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
		expect(html).toContain('&amp;');
	});

	it('neutralise le HTML injecté dans un chiffre', () => {
		const html = coquilleHtml({
			titre: 'Bilan',
			intro: 'Voici vos taux.',
			chiffres: [{ libelle: PIEGE, valeur: '39 %', etat: 'manque' }]
		});
		expect(html).not.toContain('<script>');
	});

	it("neutralise le HTML injecté dans l'adresse d'un bouton", () => {
		const html = coquilleHtml({
			titre: 'Bilan',
			intro: 'Voici vos taux.',
			bouton: { libelle: 'Ouvrir', url: 'https://x.test/"><script>alert(1)</script>' }
		});
		expect(html).not.toContain('<script>');
	});

	it('laisse la version texte lisible, sans entités HTML', () => {
		const texte = coquilleTexte({ titre: 'Carotte & compagnie', intro: 'Bonjour.' });
		expect(texte).toContain('Carotte & compagnie');
		expect(texte).not.toContain('&amp;');
	});
});

describe('les couleurs de seuil', () => {
	// Le vert, l'ambre et le rouge ne veulent dire qu'une chose dans tout le
	// produit : au-dessus du seuil, tout près, en dessous. Un e-mail qui les
	// emploierait autrement mentirait sur une conformité.
	const html = (etat: 'atteint' | 'proche' | 'manque') =>
		coquilleHtml({
			titre: 'Bilan',
			intro: 'Voici vos taux.',
			chiffres: [{ libelle: 'Durable', valeur: '39 %', etat }]
		});

	it('emploie le vert pour un seuil atteint', () => {
		expect(html('atteint')).toContain('#05893e');
	});

	it("emploie l'ambre quand le seuil est proche", () => {
		expect(html('proche')).toContain('#de9300');
	});

	it('emploie le rouge quand le seuil manque', () => {
		expect(html('manque')).toContain('#c92f33');
	});
});
