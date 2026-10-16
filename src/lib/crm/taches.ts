/**
 * LES TÂCHES, RANGÉES COMME CHEZ LINEAR (16/10/2026) : en retard, aujourd'hui,
 * plus tard, et celles faites ces sept derniers jours. Les bornes du jour sont
 * données par l'appelant, qui connaît le fuseau de Paris.
 */

const SEPT_JOURS = 7 * 24 * 60 * 60 * 1000;

export function grouperTaches<T extends { readonly pour: number; readonly faiteLe?: number }>(
	taches: readonly T[],
	debutDuJour: number,
	finDuJour: number
): { enRetard: T[]; aujourdhui: T[]; plusTard: T[]; faites: T[] } {
	const parDate = [...taches].sort((a, b) => a.pour - b.pour);
	const ouvertes = parDate.filter((t) => t.faiteLe === undefined);
	return {
		enRetard: ouvertes.filter((t) => t.pour < debutDuJour),
		aujourdhui: ouvertes.filter((t) => t.pour >= debutDuJour && t.pour < finDuJour),
		plusTard: ouvertes.filter((t) => t.pour >= finDuJour),
		faites: parDate
			.filter((t) => t.faiteLe !== undefined && t.faiteLe >= debutDuJour - SEPT_JOURS)
			.sort((a, b) => (b.faiteLe ?? 0) - (a.faiteLe ?? 0))
	};
}
