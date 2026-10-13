import { describe, expect, it } from 'vitest';
import { dansCombien, enDirect, FENETRE_DU_DEPART_MS, type RelanceProgrammee } from '../en-direct';

const MAINTENANT = Date.UTC(2026, 9, 14, 12, 0);
const heure = (t: number) => {
	const d = new Date(t);
	return `${d.getUTCHours()} h ${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

function relance(minutes: number, client = 'Fournitures Durand'): RelanceProgrammee {
	return {
		envoiId: `e-${client}-${minutes}`,
		client,
		clientId: `c-${client}`,
		etape: 'Rappel',
		partiraLe: MAINTENANT + minutes * 60_000
	};
}

describe('Plume en direct', () => {
	it('ne montre rien quand rien ne se passe', () => {
		expect(enDirect({ maintenant: MAINTENANT, travail: null, programmees: [], heure })).toBeNull();
	});

	it('montre une relance une heure avant son départ, pas avant', () => {
		expect(
			enDirect({ maintenant: MAINTENANT, travail: null, programmees: [relance(61)], heure })
		).toBeNull();
		const capsule = enDirect({
			maintenant: MAINTENANT,
			travail: null,
			programmees: [relance(23)],
			heure
		});
		expect(capsule).toMatchObject({
			genre: 'DEPART',
			titre: 'Relance dans 23 min',
			ligne: 'Fournitures Durand · rappel à 12 h 23',
			plusieurs: false,
			clientId: 'c-Fournitures Durand'
		});
		expect(capsule?.part).toBeCloseTo((23 * 60_000) / FENETRE_DU_DEPART_MS);
	});

	it('montre la première relance et compte les suivantes', () => {
		const capsule = enDirect({
			maintenant: MAINTENANT,
			travail: null,
			programmees: [relance(40, 'Vidal'), relance(10), relance(55, 'Martin')],
			heure
		});
		expect(capsule).toMatchObject({
			titre: '3 relances d’ici 12 h 55',
			ligne: 'Fournitures Durand la première, dans 10 min',
			plusieurs: true
		});
	});

	it('garde une relance un instant après son heure, le temps qu’elle parte', () => {
		const capsule = enDirect({
			maintenant: MAINTENANT,
			travail: null,
			programmees: [relance(-2)],
			heure
		});
		expect(capsule).toMatchObject({ titre: 'Relance dans un instant', part: 0 });
		expect(
			enDirect({ maintenant: MAINTENANT, travail: null, programmees: [relance(-10)], heure })
		).toBeNull();
	});

	it('montre le travail en cours avant tout départ', () => {
		const capsule = enDirect({
			maintenant: MAINTENANT,
			travail: { titre: 'Prépare vos relances', etape: 'Écrit à Vidal', faites: 1, total: 4 },
			programmees: [relance(5)],
			heure
		});
		expect(capsule).toEqual({
			genre: 'TRAVAIL',
			titre: 'Prépare vos relances',
			ligne: 'Écrit à Vidal · 2 sur 4',
			part: 0.25
		});
	});

	it('dit le temps qui reste comme on le dit', () => {
		expect(dansCombien(30_000)).toBe('dans un instant');
		expect(dansCombien(23 * 60_000)).toBe('dans 23 min');
		expect(dansCombien(60 * 60_000)).toBe('dans 1 h');
	});
});
