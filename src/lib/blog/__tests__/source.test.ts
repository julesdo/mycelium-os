import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { adresseDepuisTitre, ecrireArticle, lireArticle, relireArticle } from '../source';

/**
 * LE CMS NE DOIT JAMAIS ABÎMER UN ARTICLE (19/10/2026). Chaque fichier du dépôt se lit,
 * se réécrit et se relit à l'identique : sinon, ouvrir puis publier un article sans y
 * toucher changerait ce que le site affiche.
 */
const DOSSIER = join(import.meta.dirname, '..', '..', '..', '..', 'content', 'blog');
const FICHIERS = readdirSync(DOSSIER).filter((f) => f.endsWith('.mdx'));

describe('la source d’un article', () => {
	it('lit chaque article du dépôt', () => {
		for (const fichier of FICHIERS) {
			const lu = lireArticle(readFileSync(join(DOSSIER, fichier), 'utf8'));
			expect('erreurs' in lu ? lu.erreurs : [], fichier).toEqual([]);
		}
	});

	it('réécrit chaque article sans rien changer de ce qu’il dit', () => {
		for (const fichier of FICHIERS) {
			const lu = lireArticle(readFileSync(join(DOSSIER, fichier), 'utf8'));
			if ('erreurs' in lu) throw new Error(fichier);
			const relu = lireArticle(ecrireArticle(lu));
			if ('erreurs' in relu) throw new Error(`${fichier} : ${relu.erreurs.join(' ')}`);
			expect(relu.entete, fichier).toEqual(lu.entete);
			expect(relu.corps.trim(), fichier).toEqual(lu.corps.trim());
		}
	});

	it('refuse un en-tête que le build refuserait, en le disant en français', () => {
		const lu = lireArticle(
			'---\ntitre: Court\ndescription: trop courte\ndate: 2026-02-30\ncategorie: Autre\n---\n\nCorps.'
		);
		expect('erreurs' in lu).toBe(true);
		if (!('erreurs' in lu)) return;
		expect(lu.erreurs.join(' ')).toMatch(/Le titre est trop court/);
		expect(lu.erreurs.join(' ')).toMatch(/La catégorie n’est pas une valeur permise/);
	});

	it('bloque le mot interdit et une source absente du registre', () => {
		const lu = lireArticle(
			readFileSync(join(DOSSIER, 'frais-de-recouvrement-40-euros.mdx'), 'utf8')
		);
		if ('erreurs' in lu) throw new Error('lecture');
		const fautif = {
			...lu,
			corps: `${lu.corps}\nUne garantie de résultat. <Source de="inventee" />`
		};
		const { bloquants } = relireArticle('frais-de-recouvrement-40-euros', fautif, []);
		expect(bloquants.some((b) => b.includes('garantie'))).toBe(true);
		expect(bloquants.some((b) => b.includes('inventee'))).toBe(true);
	});

	it('fait une adresse d’un titre', () => {
		expect(adresseDepuisTitre('Hôpital qui paie en retard, des pénalités dues')).toBe(
			'hopital-qui-paie-en-retard-des-penalites-dues'
		);
		expect(adresseDepuisTitre('Sous-traitant impayé, l’action directe')).toBe(
			'sous-traitant-impaye-l-action-directe'
		);
	});
});
