// LE POINT DU LUNDI (16/10/2026) : ce que la machine a vu la semaine passée, pour
// le fondateur seul (`FONDATEUR_EMAIL`).
//
// Il ne porte que des noms d'établissements, des étapes, des scores et des
// comptes : jamais un montant ni un débiteur. Il remplace, jusqu'à son seuil, le
// point écrit par Claude (stratégie, § 0) : des chiffres, sans interprétation.

import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type DonneesPoint = {
	/** « du 12 au 18 octobre 2026 ». */
	readonly periode: string;
	readonly visiteurs: { readonly visiteurs: number; readonly pagesVues: number } | null;
	readonly totaux: readonly {
		readonly libelle: string;
		readonly semaine: number;
		readonly mois: number;
	}[];
	/** Une phrase par source : « Recherche : 2 inscrits, 1 factures déposées ». */
	readonly sources: readonly string[];
	/** Les comptes au meilleur score : « Garnier Bâtiment, 72, relances activées ». */
	readonly aAppeler: readonly string[];
};

function bloc(d: DonneesPoint): BlocEmail {
	const inscrits = d.totaux.find((t) => t.libelle === 'Inscrits')?.semaine ?? 0;
	return {
		apercu: `${inscrits} inscrit${inscrits > 1 ? 's' : ''} cette semaine. Le détail par source et les comptes à appeler.`,
		titre: 'Le point du lundi',
		intro: `La semaine ${d.periode}, et les 28 derniers jours.`,
		rangees: [
			...(d.visiteurs === null
				? []
				: [
						{ libelle: 'Visiteurs du site', valeur: String(d.visiteurs.visiteurs) },
						{ libelle: 'Pages vues', valeur: String(d.visiteurs.pagesVues) }
					]),
			...d.totaux.map((t) => ({
				libelle: t.libelle,
				valeur: `${t.semaine} · 28 jours : ${t.mois}`
			}))
		],
		points: d.sources.length === 0 ? ['Aucune étape franchie cette semaine.'] : d.sources,
		corps: [
			d.aAppeler.length === 0
				? 'Aucun compte à appeler pour l’instant.'
				: `À appeler en premier : ${d.aAppeler.join(' ; ')}.`
		],
		note:
			d.visiteurs === null
				? 'Le trafic du site manque : posez UMAMI_API_KEY (clé de lecture Umami) pour le voir ici.'
				: 'Le trafic vient d’Umami, sans cookie. Les étapes viennent du produit.'
	};
}

export function pointDuLundiHtml(d: DonneesPoint): string {
	return coquilleHtml(bloc(d));
}

export function pointDuLundiTexte(d: DonneesPoint): string {
	return coquilleTexte(bloc(d));
}
