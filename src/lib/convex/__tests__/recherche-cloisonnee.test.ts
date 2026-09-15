/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import { defineTable } from 'convex/server';
import { v } from 'convex/values';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import schema from '../schema';
import { internal } from '../_generated/api';
import { normaliserFournisseur } from '../../socle/normalisation';

/**
 * LA RECHERCHE NE MONTRE JAMAIS LES DONNÉES D'UN AUTRE ÉTABLISSEMENT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE TEST EST L'EXCEPTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un index de recherche sans filtre d'établissement rendrait les débiteurs de
 * TOUS les clients. C'est le seul oubli du produit à la fois silencieux (rien
 * ne casse, la palette montre des résultats plausibles) et total (tous les
 * clients, d'un coup). La règle se tient donc à trois endroits, et ce fichier
 * les vérifie :
 *
 *   1. le COMPORTEMENT, par `convex-test` : deux établissements aux mêmes noms,
 *      SIREN, références et dossiers ; chacun ne voit que les siens ;
 *   2. le SCHÉMA : tout index de recherche déclare `organizationId` en filtre ;
 *   3. le CODE : tout appel `withSearchIndex` applique ce filtre.
 *
 * ⚠️ LE FAUX MOTEUR DE `convex-test` NE DÉCOUPE PAS COMME CONVEX. Il coupe sur
 * les espaces et compare en préfixe ; Convex fait de `FA-2026-0311` trois
 * jetons combinés en OU. Ce test ne prétend donc RIEN vérifier du découpage ni
 * du classement : seulement que rien ne franchit la frontière d'un
 * établissement. Et c'est pour ça que les vérifications 2 et 3 existent : un
 * test vert sur le faux moteur ne prouve pas que l'index réel filtre.
 */

const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);

const DELAI_CONVEX = 30_000;

/** Le même dossier, à l'identique, dans un établissement. */
async function poser(t: ReturnType<typeof convexTest>, nom: string) {
	return await t.run(async (ctx) => {
		const organizationId = await ctx.db.insert('organizations', {
			name: nom,
			createdAt: Date.now()
		});
		const debiteurId = await ctx.db.insert('debiteurs', {
			organizationId,
			denomination: 'Fournitures Durand',
			denominationNormalisee: normaliserFournisseur('Fournitures Durand'),
			denominationsBrutes: ['Fournitures Durand'],
			siren: '853479236',
			estCommercant: 'ok',
			santeFinanciere: 'INCONNUE',
			creeLe: Date.now()
		});
		const creanceId = await ctx.db.insert('creances', {
			organizationId,
			debiteurId,
			statut: 'ENGAGEE',
			certaine: 'ok',
			liquide: 'ok',
			exigible: 'ok',
			entreCommercants: 'ok',
			procedureEngagee: 'injonction-de-payer',
			engageeLe: '2026-06-04',
			creeLe: Date.now()
		});
		const factureId = await ctx.db.insert('facturesVente', {
			organizationId,
			debiteurId,
			reference: 'FA-2026-0311',
			montantHT: 0n,
			montantTTC: 24_990n,
			dateEmission: '2026-07-01',
			dateEcheance: '2026-08-01',
			statutPaiement: 'IMPAYEE',
			creanceId,
			creeLe: Date.now()
		});
		return { organizationId, debiteurId, creanceId, factureId };
	});
}

type Pose = Awaited<ReturnType<typeof poser>>;

/** Tous les identifiants qu'une réponse porte, où qu'ils soient. */
function identifiants(resultat: unknown): string[] {
	const texte = JSON.stringify(resultat, (_cle, valeur: unknown) =>
		typeof valeur === 'bigint' ? valeur.toString() : valeur
	);
	return texte.match(/"(?:_id|creanceId|debiteurId)":"([^"]+)"/g) ?? [];
}

function aucunDe(resultat: unknown, autre: Pose): void {
	const siens = [autre.debiteurId, autre.creanceId, autre.factureId] as string[];
	const fuites = identifiants(resultat).filter((trouve) => siens.some((id) => trouve.includes(id)));
	expect(fuites, 'La recherche rend un document d’un autre établissement').toEqual([]);
}

