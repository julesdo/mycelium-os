import { describe, it, expect } from 'vitest';
import { composerRelance, NIVEAUX_RELANCE, type ElementsRelance } from '../relance';
import { depuisEuros } from '../../../socle/montants';

/**
 * LES RELANCES ASYMÉTRIQUES — module 3.1 du blueprint.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ CE SONT DES BROUILLONS, ET C'EST UNE LIGNE ROUGE, PAS UN CHOIX DE PRODUIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Le recouvrement amiable pour le compte d'autrui est une activité encadrée.
 * En Phase 1, les relances sont des BROUILLONS générés dans la boîte du client.
 * C'est lui qui envoie, depuis sa propre adresse, sous sa propre signature.
 * Letikette n'apparaît à aucun moment dans la chaîne. »
 *
 * Ce module compose donc un texte que le créancier enverra LUI-MÊME. Rien ici
 * n'expédie quoi que ce soit, et aucun brouillon ne nomme le logiciel — un test
 * balaie chaque texte produit.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * TROIS NIVEAUX, DONT UN QUI NE PEUT PAS ENCORE EXISTER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le niveau 3 est une mise en demeure : elle cite les articles et porte le
 * décompte chiffré. Les mentions obligatoires n'ont pas été fournies, et la
 * règle 0.1 interdit de les deviner. Il se déclare donc INDISPONIBLE et nomme
 * ce qui lui manque — exactement comme la procédure L.126 le fait déjà.
 *
 * Un module qui se déclare partiellement disponible est plus utile qu'un module
 * absent, et infiniment moins dangereux qu'un module qui enverrait une mise en
 * demeure aux mentions inventées : elle serait inopérante, et le créancier
 * croirait un délai lancé qui ne l'est pas.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ ET LE COUPE-CIRCUIT PASSE AVANT TOUT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un débiteur en procédure collective ne se relance pas. Le blueprint donne
 * même la formulation : « Les relances sont suspendues : ce débiteur est en
 * liquidation depuis le 14 mars » — un CONSTAT. « Déclarez votre créance au
 * mandataire » serait un conseil, et c'est la colonne interdite.
 */

const BASE: ElementsRelance = {
	creancier: 'Thumbbb Agency',
	debiteur: 'Fournitures Durand',
	factures: [
		{ reference: 'FA-2026-004', montantTTC: depuisEuros('12000,00'), dateEcheance: '2026-05-15' }
	],
	principalRestantDu: depuisEuros('12000,00'),
	santeDebiteur: 'SAINE',
	aujourdHui: '2026-09-03'
};

function texteDe(relance: ReturnType<typeof composerRelance>): string {
	return relance.disponible ? `${relance.objet} ${relance.corps}` : relance.constat;
}

describe('les niveaux', () => {
	it('en déclare trois', () => {
		expect(NIVEAUX_RELANCE.map((n) => n.niveau)).toEqual([1, 2, 3]);
	});

	it('dit ce que chacun change, sans promettre de résultat', () => {
		for (const niveau of NIVEAUX_RELANCE) {
			expect(niveau.intention.length).toBeGreaterThan(0);
			expect(niveau.intention).not.toMatch(/garanti|assur[eé] d[eu]|obtiendrez/i);
		}
	});
});

describe('le niveau 1 — le rappel administratif', () => {
	it('compose un brouillon', () => {
		const relance = composerRelance(1, BASE);
		expect(relance.disponible).toBe(true);
	});

	it('parle à la première personne du CRÉANCIER', () => {
		// ⚠️ Le texte part de la boîte du client, sous sa signature. Une phrase à
		// la troisième personne — « Thumbbb Agency vous relance » — trahirait un
		// tiers dans la chaîne, ce que la ligne rouge 1 interdit.
		const relance = composerRelance(1, BASE);
		expect(texteDe(relance)).toMatch(/\bnous\b|\bnotre\b/i);
		expect(relance.disponible && relance.corps).toContain('Thumbbb Agency');
	});

	it('nomme la facture et son échéance', () => {
		const relance = composerRelance(1, BASE);
		expect(texteDe(relance)).toContain('FA-2026-004');
		expect(texteDe(relance)).toContain('15/05/2026');
	});

	it('n’annonce aucune suite, et c’est ce qui le distingue du niveau 2', () => {
		// Un premier rappel qui menace déjà n'a plus de marche au-dessus de lui.
		// L'asymétrie est tout l'intérêt du module.
		const relance = composerRelance(1, BASE);
		expect(texteDe(relance)).not.toMatch(
			/intérêts de retard|indemnité|pénalit|contentieux|poursuite|procédure/i
		);
	});
});

