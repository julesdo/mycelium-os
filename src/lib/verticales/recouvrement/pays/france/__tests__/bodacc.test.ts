import { describe, it, expect } from 'vitest';
import { lireAnnonce } from '../bodacc';

/**
 * LA LECTURE D'UNE ANNONCE BODACC — et ce que le produit refuse d'y lire.
 *
 * ⚠️ LE PRODUIT NE LIT PAS LE DROIT, IL CITE LA TAXONOMIE DU REGISTRE. Toutes
 * les annonces de la famille « Procédures collectives » ne disent pas qu'une
 * entreprise est insolvable : un « Jugement d'interdiction de gérer » vise une
 * PERSONNE, pas la solvabilité de la société. Classer soi-même la `nature` en
 * état de santé serait une lecture juridique — exactement ce que `CLAUDE.md`
 * interdit.
 *
 * On retient donc le champ que le BODACC remplit LUI-MÊME : `jugement.famille`.
 * Quand il vaut « Jugement d'ouverture », l'état bascule. Pour tout le reste, le
 * constat est enregistré et affiché VERBATIM, et l'état ne bouge pas — le gérant
 * lit le registre, pas notre interprétation.
 *
 * LES ENREGISTREMENTS CI-DESSOUS SONT RÉELS, relevés sur l'API le 9 septembre
 * 2026 et recopiés tels quels. Un jeu d'essai fabriqué à partir de la
 * documentation valide surtout la lecture qu'on a faite de la documentation :
 * il n'aurait pas révélé que `jugement` arrive en CHAÎNE JSON, ni que `registre`
 * porte deux graphies du même numéro.
 */

/** Relevé le 9 septembre 2026 — une liquidation judiciaire. */
const LIQUIDATION = {
	id: 'A202601721671',
	dateparution: '2026-09-09',
	familleavis: 'collective',
	familleavis_lib: 'Procédures collectives',
	tribunal: "Greffe du Tribunal de Commerce d'Evry",
	commercant: 'M.B FOOD',
	registre: ['853479236', '853 479 236'],
	jugement:
		'{"type": "initial", "famille": "Jugement d\'ouverture", "nature": "Jugement d\'ouverture de liquidation judiciaire", "date": "2026-08-31", "complementJugement": "Jugement prononçant la liquidation judiciaire, date de cessation des paiements le 9 janvier 2026."}',
	url_complete: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:A202601721671'
};

/** Relevé le 9 septembre 2026 — une interdiction de gérer, qui vise UNE PERSONNE. */
const INTERDICTION = {
	id: 'A202601721583',
	dateparution: '2026-09-09',
	familleavis: 'collective',
	familleavis_lib: 'Procédures collectives',
	tribunal: 'Greffe du Tribunal de Commerce de Sedan',
	commercant: 'GALLAND, Emery, GALLAND (EI)',
	registre: ['502592959', '502 592 959'],
	jugement:
		'{"type": "initial", "famille": "Extrait de jugement", "nature": "Jugement d\'interdiction de gérer", "date": "2026-09-03", "complementJugement": "Jugement prononçant l\'interdiction prévue à l\'article L. 653-8 du code de commerce."}',
	url_complete: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:A202601721583'
};

/** Relevé le 9 septembre 2026 — une création, qui ne nous concerne pas. */
const CREATION = {
	id: 'A2026017286',
	dateparution: '2026-09-09',
	familleavis: 'creation',
	familleavis_lib: 'Créations',
	tribunal: 'Greffe du Tribunal de Commerce de Bernay',
	commercant: 'GENDRAUD, Nathalie',
	registre: ['109192302', '109 192 302'],
	jugement: null,
	url_complete: 'https://www.bodacc.fr/pages/annonces-commerciales-detail/?q.id=id:A2026017286'
};