describe('la recherche, entre deux établissements', () => {
	it(
		'par nom : chacun ne trouve que son débiteur et son dossier',
		async () => {
			const t = convexTest(schema, modules);
			const a = await poser(t, 'Établissement A');
			const b = await poser(t, 'Établissement B');

			const resultat = await t.query(internal.recouvrement.recherche.rechercheInterne, {
				organizationId: a.organizationId,
				terme: 'Durand'
			});

			expect(resultat.debiteurs.premiers.map((d) => d._id)).toEqual([a.debiteurId]);
			expect(resultat.procedures.premiers.map((p) => p.creanceId)).toEqual([a.creanceId]);
			aucunDe(resultat, b);
		},
		DELAI_CONVEX
	);

	it(
		'par référence exacte : sa facture, et le dossier qui la porte',
		async () => {
			const t = convexTest(schema, modules);
			const a = await poser(t, 'Établissement A');
			const b = await poser(t, 'Établissement B');

			const resultat = await t.query(internal.recouvrement.recherche.rechercheInterne, {
				organizationId: b.organizationId,
				terme: 'FA-2026-0311'
			});

			expect(resultat.factures.premiers.map((f) => f._id)).toEqual([b.factureId]);
			expect(resultat.factures.total).toBe(1);
			expect(resultat.procedures.premiers.map((p) => p.creanceId)).toEqual([b.creanceId]);
			aucunDe(resultat, a);
		},
		DELAI_CONVEX
	);

	it(
		'par SIREN, et par SIRET : le même numéro chez l’autre ne sort pas',
		async () => {
			const t = convexTest(schema, modules);
			const a = await poser(t, 'Établissement A');
			const b = await poser(t, 'Établissement B');

			for (const terme of ['853 479 236', '85347923600017']) {
				const resultat = await t.query(internal.recouvrement.recherche.rechercheInterne, {
					organizationId: a.organizationId,
					terme
				});
				expect(
					resultat.debiteurs.premiers.map((d) => d._id),
					terme
				).toEqual([a.debiteurId]);
				aucunDe(resultat, b);
			}
		},
		DELAI_CONVEX
	);

	it(
		'avant la frappe : un identifiant de l’autre établissement ne rend rien',
		async () => {
			const t = convexTest(schema, modules);
			const a = await poser(t, 'Établissement A');
			const b = await poser(t, 'Établissement B');

			const resultat = await t.query(internal.recouvrement.recherche.rechercheInterne, {
				organizationId: a.organizationId,
				terme: '',
				recents: [b.debiteurId, a.debiteurId]
			});

			expect(resultat.recents.map((d) => d._id)).toEqual([a.debiteurId]);
			aucunDe(resultat, b);
		},
		DELAI_CONVEX
	);
});

// ─────────────────────────────────────────────────────────────────────────────
// Le schéma et le code : la frontière tenue là où le faux moteur ne voit rien.
// ─────────────────────────────────────────────────────────────────────────────

interface IndexDeRecherche {
	indexDescriptor: string;
	filterFields: string[];
}

/** Les index de recherche qui ne filtrent pas par établissement. */
function indexNonCloisonnes(tables: Readonly<Record<string, unknown>>): {
	fautifs: string[];
	lus: number;
} {
	const fautifs: string[] = [];
	let lus = 0;
	for (const [nom, table] of Object.entries(tables)) {
		const exporte = (
			table as {
				export: () => {
					searchIndexes?: IndexDeRecherche[];
					stagedSearchIndexes?: IndexDeRecherche[];
				};
			}
		).export();
		for (const index of [
			...(exporte.searchIndexes ?? []),
			...(exporte.stagedSearchIndexes ?? [])
		]) {
			lus += 1;
			if (!index.filterFields.includes('organizationId')) {
				fautifs.push(`${nom}.${index.indexDescriptor}`);
			}
		}
	}
	return { fautifs, lus };
}

