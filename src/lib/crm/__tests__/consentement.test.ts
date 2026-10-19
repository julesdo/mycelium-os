import { describe, expect, it } from 'vitest';
import {
	ANNEES_DE_CONSERVATION,
	UN_MOIS_MS,
	aInformer,
	adresseGenerique,
	emailPermis,
	lienDeDesinscription,
	piedLegal,
	sourceDeLAdresse
} from '../consentement';

const MAINTENANT = Date.UTC(2026, 9, 19, 9);
const RECENT = MAINTENANT - 3 * 24 * 60 * 60 * 1000;
const ANCIEN = MAINTENANT - UN_MOIS_MS - 1;

describe('une adresse générique', () => {
	it('se reconnaît à sa partie locale, quelle qu’en soit la graphie', () => {
		expect(adresseGenerique('contact@transports-moreau.fr')).toBe(true);
		expect(adresseGenerique('Info@exemple.fr')).toBe(true);
		expect(adresseGenerique('contact.paris@exemple.fr')).toBe(true);
		expect(adresseGenerique('compta-fournisseurs@exemple.fr')).toBe(true);
	});

	it('n’est jamais une adresse nominative', () => {
		expect(adresseGenerique('claire.moreau@transports-moreau.fr')).toBe(false);
		expect(adresseGenerique('cmoreau@exemple.fr')).toBe(false);
		// « contacteur » commence comme « contact », mais n'en est pas un.
		expect(adresseGenerique('contacteur@exemple.fr')).toBe(false);
	});
});

describe('l’e-mail permis', () => {
	it('toujours à une adresse générique', () => {
		expect(
			emailPermis({ statut: 'A_CONTACTER', email: 'contact@x.fr', creeLe: ANCIEN }, MAINTENANT)
		).toEqual({ permis: true, base: 'GENERIQUE' });
	});

	it('à une adresse nominative si la personne a été informée', () => {
		expect(
			emailPermis(
				{ statut: 'CONTACTE', email: 'claire@x.fr', emailBase: 'INFORMEE', creeLe: ANCIEN },
				MAINTENANT
			)
		).toEqual({ permis: true, base: 'INFORMEE' });
	});

	it('au premier contact dans le mois de la collecte : c’est l’e-mail qui informe', () => {
		expect(
			emailPermis({ statut: 'A_CONTACTER', email: 'claire@x.fr', creeLe: RECENT }, MAINTENANT)
		).toEqual({ permis: true, base: 'PREMIER_CONTACT' });
	});

	it('refusé passé un mois sans information, sans adresse, ou après un « Stop »', () => {
		expect(
			emailPermis({ statut: 'A_CONTACTER', email: 'claire@x.fr', creeLe: ANCIEN }, MAINTENANT)
		).toEqual({ permis: false, raison: 'PLUS_D_UN_MOIS' });
		expect(emailPermis({ statut: 'A_CONTACTER', creeLe: RECENT }, MAINTENANT)).toEqual({
			permis: false,
			raison: 'SANS_ADRESSE'
		});
		expect(
			emailPermis({ statut: 'STOP', email: 'contact@x.fr', creeLe: RECENT }, MAINTENANT)
		).toEqual({ permis: false, raison: 'STOP' });
	});

	it('« à informer » dit la même chose que le refus', () => {
		expect(
			aInformer({ statut: 'A_CONTACTER', email: 'claire@x.fr', creeLe: ANCIEN }, MAINTENANT)
		).toBe(true);
		expect(
			aInformer({ statut: 'A_CONTACTER', email: 'contact@x.fr', creeLe: ANCIEN }, MAINTENANT)
		).toBe(false);
		expect(aInformer({ statut: 'PERDU', email: 'claire@x.fr', creeLe: ANCIEN }, MAINTENANT)).toBe(
			false
		);
	});
});

describe('le pied légal', () => {
	it('nomme la vraie source de l’adresse, la durée et le lien de désinscription', () => {
		const pied = piedLegal({
			source: 'par « votre site »',
			lienDesinscription: lienDeDesinscription('abc-123')
		});
		expect(pied).toContain('J’ai trouvé votre adresse par « votre site »');
		expect(pied).toContain('intérêt légitime');
		expect(pied).toContain(
			`${ANNEES_DE_CONSERVATION === 3 ? 'trois' : ANNEES_DE_CONSERVATION} ans`
		);
		expect(pied).toContain('https://www.letikette.com/desinscription/abc-123');
		expect(pied).toContain('www.letikette.com/politique-de-confidentialite');
		expect(pied).not.toContain('—');
	});

	it('n’attribue jamais une adresse à l’annuaire ou à la commande publique, qui n’en publient pas', () => {
		expect(sourceDeLAdresse('Annuaire des entreprises (data.gouv.fr), le 18/10/2026')).toBeNull();
		expect(sourceDeLAdresse('DECP 2024, CHU de Nantes')).toBeNull();
		expect(sourceDeLAdresse(undefined)).toBeNull();
		expect(sourceDeLAdresse('Site web de l’entreprise')).toBe('par « Site web de l’entreprise »');
		const pied = piedLegal({ source: null, lienDesinscription: null });
		expect(pied).toContain('[où vous avez trouvé son adresse');
		expect(pied).not.toMatch(/annuaire/i);
	});

	it('se replie sur « stop » sans lien de désinscription', () => {
		expect(piedLegal({ source: 'par « votre site »', lienDesinscription: null })).toContain(
			'répondez « stop »'
		);
	});
});
