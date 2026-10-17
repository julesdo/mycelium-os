import { describe, expect, it } from 'vitest';
import {
	adresseMailto,
	composerEmail,
	composerLinkedIn,
	etapeDEcriture,
	jourDeRelance,
	modeleDe,
	nomDUsage,
	prenomDe,
	type ValeursDeLaLoi
} from '../modeles';
import { valeursDeLaLoi } from '../valeurs-loi';

const LOI: ValeursDeLaLoi = {
	indemnite: '40 €',
	taux: '12,40 %',
	delaiTransport: 1,
	delaiGeneral: 5,
	exemple: '6 000 €'
};

const TRANSPORTEUR = {
	entreprise: 'TRANSPORTS MOREAU ET FILS',
	dirigeant: 'Claire Moreau',
	activite: 'Transports routiers de fret de proximité (49.41B)',
	cible: 'PME' as const
};

describe('le modèle', () => {
	it('se choisit sur l’activité, puis sur la cible', () => {
		expect(modeleDe(TRANSPORTEUR)).toBe('TRANSPORT');
		expect(
			modeleDe({ cible: 'PME', activite: 'Travaux de construction spécialisés (43.21A)' })
		).toBe('BATIMENT_SERVICES');
		expect(modeleDe({ cible: 'CABINET', activite: 'Activités comptables (69.20Z)' })).toBe(
			'CABINET'
		);
		expect(modeleDe({ cible: 'PME' })).toBe('BATIMENT_SERVICES');
	});

	it('suit le nombre d’e-mails déjà écrits : premier, J+4, J+10, puis plus rien', () => {
		expect(etapeDEcriture(0)).toBe('PREMIER');
		expect(etapeDEcriture(1)).toBe('RELANCE_1');
		expect(etapeDEcriture(2)).toBe('RELANCE_2');
		expect(etapeDEcriture(3)).toBe('FINI');
	});
});

describe('les noms', () => {
	it('prend le prénom du dirigeant', () => {
		expect(prenomDe('Claire Moreau')).toBe('Claire');
		expect(prenomDe(undefined)).toBeUndefined();
	});

	it('écrit un nom en capitales comme on l’écrit dans une lettre', () => {
		expect(nomDUsage('TRANSPORTS MOREAU ET FILS')).toBe('Transports Moreau et Fils');
		expect(nomDUsage('SOCIETE EUROPEENNE D’AUDIT (SEA)')).toBe('Societe Europeenne d’Audit (SEA)');
		expect(nomDUsage('Atelier Dupont')).toBe('Atelier Dupont');
		expect(nomDUsage('L’ATELIER DU BOIS')).toBe('L’Atelier du Bois');
	});
});

