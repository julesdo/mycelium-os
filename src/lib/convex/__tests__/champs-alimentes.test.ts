import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * TOUT CHAMP DÉCLARÉ EST ALIMENTÉ, ET TOUT CHAMP ALIMENTÉ SERT.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ LE DÉFAUT LE PLUS FRÉQUENT DE CE DÉPÔT, ET LE PLUS INVISIBLE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Douze fois : un champ déclaré au schéma, lu par du code, écrit par personne.
 * Le compilateur est content — le champ est `v.optional()`, donc `undefined`
 * est un type valide — les tests passent, l'écran s'affiche. Et la
 * fonctionnalité n'existe pas.
 *
 * Les trois pires, parce qu'elles se donnaient l'air d'exister :
 *
 *   · `pieces.eligible` rendait `eligible` STRUCTURELLEMENT inatteignable :
 *     12 points sur 20 venaient des conditions, le seuil était à 15, et les 8
 *     restants étaient tous documentaires ;
 *   · `debiteurs.santePrecedente` : `DEBITEUR_DEGRADE` compare deux états et le
 *     produit n'en historisait qu'un — l'événement ne pouvait jamais survenir ;
 *   · `facturesVente.documentId`, corrigé le 11 septembre 2026, portait cette
 *     phrase à côté de lui : « le document source, pour que chaque montant
 *     remonte à sa pièce ». Rien ne l'écrivait. La chaîne d'auditabilité
 *     s'arrêtait donc à la ligne du tableur — alors qu'un débiteur qui conteste
 *     fait exactement ce chemin, de la somme vers la pièce.
 *
 * ⚠️ CHERCHER LES MOTS DONT ON SE SOUVIENT NE TROUVE QUE CEUX-LÀ. C'est
 * pourquoi ce test balaie le schéma ENTIER plutôt que de vérifier une liste :
 * il attrape le treizième cas, celui qu'on n'a pas encore commis.
 *
 * ⚠️ ET IL EST APPROXIMATIF, PAR CONSTRUCTION. Il lit du texte, pas un graphe
 * d'appels : une écriture par index, une lecture par déstructuration, un champ
 * relayé sous un autre nom lui échappent. D'où la liste d'exceptions ci-dessous,
 * où CHACUNE porte sa raison. Un test approximatif qui déclenche une
 * vérification humaine vaut mieux qu'aucun test — mais un test approximatif
 * dont on désactive les alertes sans les lire est pire que rien : il rassure.
 */

/** `src/lib` — les tables sont dessous, et tout le produit un cran au-dessus. */
const RACINE = join(import.meta.dirname, '..', '..');

/**
 * Les champs dont l'état est CONNU et ASSUMÉ, avec la raison.
 *
 * ⚠️ CHAQUE ENTRÉE EST UNE DETTE, PAS UNE DISPENSE. On n'en ajoute pas pour
 * faire passer le test : on en ajoute quand on a regardé et conclu.
 */
