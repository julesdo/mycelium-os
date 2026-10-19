// LE RAPPORT DU DIAGNOSTIC (19/10/2026, audit stratégique, lot 7).
//
// Un e-mail TRANSACTIONNEL : la réponse au geste du gérant qui a lancé son diagnostic,
// envoyé à la fin de la lecture, hors du créneau des conseils et sans lien de
// désinscription. Ses chiffres viennent du moteur, déjà formatés
// (`composerRapportDiagnostic`), jamais d'ici.
//
// ⚠️ AUCUN VERDICT (ligne rouge n° 3), et AUCUNE OFFRE : un message transactionnel ne
// porte pas de prospection. L'offre de bienvenue a ses propres rappels, qui se coupent.

import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';

export type DonneesRapport = {
	readonly prenom?: string;
	readonly nomEtablissement: string;
	/** L'adresse du site (`SITE_URL`), sans barre finale. */
	readonly site: string;
	/** « Factures depuis le 19 juillet 2026 », ou `null` : tout l'historique. */
	readonly periode: string | null;
	readonly compteAu: string;
	/** Ce que la loi ajoute aux impayées et aux payées en retard. */
	readonly enJeu: string;
	readonly encoreDues: { readonly factures: number; readonly montant: string };
	readonly payeesEnRetard: number;
	readonly nonChiffrees: number;
	readonly hypotheses: readonly string[];
	readonly avertissement: string;
};

export const OBJET_DU_RAPPORT = 'Votre diagnostic est prêt';

function factures(n: number): string {
	return `${n} facture${n > 1 ? 's' : ''}`;
}

function bloc(d: DonneesRapport): BlocEmail {
	const periode =
		d.periode === null ? '' : ` (${d.periode.charAt(0).toLowerCase()}${d.periode.slice(1)})`;
	return {
		apercu: `${d.enJeu} : ce que la loi ajoute à vos factures, compté au ${d.compteAu}.`,
		plume: true,
		titre: d.prenom ? `Votre diagnostic est prêt, ${d.prenom}` : 'Votre diagnostic est prêt',
		intro: `J’ai lu vos factures${periode}. Voici ce que la loi y ajoute, compté au ${d.compteAu}.`,
		montant: {
			libelle: 'Ce que la loi ajoute',
			valeur: d.enJeu,
			precision:
				'Pénalités de retard et frais de recouvrement, sur vos factures encore dues et payées en retard.'
		},
		rangees: [
			{
				libelle: 'Factures encore dues',
				valeur: `${factures(d.encoreDues.factures)} · ${d.encoreDues.montant}`
			},
			{ libelle: 'Factures payées en retard', valeur: factures(d.payeesEnRetard) },
			...(d.nonChiffrees === 0
				? []
				: [
						{
							libelle: 'Non chiffrées',
							valeur: `${factures(d.nonChiffrees)} non chiffrée${d.nonChiffrees > 1 ? 's' : ''}`
						}
					])
		],
		corps: [...d.hypotheses, d.avertissement],
		bouton: { libelle: 'Voir le détail', url: `${d.site}/app/diagnostic` },
		note: `Vous recevez ce message parce qu’un diagnostic a été lancé pour ${d.nomEtablissement} sur Letikette.`
	};
}

export function rapportHtml(d: DonneesRapport): string {
	return coquilleHtml(bloc(d));
}

export function rapportTexte(d: DonneesRapport): string {
	return coquilleTexte(bloc(d));
}
