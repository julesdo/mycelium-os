import { composerVirementEpc } from '../../lib/socle/virement-epc';
import { depuisCentimes } from '../../lib/socle/montants';
import { EcranPaiement, type PageDePaiementAffichee } from '../../screens/paiement';
import type { EcranDuProduit, EtatDemo } from './demo';

/**
 * LA PAGE OÙ LE CLIENT PAIE — la seule que regarde quelqu'un qui n'a pas de
 * compte, et donc celle qu'il faut le plus regarder.
 *
 * ⚠️ LE QR EST COMPOSÉ PAR LE DOMAINE, PAS ÉCRIT À LA MAIN. Une charge recopiée
 * dans la démonstration finirait par diverger de ce que le serveur compose, et
 * c'est précisément ce qu'on vient vérifier à l'œil : que le code se scanne, et
 * qu'il porte le bon montant.
 */

const CREANCIER = {
	denomination: 'Charpentes Vidal',
	adresse: '12 route des Ateliers, 33000 Bordeaux',
	email: 'compta@charpentes-vidal.fr',
	telephone: '05 56 00 00 00'
};

const REFERENCE = 'D-118CE4';
const TOTAL = 637_350n;

const VIREMENT = composerVirementEpc({
	beneficiaire: CREANCIER.denomination,
	iban: 'FR7630006000011234567890189',
	montant: depuisCentimes(TOTAL),
	reference: REFERENCE
});

const PAGE_DEMO: PageDePaiementAffichee = {
	creancier: CREANCIER,
	clientNom: 'Fournitures Durand',
	arreteAu: '2026-09-03',
	total: TOTAL,
	principal: 600_000n,
	interets: 33_350n,
	indemniteForfaitaire: 4_000n,
	lignes: [
		{
			reference: 'FA-2026-118',
			principalRestantDu: 600_000n,
			interets: 33_350n,
			indemniteForfaitaire: 4_000n,
			total: 637_350n
		}
	],
	reference: REFERENCE,
	ibanLisible: 'FR76 3000 6000 0112 3456 7890 189',
	chargeQr: VIREMENT.ok ? VIREMENT.charge : null
};

/**
 * ⚠️ LA FORME « SANS QR » EST LÀ POUR CE QU'ELLE PROUVE : la page reste
 * PAYABLE. Un créancier dont le nom dépasse les bornes de la norme, ou dont
 * l'IBAN n'est pas encore relevé, ne doit pas se retrouver avec une page qui ne
 * dit rien : l'IBAN et la référence restent lisibles et copiables, et le client
 * recopie. Un QR absent coûte trente secondes ; une page absente coûte le
 * paiement.
 */
const FORMES: Record<string, PageDePaiementAffichee> = {
	'avec le code': PAGE_DEMO,
	'sans le code': { ...PAGE_DEMO, chargeQr: null }
};

export const ECRANS_PAIEMENT: readonly EcranDuProduit[] = [
	{
		route: '/p/$jeton',
		libelle: 'le client paie',
		vide: false,
		variantes: Object.keys(FORMES),
		Demo: ({ etat, variante }: { etat: EtatDemo; variante?: string }) => {
			if (etat === 'attente') return <EcranPaiement donnees={{ etat: 'attente' }} />;
			// ⚠️ « EN ERREUR » VAUT ICI « LIEN FERMÉ OU INCONNU », et c'est l'état
			// qu'on vient regarder : la page ne dit pas lequel des deux, parce que
			// le dire confirmerait un jeton trouvé au hasard.
			if (etat === 'erreur') return <EcranPaiement donnees={{ etat: 'introuvable' }} />;
			const valeur = FORMES[variante ?? 'avec le code'];
			if (valeur === undefined) throw new Error(`Forme inconnue : « ${variante} ».`);
			return <EcranPaiement donnees={{ etat: 'pret', valeur }} />;
		}
	}
];