describe('le niveau 2 — le compte arrêté', () => {
	const AVEC_DECOMPTE: ElementsRelance = {
		...BASE,
		decompte: {
			arreteAu: '2026-09-03',
			interets: depuisEuros('640,00'),
			indemniteForfaitaire: depuisEuros('40,00'),
			total: depuisEuros('12680,00')
		}
	};

	it('REFUSE de composer sans décompte arrêté', () => {
		// ⚠️ IL NE RECALCULE RIEN. Le seul chiffre opposable est celui d'un
		// décompte figé et daté ; en recomposer un ici ferait un second calcul,
		// donc une seconde vérité, dans un texte qui part chez le débiteur.
		const relance = composerRelance(2, BASE);
		expect(relance.disponible).toBe(false);
		expect(texteDe(relance)).toMatch(/décompte/i);
	});

	it('reprend les montants du décompte, sans les retoucher', () => {
		const relance = composerRelance(2, AVEC_DECOMPTE);
		expect(relance.disponible).toBe(true);
		const texte = texteDe(relance);
		expect(texte).toContain('12 680,00');
		expect(texte).toContain('640,00');
		expect(texte).toContain('40,00');
	});

	it('date le compte, parce qu’un total sans date ne se vérifie pas', () => {
		expect(texteDe(composerRelance(2, AVEC_DECOMPTE))).toContain('03/09/2026');
	});

	it('n’est PAS une mise en demeure, et ne s’en donne pas les mots', () => {
		// ⚠️ Une mise en demeure produit des effets de droit. Un texte qui en
		// emprunte la forme sans en avoir les mentions ferait croire au créancier
		// qu'un délai est lancé — et la suite de sa procédure se calculerait sur
		// une date fausse.
		expect(texteDe(composerRelance(2, AVEC_DECOMPTE))).not.toMatch(
			/mise en demeure|dernier rappel avant|sous huitaine|à défaut de quoi/i
		);
	});
});

describe('le niveau 3 — indisponible, et il dit pourquoi', () => {
	it('refuse de composer une mise en demeure', () => {
		// ⚠️ Les mentions obligatoires n'ont pas été fournies, et la règle 0.1
		// interdit de les deviner. Une mise en demeure irrégulière est pire
		// qu'aucune : elle ne produit pas les effets qu'on lui prête.
		const relance = composerRelance(3, BASE);
		expect(relance.disponible).toBe(false);
	});

	it('NOMME le paramètre qui manque', () => {
		const relance = composerRelance(3, BASE);
		expect(!relance.disponible && relance.blocages.join(' ')).toMatch(/mentionsObligatoires/i);
	});
});

describe('le coupe-circuit', () => {
	const EN_LIQUIDATION: ElementsRelance = {
		...BASE,
		santeDebiteur: 'PROCEDURE_COLLECTIVE',
		constatRegistre: {
			nature: 'Jugement d’ouverture de liquidation judiciaire',
			dateJugement: '2026-03-14'
		}
	};

	it('suspend les relances à TOUS les niveaux', () => {
		for (const niveau of [1, 2, 3] as const) {
			expect(composerRelance(niveau, EN_LIQUIDATION).disponible).toBe(false);
		}
	});

	it('CONSTATE la situation et cite la date du registre', () => {
		// Le blueprint donne la phrase : « Les relances sont suspendues : ce
		// débiteur est en liquidation depuis le 14 mars ».
		const constat = texteDe(composerRelance(1, EN_LIQUIDATION));
		expect(constat).toMatch(/suspend/i);
		expect(constat).toContain('14/03/2026');
	});

	it('ne dit JAMAIS quoi faire à la place', () => {
		// « Déclarez votre créance au mandataire » est la colonne interdite du
		// tableau des lignes rouges. Le produit constate, le créancier décide.
		const constat = texteDe(composerRelance(1, EN_LIQUIDATION));
		expect(constat).not.toMatch(/déclarez|adressez-vous|contactez le mandataire|vous devez/i);
	});

	it('suspend aussi sur un débiteur radié', () => {
		expect(
			composerRelance(1, { ...BASE, santeDebiteur: 'RADIEE' }).disponible
		).toBe(false);
	});
});

describe('ce qu’aucun brouillon ne contient, jamais', () => {
	const TOUS = [
		composerRelance(1, BASE),
		composerRelance(2, {
			...BASE,
			decompte: {
				arreteAu: '2026-09-03',
				interets: depuisEuros('640,00'),
				indemniteForfaitaire: depuisEuros('40,00'),
				total: depuisEuros('12680,00')
			}
		})
	];

	it('ne nomme jamais le logiciel', () => {
		// ⚠️ LIGNE ROUGE 1 : « Letikette n'apparaît à aucun moment dans la
		// chaîne. » Un débiteur qui lit le nom d'un tiers y voit un mandat de
		// recouvrement, et c'est exactement l'activité qu'on n'exerce pas.
		for (const relance of TOUS) {
			expect(texteDe(relance)).not.toMatch(/letikette/i);
		}
	});

	it('n’écrit aucun numéro d’article', () => {
		// Les fondements vivent dans le registre, jamais dans un gabarit. Le
		// niveau 3 les citera, quand un juriste les aura fournis et validés.
		for (const relance of TOUS) {
			expect(texteDe(relance)).not.toMatch(/\barticles?\s|L\.?\s?\d{3}-\d|D\.?\s?\d{3}-\d/i);
		}
	});

	it('ne menace d’aucune procédure', () => {
		for (const relance of TOUS) {
			expect(texteDe(relance)).not.toMatch(
				/injonction|assignation|tribunal|huissier|commissaire de justice|contentieux|poursuite/i
			);
		}
	});
});
