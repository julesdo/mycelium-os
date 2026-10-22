import { EcranInvitation } from '../../screens/invitation';
import { EcranRecommander, type RecommandationAffichee } from '../../screens/recommander';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * « RECOMMANDER LETIKETTE », DANS LA SALLE (22/10/2026) : le programme en cours, le
 * premier jour, l'année offerte, sans abonnement payant, et la recommandation fermée
 * tant que la facturation ne l'est pas.
 */

const JOUR = 24 * 60 * 60 * 1000;
const MAINTENANT = Date.UTC(2026, 9, 22, 10);

const EN_COURS: RecommandationAffichee = {
	lien: 'https://www.letikette.com/invitation/K7M2P9QRST',
	nomEtablissement: 'Garnier Bâtiment',
	moisOfferts: 1,
	moisEnAttente: 1,
	moisCetteAnnee: 2,
	moisParAn: 12,
	valeurDuMois: 3_900,
	invitations: [
		{ inscriteLe: MAINTENANT - 2 * JOUR, abonneeLe: null },
		{ inscriteLe: MAINTENANT - 34 * JOUR, abonneeLe: MAINTENANT - 4 * JOUR },
		{ inscriteLe: MAINTENANT - 70 * JOUR, abonneeLe: MAINTENANT - 40 * JOUR }
	],
	aujourdHui: '2026-10-22'
};

const FORMES: Readonly<Record<string, RecommandationAffichee>> = {
	'premier jour': {
		...EN_COURS,
		moisOfferts: 0,
		moisEnAttente: 0,
		moisCetteAnnee: 0,
		invitations: []
	},
	'année offerte': { ...EN_COURS, moisCetteAnnee: 12, moisOfferts: 11, moisEnAttente: 1 },
	'sans abonnement': {
		...EN_COURS,
		valeurDuMois: null,
		moisOfferts: 0,
		moisEnAttente: 1,
		moisCetteAnnee: 1,
		invitations: [{ inscriteLe: MAINTENANT - 34 * JOUR, abonneeLe: MAINTENANT - 4 * JOUR }]
	},
	'lien en préparation': { ...EN_COURS, lien: null, invitations: [] }
};

function RecommanderDemo({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	return (
		<EcranRecommander
			donnees={lectureDemo<RecommandationAffichee | 'fermee'>(
				etat,
				formeDemo(variante, EN_COURS, FORMES),
				'fermee'
			)}
		/>
	);
}

export const ECRANS_RECOMMANDER: readonly EcranDuProduit[] = [
	{
		route: '/app/recommander',
		libelle: 'recommander Letikette',
		vide: true,
		variantes: Object.keys(FORMES),
		Demo: RecommanderDemo
	}
];

/** La page de l'invité : l'invitation valable, et le lien qui ne vaut plus rien. */
export const ECRANS_INVITATION: readonly EcranDuProduit[] = [
	{
		route: '/invitation/$code',
		libelle: 'l’invité',
		vide: false,
		Demo: ({ etat }: { etat: EtatDemo }) => (
			<EcranInvitation
				invitation={
					etat === 'attente' ? undefined : etat === 'erreur' ? null : { offertPar: 'Garnier Bâtiment' }
				}
				onAccepter={() => undefined}
			/>
		)
	}
];
