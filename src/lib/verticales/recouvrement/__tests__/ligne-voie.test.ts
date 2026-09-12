import { describe, it, expect } from 'vitest';
import { MACHINES, etapesDeLaVoie, parcoursDeLaVoie } from '../apres-procedure';

describe('la ligne principale de chaque machine', () => {
	it('commence toujours par l’état d’entrée', () => {
		for (const [cle, machine] of Object.entries(MACHINES)) {
			expect(machine.ligne[0], `machine « ${cle} »`).toBe(machine.entree);
		}
	});

	it('ne nomme que des états qui existent', () => {
		for (const [cle, machine] of Object.entries(MACHINES)) {
			for (const etat of machine.ligne) {
				expect(machine.etats[etat], `« ${etat} » dans « ${cle} »`).toBeDefined();
			}
		}
	});

	/**
	 * La barrière qui compte. Un état atteignable qui ne serait ni sur la ligne
	 * ni rattaché à une étape de la ligne disparaîtrait du rail sans que rien ne
	 * casse : le gérant verrait une voie amputée d'une issue possible.
	 */
	it('rattache tout état hors ligne à une étape de la ligne', () => {
		for (const [cle, machine] of Object.entries(MACHINES)) {
			const surLaLigne = new Set(machine.ligne);
			const rattaches = new Set(
				etapesDeLaVoie(cle).flatMap((etape) => etape.branches.map((b) => b.etat))
			);
			for (const nom of Object.keys(machine.etats)) {
				if (surLaLigne.has(nom)) continue;
				expect(rattaches.has(nom), `« ${nom} » de « ${cle} » n’est sur aucun rail`).toBe(true);
			}
		}
	});

	it('décrit l’injonction de payer en quatre étapes et deux branches', () => {
		const etapes = etapesDeLaVoie('injonction-de-payer');
		expect(etapes.map((e) => e.etat)).toEqual([
			'REQUETE_DEPOSEE',
			'ORDONNANCE_RENDUE',
			'ORDONNANCE_SIGNIFIEE',
			'TITRE_EXECUTOIRE'
		]);
		expect(etapes[0]!.branches.map((b) => b.etat)).toEqual(['REQUETE_REJETEE']);
		expect(etapes[2]!.branches.map((b) => b.etat)).toEqual(['OPPOSITION']);
	});

	it('lève sur une procédure sans machine plutôt que de rendre une voie vide', () => {
		expect(() => etapesDeLaVoie('relance-amiable')).toThrow(/relance-amiable/);
	});
});

describe('le parcours daté de la voie', () => {
	it('marque l’entrée courante et date le reste à venir quand rien n’a bougé', () => {
		const etapes = parcoursDeLaVoie('injonction-de-payer', [], '2026-06-04');
		expect(etapes.map((e) => e.statut)).toEqual(['COURANTE', 'A_VENIR', 'A_VENIR', 'A_VENIR']);
		expect(etapes[0]!.atteinteLe).toBe('2026-06-04');
		expect(etapes[1]!.atteinteLe).toBeNull();
	});

	it('date chaque étape franchie par l’événement qui l’a atteinte', () => {
		const etapes = parcoursDeLaVoie(
			'injonction-de-payer',
			[{ cle: 'ordonnance-rendue', survenuLe: '2026-08-28' }],
			'2026-06-04'
		);
		expect(etapes.map((e) => e.statut)).toEqual(['FRANCHIE', 'COURANTE', 'A_VENIR', 'A_VENIR']);
		expect(etapes[0]!.atteinteLe).toBe('2026-06-04');
		expect(etapes[1]!.atteinteLe).toBe('2026-08-28');
	});

	/**
	 * Une sortie par une branche laisse la ligne inachevée, et le rail doit le
	 * montrer tel quel : les étapes suivantes ne sont pas « à venir », elles ne
	 * viendront plus. Les marquer `A_VENIR` ferait croire à un dossier qui avance.
	 */
	it('marque la branche prise et laisse la suite de la ligne hors d’atteinte', () => {
		const etapes = parcoursDeLaVoie(
			'injonction-de-payer',
			[
				{ cle: 'ordonnance-rendue', survenuLe: '2026-08-28' },
				{ cle: 'ordonnance-signifiee', survenuLe: '2026-09-02' },
				{ cle: 'opposition-formee', survenuLe: '2026-09-20' }
			],
			'2026-06-04'
		);
		expect(etapes.map((e) => e.statut)).toEqual([
			'FRANCHIE',
			'FRANCHIE',
			'FRANCHIE',
			'HORS_ATTEINTE'
		]);
		expect(etapes[2]!.brancheSuivie).toEqual({
			etat: 'OPPOSITION',
			survenuLe: '2026-09-20'
		});
	});
});