/**
 * Les appels `withSearchIndex` dont les parenthèses ne portent pas
 * `.eq('organizationId'`. Les parenthèses sont suivies à la main : un filtre
 * posé APRÈS l'appel (un `.filter` sur le résultat) ne compte pas, parce qu'il
 * ne borne pas ce que l'index a lu.
 */
function appelsNonCloisonnes(source: string): { fautifs: string[]; lus: number } {
	const fautifs: string[] = [];
	let lus = 0;
	const motif = 'withSearchIndex(';
	let depart = source.indexOf(motif);
	while (depart !== -1) {
		lus += 1;
		const ouverture = depart + motif.length - 1;
		let profondeur = 0;
		let fin = source.length - 1;
		for (let i = ouverture; i < source.length; i += 1) {
			if (source[i] === '(') profondeur += 1;
			else if (source[i] === ')') {
				profondeur -= 1;
				if (profondeur === 0) {
					fin = i;
					break;
				}
			}
		}
		const appel = source.slice(ouverture, fin + 1);
		if (!/\.eq\(\s*['"]organizationId['"]/.test(appel)) {
			fautifs.push(appel.replace(/\s+/g, ' ').slice(0, 100));
		}
		depart = source.indexOf(motif, fin);
	}
	return { fautifs, lus };
}

function fichiersConvex(dossier: string, acc: string[] = []): string[] {
	for (const entree of readdirSync(dossier)) {
		if (entree === '_generated' || entree === '__tests__' || entree === 'node_modules') continue;
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) fichiersConvex(chemin, acc);
		else if (/\.tsx?$/.test(entree)) acc.push(chemin);
	}
	return acc;
}

describe('la frontière de la recherche, dans le schéma et dans le code', () => {
	it('tout index de recherche du schéma filtre par établissement', () => {
		const { fautifs, lus } = indexNonCloisonnes(schema.tables);
		// Sur zéro index lu, l'assertion suivante passerait sans rien vérifier.
		expect(lus).toBeGreaterThanOrEqual(2);
		expect(fautifs, 'Index de recherche sans `organizationId` en filtre').toEqual([]);
	});

	it('tout appel withSearchIndex applique le filtre d’établissement', () => {
		const racine = join(process.cwd(), 'src', 'lib', 'convex');
		const fautifs: string[] = [];
		let lus = 0;
		for (const chemin of fichiersConvex(racine)) {
			const resultat = appelsNonCloisonnes(readFileSync(chemin, 'utf8'));
			lus += resultat.lus;
			fautifs.push(...resultat.fautifs.map((f) => `${relative(racine, chemin)} : ${f}`));
		}
		expect(lus).toBeGreaterThanOrEqual(2);
		expect(fautifs, "Recherche plein texte sans `.eq('organizationId', …)`").toEqual([]);
	});

	it('les deux vérifications mordent sur un cas fautif', () => {
		const sansFiltre = defineTable({ organizationId: v.id('organizations'), nom: v.string() })
			.searchIndex('sans_filtre', { searchField: 'nom' })
			.searchIndex('avec_filtre', { searchField: 'nom', filterFields: ['organizationId'] });
		expect(indexNonCloisonnes({ essai: sansFiltre }).fautifs).toEqual(['essai.sans_filtre']);

		const oubli =
			"ctx.db.query('debiteurs').withSearchIndex('x', (q) => q.search('nom', t)).take(3)";
		const tropTard =
			"ctx.db.query('debiteurs').withSearchIndex('x', (q) => q.search('nom', t)).filter((q) => q.eq('organizationId', o))";
		const juste =
			"ctx.db.query('debiteurs').withSearchIndex('x', (q) =>\n\tq.search('nom', t).eq('organizationId', o)\n).take(3)";
		expect(appelsNonCloisonnes(oubli).fautifs).toHaveLength(1);
		expect(appelsNonCloisonnes(tropTard).fautifs).toHaveLength(1);
		expect(appelsNonCloisonnes(juste)).toEqual({ fautifs: [], lus: 1 });
	});
});
