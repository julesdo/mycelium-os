import { describe, it, expect } from 'vitest';
import { signatureSvixValide } from '../svix';
import { masquerDonneesSensibles } from '../masquage';
import {
	delaiVise,
	heuresOuvreesEntre,
	phraseDeReponseAttendue,
	reponseAttendue,
	estOuvert
} from '../horaires';
import { DELIMITEUR, retirerCitation } from '../citation';

/** Signe comme Svix : HMAC-SHA256 de `id.timestamp.corps`, clé = base64 du secret sans `whsec_`. */
async function signer(secret: string, id: string, timestamp: string, corps: string): Promise<string> {
	const cle = await crypto.subtle.importKey(
		'raw',
		Uint8Array.from(atob(secret.replace(/^whsec_/, '')), (c) => c.charCodeAt(0)),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const sig = await crypto.subtle.sign('HMAC', cle, new TextEncoder().encode(`${id}.${timestamp}.${corps}`));
	return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

describe('signatureSvixValide', () => {
	const secret = 'whsec_' + btoa('une-cle-de-trente-deux-octets-!!');
	const maintenant = Date.UTC(2026, 9, 16, 12);
	const ts = String(Math.floor(maintenant / 1000));
	const corps = '{"type":"email.received","data":{"email_id":"e1"}}';

	it('accepte une signature juste, parmi plusieurs', async () => {
		const sig = await signer(secret, 'msg_1', ts, corps);
		expect(
			await signatureSvixValide({ secret, id: 'msg_1', timestamp: ts, signatures: `v1,faux v1,${sig}`, corps, maintenant })
		).toBe(true);
	});

	it('refuse un corps altéré, un horodatage trop vieux, des en-têtes absents', async () => {
		const sig = await signer(secret, 'msg_1', ts, corps);
		expect(
			await signatureSvixValide({ secret, id: 'msg_1', timestamp: ts, signatures: `v1,${sig}`, corps: corps + ' ', maintenant })
		).toBe(false);
		expect(
			await signatureSvixValide({ secret, id: 'msg_1', timestamp: ts, signatures: `v1,${sig}`, corps, maintenant: maintenant + 6 * 60_000 })
		).toBe(false);
		expect(await signatureSvixValide({ secret, id: null, timestamp: ts, signatures: `v1,${sig}`, corps, maintenant })).toBe(false);
	});
});

describe('masquerDonneesSensibles', () => {
	it('masque un IBAN valide, une carte qui passe Luhn et les clés connues', () => {
		const r = masquerDonneesSensibles(
			'Mon IBAN FR76 3000 6000 0112 3456 7890 189, ma carte 4111 1111 1111 1111, la clé sk_live_abcdefghijklmnop et pdl_live_apikey_0123456789abcdef.'
		);
		expect(r.texte).not.toContain('3000 6000');
		expect(r.texte).not.toContain('4111');
		expect(r.texte).not.toContain('sk_live_');
		expect(r.texte).not.toContain('pdl_live_');
		expect(r.masques).toEqual(
			expect.arrayContaining([
				{ genre: 'IBAN', nombre: 1 },
				{ genre: 'CARTE', nombre: 1 },
				{ genre: 'CLE', nombre: 2 }
			])
		);
	});

	it('laisse un numéro de facture, un SIREN et un montant', () => {
		const texte = 'La facture FA-2026-0012 du client 443061841 pour 1 250,00 € n’est pas partie.';
		expect(masquerDonneesSensibles(texte)).toEqual({ texte, masques: [] });
	});

	it('laisse un SIRET, qui passe pourtant Luhn (le SIREN est construit sur la même clé)', () => {
		const texte = 'Mon client 732 829 320 00074 et le siège 73282932000074.';
		expect(masquerDonneesSensibles(texte)).toEqual({ texte, masques: [] });
	});

	it('ne masque qu’une carte de 15 ou 16 chiffres au préfixe d’un émetteur', () => {
		expect(masquerDonneesSensibles('Amex 3782 822463 10005').masques).toEqual([{ genre: 'CARTE', nombre: 1 }]);
		const texte = 'Référence 9000 0000 0000 0001';
		expect(masquerDonneesSensibles(texte)).toEqual({ texte, masques: [] });
	});
});

describe('horaires du support', () => {
	// Jeudi 15/10/2026, 14 h 30 à Paris (UTC+2).
	const jeudi1430 = Date.UTC(2026, 9, 15, 12, 30);
	// Vendredi 16/10/2026, 17 h 30 à Paris.
	const vendredi1730 = Date.UTC(2026, 9, 16, 15, 30);

	it('est ouvert en semaine de 9 h à 18 h, à Paris', () => {
		expect(estOuvert(jeudi1430)).toBe(true);
		expect(estOuvert(Date.UTC(2026, 9, 17, 10))).toBe(false); // samedi
		expect(estOuvert(Date.UTC(2026, 9, 15, 17))).toBe(false); // jeudi 19 h
	});

	it('promet quatre heures ouvrées, arrondies à l’heure pleine suivante', () => {
		// Jeudi 14 h 30 + 4 h ouvrées = 18 h 30 → déborde : vendredi 9 h 30 → 10 h.
		const promis = reponseAttendue(jeudi1430);
		expect(phraseDeReponseAttendue(promis, jeudi1430)).toBe('demain avant 10 h');
	});

	it('saute le week-end', () => {
		// Vendredi 17 h 30 : 30 min vendredi, 3 h 30 lundi → lundi 12 h 30 → 13 h.
		const promis = reponseAttendue(vendredi1730);
		expect(phraseDeReponseAttendue(promis, vendredi1730)).toBe('lundi avant 13 h');
	});

	it('saute un jour férié (le 11 novembre 2026 est un mercredi)', () => {
		const mardi17h = Date.UTC(2026, 10, 10, 16); // mardi 10/11, 17 h Paris (UTC+1)
		const promis = reponseAttendue(mardi17h);
		// 1 h mardi, puis le mercredi férié est sauté : jeudi 9 h + 3 h = 12 h.
		expect(phraseDeReponseAttendue(promis, mardi17h)).toBe('jeudi avant 12 h');
	});

	it('repart du retour de l’équipe quand elle est absente', () => {
		const retour = Date.UTC(2026, 9, 21, 7); // mercredi 21/10, 9 h Paris
		const promis = reponseAttendue(jeudi1430, retour);
		expect(phraseDeReponseAttendue(promis, jeudi1430)).toBe('le 21 octobre avant 13 h');
	});

	it('compte les heures ouvrées entre deux instants', () => {
		expect(heuresOuvreesEntre(jeudi1430, Date.UTC(2026, 9, 16, 8))).toBeCloseTo(4.5, 5);
	});
});

describe('retirerCitation', () => {
	it('coupe au délimiteur', () => {
		const r = retirerCitation(`Merci, c’est réglé.\n\n${DELIMITEUR}\nCamille vous a répondu…`);
		expect(r).toEqual({ visible: 'Merci, c’est réglé.', coupe: true });
	});

	it('coupe à l’en-tête de réponse français et aux lignes citées', () => {
		const r = retirerCitation(
			'Toujours rien.\n\nLe jeu. 15 oct. 2026 à 14:02, Letikette <bonjour@letikette.com> a écrit :\n> Bonjour'
		);
		expect(r).toEqual({ visible: 'Toujours rien.', coupe: true });
		expect(retirerCitation('Bonjour\nEnvoyé de mon iPhone').visible).toBe('Bonjour');
	});

	it('rend le message entier quand il ne reste rien', () => {
		expect(retirerCitation('> tout est cité')).toEqual({ visible: '> tout est cité', coupe: false });
	});
});

describe('le délai que l’équipe se donne', () => {
	it('suit la médiane mesurée quand elle est plus longue et établie sur vingt réponses', () => {
		expect(delaiVise(null)).toBe(4);
		expect(delaiVise({ premiereReponseH: 6.2, reponses: 12 })).toBe(4);
		expect(delaiVise({ premiereReponseH: 6.2, reponses: 25 })).toBe(7);
		expect(delaiVise({ premiereReponseH: 1.5, reponses: 25 })).toBe(4);
	});

	it('se compte en heures ouvrées depuis le passage', () => {
		// Jeudi 14 h 30 à Paris, sept heures ouvrées : vendredi 12 h 30, arrondi à 13 h.
		expect(reponseAttendue(Date.UTC(2026, 9, 15, 12, 30), undefined, 7)).toBe(Date.UTC(2026, 9, 16, 11, 0));
	});
});
