import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../lib/convex/_generated/api';
import type { Id } from '../lib/convex/_generated/dataModel';
import type { EtatDirigeants } from '../ui';

/** Le message d'un refus : `ConvexError` le porte dans `data`, pas dans `message`. */
function messageDuRefus(e: unknown): string {
	const convexe = e as { data?: unknown };
	if (typeof convexe.data === 'string') return convexe.data;
	return e instanceof Error ? e.message : 'L’opération n’a pas abouti.';
}

/**
 * LES DIRIGEANTS DU CLIENT, POUR « QUI SIGNE POUR VOTRE CLIENT » (01/10/2026).
 *
 * Lus au registre d'après le SIREN de sa fiche, à la demande du gérant. Sans
 * SIREN, l'action refuse en le disant, et le refus se lit à la place de la
 * liste : ce n'est pas une liste vide.
 */
export function useDirigeantsDuClient(debiteurId: Id<'debiteurs'> | undefined): {
	readonly etat: EtatDirigeants;
	readonly onDemander: () => void;
} {
	const lire = useAction(api.recouvrement.annuaires.dirigeantsDuClient);
	const [etat, setEtat] = useState<EtatDirigeants>({ phase: 'REPOS' });

	return {
		etat,
		onDemander: () => {
			if (debiteurId === undefined) return;
			setEtat({ phase: 'EN_COURS' });
			lire({ debiteurId })
				.then(({ dirigeants, releveeLe }) => setEtat({ phase: 'TROUVE', dirigeants, releveeLe }))
				.catch((e: unknown) => setEtat({ phase: 'ECHEC', message: messageDuRefus(e) }));
		}
	};
}
