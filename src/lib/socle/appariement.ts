/**
 * Le rapprochement entre les libellés envoyés à Claude et les classifications
 * qu'il rend.
 *
 * Il se fait PAR LIBELLÉ, jamais par position. Un modèle qui en oublie un
 * décalerait toute la suite si on se fiait à l'ordre, et attribuerait
 * sereinement la classification du thon aux serviettes en papier — une erreur
 * silencieuse, plausible ligne à ligne, et indétectable à la relecture.
 */

export interface Apparie {
	normalizedLabel: string;
}

export interface Rapprochement<T extends Apparie> {
	/** Une entrée par libellé demandé qui a reçu une réponse, dans l'ordre demandé. */
	appariees: T[];
	/** Les libellés demandés restés sans réponse — ils partent en arbitrage humain. */
	manquants: string[];
}

export function rapprocher<T extends Apparie>(
	demandes: readonly string[],
	rendues: readonly T[]
): Rapprochement<T> {
	const attendus = new Set(demandes);
	const parLibelle = new Map<string, T>();

	for (const rendue of rendues) {
		// Une entrée portant un libellé jamais demandé est jetée : le modèle a
		// inventé une clé, on ne devine pas à quoi elle se rattache.
		if (!attendus.has(rendue.normalizedLabel)) continue;
		// Premier arrivé, premier retenu : deux réponses pour un même libellé
		// sont contradictoires, et la seconde n'a aucune raison d'être meilleure.
		if (!parLibelle.has(rendue.normalizedLabel)) {
			parLibelle.set(rendue.normalizedLabel, rendue);
		}
	}

	const appariees: T[] = [];
	const manquants: string[] = [];
	for (const demande of demandes) {
		const trouvee = parLibelle.get(demande);
		if (trouvee) appariees.push(trouvee);
		else manquants.push(demande);
	}

	return { appariees, manquants };
}
