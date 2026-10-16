import { describe, it, expect } from 'vitest';
import { lireCsv } from '../csv';
import { associerColonnes } from '../colonnes';
import { verifierImport, dateFrancaise } from '../import';
import { grouperTaches } from '../taches';
import { normaliserEmail } from '../empreinte';

const ENTETES =
	'Ajouté le;Entreprise;SIREN;Activité (code NAF);Effectif;Ville;Dirigeant;Fonction;E-mail;Téléphone;Site web;Trouvé où;Cible (PME / cabinet);Canal (e-mail / LinkedIn / appel);Modèle utilisé;1er contact le;Relance 1 le;Relance 2 le;Réponse (aucune / positive / négative / stop);Objection entendue;Prochaine action;Prochaine action le;Inscrit (oui / non);Abonné (oui / non);Formule;Notes';

describe('lireCsv', () => {
	it('lit un export d’Excel en français : BOM, point-virgule, guillemets', () => {
		const texte = '﻿A;B;C\r\n1;"deux; trois";"il a dit ""oui"""\r\n';
		expect(lireCsv(texte)).toEqual([
			['A', 'B', 'C'],
			['1', 'deux; trois', 'il a dit "oui"']
		]);
	});

	it('lit la virgule, et un retour à la ligne dans une cellule', () => {
		expect(lireCsv('a,b\n"ligne 1\nligne 2",x\n\n')).toEqual([
			['a', 'b'],
			['ligne 1\nligne 2', 'x']
		]);
	});
});

describe('associerColonnes', () => {
	it('reconnaît les 26 colonnes du tableur de prospection', () => {
		const association = associerColonnes(ENTETES.split(';'));
		expect(association[1]).toBe('entreprise');
		expect(association[2]).toBe('siren');
		expect(association[3]).toBe('activite');
		expect(association[8]).toBe('email');
		expect(association[11]).toBe('trouveOu');
		expect(association[18]).toBe('reponse');
		expect(association[21]).toBe('prochaineActionLe');
		expect(association.filter((c) => c !== null).length).toBeGreaterThanOrEqual(24);
	});

	it('ignore la casse et les accents', () => {
		expect(associerColonnes(['ENTREPRISE', 'e-mail', 'telephone'])).toEqual([
			'entreprise',
			'email',
			'telephone'
		]);
	});
});

describe('dateFrancaise', () => {
	it('lit JJ/MM/AAAA et refuse une date qui n’existe pas', () => {
		expect(dateFrancaise('16/10/2026')).toBe(Date.UTC(2026, 9, 16, 12));
		expect(dateFrancaise('30/02/2026')).toBeNull();
		expect(dateFrancaise('')).toBeNull();
	});
});

describe('verifierImport', () => {
	const association = associerColonnes(ENTETES.split(';'));
	function ligne(valeurs: Record<number, string>): string[] {
		return ENTETES.split(';').map((_, i) => valeurs[i] ?? '');
	}

	it('écarte l’exemple, les doublons, les oppositions et les lignes sans entreprise', () => {
		const r = verifierImport(
			[
				ligne({ 1: 'EXEMPLE Transports Martin', 8: 'p.martin@exemple.fr' }),
				ligne({ 1: 'Garnier Bâtiment', 2: '123456789', 8: 'Contact@Garnier.fr', 12: 'PME' }),
				ligne({ 1: 'Durand SAS', 8: 'deja@durand.fr' }),
				ligne({ 1: 'Martin & Fils', 2: '987654321' }),
				ligne({ 1: 'Refus SARL', 8: 'stop@refus.fr' }),
				ligne({ 8: 'orphelin@exemple.fr' }),
				ligne({ 1: 'Garnier Bis', 8: 'contact@garnier.fr' })
			],
			association,
			{ emails: new Set(['deja@durand.fr']), sirens: new Set(['987654321']) },
			(email) => email === 'stop@refus.fr'
		);
		expect(r.aImporter.map((p) => p.entreprise)).toEqual(['Garnier Bâtiment']);
		expect(r.aImporter[0]).toMatchObject({
			email: 'contact@garnier.fr',
			siren: '123456789',
			cible: 'PME'
		});
		expect(r.ecartees.map((e) => e.raison)).toEqual([
			'EXEMPLE',
			'DOUBLON',
			'DOUBLON',
			'OPPOSITION',
			'SANS_ENTREPRISE',
			'DOUBLON'
		]);
	});

	it('déduit le statut de la ligne : réponse, relances, inscription', () => {
		const r = verifierImport(
			[
				ligne({ 1: 'A', 15: '01/10/2026' }),
				ligne({ 1: 'B', 15: '01/10/2026', 16: '05/10/2026' }),
				ligne({ 1: 'C', 18: 'positive' }),
				ligne({ 1: 'D', 18: 'négative' }),
				ligne({ 1: 'E', 22: 'oui' }),
				ligne({ 1: 'F' })
			],
			association,
			{ emails: new Set(), sirens: new Set() },
			() => false
		);
		expect(r.aImporter.map((p) => p.statut)).toEqual([
			'CONTACTE',
			'RELANCE',
			'INTERESSE',
			'PERDU',
			'INSCRIT',
			'A_CONTACTER'
		]);
		expect(r.aImporter[1]?.dernierContactLe).toBe(Date.UTC(2026, 9, 5, 12));
	});

	it('une réponse « stop » à l’import devient une opposition, sans coordonnées', () => {
		const r = verifierImport(
			[ligne({ 1: 'Non merci SARL', 6: 'Paul Non', 8: 'non@merci.fr', 18: 'stop' })],
			association,
			{ emails: new Set(), sirens: new Set() },
			() => false
		);
		expect(r.aImporter[0]).toMatchObject({ statut: 'STOP', entreprise: 'Non merci SARL' });
		expect(r.aImporter[0]?.email).toBeUndefined();
		expect(r.aImporter[0]?.dirigeant).toBeUndefined();
		expect(r.oppositionsNouvelles).toEqual(['non@merci.fr']);
	});
});

describe('grouperTaches', () => {
	const JOUR = 86_400_000;
	const debut = Date.UTC(2026, 9, 16, 0);
	it('range en retard, aujourd’hui, plus tard, et faites depuis sept jours', () => {
		const g = grouperTaches(
			[
				{ id: 'a', pour: debut - JOUR },
				{ id: 'b', pour: debut + 3600_000 },
				{ id: 'c', pour: debut + 3 * JOUR },
				{ id: 'd', pour: debut - 2 * JOUR, faiteLe: debut - JOUR },
				{ id: 'e', pour: debut - 20 * JOUR, faiteLe: debut - 10 * JOUR }
			],
			debut,
			debut + JOUR
		);
		expect(g.enRetard.map((t) => t.id)).toEqual(['a']);
		expect(g.aujourdhui.map((t) => t.id)).toEqual(['b']);
		expect(g.plusTard.map((t) => t.id)).toEqual(['c']);
		expect(g.faites.map((t) => t.id)).toEqual(['d']);
	});
});

describe('normaliserEmail', () => {
	it('met en minuscules et retire les espaces', () => {
		expect(normaliserEmail('  Contact@Garnier.FR ')).toBe('contact@garnier.fr');
	});
});
