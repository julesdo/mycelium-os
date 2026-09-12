import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * UN RÉPERTOIRE RECOPIÉ DIT D'OÙ IL VIENT, ET QUAND.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CETTE BARRIÈRE EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Le produit affiche des professionnels tirés de sources publiques. Aucune
 * n'est le tableau de sa profession : le fichier du CNB est une photographie
 * mensuelle, et le registre des entreprises ne connaît ni les radiations
 * disciplinaires ni les études qui n'ont pas déclaré leur convention
 * collective.
 *
 * Un écran qui montrerait ces listes sans dire d'où elles viennent serait
 * indiscernable d'un annuaire officiel. C'est le défaut que ce projet traque en
 * priorité : pas une donnée absente, une donnée FAUSSE qu'on laisse croire
 * vraie.
 *
 * ⚠️ LE CRITÈRE EST MÉCANIQUE. Un fichier d'interface qui nomme un répertoire
 * doit aussi porter le mot « relevé » ou « relevée ». Ni plus, ni moins.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'IL LIT, ET CE QU'IL NE PEUT PAS LIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ IL NE LIT PAS LES COMMENTAIRES, pour la raison que `lignes-rouges.test.ts`
 * documente à côté de la même fonction : c'est dans les commentaires qu'on
 * explique pourquoi une règle existe, et ce fichier-ci en est la preuve — il
 * nomme le registre des entreprises trois fois avant la première ligne de code.
 * Un balayage qui les compterait rendrait impossible d'écrire la règle à côté
 * du code qu'elle gouverne.
 *
 * ⚠️ ET IL NE LIT QUE DES CHAÎNES, DONC IL EST APPROXIMATIF. Un écran qui
 * recevrait sa phrase de source par une prop, sans jamais nommer le répertoire
 * dans son propre source, passerait sans rien porter. C'est assumé : cette
 * barrière attrape l'oubli — la liste recopiée telle quelle, sans un mot sur sa
 * provenance — pas la ruse. Un test approximatif qui déclenche une relecture
 * humaine vaut mieux qu'aucun test ; un test qu'on désactive sans le lire est
 * pire que rien, parce qu'il rassure.
 */

const RACINE = join(process.cwd(), 'src');

/** Les zones où un répertoire public peut atterrir devant un lecteur. */
const ZONES = [join(RACINE, 'ui'), join(RACINE, 'screens'), join(RACINE, 'routes')];

/**
 * CE QUI COMPTE COMME « NOMMER UN RÉPERTOIRE ».
 *
 * ⚠️ LES SOURCES, PAS LES MÉTIERS. « Commissaire de justice » n'est pas un
 * répertoire, c'est une profession : un écran a tous les droits de l'écrire. Ce
 * qui déclenche l'obligation, c'est de citer le FICHIER d'où sort une liste —
 * parce que c'est là que le lecteur cesse de voir une saisie et croit voir un
 * annuaire officiel.
 *
 * ⚠️ ET LA CHAMBRE NATIONALE Y FIGURE ALORS QU'ON NE L'INTERROGE PAS. Son
 * annuaire ne publie ni export, ni flux, ni conditions de réutilisation : on ne
 * l'aspire pas. Si son nom apparaissait un jour à l'écran, ce serait soit une
 * citation — qui doit alors porter sa date — soit une aspiration, et on veut
 * être prévenu dans les deux cas.
 */
