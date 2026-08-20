import { describe, it, expect } from 'vitest';
import { redigerCourrier } from '../courrier';

const BASE = {
	nomEtablissement: 'Restaurant du Parc',
	nomFournisseur: 'Grossiste Alpha',
	produits: ['CAROTTE RONDELLE BIO', 'LENTILLE VERTE BIO'],
	montantEnJeuHT: 12480,
	periodeDebut: '2026-01-01',
	periodeFin: '2026-12-31'
};

describe('le courrier de demande d’attestation', () => {
	it('ne promet ni ne garantit rien', () => {
		const texte = redigerCourrier(BASE).toLowerCase();
		expect(texte).not.toMatch(/garanti/);
		expect(texte).not.toMatch(/(ser[ao][a-z]*|rendr[a-z]+)\s+conforme/);
	});

	it('ne menace pas et n’invoque aucune sanction', () => {
		// Un courrier qui menace obtient une pièce et détruit une relation
		// fournisseur. La cantine a besoin des deux.
		const texte = redigerCourrier(BASE).toLowerCase();
		for (const mot of ['sanction', 'amende', 'mise en demeure', 'contentieux', 'sous peine']) {
			expect(texte).not.toContain(mot);
		}
	});

	it('ne laisse pas croire que la cantine agit pour l’administration', () => {
		const texte = redigerCourrier(BASE).toLowerCase();
		expect(texte).not.toMatch(/au nom de l['’]administration|mandat[ée] par/);
	});

	it('dit ce qu’il demande, précisément', () => {
		const texte = redigerCourrier(BASE);
		expect(texte).toMatch(/organisme certificateur/);
		expect(texte).toMatch(/numéro de certificat/);
		expect(texte).toMatch(/période de validité/);
	});

	it('porte le montant en jeu et la période, en clair', () => {
		const texte = redigerCourrier(BASE);
		expect(texte).toMatch(/12\s?480/);
		expect(texte).toMatch(/1 janvier 2026/);
		expect(texte).toMatch(/31 décembre 2026/);
	});

	it('liste les produits concernés', () => {
		const texte = redigerCourrier(BASE);
		expect(texte).toContain('CAROTTE RONDELLE BIO');
		expect(texte).toContain('LENTILLE VERTE BIO');
	});

	it('tronque une liste trop longue plutôt que de produire un courrier illisible', () => {
		const produits = Array.from({ length: 40 }, (_, i) => `PRODUIT ${i + 1}`);
		const texte = redigerCourrier({ ...BASE, produits });
		expect(texte).toContain('PRODUIT 12');
		expect(texte).not.toContain('PRODUIT 13');
		expect(texte).toMatch(/et 28 autres références/);
	});

	it('nomme l’établissement demandeur, jamais Mycelium', () => {
		// La demande vient de la cantine, qui est le client du fournisseur. Un
		// courrier signé par un tiers inconnu n'obtient rien.
		const texte = redigerCourrier(BASE);
		expect(texte).toContain('Restaurant du Parc');
		expect(texte).not.toMatch(/Mycelium/i);
	});
});
