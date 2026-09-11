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
	majLe: 'Horodatage de dernière mise à jour du profil créancier. Écrit, pas encore affiché — trace d’audit.',
	consigneLe:
		'La date à laquelle un événement de procédure a été CONSIGNÉ, distincte de sa survenance. Trace d’audit : elle existe pour qu’on puisse dire quand on a su, pas seulement quand c’est arrivé.',
	produitLe:
		'La date de production du décompte. Le décompte affiche `arreteAu`, qui est la date qui l’oppose ; `produitLe` reste la trace technique.',
	montantHT:
		'Écrit à 0n par l’import : un FEC ne donne que le TTC, et déduire le HT d’un taux de TVA supposé serait inventer une ventilation. Le champ attend une source qui le porte.',
	santeConstateeLe:
		'Écrit par le radar quand la santé CHANGE. Pas encore affiché à côté du constat de registre — dette d’interface, pas de données.'
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