describe('composerEmail', () => {
	it('écrit le premier e-mail du transport avec les valeurs du registre', () => {
		const { objet, corps } = composerEmail({
			prospect: TRANSPORTEUR,
			etape: 'PREMIER',
			signataire: { prenom: 'Jules', fondateur: true },
			loi: LOI
		});
		expect(objet).toBe('Vos factures de transport et le délai d’un an');
		expect(corps).toMatch(/^Bonjour Claire,/);
		expect(corps).toContain('pendant un an, contre cinq ans');
		expect(corps).toContain('40 €');
		expect(corps).toContain('12,40 %');
		expect(corps).toContain('environ 6 000 €');
		expect(corps).toContain('Letikette, à Paris');
		expect(corps).toContain('Transports Moreau et Fils');
		expect(corps).toContain('utm_campaign=transport');
		expect(corps).toContain('Jules\nFondateur de Letikette');
		expect(corps).toContain('Si vous préférez que je ne vous écrive plus, répondez « stop »');
	});

	it('laisse la phrase personnelle à écrire, entre crochets', () => {
		const { corps } = composerEmail({
			prospect: TRANSPORTEUR,
			etape: 'PREMIER',
			signataire: { prenom: 'Jules', fondateur: true },
			loi: LOI
		});
		expect(corps).toMatch(/\[Une phrase pour Transports Moreau et Fils/);
		expect(corps).not.toMatch(/\{/);
	});

	it('dit « Bonjour, » sans prénom connu', () => {
		const { corps } = composerEmail({
			prospect: { entreprise: 'ATELIER', cible: 'PME' },
			etape: 'PREMIER',
			signataire: { prenom: 'Jules', fondateur: true },
			loi: LOI
		});
		expect(corps).toMatch(/^Bonjour,/);
	});

	it('n’écrit jamais le mot interdit ni une procédure à engager', () => {
		for (const etape of ['PREMIER', 'RELANCE_1', 'RELANCE_2'] as const) {
			for (const prospect of [
				TRANSPORTEUR,
				{ entreprise: 'X', cible: 'PME' as const },
				{ entreprise: 'Y', cible: 'CABINET' as const }
			]) {
				const { objet, corps } = composerEmail({
					prospect,
					etape,
					signataire: { prenom: 'Lou', fondateur: false },
					loi: LOI
				});
				expect(`${objet} ${corps}`).not.toMatch(/garanti|vous devriez|engager une proc/i);
			}
		}
	});

	it('signe sans titre un membre qui n’est pas fondateur', () => {
		const { corps } = composerEmail({
			prospect: TRANSPORTEUR,
			etape: 'RELANCE_1',
			signataire: { prenom: 'Lou', fondateur: false },
			loi: LOI
		});
		expect(corps).toContain('Lou\nLetikette · www.letikette.com');
	});

	it('écrit les relances courtes, la seconde se dit la dernière', () => {
		const un = composerEmail({
			prospect: TRANSPORTEUR,
			etape: 'RELANCE_1',
			signataire: { prenom: 'Jules', fondateur: true },
			loi: LOI
		});
		const deux = composerEmail({
			prospect: TRANSPORTEUR,
			etape: 'RELANCE_2',
			signataire: { prenom: 'Jules', fondateur: true },
			loi: LOI
		});
		expect(un.objet).toBe('Re : Vos factures de transport et le délai d’un an');
		expect(un.corps).toContain('Transports Moreau et Fils a-t-elle des factures payées en retard');
		expect(deux.corps).toMatch(/je ne vous relancerai plus après ce message/i);
		expect(deux.corps).toContain('utm_campaign=transport');
	});

	it('dit la règle quand le registre ne donne pas un chiffre', () => {
		const { corps } = composerEmail({
			prospect: { entreprise: 'Z', cible: 'PME' },
			etape: 'PREMIER',
			signataire: { prenom: 'Jules', fondateur: true },
			loi: { ...LOI, taux: null, exemple: null }
		});
		expect(corps).toContain('au taux de la BCE majoré de dix points');
		expect(corps).not.toContain('null');
	});
});

describe('composerLinkedIn', () => {
	it('tient en 300 caractères, prénom et lien compris', () => {
		const message = composerLinkedIn({ prospect: TRANSPORTEUR, loi: LOI });
		expect(message.length).toBeLessThanOrEqual(300);
		expect(message).toMatch(/^Bonjour Claire,/);
		expect(message).toContain('à Paris');
	});
});

describe('adresseMailto', () => {
	it('encode l’objet et le corps, retours à la ligne compris', () => {
		const url = adresseMailto('claire@moreau.fr', {
			objet: 'Un é & un ?',
			corps: 'Ligne 1\nLigne 2'
		});
		expect(url).toBe(
			'mailto:claire@moreau.fr?subject=Un%20%C3%A9%20%26%20un%20%3F&body=Ligne%201%0D%0ALigne%202'
		);
	});
});

describe('jourDeRelance', () => {
	it('tombe à midi UTC, n jours plus tard, et saute le week-end', () => {
		// Jeudi 15 octobre 2026, 10 h à Paris.
		const jeudi = Date.UTC(2026, 9, 15, 8);
		expect(new Date(jourDeRelance(jeudi, 4)).toISOString()).toBe('2026-10-19T12:00:00.000Z');
		// Lundi 12 octobre + 5 = samedi 17 → lundi 19.
		expect(new Date(jourDeRelance(Date.UTC(2026, 9, 12, 8), 5)).toISOString()).toBe(
			'2026-10-19T12:00:00.000Z'
		);
	});
});

describe('valeursDeLaLoi', () => {
	it('lit l’indemnité, le taux du semestre et les délais au registre', () => {
		const loi = valeursDeLaLoi('2026-10-18');
		expect(loi.indemnite).toBe('40 €');
		expect(loi.taux).toMatch(/^12,40\s?%$/);
		expect(loi.delaiTransport).toBe(1);
		expect(loi.delaiGeneral).toBe(5);
		expect(loi.exemple).toMatch(/^6\s000\s€$/);
	});

	it('ne donne pas de taux pour un semestre que la série ne connaît pas', () => {
		const loi = valeursDeLaLoi('2031-03-01');
		expect(loi.taux).toBeNull();
		expect(loi.exemple).toBeNull();
	});
});
