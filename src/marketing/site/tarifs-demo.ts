import {
	CE_QUI_EST_INCLUS,
	FORMULES,
	FORMULE_RECOMMANDEE,
	GRILLE,
	LIMITES,
	moisOfferts,
	type Formule,
	type LogicielOuvert,
	type Palier
} from '../../lib/config/tarifs';

/**
 * LES TARIFS DU SITE, LUS DANS LA GRILLE (28/10/2026).
 *
 * ⚠️ AUCUN PRIX NE S'ÉCRIT ICI : la grille vit dans `config/tarifs.ts` et nulle part ailleurs.
 * Les étiquettes, la bascule et le comparatif en sont la traduction, au format de la maquette
 * (« 1 190 € », l'espace insécable des milliers et avant l'euro).
 *
 * La maquette avait été dessinée sur l'ancienne grille (Équipe à 39 €, Pro à 119 €) : le site
 * dit celle d'aujourd'hui. Elle cochait aussi tout le calcul pour Découverte, qui ne chiffre que
 * les trois derniers mois, et ne nommait que Qonto parmi les logiciels de Solo.
 */
const NB = '\u00a0';
const milliers = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NB);
export const euros = (n: number) => `${milliers(n)}${NB}€`;

const LOGICIELS: Readonly<Record<LogicielOuvert, string>> = {
	qonto: 'Qonto',
	pennylane: 'Pennylane'
};
const EN_LETTRES: Readonly<Record<number, string>> = {
	2: 'deux',
	3: 'trois',
	5: 'cinq',
	10: 'dix'
};
export const enLettres = (n: number) => EN_LETTRES[n] ?? String(n);

/** Les mois offerts à l'année : la grille les donne pareils pour les trois formules. */
const offerts = moisOfferts('solo');
if (FORMULES.some((f) => moisOfferts(f) !== offerts))
	throw new Error('Les formules n’offrent pas le même nombre de mois à l’année.');
export const MOIS_OFFERTS = `${offerts} mois offerts`;

/** Une ligne d'une étiquette : un chiffre en gras (ou rien), et ce qu'il compte. */
export type LigneDePrix =
	| { readonly avant?: string; readonly gras: string; readonly apres?: string }
	| { readonly texte: string };

function lignes(f: Formule): readonly LigneDePrix[] {
	const l = LIMITES[f];
	return [
		l.clientsSuivis === null
			? { avant: 'Clients en retard ', gras: 'sans limite' }
			: { gras: String(l.clientsSuivis), apres: ' clients en retard suivis' },
		{ gras: String(l.utilisateurs), apres: l.utilisateurs > 1 ? ' utilisateurs' : ' utilisateur' },
		{
			texte:
				l.logiciels === 'tous'
					? 'Tous vos logiciels branchés'
					: `${l.logiciels.map((x) => LOGICIELS[x]).join(' et ')} branché${l.logiciels.length > 1 ? 's' : ''}`
		},
		{ gras: String(l.analysesParMois), apres: ' analyses de santé par mois' }
	];
}

export const PRIX = FORMULES.map((formule) => ({
	formule,
	nom: GRILLE[formule].nom,
	pour: GRILLE[formule].pour,
	annuel: euros(GRILLE[formule].annuel),
	mensuel: euros(GRILLE[formule].mensuel),
	recommandee: formule === FORMULE_RECOMMANDEE,
	lignes: lignes(formule)
}));

/** Une case du comparatif : compris, non compris, ou ce qu'elle dit. */
export type Case = { readonly oui: true } | { readonly non: true } | { readonly texte: string };
const PALIERS: readonly Palier[] = ['decouverte', ...FORMULES];
export const COMPARATIF = {
	paliers: PALIERS,
	tete: PALIERS.map((p) =>
		p === 'decouverte'
			? { palier: p, nom: 'Découverte', prix: euros(0) }
			: {
					palier: p,
					nom: GRILLE[p].nom,
					annuel: `${euros(GRILLE[p].annuel)}${NB}/${NB}an`,
					mensuel: `${euros(GRILLE[p].mensuel)}${NB}/${NB}mois`
				}
	),
	lignes: CE_QUI_EST_INCLUS.map((l) => ({
		libelle: l.libelle,
		cases: PALIERS.map((p): Case => {
			const v = l.valeurs[p];
			return v === true ? { oui: true } : v === false ? { non: true } : { texte: v };
		})
	}))
};

/** Plus de personnes que Pro n'en compte : le seuil du sur-mesure. */
export const PLUS_QUE_PRO = enLettres(LIMITES.pro.utilisateurs);
