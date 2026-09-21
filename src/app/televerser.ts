import type { Id } from '../lib/convex/_generated/dataModel';

/**
 * ENVOYER UN FICHIER AU STOCKAGE CONVEX, et rendre son identifiant.
 *
 * Le protocole en deux temps du stockage : une mutation donne une adresse
 * d'envoi à usage unique, le navigateur y poste le fichier, et la réponse porte
 * l'identifiant qu'une seconde mutation enregistre — après l'avoir vérifié.
 */
export async function televerser(
	genererUrl: () => Promise<string>,
	fichier: File
): Promise<Id<'_storage'>> {
	const adresse = await genererUrl();
	const reponse = await fetch(adresse, {
		method: 'POST',
		headers: { 'Content-Type': fichier.type },
		body: fichier
	});
	if (!reponse.ok) throw new Error('L’envoi du fichier a échoué. Réessayez.');
	const { storageId } = (await reponse.json()) as { storageId: Id<'_storage'> };
	return storageId;
}

/** Le message d'un refus Convex, sans l'enveloppe technique qui l'entoure. */
export function messageDeRefus(erreur: unknown): string {
	if (erreur instanceof Error) {
		const donnee = (erreur as Error & { data?: unknown }).data;
		if (typeof donnee === 'string') return donnee;
		return erreur.message;
	}
	return 'L’opération a échoué. Réessayez.';
}