const ADMIS: Readonly<Record<string, string>> = {
	denominationNormalisee:
		'Écrite à l’import, lue par l’INDEX de dédoublonnage (by_org_and_denomination) et jamais comme propriété. Faux positif du balayage.',
	majLe:
		'Horodatage de dernière mise à jour du profil créancier. Écrit, pas encore affiché — trace d’audit.',
	consigneLe:
		'La date à laquelle un événement de procédure a été CONSIGNÉ, distincte de sa survenance. Trace d’audit : elle existe pour qu’on puisse dire quand on a su, pas seulement quand c’est arrivé.',
	produitLe:
		'La date de production du décompte. Le décompte affiche `arreteAu`, qui est la date qui l’oppose ; `produitLe` reste la trace technique.',
	montantHT:
		'Écrit à 0n par l’import : un FEC ne donne que le TTC, et déduire le HT d’un taux de TVA supposé serait inventer une ventilation. Le champ attend une source qui le porte.',
	santeConstateeLe:
		'Écrit par le radar quand la santé CHANGE. Pas encore affiché à côté du constat de registre — dette d’interface, pas de données.',

	// ── Les quatre tables du compagnon, posées le 18 septembre 2026 ───────────
	//
	// ⚠️ CE BLOC EST DATÉ, ET IL EST ÉCRIT POUR DISPARAÎTRE. Le lot 2 pose
	// `journal`, `propositions`, `conversations` et `remisesAuConseil` AVANT le
	// code qui les écrira, et c'est une décision de livraison, pas un oubli : la
	// bascule vers la file ne doit porter ni schéma, ni champ, ni fonction, pour
	// qu'un `git revert` la rende en entier. Les tables partent donc seules et
	// plusieurs jours avant.
	//
	// Le prix est ce bloc, et il se paie une fois. Chaque entrée NOMME la tâche
	// qui l'alimentera ; une entrée qui survit à sa tâche devient un commentaire
	// faux dans un test vert, et se retire le jour où la tâche livre. C'est la
	// seule chose qui distingue une dette datée d'une dispense.
	//
	// ⚠️ ET CE N'EST PAS UN CHAMP ORPHELIN DE PLUS DANS CE DÉPÔT. Le défaut que
	// ce test attrape est « déclaré, LU, écrit par personne » : un calcul dégradé
	// en silence sur un chemin que quelqu'un croit alimenté. Ici, rien ne lit
	// encore : il n'y a aucun repli silencieux à produire tant que le premier
	// lecteur n'existe pas.

	// `journal` — alimenté par T8 (le volet de preuve, section 7, seul point
	// d'entrée d'une contestation reçue hors du logiciel) et relu par la mesure
	// de T13 (le taux de correction après coup).
	avant:
		'L’état AVANT d’un fait du journal, en toutes lettres. Posé au T5 du lot 2, alimenté par T8.',
	apres:
		'L’état APRÈS d’un fait du journal, en toutes lettres. Posé au T5 du lot 2, alimenté par T8.',
	auteur:
		'MACHINE ou GERANT sur une entrée de journal. Deux valeurs et pas trois : le compagnon n’est pas un troisième auteur. Posé au T5 du lot 2, alimenté par T8.',
	auteurUserId:
		'Qui a consigné, quand l’auteur est le gérant. Posé au T5 du lot 2, alimenté par T8.',

	// `propositions` — alimenté par T13, qui pose les propositions dans le
	// battement quotidien, tient leur plafond et rend leurs trois mesures.
	champ: 'Le champ qu’une proposition vise. Posé au T5 du lot 2, alimenté par T13.',
	afficheeLe:
		'Quand une proposition a été mise sous les yeux du gérant. Sans elle, la médiane du délai entre l’affichage et le tap — l’une des trois mesures qui autoriseront à déplacer le plafond de sept — ne se calcule pas. Posé au T5 du lot 2, alimenté par T13.',
	decideeLe:
		'Quand une proposition a été retenue ou écartée. Posé au T5 du lot 2, alimenté par T13.',
	decideePar: 'Qui a retenu ou écarté une proposition. Posé au T5 du lot 2, alimenté par T13.',
	motifEcart:
		'Pourquoi une proposition a été écartée, en toutes lettres. Pas de pouce bas : on ne note pas un montant, il est juste ou faux. Posé au T5 du lot 2, alimenté par T13.',
	poseeLe: 'Quand une proposition a été posée. Posé au T5 du lot 2, alimenté par T13.',

	// `remisesAuConseil` — alimenté par T10, qui produit la pièce arrêtée et
	// suit le dossier remis.
	decompteId:
		'Le décompte FIGÉ qu’un dossier emporte. Il ne change jamais : la question n’est pas « que dirait le dossier aujourd’hui » mais « qu’a lu le conseil le jour où on le lui a remis ». Posé au T5 du lot 2, alimenté par T10.',
	remisLe:
		'La date du FAIT de la remise, AAAA-MM-JJ. Elle seule compte un délai ; `consigneLe` est celle de la saisie. Posé au T5 du lot 2, alimenté par T10.',
	revenuLe: 'La date du FAIT du retour du conseil. Posé au T5 du lot 2, alimenté par T10.',
	closLe:
		'La date du FAIT de la clôture du suivi. Sans cet état, un dossier sans retour resterait ouvert pour toujours. Posé au T5 du lot 2, alimenté par T10.',
	motifCloture:
		'Pourquoi le gérant met fin au suivi, en toutes lettres. Posé au T5 du lot 2, alimenté par T10.',
	attendu:
		'Ce que le gérant déclare attendre du conseil, en toutes lettres. Le produit ne fixe aucun délai et ne relance personne : il enregistre ce que le gérant dit attendre. Posé au T5 du lot 2, alimenté par T10.'
};

