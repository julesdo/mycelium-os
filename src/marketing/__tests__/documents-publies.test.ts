import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * CE QU'UNE PAGE LÉGALE PUBLIÉE N'A PAS LE DROIT DE PORTER.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT QUE CE TEST EXISTE POUR EMPÊCHER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Les quatre documents ont vécu treize mois comme des brouillons de travail,
 * criblés de « ⚠️ À COMPLÉTER » et de renvois à un lisez-moi interne. C'était
 * juste tant qu'ils n'étaient pas publiés. Ils le sont désormais, et un
 * brouillon publié met le lecteur devant deux mauvaises options : soit il lit
 * nos pense-bêtes, soit on les masque au rendu — et masquer ce qu'on sait est
 * exactement ce que ce dépôt refuse.
 *
 * La troisième voie, retenue : **ce qui reste à trancher vit dans
 * `docs/juridique/00-lisez-moi.md`, qui n'est pas publié.** Les documents
 * publiés n'affirment que ce que nous assumons.
 *
 * ⚠️ ET CE TEST EST UNE BARRIÈRE, PAS UNE CONVENTION. La tentation de reposer
 * un « ⚠️ à compléter » dans un document est forte — c'est le geste naturel
 * quand on écrit et qu'il manque une information. Il faut qu'il échoue, en
 * nommant le fichier et la ligne.
 */

const RACINE = join(import.meta.dirname, '..', '..', '..');

/**
 * LES PAGES PUBLIÉES SE DÉCOUVRENT, ELLES NE SE DÉCLARENT PAS.
 *
 * ⚠️ UNE LISTE ÉCRITE À LA MAIN AURAIT MANQUÉ LA CINQUIÈME PAGE. Ce test balaie
 * donc `src/routes/` et retient tout fichier qui importe un document de
 * `docs/juridique/` : une page légale ajoutée demain est couverte sans que
 * personne ait à y penser, et c'est le seul moyen de ne pas laisser passer
 * exactement celle qu'on oublierait de relire.
 */
function pagesPubliees(): readonly { readonly route: string; readonly source: string }[] {
	const dossier = join(RACINE, 'src', 'routes');
	return readdirSync(dossier)
		.filter((nom) => nom.endsWith('.tsx'))
		.flatMap((nom) => {
			const trouve = /from '\.\.\/\.\.\/(docs\/juridique\/[\w-]+\.md)\?raw'/.exec(
				readFileSync(join(dossier, nom), 'utf8')
			);
			return trouve === null
				? []
				: [{ route: `/${nom.replace(/\.tsx$/, '')}`, source: trouve[1]! }];
		});
}

const SOURCES: Readonly<Record<string, string>> = Object.fromEntries(
	pagesPubliees().map((p) => [p.route, p.source])
);

function lire(chemin: string): string {
	return readFileSync(join(RACINE, chemin), 'utf8');
}

