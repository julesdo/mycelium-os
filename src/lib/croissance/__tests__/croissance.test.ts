import { describe, it, expect } from 'vitest';
import { lireSource, libelleDeSource } from '../source';
import { deduireEtapes, type EtatDuCompte } from '../etapes';
import { calculerScore } from '../score';
import { prochainConseil, ECART_MINIMAL_MS } from '../conseils';
import { compterParSource } from '../semaine';

const JOUR = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 14, 10, 0); // un mercredi

describe('lireSource', () => {
	it('lit une campagne utm', () => {
		const s = lireSource({
			url: 'https://www.letikette.com/?utm_source=manuel&utm_medium=email&utm_campaign=transport#calcul',
			referent: ''
		});
		expect(s).toEqual({
			canal: 'campagne',
			pageEntree: '/',
			utmSource: 'manuel',
			utmMedium: 'email',
			utmCampaign: 'transport'
		});
		expect(libelleDeSource(s)).toBe('manuel · transport');
	});
	it('reconnaît une recherche, un réseau, un assistant, un site, et notre propre domaine', () => {
		expect(
			lireSource({ url: 'https://www.letikette.com/tarifs', referent: 'https://www.google.fr/' })
				.canal
		).toBe('recherche');
		expect(
			lireSource({ url: 'https://www.letikette.com/', referent: 'https://www.linkedin.com/feed' })
				.canal
		).toBe('social');
		expect(
			lireSource({ url: 'https://www.letikette.com/', referent: 'https://chatgpt.com/' }).canal
		).toBe('assistant');
		expect(
			lireSource({ url: 'https://www.letikette.com/', referent: 'https://blog.exemple.fr/article' })
		).toMatchObject({ canal: 'site', referent: 'blog.exemple.fr' });
		expect(
			lireSource({ url: 'https://www.letikette.com/', referent: 'https://www.letikette.com/blog' })
				.canal
		).toBe('direct');
	});
	it('résiste à une adresse piégée', () => {
		const long = 'x'.repeat(5000);
		const s = lireSource({
			url: `https://www.letikette.com/?utm_source=${long}`,
			referent: 'pas une adresse'
		});
		expect(s.utmSource?.length).toBeLessThanOrEqual(120);
		expect(s.referent).toBeUndefined();
		expect(lireSource({ url: 'n’importe quoi', referent: '' })).toEqual({
			canal: 'direct',
			pageEntree: '/'
		});
	});
});

function etat(partiel: Partial<EtatDuCompte> = {}): EtatDuCompte {
	return {
		creeLe: T0,
		sirenConnu: false,
		premierDepotLe: null,
		diagnosticLanceLe: null,
		diagnosticRenduLe: null,
		factureEchueImpayee: false,
		relancesActiveesLe: null,
		relancesActives: false,
		statutPaiement: null,
		formule: null,
		rythme: null,
		resiliationPrevue: false,
		derniereActivite: T0,
		...partiel
	};
}

describe('deduireEtapes', () => {
	it('note chaque étape une fois, à sa date, sans réécrire une date déjà notée', () => {
		const m1 = deduireEtapes(
			etat({ premierDepotLe: T0 + 1000, factureEchueImpayee: true }),
			{ etapes: {} },
			T0 + 2000
		);
		expect(m1.etapes).toEqual({
			INSCRIT: T0,
			FACTURES_DEPOSEES: T0 + 1000,
			MONTANT_REVELE: T0 + 2000
		});
		const m2 = deduireEtapes(
			etat({ premierDepotLe: T0 + 1000, factureEchueImpayee: true }),
			m1,
			T0 + 9000
		);
		expect(m2.etapes.MONTANT_REVELE).toBe(T0 + 2000);
	});
	it('date le diagnostic au moment réel, jamais au moment du relevé', () => {
		const m = deduireEtapes(
			etat({ diagnosticLanceLe: T0 + 100, diagnosticRenduLe: T0 + 600 }),
			{ etapes: {} },
			T0 + 9000
		);
		expect(m.etapes.DIAGNOSTIC_LANCE).toBe(T0 + 100);
		expect(m.etapes.DIAGNOSTIC_RENDU).toBe(T0 + 600);
	});
	it('mesure la montée en gamme contre la formule vue au premier abonnement', () => {
		const m1 = deduireEtapes(
			etat({ statutPaiement: 'active', formule: 'solo', rythme: 'mensuel' }),
			{ etapes: {} },
			T0
		);
		expect(m1.formuleVue).toBe('solo');
		const m2 = deduireEtapes(
			etat({ statutPaiement: 'active', formule: 'equipe', rythme: 'mensuel' }),
			m1,
			T0 + JOUR
		);
		expect(m2.etapes.MONTEE_EN_GAMME).toBe(T0 + JOUR);
	});
	it('lève « à risque » quand le compte revient, et note la reconquête', () => {
		const vieux = etat({
			statutPaiement: 'active',
			formule: 'solo',
			rythme: 'mensuel',
			derniereActivite: T0 - 20 * JOUR
		});
		const m1 = deduireEtapes(vieux, { etapes: {} }, T0);
		expect(m1.etapes.A_RISQUE).toBe(T0);
		const m2 = deduireEtapes({ ...vieux, derniereActivite: T0 }, m1, T0 + 1);
		expect(m2.etapes.A_RISQUE).toBeUndefined();
		const m3 = deduireEtapes(etat({ statutPaiement: 'canceled' }), m2, T0 + 2);
		expect(m3.etapes.RESILIE).toBe(T0 + 2);
		const m4 = deduireEtapes(etat({ statutPaiement: 'active', formule: 'solo' }), m3, T0 + 3);
		expect(m4.etapes.RECONQUIS).toBe(T0 + 3);
	});
});

