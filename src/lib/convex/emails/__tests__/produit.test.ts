import { describe, it, expect } from 'vitest';
import { coquilleHtml, coquilleTexte, formaterEntier, formaterEuros } from '../modeles/disposition';

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
	const BASE = { apercu: 'Aperçu', titre: 'Bilan', intro: 'Bonjour.' };

	it('neutralise le HTML injecté dans un titre', () => {
		const html = coquilleHtml({ ...BASE, titre: PIEGE });
		expect(html).not.toContain('<script>');
		expect(html).toContain('&lt;script&gt;');
		expect(html).toContain('&amp;');
	});

	it('neutralise le HTML injecté dans un montant, une rangée et un point', () => {
		const html = coquilleHtml({
			...BASE,
			montant: { libelle: PIEGE, valeur: PIEGE, precision: PIEGE },
			rangees: [{ libelle: PIEGE, valeur: PIEGE }],
			points: [PIEGE]
		});
		expect(html).not.toContain('<script>');
	});

	it("neutralise le HTML injecté dans l'aperçu et dans l'adresse d'un bouton", () => {
		const html = coquilleHtml({
			...BASE,
			apercu: PIEGE,
			bouton: {
				libelle: 'Ouvrir',
				url: 'https://x.test/"><script>alert(1)</script>',
				secours: true
			}
		});
		expect(html).not.toContain('<script>');
	});

	it('laisse la version texte lisible, sans entités HTML', () => {
		const texte = coquilleTexte({ ...BASE, titre: 'Carotte & compagnie' });
		expect(texte).toContain('Carotte & compagnie');
		expect(texte).not.toContain('&amp;');
	});
});

describe('les deux versions disent la même chose', () => {
	const bloc = {
		apercu: 'Aperçu',
		titre: 'Votre point du matin',
		intro: 'Une facture attend.',
		montant: { libelle: 'Factures échues', valeur: '1 842,00 €' },
		rangees: [{ libelle: 'Formule', valeur: 'Équipe' }],
		points: ['Une relance est partie.'],
		bouton: { libelle: 'Ouvrir Letikette', url: 'https://www.letikette.com/app' },
		apresBouton: 'Ce lien est valable 20 minutes.',
		note: 'Vous recevez ce message parce que…'
	};

	it('porte chaque morceau du bloc dans le HTML et dans le texte', () => {
		const html = coquilleHtml(bloc);
		const texte = coquilleTexte(bloc);
		for (const morceau of [
			'1 842,00 €',
			'Équipe',
			'Une relance est partie.',
			bloc.bouton.url,
			bloc.apresBouton
		]) {
			expect(html).toContain(morceau);
			expect(texte).toContain(morceau);
		}
	});
});

describe('les couleurs de seuil', () => {
	// Le vert, l'ambre et le rouge ne veulent dire qu'une chose dans tout le
	// produit : au-dessus du seuil, tout près, en dessous. Un montant dû n'est
	// ni l'un ni l'autre, et un e-mail ne les emploie pour rien d'autre.
	it("n'apparaissent nulle part dans la coquille", () => {
		const html = coquilleHtml({
			apercu: 'Aperçu',
			titre: 'Bilan',
			intro: 'Bonjour.',
			montant: { libelle: 'Dû', valeur: '12 €', precision: 'TTC' },
			rangees: [{ libelle: 'A', valeur: 'B' }],
			points: ['Un point'],
			bouton: { libelle: 'Ouvrir', url: 'https://x.test' }
		}).toLowerCase();
		for (const seuil of ['#05893e', '#de9300', '#c92f33']) {
			expect(html).not.toContain(seuil);
		}
	});
});
