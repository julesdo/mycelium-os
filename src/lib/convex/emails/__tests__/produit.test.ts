import { describe, it, expect } from 'vitest';
import {
	coquilleHtml,
	coquilleTexte,
	formaterEntier,
	formaterEuros
} from '../modeles/disposition';
import { bilanPretHtml, bilanPretTexte } from '../modeles/bilanPret';
import { produitsAConfirmerHtml, produitsAConfirmerTexte } from '../modeles/produitsAConfirmer';
import { rappelDeclarationHtml, rappelDeclarationTexte } from '../modeles/rappelDeclaration';

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

describe("l'e-mail de bilan", () => {
	const DONNEES = {
		annee: 2026,
		lignesLues: 1842,
		taux: [
			{ libelle: 'Produits durables', valeur: '39 %', etat: 'manque' as const },
			{ libelle: 'dont bio', valeur: '21 %', etat: 'atteint' as const },
			{ libelle: 'Viande et poisson', valeur: '42 %', etat: 'manque' as const }
		],
		url: 'https://www.letikette.com/app/diagnostic/abc'
	};

	it('porte les trois taux dans le corps, pas seulement derrière le lien', () => {
		const html = bilanPretHtml(DONNEES);
		expect(html).toContain('39 %');
		expect(html).toContain('21 %');
		expect(html).toContain('42 %');
	});

	it('annonce le nombre de lignes lues, formaté', () => {
		expect(bilanPretHtml(DONNEES)).toContain(`1${INSECABLE}842 lignes`);
	});

	it('mène au bilan', () => {
		expect(bilanPretHtml(DONNEES)).toContain(DONNEES.url);
		expect(bilanPretTexte(DONNEES)).toContain(DONNEES.url);
	});

	it('dit la même chose en texte qu’en HTML', () => {
		const texte = bilanPretTexte(DONNEES);
		for (const t of ['39 %', '21 %', '42 %', `1${INSECABLE}842`]) expect(texte).toContain(t);
	});

	it('ne promet aucun résultat', () => {
		expect(bilanPretHtml(DONNEES)).not.toMatch(/garanti/i);
		expect(bilanPretTexte(DONNEES)).not.toMatch(/garanti/i);
	});
});

describe("l'e-mail de file de confirmation", () => {
	// Le montant arrive déjà formaté, par le même formateur que la production :
	// le figer à la main dans le test laisserait passer une divergence entre les
	// deux.
	const DONNEES = {
		nombre: 12,
		montantEnJeu: formaterEuros(34000),
		viandePoisson: 4,
		url: 'https://www.letikette.com/app/confirmer'
	};

	it('dit le montant en jeu et pas seulement le nombre', () => {
		// « Douze produits » est une corvée ; « douze produits qui pèsent
		// 34 000 € » est une raison de s'y mettre.
		expect(produitsAConfirmerHtml(DONNEES)).toContain(formaterEuros(34000));
	});

	it('signale la viande et le poisson quand il y en a', () => {
		expect(produitsAConfirmerHtml(DONNEES)).toContain('60');
	});

	it("n'invente pas de viande quand il n'y en a pas", () => {
		const sans = produitsAConfirmerHtml({ ...DONNEES, viandePoisson: 0 });
		expect(sans).not.toContain('seuil de 60');
	});

	it('accorde le singulier', () => {
		const un = produitsAConfirmerTexte({ ...DONNEES, nombre: 1, viandePoisson: 0 });
		expect(un).toContain('1 produit attend votre confirmation');
	});

	it('accorde le pluriel', () => {
		expect(produitsAConfirmerTexte(DONNEES)).toContain('12 produits attendent');
	});
});

describe("le rappel de campagne", () => {
	const URL = 'https://www.letikette.com/app';

	it('dit d’aller saisir quand le bilan est prêt', () => {
		const html = rappelDeclarationHtml({
			etat: { situation: 'BILAN_PRET', annee: 2025 },
			url: URL
		});
		expect(html).toContain('prêt');
		expect(html).toContain('Ouvrir mon bilan');
	});

	it('dit combien il reste à confirmer quand la file est pleine', () => {
		const html = rappelDeclarationHtml({
			etat: { situation: 'FILE_PLEINE', annee: 2025, aConfirmer: 12 },
			url: URL
		});
		expect(html).toContain('12 produits');
		expect(html).toContain('Vider ma file');
	});

	it('dit combien de mois sont couverts quand l’exercice est incomplet', () => {
		const html = rappelDeclarationHtml({
			etat: { situation: 'INCOMPLET', annee: 2025, moisCouverts: 7 },
			url: URL
		});
		expect(html).toContain('7 mois');
		expect(html).toContain('Déposer mes factures');
	});

	it('n’agite jamais de compte à rebours', () => {
		// La date est vraie et vérifiable ; « plus que X jours » est une ficelle
		// que la cible reconnaît, et la reconnaître suffit à fermer le message.
		for (const etat of [
			{ situation: 'BILAN_PRET' as const, annee: 2025 },
			{ situation: 'FILE_PLEINE' as const, annee: 2025, aConfirmer: 3 },
			{ situation: 'INCOMPLET' as const, annee: 2025, moisCouverts: 2 }
		]) {
			const texte = rappelDeclarationTexte({ etat, url: URL });
			expect(texte).not.toMatch(/plus que \d+ jours?/i);
			expect(texte).not.toMatch(/derni(er|ère)s? chances?/i);
			expect(texte).not.toMatch(/sanction|amende/i);
		}
	});

	it('rappelle qui signe la déclaration', () => {
		const texte = rappelDeclarationTexte({
			etat: { situation: 'BILAN_PRET', annee: 2025 },
			url: URL
		});
		expect(texte).toMatch(/sign[ée]e? par votre [ée]tablissement/i);
	});
});