describe('calculerScore', () => {
	it('reste entre 0 et 100 et dit pourquoi', () => {
		const vide = calculerScore({
			etapes: { INSCRIT: T0 },
			derniereActivite: T0 - 30 * JOUR,
			maintenant: T0,
			factures: 0,
			interetFormuleLe: null,
			membres: 1
		});
		expect(vide.score).toBe(0);
		const plein = calculerScore({
			etapes: {
				INSCRIT: T0,
				ENTREPRISE: T0,
				FACTURES_DEPOSEES: T0,
				MONTANT_REVELE: T0,
				RELANCES_ACTIVEES: T0,
				ESSAI: T0,
				ABONNE: T0,
				MONTEE_EN_GAMME: T0
			},
			derniereActivite: T0,
			maintenant: T0,
			factures: 300,
			interetFormuleLe: T0,
			membres: 3
		});
		expect(plein.score).toBe(100);
		expect(plein.raisons).toContain('Relances activées');
	});
});

describe('prochainConseil', () => {
	it('souhaite la bienvenue tout de suite, puis attend deux jours', () => {
		expect(prochainConseil({ INSCRIT: T0 }, [], T0)).toEqual({ cle: 'bienvenue', des: T0 });
		const apres = prochainConseil({ INSCRIT: T0 }, [{ cle: 'bienvenue', le: T0 }], T0 + 1000);
		expect(apres).toEqual({ cle: 'il-manque-vos-factures', des: T0 + ECART_MINIMAL_MS });
	});
	it('ne relance pas les factures quand elles sont déposées', () => {
		const p = prochainConseil(
			{ INSCRIT: T0, FACTURES_DEPOSEES: T0 + 1 },
			[{ cle: 'bienvenue', le: T0 }],
			T0 + 3 * JOUR
		);
		expect(p).toBeNull();
	});
	it('dit ce qui est dû au montant révélé, puis ce qui partirait trois jours plus tard', () => {
		const e = { INSCRIT: T0, FACTURES_DEPOSEES: T0, MONTANT_REVELE: T0 };
		expect(prochainConseil(e, [{ cle: 'bienvenue', le: T0 - 3 * JOUR }], T0)).toEqual({
			cle: 'ce-qui-vous-est-du',
			des: T0
		});
		const suite = prochainConseil(
			e,
			[
				{ cle: 'bienvenue', le: T0 - 3 * JOUR },
				{ cle: 'ce-qui-vous-est-du', le: T0 }
			],
			T0 + JOUR
		);
		expect(suite).toEqual({ cle: 'ce-qui-partirait', des: T0 + 3 * JOUR });
		expect(
			prochainConseil(
				{ ...e, RELANCES_ACTIVEES: T0 + 1 },
				[
					{ cle: 'bienvenue', le: T0 - 3 * JOUR },
					{ cle: 'ce-qui-vous-est-du', le: T0 }
				],
				T0 + 3 * JOUR
			)
		).toBeNull();
	});
	it('un compte ancien dont une étape vient d’être relevée ne reçoit rien', () => {
		// Au premier relevé, un client inscrit depuis trois mois voit son « montant révélé »
		// daté d'aujourd'hui : ce n'est pas un nouvel inscrit, il ne reçoit pas de conseil.
		expect(prochainConseil({ INSCRIT: T0 - 90 * JOUR, MONTANT_REVELE: T0 }, [], T0)).toBeNull();
	});

	it('un compte ancien ne reçoit rien', () => {
		expect(
			prochainConseil({ INSCRIT: T0 - 60 * JOUR, MONTANT_REVELE: T0 - 50 * JOUR }, [], T0)
		).toBeNull();
	});
	it('une inscription le vendredi à 19 h garde sa bienvenue jusqu’au lundi', () => {
		const vendredi = Date.UTC(2026, 9, 16, 17, 0);
		const lundi = Date.UTC(2026, 9, 19, 7, 0);
		expect(prochainConseil({ INSCRIT: vendredi }, [], lundi)).toEqual({
			cle: 'bienvenue',
			des: vendredi
		});
	});
});

describe('compterParSource', () => {
	it('compte les étapes atteintes dans la fenêtre, par source', () => {
		const r = compterParSource(
			[
				{
					source: { canal: 'recherche', pageEntree: '/', referent: 'www.google.fr' },
					etapes: { INSCRIT: T0, FACTURES_DEPOSEES: T0 }
				},
				{ source: { canal: 'recherche', pageEntree: '/' }, etapes: { INSCRIT: T0 - 10 * JOUR } },
				{ source: null, etapes: { INSCRIT: T0 } }
			],
			T0 - 7 * JOUR,
			T0 + 1
		);
		expect(r.total.INSCRIT).toBe(2);
		expect(r.lignes.find((l) => l.source === 'Recherche')?.compte).toEqual({
			INSCRIT: 1,
			FACTURES_DEPOSEES: 1
		});
		expect(r.lignes.find((l) => l.source === 'Inconnue')?.compte.INSCRIT).toBe(1);
	});
});
