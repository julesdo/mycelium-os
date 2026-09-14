import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * LES ÉCRANS DE PASSAGE : CEUX QU'ON MONTRE SONT CEUX QU'ON AFFICHE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE TEST EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La page introuvable et l'écran d'erreur étaient écrits en ligne dans les
 * options de `createRouter`, et exportés nulle part. Aucun écran ne pouvait donc
 * les importer, pas même la salle d'exposition : personne ne les avait jamais
 * regardés aux quatre largeurs. Ils disaient encore « vos taux » et « tableau de
 * bord », le vocabulaire d'avant le pivot.
 *
 * Les déplacer ne suffit pas. La salle d'exposition a déjà montré des pages que
 * le produit n'affiche pas (`DemoLitige`, `DemoHabitude`, qui portaient d'autres
 * titres que les vrais écrans). Ce test tient les deux bouts : le routeur
 * affiche CES écrans, et la salle d'exposition montre CES écrans.
 */

const RACINE = join(process.cwd(), 'src');
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), 'utf8');

describe('les écrans de passage', () => {
	it('sont ceux que le routeur affiche vraiment', () => {
		const routeur = lire('router.tsx');
		expect(routeur).toMatch(/defaultNotFoundComponent:\s*\(\)\s*=>\s*<EcranIntrouvable\s*\/>/);
		expect(routeur).toMatch(/defaultErrorComponent:\s*\(\)\s*=>\s*<EcranEnErreur\s*\/>/);
	});

	it('sont ceux que la salle d’exposition montre', () => {
		const salle = lire('routes/showroom.tsx');
		expect(salle).toMatch(
			/import \{ EcranIntrouvable, EcranEnErreur \} from '\.\.\/screens\/passage';/
		);
		expect(salle).toMatch(/ecran === 'introuvable' \? <EcranIntrouvable \/>/);
		expect(salle).toMatch(/ecran === 'erreur' \? <EcranEnErreur \/>/);
	});

	it('offrent chacun un chemin vers l’accueil, en action principale', () => {
		const ecrans = lire('screens/passage.tsx');
		const versAccueil = ecrans.match(/<BoutonPrincipal as=\{Link\} to="\/app">/g) ?? [];
		expect(versAccueil).toHaveLength(2);
	});

	it('ne font jamais du rechargement l’issue principale', () => {
		// Sur un lien de créance périmé, recharger refait l'erreur à l'identique.
		// Le rechargement reste possible, en second, et à un seul endroit.
		const ecrans = lire('screens/passage.tsx');
		expect(ecrans.match(/reload\(\)/g) ?? []).toHaveLength(1);
		expect(ecrans).toMatch(/<BoutonSecondaire onClick=\{\(\) => window\.location\.reload\(\)\}>/);
	});
});
