import { describe, it, expect } from 'vitest';
import {
	PARAMETRES,
	exiger,
	exigerPourActe,
	estUtilisable,
	parametresManquants,
	parametresSansAvocat,
	tousLesParametres
} from '../parametres';

/**
 * Le garde-fou de la règle 0.1 du brief : aucune valeur juridique n'est écrite
 * en dur dans la logique métier, et aucune valeur non vérifiée ne peut servir
 * sans erreur explicite.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * DEUX BOOLÉENS, PAS UN — ET C'EST PLUS STRICT, PAS MOINS
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Le brief prévoyait un seul `verified`. Il en confondait deux choses :
 *
 *   · `verifie` — la valeur a été relevée sur une source publique citable.
 *     C'est ce qu'un logiciel peut faire, et ce qui suffit à CALCULER.
 *   · `valideParAvocat` — un juriste a contrôlé la valeur ET son applicabilité
 *     au cas. C'est ce que seul un humain compétent peut faire, et ce qu'il
 *     faut exiger avant de PRODUIRE UN ACTE.
 *
 * Un seul booléen forçait à choisir entre bloquer tout le produit et tout
 * ouvrir. Deux permettent de calculer et surveiller dès aujourd'hui, tout en
 * gardant la barrière là où une erreur devient irréversible.
 */

describe('structure des paramètres juridiques', () => {
	const entrees = tousLesParametres();

	it('porte au moins les paramètres énumérés par le brief', () => {
		expect(entrees.length).toBeGreaterThanOrEqual(8);
	});

	it.each(entrees)('« $cle » cite sa source et sa date de vérification', (parametre) => {
		expect(parametre.source.length).toBeGreaterThan(0);
		expect(parametre.verifieLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(parametre.note.length).toBeGreaterThan(0);
	});

	it('ne déclare jamais vérifiée une constante sans valeur', () => {
		const incoherentes = entrees.filter(
			(p) => p.nature === 'CONSTANTE' && p.verifie && p.valeur === null
		);
		expect(incoherentes.map((p) => p.cle)).toEqual([]);
	});

	it('ne valide jamais par avocat ce qui n’est même pas sourcé', () => {
		const incoherentes = entrees.filter((p) => p.valideParAvocat && !p.verifie);
		expect(incoherentes.map((p) => p.cle)).toEqual([]);
	});

	it('renvoie vers un module tout paramètre déclaré comme une série', () => {
		// Un taux qui change deux fois par an n'est pas une constante. Le déclarer
		// comme telle obligerait à choisir un semestre et à l'appliquer
		// rétroactivement à tout.
		for (const parametre of entrees.filter((p) => p.nature === 'SERIE')) {
			expect(parametre.resoluPar, parametre.cle).toBeTruthy();
		}
	});
});

describe('les valeurs relevées le 3 septembre 2026', () => {
	it('l’indemnité forfaitaire cite enfin son décret', () => {
		expect(exiger(PARAMETRES.indemniteForfaitaire)).toBe(4000n);
		expect(PARAMETRES.indemniteForfaitaire.source).toMatch(/D441-5/);
	});

	it('le taux par défaut est une série, résolue par le module France', () => {
		expect(PARAMETRES.tauxInteretLegalDefaut.nature).toBe('SERIE');
		expect(PARAMETRES.tauxInteretLegalDefaut.source).toMatch(/L441-10/);
		expect(PARAMETRES.tauxInteretLegalDefaut.resoluPar).toMatch(/france/);
	});

	it('la prescription est une série sectorielle, pas un délai unique', () => {
		expect(PARAMETRES.delaiPrescriptionCommerciale.nature).toBe('SERIE');
		expect(PARAMETRES.delaiPrescriptionCommerciale.source).toMatch(/L110-4/);
	});

	it('ne prétend pas qu’un avocat a validé quoi que ce soit', () => {
		expect(tousLesParametres().every((p) => p.valideParAvocat === false)).toBe(true);
	});
});

describe('exiger — la barrière du calcul', () => {
	it('rend la valeur d’une constante sourcée', () => {
		expect(exiger(PARAMETRES.indemniteForfaitaire)).toBe(4000n);
	});

	it('refuse une constante sans valeur, en la nommant', () => {
		expect(() => exiger(PARAMETRES.tarifCommissaireJusticeL126)).toThrowError(
			/tarifCommissaireJusticeL126/
		);
	});

	it('refuse une série, en renvoyant vers le module qui la résout', () => {
		expect(() => exiger(PARAMETRES.tauxInteretLegalDefaut)).toThrowError(/france/);
	});
});

describe('exigerPourActe — la barrière de l’irréversible', () => {
	it('refuse même une valeur sourcée tant qu’aucun avocat ne l’a validée', () => {
		// Calculer avec 40 € est sans risque : le chiffre s'affiche, il se
		// corrige. L'écrire dans un acte qui part au greffe ne se corrige pas.
		expect(() => exigerPourActe(PARAMETRES.indemniteForfaitaire)).toThrowError(/avocat/i);
	});

	it('énumère ce qui attend encore une validation juridique', () => {
		expect(parametresSansAvocat()).toContain('indemniteForfaitaire');
	});
});

describe('inspection', () => {
	it('tient une série résolue par un module pour utilisable', () => {
		expect(estUtilisable(PARAMETRES.tauxInteretLegalDefaut)).toBe(true);
	});

	it('ne tient pas pour utilisable une constante encore vide', () => {
		expect(estUtilisable(PARAMETRES.tarifCommissaireJusticeL126)).toBe(false);
	});

	it('ne signale plus comme manquant ce que le module France résout', () => {
		const manquants = parametresManquants();
		expect(manquants).not.toContain('tauxInteretLegalDefaut');
		expect(manquants).not.toContain('delaiPrescriptionCommerciale');
		// Ce qui manque vraiment reste signalé.
		expect(manquants).toContain('tarifCommissaireJusticeL126');
		expect(manquants).toContain('mentionsObligatoiresInjonction');
	});
});
