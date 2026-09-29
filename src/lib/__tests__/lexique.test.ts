import { describe, it, expect } from 'vitest';
import { join, relative, sep } from 'node:path';
import { LEXIQUE } from '../verticales/recouvrement/lexique';
import { fichiersSources, lire, textesDInterface } from './textes-interface';

/**
 * LE LANGAGE DE TOUT LE MONDE, TENU PAR UN TEST.
 *
 * Le produit s'adresse à un gérant, pas à un juriste : « votre client » et non
 * « le débiteur », « pénalités de retard » et non « intérêts de retard », « date
 * limite pour agir en justice » et non « prescription ». Le mot du droit reste
 * permis entre parenthèses, en second, jamais en titre ni sur un bouton.
 *
 * ⚠️ DEUX FICHIERS EN SONT EXCLUS, NOMMÉMENT : ils rendent des DOCUMENTS
 * TRANSMIS — le calcul en PDF qui part au client ou au greffe, et le dossier que
 * lit l'avocat. Leur vocabulaire juridique exact est voulu.
 */

const PERIMETRE = [
	join('src', 'ui'),
	join('src', 'screens'),
	join('src', 'routes', 'app'),
	join('src', 'app'),
	/*
	  ⚠️ ET LE MÉTIER, DEPUIS LE 29 SEPTEMBRE 2026.

	  L'audit du jour a compté, dans les seules chaînes de `verticales/` :
	  35 « signifi… », 34 « prescription », 17 « mise en demeure »,
	  14 « exigibilité », 4 « non avenue », 3 « forclusion ». Ces phrases
	  s'affichent TELLES QUELLES — l'écran Dossiers écrivait « Signification de
	  l'ordonnance · 30 nov. 2026 — passé ce délai de 6 mois, l'ordonnance est
	  non avenue ». Le test tenait le vocabulaire sur la moitié du produit, et
	  cette moitié-là n'était pas celle que le gérant lit le plus.
	*/
	join('src', 'lib', 'verticales'),
	/*
	  ⚠️ ET LA PAGE PUBLIQUE, QUI EST LE PREMIER ÉCRAN DU PARCOURS. Elle
	  promettait « Signification de l'ordonnance » à un prospect qui n'a pas
	  encore de compte : le mot le plus juridique du produit, sur l'écran où il
	  décide s'il essaie.

	  ⚠️ ET LA SALLE D'EXPOSITION, parce qu'une démonstration qui parle autrement
	  que le produit ne le montre pas : elle en montre un autre.
	*/
	join('src', 'marketing'),
	join('src', 'routes', '-salle')
];

const DOCUMENTS_TRANSMIS: Readonly<Record<string, string>> = {
	[join('src', 'ui', 'piece-decompte.ts')]: 'Le calcul en PDF : un document transmis.',
	[join('src', 'screens', 'piece.tsx')]: 'Le dossier que lit l’avocat : un document transmis.'
};

/**
 * LES ZONES DU MÉTIER QUI GARDENT LE MOT DU DROIT, ET POURQUOI CHACUNE.
 *
 * ⚠️ CE N'EST PAS UNE LISTE DE COMMODITÉ. Chaque entrée nomme un endroit où le
 * mot exact du droit est la donnée elle-même : le reformuler serait une faute,
 * pas une amélioration.
 */
const ZONES_JURIDIQUES: Readonly<Record<string, string>> = {
	[join('src', 'lib', 'verticales', 'recouvrement', 'parametres.ts')]:
		'Le référentiel : chaque note porte l’extrait VERBATIM du texte relevé.',
	[join('src', 'lib', 'verticales', 'recouvrement', 'lexique.ts')]:
		'Le lexique lui-même : il porte les deux colonnes, par construction.',
	[join('src', 'lib', 'verticales', 'recouvrement', 'compagnon', 'question-de-droit.ts')]:
		'Elle cite les sources du référentiel mot pour mot, et rien d’autre.',
	[join('src', 'lib', 'verticales', 'recouvrement', 'compagnon', 'prompt.ts')]:
		'Le prompt système : lu par le modèle, jamais par le gérant — et figé à l’octet par le verrou d’empreinte, qu’une reformulation ferait sauter.',
	[join('src', 'lib', 'verticales', 'recouvrement', 'compagnon', 'filtres.ts')]:
		'Les motifs de refus : ils doivent NOMMER les mots qu’ils interdisent.',
	[join('src', 'lib', 'verticales', 'recouvrement', 'piece.ts')]:
		'La pièce envoyée à l’expert-comptable ou à l’avocat : un document transmis.',
	[join('src', 'lib', 'verticales', 'recouvrement', 'termes-juridiques.ts')]:
		'Les termes du texte affichés en second : c’est la donnée elle-même.',
	[join('src', 'lib', 'verticales', 'recouvrement', 'dossier.ts')]:
		'Le dossier remis au conseil : un document transmis.',
	[join('src', 'lib', 'verticales', 'recouvrement', 'relance.ts')]:
		'Elle compose le CORPS des relances envoyées au client — même statut que `gabarits/`. Ses textes lus par le gérant ont été repris à la main le 29/09/2026.'
};

