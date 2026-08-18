// @vitest-environment node
//
// Test d'intégration réel — NE TOURNE PAS PAR DÉFAUT et COÛTE DEUX APPELS API
// FACTURÉS. À lancer explicitement :
//
//   EGALIM_LIVE_API=1 bun run test:unit -- classificateurClaude
//
// Deux appels et non un : le second sert à vérifier que le référentiel est
// bien LU depuis le cache. Sans cache, le coût par diagnostic sort du budget
// sans qu'aucun signal ne le dise.
import { describe, it, expect } from 'vitest';
import { classifierAvecClaude } from '../classificateurClaude';
import { normaliserLibelle } from '../normalisation';
import { deriverVerdict } from '../verdict';
import { rapprocher } from '../appariement';

const RUN = process.env.EGALIM_LIVE_API === '1';
const describeIfLive = RUN ? describe : describe.skip;

/**
 * Un jeu volontairement piégeux : trois vrais labels, quatre faux amis, deux
 * mentions creuses, un non-alimentaire et deux libellés océrisés. Ce sont les
 * cas où une classification naïve se trompe, et où l'erreur coûte le plus.
 */
const LIBELLES_BRUTS = [
	'CAROTTE RONDELLE 4/4 BIO 2.5KG',
	'FILET DE CABILLAUD MSC SURGELE',
	'POULET FERMIER LABEL ROUGE PAC',
	'STEAK HACHE 15% VBF FRAIS',
	'OEUFS FRAIS PLEIN AIR CODE 1 X30',
	'TOMATE GRAPPE ORIGINE FRANCE CAT1',
	'PAVE DE SAUMON ATL. N.E FAO 27',
	'POMME GALA HVE NIVEAU 2',
	'PAIN DE CAMPAGNE FAIT MAISON',
	'CAROTTES SABLES LOCAL CIRCUIT COURT',
	'FRAIS DE PORT LIVRAISON FRIGO',
	'CAB!LLAUD D0S SANS PEAU'
];

describeIfLive('classifierAvecClaude (intégration réelle)', () => {
	it(
		'classe un jeu piégeux sans se laisser prendre aux faux amis',
		{ timeout: 120_000 },
		async () => {
			const libelles = LIBELLES_BRUTS.map(normaliserLibelle);
			const { classifications, usage } = await classifierAvecClaude({ libelles });

			const { appariees, manquants } = rapprocher(libelles, classifications);
			expect(manquants).toEqual([]);
			expect(appariees).toHaveLength(libelles.length);

			const par = new Map(appariees.map((c) => [c.normalizedLabel, c]));
			const verdictDe = (brut: string) => {
				const c = par.get(normaliserLibelle(brut));
				if (!c) throw new Error(`Pas de classification pour « ${brut} »`);
				return {
					...deriverVerdict(c, 'AUTO'),
					justification: c.justification,
					confidence: c.confidence
				};
			};

			// --- Les vrais labels doivent qualifier ---
			const carotte = verdictDe('CAROTTE RONDELLE 4/4 BIO 2.5KG');
			expect(carotte.qualifyingLabels).toContain('AB');
			expect(carotte.isBio).toBe(true);
			expect(carotte.isDurable).toBe(true);

			const cabillaud = verdictDe('FILET DE CABILLAUD MSC SURGELE');
			expect(cabillaud.qualifyingLabels).toContain('PECHE_DURABLE');
			expect(cabillaud.isDurable).toBe(true);
			expect(cabillaud.isBio).toBe(false);

			const poulet = verdictDe('POULET FERMIER LABEL ROUGE PAC');
			expect(poulet.isDurable).toBe(true);
			expect(poulet.isBio).toBe(false);

			// --- Les faux amis ne doivent RIEN qualifier ---
			for (const brut of [
				'STEAK HACHE 15% VBF FRAIS',
				'OEUFS FRAIS PLEIN AIR CODE 1 X30',
				'TOMATE GRAPPE ORIGINE FRANCE CAT1',
				'PAVE DE SAUMON ATL. N.E FAO 27',
				'POMME GALA HVE NIVEAU 2',
				'PAIN DE CAMPAGNE FAIT MAISON',
				'CAROTTES SABLES LOCAL CIRCUIT COURT'
			]) {
				const v = verdictDe(brut);
				expect(v.qualifyingLabels, `${brut} ne doit porter aucun label`).toEqual([]);
				expect(v.isDurable, `${brut} ne doit pas être durable`).toBe(false);
				expect(v.isBio, `${brut} ne doit pas être bio`).toBe(false);
			}

			// --- Le non-alimentaire sort du calcul ---
			expect(verdictDe('FRAIS DE PORT LIVRAISON FRIGO').isFood).toBe(false);

			// --- L'OCR se lit à travers ---
			const ocerise = verdictDe('CAB!LLAUD D0S SANS PEAU');
			expect(ocerise.isFood).toBe(true);
			expect(ocerise.family).toBe('POISSON');

			// --- Viande et poisson partent systématiquement en arbitrage ---
			expect(cabillaud.reviewStatus).toBe('PENDING_REVIEW');
			expect(poulet.reviewStatus).toBe('PENDING_REVIEW');
			expect(verdictDe('STEAK HACHE 15% VBF FRAIS').reviewStatus).toBe('PENDING_REVIEW');

			// --- Aucune classification sans justification ---
			for (const c of appariees) {
				expect(c.justification.trim().length, c.normalizedLabel).toBeGreaterThan(10);
			}

			expect(usage.tokensIn).toBeGreaterThan(0);
		}
	);

	it(
		'lit le référentiel depuis le cache au second appel',
		{ timeout: 120_000 },
		async () => {
			// Premier appel : écrit le cache (ou le lit s'il est encore chaud
			// d'une exécution précédente — les deux conviennent).
			await classifierAvecClaude({ libelles: ['RIZ LONG GRAIN 5KG'] });
			const { usage } = await classifierAvecClaude({ libelles: ['LENTILLES VERTES 5KG'] });

			// À zéro, le prompt système varie d'un appel à l'autre : chercher une
			// date ou un identifiant qui s'y serait glissé.
			expect(usage.cacheReadTokens).toBeGreaterThan(0);
		}
	);
});
