/**
 * Le courrier de demande d'attestation fournisseur.
 *
 * C'est du code, pas un gabarit de traitement de texte, pour la même raison que
 * le barème et les mentions juridiques : il engage la cantine vis-à-vis d'un
 * tiers, il passe en revue, et il est couvert par un test.
 *
 * Ce qu'il demande, et pourquoi c'est légitime : l'acheteur d'un produit
 * présenté comme sous signe de qualité a le droit d'en obtenir la preuve
 * documentaire. Le courrier ne réclame donc pas une faveur, il demande une
 * pièce que le fournisseur détient déjà.
 *
 * Ce qu'il ne fait jamais : menacer, invoquer une sanction, ou laisser croire
 * que la cantine agit pour le compte de l'administration.
 */

export interface DemandeAttestation {
	nomEtablissement: string;
	nomFournisseur: string;
	produits: readonly string[];
	montantEnJeuHT: number;
	periodeDebut: string;
	periodeFin: string;
}

const EUROS = new Intl.NumberFormat('fr-FR', {
	style: 'currency',
	currency: 'EUR',
	maximumFractionDigits: 0
});

/** Une date ISO (AAAA-MM-JJ) en toutes lettres. */
function enClair(iso: string): string {
	const [a, m, j] = iso.split('-');
	if (!a || !m || !j) return iso;
	const mois = [
		'janvier',
		'février',
		'mars',
		'avril',
		'mai',
		'juin',
		'juillet',
		'août',
		'septembre',
		'octobre',
		'novembre',
		'décembre'
	];
	return `${Number(j)} ${mois[Number(m) - 1] ?? m} ${a}`;
}

/** La liste des produits, tronquée pour rester lisible dans un courrier. */
function listerProduits(produits: readonly string[]): string {
	const MAX = 12;
	if (produits.length <= MAX) return produits.map((p) => `  - ${p}`).join('\n');
	const visibles = produits.slice(0, MAX).map((p) => `  - ${p}`);
	visibles.push(`  - et ${produits.length - MAX} autres références, détaillées en annexe`);
	return visibles.join('\n');
}

export function redigerCourrier(d: DemandeAttestation): string {
	return `Objet : demande d'attestation de certification — références livrées à ${d.nomEtablissement}

Madame, Monsieur,

Notre établissement est soumis aux obligations de la loi EGalim, qui impose de
servir une part minimale de produits durables et de qualité et d'en déclarer le
montant chaque année.

Les références suivantes, que vous nous avez livrées entre le ${enClair(d.periodeDebut)}
et le ${enClair(d.periodeFin)}, portent une mention laissant entendre qu'elles
relèvent d'un signe officiel de qualité :

${listerProduits(d.produits)}

Ces achats représentent ${EUROS.format(d.montantEnJeuHT)} hors taxes sur la période.

Faute de pièce justificative à notre dossier, nous ne pouvons pas les
comptabiliser comme qualifiants dans notre déclaration, alors qu'ils le sont
probablement.

Nous vous remercions de bien vouloir nous transmettre, pour ces références :
  - la certification ou le signe de qualité concerné,
  - l'organisme certificateur et le numéro de certificat,
  - la période de validité.

Un document par référence, ou une attestation globale couvrant l'ensemble, nous
conviendra également.

Cette démarche ne remet en cause ni la qualité de vos produits ni notre
collaboration : elle nous permet simplement de justifier auprès de
l'administration ce que nous achetons déjà chez vous.

Nous restons à votre disposition pour tout élément complémentaire.

Cordialement,

${d.nomEtablissement}
`;
}
