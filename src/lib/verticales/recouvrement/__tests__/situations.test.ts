import { describe, it, expect } from 'vitest';
import { situationsDuDossier, type FaitsSituations } from '../situations';

function faits(surcharge: Partial<FaitsSituations> = {}): FaitsSituations {
	return {
		aujourdHui: '2026-09-25',
		sante: 'SAINE',
		montantReclameCentimes: 500_000n,
		dejaVerseCentimes: 0n,
		resteDuCentimes: 500_000n,
		oppositionLe: null,
		annonceOuverture: null,
		dateLimiteAgir: '2031-05-01',
		...surcharge
	};
}

describe('les situations d’un dossier', () => {
	it('n’en pose aucune sur un dossier ordinaire', () => {
		expect(situationsDuDossier(faits())).toEqual([]);
	});

	it('calcule la date limite de déclaration depuis la PARUTION de l’annonce, avec report', () => {
		// Parution le 17 juillet 2026 : + 2 mois = jeudi 17 septembre 2026, ouvrable.
		const [s] = situationsDuDossier(
			faits({
				sante: 'PROCEDURE_COLLECTIVE',
				annonceOuverture: {
					identifiantAnnonce: 'A-1',
					dateParution: '2026-07-17',
					dateJugement: '2026-07-02',
					nature: 'Jugement d’ouverture de redressement judiciaire',
					url: 'https://www.bodacc.fr/annonce/A-1',
					complement: 'Mandataire judiciaire : SELARL Exemple.'
				}
			})
		);
		expect(s!.cle).toBe('PROCEDURE_COLLECTIVE');
		expect(s!.dateLimite!.date).toBe('2026-09-17');
		expect(s!.citation!.texte).toBe('Mandataire judiciaire : SELARL Exemple.');
	});

	it('n’invente pas de date tant que l’annonce d’ouverture n’est pas relevée', () => {
		const [s] = situationsDuDossier(faits({ sante: 'PROCEDURE_COLLECTIVE' }));
		expect(s!.dateLimite).toBeNull();
	});

	it('dit qu’un avocat est obligatoire au-delà du seuil, et le dit seulement là', () => {
		const [grand] = situationsDuDossier(
			faits({ oppositionLe: '2026-09-01', montantReclameCentimes: 1_500_000n })
		);
		expect(grand!.ceQuiSePasse.join(' ')).toMatch(/un avocat doit représenter/);
		const [petit] = situationsDuDossier(faits({ oppositionLe: '2026-09-01' }));
		expect(petit!.options).toContain('Aller vous-même à l’audience');
		// 1er septembre 2026 + 15 jours = mercredi 16 septembre.
		expect(petit!.dateLimite!.date).toBe('2026-09-16');
		expect(petit!.dateLimite!.departNonPrecise).not.toBeNull();
	});

	it('ne recommande aucune option', () => {
		const toutes = situationsDuDossier(
			faits({ oppositionLe: '2026-09-01', sante: 'RADIEE', dejaVerseCentimes: 100_000n })
		);
		for (const s of toutes) {
			expect([...s.ceQuiSePasse, ...s.options].join(' ')).not.toMatch(
				/recommand|vous devriez|conseill/i
			);
		}
	});
});
