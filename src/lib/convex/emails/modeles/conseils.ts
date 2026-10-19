// LES CONSEILS DE PLUME (16/10/2026) : quatre e-mails dans les premières semaines,
// chacun attaché à une étape du gérant (`src/lib/croissance/conseils.ts` décide
// quand ; ce fichier dit quoi). Et, depuis le 19/10/2026 (audit, lot 7), les deux
// rappels de l'offre de bienvenue après un diagnostic : la remise et sa date en clair,
// aucun compte à rebours, aucun prix barré (décision 10).
//
// ⚠️ AUCUN VERDICT (ligne rouge n° 3) : on montre ce que dit la loi et ce qu'il y a
// dans les factures, jamais « vous devriez agir » ni « vous allez récupérer ».
// ⚠️ AUCUNE VALEUR JURIDIQUE ÉCRITE ICI : les montants, l'indemnité et les délais du
// plan arrivent de l'appelant, qui les lit au registre et dans `plan-relance.ts`.
//
// Ils sont signés « Plume de Letikette » et portent chacun le lien qui les coupe.

import { coquilleHtml, coquilleTexte, type BlocEmail } from './disposition';
import type { CleConseilEnvoye } from '../../../croissance/conseils';

export type DonneesConseil = {
	readonly cle: CleConseilEnvoye;
	readonly prenom?: string;
	readonly nomEtablissement: string;
	/** L'adresse du site (`SITE_URL`), sans barre finale. */
	readonly site: string;
	readonly desinscription: string;
	/** Ce qui est dû, déjà formaté : pour `ce-qui-vous-est-du`. */
	readonly du?: {
		readonly montant: string;
		readonly factures: number;
		readonly indemnite: string;
		readonly indemniteTotale: string;
	};
	/** Les étapes du plan de relance, une phrase chacune : pour `ce-qui-partirait`. */
	readonly plan?: readonly string[];
	/** L'offre de bienvenue : sa remise, sur combien de mois, jusqu'à quand (« 2 novembre 2026 »). */
	readonly offre?: {
		readonly pourcent: number;
		readonly mois: number;
		readonly jusquAu: string;
	};
};

const MOIS_EN_LETTRES = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six'];

const OBJETS: Record<CleConseilEnvoye, string> = {
	bienvenue: 'Bienvenue sur Letikette',
	'il-manque-vos-factures': 'Il me manque vos factures',
	'ce-qui-vous-est-du': 'Ce qu’on vous doit',
	'ce-qui-partirait': 'Ce qui partirait pour vous',
	'offre-de-bienvenue': 'Votre offre de bienvenue',
	'offre-de-bienvenue-fin': 'Votre offre de bienvenue se termine bientôt'
};

export function objetDuConseil(cle: CleConseilEnvoye): string {
	return OBJETS[cle];
}

