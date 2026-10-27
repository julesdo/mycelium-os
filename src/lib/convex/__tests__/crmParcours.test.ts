/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { convexTest } from 'convex-test';
import schema from '../schema';
import type { Id } from '../_generated/dataModel';
import { deplacerDansLeParcours } from '../admin/prospects';

/**
 * UNE FICHE SE CLASSE DANS SON PARCOURS (lot pilote du 27/10/2026). Aucun geste ne
 * mettait une fiche dans « Fournisseurs publics » : ni choix à la création, ni
 * déplacement. Les cinq fiches du lot restaient dans « PME logiciel ».
 */
const modules = Object.fromEntries(
	Object.entries(import.meta.glob('../**/*.ts')).map(([chemin, charger]) => [
		'.' + chemin.slice(2),
		charger
	])
);
const DELAI = 30_000;
const AUTEUR = 'jules@letikette.com';

async function fiche(
	t: ReturnType<typeof convexTest>,
	entreprise: string,
	champs: { statut?: 'A_CONTACTER' | 'STOP'; etapeParcours?: string } = {}
): Promise<Id<'prospects'>> {
	return t.run((ctx) =>
		ctx.db.insert('prospects', {
			entreprise,
			cible: 'PME',
			statut: champs.statut ?? 'A_CONTACTER',
			parcours: 'PME_LOGICIEL',
			etapeParcours: champs.etapeParcours ?? 'CONTACTE',
			creePar: AUTEUR,
			creeLe: Date.now()
		})
	);
}

describe('le déplacement d’une fiche dans un autre parcours', () => {
	it(
		'la classe, la pose à la première étape du parcours, et le note à son historique',
		async () => {
			const t = convexTest(schema, modules);
			const id = await fiche(t, 'Hôpital fournisseur SARL');
			const avant = await t.run((ctx) =>
				deplacerDansLeParcours(ctx, [id], 'FOURNISSEUR_PUBLIC', AUTEUR)
			);
			expect(avant).toEqual([{ id, parcours: 'PME_LOGICIEL', etapeParcours: 'CONTACTE' }]);
			await t.run(async (ctx) => {
				const p = await ctx.db.get(id);
				expect(p?.parcours).toBe('FOURNISSEUR_PUBLIC');
				expect(p?.etapeParcours).toBe('ESTIME');
				const historique = await ctx.db.query('evenementsCrm').collect();
				expect(historique.map((e) => [e.type, e.texte])).toEqual([
					['ETAPE', 'Fournisseurs publics · Estimé']
				]);
			});
		},
		DELAI
	);

	it(
		'garde l’étape quand le parcours d’arrivée la connaît',
		async () => {
			const t = convexTest(schema, modules);
			const id = await fiche(t, 'Transports Bellin', { etapeParcours: 'A_APPELER' });
			await t.run(async (ctx) => {
				await ctx.db.patch(id, { parcours: 'TRANSPORTEUR' });
				await deplacerDansLeParcours(ctx, [id], 'EXPERT_COMPTABLE', AUTEUR);
				expect((await ctx.db.get(id))?.etapeParcours).toBe('A_APPELER');
			});
		},
		DELAI
	);

	it(
		'laisse une fiche « Stop » et une fiche déjà dans ce parcours',
		async () => {
			const t = convexTest(schema, modules);
			const stop = await fiche(t, 'Ne plus écrire', { statut: 'STOP' });
			const deja = await fiche(t, 'Déjà là');
			const avant = await t.run((ctx) =>
				deplacerDansLeParcours(ctx, [stop, deja], 'PME_LOGICIEL', AUTEUR)
			);
			expect(avant).toEqual([]);
			const avantStop = await t.run((ctx) =>
				deplacerDansLeParcours(ctx, [stop], 'FOURNISSEUR_PUBLIC', AUTEUR)
			);
			expect(avantStop).toEqual([]);
		},
		DELAI
	);
});
