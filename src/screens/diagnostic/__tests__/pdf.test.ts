import { describe, it, expect, beforeAll } from 'vitest';
import { extractText, getDocumentProxy } from 'unpdf';
import { construireDiagnostic, nomFichier, type DiagnosticImprimable } from '../pdf';
import {
	MENTION_RESPONSABILITE,
	MENTION_FIGE,
	MENTION_OBLIGATION_DE_MOYENS,
	MENTION_SIGNATURE,
	MENTION_PORTEE_SIGNATURE
} from '../../../lib/convex/egalim/mentions';

/**
 * Ce que ces tests protègent : le seul artefact du produit qui sorte de
 * l'écran. Un diagnostic PDF est transmis à un directeur et présenté en cas de
 * contrôle. Il ne peut pas perdre en route une mention obligatoire, ni afficher
 * un chiffre différent de celui de l'écran, ni ouvrir sur des glyphes manquants.
 *
 * ON REND LE PDF ET ON EN RÉEXTRAIT LE TEXTE. Pas la description du document :
 * le document. C'est un test plus lent qu'une comparaison d'objets, et c'est le
 * seul qui prouve quelque chose sur le fichier qu'on remet au client — celui
 * que `window.print()` ne permettait pas d'examiner du tout.
 */

const dateMesure = '14 mars 2027';

const DIAGNOSTIC: DiagnosticImprimable = {
	organizationName: 'Votre cantine',
	siret: '12345678900012',
	periodStart: '2026-01-01',
	periodEnd: '2026-12-31',
	computedAt: Date.parse('2027-03-14T10:00:00Z'),
	classifierVersion: '2026-08',
	statut: 'DELIVERED',
	ratios: {
		durable: 0.39,
		bio: 0.21,
		meatFishDurable: 0.47,
		totalFoodHT: 180000,
		totalHT: 210000
	},
	seuils: { durable: 0.5, bio: 0.2, viandePoissonDurable: 0.6 },
	gapEuros: { toDurable50: 19800, toBio20: 0, toMeatFish60: 7900 },
	montantNonMesureHT: 4200,
	byFamily: [
		{ family: 'VIANDE', totalHT: 50400, durableHT: 7100, bioHT: 900 },
		{ family: 'FRUITS_LEGUMES', totalHT: 28800, durableHT: 12600, bioHT: 11800 }
	],
	bySupplier: [{ supplierName: 'Grossiste Alpha', totalHT: 82000, durableHT: 12000 }],
	ouBasculer: [{ family: 'VIANDE', montantNonDurableHT: 43300, pointsSiTotalementBascule: 18.4 }],
	attestations: [
		{ supplierName: 'Maison Bertin', amountAtStake: 6200, pointsRecuperables: 1.8, status: 'SENT' }
	],
	mentions: [MENTION_OBLIGATION_DE_MOYENS, MENTION_RESPONSABILITE, MENTION_FIGE(dateMesure)],
	empreinte: 'a3f1c9d2e4b78056a3f1c9d2e4b78056a3f1c9d2e4b78056a3f1c9d2e4b78056',
	signature: null
};

/** Le même bilan, signé. */
const SIGNE: DiagnosticImprimable = {
	...DIAGNOSTIC,
	signature: {
		nom: 'Claire Vasseur',
		fonction: 'Responsable de restauration',
		email: 'claire.vasseur@example.fr',
		signeLe: Date.parse('2027-03-14T11:30:00Z'),
		mention: MENTION_SIGNATURE,
		portee: MENTION_PORTEE_SIGNATURE,
		trace: null
	}
};

/**
 * Rend le document et en réextrait le texte.
 *
 * L'extraction rend un texte dont les espaces sont reconstruits à partir des
 * positions des glyphes : deux mots séparés à l'écran peuvent y être collés.
 * On normalise donc les espaces des deux côtés avant de comparer, sans quoi le
 * test échouerait sur la typographie du moteur plutôt que sur le contenu.
 */
async function texteDu(d: DiagnosticImprimable): Promise<string> {
	const octets = new Uint8Array(construireDiagnostic(d).output('arraybuffer'));
	const pdf = await getDocumentProxy(octets);
	const { text } = await extractText(pdf, { mergePages: true });
	return normaliser(text);
}

const normaliser = (s: string) => s.replace(/\s+/g, ' ').trim();

/**
 * Les mêmes formateurs que le document, et le même remplacement d'espace fine.
 *
 * `Intl` en français sépare le nombre de son symbole par une espace fine
 * INSÉCABLE (U+202F). Les polices standard d'un PDF ne la connaissent pas : le
 * document la convertit en espace ordinaire, et le test doit faire pareil pour
 * comparer la même chose.
 */
const pc = (n: number) =>
	normaliser(
		new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 0 }).format(n)
	);
const eur = (n: number) =>
	normaliser(
		new Intl.NumberFormat('fr-FR', {
			style: 'currency',
			currency: 'EUR',
			maximumFractionDigits: 0
		}).format(n)
	);

let complet = '';

beforeAll(async () => {
	complet = await texteDu(DIAGNOSTIC);
}, 30_000);

describe('le PDF porte ce qui l’engage', () => {
	it('les trois mentions obligatoires, mot pour mot', () => {
		expect(complet).toContain(normaliser(MENTION_OBLIGATION_DE_MOYENS));
		expect(complet).toContain(normaliser(MENTION_RESPONSABILITE));
		expect(complet).toContain(normaliser(MENTION_FIGE(dateMesure)));
	});

	it('l’identité de l’établissement, SIRET compris', () => {
		expect(complet).toContain('Votre cantine');
		expect(complet).toContain('12345678900012');
	});

	it('la version du barème sous lequel la mesure a été rendue', () => {
		expect(complet).toContain('2026-08');
	});

	it('la pagination, sur chaque page', () => {
		expect(complet).toContain('1 / ');
	});
});

