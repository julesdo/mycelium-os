import { ETAPES, type DatesDesEtapes, type Etape } from './etapes';
import { libelleDeSource, type SourceVisite } from './source';

/** Les étapes que compte le point du lundi, dans l'ordre où il les montre. */
export const ETAPES_DU_POINT: readonly Etape[] = ETAPES.filter((e) => e !== 'A_RISQUE');

export interface LigneDeSource {
	readonly source: string;
	readonly compte: Partial<Record<Etape, number>>;
}

/** Combien d'établissements ont atteint chaque étape entre `debut` et `fin`, par source. */
export function compterParSource(
	parcours: readonly { readonly source: SourceVisite | null; readonly etapes: DatesDesEtapes }[],
	debut: number,
	fin: number
): { lignes: LigneDeSource[]; total: Partial<Record<Etape, number>> } {
	const parSource = new Map<string, Partial<Record<Etape, number>>>();
	const total: Partial<Record<Etape, number>> = {};
	for (const p of parcours) {
		const nom = libelleDeSource(p.source);
		for (const etape of ETAPES_DU_POINT) {
			const le = p.etapes[etape];
			if (le === undefined || le < debut || le >= fin) continue;
			const compte = parSource.get(nom) ?? {};
			compte[etape] = (compte[etape] ?? 0) + 1;
			parSource.set(nom, compte);
			total[etape] = (total[etape] ?? 0) + 1;
		}
	}
	const lignes = [...parSource.entries()]
		.map(([source, compte]) => ({ source, compte }))
		.sort((a, b) => (b.compte.INSCRIT ?? 0) - (a.compte.INSCRIT ?? 0));
	return { lignes, total };
}
