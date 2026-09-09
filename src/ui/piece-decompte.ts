import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Piece } from '../lib/verticales/recouvrement/piece';

/**
 * LE RENDU DE LA PIÈCE — et il ne décide de rien.
 *
 * Tout ce que le document DIT vient de `verticales/recouvrement/piece.ts`, qui
 * est pur et testé sans harnais PDF : les identités, les montants, les
 * fondements tirés du registre, ce que le décompte ne couvre pas, et
 * l'avertissement sur ce que ce document n'est pas.
 *
 * ⚠️ CE FICHIER NE COMPOSE AUCUNE PHRASE ET NE FORMATE AUCUN CHIFFRE. Il pose
 * des lignes. Un jour où l'on voudra la même pièce en page imprimable ou en
 * corps de courriel, le second rendu lira la même description et dira
 * exactement la même chose — c'est tout l'intérêt d'avoir séparé les deux.
 *
 * ⚠️ AUCUNE COULEUR DE SEUIL ICI. `CLAUDE.md` réserve le vert, le rouge et
 * l'ambre au seul sens « au-dessus du seuil, tout près, en dessous ». Un
 * décompte ne franchit aucun seuil : il constate. Le document est en noir sur
 * blanc, ce qui est aussi ce qu'un tiers attend d'une pièce.
 */

/** Marge en millimètres. A4 fait 210 × 297. */
const MARGE = 18;
const LARGEUR_UTILE = 210 - MARGE * 2;

/** Les gris du document, en sRGB. Un PDF n'a pas de variables CSS. */
const ENCRE = 20;
const ENCRE_DOUCE = 110;

interface Curseur {
	y: number;
}

function saut(doc: jsPDF, curseur: Curseur, hauteur: number): void {
	curseur.y += hauteur;
	// 297 mm moins la marge basse : au-delà, on ouvre une page plutôt que
	// d'écrire dans le vide.
	if (curseur.y > 297 - MARGE) {
		doc.addPage();
		curseur.y = MARGE;
	}
}

function paragraphe(
	doc: jsPDF,
	curseur: Curseur,
	texte: string,
	options: { taille?: number; gras?: boolean; gris?: boolean } = {}
): void {
	doc.setFont('helvetica', options.gras === true ? 'bold' : 'normal');
	doc.setFontSize(options.taille ?? 9);
	doc.setTextColor(options.gris === true ? ENCRE_DOUCE : ENCRE);

	const lignes = doc.splitTextToSize(texte, LARGEUR_UTILE) as string[];
	for (const ligne of lignes) {
		doc.text(ligne, MARGE, curseur.y);
		saut(doc, curseur, (options.taille ?? 9) * 0.42 + 1.4);
	}
}

/**
 * Le nom du fichier. **Il compte** : c'est ce que le destinataire voit en pièce
 * jointe, avant même d'ouvrir. « decompte.pdf » dans une boîte qui en reçoit
 * dix est introuvable une semaine plus tard.
 */
export function nomFichierPiece(piece: Piece): string {
	const debiteur = (piece.debiteur[0] ?? 'debiteur')
		.normalize('NFD')
		// ⚠️ LE RETRAIT DES DIACRITIQUES DOIT PRÉCÉDER LE REMPLACEMENT. `NFD` sépare
		// « é » en « e » suivi d'un accent COMBINANT ; sans cette ligne, l'accent
		// tomberait dans la classe suivante et deviendrait un tiret — « Bécaud »
		// donnerait « Be-caud ».
		//
		// La plage U+0300–U+036F est ici en littéral, donc invisible à la
		// relecture : c'est pour ça que son comportement est verrouillé par un test
		// sur un nom accentué, et pas par la confiance qu'on accorde à ces octets.
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^A-Za-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 40);
	// ⚠️ LA DATE VIENT DU CHAMP, PAS DU TITRE. Elle s'y extrayait par expression
	// régulière — et le titre a changé dès la première relecture du PDF, quand
	// « arrêté au 2026-09-01 » s'est révélé lire comme un export de machine.
	// Tirer une donnée d'une chaîne d'AFFICHAGE marche jusqu'au jour où l'on
	// retouche l'affichage.
	return `decompte-${debiteur}-${piece.dateArrete}.pdf`;
}