describe('le PDF porte les mêmes chiffres que l’écran', () => {
	it('les trois taux', () => {
		expect(complet).toContain(pc(0.39));
		expect(complet).toContain(pc(0.21));
		expect(complet).toContain(pc(0.47));
	});

	it('un seuil franchi se dit franchi, il n’affiche pas un écart de zéro', () => {
		// Le bio est à 21 % pour un seuil de 20 % : « il manque 0 € » serait
		// exact et absurde.
		expect(complet).toContain(`Seuil de ${pc(0.2)} franchi.`);
	});

	it('ce qui n’a pas pu être mesuré, en euros', () => {
		expect(complet).toContain(eur(4200));
	});

	it('le symbole euro sort en euro, pas en carré', () => {
		// Les polices standard d'un PDF encodent l'euro à une position hors
		// ASCII : s'il ressort en glyphe manquant, tous les montants du document
		// sont illisibles, et rien d'autre ne le signalerait.
		expect(complet).toContain('€');
		expect(complet).not.toContain('�');
	});
});

describe('le PDF tient debout quand les données manquent', () => {
	it('ni fournisseurs, ni attestations, ni pistes, ni familles', async () => {
		const texte = await texteDu({
			...DIAGNOSTIC,
			bySupplier: [],
			attestations: [],
			ouBasculer: [],
			byFamily: []
		});
		expect(texte).toContain('Diagnostic EGalim 2026');
		expect(texte).toContain(normaliser(MENTION_RESPONSABILITE));
	}, 30_000);

	it('sans SIRET, il le dit au lieu de laisser un blanc', async () => {
		expect(await texteDu({ ...DIAGNOSTIC, siret: null })).toContain('non renseigné');
	}, 30_000);

	it('un taux au-dessus de 100 % ne fait pas déborder la jauge', async () => {
		// Un avoir mal classé peut produire un ratio supérieur à 1.
		const texte = await texteDu({
			...DIAGNOSTIC,
			ratios: { ...DIAGNOSTIC.ratios, durable: 1.4 }
		});
		expect(texte).toContain(pc(1.4));
	}, 30_000);

	it('cent familles et cent fournisseurs : il pagine au lieu de déborder', async () => {
		const beaucoup: DiagnosticImprimable = {
			...DIAGNOSTIC,
			bySupplier: Array.from({ length: 100 }, (_, i) => ({
				supplierName: `Fournisseur ${i + 1}`,
				totalHT: 1000 + i,
				durableHT: 100 + i
			}))
		};
		const octets = new Uint8Array(construireDiagnostic(beaucoup).output('arraybuffer'));
		const pdf = await getDocumentProxy(octets);
		expect(pdf.numPages).toBeGreaterThan(1);

		// Les mentions obligatoires doivent survivre à la pagination : c'est
		// exactement le cas où une mise en page à la main les pousse hors page.
		const { text } = await extractText(pdf, { mergePages: true });
		expect(normaliser(text)).toContain(normaliser(MENTION_RESPONSABILITE));
	}, 30_000);
});

describe('nomFichier', () => {
	it('se lit dans un dossier de vingt pièces jointes', () => {
		expect(nomFichier(DIAGNOSTIC)).toBe('diagnostic-egalim-2026-votre-cantine.pdf');
	});

	it('survit aux accents et à la ponctuation', () => {
		expect(nomFichier({ ...DIAGNOSTIC, organizationName: 'Crèche Les Écureuils (Ouest)' })).toBe(
			'diagnostic-egalim-2026-creche-les-ecureuils-ouest.pdf'
		);
	});

	it('ne produit jamais un nom vide', () => {
		expect(nomFichier({ ...DIAGNOSTIC, organizationName: '—' })).toBe(
			'diagnostic-egalim-2026-etablissement.pdf'
		);
	});
});

describe('le PDF dit s’il est signé, et par qui', () => {
	it('non signé, il le dit — au lieu de laisser croire que ce n’était pas nécessaire', async () => {
		const texte = await texteDu(DIAGNOSTIC);
		expect(texte).toContain("Ce bilan n'a pas ete signe");
		// L'empreinte y figure quand même : c'est elle qui identifie la mesure,
		// signée ou non.
		expect(texte).toContain('A3F1');
	}, 30_000);

	it('signé, il porte le signataire, sa fonction, son compte et la date', async () => {
		const texte = await texteDu(SIGNE);
		expect(texte).toContain('Claire Vasseur');
		expect(texte).toContain('Responsable de restauration');
		expect(texte).toContain('claire.vasseur@example.fr');
		expect(texte).toContain('14 mars 2027');
	}, 30_000);

	it('signé, il porte ce qui a été signé ET ce que la signature vaut', async () => {
		const texte = await texteDu(SIGNE);
		expect(texte).toContain(normaliser(MENTION_SIGNATURE));
		// La mention de portée est la plus importante du lot : elle dit que la
		// signature n'est pas qualifiée. La perdre transformerait le document en
		// promesse que personne ne peut tenir.
		expect(texte).toContain(normaliser(MENTION_PORTEE_SIGNATURE));
	}, 30_000);

	it('signé, il porte l’empreinte de ce qui a été signé', async () => {
		const texte = await texteDu(SIGNE);
		expect(texte).toContain('A3F1 C9D2');
	}, 30_000);
});
