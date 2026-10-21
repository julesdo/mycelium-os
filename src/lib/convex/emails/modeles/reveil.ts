import { coquilleHtml, coquilleTexte, type BlocEmail, type RangeeEmail } from './disposition';

export type ReveilData = {
	nomEntreprise: string;
	/** « Pendant votre absence : 2 clients ont payé, une date limite approche. » */
	phrase: string;
	rangees: readonly RangeeEmail[];
	url: string;
	/** Le lien en un clic qui coupe les e-mails de Plume. */
	desinscription: string;
};

/**
 * LE RÉVEIL UTILE, SIGNÉ PLUME (21/10/2026, le parcours de l'habitude, moment 8).
 *
 * Après quatorze jours sans visite, quand quelque chose de vrai s'est passé : ce qui est
 * arrivé, et le chemin vers l'application, où le point du retour reprend les mêmes faits.
 *
 * ⚠️ JAMAIS UN REPROCHE NI UN COMPTE À REBOURS, jamais « grâce à » : ce qui s'est passé.
 * ⚠️ IL PART VERS LE GÉRANT, JAMAIS VERS SON CLIENT.
 */
function bloc(d: ReveilData): BlocEmail {
	return {
		apercu: d.phrase,
		plume: true,
		titre: 'Pendant votre absence',
		intro: d.phrase,
		rangees: d.rangees,
		corps: ['Je continue de suivre vos dossiers. Le détail vous attend dans l’application.'],
		bouton: { libelle: 'Ouvrir Letikette', url: d.url },
		note: `Vous recevez ce message parce que ${d.nomEntreprise} est suivie par Letikette, et qu’il s’est passé quelque chose depuis votre dernière visite.`,
		desinscription: d.desinscription
	};
}

export function reveilHtml(d: ReveilData): string {
	return coquilleHtml(bloc(d));
}

export function reveilTexte(d: ReveilData): string {
	return coquilleTexte(bloc(d));
}
