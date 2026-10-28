import { joursEntre } from '../../lib/verticales/recouvrement/decompte';
import { versements } from '../../lib/verticales/recouvrement/gabarits/accord-echeancier';
import { MOT_DU_NIVEAU, analyserLeRisque } from '../../lib/verticales/recouvrement/risque/analyse';
import { INDICE_DE_DEPART } from '../../lib/verticales/recouvrement/risque/regles';
import { FONCTIONNALITES, type CleFonctionnalite } from '../fonctionnalites';
import { FACTURE_DE_LA_LOI as F, JOUR_DE_LA_LOI, eurosDeLaLoi } from './loi-demo';

/**
 * CE QUE MONTRENT LES SIX TUILES (28/10/2026).
 *
 * Chaque tuile dit son nom, sa phrase et son lien au registre (`fonctionnalites.ts`, champ
 * `carte`). Ce que ses décors chiffrent sort du produit :
 * - la santé d'un client est celle que calcule l'analyse du risque (`analyserLeRisque`), sur une
 *   entreprise de démonstration : l'indice part de 50, et chaque fait le fait bouger de son poids
 *   nommé dans `risque/regles.ts`. La maquette inventait ses poids (−14, −6, +2) ;
 * - le paiement en trois fois suit le calendrier de l'accord écrit (`versements`) ;
 * - la page de paiement règle la facture de la loi.
 *
 * Le jour est celui de la loi (28 octobre 2026) : le deuxième versement tombe « dans 4 jours ».
 */
export function tuile(cle: CleFonctionnalite) {
	const f = FONCTIONNALITES.find((x) => x.cle === cle);
	if (!f?.carte) throw new Error(`Le registre ne donne pas de tuile à « ${cle} ».`);
	return { nom: f.nom, ...f.carte };
}

/** Une entreprise qui existe depuis douze ans, n'a jamais déposé ses comptes et paie tard. */
const analyse = analyserLeRisque({
	fiche: {
		siren: '000000000',
		denomination: 'Client de démonstration',
		formeJuridique: 'SAS, société par actions simplifiée',
		personneMorale: true,
		dateCreation: '2014-05-12',
		fermee: false,
		procedureEnCours: false,
		procedures: [],
		comptes: [],
		exercices: [],
		actifNetSousMoitie: null,
		dirigeants: [],
		releveLe: JOUR_DE_LA_LOI
	},
	dirigeants: [],
	paiements: { habitudeJours: 75, echantillon: 8, plusVieuxRetardJours: 20, facturesEnRetard: 1 },
	aujourdHui: JOUR_DE_LA_LOI
});
/** Ce qui retire d'abord, ce qui rend ensuite : l'aiguille descend, puis remonte. */
const faits = analyse.faits.filter((f) => f.effet !== 0).sort((a, b) => a.effet - b.effet);
let cumul = INDICE_DE_DEPART;

export const SANTE = {
	depart: INDICE_DE_DEPART,
	indice: analyse.indice,
	niveau: MOT_DU_NIVEAU[analyse.niveau].toLowerCase(),
	faits: faits.map((f) => ({
		effet: `${f.effet > 0 ? '+' : '\u2212'}${Math.abs(f.effet)}`,
		court: f.court
	})),
	/** Où l'aiguille passe, fait après fait. */
	chemin: faits.map((f) => (cumul += f.effet))
};
if (SANTE.chemin.at(-1) !== SANTE.indice)
	throw new Error('Les faits de la tuile santé doivent faire tout l’indice.');

const PREMIER = [
	'janv.',
	'févr.',
	'mars',
	'avr.',
	'mai',
	'juin',
	'juil.',
	'août',
	'sept.',
	'oct.',
	'nov.',
	'déc.'
];
/** « 1er oct. », « 5 déc. » */
const court = (iso: string) => {
	const j = Number(iso.slice(8, 10));
	return `${j === 1 ? '1er' : j} ${PREMIER[Number(iso.slice(5, 7)) - 1] ?? ''}`;
};
/** « 2 000 € », l'espace ordinaire de cette section de la maquette. */
export const eurosRonds = (c: number) => eurosDeLaLoi(c).replace(/,00 €$/, ' €');

const TOTAL = 600_000;
const calendrier = versements(BigInt(TOTAL), 3, '2026-10-01', 1).map((v) => ({
	date: court(v.date),
	montant: Number(v.montant),
	dans: joursEntre(JOUR_DE_LA_LOI, v.date)
}));
export const ECHEANCIER = {
	total: TOTAL,
	versements: calendrier,
	/** Ce qui est reçu avant, puis après le versement du mois. */
	recu: [calendrier[0]?.montant ?? 0, (calendrier[0]?.montant ?? 0) + (calendrier[1]?.montant ?? 0)]
};

export const PAIEMENT = { emetteur: F.emetteur, montant: F.ttc, reference: F.reference };
