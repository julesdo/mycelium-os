import { describe, it, expect } from 'vitest';
import { moisDe, receptionOuverte, titreDe } from '../conversation';

describe('titreDe', () => {
	it('garde la première phrase, sans la couper au milieu d’un mot', () => {
		expect(titreDe('Comment activer les relances ? Et les horaires ?')).toBe('Comment activer les relances ?');
		const long = 'Je voudrais comprendre pourquoi la connexion à mon logiciel de comptabilité ne lit plus aucune facture depuis lundi';
		const titre = titreDe(long);
		expect(titre.length).toBeLessThanOrEqual(81);
		expect(titre.endsWith('…')).toBe(true);
		expect(long.startsWith(titre.slice(0, -1).trimEnd())).toBe(true);
	});

	it('ne rend jamais un titre vide', () => {
		expect(titreDe('   ')).toBe('Question sans texte');
	});
});

describe('moisDe', () => {
	it('compte le mois à l’heure de Paris', () => {
		// Le 31 octobre à 23 h 30 UTC, il est déjà le 1er novembre à Paris.
		expect(moisDe(Date.UTC(2026, 9, 31, 23, 30))).toBe('2026-11');
	});
});

describe('receptionOuverte', () => {
	const pret = {
		secret: 'whsec_abc',
		domaine: 'aide.letikette.com',
		relancesEmail: 'Relances <relances@envoi-neutre.fr>',
		authEmail: 'Letikette <bonjour@letikette.com>'
	};

	it('s’ouvre quand tout est posé et que les relances partent d’un autre domaine', () => {
		expect(receptionOuverte(pret)).toBe(true);
	});

	it('reste fermée tant que les relances partent du domaine de Letikette', () => {
		expect(receptionOuverte({ ...pret, relancesEmail: undefined })).toBe(false);
		expect(receptionOuverte({ ...pret, relancesEmail: 'relances@letikette.com' })).toBe(false);
		expect(receptionOuverte({ ...pret, relancesEmail: 'Relances <relances@LETIKETTE.com>' })).toBe(false);
	});

	it('s’ouvre quand les relances partent du domaine neutre, une adresse par établissement', () => {
		expect(
			receptionOuverte({ ...pret, relancesEmail: undefined, relancesDomaine: 'suivi-factures.fr' })
		).toBe(true);
	});

	it('reste fermée quand le « domaine neutre » est un sous-domaine de Letikette, ou n’en est pas un', () => {
		expect(
			receptionOuverte({ ...pret, relancesEmail: undefined, relancesDomaine: 'envoi.letikette.com' })
		).toBe(false);
		expect(
			receptionOuverte({ ...pret, relancesEmail: undefined, relancesDomaine: 'pas un domaine' })
		).toBe(false);
	});

	it('reste fermée sans secret ou sans domaine de réception', () => {
		expect(receptionOuverte({ ...pret, secret: '' })).toBe(false);
		expect(receptionOuverte({ ...pret, domaine: undefined })).toBe(false);
	});
});
