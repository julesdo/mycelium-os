import { describe, expect, it } from 'vitest';
import { rappelsDus, texteDuRappel, type EtatPourRappels } from '../rappels';

const JOUR = 24 * 60 * 60 * 1000;
const maintenant = Date.parse('2026-11-04T08:00:00Z');

const essai = (dans: number, champs: Partial<EtatPourRappels> = {}): EtatPourRappels => ({
	statut: 'trialing',
	formule: 'equipe',
	rythme: 'annuel',
	essaiFinLe: maintenant + dans * JOUR,
	prochainPrelevementLe: maintenant + dans * JOUR,
	resiliationLe: null,
	deja: [],
	...champs
});

describe('les rappels dus', () => {
	it('fait le point à sept jours, sans e-mail', () => {
		const [point] = rappelsDus(essai(7), maintenant);
		expect(point).toMatchObject({ genre: 'point', jours: 7, email: false });
	});

	it('prévient à deux jours, par e-mail, et met le plus urgent en tête', () => {
		const dus = rappelsDus(essai(2), maintenant);
		expect(dus.map((d) => d.genre)).toEqual(['essai', 'point']);
		expect(dus[0]?.email).toBe(true);
	});

	it('ne renvoie jamais un rappel déjà parti', () => {
		const [premier] = rappelsDus(essai(7), maintenant);
		// Le lendemain, même fin d'essai : le point est déjà parti.
		expect(rappelsDus(essai(7, { deja: [premier!.cle] }), maintenant + JOUR)).toEqual([]);
	});

	it('se tait sur un essai résilié', () => {
		expect(rappelsDus(essai(2, { resiliationLe: maintenant + 2 * JOUR }), maintenant)).toEqual([]);
	});

	it('annonce un renouvellement annuel trente jours avant, pas un mensuel', () => {
		const actif = (rythme: 'annuel' | 'mensuel') =>
			essai(0, {
				statut: 'active',
				rythme,
				essaiFinLe: null,
				prochainPrelevementLe: maintenant + 30 * JOUR
			});
		expect(rappelsDus(actif('annuel'), maintenant)[0]).toMatchObject({
			genre: 'renouvellement',
			email: true
		});
		expect(rappelsDus(actif('mensuel'), maintenant)).toEqual([]);
	});
});

/** Intl place une espace insécable fine devant « € » : on compare des espaces simples. */
const lisible = (texte: string) => texte.replace(/[\u202f\u00a0]/g, ' ');

describe('le texte d’un rappel', () => {
	it('dit ce qui est rentré sur les dossiers suivis, la date et le montant', () => {
		const [point] = rappelsDus(essai(7), maintenant);
		const texte = texteDuRappel(point!, 'equipe', 'annuel', {
			relancesParties: 12,
			rentre: 234000n
		});
		expect(texte.titre).toBe('Votre essai se termine le 11 novembre');
		expect(lisible(texte.message)).toContain('12 relances parties');
		expect(lisible(texte.message)).toContain('rentrés sur les dossiers suivis');
		expect(lisible(texte.message)).toContain('590 € HT');
		expect(texte.message).not.toMatch(/grâce à|garanti/i);
	});

	it('annonce le prix que l’établissement paie, pas la grille du jour', () => {
		const [point] = rappelsDus(essai(7), maintenant);
		// Souscrit à 390 € l'année avant le passage d'Équipe à 590 €.
		const texte = texteDuRappel(
			point!,
			'equipe',
			'annuel',
			{ relancesParties: 0, rentre: 0n },
			'39000'
		);
		expect(lisible(texte.message)).toContain('390 € HT');
		expect(lisible(texte.message)).not.toContain('590 € HT');
	});

	it('dit comment annuler avant le premier prélèvement', () => {
		const [rappel] = rappelsDus(essai(2), maintenant);
		const texte = texteDuRappel(rappel!, 'solo', 'mensuel', { relancesParties: 0, rentre: 0n });
		expect(texte.titre).toBe('Premier prélèvement le 6 novembre');
		expect(lisible(texte.message)).toContain('12 € HT pour Solo, au mois');
		expect(lisible(texte.message)).toContain('Pour annuler');
	});
});
