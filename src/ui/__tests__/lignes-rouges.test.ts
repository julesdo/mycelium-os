import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * LES LIGNES ROUGES, BALAYÉES SUR TOUTE L'INTERFACE.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE TEST EXISTE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `CLAUDE.md` énonce deux règles comme exécutables :
 *
 *   · « Le mot "garantie" est interdit, et un test balaie toute l'interface. »
 *   · « On ne recommande jamais une procédure. Ce serait du conseil juridique.
 *     Le produit énonce des CONSTATS. »
 *
 * Le balayage annoncé n'existait pas. Des tests ponctuels vérifiaient des
 * formulations, un module à la fois — et le produit disait pourtant, dans son
 * flux d'alertes, « Engager une procédure avant le … » et « Faire signifier
 * sans délai ». Le test qui gardait la règle regardait UN événement, dans UN
 * cas, avec quatre mots interdits dont aucun ne figurait dans la phrase fautive.
 *
 * Une invariante tenue à N endroits se perd au premier ajout. Celle-ci se tient
 * ici, à un seul.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CE QU'IL LIT, ET CE QU'IL NE PEUT PAS LIRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Il lit les CHAÎNES des fichiers qui parlent à l'utilisateur — écrans,
 * composants, modèles d'e-mail, et les modules du domaine qui composent des
 * phrases destinées à être lues.
 *
 * ⚠️ IL NE LIT PAS LES COMMENTAIRES. Ce fichier-ci en est la preuve : il cite
 * « engager une procédure » pour expliquer pourquoi c'est interdit. Un
 * balayage qui les compterait rendrait impossible d'écrire la règle à côté du
 * code qu'elle gouverne — et c'est précisément là qu'elle sert.
 */

const RACINE = join(process.cwd(), 'src');

/** Les zones qui parlent à l'utilisateur. Le reste ne produit pas de phrase. */
const ZONES = [
	join(RACINE, 'ui'),
	join(RACINE, 'routes'),
	join(RACINE, 'screens'),
	join(RACINE, 'app'),
	join(RACINE, 'lib', 'verticales'),
	join(RACINE, 'lib', 'convex', 'emails')
];

function fichiers(dossier: string, acc: string[] = []): string[] {
	let entrees;
	try {
		entrees = readdirSync(dossier, { withFileTypes: true });
	} catch {
		// Une zone peut ne pas exister — `screens/` est né tard. Son absence n'est
		// pas un échec : ce qui compte est que les autres soient balayées.
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
 * ⚠️ L'OUVERTURE DOIT ÊTRE PRÉCÉDÉE D'UNE FRONTIÈRE, et ce détail a failli
 * rendre ce test inutile. Sans la contrainte, `accept="image/*"` — un attribut
 * bien réel de la zone de dépôt — ouvre un faux commentaire qui court jusqu'au
 * `*\/` suivant et avale tout ce qu'il y a entre les deux. Le balayage passait
 * alors au vert sur un fichier où j'avais injecté « garanti » ET « nous vous
 * recommandons », à dix lignes de là.
 *
 * Un balayage qui sous-déclare est pire qu'aucun balayage : il rassure. C'est
 * pour ça qu'on le vérifie en le faisant échouer, et pas seulement en le
 * regardant passer.
 */
function sansCommentaires(source: string): string {
	return source
		.replace(/(^|[\s{(=])\/\*[\s\S]*?\*\//g, '$1 ')
		.replace(/^\s*\/\/.*$/gm, ' ');
}

function violations(motif: RegExp): { fichier: string; extrait: string }[] {
	const trouvees: { fichier: string; extrait: string }[] = [];

	for (const zone of ZONES) {
		for (const fichier of fichiers(zone)) {
			const propre = sansCommentaires(readFileSync(fichier, 'utf8'));
			for (const ligne of propre.split('\n')) {
				const trouve = motif.exec(ligne);
				if (trouve !== null) {
					trouvees.push({
						fichier: fichier.slice(RACINE.length + 1),
						extrait: ligne.trim().slice(0, 120)
					});
				}
			}
		}
	}

	return trouvees;
}

describe('les lignes rouges tiennent sur toute l’interface', () => {
	it('balaie un nombre plausible de fichiers', () => {
		// Le garde-fou sur le garde-fou : si les chemins changeaient et que le
		// balayage ne trouvait plus rien, il passerait au vert sans rien vérifier.
		const total = ZONES.reduce((somme, zone) => somme + fichiers(zone).length, 0);
		expect(total).toBeGreaterThan(40);
	});

	it('n’emploie jamais le mot « garantie »', () => {
		// « On ne garantit aucun recouvrement. On MESURE, on DOCUMENTE, on ALERTE.
		// La décision d'agir reste celle du client. » Le mot promet un résultat que
		// personne ne peut tenir, et il suffit d'une fois pour que le produit
		// devienne autre chose que ce qu'il vend.
		// ⚠️ LE RADICAL, PAS UNE LISTE DE FORMES. La première version énumérait
		// « garantie, garanties, garantir, garantit » — et laissait passer
		// « recouvrement GARANTI », l'adjectif, c'est-à-dire la promesse elle-même
		// dans sa formulation la plus commerciale. Chercher les mots dont on se
		// souvient ne trouve que ceux-là.
		const fautes = violations(/\bgaranti\w*\b/i);

		expect(
			fautes,
			`Le mot « garantie » apparaît ici :\n` +
				fautes.map((f) => `  ${f.fichier} — ${f.extrait}`).join('\n')
		).toEqual([]);
	});

	it('n’ordonne jamais un acte de procédure', () => {
		// Ligne rouge 3. Le lexique est LARGE, délibérément : chercher les mots
		// dont on se souvient ne trouve que ceux-là — et c'est exactement ce qui
		// a laissé passer « Engager une procédure avant le … » pendant que quatre
		// autres mots étaient surveillés.
		const fautes = violations(
			/engager une procédure|engagez |faire signifier|signifiez |assignez|poursuivez |mettez en demeure|saisissez le tribunal|relancez |vous devriez|nous vous (recommandons|conseillons)/i
		);

		expect(
			fautes,
			`Ces phrases recommandent une démarche au lieu d’énoncer un constat :\n` +
				fautes.map((f) => `  ${f.fichier} — ${f.extrait}`).join('\n') +
				`\nLa conséquence juridique se dit au PRÉSENT, dans l’explication ` +
				`(« la créance est éteinte »), jamais à l’impératif.`
		).toEqual([]);
	});

	it('ne relance jamais le débiteur au nom du client', () => {
		// Ligne rouge 1 : le recouvrement pour compte de tiers est une activité
		// encadrée. Les relances sont des BROUILLONS dans la boîte du client ;
		// aucune formulation ne doit laisser croire que le produit écrit au
		// débiteur lui-même.
		const fautes = violations(
			/nous (avons )?(relanc|écrivons au débiteur|contactons le débiteur)|envoyé au débiteur de votre part|en votre nom au débiteur/i
		);

		expect(
			fautes,
			`Ces phrases laissent croire que le produit écrit au débiteur :\n` +
				fautes.map((f) => `  ${f.fichier} — ${f.extrait}`).join('\n')
		).toEqual([]);
	});
});