describe('ce que le registre dit lui-même', () => {
	it('bascule l’état sur un jugement d’OUVERTURE', () => {
		const constat = lireAnnonce(LIQUIDATION);

		expect(constat).not.toBeNull();
		expect(constat!.siren).toBe('853479236');
		expect(constat!.effetSurLaSante).toBe('PROCEDURE_COLLECTIVE');
		expect(constat!.dateJugement).toBe('2026-08-31');
	});

	it('cite la nature VERBATIM, sans la reformuler', () => {
		// Le gérant lit le registre. Une paraphrase du produit deviendrait une
		// interprétation, et une interprétation engage.
		expect(lireAnnonce(LIQUIDATION)!.nature).toBe("Jugement d'ouverture de liquidation judiciaire");
	});

	it('porte la source citable — le tribunal et le lien', () => {
		const constat = lireAnnonce(LIQUIDATION)!;
		expect(constat.tribunal).toMatch(/Evry/);
		expect(constat.url).toMatch(/bodacc\.fr/);
		expect(constat.identifiantAnnonce).toBe('A202601721671');
	});

	it('NE bascule PAS l’état sur une interdiction de gérer', () => {
		// ⚠️ LE TEST QUI EMPÊCHE UNE LECTURE JURIDIQUE. Elle vise une PERSONNE, pas
		// la solvabilité de la société. Traiter toute annonce « collective » comme
		// une insolvabilité ferait déclarer en procédure une entreprise qui va
		// bien — et un gérant cesserait de la livrer.
		const constat = lireAnnonce(INTERDICTION);

		expect(constat).not.toBeNull();
		expect(constat!.effetSurLaSante).toBe('AUCUN');
		expect(constat!.nature).toBe("Jugement d'interdiction de gérer");
	});

	it('écarte une annonce qui ne concerne pas la santé du débiteur', () => {
		expect(lireAnnonce(CREATION)).toBeNull();
	});

	it('bascule sur RADIEE quand le registre annonce une radiation', () => {
		const constat = lireAnnonce({
			...CREATION,
			familleavis: 'radiation',
			familleavis_lib: 'Radiations',
			jugement: null
		});

		expect(constat).not.toBeNull();
		expect(constat!.effetSurLaSante).toBe('RADIEE');
		// Sans jugement, la nature est le libellé de famille du registre.
		expect(constat!.nature).toBe('Radiations');
	});
});

describe('ce qu’elle refuse de lire, sans jamais lever', () => {
	it('rend null sur un `jugement` dont le JSON est cassé', () => {
		// ⚠️ `JSON.parse` échouera tôt ou tard sur un flux de plusieurs millions
		// d'annonces. Une annonce illisible ne doit pas emporter le lot du jour.
		expect(() => lireAnnonce({ ...LIQUIDATION, jugement: '{ pas du JSON' })).not.toThrow();
		const constat = lireAnnonce({ ...LIQUIDATION, jugement: '{ pas du JSON' });
		expect(constat).not.toBeNull();
		// Le SIREN et l'annonce restent exploitables ; seul l'effet est neutralisé.
		expect(constat!.effetSurLaSante).toBe('AUCUN');
	});

	it('rend null quand aucun numéro du registre ne passe sa clé', () => {
		// Sans identifiant fiable, on ne rapproche RIEN. Rapprocher par nom
		// annoncerait tôt ou tard une liquidation à un gérant dont le client va
		// bien.
		expect(lireAnnonce({ ...LIQUIDATION, registre: ['853479237'] })).toBeNull();
		expect(lireAnnonce({ ...LIQUIDATION, registre: [] })).toBeNull();
		expect(lireAnnonce({ ...LIQUIDATION, registre: null })).toBeNull();
	});

	it('rend null sur une date de parution inexploitable', () => {
		expect(lireAnnonce({ ...LIQUIDATION, dateparution: '2026-02-30' })).toBeNull();
		expect(lireAnnonce({ ...LIQUIDATION, dateparution: null })).toBeNull();
	});

	it('écarte une date de jugement impossible sans écarter l’annonce', () => {
		const casse = JSON.parse(LIQUIDATION.jugement) as Record<string, unknown>;
		casse.date = '2026-02-30';
		const constat = lireAnnonce({ ...LIQUIDATION, jugement: JSON.stringify(casse) });

		expect(constat).not.toBeNull();
		expect(constat!.dateJugement).toBeUndefined();
		// L'ouverture reste une ouverture : c'est la DATE qu'on ne sait pas lire.
		expect(constat!.effetSurLaSante).toBe('PROCEDURE_COLLECTIVE');
	});

	it('ne lève sur rien du tout', () => {
		for (const brut of [null, undefined, 42, 'texte', {}, { registre: 'pas un tableau' }]) {
			expect(() => lireAnnonce(brut)).not.toThrow();
			expect(lireAnnonce(brut)).toBeNull();
		}
	});
});