function corpsDuConseil(d: DonneesConseil): Omit<BlocEmail, 'note' | 'desinscription'> {
	const deposer = { libelle: 'Déposer mes factures', url: `${d.site}/app/coffre?deposer=1` };
	switch (d.cle) {
		case 'bienvenue':
			return {
				apercu: 'Je suis Plume. Voici comment ça se passe, en trois temps.',
				plume: true,
				titre: d.prenom ? `Bienvenue, ${d.prenom}` : 'Bienvenue sur Letikette',
				intro:
					'Je suis Plume, et je m’occupe de vos factures impayées avec vous. Voici comment ça se passe :',
				points: [
					'Vous déposez vos factures : un export, une connexion à votre logiciel, ou une photo.',
					'Je lis ce qui reste dû, depuis quand, et ce que la loi y ajoute.',
					'Vous décidez ce qui part, à votre nom. Rien ne part sans votre accord.'
				],
				bouton: deposer
			};
		case 'il-manque-vos-factures':
			return {
				apercu: 'Pour vous dire ce qui vous est dû, je dois d’abord lire vos factures.',
				plume: true,
				titre: 'Il me manque vos factures',
				intro:
					'Pour vous dire ce qui vous est dû et depuis quand, je dois d’abord les lire. Trois façons, au choix :',
				points: [
					'Un export de votre logiciel de facturation ou de comptabilité',
					'Une connexion à Qonto, Pennylane ou votre logiciel',
					'Une photo de vos factures, depuis votre téléphone'
				],
				corps: [
					'Vos documents sont chiffrés dès leur arrivée, sous une clé propre à votre entreprise.'
				],
				bouton: deposer
			};
		case 'ce-qui-vous-est-du': {
			const du = d.du;
			const n = du?.factures ?? 0;
			const echues =
				n === 1 ? '1 est échue et pas encore réglée' : `${n} sont échues et pas encore réglées`;
			return {
				apercu: du
					? `${du.montant} encore dû sur vos factures échues.`
					: 'Voici ce qu’on vous doit.',
				plume: true,
				titre: 'Voici ce qu’on vous doit',
				intro: `J’ai lu vos factures : ${echues}.`,
				...(du === undefined
					? {}
					: {
							montant: {
								libelle: 'Factures échues, à ce jour',
								valeur: du.montant,
								precision: 'Le montant TTC encore dû, hors pénalités de retard.'
							},
							rangees: [
								{
									libelle: 'Frais de recouvrement prévus entre professionnels',
									valeur: `${du.factures} × ${du.indemnite} = ${du.indemniteTotale}`
								}
							]
						}),
				corps: [
					'Les pénalités de retard s’y ajoutent, calculées jour par jour, facture par facture, dans Letikette.'
				],
				bouton: { libelle: 'Voir le détail', url: `${d.site}/app` }
			};
		}
		case 'offre-de-bienvenue':
		case 'offre-de-bienvenue-fin': {
			const o = d.offre;
			const remise =
				o === undefined
					? 'une remise sur vos premiers mois de formule'
					: `${o.pourcent} % sur vos ${MOIS_EN_LETTRES[o.mois] ?? o.mois} premiers mois de formule`;
			const jusquAu = o === undefined ? '' : `, jusqu’au ${o.jusquAu}`;
			const fin = d.cle === 'offre-de-bienvenue-fin';
			return {
				apercu: fin
					? `Pour mémoire : ${remise}${jusquAu}.`
					: `Votre diagnostic vous ouvre ${remise}${jusquAu}.`,
				plume: true,
				titre:
					fin && o !== undefined
						? `Votre offre vaut jusqu’au ${o.jusquAu}`
						: 'Votre offre de bienvenue',
				intro: fin
					? `Pour mémoire : votre diagnostic vous ouvre ${remise}${jusquAu}.`
					: `Votre diagnostic est fait. Pour aller plus loin, il vous ouvre ${remise}${jusquAu}.`,
				points: [
					'Les relances partent à votre nom, quand vous l’avez décidé, et se retiennent d’un geste.',
					'Chaque montant réclamé se décompose, période par période.',
					'Vos clients vous paient directement : aucune commission sur ce qui rentre.'
				],
				corps: ['La remise s’applique à votre premier paiement, une seule fois.'],
				bouton: { libelle: 'Voir les formules', url: `${d.site}/app/compte?ouvrir=facturation` }
			};
		}
		case 'ce-qui-partirait':
			return {
				apercu: 'Rien ne part sans votre accord. Voici ce que j’enverrais pour vous.',
				plume: true,
				titre: 'Ce qui partirait si vous activez les relances',
				intro:
					'Rien ne part sans votre accord. Si vous activez les relances, voici ce que j’enverrais à vos clients en retard, à votre nom :',
				points: d.plan ?? [],
				corps: [
					'Chaque relance s’affiche une heure avant de partir, et se retient d’un geste. Un client qui paie entre-temps n’est plus relancé.'
				],
				bouton: { libelle: 'Voir le plan', url: `${d.site}/app` }
			};
	}
}

function bloc(d: DonneesConseil): BlocEmail {
	return {
		...corpsDuConseil(d),
		note: `Vous recevez ces conseils parce que vous utilisez Letikette pour ${d.nomEtablissement}.`,
		desinscription: d.desinscription
	};
}

export function conseilHtml(d: DonneesConseil): string {
	return coquilleHtml(bloc(d));
}

export function conseilTexte(d: DonneesConseil): string {
	return coquilleTexte(bloc(d));
}
