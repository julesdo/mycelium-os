import { describe, it, expect } from 'vitest';
import { nomFichierPiece } from '../piece-decompte';
import type { Piece } from '../../lib/verticales/recouvrement/piece';

/**
 * LE NOM DU FICHIER — la seule chose du rendu qui mérite un test.
 *
 * Le reste du module pose des lignes sur une page : ça se relit à l'œil sur le
 * PDF produit, pas dans une assertion. Le NOM, lui, est ce que le destinataire
 * voit en pièce jointe avant même d'ouvrir. « decompte.pdf » dans une boîte qui
 * en reçoit dix est introuvable une semaine plus tard.
 *
 * ⚠️ ET IL PORTE UN PIÈGE INVISIBLE. Le retrait des accents passe par la plage
 * de diacritiques combinants U+0300–U+036F, écrite en LITTÉRAL dans la source —
 * donc illisible à la relecture, et cassable par n'importe quel outil qui
 * renormalise le fichier. Sans le test ci-dessous, « Bécaud » deviendrait
 * silencieusement « Be-caud » et personne ne le verrait avant un client.
 */

function piece(surcharge: Partial<Piece> = {}): Piece {
	return {
		titre: 'Décompte de créance arrêté au 1 septembre 2026',
		dateArrete: '2026-09-01',
		sousTitre: '',
		creancier: ['Thumbbb Agency'],
		debiteur: ['Fournitures Durand'],
		factures: [],
		totaux: { principal: '', interets: '', indemnites: '', total: '' },
		fondements: [],
		horsDecompte: [],
		avertissement: '',
		...surcharge
	};
}

describe('le nom du fichier', () => {
	it('porte le débiteur et la date d’arrêté', () => {
		expect(nomFichierPiece(piece())).toBe('decompte-Fournitures-Durand-2026-09-01.pdf');
	});

	it('retire les accents sans les transformer en tirets', () => {
		// LE TEST QUI GARDE LA PLAGE ILLISIBLE. « Bécaud » doit donner « Becaud »,
		// jamais « Be-caud » : c'est exactement ce qui arriverait si le retrait des
		// diacritiques combinants sautait.
		expect(nomFichierPiece(piece({ debiteur: ['Bécaud Frères'] }))).toBe(
			'decompte-Becaud-Freres-2026-09-01.pdf'
		);
		expect(nomFichierPiece(piece({ debiteur: ['Créations Ébénisterie'] }))).toBe(
			'decompte-Creations-Ebenisterie-2026-09-01.pdf'
		);
	});

	it('n’ouvre aucun chemin — ni barre oblique, ni point, ni deux-points', () => {
		// Une dénomination sociale est du texte libre. « SARL A/B : C » deviendrait
		// un chemin sur le disque du destinataire, ou un nom refusé par son système.
		const nom = nomFichierPiece(piece({ debiteur: ['SARL A/B : C..\\D'] }));
		expect(nom).not.toMatch(/[/\\:]/);
		expect(nom).toBe('decompte-SARL-A-B-C-D-2026-09-01.pdf');
	});

	it('ne finit ni ne commence par un tiret', () => {
		expect(nomFichierPiece(piece({ debiteur: ['« Durand »'] }))).toBe(
			'decompte-Durand-2026-09-01.pdf'
		);
	});

	it('reste nommable quand l’identité du débiteur manque', () => {
		// Un décompte produit avant le gel des identités n'en porte pas. Le fichier
		// doit quand même avoir un nom — et surtout pas « decompte--2026-09-01 ».
		const nom = nomFichierPiece(piece({ debiteur: [] }));
		expect(nom).toBe('decompte-debiteur-2026-09-01.pdf');
	});

	it('borne la longueur — une raison sociale peut être un paragraphe', () => {
		const nom = nomFichierPiece(piece({ debiteur: ['A'.repeat(120)] }));
		expect(nom.length).toBeLessThan(80);
	});
});
