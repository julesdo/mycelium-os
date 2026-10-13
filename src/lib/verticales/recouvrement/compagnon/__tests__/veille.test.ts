import { describe, expect, it } from 'vitest';
import { engagementsDePlume, etatDeLaVeille } from '../veille';
import { HEURES_D_ENVOI } from '../../plan-relance';
import { JOURS_DE_GRACE } from '../../parole';

const CALME = {
	travail: null,
	enAttente: 0,
	dossiersSuivis: 12,
	relancesAutomatiques: true,
	prochaine: 'demain à 9 h'
};

describe('La maison de Plume', () => {
	it('dit d’abord qu’il travaille, puis ce qui attend, puis que tout est en ordre', () => {
		expect(
			etatDeLaVeille({ ...CALME, travail: 'Prépare vos relances', enAttente: 2 })
		).toMatchObject({ titre: 'Je travaille', humeur: 'travaille' });
		expect(etatDeLaVeille({ ...CALME, enAttente: 1 })).toEqual({
			titre: '1 chose attend votre feu vert',
			ligne: 'Je l’ai préparée ; rien ne part sans vous.',
			humeur: 'attention'
		});
		expect(etatDeLaVeille({ ...CALME, enAttente: 3 }).titre).toBe(
			'3 choses attendent votre feu vert'
		);
		expect(etatDeLaVeille(CALME)).toEqual({
			titre: 'Tout est en ordre',
			ligne: 'Prochaine relance demain à 9 h.',
			humeur: 'content'
		});
	});

	it('dit quand les relances ne partent pas seules', () => {
		expect(etatDeLaVeille({ ...CALME, relancesAutomatiques: false }).ligne).toBe(
			'Les relances automatiques sont coupées : je prépare, vous envoyez.'
		);
	});

	it('invite à déposer quand il n’a encore rien à suivre', () => {
		expect(etatDeLaVeille({ ...CALME, dossiersSuivis: 0 }).titre).toBe(
			'Je veille sur vos factures'
		);
	});

	it('promet ce que le code fait : les heures, le délai, la grâce', () => {
		const actives = engagementsDePlume(true).map((e) => e.texte);
		expect(actives[0]).toContain(`de ${HEURES_D_ENVOI.de} h à ${HEURES_D_ENVOI.a} h`);
		expect(actives[1]).toContain('une heure avant de partir');
		expect(actives.join(' ')).toContain(`${JOURS_DE_GRACE} jours de plus`);
		expect(actives.join(' ')).toContain('Rien ne part vers un tribunal');
	});

	it('ne promet pas d’heures d’envoi quand rien ne part seul', () => {
		const coupees = engagementsDePlume(false);
		expect(coupees.map((e) => e.icone)).not.toContain('HEURES');
		expect(coupees[0]?.icone).toBe('COUPEES');
	});

	it('n’écrit ni « garantie » ni tiret long', () => {
		const tout = [...engagementsDePlume(true), ...engagementsDePlume(false)]
			.map((e) => e.texte)
			.join(' ');
		expect(tout).not.toMatch(/garanti/i);
		expect(tout).not.toContain('—');
	});
});
