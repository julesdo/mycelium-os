// @vitest-environment node
//
// L'appel réel au SDK Anthropic refuse de s'exécuter dans un environnement
// « browser-like » (jsdom, l'environnement par défaut du projet) pour ne
// jamais risquer d'exposer une clé API côté client. Ce test tourne en Node,
// comme le fera l'action Convex "use node" en production.
//
// Test d'intégration réel — NE TOURNE PAS PAR DÉFAUT et COÛTE UN APPEL API
// FACTURÉ. À lancer explicitement :
//
//   EGALIM_LIVE_API=1 bun run test:unit -- extracteurClaude
//
// Sauté (`describe.skip`) tant que la variable n'est pas positionnée à '1' —
// la seule présence d'ANTHROPIC_API_KEY ne suffit pas à déclencher l'appel,
// pour ne jamais facturer un appel réel pendant une exécution normale de la
// suite de tests.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { extraireAvecClaude } from '../documents/extracteur';
import { documentExtraitSchema } from '../../verticales/egalim/schemaFacture';
import { construirePromptExtraction } from '../../verticales/egalim/promptExtraction';
import { verifierExtraction } from '../documents/verification';

const RUN = process.env.EGALIM_LIVE_API === '1';
const describeIfLive = RUN ? describe : describe.skip;

describeIfLive('extraireAvecClaude (intégration réelle)', () => {
	it(
		'extrait correctement la fixture OCR grossiste-ocr-01.txt',
		{ timeout: 60_000 },
		async () => {
			const texte = readFileSync('src/lib/fixtures/factures/grossiste-ocr-01.txt', 'utf8');

			const { doc, usage } = await extraireAvecClaude({
				contenu: { type: 'texte', texte },
				schema: documentExtraitSchema,
				prompt: construirePromptExtraction()
			});

			expect(doc.lignes).toHaveLength(8);

			// La mention de conditionnement seule ne devient jamais une ligne.
			expect(doc.lignes.some((l) => l.rawLabel.includes('Cartons de 3kg'))).toBe(false);

			// Le libellé du cabillaud absorbe sa ligne de continuation (label MSC).
			const cabillaud = doc.lignes.find((l) => /CAB!?LLAUD/i.test(l.rawLabel));
			expect(cabillaud).toBeDefined();
			expect(cabillaud?.rawLabel).toContain('MSC');

			// La remise reste une ligne, avec son montant négatif.
			const remise = doc.lignes.find((l) => l.amountHT < 0);
			expect(remise).toBeDefined();
			expect(remise?.amountHT).toBeCloseTo(-2.25, 2);

			expect(doc.totaux.totalHT).toBeCloseTo(312.0, 2);
			const base55 = doc.totaux.basesParTaux.find((b) => b.taux === 5.5);
			const base20 = doc.totaux.basesParTaux.find((b) => b.taux === 20);
			expect(base55?.baseHT).toBeCloseTo(290.0, 2);
			expect(base20?.baseHT).toBeCloseTo(22.0, 2);

			const verif = verifierExtraction(doc);
			expect(verif.ok).toBe(true);

			// Peut être 0 au tout premier appel (cache pas encore écrit) — on
			// vérifie que le champ est bien rapporté, pas qu'il est non nul.
			expect(typeof usage.cacheReadTokens).toBe('number');
			expect(Number.isFinite(usage.cacheReadTokens)).toBe(true);
		}
	);
});
