import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { RapportDiagnostic } from '../lib/verticales/recouvrement/rapport-diagnostic';

/**
 * LE RAPPORT DU DIAGNOSTIC EN PDF (19/10/2026) — et il ne décide de rien.
 *
 * Tout ce que le document dit vient de `verticales/recouvrement/rapport-diagnostic.ts`,
 * pur et testé : les montants, les fondements tirés du registre, les hypothèses et ce
 * qui n'a pas pu être chiffré. Ce fichier pose des lignes, comme `piece-decompte.ts`,
 * en noir sur blanc : aucune couleur de seuil, un rapport constate.
 *
 * Chargé à la demande (`import()`), comme jspdf partout dans le produit.
 */

const MARGE = 18;
const LARGEUR_UTILE = 210 - MARGE * 2;
const ENCRE = 20;
const ENCRE_DOUCE = 110;

interface Curseur {
	y: number;
}

function saut(doc: jsPDF, curseur: Curseur, hauteur: number): void {
	curseur.y += hauteur;
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
	for (const ligne of doc.splitTextToSize(texte, LARGEUR_UTILE) as string[]) {
		doc.text(ligne, MARGE, curseur.y);
		saut(doc, curseur, (options.taille ?? 9) * 0.42 + 1.4);
	}
}

function finDuTableau(doc: jsPDF): number {
	return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

/** « diagnostic-ateliers-martin-2026-10-19.pdf » : trouvable dans un dossier, une semaine plus tard. */
export function nomFichierRapport(rapport: RapportDiagnostic, arreteAu: string): string {
	const nom = rapport.etablissement
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
	return `diagnostic-${nom || 'factures'}-${arreteAu}.pdf`;
}

export function rendreRapportEnPdf(rapport: RapportDiagnostic): jsPDF {
	const doc = new jsPDF({ unit: 'mm', format: 'a4' });
	// Aucun auteur ni logiciel dans les propriétés : le document est celui du gérant.
	doc.setProperties({ title: rapport.titre, subject: rapport.titre, creator: '', author: '' });
	const curseur: Curseur = { y: MARGE + 4 };

	paragraphe(doc, curseur, rapport.titre, { taille: 15, gras: true });
	saut(doc, curseur, 1);
	paragraphe(
		doc,
		curseur,
		[rapport.etablissement, `Compté au ${rapport.compteAu}`, rapport.periode]
			.filter((x): x is string => x !== null)
			.join(' · '),
		{ taille: 8, gris: true }
	);
	saut(doc, curseur, 4);
	paragraphe(doc, curseur, 'Ce que la loi ajoute à vos factures', { taille: 9, gris: true });
	paragraphe(doc, curseur, rapport.enJeu, { taille: 20, gras: true });
	saut(doc, curseur, 4);

	for (const section of rapport.sections) {
		paragraphe(doc, curseur, section.titre, { taille: 10, gras: true });
		autoTable(doc, {
			startY: curseur.y,
			margin: { left: MARGE, right: MARGE },
			body: section.lignes.map((l) => [l.libelle, l.valeur]),
			styles: { font: 'helvetica', fontSize: 8.5, textColor: ENCRE },
			columnStyles: { 1: { halign: 'right' } },
			theme: 'plain'
		});
		curseur.y = finDuTableau(doc) + 3;
		if (section.note !== undefined)
			paragraphe(doc, curseur, section.note, { taille: 8, gris: true });
		saut(doc, curseur, 4);
	}

	for (const tableau of rapport.tableaux) {
		if (tableau.lignes.length === 0) continue;
		paragraphe(doc, curseur, tableau.titre, { taille: 9, gras: true });
		autoTable(doc, {
			startY: curseur.y,
			margin: { left: MARGE, right: MARGE },
			head: [[...tableau.colonnes]],
			body: tableau.lignes.map((l) => [...l]),
			styles: { font: 'helvetica', fontSize: 8, textColor: ENCRE },
			headStyles: { fillColor: [245, 243, 240], textColor: ENCRE, fontStyle: 'bold' },
			columnStyles: { [tableau.colonnes.length - 1]: { halign: 'right' } }
		});
		curseur.y = finDuTableau(doc) + 7;
	}

	if (rapport.nonChiffrees.length > 0) {
		paragraphe(doc, curseur, 'Ce qui n’a pas pu être chiffré', { taille: 9, gras: true });
		for (const n of rapport.nonChiffrees) {
			paragraphe(doc, curseur, `· ${n.reference} : ${n.raison}`, { taille: 8 });
		}
		saut(doc, curseur, 4);
	}

	if (rapport.hypotheses.length > 0) {
		paragraphe(doc, curseur, 'Ce que le calcul suppose', { taille: 9, gras: true });
		for (const h of rapport.hypotheses) paragraphe(doc, curseur, `· ${h}`, { taille: 8 });
		saut(doc, curseur, 4);
	}

	paragraphe(doc, curseur, 'Fondements', { taille: 9, gras: true });
	for (const f of rapport.fondements) paragraphe(doc, curseur, `· ${f}`, { taille: 8 });
	saut(doc, curseur, 5);

	paragraphe(doc, curseur, rapport.avertissement, { taille: 8, gris: true });
	return doc;
}
