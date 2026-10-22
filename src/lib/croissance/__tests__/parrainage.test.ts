import { describe, expect, it } from 'vitest';
import {
	codeDeLAdresse,
	codeDepuisOctets,
	codeValide,
	etapeDeLInvitation,
	lienDInvitation,
	liensDePartage,
	messageDInvitation,
	moisDeLAnnee,
	peutRecevoirUneRecompense,
	remiseQuiCourt
} from '../parrainage';

/**
 * LA RECOMMANDATION (21/10/2026, le parcours de l'habitude, moment 7) : un lien personnel
 * court et non devinable, un mois offert pour les deux à la première échéance payée de
 * l'établissement recommandé, douze par an au plus pour qui recommande.
 */
const JOUR = 24 * 60 * 60 * 1000;
const MAINTENANT = Date.UTC(2026, 9, 22, 12);

describe('le code personnel', () => {
	it('se tire sur dix signes lisibles, sans 0, O, 1, I ni L', () => {
		const code = codeDepuisOctets(new Uint8Array([0, 7, 30, 31, 62, 93, 124, 155, 200, 255]));
		expect(code).toHaveLength(10);
		expect(codeValide(code)).toBe(true);
		expect(code).not.toMatch(/[01OIL]/);
	});

	it('se lit dans l’adresse de la visite, et rien d’autre', () => {
		expect(codeDeLAdresse('https://www.letikette.com/?parrain=k7m2p9qrst')).toBe('K7M2P9QRST');
		expect(codeDeLAdresse('https://www.letikette.com/?parrain=court')).toBeNull();
		expect(codeDeLAdresse('https://www.letikette.com/?parrain=K7M2P9QRS0')).toBeNull();
		expect(codeDeLAdresse('https://www.letikette.com/tarifs')).toBeNull();
		expect(codeDeLAdresse('pas une adresse')).toBeNull();
	});

	it('se lit aussi dans le chemin de l’invitation, celui que la page partage', () => {
		expect(codeDeLAdresse('https://www.letikette.com/invitation/k7m2p9qrst')).toBe('K7M2P9QRST');
		expect(codeDeLAdresse('https://www.letikette.com/invitation/K7M2P9QRST?utm=x')).toBe(
			'K7M2P9QRST'
		);
		expect(codeDeLAdresse('https://www.letikette.com/invitation/court')).toBeNull();
		expect(lienDInvitation('https://www.letikette.com', 'K7M2P9QRST')).toBe(
			'https://www.letikette.com/invitation/K7M2P9QRST'
		);
	});
});

describe('le partage', () => {
	const lien = 'https://www.letikette.com/invitation/K7M2P9QRST';

	it('porte le lien dans le message, et chaque canal le reçoit encodé', () => {
		const message = messageDInvitation(lien);
		expect(message).toContain(lien);
		expect(message).not.toMatch(/garanti/i);
		const liens = liensDePartage({ lien, message, sujet: 'Un mois de Letikette, de ma part' });
		expect(liens.whatsapp).toBe(`https://wa.me/?text=${encodeURIComponent(message)}`);
		expect(liens.sms).toBe(`sms:?&body=${encodeURIComponent(message)}`);
		expect(liens.email).toBe(
			`mailto:?subject=${encodeURIComponent('Un mois de Letikette, de ma part')}&body=${encodeURIComponent(message)}`
		);
		// LinkedIn ne prend qu'une adresse : le message s'écrit dans sa fenêtre.
		expect(liens.linkedin).toBe(
			`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(lien)}`
		);
	});
});

describe('une invitation', () => {
	it('dit où elle en est : inscrite, puis abonnée et le mois gagné', () => {
		const inscrite = Date.UTC(2026, 9, 12);
		expect(etapeDeLInvitation({ inscriteLe: inscrite, abonneeLe: null })).toEqual({
			etape: 'INSCRITE',
			titre: 'Inscrite',
			ligne: 'Pas encore abonnée'
		});
		expect(
			etapeDeLInvitation({ inscriteLe: inscrite, abonneeLe: Date.UTC(2026, 10, 12) })
		).toEqual({ etape: 'ABONNEE', titre: 'Abonnée', ligne: 'Un mois offert à chacun' });
	});
});

describe('la récompense', () => {
	it('se donne douze fois par an au plus à qui recommande', () => {
		const onze = Array.from({ length: 11 }, (_, i) => ({
			raison: 'PARRAIN' as const,
			gagneeLe: MAINTENANT - i * JOUR
		}));
		expect(peutRecevoirUneRecompense(onze, MAINTENANT)).toBe(true);
		const douze = [...onze, { raison: 'PARRAIN' as const, gagneeLe: MAINTENANT - 20 * JOUR }];
		expect(peutRecevoirUneRecompense(douze, MAINTENANT)).toBe(false);
		const anciennes = douze.map((r) => ({ ...r, gagneeLe: r.gagneeLe - 400 * JOUR }));
		expect(peutRecevoirUneRecompense(anciennes, MAINTENANT)).toBe(true);
		// Le mois reçu en étant recommandé ne compte pas.
		const filleul = [...onze, { raison: 'FILLEUL' as const, gagneeLe: MAINTENANT }];
		expect(peutRecevoirUneRecompense(filleul, MAINTENANT)).toBe(true);
	});

	it('compte les mois gagnés à recommander sur l’année glissante', () => {
		const recompenses = [
			{ raison: 'PARRAIN' as const, gagneeLe: MAINTENANT - 10 * JOUR },
			{ raison: 'PARRAIN' as const, gagneeLe: MAINTENANT - 200 * JOUR },
			{ raison: 'PARRAIN' as const, gagneeLe: MAINTENANT - 400 * JOUR },
			{ raison: 'FILLEUL' as const, gagneeLe: MAINTENANT - 5 * JOUR }
		];
		expect(moisDeLAnnee(recompenses, MAINTENANT)).toBe(2);
	});

	it('attend la fin d’une remise qui court encore à la prochaine échéance', () => {
		const prochaine = '2026-11-14T10:00:00Z';
		expect(remiseQuiCourt(null, prochaine)).toBe(false);
		expect(remiseQuiCourt({ ends_at: null }, prochaine)).toBe(true);
		expect(remiseQuiCourt({ ends_at: '2026-12-14T10:00:00Z' }, prochaine)).toBe(true);
		expect(remiseQuiCourt({ ends_at: '2026-10-14T10:00:00Z' }, prochaine)).toBe(false);
	});
});
