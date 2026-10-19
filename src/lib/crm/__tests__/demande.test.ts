import { describe, it, expect } from 'vitest';
import { lireDemande, OFFRES_DEMANDABLES, PARCOURS_DE_L_OFFRE } from '../demande';

/**
 * UNE OFFRE DEMANDÉE SUR LE SITE (19/10/2026, audit, lot 6) : le diagnostic complet, la
 * réclamation clé en main, le pilote, l'offre fondateurs. Le formulaire crée le prospect
 * au CRM, avec son parcours et sa source ; rien ne se vend en ligne.
 */
describe('la demande d’une offre', () => {
	const base = {
		offre: 'reclamation',
		nom: '  Karim Benali ',
		entreprise: 'Nettoyage du Val',
		email: ' Karim@Nettoyage-du-Val.fr ',
		telephone: '01 45 00 00 00',
		message: 'Nous travaillons pour trois hôpitaux.',
		piege: ''
	};

	it('nettoie et garde ce qui sert, avec le parcours de l’offre', () => {
		const lue = lireDemande(base);
		expect(lue).toEqual({
			ok: true,
			demande: {
				offre: 'reclamation',
				nom: 'Karim Benali',
				entreprise: 'Nettoyage du Val',
				email: 'karim@nettoyage-du-val.fr',
				telephone: '01 45 00 00 00',
				message: 'Nous travaillons pour trois hôpitaux.'
			}
		});
		expect(PARCOURS_DE_L_OFFRE.reclamation).toBe('FOURNISSEUR_PUBLIC');
		expect(PARCOURS_DE_L_OFFRE.pilote).toBe('PILOTE');
	});

	it('refuse une adresse sans forme, une entreprise vide ou une offre inconnue', () => {
		expect(lireDemande({ ...base, email: 'pas-une-adresse' }).ok).toBe(false);
		expect(lireDemande({ ...base, entreprise: ' ' }).ok).toBe(false);
		expect(lireDemande({ ...base, offre: 'mandat' }).ok).toBe(false);
	});

	it('reconnaît un robot au champ piège, sans le lui dire', () => {
		expect(lireDemande({ ...base, piege: 'http://spam' })).toEqual({ ok: false, robot: true });
	});

	it('borne la longueur de ce qui est gardé', () => {
		const lue = lireDemande({ ...base, message: 'x'.repeat(5000) });
		expect(lue.ok && lue.demande.message?.length).toBe(2000);
	});

	it('a une offre demandable pour chaque offre du catalogue vendue sur demande', () => {
		expect([...OFFRES_DEMANDABLES].sort()).toEqual(
			['diagnosticComplet', 'fondateurs', 'pilote', 'reclamation'].sort()
		);
	});
});
