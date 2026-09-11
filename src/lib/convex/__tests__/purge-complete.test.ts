import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * LA BARRIÈRE DE LA PURGE — toute table cloisonnée est purgée, sans exception.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN BALAYAGE ET PAS UNE CONVENTION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * « Le multi-tenant est strict, sans aucune exception. La purge RGPD est donc
 * totale, sans exception à justifier. » L'invariant est tenu à dix-sept
 * endroits — un par table — et une invariante tenue à N endroits se perd au
 * premier ajout : la table nouvelle est écrite, indexée, remplie, et personne
 * ne pense à la ligne de purge. Rien ne casse. Les données d'un client effacé
 * restent en base, indéfiniment, et c'est exactement le manquement que la
 * réglementation sanctionne.
 *
 * Le test existant nomme deux tables à la main. Il vérifie que la purge
 * fonctionne ; il ne peut pas voir celle qu'on vient d'oublier.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'IL LIT
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le critère est mécanique et sans échappatoire : une table qui déclare
 * `organizationId: v.id('organizations')` porte des données client, donc son
 * nom doit apparaître dans `rgpd.ts`. Ni plus, ni moins.
 *
 * ⚠️ IL LIT LA SOURCE, PAS LE SCHÉMA COMPILÉ. Le schéma à l'exécution ne dit
 * pas si `rgpd.ts` cite une table — et c'est cette citation-là qu'on vérifie.
 */

const RACINE = join(process.cwd(), 'src', 'lib', 'convex');

function lire(chemin: string): string {
	return readFileSync(join(RACINE, chemin), 'utf8');
}

/** Le nom de chaque table, avec la source de sa définition. */
function tablesDeclarees(): { nom: string; bloc: string }[] {
	const sources = [lire('recouvrement/tables.ts'), lire('schema.ts')].join('\n');
	const tables: { nom: string; bloc: string }[] = [];

	const motif = /(\w+):\s*defineTable\(/g;
	let trouve: RegExpExecArray | null;
	while ((trouve = motif.exec(sources)) !== null) {
		// Le bloc de la table : de sa déclaration à celle de la suivante. Une
		// borne approximative suffit — on n'y cherche qu'une ligne précise, et
		// déborder sur la table suivante ne peut que produire un faux POSITIF,
		// c'est-à-dire une exigence de purge en trop. Jamais un oubli.
		const suivante = motif.lastIndex;
		const fin = sources.indexOf('defineTable(', suivante);
		tables.push({
			nom: trouve[1]!,
			bloc: sources.slice(trouve.index, fin === -1 ? sources.length : fin)
		});
	}

	return tables;
}

describe('la purge n’oublie aucune table cloisonnée', () => {
	it('trouve bien les tables du schéma', () => {
		// Un garde-fou sur le garde-fou : si la forme du schéma changeait et que
		// le balayage ne trouvait plus rien, il passerait au vert en ne vérifiant
		// rien du tout. C'est le mode de panne d'un test de balayage.
		expect(tablesDeclarees().length).toBeGreaterThan(10);
	});

	it('purge toute table qui porte un organizationId', () => {
		const rgpd = lire('rgpd.ts');
		const cloisonnees = tablesDeclarees().filter(({ bloc }) =>
			/organizationId:\s*v\.id\('organizations'\)/.test(bloc)
		);

		expect(cloisonnees.length).toBeGreaterThan(5);

		const oubliees = cloisonnees
			.map(({ nom }) => nom)
			.filter((nom) => !rgpd.includes(`'${nom}'`));

		// Le message NOMME les tables : « la purge est incomplète » enverrait
		// relire dix-sept blocs.
		expect(
			oubliees,
			`Ces tables portent des données client et n’apparaissent pas dans rgpd.ts : ` +
				`${oubliees.join(', ')}. Une table cloisonnée absente de la purge laisse les ` +
				`données d’un établissement effacé en base, indéfiniment.`
		).toEqual([]);
	});
});
