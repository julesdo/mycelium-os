import { describe, it, expect } from 'vitest';
import {
	adresseLue,
	classerEntrant,
	dmarcPasse,
	estReponseAutomatique,
	toutEchoue,
	type EntreeDuTri
} from '../tri-entrant';
import { htmlEnTexte } from '../citation';

describe('adresseLue', () => {
	it('ne lit que bonjour@ et fil-<jeton>@ du domaine de réception (et du domaine parent)', () => {
		expect(adresseLue(['bonjour@aide.letikette.com'], 'aide.letikette.com')).toEqual({ genre: 'BONJOUR' });
		expect(adresseLue(['Bonjour@Letikette.com'], 'aide.letikette.com')).toEqual({ genre: 'BONJOUR' });
		expect(adresseLue(['fil-ab12cd34ef@aide.letikette.com'], 'aide.letikette.com')).toEqual({
			genre: 'FIL',
			jeton: 'ab12cd34ef'
		});
		expect(adresseLue(['facturation@aide.letikette.com'], 'aide.letikette.com')).toBeNull();
		expect(adresseLue(['bonjour@ailleurs.fr'], 'aide.letikette.com')).toBeNull();
	});
});

describe('l’authentification', () => {
	it('ne prouve l’expéditeur que sur un DMARC « pass », sous toutes ses formes', () => {
		expect(dmarcPasse({ dmarc: 'pass' })).toBe(true);
		expect(dmarcPasse({ dmarc: { result: 'PASS' } })).toBe(true);
		expect(dmarcPasse({ dmarc: 'fail' })).toBe(false);
		expect(dmarcPasse({})).toBe(false);
		expect(dmarcPasse(undefined)).toBe(false);
		expect(dmarcPasse({ dmarc: 42 })).toBe(false);
	});

	it('reconnaît un message dont tout échoue', () => {
		expect(toutEchoue({ spf: 'fail', dkim: 'fail', dmarc: 'fail' })).toBe(true);
		expect(toutEchoue({ spf: 'fail', dkim: 'pass', dmarc: 'fail' })).toBe(false);
		expect(toutEchoue(undefined)).toBe(false);
	});

	it('reconnaît une réponse automatique', () => {
		expect(estReponseAutomatique({ 'auto-submitted': 'auto-replied' })).toBe(true);
		expect(estReponseAutomatique({ 'x-autoreply': 'yes' })).toBe(true);
		expect(estReponseAutomatique({ precedence: 'bulk' })).toBe(true);
		expect(estReponseAutomatique({ 'auto-submitted': 'no' })).toBe(false);
		expect(estReponseAutomatique({})).toBe(false);
	});
});

describe('classerEntrant', () => {
	const base: EntreeDuTri = {
		adresse: { genre: 'BONJOUR' },
		automatique: false,
		dmarc: true,
		toutEchoue: false,
		expediteur: 'TITULAIRE_VERIFIE',
		conversationDuJeton: false,
		jetonDeLAuteur: false
	};

	it('ignore une adresse qu’on ne lit pas et les réponses automatiques', () => {
		expect(classerEntrant({ ...base, adresse: null })).toBe('IGNORE');
		expect(classerEntrant({ ...base, automatique: true })).toBe('IGNORE');
	});

	it('met de côté un message dont tout échoue', () => {
		expect(classerEntrant({ ...base, toutEchoue: true })).toBe('INDESIRABLE');
	});

	it('fait entrer dans le fil la réponse prouvée de son auteur, et seulement elle', () => {
		const fil: EntreeDuTri = { ...base, adresse: { genre: 'FIL', jeton: 'x' }, conversationDuJeton: true, jetonDeLAuteur: true };
		expect(classerEntrant(fil)).toBe('FIL_VERIFIE');
		expect(classerEntrant({ ...fil, dmarc: false })).toBe('FIL_NON_VERIFIE');
		expect(classerEntrant({ ...fil, jetonDeLAuteur: false })).toBe('FIL_NON_VERIFIE');
		expect(classerEntrant({ ...fil, conversationDuJeton: false })).toBe('A_TRIER');
	});

	it('ouvre une conversation pour un titulaire, vérifiée ou non', () => {
		expect(classerEntrant(base)).toBe('NOUVELLE_VERIFIEE');
		expect(classerEntrant({ ...base, dmarc: false })).toBe('NOUVELLE_NON_VERIFIEE');
		expect(classerEntrant({ ...base, expediteur: 'TITULAIRE_NON_VERIFIE' })).toBe('NOUVELLE_NON_VERIFIEE');
	});

	it('range un prospect sur sa fiche, et un inconnu à trier', () => {
		expect(classerEntrant({ ...base, expediteur: 'PROSPECT' })).toBe('PROSPECT');
		expect(classerEntrant({ ...base, expediteur: 'INCONNU' })).toBe('A_TRIER');
	});
});

describe('htmlEnTexte', () => {
	it('rend le texte d’un e-mail HTML, sans balises ni scripts, entités décodées', () => {
		const html =
			'<html><head><style>p{color:red}</style></head><body><p>Bonjour&nbsp;l’équipe,</p><p>Ma relance <b>n’est pas</b> partie &amp; voilà.<br>Merci</p><script>alert(1)</script></body></html>';
		const texte = htmlEnTexte(html);
		expect(texte).toBe('Bonjour l’équipe,\n\nMa relance n’est pas partie & voilà.\nMerci');
	});
});