function fichiers(dossier: string, acc: string[] = []): string[] {
	for (const entree of readdirSync(dossier)) {
		if (entree === '__tests__' || entree === '_generated' || entree === 'node_modules') continue;
		const chemin = join(dossier, entree);
		if (statSync(chemin).isDirectory()) fichiers(chemin, acc);
		else if (/\.tsx?$/.test(entree)) acc.push(chemin);
	}
	return acc;
}

/** Les champs déclarés dans les tables du recouvrement, avec leur table. */
function champsDeclares(): ReadonlyMap<string, string> {
	const source = readFileSync(join(RACINE, 'convex/recouvrement/tables.ts'), 'utf8');
	const champs = new Map<string, string>();
	let table: string | null = null;
	for (const ligne of source.split('\n')) {
		const t = /^\t(\w+): defineTable\(/.exec(ligne);
		if (t?.[1] !== undefined) {
			table = t[1];
			continue;
		}
		const c = /^\t\t(\w+): v\./.exec(ligne);
		if (c?.[1] !== undefined && table !== null && !champs.has(c[1])) champs.set(c[1], table);
	}
	return champs;
}

describe('les champs du schéma', () => {
	it('sont tous alimentés par une écriture, et lus par quelqu’un', () => {
		const champs = champsDeclares();
		// Si l'extraction casse, le test doit ÉCHOUER et non passer sur zéro champ.
		expect(champs.size).toBeGreaterThan(40);

		const corpus = fichiers(join(RACINE, '..'))
			.filter((f) => !f.endsWith('tables.ts'))
			.map((f) => [f.split(sep).join('/'), readFileSync(f, 'utf8')] as const);

		const suspects: string[] = [];

		for (const [champ, table] of champs) {
			if (champ === 'organizationId' || champ in ADMIS) continue;

			// Une ÉCRITURE, c'est `champ:` suivi d'autre chose qu'un validateur,
			// dans un fichier Convex : la forme d'un objet passé à insert/patch.
			const ecriture = new RegExp(String.raw`(?<![\w.])` + champ + String.raw`:\s*(?!v\.)`);
			// Une LECTURE, c'est `.champ` n'importe où dans le produit.
			const lecture = new RegExp(String.raw`\.` + champ + String.raw`\b`);

			let ecrit = false;
			let lu = false;
			for (const [chemin, texte] of corpus) {
				if (!ecrit && chemin.includes('/lib/convex/') && ecriture.test(texte)) ecrit = true;
				if (!lu && lecture.test(texte)) lu = true;
				if (ecrit && lu) break;
			}

			if (!ecrit && lu) suspects.push(`${table}.${champ} — LU, ÉCRIT PAR PERSONNE`);
			else if (!ecrit && !lu) suspects.push(`${table}.${champ} — NI LU NI ÉCRIT`);
			else if (ecrit && !lu) suspects.push(`${table}.${champ} — ÉCRIT, LU PAR PERSONNE`);
		}

		expect(
			suspects,
			[
				'Champs déclarés que rien n’alimente ou que personne ne lit :',
				...suspects.map((s) => `  ${s}`),
				'',
				'Soit on l’alimente et on le consomme, soit on le retire du schéma,',
				'soit on l’inscrit dans ADMIS avec la raison — après avoir regardé.'
			].join('\n')
		).toEqual([]);
	});

	it('n’admet rien qui n’existe plus', () => {
		// Une exception qui survit au champ qu'elle excusait devient un commentaire
		// faux dans un test vert. C'est ainsi qu'une barrière redevient un décor.
		const champs = champsDeclares();
		const perimes = Object.keys(ADMIS).filter((c) => !champs.has(c));
		expect(perimes, `Exceptions sans champ correspondant : ${perimes.join(', ')}`).toEqual([]);
	});
});