/** Les dossiers entiers hors du balayage : documents transmis, et sources de droit. */
const DOSSIERS_JURIDIQUES = [
	join('src', 'lib', 'verticales', 'recouvrement', 'gabarits'),
	join('src', 'lib', 'verticales', 'recouvrement', 'pays'),
	/*
	  ⚠️ LES LECTEURS DE FORMATS. Leurs chaînes sont les noms de champs des
	  formats comptables, pas des phrases : dans un FEC, « PieceRef » est le
	  numéro d'une écriture, et le remplacer par « document » nommerait une
	  autre donnée. On ne traduit pas le vocabulaire d'un format.
	*/
	join('src', 'lib', 'verticales', 'recouvrement', 'import')
];

function dansUneZoneJuridique(local: string): boolean {
	if (local in ZONES_JURIDIQUES) return true;
	return DOSSIERS_JURIDIQUES.some((dossier) => local.startsWith(dossier + sep));
}

/**
 * Le mot du droit est permis EN SECOND, et il a deux formes à l'écran :
 * entre parenthèses — « Lettre de relance officielle (mise en demeure) » — et
 * entre guillemets français, la forme que porte le tableau des conditions :
 * « La somme est due » d'un côté, « créance certaine » de l'autre.
 *
 * ⚠️ LES GUILLEMETS COMPTENT DEPUIS LE 29/09/2026. Sans eux, le tableau qui
 * montre la loi EN FACE du dossier — la colonne dont tout le lot 2 a fait le
 * cœur du produit — tombait sous le balayage pour avoir fait exactement ce que
 * la règle demande.
 */
function horsParentheses(texte: string): string {
	return texte.replace(/\([^)]*\)/g, ' ').replace(/«[^»]*»/g, ' ');
}

function ecarts(): string[] {
	const trouves: string[] = [];
	for (const dossier of PERIMETRE) {
		for (const chemin of fichiersSources(join(process.cwd(), dossier))) {
			const local = relative(process.cwd(), chemin);
			if (local in DOCUMENTS_TRANSMIS) continue;
			if (dansUneZoneJuridique(local)) continue;
			for (const { ligne, texte } of textesDInterface(lire(chemin), chemin)) {
				const vu = horsParentheses(texte);
				for (const entree of LEXIQUE) {
					if (entree.motif !== null && entree.motif.test(vu)) {
						trouves.push(
							`${local.split(sep).join('/')}:${ligne} — « ${entree.droit} » → « ${entree.interface} » : ${texte.slice(0, 120)}`
						);
					}
				}
			}
		}
	}
	return trouves;
}

describe('le lexique', () => {
	it('le balayage voit bien l’interface', () => {
		const n = PERIMETRE.flatMap((d) => fichiersSources(join(process.cwd(), d))).length;
		expect(n).toBeGreaterThanOrEqual(100);
	});

	it('reconnaît un mot du droit, et le laisse passer entre parenthèses', () => {
		const [texte] = textesDInterface('export const t = <p>Le débiteur n’a pas payé.</p>;');
		expect(LEXIQUE.some((e) => e.motif?.test(horsParentheses(texte!.texte)))).toBe(true);
		const [second] = textesDInterface(
			'export const t = <p>Lettre de relance officielle (mise en demeure)</p>;'
		);
		expect(LEXIQUE.some((e) => e.motif?.test(horsParentheses(second!.texte)))).toBe(false);
	});

	it('aucun écran n’emploie le mot du droit là où le mot de tous les jours est attendu', () => {
		expect(
			ecarts(),
			'Reprendre ces textes avec le mot de l’interface (src/lib/verticales/recouvrement/lexique.ts).'
		).toEqual([]);
	});

	it('n’exclut que des fichiers qui existent', () => {
		const tous = new Set(
			PERIMETRE.flatMap((d) => fichiersSources(join(process.cwd(), d))).map((c) =>
				relative(process.cwd(), c)
			)
		);
		for (const exclu of [...Object.keys(DOCUMENTS_TRANSMIS), ...Object.keys(ZONES_JURIDIQUES)])
			expect(tous.has(exclu), exclu).toBe(true);
		for (const dossier of DOSSIERS_JURIDIQUES)
			expect(
				[...tous].some((c) => c.startsWith(dossier + sep)),
				dossier
			).toBe(true);
	});
});
