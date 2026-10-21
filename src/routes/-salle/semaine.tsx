import { EcranSemaine, type SemaineAffichee } from '../../screens/semaine';
import { formeDemo, lectureDemo, type EcranDuProduit, type EtatDemo } from './demo';

/**
 * « VOTRE SEMAINE », DANS LA SALLE (21/10/2026, le parcours de l'habitude) : la semaine
 * garnie, la meilleure depuis l'arrivée, une semaine sans paiement, et le vide.
 */

const GARNIE: SemaineAffichee = {
	semaine: {
		debut: '2026-10-12',
		fin: '2026-10-18',
		rentre: 412_000n,
		relancesParties: 6,
		clientsQuiOntPaye: 3,
		dateLimiteDansJours: 12,
		huitSemaines: [80_000n, 0n, 125_000n, 60_000n, 210_000n, 90_000n, 150_000n, 412_000n],
		meilleureDepuis: '2026-08-24'
	},
	relancesProgrammees: 4
};

const FORMES: Readonly<Record<string, SemaineAffichee>> = {
	'meilleure depuis l’arrivée': {
		...GARNIE,
		semaine: { ...GARNIE.semaine!, meilleureDepuis: 'arrivee' }
	},
	'sans paiement': {
		semaine: {
			...GARNIE.semaine!,
			rentre: 0n,
			clientsQuiOntPaye: 0,
			huitSemaines: [80_000n, 0n, 125_000n, 60_000n, 0n],
			meilleureDepuis: null
		},
		relancesProgrammees: 0
	}
};

const VIDE: SemaineAffichee = { semaine: null, relancesProgrammees: 0 };

function SemaineDemo({ etat, variante }: { etat: EtatDemo; variante?: string }) {
	return <EcranSemaine donnees={lectureDemo(etat, formeDemo(variante, GARNIE, FORMES), VIDE)} />;
}

export const ECRANS_SEMAINE: readonly EcranDuProduit[] = [
	{
		route: '/app/semaine',
		libelle: 'votre semaine',
		vide: true,
		variantes: Object.keys(FORMES),
		Demo: SemaineDemo
	}
];