describe('les documents légaux publiés', () => {
	/**
	 * ⚠️ LE BALAYAGE DOIT TROUVER QUELQUE CHOSE. Une expression rationnelle qui
	 * ne mord plus — un chemin d'import changé, une extension différente — rendrait
	 * une liste vide, et TOUTES les vérifications qui suivent passeraient au vert
	 * sans rien vérifier. Un balayage qui sous-déclare est pire qu'aucun balayage :
	 * il rassure.
	 */
	it('sont bien découvertes dans les routes', () => {
		expect(Object.keys(SOURCES).sort()).toEqual([
			'/accord-de-sous-traitance',
			'/conditions-generales',
			'/mentions-legales',
			'/politique-de-confidentialite'
		]);
	});

	it('ne portent aucune note de travail', () => {
		const fautifs: string[] = [];

		for (const [route, chemin] of Object.entries(SOURCES)) {
			lire(chemin)
				.split('\n')
				.forEach((ligne, index) => {
					if (ligne.includes('⚠')) fautifs.push(`${chemin}:${index + 1} (${route}) — ${ligne.trim()}`);
				});
		}

		expect(
			fautifs,
			'Un avertissement de travail a été posé dans un document PUBLIÉ. Deux issues, et une seule ' +
				'est bonne :\n' +
				'  · si le lecteur doit le savoir — l’écrire comme une AFFIRMATION, pas comme un ' +
				'pense-bête. La politique de confidentialité le fait à sa section 9, où quatre écarts ' +
				'du produit sont énoncés plutôt que masqués ;\n' +
				'  · si c’est une tâche pour nous — la déplacer dans `docs/juridique/00-lisez-moi.md`, ' +
				'qui n’est pas publié.\n\n' +
				'Ne jamais masquer l’avertissement au rendu : ce serait cacher ce qu’on sait.'
		).toEqual([]);
	});

	/**
	 * ⚠️ LE PRODUIT PRÉCÉDENT NE DOIT PAS RESSURGIR. Ces documents ont décrit
	 * EGalim pendant treize mois. Trois d'entre eux le décrivaient encore la
	 * veille de leur publication — un barème, une plateforme de télédéclaration,
	 * un « nombre de couverts par jour ». Publier des conditions générales qui
	 * décrivent un service qu'on ne vend plus est pire que n'avoir aucune page :
	 * ce sont des engagements pris sur une prestation inexistante.
	 */
	it('ne décrivent plus le produit retiré', () => {
		const interdits = /egalim|ma cantine|couverts par jour|barème/i;
		const fautifs = Object.entries(SOURCES)
			.filter(([, chemin]) => interdits.test(lire(chemin)))
			.map(([route]) => route);

		expect(fautifs, 'Ces documents publiés décrivent encore le produit retiré le 3/09/2026.').toEqual(
			[]
		);
	});

	/**
	 * ⚠️ LE MOT « GARANTIE » EST PROSCRIT DANS L'INTERFACE, ET UN CONTRAT N'EST
	 * PAS UNE INTERFACE. C'est la nuance que la première version de ce test avait
	 * ratée : elle bannissait le radical, comme `lignes-rouges.test.ts` le fait
	 * pour les écrans, et elle a immédiatement signalé trois emplois parfaitement
	 * légitimes — « le Client **garantit** l'exactitude des informations »,
	 * « l'appel en **garantie** », et « **Garantir** la confidentialité », qui est
	 * une obligation du sous-traitant.
	 *
	 * Un balayage qui crie sur du texte juste finit désactivé, et c'est ainsi
	 * qu'on perd une barrière. Ce qui est interdit n'est pas le mot : c'est que
	 * **l'Éditeur garantisse un résultat**. On ne garantit aucun recouvrement ; on
	 * mesure, on documente, on alerte.
	 */
	it('ne promettent aucun résultat', () => {
		const resultat = /recouvrement|paiement|r[ée]sultat|somme|issue|succ[èe]s/i;
		const ecarte = /aucun|sans garantie|ne (?:garantit|sont pas garanti)|n[e’']est garanti/i;
		const fautifs: string[] = [];

		for (const [route, chemin] of Object.entries(SOURCES)) {
			for (const phrase of lire(chemin).split(/(?<=[.!?])\s+/)) {
				if (!/garanti/i.test(phrase)) continue;
				if (!resultat.test(phrase)) continue; // « garantir la confidentialité » : licite.
				if (ecarte.test(phrase)) continue; // Écarter une garantie est ce qu'un contrat DOIT faire.
				fautifs.push(`${route} — ${phrase.trim().slice(0, 140)}`);
			}
		}

		expect(
			fautifs,
			'Un document publié semble promettre un résultat. Le produit ne garantit aucun ' +
				'recouvrement : il mesure, documente et alerte, et la décision d’agir reste celle du client.'
		).toEqual([]);
	});

	/**
	 * Les trois lignes rouges doivent se lire dans les conditions générales : ce
	 * sont elles qui délimitent le service, et un contrat qui les tairait
	 * laisserait croire à un mandat de recouvrement.
	 */
	it('énoncent les trois lignes rouges dans les conditions générales', () => {
		const cgv = lire(SOURCES['/conditions-generales']!);
		expect(cgv).toMatch(/recouvrement pour compte de tiers/i);
		expect(cgv).toMatch(/ne manipule aucun fonds/i);
		expect(cgv).toMatch(/ne recommande aucune procédure/i);
	});
});
