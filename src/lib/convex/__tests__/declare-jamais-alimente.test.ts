import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * LA BARRIÈRE CONTRE « DÉCLARÉ, LU, JAMAIS ALIMENTÉ ».
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DIX OCCURRENCES DANS CE DÉPÔT, ET AUCUNE VISIBLE AU COMPILATEUR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un champ optionnel au schéma, LU par le code, ÉCRIT nulle part. Rien ne
 * casse : le champ est optionnel, le calcul a son repli, tout fonctionne. C'est
 * précisément ce qui rend ce défaut coûteux — il ne se signale jamais.
 *
 * Les dix trouvées jusqu'ici, par ordre de gravité croissante :
 *
 *   · `debiteurs.siren`, `santePrecedente`, `controlerDecompte`,
 *     `profilsCreancier` — un calcul dégradé en silence ;
 *   · `facturesVente.tauxContractuel` — les DEUX moteurs le lisaient, donc
 *     tout créancier ayant des conditions générales SOUS-RÉCLAMAIT ;
 *   · `signauxContestation` — le « risque produit numéro un » selon son propre
 *     commentaire, câblé à `[]` par ses deux appelants ;
 *   · la table `pieces` — les points documentaires valent 8 sur 20 et le seuil
 *     de qualification est à 15 : AUCUNE créance ne pouvait être éligible ;
 *   · le mode `FACTURE_DEPOSEE` — l'écran promettait « chaque facture est
 *     relue par le modèle » et le fichier partait au parseur de CSV ;
 *   · la table `dossiers` — la caducité d'une ordonnance ne pouvait apparaître
 *     ni dans le flux, ni dans le briefing quotidien.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * DEUX BALAYAGES, PARCE QUE LE DÉFAUT A DEUX FORMES
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le premier cherche les CHAMPS optionnels lus et jamais écrits. Le second
 * cherche les VALEURS d'une union — un état, un mode — déclarées au schéma et
 * citées nulle part ailleurs : c'est ce second balayage qui a trouvé
 * `dossiers`, dont les sept états n'existaient qu'au schéma.
 *
 * ⚠️ ILS PRODUISENT DES FAUX POSITIFS. Un champ écrit par un spread, ou dans un
 * objet littéral construit à distance, passe pour orphelin. C'est pour ça que
 * les listes d'exceptions existent — mais chacune DOIT porter sa raison, et
 * l'ajouter est un geste conscient. Sur onze candidats au premier balayage
 * historique, un seul était un vrai défaut ; sur cinq au second, cinq l'étaient.
 */

const RACINE = join(process.cwd(), 'src');
const SCHEMA = join(RACINE, 'lib', 'convex', 'recouvrement', 'tables.ts');

/**
 * Les exceptions, avec leur raison. VIDE aujourd'hui, et c'est l'état normal.
 *
 * Une entrée ici dit « ce champ est bien alimenté, le balayage ne sait pas le
 * voir ». Elle ne dit jamais « on verra plus tard » : un défaut de cette
 * famille ne se voit pas plus tard, il se voit quand un client se plaint.
 */
const CHAMPS_TOLERES: Record<string, string> = {};
const VALEURS_TOLEREES: Record<string, string> = {};

function fichiersSources(dossier: string, acc: string[] = []): string[] {
	for (const entree of readdirSync(dossier, { withFileTypes: true })) {
		const chemin = join(dossier, entree.name);
		if (entree.isDirectory()) {
			// `_generated` recopie le schéma : l'inclure ferait passer toute
			// déclaration pour une écriture, et le balayage ne trouverait rien.
			if (entree.name === '_generated' || entree.name === 'node_modules') continue;
			fichiersSources(chemin, acc);
		} else if (entree.name.endsWith('.ts') || entree.name.endsWith('.tsx')) {
			acc.push(chemin);
		}
	}
	return acc;
}

/** Tout le code SAUF les déclarations de schéma, qui ne sont pas des écritures. */
function sourcesHorsSchema(): string {
	const exclus = [sep + 'tables.ts', sep + 'schema.ts'];
	return fichiersSources(RACINE)
		.filter((f) => !exclus.some((x) => f.endsWith(x)))
		.map((f) => readFileSync(f, 'utf8'))
		.join('\n');
}

describe('aucun champ déclaré, lu, et jamais alimenté', () => {
	it('trouve bien les champs optionnels du schéma', () => {
		// Le garde-fou sur le garde-fou : si la forme du schéma changeait et que
		// le balayage ne trouvait plus rien, il passerait au vert sans rien
		// vérifier. C'est le mode de panne d'un test de balayage.
		const schema = readFileSync(SCHEMA, 'utf8');
		const champs = [...schema.matchAll(/^\t\t(\w+):\s*v\.optional\(/gm)];
		expect(champs.length).toBeGreaterThan(15);
	});

	it('écrit tout champ optionnel qu’il lit', () => {
		const schema = readFileSync(SCHEMA, 'utf8');
		const champs = [...new Set([...schema.matchAll(/^\t\t(\w+):\s*v\.optional\(/gm)].map((m) => m[1]!))];
		const sources = sourcesHorsSchema();

		const orphelins = champs.filter((champ) => {
			if (champ in CHAMPS_TOLERES) return false;
			const lectures = sources.match(new RegExp(`\\.${champ}\\b`, 'g'))?.length ?? 0;
			// Une ÉCRITURE : `champ:` dans un objet littéral, pas un accès.
			const ecritures = sources.match(new RegExp(`(?<![.\\w])${champ}:\\s`, 'g'))?.length ?? 0;
			return lectures > 0 && ecritures === 0;
		});

		expect(
			orphelins,
			`Ces champs sont LUS et jamais ÉCRITS : ${orphelins.join(', ')}.\n` +
				`Rien ne cassera : ils sont optionnels et le calcul a son repli. C'est le ` +
				`défaut le plus coûteux de ce dépôt, et il s'y est produit dix fois.\n` +
				`Vérifiez chaque candidat à la main (un champ écrit par spread passe pour ` +
				`orphelin) ; s'il est bien alimenté, ajoutez-le à CHAMPS_TOLERES AVEC SA RAISON.`
		).toEqual([]);
	});

	it('emploie quelque part chaque valeur d’union qu’il déclare', () => {
		// ⚠️ C'EST CE BALAYAGE-CI qui a trouvé la table `dossiers` : ses sept
		// états n'apparaissaient nulle part ailleurs qu'au schéma. Un état
		// déclaré et jamais atteint est une machine qui ne tourne pas.
		const schema = readFileSync(SCHEMA, 'utf8');
		const valeurs = [...new Set([...schema.matchAll(/v\.literal\('([A-Z_]+)'\)/g)].map((m) => m[1]!))];
		const sources = sourcesHorsSchema();

		expect(valeurs.length).toBeGreaterThan(20);

		const jamaisCitees = valeurs.filter(
			(valeur) =>
				!(valeur in VALEURS_TOLEREES) &&
				!sources.includes(`'${valeur}'`) &&
				!sources.includes(`"${valeur}"`)
		);

		expect(
			jamaisCitees,
			`Ces valeurs sont déclarées au schéma et citées NULLE PART ailleurs : ` +
				`${jamaisCitees.join(', ')}.\n` +
				`Un état qu'aucun code ne pose ni ne teste est une machine qui ne tourne ` +
				`pas — et personne ne le remarque, puisque rien ne casse.\n` +
				`Si la valeur est légitimement en attente, ajoutez-la à VALEURS_TOLEREES ` +
				`avec sa raison et la date où on s'en servira.`
		).toEqual([]);
	});
});
