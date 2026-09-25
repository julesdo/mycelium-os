import { jsPDF } from 'jspdf';

/**
 * UN COURRIER EN PDF, tel qu'il a été validé, au caractère près.
 *
 * ⚠️ AU SEUL NOM DU CRÉANCIER, MÉTADONNÉES COMPRISES. Le titre du fichier est
 * l'objet du courrier ; ni le nom ni l'adresse de ce logiciel n'y figurent, pas
 * plus que dans le texte (Cass. crim., 21 mars 2017).
 */

const MARGE = 22;
const LARGEUR_UTILE = 210 - 2 * MARGE;
const INTERLIGNE = 5.2;

export function rendreCourrierEnPdf(corps: string, objet: string): jsPDF {
	const doc = new jsPDF({ unit: 'mm', format: 'a4' });
	doc.setProperties({ title: objet, subject: objet, creator: '', author: '' });
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10.5);
	doc.setTextColor(20, 20, 20);
	let y = MARGE;
	for (const ligne of corps.split('\n')) {
		if (ligne.trim() === '') {
			y += INTERLIGNE * 0.8;
			continue;
		}
		const morceaux = doc.splitTextToSize(ligne, LARGEUR_UTILE) as string[];
		for (const morceau of morceaux) {
			if (y > 297 - MARGE) {
				doc.addPage();
				y = MARGE;
			}
			doc.text(morceau, MARGE, y);
			y += INTERLIGNE;
		}
	}
	return doc;
}

/** Le nom du fichier : ce que le destinataire voit en pièce jointe. */
export function nomFichierCourrier(titre: string, destinataire: string, date: string): string {
	const propre = (s: string) =>
		s
			.normalize('NFD')
			.replace(/[̀-ͯ]/g, '')
			.replace(/[^A-Za-z0-9]+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 40);
	return `${propre(titre)}-${propre(destinataire)}-${date}.pdf`.toLowerCase();
}