const REPERTOIRES: readonly { readonly nom: string; readonly motif: RegExp }[] = [
	{ nom: 'le registre des entreprises', motif: /registre des entreprises/i },
	{ nom: 'l’API Recherche d’entreprises', motif: /recherche d['’]entreprises/i },
	{ nom: 'le Conseil national des barreaux', motif: /conseil national des barreaux/i },
	{ nom: 'l’annuaire national des avocats', motif: /annuaire national des avocats/i },
	{
		nom: 'la Chambre nationale des commissaires de justice',
		motif: /chambre nationale des commissaires de justice/i
	}
];

/**
 * LA MENTION QUI ACQUITTE.
 *
 * ⚠️ AUCUNE FRONTIÈRE APRÈS L'ACCENT. `\b` se calcule sur `\w`, qui est ASCII
 * en JavaScript : `é` n'est pas un caractère de mot, donc `/relevée?\b/` ne
 * mord JAMAIS — la fin de « relevé » suivie d'une espace met deux caractères
 * non-mot côte à côte, ce qui n'est pas une frontière. La frontière n'est posée
 * qu'à GAUCHE, où `r` la produit pour de bon.
 */
const MENTION_DE_RELEVE = /\brelevée?/i;

function fichiers(dossier: string, acc: string[] = []): string[] {
	let entrees;
	try {
		entrees = readdirSync(dossier, { withFileTypes: true });
	} catch {
		// Une zone peut ne pas exister — `screens/` est né tard, et pourrait
		// disparaître. Son absence n'est pas un échec : ce qui compte est que les
		// autres soient balayées, et le compte plancher plus bas le vérifie.
		return acc;
	}

	for (const entree of entrees) {
		const chemin = join(dossier, entree.name);
		if (entree.isDirectory()) {
			if (entree.name === '__tests__') continue;
			fichiers(chemin, acc);
		} else if (entree.name.endsWith('.ts') || entree.name.endsWith('.tsx')) {
			acc.push(chemin);
		}
	}
	return acc;
}

/**
 * Le source débarrassé de ses commentaires.
 *
 * ⚠️ L'OUVERTURE DOIT ÊTRE PRÉCÉDÉE D'UNE FRONTIÈRE, et c'est repris mot pour
 * mot de `lignes-rouges.test.ts`, où le détail a failli rendre le balayage
 * inutile : sans la contrainte, `accept="image/*"` — un attribut bien réel de
 * la zone de dépôt — ouvre un faux commentaire qui court jusqu'au `*\/` suivant
 * et avale tout ce qu'il y a entre les deux.
 *
 * Ici, l'effet serait le pire des deux : la mention « relevé » d'un écran
 * pourrait être avalée avec le reste, et le test crierait sur un écran
 * irréprochable — on l'éteindrait, et il cesserait de garder quoi que ce soit.
 */
function sansCommentaires(source: string): string {
	return source.replace(/(^|[\s{(=])\/\*[\s\S]*?\*\//g, '$1 ').replace(/^\s*\/\/.*$/gm, ' ');
}

/** Les fichiers d'interface qui nomment un répertoire sans dire quand. */
function muets(): { fichier: string; repertoire: string }[] {
	const trouves: { fichier: string; repertoire: string }[] = [];

	for (const zone of ZONES) {
		for (const fichier of fichiers(zone)) {
			const propre = sansCommentaires(readFileSync(fichier, 'utf8'));
			if (MENTION_DE_RELEVE.test(propre)) continue;

			for (const { nom, motif } of REPERTOIRES) {
				if (motif.test(propre)) {
					trouves.push({ fichier: fichier.slice(RACINE.length + 1), repertoire: nom });
				}
			}
		}
	}

	return trouves;
}

describe('un répertoire public affiché dit sa provenance', () => {
	it('balaie un nombre plausible de fichiers', () => {
		// Le garde-fou sur le garde-fou. Si les chemins changeaient et que le
		// balayage ne trouvait plus rien, il passerait au vert sans rien vérifier
		// — et le jour où un écran recopie un annuaire, personne ne le saurait.
		const total = ZONES.reduce((somme, zone) => somme + fichiers(zone).length, 0);
		expect(total).toBeGreaterThan(40);
	});

	it('sait reconnaître un écran muet, et un écran qui parle', () => {
		/**
		 * ⚠️ ON VÉRIFIE LE DÉTECTEUR EN LE FAISANT ÉCHOUER, pas en le regardant
		 * passer. Le jour où cette barrière est née, aucun écran ne nommait encore
		 * de répertoire : elle passait au vert sur zéro fichier balayé, ce qui est
		 * exactement la forme d'un test qui ne garde rien. Ces quatre assertions
		 * sont ce qui distingue « rien à signaler » de « je ne regarde rien ».
		 */
		const muet = 'const p = "Tiré du registre des entreprises.";';
		const parlant = 'const p = "Tiré du registre des entreprises. Relevé le 12 septembre 2026.";';
		const commente = '/* le registre des entreprises, expliqué ici */\nconst p = "Trois études.";';

		const nomme = (source: string) =>
			REPERTOIRES.some(({ motif }) => motif.test(sansCommentaires(source)));
		const date = (source: string) => MENTION_DE_RELEVE.test(sansCommentaires(source));

		expect(nomme(muet) && !date(muet)).toBe(true);
		expect(nomme(parlant) && date(parlant)).toBe(true);
		// Un commentaire ne déclenche rien : c'est là qu'on écrit la règle.
		expect(nomme(commente)).toBe(false);
		// Et « prélevé » ne doit pas acquitter à la place de « relevé ».
		expect(date('const p = "montant prélevé";')).toBe(false);
	});

	it('ne laisse aucun écran citer un répertoire sans sa date de relevé', () => {
		const fautes = muets();

		expect(
			fautes,
			'Ces fichiers nomment un répertoire public sans dire quand il a été relevé :\n' +
				fautes.map((f) => `  ${f.fichier} — ${f.repertoire}`).join('\n') +
				'\nAucune de ces sources n’est le tableau de sa profession. Une liste ' +
				'affichée sans sa date de relevé se lit comme un annuaire officiel et ' +
				'à jour, ce qu’elle n’est pas.'
		).toEqual([]);
	});
});