export function rendrePieceEnPdf(piece: Piece): jsPDF {
	const doc = new jsPDF({ unit: 'mm', format: 'a4' });
	const curseur: Curseur = { y: MARGE + 4 };

	paragraphe(doc, curseur, piece.titre, { taille: 15, gras: true });
	saut(doc, curseur, 1);
	paragraphe(doc, curseur, piece.sousTitre, { taille: 8, gris: true });
	saut(doc, curseur, 5);

	// LES DEUX IDENTITÉS CÔTE À CÔTE, comme sur toute pièce comptable.
	doc.setFontSize(8);
	doc.setTextColor(ENCRE_DOUCE);
	doc.setFont('helvetica', 'normal');
	doc.text('CRÉANCIER', MARGE, curseur.y);
	doc.text('DÉBITEUR', MARGE + LARGEUR_UTILE / 2, curseur.y);
	saut(doc, curseur, 4.5);

	doc.setTextColor(ENCRE);
	doc.setFontSize(9);
	const hauteurIdentite = Math.max(piece.creancier.length, piece.debiteur.length);
	for (let rang = 0; rang < hauteurIdentite; rang++) {
		doc.setFont('helvetica', rang === 0 ? 'bold' : 'normal');
		if (piece.creancier[rang] !== undefined) doc.text(piece.creancier[rang]!, MARGE, curseur.y);
		if (piece.debiteur[rang] !== undefined) {
			doc.text(piece.debiteur[rang]!, MARGE + LARGEUR_UTILE / 2, curseur.y);
		}
		saut(doc, curseur, 4.4);
	}
	saut(doc, curseur, 4);

	// LE TABLEAU PAR FACTURE, puis ses périodes. Les périodes SONT la preuve :
	// c'est par elles que le destinataire refait le calcul.
	autoTable(doc, {
		startY: curseur.y,
		margin: { left: MARGE, right: MARGE },
		head: [['Facture', 'Principal dû', 'Intérêts', 'Indemnité', 'Total']],
		body: piece.factures.map((facture) => [
			facture.reference,
			facture.principal,
			facture.interets,
			facture.indemnite,
			facture.total
		]),
		styles: { font: 'helvetica', fontSize: 8.5, textColor: ENCRE },
		headStyles: { fillColor: [245, 243, 240], textColor: ENCRE, fontStyle: 'bold' },
		columnStyles: {
			1: { halign: 'right' },
			2: { halign: 'right' },
			3: { halign: 'right' },
			4: { halign: 'right' }
		},
		foot: [
			[
				'Total',
				piece.totaux.principal,
				piece.totaux.interets,
				piece.totaux.indemnites,
				piece.totaux.total
			]
		],
		footStyles: { fillColor: [245, 243, 240], textColor: ENCRE, fontStyle: 'bold', halign: 'right' }
	});
	curseur.y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

	for (const facture of piece.factures) {
		if (facture.periodes.length === 0) continue;
		paragraphe(doc, curseur, `Détail des intérêts — ${facture.reference}`, {
			taille: 9,
			gras: true
		});
		autoTable(doc, {
			startY: curseur.y,
			margin: { left: MARGE, right: MARGE },
			head: [['Du', 'Au', 'Jours', 'Principal', 'Taux annuel', 'Base', 'Intérêts']],
			body: facture.periodes.map((periode) => [
				periode.du,
				periode.au,
				String(periode.jours),
				periode.principal,
				periode.taux,
				String(periode.base),
				periode.interets
			]),
			styles: { font: 'helvetica', fontSize: 8, textColor: ENCRE },
			headStyles: { fillColor: [250, 249, 247], textColor: ENCRE_DOUCE, fontStyle: 'normal' },
			columnStyles: { 3: { halign: 'right' }, 6: { halign: 'right' } }
		});
		curseur.y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
	}

	paragraphe(doc, curseur, 'Fondements', { taille: 9, gras: true });
	for (const fondement of piece.fondements) {
		paragraphe(doc, curseur, `· ${fondement}`, { taille: 8 });
	}
	saut(doc, curseur, 4);

	paragraphe(doc, curseur, 'Ce que ce décompte ne couvre pas', { taille: 9, gras: true });
	for (const hors of piece.horsDecompte) {
		paragraphe(doc, curseur, `· ${hors}`, { taille: 8 });
	}
	saut(doc, curseur, 5);

	// L'AVERTISSEMENT EN DERNIER, et en pleine largeur. C'est la dernière chose
	// qu'un tiers lit : ce document n'est pas un acte et ne fait courir aucun
	// délai.
	paragraphe(doc, curseur, piece.avertissement, { taille: 8, gris: true });

	return doc;
}
