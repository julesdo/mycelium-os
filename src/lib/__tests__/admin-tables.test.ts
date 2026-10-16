import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * LA BARRIÈRE DE L'ADMIN — l'équipe ne lit jamais le contenu d'un dossier.
 *
 * L'équipe de Letikette voit des comptes (l'établissement, sa formule, ses membres,
 * son parcours), jamais ce qu'un client y a mis : ni débiteur, ni facture, ni
 * montant, ni document, ni courrier, ni conversation avec Plume. La règle ne se
 * convient pas, elle s'exécute : chaque `query('<table>')` d'un fichier de
 * `convex/admin/` doit nommer une table de cette liste fermée. Une fonction
 * nouvelle qui lirait `facturesVente` fait tomber ce test.
 */

const RACINE = join(process.cwd(), 'src', 'lib', 'convex', 'admin');

const TABLES_AUTORISEES = new Set([
	// Le compte, vu de l'extérieur.
	'organizations',
	'organizationMembers',
	'profilsCreancier',
	'parcoursComptes',
	'envoisCroissance',
	'journeesPlume',
	'pilotes',
	// Les tables de l'admin elle-même.
	'equipe',
	'journalEquipe',
	'prospects',
	'oppositions',
	'evenementsCrm',
	'tachesCrm',
	'importsProspects'
]);

function fichiers(dossier: string): string[] {
	return readdirSync(dossier).flatMap((nom) => {
		const chemin = join(dossier, nom);
		if (statSync(chemin).isDirectory()) return fichiers(chemin);
		return chemin.endsWith('.ts') ? [chemin] : [];
	});
}

describe('la barrière des tables de l’admin', () => {
	it('ne lit que des tables de compte et les siennes', () => {
		const lectures = fichiers(RACINE).flatMap((f) =>
			[...readFileSync(f, 'utf8').matchAll(/query\(\s*'(\w+)'/g)].map((m) => ({
				table: m[1] ?? '',
				fichier: relative(process.cwd(), f)
			}))
		);
		// Garde-fou du garde-fou : un balayage qui ne trouve rien passe au vert pour rien.
		expect(lectures.length).toBeGreaterThan(0);
		const interdites = lectures.filter((l) => !TABLES_AUTORISEES.has(l.table));
		expect(interdites.map((l) => `${l.fichier} lit ${l.table}`)).toEqual([]);
	});
});
