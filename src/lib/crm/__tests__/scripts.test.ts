import { describe, expect, it } from 'vitest';
import { PARCOURS } from '../parcours';
import { scriptDuParcours, type ContexteDAppel } from '../scripts';
import { sourceDuContact } from '../source';
import { estAAppeler } from '../appels';
import { valeursDeLaLoi, valeursPubliques } from '../valeurs-loi';

const JOUR = '2026-10-19';

function contexte(source: string | null): ContexteDAppel {
	return {
		appelant: 'Jules',
		entreprise: 'Durand Transports',
		source,
		loi: valeursDeLaLoi(JOUR),
		publiques: valeursPubliques(JOUR)
	};
}

function toutLeTexte(parcours: (typeof PARCOURS)[number], source: string | null): string {
	const s = scriptDuParcours(parcours, contexte(source));
	return [
		s.ouverture,
		...s.questions,
		s.phrase,
		s.demande,
		...s.objections.flatMap((o) => [o.objection, o.reponse]),
		s.sortie
	].join('\n');
}

describe('la source d’un contact', () => {
	it('se dit en clair pour l’annuaire et la commande publique', () => {
		expect(sourceDuContact('Annuaire des entreprises (data.gouv.fr), le 18/10/2026')).toBe(
			'dans l’annuaire des entreprises de l’État'
		);
		expect(sourceDuContact('DECP 2024, CHU de Nantes')).toBe(
			'dans les données de la commande publique publiées par l’État'
		);
		expect(sourceDuContact('Salon Solutrans')).toBe('par « Salon Solutrans »');
	});

	it('n’est jamais inventée : absente, elle reste absente', () => {
		expect(sourceDuContact(undefined)).toBeNull();
		expect(sourceDuContact('  ')).toBeNull();
	});
});

describe('les scripts d’appel', () => {
	it('disent tous qui appelle, d’où vient le numéro, et qu’on peut refuser', () => {
		for (const p of PARCOURS) {
			const texte = toutLeTexte(p, 'dans l’annuaire des entreprises de l’État');
			expect(texte, p).toContain('Jules, de Letikette');
			expect(texte, p).toContain('dans l’annuaire des entreprises de l’État');
			expect(texte, p).toContain('je vous retire de ma liste');
		}
	});

	it('demandent la source à l’appelant quand la fiche ne la porte pas', () => {
		for (const p of PARCOURS) {
			expect(scriptDuParcours(p, contexte(null)).ouverture, p).toContain('[d’où vient ce numéro]');
		}
	});

	it('ne promettent rien, ne poussent vers aucune procédure, et n’ont pas de tiret long', () => {
		for (const p of PARCOURS) {
			const texte = toutLeTexte(p, 'par « Salon »');
			expect(texte, p).not.toMatch(/garanti/i);
			expect(texte, p).not.toMatch(/injonction|assign|tribunal|huissier/i);
			expect(texte, p).not.toContain('—');
		}
	});

	it('lisent les chiffres de la loi au registre', () => {
		const pub = valeursPubliques(JOUR);
		const texte = toutLeTexte('FOURNISSEUR_PUBLIC', 'par « Salon »');
		expect(texte).toContain(`${pub.delaiCollectivite} jours`);
		expect(texte).toContain(pub.dernierJour);
		expect(texte).toContain('peuvent se prescrire');
		expect(toutLeTexte('TRANSPORTEUR', 'par « Salon »')).toContain(valeursDeLaLoi(JOUR).indemnite!);
	});
});

describe('la file d’appels du jour', () => {
	const jour = { debut: 1_000, fin: 2_000 };
	it('prend un prospect ouvert, avec un téléphone, dû aujourd’hui', () => {
		expect(estAAppeler({ statut: 'A_CONTACTER', telephone: '01' }, jour)).toBe(true);
		expect(
			estAAppeler({ statut: 'CONTACTE', telephone: '01', prochaineActionLe: 1_500 }, jour)
		).toBe(true);
	});

	it('laisse ceux qu’on a déjà appelés aujourd’hui, ceux de demain, les clos et les sans numéro', () => {
		expect(estAAppeler({ statut: 'CONTACTE', telephone: '01', dernierAppelLe: 1_200 }, jour)).toBe(
			false
		);
		expect(
			estAAppeler({ statut: 'CONTACTE', telephone: '01', prochaineActionLe: 2_500 }, jour)
		).toBe(false);
		expect(estAAppeler({ statut: 'PERDU', telephone: '01' }, jour)).toBe(false);
		expect(estAAppeler({ statut: 'A_CONTACTER' }, jour)).toBe(false);
	});
});
